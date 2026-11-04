import { stores, sendBenWs, addBenWsMessageListener } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';

let watchCfg: AppConfig | null = null;
let lastHookedAt = 0;
let lastPulledN = -1;
let biteTimeoutId: ReturnType<typeof setTimeout> | null = null;
let runTimeoutId: ReturnType<typeof setTimeout> | null = null;
let isListenerRegistered = false;
let fastTimerId: ReturnType<typeof setInterval> | null = null;

const FAST_WATCH_INTERVAL_MS = 40;

function handleIncomingBite(): void {
  const bn = stores.benNet?.getState();
  if (!bn) return;
  // Never hook if militia check captcha is active or rod is held
  if (bn.check) return;
  const holdUntil = Math.max(
    bn.notice?.error === 'held' ? Number(bn.notice.until) || 0 : 0,
    Number(bn.checkDone?.holdUntil) || 0
  );
  if (holdUntil > Date.now()) return;

  if (watchCfg && watchCfg.benSubEnabled?.fishing === false) return;

  if (biteTimeoutId) {
    clearTimeout(biteTimeoutId);
    biteTimeoutId = null;
  }

  // Fast human-jitter reaction delay: 70ms - 130ms (well within 500ms - 1100ms bite window)
  const reactionMs = 70 + Math.floor(Math.random() * 60);
  biteTimeoutId = setTimeout(() => {
    biteTimeoutId = null;
    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'bite' || cur.check) return;

    const now = performance.now();
    if (now - lastHookedAt < 280) return;
    lastHookedAt = now;

    // 1. Direct WebSocket packet for zero-latency server arrival
    sendBenWs({ t: 'hook' });

    // 2. Trigger DOM button and Spacebar for sound & visual feedback
    try {
      const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
      if (pullBtn) pullBtn.click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    } catch {
      // ignore
    }
  }, reactionMs);
}

function handleIncomingRun(n: number, dir: 'left' | 'right', ms: number): void {
  const bn = stores.benNet?.getState();
  if (!bn || bn.check) return;

  if (n === lastPulledN) return;

  if (runTimeoutId) {
    clearTimeout(runTimeoutId);
    runTimeoutId = null;
  }

  // Opposite direction: fish runs left -> pull right; fish runs right -> pull left
  const pullDir: 'left' | 'right' = dir === 'left' ? 'right' : 'left';

  // Natural reaction delay: 100ms - 160ms (well within ms which is 500ms - 1500ms)
  const reactionMs = Math.min(ms * 0.25, 100 + Math.floor(Math.random() * 60));

  runTimeoutId = setTimeout(() => {
    runTimeoutId = null;
    const cur = stores.benNet?.getState();
    if (!cur || cur.fishing !== 'fight') return;

    lastPulledN = n;

    // 1. Send WebSocket pull packet directly
    sendBenWs({ t: 'pull', n, dir: pullDir });

    // 2. Update local Zustand store so UI reflects the pull immediately
    stores.benNet?.setState((st) => ({
      fight: st.fight && st.fight.run?.n === n ? { ...st.fight, run: null } : st.fight,
    }));

    // 3. Dispatch native KeyboardEvent & click DOM button for audio/visuals
    try {
      const code = pullDir === 'left' ? 'KeyA' : 'KeyD';
      const key = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
      window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));

      const fightBox = document.querySelector('.ben-fight');
      if (fightBox) {
        const btns = Array.from(fightBox.querySelectorAll('.ben-fight-btns button')) as HTMLButtonElement[];
        const targetBtn = btns.find((b) => (b.textContent || '').includes(pullDir === 'left' ? 'Ghìm trái' : 'Ghìm phải'));
        if (targetBtn && !targetBtn.disabled) targetBtn.click();
      }
    } catch {
      // ignore
    }
  }, reactionMs);
}

function ensureWsListener(): void {
  if (isListenerRegistered) return;
  isListenerRegistered = true;

  addBenWsMessageListener((msg) => {
    if (!msg || typeof msg !== 'object') return;

    if (msg.t === 'bite') {
      handleIncomingBite();
    } else if (msg.t === 'run' && typeof msg.n === 'number' && typeof msg.dir === 'string') {
      const dir = msg.dir === 'left' || msg.dir === 'right' ? msg.dir : 'left';
      handleIncomingRun(msg.n, dir, Number(msg.ms) || 800);
    } else if (msg.t === 'pulled' && typeof msg.n === 'number') {
      lastPulledN = msg.n;
    } else if (msg.t === 'miss' || msg.t === 'landed') {
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
  });
}

function fastTick(): void {
  const bn = stores.benNet?.getState();
  if (!bn) return;

  // Secondary fallback: check if Zustand store is in bite phase but hook wasn't triggered
  if (bn.fishing === 'bite' && !bn.check && !biteTimeoutId) {
    const now = performance.now();
    if (now - lastHookedAt > 350) {
      lastHookedAt = now;
      sendBenWs({ t: 'hook' });
      try {
        const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
        if (pullBtn) pullBtn.click();
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      } catch {
        // ignore
      }
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
  ensureWsListener();

  if (!fastTimerId) {
    fastTimerId = setInterval(fastTick, FAST_WATCH_INTERVAL_MS);
  }
}
