// Cô Kim Tiệm Vàng price formula & simulation (Exact replication from game bundle)

export interface GoldItemConfig {
  id: string;
  name: string;
  base: number;
  beta: number;
  noise: number;
  spread: number;
}

export const GOLD_DATA: GoldItemConfig[] = [
  { id: 'mieng', name: 'Vàng miếng 9999', base: 8200000, beta: 1, noise: 0.002, spread: 0.016 },
  { id: 'nhan', name: 'Nhẫn trơn 9999', base: 7600000, beta: 0.9, noise: 0.0015, spread: 0.012 },
  { id: 'k18', name: 'Vàng 18K', base: 5600000, beta: 0.7, noise: 0.002, spread: 0.09 },
  { id: 'non', name: 'Vàng non 10K', base: 3100000, beta: 2.2, noise: 0.006, spread: 0.05 },
];

export const GOLD_CATALOG: Record<string, GoldItemConfig> = Object.fromEntries(
  GOLD_DATA.map((e) => [e.id, e])
);

export const GOLD_WAVES = [
  { kind: 'calm', drift: 0, weight: 38, len: [6, 16] },
  { kind: 'up', drift: 0.005, weight: 24, len: [6, 18] },
  { kind: 'down', drift: -0.005, weight: 22, len: [6, 18] },
  { kind: 'boom', drift: 0.011, weight: 8, len: [6, 12] },
  { kind: 'crash', drift: -0.011, weight: 8, len: [6, 12] },
];

const _G_A = 0.004;
const _G_V = 0.02;
const _G_Y = 0.0003;
const _G_B = 0.045;
const _G_X = 0.7;

function _goldRng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t = (t + 1831565813) >>> 0;
    let e = t;
    e = Math.imul(e ^ (e >>> 15), e | 1);
    e ^= e + Math.imul(e ^ (e >>> 7), e | 61);
    return ((e ^ (e >>> 14)) >>> 0) / 4294967296;
  };
}

const _goldNorm = (rng: () => number) => Math.sqrt(-2 * Math.log(1 - rng())) * Math.cos(2 * Math.PI * rng());
const _goldStep = (day: number, min: number) => (day - 1) * 2 + (min >= 720 ? 1 : 0);
const _goldCache = new Map<number, any>();

function _goldSim(seed: number, step: number) {
  let n = _goldCache.get(seed);
  if (!n) {
    n = {
      index: [] as number[],
      wave: [] as string[],
      own: { mieng: [] as number[], nhan: [] as number[], k18: [] as number[], non: [] as number[] },
      r: _goldRng(seed),
      waveLeft: 0,
      drift: 0,
      kind: 'calm',
      x: 0,
      bump: 0,
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
    let r = ((t - 1) % 120) + 1;
    n.bump = e % 2 === 0 && r === 10 && t > 120 ? _G_B : n.bump * _G_X;
    n.x += n.drift + _G_A * _goldNorm(n.r) - _G_V * (n.x - _G_Y * e);
    n.index.push(n.x + n.bump);
    n.wave.push(n.kind);
    for (let g of GOLD_DATA) {
      (n.own as any)[g.id].push(g.noise * _goldNorm(n.r));
    }
  }
  return n;
}

function _goldBasePrice(seed: number, type: string, step: number): number {
  const sim = _goldSim(seed, step);
  const item = GOLD_CATALOG[type];
  if (!item) return 0;
  return item.base * Math.exp(item.beta * sim.index[step] + sim.own[type][step]);
}

export function getGoldBuyPrice(seed: number, type: string, day: number, min: number): number {
  const step = _goldStep(day, min);
  const base = _goldBasePrice(seed, type, step);
  const item = GOLD_CATALOG[type];
  return Math.round((base * (1 + (item ? item.spread / 2 : 0))) / 1000) * 1000;
}

export function getGoldSellPrice(seed: number, type: string, day: number, min: number): number {
  const step = _goldStep(day, min);
  const base = _goldBasePrice(seed, type, step);
  const item = GOLD_CATALOG[type];
  return Math.round((base * (1 - (item ? item.spread / 2 : 0))) / 1000) * 1000;
}
