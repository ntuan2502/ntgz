import {
  AppConfig,
  AreaId,
  AreaMeta,
  FarmSubAreaId,
  SubAreaMeta,
  WharfSubAreaId,
  WharfSubAreaMeta,
} from '../types/config';

export const AREA_META: Record<AreaId, AreaMeta> = {
  farm: { id: 'farm', icon: '🌾', name: 'Nông Trại' },
  benDo: { id: 'benDo', icon: '🛶', name: 'Bến Đò' },
  sea: { id: 'sea', icon: '🏖️', name: 'Biển' },
  city: { id: 'city', icon: '🏙️', name: 'Thành Phố' },
};

export const SUBAREA_META: Record<FarmSubAreaId, SubAreaMeta> = {
  house: { id: 'house', icon: '🏠', name: 'Nhà & Bếp (Nấu nướng, Đói/Khát)' },
  crops: { id: 'crops', icon: '🌱', name: 'Ruộng Đồng (Trồng trọt · Tèo)' },
  pet: { id: 'pet', icon: '🐕', name: 'Thú Cưng (Chăm sóc & Cho ăn)' },
  barn: { id: 'barn', icon: '🐃', name: 'Chuồng Trâu (Anh Tám)' },
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
  areaOrder: ['farm', 'benDo', 'sea'],
  areaEnabled: {
    farm: true,
    benDo: false,
    sea: true,
    city: false,
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
  hungerThreshold: 45,
  foodSource: 'kitchen_first',
  preferFoodKitchen: 'auto',
  preferFoodShop: 'banhMiThit',
  autoRecoverThirst: true,
  thirstThreshold: 45,
  drinkSource: 'kitchen_first',
  preferDrinkKitchen: 'auto',
  preferDrinkShop: 'nuocMia',
  needThreshold: 45,
  autoMorningCoffee: true,
  autoChargeVehicle: true,
  batteryThreshold: 35,
  autoSalonShampoo: true,
  autoSalonWhiten: false,
  autoSleep: true,
  sleepHour: 21,
  sleepOnFishingLimit: true,

  // 2. Crops (Tèo)
  autoHarvest: true,
  autoPesticide: true,
  autoPlant: true,
  preferSeed: 'auto',
  autoWater: true,
  autoFertilize: true,
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

  // 4. Barn (Trâu - Anh Tám)
  barnAutoFeedBuffalo: true,
  barnAutoBathBuffalo: true,
  barnAutoLendBuffalo: true,
  barnLendMoodMin: 50,
  barnAutoPayHelper: true,

  // 5. Dairy (Bò Sữa - Chị Mận)
  dairyAutoFeedCows: true,
  dairyAutoCureCows: true,
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
  pondAutoPayHelper: true,

  // 8. Salon (Chị Linh Tây) - autoSalonShampoo & autoSalonWhiten in Section 1

  // 9. Market (Tạp Hóa Chị Na & Bảng Tin Làng)
  autoDeliverOrder: true,
  autoVillageBoard: true,
  autoSellTrend: true,
  autoSellDailyTask: true,
  autoSellProduce: false,
  autoSellSmart: true,
  sellStrategy: 'smart_all',
  sellReserveForOrders: true,
  sellReserveForVillage: true,
  sellReserveForKitchen: true,
  surplusKeepQty: 10,

  // 10. Di Bay & Quests (Dì Bảy & Sổ Tay)
  autoClaimQuests: true,
  autoFirstDayTasks: true,
  autoNotebookPages: true,
  autoFeedPiggy: true,
  autoBreakPiggy: true,
  autoNewPiggy: true,
  autoSavings: false,
  savingsKeepGold: 200000,

  // 11. Gold Shop (Tiệm Vàng Cô Kim)
  goldAutoBuy: false,
  goldPreferType: 'mieng',
  goldKeepCash: 500000,
  goldAutoSell: true,
  goldProfitPercent: 10,

  // 12. Night Market (Chợ Đêm 18h00 - 23h30)
  autoSellNightMarket: true,
  nightMarketMinKeep: 3,
  nightMarketSellEggs: true,
  nightMarketReserveOrders: true,
  nightMarketStrategy: 'max_stock',

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
};
