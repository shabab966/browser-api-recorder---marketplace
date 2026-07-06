// Listen for user clicks and input on the active web page
let isRecording = false;

// Sync state on load
chrome.storage.local.get({ isRecording: false }, (data) => {
  isRecording = data.isRecording;
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes) => {
  if (changes.isRecording) {
    isRecording = changes.isRecording.newValue;
  }
});

// Helper to compute a CSS selector for an element
function getCssSelector(el) {
  if (!(el instanceof Element)) return "";
  
  // 1. Check for data-testid/data-id/data-target attributes immediately (highly stable)
  const testId = el.getAttribute("data-testid") || el.getAttribute("data-id") || el.getAttribute("data-target");
  if (testId) {
    const attrName = el.getAttribute("data-testid") ? "data-testid" : (el.getAttribute("data-id") ? "data-id" : "data-target");
    return `${el.nodeName.toLowerCase()}[${attrName}="${testId}"]`;
  }
  
  const path = [];
  let currentEl = el;
  while (currentEl && currentEl.nodeType === Node.ELEMENT_NODE) {
    let selector = currentEl.nodeName.toLowerCase();
    
    // Check if it has a unique ID (excluding React dynamic colons)
    if (currentEl.id && !currentEl.id.includes(":") && !/^\d/.test(currentEl.id)) {
      selector += '#' + currentEl.id;
      path.unshift(selector);
      break;
    } 
    
    // Check if it has a unique class name
    let hasUniqueClass = false;
    if (currentEl.className && typeof currentEl.className === "string") {
      const classes = currentEl.className.trim().split(/\s+/).filter(c => c && !c.includes(":") && !c.startsWith("css-") && !c.startsWith("ssr-"));
      for (const cls of classes) {
        const query = currentEl.nodeName.toLowerCase() + "." + cls;
        try {
          const matches = document.querySelectorAll(query);
          if (matches.length === 1) {
            selector = query;
            hasUniqueClass = true;
            break;
          }
        } catch (e) {}
      }
    }
    
    if (hasUniqueClass) {
      path.unshift(selector);
      break;
    }

    let sib = currentEl, nth = 1;
    while (sib = sib.previousElementSibling) {
      if (sib.nodeName.toLowerCase() === currentEl.nodeName.toLowerCase()) {
        nth++;
      }
    }
    if (nth > 1) {
      selector += `:nth-of-type(${nth})`;
    }
    
    path.unshift(selector);
    currentEl = currentEl.parentNode;
  }
  
  return path.join(" > ");
}

// Intercept input / text modifications dynamically
let inputTimeout = null;
let lastInputSelector = null;
let lastInputValue = "";

// Send the accumulated input value to background script
function sendPendingInput(element, selector, val) {
  if (!val) return;
  const nameOrPlaceholder = element.getAttribute("placeholder") || element.getAttribute("name") || element.tagName.toLowerCase();
  const description = `Input "${val}" into [${nameOrPlaceholder}]`;
  
  chrome.runtime.sendMessage({
    type: "CAPTURE_DOM_STEP",
    action: "input",
    selector: selector,
    value: val,
    description: description,
    url: window.location.href
  });
  
  lastInputSelector = null;
  lastInputValue = "";
}

// Intercept input events as the user types
document.addEventListener("input", (event) => {
  if (!isRecording) return;
  
  const element = event.target;
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    const selector = getCssSelector(element);
    const val = element.value;
    
    lastInputSelector = selector;
    lastInputValue = val;
    
    clearTimeout(inputTimeout);
    inputTimeout = setTimeout(() => {
      sendPendingInput(element, selector, val);
    }, 600);
  }
}, true);

// Intercept click events
document.addEventListener("click", (event) => {
  if (!isRecording) return;
  
  // Flush any pending text input first
  if (lastInputSelector && lastInputValue) {
    clearTimeout(inputTimeout);
    const el = document.querySelector(lastInputSelector);
    if (el) {
      sendPendingInput(el, lastInputSelector, lastInputValue);
    } else {
      lastInputSelector = null;
      lastInputValue = "";
    }
  }

  const element = event.target;
  if (element.closest("#chrome-extension-guide")) return;
  
  const selector = getCssSelector(element);
  const tagName = element.tagName.toLowerCase();
  const textContent = element.textContent ? element.textContent.trim().substring(0, 30) : "";
  const description = `Click on <${tagName}>${textContent ? ` containing "${textContent}"` : ""}`;
  
  chrome.runtime.sendMessage({
    type: "CAPTURE_DOM_STEP",
    action: "click",
    selector: selector,
    value: "",
    description: description,
    url: window.location.href
  });
}, true);
