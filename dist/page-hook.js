"use strict";
(() => {
  // src/page-hook/core/engine-access.ts
  var stores = {
    main: null,
    sea: null,
    benUI: null,
    benNet: null
  };
  function getMainStore() {
    if (!stores.main) discoverStores();
    return stores.main;
  }
  function getMainState() {
    const s = getMainStore();
    return s ? s.getState() : {};
  }
  function setMainState(partial) {
    const s = getMainStore();
    if (s) s.setState(partial);
  }
  var phaserGame = null;
  var benWs = null;
  var lastXinMoiAt = 0;
  var lastXinMoiDay = -1;
  function setLastXinMoi(at, day) {
    lastXinMoiAt = at;
    lastXinMoiDay = day;
  }
  try {
    const origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function(...args) {
      try {
        const socket = this;
        if (socket && typeof socket.url === "string" && socket.url.includes("/ws/ben-do")) {
          benWs = socket;
          window.__ntg_benWs = socket;
        }
      } catch {
      }
      return origSend.apply(this, args);
    };
  } catch {
  }
  function sendBenWs(obj) {
    if (!benWs || benWs.readyState !== WebSocket.OPEN) {
      try {
        const sc = getActiveScene("BenDoScene");
        if (sc && typeof sc.announce === "function") {
          sc.announce();
        }
      } catch {
      }
    }
    if (benWs && benWs.readyState === WebSocket.OPEN) {
      benWs.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }
  function hookPhaserGame() {
    if (phaserGame && phaserGame.scene) return phaserGame;
    const win = window;
    const cachedGame = win.__ntg_phaserGame;
    if (cachedGame && cachedGame.scene) {
      phaserGame = cachedGame;
      return phaserGame;
    }
    try {
      const origPush = Array.prototype.push;
      let restored = false;
      const restore = () => {
        if (!restored) {
          restored = true;
          Array.prototype.push = origPush;
        }
      };
      Array.prototype.push = function(...items) {
        try {
          const first = items[0];
          if (first && typeof first === "object" && first.sys && first.sys.game && first.sys.game.scene) {
            phaserGame = first.sys.game;
            win.__ntg_phaserGame = phaserGame;
            restore();
          }
        } catch {
        }
        return origPush.apply(this, items);
      };
      setTimeout(restore, 1500);
    } catch {
    }
    return phaserGame;
  }
  hookPhaserGame();
  function getActiveScene(key) {
    const game = hookPhaserGame();
    if (!game || !game.scene || typeof game.scene.getScene !== "function") return null;
    try {
      const sc = game.scene.getScene(key);
      if (sc && sc.sys && sc.sys.isActive()) return sc;
      return sc || null;
    } catch {
      return null;
    }
  }
  function classifyStore(candidate) {
    if (!candidate || typeof candidate !== "object") return;
    const store = candidate;
    if (typeof store.getState !== "function" || typeof store.setState !== "function") {
      return;
    }
    let st;
    try {
      st = store.getState();
    } catch {
      return;
    }
    if (!st || typeof st !== "object") return;
    if ("plots" in st && "fullness" in st && "applyTool" in st && "cook" in st) {
      stores.main = store;
    } else if ("phase" in st && "spot" in st && "float" in st && "landed" in st && !("status" in st)) {
      stores.sea = store;
    } else if ("teaStand" in st && "closetSlot" in st && "spot" in st) {
      stores.benUI = store;
    } else if ("status" in st && "fishing" in st && "wallet" in st && "basket" in st) {
      stores.benNet = store;
    }
  }
  function discoverStores() {
    const roots = [
      document.getElementById("root"),
      document.querySelector(".app"),
      document.querySelector(".ui-layer"),
      document.querySelector(".sea-controls"),
      document.querySelector(".ben-screen"),
      document.querySelector(".ben-fish-side")
    ].filter(Boolean);
    const visited = /* @__PURE__ */ new Set();
    const queue = [];
    for (const el of roots) {
      const elRecord = el;
      for (const k of Object.keys(el)) {
        if (k.startsWith("__reactContainer$") || k.startsWith("__reactFiber$")) {
          const val = elRecord[k];
          if (val) queue.push(val);
        }
      }
    }
    let steps = 0;
    while (queue.length > 0 && steps < 6e3) {
      const fiber = queue.shift();
      if (!fiber || visited.has(fiber)) continue;
      visited.add(fiber);
      steps++;
      let hook = fiber.memoizedState;
      let hSteps = 0;
      while (hook && hSteps < 60) {
        hSteps++;
        const ms = hook.memoizedState;
        if (Array.isArray(ms) && ms.length === 2 && Array.isArray(ms[1])) {
          for (const dep of ms[1]) classifyStore(dep);
        }
        if (ms && typeof ms === "object") {
          classifyStore(ms);
          const msObj = ms;
          if (msObj.store) classifyStore(msObj.store);
        }
        hook = hook.next;
      }
      if (fiber.child) queue.push(fiber.child);
      if (fiber.sibling) queue.push(fiber.sibling);
      if (fiber.return && steps < 250) queue.push(fiber.return);
    }
    window.__ntg_stores = stores;
    return stores;
  }

  // src/page-hook/core/store-watcher.ts
  var _TREND_CROPS = ["radish", "carrot", "corn", "rice"];
  function _tt(e) {
    let t = e + 2135587861 | 0;
    t = Math.imul(t ^ t >>> 16, 73244475);
    t = Math.imul(t ^ t >>> 16, 73244475);
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  }
  function _nt(n, t) {
    const arr = n >= 2 ? [..._TREND_CROPS, "egg"] : [..._TREND_CROPS];
    const r = arr[Math.floor(_tt(n * 3 + 1) * arr.length)];
    return { goods: r, start: t, end: t + 2 };
  }
  function _rt(day) {
    let t = 9;
    for (let n = 0; ; n++) {
      if (t + 2 >= day) return _nt(n, t);
      t += 7 + Math.floor(_tt(n * 3) * 4);
    }
  }
  function getActiveTrend(day) {
    const t = _rt(day);
    return t.start <= day ? t : null;
  }
  function getTrendQuota(goods, day, plotCount, trendLog) {
    const t = getActiveTrend(day);
    if (!t || t.goods !== goods) return 0;
    const maxQuota = 4 + Math.floor(plotCount / 4);
    const sold = trendLog && trendLog.soldDay === day ? trendLog.sold || 0 : 0;
    return Math.max(0, maxQuota - sold);
  }
  function computeBenStamina(wallet) {
    if (!wallet) return 0;
    if (!wallet.staminaNext || typeof wallet.at !== "number") return wallet.stamina ?? 0;
    const elapsed = performance.now() - wallet.at;
    if (elapsed < wallet.staminaNext) return wallet.stamina ?? 0;
    return Math.min(100, (wallet.stamina ?? 0) + 1 + Math.floor((elapsed - wallet.staminaNext) / 18e4));
  }
  function getSnapshot() {
    if (!stores.main || !stores.sea || !stores.benUI || !stores.benNet) {
      discoverStores();
    }
    hookPhaserGame();
    const m = stores.main ? stores.main.getState() : null;
    const s = stores.sea ? stores.sea.getState() : null;
    const bu = stores.benUI ? stores.benUI.getState() : null;
    const bn = stores.benNet ? stores.benNet.getState() : null;
    if (!m) return { ok: false };
    const benWallet = bn?.wallet ? {
      ...bn.wallet,
      liveStamina: computeBenStamina(bn.wallet)
    } : null;
    const benNonKeptCount = Array.isArray(bn?.basket) ? bn.basket.filter((x) => !x.kept).length : 0;
    return {
      ok: true,
      hasPhaser: Boolean(phaserGame),
      hasBenWs: Boolean(benWs && benWs.readyState === WebSocket.OPEN),
      screen: m.screen,
      day: m.day,
      minutes: m.minutes,
      gold: m.gold,
      fullness: m.fullness,
      hydration: m.hydration,
      energy: benWallet ? benWallet.liveStamina : m.battery || 0,
      battery: m.battery,
      vehicle: m.vehicle,
      onFoot: m.onFoot,
      indoors: m.indoors,
      sleeping: m.sleeping,
      panel: m.panel,
      shop: m.shop,
      phone: m.phone,
      announcement: m.announcement,
      call: m.call,
      tip: m.tip,
      plots: m.plots,
      seeds: m.seeds,
      items: m.items,
      produce: m.produce,
      eggs: m.eggs,
      nestEggs: m.nestEggs,
      hens: m.hens,
      coopLevel: m.coopLevel,
      kitchen: m.kitchen,
      pets: m.pets,
      pond: m.pond,
      buffalo: m.buffalo,
      dairy: m.dairy,
      helpers: m.helpers,
      order: m.order,
      village: m.village,
      savings: m.savings,
      daily: m.daily,
      goalIndex: m.goalIndex,
      firstDay: m.firstDay,
      notebook: m.notebook,
      fishing: m.fishing,
      unlockedZones: m.unlockedZones,
      salonOpen: m.salonOpen,
      trendLog: m.trendLog,
      trend: (() => {
        const day = m.day || 0;
        const tr = getActiveTrend(day);
        if (!tr) return null;
        const quota = getTrendQuota(tr.goods, day, Object.keys(m.plots || {}).length, m.trendLog);
        return { goods: tr.goods, start: tr.start, end: tr.end, quota };
      })(),
      sea: s ? {
        spot: s.spot,
        walking: s.walking,
        phase: s.phase,
        panel: s.panel
      } : null,
      benUI: bu ? {
        spot: bu.spot,
        walking: bu.walking,
        panel: bu.panel
      } : null,
      benNet: bn ? {
        status: bn.status,
        fishing: bn.fishing,
        fight: bn.fight,
        wallet: benWallet,
        basketCount: benNonKeptCount,
        totalBasket: Array.isArray(bn.basket) ? bn.basket.length : 0,
        pack: bn.pack || {},
        landed: bn.landed,
        notice: bn.notice
      } : null
    };
  }

  // src/page-hook/core/interrupts.ts
  function dismissInterruptsIfNeeded(cfg) {
    const m = stores.main?.getState();
    if (!m) return null;
    if (cfg && cfg.autoDismissInterrupts === false) return null;
    if (m.phone) {
      m.closePhone?.();
      return { acted: true, msg: "\u{1F4F1} \u0110\xE3 \u0111\xF3ng th\xF4ng b\xE1o \u0111i\u1EC7n tho\u1EA1i" };
    }
    if (m.announcement) {
      m.answerAnnouncement?.(false);
      return { acted: true, msg: "\u{1F4E2} \u0110\xE3 t\u1EAFt th\xF4ng b\xE1o Loa ph\u01B0\u1EDDng" };
    }
    if (m.tip) {
      m.answerTip?.(false);
      return { acted: true, msg: "\u{1F4A1} \u0110\xE3 \u0111\xF3ng h\u01B0\u1EDBng d\u1EABn nhanh" };
    }
    if (m.call) {
      if (m.call.stage === "ringing") {
        m.acceptCall?.();
      }
      const stAfter = stores.main?.getState();
      if (stAfter?.call) {
        if (stAfter.call.from === "noi") {
          stAfter.hangUpGrandma?.("bye");
          return { acted: true, msg: "\u{1F475} \u0110\xE3 nghe \u0111i\u1EC7n tho\u1EA1i B\xE0 N\u1ED9i & nh\u1EADn qu\xE0" };
        }
        if (stAfter.call.from === "sau" && stAfter.call.topic === "sea") {
          stAfter.openSea?.();
          stAfter.endCall?.("ok");
          return { acted: true, msg: "\u{1F4DE} \u0110\xE3 nghe \u0111i\u1EC7n \xD4ng S\xE1u m\u1EDF \u0111\u01B0\u1EDDng ra Bi\u1EC3n" };
        }
        if (stAfter.call.from === "sau" && !stAfter.uncleBa?.met) {
          stAfter.answerSau?.(false);
        }
        stAfter.endCall?.("ok");
        return { acted: true, msg: "\u{1F4DE} \u0110\xE3 nghe xong cu\u1ED9c g\u1ECDi \u0111i\u1EC7n tho\u1EA1i" };
      }
    }
    if (m.panel === "chapterOne") {
      m.finishChapterOne?.();
      return { acted: true, msg: "\u{1F4D6} \u0110\xE3 x\xE1c nh\u1EADn qua Ch\u01B0\u01A1ng 1" };
    }
    if (m.panel === "chapterEnd") {
      m.finishChapter?.();
      return { acted: true, msg: "\u{1F4D6} \u0110\xE3 ho\xE0n th\xE0nh ch\u01B0\u01A1ng S\u1ED5 tay \xD4ng N\u0103m" };
    }
    if (m.panel === "notebook") {
      m.setPanel?.(null);
      return { acted: true, msg: "\u{1F4D4} \u0110\xE3 \u0111\xF3ng trang S\u1ED5 tay \xD4ng N\u0103m" };
    }
    if (m.pond?.news) m.ackPondNews?.();
    if (m.buffalo?.news) m.ackBuffaloNews?.();
    if (m.dairy?.news) m.ackDairyNews?.();
    if (m.henNews) m.ackHenNews?.();
    if (m.pets?.news) m.ackPetNews?.();
    if (m.missedOrder) m.ackMissedOrder?.();
    return null;
  }

  // src/page-hook/core/cooldown.ts
  var actionCooldowns = /* @__PURE__ */ new Map();
  function canAct(key, cooldownMs = 3500) {
    const last = actionCooldowns.get(key) || 0;
    return Date.now() - last >= cooldownMs;
  }
  function markActed(key) {
    actionCooldowns.set(key, Date.now());
  }

  // src/page-hook/modules/farm/house.ts
  function handleHouseSubArea(cfg) {
    const m = getMainState();
    if (!m) return { acted: false };
    if (cfg.autoCook) {
      const dishNames = {
        comTam: "C\u01A1m t\u1EA5m",
        eggBread: "B\xE1nh m\xEC tr\u1EE9ng",
        radishSoup: "Canh c\u1EE7 c\u1EA3i",
        carrotJuice: "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t",
        grilledCorn: "B\u1EAFp n\u01B0\u1EDBng",
        boiledEgg: "Tr\u1EE9ng lu\u1ED9c",
        cornCake: "B\xE1nh b\u1EAFp"
      };
      const learnList = ["grilledCorn", "carrotJuice", "eggBread", "comTam", "cornCake"];
      for (const rId of learnList) {
        if (!m.kitchen?.known?.includes(rId) && m.learnRecipe?.(rId) === "ok") {
          return { acted: true, msg: `\u{1F4D6} \u0110\xE3 h\u1ECDc c\xF4ng th\u1EE9c n\u1EA5u m\xF3n ${dishNames[rId] || rId}` };
        }
      }
      const priorityDish = cfg.preferDish || "auto";
      const cookList = priorityDish !== "auto" ? [priorityDish] : ["comTam", "eggBread", "radishSoup", "carrotJuice", "grilledCorn", "boiledEgg"];
      const recipeCost = {
        boiledEgg: { egg: 1 },
        grilledCorn: { crop: "corn", qty: 1 },
        carrotJuice: { crop: "carrot", qty: 2 },
        radishSoup: { crop: "radish", qty: 2 },
        eggBread: { egg: 1, crop: "radish", qty: 1 },
        cornCake: { crop: "corn", qty: 2, egg: 1 },
        comTam: { crop: "rice", qty: 1, egg: 1 }
      };
      for (const rId of cookList) {
        const cost = recipeCost[rId];
        if (!cost) continue;
        const curStock = m.kitchen?.stock?.[rId] || 0;
        if (curStock >= 5) continue;
        let canCook = true;
        if (cost.egg) {
          const haveEggs = (m.eggs || 0) + (m.produce?.egg || 0);
          if (haveEggs < cost.egg) canCook = false;
        }
        if (cost.crop && cost.qty) {
          const haveCrop = m.produce?.[cost.crop] || 0;
          if (haveCrop < cost.qty) canCook = false;
        }
        if (canCook && m.cook?.(rId) === "ok") {
          return { acted: true, msg: `\u{1F373} \u0110\xE3 n\u1EA5u th\xE0nh c\xF4ng m\xF3n ${dishNames[rId] || rId} trong B\u1EBFp` };
        }
      }
    }
    const hungerTh = Number(cfg.hungerThreshold) || 45;
    if (cfg.autoRecoverHunger !== false && (m.fullness || 0) < hungerTh && canAct("recover_hunger", 3500)) {
      const curM = getMainState();
      if (cfg.foodSource !== "shop_only") {
        const eatOrder = cfg.preferDish && cfg.preferDish !== "auto" ? [cfg.preferDish, "comTam", "eggBread", "radishSoup", "grilledCorn", "boiledEgg"] : ["comTam", "eggBread", "radishSoup", "grilledCorn", "boiledEgg"];
        for (const d of eatOrder) {
          if ((curM.kitchen?.stock?.[d] || 0) > 0 && curM.eat?.(d) === "ok") {
            markActed("recover_hunger");
            return { acted: true, msg: `\u{1F372} \u0110\xE3 \u0103n ${d} t\u1EEB B\u1EBFp h\u1ED3i ph\u1EE5c \u0110\xF3i (+Fullness)` };
          }
        }
      }
      if (cfg.foodSource !== "kitchen_only") {
        const shopFood = cfg.preferFoodShop || "banhMiThit";
        const prices = {
          banhBao: 8e3,
          banhMiTrung: 1e4,
          banhMiThit: 15e3,
          banhMiCha: 15e3,
          banhMiFull: 25e3
        };
        const price = prices[shopFood] || 15e3;
        if ((curM.gold || 0) >= price && curM.buyFood?.(shopFood) === "ok") {
          markActed("recover_hunger");
          return { acted: true, msg: `\u{1F956} \u0110\xE3 mua & \u0103n ${shopFood} t\u1EA1i Ti\u1EC7m b\xE1nh h\u1ED3i ph\u1EE5c \u0110\xF3i` };
        }
      }
    }
    const thirstTh = Number(cfg.thirstThreshold) || 45;
    if (cfg.autoRecoverThirst !== false && (m.hydration || 0) < thirstTh && canAct("recover_thirst", 3500)) {
      const curM = getMainState();
      if (cfg.drinkSource !== "shop_only") {
        if ((curM.kitchen?.stock?.carrotJuice || 0) > 0 && curM.drink?.("carrotJuice") === "ok") {
          markActed("recover_thirst");
          return { acted: true, msg: `\u{1F9C3} \u0110\xE3 u\u1ED1ng N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t t\u1EEB B\u1EBFp h\u1ED3i ph\u1EE5c Kh\xE1t (+Hydration)` };
        }
      }
      if (cfg.drinkSource !== "kitchen_first") {
        const shopDrink = cfg.preferDrinkShop || "nuocMia";
        const prices = {
          traDa: 3e3,
          nuocMia: 8e3,
          caPheSua: 12e3,
          traDao: 15e3,
          traSua: 18e3
        };
        const price = prices[shopDrink] || 8e3;
        if ((curM.gold || 0) >= price && curM.buyFood?.(shopDrink) === "ok") {
          markActed("recover_thirst");
          return { acted: true, msg: `\u{1F964} \u0110\xE3 mua & u\u1ED1ng ${shopDrink} t\u1EA1i Ti\u1EC7m gi\u1EA3i kh\xE1t h\u1ED3i ph\u1EE5c Kh\xE1t` };
        }
      }
    }
    if (cfg.autoMorningCoffee !== false && canAct("morning_coffee", 1e4)) {
      const curM = getMainState();
      const hasCoffeeBuff = (curM.kitchen?.buffs || []).some(
        (b) => b.kind === "coffee" && b.day === curM.day
      );
      if (!hasCoffeeBuff && (curM.gold || 0) >= 12e3 && curM.buyFood?.("caPheSua") === "ok") {
        markActed("morning_coffee");
        return { acted: true, msg: `\u2615 \u0110\xE3 u\u1ED1ng C\xE0 ph\xEA s\xE1ng (+50% t\u1ED1c \u0111\u1ED9 ch\u1EA1y to\xE0n ng\xE0y)` };
      }
    }
    const batTh = Number(cfg.batteryThreshold) || 35;
    if (cfg.autoChargeVehicle !== false && canAct("charge_vehicle", 5e3)) {
      const curM = getMainState();
      const vehicleBat = typeof curM.vehicle === "object" && curM.vehicle !== null ? curM.vehicle.battery : curM.battery;
      if (typeof vehicleBat === "number" && vehicleBat < batTh) {
        if ((curM.gold || 0) >= 5e3 && curM.chargeVehicle?.() === "ok") {
          markActed("charge_vehicle");
          return { acted: true, msg: `\u{1F50B} \u0110\xE3 s\u1EA1c \u0111\u1EA7y pin cho Xe m\xE1y \u0111i\u1EC7n EV` };
        }
      }
    }
    if (m.salonOpen) {
      if (cfg.autoSalonShampoo !== false) {
        const stSal = getMainState();
        const hasRelax = (stSal.kitchen?.buffs || []).some((b) => b.kind === "relax" && b.day === stSal.day);
        if (!hasRelax && (stSal.gold || 0) >= 15e4 && stSal.shampoo?.() === "ok") {
          return { acted: true, msg: `\u{1F486} \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y g\u1ED9i \u0111\u1EA7u d\u01B0\u1EE1ng sinh (Buff th\u01B0 gi\xE3n)` };
        }
      }
      if (cfg.autoSalonWhiten) {
        const stW = getMainState();
        if ((stW.player?.outfit?.tan || 0) > 0 && (stW.gold || 0) >= 3e5 && stW.whiten?.() === "ok") {
          return { acted: true, msg: `\u2728 \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y t\u1EAFm tr\u1EAFng n\xE2ng t\xF4ng da` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/crops.ts
  function handleCropsSubArea(cfg) {
    const mainStore = getMainStore();
    if (!mainStore) return { acted: false };
    const st = mainStore.getState();
    const mainScene = getActiveScene("MainScene");
    const plotKeys = Object.keys(st.plots || {});
    const cropNames = { radish: "C\u1EE7 c\u1EA3i", carrot: "C\xE0 r\u1ED1t", corn: "B\u1EAFp ng\xF4", rice: "L\xFAa th\u01A1m" };
    const applyOnPlot = (key, tool) => {
      const s0 = getMainState();
      s0.setActiveTool?.(tool);
      const prevPlotRef = s0.plots?.[key];
      if (mainScene && typeof mainScene.doWork === "function") {
        try {
          mainScene.doWork({ plot: key, tool });
        } catch {
        }
        if (getMainState().plots?.[key] !== prevPlotRef) {
          return true;
        }
      }
      const res = getMainState().applyTool?.(key, tool);
      if (res && mainScene?.plots?.playEffect) {
        try {
          mainScene.plots.playEffect(res, key);
        } catch {
        }
      }
      return Boolean(res);
    };
    if (cfg.autoHarvest !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "basket")) {
          const cropId = st.plots?.[key]?.crop?.id || "";
          if (applyOnPlot(key, "basket")) {
            return { acted: true, msg: `\u{1F9FA} Thu ho\u1EA1ch ${cropNames[cropId] || "n\xF4ng s\u1EA3n"} \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoPesticide !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "pesticide")) {
          if (applyOnPlot(key, "pesticide")) {
            return { acted: true, msg: `\u{1F41B} X\u1ECBt thu\u1ED1c di\u1EC7t s\xE2u b\u1ECD \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoPlant !== false) {
      const emptyPlots = plotKeys.filter((k) => !st.plots?.[k]?.crop);
      if (emptyPlots.length > 0) {
        const preferred = cfg.preferSeed || "auto";
        let seedToPlant;
        const seedList = ["radish", "carrot", "corn", "rice"];
        if (preferred === "auto") {
          const curM = getMainState();
          const curGold = curM.gold || 0;
          if (curGold < 1500) seedToPlant = "radish";
          else if (curGold < 5e3) seedToPlant = "carrot";
          else if (curGold < 15e3) seedToPlant = "corn";
          else seedToPlant = "rice";
        } else {
          seedToPlant = preferred;
        }
        if (seedToPlant) {
          const seedStock = st.seeds?.[seedToPlant] || 0;
          if (seedStock < emptyPlots.length) {
            const needed = emptyPlots.length - seedStock;
            const buyCount = Math.min(needed, 10);
            const seedPrices = { radish: 50, carrot: 120, corn: 280, rice: 600 };
            const cost = (seedPrices[seedToPlant] || 100) * buyCount;
            if ((getMainState().gold || 0) >= cost) {
              if (getMainState().buySeed?.(seedToPlant, buyCount) === "ok") {
                return {
                  acted: true,
                  msg: `\u{1F331} \u0110\xE3 mua ${buyCount} h\u1EA1t gi\u1ED1ng ${cropNames[seedToPlant] || seedToPlant}`
                };
              }
            }
          }
        }
        const freshM = getMainState();
        let plantChoice = null;
        if (seedToPlant && (freshM.seeds?.[seedToPlant] || 0) > 0) {
          plantChoice = seedToPlant;
        } else {
          for (const sName of seedList) {
            if ((freshM.seeds?.[sName] || 0) > 0) {
              plantChoice = sName;
              break;
            }
          }
        }
        if (plantChoice) {
          const targetPlot = emptyPlots[0];
          if (applyOnPlot(targetPlot, `seed:${plantChoice}`)) {
            return {
              acted: true,
              msg: `\u{1F331} Gieo h\u1EA1t gi\u1ED1ng ${cropNames[plantChoice] || plantChoice} \xF4 (${targetPlot})`
            };
          }
        }
      }
    }
    if (cfg.autoWater !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "can")) {
          if (applyOnPlot(key, "can")) {
            return { acted: true, msg: `\u{1F4A7} T\u01B0\u1EDBi n\u01B0\u1EDBc gi\u1EEF \u1EA9m \u0111\u1EA5t \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoFertilize !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "fertilizer")) {
          if (applyOnPlot(key, "fertilizer")) {
            return { acted: true, msg: `\u2728 B\xF3n ph\xE2n NPK t\u0103ng tr\u01B0\u1EDFng \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoBuyPlots !== false) {
      const curGold = getMainState().gold || 0;
      const currentCount = plotKeys.length;
      const plotCosts = [
        0,
        0,
        0,
        0,
        1e3,
        2e3,
        3500,
        5e3,
        8e3,
        12e3,
        18e3,
        25e3,
        35e3,
        5e4,
        7e4,
        1e5,
        14e4,
        19e4,
        25e4,
        32e4,
        4e5,
        5e5,
        62e4,
        76e4,
        92e4,
        11e5,
        13e5,
        155e4,
        185e4,
        22e5,
        26e5,
        31e5
      ];
      const nextCost = plotCosts[currentCount] || 0;
      if (currentCount < 32 && nextCost > 0 && curGold >= nextCost + 15e3) {
        const res = getMainState().buyPlot?.();
        if (res === "ok" || res === "bought") {
          return { acted: true, msg: `\u{1F69C} \u0110\xE3 mua th\xEAm \xF4 \u0111\u1EA5t ru\u1ED9ng #${currentCount + 1} (-${nextCost.toLocaleString("vi-VN")}\u0111)` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/animals.ts
  function handlePetSubArea(cfg) {
    const m = getMainState();
    if (!m) return { acted: false };
    if (m.pets?.pet?.away) {
      m.pickUpPet?.();
      if (!getMainState().pets?.pet?.away) {
        return { acted: true, msg: `\u{1F43E} \u0110\xE3 \u0111\xF3n th\xFA c\u01B0ng v\u1EC1 nh\xE0` };
      }
      return { acted: false };
    }
    const pet = m.pets?.pet;
    if (!pet || pet.away) return { acted: false };
    if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
      const kind = pet.kind || "";
      let candidates = ["xuong", "cakho", "pate", "hat", "coKho", "cam", "crop:carrot", "crop:corn", "crop:radish"];
      let shopBuyList = ["pate", "hat", "xuong", "cakho", "coKho", "cam"];
      if (["muop", "tamThe", "anhLongNgan", "xiem"].includes(kind)) {
        candidates = ["cakho", "pate", "hat"];
        shopBuyList = ["cakho", "pate", "hat"];
      } else if (["thoTrang", "thoNau"].includes(kind)) {
        candidates = ["crop:carrot", "coKho", "crop:radish"];
        shopBuyList = ["coKho"];
      } else if (["heoHong", "heoMini"].includes(kind)) {
        candidates = ["crop:corn", "cam", "crop:radish", "crop:carrot"];
        shopBuyList = ["cam"];
      } else if (["vang", "muc", "husky", "corgi", "pug"].includes(kind)) {
        candidates = ["xuong", "pate", "hat"];
        shopBuyList = ["xuong", "pate", "hat"];
      }
      for (const f of candidates) {
        const res = m.feedPet?.(f);
        if (res === "ok" || res === "fav") {
          return { acted: true, msg: `\u{1F415} \u0110\xE3 cho th\xFA c\u01B0ng (${pet.name || "B\xE9"}) \u0103n no` };
        }
      }
      for (const sf of shopBuyList) {
        if (getMainState().buyPetFood?.(sf, 1) === "ok") {
          const res = getMainState().feedPet?.(sf);
          if (res === "ok" || res === "fav") {
            return { acted: true, msg: `\u{1F9B4} \u0110\xE3 mua \u0111\u1ED3 \u0103n & cho th\xFA c\u01B0ng (${pet.name || "B\xE9"}) \u0103n` };
          }
        }
      }
    }
    const curM = getMainState();
    const curPet = curM.pets?.pet;
    if (cfg.petAutoCuddle !== false && curPet) {
      const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
      if (cuddlesToday < 3 && curM.cuddlePet?.() === "ok") {
        return { acted: true, msg: `\u{1F495} \u0110\xE3 vu\u1ED1t ve th\xFA c\u01B0ng (${cuddlesToday + 1}/3)` };
      }
    }
    const curM2 = getMainState();
    const curPet2 = curM2.pets?.pet;
    if (cfg.petAutoBath !== false && curPet2 && curPet2.bathedDay !== curM2.day) {
      if (curM2.bathPet?.() === "ok") {
        return { acted: true, msg: `\u{1F6C1} \u0110\xE3 t\u1EAFm r\u1EEDa s\u1EA1ch s\u1EBD cho th\xFA c\u01B0ng` };
      }
    }
    const curM3 = getMainState();
    const curPet3 = curM3.pets?.pet;
    if (cfg.petAutoTrick !== false && curPet3 && curPet3.trickDay !== curM3.day) {
      const res = curM3.trickPet?.();
      if (res === "ok" || res === "max") {
        return { acted: true, msg: `\u{1F3BE} \u0110\xE3 hu\u1EA5n luy\u1EC7n tr\xF2 vui cho th\xFA c\u01B0ng (+XP)` };
      }
    }
    return { acted: false };
  }
  function handleBarnSubArea(cfg) {
    const m = getMainState();
    if (!m) return { acted: false };
    if (cfg.barnAutoFeedBuffalo !== false && m.buffalo?.home) {
      if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day) {
        if (m.feedBuffalo?.("grass") === "ok") {
          return { acted: true, msg: `\u{1F403} \u0110\xE3 cho Tr\xE2u \u0103n r\u01A1m` };
        }
      }
    }
    const stB = getMainState();
    if (cfg.barnAutoBathBuffalo !== false && stB.buffalo?.home) {
      if (stB.buffalo.mudDay !== stB.day && stB.buffalo.lentDay !== stB.day) {
        if (stB.bathBuffalo?.() === "ok") {
          return { acted: true, msg: `\u{1F6BF} \u0110\xE3 t\u1EAFm m\xE1t cho Tr\xE2u` };
        }
      }
    }
    const stB2 = getMainState();
    if (cfg.barnAutoLendBuffalo !== false && stB2.buffalo?.home && stB2.buffalo.lentDay !== stB2.day && (stB2.buffalo?.mood || 0) >= 50) {
      if (stB2.lendBuffalo?.() === "ok") {
        return { acted: true, msg: `\u{1F91D} \u0110\xE3 cho b\xE0 con thu\xEA Tr\xE2u c\xE0y ru\u1ED9ng` };
      }
    }
    const stC = getMainState();
    if (cfg.barnAutoFeedCows !== false && Array.isArray(stC.dairy?.cows) && stC.dairy.cows.some((c) => c.fedDay !== stC.day)) {
      if (stC.feedCows?.() === "ok") {
        return { acted: true, msg: `\u{1F404} \u0110\xE3 cho \u0111\xE0n B\xF2 s\u1EEFa \u0103n c\u1ECF` };
      }
    }
    const stC2 = getMainState();
    if (cfg.barnAutoCureCows !== false && Array.isArray(stC2.dairy?.cows)) {
      for (const cow of stC2.dairy.cows) {
        if ((cow.sickDay || 0) > 0) {
          if ((stC2.dairy?.medicine || 0) <= 0 && (stC2.gold || 0) >= 8e4) {
            stC2.buyMedicine?.();
          }
          if (getMainState().cureCow?.(cow.id) === "ok") {
            return { acted: true, msg: `\u{1F48A} \u0110\xE3 ti\xEAm thu\u1ED1c ch\u1EEFa b\u1EC7nh cho B\xF2 ${cow.name || "#" + cow.id}` };
          }
        }
      }
    }
    const stC3 = getMainState();
    if (cfg.barnAutoSellMilk !== false && (stC3.dairy?.milk || 0) > 0) {
      const res = stC3.sellMilk?.();
      if (res && res.liters > 0) {
        return {
          acted: true,
          msg: `\u{1F95B} \u0110\xE3 v\u1EAFt & b\xE1n ${res.liters} l\xEDt s\u1EEFa b\xF2 (+${res.total.toLocaleString("vi-VN")}\u0111)`
        };
      }
    }
    const stC4 = getMainState();
    if (cfg.barnAutoPayHelper !== false) {
      if (stC4.helpers?.buffalo?.hired && (stC4.helpers.buffalo.unpaid || 0) > 0) {
        if (stC4.payHelper?.("buffalo") === true) {
          return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng anh T\xE2m ch\u0103n tr\xE2u` };
        }
      }
      const stC5 = getMainState();
      if (stC5.helpers?.dairy?.hired && (stC5.helpers.dairy.unpaid || 0) > 0) {
        if (stC5.payHelper?.("dairy") === true) {
          return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\u1ECB M\u1EADn ch\u0103m b\xF2` };
        }
      }
    }
    return { acted: false };
  }
  function handleCoopSubArea(cfg) {
    const m = getMainState();
    if (!m || !m.unlockedZones?.includes("poultry")) return { acted: false };
    if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
      const got = m.collectEggs?.();
      if (typeof got === "number" && got > 0) {
        return { acted: true, msg: `\u{1F95A} \u0110\xE3 nh\u1EB7t ${got} qu\u1EA3 tr\u1EE9ng g\xE0 trong \u1ED5` };
      }
    }
    const stG = getMainState();
    const maxHens = [4, 6, 9, 12][stG.coopLevel || 0] || 4;
    if (cfg.coopAutoBuyChick && !stG.flu && (stG.hens?.length || 0) < maxHens && (stG.gold || 0) >= 6e4) {
      if (stG.buyChick?.() === "ok") {
        return {
          acted: true,
          msg: `\u{1F424} \u0110\xE3 mua th\xEAm 1 g\xE0 con v\xE0o chu\u1ED3ng (${(stG.hens?.length || 0) + 1}/${maxHens})`
        };
      }
    }
    const stG2 = getMainState();
    if (cfg.coopAutoPayHelper !== false && stG2.helpers?.poultry?.hired && (stG2.helpers.poultry.unpaid || 0) > 0) {
      if (stG2.payHelper?.("poultry") === true) {
        return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\xFA Ba ch\u0103m g\xE0` };
      }
    }
    return { acted: false };
  }
  function handlePondSubArea(cfg) {
    const m = getMainState();
    if (!m || !m.pond?.ready) return { acted: false };
    if (m.notebook?.found && !m.pond.noteRead) {
      m.readPondNote?.();
    }
    const matureDays = { ro: 3, tre: 5, chep: 7 };
    if (cfg.pondAutoNet !== false && Array.isArray(m.pond.fish) && m.pond.fish.some((f) => (f.days || 0) >= (matureDays[f.id || ""] || 7))) {
      const res = m.netFish?.();
      if (res && res.n > 0) {
        return {
          acted: true,
          msg: `\u{1F41F} \u0110\xE3 k\xE9o l\u01B0\u1EDBi b\xE1n ${res.n} con c\xE1 ao (+${res.total.toLocaleString("vi-VN")}\u0111)`
        };
      }
    }
    const stP = getMainState();
    if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stP.pond.fish.length < 10) {
      const fishType = cfg.preferPondFish || "chep";
      const fryPrices = { ro: 1500, tre: 3500, chep: 7e3 };
      const cost = fryPrices[fishType] || 7e3;
      if ((stP.gold || 0) >= cost + 1e4) {
        if (stP.stockPond?.(fishType) === "ok") {
          return { acted: true, msg: `\u{1F41F} \u0110\xE3 th\u1EA3 c\xE1 gi\u1ED1ng (${fishType}) v\xE0o ao` };
        }
        if (stP.buyFry?.(fishType) === "ok") {
          return { acted: true, msg: `\u{1F41F} \u0110\xE3 mua & th\u1EA3 c\xE1 gi\u1ED1ng (${fishType}) v\xE0o ao` };
        }
      }
    }
    const stP2 = getMainState();
    if (cfg.pondAutoFeed !== false && stP2.pond?.fedDay !== stP2.day) {
      if (stP2.feedPond?.() === "ok") {
        return { acted: true, msg: `\u{1F33E} \u0110\xE3 r\u1EA3i c\xE1m cho c\xE1 ao \u0103n no` };
      }
    }
    const stP3 = getMainState();
    if (cfg.pondAutoPayHelper !== false && stP3.helpers?.pond?.hired && (stP3.helpers.pond.unpaid || 0) > 0) {
      if (stP3.payHelper?.("pond") === true) {
        return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ng\u01B0\u1EDDi l\xE0m ch\u0103m ao c\xE1` };
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/gold-sim.ts
  var GOLD_DATA = [
    { id: "mieng", name: "V\xE0ng mi\u1EBFng 9999", base: 82e5, beta: 1, noise: 2e-3, spread: 0.016 },
    { id: "nhan", name: "Nh\u1EABn tr\u01A1n 9999", base: 76e5, beta: 0.9, noise: 15e-4, spread: 0.012 },
    { id: "k18", name: "V\xE0ng 18K", base: 56e5, beta: 0.7, noise: 2e-3, spread: 0.09 },
    { id: "non", name: "V\xE0ng non 10K", base: 31e5, beta: 2.2, noise: 6e-3, spread: 0.05 }
  ];
  var GOLD_CATALOG = Object.fromEntries(
    GOLD_DATA.map((e) => [e.id, e])
  );
  var GOLD_WAVES = [
    { kind: "calm", drift: 0, weight: 38, len: [6, 16] },
    { kind: "up", drift: 5e-3, weight: 24, len: [6, 18] },
    { kind: "down", drift: -5e-3, weight: 22, len: [6, 18] },
    { kind: "boom", drift: 0.011, weight: 8, len: [6, 12] },
    { kind: "crash", drift: -0.011, weight: 8, len: [6, 12] }
  ];
  var _G_A = 4e-3;
  var _G_V = 0.02;
  var _G_Y = 3e-4;
  var _G_B = 0.045;
  var _G_X = 0.7;
  function _goldRng(seed) {
    let t = seed >>> 0;
    return () => {
      t = t + 1831565813 >>> 0;
      let e = t;
      e = Math.imul(e ^ e >>> 15, e | 1);
      e ^= e + Math.imul(e ^ e >>> 7, e | 61);
      return ((e ^ e >>> 14) >>> 0) / 4294967296;
    };
  }
  var _goldNorm = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  var _goldStep = (day, min) => (day - 1) * 2 + (min >= 720 ? 1 : 0);
  var _goldCache = /* @__PURE__ */ new Map();
  function _goldSim(seed, step) {
    let n = _goldCache.get(seed);
    if (!n) {
      n = {
        index: [],
        wave: [],
        own: { mieng: [], nhan: [], k18: [], non: [] },
        r: _goldRng(seed),
        waveLeft: 0,
        drift: 0,
        kind: "calm",
        x: 0,
        bump: 0
      };
      _goldCache.set(seed, n);
    }
    while (n.index.length <= step) {
      const e = n.index.length;
      if (n.waveLeft <= 0) {
        let total = n.r() * GOLD_WAVES.reduce((a, b) => a + b.weight, 0);
        const w = GOLD_WAVES.find((x) => (total -= x.weight) < 0) || GOLD_WAVES[0];
        n.kind = w.kind;
        n.drift = w.drift;
        n.waveLeft = w.len[0] + Math.floor(n.r() * (w.len[1] - w.len[0] + 1));
      }
      n.waveLeft--;
      const t = Math.floor(e / 2) + 1;
      const r = (t - 1) % 120 + 1;
      n.bump = e % 2 === 0 && r === 10 && t > 120 ? _G_B : n.bump * _G_X;
      n.x += n.drift + _G_A * _goldNorm(n.r) - _G_V * (n.x - _G_Y * e);
      n.index.push(n.x + n.bump);
      n.wave.push(n.kind);
      for (const g of GOLD_DATA) {
        if (!n.own[g.id]) n.own[g.id] = [];
        n.own[g.id].push(g.noise * _goldNorm(n.r));
      }
    }
    return n;
  }
  function _goldBasePrice(seed, type, step) {
    const sim = _goldSim(seed, step);
    const item = GOLD_CATALOG[type];
    if (!item) return 0;
    return item.base * Math.exp(item.beta * sim.index[step] + sim.own[type][step]);
  }
  function getGoldBuyPrice(seed, type, day, min) {
    const step = _goldStep(day, min);
    const base = _goldBasePrice(seed, type, step);
    const item = GOLD_CATALOG[type];
    return Math.round(base * (1 + (item ? item.spread / 2 : 0)) / 1e3) * 1e3;
  }
  function getGoldSellPrice(seed, type, day, min) {
    const step = _goldStep(day, min);
    const base = _goldBasePrice(seed, type, step);
    const item = GOLD_CATALOG[type];
    return Math.round(base * (1 - (item ? item.spread / 2 : 0)) / 1e3) * 1e3;
  }

  // src/page-hook/modules/farm/market.ts
  function handleMarketSubArea(cfg) {
    const m = getMainState();
    if (!m) return { acted: false };
    const cropNames = {
      radish: "C\u1EE7 c\u1EA3i",
      carrot: "C\xE0 r\u1ED1t",
      corn: "B\u1EAFp ng\xF4",
      rice: "L\xFAa th\u01A1m",
      egg: "Tr\u1EE9ng g\xE0"
    };
    if (cfg.autoDeliverOrder !== false && m.order) {
      const have = m.produce?.[m.order.crop] || 0;
      if (have >= m.order.qty) {
        const reward = m.order.reward || 0;
        const cropLabel = cropNames[m.order.crop] || m.order.crop;
        if (m.deliverOrder?.() === true) {
          return {
            acted: true,
            msg: `\u{1F4E6} \u0110\xE3 giao \u0111\u01A1n h\xE0ng Ch\u1ECB Na (${cropLabel}) +${reward.toLocaleString("vi-VN")}\u0111`
          };
        }
      }
    }
    const stV = getMainState();
    if (cfg.autoVillageBoard !== false) {
      if ((stV.village?.newsDay || 0) > 0 && !stV.village?.met) {
        stV.meetKhang?.();
      }
      const curV = getMainState();
      if (Array.isArray(curV.village?.requests)) {
        for (const req of curV.village.requests) {
          if (!req.fulfilled) {
            const itemKey = req.crop || req.item || "";
            const have = itemKey === "egg" ? curV.eggs || 0 : curV.produce?.[itemKey] || 0;
            if (have >= (req.qty || 0)) {
              if (curV.deliverVillageRequest?.(req.id) === true) {
                return {
                  acted: true,
                  msg: `\u{1F4CB} \u0110\xE3 giao \u0111\u01A1n B\u1EA3ng tin l\xE0ng (${cropNames[itemKey] || itemKey}) +${(req.reward || 0).toLocaleString("vi-VN")}\u0111`
                };
              }
            }
          }
        }
      }
    }
    const stT = getMainState();
    if (cfg.autoSellTrend !== false && stT.day) {
      const tr = getActiveTrend(stT.day);
      if (tr) {
        const quota = getTrendQuota(tr.goods, stT.day, Object.keys(stT.plots || {}).length, stT.trendLog);
        if (quota > 0) {
          const have = tr.goods === "egg" ? stT.eggs || 0 : stT.produce?.[tr.goods] || 0;
          const sellCount = Math.min(quota, have);
          if (sellCount > 0) {
            const ok = tr.goods === "egg" ? stT.sellEgg?.(sellCount) : stT.sellProduce?.(tr.goods, sellCount);
            if (ok === true) {
              return {
                acted: true,
                msg: `\u{1F4C8} B\xE1n ${sellCount} ${cropNames[tr.goods] || tr.goods} Xu h\u01B0\u1EDBng x2 gi\xE1 ch\u1EE3`
              };
            }
          }
        }
      }
    }
    const stS = getMainState();
    if (cfg.autoSellDailyTask !== false) {
      const sellTask = (stS.daily?.tasks || []).find(
        (t) => !t.claimed && t.kind === "sell" && (stS.stats?.earned || 0) - (t.base || 0) < (t.need || 0)
      );
      const day1NeedSell = stS.day === 1 && (stS.stats?.earned || 0) === 0;
      if (sellTask || day1NeedSell) {
        const items = ["radish", "carrot", "corn", "rice", "egg"];
        for (const item of items) {
          const have = item === "egg" ? stS.eggs || 0 : stS.produce?.[item] || 0;
          const reserved = stS.order && stS.order.crop === item ? stS.order.qty : 0;
          const sellable = Math.max(0, have - reserved);
          if (sellable > 0) {
            let qtyToSell = 1;
            if (sellTask) {
              const missing = (sellTask.need || 0) - ((stS.stats?.earned || 0) - (sellTask.base || 0));
              const unitPrice = item === "egg" ? 1e3 : stS.prices?.[item] || 500;
              qtyToSell = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
            }
            const ok = item === "egg" ? stS.sellEgg?.(qtyToSell) : stS.sellProduce?.(item, qtyToSell);
            if (ok === true) {
              return {
                acted: true,
                msg: `\u{1F3EA} B\xE1n ${qtyToSell} ${cropNames[item] || item} ho\xE0n th\xE0nh nhi\u1EC7m v\u1EE5 b\xE1n h\xE0ng`
              };
            }
          }
        }
      }
    }
    if (cfg.autoSellProduce && typeof cfg.surplusKeepQty === "number") {
      const stSur = getMainState();
      const keepLimit = Number(cfg.surplusKeepQty) || 20;
      const items = ["radish", "carrot", "corn", "rice", "egg"];
      for (const item of items) {
        const have = item === "egg" ? stSur.eggs || 0 : stSur.produce?.[item] || 0;
        const reserved = stSur.order && stSur.order.crop === item ? stSur.order.qty : 0;
        const surplus = have - Math.max(keepLimit, reserved);
        if (surplus > 0) {
          const ok = item === "egg" ? stSur.sellEgg?.(surplus) : stSur.sellProduce?.(item, surplus);
          if (ok === true) {
            return {
              acted: true,
              msg: `\u{1F4E6} B\xE1n ${surplus} ${cropNames[item] || item} d\u01B0 kho (gi\u1EEF l\u1EA1i t\u1ED1i thi\u1EC3u ${keepLimit})`
            };
          }
        }
      }
    }
    if (cfg.goldAutoBuy || cfg.goldAutoSell) {
      const stG = getMainState();
      const curGold = stG.gold || 0;
      const seed = (stG.day || 1) * 1e3 + Math.floor((stG.minutes || 0) / 720);
      const day = stG.day || 1;
      const min = stG.minutes || 0;
      if (cfg.goldAutoSell !== false) {
        const profitTarget = Number(cfg.goldProfitPercent) || 10;
        for (const t of Object.keys(GOLD_CATALOG)) {
          const have = stG.goldStock?.[t] || 0;
          const avgCost = stG.goldAvgCost?.[t] || 0;
          if (have > 0 && avgCost > 0) {
            const sellPrice = getGoldSellPrice(seed, t, day, min);
            const profit = (sellPrice - avgCost) / avgCost * 100;
            if (profit >= profitTarget) {
              if (stG.sellGold?.(t, have) === true) {
                return {
                  acted: true,
                  msg: `\u{1FA99} B\xE1n ch\u1ED1t l\u1EDDi ${have} ${GOLD_CATALOG[t]?.name || t} (L\xE3i +${profit.toFixed(1)}%)`
                };
              }
            }
          }
        }
      }
      if (cfg.goldAutoBuy) {
        const prefType = cfg.goldPreferType || "mieng";
        const keepCash = Number(cfg.goldKeepCash) || 5e5;
        const buyPrice = getGoldBuyPrice(seed, prefType, day, min);
        if (curGold >= keepCash + buyPrice && buyPrice > 0) {
          if (stG.buyGold?.(prefType) === true) {
            return {
              acted: true,
              msg: `\u{1FA99} Mua t\xEDch l\u0169y 1 ${GOLD_CATALOG[prefType]?.name || prefType} C\xF4 Kim (-${buyPrice.toLocaleString("vi-VN")}\u0111)`
            };
          }
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/tasks.ts
  function handleDiBaySubArea(cfg) {
    const m = getMainState();
    if (!m) return { acted: false };
    const stP0 = getMainState();
    if (stP0.savings && (stP0.savings.newsDay || 0) <= 0) {
      if ((stP0.savings.pig?.amount || 0) > 0 || (stP0.day || 0) >= 14) {
        setMainState((e) => ({
          savings: { ...e.savings || {}, newsDay: Math.max(1, e.day || 1) }
        }));
      }
    }
    if (cfg.autoFirstDayTasks !== false) {
      if (!m.firstDay?.incense) {
        if (m.lightIncense?.() === "first") {
          return { acted: true, msg: `\u{1F64F} \u0110\xE3 th\u1EAFp nhang b\xE0n th\u1EDD \xD4ng N\u0103m` };
        }
      }
      const stF = getMainState();
      if (stF.firstDay?.incense && !stF.firstDay?.sproutHarvested) {
        if (!stF.firstDay.sprout) {
          if (stF.plantSprouts?.() === "ok") {
            return { acted: true, msg: `\u{1F331} \u0110\xE3 gieo khay rau m\u1EA7m c\u1EA1nh nh\xE0` };
          }
        } else if (stF.harvestSprouts?.() === true) {
          return { acted: true, msg: `\u{1F33F} \u0110\xE3 thu ho\u1EA1ch khay rau m\u1EA7m (+4 c\u1EE7 c\u1EA3i)` };
        }
      }
      const stF2 = getMainState();
      if ((stF2.firstDay?.cleared?.length || 0) < 5) {
        const clearedList = stF2.firstDay?.cleared || [];
        for (let i = 0; i < 5; i++) {
          if (!clearedList.includes(i)) {
            const cleared = stF2.clearDebris?.(i);
            if (cleared) {
              return { acted: true, msg: `\u{1F9F9} \u0110\xE3 d\u1ECDn c\u1ECF/c\xE0nh kh\xF4 ngo\xE0i v\u01B0\u1EDDn (${clearedList.length + 1}/5)` };
            }
          }
        }
      }
      const stF3 = getMainState();
      if (stF3.day === 1 && !(stF3.ledger || []).some((e) => e.kind === "food") && (stF3.gold || 0) >= 8e3) {
        if (stF3.buyFood?.("banhBao") === "ok") {
          return { acted: true, msg: `\u{1F95F} \u0110\xE3 mua B\xE1nh bao \u0103n s\xE1ng (Vi\u1EC7c Ng\xE0y 1)` };
        }
      }
      if (stF3.day === 2 && !(stF3.ledger || []).some((e) => e.kind === "food" && (e.label === "Tr\xE0 \u0111\xE1" || e.label === "N\u01B0\u1EDBc m\xEDa")) && (stF3.gold || 0) >= 3e3) {
        if (stF3.buyFood?.("traDa") === "ok") {
          return { acted: true, msg: `\u{1F9CA} \u0110\xE3 u\u1ED1ng Tr\xE0 \u0111\xE1 (Vi\u1EC7c Ng\xE0y 2)` };
        }
      }
    }
    if (cfg.autoNotebookPages !== false) {
      const stN = getMainState();
      if (stN.notebook?.found) {
        if (!stN.notebook.read) {
          stN.readNotebook?.();
        }
        for (const p of stN.notebook.pages || []) {
          if (p.found && !p.read) {
            stN.claimNotebookPage?.(p.id);
          }
        }
      }
      const curN = getMainState();
      if (curN.notebook?.pages?.some((p) => p.id === "soak" && p.found)) {
        if (!curN.notebook.soakDone && !curN.notebook.soakEnd && (curN.gold || 0) >= 1e3) {
          if (curN.startSoak?.() === "ok") {
            return { acted: true, msg: `\u{1F33E} \u0110\xE3 ng\xE2m gi\u1ED1ng l\xFAa th\u01A1m theo s\u1ED5 \xD4ng N\u0103m` };
          }
        }
        const curN2 = getMainState();
        if (curN2.notebook?.seedReady && !curN2.notebook.seedClaimed) {
          if (curN2.claimSoakSeed?.() === "ok") {
            return { acted: true, msg: `\u{1F33E} \u0110\xE3 nh\u1EADn gi\u1ED1ng l\xFAa th\u01A1m ng\xE2m \u1EE7 th\xE0nh c\xF4ng` };
          }
        }
      }
    }
    const stPig = getMainState();
    const pig = stPig.savings?.pig;
    if (cfg.autoFeedPiggy !== false && pig && !pig.broken && pig.fedDay !== stPig.day && (stPig.gold || 0) >= 5e4) {
      const res = stPig.feedPiggy?.();
      if (res === "ok" || res === "broke") {
        return { acted: true, msg: `\u{1F437} \u0110\xE3 b\u1ECF \u1ED1ng heo ti\u1EBFt ki\u1EC7m (Nu\xF4i heo ${pig.streak || 1} ng\xE0y)` };
      }
    }
    const stPig2 = getMainState();
    const pig2 = stPig2.savings?.pig;
    if (cfg.autoBreakPiggy !== false && pig2 && !pig2.broken && (pig2.streak || 0) >= 7) {
      if (stPig2.breakPiggy?.() === true) {
        return {
          acted: true,
          msg: `\u{1F528} \u0110\xE3 \u0111\u1EADp heo \u0111\u1EA5t ti\u1EBFt ki\u1EC7m \u0111\u1EE7 7 ng\xE0y streak (+${(pig2.amount || 0).toLocaleString("vi-VN")}\u0111)`
        };
      }
    }
    const stPig3 = getMainState();
    const pig3 = stPig3.savings?.pig;
    if (cfg.autoNewPiggy !== false && (!pig3 || pig3.broken) && (stPig3.gold || 0) >= 1e5 && (stPig3.savings?.newsDay || 0) > 0) {
      if (stPig3.buyPiggy?.() === true) {
        return { acted: true, msg: `\u{1F437} \u0110\xE3 mua heo \u0111\u1EA5t m\u1EDBi t\u1EA1i Qu\u1EA7y D\xEC B\u1EA3y` };
      }
    }
    if (cfg.autoSavings) {
      const stSav = getMainState();
      const keepLimit = Number(cfg.savingsKeepGold) || 2e5;
      const surplusCash = (stSav.gold || 0) - keepLimit;
      if (surplusCash >= 1e5 && !stSav.savings?.balance) {
        const depositAmt = Math.floor(surplusCash / 5e4) * 5e4;
        if (depositAmt >= 1e5 && stSav.depositSavings?.(depositAmt) === true) {
          return {
            acted: true,
            msg: `\u{1F3E6} \u0110\xE3 g\u1EEDi ti\u1EBFt ki\u1EC7m ${depositAmt.toLocaleString("vi-VN")}\u0111 t\u1EA1i Qu\u1EA7y D\xEC B\u1EA3y`
          };
        }
      }
    }
    if (cfg.autoClaimQuests !== false) {
      const stQ = getMainState();
      for (const t of stQ.daily?.tasks || []) {
        if (!t.claimed && (stQ.stats?.earned || 0) - (t.base || 0) >= (t.need || 0)) {
          if (t.id !== void 0 && stQ.claimDailyTask?.(t.id) === true) {
            return { acted: true, msg: `\u{1F389} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng Vi\u1EC7c h\xF4m nay t\u1EA1i S\u1ED5 tay` };
          }
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/index.ts
  function execFarmSubAreaStep(subAreaId, cfg) {
    const m = stores.main?.getState();
    if (!m) return { acted: false };
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;
    switch (subAreaId) {
      case "house":
        return handleHouseSubArea(cfg);
      case "crops":
        return handleCropsSubArea(cfg);
      case "pet":
        return handlePetSubArea(cfg);
      case "barn":
        return handleBarnSubArea(cfg);
      case "coop":
        return handleCoopSubArea(cfg);
      case "pond":
        return handlePondSubArea(cfg);
      case "market":
        return handleMarketSubArea(cfg);
      case "dibay":
        return handleDiBaySubArea(cfg);
      default:
        return { acted: false };
    }
  }

  // src/page-hook/modules/sea/index.ts
  function execSeaStep(cfg) {
    const mainStore = stores.main;
    const seaStore = stores.sea;
    if (!mainStore || !seaStore) return { acted: false };
    const m = mainStore.getState();
    const s = seaStore.getState();
    if (m.screen !== "sea") return { acted: false };
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;
    const seaScene = getActiveScene("SeaScene");
    if ((m.fishing?.rod || 0) === 0 && (m.gold || 0) >= 15e3) {
      if (m.buyRod?.() === true) {
        return { acted: true, msg: "\u{1F3A3} \u0110\xE3 mua C\u1EA7n c\xE2u t\u1EA1i Ch\xF2i \xD4ng T\u01B0" };
      }
    }
    const sellMin = (m.minutes || 0) >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
    if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
      const count = m.fishing?.basket?.length || 0;
      const earned = m.sellBasket?.();
      if (typeof earned === "number" && earned > 0) {
        return { acted: true, msg: `\u{1F4B0} \u0110\xE3 b\xE1n ${count} c\xE1 \u1EDF Bi\u1EC3n (+${earned.toLocaleString("vi-VN")}\u0111)` };
      }
    }
    if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
      return { acted: true, msg: "\u{1F4D6} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng S\u1ED5 c\xE1 \xD4ng T\u01B0" };
    }
    const curM = mainStore.getState();
    const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
    if (cfg.seaAutoBuyBait !== false && totalBait <= 0) {
      const pref = cfg.seaPreferBait || "worm";
      const packs = Number(cfg.seaBaitPacks) || 2;
      if (curM.buyBait?.(pref, packs) === true) {
        return { acted: true, msg: `\u{1FAB1} \u0110\xE3 mua ${packs} g\xF3i m\u1ED3i ${pref === "shrimp" ? "T\xF4m" : "Giun"}` };
      } else if (curM.buyBait?.("worm", 1) === true) {
        return { acted: true, msg: `\u{1FAB1} \u0110\xE3 mua 1 g\xF3i m\u1ED3i Giun` };
      }
    }
    if (totalBait > 0 && curM.fishing?.bait) {
      const pref = cfg.seaPreferBait || "worm";
      const hasPref = (curM.fishing.bait[pref] || 0) > 0;
      const chipToSelect = hasPref ? pref : (curM.fishing.bait.worm || 0) > 0 ? "worm" : "shrimp";
      const activeChip = document.querySelector(".sea-bait-chip.active");
      if (!activeChip || !activeChip.textContent?.toLowerCase().includes(chipToSelect)) {
        const chipEl = Array.from(document.querySelectorAll(".sea-bait-chip")).find(
          (el) => el.textContent?.toLowerCase().includes(chipToSelect)
        );
        if (chipEl) chipEl.click();
      }
    }
    if (cfg.seaAutoEat !== false) {
      const seaHydrationTh = Number(cfg.seaStaminaThreshold) || 20;
      const seaHungerTh = Number(cfg.seaStaminaThreshold) || 20;
      const curM2 = mainStore.getState();
      if ((curM2.hydration || 0) < seaHydrationTh && canAct("sea_drink", 3500)) {
        if ((curM2.gold || 0) >= 8e3 && curM2.drink?.("nuocMia") === "ok") {
          markActed("sea_drink");
          return { acted: true, msg: "\u{1F964} \u0110\xE3 u\u1ED1ng N\u01B0\u1EDBc m\xEDa t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t" };
        }
        if ((curM2.gold || 0) >= 3e3 && curM2.drink?.("traDa") === "ok") {
          markActed("sea_drink");
          return { acted: true, msg: "\u{1F9CA} \u0110\xE3 u\u1ED1ng Tr\xE0 \u0111\xE1 t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t" };
        }
      }
      const curM3 = mainStore.getState();
      if ((curM3.fullness || 0) < seaHungerTh && canAct("sea_eat", 3500)) {
        for (const d of Object.keys(curM3.kitchen?.stock || {})) {
          if ((curM3.kitchen?.stock?.[d] || 0) > 0 && curM3.eat?.(d) === "ok") {
            markActed("sea_eat");
            return { acted: true, msg: "\u{1F372} \u0110\xE3 \u0103n m\xF3n mang theo h\u1ED3i s\u1EE9c t\u1EA1i Bi\u1EC3n" };
          }
        }
        if ((curM3.gold || 0) >= 15e3 && curM3.buyFood?.("banhMiThit") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F956} \u0110\xE3 \u0103n B\xE1nh m\xEC t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i" };
        }
        if ((curM3.gold || 0) >= 8e3 && curM3.buyFood?.("banhBao") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F95F} \u0110\xE3 \u0103n B\xE1nh bao t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i" };
        }
      }
    }
    if (s.panel && s.phase === "idle") {
      seaStore.setState({ panel: null });
    }
    if (cfg.seaAutoSpot !== false && s.phase === "idle" && !s.walking) {
      const targetSpot = cfg.seaSpot || "pier";
      if (s.spot !== targetSpot) {
        const spotCoords = {
          pier: { x: 24, y: 4 },
          rocks: { x: 41, y: 9 },
          beach: { x: 20, y: 14 }
        };
        const coord = spotCoords[targetSpot] || spotCoords.pier;
        if (seaScene && typeof seaScene.goFarmer === "function") {
          seaScene.goFarmer(coord);
          return { acted: true, msg: `\u{1F6B6} \u0110ang \u0111i ra v\u1ECB tr\xED c\xE2u (${targetSpot})...` };
        } else {
          seaStore.setState({ spot: targetSpot, walking: false });
          return { acted: true, msg: `\u{1F4CD} \u0110\xE3 ch\u1ECDn v\u1ECB tr\xED c\xE2u (${targetSpot})` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/wharf/index.ts
  function execBenStep(cfg) {
    const mStore = stores.main;
    const buStore = stores.benUI;
    const bnStore = stores.benNet;
    if (!mStore || !buStore || !bnStore) {
      return { acted: false };
    }
    const m = mStore.getState();
    const bu = buStore.getState();
    const bn = bnStore.getState();
    if (m.screen !== "benDo" || bn.status !== "in") {
      return { acted: false };
    }
    if (bu.walking || bn.fishing !== "idle") {
      return { acted: false };
    }
    const rawScene = getActiveScene("BenDoScene");
    const benScene = rawScene;
    const wallet = bn.wallet;
    if (!wallet) return { acted: false };
    const stamina = computeBenStamina(wallet);
    const shells = wallet.shells || 0;
    const bait = wallet.bait || 0;
    const nonKeptCount = Array.isArray(bn.basket) ? bn.basket.filter((x) => !x.kept).length : 0;
    const pack = bn.pack || {};
    const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);
    const stamMin = Number(cfg.benStaminaThreshold) || 20;
    const walkAndRun = (tile, actionFn, label, actionKey = null) => {
      if (actionKey && !canAct(actionKey)) {
        return { acted: false };
      }
      if (benScene && typeof benScene.goFarmer === "function") {
        const cur = benScene.farmer?.tile;
        if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
          if (actionKey) markActed(actionKey);
          actionFn();
          return { acted: true, msg: label };
        }
        if (benScene.farmer?.running) {
          return { acted: true, msg: `\u{1F6B6} \u0110ang di chuy\u1EC3n...` };
        }
        benScene.goFarmer(tile, () => {
          setTimeout(() => {
            if (!actionKey || canAct(actionKey)) {
              if (actionKey) markActed(actionKey);
              actionFn();
            }
          }, 250);
        });
        return { acted: true, msg: `\u{1F6B6} ${label}` };
      }
      if (actionKey) markActed(actionKey);
      actionFn();
      return { acted: true, msg: label };
    };
    const foodPrices = {
      banhMi: 10,
      chaoCa: 14,
      huTieu: 20,
      comTam: 28,
      lauMam: 45
    };
    const prefFood = cfg.benPreferFood || "lauMam";
    const targetFoodPrice = foodPrices[prefFood] || 45;
    const needShellsForBait = bait <= 0 && shells < 15;
    const needShellsForFood = (stamina < 4 || cfg.benAutoRecoverStamina !== false && stamina <= stamMin) && packItems.length === 0 && shells < targetFoodPrice;
    const sellThreshold = Number(cfg.benSellThreshold) || 60;
    if (cfg.benAutoSell !== false && nonKeptCount > 0 && (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: "sell" });
          buStore.setState({ panel: null });
        },
        `\u0110i b\xE1n ${nonKeptCount} con c\xE1 t\u1EA1i V\u1EF1a Anh T\u01B0`,
        "ben_sell"
      );
    }
    if (stamina < 4 || cfg.benAutoRecoverStamina !== false && stamina <= stamMin) {
      if (cfg.benAutoRecoverStamina !== false) {
        if (packItems.length > 0 && canAct("ben_eat_pack", 3e3)) {
          markActed("ben_eat_pack");
          sendBenWs({ t: "eat", item: packItems[0] });
          return { acted: true, msg: `\u{1F359} \u0110\xE3 \u0103n ${packItems[0]} trong balo h\u1ED3i S\u1EE9c c\xE2u` };
        }
        if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct("ben_goi_dau", 4e3)) {
          return walkAndRun(
            { x: 16, y: 24 },
            () => {
              sendBenWs({ t: "buy", item: "goiDau" });
              buStore.setState({ panel: null });
            },
            `G\u1ED9i \u0111\u1EA7u massage \xDAt M\u01B0\u1EDDi (+50 S\u1EE9c c\xE2u, -25\u{1F41A})`,
            "ben_goi_dau"
          );
        }
        const buyItem = shells >= targetFoodPrice ? prefFood : shells >= 28 ? "comTam" : shells >= 20 ? "huTieu" : shells >= 14 ? "chaoCa" : "banhMi";
        if (shells >= (foodPrices[buyItem] || 10) && canAct("ben_buy_food", 4e3)) {
          return walkAndRun(
            { x: 39, y: 23 },
            () => {
              sendBenWs({ t: "buy", item: buyItem });
              buStore.setState({ panel: null });
            },
            `Mua ${buyItem} t\u1EA1i Qu\xE1n \u0103n D\xEC T\xE1m h\u1ED3i S\u1EE9c c\xE2u`,
            "ben_buy_food"
          );
        }
        if (!canAct("ben_buy_food", 4e3) || !canAct("ben_eat_pack", 3e3) || !canAct("ben_goi_dau", 4e3)) {
          return { acted: true, msg: "\u{1F35A} \u0110ang ch\u1EDD \u0103n h\u1ED3i ph\u1EE5c S\u1EE9c c\xE2u..." };
        }
      }
      if (stamina < 4) {
        if (cfg.benAutoSell !== false && nonKeptCount > 0) {
          return walkAndRun(
            { x: 40, y: 10 },
            () => {
              sendBenWs({ t: "sell" });
              buStore.setState({ panel: null });
            },
            `\u0110i b\xE1n ${nonKeptCount} con c\xE1 t\u1EA1i V\u1EF1a Anh T\u01B0 \u0111\u1EC3 l\u1EA5y ti\u1EC1n \u0103n c\u01A1m`,
            "ben_sell"
          );
        }
        if (cfg.benAutoAtm && shells < (Number(cfg.benAtmThreshold) || 500) && canAct("ben_atm", 6e3)) {
          return walkAndRun(
            { x: 30, y: 31 },
            () => {
              sendBenWs({ t: "atm" });
              buStore.setState({ panel: null });
            },
            "\u0110\u1EBFn c\xE2y ATM B\u1EBFn \u0110\xF2 \u0111\u1ED5i ti\u1EC1n m\u1EB7t l\u1EA5y V\u1ECF s\xF2",
            "ben_atm"
          );
        }
        return {
          acted: false,
          exhausted: true,
          reason: "\u{1F62E}\u200D\u{1F4A8} B\u1EBFn \u0110\xF2: H\u1EBFt S\u1EE9c c\xE2u v\xE0 kh\xF4ng \u0111\u1EE7 v\u1ECF s\xF2 \u0111\u1EC3 \u0103n/g\u1ED9i \u0111\u1EA7u -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
        };
      }
    }
    if (bait <= 0) {
      if (cfg.benAutoBuyBait !== false) {
        const baitPrices = {
          moi20: 15,
          moi60: 40,
          moi150: 90
        };
        const prefBait = cfg.benPreferBait || "moi150";
        const buyBaitChoice = shells >= (baitPrices[prefBait] || 40) ? prefBait : shells >= 15 ? "moi20" : "xinMoi";
        if (buyBaitChoice !== "xinMoi" && shells >= (baitPrices[buyBaitChoice] || 15) && canAct("ben_bait", 3e3)) {
          return walkAndRun(
            { x: 53, y: 11 },
            () => {
              sendBenWs({ t: "buy", item: buyBaitChoice });
              buStore.setState({ panel: null });
            },
            `Mua ${buyBaitChoice} t\u1EA1i S\u1EA1p Ch\xFA \u0110\u1EF1c (-${baitPrices[buyBaitChoice]}\u{1F41A})`,
            "ben_bait"
          );
        }
      }
      const xinMoiBlocked = shells > 0 || lastXinMoiDay === (m.day || 0) && Date.now() - lastXinMoiAt < 6e5 || bn.notice?.error === "used" || bn.notice?.error === "noFree";
      if (!xinMoiBlocked && canAct("ben_bait", 3e3)) {
        setLastXinMoi(Date.now(), m.day || 0);
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: "buy", item: "xinMoi" });
            buStore.setState({ panel: null });
          },
          `\u0110i xin 10 m\u1ED3i mi\u1EC5n ph\xED t\u1EA1i Ch\xFA \u0110\u1EF1c`,
          "ben_bait"
        );
      }
      return {
        acted: false,
        exhausted: true,
        reason: "\u{1FAB1} B\u1EBFn \u0110\xF2: \u0110\xE3 h\u1EBFt m\u1ED3i & v\u1ECF s\xF2 -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
      };
    }
    if (cfg.benAutoLuckDrink && (wallet.luckCasts || 0) <= 0 && canAct("ben_luck_drink", 5e3)) {
      const drinkId = cfg.benPreferDrink || "nuocMia";
      const drinkPrices = { traDa: 3, nuocMia: 15, rauMa: 30, caPhe: 35, duaTuoi: 80 };
      if (shells >= (drinkPrices[drinkId] || 15)) {
        return walkAndRun(
          { x: 26, y: 12 },
          () => {
            sendBenWs({ t: "buy", item: drinkId });
            buStore.setState({ panel: null });
          },
          `\u0110i u\u1ED1ng n\u01B0\u1EDBc t\u0103ng May m\u1EAFn (${drinkId}) t\u1EA1i Ch\u1ECB Th\u01A1m`,
          "ben_luck_drink"
        );
      }
    }
    if (cfg.benAutoLantern !== false) {
      const tickets = wallet.tickets || 0;
      if (tickets > 0 && canAct("ben_lantern_spin", 4e3)) {
        return walkAndRun(
          { x: 37, y: 28 },
          () => {
            sendBenWs({ t: "spin", n: 1 });
            buStore.setState({ panel: null });
          },
          `Quay V\xF2ng quay may m\u1EAFn S\u1EA1p l\u1ED3ng \u0111\xE8n C\xF4 B\u1EA3y (c\xF2n ${tickets} v\xE9 \u{1F39F}\uFE0F)`,
          "ben_lantern_spin"
        );
      }
      const boughtToday = bn.wheel?.bought || 0;
      if (cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600 && canAct("ben_lantern_buy", 4e3)) {
        return walkAndRun(
          { x: 37, y: 28 },
          () => {
            sendBenWs({ t: "ticket" });
            buStore.setState({ panel: null });
          },
          `Mua v\xE9 V\xF2ng quay l\u1ED3ng \u0111\xE8n C\xF4 B\u1EA3y (${boughtToday + 1}/5, -600\u{1F41A})`,
          "ben_lantern_buy"
        );
      }
    }
    if (cfg.benAutoLotto !== false) {
      const lottoState = bn.lotto;
      const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
      if (hasWins && canAct("ben_lotto_claim", 4e3)) {
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: "lottoClaim" });
            buStore.setState({ panel: null });
          },
          `\u0110\u1ED5i th\u01B0\u1EDFng v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2 t\u1EA1i \u0110\u1EA1i l\xFD Ch\xFA B\u1EA3y (+${(lottoState?.pending || 0).toLocaleString("vi-VN")}\u{1F41A})`,
          "ben_lotto_claim"
        );
      }
      if (cfg.benAutoBuyLotto && shells >= 10 && canAct("ben_lotto_buy", 6e4)) {
        const sellingDay = lottoState?.selling;
        const alreadyBought = (lottoState?.mine || []).some((t) => t.day === sellingDay);
        if (!alreadyBought) {
          const randNum = Math.floor(Math.random() * 100);
          return walkAndRun(
            { x: 36, y: 31 },
            () => {
              sendBenWs({ t: "lottoBuy", num: randNum, qty: 1 });
              buStore.setState({ panel: null });
            },
            `Mua 1 v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2 (${randNum < 10 ? "0" + randNum : randNum}) t\u1EA1i \u0110\u1EA1i l\xFD Ch\xFA B\u1EA3y (-10\u{1F41A})`,
            "ben_lotto_buy"
          );
        }
      }
    }
    if (cfg.benAutoAtm && shells < (Number(cfg.benAtmThreshold) || 500) && canAct("ben_atm", 6e3)) {
      return walkAndRun(
        { x: 30, y: 31 },
        () => {
          sendBenWs({ t: "atm" });
          buStore.setState({ panel: null });
        },
        "\u0110\u1EBFn c\xE2y ATM B\u1EBFn \u0110\xF2 \u0111\u1ED5i ti\u1EC1n m\u1EB7t l\u1EA5y V\u1ECF s\xF2",
        "ben_atm"
      );
    }
    if (bu.panel) {
      buStore.setState({ panel: null });
    }
    if (cfg.benAutoSpot !== false) {
      const spotChoice = cfg.benSpot || "bank";
      const spotTargets = {
        bank: { x: 24, y: 10, kind: "bank", label: "B\u1EDD s\xF4ng" },
        dock: { x: 31, y: 34, kind: "dock", label: "C\u1EA7u t\xE0u ch\xEDnh" }
      };
      const target = spotTargets[spotChoice] || spotTargets.bank;
      if (!bu.spot || bu.spot !== target.kind && spotChoice !== "any") {
        if (benScene && typeof benScene.goFarmer === "function") {
          benScene.goFarmer({ x: target.x, y: target.y });
          return { acted: true, msg: `\u{1F6B6} \u0110ang \u0111i ra ${target.label} c\xE2u c\xE1...` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/index.ts
  (() => {
    const win = window;
    if (win.__ntg_page_hook_v100) return;
    win.__ntg_page_hook_v100 = true;
    function execAction(action, payload = {}) {
      if (!stores.main) discoverStores();
      const mainStore = stores.main;
      if (!mainStore) return { ok: false, error: "NO_MAIN_STORE" };
      const m = mainStore.getState();
      if (!m) return { ok: false, error: "NO_MAIN_STORE" };
      try {
        switch (action) {
          case "NAVIGATE": {
            const target = payload.target;
            dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
            const cur = mainStore.getState();
            if (target === "playing") {
              if (cur.screen !== "playing") {
                cur.showWorldMap?.();
                mainStore.getState().enterFarm?.();
                mainStore.setState({ screen: "playing", panel: null, shop: null, vendor: null });
              }
              if (payload.indoors === false && mainStore.getState().indoors) {
                mainStore.getState().leaveHouse?.();
              }
            } else if (target === "sea") {
              if (cur.screen !== "sea") {
                if (cur.indoors) cur.leaveHouse?.();
                if (!cur.fishing?.seaOpen && (cur.day || 0) >= 2) {
                  cur.openSea?.();
                }
                const res = mainStore.getState().goToSea?.();
                if (res !== "ok") {
                  return { ok: false, reason: res || "CANNOT_GO_SEA" };
                }
              }
            } else if (target === "benDo" || target === "ben") {
              if (cur.screen !== "benDo") {
                if (cur.indoors) cur.leaveHouse?.();
                mainStore.setState({ screen: "benDo", panel: null, shop: null, vendor: null, indoors: false });
              }
            }
            return { ok: true, screen: mainStore.getState().screen };
          }
          case "FARM_SUBAREA_STEP": {
            if (!payload.subAreaId || !payload.config) return { ok: false, error: "INVALID_PAYLOAD" };
            const res = execFarmSubAreaStep(payload.subAreaId, payload.config);
            return { ok: true, ...res };
          }
          case "SEA_STEP": {
            if (!payload.config) return { ok: false, error: "NO_CONFIG" };
            const res = execSeaStep(payload.config);
            return { ok: true, ...res };
          }
          case "BEN_STEP": {
            if (!payload.config) return { ok: false, error: "NO_CONFIG" };
            const res = execBenStep(payload.config);
            return { ok: true, ...res };
          }
          case "SLEEP_NOW": {
            const mainState = mainStore.getState();
            if ((mainState.fishing?.basket?.length || 0) > 0) {
              mainState.sellBasket?.();
            }
            dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
            if (mainStore.getState().screen !== "playing") {
              mainStore.getState().showWorldMap?.();
              mainStore.getState().enterFarm?.();
            }
            mainStore.setState({
              screen: "playing",
              panel: null,
              shop: null,
              vendor: null,
              plotOffer: null,
              zoneOffer: null,
              phone: null,
              announcement: null,
              tip: null,
              call: null
            });
            const st = mainStore.getState();
            if (!st.indoors) {
              st.enterHouse?.();
            }
            const prevDay = mainStore.getState().day || 0;
            if ((mainStore.getState().minutes || 0) >= 1140) {
              mainStore.getState().goToSleep?.();
              mainStore.getState().sleepThrough?.();
            }
            if (mainStore.getState().day === prevDay) {
              mainStore.getState().nextMorning?.();
            }
            mainStore.getState().stopSleeping?.();
            const afterDay = mainStore.getState().day || 0;
            return { ok: afterDay > prevDay, day: afterDay };
          }
          default:
            return { ok: false, error: "UNKNOWN_ACTION" };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        return { ok: false, error: errorMsg };
      }
    }
    window.addEventListener("message", (e) => {
      if (e.source !== window || !e.data || e.data.source !== "ntg-content") return;
      const { id, type, action, payload } = e.data;
      if (type === "GET_GAME_STATE") {
        const snap = getSnapshot();
        window.postMessage({ source: "ntg-page", id, type: "GAME_STATE_RESULT", data: snap }, "*");
      } else if (type === "EXEC_GAME_ACTION" && action) {
        const res = execAction(action, payload);
        window.postMessage({ source: "ntg-page", id, type: "GAME_ACTION_RESULT", data: res }, "*");
      }
    });
  })();
})();
//# sourceMappingURL=page-hook.js.map
