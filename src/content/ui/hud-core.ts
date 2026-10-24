import { AppConfig, AreaId } from '../../shared/types/config';
import { DEFAULT_CONFIG, AREA_META } from '../../shared/constants/default-config';
import { HUD_STYLES } from './hud-styles';
import { buildFarmSubCards } from './tabs/farm-tab';
import { getWharfTabHtml } from './tabs/wharf-tab';
import { getSeaTabHtml } from './tabs/sea-tab';
import { getCityTabHtml } from './tabs/city-tab';
import { openUpdateModal } from './update-modal';
import { checkForUpdates } from '../../services/github-service';
import { formatClock, formatGold } from '../scheduler/dom-helpers';

let config: AppConfig = structuredClone(DEFAULT_CONFIG);
let hudRoot: ShadowRoot | null = null;
let lastActionText = 'Đang chờ lệnh...';
let lastGameSnap: any = null;
let lockedTabArea: AreaId | null = null;

export interface HudElements {
  panel: HTMLElement;
  dragHandle: HTMLElement;
  btnCheckUpdate: HTMLButtonElement;
  btnMinimize: HTMLButtonElement;
  btnHide: HTMLButtonElement;
  btnHdrAutoAll: HTMLButtonElement | null;
  btnHdrAutoTab: HTMLButtonElement | null;
  btnAutoAll: HTMLButtonElement;
  btnAutoTab: HTMLButtonElement;
  rngTaskDelay: HTMLInputElement;
  lblTaskDelay: HTMLElement;
  btnToggleOrderDrawer: HTMLButtonElement;
  orderDrawer: HTMLElement;
  areaOrderList: HTMLElement;
  inpFishingSwitchCount: HTMLInputElement;
  farmSubCardsContainer: HTMLElement;
  statTime: HTMLElement;
  statGold: HTMLElement;
  statHunger: HTMLElement;
  statThirst: HTMLElement;
  statEnergy: HTMLElement;
  statExtra: HTMLElement;
  statusAction: HTMLElement;
  tabs: HTMLButtonElement[];
  panes: Record<string, HTMLElement | null>;
}

let els: HudElements | null = null;
let onToggleAllHandler: (() => void) | null = null;
let onToggleTabHandler: (() => void) | null = null;

export function setAutoActionHandlers(onToggleAll: () => void, onToggleTab: () => void): void {
  onToggleAllHandler = onToggleAll;
  onToggleTabHandler = onToggleTab;
}

export function getConfig(): AppConfig {
  return config;
}

export function setConfig(newConfig: AppConfig): void {
  config = newConfig;
}

export function getHudRoot(): ShadowRoot | null {
  return hudRoot;
}

export function getHudElements(): HudElements | null {
  return els;
}

export function getLockedTabArea(): AreaId | null {
  return lockedTabArea;
}

export function setLockedTabArea(area: AreaId | null): void {
  lockedTabArea = area;
}

export function getLastActionText(): string {
  return lastActionText;
}

export function getLastGameSnap(): any {
  return lastGameSnap;
}

export function setLastGameSnap(snap: any): void {
  lastGameSnap = snap;
}

export function setStatus(text: string): void {
  lastActionText = text;
  if (els?.statusAction) {
    els.statusAction.textContent = text;
  }
}

