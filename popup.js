// Popup Script - Nông Trại GenZ Auto (Gọn nhẹ, truy cập nhanh vào game)
const GAME_URL = 'https://nongtraigenz.online/play/';

const statusDot = document.getElementById('status-dot');
const stateBadge = document.getElementById('state-badge');
const btnOpenGame = document.getElementById('btn-open-game');
const btnToggleAuto = document.getElementById('btn-toggle-auto');
const btnTogglePanel = document.getElementById('btn-toggle-panel');
const msgStatus = document.getElementById('msg-status');

function setNote(text, isError = false) {
  msgStatus.textContent = text;
  msgStatus.style.color = isError ? '#f87171' : '#94a3b8';
}

async function findGameTab() {
  const tabs = await chrome.tabs.query({});
  return tabs.find((t) => t.url && t.url.includes('nongtraigenz.online'));
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function sendToGameTab(message) {
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
  } catch (_) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
      return await chrome.tabs.sendMessage(tab.id, message);
    } catch (e) {
      setNote('Không thể kết nối tab game. Hãy tải lại trang game.', true);
      return null;
    }
  }
}

function updateUI(res) {
  if (!res) return;
  const isRunning = Boolean(res.isRunning);
  statusDot.classList.toggle('running', isRunning);
  stateBadge.textContent = isRunning ? (res.currentState || 'ON') : 'OFF';

  if (isRunning) {
    btnToggleAuto.textContent = '⏹️ DỪNG AUTO (Alt+A)';
    btnToggleAuto.classList.add('stop');
  } else {
    btnToggleAuto.textContent = '▶️ BẬT AUTO (Alt+A)';
    btnToggleAuto.classList.remove('stop');
  }
}

btnOpenGame.addEventListener('click', async () => {
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

btnToggleAuto.addEventListener('click', async () => {
  const res = await sendToGameTab({ type: 'TOGGLE_AUTO' });
  if (res) updateUI(res);
});

btnTogglePanel.addEventListener('click', async () => {
  const res = await sendToGameTab({ type: 'TOGGLE_PANEL' });
  if (res) {
    setNote('Đã bật/tắt Menu điều khiển trong game.');
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
