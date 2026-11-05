/**
 * Từ điển hằng số dùng chung cho Khu Vực Bến Đò, Sới Dế, Sự Kiện & Bãi Phù Sa.
 * Gom tập trung từ các module page-hook và content UI để tránh khai báo trùng lặp.
 */

import fishDexRaw from './fish-dex-data.json';

export interface FishCatalogEntry {
  id: string;
  name: string;
  rarity: 'junk' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  price: number;
  size?: [number, number];
  desc?: string;
  spot?: 'bank' | 'dock';
  time?: 'dawn' | 'day' | 'dusk' | 'night';
  weekend?: boolean;
  minRod?: number;
  ghost?: boolean;
  release?: boolean;
  look?: unknown;
  shape?: unknown;
}

export const ALL_FISH_CATALOG: FishCatalogEntry[] = fishDexRaw as FishCatalogEntry[];

/**
 * Bản đồ tra cứu chi tiết cá/rác theo id (khớp với `r_` trong mã nguồn game).
 */
export const FISH_CATALOG_MAP: Map<string, FishCatalogEntry> = new Map(
  ALL_FISH_CATALOG.map((f) => [f.id, f])
);

/**
 * Bản đồ tra cứu tên tiếng Việt của toàn bộ cá và rác trong Bến Đò.
 */
export const FISH_NAME_MAP: Map<string, string> = new Map(
  ALL_FISH_CATALOG.map((f) => [f.id, f.name])
);

/**
 * Bản đồ tra cứu ngược từ tên tiếng Việt (chữ thường) sang id cá.
 */
export const FISH_NAME_TO_ID_MAP: Map<string, string> = new Map(
  ALL_FISH_CATALOG.map((f) => [f.name.trim().toLowerCase(), f.id])
);

/**
 * Chuẩn hóa id cá từ id hoặc tên hiển thị tiếng Việt.
 */
export function resolveFishId(fishIdOrName?: string | null, fallbackName?: string | null): string {
  if (fishIdOrName) {
    const trimmed = fishIdOrName.trim();
    if (FISH_CATALOG_MAP.has(trimmed)) return trimmed;
    const byName = FISH_NAME_TO_ID_MAP.get(trimmed.toLowerCase());
    if (byName) return byName;
  }
  if (fallbackName) {
    const byFallback = FISH_NAME_TO_ID_MAP.get(fallbackName.trim().toLowerCase());
    if (byFallback) return byFallback;
  }
  return fishIdOrName?.trim() || '';
}

/**
 * Lấy độ hiếm chuẩn của cá theo id từ từ điển `fish-dex-data.json` (khớp với `r_[fish]?.rarity` trong game),
 * vì payload `landed` và `basket` của máy chủ chỉ gửi `fish: "<id>"` chứ không gửi trường `rarity`.
 */
export function getFishRarity(
  fishIdOrName?: string | null,
  fallbackRarity?: string | null
): FishCatalogEntry['rarity'] {
  const resolvedId = resolveFishId(fishIdOrName);
  if (resolvedId && FISH_CATALOG_MAP.has(resolvedId)) {
    return FISH_CATALOG_MAP.get(resolvedId)!.rarity;
  }

  const raw = (fallbackRarity || '').trim().toLowerCase();
  if (!raw) return 'common';
  if (raw === 'mythic' || raw === 'myth' || raw.includes('thần thoại')) return 'mythic';
  if (raw === 'legendary' || raw === 'legend' || raw.includes('huyền thoại')) return 'legendary';
  if (raw === 'epic' || raw.includes('rất hiếm') || raw.includes('quý')) return 'epic';
  // Lưu ý: phải kiểm tra "hơi hiếm" trước "hiếm" vì chuỗi "hơi hiếm" có chứa "hiếm"!
  if (raw === 'uncommon' || raw.includes('hơi hiếm')) return 'uncommon';
  if (raw === 'rare' || raw.includes('hiếm')) return 'rare';
  if (raw === 'junk' || raw === 'rac' || raw.includes('rác')) return 'junk';
  return 'common';
}

/**
 * Tính sức chứa Ngăn cá giữ lại (khớp 100% với hàm `I$(wallet)` trong game: cơ bản 10 + 5 mỗi cấp `keepLevel`).
 */
export function getBenKeepSlots(
  wallet?: { keepSlots?: number; keepLevel?: number } | null
): number {
  if (typeof wallet?.keepSlots === 'number' && wallet.keepSlots > 0) {
    return wallet.keepSlots;
  }
  const lvl = Math.max(0, Math.min(Number(wallet?.keepLevel) || 0, 6));
  return 10 + 5 * lvl;
}

export interface BenBasketFishItem {
  id?: string;
  fish?: string;
  name?: string;
  rarity?: string;
  price?: number;
  size?: number;
  kept?: boolean;
  odd?: boolean;
  rainbow?: boolean;
  released?: boolean;
}

/**
 * Kiểm tra một con cá có thuộc diện cần giữ lại theo cấu hình `benAutoKeepRare` & `benKeepRarities` hay không.
 * Loại trừ hoàn toàn rác (`junk`) và các loài cá phóng sinh (`release: true` như Cá heo nước ngọt, Rùa vàng).
 */
export function shouldKeepFishByConfig(
  fish: BenBasketFishItem | null | undefined,
  cfg?: { benAutoKeepRare?: boolean; benKeepRarities?: string[] } | null
): boolean {
  if (!fish || fish.released) return false;
  if (!cfg?.benAutoKeepRare) return false;

  const resolvedId = resolveFishId(fish.fish, fish.name);
  const catalogEntry = resolvedId ? FISH_CATALOG_MAP.get(resolvedId) : undefined;
  if (catalogEntry?.release) return false;

  const rarity = catalogEntry?.rarity || getFishRarity(fish.fish || fish.name, fish.rarity);
  if (rarity === 'junk') return false;

  const allowedRarities = Array.isArray(cfg.benKeepRarities)
    ? cfg.benKeepRarities
    : ['mythic', 'legendary', 'rainbow', 'odd'];

  return Boolean(
    (fish.rainbow && allowedRarities.includes('rainbow')) ||
      (fish.odd && allowedRarities.includes('odd')) ||
      allowedRarities.includes(rarity)
  );
}

const RARITY_PRIORITY_SCORE: Record<FishCatalogEntry['rarity'], number> = {
  junk: 0,
  common: 1,
  uncommon: 2,
  rare: 3,
  epic: 4,
  legendary: 5,
  mythic: 6,
};

