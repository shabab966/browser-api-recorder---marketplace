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
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    if (el.id) {
      selector += '#' + el.id;
      path.unshift(selector);
      break;
    } else {
      let sib = el, nth = 1;
      while (sib = sib.previousElementSibling) {
        if (sib.nodeName.toLowerCase() === el.nodeName.toLowerCase()) {
          nth++;
        }
      }
      if (nth > 1) {
        selector += `:nth-of-type(${nth})`;
      }
    }
    path.unshift(selector);
    el = el.parentNode;
  }
  return path.join(" > ");
}

// Intercept click events
document.addEventListener("click", (event) => {
  if (!isRecording) return;
  
  const element = event.target;
  // Ignore clicks inside extension popups
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

// Intercept input / change events
document.addEventListener("change", (event) => {
  if (!isRecording) return;
  
  const element = event.target;
  if (element.tagName === "INPUT" || element.tagName === "TEXTAREA" || element.tagName === "SELECT") {
    const selector = getCssSelector(element);
    const nameOrPlaceholder = element.getAttribute("placeholder") || element.getAttribute("name") || element.tagName.toLowerCase();
    const val = element.value;
    const description = `Input "${val}" into [${nameOrPlaceholder}]`;
    
    chrome.runtime.sendMessage({
      type: "CAPTURE_DOM_STEP",
      action: "input",
      selector: selector,
      value: val,
      description: description,
      url: window.location.href
    });
  }
}, true);
