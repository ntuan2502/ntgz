import { checkForUpdates } from '../services/github-service';

const GAME_URL = 'https://nongtraigenz.online/play/';

const statusDot = document.getElementById('status-dot') as HTMLSpanElement;
const stateBadge = document.getElementById('state-badge') as HTMLSpanElement;
const versionLabel = document.getElementById('version-label') as HTMLDivElement;
const btnOpenGame = document.getElementById('btn-open-game') as HTMLButtonElement;
const btnToggleAuto = document.getElementById('btn-toggle-auto') as HTMLButtonElement;
const btnTogglePanel = document.getElementById('btn-toggle-panel') as HTMLButtonElement;
const btnCheckUpdate = document.getElementById('btn-check-update') as HTMLButtonElement;
const updateBox = document.getElementById('update-box') as HTMLDivElement;
const updateTitle = document.getElementById('update-title') as HTMLDivElement;
const updateNotes = document.getElementById('update-notes') as HTMLDivElement;
const updateLink = document.getElementById('update-link') as HTMLAnchorElement;
const msgStatus = document.getElementById('msg-status') as HTMLDivElement;

// Display current version from manifest
try {
  const currentVer = chrome.runtime.getManifest().version;
  if (versionLabel) {
    versionLabel.textContent = `Phiên bản v${currentVer}`;
  }
} catch {
  // Ignore fallback
}

function setNote(text: string, isError = false) {
  if (msgStatus) {
    msgStatus.textContent = text;
    msgStatus.style.color = isError ? '#f87171' : '#94a3b8';
  }
}

async function findGameTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => t.url && t.url.includes('nongtraigenz.online'));
}

async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToGameTab(message: any): Promise<any> {
  let tab = await getActiveTab();
  if (!tab || !tab.url || !tab.url.includes('nongtraigenz.online')) {
    tab = await findGameTab();
  }
  if (!tab || !tab.id) {
    setNote('Chưa mở tab game. Hãy bấm "🚀 Vào Game Nông Trại GenZ"!', true);
    return null;
  }

  try {
    return await chrome.tabs.sendMessage(tab.id, message);
  } catch {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch {
      setNote('Không thể kết nối tab game. Hãy tải lại trang game.', true);
      return null;
    }
  }
}

function updateUI(res: any) {
  if (!res) return;
  const isRunning = Boolean(res.running ?? res.config?.running ?? res.isRunning);
  if (statusDot) statusDot.classList.toggle('running', isRunning);
  if (stateBadge) stateBadge.textContent = isRunning ? 'ĐANG CHẠY' : 'ĐÃ DỪNG';

  if (btnToggleAuto) {
    if (isRunning) {
      btnToggleAuto.textContent = '⏹️ DỪNG AUTO (Alt+A)';
      btnToggleAuto.classList.add('stop');
    } else {
      btnToggleAuto.textContent = '▶️ BẬT AUTO (Alt+A)';
      btnToggleAuto.classList.remove('stop');
    }
  }
}

btnOpenGame?.addEventListener('click', async () => {
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

btnToggleAuto?.addEventListener('click', async () => {
  const res = await sendToGameTab({ type: 'TOGGLE_AUTO' });
  if (res) updateUI(res);
});

btnTogglePanel?.addEventListener('click', async () => {
  const res = await sendToGameTab({ type: 'TOGGLE_PANEL' });
  if (res) {
    setNote('Đã bật/tắt Menu điều khiển trong game.');
  }
});

btnCheckUpdate?.addEventListener('click', async () => {
  btnCheckUpdate.disabled = true;
  btnCheckUpdate.textContent = '🔄 Đang kiểm tra...';
  try {
    const result = await checkForUpdates();
    if (result.hasUpdate) {
      setNote(`🎉 Đã có bản cập nhật mới v${result.latestVersion}!`);
      if (updateBox) {
        updateBox.style.display = 'flex';
        updateTitle.textContent = `Bản mới: ${result.releaseName}`;
        updateNotes.textContent = result.releaseNotes || 'Không có ghi chú thay đổi.';
        updateLink.href = result.downloadUrl || result.releaseUrl;
      }
    } else {
      setNote(`✅ Bạn đang dùng phiên bản mới nhất (v${result.currentVersion}).`);
      if (updateBox) updateBox.style.display = 'none';
    }
  } catch (err: any) {
    setNote(`Không thể kiểm tra: ${err?.message || 'Lỗi mạng'}`, true);
  } finally {
    btnCheckUpdate.disabled = false;
    btnCheckUpdate.textContent = '🔄 Kiểm Tra Cập Nhật';
  }
});

(async () => {
  const tab = await getActiveTab();
  if (tab && tab.url && tab.url.includes('nongtraigenz.online')) {
    btnOpenGame.textContent = '✅ Đang ở trong Game';
    const res = await sendToGameTab({ type: 'GET_STATUS' });
    if (res) updateUI(res);
  } else {
    const existing = await findGameTab();
    if (existing) {
      btnOpenGame.textContent = '🚀 Chuyển tới Tab Game đang mở';
      const res = await sendToGameTab({ type: 'GET_STATUS' });
      if (res) updateUI(res);
    }
  }
})();