function compareFishKeepPriority(a: BenBasketFishItem, b: BenBasketFishItem): number {
  const priceDiff = (Number(b.price) || 0) - (Number(a.price) || 0);
  if (priceDiff !== 0) return priceDiff;
  const rarA = RARITY_PRIORITY_SCORE[getFishRarity(a.fish || a.name, a.rarity)] || 0;
  const rarB = RARITY_PRIORITY_SCORE[getFishRarity(b.fish || b.name, b.rarity)] || 0;
  if (rarB !== rarA) return rarB - rarA;
  const sizeDiff = (Number(b.size) || 0) - (Number(a.size) || 0);
  if (sizeDiff !== 0) return sizeDiff;
  if (Boolean(a.kept) !== Boolean(b.kept)) return a.kept ? -1 : 1;
  return 0;
}

export interface BasketUnkeepEntry {
  fish: BenBasketFishItem;
  reason: 'not_in_filter' | 'duplicate' | 'slot_full';
  betterFish?: BenBasketFishItem;
}

export interface BasketKeepPlan {
  keepSlots: number;
  desiredKeptIds: Set<string>;
  toUnkeep: BasketUnkeepEntry[];
  toKeep: BenBasketFishItem[];
}

/**
 * Tính toán danh sách cá cần giữ (`toKeep`) và cần bỏ giữ (`toUnkeep`) trong `bn.basket`:
 * 1. Chỉ giữ những cá khớp `shouldKeepFishByConfig` (loại bỏ cá thường/hơi hiếm bị giữ nhầm hoặc ngoài bộ lọc).
 * 2. Nếu bật `benAutoSellDuplicateKept`, mỗi loài (`fish`) chỉ giữ 1 con có giá bán (`price`) cao nhất.
 * 3. Giới hạn tổng số cá giữ không vượt quá `keepSlots` (ưu tiên giữ con đắt hơn).
 */
export function computeBasketKeepPlan(
  basket: BenBasketFishItem[] | null | undefined,
  wallet: { keepSlots?: number; keepLevel?: number } | null | undefined,
  cfg?: {
    benAutoKeepRare?: boolean;
    benKeepRarities?: string[];
    benAutoSellDuplicateKept?: boolean;
  } | null
): BasketKeepPlan {
  const keepSlots = getBenKeepSlots(wallet);
  const desiredKeptIds = new Set<string>();
  const toUnkeep: BasketUnkeepEntry[] = [];
  const toKeep: BenBasketFishItem[] = [];

  if (!Array.isArray(basket) || basket.length === 0 || !cfg?.benAutoKeepRare) {
    return { keepSlots, desiredKeptIds, toUnkeep, toKeep };
  }

  const validItems = basket.filter((f): f is BenBasketFishItem => Boolean(f && f.id && !f.released));
  const matching: BenBasketFishItem[] = [];
  const nonMatchingIds = new Set<string>();

  for (const f of validItems) {
    if (shouldKeepFishByConfig(f, cfg)) {
      matching.push(f);
    } else {
      nonMatchingIds.add(f.id!);
    }
  }

  const duplicateBetterMap = new Map<string, BenBasketFishItem>();
  let candidates: BenBasketFishItem[] = [];

  if (cfg.benAutoSellDuplicateKept !== false) {
    const bySpecies = new Map<string, BenBasketFishItem[]>();
    for (const f of matching) {
      const speciesKey = resolveFishId(f.fish, f.name) || f.fish || f.id!;
      if (!bySpecies.has(speciesKey)) bySpecies.set(speciesKey, []);
      bySpecies.get(speciesKey)!.push(f);
    }

    for (const [, list] of bySpecies.entries()) {
      list.sort(compareFishKeepPriority);
      candidates.push(list[0]);
      for (const dup of list.slice(1)) {
        if (dup.id) duplicateBetterMap.set(dup.id, list[0]);
      }
    }
  } else {
    candidates = [...matching];
  }

  candidates.sort(compareFishKeepPriority);
  const winners = candidates.slice(0, keepSlots);
  for (const w of winners) {
    if (w.id) desiredKeptIds.add(w.id);
  }

  for (const f of validItems) {
    const id = f.id!;
    if (f.kept && !desiredKeptIds.has(id)) {
      if (nonMatchingIds.has(id)) {
        toUnkeep.push({ fish: f, reason: 'not_in_filter' });
      } else if (duplicateBetterMap.has(id)) {
        toUnkeep.push({ fish: f, reason: 'duplicate', betterFish: duplicateBetterMap.get(id) });
      } else {
        toUnkeep.push({ fish: f, reason: 'slot_full', betterFish: winners[winners.length - 1] });
      }
    } else if (!f.kept && desiredKeptIds.has(id)) {
      toKeep.push(f);
    }
  }

  return { keepSlots, desiredKeptIds, toUnkeep, toKeep };
}

/**
 * Lấy tên hiển thị của cá theo id, ưu tiên tên từ từ điển game, fallback qua id.
 */
export function getFishDisplayName(fishId?: string | null, fallbackName?: string | null): string {
  if (!fishId && !fallbackName) return 'Cá';
  if (fallbackName && fallbackName.trim() && fallbackName !== fishId) return fallbackName;
  if (fishId && FISH_NAME_MAP.has(fishId)) return FISH_NAME_MAP.get(fishId)!;
  return fallbackName || fishId || 'Cá';
}

/**
 * Tổng số loài cá hợp lệ để tính cho Bảng vàng Sổ cá nhiều loài (không tính rác, không tính thần thoại, không tính ghost).
 * Tính động từ từ điển `fish-dex-data.json`, khớp 100% với biến `a_` trong mã nguồn game `n_.filter(i_).length`.
 */
export const TOTAL_CATCHABLE_SPECIES_COUNT: number = ALL_FISH_CATALOG.filter(
  (f) => f.rarity !== 'junk' && f.rarity !== 'mythic' && !f.ghost
).length;

/**
 * Hằng số chu kỳ thủy triều chính thức từ game engine (Bến Đò & Bãi Phù Sa).
 */
const TIDE_CYCLE_MS = 447e5; // 12.416666 giờ chu kỳ con nước
const TIDE_EPOCH_MS = Date.parse('2026-10-01T06:00:00+07:00');
const TIDE_HIGH_DURATION_MS = 108e5; // 3 giờ nước lớn

export interface TideStatus {
  phase: 'lon' | 'xuong' | 'rong' | 'len';
  phaseName: string;
  cycleNo: number;
  endsAt: number;
  nextHigh: number;
  nextLow: number;
  isLowTide: boolean;
}

