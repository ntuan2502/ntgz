import { stores, sendBenWs, addBenWsMessageListener } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { BenNetState } from '../../../shared/types/wharf-types';

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
let scheduledRunN = -1;
let invertPullDir = false;
let biteTimeoutId: ReturnType<typeof setTimeout> | null = null;
let runTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isListenerRegistered = false;
let isStoreSubscribed = false;
let fastTimerId: ReturnType<typeof setInterval> | null = null;

const FAST_WATCH_INTERVAL_MS = 40;

function isFishingAutoEnabled(): boolean {
  if (!watchCfg || !watchCfg.running || Date.now() - watchCfgAt > CONFIG_STALE_MS) return false;
  if (stores.main?.getState().screen !== 'benDo') return false;
  // Always complete an active fish fight (ghìm cần) regardless of sub-area switches
  if (stores.benNet?.getState().fishing === 'fight') return true;
  if (watchCfg.benSubEnabled?.fishing === false) return false;
  if (watchCfg.runMode === 'all' && watchCfg.areaEnabled?.benDo === false) return false;
  if (watchCfg.runMode === 'tab' && watchCfg.activeTab !== 'benDo') return false;
  return true;
}

/**
 * Schedule hook action after bobber completely plunges and settles.
 * Game rule (Ref: bundle.js Vbe): "Canh phao: chìm hẳn, nằm luôn mới giật! Cá mới rỉa thôi mà giật là trượt sớm (early)."
 * Sinking plunge ripple takes ~260ms. Delay of 360ms - 430ms guarantees the bobber has sunk completely,
 * while staying well within the 560ms - 1100ms bite window.
 */
function scheduleHook(): void {
  if (!isFishingAutoEnabled()) return;

  const bn = stores.benNet?.getState();
  if (!bn || bn.check) return;
  const holdUntil = Math.max(
    bn.notice?.error === 'held' ? Number(bn.notice.until) || 0 : 0,
    Number(bn.checkDone?.holdUntil) || 0
  );
  if (holdUntil > Date.now()) return;

  if (biteTimeoutId) {
    clearTimeout(biteTimeoutId);
    biteTimeoutId = null;
  }

  const delayMs = 360 + Math.floor(Math.random() * 70);
  biteTimeoutId = setTimeout(() => {
    biteTimeoutId = null;
    if (!isFishingAutoEnabled()) return;

    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'bite' || cur.check) return;

    const now = performance.now();
    if (now - lastHookedAt < 280) return;
    lastHookedAt = now;
    lastPulledN = -1;
    scheduledRunN = -1;

    // Send WebSocket hook packet directly
    sendBenWs({ t: 'hook' });
  }, delayMs);
}

function handleIncomingBite(msgSeq?: number): void {
  if (!isFishingAutoEnabled()) return;

  // In wharf room, server broadcasts bites. If sequence provided, reject mismatched sequence.
  if (typeof msgSeq === 'number' && currentCastSeq !== -1 && msgSeq !== currentCastSeq) {
    return;
  }

  // Verify Zustand store confirms bite
  const cur = stores.benNet?.getState();
  if (cur?.fishing === 'bite') {
    scheduleHook();
  } else {
    setTimeout(() => {
      const later = stores.benNet?.getState();
      if (later?.fishing === 'bite') {
        scheduleHook();
      }
    }, 35);
  }
}

/**
 * Detect direction from DOM announcement text / visual elements:
 * - "Cá chạy sang TRÁI · vuốt sang PHẢI!" -> fish runs left, pull right -> press ArrowRight
 * - "Cá chạy sang PHẢI · vuốt sang TRÁI!" -> fish runs right, pull left -> press ArrowLeft
 */
function detectFightDirection(dirHint?: 'left' | 'right'): { fishDir: 'left' | 'right'; pullDir: 'left' | 'right' } | null {
  const fightBox = document.querySelector('.ben-fight');
  const runTextEl = fightBox?.querySelector('.ben-run-text:not(.calm)');
  const text = (runTextEl?.textContent || '').toUpperCase();

  let fishDir: 'left' | 'right' | null = null;
  let pullDir: 'left' | 'right' | null = null;

  // 1. Primary check: DOM announcement text (must not be the calm state)
  if (text.includes('VUỐT SANG PHẢI') || text.includes('CHẠY SANG TRÁI')) {
    fishDir = 'left';
    pullDir = 'right';
  } else if (text.includes('VUỐT SANG TRÁI') || text.includes('CHẠY SANG PHẢI')) {
    fishDir = 'right';
    pullDir = 'left';
  }

  // 2. Secondary check: Arrow / Fish element in DOM
  if (!pullDir && fightBox) {
    if (fightBox.querySelector('.ben-run-fish.left')) {
      fishDir = 'left';
      pullDir = 'right';
    } else if (fightBox.querySelector('.ben-run-fish.right')) {
      fishDir = 'right';
      pullDir = 'left';
    }
  }

  // 3. Fallback: Zustand store fight.run or hint
  const curRun = stores.benNet?.getState().fight?.run;
  const storeDir = curRun?.dir === 'left' || curRun?.dir === 'right' ? curRun.dir : dirHint;
  if (!pullDir && (storeDir === 'left' || storeDir === 'right')) {
    fishDir = storeDir;
    pullDir = fishDir === 'left' ? 'right' : 'left';
  }

  if (!pullDir || !fishDir) return null;
  return { fishDir, pullDir };
}

