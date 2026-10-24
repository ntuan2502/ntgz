// src/background/index.ts
var BRIDGE_URL = "http://127.0.0.1:17890";
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "UPDATE_BADGE") {
    const isRunning = Boolean(message.isRunning);
    const tabId = sender.tab ? sender.tab.id : message.tabId;
    const badgeOptions = {
      text: isRunning ? "ON" : ""
    };
    const colorOptions = {
      color: isRunning ? "#10b981" : "#6b7280"
    };
    if (tabId) {
      chrome.action.setBadgeText({ ...badgeOptions, tabId });
      chrome.action.setBadgeBackgroundColor({ ...colorOptions, tabId });
    } else {
      chrome.action.setBadgeText(badgeOptions);
      chrome.action.setBadgeBackgroundColor(colorOptions);
    }
    sendResponse({ ok: true });
    return true;
  }
  if (message.type === "BRIDGE_EVENT") {
    fetch(`${BRIDGE_URL}/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message.payload)
    }).then((r) => r.json()).then((data) => sendResponse({ ok: true, data })).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (message.type === "BRIDGE_CLEAR") {
    fetch(`${BRIDGE_URL}/clear`, { method: "POST" }).then((r) => r.json()).then((data) => sendResponse({ ok: true, data })).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  return false;
});
chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) return;
  if (command === "toggle-auto") {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_AUTO" }).catch(() => {
    });
  } else if (command === "toggle-panel") {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_PANEL" }).catch(() => {
    });
  }
});
//# sourceMappingURL=background.js.map