export function mergeConfig(saved: any): AppConfig {
  if (!saved || typeof saved !== 'object') return structuredClone(DEFAULT_CONFIG);
  const next: AppConfig = {
    ...structuredClone(DEFAULT_CONFIG),
    ...saved,
    areaEnabled: { ...DEFAULT_CONFIG.areaEnabled, ...(saved.areaEnabled || {}) },
    farmSubEnabled: { ...DEFAULT_CONFIG.farmSubEnabled, ...(saved.farmSubEnabled || {}) },
    farmSubCollapsed: { ...DEFAULT_CONFIG.farmSubCollapsed, ...(saved.farmSubCollapsed || {}) },

    // Backward-compatibility migrations
    barnAutoFeedBuffalo: saved.barnAutoFeedBuffalo ?? saved.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoFeedBuffalo,
    barnAutoBathBuffalo: saved.barnAutoBathBuffalo ?? saved.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoBathBuffalo,
    barnAutoLendBuffalo: saved.barnAutoLendBuffalo ?? DEFAULT_CONFIG.barnAutoLendBuffalo,
    autoRecoverHunger: saved.autoRecoverHunger ?? saved.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverHunger,
    autoRecoverThirst: saved.autoRecoverThirst ?? saved.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverThirst,
    autoChargeVehicle: saved.autoChargeVehicle ?? saved.autoRecoverNeeds ?? DEFAULT_CONFIG.autoChargeVehicle,
    autoMorningCoffee: saved.autoMorningCoffee ?? saved.autoRecoverNeeds ?? DEFAULT_CONFIG.autoMorningCoffee,
    autoFeedPiggy: saved.autoFeedPiggy ?? saved.autoPiggy ?? DEFAULT_CONFIG.autoFeedPiggy,
    autoBreakPiggy: saved.autoBreakPiggy ?? saved.autoPiggy ?? DEFAULT_CONFIG.autoBreakPiggy,
    autoNewPiggy: saved.autoNewPiggy ?? saved.autoPiggy ?? DEFAULT_CONFIG.autoNewPiggy,
    autoSellTrend: saved.autoSellTrend ?? DEFAULT_CONFIG.autoSellTrend,
    autoSellDailyTask: saved.autoSellDailyTask ?? DEFAULT_CONFIG.autoSellDailyTask,
    autoSellProduce: saved.autoSellProduce === true && typeof saved.surplusKeepQty === 'number' ? true : false,
    surplusKeepQty: saved.surplusKeepQty ?? DEFAULT_CONFIG.surplusKeepQty,
    autoBuyPlots: saved.autoBuyPlots ?? DEFAULT_CONFIG.autoBuyPlots,
    autoSalonShampoo: saved.autoSalonShampoo ?? DEFAULT_CONFIG.autoSalonShampoo,
    autoSalonWhiten: saved.autoSalonWhiten ?? DEFAULT_CONFIG.autoSalonWhiten,
    autoFirstDayTasks: saved.autoFirstDayTasks ?? DEFAULT_CONFIG.autoFirstDayTasks,
    autoNotebookPages: saved.autoNotebookPages ?? DEFAULT_CONFIG.autoNotebookPages,
  };

  if (!Array.isArray(next.areaOrder) || next.areaOrder.length === 0) {
    next.areaOrder = [...DEFAULT_CONFIG.areaOrder];
  }
  if (!Array.isArray(next.farmSubOrder) || next.farmSubOrder.length === 0) {
    next.farmSubOrder = [...DEFAULT_CONFIG.farmSubOrder];
  }
  for (const k of DEFAULT_CONFIG.farmSubOrder) {
    if (!next.farmSubOrder.includes(k)) next.farmSubOrder.push(k);
  }
  return next;
}

export function saveConfig(): void {
  chrome.storage.local.set({ autoConfig: config });
  renderAll();
}

export function loadConfig(): Promise<AppConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoConfig'], (res) => {
      if (res.autoConfig) {
        config = mergeConfig(res.autoConfig);
      }
      renderAll();
      resolve(config);
    });
  });
}