/**
 * Simulate pressing the arrow key (ArrowLeft or ArrowRight) on window,
 * which triggers the game's native keydown listener in h8 (bundle.js:3462200),
 * with synchronous verification so we never send duplicate or missed pulls.
 */
function executeFightPull(n: number, pullDir: 'left' | 'right'): void {
  const key = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const code = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const keyCode = pullDir === 'left' ? 37 : 39;

  // 1. Dispatch native keydown on window (h8 listens on window.addEventListener('keydown'))
  const downEv = new KeyboardEvent('keydown', {
    key,
    code,
    keyCode,
    which: keyCode,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(downEv);

  // Release key naturally after 50ms
  setTimeout(() => {
    const upEv = new KeyboardEvent('keyup', {
      key,
      code,
      keyCode,
      which: keyCode,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(upEv);
  }, 50);

  // 2. Check synchronously if h8's keydown handler already cleared fight.run in Zustand store
  const afterKeyRun = stores.benNet?.getState().fight?.run;
  if (!afterKeyRun || afterKeyRun.n !== n) {
    return;
  }

  // 3. Fallback: trigger pointerdown on corresponding button in .ben-fight
  try {
    const fightBox = document.querySelector('.ben-fight');
    if (fightBox) {
      const btns = Array.from(fightBox.querySelectorAll('.ben-fight-btns button')) as HTMLButtonElement[];
      const targetBtn = btns.find((b) =>
        (b.textContent || '').includes(pullDir === 'left' ? 'Ghìm trái' : 'Ghìm phải')
      );
      if (targetBtn && !targetBtn.disabled) {
        targetBtn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
      }
    }
  } catch {
    // ignore
  }

  // 4. Final guarantee: if still not cleared, update store and send WebSocket packet directly
  const afterBtnRun = stores.benNet?.getState().fight?.run;
  if (afterBtnRun && afterBtnRun.n === n) {
    stores.benNet?.setState((st) => ({
      fight: st.fight && st.fight.run?.n === n ? { ...st.fight, run: null } : st.fight,
    }));
    sendBenWs({ t: 'pull', n, dir: pullDir });
  }
}

function handleIncomingRun(n: number, dirHint?: 'left' | 'right', msHint?: number): void {
  if (!isFishingAutoEnabled()) return;
  if (typeof n !== 'number' || n <= 0) return;

  const bn = stores.benNet?.getState();
  if (!bn || bn.check) return;

  // Already pulled or already scheduled for this exact run sequence n
  if (n === lastPulledN || (runTimeoutId !== null && scheduledRunN === n)) return;

  if (runTimeoutId) {
    clearTimeout(runTimeoutId);
    runTimeoutId = null;
  }
  scheduledRunN = n;

  // Server rejects pulls faster than ~200ms as bot pre-fire (Ref: Jee(e,t) floor 150ms + network).
  // Sweet spot 260ms - 335ms is safely above the minimum reaction floor and still inside the -12% tension gold window.
  const ms = msHint || 800;
  const reactionMs = Math.min(Math.floor(ms * 0.44), 260 + Math.floor(Math.random() * 75));

  runTimeoutId = setTimeout(() => {
    runTimeoutId = null;
    scheduledRunN = -1;
    if (!isFishingAutoEnabled()) return;

    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'fight' || cur.check) return;

    // Must verify run n is still the active run! Never pull during calm state between runs.
    const activeRun = cur.fight?.run;
    if (!activeRun || activeRun.n !== n) return;

    // Detect exact direction from DOM announcement text / fish arrow / store
    const detected = detectFightDirection(dirHint);
    if (!detected) return;

    const { fishDir } = detected;
    const pullDir: 'left' | 'right' = invertPullDir
      ? detected.pullDir === 'left'
        ? 'right'
        : 'left'
      : detected.pullDir;
    lastPulledN = n;

    executeFightPull(n, pullDir);

    pushFishingEvent(
      `💪 Bến Đò: Lượt ${n} - Cá chạy ${fishDir === 'left' ? 'TRÁI ⬅' : 'PHẢI ➡'} -> Bấm phím ${
        pullDir === 'left' ? '⬅ [ArrowLeft]' : '➡ [ArrowRight]'
      } (${reactionMs}ms)`
    );
  }, reactionMs);
}

function ensureStoreSubscription(): void {
  if (isStoreSubscribed) return;
  const bnStore = stores.benNet;
  if (!bnStore || typeof bnStore.subscribe !== 'function') return;
  isStoreSubscribed = true;

  bnStore.subscribe((state: BenNetState, prevState: BenNetState) => {
    if (!state) return;

    // When Zustand store transitions into bite phase
    if (state.fishing === 'bite' && prevState?.fishing !== 'bite') {
      if (isFishingAutoEnabled() && !biteTimeoutId) {
        scheduleHook();
      }
    }

    // Reset pull tracking when entering a new fight
    if (state.fishing === 'fight' && prevState?.fishing !== 'fight') {
      lastPulledN = -1;
      scheduledRunN = -1;
    }

    // When a new fish run starts in fight
    const newRun = state.fight?.run;
    const prevRun = prevState?.fight?.run;
    if (
      state.fishing === 'fight' &&
      newRun &&
      typeof newRun.n === 'number' &&
      newRun.n !== prevRun?.n
    ) {
      if (isFishingAutoEnabled() && newRun.n !== lastPulledN) {
        handleIncomingRun(newRun.n, newRun.dir, Number(newRun.ms) || 800);
      }
    }
  });
}

function ensureWsListener(): void {
  if (isListenerRegistered) return;
  isListenerRegistered = true;

  addBenWsMessageListener((msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'cast') {
      currentCastSeq = typeof msg.s === 'number' ? msg.s : -1;
      lastPulledN = -1;
      scheduledRunN = -1;
    } else if (msg.t === 'fight') {
      lastPulledN = -1;
      scheduledRunN = -1;
    } else if (msg.t === 'bite') {
      if (!isFishingAutoEnabled()) return;
      handleIncomingBite(typeof msg.s === 'number' ? msg.s : undefined);
    } else if (msg.t === 'run' && typeof msg.n === 'number') {
      if (!isFishingAutoEnabled()) return;
      const dir = msg.dir === 'left' || msg.dir === 'right' ? msg.dir : undefined;
      handleIncomingRun(msg.n, dir, Number(msg.ms) || 800);
    } else if (msg.t === 'pulled' && typeof msg.n === 'number') {
      const wasPulledByUs = lastPulledN === msg.n;
      lastPulledN = msg.n;
      const tension = typeof msg.tension === 'number' ? msg.tension : 0;
      if (msg.ok === false) {
        if (wasPulledByUs) {
          invertPullDir = !invertPullDir;
          pushFishingEvent(
            `⚠️ Bến Đò: Ghìm hụt lượt ${msg.n} (căng ${tension}%) -> Đổi chiều ghìm sang ${
              invertPullDir ? 'CÙNG BÊN' : 'NGƯỢC BÊN'
            }!`
          );
        } else {
          pushFishingEvent(`⚠️ Bến Đò: Ghìm hụt lượt ${msg.n} (quá giờ)! Dây căng ${tension}%`);
        }
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
      scheduledRunN = -1;

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
      scheduledRunN = -1;

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

  // Secondary fallback: check if Zustand store is in bite phase but hook wasn't scheduled
  if (bn.fishing === 'bite' && !bn.check && !biteTimeoutId) {
    const now = performance.now();
    if (now - lastHookedAt > 280) {
      scheduleHook();
    }
  }

  // Secondary fallback: ONLY trigger when an actual fish run is active in store
  const run = bn.fight?.run;
  if (
    bn.fishing === 'fight' &&
    run &&
    typeof run.n === 'number' &&
    (run.dir === 'left' || run.dir === 'right') &&
    run.n !== lastPulledN &&
    run.n !== scheduledRunN
  ) {
    handleIncomingRun(run.n, run.dir, Number(run.ms) || 800);
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
    scheduledRunN = -1;
  }

  ensureStoreSubscription();
  ensureWsListener();

  if (!fastTimerId) {
    fastTimerId = setInterval(fastTick, FAST_WATCH_INTERVAL_MS);
  }
}
