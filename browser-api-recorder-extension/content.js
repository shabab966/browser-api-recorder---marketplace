// Listen for user clicks and input on the active web page
let isRecording = false;

// Inject visual recording outline flash styles
const outlineStyle = document.createElement("style");
outlineStyle.innerHTML = `
  @keyframes recorderOutlineFlash {
    0% { outline: 3px solid rgba(99, 102, 241, 0.9); outline-offset: 2px; box-shadow: 0 0 10px rgba(99, 102, 241, 0.8); }
    100% { outline: 3px solid transparent; outline-offset: 10px; box-shadow: 0 0 0 transparent; }
  }
  .recorder-glowing-flash {
    animation: recorderOutlineFlash 0.8s ease-out !important;
  }
`;
(document.head || document.documentElement).appendChild(outlineStyle);

function triggerFlash(element) {
  if (!element) return;
  element.classList.add("recorder-glowing-flash");
  setTimeout(() => {
    element.classList.remove("recorder-glowing-flash");
  }, 800);
}

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
  
  // 1. Try data-testid or data-qa
  const testId = el.getAttribute("data-testid") || el.getAttribute("data-qa");
  if (testId) return `*[data-testid="${testId}"]`;
  
  // 2. Try unique ID if it doesn't look auto-generated
  if (el.id && !el.id.includes(":") && !el.id.match(/^[0-9]/) && el.id.length < 50) {
    try {
      if (document.querySelectorAll("#" + CSS.escape(el.id)).length === 1) {
        return "#" + el.id;
      }
    } catch(e) {}
  }
  
  // 3. Try name attribute for inputs
  const name = el.getAttribute("name");
  if (name && ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)) {
    return `${el.tagName.toLowerCase()}[name="${name}"]`;
  }
  
  // 4. Try placeholder for inputs
  const placeholder = el.getAttribute("placeholder");
  if (placeholder && el.tagName === "INPUT") {
    return `input[placeholder="${placeholder}"]`;
  }
  
  // 5. Try aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    return `*[aria-label="${ariaLabel}"]`;
  }

  // 6. Structural path fallback
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    
    // Ignore random classes (alphanumeric hashes of length 8-12)
    if (el.className && typeof el.className === "string") {
      const classes = el.className.split(/\s+/).filter(c => {
        return c && !c.match(/^[a-z0-9]{8,12}$/i) && !c.startsWith("recorder-");
      });
      if (classes.length > 0) {
        selector += "." + classes.join(".");
      }
    }
    
    if (el.id && !el.id.includes(":") && el.id.length < 50) {
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
  if (element.closest("#chrome-extension-guide")) return;
  
  triggerFlash(element);
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
    triggerFlash(element);
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