export function createHud(): void {
  if (document.getElementById('ntg-auto-hud-host')) return;

  const host = document.createElement('div');
  host.id = 'ntg-auto-hud-host';
  host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  hudRoot = shadow;

  const style = document.createElement('style');
  style.textContent = HUD_STYLES;

  const manifest = chrome.runtime.getManifest();
  const currentVersion = manifest.version || '1.0.0';

  const panel = document.createElement('div');
  panel.className = 'hud-panel';
  panel.innerHTML = `
    <div class="hud-header" id="hudDragHandle">
      <div class="hud-title">
        <span>🌾 NTG Auto by Tún <small style="font-size:10px; color:#cbd5e1; font-weight:700;">v${currentVersion}</small></span>
      </div>
      <div class="hud-header-btns">
        <button class="hdr-auto-btn all" id="btnHdrAutoAll" title="Chạy tự động tất cả khu vực theo thứ tự (Alt+A)">
          ▶️ Tất cả
        </button>
        <button class="hdr-auto-btn tab" id="btnHdrAutoTab" title="Chạy tự động riêng Tab khu vực đang mở">
          🎯 Nông Trại
        </button>
      </div>
      <div class="hud-actions">
        <button class="icon-btn" id="btnCheckUpdate" title="Kiểm tra bản cập nhật mới từ GitHub">🔄</button>
        <button class="icon-btn" id="btnMinimize" title="Thu gọn / Mở rộng">_</button>
        <button class="icon-btn" id="btnHide" title="Ẩn bảng (Alt+P)">✕</button>
      </div>
    </div>

    <div class="hud-stats">
      <div class="stats-row">
        <span id="statTime">📅 Ngày -- · 🕒 --:--</span>
        <span id="statGold">💰 --</span>
      </div>
      <div class="stats-pills">
        <span class="stat-pill" id="statHunger">🍙 --%</span>
        <span class="stat-pill" id="statThirst">💧 --%</span>
        <span class="stat-pill" id="statEnergy">⚡ --%</span>
        <span class="stat-pill" id="statExtra">📍 --</span>
      </div>
      <div class="status-banner" id="statusAction">Đang chờ lệnh...</div>
    </div>

    <div class="hud-top-controls">
      <div class="dual-btn-row">
        <button class="btn-auto-all" id="btnAutoAll" title="Chạy tự động lần lượt các khu vực được bật theo thứ tự kéo thả (Alt+A)">
          ▶️ AUTO TẤT CẢ
        </button>
        <button class="btn-auto-tab" id="btnAutoTab" title="Chỉ chạy tự động nội bộ các tính năng trong Tab khu vực đang mở">
          🎯 AUTO TAB NÀY
        </button>
      </div>

      <div class="quick-config-row">
        <div class="delay-box" title="Khoảng nghỉ giữa mỗi thao tác để tự nhiên hơn">
          <span>⏱️ Delay:</span>
          <input type="range" id="rngTaskDelay" min="150" max="3000" step="50">
          <span class="delay-val" id="lblTaskDelay">650ms</span>
        </div>
        <button class="btn-drawer-toggle" id="btnToggleOrderDrawer" title="Sắp xếp thứ tự Khu vực chạy trước / sau">
          ↕️ Thứ tự Khu vực
        </button>
      </div>

      <div class="order-drawer" id="orderDrawer">
        <div class="order-drawer-head">
          <span>🔄 Kéo thả thứ tự chạy "Auto Tất Cả":</span>
          <span>Bật/Tắt</span>
        </div>
        <div class="area-order-list" id="areaOrderList"></div>
        <div class="opt-row" style="margin-top:2px;font-size:10.5px;color:#94a3b8;">
          <span>Số cá câu mỗi khu trước khi đổi khu:</span>
          <input type="number" id="inpFishingSwitchCount" min="1" max="200" step="1" style="width:54px;">
        </div>
      </div>
    </div>

    <div class="hud-tabs">
      <button class="tab-btn active" data-tab="farm">
        <span class="tab-dot" id="dotArea_farm"></span>🌾 Nông Trại
      </button>
      <button class="tab-btn" data-tab="benDo">
        <span class="tab-dot" id="dotArea_benDo"></span>🛶 Bến Đò
      </button>
      <button class="tab-btn" data-tab="sea">
        <span class="tab-dot" id="dotArea_sea"></span>🏖️ Biển
      </button>
      <button class="tab-btn" data-tab="city">
        🏙️ Thành Phố
      </button>
    </div>

    <div class="hud-body">
      <!-- TAB 1: NÔNG TRẠI -->
      <div class="tab-pane active" id="pane-farm">
        <div class="area-enable-banner" id="bannerArea_farm">
          <span>🌾 Cho phép chạy Khu vực Nông Trại</span>
          <input type="checkbox" id="chkArea_farm">
        </div>
        <div class="hint-note">
          💡 Kéo thả biểu tượng <b>⠿</b> (hoặc bấm <b>▲/▼</b>) ở từng mục để sắp xếp việc nào làm trước, việc nào làm sau.
        </div>
        <div id="farmSubCardsContainer" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>

      <!-- TAB 2: BẾN ĐÒ -->
      ${getWharfTabHtml()}

      <!-- TAB 3: BIỂN -->
      ${getSeaTabHtml()}

      <!-- TAB 4: THÀNH PHỐ -->
      ${getCityTabHtml()}
    </div>
  `;

  shadow.appendChild(style);
  shadow.appendChild(panel);

  els = {
    panel,
    dragHandle: shadow.getElementById('hudDragHandle') as HTMLElement,
    btnCheckUpdate: shadow.getElementById('btnCheckUpdate') as HTMLButtonElement,
    btnMinimize: shadow.getElementById('btnMinimize') as HTMLButtonElement,
    btnHide: shadow.getElementById('btnHide') as HTMLButtonElement,
    btnHdrAutoAll: shadow.getElementById('btnHdrAutoAll') as HTMLButtonElement | null,
    btnHdrAutoTab: shadow.getElementById('btnHdrAutoTab') as HTMLButtonElement | null,
    btnAutoAll: shadow.getElementById('btnAutoAll') as HTMLButtonElement,
    btnAutoTab: shadow.getElementById('btnAutoTab') as HTMLButtonElement,
    rngTaskDelay: shadow.getElementById('rngTaskDelay') as HTMLInputElement,
    lblTaskDelay: shadow.getElementById('lblTaskDelay') as HTMLElement,
    btnToggleOrderDrawer: shadow.getElementById('btnToggleOrderDrawer') as HTMLButtonElement,
    orderDrawer: shadow.getElementById('orderDrawer') as HTMLElement,
    areaOrderList: shadow.getElementById('areaOrderList') as HTMLElement,
    inpFishingSwitchCount: shadow.getElementById('inpFishingSwitchCount') as HTMLInputElement,
    farmSubCardsContainer: shadow.getElementById('farmSubCardsContainer') as HTMLElement,
    statTime: shadow.getElementById('statTime') as HTMLElement,
    statGold: shadow.getElementById('statGold') as HTMLElement,
    statHunger: shadow.getElementById('statHunger') as HTMLElement,
    statThirst: shadow.getElementById('statThirst') as HTMLElement,
    statEnergy: shadow.getElementById('statEnergy') as HTMLElement,
    statExtra: shadow.getElementById('statExtra') as HTMLElement,
    statusAction: shadow.getElementById('statusAction') as HTMLElement,
    tabs: Array.from(shadow.querySelectorAll('.tab-btn')),
    panes: {
      farm: shadow.getElementById('pane-farm'),
      benDo: shadow.getElementById('pane-benDo'),
      sea: shadow.getElementById('pane-sea'),
      city: shadow.getElementById('pane-city'),
    },
  };

  buildFarmSubCards(els.farmSubCardsContainer, config, saveConfig, bindDataKeyInputs);
  bindHudEvents(shadow);
  setupDraggableHud(panel, els.dragHandle);
  renderAll();

  // Background check for update on start
  checkForUpdates(currentVersion)
    .then((res) => {
      if (res.hasUpdate && els?.btnCheckUpdate) {
        els.btnCheckUpdate.classList.add('has-update');
        els.btnCheckUpdate.title = `Có bản cập nhật mới ${res.latestVersion}! Bấm để xem chi tiết.`;
      }
    })
    .catch(() => {});
}

