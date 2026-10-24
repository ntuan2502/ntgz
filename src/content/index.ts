import { injectPageHook, initBridgeListener } from './bridge/content-bridge';
import {
  createHud,
  loadConfig,
  renderAll,
  mergeConfig,
  getConfig,
  saveConfig,
  getLastActionText,
  getLastGameSnap,
  setAutoActionHandlers,
} from './ui/hud-core';
import {
  tickAuto,
  toggleAutoAll,
  toggleAutoTab,
} from './scheduler/master-loop';

function init(): void {
  if (!window.location.href.includes('nongtraigenz.online/play')) {
    return;
  }
  injectPageHook();
  initBridgeListener();
  createHud();
  setAutoActionHandlers(toggleAutoAll, toggleAutoTab);
  loadConfig();
  setInterval(tickAuto, 200);

  // Keyboard shortcuts
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.altKey && e.code === 'KeyA') {
      e.preventDefault();
      toggleAutoAll();
    } else if (e.altKey && e.code === 'KeyP') {
      e.preventDefault();
      const cfg = getConfig();
      cfg.panelVisible = !cfg.panelVisible;
      saveConfig();
    }
  });

  // Extension runtime messages from Popup or Background
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    const action = msg?.action || msg?.type;
    if (action === 'TOGGLE_AUTO') {
      toggleAutoAll();
      const cfg = getConfig();
      sendResponse({ ok: true, running: cfg.running });
    } else if (action === 'TOGGLE_PANEL') {
      const cfg = getConfig();
      cfg.panelVisible = !cfg.panelVisible;
      saveConfig();
      renderAll();
      sendResponse({ ok: true, panelVisible: cfg.panelVisible });
    } else if (action === 'GET_STATUS') {
      sendResponse({
        ok: true,
        running: getConfig().running,
        config: getConfig(),
        lastActionText: getLastActionText(),
        snap: getLastGameSnap(),
      });
    }
    return true;
  });

  // Sync config changes across contexts
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autoConfig?.newValue) {
      const merged = mergeConfig(changes.autoConfig.newValue);
      const current = getConfig();
      Object.assign(current, merged);
      renderAll();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
