(() => {
  if (window.__ntg_page_hook_v100) return;
  window.__ntg_page_hook_v100 = true;

  const stores = {
    main: null,   // q (Main farm/game store)
    sea: null,    // PJ (Sea UI/phase store)
    benUI: null,  // KJ (Ben Do local UI store)
    benNet: null, // X (Ben Do websocket state store)
  };

  let phaserGame = null;
  let benWs = null;
  let lastXinMoiAt = 0;
  let lastXinMoiDay = -1;

  // 1. Intercept WebSocket.prototype.send to capture Ben Do WebSocket
  try {
    const origSend = WebSocket.prototype.send;
    WebSocket.prototype.send = function (data) {
      try {
        if (this && typeof this.url === 'string' && this.url.includes('/ws/ben-do')) {
          benWs = this;
          window.__ntg_benWs = this;
        }
      } catch (_) {}
      return origSend.apply(this, arguments);
    };
  } catch (_) {}

  function sendBenWs(obj) {
    if (!benWs || benWs.readyState !== WebSocket.OPEN) {
      // Trigger BenDoScene.announce() so the game sends a move packet and our hook captures benWs
      try {
        const sc = getActiveScene('BenDoScene');
        if (sc && typeof sc.announce === 'function') {
          sc.announce();
        }
      } catch (_) {}
    }
    if (benWs && benWs.readyState === WebSocket.OPEN) {
      benWs.send(JSON.stringify(obj));
      return true;
    }
    return false;
  }

  // 1b. Trend Goods calculation helpers matching play.js mechanics
  const _TREND_CROPS = ['radish', 'carrot', 'corn', 'rice'];
  function _tt(e) {
    let t = (e + 2135587861) | 0;
    t = Math.imul(t ^ (t >>> 16), 73244475);
    t = Math.imul(t ^ (t >>> 16), 73244475);
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  }
  function _nt(n, t) {
    const arr = n >= 2 ? [..._TREND_CROPS, 'egg'] : [..._TREND_CROPS];
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

  // 2. Capture Phaser.Game instance via short-lived Array.prototype.push hook
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
      Array.prototype.push = function (first) {
        try {
          if (first && typeof first === 'object' && first.sys && first.sys.game && first.sys.game.scene) {
            phaserGame = first.sys.game;
            window.__ntg_phaserGame = phaserGame;
            restore();
          }
        } catch (_) {}
        return origPush.apply(this, arguments);
      };
      setTimeout(restore, 1500);
    } catch (_) {}
    return phaserGame;
  }

  hookPhaserGame();

  function getActiveScene(key) {
    const game = hookPhaserGame();
    if (!game || !game.scene || typeof game.scene.getScene !== 'function') return null;
    try {
      const sc = game.scene.getScene(key);
      if (sc && sc.sys && sc.sys.isActive()) return sc;
      return sc || null;
    } catch (_) {
      return null;
    }
  }

  // 3. Discover Zustand stores from React 19 Fiber tree
  function classifyStore(candidate) {
    if (!candidate || typeof candidate.getState !== 'function' || typeof candidate.setState !== 'function') {
      return;
    }
    let st;
    try {
      st = candidate.getState();
    } catch (_) {
      return;
    }
    if (!st || typeof st !== 'object') return;

    if ('plots' in st && 'fullness' in st && 'applyTool' in st && 'cook' in st) {
      stores.main = candidate;
    } else if ('phase' in st && 'spot' in st && 'float' in st && 'landed' in st && !('status' in st)) {
      stores.sea = candidate;
    } else if ('teaStand' in st && 'closetSlot' in st && 'spot' in st) {
      stores.benUI = candidate;
    } else if ('status' in st && 'fishing' in st && 'wallet' in st && 'basket' in st) {
      stores.benNet = candidate;
    }
  }

  function discoverStores() {
    const roots = [
      document.getElementById('root'),
      document.querySelector('.app'),
      document.querySelector('.ui-layer'),
      document.querySelector('.sea-controls'),
      document.querySelector('.ben-screen'),
      document.querySelector('.ben-fish-side'),
    ].filter(Boolean);

    const visited = new Set();
    const queue = [];

    for (const el of roots) {
      for (const k of Object.keys(el)) {
        if (k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')) {
          if (el[k]) queue.push(el[k]);
        }
      }
    }

    let steps = 0;
    while (queue.length > 0 && steps < 6000) {
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
        if (ms && typeof ms === 'object') {
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

  function computeBenStamina(wallet) {
    if (!wallet) return 0;
    if (!wallet.staminaNext || typeof wallet.at !== 'number') return wallet.stamina ?? 0;
    const elapsed = performance.now() - wallet.at;
    if (elapsed < wallet.staminaNext) return wallet.stamina ?? 0;
    return Math.min(100, (wallet.stamina ?? 0) + 1 + Math.floor((elapsed - wallet.staminaNext) / 180000));
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

    const benWallet = bn?.wallet
      ? {
          ...bn.wallet,
          liveStamina: computeBenStamina(bn.wallet),
        }
      : null;

    const benNonKeptCount = Array.isArray(bn?.basket)
      ? bn.basket.filter((x) => !x.kept).length
      : 0;

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
      sea: s
        ? {
            spot: s.spot,
            walking: s.walking,
            phase: s.phase,
            panel: s.panel,
          }
        : null,
      benUI: bu
        ? {
            spot: bu.spot,
            walking: bu.walking,
            panel: bu.panel,
          }
        : null,
      benNet: bn
        ? {
            status: bn.status,
            fishing: bn.fishing,
            fight: bn.fight,
            wallet: benWallet,
            basketCount: benNonKeptCount,
            totalBasket: Array.isArray(bn.basket) ? bn.basket.length : 0,
            pack: bn.pack || {},
            landed: bn.landed,
            notice: bn.notice,
          }
        : null,
    };
  }

  // Helper: dismiss blocking modals/interrupts (phone, announcement, call, tip, chapter popups)
  function dismissInterruptsIfNeeded(cfg) {
    const m = stores.main?.getState();
    if (!m) return null;

    if (cfg && cfg.autoDismissInterrupts === false) return null;

    if (m.phone) {
      m.closePhone?.();
      return { acted: true, msg: '📱 Đã đóng thông báo điện thoại' };
    }
    if (m.announcement) {
      m.answerAnnouncement?.(false);
      return { acted: true, msg: '📢 Đã tắt thông báo Loa phường' };
    }
    if (m.tip) {
      m.answerTip?.(false);
      return { acted: true, msg: '💡 Đã đóng hướng dẫn nhanh' };
    }
    if (m.call) {
      if (m.call.stage === 'ringing') {
        m.acceptCall?.();
      }
      const stAfter = stores.main.getState();
      if (stAfter.call) {
        if (stAfter.call.from === 'noi') {
          stAfter.hangUpGrandma?.('bye');
          return { acted: true, msg: '👵 Đã nghe điện thoại Bà Nội & nhận quà' };
        }
        if (stAfter.call.from === 'sau' && stAfter.call.topic === 'sea') {
          stAfter.openSea?.();
          stAfter.endCall?.('ok');
          return { acted: true, msg: '📞 Đã nghe điện Ông Sáu mở đường ra Biển' };
        }
        if (stAfter.call.from === 'sau' && !stAfter.uncleBa?.met) {
          stAfter.answerSau?.(false);
        }
        stAfter.endCall?.('ok');
        return { acted: true, msg: '📞 Đã nghe xong cuộc gọi điện thoại' };
      }
    }
    if (m.panel === 'chapterOne') {
      m.finishChapterOne?.();
      return { acted: true, msg: '📖 Đã xác nhận qua Chương 1' };
    }
    if (m.panel === 'chapterEnd') {
      m.finishChapter?.();
      return { acted: true, msg: '📖 Đã hoàn thành chương Sổ tay Ông Năm' };
    }
    if (m.panel === 'notebook') {
      m.setPanel?.(null);
      return { acted: true, msg: '📔 Đã đóng trang Sổ tay Ông Năm' };
    }

    if (m.pond?.news) m.ackPondNews?.();
    if (m.buffalo?.news) m.ackBuffaloNews?.();
    if (m.dairy?.news) m.ackDairyNews?.();
    if (m.henNews) m.ackHenNews?.();
    if (m.pets?.news) m.ackPetNews?.();
    if (m.missedOrder) m.ackMissedOrder?.();

    return null;
  }

  // Action Cooldown & Debounce map to prevent race-condition double purchases / double actions
  const actionCooldowns = new Map();
  function canAct(key, cooldownMs = 3500) {
    const last = actionCooldowns.get(key) || 0;
    return Date.now() - last >= cooldownMs;
  }
  function markActed(key) {
    actionCooldowns.set(key, Date.now());
  }

  // Cô Kim Tiệm Vàng price formula & simulation (Exact replication from game bundle)
  const GOLD_DATA = [
    { id: 'mieng', name: 'Vàng miếng 9999', base: 8200000, beta: 1, noise: 0.002, spread: 0.016 },
    { id: 'nhan', name: 'Nhẫn trơn 9999', base: 7600000, beta: 0.9, noise: 0.0015, spread: 0.012 },
    { id: 'k18', name: 'Vàng 18K', base: 5600000, beta: 0.7, noise: 0.002, spread: 0.09 },
    { id: 'non', name: 'Vàng non 10K', base: 3100000, beta: 2.2, noise: 0.006, spread: 0.05 },
  ];
  const GOLD_CATALOG = Object.fromEntries(GOLD_DATA.map((e) => [e.id, e]));
  const GOLD_WAVES = [
    { kind: 'calm', drift: 0, weight: 38, len: [6, 16] },
    { kind: 'up', drift: 0.005, weight: 24, len: [6, 18] },
    { kind: 'down', drift: -0.005, weight: 22, len: [6, 18] },
    { kind: 'boom', drift: 0.011, weight: 8, len: [6, 12] },
    { kind: 'crash', drift: -0.011, weight: 8, len: [6, 12] },
  ];
  const _G_A = 0.004, _G_V = 0.02, _G_Y = 0.0003, _G_B = 0.045, _G_X = 0.7;
  function _goldRng(seed) {
    let t = seed >>> 0;
    return () => {
      t = (t + 1831565813) >>> 0;
      let e = t;
      e = Math.imul(e ^ (e >>> 15), e | 1);
      e ^= e + Math.imul(e ^ (e >>> 7), e | 61);
      return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
    };
  }
  const _goldNorm = (rng) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
  const _goldStep = (day, min) => (day - 1) * 2 + (min >= 720 ? 1 : 0);
  const _goldCache = new Map();
  function _goldSim(seed, step) {
    let n = _goldCache.get(seed);
    if (!n) {
      n = { index: [], wave: [], own: { mieng: [], nhan: [], k18: [], non: [] }, r: _goldRng(seed), waveLeft: 0, drift: 0, kind: 'calm', x: 0, bump: 0 };
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
      let r = ((t - 1) % 120) + 1;
      n.bump = (e % 2 === 0 && r === 10 && t > 120) ? _G_B : n.bump * _G_X;
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
    return Math.round((base * (1 + (item ? item.spread / 2 : 0))) / 1000) * 1000;
  }
  function getGoldSellPrice(seed, type, day, min) {
    const step = _goldStep(day, min);
    const base = _goldBasePrice(seed, type, step);
    const item = GOLD_CATALOG[type];
    return Math.round((base * (1 - (item ? item.spread / 2 : 0))) / 1000) * 1000;
  }

  // Helper: execute 1 single atomic step in a Farm sub-area
  function execFarmSubAreaStep(subAreaId, cfg) {
    let m = stores.main?.getState();
    if (!m) return { acted: false };

    // Always dismiss blocking interrupts first
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;

    m = stores.main.getState();
    const mainScene = getActiveScene('MainScene');

    // =====================================================
    // 1. Sub-area: HOUSE (Nhà, Bếp & Nhu cầu cơ bản)
    // =====================================================
    if (subAreaId === 'house') {
      // Auto-learn recipes & Cook in kitchen if enabled
      if (cfg.autoCook) {
        const dishNames = {
          comTam: 'Cơm tấm',
          eggBread: 'Bánh mì trứng',
          radishSoup: 'Canh củ cải',
          carrotJuice: 'Nước ép cà rốt',
          grilledCorn: 'Bắp nướng',
          boiledEgg: 'Trứng luộc',
          cornCake: 'Bánh bắp',
        };
        const learnList = ['grilledCorn', 'carrotJuice', 'eggBread', 'comTam', 'cornCake'];
        for (const rId of learnList) {
          if (!m.kitchen?.known?.includes(rId) && m.learnRecipe?.(rId) === 'ok') {
            return { acted: true, msg: `📖 Đã học công thức nấu món ${dishNames[rId] || rId}` };
          }
        }

        const curM = stores.main.getState();
        const maxSlots = (curM.houseLevel || 0) >= 1 ? 2 : 1;
        const cookingNow = curM.kitchen?.cooking?.length || 0;

        if (cookingNow < maxSlots) {
          const dishes = [
            cfg.preferDish || 'comTam',
            'comTam',
            'eggBread',
            'radishSoup',
            'carrotJuice',
            'grilledCorn',
            'boiledEgg',
            'cornCake',
          ];
          // Map dish primary crop ingredient so we don't accidentally consume crops needed for an active Grocery Order
          const dishCropMap = {
            radishSoup: { crop: 'radish', need: 3 },
            carrotJuice: { crop: 'carrot', need: 2 },
            grilledCorn: { crop: 'corn', need: 2 },
            comTam: { crop: 'rice', need: 2 },
            cornCake: { crop: 'corn', need: 2 },
          };
          const seen = new Set();
          for (const d of dishes) {
            if (!d || seen.has(d)) continue;
            seen.add(d);
            if (!curM.kitchen?.known?.includes(d)) continue;
            if ((curM.kitchen?.stock?.[d] || 0) >= 3) continue;

            // Reserve crops for active grocery order if needed
            const ing = dishCropMap[d];
            if (ing && curM.order && curM.order.crop === ing.crop && !(curM.day === 2 && !curM.firstDay?.cooked)) {
              const have = curM.produce?.[ing.crop] || 0;
              if (have < curM.order.qty + ing.need) continue;
            }

            if (curM.cook?.(d) === 'ok') {
              return { acted: true, msg: `🍳 Đã bắc bếp nấu món ${dishNames[d] || d}` };
            }
          }
        }
      }

      const thH = Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 45;
      const thT = Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 45;
      const thB = Number(cfg.batteryThreshold) || 35;

      // Unbundled Need 1: Recover Hunger (Eat dish from kitchen or buy bakery food)
      if (cfg.autoRecoverHunger !== false && cfg.autoRecoverNeeds !== false) {
        const stH = stores.main.getState();
        if (stH.fullness < thH && canAct('farm_eat', 3500)) {
          const foodSource = cfg.foodSource || 'kitchen_first'; // 'kitchen_first' | 'kitchen_only' | 'shop_only'

          // A. Try Kitchen pantry / warehouse if permitted
          if (foodSource !== 'shop_only') {
            const dishOrder = cfg.preferDish && cfg.preferDish !== 'auto'
              ? [cfg.preferDish, 'comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg', 'cornCake', 'carrotJuice']
              : ['comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg', 'cornCake', 'carrotJuice'];
            const dishLabels = {
              comTam: 'Cơm tấm 🍛',
              eggBread: 'Bánh mì trứng 🥪',
              radishSoup: 'Canh củ cải 🍲',
              grilledCorn: 'Bắp nướng 🌽',
              boiledEgg: 'Trứng luộc 🥚',
              cornCake: 'Bánh bắp 🥮',
              carrotJuice: 'Nước ép cà rốt 🧃',
            };
            for (const d of dishOrder) {
              if ((stH.kitchen?.stock?.[d] || 0) > 0 && stH.eatDish?.(d) === true) {
                markActed('farm_eat');
                return { acted: true, msg: `🍲 Đã ăn ${dishLabels[d] || d} trong bếp hồi Đói (${stH.fullness}%)` };
              }
            }
          }

          // B. Try Bakery shop if permitted & kitchen didn't satisfy
          if (foodSource !== 'kitchen_only') {
            const prefShop = cfg.preferFoodShop || 'banhMiThit';
            const shopItems = [prefShop, 'banhMiThit', 'banhMiCha', 'banhMiTrung', 'banhBao', 'banhMiFull'];
            const prices = { banhMiThit: 15000, banhMiCha: 15000, banhMiTrung: 10000, banhBao: 8000, banhMiFull: 25000 };
            const shopLabels = {
              banhMiThit: 'Bánh mì thịt 🥖',
              banhMiCha: 'Bánh mì chả cá 🐟',
              banhMiTrung: 'Bánh mì trứng 🍳',
              banhBao: 'Bánh bao 🥟',
              banhMiFull: 'Bánh mì full topping 🤤',
            };
            for (const item of shopItems) {
              if (stH.gold >= (prices[item] || 8000) && stH.buyFood?.(item) === 'ok') {
                markActed('farm_eat');
                return { acted: true, msg: `🥖 Đã mua & ăn ${shopLabels[item] || item} tại Tiệm bánh hồi Đói` };
              }
            }
          }
        }
      }

      // Unbundled Need 2: Recover Thirst (Drink nuocMia or traDa or juice)
      if (cfg.autoRecoverThirst !== false && cfg.autoRecoverNeeds !== false) {
        const stT = stores.main.getState();
        if (stT.hydration < thT && canAct('farm_drink', 3500)) {
          const drinkSource = cfg.drinkSource || 'kitchen_first'; // 'kitchen_first' | 'shop_only' | 'both'

          // A. Try kitchen drinks if permitted
          if (drinkSource !== 'shop_only') {
            for (const d of ['carrotJuice', 'radishSoup']) {
              if ((stT.kitchen?.stock?.[d] || 0) > 0 && stT.eatDish?.(d) === true) {
                markActed('farm_drink');
                return { acted: true, msg: `🧃 Đã uống ${d === 'carrotJuice' ? 'Nước ép cà rốt' : 'Canh củ cải'} giải Khát (${stT.hydration}%)` };
              }
            }
          }

          // B. Try Drink Shop
          if (drinkSource !== 'kitchen_only') {
            const prefDrink = cfg.preferDrinkShop || 'nuocMia';
            const drinkPrices = { traDao: 15000, traSua: 18000, nuocMia: 8000, caPheSua: 12000, traDa: 3000 };
            const drinkLabels = {
              nuocMia: 'Nước mía 🥤',
              traDao: 'Trà đào cam sả 🍑',
              traSua: 'Trà sữa trân châu 🧋',
              caPheSua: 'Cà phê sữa đá ☕',
              traDa: 'Trà đá 🧊',
            };
            const drinkOrder = [prefDrink, 'nuocMia', 'traDa', 'traDao', 'traSua', 'caPheSua'];
            for (const dr of drinkOrder) {
              if (stT.gold >= (drinkPrices[dr] || 3000) && stT.buyFood?.(dr) === 'ok') {
                markActed('farm_drink');
                return { acted: true, msg: `🥤 Đã mua & uống ${drinkLabels[dr] || dr} giải Khát` };
              }
            }
          }
        }
      }

      // Unbundled Need 3: Morning Coffee (+50% speed buff all day)
      if (cfg.autoMorningCoffee !== false && cfg.autoRecoverNeeds !== false) {
        const stC = stores.main.getState();
        if (stC.coffeeDay !== stC.day && stC.gold >= 30000 && canAct('farm_coffee', 4000) && stC.buyFood?.('caPheSua') === 'ok') {
          markActed('farm_coffee');
          return { acted: true, msg: `☕ Đã uống Cà phê sữa đá (+25% nước, chạy nhanh suốt ngày)` };
        }
      }

      // Unbundled Need 4: EV Vehicle Charging
      if (cfg.autoChargeVehicle !== false && cfg.autoRecoverNeeds !== false) {
        const stE = stores.main.getState();
        if (stE.vehicle && stE.battery < thB && stE.gold >= 35000 && canAct('farm_vehicle', 4000)) {
          const charged = stE.chargeVehicle?.();
          if (typeof charged === 'number' && charged > 0) {
            markActed('farm_vehicle');
            return { acted: true, msg: `🔋 Đã sạc đầy pin xe điện (-${charged.toLocaleString('vi-VN')}đ)` };
          }
        }
      }

      // NPC Feature: Chị Linh Tây Tiệm Tóc & Spa
      if (m.salonOpen) {
        if (cfg.autoSalonShampoo !== false) {
          const stSal = stores.main.getState();
          const hasRelax = (stSal.kitchen?.buffs || []).some((b) => b.kind === 'relax' && b.day === stSal.day);
          if (!hasRelax && stSal.gold >= 150000 && stSal.shampoo?.() === 'ok') {
            return { acted: true, msg: `💆 Đã ghé Chị Linh Tây gội đầu dưỡng sinh (Buff thư giãn)` };
          }
        }
        if (cfg.autoSalonWhiten) {
          const stW = stores.main.getState();
          if ((stW.player?.outfit?.tan || 0) > 0 && stW.gold >= 300000 && stW.whiten?.() === 'ok') {
            return { acted: true, msg: `✨ Đã ghé Chị Linh Tây tắm trắng nâng tông da` };
          }
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 2. Sub-area: CROPS (Ruộng đồng - từng ô một)
    // =====================================================
    if (subAreaId === 'crops') {
      const st = stores.main.getState();
      const plotKeys = Object.keys(st.plots || {});
      const cropNames = { radish: 'Củ cải', carrot: 'Cà rốt', corn: 'Bắp ngô', rice: 'Lúa thơm' };

      const applyOnPlot = (key, tool) => {
        const s0 = stores.main.getState();
        s0.setActiveTool?.(tool);
        const prevPlotRef = s0.plots?.[key];

        if (mainScene && typeof mainScene.doWork === 'function') {
          try {
            mainScene.doWork({ plot: key, tool });
          } catch (_) {}
          if (stores.main.getState().plots?.[key] !== prevPlotRef) {
            return true;
          }
        }

        const res = stores.main.getState().applyTool?.(key, tool);
        if (res && mainScene?.plots?.playEffect) {
          try {
            mainScene.plots.playEffect(res, key);
          } catch (_) {}
        }
        return Boolean(res);
      };

      // Step A: Harvest 1 mature plot
      if (cfg.autoHarvest !== false) {
        for (const key of plotKeys) {
          if (st.previewTool?.(key, 'basket')) {
            const cropId = st.plots[key]?.crop?.id;
            if (applyOnPlot(key, 'basket')) {
              return { acted: true, msg: `🧺 Thu hoạch ${cropNames[cropId] || 'nông sản'} ô (${key})` };
            }
          }
        }
      }

      // Step B: Spray pesticide on 1 pest-infested plot (plot.crop.pests === true)
      if (cfg.autoPesticide !== false) {
        for (const key of plotKeys) {
          const p = st.plots[key];
          if (p && p.crop && p.crop.pests) {
            if ((st.items?.pesticide || 0) <= 0 && st.gold >= 8000) {
              st.buyItems?.({ fertilizer: 0, pesticide: 1, mysteryBag: 0 });
            }
            if ((stores.main.getState().items?.pesticide || 0) > 0 && applyOnPlot(key, 'pesticide')) {
              return { acted: true, msg: `🐛 Đã xịt thuốc trừ sâu ô (${key})` };
            }
          }
        }
      }

      // Step C: Plant seed on 1 empty plot
      if (cfg.autoPlant !== false) {
        const hasEmptyPlot = plotKeys.some((k) => st.plots[k] && !st.plots[k].crop);
        if (hasEmptyPlot) {
          // Open mystery bag if we have one in inventory to get bonus seeds
          if ((st.items?.mysteryBag || 0) > 0) {
            const opened = st.consumeItem?.('mysteryBag');
            if (opened) {
              return { acted: true, msg: `🎁 Đã mở Túi hạt bí ẩn nhận thêm hạt giống` };
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
            const pref = cfg.preferSeed || 'auto';

            if (pref !== 'auto') {
              const gotPref = ensureSeed(pref);
              if (gotPref) return gotPref;
            }

            // Smart auto-selection:
            // 1. Active Grocery Order crop if we don't have enough in produce + field
            if (cur.order && cur.order.crop) {
              const c = cur.order.crop;
              const projected = (cur.produce?.[c] || 0) + countGrowingCrop(c) * 4;
              if (projected < cur.order.qty) {
                const got = ensureSeed(c);
                if (got) return got;
              }
            }

            // 2. Active Daily Task harvest crop
            if (Array.isArray(cur.daily?.tasks)) {
              for (const task of cur.daily.tasks) {
                if (!task.claimed && task.kind === 'harvest' && task.crop) {
                  const harvestedNow = (cur.stats?.harvested?.[task.crop] || 0) - (task.base || 0);
                  if (harvestedNow + countGrowingCrop(task.crop) * 4 < task.need) {
                    const got = ensureSeed(task.crop);
                    if (got) return got;
                  }
                }
              }
            }

            // 3. Active Village Board request crop
            if (Array.isArray(cur.village?.requests)) {
              for (const req of cur.village.requests) {
                if (!req.done && req.goods && req.goods !== 'egg') {
                  const projected = (cur.produce?.[req.goods] || 0) + countGrowingCrop(req.goods) * 4;
                  if (projected < req.qty) {
                    const got = ensureSeed(req.goods);
                    if (got) return got;
                  }
                }
              }
            }

            // 4. Early game: Day 1/2 radish for cooking soup if needed
            if (cur.day <= 2 && !cur.firstDay?.cooked && (cur.produce?.radish || 0) + countGrowingCrop('radish') * 4 < 3) {
              const got = ensureSeed('radish');
              if (got) return got;
            }

            // 5. Fallback: use existing seeds in bag first, then buy best unlocked seed
            const order = ['rice', 'corn', 'carrot', 'radish'];
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
                return { acted: true, msg: `🌱 Đã gieo hạt ${cropNames[seed] || seed} ô (${key})` };
              }
              break;
            }
          }
        }
      }

      // Step D: Water 1 dry plot
      if (cfg.autoWater !== false) {
        const curSt = stores.main.getState();
        for (const key of plotKeys) {
          if (curSt.previewTool?.(key, 'wateringCan')) {
            if (applyOnPlot(key, 'wateringCan')) {
              return { acted: true, msg: `💧 Đã tưới nước ô (${key})` };
            }
          }
        }
      }

      // Step E: Fertilize 1 unfertilized growing plot
      if (cfg.autoFertilize) {
        const curSt = stores.main.getState();
        for (const key of plotKeys) {
          const p = curSt.plots[key];
          if (p && p.crop && !p.crop.fertilized && curSt.previewTool?.(key, 'fertilizer')) {
            if ((curSt.items?.fertilizer || 0) <= 0 && curSt.gold >= 15000) {
              curSt.buyItems?.({ fertilizer: 1, pesticide: 0, mysteryBag: 0 });
            }
            if ((stores.main.getState().items?.fertilizer || 0) > 0 && applyOnPlot(key, 'fertilizer')) {
              return { acted: true, msg: `✨ Đã bón phân NPK ô (${key})` };
            }
          }
        }
      }

      // Step F: Pay crop helper (Tèo) if unpaid > 0
      const curSt2 = stores.main.getState();
      if (curSt2.helpers?.crops?.hired && (curSt2.helpers.crops.unpaid || 0) > 0) {
        if (curSt2.payHelper?.('crops') === true) {
          return { acted: true, msg: `💸 Đã trả lương nợ cho Tèo phụ ruộng` };
        }
      }

      // Step G: Buy new land plot if offered
      const curSt3 = stores.main.getState();
      if (cfg.autoBuyPlots !== false && curSt3.plotOffer && curSt3.gold >= (curSt3.plotOffer.price || 0)) {
        if (curSt3.buyPlot?.() === true) {
          return { acted: true, msg: `🌱 Đã mua thêm ô đất ruộng mới (+1 ô)` };
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 3. Sub-area: PET (Thú cưng)
    // =====================================================
    if (subAreaId === 'pet') {
      if (m.pets?.pet?.away) {
        m.pickUpPet?.();
        if (!stores.main.getState().pets?.pet?.away) {
          return { acted: true, msg: `🐾 Đã đón thú cưng về nhà` };
        }
        return { acted: false };
      }

      const pet = m.pets?.pet;
      if (!pet || pet.away) return { acted: false };

      // 3a. Feed Pet (once per day: pet.fedDay !== m.day)
      if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
        const kind = pet.kind || '';
        let candidates = ['xuong', 'cakho', 'pate', 'hat', 'coKho', 'cam', 'crop:carrot', 'crop:corn', 'crop:radish'];
        let shopBuyList = ['pate', 'hat', 'xuong', 'cakho', 'coKho', 'cam'];

        if (['muop', 'tamThe', 'anhLongNgan', 'xiem'].includes(kind)) {
          candidates = ['cakho', 'pate', 'hat'];
          shopBuyList = ['cakho', 'pate', 'hat'];
        } else if (['thoTrang', 'thoNau'].includes(kind)) {
          candidates = ['crop:carrot', 'coKho', 'crop:radish'];
          shopBuyList = ['coKho'];
        } else if (['heoHong', 'heoMini'].includes(kind)) {
          candidates = ['crop:corn', 'cam', 'crop:radish', 'crop:carrot'];
          shopBuyList = ['cam'];
        } else if (['vang', 'muc', 'husky', 'corgi', 'pug'].includes(kind)) {
          candidates = ['xuong', 'pate', 'hat'];
          shopBuyList = ['xuong', 'pate', 'hat'];
        }

        for (const f of candidates) {
          const res = m.feedPet?.(f);
          if (res === 'ok' || res === 'fav') {
            return { acted: true, msg: `🐕 Đã cho thú cưng (${pet.name || 'Bé'}) ăn no` };
          }
        }

        // Buy pet food and feed
        for (const sf of shopBuyList) {
          if (stores.main.getState().buyPetFood?.(sf, 1) === 'ok') {
            const res = stores.main.getState().feedPet?.(sf);
            if (res === 'ok' || res === 'fav') {
              return { acted: true, msg: `🦴 Đã mua đồ ăn & cho thú cưng (${pet.name || 'Bé'}) ăn` };
            }
          }
        }
      }

      // 3b. Cuddle Pet (up to 3 times per day)
      const curM = stores.main.getState();
      const curPet = curM.pets?.pet;
      if (cfg.petAutoCuddle !== false && curPet) {
        const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
        if (cuddlesToday < 3 && curM.cuddlePet?.() === 'ok') {
          return { acted: true, msg: `💕 Đã vuốt ve thú cưng (${cuddlesToday + 1}/3)` };
        }
      }

      // 3c. Bath Pet (every 2 days)
      const curM2 = stores.main.getState();
      if (cfg.petAutoBath !== false && curM2.bathPet?.() === 'ok') {
        return { acted: true, msg: `🛁 Đã tắm thơm tho cho thú cưng` };
      }

      // 3d. Train Tricks (once per day: trickDay !== day)
      const curM3 = stores.main.getState();
      const curPet3 = curM3.pets?.pet;
      if (cfg.petAutoTrick !== false && curPet3) {
        if (curPet3.playDay !== curM3.day && curM3.pets?.gear?.includes('ball')) {
          if (curM3.doTrick?.('fetch') === 'ok') {
            return { acted: true, msg: `🎾 Chơi ném bóng cùng thú cưng (+8 tim)` };
          }
        }
        if (curPet3.trickDay !== curM3.day) {
          const tricks = ['dance', 'roll', 'paw', 'sit', 'come'];
          for (const tr of tricks) {
            if (curM3.doTrick?.(tr) === 'ok') {
              return { acted: true, msg: `🎾 Tập trò "${tr}" cùng thú cưng` };
            }
          }
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 4. Sub-area: BARN (Chuồng Trâu & Bò Sữa)
    // =====================================================
    if (subAreaId === 'barn') {
      // 4a. Buffalo: Feed
      if (
        cfg.barnAutoFeedBuffalo !== false &&
        cfg.barnAutoBuffalo !== false &&
        m.buffalo?.home
      ) {
        if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day) {
          if (m.feedBuffalo?.() === 'ok') {
            return { acted: true, msg: `🐃 Đã cho Trâu ăn rơm` };
          }
        }
      }

      // 4b. Buffalo: Bath
      const stB = stores.main.getState();
      if (
        cfg.barnAutoBathBuffalo !== false &&
        cfg.barnAutoBuffalo !== false &&
        stB.buffalo?.home
      ) {
        if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day) {
          if (stB.bathBuffalo?.() === 'ok') {
            return { acted: true, msg: `🚿 Đã tắm mát cho Trâu` };
          }
        }
      }

      // 4c. Buffalo: Lend to neighbors
      const stB2 = stores.main.getState();
      if (
        cfg.barnAutoLendBuffalo !== false &&
        stB2.buffalo?.home &&
        stB2.buffalo.lentDay !== stB2.day &&
        (stB2.buffalo?.mood || 0) >= 50
      ) {
        if (stB2.lendBuffalo?.() === 'ok') {
          return { acted: true, msg: `🤝 Đã cho bà con thuê Trâu cày ruộng` };
        }
      }

      // 4b. Dairy Cows - Feed
      const stC = stores.main.getState();
      if (
        cfg.barnAutoFeedCows !== false &&
        Array.isArray(stC.dairy?.cows) &&
        stC.dairy.cows.some((c) => c.fedDay !== stC.day)
      ) {
        if (stC.feedCows?.() === 'ok') {
          return { acted: true, msg: `🐄 Đã cho đàn Bò sữa ăn cỏ` };
        }
      }

      // 4c. Dairy Cows - Cure sick cows (cow.sickDay > 0)
      const stC2 = stores.main.getState();
      if (cfg.barnAutoCureCows !== false && Array.isArray(stC2.dairy?.cows)) {
        for (const cow of stC2.dairy.cows) {
          if (cow.sickDay > 0) {
            if ((stC2.dairy.medicine || 0) <= 0 && stC2.gold >= 80000) {
              stC2.buyMedicine?.();
            }
            if (stores.main.getState().cureCow?.(cow.id) === 'ok') {
              return { acted: true, msg: `💊 Đã tiêm thuốc chữa bệnh cho Bò ${cow.name || '#' + cow.id}` };
            }
          }
        }
      }

      // 4d. Dairy Cows - Sell Milk
      const stC3 = stores.main.getState();
      if (cfg.barnAutoSellMilk !== false && (stC3.dairy?.milk || 0) > 0) {
        const res = stC3.sellMilk?.();
        if (res && res.liters > 0) {
          return {
            acted: true,
            msg: `🥛 Đã vắt & bán ${res.liters} lít sữa bò (+${res.total.toLocaleString('vi-VN')}đ)`,
          };
        }
      }

      // 4e. Pay Barn Helpers (buffalo & dairy)
      const stC4 = stores.main.getState();
      if (cfg.barnAutoPayHelper !== false) {
        if (stC4.helpers?.buffalo?.hired && (stC4.helpers.buffalo.unpaid || 0) > 0) {
          if (stC4.payHelper?.('buffalo') === true) {
            return { acted: true, msg: `💸 Đã trả lương anh Tâm chăn trâu` };
          }
        }
        const stC5 = stores.main.getState();
        if (stC5.helpers?.dairy?.hired && (stC5.helpers.dairy.unpaid || 0) > 0) {
          if (stC5.payHelper?.('dairy') === true) {
            return { acted: true, msg: `💸 Đã trả lương chị Mận chăm bò` };
          }
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 5. Sub-area: COOP (Chuồng Gà)
    // =====================================================
    if (subAreaId === 'coop') {
      if (!m.unlockedZones?.includes('poultry')) return { acted: false };

      // 5a. Collect Eggs (m.nestEggs > 0)
      if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
        const got = m.collectEggs?.();
        if (typeof got === 'number' && got > 0) {
          return { acted: true, msg: `🥚 Đã nhặt ${got} quả trứng gà trong ổ` };
        }
      }

      // 5b. Buy Chick when coop has space
      const stG = stores.main.getState();
      const maxHens = [4, 6, 9, 12][stG.coopLevel || 0] || 4;
      if (
        cfg.coopAutoBuyChick &&
        !stG.flu &&
        (stG.hens?.length || 0) < maxHens &&
        stG.gold >= 60000
      ) {
        if (stG.buyChick?.() === 'ok') {
          return {
            acted: true,
            msg: `🐤 Đã mua thêm 1 gà con vào chuồng (${(stG.hens?.length || 0) + 1}/${maxHens})`,
          };
        }
      }

      // 5c. Pay Poultry Helper (Chú Ba: helpers.poultry)
      const stG2 = stores.main.getState();
      if (
        cfg.coopAutoPayHelper !== false &&
        stG2.helpers?.poultry?.hired &&
        (stG2.helpers.poultry.unpaid || 0) > 0
      ) {
        if (stG2.payHelper?.('poultry') === true) {
          return { acted: true, msg: `💸 Đã trả lương chú Ba chăm gà` };
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 6. Sub-area: POND (Ao Cá)
    // =====================================================
    if (subAreaId === 'pond') {
      if (!m.pond?.ready) return { acted: false };

      if (m.notebook?.found && !m.pond.noteRead) {
        m.readPondNote?.();
      }

      const matureDays = { ro: 3, tre: 5, chep: 7 };
      const fishNames = { chep: 'Cá chép', tre: 'Cá trê', ro: 'Cá rô' };

      // 6a. Net mature fish
      if (
        cfg.pondAutoNet !== false &&
        Array.isArray(m.pond.fish) &&
        m.pond.fish.some((f) => (f.days || 0) >= (matureDays[f.id] || 7))
      ) {
        const res = m.netFish?.();
        if (res && res.n > 0) {
          return {
            acted: true,
            msg: `🐟 Đã kéo lưới bán ${res.n} con cá ao (+${res.total.toLocaleString('vi-VN')}đ)`,
          };
        }
      }

      // 6b. Stock fish up to 12
      const stP = stores.main.getState();
      if (
        cfg.pondAutoStock !== false &&
        Array.isArray(stP.pond?.fish) &&
        stP.pond.fish.length < 12
      ) {
        const fishType = cfg.preferPondFish || 'chep';
        if (stP.stockFish?.(fishType) === 'ok') {
          return {
            acted: true,
            msg: `🐟 Đã thả giống ${fishNames[fishType] || fishType} xuống ao (${stP.pond.fish.length + 1}/12)`,
          };
        }
      }

      // 6c. Feed fish once per day
      const stP2 = stores.main.getState();
      if (
        cfg.pondAutoFeed !== false &&
        (stP2.pond?.fish?.length || 0) > 0 &&
        stP2.pond.fedDay !== stP2.day &&
        stP2.pond.bebi !== 'helper'
      ) {
        if (stP2.feedFish?.() === 'ok') {
          return { acted: true, msg: `🍞 Đã rải cám cho đàn cá trong ao ăn` };
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 7. Sub-area: MARKET (Tạp Hóa & Bảng Tin Làng)
    // =====================================================
    if (subAreaId === 'market') {
      const cropNames = { radish: 'Củ cải', carrot: 'Cà rốt', corn: 'Bắp ngô', rice: 'Lúa thơm', egg: 'Trứng gà' };

      // 7a. Deliver Grocery Order to Chị Na
      if (cfg.autoDeliverOrder !== false && m.order) {
        const have = m.produce?.[m.order.crop] || 0;
        if (have >= m.order.qty) {
          const reward = m.order.reward || 0;
          const cropLabel = cropNames[m.order.crop] || m.order.crop;
          if (m.deliverOrder?.() === true) {
            return {
              acted: true,
              msg: `📦 Đã giao đơn hàng Chị Na (${cropLabel}) +${reward.toLocaleString('vi-VN')}đ`,
            };
          }
        }
      }

      // 7b. Unlock & Deliver Village Board Requests
      const stV = stores.main.getState();
      if (cfg.autoVillageBoard !== false) {
        if (stV.village?.newsDay > 0 && !stV.village?.met) {
          stV.meetKhang?.();
        }
        const curV = stores.main.getState();
        if (Array.isArray(curV.village?.requests)) {
          for (const req of curV.village.requests) {
            if (!req.done) {
              const have = req.goods === 'egg' ? curV.eggs || 0 : curV.produce?.[req.goods] || 0;
              if (have >= req.qty && curV.deliverRequest?.(req.id) === true) {
                return {
                  acted: true,
                  msg: `📋 Đã giao ${req.qty} ${cropNames[req.goods] || req.goods} giúp ${req.who} (Bảng tin làng)`,
                };
              }
            }
          }
        }
      }

      // 7c. Sell Trend goods (ONLY exact boosted quota ot(...), never over-sell!)
      const stT = stores.main.getState();
      if (cfg.autoSellTrend !== false) {
        const curTrend = getActiveTrend(stT.day);
        if (curTrend) {
          const plotCount = Object.keys(stT.plots || {}).length;
          const quota = getTrendQuota(curTrend.goods, stT.day, plotCount, stT.trendLog);
          if (quota > 0) {
            const have = curTrend.goods === 'egg' ? stT.eggs || 0 : stT.produce?.[curTrend.goods] || 0;
            const reserved = stT.order && stT.order.crop === curTrend.goods ? stT.order.qty : 0;
            const sellable = Math.max(0, have - reserved);
            const toSell = Math.min(sellable, quota);
            if (toSell > 0) {
              const sold = stT.sellQty?.(curTrend.goods, toSell);
              if (sold > 0) {
                return {
                  acted: true,
                  msg: `🔥 Đã bán đúng ${sold} ${cropNames[curTrend.goods] || curTrend.goods} theo Trend sốt dẻo (x2 giá)`,
                };
              }
            }
          }
        }
      }

      // 7d. Sell produce to complete Sổ tay "Bán hàng" task or Day 1 sell task (MINIMUM needed only)
      const stS = stores.main.getState();
      if (cfg.autoSellDailyTask !== false) {
        const sellTask = (stS.daily?.tasks || []).find(
          (t) => !t.claimed && t.kind === 'sell' && (stS.stats?.earned || 0) - (t.base || 0) < t.need
        );
        const day1NeedSell = stS.day === 1 && (stS.stats?.earned || 0) === 0;

        if (sellTask || day1NeedSell) {
          const items = ['radish', 'carrot', 'corn', 'rice', 'egg'];
          for (const item of items) {
            const have = item === 'egg' ? stS.eggs || 0 : stS.produce?.[item] || 0;
            const reserved = stS.order && stS.order.crop === item ? stS.order.qty : 0;
            const sellable = Math.max(0, have - reserved);
            if (sellable > 0) {
              let qtyToSell = 1;
              if (sellTask) {
                const missing = sellTask.need - ((stS.stats?.earned || 0) - (sellTask.base || 0));
                const unitPrice = item === 'egg' ? 1000 : (stS.prices?.[item] || 500);
                qtyToSell = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
              }
              const sold = stS.sellQty?.(item, qtyToSell);
              if (sold > 0) {
                return {
                  acted: true,
                  msg: `📋 Đã bán ${sold} ${cropNames[item] || item} để hoàn thành Việc Sổ tay hôm nay`,
                };
              }
            }
          }
        }
      }

      // 7e. Auto sell surplus crops (Default: FALSE, requires explicit opt-in and keeps reserves!)
      const stSurplus = stores.main.getState();
      if (cfg.autoSellProduce === true) {
        const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 20);
        const items = ['rice', 'corn', 'carrot', 'radish', 'egg'];
        for (const item of items) {
          const have = item === 'egg' ? stSurplus.eggs || 0 : stSurplus.produce?.[item] || 0;
          const reserved = (stSurplus.order && stSurplus.order.crop === item ? stSurplus.order.qty : 0) + minKeep;
          const sellable = have - reserved;
          if (sellable > 0) {
            const sold = stSurplus.sellQty?.(item, sellable);
            if (sold > 0) {
              return {
                acted: true,
                msg: `🏪 Đã bán ${sold} ${cropNames[item] || item} nông sản dư (giữ lại ${minKeep})`,
              };
            }
          }
        }
      }

      // 7f. Cô Kim Tiệm Vàng (Chợ Lớn Gold Shop - Unlocked Day 30+)
      const stG = stores.main.getState();
      if (stG.goldShop && (stG.goldShop.newsDay > 0 || stG.day >= 30)) {
        // Auto Sell Gold when profit meets target
        if (cfg.goldAutoSell !== false) {
          const targetProfitPct = Number(cfg.goldProfitPercent) || 10;
          for (const type of ['mieng', 'nhan', 'k18', 'non']) {
            const holding = stG.goldShop.hold?.[type];
            if (holding && holding.qty > 0 && holding.cost > 0) {
              const costPerUnit = holding.cost / holding.qty;
              const sellPrice = getGoldSellPrice(stG.goldShop.seed, type, stG.day, stG.minutes);
              const profitPerUnit = sellPrice - costPerUnit;
              const profitPct = (profitPerUnit / costPerUnit) * 100;
              if (profitPct >= targetProfitPct && canAct('farm_gold', 3500)) {
                const profit = stG.sellGold?.(type, holding.qty);
                if (profit !== null && profit !== undefined) {
                  markActed('farm_gold');
                  return {
                    acted: true,
                    msg: `🪙 Đã bán chốt lời ${holding.qty} chỉ ${GOLD_CATALOG[type]?.name || type} tại Tiệm Vàng Cô Kim (+${profit.toLocaleString('vi-VN')}đ, lãi ${Math.round(profitPct)}%)`,
                  };
                }
              }
            }
          }
        }

        // Auto Buy Gold when player has sufficient cash
        if (cfg.goldAutoBuy && canAct('farm_gold', 3500)) {
          const prefType = cfg.goldPreferType || 'mieng';
          const keepCash = Number(cfg.goldKeepCash) || 500000;
          const buyPrice = getGoldBuyPrice(stG.goldShop.seed, prefType, stG.day, stG.minutes);
          if (buyPrice > 0 && stG.gold - buyPrice >= keepCash) {
            const res = stG.buyGold?.(prefType, 1);
            if (res === 'ok') {
              markActed('farm_gold');
              return {
                acted: true,
                msg: `🪙 Đã mua 1 chỉ ${GOLD_CATALOG[prefType]?.name || prefType} đầu tư tại Tiệm Vàng Cô Kim (-${buyPrice.toLocaleString('vi-VN')}đ)`,
              };
            }
          }
        }
      }

      return { acted: false };
    }

    // =====================================================
    // 8. Sub-area: DIBAY (Quầy Dì Bảy & Sổ Tay Nhiệm Vụ)
    // =====================================================
    if (subAreaId === 'dibay') {
      // Safeguard: Ensure Dì Bảy savings counter is open if piggy exists or day >= 14
      const stP0 = stores.main.getState();
      if (stP0.savings && (stP0.savings.newsDay || 0) <= 0) {
        if ((stP0.savings.pig?.amount || 0) > 0 || stP0.day >= 14) {
          stores.main.setState((e) => ({
            savings: { ...e.savings, newsDay: Math.max(1, e.day) },
          }));
        }
      }

      // 8a. First-Day & Day-2 Guide Tasks
      if (cfg.autoFirstDayTasks !== false) {
        // Light incense on Ông Năm's altar
        if (!m.firstDay?.incense) {
          if (m.lightIncense?.() === 'first') {
            return { acted: true, msg: `🙏 Đã thắp nhang bàn thờ Ông Năm` };
          }
        }

        // Sprout tray (Day 1)
        const stF = stores.main.getState();
        if (stF.firstDay?.incense && !stF.firstDay?.sproutHarvested) {
          if (!stF.firstDay.sprout) {
            if (stF.plantSprouts?.() === 'ok') {
              return { acted: true, msg: `🌱 Đã gieo khay rau mầm cạnh nhà` };
            }
          } else if (stF.harvestSprouts?.() === true) {
            return { acted: true, msg: `🌿 Đã thu hoạch khay rau mầm (+4 củ cải)` };
          }
        }

        // Clear 5 garden debris items
        const stF2 = stores.main.getState();
        if ((stF2.firstDay?.cleared?.length || 0) < 5) {
          for (let i = 0; i < 5; i++) {
            if (!stF2.firstDay.cleared.includes(i)) {
              const cleared = stF2.clearDebris?.(i);
              if (cleared) {
                return { acted: true, msg: `🧹 Đã dọn cỏ/cành khô ngoài vườn (${stF2.firstDay.cleared.length + 1}/5)` };
              }
            }
          }
        }

        // Day 1 eat task & Day 2 drink task
        const stF3 = stores.main.getState();
        if (stF3.day === 1 && !(stF3.ledger || []).some((e) => e.kind === 'food') && stF3.gold >= 8000) {
          if (stF3.buyFood?.('banhBao') === 'ok') {
            return { acted: true, msg: `🥟 Đã mua Bánh bao ăn sáng (Việc Ngày 1)` };
          }
        }
        if (
          stF3.day === 2 &&
          !(stF3.ledger || []).some((e) => e.kind === 'food' && (e.label === 'Trà đá' || e.label === 'Nước mía')) &&
          stF3.gold >= 3000
        ) {
          if (stF3.buyFood?.('traDa') === 'ok') {
            return { acted: true, msg: `🧊 Đã uống Trà đá (Việc Ngày 2)` };
          }
        }
      }

      // 8b. Ông Năm's Notebook pages & rice seed soaking
      if (cfg.autoNotebookPages !== false) {
        const stN = stores.main.getState();
        if (stN.notebook?.found) {
          for (const pg of [1, 4, 5]) {
            if (stN.claimPage?.(pg) === true) {
              return { acted: true, msg: `📔 Đã thu thập trang Sổ tay Ông Năm #${pg}` };
            }
          }
          if (stN.startSoak?.() === true) {
            return { acted: true, msg: `🌾 Đã ngâm ủ giống Lúa thơm của Ông Năm` };
          }
        }
      }

      // 8c. Claim Daily Tasks (Việc hôm nay) & Chapter Goals
      if (cfg.autoClaimQuests !== false) {
        const stD = stores.main.getState();
        const taskCount = stD.daily?.tasks?.length || 0;
        for (let i = 0; i < taskCount; i++) {
          const reward = stores.main.getState().claimDaily?.(i);
          if (reward) {
            return { acted: true, msg: `🎁 Đã nhận thưởng Việc hôm nay #${i + 1} trong Sổ tay` };
          }
        }

        const goalReward = stores.main.getState().claimGoal?.();
        if (goalReward) {
          return { acted: true, msg: `🏆 Đã nhận thưởng Mục tiêu Sổ tay!` };
        }
      }

      // 8d. Piggy Bank: Break piggy when full (7-day streak)
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
                msg: `🔨 Đã đập Heo đất đủ 7 ngày (+${totalGot.toLocaleString('vi-VN')}đ)!`,
              };
            }
          }
        }
      }

      // 8e. Piggy Bank: Buy new piggy if none active
      if (cfg.autoNewPiggy !== false && cfg.autoPiggy !== false) {
        const stP2 = stores.main.getState();
        const pig2 = stP2.savings?.pig;
        if (!pig2 || pig2.amount === 0) {
          const tiers = [500000, 200000, 100000, 50000, 10000];
          let chosenTier = 0;
          for (const t of tiers) {
            if (stP2.gold >= t * 3) {
              chosenTier = t;
              break;
            }
          }
          if (!chosenTier && stP2.gold >= 15000) chosenTier = 10000;

          if (chosenTier > 0 && stP2.newPiggy?.(chosenTier) === true) {
            stores.main.getState().feedPiggy?.();
            return {
              acted: true,
              msg: `🐷 Đã mua & bỏ ống Heo đất mới (${chosenTier.toLocaleString('vi-VN')}đ/ngày)`,
            };
          }
        }
      }

      // 8f. Piggy Bank: Feed active piggy today
      if (cfg.autoFeedPiggy !== false && cfg.autoPiggy !== false) {
        const stP3 = stores.main.getState();
        const pig3 = stP3.savings?.pig;
        if (pig3 && pig3.amount > 0 && pig3.lastDay !== stP3.day && stP3.gold >= pig3.amount) {
          if (stP3.feedPiggy?.() === 'ok') {
            return {
              acted: true,
              msg: `🪙 Đã bỏ ống Heo đất hôm nay (${pig3.amount.toLocaleString('vi-VN')}đ)`,
            };
          }
        }
      }

      // 8c. Savings Deposit at Dì Bảy (m.savings.books)
      const stS = stores.main.getState();
      if (
        cfg.autoSavings &&
        (stS.savings?.newsDay || 0) > 0 &&
        !stS.savings?.loan &&
        (stS.savings?.books?.length || 0) < 10
      ) {
        const minGold = Number(cfg.savingsKeepGold) || 200000;
        if (stS.gold > minGold + 50000) {
          const matured = stS.savings.matured || 0;
          const cap =
            matured >= 10 ? 20000000 : matured >= 5 ? 12000000 : matured >= 2 ? 8000000 : 5000000;
          const depAmount = Math.min(cap, Math.floor((stS.gold - minGold) / 10000) * 10000);
          if (depAmount >= 50000 && stS.deposit?.(depAmount, 7) === 'ok') {
            return {
              acted: true,
              msg: `🏦 Đã gửi sổ tiết kiệm Dì Bảy ${depAmount.toLocaleString('vi-VN')}đ (7 ngày)`,
            };
          }
        }
      }

      return { acted: false };
    }

    return { acted: false };
  }

  // Helper: execute Sea fishing preparation step
  function execSeaStep(cfg) {
    const m = stores.main?.getState();
    const s = stores.sea?.getState();
    if (!m || !s || m.screen !== 'sea') return { acted: false };

    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;

    const seaScene = getActiveScene('SeaScene');

    // 1. Buy rod if rod === 0
    if ((m.fishing?.rod || 0) === 0 && m.gold >= 15000) {
      if (m.buyRod?.() === true) {
        return { acted: true, msg: '🎣 Đã mua Cần câu tại Chòi Ông Tư' };
      }
    }

    // 2. Sell basket if >= threshold (or if it's late at night before going home)
    const sellMin = m.minutes >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
    if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
      const count = m.fishing.basket.length;
      const earned = m.sellBasket?.();
      if (typeof earned === 'number' && earned > 0) {
        return { acted: true, msg: `💰 Đã bán ${count} cá ở Biển (+${earned.toLocaleString('vi-VN')}đ)` };
      }
    }

    // 3. Claim Dex reward if available
    if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
      return { acted: true, msg: '📖 Đã nhận thưởng Sổ cá Ông Tư' };
    }

    // 4. Buy bait if out of bait
    const curM = stores.main.getState();
    const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
    if (cfg.seaAutoBuyBait !== false && totalBait <= 0) {
      const pref = cfg.seaPreferBait || 'worm';
      const packs = Number(cfg.seaBaitPacks) || 2;
      if (curM.buyBait?.(pref, packs) === true) {
        return { acted: true, msg: `🪱 Đã mua ${packs} gói mồi ${pref === 'shrimp' ? 'Tôm' : 'Giun'}` };
      } else if (curM.buyBait?.('worm', 1) === true) {
        return { acted: true, msg: `🪱 Đã mua 1 gói mồi Giun` };
      }
    }

    // 5. Select preferred bait chip
    const curM2 = stores.main.getState();
    if (cfg.seaPreferBait === 'shrimp' && (curM2.fishing?.bait?.shrimp || 0) > 0 && !curM2.fishing.useShrimp) {
      curM2.setUseShrimp?.(true);
    } else if (cfg.seaPreferBait === 'worm' && (curM2.fishing?.bait?.worm || 0) > 0 && curM2.fishing.useShrimp) {
      curM2.setUseShrimp?.(false);
    }

    // 6. Recover hunger/thirst at Sea if low (castLine fails with 'tired' if fullness <= 0 or hydration <= 0)
    const seaHungerTh = Math.max(20, Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 35);
    const seaThirstTh = Math.max(20, Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 35);
    if (cfg.seaAutoEat !== false) {
      if (curM2.hydration < seaThirstTh && canAct('sea_drink', 3500)) {
        for (const d of ['carrotJuice', 'radishSoup']) {
          if ((curM2.kitchen?.stock?.[d] || 0) > 0 && curM2.eatDish?.(d) === true) {
            markActed('sea_drink');
            return { acted: true, msg: `🧃 Đã uống ${d === 'carrotJuice' ? 'Nước ép cà rốt' : 'Canh củ cải'} giải khát tại Biển` };
          }
        }
        if (curM2.gold >= 15000 && curM2.buyFood?.('nuocDua') === 'ok') {
          markActed('sea_drink');
          return { acted: true, msg: '🥥 Đã uống Nước dừa tươi tại Biển hồi khát' };
        }
        if (curM2.gold >= 8000 && curM2.buyFood?.('nuocMia') === 'ok') {
          markActed('sea_drink');
          return { acted: true, msg: '🥤 Đã uống Nước mía tại Biển hồi khát' };
        }
        if (curM2.gold >= 3000 && curM2.buyFood?.('traDa') === 'ok') {
          markActed('sea_drink');
          return { acted: true, msg: '🧊 Đã uống Trà đá tại Biển hồi khát' };
        }
      }

      const curM3 = stores.main.getState();
      if (curM3.fullness < seaHungerTh && canAct('sea_eat', 3500)) {
        for (const d of Object.keys(curM3.kitchen?.stock || {})) {
          if ((curM3.kitchen.stock[d] || 0) > 0 && curM3.eatDish?.(d) === true) {
            markActed('sea_eat');
            return { acted: true, msg: '🍲 Đã ăn món mang theo hồi sức tại Biển' };
          }
        }
        if (curM3.gold >= 15000 && curM3.buyFood?.('banhMiThit') === 'ok') {
          markActed('sea_eat');
          return { acted: true, msg: '🥖 Đã ăn Bánh mì tại Biển hồi đói' };
        }
        if (curM3.gold >= 8000 && curM3.buyFood?.('banhBao') === 'ok') {
          markActed('sea_eat');
          return { acted: true, msg: '🥟 Đã ăn Bánh bao tại Biển hồi đói' };
        }
      }
    }

    // 7. Close shop/dex panel if open while idle
    if (s.panel && s.phase === 'idle') {
      stores.sea.setState({ panel: null });
    }

    // 8. Walk to selected spot if not standing at target spot
    if (cfg.seaAutoSpot !== false && s.phase === 'idle' && !s.walking) {
      const targetSpot = cfg.seaSpot || 'pier';
      if (s.spot !== targetSpot) {
        const spotCoords = {
          pier: { x: 24, y: 4 },
          rocks: { x: 41, y: 9 },
          beach: { x: 20, y: 14 },
        };
        const coord = spotCoords[targetSpot] || spotCoords.pier;
        if (seaScene && typeof seaScene.goFarmer === 'function') {
          seaScene.goFarmer(coord);
          return { acted: true, msg: `🚶 Đang đi ra vị trí câu (${targetSpot})...` };
        } else {
          stores.sea.setState({ spot: targetSpot, walking: false });
          return { acted: true, msg: `📍 Đã chọn vị trí câu (${targetSpot})` };
        }
      }
    }

    return { acted: false };
  }

  // Helper: execute Ben Do preparation step (walking to shops, buying bait, eating, selling, walking to water)
  function execBenStep(cfg) {
    const m = stores.main?.getState();
    const bu = stores.benUI?.getState();
    const bn = stores.benNet?.getState();
    if (!m || !bu || !bn || m.screen !== 'benDo' || bn.status !== 'in') {
      return { acted: false };
    }
    if (bu.walking || bn.fishing !== 'idle') {
      return { acted: false };
    }

    const benScene = getActiveScene('BenDoScene');
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
      if (benScene && typeof benScene.goFarmer === 'function') {
        const cur = benScene.farmer?.tile;
        if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
          if (actionKey) markActed(actionKey);
          actionFn();
          return { acted: true, msg: label };
        }
        if (benScene.farmer?.running) {
          return { acted: true, msg: `🚶 Đang di chuyển...` };
        }
        benScene.goFarmer(tile, () => {
          setTimeout(() => {
            if (!actionKey || canAct(actionKey)) {
              if (actionKey) markActed(actionKey);
              actionFn();
            }
          }, 250);
        });
        return { acted: true, msg: `🚶 ${label}` };
      }
      if (actionKey) markActed(actionKey);
      actionFn();
      return { acted: true, msg: label };
    };

    // Determine if we urgently need to sell fish in the basket to get shells for food or bait
    const needShellsForBait = bait <= 0 && shells < 15;
    const needShellsForFood =
      (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) &&
      packItems.length === 0 &&
      shells < 10;

    // 1. Sell basket at Vựa cá Anh Tư ({x: 40, y: 10}) when basket >= threshold OR when urgently needing shells
    const sellThreshold = Number(cfg.benSellThreshold) || 20;
    if (
      cfg.benAutoSell !== false &&
      nonKeptCount > 0 &&
      (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)
    ) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: 'sell' });
          stores.benUI.setState({ panel: null });
        },
        `Đi bán ${nonKeptCount} con cá tại Vựa Anh Tư`,
        'ben_sell'
      );
    }

    // 2. Recover Stamina (Sức câu ⚡) when low or depleted (< 4)
    if (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) {
      if (cfg.benAutoRecoverStamina !== false) {
        // 2a. Eat from backpack first
        if (packItems.length > 0 && canAct('ben_eat_pack', 3000)) {
          markActed('ben_eat_pack');
          sendBenWs({ t: 'eat', item: packItems[0] });
          return { acted: true, msg: `🍙 Đã ăn ${packItems[0]} trong balo hồi Sức câu` };
        }

        // 2b. Út Mười: Gội đầu massage thư giãn hồi 50 Sức (25 shells)
        if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct('ben_goi_dau', 4000)) {
          return walkAndRun(
            { x: 16, y: 24 },
            () => {
              sendBenWs({ t: 'buy', item: 'goiDau' });
              stores.benUI.setState({ panel: null });
            },
            `Gội đầu massage Út Mười (+50 Sức câu, -25🐚)`,
            'ben_goi_dau'
          );
        }

        // 2c. Walk to Quán cơm Dì Tám ({x: 39, y: 23}) if we have >= 10 shells
        if (shells >= 10 && canAct('ben_food', 4000)) {
          const foodId = cfg.benPreferFood || 'comTam';
          const foodPrices = { banhMi: 10, chaoCa: 14, huTieu: 20, comTam: 28, lauMam: 45 };
          let chosenFood = foodId;
          if (shells < (foodPrices[chosenFood] || 10)) {
            if (shells >= 28) chosenFood = 'comTam';
            else if (shells >= 20) chosenFood = 'huTieu';
            else if (shells >= 14) chosenFood = 'chaoCa';
            else chosenFood = 'banhMi';
          }
          return walkAndRun(
            { x: 39, y: 23 },
            () => {
              sendBenWs({ t: 'buy', item: chosenFood });
              stores.benUI.setState({ panel: null });
            },
            `Đi ăn (${chosenFood}) tại Quán Dì Tám hồi Sức câu`,
            'ben_food'
          );
        }

        // 2d. Fallback: Walk to Xe trà đá Chị Thơm ({x: 26, y: 12}) for Trà đá (3 shells, +8 stamina)
        if (shells >= 3 && canAct('ben_drink', 4000)) {
          return walkAndRun(
            { x: 26, y: 12 },
            () => {
              sendBenWs({ t: 'buy', item: 'traDa' });
              stores.benUI.setState({ panel: null });
            },
            `Đi uống Trà đá Chị Thơm hồi Sức câu`,
            'ben_drink'
          );
        }
      }

      // If stamina is < 4 (cannot cast anymore) and we could not recover it:
      if (stamina < 4) {
        if (cfg.benAutoSell !== false && nonKeptCount > 0) {
          return walkAndRun(
            { x: 40, y: 10 },
            () => {
              sendBenWs({ t: 'sell' });
              stores.benUI.setState({ panel: null });
            },
            `Bán hết ${nonKeptCount} cá trong giỏ trước khi rời Bến Đò`,
            'ben_sell'
          );
        }
        return {
          acted: false,
          exhausted: true,
          reason: '😮‍💨 Bến Đò: Đã hết Sức câu (không thể hồi thêm) -> Chuyển khu vực tiếp theo!',
        };
      }
    }

    // 3. Buy bait at Tiệm mồi Chú Đực ({x: 53, y: 11}) when out of bait
    if (bait <= 0) {
      if (cfg.benAutoBuyBait === false) {
        return {
          acted: false,
          exhausted: true,
          reason: '🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!',
        };
      }

      const prefBait = cfg.benPreferBait || 'moi60';
      const prices = { xinMoi: 0, moi20: 15, moi60: 40, moi150: 90 };

      if (shells >= 15 && canAct('ben_bait', 3000)) {
        let pick = prefBait === 'xinMoi' ? 'moi20' : prefBait;
        if (shells < (prices[pick] || 15)) {
          if (shells >= 40) pick = 'moi60';
          else pick = 'moi20';
        }
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: 'buy', item: pick });
            stores.benUI.setState({ panel: null });
          },
          `Đi mua mồi câu (${pick}) tại Chú Đực`,
          'ben_bait'
        );
      }

      // Only attempt free bait ('xinMoi') if shells === 0 and not already attempted recently
      const xinMoiBlocked =
        shells > 0 ||
        (lastXinMoiDay === m.day && Date.now() - lastXinMoiAt < 600000) ||
        bn.notice?.error === 'used' ||
        bn.notice?.error === 'noFree';

      if (!xinMoiBlocked && canAct('ben_bait', 3000)) {
        lastXinMoiAt = Date.now();
        lastXinMoiDay = m.day;
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: 'buy', item: 'xinMoi' });
            stores.benUI.setState({ panel: null });
          },
          `Đi xin 10 mồi miễn phí tại Chú Đực`,
          'ben_bait'
        );
      }

      return {
        acted: false,
        exhausted: true,
        reason: '🪱 Bến Đò: Đã hết mồi & vỏ sò -> Chuyển khu vực tiếp theo!',
      };
    }

    // 4. Drink Luck Tea at Xe trà đá Chị Thơm ({x: 26, y: 12})
    if (cfg.benAutoLuckDrink && (wallet.luckCasts || 0) <= 0 && canAct('ben_luck_drink', 5000)) {
      const drinkId = cfg.benPreferDrink || 'nuocMia';
      const drinkPrices = { traDa: 3, nuocMia: 15, rauMa: 30, caPhe: 35, duaTuoi: 80 };
      if (shells >= (drinkPrices[drinkId] || 15)) {
        return walkAndRun(
          { x: 26, y: 12 },
          () => {
            sendBenWs({ t: 'buy', item: drinkId });
            stores.benUI.setState({ panel: null });
          },
          `Đi uống nước tăng May mắn (${drinkId}) tại Chị Thơm`,
          'ben_luck_drink'
        );
      }
    }

    // 5. Sạp lồng đèn Cô Bảy ({x: 37, y: 28}): Quay vòng quay may mắn & mua vé
    if (cfg.benAutoLantern !== false) {
      const tickets = wallet.tickets || 0;
      if (tickets > 0 && canAct('ben_lantern_spin', 4000)) {
        return walkAndRun(
          { x: 37, y: 28 },
          () => {
            sendBenWs({ t: 'spin', n: 1 });
            stores.benUI.setState({ panel: null });
          },
          `Quay Vòng quay may mắn Sạp lồng đèn Cô Bảy (còn ${tickets} vé 🎟️)`,
          'ben_lantern_spin'
        );
      }

      const boughtToday = bn.wheel?.bought || 0;
      if (cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600 && canAct('ben_lantern_buy', 4000)) {
        return walkAndRun(
          { x: 37, y: 28 },
          () => {
            sendBenWs({ t: 'ticket' });
            stores.benUI.setState({ panel: null });
          },
          `Mua vé Vòng quay lồng đèn Cô Bảy (${boughtToday + 1}/5, -600🐚)`,
          'ben_lantern_buy'
        );
      }
    }

    // 6. Đại lý vé số Bến Đò ({x: 36, y: 31}): Đổi thưởng vé trúng & Mua vé số
    if (cfg.benAutoLotto !== false) {
      const lottoState = bn.lotto;
      const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
      if (hasWins && canAct('ben_lotto_claim', 4000)) {
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: 'lottoClaim' });
            stores.benUI.setState({ panel: null });
          },
          `Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
          'ben_lotto_claim'
        );
      }

      if (cfg.benAutoBuyLotto && shells >= 10 && canAct('ben_lotto_buy', 60000)) {
        const sellingDay = lottoState?.selling;
        const alreadyBought = (lottoState?.mine || []).some((t) => t.day === sellingDay);
        if (!alreadyBought) {
          const randNum = Math.floor(Math.random() * 100);
          return walkAndRun(
            { x: 36, y: 31 },
            () => {
              sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
              stores.benUI.setState({ panel: null });
            },
            `Mua 1 vé số Bến Đò (${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
            'ben_lotto_buy'
          );
        }
      }
    }

    // 7. Exchange shells at ATM ({x: 34, y: 35})
    const atmMin = Number(cfg.benAtmThreshold) || 500;
    if (cfg.benAutoAtm && shells >= atmMin + 100 && canAct('ben_atm', 4000)) {
      const cashShells = Math.floor((shells - 100) / 50) * 50;
      if (cashShells >= 100) {
        return walkAndRun(
          { x: 34, y: 35 },
          () => {
            sendBenWs({ t: 'atmCash', shells: cashShells });
            stores.benUI.setState({ panel: null });
          },
          `Đi đổi ${cashShells} vỏ sò ra tiền mặt tại ATM`,
          'ben_atm'
        );
      }
    }

    // 8. Close any open panel before fishing
    if (bu.panel) {
      stores.benUI.setState({ panel: null });
    }

    // 9. Walk to fishing spot if not at water edge
    if (cfg.benAutoSpot !== false) {
      const spotChoice = cfg.benSpot || 'dock';
      const spotTargets = {
        dock: { x: 31, y: 4, kind: 'dock', label: 'Cầu tàu chính' },
        bamboo: { x: 7, y: 6, kind: 'dock', label: 'Cầu tre' },
        bank: { x: 24, y: 10, kind: 'bank', label: 'Bờ sông' },
      };
      const target = spotTargets[spotChoice] || spotTargets.dock;

      if (!bu.spot || (bu.spot !== target.kind && spotChoice !== 'any')) {
        if (benScene && typeof benScene.goFarmer === 'function') {
          benScene.goFarmer({ x: target.x, y: target.y });
          return { acted: true, msg: `🚶 Đang đi ra ${target.label} câu cá...` };
        }
      }
    }

    return { acted: false };
  }

  function execAction(action, payload = {}) {
    if (!stores.main) discoverStores();
    const m = stores.main?.getState();
    if (!m) return { ok: false, error: 'NO_MAIN_STORE' };

    try {
      switch (action) {
        case 'NAVIGATE': {
          const target = payload.target;
          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });
          const cur = stores.main.getState();

          if (target === 'playing') {
            if (cur.screen !== 'playing') {
              cur.showWorldMap?.();
              stores.main.getState().enterFarm?.();
              stores.main.setState({ screen: 'playing', panel: null, shop: null, vendor: null });
            }
            if (payload.indoors === false && stores.main.getState().indoors) {
              stores.main.getState().leaveHouse?.();
            }
          } else if (target === 'sea') {
            if (cur.screen !== 'sea') {
              if (cur.indoors) cur.leaveHouse?.();
              if (!cur.fishing?.seaOpen && cur.day >= 2) {
                cur.openSea?.();
              }
              const res = stores.main.getState().goToSea?.();
              if (res !== 'ok') {
                return { ok: false, reason: res || 'CANNOT_GO_SEA' };
              }
            }
          } else if (target === 'benDo' || target === 'ben') {
            if (cur.screen !== 'benDo') {
              if (cur.indoors) cur.leaveHouse?.();
              stores.main.setState({ screen: 'benDo', panel: null, shop: null, vendor: null, indoors: false });
            }
          }
          return { ok: true, screen: stores.main.getState().screen };
        }

        case 'FARM_SUBAREA_STEP': {
          const res = execFarmSubAreaStep(payload.subAreaId, payload.config || {});
          return { ok: true, ...res };
        }

        case 'SEA_STEP': {
          const res = execSeaStep(payload.config || {});
          return { ok: true, ...res };
        }

        case 'BEN_STEP': {
          const res = execBenStep(payload.config || {});
          return { ok: true, ...res };
        }

        case 'SLEEP_NOW': {
          // 1. Sell any remaining fish in Sea basket before going home to sleep
          if ((stores.main.getState().fishing?.basket?.length || 0) > 0) {
            stores.main.getState().sellBasket?.();
          }

          // 2. Dismiss any blocking modals/calls so ER(state) is true
          dismissInterruptsIfNeeded({ autoDismissInterrupts: true });

          // 3. Navigate back to Farm ('playing') & enter house
          if (stores.main.getState().screen !== 'playing') {
            stores.main.getState().showWorldMap?.();
            stores.main.getState().enterFarm?.();
          }
          stores.main.setState({
            screen: 'playing',
            panel: null,
            shop: null,
            vendor: null,
            plotOffer: null,
            zoneOffer: null,
            phone: null,
            announcement: null,
            tip: null,
            call: null,
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

          // Dismiss any morning announcements if needed
          const afterDay = stores.main.getState().day;
          return { ok: afterDay > prevDay, day: afterDay };
        }

        default:
          return { ok: false, error: 'UNKNOWN_ACTION' };
      }
    } catch (err) {
      return { ok: false, error: String(err?.message || err) };
    }
  }

  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'ntg-content') return;
    const { id, type, action, payload } = e.data;

    if (type === 'GET_GAME_STATE') {
      const snap = getSnapshot();
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_STATE_RESULT', data: snap }, '*');
    } else if (type === 'EXEC_GAME_ACTION') {
      const res = execAction(action, payload);
      window.postMessage({ source: 'ntg-page', id, type: 'GAME_ACTION_RESULT', data: res }, '*');
    }
  });
})();