export function bindDataKeyInputs(rootEl: HTMLElement | ShadowRoot): void {
  rootEl.querySelectorAll('[data-key]').forEach((element) => {
    const el = element as HTMLInputElement | HTMLSelectElement;
    if (el.dataset.bound === '1') return;
    el.dataset.bound = '1';
    const key = el.dataset.key as keyof AppConfig;

    el.addEventListener('change', () => {
      if (el.type === 'checkbox') {
        (config as any)[key] = (el as HTMLInputElement).checked;
      } else if (el.type === 'number' || el.type === 'range') {
        (config as any)[key] = Number(el.value);
      } else {
        (config as any)[key] = el.value;
      }
      saveConfig();
    });
  });
}

function bindHudEvents(shadow: ShadowRoot): void {
  if (!els) return;

  // Tabs navigation
  els.tabs.forEach((btn) => {
    btn.addEventListener('click', () => {
      config.activeTab = (btn.dataset.tab as AreaId) || 'farm';
      saveConfig();
    });
  });

  // Minimize / Hide
  els.btnMinimize.addEventListener('click', () => {
    config.panelMinimized = !config.panelMinimized;
    saveConfig();
  });
  els.btnHide.addEventListener('click', () => {
    config.panelVisible = false;
    saveConfig();
  });

  // Check Update
  els.btnCheckUpdate.addEventListener('click', () => {
    openUpdateModal();
  });

  // Dual Auto buttons
  if (els.btnHdrAutoAll) {
    els.btnHdrAutoAll.addEventListener('click', () => {
      els?.btnAutoAll.click();
    });
  }

  if (els.btnHdrAutoTab) {
    els.btnHdrAutoTab.addEventListener('click', () => {
      els?.btnAutoTab.click();
    });
  }

  els.btnAutoAll.addEventListener('click', () => {
    if (onToggleAllHandler) {
      onToggleAllHandler();
    } else {
      if (config.running && config.runMode === 'all') {
        config.running = false;
        setStatus('⏸️ Đã dừng Auto Tất Cả');
      } else {
        config.running = true;
        config.runMode = 'all';
        lockedTabArea = null;
        setStatus('▶️ Bắt đầu chạy Auto Tất Cả theo thứ tự...');
      }
      saveConfig();
    }
  });

  els.btnAutoTab.addEventListener('click', () => {
    if (onToggleTabHandler) {
      onToggleTabHandler();
    } else {
      if (config.running && config.runMode === 'tab') {
        config.running = false;
        lockedTabArea = null;
        setStatus('⏸️ Đã dừng Auto Tab');
      } else {
        config.running = true;
        config.runMode = 'tab';
        lockedTabArea = config.activeTab;
        const areaName = AREA_META[lockedTabArea]?.name || lockedTabArea;
        setStatus(`🎯 Bắt đầu chỉ Auto trong Tab: ${areaName}`);
      }
      saveConfig();
    }
  });

  // Task Delay
  els.rngTaskDelay.addEventListener('input', () => {
    if (els) els.lblTaskDelay.textContent = `${els.rngTaskDelay.value}ms`;
  });
  els.rngTaskDelay.addEventListener('change', () => {
    if (els) config.taskDelayMs = Number(els.rngTaskDelay.value) || 650;
    saveConfig();
  });

  // Toggle Drawer
  els.btnToggleOrderDrawer.addEventListener('click', () => {
    config.showOrderDrawer = !config.showOrderDrawer;
    saveConfig();
  });

  // Fishing Switch Count
  els.inpFishingSwitchCount.addEventListener('change', () => {
    if (els) config.fishingSwitchCount = Math.max(1, Number(els.inpFishingSwitchCount.value) || 15);
    saveConfig();
  });

  // Banner area checkboxes
  (['farm', 'benDo', 'sea'] as AreaId[]).forEach((areaId) => {
    const chk = shadow.getElementById(`chkArea_${areaId}`) as HTMLInputElement | null;
    if (chk) {
      chk.addEventListener('change', () => {
        config.areaEnabled[areaId] = chk.checked;
        saveConfig();
      });
    }
  });

  bindDataKeyInputs(shadow);
}

