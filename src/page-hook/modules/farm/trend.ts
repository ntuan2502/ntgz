// Trend goods calculation replicating the game's seeded trend schedule (play.js)

const TREND_CROPS = ['radish', 'carrot', 'corn', 'rice'];

export interface ActiveTrend {
  goods: string;
  start: number;
  end: number;
}

function hash01(e: number): number {
  let t = (e + 2135587861) | 0;
  t = Math.imul(t ^ (t >>> 16), 73244475);
  t = Math.imul(t ^ (t >>> 16), 73244475);
  t ^= t >>> 16;
  return (t >>> 0) / 4294967296;
}

function trendAt(n: number, start: number): ActiveTrend {
  const goods = n >= 2 ? [...TREND_CROPS, 'egg'] : [...TREND_CROPS];
  return { goods: goods[Math.floor(hash01(n * 3 + 1) * goods.length)], start, end: start + 2 };
}

function nextTrend(day: number): ActiveTrend {
  let t = 9;
  for (let n = 0; ; n++) {
    if (t + 2 >= day) return trendAt(n, t);
    t += 7 + Math.floor(hash01(n * 3) * 4);
  }
}

export function getActiveTrend(day: number): ActiveTrend | null {
  const t = nextTrend(day);
  return t.start <= day ? t : null;
}

export function getTrendQuota(
  goods: string,
  day: number,
  plotCount: number,
  trendLog?: { soldDay?: number; sold?: number }
): number {
  const t = getActiveTrend(day);
  if (!t || t.goods !== goods) return 0;
  const maxQuota = 4 + Math.floor(plotCount / 4);
  const sold = trendLog && trendLog.soldDay === day ? trendLog.sold || 0 : 0;
  return Math.max(0, maxQuota - sold);
}
