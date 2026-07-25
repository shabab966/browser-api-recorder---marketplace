import React, { useState } from "react";
import { Download, Copy, Check, Code, Puzzle, Sparkles, FileCode, Terminal, FileJson, Layout } from "lucide-react";
import JSZip from "jszip";

export default function ChromeExtensionCard() {
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeFile, setActiveFile] = useState<string>("manifest.json");

  const extensionFiles = {
    manifest: `{
  "manifest_version": 3,
  "name": "Browser API Recorder Pro",
  "version": "1.0.0",
  "description": "Directly record browser macros and export them into the API Marketplace.",
  "permissions": ["activeTab", "tabs", "storage", "scripting"],
  "host_permissions": ["<all_urls>"],
  "background": {
    "service_worker": "background.js"
  },
  "action": {
    "default_popup": "popup.html"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}`,
    background: `// Edge/Chrome Background Event Listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CAPTURE_DOM_STEP") {
    chrome.storage.local.get({ steps: [] }, (data) => {
      const updatedSteps = [...data.steps, {
        id: "step-" + Math.random().toString(36).substring(2, 9),
        action: message.action,
        url: sender.tab?.url || message.url,
        selector: message.selector,
        value: message.value,
        description: message.description,
        timestamp: new Date().toISOString()
      }];
      chrome.storage.local.set({ steps: updatedSteps }, () => {
        console.log("Recorded step in browser storage:", message.description);
        // Notify popup that steps were updated
        chrome.runtime.sendMessage({ type: "STEPS_UPDATED" });
      });
    });
  }
});`,
    content: `// Listen for user clicks and input on the active web page
let isRecording = false;

// Inject visual recording outline flash styles
const outlineStyle = document.createElement("style");
outlineStyle.innerHTML = \`
  @keyframes recorderOutlineFlash {
    0% { outline: 3px solid rgba(99, 102, 241, 0.9); outline-offset: 2px; box-shadow: 0 0 10px rgba(99, 102, 241, 0.8); }
    100% { outline: 3px solid transparent; outline-offset: 10px; box-shadow: 0 0 0 transparent; }
  }
  .recorder-glowing-flash {
    animation: recorderOutlineFlash 0.8s ease-out !important;
  }
\`;
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
  if (testId) return \`*[data-testid="\${testId}"]\`;
  
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
    return \`\${el.tagName.toLowerCase()}[name="\${name}"]\`;
  }
  
  // 4. Try placeholder for inputs
  const placeholder = el.getAttribute("placeholder");
  if (placeholder && el.tagName === "INPUT") {
    return \`input[placeholder="\${placeholder}"]\`;
  }
  
  // 5. Try aria-label
  const ariaLabel = el.getAttribute("aria-label");
  if (ariaLabel) {
    return \`*[aria-label="\${ariaLabel}"]\`;
  }

  // 6. Structural path fallback
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE) {
    let selector = el.nodeName.toLowerCase();
    
    // Ignore random classes (alphanumeric hashes of length 8-12)
    if (el.className && typeof el.className === "string") {
      const classes = el.className.split(/\\s+/).filter(c => {
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
        selector += \`:nth-of-type(\${nth})\`;
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
  const description = \`Click on <\${tagName}>\${textContent ? \` containing "\${textContent}"\` : ""}\`;
  
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
    const description = \`Input "\${val}" into [\${nameOrPlaceholder}]\`;
    
    chrome.runtime.sendMessage({
      type: "CAPTURE_DOM_STEP",
      action: "input",
      selector: selector,
      value: val,
      description: description,
      url: window.location.href
    });
  }
}, true);`,
    popup: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      width: 320px;
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      margin: 0;
    }
    h3 {
      margin-top: 0;
      color: #6366f1;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
    }
    .status-container {
      background: #1e293b;
      padding: 8px 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      font-size: 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .status-badge {
      padding: 2px 6px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 10px;
    }
    .status-idle { background: #475569; color: #f8fafc; }
    .status-recording { background: #ef4444; color: white; animation: pulse 1.5s infinite; }
    .status-connected { background: #10b981; color: white; }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    button {
      width: 100%;
      padding: 10px;
      margin: 6px 0;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: background 0.2s;
    }
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .btn-rec { background: #ef4444; color: white; }
    .btn-rec:hover { background: #dc2626; }
    .btn-stop { background: #475569; color: white; }
    .btn-stop:hover { background: #334155; }
    .btn-sync { background: #10b981; color: white; }
    .btn-sync:hover:not(:disabled) { background: #059669; }
    .btn-clear { background: #e2e8f0; color: #0f172a; }
    .btn-clear:hover { background: #cbd5e1; }
    
    .steps-container {
      margin-top: 12px;
      border-top: 1px solid #334155;
      padding-top: 12px;
    }
    .steps-title {
      font-size: 11px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 6px;
      font-weight: bold;
    }
    .steps-list {
      max-height: 120px;
      overflow-y: auto;
      font-size: 11px;
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .step-item {
      background: #1e293b;
      padding: 6px 8px;
      border-radius: 4px;
      margin-bottom: 4px;
      font-family: monospace;
      color: #cbd5e1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .empty-steps {
      color: #64748b;
      font-style: italic;
      font-size: 11px;
      text-align: center;
      padding: 10px 0;
    }
    .message {
      font-size: 11px;
      margin-top: 6px;
      text-align: center;
      min-height: 15px;
    }
    .success-msg { color: #10b981; }
    .error-msg { color: #f87171; }
  </style>
</head>
<body>
  <h3>🔌 API Recorder Pro</h3>
  <div class="status-container">
    <span>Workspace:</span>
    <span id="connectionBadge" class="status-badge status-idle">Checking...</span>
  </div>
  <div class="status-container">
    <span>Status:</span>
    <span id="statusBadge" class="status-badge status-idle">Idle</span>
  </div>
  <button id="recBtn" class="btn-rec">🔴 Start Recording</button>
  <button id="syncBtn" class="btn-sync" disabled>💾 Send to Marketplace</button>
  <button id="clearBtn" class="btn-clear">🧹 Clear Steps</button>
  <div id="msgBox" class="message"></div>
  <div class="steps-container">
    <div class="steps-title">Recorded Steps (<span id="stepCount">0</span>)</div>
    <ul id="stepsList" class="steps-list">
      <div class="empty-steps">No steps recorded yet. Click Start Recording and click around a website.</div>
    </ul>
  </div>
  <script src="popup.js"></script>
</body>
</html>`,
    popupJs: `const statusBadge = document.getElementById("statusBadge");
const connectionBadge = document.getElementById("connectionBadge");
const recBtn = document.getElementById("recBtn");
const syncBtn = document.getElementById("syncBtn");
const clearBtn = document.getElementById("clearBtn");
const stepsList = document.getElementById("stepsList");
const stepCount = document.getElementById("stepCount");
const msgBox = document.getElementById("msgBox");

let isRecording = false;
let recordedSteps = [];

async function detectMarketplace() {
  const allTabs = await chrome.tabs.query({});
  const marketplaceTab = allTabs.find(tab => tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000") || tab.url.includes("onrender.com") || (tab.title && tab.title.includes("My Google AI Studio App"))));
  if (marketplaceTab) {
    connectionBadge.textContent = "Connected";
    connectionBadge.className = "status-badge status-connected";
    connectionBadge.style.background = "#10b981";
    syncBtn.disabled = recordedSteps.length === 0;
  } else {
    connectionBadge.textContent = "Offline";
    connectionBadge.className = "status-badge status-idle";
    connectionBadge.style.background = "#64748b";
    syncBtn.disabled = true;
  }
}

function updateUI() {
  chrome.storage.local.get({ isRecording: false, steps: [] }, (data) => {
    isRecording = data.isRecording;
    recordedSteps = data.steps;

    if (isRecording) {
      statusBadge.textContent = "Recording";
      statusBadge.className = "status-badge status-recording";
      recBtn.textContent = "⏹️ Stop Recording";
      recBtn.className = "btn-stop";
    } else {
      statusBadge.textContent = "Idle";
      statusBadge.className = "status-badge status-idle";
      recBtn.textContent = "🔴 Start Recording";
      recBtn.className = "btn-rec";
    }

    stepCount.textContent = recordedSteps.length;
    stepsList.innerHTML = "";
    if (recordedSteps.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-steps";
      emptyDiv.textContent = "No steps recorded yet. Click Start Recording and click around a website.";
      stepsList.appendChild(emptyDiv);
    } else {
      recordedSteps.forEach((step, index) => {
        const li = document.createElement("li");
        li.className = "step-item";
        li.textContent = \`\${index + 1}. [\${step.action}] \${step.description}\`;
        stepsList.appendChild(li);
      });
    }
    
    detectMarketplace();
  });
}

recBtn.addEventListener("click", async () => {
  const nextRecordingState = !isRecording;
  if (nextRecordingState) {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      chrome.storage.local.get({ steps: [] }, (data) => {
        const steps = data.steps;
        if (steps.length === 0) {
          const navigateStep = {
            id: "step-" + Math.random().toString(36).substring(2, 9),
            action: "navigate",
            url: activeTab.url,
            description: \`Navigate to \${activeTab.url}\`,
            timestamp: new Date().toISOString()
          };
          chrome.storage.local.set({ steps: [navigateStep] }, () => {
            chrome.storage.local.set({ isRecording: true }, () => {
              updateUI();
            });
          });
          return;
        }
        chrome.storage.local.set({ isRecording: true }, () => {
          updateUI();
        });
      });
      return;
    }
  }
  chrome.storage.local.set({ isRecording: false }, () => {
    updateUI();
  });
});

clearBtn.addEventListener("click", () => {
  chrome.storage.local.set({ steps: [] }, () => {
    updateUI();
    showMessage("Steps cleared!", "success-msg");
  });
});

syncBtn.addEventListener("click", async () => {
  showMessage("Syncing steps...", "");
  chrome.storage.local.get({ steps: [] }, async (data) => {
    const steps = data.steps;
    if (steps.length === 0) {
      showMessage("No steps to sync.", "error-msg");
      return;
    }

    const allTabs = await chrome.tabs.query({});
    const marketplaceTab = allTabs.find(tab => tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000") || tab.url.includes("onrender.com") || (tab.title && tab.title.includes("My Google AI Studio App"))));
    
    if (marketplaceTab) {
      chrome.scripting.executeScript({
        target: { tabId: marketplaceTab.id },
        func: (stepsData) => {
          window.postMessage({ type: "SYNC_EXTENSION_STEPS", steps: stepsData }, "*");
        },
        args: [steps]
      }, async () => {
        showMessage("Successfully synced with Marketplace!", "success-msg");
        await chrome.tabs.update(marketplaceTab.id, { active: true });
        if (marketplaceTab.windowId) {
          await chrome.windows.update(marketplaceTab.windowId, { focused: true });
        }
      });
    } else {
      try {
        const newTab = await chrome.tabs.create({ url: "http://localhost:3000" });
        const listener = (tabId, changeInfo) => {
          if (tabId === newTab.id && changeInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              func: (stepsData) => {
                window.postMessage({ type: "SYNC_EXTENSION_STEPS", steps: stepsData }, "*");
              },
              args: [steps]
            }, () => {
              showMessage("Opened Marketplace and synced steps!", "success-msg");
            });
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
      } catch (err) {
        showMessage("Please open http://localhost:3000 and try again.", "error-msg");
      }
    }
  });
});

function showMessage(text, className) {
  msgBox.textContent = text;
  msgBox.className = "message " + className;
  setTimeout(() => {
    msgBox.textContent = "";
    msgBox.className = "message";
  }, 4000);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STEPS_UPDATED") {
    updateUI();
  }
});

updateUI();`
  };

  const handleCopy = (fileName: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedSection(fileName);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleDownloadZip = async () => {
    try {
      const zip = new JSZip();
      zip.file("manifest.json", extensionFiles.manifest);
      zip.file("background.js", extensionFiles.background);
      zip.file("content.js", extensionFiles.content);
      zip.file("popup.html", extensionFiles.popup);
      zip.file("popup.js", extensionFiles.popupJs);

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "browser-api-recorder-extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to generate ZIP", err);
    }
  };

  const getFileSize = (content: string) => {
    const bytes = new Blob([content]).size;
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const files = [
    { name: "manifest.json", content: extensionFiles.manifest, icon: FileJson, color: "text-amber-400" },
    { name: "background.js", content: extensionFiles.background, icon: Terminal, color: "text-sky-400" },
    { name: "content.js", content: extensionFiles.content, icon: Code, color: "text-emerald-400" },
    { name: "popup.html", content: extensionFiles.popup, icon: Layout, color: "text-rose-400" },
    { name: "popup.js", content: extensionFiles.popupJs, icon: FileCode, color: "text-indigo-400" }
  ];

  const currentFile = files.find(f => f.name === activeFile) || files[0];

  return (
    <div id="chrome-extension-guide" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center shrink-0">
            <Puzzle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base">Google Chrome Extension Integration</h3>
            <p className="text-slate-400 text-xs font-sans mt-0.5">Record live web scraping sequences directly inside Chrome tabs</p>
          </div>
        </div>
        <button
          id="download-extension-btn"
          onClick={handleDownloadZip}
          className="w-full sm:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Download Source Pack (.ZIP)</span>
        </button>
      </div>

      {/* Steps to Install */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        <div className="bg-slate-950 p-4 border border-slate-800/60 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-bold">1</span>
            <span className="font-semibold text-slate-200">Extract Files</span>
          </div>
          <p className="text-slate-400 leading-relaxed font-sans font-medium">
            Download our source ZIP pack and extract all 5 extension files into a single directory on your PC.
          </p>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-800/60 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-bold">2</span>
            <span className="font-semibold text-slate-200">Load Unpacked</span>
          </div>
          <p className="text-slate-400 leading-relaxed font-sans font-medium">
            Open Chrome, navigate to <code className="text-indigo-400 font-mono">chrome://extensions</code>, and toggle <span className="font-semibold text-white">"Developer mode"</span> in the top-right.
          </p>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-800/60 rounded-xl space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 bg-indigo-500/10 text-indigo-400 rounded-full flex items-center justify-center font-bold">3</span>
            <span className="font-semibold text-slate-200">Link Account</span>
          </div>
          <p className="text-slate-400 leading-relaxed font-sans font-medium">
            Click <span className="font-semibold text-white">"Load unpacked"</span>, select your extension directory, and click the puzzle icon to record any website!
          </p>
        </div>
      </div>

      {/* Code Explorer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            Interactive Code Explorer
          </span>
          <span className="text-2xs text-indigo-400 flex items-center gap-1 font-mono">
            <Sparkles className="w-3 h-3" />
            V3 Manifest Compliant
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-950/40 border border-slate-800/80 rounded-xl overflow-hidden p-2">
          {/* Sidebar */}
          <div className="md:col-span-1 flex flex-col gap-1 pr-2 border-b md:border-b-0 md:border-r border-slate-800/60 pb-3 md:pb-0">
            {files.map((file) => {
              const FileIcon = file.icon;
              return (
                <button
                  key={file.name}
                  onClick={() => setActiveFile(file.name)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all group ${
                    activeFile === file.name
                      ? "bg-indigo-500/10 border border-indigo-500/20 text-slate-100"
                      : "border border-transparent text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FileIcon className={`w-4 h-4 shrink-0 ${file.color} group-hover:scale-110 transition-transform`} />
                    <span className="text-xs font-medium font-mono truncate">{file.name}</span>
                  </div>
                  <span className="text-3xs font-mono text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                    {getFileSize(file.content)}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Main Viewer */}
          <div className="md:col-span-3 flex flex-col h-[400px]">
            <div className="bg-slate-900/80 px-4 py-2 border border-slate-800 rounded-t-lg flex justify-between items-center text-2xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Previewing:</span>
                <span className="text-slate-200 font-semibold">{currentFile.name}</span>
                <span className="text-slate-500">({getFileSize(currentFile.content)})</span>
              </div>
              <button
                onClick={() => handleCopy(currentFile.name, currentFile.content)}
                className="text-slate-400 hover:text-white flex items-center gap-1.5 bg-slate-950 px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors"
              >
                {copiedSection === currentFile.name ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedSection === currentFile.name ? "Copied!" : "Copy File"}</span>
              </button>
            </div>
            <pre className="p-4 text-2xs text-slate-300 font-mono overflow-auto flex-1 leading-relaxed bg-slate-950 border border-t-0 border-slate-800 rounded-b-lg">
              <code>{currentFile.content}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
