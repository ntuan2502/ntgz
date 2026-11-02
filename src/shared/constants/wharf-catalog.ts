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
 * Bản đồ tra cứu tên tiếng Việt của toàn bộ cá và rác trong Bến Đò.
 */
export const FISH_NAME_MAP: Map<string, string> = new Map(
  ALL_FISH_CATALOG.map((f) => [f.id, f.name])
);

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
