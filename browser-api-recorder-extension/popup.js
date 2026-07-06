const statusBadge = document.getElementById("statusBadge");
const recBtn = document.getElementById("recBtn");
const syncBtn = document.getElementById("syncBtn");
const clearBtn = document.getElementById("clearBtn");
const stepsList = document.getElementById("stepsList");
const stepCount = document.getElementById("stepCount");
const msgBox = document.getElementById("msgBox");

let isRecording = false;
let recordedSteps = [];

// Update UI on load
function updateUI() {
  chrome.storage.local.get({ isRecording: false, steps: [] }, (data) => {
    isRecording = data.isRecording;
    recordedSteps = data.steps;

    // Update button & badge
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

    // Update steps list
    stepCount.textContent = recordedSteps.length;
    stepsList.innerHTML = "";
    if (recordedSteps.length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-steps";
      emptyDiv.textContent = "No steps recorded yet. Click Start Recording and click around a website.";
      stepsList.appendChild(emptyDiv);
      syncBtn.disabled = true;
    } else {
      recordedSteps.forEach((step, index) => {
        const li = document.createElement("li");
        li.className = "step-item";
        li.textContent = `${index + 1}. [${step.action}] ${step.description}`;
        stepsList.appendChild(li);
      });
      syncBtn.disabled = false;
    }
  });
}

// Toggle Recording
recBtn.addEventListener("click", async () => {
  const nextRecordingState = !isRecording;
  
  if (nextRecordingState) {
    // Starting recording - get the active tab to add a navigate step
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      chrome.storage.local.get({ steps: [] }, (data) => {
        const steps = data.steps;
        // Only add navigate step if steps are empty
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

// Clear steps
clearBtn.addEventListener("click", () => {
  chrome.storage.local.set({ steps: [] }, () => {
    updateUI();
    showMessage("Steps cleared!", "success-msg");
  });
});

// Sync / Send to Marketplace
syncBtn.addEventListener("click", async () => {
  showMessage("Syncing steps...", "");
  chrome.storage.local.get({ steps: [] }, async (data) => {
    const steps = data.steps;
    if (steps.length === 0) {
      showMessage("No steps to sync.", "error-msg");
      return;
    }

    // Query all tabs to find the Marketplace app tab
    const allTabs = await chrome.tabs.query({});
    const marketplaceTab = allTabs.find(tab => tab.url && (tab.url.includes("localhost:3000") || tab.url.includes("127.0.0.1:3000")));
    
    if (marketplaceTab) {
      // Execute script on the found Marketplace tab
      chrome.scripting.executeScript({
        target: { tabId: marketplaceTab.id },
        func: (stepsData) => {
          window.postMessage({ type: "SYNC_EXTENSION_STEPS", steps: stepsData }, "*");
        },
        args: [steps]
      }, async () => {
        showMessage("Successfully synced with Marketplace!", "success-msg");
        // Focus the marketplace tab and its window
        await chrome.tabs.update(marketplaceTab.id, { active: true });
        if (marketplaceTab.windowId) {
          await chrome.windows.update(marketplaceTab.windowId, { focused: true });
        }
      });
    } else {
      // If not open, open http://localhost:3000 and sync once loaded
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

// Listen for step updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "STEPS_UPDATED") {
    updateUI();
  }
});

// Initial load
updateUI();
