import { stores, sendBenWs } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { BenNetState, BoutSide, BoutState } from '../../../shared/types/game-store';

/**
 * Timing-critical cricket automation (hunt trap, bout tickle, arena betting).
 * The content-script tick (~200ms + bridge latency) is too coarse for these
 * windows, so they run on a fast interval inside the page context.
 */

const WATCH_INTERVAL_MS = 50;
const CONFIG_STALE_MS = 5000;
const CLASH_INTERVAL_MS = 1600;
/** Hops with a shorter rest window are feints ("nhún giả"): the cricket bounces off immediately */
const MIN_TRAP_WINDOW_MS = 150;
/** Target arrival on the server this long after the cricket lands (inside the 230-420ms rest window) */
const TRAP_SERVER_MARGIN_MS = 60;
const DEFAULT_RTT_MS = 150;
const MAX_BETS_PER_DAY = 20;
const MAX_EVENTS = 30;

let watchCfg: AppConfig | null = null;
let watchCfgAt = 0;
let timerId: ReturnType<typeof setInterval> | null = null;

let scheduledHopN = -1;
const tickledKeys = new Set<string>();
const betBoutIds = new Set<string>();

/** Round-trip latency to the wharf server, measured from `light` -> `seek` */
let rttMs = DEFAULT_RTT_MS;
let lightSentAt = 0;
let lastHuntPhase: string | undefined;
let lastMissSeq = -1;

export interface CricketWatchEvent {
  seq: number;
  text: string;
}
let eventSeq = 0;
const events: CricketWatchEvent[] = [];

function pushEvent(text: string): void {
  events.push({ seq: ++eventSeq, text });
  if (events.length > MAX_EVENTS) events.shift();
}

/** Events for the content-script log (included in the game snapshot). */
export function getCricketEvents(): CricketWatchEvent[] {
  return events;
}

/** Call right before sending `{ t: 'light' }` so the RTT can be measured. */
export function markHuntLightSent(): void {
  lightSentAt = performance.now();
}

export function getBenServerNow(bn: BenNetState): number {
  return Date.now() + (bn.ti?.skew ?? 0);
}

/** Wharf hour (UTC+7, fractional) — the wharf uses real Vietnam time, not the farm clock. */
export function getBenHour(bn: BenNetState): number {
  const d = new Date(getBenServerNow(bn) + 7 * 3600 * 1000);
  return d.getUTCHours() + d.getUTCMinutes() / 60;
}

export function getMyBout(bn: BenNetState): { bout: BoutState; side: BoutSide } | null {
  const you = bn.you;
  if (!you) return null;
  for (const bout of Object.values(bn.bouts || {})) {
    if (bout.end) continue;
    if (bout.red?.id === you) return { bout, side: 'red' };
    if (bout.blue?.id === you) return { bout, side: 'blue' };
  }
  return null;
}

/** Called on every wharf tick to keep the watcher alive with the latest config. */
export function refreshCricketWatchers(cfg: AppConfig): void {
  watchCfg = cfg;
  watchCfgAt = Date.now();
  if (!timerId) {
    timerId = setInterval(watchTick, WATCH_INTERVAL_MS);
  }
}

function isActive(cfg: AppConfig | null): cfg is AppConfig {
  if (!cfg || !cfg.running || Date.now() - watchCfgAt > CONFIG_STALE_MS) return false;
  if (cfg.runMode === 'all' && cfg.areaEnabled?.benDo === false) return false;
  return stores.main?.getState().screen === 'benDo';
}

function watchTick(): void {
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
  if (bn.status !== 'in') return;

  try {
    if (cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false) {
      watchHuntHop(bn);
    }
    if (cfg.benSubEnabled?.cricketBoss !== false) {
      if (cfg.benAutoTickle !== false) watchBoutTickle(bn);
      if (cfg.benAutoBet) watchArenaBets(bn, cfg);
    }
  } catch (err) {
    console.warn('[NTG Auto] cricket watcher error:', err);
  }
}

