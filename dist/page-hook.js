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

  // src/page-hook/modules/wharf/cricket-watchers.ts
  var WATCH_INTERVAL_MS = 50;
  var CONFIG_STALE_MS = 5e3;
  var CLASH_INTERVAL_MS = 1600;
  var MIN_TRAP_WINDOW_MS = 150;
  var TRAP_SERVER_MARGIN_MS = 60;
  var DEFAULT_RTT_MS = 150;
  var MAX_BETS_PER_DAY = 20;
  var MAX_EVENTS = 30;
  var watchCfg = null;
  var watchCfgAt = 0;
  var timerId = null;
  var scheduledHopN = -1;
  var tickledKeys = /* @__PURE__ */ new Set();
  var betBoutIds = /* @__PURE__ */ new Set();
  var rttMs = DEFAULT_RTT_MS;
  var lightSentAt = 0;
  var lastHuntPhase;
  var lastMissSeq = -1;
  var eventSeq = 0;
  var events = [];
  function pushEvent(text) {
    events.push({ seq: ++eventSeq, text });
    if (events.length > MAX_EVENTS) events.shift();
  }
  function getCricketEvents() {
    return events;
  }
  function markHuntLightSent() {
    lightSentAt = performance.now();
  }
  function getBenServerNow(bn) {
    return Date.now() + (bn.ti?.skew ?? 0);
  }
  function getBenHour(bn) {
    const d = new Date(getBenServerNow(bn) + 7 * 3600 * 1e3);
    return d.getUTCHours() + d.getUTCMinutes() / 60;
  }
  function getMyBout(bn) {
    const you = bn.you;
    if (!you) return null;
    for (const bout of Object.values(bn.bouts || {})) {
      if (bout.end) continue;
      if (bout.red?.id === you) return { bout, side: "red" };
      if (bout.blue?.id === you) return { bout, side: "blue" };
    }
    return null;
  }
  function refreshCricketWatchers(cfg) {
    watchCfg = cfg;
    watchCfgAt = Date.now();
    if (!timerId) {
      timerId = setInterval(watchTick, WATCH_INTERVAL_MS);
    }
  }
  function isActive(cfg) {
    if (!cfg || !cfg.running || Date.now() - watchCfgAt > CONFIG_STALE_MS) return false;
    if (cfg.runMode === "all" && cfg.areaEnabled?.benDo === false) return false;
    return stores.main?.getState().screen === "benDo";
  }
  function watchTick() {
    const cfg = watchCfg;
    if (!isActive(cfg)) {
      if (timerId && Date.now() - watchCfgAt > CONFIG_STALE_MS * 6) {
        clearInterval(timerId);
        timerId = null;
      }
      return;
    }
    const bnStore = stores.benNet;
    if (!bnStore) return;
    const bn = bnStore.getState();
    if (bn.status !== "in") return;
    try {
      if (cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false) {
        watchHuntHop(bn);
      }
      if (cfg.benSubEnabled?.cricketBoss !== false) {
        if (cfg.benAutoTickle !== false) watchBoutTickle(bn);
        if (cfg.benAutoBet) watchArenaBets(bn, cfg);
      }
    } catch (err) {
      console.warn("[NTG Auto] cricket watcher error:", err);
    }
  }
  function watchHuntHop(bn) {
    const hunt = bn.hunt;
    const phase = hunt?.phase;
    if (phase !== lastHuntPhase) {
      if (lastHuntPhase === "light" && phase === "seek" && lightSentAt > 0) {
        const sample = performance.now() - lightSentAt;
        if (sample > 0 && sample < 2e3) rttMs = Math.round(rttMs * 0.5 + sample * 0.5);
        lightSentAt = 0;
      }
      lastHuntPhase = phase;
    }
    const miss = hunt?.miss;
    if (miss && typeof miss.seq === "number" && miss.seq !== lastMissSeq) {
      lastMissSeq = miss.seq;
      const why = {
        early: "\xFAp s\u1EDBm, d\u1EBF c\xF2n \u0111ang bay",
        feint: "d\u1EBF nh\xFAn gi\u1EA3 b\u1EADt \u0111i",
        wrong: "\xFAp nh\u1EA7m b\u1EE5i",
        slipped: "\xFAp tr\xFAng nh\u01B0ng d\u1EBF l\xE1ch ra"
      };
      pushEvent(`\u{1F997} H\u1EE5t: ${why[miss.kind] || miss.kind} (ping ~${rttMs}ms)`);
    }
    const hop = phase === "hop" ? hunt?.hop : void 0;
    if (!hop || hop.n === scheduledHopN) return;
    scheduledHopN = hop.n;
    if ((hop.window || 0) < MIN_TRAP_WINDOW_MS) {
      pushEvent(`\u{1F997} B\u1EE5i ${hop.spot + 1}: d\u1EBF nh\xFAn gi\u1EA3 (${hop.window}ms) -> b\u1ECF qua, ch\u1EDD l\u1EA7n nh\u1EA3y sau`);
      return;
    }
    const arrivedAt = typeof hop.at === "number" ? hop.at : performance.now();
    const oneWayMs = Math.round(rttMs / 2);
    const landingAt = arrivedAt - oneWayMs + (hop.air || 0);
    const fireAt = landingAt + TRAP_SERVER_MARGIN_MS - oneWayMs;
    const delay = Math.max(0, fireAt - performance.now());
    const { n, spot } = hop;
    setTimeout(() => {
      const cur = stores.benNet?.getState().hunt;
      if (cur?.phase !== "hop" || cur.hop?.n !== n) return;
      const pressed = pressTuft(spot);
      if (!pressed) sendBenWs({ t: "trap", n, spot });
      pushEvent(`\u{1F997} \u0110\xE3 b\u1EA5m ph\xEDm ${spot + 1} \xFAp b\u1EE5i c\u1ECF (c\xF2n ${hop.left} l\u1EA7n nh\u1EA3y \xB7 ping ~${rttMs}ms)`);
    }, delay);
  }
  function pressTuft(spot) {
    try {
      const keyStr = String(spot + 1);
      const codeStr = `Digit${spot + 1}`;
      window.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: keyStr,
          code: codeStr,
          bubbles: true,
          cancelable: true
        })
      );
    } catch {
    }
    const btn = document.querySelectorAll(".ben-hunt-field .ben-tuft")[spot];
    if (btn) {
      try {
        const opts = { bubbles: true, cancelable: true, pointerId: 1, pointerType: "mouse", isPrimary: true, button: 0 };
        btn.dispatchEvent(new PointerEvent("pointerdown", opts));
        btn.dispatchEvent(new PointerEvent("pointerup", opts));
        btn.style.outline = "3px solid #ffd84d";
        btn.style.borderRadius = "8px";
        setTimeout(() => {
          btn.style.outline = "";
        }, 350);
      } catch {
      }
      return true;
    }
    return false;
  }
  function watchBoutTickle(bn) {
    const mine = getMyBout(bn);
    if (!mine) return;
    const { bout, side } = mine;
    const left = bout.tickles?.[side] ?? 0;
    if (left <= 0 || typeof bout.startAt !== "number") return;
    const now = getBenServerNow(bn);
    const clashN = bout.n || 0;
    const clashAt = bout.startAt + clashN * CLASH_INTERVAL_MS;
    const inWindup = now >= clashAt - 500 && now < clashAt + 30;
    const wavering = (bout.fire?.[side] ?? 100) < 30;
    let key = null;
    if (wavering) {
      key = `${bout.id}:waver:${clashN}`;
    } else if (inWindup && left > 1) {
      key = `${bout.id}:windup:${clashN}`;
    }
    if (!key || tickledKeys.has(key)) return;
    if (now < bout.startAt - 650) return;
    tickledKeys.add(key);
    if (tickledKeys.size > 200) tickledKeys.clear();
    sendBenWs({ t: "tickle", id: bout.id });
  }
  function watchArenaBets(bn, cfg) {
    const betsToday = bn.soi?.bets;
    if (typeof betsToday !== "number" || betsToday >= MAX_BETS_PER_DAY) return;
    const shells = bn.wallet?.shells || 0;
    const amount = Math.max(10, Math.floor(Number(cfg.benBetAmount) || 50));
    if (shells < amount) return;
    const now = getBenServerNow(bn);
    const you = bn.you;
    for (const bout of Object.values(bn.bouts || {})) {
      if (bout.end || !bout.odds || !bout.betUntil || now >= bout.betUntil - 300) continue;
      if (bout.red?.id === you || bout.blue?.id === you) continue;
      if (bn.myBets?.[bout.id] || betBoutIds.has(bout.id)) continue;
      const side = pickBetSide(bout);
      betBoutIds.add(bout.id);
      sendBenWs({ t: "bet", id: bout.id, side, shells: amount });
      return;
    }
  }
  function pickBetSide(bout) {
    const odds = bout.odds;
    if (odds && typeof odds.red === "number" && typeof odds.blue === "number" && odds.red !== odds.blue) {
      return odds.red < odds.blue ? "red" : "blue";
    }
    const sum = (s) => (s?.power || 0) + (s?.tough || 0) + (s?.nerve || 0);
    return sum(bout.blue?.stats) > sum(bout.red?.stats) ? "blue" : "red";
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
      village: (() => {
        const v = m.village;
        const soldN = v?.nightSold?.day === m.day ? v?.nightSold?.n || 0 : 0;
        return {
          ...v,
          quotaLeft: Math.max(0, 20 - soldN)
        };
      })(),
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
        panel: bu.panel,
        field: bu.field ?? null
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
        notice: bn.notice,
        wheel: bn.wheel,
        crickets: bn.crickets,
        soi: bn.soi,
        bouts: bn.bouts,
        hunt: bn.hunt,
        caught: bn.caught,
        gotAway: bn.gotAway ?? null,
        boutDone: bn.boutDone,
        you: bn.you,
        watching: bn.watching ?? null,
        cricketEvents: getCricketEvents()
      } : null
    };
  }

  // src/page-hook/core/interrupts.ts
  function extractNotificationText(obj) {
    if (!obj) return "";
    if (typeof obj === "string") return obj.trim();
    if (typeof obj === "object") {
      const rec = obj;
      const title = typeof rec.title === "string" ? rec.title.trim() : "";
      const body = typeof rec.text === "string" ? rec.text.trim() : typeof rec.msg === "string" ? rec.msg.trim() : typeof rec.content === "string" ? rec.content.trim() : typeof rec.body === "string" ? rec.body.trim() : typeof rec.desc === "string" ? rec.desc.trim() : "";
      if (title && body) return `${title}: ${body}`;
      if (title) return title;
      if (body) return body;
      const topic = typeof rec.topic === "string" ? rec.topic.trim() : "";
      if (topic) return `Ch\u1EE7 \u0111\u1EC1: ${topic}`;
    }
    return "";
  }
  function dismissInterruptsIfNeeded(cfg) {
    const m = stores.main?.getState();
    if (!m) return null;
    if (cfg && cfg.autoDismissInterrupts === false) return null;
    if (m.phone) {
      const info = extractNotificationText(m.phone);
      m.closePhone?.();
      const detailMsg = info ? `\u{1F4F1} [\u0110i\u1EC7n tho\u1EA1i]: "${info}"` : "\u{1F4F1} [\u0110i\u1EC7n tho\u1EA1i]: C\xF3 th\xF4ng b\xE1o m\u1EDBi";
      return { acted: true, msg: detailMsg };
    }
    if (m.announcement) {
      const info = extractNotificationText(m.announcement);
      m.answerAnnouncement?.(false);
      const detailMsg = info ? `\u{1F4E2} [Loa x\xE3]: "${info}"` : "\u{1F4E2} [Loa x\xE3]: Th\xF4ng b\xE1o ph\xE1t thanh m\u1EDBi";
      return { acted: true, msg: detailMsg };
    }
    if (m.tip) {
      const info = extractNotificationText(m.tip);
      m.answerTip?.(false);
      return { acted: true, msg: info ? `\u{1F4A1} [M\u1EB9o nhanh]: ${info}` : "\u{1F4A1} \u0110\xE3 \u0111\xF3ng h\u01B0\u1EDBng d\u1EABn nhanh" };
    }
    if (m.call) {
      if (m.call.stage === "ringing") {
        m.acceptCall?.();
      }
      const stAfter = stores.main?.getState();
      if (stAfter?.call) {
        const fromName = stAfter.call.from === "noi" ? "B\xE0 N\u1ED9i" : stAfter.call.from === "sau" ? "\xD4ng S\xE1u" : stAfter.call.from || "Ng\u01B0\u1EDDi g\u1ECDi";
        const callText = extractNotificationText(stAfter.call);
        const detailInfo = callText ? ` - "${callText}"` : "";
        if (stAfter.call.from === "noi") {
          stAfter.hangUpGrandma?.("bye");
          return { acted: true, msg: `\u{1F475} [\u0110i\u1EC7n tho\u1EA1i B\xE0 N\u1ED9i]: \u0110\xE3 nghe m\xE1y & nh\u1EADn qu\xE0${detailInfo}` };
        }
        if (stAfter.call.from === "sau" && stAfter.call.topic === "sea") {
          stAfter.openSea?.();
          stAfter.endCall?.("ok");
          return { acted: true, msg: `\u{1F4DE} [\u0110i\u1EC7n tho\u1EA1i \xD4ng S\xE1u]: M\u1EDF \u0111\u01B0\u1EDDng ra Bi\u1EC3n${detailInfo}` };
        }
        if (stAfter.call.from === "sau" && !stAfter.uncleBa?.met) {
          stAfter.answerSau?.(false);
        }
        stAfter.endCall?.("ok");
        return { acted: true, msg: `\u{1F4DE} [\u0110i\u1EC7n tho\u1EA1i ${fromName}]: \u0110\xE3 nghe cu\u1ED9c g\u1ECDi${detailInfo}` };
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
    if (m.missedOrder) {
      m.ackMissedOrder?.();
      return { acted: true, msg: "\u26A0\uFE0F [Ch\u1ECB Na]: \u0110\xE3 b\u1ECF l\u1EE1 \u0111\u01A1n giao h\xE0ng h\xF4m nay!" };
    }
    if (m.dairy?.news) {
      const n = extractNotificationText(m.dairy.news);
      m.ackDairyNews?.();
      return { acted: true, msg: n ? `\u{1F404} [B\xF2 s\u1EEFa]: ${n}` : "\u{1F404} [B\xF2 s\u1EEFa]: C\xF3 th\xF4ng b\xE1o m\u1EDBi v\u1EC1 \u0111\xE0n b\xF2!" };
    }
    if (m.buffalo?.news) {
      const n = extractNotificationText(m.buffalo.news);
      m.ackBuffaloNews?.();
      return { acted: true, msg: n ? `\u{1F403} [Tr\xE2u]: ${n}` : "\u{1F403} [Tr\xE2u]: C\xF3 th\xF4ng b\xE1o m\u1EDBi v\u1EC1 Tr\xE2u!" };
    }
    if (m.henNews) {
      const n = extractNotificationText(m.henNews);
      m.ackHenNews?.();
      return { acted: true, msg: n ? `\u{1F414} [Chu\u1ED3ng g\xE0]: ${n}` : "\u{1F414} [Chu\u1ED3ng g\xE0]: C\xF3 th\xF4ng b\xE1o m\u1EDBi v\u1EC1 \u0111\xE0n g\xE0!" };
    }
    if (m.pond?.news) {
      const n = extractNotificationText(m.pond.news);
      m.ackPondNews?.();
      return { acted: true, msg: n ? `\u{1F41F} [Ao c\xE1]: ${n}` : "\u{1F41F} [Ao c\xE1]: C\xF3 th\xF4ng b\xE1o m\u1EDBi v\u1EC1 Ao c\xE1!" };
    }
    if (m.pets?.news) {
      const n = extractNotificationText(m.pets.news);
      m.ackPetNews?.();
      return { acted: true, msg: n ? `\u{1F415} [Th\xFA c\u01B0ng]: ${n}` : "\u{1F415} [Th\xFA c\u01B0ng]: C\xF3 tin m\u1EDBi v\u1EC1 th\xFA c\u01B0ng!" };
    }
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

  // src/page-hook/modules/farm/types.ts
  var NOT_ACTED = { acted: false };
  var CROP_NAMES = {
    radish: "C\u1EE7 c\u1EA3i",
    carrot: "C\xE0 r\u1ED1t",
    corn: "B\u1EAFp ng\xF4",
    rice: "L\xFAa th\u01A1m",
    egg: "Tr\u1EE9ng g\xE0"
  };
  var DISH_NAMES = {
    radishSoup: "Canh c\u1EE7 c\u1EA3i",
    boiledEgg: "Tr\u1EE9ng lu\u1ED9c",
    grilledCorn: "B\u1EAFp n\u01B0\u1EDBng m\u1EE1 h\xE0nh",
    carrotJuice: "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t",
    eggBread: "B\xE1nh m\xEC \u1ED1p la",
    comTam: "C\u01A1m t\u1EA5m \u1ED1p la",
    cornCake: "B\xE1nh b\u1EAFp n\u01B0\u1EDBng"
  };
  var DISH_LABELS = {
    radishSoup: "Canh c\u1EE7 c\u1EA3i \u{1F372}",
    boiledEgg: "Tr\u1EE9ng lu\u1ED9c \u{1F95A}",
    grilledCorn: "B\u1EAFp n\u01B0\u1EDBng m\u1EE1 h\xE0nh \u{1F33D}",
    carrotJuice: "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t \u{1F9C3}",
    eggBread: "B\xE1nh m\xEC \u1ED1p la \u{1F96A}",
    comTam: "C\u01A1m t\u1EA5m \u1ED1p la \u{1F35B}",
    cornCake: "B\xE1nh b\u1EAFp n\u01B0\u1EDBng \u{1F96E}"
  };
  var PET_FOOD_NAMES = {
    xuong: "X\u01B0\u01A1ng g\u1EB7m \u{1F9B4}",
    cakho: "C\xE1 kh\xF4 \u{1F41F}",
    pate: "Pate c\xE1 ng\u1EEB \u{1F96B}",
    hat: "H\u1EA1t t\u1ED5ng h\u1EE3p \u{1F963}",
    coKho: "C\u1ECF kh\xF4 \u{1F33F}",
    cam: "C\xE1m heo \u{1F33E}",
    "crop:carrot": "C\xE0 r\u1ED1t \u{1F955}",
    "crop:corn": "B\u1EAFp ng\xF4 \u{1F33D}",
    "crop:radish": "C\u1EE7 c\u1EA3i \u{1F331}"
  };
  var POND_FISH_NAMES = {
    chep: "C\xE1 ch\xE9p",
    tre: "C\xE1 tr\xEA",
    ro: "C\xE1 r\xF4 \u0111\u1ED3ng"
  };
  var GOLD_NAMES = {
    mieng: "V\xE0ng mi\u1EBFng 9999",
    nhan: "Nh\u1EABn tr\u01A1n 9999",
    k18: "V\xE0ng 18K",
    non: "V\xE0ng non 10K"
  };
  var SHOP_FOOD_NAMES = {
    banhBao: "B\xE1nh bao \u{1F95F}",
    banhMiTrung: "B\xE1nh m\xEC tr\u1EE9ng \u{1F373}",
    banhMiThit: "B\xE1nh m\xEC th\u1ECBt \u{1F956}",
    banhMiCha: "B\xE1nh m\xEC ch\u1EA3 c\xE1 \u{1F41F}",
    banhMiFull: "B\xE1nh m\xEC full topping \u{1F924}"
  };
  var SHOP_DRINK_NAMES = {
    traDa: "Tr\xE0 \u0111\xE1 \u{1F9CA}",
    nuocMia: "N\u01B0\u1EDBc m\xEDa \u{1F964}",
    caPheSua: "C\xE0 ph\xEA s\u1EEFa \u0111\xE1 \u2615",
    traDao: "Tr\xE0 \u0111\xE0o cam s\u1EA3 \u{1F351}",
    traSua: "Tr\xE0 s\u1EEFa tr\xE2n ch\xE2u \u{1F9CB}"
  };
  function getItemLabel(id) {
    return DISH_NAMES[id] || CROP_NAMES[id] || PET_FOOD_NAMES[id] || POND_FISH_NAMES[id] || GOLD_NAMES[id] || SHOP_FOOD_NAMES[id] || SHOP_DRINK_NAMES[id] || id;
  }
  var formatVnd = (n) => n.toLocaleString("vi-VN");
  var farmUiTimer = null;
  function showFarmActionUI(cfg, uiState, durationMs = 1200) {
    if (!cfg.showFullActions) return;
    if (farmUiTimer) {
      clearTimeout(farmUiTimer);
      farmUiTimer = null;
    }
    setMainState({
      panel: null,
      vendor: null,
      shop: null,
      ...uiState
    });
    farmUiTimer = setTimeout(() => {
      setMainState({ panel: null, vendor: null, shop: null });
      farmUiTimer = null;
    }, durationMs);
  }

  // src/page-hook/modules/farm/house.ts
  var LEARN_LIST = ["grilledCorn", "carrotJuice", "eggBread", "comTam", "cornCake"];
  var ALL_DISHES_ORDER = ["radishSoup", "boiledEgg", "grilledCorn", "carrotJuice", "eggBread", "comTam", "cornCake"];
  var KITCHEN_FOOD_ORDER = ["radishSoup", "boiledEgg", "grilledCorn", "eggBread", "comTam", "cornCake"];
  var KITCHEN_DRINK_ORDER = ["radishSoup", "carrotJuice", "comTam"];
  var DISH_CROP_MAP = {
    radishSoup: { crop: "radish", need: 3 },
    carrotJuice: { crop: "carrot", need: 3 },
    grilledCorn: { crop: "corn", need: 2 },
    eggBread: { crop: "carrot", need: 1 },
    comTam: { crop: "radish", need: 2 },
    cornCake: { crop: "corn", need: 4 }
  };
  var SHOP_FOOD_ORDER = ["banhBao", "banhMiTrung", "banhMiThit", "banhMiCha", "banhMiFull"];
  var SHOP_FOOD_PRICES = {
    banhBao: 8e3,
    banhMiTrung: 1e4,
    banhMiThit: 15e3,
    banhMiCha: 15e3,
    banhMiFull: 25e3
  };
  var SHOP_FOOD_LABELS = {
    banhBao: "B\xE1nh bao \u{1F95F}",
    banhMiTrung: "B\xE1nh m\xEC tr\u1EE9ng \u{1F373}",
    banhMiThit: "B\xE1nh m\xEC th\u1ECBt \u{1F956}",
    banhMiCha: "B\xE1nh m\xEC ch\u1EA3 c\xE1 \u{1F41F}",
    banhMiFull: "B\xE1nh m\xEC full topping \u{1F924}"
  };
  var SHOP_DRINK_ORDER = ["traDa", "nuocMia", "caPheSua", "traDao", "traSua"];
  var DRINK_PRICES = {
    traDa: 3e3,
    nuocMia: 8e3,
    caPheSua: 12e3,
    traDao: 15e3,
    traSua: 18e3
  };
  var DRINK_LABELS = {
    traDa: "Tr\xE0 \u0111\xE1 \u{1F9CA}",
    nuocMia: "N\u01B0\u1EDBc m\xEDa \u{1F964}",
    caPheSua: "C\xE0 ph\xEA s\u1EEFa \u0111\xE1 \u2615",
    traDao: "Tr\xE0 \u0111\xE0o cam s\u1EA3 \u{1F351}",
    traSua: "Tr\xE0 s\u1EEFa tr\xE2n ch\xE2u \u{1F9CB}"
  };
  function tryCook(cfg) {
    const m = getMainState();
    for (const rId of LEARN_LIST) {
      if (!m.kitchen?.known?.includes(rId) && m.learnRecipe?.(rId) === "ok") {
        return { acted: true, msg: `\u{1F4D6} \u0110\xE3 h\u1ECDc c\xF4ng th\u1EE9c n\u1EA5u m\xF3n ${DISH_NAMES[rId] || rId}` };
      }
    }
    const cur = getMainState();
    const maxSlots = (cur.houseLevel || 0) >= 1 ? 2 : 1;
    if ((cur.kitchen?.cooking?.length || 0) >= maxSlots) return null;
    const dishes = cfg.preferDish && cfg.preferDish !== "auto" ? [cfg.preferDish, ...ALL_DISHES_ORDER] : ALL_DISHES_ORDER;
    const seen = /* @__PURE__ */ new Set();
    for (const d of dishes) {
      if (!d || seen.has(d)) continue;
      seen.add(d);
      if (!cur.kitchen?.known?.includes(d)) continue;
      if ((cur.kitchen?.stock?.[d] || 0) >= 3) continue;
      const ing = DISH_CROP_MAP[d];
      if (ing && cur.order && cur.order.crop === ing.crop && !(cur.day === 2 && !cur.firstDay?.cooked)) {
        const have = cur.produce?.[ing.crop] || 0;
        if (have < cur.order.qty + ing.need) continue;
      }
      if (cur.cook?.(d) === "ok") {
        showFarmActionUI(cfg, { panel: "kitchen" });
        return { acted: true, msg: `\u{1F373} \u0110\xE3 b\u1EAFc b\u1EBFp n\u1EA5u m\xF3n ${DISH_NAMES[d] || d}` };
      }
    }
    return null;
  }
  function tryRecoverHunger(cfg, threshold) {
    const st = getMainState();
    if ((st.fullness || 0) >= threshold || !canAct("farm_eat", 3500)) return null;
    const foodSource = cfg.foodSource || "kitchen_first";
    if (foodSource !== "shop_only") {
      const prefKitchen = cfg.preferFoodKitchen || "auto";
      const dishOrder = prefKitchen !== "auto" ? [prefKitchen] : KITCHEN_FOOD_ORDER;
      for (const d of dishOrder) {
        if ((st.kitchen?.stock?.[d] || 0) > 0 && st.eatDish?.(d) === true) {
          markActed("farm_eat");
          showFarmActionUI(cfg, { panel: "kitchen" });
          return { acted: true, msg: `\u{1F372} \u0110\xE3 \u0103n ${DISH_LABELS[d] || d} trong b\u1EBFp h\u1ED3i \u0110\xF3i (${st.fullness}%)` };
        }
      }
    }
    if (foodSource !== "kitchen_only") {
      const shopItems = [cfg.preferFoodShop || "banhMiThit", ...SHOP_FOOD_ORDER];
      const seen = /* @__PURE__ */ new Set();
      for (const item of shopItems) {
        if (!item || seen.has(item)) continue;
        seen.add(item);
        if ((st.gold || 0) >= (SHOP_FOOD_PRICES[item] || 8e3) && st.buyFood?.(item) === "ok") {
          markActed("farm_eat");
          showFarmActionUI(cfg, { vendor: "bakery", shop: "menu" });
          return { acted: true, msg: `\u{1F956} \u0110\xE3 mua & \u0103n ${SHOP_FOOD_LABELS[item] || item} t\u1EA1i Ti\u1EC7m b\xE1nh h\u1ED3i \u0110\xF3i` };
        }
      }
    }
    return null;
  }
  function tryRecoverThirst(cfg, threshold) {
    const st = getMainState();
    if ((st.hydration || 0) >= threshold || !canAct("farm_drink", 3500)) return null;
    const drinkSource = cfg.drinkSource || "kitchen_first";
    if (drinkSource !== "shop_only") {
      const prefDrinkKitchen = cfg.preferDrinkKitchen || "auto";
      const kitchenDrinks = prefDrinkKitchen !== "auto" ? [prefDrinkKitchen] : KITCHEN_DRINK_ORDER;
      for (const d of kitchenDrinks) {
        if ((st.kitchen?.stock?.[d] || 0) > 0 && st.eatDish?.(d) === true) {
          markActed("farm_drink");
          showFarmActionUI(cfg, { panel: "kitchen" });
          return { acted: true, msg: `\u{1F9C3} \u0110\xE3 d\xF9ng ${DISH_LABELS[d] || d} trong b\u1EBFp gi\u1EA3i Kh\xE1t (${st.hydration}%)` };
        }
      }
    }
    if (drinkSource !== "kitchen_only") {
      const drinkOrder = [cfg.preferDrinkShop || "nuocMia", ...SHOP_DRINK_ORDER];
      const seen = /* @__PURE__ */ new Set();
      for (const dr of drinkOrder) {
        if (!dr || seen.has(dr)) continue;
        seen.add(dr);
        if ((st.gold || 0) >= (DRINK_PRICES[dr] || 3e3) && st.buyFood?.(dr) === "ok") {
          markActed("farm_drink");
          showFarmActionUI(cfg, { vendor: "cafe", shop: "menu" });
          return { acted: true, msg: `\u{1F964} \u0110\xE3 mua & u\u1ED1ng ${DRINK_LABELS[dr] || dr} gi\u1EA3i Kh\xE1t` };
        }
      }
    }
    return null;
  }
  function handleHouseSubArea(cfg) {
    if (cfg.autoCook) {
      const cooked = tryCook(cfg);
      if (cooked) return cooked;
    }
    const thH = Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 45;
    const thT = Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 45;
    const thB = Number(cfg.batteryThreshold) || 35;
    if (cfg.autoRecoverHunger !== false) {
      const res = tryRecoverHunger(cfg, thH);
      if (res) return res;
    }
    if (cfg.autoRecoverThirst !== false) {
      const res = tryRecoverThirst(cfg, thT);
      if (res) return res;
    }
    if (cfg.autoMorningCoffee !== false) {
      const st = getMainState();
      if (st.coffeeDay !== st.day && (st.gold || 0) >= 3e4 && canAct("farm_coffee", 4e3) && st.buyFood?.("caPheSua") === "ok") {
        markActed("farm_coffee");
        showFarmActionUI(cfg, { vendor: "cafe", shop: "menu" });
        return { acted: true, msg: "\u2615 \u0110\xE3 u\u1ED1ng C\xE0 ph\xEA s\u1EEFa \u0111\xE1 (+25% n\u01B0\u1EDBc, ch\u1EA1y nhanh su\u1ED1t ng\xE0y)" };
      }
    }
    if (cfg.autoChargeVehicle !== false) {
      const st = getMainState();
      if (st.vehicle && (st.battery || 0) < thB && (st.gold || 0) >= 35e3 && canAct("farm_vehicle", 4e3)) {
        const charged = st.chargeVehicle?.();
        if (typeof charged === "number" && charged > 0) {
          markActed("farm_vehicle");
          showFarmActionUI(cfg, { panel: "ev" });
          return { acted: true, msg: `\u{1F50B} \u0110\xE3 s\u1EA1c \u0111\u1EA7y pin xe \u0111i\u1EC7n (-${formatVnd(charged)}\u0111)` };
        }
      }
    }
    return NOT_ACTED;
  }
  function handleSalonSubArea(cfg) {
    if (!getMainState().salonOpen) return NOT_ACTED;
    if (cfg.autoSalonShampoo !== false) {
      const st = getMainState();
      const hasRelax = (st.kitchen?.buffs || []).some((b) => b.kind === "relax" && b.day === st.day);
      if (!hasRelax && (st.gold || 0) >= 15e4 && st.shampoo?.() === "ok") {
        showFarmActionUI(cfg, { panel: "salon" });
        return { acted: true, msg: "\u{1F486} \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y g\u1ED9i \u0111\u1EA7u d\u01B0\u1EE1ng sinh (Buff th\u01B0 gi\xE3n)" };
      }
    }
    if (cfg.autoSalonWhiten) {
      const st = getMainState();
      if ((st.player?.outfit?.tan || 0) > 0 && (st.gold || 0) >= 3e5 && st.whiten?.() === "ok") {
        showFarmActionUI(cfg, { panel: "salon" });
        return { acted: true, msg: "\u2728 \u0110\xE3 gh\xE9 Ch\u1ECB Linh T\xE2y t\u1EAFm tr\u1EAFng n\xE2ng t\xF4ng da" };
      }
    }
    return NOT_ACTED;
  }

  // src/page-hook/modules/farm/crops.ts
  var YIELD_PER_PLOT = 4;
  var SEED_FALLBACK_ORDER = ["rice", "corn", "carrot", "radish"];
  function applyOnPlot(key, tool) {
    const mainScene = getActiveScene("MainScene");
    const s0 = getMainState();
    s0.setActiveTool?.(tool);
    const p0 = s0.plots?.[key];
    const prevWatered = p0?.watered;
    const prevCrop = p0?.crop;
    const prevCropId = prevCrop?.id;
    const prevStage = prevCrop?.stage;
    const prevFertilized = prevCrop?.fertilized;
    const prevPests = prevCrop?.pests;
    if (mainScene && typeof mainScene.doWork === "function") {
      try {
        mainScene.doWork({ plot: key, tool });
      } catch {
      }
      const pAfter = getMainState().plots?.[key];
      const hasChanged = pAfter !== p0 || pAfter?.watered !== prevWatered || pAfter?.crop?.id !== prevCropId || pAfter?.crop?.stage !== prevStage || pAfter?.crop?.fertilized !== prevFertilized || pAfter?.crop?.pests !== prevPests;
      if (hasChanged) return true;
    }
    const res = getMainState().applyTool?.(key, tool);
    if (res && mainScene?.plots?.playEffect) {
      try {
        mainScene.plots.playEffect(res, key);
      } catch {
      }
    }
    const pFinal = getMainState().plots?.[key];
    return Boolean(res) || pFinal !== p0 || pFinal?.watered !== prevWatered || pFinal?.crop?.id !== prevCropId || pFinal?.crop?.stage !== prevStage || pFinal?.crop?.fertilized !== prevFertilized || pFinal?.crop?.pests !== prevPests;
  }
  function ensureSeed(cropId) {
    const cur = getMainState();
    if ((cur.seeds?.[cropId] || 0) > 0) return cropId;
    const payload = { radish: 0, carrot: 0, corn: 0, rice: 0 };
    if (!(cropId in payload)) return null;
    payload[cropId] = 1;
    if (cur.buySeeds?.(payload) === true && (getMainState().seeds?.[cropId] || 0) > 0) {
      return cropId;
    }
    return null;
  }
  function countGrowingCrop(cropId) {
    const plots = getMainState().plots || {};
    return Object.values(plots).filter((p) => p?.crop?.id === cropId).length;
  }
  function chooseSeed(cfg) {
    const cur = getMainState();
    const pref = cfg.preferSeed || "auto";
    if (pref !== "auto") {
      const got = ensureSeed(pref);
      if (got) return got;
    }
    if (cur.order?.crop) {
      const c = cur.order.crop;
      if ((cur.produce?.[c] || 0) + countGrowingCrop(c) * YIELD_PER_PLOT < cur.order.qty) {
        const got = ensureSeed(c);
        if (got) return got;
      }
    }
    for (const task of cur.daily?.tasks || []) {
      if (!task.claimed && task.kind === "harvest" && task.crop) {
        const harvestedNow = (cur.stats?.harvested?.[task.crop] || 0) - (task.base || 0);
        if (harvestedNow + countGrowingCrop(task.crop) * YIELD_PER_PLOT < (task.need || 0)) {
          const got = ensureSeed(task.crop);
          if (got) return got;
        }
      }
    }
    for (const req of cur.village?.requests || []) {
      if (!req.done && req.goods && req.goods !== "egg") {
        if ((cur.produce?.[req.goods] || 0) + countGrowingCrop(req.goods) * YIELD_PER_PLOT < (req.qty || 0)) {
          const got = ensureSeed(req.goods);
          if (got) return got;
        }
      }
    }
    if ((cur.day || 0) <= 2 && !cur.firstDay?.cooked && (cur.produce?.radish || 0) + countGrowingCrop("radish") * YIELD_PER_PLOT < 3) {
      const got = ensureSeed("radish");
      if (got) return got;
    }
    for (const c of SEED_FALLBACK_ORDER) {
      if ((cur.seeds?.[c] || 0) > 0) return c;
    }
    for (const c of SEED_FALLBACK_ORDER) {
      const got = ensureSeed(c);
      if (got) return got;
    }
    return null;
  }
  function handleCropsSubArea(cfg) {
    const st = getMainState();
    const plotKeys = Object.keys(st.plots || {});
    if (cfg.autoHarvest !== false) {
      for (const key of plotKeys) {
        if (st.previewTool?.(key, "basket")) {
          const cropId = st.plots?.[key]?.crop?.id || "";
          if (applyOnPlot(key, "basket")) {
            return { acted: true, msg: `\u{1F9FA} Thu ho\u1EA1ch ${CROP_NAMES[cropId] || "n\xF4ng s\u1EA3n"} \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoPesticide !== false) {
      for (const key of plotKeys) {
        if (!st.plots?.[key]?.crop?.pests) continue;
        if ((st.items?.pesticide || 0) <= 0 && (st.gold || 0) >= 8e3) {
          st.buyItems?.({ fertilizer: 0, pesticide: 1, mysteryBag: 0 });
        }
        if ((getMainState().items?.pesticide || 0) > 0 && applyOnPlot(key, "pesticide")) {
          return { acted: true, msg: `\u{1F41B} \u0110\xE3 x\u1ECBt thu\u1ED1c tr\u1EEB s\xE2u \xF4 (${key})` };
        }
      }
    }
    if (cfg.autoPlant !== false) {
      const curP = getMainState();
      const emptyKeys = plotKeys.filter((k) => {
        const p = curP.plots?.[k];
        return p && !p.crop;
      });
      if (emptyKeys.length > 0) {
        if ((curP.items?.mysteryBag || 0) > 0 && curP.consumeItem?.("mysteryBag")) {
          return { acted: true, msg: "\u{1F381} \u0110\xE3 m\u1EDF T\xFAi h\u1EA1t b\xED \u1EA9n nh\u1EADn th\xEAm h\u1EA1t gi\u1ED1ng" };
        }
        const seed = chooseSeed(cfg);
        if (seed) {
          for (const emptyKey of emptyKeys) {
            if (applyOnPlot(emptyKey, `seed:${seed}`)) {
              return { acted: true, msg: `\u{1F331} \u0110\xE3 gieo h\u1EA1t ${CROP_NAMES[seed] || seed} \xF4 (${emptyKey})` };
            }
          }
        }
      }
    }
    if (cfg.autoWater !== false) {
      const curW = getMainState();
      for (const key of plotKeys) {
        const p = curW.plots?.[key];
        const isDry = p?.crop && !p.watered;
        if (curW.previewTool?.(key, "wateringCan") || isDry) {
          if (applyOnPlot(key, "wateringCan")) {
            return { acted: true, msg: `\u{1F4A7} \u0110\xE3 t\u01B0\u1EDBi n\u01B0\u1EDBc \xF4 (${key})` };
          }
        }
      }
    }
    if (cfg.autoFertilize) {
      const cur = getMainState();
      for (const key of plotKeys) {
        const p = cur.plots?.[key];
        if (!p?.crop || p.crop.fertilized || !cur.previewTool?.(key, "fertilizer")) continue;
        if ((cur.items?.fertilizer || 0) <= 0 && (cur.gold || 0) >= 15e3) {
          cur.buyItems?.({ fertilizer: 1, pesticide: 0, mysteryBag: 0 });
        }
        if ((getMainState().items?.fertilizer || 0) > 0 && applyOnPlot(key, "fertilizer")) {
          return { acted: true, msg: `\u2728 \u0110\xE3 b\xF3n ph\xE2n NPK \xF4 (${key})` };
        }
      }
    }
    if (cfg.autoPayHelperCrops !== false) {
      const curHelper = getMainState();
      if (curHelper.helpers?.crops?.hired && (curHelper.helpers.crops.unpaid || 0) > 0 && curHelper.payHelper?.("crops") === true) {
        return { acted: true, msg: "\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng n\u1EE3 cho T\xE8o ph\u1EE5 ru\u1ED9ng" };
      }
    }
    const curOffer = getMainState();
    if (cfg.autoBuyPlots !== false && curOffer.plotOffer && (curOffer.gold || 0) >= (curOffer.plotOffer.price || 0)) {
      if (curOffer.buyPlot?.() === true) {
        return { acted: true, msg: "\u{1F331} \u0110\xE3 mua th\xEAm \xF4 \u0111\u1EA5t ru\u1ED9ng m\u1EDBi (+1 \xF4)" };
      }
    }
    return NOT_ACTED;
  }

  // src/page-hook/modules/farm/animals.ts
  var DEFAULT_PET_FOOD = ["xuong", "cakho", "pate", "hat", "coKho", "cam", "crop:carrot", "crop:corn", "crop:radish"];
  var DEFAULT_PET_SHOP = ["pate", "hat", "xuong", "cakho", "coKho", "cam"];
  var PET_DIETS = [
    { kinds: ["muop", "tamThe", "anhLongNgan", "xiem"], foods: ["cakho", "pate", "hat"], shop: ["cakho", "pate", "hat"] },
    { kinds: ["thoTrang", "thoNau"], foods: ["crop:carrot", "coKho", "crop:radish"], shop: ["coKho"] },
    { kinds: ["heoHong", "heoMini"], foods: ["crop:corn", "cam", "crop:radish", "crop:carrot"], shop: ["cam"] },
    { kinds: ["vang", "muc", "husky", "corgi", "pug"], foods: ["xuong", "pate", "hat"], shop: ["xuong", "pate", "hat"] }
  ];
  var PET_TRICKS = ["dance", "roll", "paw", "sit", "come"];
  var PET_TRICK_NAMES = {
    dance: "Nh\u1EA3y m\xFAa",
    roll: "L\u0103n v\xF2ng",
    paw: "B\u1EAFt tay",
    sit: "Ng\u1ED3i ngoan",
    come: "L\u1EA1i \u0111\xE2y"
  };
  var isFed = (res) => res === "ok" || res === "fav";
  function handlePetSubArea(cfg) {
    const m = getMainState();
    if (m.pets?.pet?.away) {
      m.pickUpPet?.();
      return getMainState().pets?.pet?.away ? NOT_ACTED : { acted: true, msg: "\u{1F43E} \u0110\xE3 \u0111\xF3n th\xFA c\u01B0ng v\u1EC1 nh\xE0" };
    }
    const pet = m.pets?.pet;
    if (!pet) return NOT_ACTED;
    const petName = pet.name || "B\xE9";
    if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
      const diet = PET_DIETS.find((d) => d.kinds.includes(pet.kind || ""));
      const mode = cfg.petFeedMode || "smart_diet";
      const foodOrder = mode === "custom" && cfg.petPreferFood && cfg.petPreferFood !== "auto" ? [cfg.petPreferFood] : mode === "fav_only" ? diet?.foods?.slice(0, 1) || DEFAULT_PET_FOOD.slice(0, 1) : diet?.foods || DEFAULT_PET_FOOD;
      for (const f of foodOrder) {
        if (isFed(getMainState().feedPet?.(f))) {
          return { acted: true, msg: `\u{1F415} \u0110\xE3 cho th\xFA c\u01B0ng (${petName}) \u0103n ${PET_FOOD_NAMES[f] || f}` };
        }
      }
      if (mode !== "inventory_only" && cfg.petAutoBuyFood !== false) {
        const buyPref = cfg.petBuyFoodType || "auto_fav";
        const shopItems = buyPref !== "auto_fav" ? [buyPref] : diet?.shop || DEFAULT_PET_SHOP;
        for (const sf of shopItems) {
          if (getMainState().buyPetFood?.(sf, 1) === "ok" && isFed(getMainState().feedPet?.(sf))) {
            return { acted: true, msg: `\u{1F9B4} \u0110\xE3 mua ${PET_FOOD_NAMES[sf] || sf} & cho th\xFA c\u01B0ng (${petName}) \u0103n` };
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
    if (cfg.petAutoBath !== false && getMainState().bathPet?.() === "ok") {
      return { acted: true, msg: "\u{1F6C1} \u0110\xE3 t\u1EAFm th\u01A1m tho cho th\xFA c\u01B0ng" };
    }
    const st = getMainState();
    const trickPet = st.pets?.pet;
    if (cfg.petAutoTrick !== false && trickPet) {
      if (trickPet.playDay !== st.day && st.pets?.gear?.includes("ball") && st.doTrick?.("fetch") === "ok") {
        return { acted: true, msg: "\u{1F3BE} Ch\u01A1i n\xE9m b\xF3ng c\xF9ng th\xFA c\u01B0ng (+8 tim)" };
      }
      if (trickPet.trickDay !== st.day) {
        for (const tr of PET_TRICKS) {
          if (getMainState().doTrick?.(tr) === "ok") {
            return { acted: true, msg: `\u{1F3BE} T\u1EADp tr\xF2 "${PET_TRICK_NAMES[tr] || tr}" c\xF9ng th\xFA c\u01B0ng` };
          }
        }
      }
    }
    const stWalk = getMainState();
    const walkPetObj = stWalk.pets?.pet;
    if (cfg.petAutoWalk !== false && walkPetObj) {
      const walkedToday = walkPetObj.walkDay === stWalk.day || walkPetObj.walkedDay === stWalk.day;
      if (!walkedToday) {
        const anySt = stWalk;
        const walkRes = (typeof anySt.walkPet === "function" ? anySt.walkPet() : void 0) || (typeof anySt.doTrick === "function" ? anySt.doTrick("walk") : void 0);
        if (walkRes === "ok" || walkRes === true) {
          return { acted: true, msg: `\u{1F9AE} \u0110\xE3 d\u1EAFt th\xFA c\u01B0ng (${petName}) \u0111i d\u1EA1o m\xE1t (+tim)` };
        }
      }
    }
    return NOT_ACTED;
  }
  function handleBarnSubArea(cfg) {
    const m = getMainState();
    if (cfg.barnAutoFeedBuffalo !== false && m.buffalo?.home) {
      if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day && m.feedBuffalo?.() === "ok") {
        return { acted: true, msg: "\u{1F403} \u0110\xE3 cho Tr\xE2u \u0103n r\u01A1m" };
      }
    }
    const stB = getMainState();
    if (cfg.barnAutoBathBuffalo !== false && stB.buffalo?.home) {
      if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day && stB.bathBuffalo?.() === "ok") {
        return { acted: true, msg: "\u{1F6BF} \u0110\xE3 t\u1EAFm m\xE1t cho Tr\xE2u" };
      }
    }
    const stL = getMainState();
    const minMood = Number(cfg.barnLendMoodMin) || 50;
    if (cfg.barnAutoLendBuffalo !== false && stL.buffalo?.home && stL.buffalo.lentDay !== stL.day && (stL.buffalo.mood || 0) >= minMood && stL.lendBuffalo?.() === "ok") {
      return { acted: true, msg: "\u{1F91D} \u0110\xE3 cho b\xE0 con thu\xEA Tr\xE2u c\xE0y ru\u1ED9ng" };
    }
    if (cfg.barnAutoPayHelper !== false) {
      const stH = getMainState();
      if (stH.helpers?.buffalo?.hired && (stH.helpers.buffalo.unpaid || 0) > 0 && stH.payHelper?.("buffalo") === true) {
        return { acted: true, msg: "\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng anh T\xE1m ch\u0103n tr\xE2u" };
      }
    }
    return NOT_ACTED;
  }
  function handleDairySubArea(cfg) {
    const stC = getMainState();
    if (cfg.dairyAutoFeedCows !== false && (stC.dairy?.cows || []).some((c) => c.fedDay !== stC.day)) {
      if (stC.feedCows?.() === "ok") {
        return { acted: true, msg: "\u{1F404} \u0110\xE3 cho \u0111\xE0n B\xF2 s\u1EEFa \u0103n c\u1ECF" };
      }
    }
    if (cfg.dairyAutoCureCows !== false) {
      const stCure = getMainState();
      for (const cow of stCure.dairy?.cows || []) {
        if ((cow.sickDay || 0) <= 0) continue;
        if ((stCure.dairy?.medicine || 0) <= 0 && (stCure.gold || 0) >= 8e4) {
          stCure.buyMedicine?.();
        }
        if (getMainState().cureCow?.(cow.id) === "ok") {
          return { acted: true, msg: `\u{1F48A} \u0110\xE3 ti\xEAm thu\u1ED1c ch\u1EEFa b\u1EC7nh cho B\xF2 ${cow.name || "#" + cow.id}` };
        }
      }
    }
    const stMilk = getMainState();
    if (cfg.dairyAutoSellMilk !== false && (stMilk.dairy?.milk || 0) > 0) {
      const res = stMilk.sellMilk?.();
      if (res && res.liters > 0) {
        return { acted: true, msg: `\u{1F95B} \u0110\xE3 v\u1EAFt & b\xE1n ${res.liters} l\xEDt s\u1EEFa b\xF2 (+${formatVnd(res.total)}\u0111)` };
      }
    }
    if (cfg.dairyAutoPayHelper !== false) {
      const stH2 = getMainState();
      if (stH2.helpers?.dairy?.hired && (stH2.helpers.dairy.unpaid || 0) > 0 && stH2.payHelper?.("dairy") === true) {
        return { acted: true, msg: "\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\u1ECB M\u1EADn ch\u0103m b\xF2" };
      }
    }
    return NOT_ACTED;
  }
  var MAX_HENS_BY_LEVEL = [4, 6, 9, 12];
  function handleCoopSubArea(cfg) {
    const m = getMainState();
    if (!m.unlockedZones?.includes("poultry")) return NOT_ACTED;
    if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
      const got = m.collectEggs?.();
      if (typeof got === "number" && got > 0) {
        return { acted: true, msg: `\u{1F95A} \u0110\xE3 nh\u1EB7t ${got} qu\u1EA3 tr\u1EE9ng g\xE0 trong \u1ED5` };
      }
    }
    const stG = getMainState();
    const maxHens = MAX_HENS_BY_LEVEL[stG.coopLevel || 0] || 4;
    const henCount = stG.hens?.length || 0;
    if (cfg.coopAutoBuyChick && !stG.flu && henCount < maxHens && (stG.gold || 0) >= 6e4 && stG.buyChick?.() === "ok") {
      return { acted: true, msg: `\u{1F424} \u0110\xE3 mua th\xEAm 1 g\xE0 con v\xE0o chu\u1ED3ng (${henCount + 1}/${maxHens})` };
    }
    const stP = getMainState();
    if (cfg.coopAutoPayHelper !== false && stP.helpers?.poultry?.hired && (stP.helpers.poultry.unpaid || 0) > 0 && stP.payHelper?.("poultry") === true) {
      return { acted: true, msg: "\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ch\xFA Ba ch\u0103m g\xE0" };
    }
    return NOT_ACTED;
  }
  var POND_MATURE_DAYS = { ro: 3, tre: 5, chep: 7 };
  var POND_CAPACITY = 12;
  function handlePondSubArea(cfg) {
    const m = getMainState();
    if (!m.pond?.ready) return NOT_ACTED;
    if (m.notebook?.found && !m.pond.noteRead) {
      m.readPondNote?.();
    }
    const fish = getMainState().pond?.fish || [];
    if (cfg.pondAutoNet !== false && fish.some((f) => (f.days || 0) >= (POND_MATURE_DAYS[f.id || ""] || 7))) {
      const res = getMainState().netFish?.();
      if (res && res.n > 0) {
        return { acted: true, msg: `\u{1F41F} \u0110\xE3 k\xE9o l\u01B0\u1EDBi b\xE1n ${res.n} con c\xE1 ao (+${formatVnd(res.total)}\u0111)` };
      }
    }
    const stP = getMainState();
    const stocked = stP.pond?.fish?.length ?? POND_CAPACITY;
    if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stocked < POND_CAPACITY) {
      const fishType = cfg.preferPondFish || "chep";
      if (stP.stockFish?.(fishType) === "ok") {
        return {
          acted: true,
          msg: `\u{1F41F} \u0110\xE3 th\u1EA3 gi\u1ED1ng ${POND_FISH_NAMES[fishType] || fishType} xu\u1ED1ng ao (${stocked + 1}/${POND_CAPACITY})`
        };
      }
    }
    const stF = getMainState();
    if (cfg.pondAutoFeed !== false && (stF.pond?.fish?.length || 0) > 0 && stF.pond?.fedDay !== stF.day && stF.pond?.bebi !== "helper" && stF.feedFish?.() === "ok") {
      return { acted: true, msg: "\u{1F35E} \u0110\xE3 r\u1EA3i c\xE1m cho \u0111\xE0n c\xE1 trong ao \u0103n" };
    }
    const stH = getMainState();
    if (cfg.pondAutoPayHelper !== false && stH.helpers?.pond?.hired && (stH.helpers.pond.unpaid || 0) > 0 && stH.payHelper?.("pond") === true) {
      return { acted: true, msg: "\u{1F4B8} \u0110\xE3 tr\u1EA3 l\u01B0\u01A1ng ng\u01B0\u1EDDi ph\u1EE5 Ao c\xE1" };
    }
    return NOT_ACTED;
  }

  // src/page-hook/modules/farm/trend.ts
  var TREND_CROPS = ["radish", "carrot", "corn", "rice"];
  function hash01(e) {
    let t = e + 2135587861 | 0;
    t = Math.imul(t ^ t >>> 16, 73244475);
    t = Math.imul(t ^ t >>> 16, 73244475);
    t ^= t >>> 16;
    return (t >>> 0) / 4294967296;
  }
  function trendAt(n, start) {
    const goods = n >= 2 ? [...TREND_CROPS, "egg"] : [...TREND_CROPS];
    return { goods: goods[Math.floor(hash01(n * 3 + 1) * goods.length)], start, end: start + 2 };
  }
  function nextTrend(day) {
    let t = 9;
    for (let n = 0; ; n++) {
      if (t + 2 >= day) return trendAt(n, t);
      t += 7 + Math.floor(hash01(n * 3) * 4);
    }
  }
  function getActiveTrend2(day) {
    const t = nextTrend(day);
    return t.start <= day ? t : null;
  }
  function getTrendQuota2(goods, day, plotCount, trendLog) {
    const t = getActiveTrend2(day);
    if (!t || t.goods !== goods) return 0;
    const maxQuota = 4 + Math.floor(plotCount / 4);
    const sold = trendLog && trendLog.soldDay === day ? trendLog.sold || 0 : 0;
    return Math.max(0, maxQuota - sold);
  }

  // src/page-hook/modules/farm/market.ts
  var CROP_KEYS = ["rice", "corn", "carrot", "radish", "egg"];
  var stockOf = (st, goods) => goods === "egg" ? st.eggs || 0 : st.produce?.[goods] || 0;
  function getReservedQty(st, item, cfg) {
    let reserved = 0;
    if (cfg.sellReserveForOrders !== false && st.order && st.order.crop === item) {
      reserved += st.order.qty || 0;
    }
    if (cfg.sellReserveForVillage !== false && Array.isArray(st.village?.requests)) {
      for (const req of st.village.requests) {
        if (!req.done && req.goods === item) {
          reserved += req.qty || 0;
        }
      }
    }
    if (Array.isArray(st.daily?.tasks)) {
      for (const t of st.daily.tasks) {
        if (!t.claimed && t.crop === item && t.kind === "harvest") {
          const harvested = (st.stats?.harvested?.[item] || 0) - (t.base || 0);
          const missing = Math.max(0, (t.need || 0) - harvested);
          reserved += missing;
        }
      }
    }
    if (cfg.sellReserveForKitchen !== false) {
      const dishNeeds = {
        radish: 3,
        // Canh củ cải
        carrot: 3,
        // Nước ép cà rốt
        corn: 2,
        // Bắp nướng mỡ hành
        rice: 0,
        egg: 2
        // Trứng luộc / Bánh mì
      };
      reserved += dishNeeds[item] || 0;
    }
    return reserved;
  }
  function deliverGroceryOrder(cfg) {
    const m = getMainState();
    if (!m.order || stockOf(m, m.order.crop) < m.order.qty) return null;
    const reward = m.order.reward || 0;
    const cropLabel = CROP_NAMES[m.order.crop] || m.order.crop;
    if (m.deliverOrder?.() === true) {
      showFarmActionUI(cfg, { vendor: "grocery", shop: "orders" });
      return { acted: true, msg: `\u{1F4E6} \u0110\xE3 giao \u0111\u01A1n h\xE0ng Ch\u1ECB Na (${cropLabel}) +${formatVnd(reward)}\u0111` };
    }
    return null;
  }
  function deliverVillageBoard(cfg) {
    const st = getMainState();
    if ((st.village?.newsDay || 0) > 0 && !st.village?.met) {
      st.meetKhang?.();
    }
    const cur = getMainState();
    for (const req of cur.village?.requests || []) {
      if (req.done || !req.goods) continue;
      const qty = req.qty || 0;
      if (stockOf(cur, req.goods) >= qty && cur.deliverRequest?.(req.id) === true) {
        showFarmActionUI(cfg, { panel: "village" });
        return { acted: true, msg: `\u{1F4CB} \u0110\xE3 giao ${qty} ${CROP_NAMES[req.goods] || req.goods} gi\xFAp ${req.who || "b\xE0 con"} (B\u1EA3ng tin l\xE0ng)` };
      }
    }
    return null;
  }
  function sellTrendGoods(cfg) {
    const st = getMainState();
    const day = st.day || 0;
    const trend = getActiveTrend2(day);
    if (!trend) return null;
    const quota = getTrendQuota2(trend.goods, day, Object.keys(st.plots || {}).length, st.trendLog);
    if (quota <= 0) return null;
    const reserved = getReservedQty(st, trend.goods, cfg);
    const toSell = Math.min(Math.max(0, stockOf(st, trend.goods) - reserved), quota);
    if (toSell <= 0) return null;
    const sold = st.sellQty?.(trend.goods, toSell) || 0;
    if (sold > 0) {
      showFarmActionUI(cfg, { vendor: "grocery", shop: "storage" });
      return { acted: true, msg: `\u{1F525} \u0110\xE3 b\xE1n \u0111\xFAng ${sold} ${CROP_NAMES[trend.goods] || trend.goods} theo Trend s\u1ED1t d\u1EBBo (x2 gi\xE1)` };
    }
    return null;
  }
  function sellForDailyTask(cfg) {
    const st = getMainState();
    const earned = st.stats?.earned || 0;
    const sellTask = (st.daily?.tasks || []).find(
      (t) => !t.claimed && t.kind === "sell" && earned - (t.base || 0) < (t.need || 0)
    );
    const day1NeedSell = st.day === 1 && earned === 0;
    if (!sellTask && !day1NeedSell) return null;
    const candidates = CROP_KEYS.map((item) => {
      const reserved = getReservedQty(st, item, cfg);
      const sellable = Math.max(0, stockOf(st, item) - reserved);
      return { item, sellable };
    }).filter((c) => c.sellable > 0).sort((a, b) => b.sellable - a.sellable);
    for (const { item, sellable } of candidates) {
      let qty = 1;
      if (sellTask) {
        const missing = (sellTask.need || 0) - (earned - (sellTask.base || 0));
        const unitPrice = item === "egg" ? 1e3 : st.prices?.[item] || 500;
        qty = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
      }
      const sold = st.sellQty?.(item, qty) || 0;
      if (sold > 0) {
        showFarmActionUI(cfg, { vendor: "grocery", shop: "storage" });
        return { acted: true, msg: `\u{1F4CB} \u0110\xE3 b\xE1n ${sold} ${CROP_NAMES[item] || item} \u0111\u1EC3 ho\xE0n th\xE0nh Vi\u1EC7c S\u1ED5 tay h\xF4m nay` };
      }
    }
    return null;
  }
  function sellSmart(cfg) {
    if (!cfg.autoSellSmart && !cfg.autoSellProduce) return null;
    const st = getMainState();
    const strategy = cfg.sellStrategy || "smart_all";
    if (strategy === "smart_all" || strategy === "food_only") {
      const kitchenStock = st.kitchen?.stock || {};
      for (const [dish, count] of Object.entries(kitchenStock)) {
        if ((count || 0) > 1) {
          const toSell = (count || 0) - 1;
          const anySt = st;
          const sold = typeof anySt.sellDish === "function" ? anySt.sellDish(dish, toSell) : st.sellQty?.(dish, toSell);
          if (sold) {
            showFarmActionUI(cfg, { vendor: "grocery", shop: "storage" });
            return { acted: true, msg: `\u{1F372} \u0110\xE3 b\xE1n ${toSell} ph\u1EA7n m\xF3n \u0103n (${getItemLabel(dish)}) d\u01B0 trong B\u1EBFp` };
          }
        }
      }
      if (strategy === "food_only") return null;
    }
    const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 10);
    const itemsWithSurplus = CROP_KEYS.map((item) => {
      const reserved = getReservedQty(st, item, cfg);
      const surplus = stockOf(st, item) - reserved - minKeep;
      return { item, surplus };
    }).filter((x) => x.surplus > 0).sort((a, b) => b.surplus - a.surplus);
    for (const { item, surplus } of itemsWithSurplus) {
      const sold = st.sellQty?.(item, surplus) || 0;
      if (sold > 0) {
        showFarmActionUI(cfg, { vendor: "grocery", shop: "storage" });
        return { acted: true, msg: `\u{1F3EA} \u0110\xE3 b\xE1n ${sold} ${CROP_NAMES[item] || item} n\xF4ng s\u1EA3n d\u01B0 (B\u1EA3o l\u01B0u \u0111\u01A1n h\xE0ng + gi\u1EEF l\u1EA1i ${minKeep})` };
      }
    }
    return null;
  }
  function handleMarketSubArea(cfg) {
    return (cfg.autoDeliverOrder !== false ? deliverGroceryOrder(cfg) : null) || (cfg.autoVillageBoard !== false ? deliverVillageBoard(cfg) : null) || (cfg.autoSellTrend !== false ? sellTrendGoods(cfg) : null) || (cfg.autoSellDailyTask !== false ? sellForDailyTask(cfg) : null) || sellSmart(cfg) || NOT_ACTED;
  }

  // src/page-hook/modules/farm/tasks.ts
  var DEBRIS_COUNT = 5;
  var NOTEBOOK_PAGES = [1, 4, 5];
  var PIGGY_TIERS = [5e5, 2e5, 1e5, 5e4, 1e4];
  var PIGGY_FULL_STREAK = 7;
  function ensureSavingsCounterOpen() {
    const st = getMainState();
    if (!st.savings || (st.savings.newsDay || 0) > 0) return;
    if ((st.savings.pig?.amount || 0) > 0 || (st.day || 0) >= 14) {
      setMainState((e) => ({ savings: { ...e.savings, newsDay: Math.max(1, e.day || 1) } }));
    }
  }
  function runFirstDayGuide() {
    const m = getMainState();
    if (!m.firstDay?.incense && m.lightIncense?.() === "first") {
      return { acted: true, msg: "\u{1F64F} \u0110\xE3 th\u1EAFp nhang b\xE0n th\u1EDD \xD4ng N\u0103m" };
    }
    const stF = getMainState();
    if (stF.firstDay?.incense && !stF.firstDay.sproutHarvested) {
      if (!stF.firstDay.sprout) {
        if (stF.plantSprouts?.() === "ok") return { acted: true, msg: "\u{1F331} \u0110\xE3 gieo khay rau m\u1EA7m c\u1EA1nh nh\xE0" };
      } else if (stF.harvestSprouts?.() === true) {
        return { acted: true, msg: "\u{1F33F} \u0110\xE3 thu ho\u1EA1ch khay rau m\u1EA7m (+4 c\u1EE7 c\u1EA3i)" };
      }
    }
    const stD = getMainState();
    const cleared = stD.firstDay?.cleared || [];
    if (stD.firstDay && cleared.length < DEBRIS_COUNT) {
      for (let i = 0; i < DEBRIS_COUNT; i++) {
        if (!cleared.includes(i) && stD.clearDebris?.(i)) {
          return { acted: true, msg: `\u{1F9F9} \u0110\xE3 d\u1ECDn c\u1ECF/c\xE0nh kh\xF4 ngo\xE0i v\u01B0\u1EDDn (${cleared.length + 1}/${DEBRIS_COUNT})` };
        }
      }
    }
    const stE = getMainState();
    const ledger = stE.ledger || [];
    if (stE.day === 1 && !ledger.some((e) => e.kind === "food") && (stE.gold || 0) >= 8e3 && stE.buyFood?.("banhBao") === "ok") {
      return { acted: true, msg: "\u{1F95F} \u0110\xE3 mua B\xE1nh bao \u0103n s\xE1ng (Vi\u1EC7c Ng\xE0y 1)" };
    }
    const drankToday = ledger.some((e) => e.kind === "food" && (e.label === "Tr\xE0 \u0111\xE1" || e.label === "N\u01B0\u1EDBc m\xEDa"));
    if (stE.day === 2 && !drankToday && (stE.gold || 0) >= 3e3 && stE.buyFood?.("traDa") === "ok") {
      return { acted: true, msg: "\u{1F9CA} \u0110\xE3 u\u1ED1ng Tr\xE0 \u0111\xE1 (Vi\u1EC7c Ng\xE0y 2)" };
    }
    return null;
  }
  function collectNotebookPages() {
    const st = getMainState();
    if (!st.notebook?.found) return null;
    for (const pg of NOTEBOOK_PAGES) {
      if (getMainState().claimPage?.(pg) === true) {
        return { acted: true, msg: `\u{1F4D4} \u0110\xE3 thu th\u1EADp trang S\u1ED5 tay \xD4ng N\u0103m #${pg}` };
      }
    }
    if (getMainState().startSoak?.() === true) {
      return { acted: true, msg: "\u{1F33E} \u0110\xE3 ng\xE2m \u1EE7 gi\u1ED1ng L\xFAa th\u01A1m c\u1EE7a \xD4ng N\u0103m" };
    }
    return null;
  }
  function claimQuests(cfg) {
    const taskCount = getMainState().daily?.tasks?.length || 0;
    for (let i = 0; i < taskCount; i++) {
      if (getMainState().claimDaily?.(i)) {
        showFarmActionUI(cfg, { panel: "goals" });
        return { acted: true, msg: `\u{1F381} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng Vi\u1EC7c h\xF4m nay #${i + 1} trong S\u1ED5 tay` };
      }
    }
    if (getMainState().claimGoal?.()) {
      showFarmActionUI(cfg, { panel: "goals" });
      return { acted: true, msg: "\u{1F3C6} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng M\u1EE5c ti\xEAu S\u1ED5 tay!" };
    }
    return null;
  }
  function breakFullPiggy(cfg) {
    const st = getMainState();
    const pig = st.savings?.pig;
    if (!pig || (pig.amount || 0) <= 0) return null;
    const day = st.day || 0;
    const streak = (pig.lastDay || 0) >= day - 1 ? pig.streak || 0 : 0;
    if (streak < PIGGY_FULL_STREAK) return null;
    const brk = st.breakPiggy?.();
    if (!brk) return null;
    const totalGot = (brk.coins || 0) + (brk.bonus || 0);
    showFarmActionUI(cfg, { vendor: "savings", shop: "piggy" });
    return { acted: true, msg: `\u{1F528} \u0110\xE3 \u0111\u1EADp Heo \u0111\u1EA5t \u0111\u1EE7 7 ng\xE0y (+${formatVnd(totalGot)}\u0111)!` };
  }
  function buyNewPiggy(cfg) {
    const st = getMainState();
    const pig = st.savings?.pig;
    if (pig && pig.amount !== 0) return null;
    const gold = st.gold || 0;
    let tier = PIGGY_TIERS.find((t) => gold >= t * 3) || 0;
    if (!tier && gold >= 15e3) tier = 1e4;
    if (tier > 0 && st.newPiggy?.(tier) === true) {
      getMainState().feedPiggy?.();
      showFarmActionUI(cfg, { vendor: "savings", shop: "piggy" });
      return { acted: true, msg: `\u{1F437} \u0110\xE3 mua & b\u1ECF \u1ED1ng Heo \u0111\u1EA5t m\u1EDBi (${formatVnd(tier)}\u0111/ng\xE0y)` };
    }
    return null;
  }
  function feedPiggy(cfg) {
    const st = getMainState();
    const pig = st.savings?.pig;
    const amount = pig?.amount || 0;
    if (!pig || amount <= 0 || pig.lastDay === st.day || (st.gold || 0) < amount) return null;
    if (st.feedPiggy?.() === "ok") {
      showFarmActionUI(cfg, { vendor: "savings", shop: "piggy" });
      return { acted: true, msg: `\u{1FA99} \u0110\xE3 b\u1ECF \u1ED1ng Heo \u0111\u1EA5t h\xF4m nay (${formatVnd(amount)}\u0111)` };
    }
    return null;
  }
  function depositSavings(cfg) {
    const st = getMainState();
    const savings = st.savings;
    if (!savings || (savings.newsDay || 0) <= 0 || savings.loan || (savings.books?.length || 0) >= 10) return null;
    const minGold = Number(cfg.savingsKeepGold) || 2e5;
    const gold = st.gold || 0;
    if (gold <= minGold + 5e4) return null;
    const matured = savings.matured || 0;
    const cap = matured >= 10 ? 2e7 : matured >= 5 ? 12e6 : matured >= 2 ? 8e6 : 5e6;
    const amount = Math.min(cap, Math.floor((gold - minGold) / 1e4) * 1e4);
    if (amount >= 5e4 && st.deposit?.(amount, 7) === "ok") {
      showFarmActionUI(cfg, { vendor: "savings", shop: "savings" });
      return { acted: true, msg: `\u{1F3E6} \u0110\xE3 g\u1EEDi s\u1ED5 ti\u1EBFt ki\u1EC7m D\xEC B\u1EA3y ${formatVnd(amount)}\u0111 (7 ng\xE0y)` };
    }
    return null;
  }
  function handleDiBaySubArea(cfg) {
    ensureSavingsCounterOpen();
    return (cfg.autoFirstDayTasks !== false ? runFirstDayGuide() : null) || (cfg.autoNotebookPages !== false ? collectNotebookPages() : null) || (cfg.autoClaimQuests !== false ? claimQuests(cfg) : null) || (cfg.autoBreakPiggy !== false ? breakFullPiggy(cfg) : null) || (cfg.autoNewPiggy !== false ? buyNewPiggy(cfg) : null) || (cfg.autoFeedPiggy !== false ? feedPiggy(cfg) : null) || (cfg.autoSavings ? depositSavings(cfg) : null) || NOT_ACTED;
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

  // src/page-hook/modules/farm/gold-shop.ts
  var GOLD_TYPES = ["mieng", "nhan", "k18", "non"];
  function handleGoldShopSubArea(cfg) {
    const st = getMainState();
    const shop = st.goldShop;
    if (!shop || !((shop.newsDay || 0) > 0 || (st.day || 0) >= 30)) return NOT_ACTED;
    const seed = shop.seed || 0;
    const day = st.day || 0;
    const minutes = st.minutes || 0;
    if (cfg.goldAutoSell !== false) {
      const targetProfitPct = Number(cfg.goldProfitPercent) || 10;
      for (const type of GOLD_TYPES) {
        const holding = shop.hold?.[type];
        if (!holding || holding.qty <= 0 || holding.cost <= 0) continue;
        const costPerUnit = holding.cost / holding.qty;
        const sellPrice = getGoldSellPrice(seed, type, day, minutes);
        const profitPct = (sellPrice - costPerUnit) / costPerUnit * 100;
        if (profitPct >= targetProfitPct && canAct("farm_gold", 3500)) {
          const profit = st.sellGold?.(type, holding.qty);
          if (profit !== null && profit !== void 0) {
            markActed("farm_gold");
            showFarmActionUI(cfg, { vendor: "goldShop", shop: "goldShop" });
            return {
              acted: true,
              msg: `\u{1FA99} \u0110\xE3 b\xE1n ch\u1ED1t l\u1EDDi ${holding.qty} ch\u1EC9 ${GOLD_CATALOG[type]?.name || type} t\u1EA1i Ti\u1EC7m V\xE0ng C\xF4 Kim (+${formatVnd(profit)}\u0111, l\xE3i ${Math.round(profitPct)}%)`
            };
          }
        }
      }
    }
    if (cfg.goldAutoBuy && canAct("farm_gold", 3500)) {
      const prefType = cfg.goldPreferType || "mieng";
      const keepCash = Number(cfg.goldKeepCash) || 5e5;
      const buyPrice = getGoldBuyPrice(seed, prefType, day, minutes);
      if (buyPrice > 0 && (st.gold || 0) - buyPrice >= keepCash && st.buyGold?.(prefType, 1) === "ok") {
        markActed("farm_gold");
        showFarmActionUI(cfg, { vendor: "goldShop", shop: "goldShop" });
        return {
          acted: true,
          msg: `\u{1FA99} \u0110\xE3 mua 1 ch\u1EC9 ${GOLD_CATALOG[prefType]?.name || prefType} \u0111\u1EA7u t\u01B0 t\u1EA1i Ti\u1EC7m V\xE0ng C\xF4 Kim (-${formatVnd(buyPrice)}\u0111)`
        };
      }
    }
    return NOT_ACTED;
  }

  // src/page-hook/modules/farm/night-market.ts
  function handleNightMarketSubArea(cfg) {
    if (cfg.autoSellNightMarket === false) return NOT_ACTED;
    const m = getMainState();
    if (!m.village?.marketOpen) return NOT_ACTED;
    const mins = m.minutes ?? 0;
    if (mins < 1080 || mins >= 1410) return NOT_ACTED;
    const soldToday = m.village?.nightSold?.day === m.day ? m.village?.nightSold?.n || 0 : 0;
    const quotaLeft = 20 - soldToday;
    if (quotaLeft <= 0) return NOT_ACTED;
    const reservedMap = {};
    if (cfg.nightMarketReserveOrders !== false) {
      if (m.order && !m.order.delivered && m.order.crop) {
        reservedMap[m.order.crop] = (reservedMap[m.order.crop] || 0) + (m.order.qty || 0);
      }
      const villageReqs = m.village?.requests || [];
      for (const req of villageReqs) {
        if (!req.done && req.goods) {
          reservedMap[req.goods] = (reservedMap[req.goods] || 0) + (req.qty || 0);
        }
      }
    }
    const minKeep = Math.max(0, Number(cfg.nightMarketMinKeep) || 0);
    const candidates = [];
    const produce = m.produce || {};
    for (const [cropId, count] of Object.entries(produce)) {
      const qty = Number(count) || 0;
      const reserved = reservedMap[cropId] || 0;
      const surplus = qty - minKeep - reserved;
      if (surplus > 0) {
        candidates.push({
          id: cropId,
          surplus,
          price: m.prices?.[cropId] || 0,
          isEgg: false
        });
      }
    }
    if (cfg.nightMarketSellEggs !== false) {
      const eggs = m.eggs || 0;
      const eggReserved = reservedMap["egg"] || 0;
      const eggSurplus = eggs - minKeep - eggReserved;
      if (eggSurplus > 0) {
        candidates.push({
          id: "egg",
          surplus: eggSurplus,
          price: 3e3,
          isEgg: true
        });
      }
    }
    if (candidates.length === 0) return NOT_ACTED;
    const strategy = cfg.nightMarketStrategy || "max_stock";
    if (strategy === "highest_price") {
      candidates.sort((a, b) => b.price - a.price);
    } else if (strategy === "lowest_price") {
      candidates.sort((a, b) => a.price - b.price);
    } else {
      candidates.sort((a, b) => b.surplus - a.surplus);
    }
    const target = candidates[0];
    if (!target) return NOT_ACTED;
    const res = m.sellNight?.(target.id);
    if (res === "ok") {
      showFarmActionUI(cfg, { panel: "nightMarket" });
      const label = target.isEgg ? "Tr\u1EE9ng g\xE0 \u{1F95A}" : getItemLabel(target.id);
      return {
        acted: true,
        msg: `\u{1F3EE} \u0110\xE3 b\xE1n 1 ${label} \u1EDF Ch\u1EE3 \u0110\xEAm (+25% gi\xE1 \xB7 C\xF2n ${quotaLeft - 1}/20 m\xF3n)`
      };
    }
    return NOT_ACTED;
  }

  // src/page-hook/modules/farm/index.ts
  var SUBAREA_HANDLERS = {
    house: handleHouseSubArea,
    crops: handleCropsSubArea,
    pet: handlePetSubArea,
    barn: handleBarnSubArea,
    dairy: handleDairySubArea,
    coop: handleCoopSubArea,
    pond: handlePondSubArea,
    salon: handleSalonSubArea,
    market: handleMarketSubArea,
    nightMarket: handleNightMarketSubArea,
    dibay: handleDiBaySubArea,
    goldShop: handleGoldShopSubArea
  };
  function execFarmSubAreaStep(subAreaId, cfg) {
    if (!stores.main?.getState()) return NOT_ACTED;
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;
    const handler = SUBAREA_HANDLERS[subAreaId];
    return handler ? handler(cfg) : NOT_ACTED;
  }

  // src/page-hook/modules/sea/index.ts
  var SEA_DISH_NAMES = {
    radishSoup: "Canh c\u1EE7 c\u1EA3i \u{1F372}",
    boiledEgg: "Tr\u1EE9ng lu\u1ED9c \u{1F95A}",
    grilledCorn: "B\u1EAFp n\u01B0\u1EDBng m\u1EE1 h\xE0nh \u{1F33D}",
    carrotJuice: "N\u01B0\u1EDBc \xE9p c\xE0 r\u1ED1t \u{1F9C3}",
    eggBread: "B\xE1nh m\xEC \u1ED1p la \u{1F96A}",
    comTam: "C\u01A1m t\u1EA5m \u1ED1p la \u{1F35B}",
    cornCake: "B\xE1nh b\u1EAFp n\u01B0\u1EDBng \u{1F96E}"
  };
  var SEA_SPOT_NAMES = {
    pier: "\u{1F309} C\u1EA7u t\xE0u",
    rocks: "\u{1FAA8} B\xE3i \u0111\xE1",
    beach: "\u{1F3D6}\uFE0F M\xE9p b\xE3i c\xE1t"
  };
  var keepSeaPanelUntil = 0;
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
    const showSeaPanelIfEnabled = (panelName, holdMs = 1400) => {
      if (cfg.showFullActions) {
        seaStore.setState({ panel: panelName });
        keepSeaPanelUntil = Date.now() + holdMs;
      }
    };
    if ((m.fishing?.rod || 0) === 0 && (m.gold || 0) >= 15e3) {
      if (m.buyRod?.() === true) {
        showSeaPanelIfEnabled("shop");
        return { acted: true, msg: "\u{1F3A3} \u0110\xE3 mua C\u1EA7n c\xE2u t\u1EA1i Ch\xF2i \xD4ng T\u01B0 (-15.000\u0111)" };
      }
    }
    const sellMin = (m.minutes || 0) >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
    if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
      const count = m.fishing?.basket?.length || 0;
      const earned = m.sellBasket?.();
      if (typeof earned === "number" && earned > 0) {
        showSeaPanelIfEnabled("shop");
        return { acted: true, msg: `\u{1F41F} \u0110\xE3 b\xE1n ${count} h\u1EA3i s\u1EA3n \u1EDF Bi\u1EC3n cho \xD4ng T\u01B0 (+${earned.toLocaleString("vi-VN")}\u0111)` };
      }
    }
    if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
      showSeaPanelIfEnabled("dex");
      return { acted: true, msg: "\u{1F4D6} \u0110\xE3 nh\u1EADn th\u01B0\u1EDFng S\u1ED5 c\xE1 B\xE1ch khoa \xD4ng T\u01B0" };
    }
    const curM = mainStore.getState();
    const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
    if (cfg.seaAutoBuyBait !== false && totalBait <= 0) {
      const pref = cfg.seaPreferBait || "worm";
      const packs = Number(cfg.seaBaitPacks) || 2;
      if (curM.buyBait?.(pref, packs) === true) {
        showSeaPanelIfEnabled("shop");
        return {
          acted: true,
          msg: `\u{1FAB1} \u0110\xE3 mua ${packs} g\xF3i ${pref === "shrimp" ? "M\u1ED3i t\xF4m \u{1F990}" : "M\u1ED3i tr\xF9n \u{1FAB1}"} t\u1EA1i Ch\xF2i \xD4ng T\u01B0`
        };
      } else if (curM.buyBait?.("worm", 1) === true) {
        showSeaPanelIfEnabled("shop");
        return { acted: true, msg: `\u{1FAB1} \u0110\xE3 mua 1 g\xF3i M\u1ED3i tr\xF9n t\u1EA1i Ch\xF2i \xD4ng T\u01B0` };
      }
    }
    const curM2 = mainStore.getState();
    if (cfg.seaPreferBait === "shrimp" && (curM2.fishing?.bait?.shrimp || 0) > 0 && !curM2.fishing?.useShrimp) {
      curM2.setUseShrimp?.(true);
    } else if (cfg.seaPreferBait === "worm" && (curM2.fishing?.bait?.worm || 0) > 0 && curM2.fishing?.useShrimp) {
      curM2.setUseShrimp?.(false);
    }
    if (cfg.seaAutoEat !== false) {
      const seaHungerTh = Math.max(20, Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 35);
      const seaThirstTh = Math.max(20, Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 35);
      const stT = mainStore.getState();
      if ((stT.hydration || 0) < seaThirstTh && canAct("sea_drink", 3500)) {
        for (const d of ["carrotJuice", "radishSoup"]) {
          if ((stT.kitchen?.stock?.[d] || 0) > 0 && stT.eatDish?.(d) === true) {
            markActed("sea_drink");
            return { acted: true, msg: `\u{1F9C3} \u0110\xE3 u\u1ED1ng ${SEA_DISH_NAMES[d] || d} gi\u1EA3i kh\xE1t t\u1EA1i Bi\u1EC3n` };
          }
        }
        const drinks = [
          { id: "nuocDua", price: 15e3, msg: "\u{1F965} \u0110\xE3 mua & u\u1ED1ng N\u01B0\u1EDBc d\u1EEBa t\u01B0\u01A1i t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t (-15.000\u0111)" },
          { id: "nuocMia", price: 8e3, msg: "\u{1F964} \u0110\xE3 mua & u\u1ED1ng N\u01B0\u1EDBc m\xEDa t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t (-8.000\u0111)" },
          { id: "traDa", price: 3e3, msg: "\u{1F9CA} \u0110\xE3 mua & u\u1ED1ng Tr\xE0 \u0111\xE1 t\u1EA1i Bi\u1EC3n h\u1ED3i kh\xE1t (-3.000\u0111)" }
        ];
        for (const dr of drinks) {
          if ((mainStore.getState().gold || 0) >= dr.price && mainStore.getState().buyFood?.(dr.id) === "ok") {
            markActed("sea_drink");
            showSeaPanelIfEnabled("coconut");
            return { acted: true, msg: dr.msg };
          }
        }
      }
      const stH = mainStore.getState();
      if ((stH.fullness || 0) < seaHungerTh && canAct("sea_eat", 3500)) {
        for (const d of Object.keys(stH.kitchen?.stock || {})) {
          if ((stH.kitchen?.stock?.[d] || 0) > 0 && stH.eatDish?.(d) === true) {
            markActed("sea_eat");
            return { acted: true, msg: `\u{1F372} \u0110\xE3 \u0103n ${SEA_DISH_NAMES[d] || d} mang theo h\u1ED3i s\u1EE9c t\u1EA1i Bi\u1EC3n` };
          }
        }
        if ((stH.gold || 0) >= 15e3 && stH.buyFood?.("banhMiThit") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F956} \u0110\xE3 mua & \u0103n B\xE1nh m\xEC th\u1ECBt t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i (-15.000\u0111)" };
        }
        if ((mainStore.getState().gold || 0) >= 8e3 && mainStore.getState().buyFood?.("banhBao") === "ok") {
          markActed("sea_eat");
          return { acted: true, msg: "\u{1F95F} \u0110\xE3 mua & \u0103n B\xE1nh bao t\u1EA1i Bi\u1EC3n h\u1ED3i \u0111\xF3i (-8.000\u0111)" };
        }
      }
    }
    if (s.panel && s.phase === "idle" && (!cfg.showFullActions || Date.now() >= keepSeaPanelUntil)) {
      seaStore.setState({ panel: null });
    }
    if (cfg.seaAutoSpot !== false && s.phase === "idle" && !s.walking) {
      const targetSpot = cfg.seaSpot || "pier";
      const spotLabel = SEA_SPOT_NAMES[targetSpot] || targetSpot;
      if (s.spot !== targetSpot) {
        const spotCoords = {
          pier: { x: 24, y: 4 },
          rocks: { x: 41, y: 9 },
          beach: { x: 20, y: 14 }
        };
        const coord = spotCoords[targetSpot] || spotCoords.pier;
        if (seaScene && typeof seaScene.goFarmer === "function") {
          seaScene.goFarmer(coord);
          return { acted: true, msg: `\u{1F6B6} \u0110ang \u0111i ra v\u1ECB tr\xED c\xE2u (${spotLabel})...` };
        } else {
          seaStore.setState({ spot: targetSpot, walking: false });
          return { acted: true, msg: `\u{1F4CD} \u0110\xE3 ch\u1ECDn v\u1ECB tr\xED c\xE2u (${spotLabel})` };
        }
      }
    }
    return { acted: false };
  }

  // src/shared/constants/default-config.ts
  var BEN_HUNT_ZONES = {
    field: {
      id: "field",
      label: "\u{1F33E} \u0110\u1ED3ng c\u1ECF ph\xEDa \u0111\xF4ng",
      rares: "m\u1ECDi lo\xE0i \xB7 D\u1EBF v\u01B0\u01A1ng 0h-3h",
      spots: [
        { x: 74, y: 21 },
        { x: 73, y: 12 },
        { x: 64, y: 11 },
        { x: 83, y: 11 },
        { x: 83, y: 20 },
        { x: 83, y: 30 },
        { x: 73, y: 30 },
        { x: 64, y: 28 }
      ]
    },
    reeds: {
      id: "reeds",
      label: "\u{1F38B} B\xE3i lau s\u1EADy",
      rares: "D\u1EBF ng\u1ECDc \xB7 D\u1EBF ma 23h-4h",
      spots: [{ x: 50, y: 23 }, { x: 49, y: 21 }, { x: 51, y: 24 }, { x: 49, y: 24 }]
    },
    rice: {
      id: "rice",
      label: "\u{1F33E} B\u1EDD ru\u1ED9ng",
      rares: "D\u1EBF tr\u0169i \xB7 D\u1EBF v\xE0ng \xB7 D\u1EBF s\u1EAFt",
      spots: [{ x: 44, y: 32 }, { x: 60, y: 36 }, { x: 71, y: 36 }, { x: 82, y: 36 }]
    },
    garden: {
      id: "garden",
      label: "\u{1F96C} Quanh lu\u1ED1ng rau",
      rares: "D\u1EBF c\u1ED3 \xB7 D\u1EBF l\u1EEDa",
      spots: [{ x: 22, y: 35 }, { x: 26, y: 35 }, { x: 23, y: 39 }, { x: 20, y: 39 }]
    },
    grass: {
      id: "grass",
      label: "\u{1F331} B\xE3i c\u1ECF (kh\u1EAFp b\u1EBFn)",
      rares: "D\u1EBF \u0111\u1EA5t \xB7 D\u1EBF c\u1ED3",
      spots: [
        { x: 27, y: 22 },
        { x: 14, y: 15 },
        { x: 0, y: 12 },
        { x: 8, y: 32 },
        { x: 33, y: 39 },
        { x: 50, y: 31 },
        { x: 43, y: 10 },
        { x: 63, y: 11 }
      ]
    }
  };
  function getBenHuntSpots(choice) {
    if (choice !== "rotate") {
      const zone = BEN_HUNT_ZONES[choice] ?? BEN_HUNT_ZONES.field;
      return zone.spots.map((s) => ({ ...s, zone: zone.id }));
    }
    const order = ["field", "reeds", "rice", "garden", "grass"];
    const out = [];
    for (let i = 0; i < 2; i++) {
      for (const z of order) {
        const s = BEN_HUNT_ZONES[z].spots[i];
        if (s) out.push({ ...s, zone: z });
      }
    }
    return out;
  }

  // src/page-hook/modules/wharf/index.ts
  var BEN_FOOD_NAMES = {
    banhMi: "\u{1F956} B\xE1nh m\xEC th\u1ECBt (+20\u26A1)",
    chaoCa: "\u{1F963} Ch\xE1o c\xE1 l\xF3c (+28\u26A1)",
    huTieu: "\u{1F35C} H\u1EE7 ti\u1EBFu nam vang (+40\u26A1)",
    comTam: "\u{1F35B} C\u01A1m t\u1EA5m s\u01B0\u1EDDn b\xEC (+60\u26A1)",
    lauMam: "\u{1F372} L\u1EA9u c\xE1 linh b\xF4ng \u0111i\xEAn \u0111i\u1EC3n (+100\u26A1)"
  };
  var BEN_PACK_NAMES = {
    xoiBap: "\u{1F359} X\xF4i b\u1EAFp g\xF3i l\xE1 chu\u1ED1i (+15\u26A1)",
    banhMiGoi: "\u{1F956} B\xE1nh m\xEC g\xF3i gi\u1EA5y (+20\u26A1)",
    banhBao: "\u{1F95F} B\xE1nh bao nh\xE2n th\u1ECBt (+22\u26A1)",
    comNam: "\u{1F359} C\u01A1m n\u1EAFm mu\u1ED1i m\xE8 (+30\u26A1)",
    banhTet: "\u{1FAD4} B\xE1nh t\xE9t l\xE1 c\u1EA9m (+50\u26A1)",
    traDaTui: "\u{1F9CB} Tr\xE0 \u0111\xE1 t\xFAi x\xE1ch (+8\u26A1)",
    nuocSuoi: "\u{1F4A7} Chai n\u01B0\u1EDBc su\u1ED1i (+10\u26A1)"
  };
  var BEN_DRINK_NAMES = {
    traDa: "\u{1F9CA} Tr\xE0 \u0111\xE1 (+8\u26A1)",
    nuocMia: "\u{1F964} N\u01B0\u1EDBc m\xEDa t\u1EAFc (+5\u26A1, May +1)",
    rauMa: "\u{1F375} Rau m\xE1 \u0111\u1EADu xanh (+5\u26A1, May +1)",
    caPhe: "\u2615 C\xE0 ph\xEA s\u1EEFa \u0111\xE1 (+10\u26A1, May +2)",
    duaTuoi: "\u{1F965} D\u1EEBa xi\xEAm t\u01B0\u01A1i (+15\u26A1, May +3)"
  };
  var BEN_BAIT_NAMES = {
    xinMoi: "\u{1F932} 10 m\u1ED3i mi\u1EC5n ph\xED",
    moi20: "\u{1FAB1} H\u1ED9p m\u1ED3i tr\xF9n (+20 m\u1ED3i)",
    moi60: "\u{1FAB1} Thau m\u1ED3i tr\xF9n (+60 m\u1ED3i)",
    moi150: "\u{1FAB1} Th\xF9ng m\u1ED3i c\xE1m (+150 m\u1ED3i)"
  };
  var WHEEL_ITEM_IDS = [
    "canhSaoDem",
    "canhHac",
    "rongMay",
    "trangRam",
    "canhPhuong",
    "vayRong",
    "canhCo",
    "denKeoQuan",
    "dieuSao",
    "danKimXaCu",
    "coGhe",
    "denCaChep",
    "loTre",
    "danKim",
    "dienDien",
    "denOngSao",
    "dieuGiay",
    "canCau"
  ];
  var CRICKET_SPECIES_NAMES = {
    deCom: "D\u1EBF c\u01A1m",
    deMen: "D\u1EBF m\xE8n",
    deDat: "D\u1EBF \u0111\u1EA5t",
    deThan: "D\u1EBF than",
    deTrui: "D\u1EBF tr\u0169i",
    deCo: "D\u1EBF c\u1ED3",
    deLua: "D\u1EBF l\u1EEDa",
    deNgoc: "D\u1EBF ng\u1ECDc",
    deVang: "D\u1EBF v\xE0ng",
    deMa: "D\u1EBF ma",
    deSat: "D\u1EBF s\u1EAFt",
    deVuong: "D\u1EBF v\u01B0\u01A1ng"
  };
  var CRICKET_RARITY_REFUND = {
    common: 5,
    uncommon: 15,
    rare: 40,
    epic: 120,
    legendary: 400
  };
  var CRICKET_SPECIES_RARITY = {
    deCom: "common",
    deMen: "common",
    deDat: "common",
    deThan: "uncommon",
    deTrui: "uncommon",
    deCo: "uncommon",
    deLua: "rare",
    deNgoc: "rare",
    deVang: "rare",
    deMa: "epic",
    deSat: "epic",
    deVuong: "legendary"
  };
  var BOSS_LADDER = [
    { id: "cuBin", name: "Cu Bin", reward: 15, total: 60 },
    { id: "utMap", name: "\xDAt M\u1EADp", reward: 30, total: 112 },
    { id: "anhLuc", name: "Anh L\u1EF1c xe \xF4m", reward: 60, total: 138 },
    { id: "bacChin", name: "B\xE1c Ch\xEDn th\u1EE3 r\xE8n", reward: 110, total: 194 },
    { id: "ongSau", name: "\xD4ng S\xE1u ch\u1EE7 s\u1EDBi", reward: 220, total: 242 }
  ];
  var BOSS_MIN_STRENGTH_RATIO = 0.85;
  var SOI_TILE = { x: 4, y: 29 };
  var CRICKET_BOX_MAX = 6;
  var HUNT_STAMINA_COST = 3;
  var HUNT_LIGHT_STALE_MS = 8e3;
  var keepBenPanelUntil = 0;
  var keepBenPanelMsg = "";
  var huntLightAt = 0;
  var hadMyBout = false;
  var huntSpotIdx = 0;
  var lastHandledGotAwaySeq = -1;
  var lastHuntZoneChoice = null;
  var cricketTotal = (c) => (c.stats?.power || 0) + (c.stats?.tough || 0) + (c.stats?.nerve || 0);
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
    refreshCricketWatchers(cfg);
    if (bu.walking || bn.fishing !== "idle") {
      return { acted: false };
    }
    const interrupted = dismissInterruptsIfNeeded(cfg);
    if (interrupted) return interrupted;
    if (cfg.showFullActions && bu.panel && Date.now() < keepBenPanelUntil) {
      return { acted: true, msg: keepBenPanelMsg || "\u{1F441}\uFE0F \u0110ang hi\u1EC3n th\u1ECB giao di\u1EC7n thao t\xE1c..." };
    }
    const rawScene = getActiveScene("BenDoScene");
    const benScene = rawScene;
    const wallet = bn.wallet;
    if (!wallet) return { acted: false };
    const huntEnabled = cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false;
    const bossEnabled = cfg.benSubEnabled?.cricketBoss !== false && cfg.benAutoBossBout !== false;
    const arenaEnabled = cfg.benSubEnabled?.cricketBoss !== false && (bossEnabled || Boolean(cfg.benAutoBet));
    if (bn.hunt) {
      if (bn.hunt.phase === "light" && Date.now() - huntLightAt > HUNT_LIGHT_STALE_MS) {
        bnStore.setState({ hunt: null });
        return { acted: false };
      }
      const hop = bn.hunt.phase === "hop" ? bn.hunt.hop : void 0;
      return {
        acted: true,
        msg: hop ? `\u{1F997} D\u1EBF \u0111ang nh\u1EA3y (c\xF2n ${hop.left} l\u1EA7n) -> canh b\u1EE5i c\u1ECF ${hop.spot + 1} \u0111\u1EC3 \xFAp...` : bn.hunt.rarity ? "\u{1F997} Nghe ti\u1EBFng d\u1EBF g\xE1y, \u0111ang ch\u1EDD n\xF3 nh\u1EA3y ra..." : "\u{1F526} \u0110ang r\u1ECDi \u0111\xE8n nghe ng\xF3ng ti\u1EBFng d\u1EBF g\xE1y..."
      };
    }
    const myBout = getMyBout(bn);
    if (myBout) {
      hadMyBout = true;
      const { bout, side } = myBout;
      return {
        acted: true,
        msg: `\u{1F94A} S\u1EDBi D\u1EBF: \u0110ang thi \u0111\u1EA5u ${bout.n ? `(gi\xE1p ${bout.n}/12)` : "(s\u1EAFp v\xE0o tr\u1EADn)"} \xB7 c\xF2n ${bout.tickles?.[side] ?? 0} l\u1EA7n kh\u1EC1u r\xE2u`
      };
    }
    if (hadMyBout) {
      hadMyBout = false;
      markActed("ben_boss_wait");
      sendBenWs({ t: "soi" });
      sendBenWs({ t: "crickets" });
    }
    if ((huntEnabled || arenaEnabled) && (!bn.crickets || !bn.soi) && canAct("ben_cricket_init", 5e3)) {
      markActed("ben_cricket_init");
      if (!bn.crickets) sendBenWs({ t: "crickets" });
      if (!bn.soi) sendBenWs({ t: "soi" });
    } else if (arenaEnabled && bn.soi && canAct("ben_soi_refresh", 6e4)) {
      markActed("ben_soi_refresh");
      sendBenWs({ t: "soi" });
    }
    const stamina = computeBenStamina(wallet);
    const shells = wallet.shells || 0;
    const bait = wallet.bait || 0;
    const nonKeptFish = Array.isArray(bn.basket) ? bn.basket.filter((x) => !x.kept) : [];
    const nonKeptCount = nonKeptFish.length;
    const totalSellShells = nonKeptFish.reduce(
      (sum, x) => sum + (Number(x.price) || 0),
      0
    );
    const pack = bn.pack || {};
    const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);
    const stamMin = Number(cfg.benStaminaThreshold ?? 4);
    const runWithOptionalPanel = (actionFn, label, panelState, holdMs = 1500) => {
      const forceOpen = panelState?.panel === "lantern";
      if ((cfg.showFullActions || forceOpen) && panelState) {
        buStore.setState(panelState);
        keepBenPanelUntil = Date.now() + holdMs;
        keepBenPanelMsg = label;
        setTimeout(() => {
          actionFn();
        }, 250);
      } else {
        actionFn();
        buStore.setState({ panel: null });
      }
    };
    const walkAndRun = (tile, actionFn, label, actionKey = null, panelState, holdMs = 1500) => {
      if (actionKey && !canAct(actionKey)) {
        return { acted: false };
      }
      if (benScene && typeof benScene.goFarmer === "function") {
        const cur = benScene.farmer?.tile;
        if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
          if (actionKey) markActed(actionKey);
          runWithOptionalPanel(actionFn, label, panelState, holdMs);
          return { acted: true, msg: label };
        }
        if (benScene.farmer?.running) {
          return { acted: true, msg: `\u{1F6B6} \u0110ang di chuy\u1EC3n...` };
        }
        benScene.goFarmer(tile, () => {
          setTimeout(() => {
            if (!actionKey || canAct(actionKey)) {
              if (actionKey) markActed(actionKey);
              runWithOptionalPanel(actionFn, label, panelState, holdMs);
            }
          }, 250);
        });
        return { acted: true, msg: `\u{1F6B6} ${label}` };
      }
      if (actionKey) markActed(actionKey);
      runWithOptionalPanel(actionFn, label, panelState, holdMs);
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
    const tryRecoverStamina = () => {
      if (stamina < 4 || cfg.benAutoRecoverStamina !== false && stamina <= stamMin) {
        if (cfg.benAutoRecoverStamina !== false) {
          if (packItems.length > 0 && canAct("ben_eat_pack", 3e3)) {
            const packItem = packItems[0];
            const packLabel = BEN_PACK_NAMES[packItem] || packItem;
            markActed("ben_eat_pack");
            runWithOptionalPanel(
              () => {
                sendBenWs({ t: "eat", item: packItem });
              },
              `\u0110\xE3 \u0103n ${packLabel} trong balo h\u1ED3i S\u1EE9c`,
              { panel: "pack", bagTab: "food" },
              1400
            );
            return { acted: true, msg: `\u0110\xE3 \u0103n ${packLabel} trong balo h\u1ED3i S\u1EE9c` };
          }
          if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct("ben_goi_dau", 4e3)) {
            return walkAndRun(
              { x: 16, y: 24 },
              () => {
                sendBenWs({ t: "buy", item: "goiDau" });
              },
              `\u{1F486} G\u1ED9i \u0111\u1EA7u massage t\u1EA1i Ti\u1EC7m \xDAt M\u01B0\u1EDDi (+50\u26A1, -25\u{1F41A})`,
              "ben_goi_dau",
              { panel: "hair" },
              1500
            );
          }
          const buyItem = shells >= targetFoodPrice ? prefFood : shells >= 28 ? "comTam" : shells >= 20 ? "huTieu" : shells >= 14 ? "chaoCa" : "banhMi";
          const foodCost = foodPrices[buyItem] || 10;
          const foodLabel = BEN_FOOD_NAMES[buyItem] || buyItem;
          if (shells >= foodCost && canAct("ben_buy_food", 4e3)) {
            return walkAndRun(
              { x: 39, y: 23 },
              () => {
                sendBenWs({ t: "buy", item: buyItem });
              },
              `Mua ${foodLabel} t\u1EA1i Qu\xE1n \u0103n D\xEC T\xE1m (-${foodCost}\u{1F41A})`,
              "ben_buy_food",
              { panel: "food" },
              1500
            );
          }
          if (shells >= 3 && canAct("ben_drink", 4e3)) {
            return walkAndRun(
              { x: 26, y: 12 },
              () => {
                sendBenWs({ t: "buy", item: "traDa" });
              },
              `U\u1ED1ng ${BEN_DRINK_NAMES.traDa} t\u1EA1i Xe tr\xE0 \u0111\xE1 Ch\u1ECB Th\u01A1m (-3\u{1F41A})`,
              "ben_drink",
              { panel: "tea", teaStand: "river" },
              1500
            );
          }
          if (!canAct("ben_buy_food", 4e3) || !canAct("ben_eat_pack", 3e3) || !canAct("ben_goi_dau", 4e3) || !canAct("ben_drink", 4e3)) {
            return { acted: true, msg: "\u{1F35A} \u0110ang ch\u1EDD \u0103n h\u1ED3i ph\u1EE5c S\u1EE9c..." };
          }
        }
        if (stamina < 4) {
          if (cfg.benAutoSell !== false && nonKeptCount > 0) {
            return walkAndRun(
              { x: 40, y: 10 },
              () => {
                sendBenWs({ t: "sell" });
              },
              `\u{1F41F} B\xE1n ${nonKeptCount} con c\xE1 t\u1EA1i V\u1EF1a Anh T\u01B0 (+${totalSellShells.toLocaleString("vi-VN")} v\u1ECF s\xF2 \u{1F41A}) \u0111\u1EC3 l\u1EA5y ti\u1EC1n \u0103n`,
              "ben_sell",
              { panel: "sell" },
              1400
            );
          }
          return {
            acted: false,
            exhausted: true,
            reason: "\u{1F62E}\u200D\u{1F4A8} B\u1EBFn \u0110\xF2: H\u1EBFt S\u1EE9c v\xE0 kh\xF4ng \u0111\u1EE7 v\u1ECF s\xF2 \u0111\u1EC3 \u0103n/g\u1ED9i \u0111\u1EA7u -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
          };
        }
      }
      return null;
    };
    const runFishingStep = () => {
      const sellThreshold = Number(cfg.benSellThreshold) || 60;
      if (cfg.benAutoSell !== false && nonKeptCount > 0 && (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)) {
        return walkAndRun(
          { x: 40, y: 10 },
          () => {
            sendBenWs({ t: "sell" });
          },
          `\u{1F41F} B\xE1n ${nonKeptCount} con c\xE1 t\u1EA1i V\u1EF1a Anh T\u01B0 (+${totalSellShells.toLocaleString("vi-VN")} v\u1ECF s\xF2 \u{1F41A})`,
          "ben_sell",
          { panel: "sell" },
          1400
        );
      }
      const stamRes = tryRecoverStamina();
      if (stamRes) return stamRes;
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
            const baitLabel = BEN_BAIT_NAMES[buyBaitChoice] || buyBaitChoice;
            return walkAndRun(
              { x: 53, y: 11 },
              () => {
                sendBenWs({ t: "buy", item: buyBaitChoice });
              },
              `Mua ${baitLabel} t\u1EA1i S\u1EA1p Ch\xFA \u0110\u1EF1c (-${baitPrices[buyBaitChoice]}\u{1F41A})`,
              "ben_bait",
              { panel: "bait" },
              1500
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
            },
            `Xin ${BEN_BAIT_NAMES.xinMoi} t\u1EA1i S\u1EA1p Ch\xFA \u0110\u1EF1c`,
            "ben_bait",
            { panel: "bait" },
            1500
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
        const drinkCost = drinkPrices[drinkId] || 15;
        const drinkLabel = BEN_DRINK_NAMES[drinkId] || drinkId;
        if (shells >= drinkCost) {
          return walkAndRun(
            { x: 26, y: 12 },
            () => {
              sendBenWs({ t: "buy", item: drinkId });
            },
            `U\u1ED1ng ${drinkLabel} t\u1EA1i Xe tr\xE0 \u0111\xE1 Ch\u1ECB Th\u01A1m (-${drinkCost}\u{1F41A})`,
            "ben_luck_drink",
            { panel: "tea", teaStand: "river" },
            1500
          );
        }
      }
      if (cfg.benAutoSpot !== false) {
        const spotChoice = cfg.benSpot || "bank";
        const spotTargets = {
          dock: { x: 31, y: 4, kind: "dock", label: "C\u1EA7u tre" },
          bamboo: { x: 7, y: 6, kind: "dock", label: "C\u1EA7u tre" },
          bank: { x: 24, y: 10, kind: "bank", label: "B\u1EDD s\xF4ng" }
        };
        const target = spotTargets[spotChoice] || spotTargets.bank;
        if (!bu.spot || bu.spot !== target.kind && spotChoice !== "any") {
          if (benScene && typeof benScene.goFarmer === "function") {
            const goFarmer = benScene.goFarmer.bind(benScene);
            return {
              acted: false,
              deferred: () => {
                if (benScene.farmer?.running) return { acted: true, msg: "\u{1F6B6} \u0110ang di chuy\u1EC3n..." };
                goFarmer({ x: target.x, y: target.y });
                return { acted: true, msg: `\u{1F6B6} \u0110ang \u0111i ra ${target.label} c\xE2u c\xE1...` };
              }
            };
          }
        }
      }
      return { acted: false, deferred: () => ({ acted: false, allowCast: true }) };
    };
    const runCricketBossStep = () => {
      if (!bossEnabled || !bn.soi || !canAct("ben_boss_wait", 3e3)) {
        return { acted: false };
      }
      const npcs = bn.soi.npcs || [];
      const nextBoss = BOSS_LADDER.find((b) => {
        const npcState = npcs.find((n) => n.id === b.id);
        return npcState?.open && !npcState.paidToday;
      });
      if (!nextBoss) return { acted: false };
      const box = bn.soi.box?.length ? bn.soi.box : bn.crickets?.box || [];
      const nowServer = getBenServerNow(bn);
      const readyCrickets = box.filter((c) => (!c.restUntil || c.restUntil <= nowServer) && (!c.diesAt || c.diesAt > nowServer)).sort((a, b) => cricketTotal(b) - cricketTotal(a));
      const bestCricket = readyCrickets[0];
      if (!bestCricket) return { acted: false };
      const cTotal = cricketTotal(bestCricket);
      if (cTotal < nextBoss.total * BOSS_MIN_STRENGTH_RATIO) return { acted: false };
      const cName = CRICKET_SPECIES_NAMES[bestCricket.species] || "D\u1EBF";
      return walkAndRun(
        SOI_TILE,
        () => {
          sendBenWs({ t: "bout", npc: nextBoss.id, cricket: bestCricket.id });
        },
        `\u{1F94A} Th\xE1ch \u0111\u1EA5u ${nextBoss.name} t\u1EA1i S\u1EDBi D\u1EBF (+${nextBoss.reward}\u{1F41A}) v\u1EDBi ${cName} (T\u1ED5ng: ${cTotal} vs ${nextBoss.total})`,
        "ben_boss_bout",
        { panel: "soi" },
        1200
      );
    };
    const runCricketHuntStep = () => {
      if (!huntEnabled || !bn.crickets) {
        return { acted: false };
      }
      const box = bn.crickets.box || [];
      if (cfg.benAutoFeedCricket && box.length > 0 && canAct("ben_cricket_feed", 3e3)) {
        const capTotal = (c) => (c.caps?.power || 0) + (c.caps?.tough || 0) + (c.caps?.nerve || 0);
        const target = [...box].sort((a, b) => capTotal(b) - capTotal(a))[0];
        const foods = {
          tough: { id: "laNon", name: "\u{1F33F} L\xE1 non", price: 25 },
          power: { id: "trungKien", name: "\u{1F95A} Tr\u1EE9ng ki\u1EBFn", price: 40 },
          nerve: { id: "otHiem", name: "\u{1F336}\uFE0F \u1EDAt hi\u1EC3m", price: 30 }
        };
        const gap = (stat2) => (target.caps?.[stat2] || 0) - (target.stats?.[stat2] || 0);
        const pref = cfg.benPreferCricketFood || "balanced";
        const stat = pref === "balanced" ? ["tough", "power", "nerve"].reduce((best, s) => gap(s) > gap(best) ? s : best, "tough") : pref;
        const food = stat && gap(stat) > 0 ? foods[stat] : null;
        if (food && shells >= food.price) {
          markActed("ben_cricket_feed");
          sendBenWs({ t: "feed", id: target.id, food: food.id });
          const cName = CRICKET_SPECIES_NAMES[target.species] || "D\u1EBF";
          return { acted: true, msg: `\u{1F33F} Cho ${cName} \u0103n ${food.name} (-${food.price}\u{1F41A})` };
        }
      }
      const hour = getBenHour(bn);
      const isNight = hour >= 18 || hour < 5;
      const isRareHour = hour >= 23 || hour < 4;
      if (!isNight || cfg.benHuntRareOnly && !isRareHour) {
        return { acted: false };
      }
      if (box.length >= CRICKET_BOX_MAX) {
        if (cfg.benAutoReleaseLowCricket === false || !canAct("ben_cricket_release", 3e3)) {
          return { acted: false };
        }
        const rankOrder = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
        const rank = (c) => rankOrder[CRICKET_SPECIES_RARITY[c.species] || "common"] || 1;
        const lowest = [...box].sort((a, b) => rank(a) - rank(b) || cricketTotal(a) - cricketTotal(b))[0];
        const lowestRarity = CRICKET_SPECIES_RARITY[lowest.species] || "common";
        if (lowestRarity !== "common" && lowestRarity !== "uncommon") {
          return { acted: false };
        }
        markActed("ben_cricket_release");
        sendBenWs({ t: "release", id: lowest.id });
        const cName = CRICKET_SPECIES_NAMES[lowest.species] || "D\u1EBF";
        return {
          acted: true,
          msg: `\u{1F38B} \u1ED0ng tre \u0111\u1EA7y (${box.length}/${CRICKET_BOX_MAX}) -> Th\u1EA3 ${cName} v\u1EC1 \u0111\u1ED3ng (+${CRICKET_RARITY_REFUND[lowestRarity] || 5}\u{1F41A})`
        };
      }
      if (stamina < HUNT_STAMINA_COST) {
        const stamRes = tryRecoverStamina();
        if (stamRes) return stamRes;
        return {
          acted: false,
          exhausted: true,
          reason: "\u{1F62E}\u200D\u{1F4A8} B\u1EBFn \u0110\xF2: H\u1EBFt S\u1EE9c r\u1ECDi \u0111\xE8n b\u1EAFt d\u1EBF \u0111\xEAm -> Chuy\u1EC3n khu v\u1EF1c ti\u1EBFp theo!"
        };
      }
      const zoneChoice = cfg.benHuntZone || "field";
      if (zoneChoice !== lastHuntZoneChoice) {
        lastHuntZoneChoice = zoneChoice;
        huntSpotIdx = 0;
      }
      const spots = getBenHuntSpots(zoneChoice);
      if (!spots || spots.length === 0) {
        return { acted: false };
      }
      const gotAway = bn.gotAway;
      if (gotAway && typeof gotAway.seq === "number" && gotAway.seq !== lastHandledGotAwaySeq) {
        lastHandledGotAwaySeq = gotAway.seq;
        if (gotAway.why === "none") {
          huntSpotIdx = (huntSpotIdx + 1) % spots.length;
        }
      }
      const currentSpot = spots[huntSpotIdx % spots.length];
      const zoneMeta = BEN_HUNT_ZONES[currentSpot.zone] ?? BEN_HUNT_ZONES.field;
      return {
        acted: false,
        deferred: () => {
          if (!benScene || typeof benScene.goFarmer !== "function") return { acted: false };
          const cur = benScene.farmer?.tile;
          const atTarget = Boolean(
            cur && Math.abs(cur.x - currentSpot.x) <= 1 && Math.abs(cur.y - currentSpot.y) <= 1
          );
          if (!atTarget) {
            if (benScene.farmer?.running) {
              return { acted: true, msg: `\u{1F6B6} \u0110ang di chuy\u1EC3n sang ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y})...` };
            }
            benScene.goFarmer({ x: currentSpot.x, y: currentSpot.y });
            return { acted: true, msg: `\u{1F6B6} Ra ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y}) s\u0103n d\u1EBF \u0111\xEAm...` };
          }
          if (!canAct("ben_hunt_light", 2500)) {
            return { acted: true, msg: "\u{1F526} Chu\u1EA9n b\u1ECB r\u1ECDi \u0111\xE8n b\u1EAFt d\u1EBF..." };
          }
          markActed("ben_hunt_light");
          markHuntLightSent();
          huntLightAt = Date.now();
          bnStore.setState({ hunt: { phase: "light" } });
          sendBenWs({ t: "light" });
          huntSpotIdx = (huntSpotIdx + 1) % spots.length;
          return {
            acted: true,
            msg: `\u{1F526} R\u1ECDi \u0111\xE8n b\u1EAFt d\u1EBF \u0111\xEAm t\u1EA1i ${zoneMeta.label} (\u26A1${HUNT_STAMINA_COST} S\u1EE9c \xB7 \u1ED1ng tre ${box.length}/${CRICKET_BOX_MAX})`
          };
        }
      };
    };
    const runEntertainmentStep = () => {
      if (cfg.benAutoLantern !== false) {
        const tickets = wallet.tickets || 0;
        const boughtToday = bn.wheel?.bought || 0;
        const canBuyTicket = Boolean(cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600);
        if ((tickets > 0 || canBuyTicket) && bu.panel !== "lantern" && canAct("ben_lantern_open", 2500)) {
          return walkAndRun(
            { x: 37, y: 28 },
            () => {
              const curBn = bnStore.getState();
              const curPicks = curBn.wheel?.picks || [];
              const ownedCloset = Array.isArray(curBn.closet) ? curBn.closet : [];
              const unownedWheel = WHEEL_ITEM_IDS.filter((id) => !ownedCloset.includes(id));
              const needPicks = Math.min(3, unownedWheel.length);
              if (needPicks > 0 && curPicks.length < needPicks) {
                sendBenWs({ t: "pick", items: unownedWheel.slice(0, needPicks) });
              }
              buStore.setState({ panel: "lantern" });
            },
            tickets > 0 ? `\u{1F3EE} M\u1EDF V\xF2ng quay l\u1ED3ng \u0111\xE8n C\xF4 B\u1EA3y (hi\u1EC7n c\xF3 ${tickets} v\xE9 \u{1F39F}\uFE0F)` : `\u{1F3EE} Gh\xE9 S\u1EA1p l\u1ED3ng \u0111\xE8n C\xF4 B\u1EA3y mua v\xE9 quay (${boughtToday}/5, -600\u{1F41A})`,
            "ben_lantern_open",
            { panel: "lantern" },
            5e3
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
            },
            `\u{1F39F}\uFE0F \u0110\u1ED5i th\u01B0\u1EDFng v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2 t\u1EA1i \u0110\u1EA1i l\xFD Ch\xFA B\u1EA3y (+${(lottoState?.pending || 0).toLocaleString("vi-VN")}\u{1F41A})`,
            "ben_lotto_claim",
            { panel: "agent" },
            1500
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
              },
              `\u{1F340} Mua 1 v\xE9 s\u1ED1 B\u1EBFn \u0110\xF2 (s\u1ED1 ${randNum < 10 ? "0" + randNum : randNum}) t\u1EA1i \u0110\u1EA1i l\xFD Ch\xFA B\u1EA3y (-10\u{1F41A})`,
              "ben_lotto_buy",
              { panel: "agent" },
              1500
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
            },
            `\u{1F3E7} \u0110\u1ED5i ${cashShells.toLocaleString("vi-VN")} v\u1ECF s\xF2 ra ti\u1EC1n m\u1EB7t t\u1EA1i C\xE2y ATM`,
            "ben_atm",
            { panel: "atm" },
            1500
          );
        }
      }
      return { acted: false };
    };
    const subAreaRunners = {
      fishing: runFishingStep,
      cricketBoss: runCricketBossStep,
      cricketHunt: runCricketHuntStep,
      entertainment: runEntertainmentStep
    };
    const continuousSubs = /* @__PURE__ */ new Set(["fishing", "cricketHunt"]);
    const activeOrder = Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0 ? cfg.benSubOrder : ["fishing", "cricketBoss", "cricketHunt", "entertainment"];
    let deferred = null;
    let exhaustedResult = null;
    for (const subId of activeOrder) {
      if (cfg.benSubEnabled?.[subId] === false) continue;
      if (deferred && continuousSubs.has(subId)) continue;
      const runner = subAreaRunners[subId];
      if (!runner) continue;
      const result = runner();
      if (result.acted) return result;
      if (result.deferred) {
        deferred = result.deferred;
      } else if (result.exhausted && !exhaustedResult) {
        exhaustedResult = result;
      }
    }
    const lanternActive = bu.panel === "lantern" && cfg.benAutoLantern !== false && ((wallet.tickets || 0) > 0 || Boolean(cfg.benBuyLanternTicket && (bn.wheel?.bought || 0) < 5 && shells >= 600));
    if (bu.panel && !lanternActive && (!cfg.showFullActions || Date.now() >= keepBenPanelUntil)) {
      buStore.setState({ panel: null });
    }
    if (deferred) {
      const result = deferred();
      if (result.acted || result.allowCast) return result;
    }
    if (exhaustedResult) return exhaustedResult;
    return { acted: false, allowCast: false };
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
          case "BEN_WATCH": {
            if (!payload.config) return { ok: false, error: "NO_CONFIG" };
            refreshCricketWatchers(payload.config);
            return { ok: true };
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
