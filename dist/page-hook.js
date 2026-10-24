"use strict";
(() => {
  // src/page-hook/core/engine-access.ts
  var stores = {
    main: null,
    sea: null,
    benUI: null,
    benNet: null
  };
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
    WebSocket.prototype.send = function(data) {
      try {
        if (this && typeof this.url === "string" && this.url.includes("/ws/ben-do")) {
          benWs = this;
          window.__ntg_benWs = this;
        }
      } catch (_) {
      }
      return origSend.apply(this, arguments);
    };
  } catch (_) {
  }
  function sendBenWs(obj) {
    if (!benWs || benWs.readyState !== WebSocket.OPEN) {
      try {
        const sc = getActiveScene("BenDoScene");
        if (sc && typeof sc.announce === "function") {
          sc.announce();
        }
      } catch (_) {
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
    if (window.__ntg_phaserGame && window.__ntg_phaserGame.scene) {
      phaserGame = window.__ntg_phaserGame;
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
      Array.prototype.push = function(first) {
        try {
          if (first && typeof first === "object" && first.sys && first.sys.game && first.sys.game.scene) {
            phaserGame = first.sys.game;
            window.__ntg_phaserGame = phaserGame;
            restore();
          }
        } catch (_) {
        }
        return origPush.apply(this, arguments);
      };
      setTimeout(restore, 1500);
    } catch (_) {
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
    } catch (_) {
      return null;
    }
  }
  function classifyStore(candidate) {
    if (!candidate || typeof candidate.getState !== "function" || typeof candidate.setState !== "function") {
      return;
    }
    let st;
    try {
      st = candidate.getState();
    } catch (_) {
      return;
    }
    if (!st || typeof st !== "object") return;
    if ("plots" in st && "fullness" in st && "applyTool" in st && "cook" in st) {
      stores.main = candidate;
    } else if ("phase" in st && "spot" in st && "float" in st && "landed" in st && !("status" in st)) {
      stores.sea = candidate;
    } else if ("teaStand" in st && "closetSlot" in st && "spot" in st) {
      stores.benUI = candidate;
    } else if ("status" in st && "fishing" in st && "wallet" in st && "basket" in st) {
      stores.benNet = candidate;
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
      for (const k of Object.keys(el)) {
        if (k.startsWith("__reactContainer$") || k.startsWith("__reactFiber$")) {
          if (el[k]) queue.push(el[k]);
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
          if (ms.store) classifyStore(ms.store);
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
        const tr = getActiveTrend(m.day);
        if (!tr) return null;
        const quota = getTrendQuota(tr.goods, m.day, Object.keys(m.plots || {}).length, m.trendLog);
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
      const stAfter = stores.main.getState();
      if (stAfter.call) {
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
    const m = stores.main?.getState();
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
      const curM = stores.main.getState();
      const maxSlots = (curM.houseLevel || 0) >= 1 ? 2 : 1;
      const cookingNow = curM.kitchen?.cooking?.length || 0;
      if (cookingNow < maxSlots) {
        const dishes = [
          cfg.preferDish || "comTam",
          "comTam",
          "eggBread",
          "radishSoup",
          "carrotJuice",
          "grilledCorn",
          "boiledEgg",
          "cornCake"
        ];
        const dishCropMap = {
          radishSoup: { crop: "radish", need: 3 },
          carrotJuice: { crop: "carrot", need: 2 },
          grilledCorn: { crop: "corn", need: 2 },
          comTam: { crop: "rice", need: 2 },
          cornCake: { crop: "corn", need: 2 }
        };
        const seen = /* @__PURE__ */ new Set();
        for (const d of dishes) {
          if (!d || seen.has(d)) continue;
          seen.add(d);
          if (!curM.kitchen?.known?.includes(d)) continue;
          if ((curM.kitchen?.stock?.[d] || 0) >= 3) continue;
          const ing = dishCropMap[d];
          if (ing && curM.order && curM.order.crop === ing.crop && !(curM.day === 2 && !curM.firstDay?.cooked)) {
            const have = curM.produce?.[ing.crop] || 0;
            if (have < curM.order.qty + ing.need) continue;
          }
          if (curM.cook?.(d) === "ok") {
            return { acted: true, msg: `\u{1F373} \u0110\xE3 b\u1EAFc b\u1EBFp n\u1EA5u m\xF3n ${dishNames[d] || d}` };
          }
        }
      }
    }
    const thH = Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 45;
    const thT = Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 45;
    const thB = Number(cfg.batteryThreshold) || 35;
    if (cfg.autoRecoverHunger !== false && cfg.autoRecoverNeeds !== false) {
      const stH = stores.main.getState();
      if (stH.fullness < thH && canAct("farm_eat", 3500)) {
        const foodSource = cfg.foodSource || "kitchen_first";
        if (foodSource !== "shop_only") {
          const dishOrder = cfg.preferDish && cfg.preferDish !== "auto" ? [cfg.preferDish, "comTam", "eggBread", "radishSoup", "grilledCorn", "boiledEgg", "cornCake", "carrotJuice"] : ["comTam", "eggBread", "radishSoup", "grilledCorn", "boiledEgg", "cornCake", "carrotJuice"];
          const dishLabels = {
            comTam: "C\u01A1m t\u1EA5m \u{1F35B}",
            eggBread: "B\xE1nh m\xEC tr\u1EE9ng \u{1F96A}",
            radishSoup: "Canh c\u1EE7 c\u1EA3i \u{1F372}",
            grilledCorn: "B\u1EAFp n\u01B0\u1EDBng \u{1F33D}",
            boiledEgg: "Tr\u1EE9ng lu\u1ED9c \u{1F95A}",
            cornCake: "B\xE1nh b\u1EAFp \u{1F96E}",
            carrotJuice: "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t \u{1F9C3}"
          };
          for (const d of dishOrder) {
            if ((stH.kitchen?.stock?.[d] || 0) > 0 && stH.eatDish?.(d) === true) {
              markActed("farm_eat");
              return { acted: true, msg: `\u{1F372} \u0110\xE3 \u0103n ${dishLabels[d] || d} trong b\u1EBFp h\u1ED3i \u0110\xF3i (${stH.fullness}%)` };
            }
          }
        }
        if (foodSource !== "kitchen_only") {
          const prefShop = cfg.preferFoodShop || "banhMiThit";
          const shopItems = [prefShop, "banhMiThit", "banhMiCha", "banhMiTrung", "banhBao", "banhMiFull"];
          const prices = { banhMiThit: 15e3, banhMiCha: 15e3, banhMiTrung: 1e4, banhBao: 8e3, banhMiFull: 25e3 };
          const shopLabels = {
            banhMiThit: "B\xE1nh m\xEC th\u1ECBt \u{1F956}",
            banhMiCha: "B\xE1nh m\xEC ch\u1EA3 c\xE1 \u{1F41F}",
            banhMiTrung: "B\xE1nh m\xEC tr\u1EE9ng \u{1F373}",
            banhBao: "B\xE1nh bao \u{1F95F}",
            banhMiFull: "B\xE1nh m\xEC full topping \u{1F924}"
          };
          for (const item of shopItems) {
            if (stH.gold >= (prices[item] || 8e3) && stH.buyFood?.(item) === "ok") {
              markActed("farm_eat");
              return { acted: true, msg: `\u{1F956} \u0110\xE3 mua & \u0103n ${shopLabels[item] || item} t\u1EA1i Ti\u1EC7m b\xE1nh h\u1ED3i \u0110\xF3i` };
            }
          }
        }
      }
    }
    if (cfg.autoRecoverThirst !== false && cfg.autoRecoverNeeds !== false) {
      const stT = stores.main.getState();
      if (stT.hydration < thT && canAct("farm_drink", 3500)) {
        const drinkSource = cfg.drinkSource || "kitchen_first";
        if (drinkSource !== "shop_only") {
          for (const d of ["carrotJuice", "radishSoup"]) {
            if ((stT.kitchen?.stock?.[d] || 0) > 0 && stT.eatDish?.(d) === true) {
              markActed("farm_drink");
              return { acted: true, msg: `\u{1F9C3} \u0110\xE3 u\u1ED1ng ${d === "carrotJuice" ? "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t" : "Canh c\u1EE7 c\u1EA3i"} gi\u1EA3i Kh\xE1t (${stT.hydration}%)` };
            }
          }
        }
        if (drinkSource !== "kitchen_only") {
          const prefDrink = cfg.preferDrinkShop || "nuocMia";
          const drinkPrices = { traDao: 15e3, traSua: 18e3, nuocMia: 8e3, caPheSua: 12e3, traDa: 3e3 };
          const drinkLabels = {
            nuocMia: "N\u01B0\u1EDBc m\xEDa \u{1F964}",
            traDao: "Tr\xE0 \u0111\xE0o cam s\u1EA3 \u{1F351}",
            traSua: "Tr\xE0 s\u1EEFa tr\xE2n ch\xE2u \u{1F9CB}",
            caPheSua: "C\xE0 ph\xEA s\u1EEFa \u0111\xE1 \u2615",
            traDa: "Tr\xE0 \u0111\xE1 \u{1F9CA}"
          };
          const drinkOrder = [prefDrink, "nuocMia", "traDa", "traDao", "traSua", "caPheSua"];
          for (const dr of drinkOrder) {
            if (stT.gold >= (drinkPrices[dr] || 3e3) && stT.buyFood?.(dr) === "ok") {
              markActed("farm_drink");
              return { acted: true, msg: `\u{1F964} \u0110\xE3 mua & u\u1ED1ng ${drinkLabels[dr] || dr} gi\u1EA3i Kh\xE1t` };
            }
          }
        }
      }
    }
    if (cfg.autoMorningCoffee !== false && cfg.autoRecoverNeeds !== false) {
      const stC = stores.main.getState();
      if (stC.coffeeDay !== stC.day && stC.gold >= 3e4 && canAct("farm_coffee", 4e3) && stC.buyFood?.("caPheSua") === "ok") {
        markActed("farm_coffee");
        return { acted: true, msg: `\u2615 \u0110\xE3 u\u1ED1ng C\xE0 ph\xEA s\u1EEFa \u0111\xE1 (+25% n\u01B0\u1EDBc, ch\u1EA1y nhanh su\u1ED1t ng\xE0y)` };
      }
    }
    if (cfg.autoChargeVehicle !== false && cfg.autoRecoverNeeds !== false) {
      const stE = stores.main.getState();
      if (stE.vehicle && stE.battery < thB && stE.gold >= 35e3 && canAct("farm_vehicle", 4e3)) {
        const charged = stE.chargeVehicle?.();
        if (typeof charged === "number" && charged > 0) {
          markActed("farm_vehicle");
          return { acted: true, msg: `\u{1F50B} \u0110\xE3 s\u1EA1c \u0111\u1EA7y pin xe \u0111i\u1EC7n (-${charged.toLocaleString("vi-VN")}\u0111)` };
        }
      }
    }
    if (m.salonOpen) {
      if (cfg.autoSalonShampoo !== false) {
        const stSal = stores.main.getState();
        const hasRelax = (stSal.kitchen?.buffs || []).some((b) => b.kind === "relax" && b.day === stSal.day);
        if (!hasRelax && stSal.gold >= 15e4 && stSal.shampoo?.() === "ok") {
          return { acted: true, msg: `\u{1F486} \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y g\u1ED9i \u0111\u1EA7u d\u01B0\u1EE1ng sinh (Buff th\u01B0 gi\xE3n)` };
        }
      }
      if (cfg.autoSalonWhiten) {
        const stW = stores.main.getState();
        if ((stW.player?.outfit?.tan || 0) > 0 && stW.gold >= 3e5 && stW.whiten?.() === "ok") {
          return { acted: true, msg: `\u2728 \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y t\u1EAFm tr\u1EAFng n\xE2ng t\xF4ng da` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/crops.ts
  function handleCropsSubArea(cfg) {
    const st = stores.main?.getState();
    if (!st) return { acted: false };
    const mainScene = getActiveScene("MainScene");
    const plotKeys = Object.keys(st.plots || {});
    const cropNames = { radish: "C\u1EE7 c\u1EA3i", carrot: "C\xE0 r\u1ED1t", corn: "B\u1EAFp ng\xF4", rice: "L\xFAa th\u01A1m" };
    const applyOnPlot = (key, tool) => {
      const s0 = stores.main.getState();
      s0.setActiveTool?.(tool);
      const prevPlotRef = s0.plots?.[key];
      if (mainScene && typeof mainScene.doWork === "function") {
        try {
          mainScene.doWork({ plot: key, tool });
        } catch (_) {
        }
        if (stores.main.getState().plots?.[key] !== prevPlotRef) {
          return true;
        }
      }
      const res = stores.main.getState().applyTool?.(key, tool);
      if (res && mainScene?.plots?.playEffect) {
        try {
          mainScene.plots.playEffect(res, key);
        } catch (_) {
        }
      }
      return Boolean(res);
    };
    if (cfg.autoHarvest !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "basket")) {
          const cropId = st.plots[key]?.crop?.id;
          if (applyOnPlot(key, "basket")) {
            return { acted: true, msg: `\u{1F9FA} Thu ho\u1EA1ch ${cropNames[cropId] || "n\xF4ng s\u1EA3n"} \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoPesticide !== false) {
      for (const key of plotKeys) {
        const p = st.plots[key];
        if (p && p.crop && p.crop.pests) {
          if ((st.items?.pesticide || 0) <= 0 && st.gold >= 8e3) {
            st.buyItems?.({ fertilizer: 0, pesticide: 1, mysteryBag: 0 });
          }
          if ((stores.main.getState().items?.pesticide || 0) > 0 && applyOnPlot(key, "pesticide")) {
            return { acted: true, msg: `\u{1F41B} \u0110\xE3 x\u1ECBt thu\u1ED1c tr\u1EEB s\xE2u \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoPlant !== false) {
      const hasEmptyPlot = plotKeys.some((k) => st.plots[k] && !st.plots[k].crop);
      if (hasEmptyPlot) {
        if ((st.items?.mysteryBag || 0) > 0) {
          const opened = st.consumeItem?.("mysteryBag");
          if (opened) {
            return { acted: true, msg: `\u{1F381} \u0110\xE3 m\u1EDF T\xFAi h\u1EA1t b\xED \u1EA9n nh\u1EADn th\xEAm h\u1EA1t gi\u1ED1ng` };
          }
        }
        const ensureSeed = (cropId) => {
          if (!cropId) return null;
          const cur = stores.main.getState();
          if ((cur.seeds?.[cropId] || 0) > 0) return cropId;
          const payload = { radish: 0, carrot: 0, corn: 0, rice: 0 };
          if (!(cropId in payload)) return null;
          payload[cropId] = 1;
          if (cur.buySeeds?.(payload) === true && (stores.main.getState().seeds?.[cropId] || 0) > 0) {
            return cropId;
          }
          return null;
        };
        const countGrowingCrop = (cropId) => {
          const cur = stores.main.getState();
          let count = 0;
          for (const k of Object.keys(cur.plots || {})) {
            if (cur.plots[k]?.crop?.id === cropId) count++;
          }
          return count;
        };
        const chooseSeed = () => {
          const cur = stores.main.getState();
          const pref = cfg.preferSeed || "auto";
          if (pref !== "auto") {
            const gotPref = ensureSeed(pref);
            if (gotPref) return gotPref;
          }
          if (cur.order && cur.order.crop) {
            const c = cur.order.crop;
            const projected = (cur.produce?.[c] || 0) + countGrowingCrop(c) * 4;
            if (projected < cur.order.qty) {
              const got = ensureSeed(c);
              if (got) return got;
            }
          }
          if (Array.isArray(cur.daily?.tasks)) {
            for (const task of cur.daily.tasks) {
              if (!task.claimed && task.kind === "harvest" && task.crop) {
                const harvestedNow = (cur.stats?.harvested?.[task.crop] || 0) - (task.base || 0);
                if (harvestedNow + countGrowingCrop(task.crop) * 4 < task.need) {
                  const got = ensureSeed(task.crop);
                  if (got) return got;
                }
              }
            }
          }
          if (Array.isArray(cur.village?.requests)) {
            for (const req of cur.village.requests) {
              if (!req.done && req.goods && req.goods !== "egg") {
                const projected = (cur.produce?.[req.goods] || 0) + countGrowingCrop(req.goods) * 4;
                if (projected < req.qty) {
                  const got = ensureSeed(req.goods);
                  if (got) return got;
                }
              }
            }
          }
          if (cur.day <= 2 && !cur.firstDay?.cooked && (cur.produce?.radish || 0) + countGrowingCrop("radish") * 4 < 3) {
            const got = ensureSeed("radish");
            if (got) return got;
          }
          const order = ["rice", "corn", "carrot", "radish"];
          for (const c of order) {
            if ((cur.seeds?.[c] || 0) > 0) return c;
          }
          for (const c of order) {
            const got = ensureSeed(c);
            if (got) return got;
          }
          return null;
        };
        for (const key of plotKeys) {
          const p = stores.main.getState().plots[key];
          if (p && !p.crop) {
            const seed = chooseSeed();
            if (seed && applyOnPlot(key, `seed:${seed}`)) {
              return { acted: true, msg: `\u{1F331} \u0110\xE3 gieo h\u1EA1t ${cropNames[seed] || seed} \xF4 (${key})` };
            }
            break;
          }
        }
      }
    }
    if (cfg.autoWater !== false) {
      const curSt = stores.main.getState();
      for (const key of plotKeys) {
        if (curSt.previewTool?.(key, "wateringCan")) {
          if (applyOnPlot(key, "wateringCan")) {
            return { acted: true, msg: `\u{1F4A7} \u0110\xE3 t\u01B0\u1EDBi n\u01B0\u1EDBc \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoFertilize) {
      const curSt = stores.main.getState();
      for (const key of plotKeys) {
        const p = curSt.plots[key];
        if (p && p.crop && !p.crop.fertilized && curSt.previewTool?.(key, "fertilizer")) {
          if ((curSt.items?.fertilizer || 0) <= 0 && curSt.gold >= 15e3) {
            curSt.buyItems?.({ fertilizer: 1, pesticide: 0, mysteryBag: 0 });
          }
          if ((stores.main.getState().items?.fertilizer || 0) > 0 && applyOnPlot(key, "fertilizer")) {
            return { acted: true, msg: `\u2728 \u0110\xE3 b\xF3n ph\xE2n NPK \xF4 (${key})` };
          }
        }
      }
    }
    const curSt2 = stores.main.getState();
    if (curSt2.helpers?.crops?.hired && (curSt2.helpers.crops.unpaid || 0) > 0) {
      if (curSt2.payHelper?.("crops") === true) {
        return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng n\u1EE3 cho T\xE8o ph\u1EE5 ru\u1ED9ng` };
      }
    }
    const curSt3 = stores.main.getState();
    if (cfg.autoBuyPlots !== false && curSt3.plotOffer && curSt3.gold >= (curSt3.plotOffer.price || 0)) {
      if (curSt3.buyPlot?.() === true) {
        return { acted: true, msg: `\u{1F331} \u0110\xE3 mua th\xEAm \xF4 \u0111\u1EA5t ru\u1ED9ng m\u1EDBi (+1 \xF4)` };
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/animals.ts
  function handlePetSubArea(cfg) {
    const m = stores.main?.getState();
    if (!m) return { acted: false };
    if (m.pets?.pet?.away) {
      m.pickUpPet?.();
      if (!stores.main.getState().pets?.pet?.away) {
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
        if (stores.main.getState().buyPetFood?.(sf, 1) === "ok") {
          const res = stores.main.getState().feedPet?.(sf);
          if (res === "ok" || res === "fav") {
            return { acted: true, msg: `\u{1F9B4} \u0110\xE3 mua \u0111\u1ED3 \u0103n & cho th\xFA c\u01B0ng (${pet.name || "B\xE9"}) \u0103n` };
          }
        }
      }
    }
    const curM = stores.main.getState();
    const curPet = curM.pets?.pet;
    if (cfg.petAutoCuddle !== false && curPet) {
      const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
      if (cuddlesToday < 3 && curM.cuddlePet?.() === "ok") {
        return { acted: true, msg: `\u{1F495} \u0110\xE3 vu\u1ED1t ve th\xFA c\u01B0ng (${cuddlesToday + 1}/3)` };
      }
    }
    const curM2 = stores.main.getState();
    if (cfg.petAutoBath !== false && curM2.bathPet?.() === "ok") {
      return { acted: true, msg: `\u{1F6C1} \u0110\xE3 t\u1EAFm th\u01A1m tho cho th\xFA c\u01B0ng` };
    }
    const curM3 = stores.main.getState();
    const curPet3 = curM3.pets?.pet;
    if (cfg.petAutoTrick !== false && curPet3) {
      if (curPet3.playDay !== curM3.day && curM3.pets?.gear?.includes("ball")) {
        if (curM3.doTrick?.("fetch") === "ok") {
          return { acted: true, msg: `\u{1F3BE} Ch\u01A1i n\xE9m b\xF3ng c\xF9ng th\xFA c\u01B0ng (+8 tim)` };
        }
      }
      if (curPet3.trickDay !== curM3.day) {
        const tricks = ["dance", "roll", "paw", "sit", "come"];
        for (const tr of tricks) {
          if (curM3.doTrick?.(tr) === "ok") {
            return { acted: true, msg: `\u{1F3BE} T\u1EADp tr\xF2 "${tr}" c\xF9ng th\xFA c\u01B0ng` };
          }
        }
      }
    }
    return { acted: false };
  }
  function handleBarnSubArea(cfg) {
    const m = stores.main?.getState();
    if (!m) return { acted: false };
    if (cfg.barnAutoFeedBuffalo !== false && cfg.barnAutoBuffalo !== false && m.buffalo?.home) {
      if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day) {
        if (m.feedBuffalo?.() === "ok") {
          return { acted: true, msg: `\u{1F403} \u0110\xE3 cho Tr\xE2u \u0103n r\u01A1m` };
        }
      }
    }
    const stB = stores.main.getState();
    if (cfg.barnAutoBathBuffalo !== false && cfg.barnAutoBuffalo !== false && stB.buffalo?.home) {
      if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day) {
        if (stB.bathBuffalo?.() === "ok") {
          return { acted: true, msg: `\u{1F6BF} \u0110\xE3 t\u1EAFm m\xE1t cho Tr\xE2u` };
        }
      }
    }
    const stB2 = stores.main.getState();
    if (cfg.barnAutoLendBuffalo !== false && stB2.buffalo?.home && stB2.buffalo.lentDay !== stB2.day && (stB2.buffalo?.mood || 0) >= 50) {
      if (stB2.lendBuffalo?.() === "ok") {
        return { acted: true, msg: `\u{1F91D} \u0110\xE3 cho b\xE0 con thu\xEA Tr\xE2u c\xE0y ru\u1ED9ng` };
      }
    }
    const stC = stores.main.getState();
    if (cfg.barnAutoFeedCows !== false && Array.isArray(stC.dairy?.cows) && stC.dairy.cows.some((c) => c.fedDay !== stC.day)) {
      if (stC.feedCows?.() === "ok") {
        return { acted: true, msg: `\u{1F404} \u0110\xE3 cho \u0111\xE0n B\xF2 s\u1EEFa \u0103n c\u1ECF` };
      }
    }
    const stC2 = stores.main.getState();
    if (cfg.barnAutoCureCows !== false && Array.isArray(stC2.dairy?.cows)) {
      for (const cow of stC2.dairy.cows) {
        if (cow.sickDay > 0) {
          if ((stC2.dairy.medicine || 0) <= 0 && stC2.gold >= 8e4) {
            stC2.buyMedicine?.();
          }
          if (stores.main.getState().cureCow?.(cow.id) === "ok") {
            return { acted: true, msg: `\u{1F48A} \u0110\xE3 ti\xEAm thu\u1ED1c ch\u1EEFa b\u1EC7nh cho B\xF2 ${cow.name || "#" + cow.id}` };
          }
        }
      }
    }
    const stC3 = stores.main.getState();
    if (cfg.barnAutoSellMilk !== false && (stC3.dairy?.milk || 0) > 0) {
      const res = stC3.sellMilk?.();
      if (res && res.liters > 0) {
        return {
          acted: true,
          msg: `\u{1F95B} \u0110\xE3 v\u1EAFt & b\xE1n ${res.liters} l\xEDt s\u1EEFa b\xF2 (+${res.total.toLocaleString("vi-VN")}\u0111)`
        };
      }
    }
    const stC4 = stores.main.getState();
    if (cfg.barnAutoPayHelper !== false) {
      if (stC4.helpers?.buffalo?.hired && (stC4.helpers.buffalo.unpaid || 0) > 0) {
        if (stC4.payHelper?.("buffalo") === true) {
          return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng anh T\xE2m ch\u0103n tr\xE2u` };
        }
      }
      const stC5 = stores.main.getState();
      if (stC5.helpers?.dairy?.hired && (stC5.helpers.dairy.unpaid || 0) > 0) {
        if (stC5.payHelper?.("dairy") === true) {
          return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\u1ECB M\u1EADn ch\u0103m b\xF2` };
        }
      }
    }
    return { acted: false };
  }
  function handleCoopSubArea(cfg) {
    const m = stores.main?.getState();
    if (!m || !m.unlockedZones?.includes("poultry")) return { acted: false };
    if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
      const got = m.collectEggs?.();
      if (typeof got === "number" && got > 0) {
        return { acted: true, msg: `\u{1F95A} \u0110\xE3 nh\u1EB7t ${got} qu\u1EA3 tr\u1EE9ng g\xE0 trong \u1ED5` };
      }
    }
    const stG = stores.main.getState();
    const maxHens = [4, 6, 9, 12][stG.coopLevel || 0] || 4;
    if (cfg.coopAutoBuyChick && !stG.flu && (stG.hens?.length || 0) < maxHens && stG.gold >= 6e4) {
      if (stG.buyChick?.() === "ok") {
        return {
          acted: true,
          msg: `\u{1F424} \u0110\xE3 mua th\xEAm 1 g\xE0 con v\xE0o chu\u1ED3ng (${(stG.hens?.length || 0) + 1}/${maxHens})`
        };
      }
    }
    const stG2 = stores.main.getState();
    if (cfg.coopAutoPayHelper !== false && stG2.helpers?.poultry?.hired && (stG2.helpers.poultry.unpaid || 0) > 0) {
      if (stG2.payHelper?.("poultry") === true) {
        return { acted: true, msg: `\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\xFA Ba ch\u0103m g\xE0` };
      }
    }
    return { acted: false };
  }
  function handlePondSubArea(cfg) {
    const m = stores.main?.getState();
    if (!m || !m.pond?.ready) return { acted: false };
    if (m.notebook?.found && !m.pond.noteRead) {
      m.readPondNote?.();
    }
    const matureDays = { ro: 3, tre: 5, chep: 7 };
    const fishNames = { chep: "C\xE1 ch\xE9p", tre: "C\xE1 tr\xEA", ro: "C\xE1 r\xF4" };
    if (cfg.pondAutoNet !== false && Array.isArray(m.pond.fish) && m.pond.fish.some((f) => (f.days || 0) >= (matureDays[f.id] || 7))) {
      const res = m.netFish?.();
      if (res && res.n > 0) {
        return {
          acted: true,
          msg: `\u{1F41F} \u0110\xE3 k\xE9o l\u01B0\u1EDBi b\xE1n ${res.n} con c\xE1 ao (+${res.total.toLocaleString("vi-VN")}\u0111)`
        };
      }
    }
    const stP = stores.main.getState();
    if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stP.pond.fish.length < 12) {
      const fishType = cfg.preferPondFish || "chep";
      if (stP.stockFish?.(fishType) === "ok") {
        return {
          acted: true,
          msg: `\u{1F41F} \u0110\xE3 th\u1EA3 gi\u1ED1ng ${fishNames[fishType] || fishType} xu\u1ED1ng ao (${stP.pond.fish.length + 1}/12)`
        };
      }
    }
    const stP2 = stores.main.getState();
    if (cfg.pondAutoFeed !== false && (stP2.pond?.fish?.length || 0) > 0 && stP2.pond.fedDay !== stP2.day && stP2.pond.bebi !== "helper") {
      if (stP2.feedFish?.() === "ok") {
        return { acted: true, msg: `\u{1F35E} \u0110\xE3 r\u1EA3i c\xE1m cho \u0111\xE0n c\xE1 trong ao \u0103n` };
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
        let w = GOLD_WAVES.find((x) => (total -= x.weight) < 0) || GOLD_WAVES[0];
        n.kind = w.kind;
        n.drift = w.drift;
        n.waveLeft = w.len[0] + Math.floor(n.r() * (w.len[1] - w.len[0] + 1));
      }
      n.waveLeft--;
      let t = Math.floor(e / 2) + 1;
      let r = (t - 1) % 120 + 1;
      n.bump = e % 2 === 0 && r === 10 && t > 120 ? _G_B : n.bump * _G_X;
      n.x += n.drift + _G_A * _goldNorm(n.r) - _G_V * (n.x - _G_Y * e);
      n.index.push(n.x + n.bump);
      n.wave.push(n.kind);
      for (let g of GOLD_DATA) {
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
    const m = stores.main?.getState();
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
    const stV = stores.main.getState();
    if (cfg.autoVillageBoard !== false) {
      if (stV.village?.newsDay > 0 && !stV.village?.met) {
        stV.meetKhang?.();
      }
      const curV = stores.main.getState();
      if (Array.isArray(curV.village?.requests)) {
        for (const req of curV.village.requests) {
          if (!req.done) {
            const have = req.goods === "egg" ? curV.eggs || 0 : curV.produce?.[req.goods] || 0;
            if (have >= req.qty && curV.deliverRequest?.(req.id) === true) {
              return {
                acted: true,
                msg: `\u{1F4CB} \u0110\xE3 giao ${req.qty} ${cropNames[req.goods] || req.goods} gi\xFAp ${req.who} (B\u1EA3ng tin l\xE0ng)`
              };
            }
          }
        }
      }
    }
    const stT = stores.main.getState();
    if (cfg.autoSellTrend !== false) {
      const curTrend = getActiveTrend(stT.day);
      if (curTrend) {
        const plotCount = Object.keys(stT.plots || {}).length;
        const quota = getTrendQuota(curTrend.goods, stT.day, plotCount, stT.trendLog);
        if (quota > 0) {
          const have = curTrend.goods === "egg" ? stT.eggs || 0 : stT.produce?.[curTrend.goods] || 0;
          const reserved = stT.order && stT.order.crop === curTrend.goods ? stT.order.qty : 0;
          const sellable = Math.max(0, have - reserved);
          const toSell = Math.min(sellable, quota);
          if (toSell > 0) {
            const sold = stT.sellQty?.(curTrend.goods, toSell);
            if (sold > 0) {
              return {
                acted: true,
                msg: `\u{1F525} \u0110\xE3 b\xE1n \u0111\xFAng ${sold} ${cropNames[curTrend.goods] || curTrend.goods} theo Trend s\u1ED1t d\u1EBBo (x2 gi\xE1)`
              };
            }
          }
        }
      }
    }
    const stS = stores.main.getState();
    if (cfg.autoSellDailyTask !== false) {
      const sellTask = (stS.daily?.tasks || []).find(
        (t) => !t.claimed && t.kind === "sell" && (stS.stats?.earned || 0) - (t.base || 0) < t.need
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
              const missing = sellTask.need - ((stS.stats?.earned || 0) - (sellTask.base || 0));
              const unitPrice = item === "egg" ? 1e3 : stS.prices?.[item] || 500;
              qtyToSell = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
            }
            const sold = stS.sellQty?.(item, qtyToSell);
            if (sold > 0) {
              return {
                acted: true,
                msg: `\u{1F4CB} \u0110\xE3 b\xE1n ${sold} ${cropNames[item] || item} \u0111\u1EC3 ho\xE0n th\xE0nh Vi\u1EC7c S\u1ED5 tay h\xF4m nay`
              };
            }
          }
        }
      }
    }
    const stSurplus = stores.main.getState();
    if (cfg.autoSellProduce === true) {
      const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 20);
      const items = ["rice", "corn", "carrot", "radish", "egg"];
      for (const item of items) {
        const have = item === "egg" ? stSurplus.eggs || 0 : stSurplus.produce?.[item] || 0;
        const reserved = (stSurplus.order && stSurplus.order.crop === item ? stSurplus.order.qty : 0) + minKeep;
        const sellable = have - reserved;
        if (sellable > 0) {
          const sold = stSurplus.sellQty?.(item, sellable);
          if (sold > 0) {
            return {
              acted: true,
              msg: `\u{1F3EA} \u0110\xE3 b\xE1n ${sold} ${cropNames[item] || item} n\xF4ng s\u1EA3n d\u01B0 (gi\u1EEF l\u1EA1i ${minKeep})`
            };
          }
        }
      }
    }
    const stG = stores.main.getState();
    if (stG.goldShop && (stG.goldShop.newsDay > 0 || stG.day >= 30)) {
      if (cfg.goldAutoSell !== false) {
        const targetProfitPct = Number(cfg.goldProfitPercent) || 10;
        for (const type of ["mieng", "nhan", "k18", "non"]) {
          const holding = stG.goldShop.hold?.[type];
          if (holding && holding.qty > 0 && holding.cost > 0) {
            const costPerUnit = holding.cost / holding.qty;
            const sellPrice = getGoldSellPrice(stG.goldShop.seed, type, stG.day, stG.minutes);
            const profitPerUnit = sellPrice - costPerUnit;
            const profitPct = profitPerUnit / costPerUnit * 100;
            if (profitPct >= targetProfitPct && canAct("farm_gold", 3500)) {
              const profit = stG.sellGold?.(type, holding.qty);
              if (profit !== null && profit !== void 0) {
                markActed("farm_gold");
                return {
                  acted: true,
                  msg: `\u{1FA99} \u0110\xE3 b\xE1n ch\u1ED1t l\u1EDDi ${holding.qty} ch\u1EC9 ${GOLD_CATALOG[type]?.name || type} t\u1EA1i Ti\u1EC7m V\xE0ng C\xF4 Kim (+${profit.toLocaleString("vi-VN")}\u0111, l\xE3i ${Math.round(profitPct)}%)`
                };
              }
            }
          }
        }
      }
      if (cfg.goldAutoBuy && canAct("farm_gold", 3500)) {
        const prefType = cfg.goldPreferType || "mieng";
        const keepCash = Number(cfg.goldKeepCash) || 5e5;
        const buyPrice = getGoldBuyPrice(stG.goldShop.seed, prefType, stG.day, stG.minutes);
        if (buyPrice > 0 && stG.gold - buyPrice >= keepCash) {
          const res = stG.buyGold?.(prefType, 1);
          if (res === "ok") {
            markActed("farm_gold");
            return {
              acted: true,
              msg: `\u{1FA99} \u0110\xE3 mua 1 ch\u1EC9 ${GOLD_CATALOG[prefType]?.name || prefType} \u0111\u1EA7u t\u01B0 t\u1EA1i Ti\u1EC7m V\xE0ng C\xF4 Kim (-${buyPrice.toLocaleString("vi-VN")}\u0111)`
            };
          }
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/farm/tasks.ts
  function handleDiBaySubArea(cfg) {
    const m = stores.main?.getState();
    if (!m) return { acted: false };
    const stP0 = stores.main.getState();
    if (stP0.savings && (stP0.savings.newsDay || 0) <= 0) {
      if ((stP0.savings.pig?.amount || 0) > 0 || stP0.day >= 14) {
        stores.main.setState((e) => ({
          savings: { ...e.savings, newsDay: Math.max(1, e.day) }
        }));
      }
    }
    if (cfg.autoFirstDayTasks !== false) {
      if (!m.firstDay?.incense) {
        if (m.lightIncense?.() === "first") {
          return { acted: true, msg: `\u{1F64F} \u0110\xE3 th\u1EAFp nhang b\xE0n th\u1EDD \xD4ng N\u0103m` };
        }
      }
      const stF = stores.main.getState();
      if (stF.firstDay?.incense && !stF.firstDay?.sproutHarvested) {
        if (!stF.firstDay.sprout) {
          if (stF.plantSprouts?.() === "ok") {
            return { acted: true, msg: `\u{1F331} \u0110\xE3 gieo khay rau m\u1EA7m c\u1EA1nh nh\xE0` };
          }
        } else if (stF.harvestSprouts?.() === true) {
          return { acted: true, msg: `\u{1F33F} \u0110\xE3 thu ho\u1EA1ch khay rau m\u1EA7m (+4 c\u1EE7 c\u1EA3i)` };
        }
      }
      const stF2 = stores.main.getState();
      if ((stF2.firstDay?.cleared?.length || 0) < 5) {
        for (let i = 0; i < 5; i++) {
          if (!stF2.firstDay.cleared.includes(i)) {
            const cleared = stF2.clearDebris?.(i);
            if (cleared) {
              return { acted: true, msg: `\u{1F9F9} \u0110\xE3 d\u1ECDn c\u1ECF/c\xE0nh kh\xF4 ngo\xE0i v\u01B0\u1EDDn (${stF2.firstDay.cleared.length + 1}/5)` };
            }
          }
        }
      }
      const stF3 = stores.main.getState();
      if (stF3.day === 1 && !(stF3.ledger || []).some((e) => e.kind === "food") && stF3.gold >= 8e3) {
        if (stF3.buyFood?.("banhBao") === "ok") {
          return { acted: true, msg: `\u{1F95F} \u0110\xE3 mua B\xE1nh bao \u0103n s\xE1ng (Vi\u1EC7c Ng\xE0y 1)` };
        }
      }
      if (stF3.day === 2 && !(stF3.ledger || []).some((e) => e.kind === "food" && (e.label === "Tr\xE0 \u0111\xE1" || e.label === "N\u01B0\u1EDBc m\xEDa")) && stF3.gold >= 3e3) {
        if (stF3.buyFood?.("traDa") === "ok") {
          return { acted: true, msg: `\u{1F9CA} \u0110\xE3 u\u1ED1ng Tr\xE0 \u0111\xE1 (Vi\u1EC7c Ng\xE0y 2)` };
        }
      }
    }
    if (cfg.autoNotebookPages !== false) {
      const stN = stores.main.getState();
      if (stN.notebook?.found) {
        for (const pg of [1, 4, 5]) {
          if (stN.claimPage?.(pg) === true) {
            return { acted: true, msg: `\u{1F4D4} \u0110\xE3 thu th\u1EADp trang S\u1ED5 tay \xD4ng N\u0103m #${pg}` };
          }
        }
        if (stN.startSoak?.() === true) {
          return { acted: true, msg: `\u{1F33E} \u0110\xE3 ng\xE2m \u1EE7 gi\u1ED1ng L\xFAa th\u01A1m c\u1EE7a \xD4ng N\u0103m` };
        }
      }
    }
    if (cfg.autoClaimQuests !== false) {
      const stD = stores.main.getState();
      const taskCount = stD.daily?.tasks?.length || 0;
      for (let i = 0; i < taskCount; i++) {
        const reward = stores.main.getState().claimDaily?.(i);
        if (reward) {
          return { acted: true, msg: `\u{1F381} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng Vi\u1EC7c h\xF4m nay #${i + 1} trong S\u1ED5 tay` };
        }
      }
      const goalReward = stores.main.getState().claimGoal?.();
      if (goalReward) {
        return { acted: true, msg: `\u{1F3C6} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng M\u1EE5c ti\xEAu S\u1ED5 tay!` };
      }
    }
    if (cfg.autoBreakPiggy !== false && cfg.autoPiggy !== false) {
      const stBrk = stores.main.getState();
      const pig = stBrk.savings?.pig;
      if (pig && pig.amount > 0) {
        const streak = pig.lastDay >= stBrk.day - 1 ? pig.streak || 0 : 0;
        if (streak >= 7) {
          const brk = stBrk.breakPiggy?.();
          if (brk) {
            const totalGot = (brk.coins || 0) + (brk.bonus || 0);
            return {
              acted: true,
              msg: `\u{1F528} \u0110\xE3 \u0111\u1EADp Heo \u0111\u1EA5t \u0111\u1EE7 7 ng\xE0y (+${totalGot.toLocaleString("vi-VN")}\u0111)!`
            };
          }
        }
      }
    }
    if (cfg.autoNewPiggy !== false && cfg.autoPiggy !== false) {
      const stP2 = stores.main.getState();
      const pig2 = stP2.savings?.pig;
      if (!pig2 || pig2.amount === 0) {
        const tiers = [5e5, 2e5, 1e5, 5e4, 1e4];
        let chosenTier = 0;
        for (const t of tiers) {
          if (stP2.gold >= t * 3) {
            chosenTier = t;
            break;
          }
        }
        if (!chosenTier && stP2.gold >= 15e3) chosenTier = 1e4;
        if (chosenTier > 0 && stP2.newPiggy?.(chosenTier) === true) {
          stores.main.getState().feedPiggy?.();
          return {
            acted: true,
            msg: `\u{1F437} \u0110\xE3 mua & b\u1ECF \u1ED1ng Heo \u0111\u1EA5t m\u1EDBi (${chosenTier.toLocaleString("vi-VN")}\u0111/ng\xE0y)`
          };
        }
      }
    }
    if (cfg.autoFeedPiggy !== false && cfg.autoPiggy !== false) {
      const stP3 = stores.main.getState();
      const pig3 = stP3.savings?.pig;
      if (pig3 && pig3.amount > 0 && pig3.lastDay !== stP3.day && stP3.gold >= pig3.amount) {
        if (stP3.feedPiggy?.() === "ok") {
          return {
            acted: true,
            msg: `\u{1FA99} \u0110\xE3 b\u1ECF \u1ED1ng Heo \u0111\u1EA5t h\xF4m nay (${pig3.amount.toLocaleString("vi-VN")}\u0111)`
          };
        }
      }
    }
    const stS = stores.main.getState();
    if (cfg.autoSavings && (stS.savings?.newsDay || 0) > 0 && !stS.savings?.loan && (stS.savings?.books?.length || 0) < 10) {
      const minGold = Number(cfg.savingsKeepGold) || 2e5;
      if (stS.gold > minGold + 5e4) {
        const matured = stS.savings.matured || 0;
        const cap = matured >= 10 ? 2e7 : matured >= 5 ? 12e6 : matured >= 2 ? 8e6 : 5e6;
        const depAmount = Math.min(cap, Math.floor((stS.gold - minGold) / 1e4) * 1e4);
        if (depAmount >= 5e4 && stS.deposit?.(depAmount, 7) === "ok") {
          return {
            acted: true,
            msg: `\u{1F3E6} \u0110\xE3 g\u1EEDi s\u1ED5 ti\u1EBFt ki\u1EC7m D\xEC B\u1EA3y ${depAmount.toLocaleString("vi-VN")}\u0111 (7 ng\xE0y)`
          };
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
    const m = stores.main?.getState();
    const s = stores.sea?.getState();
    if (!m || !s || m.screen !== "sea") return { acted: false };
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;
    const seaScene = getActiveScene("SeaScene");
    if ((m.fishing?.rod || 0) === 0 && m.gold >= 15e3) {
      if (m.buyRod?.() === true) {
        return { acted: true, msg: "\u{1F3A3} \u0110\xE3 mua C\u1EA7n c\xE2u t\u1EA1i Ch\xF2i \xD4ng T\u01B0" };
      }
    }
    const sellMin = m.minutes >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
    if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
      const count = m.fishing.basket.length;
      const earned = m.sellBasket?.();
      if (typeof earned === "number" && earned > 0) {
        return { acted: true, msg: `\u{1F4B0} \u0110\xE3 b\xE1n ${count} c\xE1 \u1EDF Bi\u1EC3n (+${earned.toLocaleString("vi-VN")}\u0111)` };
      }
    }
    if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
      return { acted: true, msg: "\u{1F4D6} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng S\u1ED5 c\xE1 \xD4ng T\u01B0" };
    }
    const curM = stores.main.getState();
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
    const curM2 = stores.main.getState();
    if (cfg.seaPreferBait === "shrimp" && (curM2.fishing?.bait?.shrimp || 0) > 0 && !curM2.fishing.useShrimp) {
      curM2.setUseShrimp?.(true);
    } else if (cfg.seaPreferBait === "worm" && (curM2.fishing?.bait?.worm || 0) > 0 && curM2.fishing.useShrimp) {
      curM2.setUseShrimp?.(false);
    }
    const seaHungerTh = Math.max(20, Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 35);
    const seaThirstTh = Math.max(20, Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 35);
    if (cfg.seaAutoEat !== false) {
      if (curM2.hydration < seaThirstTh && canAct("sea_drink", 3500)) {
        for (const d of ["carrotJuice", "radishSoup"]) {
          if ((curM2.kitchen?.stock?.[d] || 0) > 0 && curM2.eatDish?.(d) === true) {
            markActed("sea_drink");
            return { acted: true, msg: `\u{1F9C3} \u0110\xE3 u\u1ED1ng ${d === "carrotJuice" ? "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t" : "Canh c\u1EE7 c\u1EA3i"} gi\u1EA3i kh\xE1t t\u1EA1i Bi\u1EC3n` };
          }
        }
        if (curM2.gold >= 15e3 && curM2.buyFood?.("nuocDua") === "ok") {
          markActed("sea_drink");
          return { acted: true, msg: "\u{1F965} \u0110\xE3 u\u1ED1ng N\u01B0\u1EDBc d\u1EEBa t\u01B0\u01A1i t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t" };
        }
        if (curM2.gold >= 8e3 && curM2.buyFood?.("nuocMia") === "ok") {
          markActed("sea_drink");
          return { acted: true, msg: "\u{1F964} \u0110\xE3 u\u1ED1ng N\u01B0\u1EDBc m\xEDa t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t" };
        }
        if (curM2.gold >= 3e3 && curM2.buyFood?.("traDa") === "ok") {
          markActed("sea_drink");
          return { acted: true, msg: "\u{1F9CA} \u0110\xE3 u\u1ED1ng Tr\xE0 \u0111\xE1 t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t" };
        }
      }
      const curM3 = stores.main.getState();
      if (curM3.fullness < seaHungerTh && canAct("sea_eat", 3500)) {
        for (const d of Object.keys(curM3.kitchen?.stock || {})) {
          if ((curM3.kitchen.stock[d] || 0) > 0 && curM3.eatDish?.(d) === true) {
            markActed("sea_eat");
            return { acted: true, msg: "\u{1F372} \u0110\xE3 \u0103n m\xF3n mang theo h\u1ED3i s\u1EE9c t\u1EA1i Bi\u1EC3n" };
          }
        }
        if (curM3.gold >= 15e3 && curM3.buyFood?.("banhMiThit") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F956} \u0110\xE3 \u0103n B\xE1nh m\xEC t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i" };
        }
        if (curM3.gold >= 8e3 && curM3.buyFood?.("banhBao") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F95F} \u0110\xE3 \u0103n B\xE1nh bao t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i" };
        }
      }
    }
    if (s.panel && s.phase === "idle") {
      stores.sea.setState({ panel: null });
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
          stores.sea.setState({ spot: targetSpot, walking: false });
          return { acted: true, msg: `\u{1F4CD} \u0110\xE3 ch\u1ECDn v\u1ECB tr\xED c\xE2u (${targetSpot})` };
        }
      }
    }
    return { acted: false };
  }

  // src/page-hook/modules/wharf/index.ts
  function execBenStep(cfg) {
    const m = stores.main?.getState();
    const bu = stores.benUI?.getState();
    const bn = stores.benNet?.getState();
    if (!m || !bu || !bn || m.screen !== "benDo" || bn.status !== "in") {
      return { acted: false };
    }
    if (bu.walking || bn.fishing !== "idle") {
      return { acted: false };
    }
    const benScene = getActiveScene("BenDoScene");
    const wallet = bn.wallet;
    if (!wallet) return { acted: false };
    const stamina = computeBenStamina(wallet);
    const shells = wallet.shells || 0;
    const bait = wallet.bait || 0;
    const nonKeptCount = Array.isArray(bn.basket) ? bn.basket.filter((x) => !x.kept).length : 0;
    const pack = bn.pack || {};
    const packItems = Object.keys(pack).filter((k) => pack[k] > 0);
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
    const needShellsForBait = bait <= 0 && shells < 15;
    const needShellsForFood = (stamina < 4 || cfg.benAutoRecoverStamina !== false && stamina <= stamMin) && packItems.length === 0 && shells < 10;
    const sellThreshold = Number(cfg.benSellThreshold) || 20;
    if (cfg.benAutoSell !== false && nonKeptCount > 0 && (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: "sell" });
          stores.benUI.setState({ panel: null });
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
              stores.benUI.setState({ panel: null });
            },
            `G\u1ED9i \u0111\u1EA7u massage \xDAt M\u01B0\u1EDDi (+50 S\u1EE9c c\xE2u, -25\u{1F41A})`,
            "ben_goi_dau"
          );
        }
        if (shells >= 10 && canAct("ben_food", 4e3)) {
          const foodId = cfg.benPreferFood || "comTam";
          const foodPrices = { banhMi: 10, chaoCa: 14, huTieu: 20, comTam: 28, lauMam: 45 };
          let chosenFood = foodId;
          if (shells < (foodPrices[chosenFood] || 10)) {
            if (shells >= 28) chosenFood = "comTam";
            else if (shells >= 20) chosenFood = "huTieu";
            else if (shells >= 14) chosenFood = "chaoCa";
            else chosenFood = "banhMi";
          }
          return walkAndRun(
            { x: 39, y: 23 },
            () => {
              sendBenWs({ t: "buy", item: chosenFood });
              stores.benUI.setState({ panel: null });
            },
            `\u0110i \u0103n (${chosenFood}) t\u1EA1i Qu\xE1n D\xEC T\xE1m h\u1ED3i S\u1EE9c c\xE2u`,
            "ben_food"
          );
        }
        if (shells >= 3 && canAct("ben_drink", 4e3)) {
          return walkAndRun(
            { x: 26, y: 12 },
            () => {
              sendBenWs({ t: "buy", item: "traDa" });
              stores.benUI.setState({ panel: null });
            },
            `\u0110i u\u1ED1ng Tr\xE0 \u0111\xE1 Ch\u1ECB Th\u01A1m h\u1ED3i S\u1EE9c c\xE2u`,
            "ben_drink"
          );
        }
      }
      if (stamina < 4) {
        if (cfg.benAutoSell !== false && nonKeptCount > 0) {
          return walkAndRun(
            { x: 40, y: 10 },
            () => {
              sendBenWs({ t: "sell" });
              stores.benUI.setState({ panel: null });
            },
            `B\xE1n h\u1EBFt ${nonKeptCount} c\xE1 trong gi\u1ECF tr\u01B0\u1EDBc khi r\u1EDDi B\u1EBFn \u0110\xF2`,
            "ben_sell"
          );
        }
        return {
          acted: false,
          exhausted: true,
          reason: "\u{1F62E}\u200D\u{1F4A8} B\u1EBFn \u0110\xF2: \u0110\xE3 h\u1EBFt S\u1EE9c c\xE2u (kh\xF4ng th\u1EC3 h\u1ED3i th\xEAm) -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
        };
      }
    }
    if (bait <= 0) {
      if (cfg.benAutoBuyBait === false) {
        return {
          acted: false,
          exhausted: true,
          reason: "\u{1FAB1} B\u1EBFn \u0110\xF2: \u0110\xE3 h\u1EBFt m\u1ED3i c\xE2u -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
        };
      }
      const prefBait = cfg.benPreferBait || "moi60";
      const prices = { xinMoi: 0, moi20: 15, moi60: 40, moi150: 90 };
      if (shells >= 15 && canAct("ben_bait", 3e3)) {
        let pick = prefBait === "xinMoi" ? "moi20" : prefBait;
        if (shells < (prices[pick] || 15)) {
          if (shells >= 40) pick = "moi60";
          else pick = "moi20";
        }
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: "buy", item: pick });
            stores.benUI.setState({ panel: null });
          },
          `\u0110i mua m\u1ED3i c\xE2u (${pick}) t\u1EA1i Ch\xFA \u0110\u1EF1c`,
          "ben_bait"
        );
      }
      const xinMoiBlocked = shells > 0 || lastXinMoiDay === m.day && Date.now() - lastXinMoiAt < 6e5 || bn.notice?.error === "used" || bn.notice?.error === "noFree";
      if (!xinMoiBlocked && canAct("ben_bait", 3e3)) {
        setLastXinMoi(Date.now(), m.day);
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: "buy", item: "xinMoi" });
            stores.benUI.setState({ panel: null });
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
            stores.benUI.setState({ panel: null });
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
            stores.benUI.setState({ panel: null });
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
            stores.benUI.setState({ panel: null });
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
            stores.benUI.setState({ panel: null });
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
              stores.benUI.setState({ panel: null });
            },
            `Mua 1 v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2 (${randNum < 10 ? "0" + randNum : randNum}) t\u1EA1i \u0110\u1EA1i l\xFD Ch\xFA B\u1EA3y (-10\u{1F41A})`,
            "ben_lotto_buy"
          );
        }
      }
    }
    const atmMin = Number(cfg.benAtmThreshold) || 500;
    if (cfg.benAutoAtm && shells >= atmMin + 100 && canAct("ben_atm", 4e3)) {
      const cashShells = Math.floor((shells - 100) / 50) * 50;
      if (cashShells >= 100) {
        return walkAndRun(
          { x: 34, y: 35 },
          () => {
            sendBenWs({ t: "atmCash", shells: cashShells });
            stores.benUI.setState({ panel: null });
          },
          `\u0110i \u0111\u1ED5i ${cashShells} v\u1ECF s\xF2 ra ti\u1EC1n m\u1EB7t t\u1EA1i ATM`,
          "ben_atm"
        );
      }
    }
    if (bu.panel) {
      stores.benUI.setState({ panel: null });
    }
    if (cfg.benAutoSpot !== false) {
      const spotChoice = cfg.benSpot || "dock";
      const spotTargets = {
        dock: { x: 31, y: 4, kind: "dock", label: "C\u1EA7u t\xE0u ch\xEDnh" },
        bamboo: { x: 7, y: 6, kind: "dock", label: "C\u1EA7u tre" },
        bank: { x: 24, y: 10, kind: "bank", label: "B\u1EDD s\xF4ng" }
      };
      const target = spotTargets[spotChoice] || spotTargets.dock;
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
    if (window.__ntg_page_hook_v100) return;
    window.__ntg_page_hook_v100 = true;
    function execAction(action, payload = {}) {
      if (!stores.main) discoverStores();
      const m = stores.main?.getState();
      if (!m) return { ok: false, error: "NO_MAIN_STORE" };
      try {
        switch (action) {
          case "NAVIGATE": {
            const target = payload.target;
            dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
            const cur = stores.main.getState();
            if (target === "playing") {
              if (cur.screen !== "playing") {
                cur.showWorldMap?.();
                stores.main.getState().enterFarm?.();
                stores.main.setState({ screen: "playing", panel: null, shop: null, vendor: null });
              }
              if (payload.indoors === false && stores.main.getState().indoors) {
                stores.main.getState().leaveHouse?.();
              }
            } else if (target === "sea") {
              if (cur.screen !== "sea") {
                if (cur.indoors) cur.leaveHouse?.();
                if (!cur.fishing?.seaOpen && cur.day >= 2) {
                  cur.openSea?.();
                }
                const res = stores.main.getState().goToSea?.();
                if (res !== "ok") {
                  return { ok: false, reason: res || "CANNOT_GO_SEA" };
                }
              }
            } else if (target === "benDo" || target === "ben") {
              if (cur.screen !== "benDo") {
                if (cur.indoors) cur.leaveHouse?.();
                stores.main.setState({ screen: "benDo", panel: null, shop: null, vendor: null, indoors: false });
              }
            }
            return { ok: true, screen: stores.main.getState().screen };
          }
          case "FARM_SUBAREA_STEP": {
            const res = execFarmSubAreaStep(payload.subAreaId, payload.config || {});
            return { ok: true, ...res };
          }
          case "SEA_STEP": {
            const res = execSeaStep(payload.config || {});
            return { ok: true, ...res };
          }
          case "BEN_STEP": {
            const res = execBenStep(payload.config || {});
            return { ok: true, ...res };
          }
          case "SLEEP_NOW": {
            if ((stores.main.getState().fishing?.basket?.length || 0) > 0) {
              stores.main.getState().sellBasket?.();
            }
            dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
            if (stores.main.getState().screen !== "playing") {
              stores.main.getState().showWorldMap?.();
              stores.main.getState().enterFarm?.();
            }
            stores.main.setState({
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
            const st = stores.main.getState();
            if (!st.indoors) {
              st.enterHouse?.();
            }
            const prevDay = stores.main.getState().day;
            if (stores.main.getState().minutes >= 1140) {
              stores.main.getState().goToSleep?.();
              stores.main.getState().sleepThrough?.();
            }
            if (stores.main.getState().day === prevDay) {
              stores.main.getState().nextMorning?.();
            }
            stores.main.getState().stopSleeping?.();
            const afterDay = stores.main.getState().day;
            return { ok: afterDay > prevDay, day: afterDay };
          }
          default:
            return { ok: false, error: "UNKNOWN_ACTION" };
        }
      } catch (err) {
        return { ok: false, error: String(err?.message || err) };
      }
    }
    window.addEventListener("message", (e) => {
      if (e.source !== window || !e.data || e.data.source !== "ntg-content") return;
      const { id, type, action, payload } = e.data;
      if (type === "GET_GAME_STATE") {
        const snap = getSnapshot();
        window.postMessage({ source: "ntg-page", id, type: "GAME_STATE_RESULT", data: snap }, "*");
      } else if (type === "EXEC_GAME_ACTION") {
        const res = execAction(action, payload);
        window.postMessage({ source: "ntg-page", id, type: "GAME_ACTION_RESULT", data: res }, "*");
      }
    });
  })();
})();
//# sourceMappingURL=page-hook.js.map
