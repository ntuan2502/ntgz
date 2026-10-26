import {
  AppConfig,
  AreaId,
  AreaMeta,
  BenHuntZone,
  BenHuntZoneChoice,
  FarmSubAreaId,
  FarmstaySubAreaId,
  FarmstaySubAreaMeta,
  SubAreaMeta,
  WharfSubAreaId,
  WharfSubAreaMeta,
} from '../types/config';

export const AREA_META: Record<AreaId, AreaMeta> = {
  farm: { id: 'farm', icon: '🌾', name: 'Nông Trại' },
  benDo: { id: 'benDo', icon: '🛶', name: 'Bến Đò' },
  sea: { id: 'sea', icon: '🏖️', name: 'Biển' },
  farmstay: { id: 'farmstay', icon: '🏡', name: 'Farmstay Ông Năm' },
};

export const SUBAREA_META: Record<FarmSubAreaId, SubAreaMeta> = {
  house: { id: 'house', icon: '🏠', name: 'Nhà & Bếp (Nấu nướng, Đói/Khát)' },
  crops: { id: 'crops', icon: '🌱', name: 'Ruộng Đồng (Trồng trọt · Tèo)' },
  pet: { id: 'pet', icon: '🐕', name: 'Thú Cưng (Chăm sóc & Cho ăn)' },
  barn: { id: 'barn', icon: '🐃', name: 'Chuồng Trâu (Anh Tâm)' },
  dairy: { id: 'dairy', icon: '🐄', name: 'Bò Sữa (Chị Mận)' },
  coop: { id: 'coop', icon: '🐔', name: 'Chuồng Gà (Chú Ba)' },
  pond: { id: 'pond', icon: '🐟', name: 'Ao Cá (Bé Bi)' },
  salon: { id: 'salon', icon: '💆', name: 'Salon Chị Linh Tây' },
  market: { id: 'market', icon: '🏪', name: 'Tạp Hóa Chị Na & Bảng Tin' },
  nightMarket: { id: 'nightMarket', icon: '🏮', name: 'Chợ Đêm (18:00 - 23:30)' },
  dibay: { id: 'dibay', icon: '🐷', name: 'Quầy Tiết Kiệm Dì Bảy & Sổ Tay' },
  goldShop: { id: 'goldShop', icon: '🪙', name: 'Tiệm Vàng Cô Kim (Chợ Lớn)' },
};

export const WHARF_SUBAREA_META: Record<WharfSubAreaId, WharfSubAreaMeta> = {
  fishing: { id: 'fishing', icon: '🎣', name: 'Câu Cá & Bán Cá Bến Đò' },
  cricketBoss: { id: 'cricketBoss', icon: '🥊', name: 'Sới Dế & Đấu Boss Ông Sáu' },
  cricketHunt: { id: 'cricketHunt', icon: '🔦', name: 'Bắt Dế Đêm & Ống Tre Nuôi Dế' },
  entertainment: { id: 'entertainment', icon: '🏮', name: 'Tiện Ích & Giải Trí Bến Đò' },
};

export const FARMSTAY_SUBAREA_META: Record<FarmstaySubAreaId, FarmstaySubAreaMeta> = {
  operation: { id: 'operation', icon: '🏢', name: 'Vận Hành & Đón Khách' },
  repairs: { id: 'repairs', icon: '🛠️', name: 'Bảo Trì & Sửa Chữa (Giữ 5 sao)' },
  garden: { id: 'garden', icon: '🥬', name: 'Vườn Rau Hữu Cơ (24 Luống)' },
  staff: { id: 'staff', icon: '🤝', name: 'Nhân Viên & Tăng Thân Thiết' },
  orders: { id: 'orders', icon: '🍽️', name: 'Phục Vụ Khách & Tour Đoàn' },
};

