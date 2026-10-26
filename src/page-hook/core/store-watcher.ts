import { stores, discoverStores, hookPhaserGame, phaserGame, benWs } from './engine-access';
import { getCricketEvents } from '../modules/wharf/cricket-watchers';
import { getActiveImportantAlert } from './interrupts';
import { GameSnapshot } from '../../shared/types/game-state';

// Ref: play.formatted.js:14793 (_e = ge.filter((e) => !I[e].story)) -> lúa (rice) không nằm trong Trend.
const _TREND_CROPS = ['radish', 'carrot', 'corn'];

function _tt(e: number): number {
  let t = (e + 2135587861) | 0;
  t = Math.imul(t ^ (t >>> 16), 73244475);
  t = Math.imul(t ^ (t >>> 16), 73244475);
  t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}

function _nt(n: number, t: number) {
  const arr = n >= 2 ? [..._TREND_CROPS, 'egg'] : [..._TREND_CROPS];
  const r = arr[Math.floor(_tt(n * 3 + 1) * arr.length)];
  return { goods: r, start: t, end: t + 2 };
}

function _rt(day: number) {
  let t = 9;
  for (let n = 0; ; n++) {
    if (t + 2 >= day) return _nt(n, t);
    t += 7 + Math.floor(_tt(n * 3) * 4);
  }
}

export function getActiveTrend(day: number) {
  const t = _rt(day);
  return t.start <= day ? t : null;
}

export function getTrendQuota(
  goods: string,
  day: number,
  plotCount: number,
  trendLog: { soldDay?: number; sold?: number } | null | undefined
): number {
  const t = getActiveTrend(day);
  if (!t || t.goods !== goods) return 0;
  const maxQuota = 4 + Math.floor(plotCount / 4);
  const sold = trendLog && trendLog.soldDay === day ? trendLog.sold || 0 : 0;
  return Math.max(0, maxQuota - sold);
}

export function computeBenStamina(
  wallet: { stamina?: number; staminaNext?: number; at?: number } | null | undefined
): number {
  if (!wallet) return 0;
  if (!wallet.staminaNext || typeof wallet.at !== 'number') return wallet.stamina ?? 0;
  const elapsed = performance.now() - wallet.at;
  if (elapsed < wallet.staminaNext) return wallet.stamina ?? 0;
  return Math.min(100, (wallet.stamina ?? 0) + 1 + Math.floor((elapsed - wallet.staminaNext) / 180000));
}

export function getSnapshot(): GameSnapshot {
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
    ? bn.basket.filter((x: { kept?: boolean }) => !x.kept).length
    : 0;

  return {
    ok: true,
    recentAlert: getActiveImportantAlert(),
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
      const soldN = v?.nightSold?.day === m.day ? (v?.nightSold?.n || 0) : 0;
      return {
        ...v,
        quotaLeft: Math.max(0, 20 - soldN),
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
          field: bu.field ?? null,
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
          cricketEvents: getCricketEvents(),
        }
      : null,
    farmstay: m.farmstay ?? null,
  };
}