function watchHuntHop(bn: BenNetState): void {
  const hunt = bn.hunt;
  const phase = hunt?.phase;
  if (phase !== lastHuntPhase) {
    if (lastHuntPhase === 'light' && phase === 'seek' && lightSentAt > 0) {
      const sample = performance.now() - lightSentAt;
      if (sample > 0 && sample < 2000) rttMs = Math.round(rttMs * 0.5 + sample * 0.5);
      lightSentAt = 0;
    }
    lastHuntPhase = phase;
  }

  const miss = hunt?.miss;
  if (miss && typeof miss.seq === 'number' && miss.seq !== lastMissSeq) {
    lastMissSeq = miss.seq;
    const why: Record<string, string> = {
      early: 'úp sớm, dế còn đang bay',
      feint: 'dế nhún giả bật đi',
      wrong: 'úp nhầm bụi',
      slipped: 'úp trúng nhưng dế lách ra',
    };
    pushEvent(`🦗 Hụt: ${why[miss.kind] || miss.kind} (ping ~${rttMs}ms)`);
  }

  const hop = phase === 'hop' ? hunt?.hop : undefined;
  if (!hop || hop.n === scheduledHopN) return;
  scheduledHopN = hop.n;
  if ((hop.window || 0) < MIN_TRAP_WINDOW_MS) {
    pushEvent(`🦗 Bụi ${hop.spot + 1}: dế nhún giả (${hop.window}ms) -> bỏ qua, chờ lần nhảy sau`);
    return;
  }

  // Server landing ≈ arrival - oneWay + air; aim trap to arrive at server margin ms after landing
  const arrivedAt = typeof hop.at === 'number' ? hop.at : performance.now();
  const oneWayMs = Math.round(rttMs / 2);
  const landingAt = arrivedAt - oneWayMs + (hop.air || 0);
  const fireAt = landingAt + TRAP_SERVER_MARGIN_MS - oneWayMs;
  const delay = Math.max(0, fireAt - performance.now());
  const { n, spot } = hop;

  setTimeout(() => {
    const cur = stores.benNet?.getState().hunt;
    if (cur?.phase !== 'hop' || cur.hop?.n !== n) return;
    const pressed = pressTuft(spot);
    if (!pressed) sendBenWs({ t: 'trap', n, spot });
    pushEvent(`🦗 Đã bấm phím ${spot + 1} úp bụi cỏ (còn ${hop.left} lần nhảy · ping ~${rttMs}ms)`);
  }, delay);
}

/** Press the tuft button like a player (keyboard + DOM pointer), with golden outline and WS fallback */
function pressTuft(spot: number): boolean {
  // 1. Dispatch keyboard keydown on window to trigger game's z8 hook (plays P.sfx('click') and traps)
  try {
    const keyStr = String(spot + 1);
    const codeStr = `Digit${spot + 1}`;
    window.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: keyStr,
        code: codeStr,
        bubbles: true,
        cancelable: true,
      })
    );
  } catch {
    // ignore
  }

  // 2. Dispatch PointerEvent on the actual .ben-tuft button in DOM
  const btn = document.querySelectorAll<HTMLButtonElement>('.ben-hunt-field .ben-tuft')[spot];
  if (btn) {
    try {
      const opts = { bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0 };
      btn.dispatchEvent(new PointerEvent('pointerdown', opts));
      btn.dispatchEvent(new PointerEvent('pointerup', opts));
      btn.style.outline = '3px solid #ffd84d';
      btn.style.borderRadius = '8px';
      setTimeout(() => {
        btn.style.outline = '';
      }, 350);
    } catch {
      // ignore
    }
    return true;
  }
  return false;
}

function watchBoutTickle(bn: BenNetState): void {
  const mine = getMyBout(bn);
  if (!mine) return;
  const { bout, side } = mine;
  const left = bout.tickles?.[side] ?? 0;
  if (left <= 0 || typeof bout.startAt !== 'number') return;

  const now = getBenServerNow(bn);
  const clashN = bout.n || 0;
  const clashAt = bout.startAt + clashN * CLASH_INTERVAL_MS;
  // Game window is [clashAt - 650, clashAt + 150); aim early to absorb latency.
  const inWindup = now >= clashAt - 500 && now < clashAt + 30;
  const wavering = (bout.fire?.[side] ?? 100) < 30;

  let key: string | null = null;
  if (wavering) {
    key = `${bout.id}:waver:${clashN}`;
  } else if (inWindup && left > 1) {
    // Keep the last tickle in reserve to rally a wavering cricket.
    key = `${bout.id}:windup:${clashN}`;
  }
  if (!key || tickledKeys.has(key)) return;
  if (now < bout.startAt - 650) return;

  tickledKeys.add(key);
  if (tickledKeys.size > 200) tickledKeys.clear();
  sendBenWs({ t: 'tickle', id: bout.id });
}

function watchArenaBets(bn: BenNetState, cfg: AppConfig): void {
  const betsToday = bn.soi?.bets;
  if (typeof betsToday !== 'number' || betsToday >= MAX_BETS_PER_DAY) return;
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
    sendBenWs({ t: 'bet', id: bout.id, side, shells: amount });
    return;
  }
}

function pickBetSide(bout: BoutState): BoutSide {
  const odds = bout.odds;
  if (odds && typeof odds.red === 'number' && typeof odds.blue === 'number' && odds.red !== odds.blue) {
    // Lower payout multiplier = bookmaker's favourite.
    return odds.red < odds.blue ? 'red' : 'blue';
  }
  const sum = (s?: { power?: number; tough?: number; nerve?: number }) =>
    (s?.power || 0) + (s?.tough || 0) + (s?.nerve || 0);
  return sum(bout.blue?.stats) > sum(bout.red?.stats) ? 'blue' : 'red';
}