let dragAreaId: AreaId | null = null;

export function renderAreaOrderList(): void {
  if (!els || !els.areaOrderList) return;
  const list = els.areaOrderList;
  list.innerHTML = '';

  config.areaOrder.forEach((areaId, index) => {
    const meta = AREA_META[areaId] || { id: areaId, icon: '📍', name: areaId };
    const enabled = config.areaEnabled[areaId] !== false;

    const item = document.createElement('div');
    item.className = 'area-order-item';
    item.draggable = true;
    item.dataset.areaId = areaId;

    item.innerHTML = `
      <div class="area-order-left">
        <span class="drag-handle" title="Kéo thả để sắp xếp">⠿</span>
        <span class="area-order-badge">#${index + 1}</span>
        <span class="area-name-link" title="Bấm để chuyển nhanh tới Tab ${meta.name}">${meta.icon} ${meta.name}</span>
      </div>
      <div class="area-order-right">
        <button type="button" class="mini-move-btn" data-move="up" title="Lên">▲</button>
        <button type="button" class="mini-move-btn" data-move="down" title="Xuống">▼</button>
        <input type="checkbox" class="area-enable-chk" ${enabled ? 'checked' : ''} title="Bật / Tắt khu vực này khi Auto Tất Cả">
      </div>
    `;

    const link = item.querySelector('.area-name-link') as HTMLElement;
    link.addEventListener('click', () => {
      config.activeTab = areaId;
      saveConfig();
    });

    const chk = item.querySelector('.area-enable-chk') as HTMLInputElement;
    chk.addEventListener('change', () => {
      config.areaEnabled[areaId] = chk.checked;
      saveConfig();
    });

    item.querySelectorAll('.mini-move-btn').forEach((btnEl) => {
      const btn = btnEl as HTMLButtonElement;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const dir = btn.dataset.move;
        const idx = config.areaOrder.indexOf(areaId);
        if (idx < 0) return;
        const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= config.areaOrder.length) return;
        const arr = [...config.areaOrder];
        const temp = arr[idx];
        arr[idx] = arr[targetIdx];
        arr[targetIdx] = temp;
        config.areaOrder = arr;
        saveConfig();
      });
    });

    item.addEventListener('dragstart', (e) => {
      dragAreaId = areaId;
      item.classList.add('dragging');
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    item.addEventListener('dragend', () => {
      dragAreaId = null;
      item.classList.remove('dragging');
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      if (!dragAreaId || dragAreaId === areaId) return;
      const arr = [...config.areaOrder];
      const fromIdx = arr.indexOf(dragAreaId);
      const toIdx = arr.indexOf(areaId);
      if (fromIdx < 0 || toIdx < 0) return;
      arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, dragAreaId);
      config.areaOrder = arr;
      saveConfig();
    });

    list.appendChild(item);
  });
}