export function computeTideStatus(nowMs: number): TideStatus {
  const cycleIndex = Math.floor((nowMs - TIDE_EPOCH_MS) / TIDE_CYCLE_MS);
  const cycleStart = TIDE_EPOCH_MS + cycleIndex * TIDE_CYCLE_MS;
  const elapsed = nowMs - cycleStart;
  const halfCycle = TIDE_CYCLE_MS / 2;
  const phase: 'lon' | 'xuong' | 'rong' | 'len' =
    elapsed < TIDE_HIGH_DURATION_MS
      ? 'lon'
      : elapsed < halfCycle
        ? 'xuong'
        : elapsed < 3315e4
          ? 'rong'
          : 'len';

  const phaseNames: Record<string, string> = {
    lon: 'Nước lớn (Cá ăn khoẻ 🌊)',
    xuong: 'Nước xuống (Rút dần ↘️)',
    rong: 'Nước ròng (Mò ốc bãi bùn 🟤)',
    len: 'Nước lên (Nước dâng ↗️)',
  };

  const endsAt =
    cycleStart +
    (phase === 'lon'
      ? TIDE_HIGH_DURATION_MS
      : phase === 'xuong'
        ? halfCycle
        : phase === 'rong'
          ? 3315e4
          : TIDE_CYCLE_MS);

  return {
    phase,
    phaseName: phaseNames[phase] || phase,
    cycleNo: cycleIndex,
    endsAt,
    nextHigh: elapsed < TIDE_HIGH_DURATION_MS ? cycleStart : cycleStart + TIDE_CYCLE_MS,
    nextLow: elapsed < 3315e4 ? cycleStart + halfCycle : cycleStart + TIDE_CYCLE_MS + halfCycle,
    isLowTide: phase === 'rong',
  };
}

export const BEN_FOOD_NAMES: Record<string, string> = {
  banhMi: '🥖 Bánh mì thịt (+20⚡)',
  chaoCa: '🥣 Cháo cá lóc (+28⚡)',
  huTieu: '🍜 Hủ tiếu nam vang (+40⚡)',
  comTam: '🍛 Cơm tấm sườn bì (+60⚡)',
  lauMam: '🍲 Lẩu cá linh bông điên điển (+100⚡)',
};

export const BEN_PACK_NAMES: Record<string, string> = {
  xoiBap: '🍙 Xôi bắp gói lá chuối (+15⚡)',
  banhMiGoi: '🥖 Bánh mì gói giấy (+20⚡)',
  banhBao: '🥟 Bánh bao nhân thịt (+22⚡)',
  comNam: '🍙 Cơm nắm muối mè (+30⚡)',
  banhTet: '🫔 Bánh tét lá cẩm (+50⚡)',
  traDaTui: '🧋 Trà đá túi xách (+8⚡)',
  nuocSuoi: '💧 Chai nước suối (+10⚡)',
};

export interface PackFoodEntry {
  id: string;
  name: string;
  price: number;
  stamina: number;
  icon: string;
  desc?: string;
}

export const PACK_FOOD_OPTIONS: PackFoodEntry[] = [
  { id: 'banhTet', name: 'Bánh tét lá cẩm', price: 30, stamina: 50, icon: '🫔', desc: 'Nguyên đòn bánh tét gói lá (+50⚡ · 30🐚)' },
  { id: 'comNam', name: 'Cơm nắm muối mè', price: 17, stamina: 30, icon: '🍙', desc: 'Nắm chặt tay, chấm muối mè (+30⚡ · 17🐚)' },
  { id: 'banhBao', name: 'Bánh bao nhân thịt', price: 13, stamina: 22, icon: '🥟', desc: 'Nhân thịt trứng cút (+22⚡ · 13🐚)' },
  { id: 'banhMiGoi', name: 'Bánh mì gói giấy', price: 12, stamina: 20, icon: '🥖', desc: 'Bánh mì thịt gói giấy (+20⚡ · 12🐚)' },
  { id: 'xoiBap', name: 'Xôi bắp gói lá chuối', price: 9, stamina: 15, icon: '🍙', desc: 'Xôi bắp dừa nạo (+15⚡ · 9🐚)' },
];

export const PACK_FOOD_MAP: Map<string, PackFoodEntry> = new Map(
  PACK_FOOD_OPTIONS.map((f) => [f.id, f])
);

export const PACK_FOOD_PRICES: Record<string, number> = Object.fromEntries(
  PACK_FOOD_OPTIONS.map((f) => [f.id, f.price])
);

export const PACK_FOOD_STAMINA: Record<string, number> = Object.fromEntries(
  PACK_FOOD_OPTIONS.map((f) => [f.id, f.stamina])
);

export const BEN_DRINK_NAMES: Record<string, string> = {
  traDa: '🧊 Trà đá (+8⚡)',
  nuocMia: '🥤 Nước mía tắc (+5⚡, May +1)',
  rauMa: '🍵 Rau má đậu xanh (+5⚡, May +1)',
  caPhe: '☕ Cà phê sữa đá (+10⚡, May +2)',
  duaTuoi: '🥥 Dừa xiêm tươi (+15⚡, May +3)',
};

export const BEN_BAIT_NAMES: Record<string, string> = {
  xinMoi: '🤲 10 mồi miễn phí',
  moi20: '🪱 Hộp mồi trùn (+20 mồi)',
  moi60: '🪱 Thau mồi trùn (+60 mồi)',
  moi150: '🪱 Thùng mồi cám (+150 mồi)',
};

export const WHEEL_ITEM_IDS = [
  'canhSaoDem',
  'canhHac',
  'rongMay',
  'trangRam',
  'canhPhuong',
  'vayRong',
  'canhCo',
  'denKeoQuan',
  'dieuSao',
  'danKimXaCu',
  'coGhe',
  'denCaChep',
  'loTre',
  'danKim',
  'dienDien',
  'denOngSao',
  'dieuGiay',
  'canCau',
];

export interface WheelItemMeta {
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legend' | 'myth';
  tierLabel: string;
}

