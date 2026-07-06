// Edge/Chrome Background Event Listener
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
});