function setupDraggableHud(panel: HTMLElement, handle: HTMLElement): void {
  let dragging = false;
  let startX = 0;
  let startY = 0;
  let initLeft = 0;
  let initTop = 0;

  handle.addEventListener('mousedown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    dragging = true;
    const rect = panel.getBoundingClientRect();
    startX = e.clientX;
    startY = e.clientY;
    initLeft = rect.left;
    initTop = rect.top;
    panel.style.right = 'auto';
    panel.style.left = `${initLeft}px`;
    panel.style.top = `${initTop}px`;
  });

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    panel.style.left = `${Math.max(0, Math.min(window.innerWidth - 120, initLeft + dx))}px`;
    panel.style.top = `${Math.max(0, Math.min(window.innerHeight - 60, initTop + dy))}px`;
  });

  window.addEventListener('mouseup', () => {
    dragging = false;
  });
}

export function renderAll(): void {
  if (!hudRoot || !els || !els.panel) return;

  els.panel.classList.toggle('hidden', !config.panelVisible);
  els.panel.classList.toggle('minimized', Boolean(config.panelMinimized));

  const isAllActive = config.running && config.runMode === 'all';
  const isTabActive = config.running && config.runMode === 'tab';
  const lockedAreaName = (lockedTabArea && AREA_META[lockedTabArea]?.name) || lockedTabArea || 'Tab Này';
  const activeAreaName = AREA_META[config.activeTab]?.name || 'Tab Này';

  els.btnAutoAll.classList.toggle('active', isAllActive);
  els.btnAutoAll.textContent = isAllActive ? '⏹️ DỪNG TẤT CẢ' : '▶️ AUTO TẤT CẢ';

  els.btnAutoTab.classList.toggle('active', isTabActive);
  els.btnAutoTab.textContent = isTabActive
    ? `⏹️ DỪNG (${lockedAreaName.toUpperCase()})`
    : `🎯 AUTO ${activeAreaName.toUpperCase()}`;

  if (els.btnHdrAutoAll) {
    els.btnHdrAutoAll.classList.toggle('active', isAllActive);
    els.btnHdrAutoAll.textContent = isAllActive ? '⏹️ Dừng' : '▶️ Tất cả';
  }
  if (els.btnHdrAutoTab) {
    els.btnHdrAutoTab.classList.toggle('active', isTabActive);
    els.btnHdrAutoTab.textContent = isTabActive ? `⏹️ ${lockedAreaName}` : `🎯 ${activeAreaName}`;
  }

  els.rngTaskDelay.value = String(config.taskDelayMs || 650);
  els.lblTaskDelay.textContent = `${config.taskDelayMs || 650}ms`;
  els.orderDrawer.classList.toggle('collapsed', !config.showOrderDrawer);
  els.inpFishingSwitchCount.value = String(config.fishingSwitchCount || 15);

  renderAreaOrderList();

  els.tabs.forEach((btn) => {
    const t = btn.dataset.tab;
    btn.classList.toggle('active', t === config.activeTab);
  });

  Object.entries(els.panes).forEach(([k, pane]) => {
    if (pane) pane.classList.toggle('active', k === config.activeTab);
  });

  (['farm', 'benDo', 'sea'] as AreaId[]).forEach((areaId) => {
    const enabled = config.areaEnabled[areaId] !== false;
    const dot = hudRoot?.getElementById(`dotArea_${areaId}`);
    if (dot) dot.classList.toggle('off', !enabled);
    const chk = hudRoot?.getElementById(`chkArea_${areaId}`) as HTMLInputElement | null;
    if (chk) chk.checked = enabled;
    const banner = hudRoot?.getElementById(`bannerArea_${areaId}`);
    if (banner) banner.classList.toggle('off', !enabled);
  });

  const existingCards = Array.from(els.farmSubCardsContainer.querySelectorAll('.sub-card')) as HTMLElement[];
  const currentDomOrder = existingCards.map((c) => c.dataset.subId).join(',');
  if (currentDomOrder !== config.farmSubOrder.join(',')) {
    buildFarmSubCards(els.farmSubCardsContainer, config, saveConfig, bindDataKeyInputs);
  } else {
    existingCards.forEach((card, idx) => {
      const subId = card.dataset.subId;
      if (!subId) return;
      const enabled = config.farmSubEnabled[subId as keyof typeof config.farmSubEnabled] !== false;
      const collapsed = Boolean(config.farmSubCollapsed[subId as keyof typeof config.farmSubCollapsed]);
      card.classList.toggle('disabled-card', !enabled);
      card.classList.toggle('collapsed', collapsed);
      const idxBadge = card.querySelector('.order-idx');
      if (idxBadge) idxBadge.textContent = `#${idx + 1}`;
      const chk = card.querySelector('.sub-enable-chk') as HTMLInputElement | null;
      if (chk) chk.checked = enabled;
    });
  }

  hudRoot.querySelectorAll('[data-key]').forEach((element) => {
    const el = element as HTMLInputElement | HTMLSelectElement;
    const key = el.dataset.key as keyof AppConfig;
    if (!(key in config)) return;
    if (el.type === 'checkbox') {
      (el as HTMLInputElement).checked = Boolean(config[key]);
    } else if (document.activeElement !== el) {
      el.value = String(config[key]);
    }
  });

  hudRoot.querySelectorAll('[data-show-if]').forEach((subBlock) => {
    const parentKey = (subBlock as HTMLElement).dataset.showIf as keyof AppConfig;
    const shouldShow = Boolean(config[parentKey]);
    subBlock.classList.toggle('hidden', !shouldShow);
  });
}

