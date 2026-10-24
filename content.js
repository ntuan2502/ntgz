(() => {
  if (window.__nongTraiGenZAutoLoadedV22) return;
  window.__nongTraiGenZAutoLoadedV22 = true;

  // Inject page-hook.js into MAIN world
  function injectPageHook() {
    try {
      const s = document.createElement('script');
      s.src = chrome.runtime.getURL('page-hook.js');
      s.onload = () => s.remove();
      (document.head || document.documentElement).appendChild(s);
    } catch (e) {
      console.error('[NTG Auto] Inject page-hook failed:', e);
    }
  }
  injectPageHook();

  const SUBAREA_META = {
    house: { id: 'house', icon: '🏠', name: 'Nhà, Bếp & Nhu Cầu' },
    crops: { id: 'crops', icon: '🌱', name: 'Ruộng Đồng (Trồng Trọt)' },
    pet: { id: 'pet', icon: '🐕', name: 'Thú Cưng (Chó / Mèo)' },
    barn: { id: 'barn', icon: '🐃', name: 'Chuồng Trâu & Bò Sữa' },
    coop: { id: 'coop', icon: '🐔', name: 'Chuồng Gà' },
    pond: { id: 'pond', icon: '🐟', name: 'Ao Cá' },
    market: { id: 'market', icon: '🏪', name: 'Tạp Hóa & Bảng Tin Làng' },
    dibay: { id: 'dibay', icon: '🐷', name: 'Quầy Dì Bảy & Sổ Tay' },
  };

  const AREA_META = {
    farm: { id: 'farm', icon: '🌾', name: 'Nông Trại' },
    benDo: { id: 'benDo', icon: '🛶', name: 'Bến Đò' },
    sea: { id: 'sea', icon: '🏖️', name: 'Biển' },
    city: { id: 'city', icon: '🏙️', name: 'Thành Phố' },
  };

  const DEFAULT_CONFIG = {
    running: false,
    runMode: 'all', // 'all' (chạy theo thứ tự khu vực) | 'tab' (chỉ chạy tab hiện tại)
    activeTab: 'farm', // 'farm' | 'benDo' | 'sea' | 'city'
    panelVisible: true,
    panelMinimized: false,
    showOrderDrawer: true,

    // General Delay & Transition settings
    taskDelayMs: 650,
    fishingSwitchCount: 15, // Số cá câu mỗi khu trước khi chuyển sang khu vực kế tiếp (khi bật nhiều khu câu)

    // Main Area Order & Enable/Disable toggles
    areaOrder: ['farm', 'benDo', 'sea'],
    areaEnabled: {
      farm: true,
      benDo: true,
      sea: true,
      city: false,
    },

    // Farm Sub-Area Order & Enable/Disable toggles
    farmSubOrder: ['house', 'crops', 'pet', 'barn', 'coop', 'pond', 'market', 'dibay'],
    farmSubEnabled: {
      house: true,
      crops: true,
      pet: true,
      barn: true,
      coop: true,
      pond: true,
      market: true,
      dibay: true,
    },
    farmSubCollapsed: {
      house: false,
      crops: false,
      pet: false,
      barn: false,
      coop: false,
      pond: false,
      market: false,
      dibay: false,
    },

    // 1. House, Kitchen, Needs & Salon
    autoDismissInterrupts: true,
    autoCook: true,
    preferDish: 'auto',
    autoRecoverHunger: true,
    hungerThreshold: 45,
    foodSource: 'kitchen_first', // 'kitchen_first' | 'kitchen_only' | 'shop_only'
    preferFoodShop: 'banhMiThit',
    autoRecoverThirst: true,
    thirstThreshold: 45,
    drinkSource: 'kitchen_first', // 'kitchen_first' | 'shop_only' | 'both'
    preferDrinkShop: 'nuocMia',
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
    preferSeed: 'auto',
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
    preferPondFish: 'chep',
    pondAutoFeed: true,
    pondAutoPayHelper: true,

    // 7. Market & Gold Shop
    autoDeliverOrder: true,
    autoVillageBoard: true,
    autoSellTrend: true,
    autoSellDailyTask: true,
    autoSellProduce: false, // Default is FALSE to protect player warehouse!
    surplusKeepQty: 20,
    goldAutoBuy: false,
    goldPreferType: 'mieng',
    goldKeepCash: 500000,
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
    savingsKeepGold: 200000,

    // Area 2: Ben Do Fishing Settings
    benAutoSpot: true,
    benSpot: 'dock', // 'dock' (Cầu tàu chính) | 'bamboo' (Cầu tre) | 'bank' (Bờ sông)
    benAutoBuyBait: true,
    benPreferBait: 'moi60', // 'moi20' | 'moi60' | 'moi150' | 'xinMoi'
    benAutoSell: true,
    benSellThreshold: 20,
    benAutoKeepRare: true, // Tự bấm ⭐ Giữ lại cá Lạ / Cầu vồng / Thần thoại
    benAutoGoiDau: true, // Tóc gội Út Mười (+50 Sức, -25🐚)
    benAutoRecoverStamina: true,
    benStaminaThreshold: 20,
    benPreferFood: 'comTam', // 'banhMi' | 'chaoCa' | 'huTieu' | 'comTam' | 'lauMam'
    benAutoLuckDrink: false,
    benPreferDrink: 'nuocMia', // 'nuocMia' | 'rauMa' | 'caPhe' | 'duaTuoi'
    benAutoLantern: true, // Sạp lồng đèn Cô Bảy (Quay vòng quay)
    benBuyLanternTicket: false, // Tự mua thêm vé lồng đèn (600🐚)
    benAutoLotto: true, // Đại lý vé số Bến Đò (Đổi thưởng vé trúng)
    benAutoBuyLotto: true, // Tự mua 1 vé số Bến Đò mỗi ngày (10🐚)
    benAutoAtm: false,
    benAtmThreshold: 500,

    // Area 3: Sea Fishing Settings
    seaAutoSpot: true,
    seaSpot: 'pier', // 'pier' (Cầu tàu) | 'rocks' (Bãi đá) | 'beach' (Mép bãi cát)
    seaAutoBuyBait: true,
    seaPreferBait: 'worm', // 'worm' | 'shrimp'
    seaBaitPacks: 2,
    seaAutoSell: true,
    seaSellThreshold: 5,
    seaAutoClaimDex: true,
    seaAutoEat: true,
    seaStaminaThreshold: 20,
  };

  let config = structuredClone(DEFAULT_CONFIG);

  // Runtime state
  let hudRoot = null;
  let els = {};
  let reqSeq = 0;
  const pendingReqs = new Map();

  let isBusy = false;
  let lastActionText = 'Đang chờ lệnh...';
  let lastGameSnap = null;
  let lockedTabArea = null;

  // Schedule execution tracking
  let currentAreaIdx = 0;
  let areaCatchesCount = 0;
  let lastFarmDoneDay = -1;
  let lastFarmRunAt = 0;
  let benExhaustedUntil = 0;
  let seaExhaustedUntil = 0;
  let seaExhaustedDay = -1;

  // Fishing runtime tracking
  let lastCastAt = 0;
  let lastHookAt = 0;
  let lastModalClickAt = 0;
  let lastPulledRunKey = '';
  let lastPullAt = 0;

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // Page-hook RPC
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'ntg-page') return;
    const { id, data } = e.data;
    const resolve = pendingReqs.get(id);
    if (resolve) {
      pendingReqs.delete(id);
      resolve(data);
    }
  });

  function callPageHook(type, action = null, payload = {}) {
    return new Promise((resolve) => {
      const id = ++reqSeq;
      const timer = setTimeout(() => {
        pendingReqs.delete(id);
        resolve({ ok: false, error: 'TIMEOUT' });
      }, 2500);
      pendingReqs.set(id, (res) => {
        clearTimeout(timer);
        resolve(res);
      });
      window.postMessage({ source: 'ntg-content', id, type, action, payload }, '*');
    });
  }

  const getGameState = () => callPageHook('GET_GAME_STATE');
  const execGameAction = (action, payload = {}) => callPageHook('EXEC_GAME_ACTION', action, payload);

  function mergeConfig(saved) {
    if (!saved || typeof saved !== 'object') return structuredClone(DEFAULT_CONFIG);
    const next = {
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
    // Ensure all farm sub-areas exist in farmSubOrder
    for (const k of DEFAULT_CONFIG.farmSubOrder) {
      if (!next.farmSubOrder.includes(k)) next.farmSubOrder.push(k);
    }
    return next;
  }

  function loadConfig() {
    chrome.storage.local.get(['autoConfig'], (res) => {
      if (res.autoConfig) {
        config = mergeConfig(res.autoConfig);
      }
      renderAll();
    });
  }

  function saveConfig() {
    chrome.storage.local.set({ autoConfig: config });
    renderAll();
  }

  function setStatus(text) {
    lastActionText = text;
    if (els.statusAction) els.statusAction.textContent = text;
  }

  function formatClock(minutes) {
    if (typeof minutes !== 'number') return '--:--';
    const h = Math.floor(minutes / 60) % 24;
    const m = Math.floor(minutes % 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function formatGold(n) {
    if (typeof n !== 'number') return '--';
    return n.toLocaleString('vi-VN') + 'đ';
  }

  // DOM Dispatch Helpers for Fishing UI
  function isVisible(el) {
    if (!el) return false;
    const s = window.getComputedStyle(el);
    if (s.display === 'none' || s.visibility === 'hidden' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }

  function triggerPointerDownAndClick(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new MouseEvent('mousedown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    el.dispatchEvent(new MouseEvent('mouseup', opts));
    el.click();
    return true;
  }

  function triggerPointerDownOnly(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const opts = { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent('pointerdown', opts));
    el.dispatchEvent(new PointerEvent('pointerup', opts));
    return true;
  }

  // =====================================================
  // FISHING MINIGAME ("🎣 Ghìm cần!" - .ben-fight)
  // Used by BOTH Bến Đò (fishing === 'fight') & Biển (phase === 'reel')
  // =====================================================
  function handleFightMinigame(snap) {
    const fightBox = document.querySelector('.ben-fight');
    if (!fightBox || !isVisible(fightBox)) {
      lastPulledRunKey = '';
      return false;
    }

    // Detect fish run direction from DOM or store
    const fishLeftEl = fightBox.querySelector('.ben-run-fish.left');
    const fishRightEl = fightBox.querySelector('.ben-run-fish.right');
    const timerBar = fightBox.querySelector('.ben-run-timer > i');

    let runDir = null;
    if (fishLeftEl) runDir = 'left';
    else if (fishRightEl) runDir = 'right';
    else if (snap?.benNet?.fight?.run?.dir) runDir = snap.benNet.fight.run.dir;

    if (!runDir) {
      return true; // In fight modal, waiting for fish's next run
    }

    // Identify unique run number so we pull exactly once per run
    const runN =
      snap?.benNet?.fight?.run?.n ||
      (timerBar ? timerBar.textContent || timerBar.style.animationDuration : '') ||
      'run';
    const runKey = `${runDir}:${runN}`;

    const now = performance.now();
    if (runKey === lastPulledRunKey && now - lastPullAt < 550) {
      return true;
    }

    // Wait ~120ms reaction time so it looks natural and hits the sweet spot
    if (now - lastPullAt < 130) {
      return true;
    }

    // Opposite direction: fish runs left -> pull right; fish runs right -> pull left
    const pullDir = runDir === 'left' ? 'right' : 'left';
    const btns = Array.from(fightBox.querySelectorAll('.ben-fight-btns button'));
    const leftBtn = btns.find((b) => (b.textContent || '').includes('Ghìm trái'));
    const rightBtn = btns.find((b) => (b.textContent || '').includes('Ghìm phải'));

    const targetBtn = pullDir === 'left' ? leftBtn : rightBtn;
    if (targetBtn && !targetBtn.disabled) {
      triggerPointerDownOnly(targetBtn);
      lastPulledRunKey = runKey;
      lastPullAt = now;
      setStatus(`💪 Ghìm cần sang ${pullDir === 'left' ? 'TRÁI ⬅' : 'PHẢI ➡'}!`);
    } else {
      const key = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
      const code = pullDir === 'left' ? 'KeyA' : 'KeyD';
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
      lastPulledRunKey = runKey;
      lastPullAt = now;
    }
    return true;
  }

  // =====================================================
  // AREA 1: NÔNG TRẠI (Step-by-step with configurable taskDelayMs)
  // =====================================================
  async function runFarmSubAreas(snap) {
    const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

    // Ensure player is at Farm ('playing')
    if (snap.screen !== 'playing') {
      setStatus('🚜 Đang quay về Nông Trại...');
      await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
      await sleep(delayMs);
      return true;
    }

    // Leave house if indoors before doing outdoor tasks
    if (snap.indoors) {
      await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
      await sleep(Math.min(400, delayMs));
    }

    let anyActed = false;

    for (const subId of config.farmSubOrder) {
      if (!config.running) break;
      if (!config.farmSubEnabled[subId]) continue;

      const meta = SUBAREA_META[subId];
      let stepSafety = 0;

      while (config.running && stepSafety < 50) {
        stepSafety++;
        const res = await execGameAction('FARM_SUBAREA_STEP', {
          subAreaId: subId,
          config,
        });

        if (res && res.ok && res.acted) {
          anyActed = true;
          setStatus(res.msg || `${meta.icon} Đang xử lý ${meta.name}...`);
          await sleep(delayMs);
          const fresh = await getGameState();
          if (fresh && fresh.ok) {
            lastGameSnap = fresh;
            updateHeaderStats(fresh);
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

  // =====================================================
  // AREA 2: BẾN ĐÒ (Online WebSocket River Fishing)
  // =====================================================
  async function stepBenDoFishing(snap) {
    const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

    if (snap.screen !== 'benDo') {
      setStatus('🛶 Đang đi ra Bến Đò...');
      await execGameAction('NAVIGATE', { target: 'benDo' });
      await sleep(delayMs + 400);
      return { finishedArea: false };
    }

    const bn = snap.benNet;
    const bu = snap.benUI;
    if (!bn || bn.status !== 'in') {
      setStatus('⏳ Đang kết nối máy chủ Bến Đò...');
      return { finishedArea: false };
    }

    // 1. Handle Fight Minigame ("🎣 Ghìm cần!")
    if (bn.fishing === 'fight' || document.querySelector('.ben-fight')) {
      handleFightMinigame(snap);
      return { finishedArea: false };
    }

    const now = performance.now();

    // 2. Handle Catch Result Modal (C8: .catch-card.ben-catch)
    if (bn.fishing === 'landing' || document.querySelector('.catch-card.ben-catch')) {
      if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
        const card = document.querySelector('.catch-card.ben-catch');
        if (card) {
          const isRareSpecial =
            card.classList.contains('mythic') ||
            Boolean(card.querySelector('.catch-tag.rainbow, .catch-tag.odd'));
          const keepBtn = card.querySelector('.ben-catch-btns button.btn-yellow');
          const bagBtn = card.querySelector('.ben-catch-btns button.btn-green');

          if (config.benAutoKeepRare && isRareSpecial && keepBtn && !keepBtn.disabled) {
            triggerPointerDownAndClick(keepBtn);
            setStatus('⭐ Đã giữ lại cá Hiếm/Lạ/Cầu vồng!');
          } else if (bagBtn) {
            triggerPointerDownAndClick(bagBtn);
            setStatus('🧺 Đã bỏ cá vào giỏ Bến Đò');
          }
          lastModalClickAt = now;
          areaCatchesCount++;
        }
      }
      return { finishedArea: false };
    }

    // 3. Handle Gift Modal from Admin if present
    const giftBtn = document.querySelector('.ben-gift-card button.btn-green');
    if (giftBtn && isVisible(giftBtn) && now - lastModalClickAt > 500) {
      triggerPointerDownAndClick(giftBtn);
      lastModalClickAt = now;
      return { finishedArea: false };
    }

    // 4. Handle Bite ("GIẬT!") -> ONLY when span.ben-bobber.bite or bn.fishing === 'bite'
    const benBobberBite = document.querySelector('span.ben-bobber.bite');
    if (bn.fishing === 'bite' || (benBobberBite && isVisible(benBobberBite))) {
      if (now - lastHookAt > 260) {
        const pullBtn = document.querySelector('button.ben-cast.btn-brown');
        if (pullBtn && isVisible(pullBtn)) {
          triggerPointerDownOnly(pullBtn);
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
        }
        lastHookAt = now;
        setStatus('🎣 Bến Đò: Cá cắn câu -> GIẬT!');
      }
      return { finishedArea: false };
    }

    // 5. Waiting for fish to bite
    if (bn.fishing === 'wait' || bn.fishing === 'nibble' || bn.fishing === 'casting') {
      setStatus(
        bn.fishing === 'nibble'
          ? '🐟 Cá đang rỉa mồi... đợi phao chìm hẳn!'
          : '🌊 Đang canh phao ở Bến Đò...'
      );
      return { finishedArea: false };
    }

    // 6. Walking to shop or spot
    if (bu?.walking) {
      setStatus('🚶 Đang đi bộ ở Bến Đò...');
      return { finishedArea: false };
    }

    // 7. When idle: Run preparation step (sell fish, buy bait, eat for stamina, drink tea, walk to spot)
    if (bn.fishing === 'idle') {
      const prep = await execGameAction('BEN_STEP', { config });
      if (prep && prep.ok && prep.acted) {
        setStatus(prep.msg || '🛶 Đang chuẩn bị tại Bến Đò...');
        await sleep(delayMs);
        return { finishedArea: false };
      }

      if (prep && prep.exhausted) {
        setStatus(prep.reason || '🛶 Bến Đò: Đã hết Sức câu / mồi -> Chuyển sang khu vực tiếp theo!');
        return { finishedArea: true, exhausted: true };
      }

      const liveStam = bn.wallet?.liveStamina ?? 100;
      const castBtn = document.querySelector('button.ben-cast.btn-green, button.ben-cast.btn-yellow');
      const btnText = (castBtn?.textContent || '').trim();

      // Check if out of stamina (cannot cast anymore)
      if (liveStam < 4 || btnText.includes('Đuối sức')) {
        setStatus('😮‍💨 Bến Đò: Hết thể lực không câu được nữa -> Chuyển khu vực tiếp theo!');
        return { finishedArea: true, exhausted: true };
      }

      // Check if out of bait
      if ((bn.wallet?.bait || 0) <= 0 || btnText.includes('Hết mồi')) {
        setStatus('🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!');
        return { finishedArea: true, exhausted: true };
      }

      // Cast line if standing at water spot
      const greenCastBtn = document.querySelector('button.ben-cast.btn-green');
      if (greenCastBtn && isVisible(greenCastBtn) && !greenCastBtn.disabled && now - lastCastAt > Math.max(600, delayMs)) {
        triggerPointerDownAndClick(greenCastBtn);
        lastCastAt = now;
        setStatus(`🎣 Bến Đò: Quăng câu (🪱 ${bn.wallet?.bait ?? 0} · ⚡ ${bn.wallet?.liveStamina ?? 0})`);
      } else if (!bu?.spot) {
        setStatus('📍 Hãy đứng sát mép nước (hoặc bật Tự ra vị trí câu)');
      }
    }

    return { finishedArea: false };
  }

  // =====================================================
  // AREA 3: BIỂN (Sea Fishing & Chòi Ông Tư)
  // =====================================================
  async function stepSeaFishing(snap) {
    const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

    // Check if storm or night prevents going to Sea
    if (snap.screen !== 'sea') {
      if (!snap.fishing?.seaOpen && (snap.day || 1) < 2) {
        setStatus('🔒 Chưa mở khóa đường ra Biển');
        return { finishedArea: true, exhausted: true };
      }
      if (snap.minutes >= 1305) {
        setStatus('🌙 Đã khuya, không thể ra Biển');
        return { finishedArea: true, lateNight: true };
      }
      setStatus('🏖️ Đang đi ra Biển...');
      const nav = await execGameAction('NAVIGATE', { target: 'sea' });
      if (!nav || !nav.ok) {
        setStatus('⛈️ Không thể ra Biển lúc này (bão hoặc quá khuya)');
        return { finishedArea: true, exhausted: true, lateNight: (snap.minutes || 0) >= 1260 };
      }
      await sleep(delayMs + 350);
      return { finishedArea: false };
    }

    const s = snap.sea;
    if (!s) return { finishedArea: false };

    // 1. Handle Fight Minigame ("🎣 Ghìm cần!" - .ben-fight)
    if (s.phase === 'reel' || document.querySelector('.ben-fight')) {
      handleFightMinigame(snap);
      return { finishedArea: false };
    }

    const now = performance.now();

    // 2. Handle Catch Result Modal (l8: .catch-card)
    if (s.phase === 'result' || document.querySelector('.catch-card')) {
      if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
        const card = document.querySelector('.catch-card');
        if (card) {
          const notebookBtn = card.querySelector('button.btn-yellow');
          if (notebookBtn && (notebookBtn.textContent || '').includes('Đọc trang sổ')) {
            triggerPointerDownAndClick(notebookBtn);
            lastModalClickAt = now;
            return { finishedArea: false };
          }
          const storeBtn = card.querySelector('.foot-buttons button.btn-brown');
          const againBtn = card.querySelector('.foot-buttons button.btn-green');
          // Click "Cất" so we return to idle and can sell basket / buy bait / check needs cleanly
          if (storeBtn) {
            triggerPointerDownAndClick(storeBtn);
            lastModalClickAt = now;
            areaCatchesCount++;
            setStatus('🧺 Đã cất cá vào giỏ Biển');
          } else if (againBtn) {
            triggerPointerDownAndClick(againBtn);
            lastModalClickAt = now;
            areaCatchesCount++;
          }
        }
      }
      return { finishedArea: false };
    }

    // 3. Handle Bite ("GIẬT!" - button.sea-cast.btn-red)
    const redBiteBtn = document.querySelector('button.sea-cast.btn-red');
    if (s.phase === 'bite' || (redBiteBtn && isVisible(redBiteBtn))) {
      if (now - lastHookAt > 250) {
        if (redBiteBtn) {
          triggerPointerDownOnly(redBiteBtn);
        } else {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
        }
        lastHookAt = now;
        setStatus('🔴 Biển: Cá cắn thật rồi -> GIẬT!');
      }
      return { finishedArea: false };
    }

    // 4. Waiting for fish to bite
    if (s.phase === 'wait') {
      setStatus('🌊 Biển: Đang canh phao... đợi nút đỏ mới giật!');
      return { finishedArea: false };
    }

    // 5. Walking to spot
    if (s.walking) {
      setStatus('🚶 Đang đi bộ ra vị trí câu ở Biển...');
      return { finishedArea: false };
    }

    // 6. Idle phase: Run preparation step (buy rod, sell basket, buy bait, eat, walk to spot)
    if (s.phase === 'idle') {
      const prep = await execGameAction('SEA_STEP', { config });
      if (prep && prep.ok && prep.acted) {
        setStatus(prep.msg || '🏖️ Đang chuẩn bị tại Biển...');
        await sleep(delayMs);
        return { finishedArea: false };
      }

      // Check if too late at night at Sea (22:00 / 22:30 limit)
      if (snap.minutes >= 1320) {
        setStatus('🌙 Biển đã khuya, kết thúc câu ở Biển -> Quay về nhà!');
        return { finishedArea: true, lateNight: true };
      }

      const freshSnap = await getGameState();
      const curM = freshSnap && freshSnap.ok ? freshSnap : snap;

      const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
      if (totalBait <= 0) {
        setStatus('🪱 Biển: Đã hết mồi câu và không đủ tiền mua thêm!');
        return { finishedArea: true, exhausted: true };
      }

      if ((curM.fullness ?? 100) <= 0 || (curM.hydration ?? 100) <= 0) {
        setStatus('😵 Biển: Đã hết thể lực (Đói/Khát) không kéo cần được nữa!');
        return { finishedArea: true, exhausted: true };
      }

      const castBtn = document.querySelector('button.sea-cast.btn-green');
      if (castBtn && isVisible(castBtn) && !castBtn.disabled && now - lastCastAt > Math.max(600, delayMs)) {
        triggerPointerDownAndClick(castBtn);
        lastCastAt = now;
        setStatus(`🎣 Biển (${s.spot || 'pier'}): Quăng câu!`);
      }
    }

    return { finishedArea: false };
  }

  // =====================================================
  // MASTER LOOP: Supports BOTH "Auto Tất Cả" & "Auto Tab Này"
  // =====================================================
  async function tickAuto() {
    if (isBusy) return;
    isBusy = true;

    try {
      const snap = await getGameState();
      if (snap && snap.ok) {
        lastGameSnap = snap;
        updateHeaderStats(snap);
      }

      if (!config.running || !snap || !snap.ok) {
        isBusy = false;
        return;
      }

      const hour = Math.floor((snap.minutes || 0) / 60);
      const sleepTargetHour = Number(config.sleepHour) || 21;

      // Priority 0: If Fight Minigame is active on screen right now, always handle it immediately!
      if (document.querySelector('.ben-fight')) {
        handleFightMinigame(snap);
        isBusy = false;
        return;
      }

      // Reset daily fishing exhaustion flags on a new day
      if (seaExhaustedDay !== snap.day) {
        seaExhaustedUntil = 0;
        seaExhaustedDay = snap.day;
      }

      // Check Night Sleep:
      // Trigger if autoSleep is enabled and:
      // - It's >= sleepHour and player is at Farm ('playing') or in 'all' mode (and not mid-cast at Sea)
      // - OR it's >= 22:30 (1350 mins, when Sea closes for the night)
      const isMidSeaCast = snap.screen === 'sea' && snap.sea && snap.sea.phase !== 'idle';
      if (
        config.autoSleep &&
        !isMidSeaCast &&
        ((hour >= sleepTargetHour && (snap.screen === 'playing' || config.runMode === 'all')) ||
          (snap.minutes || 0) >= 1350)
      ) {
        setStatus(`😴 Đã ${formatClock(snap.minutes)} -> Về nhà đi ngủ qua ngày mới...`);
        await execGameAction('SLEEP_NOW');
        areaCatchesCount = 0;
        currentAreaIdx = 0;
        benExhaustedUntil = 0;
        seaExhaustedUntil = 0;
        await sleep(1200);
        isBusy = false;
        return;
      }

      // MODE A: "🎯 AUTO TAB NÀY" (Only run inside locked tab area, not affected by tab browsing)
      if (config.runMode === 'tab') {
        const tab = lockedTabArea || config.activeTab;
        if (tab === 'farm') {
          const acted = await runFarmSubAreas(snap);
          if (!acted) {
            setStatus('✅ Đã hoàn tất mọi việc được bật trong Nông Trại (Đang canh tự động...)');
          }
        } else if (tab === 'benDo') {
          const res = await stepBenDoFishing(snap);
          if (res.finishedArea && config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
            setStatus('🌙 Hết câu được ở Bến Đò buổi tối -> Về nhà đi ngủ...');
            await execGameAction('SLEEP_NOW');
            await sleep(1200);
          }
        } else if (tab === 'sea') {
          const res = await stepSeaFishing(snap);
          if (res.finishedArea) {
            if (config.autoSleep && (config.sleepOnFishingLimit || res.lateNight || (snap.minutes || 0) >= 1140)) {
              setStatus('🌙 Hết câu được ở Biển -> Về nhà đi ngủ qua ngày mới...');
              await execGameAction('SLEEP_NOW');
              await sleep(1200);
            } else {
              await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
            }
          }
        } else {
          setStatus('🏙️ Khu vực Thành Phố đang phát triển (Coming Soon)');
        }
        isBusy = false;
        return;
      }

      // MODE B: "▶️ AUTO TẤT CẢ" (Follow user's drag-and-drop areaOrder, skipping disabled areas)
      const enabledAreas = config.areaOrder.filter((a) => config.areaEnabled[a] && a !== 'city');
      if (enabledAreas.length === 0) {
        setStatus('⚠️ Chưa bật Khu vực nào trong danh sách Auto Tất Cả!');
        isBusy = false;
        return;
      }

      if (currentAreaIdx >= enabledAreas.length) {
        currentAreaIdx = 0;
      }
      const currentArea = enabledAreas[currentAreaIdx];

      if (currentArea === 'farm') {
        // Run Farm routine if not at Farm, or not done today, or every 60s, or when Farm is the only available area
        const mustNavigateHome = snap.screen !== 'playing';
        const farmDue =
          mustNavigateHome ||
          lastFarmDoneDay !== snap.day ||
          Date.now() - lastFarmRunAt > 60000 ||
          enabledAreas.length === 1;

        if (farmDue) {
          await runFarmSubAreas(snap);
        }

        // Only advance to next area if there is another enabled area that isn't currently exhausted
        if (enabledAreas.length > 1) {
          const nowMs = Date.now();
          const nextIdx = (currentAreaIdx + 1) % enabledAreas.length;
          const nextArea = enabledAreas[nextIdx];
          const benReady = nowMs >= benExhaustedUntil;
          const seaReady = nowMs >= seaExhaustedUntil && (snap.minutes || 0) < 1305;

          if (
            (nextArea === 'benDo' && benReady) ||
            (nextArea === 'sea' && seaReady) ||
            enabledAreas.length > 2
          ) {
            currentAreaIdx = nextIdx;
            areaCatchesCount = 0;
          } else {
            setStatus('🌾 Đang trực tại Nông Trại (đợi khu câu hồi sức / qua ngày)...');
          }
        } else {
          setStatus('🌾 Đang trực tại Nông Trại...');
        }
      } else if (currentArea === 'benDo') {
        // Periodically check if Farm needs urgent attention on new day
        if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
          currentAreaIdx = enabledAreas.indexOf('farm');
          isBusy = false;
          return;
        }

        // If Ben Do is on exhaustion cooldown and another area is enabled, switch immediately
        if (Date.now() < benExhaustedUntil && enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          isBusy = false;
          return;
        }

        const res = await stepBenDoFishing(snap);
        const switchMax = Math.max(1, Number(config.fishingSwitchCount) || 15);
        if (
          res.finishedArea ||
          (enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.benNet?.fishing === 'idle')
        ) {
          if (res.exhausted) {
            benExhaustedUntil = Date.now() + 180000; // Wait 3 mins for stamina recovery before re-entering Ben Do
          }
          areaCatchesCount = 0;
          if (enabledAreas.length > 1) {
            currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
            lastFarmRunAt = 0;
          } else if (config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
            setStatus('🌙 Đã hết sức câu ở Bến Đò buổi tối -> Về nhà đi ngủ...');
            await execGameAction('SLEEP_NOW');
            await sleep(1200);
          }
        }
      } else if (currentArea === 'sea') {
        if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
          currentAreaIdx = enabledAreas.indexOf('farm');
          isBusy = false;
          return;
        }

        if (Date.now() < seaExhaustedUntil && enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          isBusy = false;
          return;
        }

        const res = await stepSeaFishing(snap);
        const switchMax = Math.max(1, Number(config.fishingSwitchCount) || 15);
        if (res.finishedArea) {
          if (res.exhausted) {
            seaExhaustedUntil = Date.now() + 180000;
          }
          if (
            config.autoSleep &&
            (config.sleepOnFishingLimit || res.lateNight) &&
            (snap.minutes || 0) >= 1140
          ) {
            setStatus('🌙 Đã hết ngày ở Biển -> Về nhà đi ngủ qua ngày mới...');
            await execGameAction('SLEEP_NOW');
            areaCatchesCount = 0;
            currentAreaIdx = 0;
            benExhaustedUntil = 0;
            seaExhaustedUntil = 0;
            await sleep(1200);
          } else if (enabledAreas.length > 1) {
            areaCatchesCount = 0;
            currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
            lastFarmRunAt = 0;
          }
        } else if (enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.sea?.phase === 'idle') {
          areaCatchesCount = 0;
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        }
      }
    } catch (err) {
      console.error('[NTG Auto] tick error:', err);
    } finally {
      isBusy = false;
    }
  }

  // =====================================================
  // IN-GAME SHADOW DOM HUD (4 Area Tabs + Drag & Drop + Conditional UI)
  // =====================================================
  function createHud() {
    if (document.getElementById('ntg-auto-hud-host')) return;

    const host = document.createElement('div');
    host.id = 'ntg-auto-hud-host';
    host.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
    document.documentElement.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    hudRoot = shadow;

    const style = document.createElement('style');
    style.textContent = `
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

      /* Sub-Area Cards (Draggable inside Farm Tab) */
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

    const panel = document.createElement('div');
    panel.className = 'hud-panel';
    panel.innerHTML = `
      <div class="hud-header" id="hudDragHandle">
        <div class="hud-title">
          <span>🌾 NTG Auto by Tún <small style="font-size:10px; color:#cbd5e1; font-weight:700;">v1.0.0</small></span>
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
        <div class="tab-pane" id="pane-benDo">
          <div class="area-enable-banner" id="bannerArea_benDo">
            <span>🛶 Cho phép chạy Khu vực Bến Đò</span>
            <input type="checkbox" id="chkArea_benDo">
          </div>

          <div class="sub-card">
            <div class="sub-card-head" style="cursor:default;">
              <div class="sub-card-head-left">🎣 Vị Trí &amp; Thao Tác Câu Bến Đò</div>
            </div>
            <div class="sub-card-body">
              <div class="hint-note">
                ✨ Tự nhận diện phao chìm hẳn (<code>ben-bobber.bite</code>) mới giật và tự ghìm cần ngược hướng cá chạy.
              </div>
              <label class="opt-row">
                <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
                <input type="checkbox" data-key="benAutoSpot">
              </label>
              <div class="opt-sub" data-show-if="benAutoSpot">
                <div class="opt-row">
                  <span>Vị trí ngồi câu:</span>
                  <select data-key="benSpot">
                    <option value="dock">🌉 Cầu tàu chính (x:31, y:4)</option>
                    <option value="bamboo">🎋 Cầu tre (x:7, y:6)</option>
                    <option value="bank">🌿 Bờ sông (x:24, y:10)</option>
                  </select>
                </div>
              </div>

              <label class="opt-row">
                <span>⭐ Tự bấm Giữ lại cá Lạ / Cầu vồng / Thần thoại</span>
                <input type="checkbox" data-key="benAutoKeepRare">
              </label>
            </div>
          </div>

          <div class="sub-card">
            <div class="sub-card-head" style="cursor:default;">
              <div class="sub-card-head-left">🪱 Mồi Câu, Bán Cá &amp; Hồi Sức Bến Đò</div>
            </div>
            <div class="sub-card-body">
              <label class="opt-row">
                <span>🪱 Tự đi mua mồi Chú Đực khi hết mồi</span>
                <input type="checkbox" data-key="benAutoBuyBait">
              </label>
              <div class="opt-sub" data-show-if="benAutoBuyBait">
                <div class="opt-row">
                  <span>Loại mồi ưu tiên:</span>
                  <select data-key="benPreferBait">
                    <option value="moi60">🪱 Thau 60 mồi (40 vỏ sò)</option>
                    <option value="moi150">🪱 Thùng 150 mồi (90 vỏ sò)</option>
                    <option value="moi20">🪱 Hộp 20 mồi (15 vỏ sò)</option>
                    <option value="xinMoi">🤲 Xin 10 mồi miễn phí</option>
                  </select>
                </div>
              </div>

              <label class="opt-row">
                <span>🐟 Tự đi bán cá tại Vựa Anh Tư</span>
                <input type="checkbox" data-key="benAutoSell">
              </label>
              <div class="opt-sub" data-show-if="benAutoSell">
                <div class="opt-row">
                  <span>Bán khi giỏ cá đạt (con):</span>
                  <input type="number" data-key="benSellThreshold" min="1" max="60" step="1">
                </div>
              </div>

              <label class="opt-row">
                <span>🍱 Tự ăn hồi Sức câu (⚡) khi đuối sức</span>
                <input type="checkbox" data-key="benAutoRecoverStamina">
              </label>
              <div class="opt-sub" data-show-if="benAutoRecoverStamina">
                <div class="opt-row">
                  <span>Hồi khi Sức (⚡) dưới:</span>
                  <input type="number" data-key="benStaminaThreshold" min="5" max="80" step="5">
                </div>
                <div class="opt-row">
                  <span>Món ăn tại Quán Dì Tám:</span>
                  <select data-key="benPreferFood">
                    <option value="comTam">🍛 Cơm tấm (+60⚡ · 28🐚)</option>
                    <option value="lauMam">🍲 Lẩu cá linh (+100⚡ · 45🐚)</option>
                    <option value="huTieu">🍜 Hủ tiếu (+40⚡ · 20🐚)</option>
                    <option value="chaoCa">🥣 Cháo cá lóc (+28⚡ · 14🐚)</option>
                    <option value="banhMi">🥖 Bánh mì (+20⚡ · 10🐚)</option>
                  </select>
                </div>
              </div>

              <label class="opt-row">
                <span>🍀 Tự uống nước tăng May mắn (Xe Chị Thơm)</span>
                <input type="checkbox" data-key="benAutoLuckDrink">
              </label>
              <div class="opt-sub" data-show-if="benAutoLuckDrink">
                <div class="opt-row">
                  <span>Loại nước uống:</span>
                  <select data-key="benPreferDrink">
                    <option value="nuocMia">🥤 Nước mía (+1 May · 15🐚)</option>
                    <option value="rauMa">🍵 Rau má (+1 May/30 lượt · 30🐚)</option>
                    <option value="caPhe">☕ Cà phê sữa (+2 May · 35🐚)</option>
                    <option value="duaTuoi">🥥 Dừa tươi (+3 May · 80🐚)</option>
                  </select>
                </div>
              </div>

              <label class="opt-row">
                <span>🏧 Tự đổi Vỏ sò ra Tiền mặt tại ATM</span>
                <input type="checkbox" data-key="benAutoAtm">
              </label>
              <div class="opt-sub" data-show-if="benAutoAtm">
                <div class="opt-row">
                  <span>Đổi khi Vỏ sò vượt quá:</span>
                  <input type="number" data-key="benAtmThreshold" min="100" max="50000" step="100">
                </div>
              </div>
            </div>
          </div>

          <div class="sub-card">
            <div class="sub-card-head" style="cursor:default;">
              <div class="sub-card-head-left">🏮 Tiện Ích: Út Mười, Lồng Đèn &amp; Vé Số</div>
            </div>
            <div class="sub-card-body">
              <label class="opt-row">
                <span>💆 Tóc gội Út Mười: Gội đầu massage (+50 Sức · 25🐚)</span>
                <input type="checkbox" data-key="benAutoGoiDau">
              </label>

              <label class="opt-row">
                <span>🏮 Sạp lồng đèn Cô Bảy: Quay Vòng quay may mắn</span>
                <input type="checkbox" data-key="benAutoLantern">
              </label>
              <div class="opt-sub" data-show-if="benAutoLantern">
                <label class="opt-row">
                  <span>🎟️ Tự mua thêm vé lồng đèn khi nhiều vỏ sò (600🐚/vé)</span>
                  <input type="checkbox" data-key="benBuyLanternTicket">
                </label>
              </div>

              <label class="opt-row">
                <span>🎟️ Đại lý vé số Bến Đò: Tự đổi thưởng khi trúng giải</span>
                <input type="checkbox" data-key="benAutoLotto">
              </label>
              <div class="opt-sub" data-show-if="benAutoLotto">
                <label class="opt-row">
                  <span>🍀 Tự mua 1 vé số Bến Đò cầu may mỗi ngày (10🐚)</span>
                  <input type="checkbox" data-key="benAutoBuyLotto">
                </label>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 3: BIỂN -->
        <div class="tab-pane" id="pane-sea">
          <div class="area-enable-banner" id="bannerArea_sea">
            <span>🏖️ Cho phép chạy Khu vực Biển</span>
            <input type="checkbox" id="chkArea_sea">
          </div>

          <div class="sub-card">
            <div class="sub-card-head" style="cursor:default;">
              <div class="sub-card-head-left">🌊 Vị Trí &amp; Thao Tác Câu Ở Biển</div>
            </div>
            <div class="sub-card-body">
              <div class="hint-note">
                ✨ Tự đợi nút đỏ (<code>sea-cast.btn-red</code>) mới giật, tự ghìm cần theo hướng cá và cất cá vào giỏ.
              </div>
              <label class="opt-row">
                <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
                <input type="checkbox" data-key="seaAutoSpot">
              </label>
              <div class="opt-sub" data-show-if="seaAutoSpot">
                <div class="opt-row">
                  <span>Vị trí ngồi câu ở Biển:</span>
                  <select data-key="seaSpot">
                    <option value="pier">🌉 Cầu tàu</option>
                    <option value="rocks">🪨 Bãi đá</option>
                    <option value="beach">🏖️ Mép bãi cát</option>
                  </select>
                </div>
              </div>

              <label class="opt-row">
                <span>📖 Tự nhận thưởng Sổ cá Bách khoa Ông Tư</span>
                <input type="checkbox" data-key="seaAutoClaimDex">
              </label>
              <label class="opt-row">
                <span>🍙 Tự ăn uống hồi phục Đói Khát khi câu Biển</span>
                <input type="checkbox" data-key="seaAutoEat">
              </label>
            </div>
          </div>

          <div class="sub-card">
            <div class="sub-card-head" style="cursor:default;">
              <div class="sub-card-head-left">🛖 Chòi Ông Tư (Mua Mồi &amp; Bán Cá)</div>
            </div>
            <div class="sub-card-body">
              <label class="opt-row">
                <span>🦐 Tự mua mồi câu khi hết mồi</span>
                <input type="checkbox" data-key="seaAutoBuyBait">
              </label>
              <div class="opt-sub" data-show-if="seaAutoBuyBait">
                <div class="opt-row">
                  <span>Loại mồi ưu tiên:</span>
                  <select data-key="seaPreferBait">
                    <option value="worm">🪱 Mồi Giun / Trùn (Câu thường)</option>
                    <option value="shrimp">🦐 Mồi Tôm (Câu cá hiếm)</option>
                  </select>
                </div>
                <div class="opt-row">
                  <span>Số gói mua mỗi lần:</span>
                  <input type="number" data-key="seaBaitPacks" min="1" max="20" step="1">
                </div>
              </div>

              <label class="opt-row">
                <span>🐟 Tự bán hải sản trong giỏ cho Ông Tư</span>
                <input type="checkbox" data-key="seaAutoSell">
              </label>
              <div class="opt-sub" data-show-if="seaAutoSell">
                <div class="opt-row">
                  <span>Bán khi giỏ có từ (con):</span>
                  <input type="number" data-key="seaSellThreshold" min="1" max="30" step="1">
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- TAB 4: THÀNH PHỐ (COMING SOON) -->
        <div class="tab-pane" id="pane-city">
          <div class="coming-soon-box">
            <div class="coming-soon-icon">🏙️🚧</div>
            <div class="coming-soon-title">Khu Vực Thành Phố & Hội Chợ</div>
            <div class="coming-soon-desc">
              Tính năng tự động cho Khu vực Thành Phố & Hội Chợ Xóm Vui đang được phát triển (Coming Soon) và sẽ cập nhật trong phiên bản tiếp theo!
            </div>
          </div>
        </div>
      </div>
    `;

    shadow.appendChild(style);
    shadow.appendChild(panel);

    els = {
      panel,
      dragHandle: shadow.getElementById('hudDragHandle'),
      btnMinimize: shadow.getElementById('btnMinimize'),
      btnHide: shadow.getElementById('btnHide'),
      btnHdrAutoAll: shadow.getElementById('btnHdrAutoAll'),
      btnHdrAutoTab: shadow.getElementById('btnHdrAutoTab'),
      btnAutoAll: shadow.getElementById('btnAutoAll'),
      btnAutoTab: shadow.getElementById('btnAutoTab'),
      rngTaskDelay: shadow.getElementById('rngTaskDelay'),
      lblTaskDelay: shadow.getElementById('lblTaskDelay'),
      btnToggleOrderDrawer: shadow.getElementById('btnToggleOrderDrawer'),
      orderDrawer: shadow.getElementById('orderDrawer'),
      areaOrderList: shadow.getElementById('areaOrderList'),
      inpFishingSwitchCount: shadow.getElementById('inpFishingSwitchCount'),
      farmSubCardsContainer: shadow.getElementById('farmSubCardsContainer'),
      statTime: shadow.getElementById('statTime'),
      statGold: shadow.getElementById('statGold'),
      statHunger: shadow.getElementById('statHunger'),
      statThirst: shadow.getElementById('statThirst'),
      statEnergy: shadow.getElementById('statEnergy'),
      statExtra: shadow.getElementById('statExtra'),
      statusAction: shadow.getElementById('statusAction'),
      tabs: Array.from(shadow.querySelectorAll('.tab-btn')),
      panes: {
        farm: shadow.getElementById('pane-farm'),
        benDo: shadow.getElementById('pane-benDo'),
        sea: shadow.getElementById('pane-sea'),
        city: shadow.getElementById('pane-city'),
      },
    };

    buildFarmSubCards();
    bindHudEvents(shadow);
    setupDraggableHud(panel, els.dragHandle);
    renderAll();
  }

  // Build the 8 Farm Sub-Area Cards in the user's custom drag-and-drop order
  function getFarmSubCardBodyHtml(subId) {
    switch (subId) {
      case 'house':
        return `
          <label class="opt-row">
            <span>💬 Tắt thông báo Điện thoại & Loa phường</span>
            <input type="checkbox" data-key="autoDismissInterrupts">
          </label>

          <label class="opt-row">
            <span>🍳 Tự nấu món ăn trong Bếp</span>
            <input type="checkbox" data-key="autoCook">
          </label>
          <div class="opt-sub" data-show-if="autoCook">
            <div class="opt-row">
              <span>Món ưu tiên nấu:</span>
              <select data-key="preferDish">
                <option value="auto">✨ Tự chọn món có sẵn nguyên liệu</option>
                <option value="comTam">🍛 Cơm tấm ốp la (No lâu)</option>
                <option value="eggBread">🥪 Bánh mì ốp la (Tốc độ)</option>
                <option value="radishSoup">🍲 Canh củ cải</option>
                <option value="carrotJuice">🧃 Nước ép cà rốt</option>
                <option value="grilledCorn">🌽 Bắp nướng mỡ hành</option>
                <option value="boiledEgg">🥚 Trứng luộc</option>
                <option value="cornCake">🥮 Bánh bắp nướng</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>🍲 Tự ăn khi Đói</span>
            <input type="checkbox" data-key="autoRecoverHunger">
          </label>
          <div class="opt-sub" data-show-if="autoRecoverHunger">
            <div class="opt-row">
              <span>Hồi khi Đói &lt; (%):</span>
              <input type="number" data-key="hungerThreshold" min="10" max="90" step="5">
            </div>
            <div class="opt-row">
              <span>Nguồn thức ăn:</span>
              <select data-key="foodSource">
                <option value="kitchen_first">🍲 Ưu tiên món Bếp, thiếu mua Tiệm bánh</option>
                <option value="kitchen_only">🏡 Chỉ ăn món nấu trong Bếp / Kho</option>
                <option value="shop_only">🥖 Chỉ mua đồ ăn Tiệm bánh</option>
              </select>
            </div>
            <div class="opt-row">
              <span>Món mua ở Tiệm bánh:</span>
              <select data-key="preferFoodShop">
                <option value="banhMiThit">🥖 Bánh mì thịt (15.000đ · +50 no)</option>
                <option value="banhMiCha">🐟 Bánh mì chả cá (15.000đ · +45 no)</option>
                <option value="banhMiTrung">🍳 Bánh mì trứng (10.000đ · +35 no)</option>
                <option value="banhBao">🥟 Bánh bao (8.000đ · +25 no)</option>
                <option value="banhMiFull">🤤 Bánh mì full topping (25.000đ · +80 no)</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>🥤 Tự uống khi Khát</span>
            <input type="checkbox" data-key="autoRecoverThirst">
          </label>
          <div class="opt-sub" data-show-if="autoRecoverThirst">
            <div class="opt-row">
              <span>Hồi khi Khát &lt; (%):</span>
              <input type="number" data-key="thirstThreshold" min="10" max="90" step="5">
            </div>
            <div class="opt-row">
              <span>Nguồn nước uống:</span>
              <select data-key="drinkSource">
                <option value="kitchen_first">🧃 Ưu tiên nước Bếp, thiếu mua Tiệm giải khát</option>
                <option value="shop_only">🥤 Chỉ mua nước tại Tiệm giải khát</option>
                <option value="both">✨ Linh hoạt cả Bếp & Tiệm</option>
              </select>
            </div>
            <div class="opt-row">
              <span>Loại nước ưu tiên ở Tiệm:</span>
              <select data-key="preferDrinkShop">
                <option value="nuocMia">🥤 Nước mía (8.000đ · +35 nước)</option>
                <option value="traDao">🍑 Trà đào cam sả (15.000đ · +50 nước)</option>
                <option value="traSua">🧋 Trà sữa trân châu (18.000đ · +40 nước)</option>
                <option value="caPheSua">☕ Cà phê sữa đá (12.000đ · +25 nước)</option>
                <option value="traDa">🧊 Trà đá vỉa hè (3.000đ · +20 nước)</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>☕ Tự uống Cà phê sáng (+50% tốc độ chạy)</span>
            <input type="checkbox" data-key="autoMorningCoffee">
          </label>

          <label class="opt-row">
            <span>🔋 Tự sạc điện cho Xe máy điện EV</span>
            <input type="checkbox" data-key="autoChargeVehicle">
          </label>
          <div class="opt-sub" data-show-if="autoChargeVehicle">
            <div class="opt-row">
              <span>Sạc khi Pin xe &lt; (%):</span>
              <input type="number" data-key="batteryThreshold" min="10" max="90" step="5">
            </div>
          </div>

          <label class="opt-row">
            <span>💆 Chị Linh Salon: Gội đầu dưỡng sinh (Buff thư giãn)</span>
            <input type="checkbox" data-key="autoSalonShampoo">
          </label>

          <label class="opt-row">
            <span>✨ Chị Linh Salon: Tắm trắng nâng tông khi đen da</span>
            <input type="checkbox" data-key="autoSalonWhiten">
          </label>

          <label class="opt-row">
            <span>🛏️ Tự đi ngủ qua ngày mới</span>
            <input type="checkbox" data-key="autoSleep">
          </label>
          <div class="opt-sub" data-show-if="autoSleep">
            <div class="opt-row">
              <span>Giờ đi ngủ buổi tối (h):</span>
              <input type="number" data-key="sleepHour" min="18" max="23" step="1">
            </div>
            <label class="opt-row">
              <span>🌙 Ngủ ngay khi hết câu được buổi tối</span>
              <input type="checkbox" data-key="sleepOnFishingLimit">
            </label>
          </div>
        `;

      case 'crops':
        return `
          <label class="opt-row">
            <span>🌾 Tự thu hoạch nông sản chín</span>
            <input type="checkbox" data-key="autoHarvest">
          </label>
          <label class="opt-row">
            <span>🐛 Tự mua thuốc & diệt sâu bệnh</span>
            <input type="checkbox" data-key="autoPesticide">
          </label>
          <label class="opt-row">
            <span>💧 Tự tưới nước giữ ẩm</span>
            <input type="checkbox" data-key="autoWater">
          </label>
          <label class="opt-row">
            <span>🧪 Tự mua & bón phân NPK</span>
            <input type="checkbox" data-key="autoFertilize">
          </label>

          <label class="opt-row">
            <span>🌱 Tự mua & gieo hạt giống mới</span>
            <input type="checkbox" data-key="autoPlant">
          </label>
          <div class="opt-sub" data-show-if="autoPlant">
            <div class="opt-row">
              <span>Hạt giống ưu tiên:</span>
              <select data-key="preferSeed">
                <option value="auto">✨ Tự chọn tối ưu</option>
                <option value="rice">🌾 Lúa (8 ngày)</option>
                <option value="corn">🌽 Bắp (6 ngày)</option>
                <option value="carrot">🥕 Cà rốt (4 ngày)</option>
                <option value="radish">大根 Củ cải (2 ngày)</option>
              </select>
            </div>
          </div>

          <label class="opt-row">
            <span>⛏️ Tự mua thêm ô đất ruộng khi mở bán</span>
            <input type="checkbox" data-key="autoBuyPlots">
          </label>
        `;

      case 'pet':
        return `
          <label class="opt-row">
            <span>🍖 Tự mua đồ ăn & cho Thú cưng ăn</span>
            <input type="checkbox" data-key="petAutoFeed">
          </label>
          <label class="opt-row">
            <span>💖 Tự vuốt ve tăng vui vẻ</span>
            <input type="checkbox" data-key="petAutoCuddle">
          </label>
          <label class="opt-row">
            <span>🧼 Tự tắm sạch cho Thú cưng</span>
            <input type="checkbox" data-key="petAutoBath">
          </label>
          <label class="opt-row">
            <span>🎾 Tự tập trò huấn luyện (+XP)</span>
            <input type="checkbox" data-key="petAutoTrick">
          </label>
        `;

      case 'barn':
        return `
          <label class="opt-row">
            <span>🐃 Tự cho Trâu ăn cỏ / rơm</span>
            <input type="checkbox" data-key="barnAutoFeedBuffalo">
          </label>
          <label class="opt-row">
            <span>🚿 Tự tắm mát cho Trâu</span>
            <input type="checkbox" data-key="barnAutoBathBuffalo">
          </label>
          <label class="opt-row">
            <span>🤝 Tự cho hàng xóm thuê Trâu cày (tăng vui & tiền)</span>
            <input type="checkbox" data-key="barnAutoLendBuffalo">
          </label>
          <label class="opt-row">
            <span>🐄 Tự cho đàn Bò sữa ăn cỏ</span>
            <input type="checkbox" data-key="barnAutoFeedCows">
          </label>
          <label class="opt-row">
            <span>💊 Tự mua thuốc & chữa bệnh cho Bò</span>
            <input type="checkbox" data-key="barnAutoCureCows">
          </label>
          <label class="opt-row">
            <span>🥛 Tự vắt sữa & bán sữa bò</span>
            <input type="checkbox" data-key="barnAutoSellMilk">
          </label>
          <label class="opt-row">
            <span>💸 Tự trả lương người phụ Chuồng</span>
            <input type="checkbox" data-key="barnAutoPayHelper">
          </label>
        `;

      case 'coop':
        return `
          <label class="opt-row">
            <span>🥚 Tự nhặt trứng gà mỗi ngày</span>
            <input type="checkbox" data-key="coopAutoCollectEggs">
          </label>
          <label class="opt-row">
            <span>🐤 Tự mua thêm Gà con khi chuồng trống</span>
            <input type="checkbox" data-key="coopAutoBuyChick">
          </label>
          <label class="opt-row">
            <span>💸 Tự trả lương người phụ Chuồng gà</span>
            <input type="checkbox" data-key="coopAutoPayHelper">
          </label>
        `;

      case 'pond':
        return `
          <label class="opt-row">
            <span>🐟 Tự kéo lưới thu hoạch cá trưởng thành</span>
            <input type="checkbox" data-key="pondAutoNet">
          </label>
          <label class="opt-row">
            <span>🍞 Tự rải cám cho cá ăn mỗi ngày</span>
            <input type="checkbox" data-key="pondAutoFeed">
          </label>
          <label class="opt-row">
            <span>🐟 Tự thả cá giống mới khi ao trống</span>
            <input type="checkbox" data-key="pondAutoStock">
          </label>
          <div class="opt-sub" data-show-if="pondAutoStock">
            <div class="opt-row">
              <span>Loại cá giống thả:</span>
              <select data-key="preferPondFish">
                <option value="chep">🐟 Cá chép (Lời cao)</option>
                <option value="tre">🐟 Cá trê</option>
                <option value="ro">🐟 Cá rô</option>
              </select>
            </div>
          </div>
          <label class="opt-row">
            <span>💸 Tự trả lương người phụ Ao cá</span>
            <input type="checkbox" data-key="pondAutoPayHelper">
          </label>
        `;

      case 'market':
        return `
          <label class="opt-row">
            <span>📦 Tự giao đơn hàng Tạp hóa Chị Na</span>
            <input type="checkbox" data-key="autoDeliverOrder">
          </label>
          <label class="opt-row">
            <span>📋 Tự giao đơn Bảng tin làng</span>
            <input type="checkbox" data-key="autoVillageBoard">
          </label>
          <label class="opt-row">
            <span>🔥 Tự bán Nông sản Trend (x2 giá, bán đúng quota)</span>
            <input type="checkbox" data-key="autoSellTrend">
          </label>
          <label class="opt-row">
            <span>📜 Tự bán nông sản để hoàn thành Việc Sổ tay</span>
            <input type="checkbox" data-key="autoSellDailyTask">
          </label>
          <label class="opt-row">
            <span>🏪 Tự bán nông sản dư thừa trong kho</span>
            <input type="checkbox" data-key="autoSellProduce">
          </label>
          <div class="opt-sub" data-show-if="autoSellProduce">
            <div class="opt-row">
              <span>Số lượng nông sản tối thiểu giữ lại:</span>
              <input type="number" data-key="surplusKeepQty" min="5" max="200" step="5">
            </div>
          </div>

          <label class="opt-row">
            <span>🪙 Tự mua vàng đầu tư tại Cô Kim Tiệm Vàng</span>
            <input type="checkbox" data-key="goldAutoBuy">
          </label>
          <div class="opt-sub" data-show-if="goldAutoBuy">
            <div class="opt-row">
              <span>Loại vàng ưu tiên:</span>
              <select data-key="goldPreferType">
                <option value="mieng">🟨 Vàng miếng 9999 (Chênh thấp, giữ lâu)</option>
                <option value="nhan">💍 Nhẫn trơn 9999 (Ổn định nhất)</option>
                <option value="k18">📿 Vàng 18K (Trang sức)</option>
                <option value="non">🪙 Vàng non 10K (Lướt sóng)</option>
              </select>
            </div>
            <div class="opt-row">
              <span>Tiền mặt tối thiểu giữ lại:</span>
              <input type="number" data-key="goldKeepCash" min="100000" max="10000000" step="100000">
            </div>
          </div>

          <label class="opt-row">
            <span>📈 Tự bán vàng Cô Kim khi có lãi chốt lời</span>
            <input type="checkbox" data-key="goldAutoSell">
          </label>
          <div class="opt-sub" data-show-if="goldAutoSell">
            <div class="opt-row">
              <span>Chốt lời khi lãi đạt &gt;= (%):</span>
              <input type="number" data-key="goldProfitPercent" min="3" max="50" step="1">
            </div>
          </div>
        `;

      case 'dibay':
        return `
          <label class="opt-row">
            <span>🎁 Tự nhận thưởng Việc hôm nay & Sổ tay</span>
            <input type="checkbox" data-key="autoClaimQuests">
          </label>
          <label class="opt-row">
            <span>📜 Tự làm chuỗi hướng dẫn Ngày 1 & 2 (thắp nhang, rau mầm...)</span>
            <input type="checkbox" data-key="autoFirstDayTasks">
          </label>
          <label class="opt-row">
            <span>📔 Tự thu thập trang Sổ tay Ông Năm & ngâm giống Lúa</span>
            <input type="checkbox" data-key="autoNotebookPages">
          </label>
          <label class="opt-row">
            <span>🪙 Tự bỏ tiền vào Heo đất mỗi ngày</span>
            <input type="checkbox" data-key="autoFeedPiggy">
          </label>
          <label class="opt-row">
            <span>🔨 Tự đập Heo đất khi no (đủ 7 ngày streak)</span>
            <input type="checkbox" data-key="autoBreakPiggy">
          </label>
          <label class="opt-row">
            <span>🛒 Tự mua Heo đất mới khi chuồng trống</span>
            <input type="checkbox" data-key="autoNewPiggy">
          </label>
          <label class="opt-row">
            <span>🏦 Tự gửi Sổ tiết kiệm Dì Bảy</span>
            <input type="checkbox" data-key="autoSavings">
          </label>
          <div class="opt-sub" data-show-if="autoSavings">
            <div class="opt-row">
              <span>Giữ lại tiền mặt tối thiểu:</span>
              <input type="number" data-key="savingsKeepGold" min="50000" max="5000000" step="50000">
            </div>
          </div>
        `;

      default:
        return '';
    }
  }

  let dragSubId = null;

  function buildFarmSubCards() {
    const container = els.farmSubCardsContainer;
    if (!container) return;
    container.innerHTML = '';

    config.farmSubOrder.forEach((subId, index) => {
      const meta = SUBAREA_META[subId];
      if (!meta) return;

      const enabled = config.farmSubEnabled[subId] !== false;
      const collapsed = Boolean(config.farmSubCollapsed[subId]);

      const card = document.createElement('div');
      card.className = `sub-card${!enabled ? ' disabled-card' : ''}${collapsed ? ' collapsed' : ''}`;
      card.dataset.subId = subId;
      card.draggable = true;

      card.innerHTML = `
        <div class="sub-card-head">
          <div class="sub-card-head-left">
            <span class="drag-handle" title="Kéo thả để đổi thứ tự">⠿</span>
            <span class="order-idx">#${index + 1}</span>
            <span>${meta.icon} ${meta.name}</span>
          </div>
          <div class="sub-card-head-right">
            <button type="button" class="mini-move-btn" data-move="up" title="Đưa lên trên">▲</button>
            <button type="button" class="mini-move-btn" data-move="down" title="Đưa xuống dưới">▼</button>
            <input type="checkbox" class="sub-enable-chk" ${enabled ? 'checked' : ''} title="Bật / Tắt khu vực con này">
          </div>
        </div>
        <div class="sub-card-body">
          ${getFarmSubCardBodyHtml(subId)}
        </div>
      `;

      // Collapse/expand when clicking header (except buttons/checkbox)
      const head = card.querySelector('.sub-card-head');
      head.addEventListener('click', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        config.farmSubCollapsed[subId] = !config.farmSubCollapsed[subId];
        saveConfig();
      });

      // Enable/disable toggle for this sub-area
      const chk = card.querySelector('.sub-enable-chk');
      chk.addEventListener('change', () => {
        config.farmSubEnabled[subId] = chk.checked;
        if (chk.checked) config.farmSubCollapsed[subId] = false;
        saveConfig();
      });

      // Up/Down buttons
      card.querySelectorAll('.mini-move-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dir = btn.dataset.move;
          const idx = config.farmSubOrder.indexOf(subId);
          if (idx < 0) return;
          const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= config.farmSubOrder.length) return;
          const arr = [...config.farmSubOrder];
          [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
          config.farmSubOrder = arr;
          buildFarmSubCards();
          bindDataKeyInputs(els.farmSubCardsContainer);
          saveConfig();
        });
      });

      // HTML5 Drag & Drop for sub-area cards
      card.addEventListener('dragstart', (e) => {
        dragSubId = subId;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        dragSubId = null;
        card.classList.remove('dragging');
      });
      card.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      });
      card.addEventListener('drop', (e) => {
        e.preventDefault();
        if (!dragSubId || dragSubId === subId) return;
        const arr = [...config.farmSubOrder];
        const fromIdx = arr.indexOf(dragSubId);
        const toIdx = arr.indexOf(subId);
        if (fromIdx < 0 || toIdx < 0) return;
        arr.splice(fromIdx, 1);
        arr.splice(toIdx, 0, dragSubId);
        config.farmSubOrder = arr;
        buildFarmSubCards();
        bindDataKeyInputs(els.farmSubCardsContainer);
        saveConfig();
      });

      container.appendChild(card);
    });

    bindDataKeyInputs(container);
  }

  let dragAreaId = null;

  function renderAreaOrderList() {
    const list = els.areaOrderList;
    if (!list) return;
    list.innerHTML = '';

    config.areaOrder.forEach((areaId, index) => {
      const meta = AREA_META[areaId];
      if (!meta || areaId === 'city') return;
      const enabled = config.areaEnabled[areaId] !== false;

      const item = document.createElement('div');
      item.className = `area-order-item${!enabled ? ' disabled-area' : ''}`;
      item.draggable = true;
      item.dataset.areaId = areaId;

      item.innerHTML = `
        <div class="area-order-left">
          <span class="drag-handle" title="Kéo thả để đổi thứ tự">⠿</span>
          <span class="order-idx">#${index + 1}</span>
          <span class="area-name-link" style="cursor:pointer;">${meta.icon} ${meta.name}</span>
        </div>
        <div class="area-order-right">
          <button type="button" class="mini-move-btn" data-move="up" title="Lên">▲</button>
          <button type="button" class="mini-move-btn" data-move="down" title="Xuống">▼</button>
          <input type="checkbox" class="area-enable-chk" ${enabled ? 'checked' : ''} title="Bật / Tắt khu vực này khi Auto Tất Cả">
        </div>
      `;

      item.querySelector('.area-name-link').addEventListener('click', () => {
        config.activeTab = areaId;
        saveConfig();
      });

      const chk = item.querySelector('.area-enable-chk');
      chk.addEventListener('change', () => {
        config.areaEnabled[areaId] = chk.checked;
        saveConfig();
      });

      item.querySelectorAll('.mini-move-btn').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const dir = btn.dataset.move;
          const idx = config.areaOrder.indexOf(areaId);
          if (idx < 0) return;
          const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
          if (targetIdx < 0 || targetIdx >= config.areaOrder.length) return;
          const arr = [...config.areaOrder];
          [arr[idx], arr[targetIdx]] = [arr[targetIdx], arr[idx]];
          config.areaOrder = arr;
          saveConfig();
        });
      });

      item.addEventListener('dragstart', (e) => {
        dragAreaId = areaId;
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      item.addEventListener('dragend', () => {
        dragAreaId = null;
        item.classList.remove('dragging');
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
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

  function bindDataKeyInputs(rootEl) {
    rootEl.querySelectorAll('[data-key]').forEach((el) => {
      if (el.dataset.bound === '1') return;
      el.dataset.bound = '1';
      const key = el.dataset.key;
      el.addEventListener('change', () => {
        if (el.type === 'checkbox') {
          config[key] = el.checked;
        } else if (el.type === 'number' || el.type === 'range') {
          config[key] = Number(el.value);
        } else {
          config[key] = el.value;
        }
        saveConfig();
      });
    });
  }

  function bindHudEvents(shadow) {
    // Tabs
    els.tabs.forEach((btn) => {
      btn.addEventListener('click', () => {
        config.activeTab = btn.dataset.tab;
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

    // Dual Auto Buttons: "Auto Tất Cả" vs "Auto Tab Này"
    if (els.btnHdrAutoAll) {
      els.btnHdrAutoAll.addEventListener('click', () => {
        els.btnAutoAll.click();
      });
    }

    if (els.btnHdrAutoTab) {
      els.btnHdrAutoTab.addEventListener('click', () => {
        els.btnAutoTab.click();
      });
    }

    els.btnAutoAll.addEventListener('click', () => {
      if (config.running && config.runMode === 'all') {
        config.running = false;
        setStatus('⏸️ Đã dừng Auto Tất Cả');
      } else {
        config.running = true;
        config.runMode = 'all';
        lockedTabArea = null;
        currentAreaIdx = 0;
        areaCatchesCount = 0;
        setStatus('▶️ Bắt đầu chạy Auto Tất Cả theo thứ tự...');
      }
      saveConfig();
    });

    els.btnAutoTab.addEventListener('click', () => {
      if (config.running && config.runMode === 'tab') {
        config.running = false;
        lockedTabArea = null;
        setStatus('⏸️ Đã dừng Auto Tab');
      } else {
        config.running = true;
        config.runMode = 'tab';
        lockedTabArea = config.activeTab;
        areaCatchesCount = 0;
        const areaName = AREA_META[lockedTabArea]?.name || lockedTabArea;
        setStatus(`🎯 Bắt đầu chỉ Auto trong Tab: ${areaName}`);
      }
      saveConfig();
    });

    // Task Delay Slider
    els.rngTaskDelay.addEventListener('input', () => {
      els.lblTaskDelay.textContent = `${els.rngTaskDelay.value}ms`;
    });
    els.rngTaskDelay.addEventListener('change', () => {
      config.taskDelayMs = Number(els.rngTaskDelay.value) || 650;
      saveConfig();
    });

    // Toggle Area Order Drawer
    els.btnToggleOrderDrawer.addEventListener('click', () => {
      config.showOrderDrawer = !config.showOrderDrawer;
      saveConfig();
    });

    // Fishing Switch Count
    els.inpFishingSwitchCount.addEventListener('change', () => {
      config.fishingSwitchCount = Math.max(1, Number(els.inpFishingSwitchCount.value) || 15);
      saveConfig();
    });

    // Area enable checkboxes inside each Tab banner
    ['farm', 'benDo', 'sea'].forEach((areaId) => {
      const chk = shadow.getElementById(`chkArea_${areaId}`);
      if (chk) {
        chk.addEventListener('change', () => {
          config.areaEnabled[areaId] = chk.checked;
          saveConfig();
        });
      }
    });

    bindDataKeyInputs(shadow);
  }

  function setupDraggableHud(panel, handle) {
    let dragging = false;
    let startX = 0;
    let startY = 0;
    let initLeft = 0;
    let initTop = 0;

    handle.addEventListener('mousedown', (e) => {
      if (e.target.closest('button')) return;
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

  function renderAll() {
    if (!hudRoot || !els.panel) return;

    els.panel.classList.toggle('hidden', !config.panelVisible);
    els.panel.classList.toggle('minimized', Boolean(config.panelMinimized));

    // Dual Auto Buttons state
    const isAllActive = config.running && config.runMode === 'all';
    const isTabActive = config.running && config.runMode === 'tab';
    const lockedAreaName = AREA_META[lockedTabArea]?.name || lockedTabArea || 'Tab Này';
    const activeAreaName = AREA_META[config.activeTab]?.name || 'Tab Này';

    els.btnAutoAll.classList.toggle('active', isAllActive);
    els.btnAutoAll.textContent = isAllActive ? '⏹️ DỪNG TẤT CẢ' : '▶️ AUTO TẤT CẢ';

    els.btnAutoTab.classList.toggle('active', isTabActive);
    els.btnAutoTab.textContent = isTabActive ? `⏹️ DỪNG (${lockedAreaName.toUpperCase()})` : `🎯 AUTO ${activeAreaName.toUpperCase()}`;

    if (els.btnHdrAutoAll) {
      els.btnHdrAutoAll.classList.toggle('active', isAllActive);
      els.btnHdrAutoAll.textContent = isAllActive ? '⏹️ Dừng' : '▶️ Tất cả';
    }
    if (els.btnHdrAutoTab) {
      els.btnHdrAutoTab.classList.toggle('active', isTabActive);
      els.btnHdrAutoTab.textContent = isTabActive ? `⏹️ ${lockedAreaName}` : `🎯 ${activeAreaName}`;
    }

    // Task Delay & Order Drawer
    els.rngTaskDelay.value = config.taskDelayMs || 650;
    els.lblTaskDelay.textContent = `${config.taskDelayMs || 650}ms`;
    els.orderDrawer.classList.toggle('collapsed', !config.showOrderDrawer);
    els.inpFishingSwitchCount.value = config.fishingSwitchCount || 15;

    renderAreaOrderList();

    // Tabs & Dots
    els.tabs.forEach((btn) => {
      const t = btn.dataset.tab;
      btn.classList.toggle('active', t === config.activeTab);
    });
    Object.entries(els.panes).forEach(([k, pane]) => {
      if (pane) pane.classList.toggle('active', k === config.activeTab);
    });

    ['farm', 'benDo', 'sea'].forEach((areaId) => {
      const enabled = config.areaEnabled[areaId] !== false;
      const dot = hudRoot.getElementById(`dotArea_${areaId}`);
      if (dot) dot.classList.toggle('off', !enabled);
      const chk = hudRoot.getElementById(`chkArea_${areaId}`);
      if (chk) chk.checked = enabled;
      const banner = hudRoot.getElementById(`bannerArea_${areaId}`);
      if (banner) banner.classList.toggle('off', !enabled);
    });

    // Update Farm Sub-Card headers & states without losing focus
    const existingCards = Array.from(els.farmSubCardsContainer.querySelectorAll('.sub-card'));
    const currentDomOrder = existingCards.map((c) => c.dataset.subId).join(',');
    if (currentDomOrder !== config.farmSubOrder.join(',')) {
      buildFarmSubCards();
    } else {
      existingCards.forEach((card, idx) => {
        const subId = card.dataset.subId;
        const enabled = config.farmSubEnabled[subId] !== false;
        const collapsed = Boolean(config.farmSubCollapsed[subId]);
        card.classList.toggle('disabled-card', !enabled);
        card.classList.toggle('collapsed', collapsed);
        const idxBadge = card.querySelector('.order-idx');
        if (idxBadge) idxBadge.textContent = `#${idx + 1}`;
        const chk = card.querySelector('.sub-enable-chk');
        if (chk) chk.checked = enabled;
      });
    }

    // Sync all data-key inputs
    hudRoot.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.dataset.key;
      if (!(key in config)) return;
      if (el.type === 'checkbox') {
        el.checked = Boolean(config[key]);
      } else if (document.activeElement !== el) {
        el.value = config[key];
      }
    });

    // Progressive Disclosure: Toggle visibility of [data-show-if] blocks
    hudRoot.querySelectorAll('[data-show-if]').forEach((subBlock) => {
      const parentKey = subBlock.dataset.showIf;
      const shouldShow = Boolean(config[parentKey]);
      subBlock.classList.toggle('hidden', !shouldShow);
    });
  }

  function updateHeaderStats(snap) {
    if (!els.statTime || !snap) return;
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
      const screenNames = {
        playing: '🌾 Nông trại',
        worldmap: '🗺️ Bản đồ',
        sea: '🏖️ Biển',
        benDo: '🛶 Bến đò',
        city: '🏙️ Thành phố',
      };
      els.statExtra.textContent = screenNames[snap.screen] || `📍 ${snap.screen || '--'}`;
    }
  }

  // Keyboard shortcuts & Extension Popup messages
  window.addEventListener('keydown', (e) => {
    if (e.altKey && e.code === 'KeyA') {
      e.preventDefault();
      config.running = !config.running;
      setStatus(config.running ? '▶️ Đã bật Auto (Alt+A)' : '⏸️ Đã tạm dừng Auto (Alt+A)');
      saveConfig();
    } else if (e.altKey && e.code === 'KeyP') {
      e.preventDefault();
      config.panelVisible = !config.panelVisible;
      saveConfig();
    }
  });

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'TOGGLE_AUTO') {
      config.running = !config.running;
      saveConfig();
      sendResponse({ ok: true, running: config.running });
    } else if (msg.type === 'TOGGLE_PANEL') {
      config.panelVisible = !config.panelVisible;
      saveConfig();
      sendResponse({ ok: true, panelVisible: config.panelVisible });
    } else if (msg.type === 'GET_STATUS') {
      sendResponse({ ok: true, config, lastActionText, snap: lastGameSnap });
    }
    return true;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.autoConfig?.newValue) {
      config = mergeConfig(changes.autoConfig.newValue);
      renderAll();
    }
  });

  // Boot
  function init() {
    createHud();
    loadConfig();
    setInterval(tickAuto, 200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