export const FARMSTAY_VEG_SEEDS = [
  { id: 'auto', name: 'Tự động (theo giá trị)', icon: '✨' },
  { id: 'rauMuong', name: 'Rau muống (2h · 5k)', icon: '🥬' },
  { id: 'caChua', name: 'Cà chua (4h · 10k)', icon: '🍅' },
  { id: 'duaLeo', name: 'Dưa leo (4h · 8k)', icon: '🥒' },
  { id: 'ot', name: 'Ớt (5h · 8k)', icon: '🌶️' },
  { id: 'duaHau', name: 'Dưa hấu (8h · 20k)', icon: '🍉' },
];

export interface BenHuntZoneMeta {
  id: BenHuntZone;
  label: string;
  /** Rare species found there (from the game's cricket table) */
  rares: string;
  /** Walkable, non-bank tiles inside the zone, ordered as a short walking loop */
  spots: Array<{ x: number; y: number }>;
}

/**
 * Cricket hunting zones extracted from the wharf map (game fn `fg()`): every tile
 * below is walkable, reachable from the dock and not a fishing bank tile.
 */
export const BEN_HUNT_ZONES: Record<BenHuntZone, BenHuntZoneMeta> = {
  field: {
    id: 'field',
    label: '🌾 Đồng cỏ phía đông',
    rares: 'mọi loài · Dế vương 0h-3h',
    spots: [
      { x: 74, y: 21 }, { x: 73, y: 12 }, { x: 64, y: 11 }, { x: 83, y: 11 },
      { x: 83, y: 20 }, { x: 83, y: 30 }, { x: 73, y: 30 }, { x: 64, y: 28 },
    ],
  },
  reeds: {
    id: 'reeds',
    label: '🎋 Bãi lau sậy',
    rares: 'Dế ngọc · Dế ma 23h-4h',
    spots: [{ x: 50, y: 23 }, { x: 49, y: 21 }, { x: 51, y: 24 }, { x: 49, y: 24 }],
  },
  rice: {
    id: 'rice',
    label: '🌾 Bờ ruộng',
    rares: 'Dế trũi · Dế vàng · Dế sắt',
    spots: [{ x: 44, y: 32 }, { x: 60, y: 36 }, { x: 71, y: 36 }, { x: 82, y: 36 }],
  },
  garden: {
    id: 'garden',
    label: '🥬 Quanh luống rau',
    rares: 'Dế cồ · Dế lửa',
    spots: [{ x: 22, y: 35 }, { x: 26, y: 35 }, { x: 23, y: 39 }, { x: 20, y: 39 }],
  },
  grass: {
    id: 'grass',
    label: '🌱 Bãi cỏ (khắp bến)',
    rares: 'Dế đất · Dế cồ',
    spots: [
      { x: 27, y: 22 }, { x: 14, y: 15 }, { x: 0, y: 12 }, { x: 8, y: 32 },
      { x: 33, y: 39 }, { x: 50, y: 31 }, { x: 43, y: 10 }, { x: 63, y: 11 },
    ],
  },
};

/** Spot loop for a zone choice; 'rotate' interleaves all zones */
export function getBenHuntSpots(choice: BenHuntZoneChoice): Array<{ x: number; y: number; zone: BenHuntZone }> {
  if (choice !== 'rotate') {
    const zone = BEN_HUNT_ZONES[choice] ?? BEN_HUNT_ZONES.field;
    return zone.spots.map((s) => ({ ...s, zone: zone.id }));
  }
  const order: BenHuntZone[] = ['field', 'reeds', 'rice', 'garden', 'grass'];
  const out: Array<{ x: number; y: number; zone: BenHuntZone }> = [];
  for (let i = 0; i < 2; i++) {
    for (const z of order) {
      const s = BEN_HUNT_ZONES[z].spots[i];
      if (s) out.push({ ...s, zone: z });
    }
  }
  return out;
}

