const statusBadge = document.getElementById("statusBadge");
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
  const marketplaceTab = allTabs.find(tab => tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000")));
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
        li.textContent = `${index + 1}. [${step.action}] ${step.description}`;
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
            description: `Navigate to ${activeTab.url}`,
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
    const marketplaceTab = allTabs.find(tab => tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000")));
    
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

updateUI();