export function updateHeaderStats(snap: any): void {
  if (!els || !els.statTime || !snap) return;
  els.statTime.textContent = `📅 Ngày ${snap.day ?? '--'} · 🕒 ${formatClock(snap.minutes)}`;
  els.statGold.textContent = `💰 ${formatGold(snap.gold)}`;
  els.statHunger.textContent = `🍙 ${Math.round(snap.fullness ?? 0)}%`;
  els.statThirst.textContent = `💧 ${Math.round(snap.hydration ?? 0)}%`;

  if (snap.screen === 'benDo' && snap.benNet?.wallet) {
    els.statEnergy.textContent = `⚡ Sức ${Math.round(snap.benNet.wallet.liveStamina ?? 0)}`;
  } else if (snap.vehicle) {
    els.statEnergy.textContent = `🔋 Pin ${Math.round(snap.battery ?? 0)}%`;
  } else {
    els.statEnergy.textContent = `🌱 ${Object.keys(snap.plots || {}).length} ô`;
  }

  if (snap.screen === 'benDo' && snap.benNet?.wallet) {
    const w = snap.benNet.wallet;
    els.statExtra.textContent = `🛶 🐚${w.shells ?? 0} · 🪱${w.bait ?? 0} · ⚡${w.liveStamina ?? 0}`;
  } else if (snap.screen === 'sea') {
    const b = snap.fishing?.bait || {};
    els.statExtra.textContent = `🏖️ 🪱${b.worm ?? 0} · 🦐${b.shrimp ?? 0} · 🧺${snap.fishing?.basket?.length ?? 0}`;
  } else {
    const screenNames: Record<string, string> = {
      playing: '🌾 Nông trại',
      worldmap: '🗺️ Bản đồ',
      sea: '🏖️ Biển',
      benDo: '🛶 Bến đò',
      city: '🏙️ Thành phố',
    };
    els.statExtra.textContent = screenNames[snap.screen] || `📍 ${snap.screen || '--'}`;
  }
}
