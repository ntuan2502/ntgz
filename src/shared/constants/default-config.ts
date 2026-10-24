import { AppConfig, AreaId, AreaMeta, FarmSubAreaId, SubAreaMeta } from '../types/config';

export const AREA_META: Record<AreaId, AreaMeta> = {
  farm: { id: 'farm', icon: '🌾', name: 'Nông Trại' },
  benDo: { id: 'benDo', icon: '🛶', name: 'Bến Đò' },
  sea: { id: 'sea', icon: '🏖️', name: 'Biển' },
  city: { id: 'city', icon: '🏙️', name: 'Thành Phố' },
};

export const SUBAREA_META: Record<FarmSubAreaId, SubAreaMeta> = {
  house: { id: 'house', icon: '🏠', name: 'Nhà, Bếp & Nhu Cầu' },
  crops: { id: 'crops', icon: '🌱', name: 'Ruộng Đồng (Trồng Trọt)' },
  pet: { id: 'pet', icon: '🐕', name: 'Thú Cưng (Chó / Mèo)' },
  barn: { id: 'barn', icon: '🐃', name: 'Chuồng Trâu & Bò Sữa' },
  coop: { id: 'coop', icon: '🐔', name: 'Chuồng Gà' },
  pond: { id: 'pond', icon: '🐟', name: 'Ao Cá' },
  market: { id: 'market', icon: '🏪', name: 'Tạp Hóa & Bảng Tin Làng' },
  dibay: { id: 'dibay', icon: '🐷', name: 'Quầy Dì Bảy & Sổ Tay' },
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
  farmSubOrder: ['house', 'crops', 'pet', 'barn', 'coop', 'pond', 'market', 'dibay'],
  farmSubEnabled: {
    house: true,
    crops: true,
    pet: true,
    barn: true,
    coop: true,
    pond: true,
    market: true,
    dibay: true,
  },
  farmSubCollapsed: {
    house: false,
    crops: false,
    pet: false,
    barn: false,
    coop: false,
    pond: false,
    market: false,
    dibay: false,
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

  // 2. Crops
  autoHarvest: true,
  autoPesticide: true,
  autoPlant: true,
  preferSeed: 'auto',
  autoWater: true,
  autoFertilize: true,
  autoBuyPlots: true,

  // 3. Pet
  petAutoFeed: true,
  petAutoCuddle: true,
  petAutoBath: true,
  petAutoTrick: true,

  // 4. Barn (Buffalo & Cows)
  barnAutoFeedBuffalo: true,
  barnAutoBathBuffalo: true,
  barnAutoLendBuffalo: true,
  barnAutoFeedCows: true,
  barnAutoCureCows: true,
  barnAutoSellMilk: true,
  barnAutoPayHelper: true,

  // 5. Coop (Chickens)
  coopAutoCollectEggs: true,
  coopAutoBuyChick: true,
  coopAutoPayHelper: true,

  // 6. Pond (Fish Pond)
  pondAutoNet: true,
  pondAutoStock: true,
  preferPondFish: 'chep',
  pondAutoFeed: true,
  pondAutoPayHelper: true,

  // 7. Market & Gold Shop
  autoDeliverOrder: true,
  autoVillageBoard: true,
  autoSellTrend: true,
  autoSellDailyTask: true,
  autoSellProduce: false,
  surplusKeepQty: 20,
  goldAutoBuy: false,
  goldPreferType: 'mieng',
  goldKeepCash: 500000,
  goldAutoSell: true,
  goldProfitPercent: 10,

  // 8. Di Bay & Quests
  autoClaimQuests: true,
  autoFirstDayTasks: true,
  autoNotebookPages: true,
  autoFeedPiggy: true,
  autoBreakPiggy: true,
  autoNewPiggy: true,
  autoSavings: false,
  savingsKeepGold: 200000,

  // Area 2: Ben Do Fishing Settings
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
