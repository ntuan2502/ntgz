import { stores, sendBenWs, addBenWsMessageListener } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';

export interface FishingWatchEvent {
  seq: number;
  text: string;
}

const MAX_FISHING_EVENTS = 30;
const fishingEvents: FishingWatchEvent[] = [];
let fishingEventSeq = 0;

function pushFishingEvent(text: string): void {
  fishingEvents.push({ seq: ++fishingEventSeq, text });
  if (fishingEvents.length > MAX_FISHING_EVENTS) {
    fishingEvents.shift();
  }
}

export function getFishingEvents(): FishingWatchEvent[] {
  return fishingEvents;
}

let watchCfg: AppConfig | null = null;
let watchCfgAt = 0;
const CONFIG_STALE_MS = 5000;

let currentCastSeq = -1;
let lastHookedAt = 0;
let lastPulledN = -1;
let biteTimeoutId: ReturnType<typeof setTimeout> | null = null;
let runTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isListenerRegistered = false;
let fastTimerId: ReturnType<typeof setInterval> | null = null;

const FAST_WATCH_INTERVAL_MS = 40;

function isFishingAutoEnabled(): boolean {
  if (!watchCfg || !watchCfg.running || Date.now() - watchCfgAt > CONFIG_STALE_MS) return false;
  if (watchCfg.benSubEnabled?.fishing === false) return false;
  if (watchCfg.runMode === 'all' && watchCfg.areaEnabled?.benDo === false) return false;
  if (watchCfg.runMode === 'tab' && watchCfg.activeTab !== 'benDo') return false;
  return stores.main?.getState().screen === 'benDo';
}

function handleIncomingBite(): void {
  if (!isFishingAutoEnabled()) return;

  const bn = stores.benNet?.getState();
  if (!bn) return;
  // Never hook if militia check captcha is active or rod is held
  if (bn.check) return;
  const holdUntil = Math.max(
    bn.notice?.error === 'held' ? Number(bn.notice.until) || 0 : 0,
    Number(bn.checkDone?.holdUntil) || 0
  );
  if (holdUntil > Date.now()) return;

  if (biteTimeoutId) {
    clearTimeout(biteTimeoutId);
    biteTimeoutId = null;
  }

  // Human reaction delay: 110ms - 190ms (well within 500ms - 1100ms bite window)
  const reactionMs = 110 + Math.floor(Math.random() * 80);
  biteTimeoutId = setTimeout(() => {
    biteTimeoutId = null;
    if (!isFishingAutoEnabled()) return;

    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'bite' || cur.check) return;

    const now = performance.now();
    if (now - lastHookedAt < 280) return;
    lastHookedAt = now;

    // Send WebSocket hook packet directly
    sendBenWs({ t: 'hook' });
  }, reactionMs);
}

function handleIncomingRun(n: number, dir: 'left' | 'right', ms: number): void {
  if (!isFishingAutoEnabled()) return;

  const bn = stores.benNet?.getState();
  if (!bn || bn.check) return;

  if (n === lastPulledN) return;

  if (runTimeoutId) {
    clearTimeout(runTimeoutId);
    runTimeoutId = null;
  }

  // Opposite direction: fish runs left -> pull right; fish runs right -> pull left
  const pullDir: 'left' | 'right' = dir === 'left' ? 'right' : 'left';

  // Natural reaction delay: 90ms - 140ms (well within ms which is 500ms - 1500ms)
  const reactionMs = Math.min(ms * 0.25, 90 + Math.floor(Math.random() * 50));

  runTimeoutId = setTimeout(() => {
    runTimeoutId = null;
    if (!isFishingAutoEnabled()) return;

    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'fight') return;

    lastPulledN = n;

    // 1. Send WebSocket pull packet directly
    sendBenWs({ t: 'pull', n, dir: pullDir });

    // 2. Update local Zustand store so UI reflects the pull immediately
    stores.benNet?.setState((st) => ({
      fight: st.fight && st.fight.run?.n === n ? { ...st.fight, run: null } : st.fight,
    }));
  }, reactionMs);
}