export const WHEEL_ITEM_METAS: Record<string, WheelItemMeta> = {
  // Common
  gui: { name: 'Gùi tre', tier: 'common', tierLabel: 'Thường' },
  gioCa: { name: 'Giỏ cá tre', tier: 'common', tierLabel: 'Thường' },
  cui: { name: 'Bó củi khô', tier: 'common', tierLabel: 'Thường' },
  thuocSau: { name: 'Bình xịt thuốc sâu', tier: 'common', tierLabel: 'Thường' },
  thuocCo: { name: 'Bình xịt thuốc cỏ', tier: 'common', tierLabel: 'Thường' },
  ongTre: { name: 'Ống tre đựng nước', tier: 'common', tierLabel: 'Thường' },
  baoLua: { name: 'Bao lúa', tier: 'common', tierLabel: 'Thường' },
  // Uncommon
  maiCheo: { name: 'Mái chèo gỗ', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  canCau: { name: 'Cần câu tre đeo chéo', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  dieuGiay: { name: 'Diều giấy', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  denOngSao: { name: 'Lồng đèn ông sao', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  dienDien: { name: 'Bó bông điên điển', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  // Rare
  danKim: { name: 'Đàn kìm', tier: 'rare', tierLabel: 'Hiếm' },
  loTre: { name: 'Lờ tre bắt cá', tier: 'rare', tierLabel: 'Hiếm' },
  denCaChep: { name: 'Lồng đèn cá chép', tier: 'rare', tierLabel: 'Hiếm' },
  coGhe: { name: 'Cờ đuôi nheo đua ghe', tier: 'rare', tierLabel: 'Hiếm' },
  // Epic
  danKimXaCu: { name: 'Đàn kìm cẩn xà cừ', tier: 'epic', tierLabel: 'Rất hiếm' },
  dieuSao: { name: 'Diều sáo vi vu', tier: 'epic', tierLabel: 'Rất hiếm' },
  denKeoQuan: { name: 'Lồng đèn kéo quân', tier: 'epic', tierLabel: 'Rất hiếm' },
  // Legend
  canhCo: { name: 'Đôi cánh cò trắng', tier: 'legend', tierLabel: 'Huyền thoại' },
  vayRong: { name: 'Vây cá chép hoá rồng', tier: 'legend', tierLabel: 'Huyền thoại' },
  canhThienThan: { name: 'Đôi cánh thiên thần', tier: 'legend', tierLabel: 'Huyền thoại' },
  // Myth
  canhPhuong: { name: 'Đôi cánh phượng hoàng lửa', tier: 'myth', tierLabel: 'Thần thoại' },
  trangRam: { name: 'Vầng trăng rằm', tier: 'myth', tierLabel: 'Thần thoại' },
  rongMay: { name: 'Rồng mây vàng', tier: 'myth', tierLabel: 'Thần thoại' },
  canhHac: { name: 'Đôi cánh hạc tiên', tier: 'myth', tierLabel: 'Thần thoại' },
  canhSaoDem: { name: 'Đôi cánh sao đêm', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhPhaLe: { name: 'Đôi cánh pha lê', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhBuomNeon: { name: 'Đôi cánh bướm neon', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhCoKhi: { name: 'Đôi cánh cơ khí', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhLuaXanh: { name: 'Đôi cánh lửa xanh', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhCauVong: { name: 'Đôi cánh cầu vồng', tier: 'myth', tierLabel: 'Thần thoại' },
};

export const CRICKET_SPECIES_NAMES: Record<string, string> = {
  deCom: 'Dế cơm',
  deMen: 'Dế mèn',
  deDat: 'Dế đất',
  deThan: 'Dế than',
  deTrui: 'Dế trũi',
  deCo: 'Dế cồ',
  deLua: 'Dế lửa',
  deNgoc: 'Dế ngọc',
  deVang: 'Dế vàng',
  deMa: 'Dế ma',
  deSat: 'Dế sắt',
  deVuong: 'Dế vương',
};

export const CRICKET_RARITY_REFUND: Record<string, number> = {
  common: 5,
  uncommon: 15,
  rare: 40,
  epic: 120,
  legendary: 400,
};

export const CRICKET_SPECIES_RARITY: Record<string, string> = {
  deCom: 'common',
  deMen: 'common',
  deDat: 'common',
  deThan: 'uncommon',
  deTrui: 'uncommon',
  deCo: 'uncommon',
  deLua: 'rare',
  deNgoc: 'rare',
  deVang: 'rare',
  deMa: 'epic',
  deSat: 'epic',
  deVuong: 'legendary',
};

export const CRICKET_RARITY_LABELS: Record<string, string> = {
  common: 'Thường',
  uncommon: 'Khá',
  rare: 'Hiếm',
  epic: 'Quý',
  legendary: 'Huyền thoại',
};

export interface WharfBossStatus {
  serverNow: number;
  isHlwLive: boolean;
  isBossAliveTime: boolean;
  isBossActive: boolean;
  msToNextBoss: number;
  secondsToNextBoss: number;
  isBossImpending: boolean;
}

/**
 * Hàm tính toán tập trung trạng thái Boss Bí Ngô & Đếm ngược 10s
 * Dùng chung cho cả Page Hook (wharf/boss-hunter.ts) và Content Script (wharf-runner.ts).
 */
export function computeWharfBossStatus(
  bn: {
    ti?: { skew?: number } | null;
    hlwLive?: { on?: boolean; endsAt?: number | null } | null;
    hlwBoss?: { start?: number } | null;
  } | null | undefined,
  autoBossHuntEnabled: boolean
): WharfBossStatus {
  const serverNow = Date.now() + (bn?.ti?.skew ?? 0);
  const hlwLive = bn?.hlwLive;
  const hasBossCountdownDom =
    typeof document !== 'undefined' && Boolean(document.querySelector('.hlw-boss-countdown'));
  const hasCountdownSoonInDom =
    typeof document !== 'undefined' && Boolean(document.querySelector('.hlw-boss-countdown.soon'));
  const hasBossDom = typeof document !== 'undefined' && Boolean(document.querySelector('.hlw-boss'));

  const isHlwLive = Boolean(
    (hlwLive?.on && (hlwLive.endsAt === null || hlwLive.endsAt === undefined || Date.now() < hlwLive.endsAt)) ||
    hasBossCountdownDom ||
    hasCountdownSoonInDom ||
    hasBossDom
  );
  const bossStart = typeof bn?.hlwBoss?.start === 'number' ? bn.hlwBoss.start : 0;
  const isBossAliveTime = Boolean(bossStart > 0 && serverNow >= bossStart && serverNow < bossStart + 180000);
  const isBossActive = Boolean(
    autoBossHuntEnabled && (isBossAliveTime || bn?.hlwBoss || hasBossDom)
  );

  let msToNextBoss = Math.ceil(serverNow / 1800000) * 1800000 - serverNow;
  let secondsToNextBoss = Math.ceil(msToNextBoss / 1000);

  if (typeof document !== 'undefined' && hasBossCountdownDom) {
    const text = document.querySelector('.hlw-boss-countdown')?.textContent || '';
    const m = text.match(/(\d+)\s*s/);
    if (m) {
      secondsToNextBoss = parseInt(m[1], 10);
      msToNextBoss = secondsToNextBoss * 1000;
    }
  }

  const isBossImpending = Boolean(
    autoBossHuntEnabled &&
      isHlwLive &&
      !isBossActive &&
      ((secondsToNextBoss <= 10 && secondsToNextBoss > 0) || hasCountdownSoonInDom)
  );

  return {
    serverNow,
    isHlwLive,
    isBossAliveTime,
    isBossActive,
    msToNextBoss,
    secondsToNextBoss,
    isBossImpending,
  };
}


export const RARITY_NAMES: Record<string, string> = {
  common: 'Thường',
  uncommon: 'Hơi hiếm',
  rare: 'Hiếm',
  epic: 'Rất hiếm',
  legend: 'Huyền thoại',
  legendary: 'Huyền thoại',
  myth: 'Thần thoại',
  mythic: 'Thần thoại',
  junk: 'Rác',
  rac: 'Rác',
};

export const RARITY_COLORS: Record<string, string> = {
  common: '#6a9a4a',
  uncommon: '#3c8fd0',
  rare: '#9b6bff',
  epic: '#e0443a',
  legend: '#e8a020',
  legendary: '#e8a020',
  myth: '#e0306a',
  mythic: '#e0306a',
  junk: '#8a8070',
  rac: '#8a8070',
};

export const STANDARD_RODS = [
  {
    level: 1,
    name: 'Cần tre',
    desc: 'Cần tre cơ bản, câu ven bờ',
    stats: 'Độ căng dây: 35',
    icon: '🎣',
  },
  {
    level: 2,
    name: 'Cần sợi thuỷ tinh',
    desc: 'Dẻo dai, nhạy phao hơn, dễ dính cá hiếm',
    stats: 'Cắn +150ms · Giật +120ms · Căng: 30',
    icon: '🎣',
  },
  {
    level: 3,
    name: 'Cần carbon',
    desc: 'Nhẹ và chắc, cá huyền thoại cũng phải nể',
    stats: 'Cắn +300ms · Giật +240ms · Căng: 25',
    icon: '🎣',
  },
  {
    level: 4,
    name: 'Cần nano',
    desc: 'Đỉnh cao kỹ thuật, bắt cá thần thoại',
    stats: 'Cắn +340ms · Giật +270ms · Căng: 23',
    icon: '🎣',
  },
];

export interface RodTraitMeta {
  id: string;
  icon: string;
  name: string;
  desc: string;
  statBadge?: string;
}

export const ROD_TRAITS_MAP: Record<string, RodTraitMeta> = {
  nhay: {
    id: 'nhay',
    icon: '🎯',
    name: 'Nhạy phao',
    desc: 'Phao chìm lâu hơn mới chạy, dễ canh giật',
    statBadge: '+250ms giật',
  },
  day: {
    id: 'day',
    icon: '🧵',
    name: 'Dây chắc',
    desc: 'Ghìm cần dư thời gian hơn, vuốt sai dây ít căng',
    statBadge: '+100ms ghìm, -7 căng',
  },
  to: {
    id: 'to',
    icon: '📏',
    name: 'Cá to',
    desc: 'Cá câu lên hay to hơn (tăng tỉ lệ cá khủng & kỷ lục)',
    statBadge: 'Cỡ x1.3',
  },
  tinh: {
    id: 'tinh',
    icon: '✨',
    name: 'Mắt tinh',
    desc: 'Dễ ra cá lạ và hiếm hơn',
    statBadge: 'Cá lạ x1.6',
  },
  cauVong: {
    id: 'cauVong',
    icon: '🌈',
    name: 'Cầu vồng',
    desc: 'Tăng mạnh tỉ lệ xuất hiện cá cầu vồng',
    statBadge: 'Cầu vồng x2',
  },
  nhe: {
    id: 'nhe',
    icon: '💪',
    name: 'Nhẹ tay',
    desc: 'Mỗi lần quăng tốn 3 Sức thay vì 4',
    statBadge: '-1 Sức (3⚡/lần)',
  },
  moi: {
    id: 'moi',
    icon: '🪱',
    name: 'Giữ mồi',
    desc: 'Ba lần quăng thì chừng một lần không mất mồi',
    statBadge: '33% giữ mồi',
  },
  dem: {
    id: 'dem',
    icon: '🌙',
    name: 'Cần đêm',
    desc: 'Thêm may mắn khi câu từ 18h tới 6h sáng',
    statBadge: '+2 May (18h-6h)',
  },
  som: {
    id: 'som',
    icon: '🌅',
    name: 'Cần sớm chiều',
    desc: 'Thêm may mắn từ 5h–9h sáng và 16h–19h chiều',
    statBadge: '+2 May (5-9h & 16-19h)',
  },
  hai: {
    id: 'hai',
    icon: '🐟',
    name: 'Hai lưỡi',
    desc: '1/10 tỉ lệ cá lên bờ dính thêm một con nữa',
    statBadge: '10% câu kép',
  },
  gia: {
    id: 'gia',
    icon: '💰',
    name: 'Được giá',
    desc: 'Cá câu bằng cần này bán được thêm 15% tiền',
    statBadge: '+15% tiền bán',
  },
};

export interface SpecialRodMeta {
  id: string;
  grade: string;
  gradeName: string;
  gradeColor: string;
  name: string;
  desc: string;
  traits: string[];
  icon?: string;
}

export const SPECIAL_RODS_MAP: Record<string, SpecialRodMeta> = {
  tamVong: {
    id: 'tamVong',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần tầm vông',
    desc: 'Tầm vông phơi khô ba nắng, đầu cần rung là biết cá rỉa',
    traits: ['nhay'],
    icon: '🎣',
  },
  trucDen: {
    id: 'trucDen',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần trúc đen',
    desc: 'Trúc đen hun khói bếp, dẻo mà không gãy',
    traits: ['day'],
    icon: '🎣',
  },
  sayDong: {
    id: 'sayDong',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần sậy đồng',
    desc: 'Lưỡi ông Sáu uốn khéo, cá rỉa hoài không sổng mồi',
    traits: ['moi'],
    icon: '🎣',
  },
  mayRung: {
    id: 'mayRung',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần mây rừng',
    desc: 'Mây rừng nhẹ hều, quăng cả buổi không mỏi tay',
    traits: ['nhe'],
    icon: '🎣',
  },
  trangRam: {
    id: 'trangRam',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần trăng rằm',
    desc: 'Sơn trắng ánh trăng, đêm rằm cá kéo nhau lên cắn',
    traits: ['dem', 'nhay'],
    icon: '🎣',
  },
  binhMinh: {
    id: 'binhMinh',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần bình minh',
    desc: 'Màu nắng sớm, gà gáy là phao bắt đầu nhúc nhích',
    traits: ['som', 'day'],
    icon: '🎣',
  },
  ongSau: {
    id: 'ongSau',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần ông Sáu chuốt',
    desc: 'Cây ruột của ông Sáu, chuốt tay cả tháng trời',
    traits: ['to', 'moi'],
    icon: '🎣',
  },
  gheNgo: {
    id: 'gheNgo',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần ghe ngo',
    desc: 'Đỏ vàng như ghe ngo đua, thương lái thấy là trả giá cao',
    traits: ['gia', 'nhe'],
    icon: '🎣',
  },
  ngocBich: {
    id: 'ngocBich',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần ngọc bích',
    desc: 'Xanh trong như ngọc, cá lạ cá cầu vồng hay ghé',
    traits: ['tinh', 'nhay', 'cauVong'],
    icon: '🎣',
  },
  sungTrau: {
    id: 'sungTrau',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần sừng trâu',
    desc: 'Cán sừng trâu đen bóng, cá to cỡ nào cũng ghìm nổi',
    traits: ['to', 'day', 'gia'],
    icon: '🎣',
  },
  domDom: {
    id: 'domDom',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần đom đóm',
    desc: 'Đêm xuống cả cây cần lập loè như bầy đom đóm',
    traits: ['dem', 'tinh', 'moi'],
    icon: '🎣',
  },
  rongVang: {
    id: 'rongVang',
    grade: 'legend',
    gradeName: 'Huyền thoại',
    gradeColor: '#e8a020',
    name: 'Cần rồng vàng',
    desc: 'Chạm rồng vàng uốn quanh thân, cá chép thấy cũng muốn hoá rồng',
    traits: ['to', 'tinh', 'day', 'hai'],
    icon: '🎣',
  },
  thuongLuong: {
    id: 'thuongLuong',
    grade: 'legend',
    gradeName: 'Huyền thoại',
    gradeColor: '#e8a020',
    name: 'Cần thuồng luồng',
    desc: 'Vảy xanh rêu ánh vàng, nghe đồn lấy từ đáy sông sâu',
    traits: ['dem', 'cauVong', 'nhe', 'hai'],
    icon: '🎣',
  },
  haBa: {
    id: 'haBa',
    grade: 'ultimate',
    gradeName: 'Tối thượng',
    gradeColor: '#e0306a',
    name: 'Cần Hà Bá',
    desc: 'Cây cần của thần sông, cả trăm năm mới trồi lên một lần, cá nào cũng phải nể',
    traits: ['nhay', 'day', 'to', 'tinh', 'cauVong', 'hai'],
    icon: '🎣',
  },
};

export const ALL_SPECIAL_RODS = Object.values(SPECIAL_RODS_MAP);

export const FOOD_ITEMS = [
  { id: 'banhMi', name: 'Bánh mì thịt', stamina: 20, icon: '🥖', desc: 'Ăn lẹ rồi ra câu tiếp' },
  { id: 'chaoCa', name: 'Cháo cá lóc', stamina: 28, icon: '🥣', desc: 'Nóng hổi, thêm tiêu với hành phi' },
  { id: 'huTieu', name: 'Hủ tiếu nam vang', stamina: 40, icon: '🍜', desc: 'Nước lèo ngọt thanh, ăn xong khoẻ re' },
  { id: 'comTam', name: 'Cơm tấm sườn bì', stamina: 60, icon: '🍛', desc: 'Sườn nướng than, mỡ hành nước mắm kẹo' },
  { id: 'lauMam', name: 'Lẩu cá linh', stamina: 100, icon: '🍲', desc: 'Mùa nước nổi, một nồi là đầy Sức' },
  { id: 'xoiBap', name: 'Xôi bắp gói lá chuối', stamina: 15, icon: '🍙', desc: 'Hạt bắp dẻo thơm rắc đậu phộng' },
  { id: 'khoaiMi', name: 'Khoai mì hấp dừa', stamina: 12, icon: '🥔', desc: 'Khoai mì bùi béo ngọt dịu' },
  { id: 'nuocMia', name: 'Ly nước mía tắc', stamina: 10, icon: '🥤', desc: 'Mát lạnh giải nhiệt trưa hè' },
  { id: 'traDa', name: 'Ca trà đá đường', stamina: 8, icon: '🧊', desc: 'Đã khát bên bờ sông' },
  { id: 'cheBuoi', name: 'Chén chè bưởi', stamina: 18, icon: '🍧', desc: 'Cùi bưởi giòn sần sật' },
];

export const FOOD_PRICES: Record<string, number> = {
  banhMi: 10,
  chaoCa: 14,
  huTieu: 20,
  comTam: 28,
  lauMam: 45,
  xoiBap: 8,
  khoaiMi: 6,
  nuocMia: 5,
  traDa: 2,
  cheBuoi: 5,
};

export interface FishingSubSpotMeta {
  key: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
}

export interface FishingSpotMeta {
  key: string;
  kind: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
  subSpots?: FishingSubSpotMeta[];
}

export const FISHING_SPOTS: Record<string, FishingSpotMeta> = {
  // 1. Cầu tàu lớn (Đầy đủ các loài cá Thần thoại / Huyền thoại / Cầu vồng)
  dock: {
    key: 'dock',
    kind: 'dock',
    label: '🌉 Cầu tàu lớn (Đầu mũi & thân cầu)',
    tiles: [
      { x: 27, y: 4 }, { x: 28, y: 4 }, { x: 27, y: 3 }, { x: 28, y: 3 },
      { x: 31, y: 3 }, { x: 30, y: 3 }, { x: 32, y: 3 }, { x: 29, y: 3 }, { x: 33, y: 3 },
      { x: 35, y: 4 }, { x: 36, y: 4 }, { x: 35, y: 3 }, { x: 36, y: 3 },
      { x: 31, y: 8 }, { x: 31, y: 7 }, { x: 31, y: 6 }, { x: 31, y: 9 },
      { x: 32, y: 8 }, { x: 32, y: 7 }, { x: 32, y: 6 }, { x: 32, y: 9 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu tàu (Rung lắc ngẫu nhiên)',
        tiles: [
          { x: 27, y: 4 }, { x: 28, y: 4 }, { x: 31, y: 3 }, { x: 30, y: 3 },
          { x: 32, y: 3 }, { x: 35, y: 4 }, { x: 36, y: 4 }, { x: 31, y: 8 },
        ],
      },
      {
        key: 'west_head',
        label: '📍 Mép Tây mặt cầu (Sát Xe Chị Thơm: 8 bước)',
        tiles: [{ x: 27, y: 4 }, { x: 28, y: 4 }, { x: 27, y: 3 }, { x: 28, y: 3 }],
      },
      {
        key: 'west_stem',
        label: '📍 Thân cầu phía Tây (Gần Chị Thơm: 8 bước)',
        tiles: [{ x: 31, y: 8 }, { x: 31, y: 7 }, { x: 31, y: 9 }, { x: 31, y: 6 }],
      },
      {
        key: 'mid_head',
        label: '📍 Đầu mũi giữa sông (Chính diện)',
        tiles: [{ x: 31, y: 3 }, { x: 30, y: 3 }, { x: 32, y: 3 }, { x: 29, y: 3 }, { x: 33, y: 3 }],
      },
      {
        key: 'east_head',
        label: '📍 Mép Đông mặt cầu (Phía vựa cá)',
        tiles: [{ x: 35, y: 4 }, { x: 36, y: 4 }, { x: 35, y: 3 }, { x: 36, y: 3 }],
      },
      {
        key: 'east_stem',
        label: '📍 Thân cầu phía Đông (Nhìn sang vựa cá)',
        tiles: [{ x: 32, y: 8 }, { x: 32, y: 7 }, { x: 32, y: 9 }, { x: 32, y: 6 }],
      },
    ],
  },

  // 2. Cầu tre lắt lẻo (Mạn Tây)
  bamboo: {
    key: 'bamboo',
    kind: 'dock',
    label: '🎋 Cầu tre lắt lẻo (Mạn Tây)',
    tiles: [
      { x: 7, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 6 }, { x: 8, y: 7 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu tre',
        tiles: [{ x: 7, y: 6 }, { x: 8, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 7 }],
      },
      {
        key: 'bamboo_head',
        label: '📍 Đầu cầu tre ngoài xa',
        tiles: [{ x: 7, y: 6 }, { x: 8, y: 6 }],
      },
      {
        key: 'bamboo_stem',
        label: '📍 Thân cầu tre',
        tiles: [{ x: 7, y: 7 }, { x: 8, y: 7 }],
      },
    ],
  },

  // 3. Cầu ván qua lạch (Mạn Đông)
  bridge: {
    key: 'bridge',
    kind: 'dock',
    label: '🪵 Cầu ván qua lạch (Mạn Đông)',
    tiles: [
      { x: 46, y: 15 }, { x: 47, y: 15 }, { x: 48, y: 15 }, { x: 49, y: 15 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu ván',
        tiles: [{ x: 47, y: 15 }, { x: 48, y: 15 }, { x: 46, y: 15 }, { x: 49, y: 15 }],
      },
      {
        key: 'bridge_mid',
        label: '📍 Giữa cầu ván',
        tiles: [{ x: 47, y: 15 }, { x: 48, y: 15 }],
      },
      {
        key: 'bridge_ends',
        label: '📍 Hai đầu cầu ván',
        tiles: [{ x: 46, y: 15 }, { x: 49, y: 15 }],
      },
    ],
  },

  // 4. Bờ sông Bến Giữa (Gần Xe Chị Thơm)
  bank_center: {
    key: 'bank_center',
    kind: 'bank',
    label: '🌾 Bờ sông bến giữa (Sát Xe Chị Thơm)',
    tiles: [
      { x: 23, y: 10 }, { x: 24, y: 10 }, { x: 25, y: 10 },
      { x: 28, y: 10 }, { x: 29, y: 10 }, { x: 30, y: 10 }, { x: 33, y: 10 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến giữa',
        tiles: [{ x: 25, y: 10 }, { x: 24, y: 10 }, { x: 29, y: 10 }, { x: 30, y: 10 }],
      },
      {
        key: 'near_thom',
        label: '📍 Ngay sát Xe Chị Thơm (2 bước)',
        tiles: [{ x: 25, y: 10 }, { x: 24, y: 10 }, { x: 23, y: 10 }],
      },
      {
        key: 'dock_base',
        label: '📍 Chân Cầu Tàu lớn',
        tiles: [{ x: 29, y: 10 }, { x: 30, y: 10 }, { x: 33, y: 10 }],
      },
    ],
  },

  // 5. Bờ sông Bến Đông (Vựa Anh Tư & Sạp Chú Đực)
  bank_east: {
    key: 'bank_east',
    kind: 'bank',
    label: '🏪 Bờ sông bến Đông (Vựa Anh Tư & Chú Đực)',
    tiles: [
      { x: 38, y: 10 }, { x: 39, y: 10 }, { x: 40, y: 10 }, { x: 41, y: 10 },
      { x: 51, y: 11 }, { x: 52, y: 11 }, { x: 53, y: 11 }, { x: 55, y: 11 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến Đông',
        tiles: [{ x: 39, y: 10 }, { x: 40, y: 10 }, { x: 52, y: 11 }, { x: 53, y: 11 }],
      },
      {
        key: 'near_tu',
        label: '📍 Mép sông Vựa Anh Tư (Sát chỗ bán cá)',
        tiles: [{ x: 39, y: 10 }, { x: 40, y: 10 }, { x: 41, y: 10 }, { x: 38, y: 10 }],
      },
      {
        key: 'near_duc',
        label: '📍 Mép sông Sạp Chú Đực (Sát chỗ mua mồi)',
        tiles: [{ x: 52, y: 11 }, { x: 53, y: 11 }, { x: 55, y: 11 }, { x: 51, y: 11 }],
      },
    ],
  },

  // 6. Bờ sông Bến Tây (Mạn Đò ngang & Sới Dế)
  bank_west: {
    key: 'bank_west',
    kind: 'bank',
    label: '🛶 Bờ sông bến Tây (Gần Đò ngang & Sới Dế)',
    tiles: [
      { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 },
      { x: 6, y: 10 }, { x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến Tây',
        tiles: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 7, y: 10 }, { x: 8, y: 10 }],
      },
      {
        key: 'ferry',
        label: '📍 Mép bến đò ngang',
        tiles: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 }, { x: 1, y: 11 }],
      },
      {
        key: 'reed_bank',
        label: '📍 Bãi sậy ven đò',
        tiles: [{ x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 6, y: 10 }],
      },
    ],
  },

  // 7. Hồ nước phía Đông (Ao sen bán nguyệt)
  lake_east: {
    key: 'lake_east',
    kind: 'bank',
    label: '🪷 Hồ nước phía Đông (Ao sen bán nguyệt)',
    tiles: [
      { x: 57, y: 16 }, { x: 58, y: 16 }, { x: 59, y: 16 }, { x: 55, y: 15 },
      { x: 54, y: 16 }, { x: 53, y: 18 }, { x: 53, y: 19 }, { x: 54, y: 20 },
      { x: 57, y: 22 }, { x: 58, y: 23 }, { x: 59, y: 22 }, { x: 56, y: 22 },
      { x: 61, y: 17 }, { x: 63, y: 19 }, { x: 63, y: 20 }, { x: 62, y: 21 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Quanh bờ ao sen (Rung lắc tự nhiên)',
        tiles: [{ x: 58, y: 16 }, { x: 53, y: 19 }, { x: 58, y: 23 }, { x: 63, y: 19 }],
      },
      {
        key: 'lake_north',
        label: '📍 Bờ Bắc ao sen (Lối đi Sạp Chú Đực)',
        tiles: [{ x: 57, y: 16 }, { x: 58, y: 16 }, { x: 59, y: 16 }, { x: 55, y: 15 }],
      },
      {
        key: 'lake_west',
        label: '📍 Bờ Tây ao sen (Lối đi chợ)',
        tiles: [{ x: 54, y: 16 }, { x: 53, y: 18 }, { x: 53, y: 19 }, { x: 54, y: 20 }],
      },
      {
        key: 'lake_south',
        label: '📍 Bờ Nam ao sen (Gần đồng lúa)',
        tiles: [{ x: 57, y: 22 }, { x: 58, y: 23 }, { x: 59, y: 22 }, { x: 56, y: 22 }],
      },
      {
        key: 'lake_east',
        label: '📍 Bờ Đông ao sen (Bãi cỏ vắng)',
        tiles: [{ x: 61, y: 17 }, { x: 63, y: 19 }, { x: 63, y: 20 }, { x: 62, y: 21 }],
      },
    ],
  },

  // 8. Kênh lạch phía Đông (Ven ruộng lúa bãi bồi)
  creek_east: {
    key: 'creek_east',
    kind: 'bank',
    label: '🏞️ Kênh lạch phía Đông (Ven ruộng lúa)',
    tiles: [
      { x: 45, y: 12 }, { x: 48, y: 12 }, { x: 45, y: 13 }, { x: 49, y: 13 },
      { x: 48, y: 19 }, { x: 49, y: 20 }, { x: 50, y: 21 }, { x: 50, y: 22 },
      { x: 54, y: 26 }, { x: 55, y: 27 }, { x: 56, y: 28 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Dọc bờ kênh lạch',
        tiles: [{ x: 45, y: 13 }, { x: 49, y: 20 }, { x: 55, y: 27 }],
      },
      {
        key: 'creek_north',
        label: '📍 Thượng nguồn lạch (Cạnh cầu ván)',
        tiles: [{ x: 45, y: 12 }, { x: 48, y: 12 }, { x: 45, y: 13 }, { x: 49, y: 13 }],
      },
      {
        key: 'creek_mid',
        label: '📍 Uốn lượn ven ruộng lúa',
        tiles: [{ x: 48, y: 19 }, { x: 49, y: 20 }, { x: 50, y: 21 }, { x: 50, y: 22 }],
      },
      {
        key: 'creek_south',
        label: '📍 Cửa lạch phía Nam',
        tiles: [{ x: 54, y: 26 }, { x: 55, y: 27 }, { x: 56, y: 28 }],
      },
    ],
  },

  // 9. Đầm nước phía Nam (Bãi lau sậy ven sông)
  south_swamp: {
    key: 'south_swamp',
    kind: 'bank',
    label: '🌾 Đầm nước phía Nam (Bãi lau sậy)',
    tiles: [
      { x: 2, y: 32 }, { x: 3, y: 32 }, { x: 4, y: 32 }, { x: 5, y: 32 },
      { x: 7, y: 33 }, { x: 8, y: 33 }, { x: 9, y: 34 }, { x: 10, y: 34 },
      { x: 13, y: 36 }, { x: 14, y: 37 }, { x: 15, y: 38 }, { x: 16, y: 39 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Khắp bờ đầm phía Nam',
        tiles: [{ x: 3, y: 32 }, { x: 8, y: 33 }, { x: 14, y: 37 }],
      },
      {
        key: 'swamp_west',
        label: '📍 Mép Tây đầm sậy',
        tiles: [{ x: 2, y: 32 }, { x: 3, y: 32 }, { x: 4, y: 32 }, { x: 5, y: 32 }],
      },
      {
        key: 'swamp_mid',
        label: '📍 Bãi sậy giữa đầm',
        tiles: [{ x: 7, y: 33 }, { x: 8, y: 33 }, { x: 9, y: 34 }, { x: 10, y: 34 }],
      },
      {
        key: 'swamp_east',
        label: '📍 Chân đầm phía Nam',
        tiles: [{ x: 13, y: 36 }, { x: 14, y: 37 }, { x: 15, y: 38 }, { x: 16, y: 39 }],
      },
    ],
  },
};

// Aliases for backwards compatibility
FISHING_SPOTS.bank = FISHING_SPOTS.bank_center;

export const SPOT_KEYS = [
  'dock',
  'bamboo',
  'bridge',
  'bank_center',
  'bank_east',
  'bank_west',
  'lake_east',
  'creek_east',
  'south_swamp',
];

export const SPOT_AREA_OPTIONS = [
  { value: 'dock', label: '🌉 Cầu tàu lớn (Có cá Thần thoại 5000🐚)' },
  { value: 'bamboo', label: '🎋 Cầu tre lắt lẻo (Mạn Tây - 2000🐚)' },
  { value: 'bridge', label: '🪵 Cầu ván qua lạch (Mạn Đông - 2000🐚)' },
  { value: 'bank_center', label: '🌾 Bờ sông bến giữa (Sát Xe Chị Thơm)' },
  { value: 'bank_east', label: '🏪 Bờ sông bến Đông (Gần Vựa cá & Chú Đực)' },
  { value: 'bank_west', label: '🛶 Bờ sông bến Tây (Gần Bến đò ngang)' },
  { value: 'lake_east', label: '🪷 Hồ nước phía Đông (Ao sen bán nguyệt)' },
  { value: 'creek_east', label: '🏞️ Kênh lạch phía Đông (Ven ruộng lúa)' },
  { value: 'south_swamp', label: '🌾 Đầm nước phía Nam (Bãi lau sậy)' },
  { value: 'rotate', label: '🔄 Tự luân phiên các vùng câu' },
  { value: 'random', label: '🎲 Đổi ngẫu nhiên các vùng câu' },
];

export const PACK_FOOD_SELECT_OPTIONS = [
  { value: 'banhTet', label: '🫔 Bánh tét lá cẩm (+50⚡ · 30🐚)' },
  { value: 'comNam', label: '🍙 Cơm nắm muối mè (+30⚡ · 17🐚)' },
  { value: 'banhBao', label: '🥟 Bánh bao nhân thịt (+22⚡ · 13🐚)' },
  { value: 'banhMiGoi', label: '🥖 Bánh mì gói giấy (+20⚡ · 12🐚)' },
  { value: 'xoiBap', label: '🍙 Xôi bắp lá chuối (+15⚡ · 9🐚)' },
];

export const DI_TAM_FOOD_SELECT_OPTIONS = [
  { value: 'lauMam', label: '🍲 Lẩu cá linh (+100 Sức · 45 vỏ sò)' },
  { value: 'comTam', label: '🍛 Cơm tấm sườn bì (+60 Sức · 28 vỏ sò)' },
  { value: 'huTieu', label: '🍜 Hủ tiếu nam vang (+40 Sức · 20 vỏ sò)' },
  { value: 'chaoCa', label: '🥣 Cháo cá lóc (+28 Sức · 14 vỏ sò)' },
  { value: 'banhMi', label: '🥖 Bánh mì thịt (+20 Sức · 10 vỏ sò)' },
];

