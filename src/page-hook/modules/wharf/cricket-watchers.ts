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
/** Hops with a shorter rest window are treated as feints ("nhún giả") and skipped */
const MIN_TRAP_WINDOW_MS = 180;
/** Delay after landing before trapping; network latency adds on top of this */
const TRAP_DELAY_AFTER_LANDING_MS = 40;
const MAX_BETS_PER_DAY = 20;

let watchCfg: AppConfig | null = null;
let watchCfgAt = 0;
let timerId: ReturnType<typeof setInterval> | null = null;

let scheduledHopN = -1;
const tickledKeys = new Set<string>();
const betBoutIds = new Set<string>();

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
  if (cfg.areaEnabled?.benDo === false) return false;
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
  const hop = bn.hunt?.phase === 'hop' ? bn.hunt.hop : undefined;
  if (!hop || hop.n === scheduledHopN) return;
  scheduledHopN = hop.n;
  if ((hop.window || 0) < MIN_TRAP_WINDOW_MS) return;

  const arrivedAt = typeof hop.at === 'number' ? hop.at : performance.now();
  const fireAt = arrivedAt + (hop.air || 0) + TRAP_DELAY_AFTER_LANDING_MS;
  const delay = Math.max(0, fireAt - performance.now());
  const { n, spot } = hop;

  setTimeout(() => {
    const cur = stores.benNet?.getState().hunt;
    if (cur?.phase !== 'hop' || cur.hop?.n !== n) return;
    sendBenWs({ t: 'trap', n, spot });
  }, delay);
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
