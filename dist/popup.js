"use strict";
(() => {
  // src/services/github-service.ts
  var GITHUB_REPO = "ntuan2502/ntgz";
  var RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
  function compareSemVer(v1, v2) {
    const clean1 = v1.replace(/^v/, "").trim();
    const clean2 = v2.replace(/^v/, "").trim();
    const parts1 = clean1.split(".").map((p) => parseInt(p, 10) || 0);
    const parts2 = clean2.split(".").map((p) => parseInt(p, 10) || 0);
    const maxLen = Math.max(parts1.length, parts2.length);
    for (let i = 0; i < maxLen; i++) {
      const num1 = parts1[i] ?? 0;
      const num2 = parts2[i] ?? 0;
      if (num1 > num2) return 1;
      if (num1 < num2) return -1;
    }
    return 0;
  }
  async function fetchLatestRelease() {
    const res = await fetch(RELEASES_API_URL, {
      headers: {
        Accept: "application/vnd.github.v3+json"
      }
    });
    if (!res.ok) {
      throw new Error(`GitHub API returned status ${res.status}: ${res.statusText}`);
    }
    return await res.json();
  }
  async function checkForUpdates(currentVersionOverride) {
    let currentVersion = currentVersionOverride;
    if (!currentVersion) {
      try {
        currentVersion = chrome.runtime.getManifest().version;
      } catch {
        currentVersion = "1.0.0";
      }
    }
    const release = await fetchLatestRelease();
    const latestTag = release.tag_name || "1.0.0";
    const cleanLatest = latestTag.replace(/^v/, "");
    const hasUpdate = compareSemVer(cleanLatest, currentVersion) > 0;
    const zipAsset = release.assets?.find((a) => a.name.endsWith(".zip"));
    return {
      hasUpdate,
      currentVersion,
      latestVersion: cleanLatest,
      releaseName: release.name || latestTag,
      releaseNotes: release.body || "",
      releaseUrl: release.html_url,
      downloadUrl: zipAsset?.browser_download_url || release.html_url,
      publishedAt: release.published_at
    };
  }

  // src/popup/popup.ts
  var GAME_URL = "https://nongtraigenz.online/play/";
  var statusDot = document.getElementById("status-dot");
  var stateBadge = document.getElementById("state-badge");
  var versionLabel = document.getElementById("version-label");
  var btnOpenGame = document.getElementById("btn-open-game");
  var btnToggleAuto = document.getElementById("btn-toggle-auto");
  var btnTogglePanel = document.getElementById("btn-toggle-panel");
  var btnCheckUpdate = document.getElementById("btn-check-update");
  var updateBox = document.getElementById("update-box");
  var updateTitle = document.getElementById("update-title");
  var updateNotes = document.getElementById("update-notes");
  var updateLink = document.getElementById("update-link");
  var msgStatus = document.getElementById("msg-status");
  try {
    const currentVer = chrome.runtime.getManifest().version;
    if (versionLabel) {
      versionLabel.textContent = `Phi\xEAn b\u1EA3n v${currentVer}`;
    }
  } catch {
  }
  function setNote(text, isError = false) {
    if (msgStatus) {
      msgStatus.textContent = text;
      msgStatus.style.color = isError ? "#f87171" : "#94a3b8";
    }
  }
  async function findGameTab() {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url && t.url.includes("nongtraigenz.online"));
  }
  async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  async function sendToGameTab(message) {
    let tab = await getActiveTab();
    if (!tab || !tab.url || !tab.url.includes("nongtraigenz.online")) {
      tab = await findGameTab();
    }
    if (!tab || !tab.id) {
      setNote('Ch\u01B0a m\u1EDF tab game. H\xE3y b\u1EA5m "\u{1F680} V\xE0o Game N\xF4ng Tr\u1EA1i GenZ"!', true);
      return null;
    }
    try {
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ["content.js"]
        });
        return await chrome.tabs.sendMessage(tab.id, message);
      } catch {
        setNote("Kh\xF4ng th\u1EC3 k\u1EBFt n\u1ED1i tab game. H\xE3y t\u1EA3i l\u1EA1i trang game.", true);
        return null;
      }
    }
  }
  function updateUI(res) {
    if (!res) return;
    const isRunning = Boolean(res.running ?? res.config?.running ?? res.isRunning);
    if (statusDot) statusDot.classList.toggle("running", isRunning);
    if (stateBadge) stateBadge.textContent = isRunning ? "\u0110ANG CH\u1EA0Y" : "\u0110\xC3 D\u1EEANG";
    if (btnToggleAuto) {
      if (isRunning) {
        btnToggleAuto.textContent = "\u23F9\uFE0F D\u1EEANG AUTO (Alt+A)";
        btnToggleAuto.classList.add("stop");
      } else {
        btnToggleAuto.textContent = "\u25B6\uFE0F B\u1EACT AUTO (Alt+A)";
        btnToggleAuto.classList.remove("stop");
      }
    }
  }
  btnOpenGame?.addEventListener("click", async () => {
    const existing = await findGameTab();
    if (existing && existing.id) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
      window.close();
    } else {
      await chrome.tabs.create({ url: GAME_URL });
      window.close();
    }
  });
  btnToggleAuto?.addEventListener("click", async () => {
    const res = await sendToGameTab({ type: "TOGGLE_AUTO" });
    if (res) updateUI(res);
  });
  btnTogglePanel?.addEventListener("click", async () => {
    const res = await sendToGameTab({ type: "TOGGLE_PANEL" });
    if (res) {
      setNote("\u0110\xE3 b\u1EADt/t\u1EAFt Menu \u0111i\u1EC1u khi\u1EC3n trong game.");
    }
  });
  btnCheckUpdate?.addEventListener("click", async () => {
    btnCheckUpdate.disabled = true;
    btnCheckUpdate.textContent = "\u{1F504} \u0110ang ki\u1EC3m tra...";
    try {
      const result = await checkForUpdates();
      if (result.hasUpdate) {
        setNote(`\u{1F389} \u0110\xE3 c\xF3 b\u1EA3n c\u1EADp nh\u1EADt m\u1EDBi v${result.latestVersion}!`);
        if (updateBox) {
          updateBox.style.display = "flex";
          updateTitle.textContent = `B\u1EA3n m\u1EDBi: ${result.releaseName}`;
          updateNotes.textContent = result.releaseNotes || "Kh\xF4ng c\xF3 ghi ch\xFA thay \u0111\u1ED5i.";
          updateLink.href = result.downloadUrl || result.releaseUrl;
        }
      } else {
        setNote(`\u2705 B\u1EA1n \u0111ang d\xF9ng phi\xEAn b\u1EA3n m\u1EDBi nh\u1EA5t (v${result.currentVersion}).`);
        if (updateBox) updateBox.style.display = "none";
      }
    } catch (err) {
      setNote(`Kh\xF4ng th\u1EC3 ki\u1EC3m tra: ${err?.message || "L\u1ED7i m\u1EA1ng"}`, true);
    } finally {
      btnCheckUpdate.disabled = false;
      btnCheckUpdate.textContent = "\u{1F504} Ki\u1EC3m Tra C\u1EADp Nh\u1EADt";
    }
  });
  (async () => {
    const tab = await getActiveTab();
    if (tab && tab.url && tab.url.includes("nongtraigenz.online")) {
      btnOpenGame.textContent = "\u2705 \u0110ang \u1EDF trong Game";
      const res = await sendToGameTab({ type: "GET_STATUS" });
      if (res) updateUI(res);
    } else {
      const existing = await findGameTab();
      if (existing) {
        btnOpenGame.textContent = "\u{1F680} Chuy\u1EC3n t\u1EDBi Tab Game \u0111ang m\u1EDF";
        const res = await sendToGameTab({ type: "GET_STATUS" });
        if (res) updateUI(res);
      }
    }
  })();
})();
//# sourceMappingURL=popup.js.map