export const DEFAULT_CONFIG: AppConfig = {
  running: false,
  runMode: 'all',
  activeTab: 'farm',
  panelVisible: true,
  panelMinimized: false,
  showOrderDrawer: true,
  hudWidth: 400,
  hudHeight: 800,
  terminalWidth: 380,
  isTerminalOpen: false,

  // General Delay & Transition settings
  taskDelayMs: 500,
  fishingSwitchCount: 15,
  showFullActions: false,

  // Main Area Order & Enable/Disable toggles
  areaOrder: ['farm', 'benDo', 'sea', 'farmstay'],
  areaEnabled: {
    farm: true,
    benDo: false,
    sea: true,
    farmstay: true,
  },

  // Farm Sub-Area Order & Enable/Disable toggles
  farmSubOrder: [
    'house',
    'crops',
    'pet',
    'barn',
    'dairy',
    'coop',
    'pond',
    'salon',
    'market',
    'nightMarket',
    'dibay',
    'goldShop',
  ],
  farmSubEnabled: {
    house: true,
    crops: true,
    pet: true,
    barn: true,
    dairy: true,
    coop: true,
    pond: true,
    salon: true,
    market: true,
    nightMarket: true,
    dibay: true,
    goldShop: true,
  },
  farmSubCollapsed: {
    house: false,
    crops: false,
    pet: false,
    barn: false,
    dairy: false,
    coop: false,
    pond: false,
    salon: false,
    market: false,
    nightMarket: false,
    dibay: false,
    goldShop: false,
  },

  // 1. House, Kitchen, Needs & Salon
  autoDismissInterrupts: true,
  autoCook: true,
  preferDish: 'auto',
  autoRecoverHunger: true,
  hungerThreshold: 10,
  eatUntilFull: false,
  foodSource: 'kitchen_first',
  preferFoodKitchen: 'auto',
  preferFoodShop: 'banhMiThit',
  autoRecoverThirst: true,
  thirstThreshold: 10,
  drinkUntilFull: false,
  drinkSource: 'kitchen_first',
  preferDrinkKitchen: 'auto',
  preferDrinkShop: 'nuocMia',
  needThreshold: 45,
  autoChargeVehicle: true,
  batteryThreshold: 10,
  autoSalonShampoo: true,
  autoSalonWhiten: false,
  autoSleep: true,
  sleepOnFishingLimit: true,

  // 2. Crops (Tèo)
  autoHarvest: true,
  autoPesticide: true,
  autoBuyPesticide: false,
  autoPlant: true,
  autoBuySeeds: false,
  preferSeed: 'auto',
  autoWater: true,
  autoFertilize: true,
  autoBuyFertilizer: false,
  autoBuyPlots: true,
  autoPayHelperCrops: true,

  // 3. Pet (Thú cưng)
  petAutoFeed: true,
  petFeedMode: 'smart_diet',
  petPreferFood: 'auto',
  petAutoBuyFood: true,
  petBuyFoodType: 'auto_fav',
  petAutoCuddle: true,
  petAutoBath: true,
  petAutoTrick: true,
  petAutoWalk: true,

  // 4. Barn (Trâu - Anh Tâm)
  barnAutoFeedBuffalo: true,
  barnAutoBathBuffalo: true,
  barnAutoLendBuffalo: true,
  barnLendMoodMin: 50,
  barnAutoPayHelper: true,

  // 5. Dairy (Bò Sữa - Chị Mận)
  dairyAutoFeedCows: true,
  dairyAutoCureCows: true,
  dairyAutoBuyMedicine: false,
  dairyAutoSellMilk: true,
  dairyAutoPayHelper: true,

  // 6. Coop (Chuồng Gà - Chú Ba)
  coopAutoCollectEggs: true,
  coopAutoBuyChick: true,
  coopAutoPayHelper: true,

  // 7. Pond (Ao Cá - Bé Bi)
  pondAutoNet: true,
  pondAutoStock: true,
  preferPondFish: 'chep',
  pondAutoFeed: true,

  // 8. Salon (Chị Linh Tây) - autoSalonShampoo & autoSalonWhiten in Section 1

  // 9. Market (Tạp Hóa Chị Na & Bảng Tin Làng)
  autoDeliverOrder: true,
  autoVillageBoard: true,
  autoSellTrend: true,

  // 10. Di Bay & Quests (Dì Bảy & Sổ Tay)
  autoClaimQuests: true,
  autoFeedPiggy: true,
  autoBreakPiggy: true,
  autoNewPiggy: true,
  autoSavings: false,
  savingsDepositAmount: 5000000,
  savingsDepositMax: true,
  savingsTerm: 7,
  savingsMinKeepMillion: 10,
  savingsKeepGold: 200000,

  // 11. Gold Shop (Tiệm Vàng Cô Kim)
  goldAutoBuy: false,
  goldPreferType: 'mieng',
  goldKeepCash: 500000,
  goldAutoSell: true,
  goldProfitPercent: 10,

  // 12. Night Market (Chợ Đêm 18h00 - 23h30)
  autoSellNightMarket: true,
  nightMarketMinStock: 50,
  nightMarketStrategy: 'highest_price',
  nightMarketSelectedCrop: 'radish',

  // Area 2: Ben Do Settings & Sub-Area Priorities
  benSubOrder: ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'],
  benSubEnabled: {
    fishing: true,
    cricketBoss: true,
    cricketHunt: true,
    entertainment: true,
  },
  benSubCollapsed: {
    fishing: false,
    cricketBoss: false,
    cricketHunt: false,
    entertainment: false,
  },

  // Ben Do Fishing Settings
  benAutoSpot: true,
  benSpot: 'bank',
  benAutoBuyBait: true,
  benPreferBait: 'moi150',
  benAutoSell: true,
  benSellThreshold: 60,
  benAutoKeepRare: true,
  benAutoGoiDau: false,
  benAutoRecoverStamina: true,
  benStaminaThreshold: 4,
  benPreferFood: 'lauMam',
  benAutoLuckDrink: true,
  benPreferDrink: 'duaTuoi',

  // Ben Do Cricket Arena (Sới Dế Ông Sáu & Đặt Cửa)
  benAutoBossBout: true,
  benAutoTickle: true,
  benAutoBet: false,
  benBetAmount: 50,

  // Ben Do Cricket Hunt (Bắt Dế Đêm & Ống Tre)
  benAutoCricketHunt: true,
  benHuntZone: 'field',
  benHuntRareOnly: false,
  benAutoReleaseLowCricket: true,
  benAutoFeedCricket: false,
  benPreferCricketFood: 'balanced',

  // Ben Do Entertainment & Utilities
  benAutoLantern: false,
  benBuyLanternTicket: false,
  benAutoLotto: false,
  benAutoBuyLotto: false,
  benAutoAtm: false,
  benAtmThreshold: 500,

  // Area 3: Sea Fishing Settings
  seaAutoSpot: true,
  seaSpot: 'beach',
  seaAutoBuyBait: true,
  seaPreferBait: 'worm',
  seaBaitPacks: 50,
  seaAutoSell: true,
  seaSellThreshold: 100,
  seaAutoClaimDex: true,
  seaAutoEat: false,
  seaStaminaThreshold: 20,

  // Area 4: Farmstay Settings
  farmstaySubOrder: ['operation', 'repairs', 'garden', 'staff', 'orders'],
  farmstaySubEnabled: {
    operation: true,
    repairs: true,
    garden: true,
    staff: true,
    orders: true,
  },
  farmstaySubCollapsed: {
    operation: false,
    repairs: false,
    garden: false,
    staff: false,
    orders: false,
  },

  // 1. Operation & Reception
  farmstayAutoOpen: true,
  farmstayAutoGuide: true,
  farmstayAutoPayStaff: true,
  farmstayMinGoldKeep: 10000,

  // 2. Repairs
  farmstayAutoRepair: true,

  // 3. Organic Veg Garden (24 plots)
  farmstayAutoVeg: true,
  farmstayVegAutoPlant: true,
  farmstayVegPreferSeed: 'auto',
  farmstayVegAutoWater: true,
  farmstayVegAutoFeed: true,
  farmstayVegAutoHarvest: true,
  farmstayVegAutoBuyPlots: false,

  // 4. Staff & Bonds
  farmstayAutoChatStaff: true,
  farmstayAutoAnswerStory: true,

  // 5. Orders & Tour Bookings
  farmstayAutoOrders: true,
  farmstayAutoGroupBooking: true,
};