function ensureWsListener(): void {
  if (isListenerRegistered) return;
  isListenerRegistered = true;

  addBenWsMessageListener((msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'cast') {
      currentCastSeq = typeof msg.s === 'number' ? msg.s : -1;
    } else if (msg.t === 'bite') {
      if (!isFishingAutoEnabled()) return;
      // In wharf room, server broadcasts bites. Only handle bite matching our cast sequence.
      if (typeof msg.s === 'number' && currentCastSeq !== -1 && msg.s !== currentCastSeq) {
        return;
      }
      handleIncomingBite();
    } else if (msg.t === 'run' && typeof msg.n === 'number' && typeof msg.dir === 'string') {
      if (!isFishingAutoEnabled()) return;
      const dir = msg.dir === 'left' || msg.dir === 'right' ? msg.dir : 'left';
      handleIncomingRun(msg.n, dir, Number(msg.ms) || 800);
    } else if (msg.t === 'pulled' && typeof msg.n === 'number') {
      lastPulledN = msg.n;
      const tension = typeof msg.tension === 'number' ? msg.tension : 0;
      if (msg.ok === false) {
        pushFishingEvent(`⚠️ Bến Đò: Ghìm hụt lượt ${msg.n}! Dây căng ${tension}%`);
      } else if (msg.ok === true) {
        const left = typeof msg.left === 'number' ? msg.left : 0;
        pushFishingEvent(`💪 Bến Đò: Ghìm chuẩn lượt ${msg.n} (còn ${left} lượt, căng ${tension}%)`);
      }
    } else if (msg.t === 'miss') {
      if (biteTimeoutId) {
        clearTimeout(biteTimeoutId);
        biteTimeoutId = null;
      }
      if (runTimeoutId) {
        clearTimeout(runTimeoutId);
        runTimeoutId = null;
      }
      lastPulledN = -1;

      let whyMsg = 'hụt cá';
      if (msg.why === 'early') {
        whyMsg = 'Cá mới rỉa chưa cắn đã giật cần!';
      } else if (msg.why === 'late') {
        whyMsg = 'Phao chìm lâu quá, cá ăn sạch mồi rồi chuồn!';
      } else if (msg.why === 'snap') {
        whyMsg = 'Dây căng quá đứt phựt rồi!';
      } else if (msg.why === 'escape') {
        whyMsg = 'Cá giãy thoát mất!';
      } else if (msg.why) {
        whyMsg = `Lý do: ${msg.why}`;
      }
      pushFishingEvent(`❌ Bến Đò: Trượt cá (${whyMsg})`);
    } else if (msg.t === 'landed') {
      if (biteTimeoutId) {
        clearTimeout(biteTimeoutId);
        biteTimeoutId = null;
      }
      if (runTimeoutId) {
        clearTimeout(runTimeoutId);
        runTimeoutId = null;
      }
      lastPulledN = -1;

      const fishName = typeof msg.fish === 'string' ? msg.fish : '';
      const size = typeof msg.size === 'number' ? `${msg.size}cm` : '';
      const price = typeof msg.price === 'number' ? `${msg.price} vỏ` : '';
      const details = [size, price].filter(Boolean).join(', ');
      pushFishingEvent(`🎉 Bến Đò: Đã câu được ${fishName || 'cá'}${details ? ` (${details})` : ''}!`);
    }
  });
}

function fastTick(): void {
  if (!isFishingAutoEnabled()) return;

  const bn = stores.benNet?.getState();
  if (!bn) return;

  // Secondary fallback: check if Zustand store is in bite phase but hook wasn't triggered
  if (bn.fishing === 'bite' && !bn.check && !biteTimeoutId) {
    const now = performance.now();
    if (now - lastHookedAt > 350) {
      lastHookedAt = now;
      sendBenWs({ t: 'hook' });
    }
  }

  // Secondary fallback: check if in fight run
  const run = bn.fight?.run;
  if (bn.fishing === 'fight' && run && typeof run.n === 'number' && run.dir && run.n !== lastPulledN && !runTimeoutId) {
    const dir = run.dir === 'left' || run.dir === 'right' ? run.dir : 'left';
    handleIncomingRun(run.n, dir, Number(run.ms) || 800);
  }
}

export function refreshFishingWatcher(cfg: AppConfig): void {
  watchCfg = cfg;
  watchCfgAt = Date.now();

  if (!isFishingAutoEnabled()) {
    if (biteTimeoutId) {
      clearTimeout(biteTimeoutId);
      biteTimeoutId = null;
    }
    if (runTimeoutId) {
      clearTimeout(runTimeoutId);
      runTimeoutId = null;
    }
    lastPulledN = -1;
  }

  ensureWsListener();

  if (!fastTimerId) {
    fastTimerId = setInterval(fastTick, FAST_WATCH_INTERVAL_MS);
  }
}
