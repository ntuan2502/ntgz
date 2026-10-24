"use strict";
(() => {
  // src/content/bridge/content-bridge.ts
  var reqSeq = 0;
  var pendingReqs = /* @__PURE__ */ new Map();
  function injectPageHook() {
    try {
      const s = document.createElement("script");
      s.src = chrome.runtime.getURL("page-hook.js");
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {
      console.error("[NTG Auto] Inject page-hook failed:", e);
    }
  }
  function initBridgeListener() {
    window.addEventListener("message", (e) => {
      if (e.source !== window || !e.data || e.data.source !== "ntg-page") return;
      const { id, data } = e.data;
      const resolve = pendingReqs.get(id);
      if (resolve) {
        pendingReqs.delete(id);
        resolve(data);
      }
    });
  }
  function callPageHook(type, action = null, payload = {}) {
    return new Promise((resolve) => {
      const id = ++reqSeq;
      const timer = setTimeout(() => {
        pendingReqs.delete(id);
        resolve({ ok: false, error: "TIMEOUT" });
      }, 2500);
      pendingReqs.set(id, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      window.postMessage({ source: "ntg-content", id, type, action, payload }, "*");
    });
  }
  var getGameState = () => callPageHook("GET_GAME_STATE");
  var execGameAction = (action, payload = {}) => callPageHook("EXEC_GAME_ACTION", action, payload);

  // src/shared/constants/default-config.ts
  var AREA_META = {
    farm: { id: "farm", icon: "\u{1F33E}", name: "N\xF4ng Tr\u1EA1i" },
    benDo: { id: "benDo", icon: "\u{1F6F6}", name: "B\u1EBFn \u0110\xF2" },
    sea: { id: "sea", icon: "\u{1F3D6}\uFE0F", name: "Bi\u1EC3n" },
    city: { id: "city", icon: "\u{1F3D9}\uFE0F", name: "Th\xE0nh Ph\u1ED1" }
  };
  var SUBAREA_META = {
    house: { id: "house", icon: "\u{1F3E0}", name: "Nh\xE0, B\u1EBFp & Nhu C\u1EA7u" },
    crops: { id: "crops", icon: "\u{1F331}", name: "Ru\u1ED9ng \u0110\u1ED3ng (Tr\u1ED3ng Tr\u1ECDt)" },
    pet: { id: "pet", icon: "\u{1F415}", name: "Th\xFA C\u01B0ng (Ch\xF3 / M\xE8o)" },
    barn: { id: "barn", icon: "\u{1F403}", name: "Chu\u1ED3ng Tr\xE2u & B\xF2 S\u1EEFa" },
    coop: { id: "coop", icon: "\u{1F414}", name: "Chu\u1ED3ng G\xE0" },
    pond: { id: "pond", icon: "\u{1F41F}", name: "Ao C\xE1" },
    market: { id: "market", icon: "\u{1F3EA}", name: "T\u1EA1p H\xF3a & B\u1EA3ng Tin L\xE0ng" },
    dibay: { id: "dibay", icon: "\u{1F437}", name: "Qu\u1EA7y D\xEC B\u1EA3y & S\u1ED5 Tay" }
  };
  var DEFAULT_CONFIG = {
    running: false,
    runMode: "all",
    activeTab: "farm",
    panelVisible: true,
    panelMinimized: false,
    showOrderDrawer: true,
    // General Delay & Transition settings
    taskDelayMs: 650,
    fishingSwitchCount: 15,
    // Main Area Order & Enable/Disable toggles
    areaOrder: ["farm", "benDo", "sea"],
    areaEnabled: {
      farm: true,
      benDo: true,
      sea: true,
      city: false
    },
    // Farm Sub-Area Order & Enable/Disable toggles
    farmSubOrder: ["house", "crops", "pet", "barn", "coop", "pond", "market", "dibay"],
    farmSubEnabled: {
      house: true,
      crops: true,
      pet: true,
      barn: true,
      coop: true,
      pond: true,
      market: true,
      dibay: true
    },
    farmSubCollapsed: {
      house: false,
      crops: false,
      pet: false,
      barn: false,
      coop: false,
      pond: false,
      market: false,
      dibay: false
    },
    // 1. House, Kitchen, Needs & Salon
    autoDismissInterrupts: true,
    autoCook: true,
    preferDish: "auto",
    autoRecoverHunger: true,
    hungerThreshold: 45,
    foodSource: "kitchen_first",
    preferFoodShop: "banhMiThit",
    autoRecoverThirst: true,
    thirstThreshold: 45,
    drinkSource: "kitchen_first",
    preferDrinkShop: "nuocMia",
    needThreshold: 45,
    autoMorningCoffee: true,
    autoChargeVehicle: true,
    batteryThreshold: 35,
    autoSalonShampoo: true,
    autoSalonWhiten: false,
    autoSleep: true,
    sleepHour: 21,
    sleepOnFishingLimit: true,
    // 2. Crops
    autoHarvest: true,
    autoPesticide: true,
    autoPlant: true,
    preferSeed: "auto",
    autoWater: true,
    autoFertilize: true,
    autoBuyPlots: true,
    // 3. Pet
    petAutoFeed: true,
    petAutoCuddle: true,
    petAutoBath: true,
    petAutoTrick: true,
    // 4. Barn (Buffalo & Cows)
    barnAutoFeedBuffalo: true,
    barnAutoBathBuffalo: true,
    barnAutoLendBuffalo: true,
    barnAutoFeedCows: true,
    barnAutoCureCows: true,
    barnAutoSellMilk: true,
    barnAutoPayHelper: true,
    // 5. Coop (Chickens)
    coopAutoCollectEggs: true,
    coopAutoBuyChick: true,
    coopAutoPayHelper: true,
    // 6. Pond (Fish Pond)
    pondAutoNet: true,
    pondAutoStock: true,
    preferPondFish: "chep",
    pondAutoFeed: true,
    pondAutoPayHelper: true,
    // 7. Market & Gold Shop
    autoDeliverOrder: true,
    autoVillageBoard: true,
    autoSellTrend: true,
    autoSellDailyTask: true,
    autoSellProduce: false,
    surplusKeepQty: 20,
    goldAutoBuy: false,
    goldPreferType: "mieng",
    goldKeepCash: 5e5,
    goldAutoSell: true,
    goldProfitPercent: 10,
    // 8. Di Bay & Quests
    autoClaimQuests: true,
    autoFirstDayTasks: true,
    autoNotebookPages: true,
    autoFeedPiggy: true,
    autoBreakPiggy: true,
    autoNewPiggy: true,
    autoSavings: false,
    savingsKeepGold: 2e5,
    // Area 2: Ben Do Fishing Settings
    benAutoSpot: true,
    benSpot: "dock",
    benAutoBuyBait: true,
    benPreferBait: "moi60",
    benAutoSell: true,
    benSellThreshold: 20,
    benAutoKeepRare: true,
    benAutoGoiDau: true,
    benAutoRecoverStamina: true,
    benStaminaThreshold: 20,
    benPreferFood: "comTam",
    benAutoLuckDrink: false,
    benPreferDrink: "nuocMia",
    benAutoLantern: true,
    benBuyLanternTicket: false,
    benAutoLotto: true,
    benAutoBuyLotto: true,
    benAutoAtm: false,
    benAtmThreshold: 500,
    // Area 3: Sea Fishing Settings
    seaAutoSpot: true,
    seaSpot: "pier",
    seaAutoBuyBait: true,
    seaPreferBait: "worm",
    seaBaitPacks: 2,
    seaAutoSell: true,
    seaSellThreshold: 5,
    seaAutoClaimDex: true,
    seaAutoEat: true,
    seaStaminaThreshold: 20
  };

  // src/content/ui/hud-styles.ts
  var HUD_STYLES = `
  * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; user-select: none; }
  .hud-panel {
    position: fixed;
    top: 12px;
    right: 12px;
    width: 356px;
    max-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.96);
    backdrop-filter: blur(12px);
    color: #f8fafc;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.6);
    pointer-events: auto;
    overflow: hidden;
    font-size: 12px;
    transition: opacity 0.2s;
  }
  .hud-panel.hidden { display: none !important; }
  .hud-panel.minimized .hud-body,
  .hud-panel.minimized .hud-tabs,
  .hud-panel.minimized .hud-top-controls,
  .hud-panel.minimized .hud-stats { display: none !important; }
  .hud-panel.minimized { width: 356px; }

  .hud-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    background: linear-gradient(135deg, #16a34a, #15803d);
    cursor: move;
    font-weight: 700;
    font-size: 12px;
    gap: 6px;
  }
  .hud-title { display: flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 12px; }
  .hud-header-btns {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .hdr-auto-btn {
    border: none;
    border-radius: 6px;
    padding: 4px 7px;
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .hdr-auto-btn.all {
    background: rgba(22, 101, 52, 0.9);
    border: 1px solid rgba(74, 222, 128, 0.4);
  }
  .hdr-auto-btn.all:hover {
    background: #15803d;
  }
  .hdr-auto-btn.all.active {
    background: #dc2626;
    border-color: #f87171;
  }
  .hdr-auto-btn.tab {
    background: rgba(30, 64, 175, 0.9);
    border: 1px solid rgba(96, 165, 250, 0.4);
  }
  .hdr-auto-btn.tab:hover {
    background: #1d4ed8;
  }
  .hdr-auto-btn.tab.active {
    background: #dc2626;
    border-color: #f87171;
  }
  .hud-actions { display: flex; gap: 4px; }
  .icon-btn {
    background: rgba(255, 255, 255, 0.16);
    border: none;
    color: #fff;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .icon-btn:hover { background: rgba(255, 255, 255, 0.3); }

  /* Live Stats Bar */
  .hud-stats {
    padding: 6px 10px;
    background: rgba(30, 41, 59, 0.85);
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #cbd5e1;
  }
  .stats-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .stat-pill {
    background: rgba(15, 23, 42, 0.75);
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 10.5px;
    border: 1px solid rgba(148, 163, 184, 0.16);
  }
  .status-banner {
    font-size: 11px;
    color: #fde047;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-top: 2px;
  }

  /* Top Dual Auto Buttons & Delay Config */
  .hud-top-controls {
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.92);
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dual-btn-row {
    display: flex;
    gap: 6px;
  }
  .btn-auto-all, .btn-auto-tab {
    flex: 1;
    padding: 8px 6px;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11.5px;
    cursor: pointer;
    color: #fff;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .btn-auto-all {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    box-shadow: 0 3px 10px rgba(34, 197, 94, 0.25);
  }
  .btn-auto-tab {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    box-shadow: 0 3px 10px rgba(59, 130, 246, 0.25);
  }
  .btn-auto-all.active, .btn-auto-tab.active {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 3px 12px rgba(239, 68, 68, 0.35);
  }

  .quick-config-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
    color: #cbd5e1;
  }
  .delay-box {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
  }
  .delay-box input[type="range"] {
    flex: 1;
    accent-color: #22c55e;
    cursor: pointer;
  }
  .delay-val {
    min-width: 48px;
    text-align: right;
    font-weight: 700;
    color: #4ade80;
    font-size: 11px;
  }
  .btn-drawer-toggle {
    background: rgba(51, 65, 85, 0.8);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-drawer-toggle:hover { background: rgba(71, 85, 105, 0.9); }

  /* Drag & Drop Area Order Drawer */
  .order-drawer {
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .order-drawer.collapsed { display: none; }
  .order-drawer-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    color: #94a3b8;
    font-weight: 600;
  }
  .area-order-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .area-order-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 6px;
    padding: 4px 7px;
    cursor: grab;
    transition: background 0.15s, border-color 0.15s;
  }
  .area-order-item.dragging {
    opacity: 0.5;
    border-color: #4ade80;
  }
  .area-order-item.disabled-area {
    opacity: 0.55;
  }
  .area-order-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
  }
  .drag-handle {
    color: #64748b;
    font-size: 13px;
    cursor: grab;
    padding: 0 2px;
  }
  .order-idx {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .area-order-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .mini-move-btn {
    background: rgba(51, 65, 85, 0.7);
    border: none;
    color: #cbd5e1;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    font-size: 9px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mini-move-btn:hover { background: #475569; color: #fff; }

  /* 4 Area Tabs */
  .hud-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }
  .tab-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 8px 2px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    border-bottom: 2.5px solid transparent;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }
  .tab-btn:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.03); }
  .tab-btn.active {
    color: #4ade80;
    border-bottom-color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }
  .tab-btn .tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }
  .tab-btn .tab-dot.off {
    background: #64748b;
  }

  /* Scrollable Tab Body */
  .hud-body {
    padding: 10px;
    overflow-y: auto;
    max-height: 410px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hud-body::-webkit-scrollbar { width: 5px; }
  .hud-body::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 99px; }

  .tab-pane { display: none; flex-direction: column; gap: 8px; }
  .tab-pane.active { display: flex; }

  /* Area Master Enable Banner inside each Tab */
  .area-enable-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(22, 163, 74, 0.14);
    border: 1px solid rgba(34, 197, 94, 0.35);
    border-radius: 8px;
    padding: 7px 10px;
    font-weight: 700;
    font-size: 11.5px;
  }
  .area-enable-banner.off {
    background: rgba(51, 65, 85, 0.35);
    border-color: rgba(148, 163, 184, 0.2);
    color: #94a3b8;
  }

  /* Sub-Area Cards */
  .sub-card {
    background: rgba(30, 41, 59, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 9px;
    overflow: hidden;
    transition: border-color 0.15s, opacity 0.15s;
  }
  .sub-card.dragging {
    opacity: 0.45;
    border-color: #4ade80;
  }
  .sub-card.disabled-card {
    opacity: 0.6;
  }
  .sub-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 9px;
    background: rgba(15, 23, 42, 0.55);
    cursor: pointer;
  }
  .sub-card-head-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 11.5px;
    color: #93c5fd;
  }
  .sub-card-head-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sub-card-body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }
  .sub-card.collapsed .sub-card-body,
  .sub-card.disabled-card .sub-card-body {
    display: none;
  }

  /* Rows & Progressive Disclosure Sub-Options */
  .opt-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11.5px;
    color: #e2e8f0;
  }
  .opt-sub {
    margin-left: 14px;
    padding: 5px 8px;
    background: rgba(15, 23, 42, 0.55);
    border-left: 2px solid #22c55e;
    border-radius: 0 6px 6px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .opt-sub.hidden { display: none !important; }

  input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: #22c55e;
    cursor: pointer;
    margin: 0;
  }
  select, input[type="number"] {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 11px;
    outline: none;
  }
  input[type="number"] { width: 78px; text-align: right; }

  .hint-note {
    font-size: 10.5px;
    color: #94a3b8;
    line-height: 1.35;
  }

  /* Coming soon box */
  .coming-soon-box {
    padding: 28px 16px;
    text-align: center;
    background: rgba(30, 41, 59, 0.5);
    border: 1px dashed rgba(148, 163, 184, 0.3);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .coming-soon-icon { font-size: 32px; }
  .coming-soon-title { font-size: 14px; font-weight: 700; color: #f8fafc; }
  .coming-soon-desc { font-size: 11.5px; color: #94a3b8; line-height: 1.45; }
`;

  // src/content/ui/tabs/farm-tab.ts
  function getFarmSubCardBodyHtml(subId) {
    switch (subId) {
      case "house":
        return `
        <label class="opt-row">
          <span>\u{1F4AC} T\u1EAFt th\xF4ng b\xE1o \u0110i\u1EC7n tho\u1EA1i & Loa ph\u01B0\u1EDDng</span>
          <input type="checkbox" data-key="autoDismissInterrupts">
        </label>

        <label class="opt-row">
          <span>\u{1F373} T\u1EF1 n\u1EA5u m\xF3n \u0103n trong B\u1EBFp</span>
          <input type="checkbox" data-key="autoCook">
        </label>
        <div class="opt-sub" data-show-if="autoCook">
          <div class="opt-row">
            <span>M\xF3n \u01B0u ti\xEAn n\u1EA5u:</span>
            <select data-key="preferDish">
              <option value="auto">\u2728 T\u1EF1 ch\u1ECDn m\xF3n c\xF3 s\u1EB5n nguy\xEAn li\u1EC7u</option>
              <option value="comTam">\u{1F35B} C\u01A1m t\u1EA5m \u1ED1p la (No l\xE2u)</option>
              <option value="eggBread">\u{1F96A} B\xE1nh m\xEC \u1ED1p la (T\u1ED1c \u0111\u1ED9)</option>
              <option value="radishSoup">\u{1F372} Canh c\u1EE7 c\u1EA3i</option>
              <option value="carrotJuice">\u{1F9C3} N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t</option>
              <option value="grilledCorn">\u{1F33D} B\u1EAFp n\u01B0\u1EDBng m\u1EE1 h\xE0nh</option>
              <option value="boiledEgg">\u{1F95A} Tr\u1EE9ng lu\u1ED9c</option>
              <option value="cornCake">\u{1F96E} B\xE1nh b\u1EAFp n\u01B0\u1EDBng</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F372} T\u1EF1 \u0103n khi \u0110\xF3i</span>
          <input type="checkbox" data-key="autoRecoverHunger">
        </label>
        <div class="opt-sub" data-show-if="autoRecoverHunger">
          <div class="opt-row">
            <span>H\u1ED3i khi \u0110\xF3i &lt; (%):</span>
            <input type="number" data-key="hungerThreshold" min="10" max="90" step="5">
          </div>
          <div class="opt-row">
            <span>Ngu\u1ED3n th\u1EE9c \u0103n:</span>
            <select data-key="foodSource">
              <option value="kitchen_first">\u{1F372} \u01AFu ti\xEAn m\xF3n B\u1EBFp, thi\u1EBFu mua Ti\u1EC7m b\xE1nh</option>
              <option value="kitchen_only">\u{1F3E1} Ch\u1EC9 \u0103n m\xF3n n\u1EA5u trong B\u1EBFp / Kho</option>
              <option value="shop_only">\u{1F956} Ch\u1EC9 mua \u0111\u1ED3 \u0103n Ti\u1EC7m b\xE1nh</option>
            </select>
          </div>
          <div class="opt-row">
            <span>M\xF3n mua \u1EDF Ti\u1EC7m b\xE1nh:</span>
            <select data-key="preferFoodShop">
              <option value="banhMiThit">\u{1F956} B\xE1nh m\xEC th\u1ECBt (15.000\u0111 \xB7 +50 no)</option>
              <option value="banhMiCha">\u{1F41F} B\xE1nh m\xEC ch\u1EA3 c\xE1 (15.000\u0111 \xB7 +45 no)</option>
              <option value="banhMiTrung">\u{1F373} B\xE1nh m\xEC tr\u1EE9ng (10.000\u0111 \xB7 +35 no)</option>
              <option value="banhBao">\u{1F95F} B\xE1nh bao (8.000\u0111 \xB7 +25 no)</option>
              <option value="banhMiFull">\u{1F924} B\xE1nh m\xEC full topping (25.000\u0111 \xB7 +80 no)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F964} T\u1EF1 u\u1ED1ng khi Kh\xE1t</span>
          <input type="checkbox" data-key="autoRecoverThirst">
        </label>
        <div class="opt-sub" data-show-if="autoRecoverThirst">
          <div class="opt-row">
            <span>H\u1ED3i khi Kh\xE1t &lt; (%):</span>
            <input type="number" data-key="thirstThreshold" min="10" max="90" step="5">
          </div>
          <div class="opt-row">
            <span>Ngu\u1ED3n n\u01B0\u1EDBc u\u1ED1ng:</span>
            <select data-key="drinkSource">
              <option value="kitchen_first">\u{1F9C3} \u01AFu ti\xEAn n\u01B0\u1EDBc B\u1EBFp, thi\u1EBFu mua Ti\u1EC7m gi\u1EA3i kh\xE1t</option>
              <option value="shop_only">\u{1F964} Ch\u1EC9 mua n\u01B0\u1EDBc t\u1EA1i Ti\u1EC7m gi\u1EA3i kh\xE1t</option>
              <option value="both">\u2728 Linh ho\u1EA1t c\u1EA3 B\u1EBFp & Ti\u1EC7m</option>
            </select>
          </div>
          <div class="opt-row">
            <span>Lo\u1EA1i n\u01B0\u1EDBc \u01B0u ti\xEAn \u1EDF Ti\u1EC7m:</span>
            <select data-key="preferDrinkShop">
              <option value="nuocMia">\u{1F964} N\u01B0\u1EDBc m\xEDa (8.000\u0111 \xB7 +35 n\u01B0\u1EDBc)</option>
              <option value="traDao">\u{1F351} Tr\xE0 \u0111\xE0o cam s\u1EA3 (15.000\u0111 \xB7 +50 n\u01B0\u1EDBc)</option>
              <option value="traSua">\u{1F9CB} Tr\xE0 s\u1EEFa tr\xE2n ch\xE2u (18.000\u0111 \xB7 +40 n\u01B0\u1EDBc)</option>
              <option value="caPheSua">\u2615 C\xE0 ph\xEA s\u1EEFa \u0111\xE1 (12.000\u0111 \xB7 +25 n\u01B0\u1EDBc)</option>
              <option value="traDa">\u{1F9CA} Tr\xE0 \u0111\xE1 v\u1EC9a h\xE8 (3.000\u0111 \xB7 +20 n\u01B0\u1EDBc)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u2615 T\u1EF1 u\u1ED1ng C\xE0 ph\xEA s\xE1ng (+50% t\u1ED1c \u0111\u1ED9 ch\u1EA1y)</span>
          <input type="checkbox" data-key="autoMorningCoffee">
        </label>

        <label class="opt-row">
          <span>\u{1F50B} T\u1EF1 s\u1EA1c \u0111i\u1EC7n cho Xe m\xE1y \u0111i\u1EC7n EV</span>
          <input type="checkbox" data-key="autoChargeVehicle">
        </label>
        <div class="opt-sub" data-show-if="autoChargeVehicle">
          <div class="opt-row">
            <span>S\u1EA1c khi Pin xe &lt; (%):</span>
            <input type="number" data-key="batteryThreshold" min="10" max="90" step="5">
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F486} Ch\u1ECB Linh Salon: G\u1ED9i \u0111\u1EA7u d\u01B0\u1EE1ng sinh (Buff th\u01B0 gi\xE3n)</span>
          <input type="checkbox" data-key="autoSalonShampoo">
        </label>

        <label class="opt-row">
          <span>\u2728 Ch\u1ECB Linh Salon: T\u1EAFm tr\u1EAFng n\xE2ng t\xF4ng khi \u0111en da</span>
          <input type="checkbox" data-key="autoSalonWhiten">
        </label>

        <label class="opt-row">
          <span>\u{1F6CF}\uFE0F T\u1EF1 \u0111i ng\u1EE7 qua ng\xE0y m\u1EDBi</span>
          <input type="checkbox" data-key="autoSleep">
        </label>
        <div class="opt-sub" data-show-if="autoSleep">
          <div class="opt-row">
            <span>Gi\u1EDD \u0111i ng\u1EE7 bu\u1ED5i t\u1ED1i (h):</span>
            <input type="number" data-key="sleepHour" min="18" max="23" step="1">
          </div>
          <label class="opt-row">
            <span>\u{1F319} Ng\u1EE7 ngay khi h\u1EBFt c\xE2u \u0111\u01B0\u1EE3c bu\u1ED5i t\u1ED1i</span>
            <input type="checkbox" data-key="sleepOnFishingLimit">
          </label>
        </div>
      `;
      case "crops":
        return `
        <label class="opt-row">
          <span>\u{1F33E} T\u1EF1 thu ho\u1EA1ch n\xF4ng s\u1EA3n ch\xEDn</span>
          <input type="checkbox" data-key="autoHarvest">
        </label>
        <label class="opt-row">
          <span>\u{1F41B} T\u1EF1 mua thu\u1ED1c & di\u1EC7t s\xE2u b\u1EC7nh</span>
          <input type="checkbox" data-key="autoPesticide">
        </label>
        <label class="opt-row">
          <span>\u{1F4A7} T\u1EF1 t\u01B0\u1EDBi n\u01B0\u1EDBc gi\u1EEF \u1EA9m</span>
          <input type="checkbox" data-key="autoWater">
        </label>
        <label class="opt-row">
          <span>\u{1F9EA} T\u1EF1 mua & b\xF3n ph\xE2n NPK</span>
          <input type="checkbox" data-key="autoFertilize">
        </label>

        <label class="opt-row">
          <span>\u{1F331} T\u1EF1 mua & gieo h\u1EA1t gi\u1ED1ng m\u1EDBi</span>
          <input type="checkbox" data-key="autoPlant">
        </label>
        <div class="opt-sub" data-show-if="autoPlant">
          <div class="opt-row">
            <span>H\u1EA1t gi\u1ED1ng \u01B0u ti\xEAn:</span>
            <select data-key="preferSeed">
              <option value="auto">\u2728 T\u1EF1 ch\u1ECDn t\u1ED1i \u01B0u</option>
              <option value="rice">\u{1F33E} L\xFAa (8 ng\xE0y)</option>
              <option value="corn">\u{1F33D} B\u1EAFp (6 ng\xE0y)</option>
              <option value="carrot">\u{1F955} C\xE0 r\u1ED1t (4 ng\xE0y)</option>
              <option value="radish">\u5927\u6839 C\u1EE7 c\u1EA3i (2 ng\xE0y)</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u26CF\uFE0F T\u1EF1 mua th\xEAm \xF4 \u0111\u1EA5t ru\u1ED9ng khi m\u1EDF b\xE1n</span>
          <input type="checkbox" data-key="autoBuyPlots">
        </label>
      `;
      case "pet":
        return `
        <label class="opt-row">
          <span>\u{1F356} T\u1EF1 mua \u0111\u1ED3 \u0103n & cho Th\xFA c\u01B0ng \u0103n</span>
          <input type="checkbox" data-key="petAutoFeed">
        </label>
        <label class="opt-row">
          <span>\u{1F496} T\u1EF1 vu\u1ED1t ve t\u0103ng vui v\u1EBB</span>
          <input type="checkbox" data-key="petAutoCuddle">
        </label>
        <label class="opt-row">
          <span>\u{1F9FC} T\u1EF1 t\u1EAFm s\u1EA1ch cho Th\xFA c\u01B0ng</span>
          <input type="checkbox" data-key="petAutoBath">
        </label>
        <label class="opt-row">
          <span>\u{1F3BE} T\u1EF1 t\u1EADp tr\xF2 hu\u1EA5n luy\u1EC7n (+XP)</span>
          <input type="checkbox" data-key="petAutoTrick">
        </label>
      `;
      case "barn":
        return `
        <label class="opt-row">
          <span>\u{1F403} T\u1EF1 cho Tr\xE2u \u0103n c\u1ECF / r\u01A1m</span>
          <input type="checkbox" data-key="barnAutoFeedBuffalo">
        </label>
        <label class="opt-row">
          <span>\u{1F6BF} T\u1EF1 t\u1EAFm m\xE1t cho Tr\xE2u</span>
          <input type="checkbox" data-key="barnAutoBathBuffalo">
        </label>
        <label class="opt-row">
          <span>\u{1F91D} T\u1EF1 cho h\xE0ng x\xF3m thu\xEA Tr\xE2u c\xE0y (t\u0103ng vui & ti\u1EC1n)</span>
          <input type="checkbox" data-key="barnAutoLendBuffalo">
        </label>
        <label class="opt-row">
          <span>\u{1F404} T\u1EF1 cho \u0111\xE0n B\xF2 s\u1EEFa \u0103n c\u1ECF</span>
          <input type="checkbox" data-key="barnAutoFeedCows">
        </label>
        <label class="opt-row">
          <span>\u{1F48A} T\u1EF1 mua thu\u1ED1c & ch\u1EEFa b\u1EC7nh cho B\xF2</span>
          <input type="checkbox" data-key="barnAutoCureCows">
        </label>
        <label class="opt-row">
          <span>\u{1F95B} T\u1EF1 v\u1EAFt s\u1EEFa & b\xE1n s\u1EEFa b\xF2</span>
          <input type="checkbox" data-key="barnAutoSellMilk">
        </label>
        <label class="opt-row">
          <span>\u{1F4B8} T\u1EF1 tr\u1EA3 l\u01B0\u01A1ng ng\u01B0\u1EDDi ph\u1EE5 Chu\u1ED3ng</span>
          <input type="checkbox" data-key="barnAutoPayHelper">
        </label>
      `;
      case "coop":
        return `
        <label class="opt-row">
          <span>\u{1F95A} T\u1EF1 nh\u1EB7t tr\u1EE9ng g\xE0 m\u1ED7i ng\xE0y</span>
          <input type="checkbox" data-key="coopAutoCollectEggs">
        </label>
        <label class="opt-row">
          <span>\u{1F424} T\u1EF1 mua th\xEAm G\xE0 con khi chu\u1ED3ng tr\u1ED1ng</span>
          <input type="checkbox" data-key="coopAutoBuyChick">
        </label>
        <label class="opt-row">
          <span>\u{1F4B8} T\u1EF1 tr\u1EA3 l\u01B0\u01A1ng ng\u01B0\u1EDDi ph\u1EE5 Chu\u1ED3ng g\xE0</span>
          <input type="checkbox" data-key="coopAutoPayHelper">
        </label>
      `;
      case "pond":
        return `
        <label class="opt-row">
          <span>\u{1F41F} T\u1EF1 k\xE9o l\u01B0\u1EDBi thu ho\u1EA1ch c\xE1 tr\u01B0\u1EDFng th\xE0nh</span>
          <input type="checkbox" data-key="pondAutoNet">
        </label>
        <label class="opt-row">
          <span>\u{1F35E} T\u1EF1 r\u1EA3i c\xE1m cho c\xE1 \u0103n m\u1ED7i ng\xE0y</span>
          <input type="checkbox" data-key="pondAutoFeed">
        </label>
        <label class="opt-row">
          <span>\u{1F41F} T\u1EF1 th\u1EA3 c\xE1 gi\u1ED1ng m\u1EDBi khi ao tr\u1ED1ng</span>
          <input type="checkbox" data-key="pondAutoStock">
        </label>
        <div class="opt-sub" data-show-if="pondAutoStock">
          <div class="opt-row">
            <span>Lo\u1EA1i c\xE1 gi\u1ED1ng th\u1EA3:</span>
            <select data-key="preferPondFish">
              <option value="chep">\u{1F41F} C\xE1 ch\xE9p (L\u1EDDi cao)</option>
              <option value="tre">\u{1F41F} C\xE1 tr\xEA</option>
              <option value="ro">\u{1F41F} C\xE1 r\xF4</option>
            </select>
          </div>
        </div>
        <label class="opt-row">
          <span>\u{1F4B8} T\u1EF1 tr\u1EA3 l\u01B0\u01A1ng ng\u01B0\u1EDDi ph\u1EE5 Ao c\xE1</span>
          <input type="checkbox" data-key="pondAutoPayHelper">
        </label>
      `;
      case "market":
        return `
        <label class="opt-row">
          <span>\u{1F4E6} T\u1EF1 giao \u0111\u01A1n h\xE0ng T\u1EA1p h\xF3a Ch\u1ECB Na</span>
          <input type="checkbox" data-key="autoDeliverOrder">
        </label>
        <label class="opt-row">
          <span>\u{1F4CB} T\u1EF1 giao \u0111\u01A1n B\u1EA3ng tin l\xE0ng</span>
          <input type="checkbox" data-key="autoVillageBoard">
        </label>
        <label class="opt-row">
          <span>\u{1F525} T\u1EF1 b\xE1n N\xF4ng s\u1EA3n Trend (x2 gi\xE1, b\xE1n \u0111\xFAng quota)</span>
          <input type="checkbox" data-key="autoSellTrend">
        </label>
        <label class="opt-row">
          <span>\u{1F4DC} T\u1EF1 b\xE1n n\xF4ng s\u1EA3n \u0111\u1EC3 ho\xE0n th\xE0nh Vi\u1EC7c S\u1ED5 tay</span>
          <input type="checkbox" data-key="autoSellDailyTask">
        </label>
        <label class="opt-row">
          <span>\u{1F3EA} T\u1EF1 b\xE1n n\xF4ng s\u1EA3n d\u01B0 th\u1EEBa trong kho</span>
          <input type="checkbox" data-key="autoSellProduce">
        </label>
        <div class="opt-sub" data-show-if="autoSellProduce">
          <div class="opt-row">
            <span>S\u1ED1 l\u01B0\u1EE3ng n\xF4ng s\u1EA3n t\u1ED1i thi\u1EC3u gi\u1EEF l\u1EA1i:</span>
            <input type="number" data-key="surplusKeepQty" min="5" max="200" step="5">
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1FA99} T\u1EF1 mua v\xE0ng \u0111\u1EA7u t\u01B0 t\u1EA1i C\xF4 Kim Ti\u1EC7m V\xE0ng</span>
          <input type="checkbox" data-key="goldAutoBuy">
        </label>
        <div class="opt-sub" data-show-if="goldAutoBuy">
          <div class="opt-row">
            <span>Lo\u1EA1i v\xE0ng \u01B0u ti\xEAn:</span>
            <select data-key="goldPreferType">
              <option value="mieng">\u{1F7E8} V\xE0ng mi\u1EBFng 9999 (Ch\xEAnh th\u1EA5p, gi\u1EEF l\xE2u)</option>
              <option value="nhan">\u{1F48D} Nh\u1EABn tr\u01A1n 9999 (\u1ED4n \u0111\u1ECBnh nh\u1EA5t)</option>
              <option value="k18">\u{1F4FF} V\xE0ng 18K (Trang s\u1EE9c)</option>
              <option value="non">\u{1FA99} V\xE0ng non 10K (L\u01B0\u1EDBt s\xF3ng)</option>
            </select>
          </div>
          <div class="opt-row">
            <span>Ti\u1EC1n m\u1EB7t t\u1ED1i thi\u1EC3u gi\u1EEF l\u1EA1i:</span>
            <input type="number" data-key="goldKeepCash" min="100000" max="10000000" step="100000">
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F4C8} T\u1EF1 b\xE1n v\xE0ng C\xF4 Kim khi c\xF3 l\xE3i ch\u1ED1t l\u1EDDi</span>
          <input type="checkbox" data-key="goldAutoSell">
        </label>
        <div class="opt-sub" data-show-if="goldAutoSell">
          <div class="opt-row">
            <span>Ch\u1ED1t l\u1EDDi khi l\xE3i \u0111\u1EA1t &gt;= (%):</span>
            <input type="number" data-key="goldProfitPercent" min="3" max="50" step="1">
          </div>
        </div>
      `;
      case "dibay":
        return `
        <label class="opt-row">
          <span>\u{1F381} T\u1EF1 nh\u1EADn th\u01B0\u1EDFng Vi\u1EC7c h\xF4m nay & S\u1ED5 tay</span>
          <input type="checkbox" data-key="autoClaimQuests">
        </label>
        <label class="opt-row">
          <span>\u{1F4DC} T\u1EF1 l\xE0m chu\u1ED7i h\u01B0\u1EDBng d\u1EABn Ng\xE0y 1 & 2 (th\u1EAFp nhang, rau m\u1EA7m...)</span>
          <input type="checkbox" data-key="autoFirstDayTasks">
        </label>
        <label class="opt-row">
          <span>\u{1F4D4} T\u1EF1 thu th\u1EADp trang S\u1ED5 tay \xD4ng N\u0103m & ng\xE2m gi\u1ED1ng L\xFAa</span>
          <input type="checkbox" data-key="autoNotebookPages">
        </label>
        <label class="opt-row">
          <span>\u{1FA99} T\u1EF1 b\u1ECF ti\u1EC1n v\xE0o Heo \u0111\u1EA5t m\u1ED7i ng\xE0y</span>
          <input type="checkbox" data-key="autoFeedPiggy">
        </label>
        <label class="opt-row">
          <span>\u{1F528} T\u1EF1 \u0111\u1EADp Heo \u0111\u1EA5t khi no (\u0111\u1EE7 7 ng\xE0y streak)</span>
          <input type="checkbox" data-key="autoBreakPiggy">
        </label>
        <label class="opt-row">
          <span>\u{1F6D2} T\u1EF1 mua Heo \u0111\u1EA5t m\u1EDBi khi chu\u1ED3ng tr\u1ED1ng</span>
          <input type="checkbox" data-key="autoNewPiggy">
        </label>
        <label class="opt-row">
          <span>\u{1F3E6} T\u1EF1 g\u1EEDi S\u1ED5 ti\u1EBFt ki\u1EC7m D\xEC B\u1EA3y</span>
          <input type="checkbox" data-key="autoSavings">
        </label>
        <div class="opt-sub" data-show-if="autoSavings">
          <div class="opt-row">
            <span>Gi\u1EEF l\u1EA1i ti\u1EC1n m\u1EB7t t\u1ED1i thi\u1EC3u:</span>
            <input type="number" data-key="savingsKeepGold" min="50000" max="5000000" step="50000">
          </div>
        </div>
      `;
      default:
        return "";
    }
  }
  var dragSubId = null;
  function buildFarmSubCards(container, config2, saveConfig2, bindDataKeyInputs2) {
    container.innerHTML = "";
    config2.farmSubOrder.forEach((subId, index) => {
      const meta = SUBAREA_META[subId];
      if (!meta) return;
      const enabled = config2.farmSubEnabled[subId] !== false;
      const collapsed = Boolean(config2.farmSubCollapsed[subId]);
      const card = document.createElement("div");
      card.className = `sub-card${!enabled ? " disabled-card" : ""}${collapsed ? " collapsed" : ""}`;
      card.dataset.subId = subId;
      card.draggable = true;
      card.innerHTML = `
      <div class="sub-card-head">
        <div class="sub-card-head-left">
          <span class="drag-handle" title="K\xE9o th\u1EA3 \u0111\u1EC3 \u0111\u1ED5i th\u1EE9 t\u1EF1">\u283F</span>
          <span class="order-idx">#${index + 1}</span>
          <span>${meta.icon} ${meta.name}</span>
        </div>
        <div class="sub-card-head-right">
          <button type="button" class="mini-move-btn" data-move="up" title="\u0110\u01B0a l\xEAn tr\xEAn">\u25B2</button>
          <button type="button" class="mini-move-btn" data-move="down" title="\u0110\u01B0a xu\u1ED1ng d\u01B0\u1EDBi">\u25BC</button>
          <input type="checkbox" class="sub-enable-chk" ${enabled ? "checked" : ""} title="B\u1EADt / T\u1EAFt khu v\u1EF1c con n\xE0y">
        </div>
      </div>
      <div class="sub-card-body">
        ${getFarmSubCardBodyHtml(subId)}
      </div>
    `;
      const head = card.querySelector(".sub-card-head");
      head.addEventListener("click", (e) => {
        const target = e.target;
        if (target.closest("button") || target.closest("input")) return;
        config2.farmSubCollapsed[subId] = !config2.farmSubCollapsed[subId];
        saveConfig2();
      });
      const chk = card.querySelector(".sub-enable-chk");
      chk.addEventListener("change", () => {
        config2.farmSubEnabled[subId] = chk.checked;
        if (chk.checked) config2.farmSubCollapsed[subId] = false;
        saveConfig2();
      });
      card.querySelectorAll(".mini-move-btn").forEach((btnEl) => {
        const btn = btnEl;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const dir = btn.dataset.move;
          const idx = config2.farmSubOrder.indexOf(subId);
          if (idx < 0) return;
          const targetIdx = dir === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= config2.farmSubOrder.length) return;
          const arr = [...config2.farmSubOrder];
          const temp = arr[idx];
          arr[idx] = arr[targetIdx];
          arr[targetIdx] = temp;
          config2.farmSubOrder = arr;
          buildFarmSubCards(container, config2, saveConfig2, bindDataKeyInputs2);
          saveConfig2();
        });
      });
      card.addEventListener("dragstart", (e) => {
        dragSubId = subId;
        card.classList.add("dragging");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      card.addEventListener("dragend", () => {
        dragSubId = null;
        card.classList.remove("dragging");
      });
      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      });
      card.addEventListener("drop", (e) => {
        e.preventDefault();
        if (!dragSubId || dragSubId === subId) return;
        const arr = [...config2.farmSubOrder];
        const fromIdx = arr.indexOf(dragSubId);
        const toIdx = arr.indexOf(subId);
        if (fromIdx < 0 || toIdx < 0) return;
        arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, dragSubId);
        config2.farmSubOrder = arr;
        buildFarmSubCards(container, config2, saveConfig2, bindDataKeyInputs2);
        saveConfig2();
      });
      container.appendChild(card);
    });
    bindDataKeyInputs2(container);
  }

  // src/content/ui/tabs/wharf-tab.ts
  function getWharfTabHtml() {
    return `
    <div class="area-enable-banner" id="bannerArea_benDo">
      <span>\u{1F6F6} Cho ph\xE9p ch\u1EA1y Khu v\u1EF1c B\u1EBFn \u0110\xF2</span>
      <input type="checkbox" id="chkArea_benDo">
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">\u{1F3A3} V\u1ECB Tr\xED &amp; Thao T\xE1c C\xE2u B\u1EBFn \u0110\xF2</div>
      </div>
      <div class="sub-card-body">
        <div class="hint-note">
          \u2728 T\u1EF1 nh\u1EADn di\u1EC7n phao ch\xECm h\u1EB3n m\u1EDBi gi\u1EADt v\xE0 t\u1EF1 gh\xECm c\u1EA7n ng\u01B0\u1EE3c h\u01B0\u1EDBng c\xE1 ch\u1EA1y.
        </div>
        <label class="opt-row">
          <span>\u{1F4CD} T\u1EF1 \u0111i b\u1ED9 ra v\u1ECB tr\xED ng\u1ED3i c\xE2u</span>
          <input type="checkbox" data-key="benAutoSpot">
        </label>
        <div class="opt-sub" data-show-if="benAutoSpot">
          <div class="opt-row">
            <span>V\u1ECB tr\xED ng\u1ED3i c\xE2u:</span>
            <select data-key="benSpot">
              <option value="dock">\u{1F309} C\u1EA7u t\xE0u ch\xEDnh</option>
              <option value="bamboo">\u{1F38B} C\u1EA7u tre</option>
              <option value="bank">\u{1F33F} B\u1EDD s\xF4ng</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u2B50 T\u1EF1 b\u1EA5m Gi\u1EEF l\u1EA1i c\xE1 L\u1EA1 / C\u1EA7u v\u1ED3ng / Th\u1EA7n tho\u1EA1i</span>
          <input type="checkbox" data-key="benAutoKeepRare">
        </label>
      </div>
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">\u{1FAB1} M\u1ED3i C\xE2u, B\xE1n C\xE1 &amp; H\u1ED3i S\u1EE9c B\u1EBFn \u0110\xF2</div>
      </div>
      <div class="sub-card-body">
        <label class="opt-row">
          <span>\u{1FAB1} T\u1EF1 \u0111i mua m\u1ED3i Ch\xFA \u0110\u1EF1c khi h\u1EBFt m\u1ED3i</span>
          <input type="checkbox" data-key="benAutoBuyBait">
        </label>
        <div class="opt-sub" data-show-if="benAutoBuyBait">
          <div class="opt-row">
            <span>Lo\u1EA1i m\u1ED3i \u01B0u ti\xEAn:</span>
            <select data-key="benPreferBait">
              <option value="moi60">\u{1FAB1} Thau 60 m\u1ED3i (40 v\u1ECF s\xF2)</option>
              <option value="moi150">\u{1FAB1} Th\xF9ng 150 m\u1ED3i (90 v\u1ECF s\xF2)</option>
              <option value="moi20">\u{1FAB1} H\u1ED9p 20 m\u1ED3i (15 v\u1ECF s\xF2)</option>
              <option value="xinMoi">\u{1F932} Xin 10 m\u1ED3i mi\u1EC5n ph\xED</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F41F} T\u1EF1 \u0111i b\xE1n c\xE1 t\u1EA1i V\u1EF1a Anh T\u01B0</span>
          <input type="checkbox" data-key="benAutoSell">
        </label>
        <div class="opt-sub" data-show-if="benAutoSell">
          <div class="opt-row">
            <span>B\xE1n khi gi\u1ECF c\xE1 \u0111\u1EA1t (con):</span>
            <input type="number" data-key="benSellThreshold" min="1" max="60" step="1">
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F371} T\u1EF1 \u0103n h\u1ED3i S\u1EE9c c\xE2u (\u26A1) khi \u0111u\u1ED1i s\u1EE9c</span>
          <input type="checkbox" data-key="benAutoRecoverStamina">
        </label>
        <div class="opt-sub" data-show-if="benAutoRecoverStamina">
          <div class="opt-row">
            <span>H\u1ED3i khi S\u1EE9c (\u26A1) d\u01B0\u1EDBi:</span>
            <input type="number" data-key="benStaminaThreshold" min="5" max="80" step="5">
          </div>
          <div class="opt-row">
            <span>M\xF3n \u0103n t\u1EA1i Qu\xE1n D\xEC T\xE1m:</span>
            <select data-key="benPreferFood">
              <option value="comTam">\u{1F35B} C\u01A1m t\u1EA5m (+60\u26A1 \xB7 28\u{1F41A})</option>
              <option value="lauMam">\u{1F372} L\u1EA9u c\xE1 linh (+100\u26A1 \xB7 45\u{1F41A})</option>
              <option value="huTieu">\u{1F35C} H\u1EE7 ti\u1EBFu (+40\u26A1 \xB7 20\u{1F41A})</option>
              <option value="chaoCa">\u{1F963} Ch\xE1o c\xE1 l\xF3c (+28\u26A1 \xB7 14\u{1F41A})</option>
              <option value="banhMi">\u{1F956} B\xE1nh m\xEC (+20\u26A1 \xB7 10\u{1F41A})</option>
            </select>
          </div>
        </div>

        <label class="opt-row">
          <span>\u{1F486} T\xF3c g\u1ED9i \xDAt M\u01B0\u1EDDi: G\u1ED9i \u0111\u1EA7u massage (+50\u26A1 \xB7 25\u{1F41A})</span>
          <input type="checkbox" data-key="benAutoGoiDau">
        </label>

        <label class="opt-row">
          <span>\u{1F340} Xe tr\xE0 \u0111\xE1 Ch\u1ECB Th\u01A1m: U\u1ED1ng n\u01B0\u1EDBc t\u0103ng May m\u1EAFn</span>
          <input type="checkbox" data-key="benAutoLuckDrink">
        </label>
        <div class="opt-sub" data-show-if="benAutoLuckDrink">
          <div class="opt-row">
            <span>Lo\u1EA1i n\u01B0\u1EDBc u\u1ED1ng Ch\u1ECB Th\u01A1m:</span>
            <select data-key="benPreferDrink">
              <option value="nuocMia">\u{1F964} N\u01B0\u1EDBc m\xEDa (+1 May m\u1EAFn \xB7 15\u{1F41A})</option>
              <option value="rauMa">\u{1F96C} N\u01B0\u1EDBc rau m\xE1 (+2 May m\u1EAFn \xB7 30\u{1F41A})</option>
              <option value="caPhe">\u2615 C\xE0 ph\xEA \u0111en (+2 May m\u1EAFn \xB7 35\u{1F41A})</option>
              <option value="duaTuoi">\u{1F965} D\u1EEBa t\u01B0\u01A1i B\u1EBFn Tre (+3 May m\u1EAFn \xB7 80\u{1F41A})</option>
              <option value="traDa">\u{1F9CA} Tr\xE0 \u0111\xE1 (+8\u26A1 \xB7 3\u{1F41A})</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="sub-card">
      <div class="sub-card-head" style="cursor:default;">
        <div class="sub-card-head-left">\u{1F3EE} Gi\u1EA3i Tr\xED &amp; Ti\u1EC7n \xCDch B\u1EBFn \u0110\xF2</div>
      </div>
      <div class="sub-card-body">
        <label class="opt-row">
          <span>\u{1F3EE} S\u1EA1p l\u1ED3ng \u0111\xE8n C\xF4 B\u1EA3y: T\u1EF1 quay khi c\xF3 v\xE9</span>
          <input type="checkbox" data-key="benAutoLantern">
        </label>
        <div class="opt-sub" data-show-if="benAutoLantern">
          <label class="opt-row">
            <span>\u{1F39F}\uFE0F T\u1EF1 mua th\xEAm v\xE9 quay C\xF4 B\u1EA3y (600\u{1F41A}/v\xE9)</span>
            <input type="checkbox" data-key="benBuyLanternTicket">
          </label>
        </div>

        <label class="opt-row">
          <span>\u{1F39F}\uFE0F \u0110\u1EA1i l\xFD v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2: T\u1EF1 \u0111\u1ED5i th\u01B0\u1EDFng khi tr\xFAng</span>
          <input type="checkbox" data-key="benAutoLotto">
        </label>
        <div class="opt-sub" data-show-if="benAutoLotto">
          <label class="opt-row">
            <span>\u{1F340} Mua 1 v\xE9 s\u1ED1 c\u1EA7u may m\u1ED7i ng\xE0y (10\u{1F41A})</span>
            <input type="checkbox" data-key="benAutoBuyLotto">
          </label>
        </div>

        <label class="opt-row">
          <span>\u{1F3E7} C\xE2y ATM B\u1EBFn \u0110\xF2: T\u1EF1 \u0111\u1ED5i v\u1ECF s\xF2 ra ti\u1EC1n m\u1EB7t</span>
          <input type="checkbox" data-key="benAutoAtm">
        </label>
        <div class="opt-sub" data-show-if="benAutoAtm">
          <div class="opt-row">
            <span>\u0110\u1ED5i khi v\u1ECF s\xF2 &gt;=:</span>
            <input type="number" data-key="benAtmThreshold" min="100" max="5000" step="50">
          </div>
        </div>
      </div>
    </div>
  `;
  }

  // src/content/ui/tabs/sea-tab.ts
  function getSeaTabHtml() {
    return `
    <div class="tab-pane" id="pane-sea">
      <div class="area-enable-banner" id="bannerArea_sea">
        <span>\u{1F3D6}\uFE0F Cho ph\xE9p ch\u1EA1y Khu v\u1EF1c Bi\u1EC3n</span>
        <input type="checkbox" id="chkArea_sea">
      </div>

      <div class="sub-card">
        <div class="sub-card-head" style="cursor:default;">
          <div class="sub-card-head-left">\u{1F30A} V\u1ECB Tr\xED &amp; Thao T\xE1c C\xE2u \u1EDE Bi\u1EC3n</div>
        </div>
        <div class="sub-card-body">
          <div class="hint-note">
            \u2728 T\u1EF1 nh\u1EADn bi\u1EBFt c\xE1 c\u1EAFn c\xE2u \u0111\u1EC3 gi\u1EADt, t\u1EF1 gh\xECm c\u1EA7n theo h\u01B0\u1EDBng c\xE1 v\xE0 c\u1EA5t c\xE1 v\xE0o gi\u1ECF.
          </div>
          <label class="opt-row">
            <span>\u{1F4CD} T\u1EF1 \u0111i b\u1ED9 ra v\u1ECB tr\xED ng\u1ED3i c\xE2u</span>
            <input type="checkbox" data-key="seaAutoSpot">
          </label>
          <div class="opt-sub" data-show-if="seaAutoSpot">
            <div class="opt-row">
              <span>V\u1ECB tr\xED ng\u1ED3i c\xE2u \u1EDF Bi\u1EC3n:</span>
              <select data-key="seaSpot">
                <option value="pier">\u{1F309} C\u1EA7u t\xE0u</option>
                <option value="rocks">\u{1FAA8} B\xE3i \u0111\xE1</option>
                <option value="beach">\u{1F3D6}\uFE0F M\xE9p b\xE3i c\xE1t</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>\u{1F4D6} T\u1EF1 nh\u1EADn th\u01B0\u1EDFng S\u1ED5 c\xE1 B\xE1ch khoa \xD4ng T\u01B0</span>
            <input type="checkbox" data-key="seaAutoClaimDex">
          </label>
          <label class="opt-row">
            <span>\u{1F359} T\u1EF1 \u0103n u\u1ED1ng h\u1ED3i ph\u1EE5c \u0110\xF3i Kh\xE1t khi c\xE2u Bi\u1EC3n</span>
            <input type="checkbox" data-key="seaAutoEat">
          </label>
        </div>
      </div>

      <div class="sub-card">
        <div class="sub-card-head" style="cursor:default;">
          <div class="sub-card-head-left">\u{1F6D6} Ch\xF2i \xD4ng T\u01B0 (Mua M\u1ED3i &amp; B\xE1n C\xE1)</div>
        </div>
        <div class="sub-card-body">
          <label class="opt-row">
            <span>\u{1F990} T\u1EF1 mua m\u1ED3i c\xE2u khi h\u1EBFt m\u1ED3i</span>
            <input type="checkbox" data-key="seaAutoBuyBait">
          </label>
          <div class="opt-sub" data-show-if="seaAutoBuyBait">
            <div class="opt-row">
              <span>Lo\u1EA1i m\u1ED3i \u01B0u ti\xEAn:</span>
              <select data-key="seaPreferBait">
                <option value="worm">\u{1FAB1} M\u1ED3i Giun / Tr\xF9n (C\xE2u th\u01B0\u1EDDng)</option>
                <option value="shrimp">\u{1F990} M\u1ED3i T\xF4m (C\xE2u c\xE1 hi\u1EBFm)</option>
              </select>
            </div>
            <div class="opt-row">
              <span>S\u1ED1 g\xF3i mua m\u1ED7i l\u1EA7n:</span>
              <input type="number" data-key="seaBaitPacks" min="1" max="20" step="1">
            </div>
          </div>

          <label class="opt-row">
            <span>\u{1F41F} T\u1EF1 b\xE1n h\u1EA3i s\u1EA3n trong gi\u1ECF cho \xD4ng T\u01B0</span>
            <input type="checkbox" data-key="seaAutoSell">
          </label>
          <div class="opt-sub" data-show-if="seaAutoSell">
            <div class="opt-row">
              <span>B\xE1n khi gi\u1ECF c\xF3 t\u1EEB (con):</span>
              <input type="number" data-key="seaSellThreshold" min="1" max="30" step="1">
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  }

  // src/content/ui/tabs/city-tab.ts
  function getCityTabHtml() {
    return `
    <div class="tab-pane" id="pane-city">
      <div class="coming-soon-box">
        <div class="coming-soon-icon">\u{1F3D9}\uFE0F\u{1F6A7}</div>
        <div class="coming-soon-title">Khu V\u1EF1c Th\xE0nh Ph\u1ED1 &amp; H\u1ED9i Ch\u1EE3</div>
        <div class="coming-soon-desc">
          T\xEDnh n\u0103ng t\u1EF1 \u0111\u1ED9ng cho Khu v\u1EF1c Th\xE0nh Ph\u1ED1 &amp; H\u1ED9i Ch\u1EE3 X\xF3m Vui \u0111ang \u0111\u01B0\u1EE3c ph\xE1t tri\u1EC3n (Coming Soon) v\xE0 s\u1EBD c\u1EADp nh\u1EADt trong phi\xEAn b\u1EA3n ti\u1EBFp theo!
        </div>
      </div>
    </div>
  `;
  }

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

  // src/content/ui/update-modal.ts
  var modalEl = null;
  async function openUpdateModal() {
    if (modalEl) {
      modalEl.remove();
      modalEl = null;
    }
    const overlay = document.createElement("div");
    overlay.id = "ntg-update-modal-overlay";
    overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(15, 23, 42, 0.75);
    backdrop-filter: blur(4px);
    z-index: 9999999;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  `;
    const box = document.createElement("div");
    box.style.cssText = `
    width: 480px;
    max-width: 90vw;
    max-height: 85vh;
    background: #0f172a;
    border: 1px solid #334155;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
    border-radius: 14px;
    color: #f8fafc;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  `;
    box.innerHTML = `
    <div style="padding: 16px 20px; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; background: #1e293b;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 20px;">\u{1F504}</span>
        <span style="font-weight: 700; font-size: 15px; color: #38bdf8;">Ki\u1EC3m Tra C\u1EADp Nh\u1EADt - NTG Auto</span>
      </div>
      <button id="ntg-modal-close-btn" style="background: none; border: none; color: #94a3b8; font-size: 20px; cursor: pointer; padding: 4px 8px; border-radius: 6px;">\u2715</button>
    </div>
    <div id="ntg-modal-content" style="padding: 20px; overflow-y: auto; flex: 1; font-size: 13px; line-height: 1.5;">
      <div style="text-align: center; color: #94a3b8; padding: 24px 0;">
        <div style="font-size: 24px; margin-bottom: 8px; animation: spin 1s linear infinite;">\u23F3</div>
        <div>\u0110ang ki\u1EC3m tra phi\xEAn b\u1EA3n m\u1EDBi nh\u1EA5t t\u1EEB GitHub...</div>
      </div>
    </div>
  `;
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    modalEl = overlay;
    const closeBtn = box.querySelector("#ntg-modal-close-btn");
    closeBtn.onclick = () => {
      overlay.remove();
      modalEl = null;
    };
    overlay.onclick = (e) => {
      if (e.target === overlay) {
        overlay.remove();
        modalEl = null;
      }
    };
    const contentDiv = box.querySelector("#ntg-modal-content");
    try {
      const res = await checkForUpdates();
      if (res.hasUpdate) {
        contentDiv.innerHTML = `
        <div style="background: #1e293b; border: 1px solid #10b981; border-radius: 10px; padding: 14px; margin-bottom: 16px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <span style="font-weight: 700; color: #10b981; font-size: 14px;">\u{1F389} \u0110\xE3 C\xF3 B\u1EA3n C\u1EADp Nh\u1EADt M\u1EDBi!</span>
            <span style="background: #10b981; color: #064e3b; font-weight: 700; font-size: 11px; padding: 2px 8px; border-radius: 999px;">v${res.latestVersion}</span>
          </div>
          <div style="color: #cbd5e1; font-size: 12px;">Phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i: <b>v${res.currentVersion}</b> \u2192 Phi\xEAn b\u1EA3n m\u1EDBi: <b style="color:#10b981;">v${res.latestVersion}</b></div>
        </div>

        <div style="font-weight: 700; color: #94a3b8; margin-bottom: 8px; font-size: 12px; text-transform: uppercase;">Nh\u1EADt k\xFD thay \u0111\u1ED5i (Changelog):</div>
        <div style="background: #020617; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; max-height: 240px; overflow-y: auto; white-space: pre-wrap; font-family: monospace; font-size: 11.5px; color: #e2e8f0; line-height: 1.4;">${escapeHtml(res.releaseNotes || "Kh\xF4ng c\xF3 ghi ch\xFA thay \u0111\u1ED5i.")}</div>

        <div style="margin-top: 18px; display: flex; gap: 10px; justify-content: flex-end;">
          <a href="${res.downloadUrl || res.releaseUrl}" target="_blank" rel="noopener noreferrer" style="background: #0284c7; color: white; padding: 9px 16px; border-radius: 8px; font-weight: 700; text-decoration: none; font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
            \u2B07\uFE0F T\u1EA3i B\u1EA3n M\u1EDBi Ngay
          </a>
        </div>
      `;
      } else {
        contentDiv.innerHTML = `
        <div style="text-align: center; padding: 20px 0;">
          <div style="font-size: 40px; margin-bottom: 12px;">\u2705</div>
          <div style="font-weight: 700; color: #38bdf8; font-size: 16px; margin-bottom: 6px;">B\u1EA1n \u0110ang D\xF9ng B\u1EA3n M\u1EDBi Nh\u1EA5t</div>
          <div style="color: #94a3b8; font-size: 13px;">Phi\xEAn b\u1EA3n hi\u1EC7n t\u1EA1i: <b>v${res.currentVersion}</b></div>
          <div style="margin-top: 16px; font-size: 12px; color: #64748b;">(\u0110\u01B0\u1EE3c ki\u1EC3m tra tr\u1EF1c ti\u1EBFp t\u1EEB GitHub Releases)</div>
        </div>
      `;
      }
    } catch (err) {
      contentDiv.innerHTML = `
      <div style="text-align: center; padding: 20px 0;">
        <div style="font-size: 36px; margin-bottom: 10px;">\u26A0\uFE0F</div>
        <div style="font-weight: 700; color: #f87171; font-size: 14px; margin-bottom: 6px;">Kh\xF4ng th\u1EC3 ki\u1EC3m tra c\u1EADp nh\u1EADt</div>
        <div style="color: #94a3b8; font-size: 12px;">${escapeHtml(err?.message || "L\u1ED7i k\u1EBFt n\u1ED1i m\u1EA1ng")}</div>
      </div>
    `;
    }
  }
  function escapeHtml(str) {
    return str.replace(/[&<>'"]/g, (tag) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[tag] || tag);
  }

  // src/content/scheduler/dom-helpers.ts
  var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  function triggerPointerDownAndClick(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new MouseEvent("mousedown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    el.dispatchEvent(new MouseEvent("mouseup", opts));
    el.click();
    return true;
  }
  function triggerPointerDownOnly(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent("pointerdown", opts));
    el.dispatchEvent(new PointerEvent("pointerup", opts));
    return true;
  }
  function formatClock(minutes) {
    if (typeof minutes !== "number") return "--:--";
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  }
  function formatGold(n) {
    if (typeof n !== "number") return "--";
    return n.toLocaleString("vi-VN") + "\u0111";
  }

  // src/content/ui/hud-core.ts
  var config = structuredClone(DEFAULT_CONFIG);
  var hudRoot = null;
  var lastActionText = "\u0110ang ch\u1EDD l\u1EC7nh...";
  var lastGameSnap = null;
  var lockedTabArea = null;
  var els = null;
  var onToggleAllHandler = null;
  var onToggleTabHandler = null;
  function setAutoActionHandlers(onToggleAll, onToggleTab) {
    onToggleAllHandler = onToggleAll;
    onToggleTabHandler = onToggleTab;
  }
  function getConfig() {
    return config;
  }
  function getLockedTabArea() {
    return lockedTabArea;
  }
  function setLockedTabArea(area) {
    lockedTabArea = area;
  }
  function getLastActionText() {
    return lastActionText;
  }
  function getLastGameSnap() {
    return lastGameSnap;
  }
  function setLastGameSnap(snap) {
    lastGameSnap = snap;
  }
  function setStatus(text) {
    lastActionText = text;
    if (els?.statusAction) {
      els.statusAction.textContent = text;
    }
  }
  function mergeConfig(saved) {
    if (!saved || typeof saved !== "object") return structuredClone(DEFAULT_CONFIG);
    const next = {
      ...structuredClone(DEFAULT_CONFIG),
      ...saved,
      areaEnabled: { ...DEFAULT_CONFIG.areaEnabled, ...saved.areaEnabled || {} },
      farmSubEnabled: { ...DEFAULT_CONFIG.farmSubEnabled, ...saved.farmSubEnabled || {} },
      farmSubCollapsed: { ...DEFAULT_CONFIG.farmSubCollapsed, ...saved.farmSubCollapsed || {} },
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
      autoSellProduce: saved.autoSellProduce === true && typeof saved.surplusKeepQty === "number" ? true : false,
      surplusKeepQty: saved.surplusKeepQty ?? DEFAULT_CONFIG.surplusKeepQty,
      autoBuyPlots: saved.autoBuyPlots ?? DEFAULT_CONFIG.autoBuyPlots,
      autoSalonShampoo: saved.autoSalonShampoo ?? DEFAULT_CONFIG.autoSalonShampoo,
      autoSalonWhiten: saved.autoSalonWhiten ?? DEFAULT_CONFIG.autoSalonWhiten,
      autoFirstDayTasks: saved.autoFirstDayTasks ?? DEFAULT_CONFIG.autoFirstDayTasks,
      autoNotebookPages: saved.autoNotebookPages ?? DEFAULT_CONFIG.autoNotebookPages
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
  function saveConfig() {
    chrome.storage.local.set({ autoConfig: config });
    renderAll();
  }
  function loadConfig() {
    return new Promise((resolve) => {
      chrome.storage.local.get(["autoConfig"], (res) => {
        if (res.autoConfig) {
          config = mergeConfig(res.autoConfig);
        }
        renderAll();
        resolve(config);
      });
    });
  }
  function createHud() {
    if (document.getElementById("ntg-auto-hud-host")) return;
    const host = document.createElement("div");
    host.id = "ntg-auto-hud-host";
    host.style.cssText = "position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;";
    document.documentElement.appendChild(host);
    const shadow = host.attachShadow({ mode: "open" });
    hudRoot = shadow;
    const style = document.createElement("style");
    style.textContent = HUD_STYLES;
    const manifest = chrome.runtime.getManifest();
    const currentVersion = manifest.version || "1.0.0";
    const panel = document.createElement("div");
    panel.className = "hud-panel";
    panel.innerHTML = `
    <div class="hud-header" id="hudDragHandle">
      <div class="hud-title">
        <span>\u{1F33E} NTG Auto by T\xFAn <small style="font-size:10px; color:#cbd5e1; font-weight:700;">v${currentVersion}</small></span>
      </div>
      <div class="hud-header-btns">
        <button class="hdr-auto-btn all" id="btnHdrAutoAll" title="Ch\u1EA1y t\u1EF1 \u0111\u1ED9ng t\u1EA5t c\u1EA3 khu v\u1EF1c theo th\u1EE9 t\u1EF1 (Alt+A)">
          \u25B6\uFE0F T\u1EA5t c\u1EA3
        </button>
        <button class="hdr-auto-btn tab" id="btnHdrAutoTab" title="Ch\u1EA1y t\u1EF1 \u0111\u1ED9ng ri\xEAng Tab khu v\u1EF1c \u0111ang m\u1EDF">
          \u{1F3AF} N\xF4ng Tr\u1EA1i
        </button>
      </div>
      <div class="hud-actions">
        <button class="icon-btn" id="btnCheckUpdate" title="Ki\u1EC3m tra b\u1EA3n c\u1EADp nh\u1EADt m\u1EDBi t\u1EEB GitHub">\u{1F504}</button>
        <button class="icon-btn" id="btnMinimize" title="Thu g\u1ECDn / M\u1EDF r\u1ED9ng">_</button>
        <button class="icon-btn" id="btnHide" title="\u1EA8n b\u1EA3ng (Alt+P)">\u2715</button>
      </div>
    </div>

    <div class="hud-stats">
      <div class="stats-row">
        <span id="statTime">\u{1F4C5} Ng\xE0y -- \xB7 \u{1F552} --:--</span>
        <span id="statGold">\u{1F4B0} --</span>
      </div>
      <div class="stats-pills">
        <span class="stat-pill" id="statHunger">\u{1F359} --%</span>
        <span class="stat-pill" id="statThirst">\u{1F4A7} --%</span>
        <span class="stat-pill" id="statEnergy">\u26A1 --%</span>
        <span class="stat-pill" id="statExtra">\u{1F4CD} --</span>
      </div>
      <div class="status-banner" id="statusAction">\u0110ang ch\u1EDD l\u1EC7nh...</div>
    </div>

    <div class="hud-top-controls">
      <div class="dual-btn-row">
        <button class="btn-auto-all" id="btnAutoAll" title="Ch\u1EA1y t\u1EF1 \u0111\u1ED9ng l\u1EA7n l\u01B0\u1EE3t c\xE1c khu v\u1EF1c \u0111\u01B0\u1EE3c b\u1EADt theo th\u1EE9 t\u1EF1 k\xE9o th\u1EA3 (Alt+A)">
          \u25B6\uFE0F AUTO T\u1EA4T C\u1EA2
        </button>
        <button class="btn-auto-tab" id="btnAutoTab" title="Ch\u1EC9 ch\u1EA1y t\u1EF1 \u0111\u1ED9ng n\u1ED9i b\u1ED9 c\xE1c t\xEDnh n\u0103ng trong Tab khu v\u1EF1c \u0111ang m\u1EDF">
          \u{1F3AF} AUTO TAB N\xC0Y
        </button>
      </div>

      <div class="quick-config-row">
        <div class="delay-box" title="Kho\u1EA3ng ngh\u1EC9 gi\u1EEFa m\u1ED7i thao t\xE1c \u0111\u1EC3 t\u1EF1 nhi\xEAn h\u01A1n">
          <span>\u23F1\uFE0F Delay:</span>
          <input type="range" id="rngTaskDelay" min="150" max="3000" step="50">
          <span class="delay-val" id="lblTaskDelay">650ms</span>
        </div>
        <button class="btn-drawer-toggle" id="btnToggleOrderDrawer" title="S\u1EAFp x\u1EBFp th\u1EE9 t\u1EF1 Khu v\u1EF1c ch\u1EA1y tr\u01B0\u1EDBc / sau">
          \u2195\uFE0F Th\u1EE9 t\u1EF1 Khu v\u1EF1c
        </button>
      </div>

      <div class="order-drawer" id="orderDrawer">
        <div class="order-drawer-head">
          <span>\u{1F504} K\xE9o th\u1EA3 th\u1EE9 t\u1EF1 ch\u1EA1y "Auto T\u1EA5t C\u1EA3":</span>
          <span>B\u1EADt/T\u1EAFt</span>
        </div>
        <div class="area-order-list" id="areaOrderList"></div>
        <div class="opt-row" style="margin-top:2px;font-size:10.5px;color:#94a3b8;">
          <span>S\u1ED1 c\xE1 c\xE2u m\u1ED7i khu tr\u01B0\u1EDBc khi \u0111\u1ED5i khu:</span>
          <input type="number" id="inpFishingSwitchCount" min="1" max="200" step="1" style="width:54px;">
        </div>
      </div>
    </div>

    <div class="hud-tabs">
      <button class="tab-btn active" data-tab="farm">
        <span class="tab-dot" id="dotArea_farm"></span>\u{1F33E} N\xF4ng Tr\u1EA1i
      </button>
      <button class="tab-btn" data-tab="benDo">
        <span class="tab-dot" id="dotArea_benDo"></span>\u{1F6F6} B\u1EBFn \u0110\xF2
      </button>
      <button class="tab-btn" data-tab="sea">
        <span class="tab-dot" id="dotArea_sea"></span>\u{1F3D6}\uFE0F Bi\u1EC3n
      </button>
      <button class="tab-btn" data-tab="city">
        \u{1F3D9}\uFE0F Th\xE0nh Ph\u1ED1
      </button>
    </div>

    <div class="hud-body">
      <!-- TAB 1: N\xD4NG TR\u1EA0I -->
      <div class="tab-pane active" id="pane-farm">
        <div class="area-enable-banner" id="bannerArea_farm">
          <span>\u{1F33E} Cho ph\xE9p ch\u1EA1y Khu v\u1EF1c N\xF4ng Tr\u1EA1i</span>
          <input type="checkbox" id="chkArea_farm">
        </div>
        <div class="hint-note">
          \u{1F4A1} K\xE9o th\u1EA3 bi\u1EC3u t\u01B0\u1EE3ng <b>\u283F</b> (ho\u1EB7c b\u1EA5m <b>\u25B2/\u25BC</b>) \u1EDF t\u1EEBng m\u1EE5c \u0111\u1EC3 s\u1EAFp x\u1EBFp vi\u1EC7c n\xE0o l\xE0m tr\u01B0\u1EDBc, vi\u1EC7c n\xE0o l\xE0m sau.
        </div>
        <div id="farmSubCardsContainer" style="display:flex;flex-direction:column;gap:8px;"></div>
      </div>

      <!-- TAB 2: B\u1EBEN \u0110\xD2 -->
      ${getWharfTabHtml()}

      <!-- TAB 3: BI\u1EC2N -->
      ${getSeaTabHtml()}

      <!-- TAB 4: TH\xC0NH PH\u1ED0 -->
      ${getCityTabHtml()}
    </div>
  `;
    shadow.appendChild(style);
    shadow.appendChild(panel);
    els = {
      panel,
      dragHandle: shadow.getElementById("hudDragHandle"),
      btnCheckUpdate: shadow.getElementById("btnCheckUpdate"),
      btnMinimize: shadow.getElementById("btnMinimize"),
      btnHide: shadow.getElementById("btnHide"),
      btnHdrAutoAll: shadow.getElementById("btnHdrAutoAll"),
      btnHdrAutoTab: shadow.getElementById("btnHdrAutoTab"),
      btnAutoAll: shadow.getElementById("btnAutoAll"),
      btnAutoTab: shadow.getElementById("btnAutoTab"),
      rngTaskDelay: shadow.getElementById("rngTaskDelay"),
      lblTaskDelay: shadow.getElementById("lblTaskDelay"),
      btnToggleOrderDrawer: shadow.getElementById("btnToggleOrderDrawer"),
      orderDrawer: shadow.getElementById("orderDrawer"),
      areaOrderList: shadow.getElementById("areaOrderList"),
      inpFishingSwitchCount: shadow.getElementById("inpFishingSwitchCount"),
      farmSubCardsContainer: shadow.getElementById("farmSubCardsContainer"),
      statTime: shadow.getElementById("statTime"),
      statGold: shadow.getElementById("statGold"),
      statHunger: shadow.getElementById("statHunger"),
      statThirst: shadow.getElementById("statThirst"),
      statEnergy: shadow.getElementById("statEnergy"),
      statExtra: shadow.getElementById("statExtra"),
      statusAction: shadow.getElementById("statusAction"),
      tabs: Array.from(shadow.querySelectorAll(".tab-btn")),
      panes: {
        farm: shadow.getElementById("pane-farm"),
        benDo: shadow.getElementById("pane-benDo"),
        sea: shadow.getElementById("pane-sea"),
        city: shadow.getElementById("pane-city")
      }
    };
    buildFarmSubCards(els.farmSubCardsContainer, config, saveConfig, bindDataKeyInputs);
    bindHudEvents(shadow);
    setupDraggableHud(panel, els.dragHandle);
    renderAll();
    checkForUpdates(currentVersion).then((res) => {
      if (res.hasUpdate && els?.btnCheckUpdate) {
        els.btnCheckUpdate.classList.add("has-update");
        els.btnCheckUpdate.title = `C\xF3 b\u1EA3n c\u1EADp nh\u1EADt m\u1EDBi ${res.latestVersion}! B\u1EA5m \u0111\u1EC3 xem chi ti\u1EBFt.`;
      }
    }).catch(() => {
    });
  }
  function bindDataKeyInputs(rootEl) {
    rootEl.querySelectorAll("[data-key]").forEach((element) => {
      const el = element;
      if (el.dataset.bound === "1") return;
      el.dataset.bound = "1";
      const key = el.dataset.key;
      el.addEventListener("change", () => {
        if (el.type === "checkbox") {
          config[key] = el.checked;
        } else if (el.type === "number" || el.type === "range") {
          config[key] = Number(el.value);
        } else {
          config[key] = el.value;
        }
        saveConfig();
      });
    });
  }
  function bindHudEvents(shadow) {
    if (!els) return;
    els.tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        config.activeTab = btn.dataset.tab || "farm";
        saveConfig();
      });
    });
    els.btnMinimize.addEventListener("click", () => {
      config.panelMinimized = !config.panelMinimized;
      saveConfig();
    });
    els.btnHide.addEventListener("click", () => {
      config.panelVisible = false;
      saveConfig();
    });
    els.btnCheckUpdate.addEventListener("click", () => {
      openUpdateModal();
    });
    if (els.btnHdrAutoAll) {
      els.btnHdrAutoAll.addEventListener("click", () => {
        els?.btnAutoAll.click();
      });
    }
    if (els.btnHdrAutoTab) {
      els.btnHdrAutoTab.addEventListener("click", () => {
        els?.btnAutoTab.click();
      });
    }
    els.btnAutoAll.addEventListener("click", () => {
      if (onToggleAllHandler) {
        onToggleAllHandler();
      } else {
        if (config.running && config.runMode === "all") {
          config.running = false;
          setStatus("\u23F8\uFE0F \u0110\xE3 d\u1EEBng Auto T\u1EA5t C\u1EA3");
        } else {
          config.running = true;
          config.runMode = "all";
          lockedTabArea = null;
          setStatus("\u25B6\uFE0F B\u1EAFt \u0111\u1EA7u ch\u1EA1y Auto T\u1EA5t C\u1EA3 theo th\u1EE9 t\u1EF1...");
        }
        saveConfig();
      }
    });
    els.btnAutoTab.addEventListener("click", () => {
      if (onToggleTabHandler) {
        onToggleTabHandler();
      } else {
        if (config.running && config.runMode === "tab") {
          config.running = false;
          lockedTabArea = null;
          setStatus("\u23F8\uFE0F \u0110\xE3 d\u1EEBng Auto Tab");
        } else {
          config.running = true;
          config.runMode = "tab";
          lockedTabArea = config.activeTab;
          const areaName = AREA_META[lockedTabArea]?.name || lockedTabArea;
          setStatus(`\u{1F3AF} B\u1EAFt \u0111\u1EA7u ch\u1EC9 Auto trong Tab: ${areaName}`);
        }
        saveConfig();
      }
    });
    els.rngTaskDelay.addEventListener("input", () => {
      if (els) els.lblTaskDelay.textContent = `${els.rngTaskDelay.value}ms`;
    });
    els.rngTaskDelay.addEventListener("change", () => {
      if (els) config.taskDelayMs = Number(els.rngTaskDelay.value) || 650;
      saveConfig();
    });
    els.btnToggleOrderDrawer.addEventListener("click", () => {
      config.showOrderDrawer = !config.showOrderDrawer;
      saveConfig();
    });
    els.inpFishingSwitchCount.addEventListener("change", () => {
      if (els) config.fishingSwitchCount = Math.max(1, Number(els.inpFishingSwitchCount.value) || 15);
      saveConfig();
    });
    ["farm", "benDo", "sea"].forEach((areaId) => {
      const chk = shadow.getElementById(`chkArea_${areaId}`);
      if (chk) {
        chk.addEventListener("change", () => {
          config.areaEnabled[areaId] = chk.checked;
          saveConfig();
        });
      }
    });
    bindDataKeyInputs(shadow);
  }
  var dragAreaId = null;
  function renderAreaOrderList() {
    if (!els || !els.areaOrderList) return;
    const list = els.areaOrderList;
    list.innerHTML = "";
    config.areaOrder.forEach((areaId, index) => {
      const meta = AREA_META[areaId] || { id: areaId, icon: "\u{1F4CD}", name: areaId };
      const enabled = config.areaEnabled[areaId] !== false;
      const item = document.createElement("div");
      item.className = "area-order-item";
      item.draggable = true;
      item.dataset.areaId = areaId;
      item.innerHTML = `
      <div class="area-order-left">
        <span class="drag-handle" title="K\xE9o th\u1EA3 \u0111\u1EC3 s\u1EAFp x\u1EBFp">\u283F</span>
        <span class="area-order-badge">#${index + 1}</span>
        <span class="area-name-link" title="B\u1EA5m \u0111\u1EC3 chuy\u1EC3n nhanh t\u1EDBi Tab ${meta.name}">${meta.icon} ${meta.name}</span>
      </div>
      <div class="area-order-right">
        <button type="button" class="mini-move-btn" data-move="up" title="L\xEAn">\u25B2</button>
        <button type="button" class="mini-move-btn" data-move="down" title="Xu\u1ED1ng">\u25BC</button>
        <input type="checkbox" class="area-enable-chk" ${enabled ? "checked" : ""} title="B\u1EADt / T\u1EAFt khu v\u1EF1c n\xE0y khi Auto T\u1EA5t C\u1EA3">
      </div>
    `;
      const link = item.querySelector(".area-name-link");
      link.addEventListener("click", () => {
        config.activeTab = areaId;
        saveConfig();
      });
      const chk = item.querySelector(".area-enable-chk");
      chk.addEventListener("change", () => {
        config.areaEnabled[areaId] = chk.checked;
        saveConfig();
      });
      item.querySelectorAll(".mini-move-btn").forEach((btnEl) => {
        const btn = btnEl;
        btn.addEventListener("click", (e) => {
          e.stopPropagation();
          const dir = btn.dataset.move;
          const idx = config.areaOrder.indexOf(areaId);
          if (idx < 0) return;
          const targetIdx = dir === "up" ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= config.areaOrder.length) return;
          const arr = [...config.areaOrder];
          const temp = arr[idx];
          arr[idx] = arr[targetIdx];
          arr[targetIdx] = temp;
          config.areaOrder = arr;
          saveConfig();
        });
      });
      item.addEventListener("dragstart", (e) => {
        dragAreaId = areaId;
        item.classList.add("dragging");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragend", () => {
        dragAreaId = null;
        item.classList.remove("dragging");
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
      });
      item.addEventListener("drop", (e) => {
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
  function setupDraggableHud(panel, handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;
    handle.addEventListener("mousedown", (e) => {
      if (e.target.closest("button")) return;
      dragging = true;
      const rect = panel.getBoundingClientRect();
      startX = e.clientX;
      startY = e.clientY;
      initLeft = rect.left;
      initTop = rect.top;
      panel.style.right = "auto";
      panel.style.left = `${initLeft}px`;
      panel.style.top = `${initTop}px`;
    });
    window.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      panel.style.left = `${Math.max(0, Math.min(window.innerWidth - 120, initLeft + dx))}px`;
      panel.style.top = `${Math.max(0, Math.min(window.innerHeight - 60, initTop + dy))}px`;
    });
    window.addEventListener("mouseup", () => {
      dragging = false;
    });
  }
  function renderAll() {
    if (!hudRoot || !els || !els.panel) return;
    els.panel.classList.toggle("hidden", !config.panelVisible);
    els.panel.classList.toggle("minimized", Boolean(config.panelMinimized));
    const isAllActive = config.running && config.runMode === "all";
    const isTabActive = config.running && config.runMode === "tab";
    const lockedAreaName = lockedTabArea && AREA_META[lockedTabArea]?.name || lockedTabArea || "Tab N\xE0y";
    const activeAreaName = AREA_META[config.activeTab]?.name || "Tab N\xE0y";
    els.btnAutoAll.classList.toggle("active", isAllActive);
    els.btnAutoAll.textContent = isAllActive ? "\u23F9\uFE0F D\u1EEANG T\u1EA4T C\u1EA2" : "\u25B6\uFE0F AUTO T\u1EA4T C\u1EA2";
    els.btnAutoTab.classList.toggle("active", isTabActive);
    els.btnAutoTab.textContent = isTabActive ? `\u23F9\uFE0F D\u1EEANG (${lockedAreaName.toUpperCase()})` : `\u{1F3AF} AUTO ${activeAreaName.toUpperCase()}`;
    if (els.btnHdrAutoAll) {
      els.btnHdrAutoAll.classList.toggle("active", isAllActive);
      els.btnHdrAutoAll.textContent = isAllActive ? "\u23F9\uFE0F D\u1EEBng" : "\u25B6\uFE0F T\u1EA5t c\u1EA3";
    }
    if (els.btnHdrAutoTab) {
      els.btnHdrAutoTab.classList.toggle("active", isTabActive);
      els.btnHdrAutoTab.textContent = isTabActive ? `\u23F9\uFE0F ${lockedAreaName}` : `\u{1F3AF} ${activeAreaName}`;
    }
    els.rngTaskDelay.value = String(config.taskDelayMs || 650);
    els.lblTaskDelay.textContent = `${config.taskDelayMs || 650}ms`;
    els.orderDrawer.classList.toggle("collapsed", !config.showOrderDrawer);
    els.inpFishingSwitchCount.value = String(config.fishingSwitchCount || 15);
    renderAreaOrderList();
    els.tabs.forEach((btn) => {
      const t = btn.dataset.tab;
      btn.classList.toggle("active", t === config.activeTab);
    });
    Object.entries(els.panes).forEach(([k, pane]) => {
      if (pane) pane.classList.toggle("active", k === config.activeTab);
    });
    ["farm", "benDo", "sea"].forEach((areaId) => {
      const enabled = config.areaEnabled[areaId] !== false;
      const dot = hudRoot?.getElementById(`dotArea_${areaId}`);
      if (dot) dot.classList.toggle("off", !enabled);
      const chk = hudRoot?.getElementById(`chkArea_${areaId}`);
      if (chk) chk.checked = enabled;
      const banner = hudRoot?.getElementById(`bannerArea_${areaId}`);
      if (banner) banner.classList.toggle("off", !enabled);
    });
    const existingCards = Array.from(els.farmSubCardsContainer.querySelectorAll(".sub-card"));
    const currentDomOrder = existingCards.map((c) => c.dataset.subId).join(",");
    if (currentDomOrder !== config.farmSubOrder.join(",")) {
      buildFarmSubCards(els.farmSubCardsContainer, config, saveConfig, bindDataKeyInputs);
    } else {
      existingCards.forEach((card, idx) => {
        const subId = card.dataset.subId;
        if (!subId) return;
        const enabled = config.farmSubEnabled[subId] !== false;
        const collapsed = Boolean(config.farmSubCollapsed[subId]);
        card.classList.toggle("disabled-card", !enabled);
        card.classList.toggle("collapsed", collapsed);
        const idxBadge = card.querySelector(".order-idx");
        if (idxBadge) idxBadge.textContent = `#${idx + 1}`;
        const chk = card.querySelector(".sub-enable-chk");
        if (chk) chk.checked = enabled;
      });
    }
    hudRoot.querySelectorAll("[data-key]").forEach((element) => {
      const el = element;
      const key = el.dataset.key;
      if (!(key in config)) return;
      if (el.type === "checkbox") {
        el.checked = Boolean(config[key]);
      } else if (document.activeElement !== el) {
        el.value = String(config[key]);
      }
    });
    hudRoot.querySelectorAll("[data-show-if]").forEach((subBlock) => {
      const parentKey = subBlock.dataset.showIf;
      const shouldShow = Boolean(config[parentKey]);
      subBlock.classList.toggle("hidden", !shouldShow);
    });
  }
  function updateHeaderStats(snap) {
    if (!els || !els.statTime || !snap) return;
    els.statTime.textContent = `\u{1F4C5} Ng\xE0y ${snap.day ?? "--"} \xB7 \u{1F552} ${formatClock(snap.minutes)}`;
    els.statGold.textContent = `\u{1F4B0} ${formatGold(snap.gold)}`;
    els.statHunger.textContent = `\u{1F359} ${Math.round(snap.fullness ?? 0)}%`;
    els.statThirst.textContent = `\u{1F4A7} ${Math.round(snap.hydration ?? 0)}%`;
    if (snap.screen === "benDo" && snap.benNet?.wallet) {
      els.statEnergy.textContent = `\u26A1 S\u1EE9c ${Math.round(snap.benNet.wallet.liveStamina ?? 0)}`;
    } else if (snap.vehicle) {
      els.statEnergy.textContent = `\u{1F50B} Pin ${Math.round(snap.battery ?? 0)}%`;
    } else {
      els.statEnergy.textContent = `\u{1F331} ${Object.keys(snap.plots || {}).length} \xF4`;
    }
    if (snap.screen === "benDo" && snap.benNet?.wallet) {
      const w = snap.benNet.wallet;
      els.statExtra.textContent = `\u{1F6F6} \u{1F41A}${w.shells ?? 0} \xB7 \u{1FAB1}${w.bait ?? 0} \xB7 \u26A1${w.liveStamina ?? 0}`;
    } else if (snap.screen === "sea") {
      const b = snap.fishing?.bait || {};
      els.statExtra.textContent = `\u{1F3D6}\uFE0F \u{1FAB1}${b.worm ?? 0} \xB7 \u{1F990}${b.shrimp ?? 0} \xB7 \u{1F9FA}${snap.fishing?.basket?.length ?? 0}`;
    } else {
      const screenNames = {
        playing: "\u{1F33E} N\xF4ng tr\u1EA1i",
        worldmap: "\u{1F5FA}\uFE0F B\u1EA3n \u0111\u1ED3",
        sea: "\u{1F3D6}\uFE0F Bi\u1EC3n",
        benDo: "\u{1F6F6} B\u1EBFn \u0111\xF2",
        city: "\u{1F3D9}\uFE0F Th\xE0nh ph\u1ED1"
      };
      els.statExtra.textContent = screenNames[snap.screen] || `\u{1F4CD} ${snap.screen || "--"}`;
    }
  }

  // src/content/scheduler/minigame.ts
  var lastPulledRunKey = "";
  var lastPullAt = 0;
  function handleFightMinigame(snap, setStatus2) {
    const fightBox = document.querySelector(".ben-fight");
    if (!fightBox || !isVisible(fightBox)) {
      lastPulledRunKey = "";
      return false;
    }
    const fishLeftEl = fightBox.querySelector(".ben-run-fish.left");
    const fishRightEl = fightBox.querySelector(".ben-run-fish.right");
    const timerBar = fightBox.querySelector(".ben-run-timer > i");
    let runDir = null;
    if (fishLeftEl) runDir = "left";
    else if (fishRightEl) runDir = "right";
    else if (snap?.benNet?.fight?.run?.dir) runDir = snap.benNet.fight.run.dir;
    if (!runDir) {
      return true;
    }
    const runN = snap?.benNet?.fight?.run?.n || (timerBar ? timerBar.textContent || timerBar.style.animationDuration : "") || "run";
    const runKey = `${runDir}:${runN}`;
    const now = performance.now();
    if (runKey === lastPulledRunKey && now - lastPullAt < 550) {
      return true;
    }
    if (now - lastPullAt < 130) {
      return true;
    }
    const pullDir = runDir === "left" ? "right" : "left";
    const btns = Array.from(fightBox.querySelectorAll(".ben-fight-btns button"));
    const leftBtn = btns.find((b) => (b.textContent || "").includes("Gh\xECm tr\xE1i"));
    const rightBtn = btns.find((b) => (b.textContent || "").includes("Gh\xECm ph\u1EA3i"));
    const targetBtn = pullDir === "left" ? leftBtn : rightBtn;
    if (targetBtn && !targetBtn.disabled) {
      triggerPointerDownOnly(targetBtn);
      lastPulledRunKey = runKey;
      lastPullAt = now;
      setStatus2(`\u{1F4AA} Gh\xECm c\u1EA7n sang ${pullDir === "left" ? "TR\xC1I \u2B05" : "PH\u1EA2I \u27A1"}!`);
    } else {
      const key = pullDir === "left" ? "ArrowLeft" : "ArrowRight";
      const code = pullDir === "left" ? "KeyA" : "KeyD";
      window.dispatchEvent(new KeyboardEvent("keydown", { key, code, bubbles: true }));
      lastPulledRunKey = runKey;
      lastPullAt = now;
    }
    return true;
  }

  // src/content/scheduler/farm-runner.ts
  var lastFarmDoneDay = -1;
  var lastFarmRunAt = 0;
  async function runFarmSubAreas(snap, config2, setStatus2, updateHeaderStats2) {
    const delayMs = Math.max(150, Number(config2.taskDelayMs) || 650);
    if (snap.screen !== "playing") {
      setStatus2("\u{1F69C} \u0110ang quay v\u1EC1 N\xF4ng Tr\u1EA1i...");
      await execGameAction("NAVIGATE", { target: "playing", indoors: false });
      await sleep(delayMs);
      return true;
    }
    if (snap.indoors) {
      await execGameAction("NAVIGATE", { target: "playing", indoors: false });
      await sleep(Math.min(400, delayMs));
    }
    let anyActed = false;
    for (const subId of config2.farmSubOrder) {
      if (!config2.running) break;
      if (!config2.farmSubEnabled[subId]) continue;
      const meta = SUBAREA_META[subId];
      let stepSafety = 0;
      while (config2.running && stepSafety < 50) {
        stepSafety++;
        const res = await execGameAction("FARM_SUBAREA_STEP", {
          subAreaId: subId,
          config: config2
        });
        if (res && res.ok && res.acted) {
          anyActed = true;
          setStatus2(res.msg || `${meta.icon} \u0110ang x\u1EED l\xFD ${meta.name}...`);
          await sleep(delayMs);
          const fresh = await getGameState();
          if (fresh && fresh.ok) {
            updateHeaderStats2(fresh);
          }
        } else {
          break;
        }
      }
    }
    lastFarmDoneDay = snap.day;
    lastFarmRunAt = Date.now();
    return anyActed;
  }

  // src/content/scheduler/wharf-runner.ts
  var lastModalClickAt = 0;
  var lastHookAt = 0;
  var lastCastAt = 0;
  async function stepBenDoFishing(snap, config2, setStatus2, onCatchIncrement) {
    const delayMs = Math.max(150, Number(config2.taskDelayMs) || 650);
    if (snap.screen !== "benDo") {
      setStatus2("\u{1F6F6} \u0110ang \u0111i ra B\u1EBFn \u0110\xF2...");
      await execGameAction("NAVIGATE", { target: "benDo" });
      await sleep(delayMs + 400);
      return { finishedArea: false };
    }
    const bn = snap.benNet;
    const bu = snap.benUI;
    if (!bn || bn.status !== "in") {
      setStatus2("\u23F3 \u0110ang k\u1EBFt n\u1ED1i m\xE1y ch\u1EE7 B\u1EBFn \u0110\xF2...");
      return { finishedArea: false };
    }
    if (bn.fishing === "fight" || document.querySelector(".ben-fight")) {
      handleFightMinigame(snap, setStatus2);
      return { finishedArea: false };
    }
    const now = performance.now();
    if (bn.fishing === "landing" || document.querySelector(".catch-card.ben-catch")) {
      if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
        const card = document.querySelector(".catch-card.ben-catch");
        if (card) {
          const isRareSpecial = card.classList.contains("mythic") || Boolean(card.querySelector(".catch-tag.rainbow, .catch-tag.odd"));
          const keepBtn = card.querySelector(".ben-catch-btns button.btn-yellow");
          const bagBtn = card.querySelector(".ben-catch-btns button.btn-green");
          if (config2.benAutoKeepRare && isRareSpecial && keepBtn && !keepBtn.disabled) {
            triggerPointerDownAndClick(keepBtn);
            setStatus2("\u2B50 \u0110\xE3 gi\u1EEF l\u1EA1i c\xE1 Hi\u1EBFm/L\u1EA1/C\u1EA7u v\u1ED3ng!");
          } else if (bagBtn) {
            triggerPointerDownAndClick(bagBtn);
            setStatus2("\u{1F9FA} \u0110\xE3 b\u1ECF c\xE1 v\xE0o gi\u1ECF B\u1EBFn \u0110\xF2");
          }
          lastModalClickAt = now;
          onCatchIncrement();
        }
      }
      return { finishedArea: false };
    }
    const giftBtn = document.querySelector(".ben-gift-card button.btn-green");
    if (giftBtn && isVisible(giftBtn) && now - lastModalClickAt > 500) {
      triggerPointerDownAndClick(giftBtn);
      lastModalClickAt = now;
      return { finishedArea: false };
    }
    const benBobberBite = document.querySelector("span.ben-bobber.bite");
    if (bn.fishing === "bite" || benBobberBite && isVisible(benBobberBite)) {
      if (now - lastHookAt > 260) {
        const pullBtn = document.querySelector("button.ben-cast.btn-brown");
        if (pullBtn && isVisible(pullBtn)) {
          triggerPointerDownOnly(pullBtn);
        } else {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
        }
        lastHookAt = now;
        setStatus2("\u{1F3A3} B\u1EBFn \u0110\xF2: C\xE1 c\u1EAFn c\xE2u -> GI\u1EACT!");
      }
      return { finishedArea: false };
    }
    if (bn.fishing === "wait" || bn.fishing === "nibble" || bn.fishing === "casting") {
      setStatus2(
        bn.fishing === "nibble" ? "\u{1F41F} C\xE1 \u0111ang r\u1EC9a m\u1ED3i... \u0111\u1EE3i phao ch\xECm h\u1EB3n!" : "\u{1F30A} \u0110ang canh phao \u1EDF B\u1EBFn \u0110\xF2..."
      );
      return { finishedArea: false };
    }
    if (bu?.walking) {
      setStatus2("\u{1F6B6} \u0110ang \u0111i b\u1ED9 \u1EDF B\u1EBFn \u0110\xF2...");
      return { finishedArea: false };
    }
    if (bn.fishing === "idle") {
      const prep = await execGameAction("BEN_STEP", { config: config2 });
      if (prep && prep.ok && prep.acted) {
        setStatus2(prep.msg || "\u{1F6F6} \u0110ang chu\u1EA9n b\u1ECB t\u1EA1i B\u1EBFn \u0110\xF2...");
        await sleep(delayMs);
        return { finishedArea: false };
      }
      if (prep && prep.exhausted) {
        setStatus2(prep.reason || "\u{1F6F6} B\u1EBFn \u0110\xF2: \u0110\xE3 h\u1EBFt S\u1EE9c c\xE2u / m\u1ED3i -> Chuy\u1EC3n sang khu v\u1EF1c ti\u1EBFp theo!");
        return { finishedArea: true, exhausted: true };
      }
      const liveStam = bn.wallet?.liveStamina ?? 100;
      const castBtn = document.querySelector("button.ben-cast.btn-green, button.ben-cast.btn-yellow");
      const btnText = (castBtn?.textContent || "").trim();
      if (liveStam < 4 || btnText.includes("\u0110u\u1ED1i s\u1EE9c")) {
        setStatus2("\u{1F62E}\u200D\u{1F4A8} B\u1EBFn \u0110\xF2: H\u1EBFt th\u1EC3 l\u1EF1c kh\xF4ng c\xE2u \u0111\u01B0\u1EE3c n\u1EEFa -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!");
        return { finishedArea: true, exhausted: true };
      }
      if ((bn.wallet?.bait || 0) <= 0 || btnText.includes("H\u1EBFt m\u1ED3i")) {
        setStatus2("\u{1FAB1} B\u1EBFn \u0110\xF2: \u0110\xE3 h\u1EBFt m\u1ED3i c\xE2u -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!");
        return { finishedArea: true, exhausted: true };
      }
      const greenCastBtn = document.querySelector("button.ben-cast.btn-green");
      if (greenCastBtn && isVisible(greenCastBtn) && !greenCastBtn.disabled && now - lastCastAt > Math.max(600, delayMs)) {
        triggerPointerDownAndClick(greenCastBtn);
        lastCastAt = now;
        setStatus2(`\u{1F3A3} B\u1EBFn \u0110\xF2: Qu\u0103ng c\xE2u (\u{1FAB1} ${bn.wallet?.bait ?? 0} \xB7 \u26A1 ${bn.wallet?.liveStamina ?? 0})`);
      } else if (!bu?.spot) {
        setStatus2("\u{1F4CD} H\xE3y \u0111\u1EE9ng s\xE1t m\xE9p n\u01B0\u1EDBc (ho\u1EB7c b\u1EADt T\u1EF1 ra v\u1ECB tr\xED c\xE2u)");
      }
    }
    return { finishedArea: false };
  }

  // src/content/scheduler/sea-runner.ts
  var lastModalClickAt2 = 0;
  var lastHookAt2 = 0;
  var lastCastAt2 = 0;
  async function stepSeaFishing(snap, config2, setStatus2, onCatchIncrement) {
    const delayMs = Math.max(150, Number(config2.taskDelayMs) || 650);
    if (snap.screen !== "sea") {
      if (!snap.fishing?.seaOpen && (snap.day || 1) < 2) {
        setStatus2("\u{1F512} Ch\u01B0a m\u1EDF kh\xF3a \u0111\u01B0\u1EDDng ra Bi\u1EC3n");
        return { finishedArea: true, exhausted: true };
      }
      if (snap.minutes >= 1305) {
        setStatus2("\u{1F319} \u0110\xE3 khuya, kh\xF4ng th\u1EC3 ra Bi\u1EC3n");
        return { finishedArea: true, lateNight: true };
      }
      setStatus2("\u{1F3D6}\uFE0F \u0110ang \u0111i ra Bi\u1EC3n...");
      const nav = await execGameAction("NAVIGATE", { target: "sea" });
      if (!nav || !nav.ok) {
        setStatus2("\u26C8\uFE0F Kh\xF4ng th\u1EC3 ra Bi\u1EC3n l\xFAc n\xE0y (b\xE3o ho\u1EB7c qu\xE1 khuya)");
        return { finishedArea: true, exhausted: true, lateNight: (snap.minutes || 0) >= 1260 };
      }
      await sleep(delayMs + 350);
      return { finishedArea: false };
    }
    const s = snap.sea;
    if (!s) return { finishedArea: false };
    if (s.phase === "reel" || document.querySelector(".ben-fight")) {
      handleFightMinigame(snap, setStatus2);
      return { finishedArea: false };
    }
    const now = performance.now();
    if (s.phase === "result" || document.querySelector(".catch-card")) {
      if (now - lastModalClickAt2 > Math.max(350, delayMs * 0.7)) {
        const card = document.querySelector(".catch-card");
        if (card) {
          const notebookBtn = card.querySelector("button.btn-yellow");
          if (notebookBtn && (notebookBtn.textContent || "").includes("\u0110\u1ECDc trang s\u1ED5")) {
            triggerPointerDownAndClick(notebookBtn);
            lastModalClickAt2 = now;
            return { finishedArea: false };
          }
          const storeBtn = card.querySelector(".foot-buttons button.btn-brown");
          const againBtn = card.querySelector(".foot-buttons button.btn-green");
          if (storeBtn) {
            triggerPointerDownAndClick(storeBtn);
            lastModalClickAt2 = now;
            onCatchIncrement();
            setStatus2("\u{1F9FA} \u0110\xE3 c\u1EA5t c\xE1 v\xE0o gi\u1ECF Bi\u1EC3n");
          } else if (againBtn) {
            triggerPointerDownAndClick(againBtn);
            lastModalClickAt2 = now;
            onCatchIncrement();
          }
        }
      }
      return { finishedArea: false };
    }
    const redBiteBtn = document.querySelector("button.sea-cast.btn-red");
    if (s.phase === "bite" || redBiteBtn && isVisible(redBiteBtn)) {
      if (now - lastHookAt2 > 250) {
        if (redBiteBtn) {
          triggerPointerDownOnly(redBiteBtn);
        } else {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true }));
        }
        lastHookAt2 = now;
        setStatus2("\u{1F534} Bi\u1EC3n: C\xE1 c\u1EAFn th\u1EADt r\u1ED3i -> GI\u1EACT!");
      }
      return { finishedArea: false };
    }
    if (s.phase === "wait") {
      setStatus2("\u{1F30A} Bi\u1EC3n: \u0110ang canh phao... \u0111\u1EE3i n\xFAt \u0111\u1ECF m\u1EDBi gi\u1EADt!");
      return { finishedArea: false };
    }
    if (s.walking) {
      setStatus2("\u{1F6B6} \u0110ang \u0111i b\u1ED9 ra v\u1ECB tr\xED c\xE2u \u1EDF Bi\u1EC3n...");
      return { finishedArea: false };
    }
    if (s.phase === "idle") {
      const prep = await execGameAction("SEA_STEP", { config: config2 });
      if (prep && prep.ok && prep.acted) {
        setStatus2(prep.msg || "\u{1F3D6}\uFE0F \u0110ang chu\u1EA9n b\u1ECB t\u1EA1i Bi\u1EC3n...");
        await sleep(delayMs);
        return { finishedArea: false };
      }
      if (snap.minutes >= 1320) {
        setStatus2("\u{1F319} Bi\u1EC3n \u0111\xE3 khuya, k\u1EBFt th\xFAc c\xE2u \u1EDF Bi\u1EC3n -> Quay v\u1EC1 nh\xE0!");
        return { finishedArea: true, lateNight: true };
      }
      const freshSnap = await getGameState();
      const curM = freshSnap && freshSnap.ok ? freshSnap : snap;
      const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
      if (totalBait <= 0) {
        setStatus2("\u{1FAB1} Bi\u1EC3n: \u0110\xE3 h\u1EBFt m\u1ED3i c\xE2u v\xE0 kh\xF4ng \u0111\u1EE7 ti\u1EC1n mua th\xEAm!");
        return { finishedArea: true, exhausted: true };
      }
      if ((curM.fullness ?? 100) <= 0 || (curM.hydration ?? 100) <= 0) {
        setStatus2("\u{1F635} Bi\u1EC3n: \u0110\xE3 h\u1EBFt th\u1EC3 l\u1EF1c (\u0110\xF3i/Kh\xE1t) kh\xF4ng k\xE9o c\u1EA7n \u0111\u01B0\u1EE3c n\u1EEFa!");
        return { finishedArea: true, exhausted: true };
      }
      const castBtn = document.querySelector("button.sea-cast.btn-green");
      if (castBtn && isVisible(castBtn) && !castBtn.disabled && now - lastCastAt2 > Math.max(600, delayMs)) {
        triggerPointerDownAndClick(castBtn);
        lastCastAt2 = now;
        setStatus2(`\u{1F3A3} Bi\u1EC3n (${s.spot || "pier"}): Qu\u0103ng c\xE2u!`);
      }
    }
    return { finishedArea: false };
  }

  // src/content/scheduler/master-loop.ts
  var isBusy = false;
  var currentAreaIdx = 0;
  var areaCatchesCount = 0;
  var lastFarmDoneDay2 = -1;
  var lastFarmRunAt2 = 0;
  var benExhaustedUntil = 0;
  var seaExhaustedUntil = 0;
  var seaExhaustedDay = -1;
  function toggleAutoAll() {
    const config2 = getConfig();
    if (config2.running && config2.runMode === "all") {
      config2.running = false;
      setStatus("\u23F8\uFE0F \u0110\xE3 d\u1EEBng Auto T\u1EA5t C\u1EA3");
    } else {
      config2.running = true;
      config2.runMode = "all";
      setLockedTabArea(null);
      currentAreaIdx = 0;
      areaCatchesCount = 0;
      setStatus("\u25B6\uFE0F B\u1EAFt \u0111\u1EA7u ch\u1EA1y Auto T\u1EA5t C\u1EA3 theo th\u1EE9 t\u1EF1...");
    }
    saveConfig();
  }
  function toggleAutoTab() {
    const config2 = getConfig();
    if (config2.running && config2.runMode === "tab") {
      config2.running = false;
      setLockedTabArea(null);
      setStatus("\u23F8\uFE0F \u0110\xE3 d\u1EEBng Auto Tab");
    } else {
      config2.running = true;
      config2.runMode = "tab";
      setLockedTabArea(config2.activeTab);
      areaCatchesCount = 0;
      const areaName = AREA_META[config2.activeTab]?.name || config2.activeTab;
      setStatus(`\u{1F3AF} B\u1EAFt \u0111\u1EA7u ch\u1EC9 Auto trong Tab: ${areaName}`);
    }
    saveConfig();
  }
  async function tickAuto() {
    if (isBusy) return;
    isBusy = true;
    try {
      const snap = await getGameState();
      if (snap && snap.ok) {
        setLastGameSnap(snap);
        updateHeaderStats(snap);
      }
      const config2 = getConfig();
      if (!config2.running || !snap || !snap.ok) {
        isBusy = false;
        return;
      }
      const hour = Math.floor((snap.minutes || 0) / 60);
      const sleepTargetHour = Number(config2.sleepHour) || 21;
      if (document.querySelector(".ben-fight")) {
        handleFightMinigame(snap, setStatus);
        isBusy = false;
        return;
      }
      if (seaExhaustedDay !== (snap.day ?? 0)) {
        seaExhaustedUntil = 0;
        seaExhaustedDay = snap.day ?? 0;
      }
      const isMidSeaCast = snap.screen === "sea" && snap.sea && snap.sea.phase !== "idle";
      if (config2.autoSleep && !isMidSeaCast && (hour >= sleepTargetHour && (snap.screen === "playing" || config2.runMode === "all") || (snap.minutes || 0) >= 1350)) {
        setStatus(`\u{1F634} \u0110\xE3 ${formatClock(snap.minutes)} -> V\u1EC1 nh\xE0 \u0111i ng\u1EE7 qua ng\xE0y m\u1EDBi...`);
        await execGameAction("SLEEP_NOW");
        areaCatchesCount = 0;
        currentAreaIdx = 0;
        benExhaustedUntil = 0;
        seaExhaustedUntil = 0;
        await sleep(1200);
        isBusy = false;
        return;
      }
      if (config2.runMode === "tab") {
        const tab = getLockedTabArea() || config2.activeTab;
        if (tab === "farm") {
          const acted = await runFarmSubAreas(snap, config2, setStatus, updateHeaderStats);
          if (!acted) {
            setStatus("\u2705 \u0110\xE3 ho\xE0n t\u1EA5t m\u1ECDi vi\u1EC7c \u0111\u01B0\u1EE3c b\u1EADt trong N\xF4ng Tr\u1EA1i (\u0110ang canh t\u1EF1 \u0111\u1ED9ng...)");
          }
        } else if (tab === "benDo") {
          const res = await stepBenDoFishing(snap, config2, setStatus, () => {
            areaCatchesCount++;
          });
          if (res.finishedArea && config2.autoSleep && config2.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
            setStatus("\u{1F319} H\u1EBFt c\xE2u \u0111\u01B0\u1EE3c \u1EDF B\u1EBFn \u0110\xF2 bu\u1ED5i t\u1ED1i -> V\u1EC1 nh\xE0 \u0111i ng\u1EE7...");
            await execGameAction("SLEEP_NOW");
            await sleep(1200);
          }
        } else if (tab === "sea") {
          const res = await stepSeaFishing(snap, config2, setStatus, () => {
            areaCatchesCount++;
          });
          if (res.finishedArea) {
            if (config2.autoSleep && (config2.sleepOnFishingLimit || res.lateNight || (snap.minutes || 0) >= 1140)) {
              setStatus("\u{1F319} H\u1EBFt c\xE2u \u0111\u01B0\u1EE3c \u1EDF Bi\u1EC3n -> V\u1EC1 nh\xE0 \u0111i ng\u1EE7 qua ng\xE0y m\u1EDBi...");
              await execGameAction("SLEEP_NOW");
              await sleep(1200);
            } else {
              await execGameAction("NAVIGATE", { target: "playing", indoors: false });
            }
          }
        } else {
          setStatus("\u{1F3D9}\uFE0F Khu v\u1EF1c Th\xE0nh Ph\u1ED1 \u0111ang ph\xE1t tri\u1EC3n (Coming Soon)");
        }
        isBusy = false;
        return;
      }
      const enabledAreas = config2.areaOrder.filter((a) => config2.areaEnabled[a] && a !== "city");
      if (enabledAreas.length === 0) {
        setStatus("\u26A0\uFE0F Ch\u01B0a b\u1EADt Khu v\u1EF1c n\xE0o trong danh s\xE1ch Auto T\u1EA5t C\u1EA3!");
        isBusy = false;
        return;
      }
      if (currentAreaIdx >= enabledAreas.length) {
        currentAreaIdx = 0;
      }
      const currentArea = enabledAreas[currentAreaIdx];
      if (currentArea === "farm") {
        const mustNavigateHome = snap.screen !== "playing";
        const farmDue = mustNavigateHome || lastFarmDoneDay2 !== snap.day || Date.now() - lastFarmRunAt2 > 6e4 || enabledAreas.length === 1;
        if (farmDue) {
          await runFarmSubAreas(snap, config2, setStatus, updateHeaderStats);
          lastFarmDoneDay2 = snap.day ?? 0;
          lastFarmRunAt2 = Date.now();
        }
        if (enabledAreas.length > 1) {
          const nowMs = Date.now();
          const nextIdx = (currentAreaIdx + 1) % enabledAreas.length;
          const nextArea = enabledAreas[nextIdx];
          const benReady = nowMs >= benExhaustedUntil;
          const seaReady = nowMs >= seaExhaustedUntil && (snap.minutes || 0) < 1305;
          if (nextArea === "benDo" && benReady || nextArea === "sea" && seaReady || enabledAreas.length > 2) {
            currentAreaIdx = nextIdx;
            areaCatchesCount = 0;
          } else {
            setStatus("\u{1F33E} \u0110ang tr\u1EF1c t\u1EA1i N\xF4ng Tr\u1EA1i (\u0111\u1EE3i khu c\xE2u h\u1ED3i s\u1EE9c / qua ng\xE0y)...");
          }
        } else {
          setStatus("\u{1F33E} \u0110ang tr\u1EF1c t\u1EA1i N\xF4ng Tr\u1EA1i...");
        }
      } else if (currentArea === "benDo") {
        if (enabledAreas.includes("farm") && lastFarmDoneDay2 !== snap.day) {
          currentAreaIdx = enabledAreas.indexOf("farm");
          isBusy = false;
          return;
        }
        if (Date.now() < benExhaustedUntil && enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          isBusy = false;
          return;
        }
        const res = await stepBenDoFishing(snap, config2, setStatus, () => {
          areaCatchesCount++;
        });
        const switchMax = Math.max(1, Number(config2.fishingSwitchCount) || 15);
        if (res.finishedArea || enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.benNet?.fishing === "idle") {
          if (res.exhausted) {
            benExhaustedUntil = Date.now() + 18e4;
          }
          areaCatchesCount = 0;
          if (enabledAreas.length > 1) {
            currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
            lastFarmRunAt2 = 0;
          } else if (config2.autoSleep && config2.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
            setStatus("\u{1F319} \u0110\xE3 h\u1EBFt s\u1EE9c c\xE2u \u1EDF B\u1EBFn \u0110\xF2 bu\u1ED5i t\u1ED1i -> V\u1EC1 nh\xE0 \u0111i ng\u1EE7...");
            await execGameAction("SLEEP_NOW");
            await sleep(1200);
          }
        }
      } else if (currentArea === "sea") {
        if (enabledAreas.includes("farm") && lastFarmDoneDay2 !== snap.day) {
          currentAreaIdx = enabledAreas.indexOf("farm");
          isBusy = false;
          return;
        }
        if (Date.now() < seaExhaustedUntil && enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          isBusy = false;
          return;
        }
        const res = await stepSeaFishing(snap, config2, setStatus, () => {
          areaCatchesCount++;
        });
        const switchMax = Math.max(1, Number(config2.fishingSwitchCount) || 15);
        if (res.finishedArea) {
          if (res.exhausted) {
            seaExhaustedUntil = Date.now() + 18e4;
          }
          if (config2.autoSleep && (config2.sleepOnFishingLimit || res.lateNight) && (snap.minutes || 0) >= 1140) {
            setStatus("\u{1F319} \u0110\xE3 h\u1EBFt ng\xE0y \u1EDF Bi\u1EC3n -> V\u1EC1 nh\xE0 \u0111i ng\u1EE7 qua ng\xE0y m\u1EDBi...");
            await execGameAction("SLEEP_NOW");
            areaCatchesCount = 0;
            currentAreaIdx = 0;
            benExhaustedUntil = 0;
            seaExhaustedUntil = 0;
            await sleep(1200);
          } else if (enabledAreas.length > 1) {
            areaCatchesCount = 0;
            currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
            lastFarmRunAt2 = 0;
          }
        } else if (enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.sea?.phase === "idle") {
          areaCatchesCount = 0;
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        }
      }
    } catch (err) {
      console.error("[NTG Auto] tick error:", err);
    } finally {
      isBusy = false;
    }
  }

  // src/content/index.ts
  function init() {
    injectPageHook();
    initBridgeListener();
    createHud();
    setAutoActionHandlers(toggleAutoAll, toggleAutoTab);
    loadConfig();
    setInterval(tickAuto, 200);
    window.addEventListener("keydown", (e) => {
      if (e.altKey && e.code === "KeyA") {
        e.preventDefault();
        toggleAutoAll();
      } else if (e.altKey && e.code === "KeyP") {
        e.preventDefault();
        const cfg = getConfig();
        cfg.panelVisible = !cfg.panelVisible;
        saveConfig();
      }
    });
    chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
      if (msg.type === "TOGGLE_AUTO") {
        toggleAutoAll();
        const cfg = getConfig();
        sendResponse({ ok: true, running: cfg.running });
      } else if (msg.type === "TOGGLE_PANEL") {
        const cfg = getConfig();
        cfg.panelVisible = !cfg.panelVisible;
        saveConfig();
        sendResponse({ ok: true, panelVisible: cfg.panelVisible });
      } else if (msg.type === "GET_STATUS") {
        sendResponse({
          ok: true,
          config: getConfig(),
          lastActionText: getLastActionText(),
          snap: getLastGameSnap()
        });
      }
      return true;
    });
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "local" && changes.autoConfig?.newValue) {
        const merged = mergeConfig(changes.autoConfig.newValue);
        const current = getConfig();
        Object.assign(current, merged);
        renderAll();
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
//# sourceMappingURL=content.js.map
