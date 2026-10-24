export type AreaId = 'farm' | 'benDo' | 'sea' | 'city';

export type FarmSubAreaId =
  | 'house'
  | 'crops'
  | 'pet'
  | 'barn'
  | 'coop'
  | 'pond'
  | 'market'
  | 'dibay';

export interface AreaMeta {
  id: AreaId;
  icon: string;
  name: string;
}

export interface SubAreaMeta {
  id: FarmSubAreaId;
  icon: string;
  name: string;
}

export interface AppConfig {
  running: boolean;
  runMode: 'all' | 'tab';
  activeTab: AreaId;
  panelVisible: boolean;
  panelMinimized: boolean;
  showOrderDrawer: boolean;

  // General Delay & Transition settings
  taskDelayMs: number;
  fishingSwitchCount: number;

  // Main Area Order & Enable/Disable toggles
  areaOrder: AreaId[];
  areaEnabled: Record<AreaId, boolean>;

  // Farm Sub-Area Order & Enable/Disable toggles
  farmSubOrder: FarmSubAreaId[];
  farmSubEnabled: Record<FarmSubAreaId, boolean>;
  farmSubCollapsed: Record<FarmSubAreaId, boolean>;

  // 1. House, Kitchen, Needs & Salon
  autoDismissInterrupts: boolean;
  autoCook: boolean;
  preferDish: string;
  autoRecoverHunger: boolean;
  hungerThreshold: number;
  foodSource: 'kitchen_first' | 'kitchen_only' | 'shop_only';
  preferFoodShop: string;
  autoRecoverThirst: boolean;
  thirstThreshold: number;
  drinkSource: 'kitchen_first' | 'shop_only' | 'both';
  preferDrinkShop: string;
  needThreshold: number;
  autoMorningCoffee: boolean;
  autoChargeVehicle: boolean;
  batteryThreshold: number;
  autoSalonShampoo: boolean;
  autoSalonWhiten: boolean;
  autoSleep: boolean;
  sleepHour: number;
  sleepOnFishingLimit: boolean;

  // 2. Crops
  autoHarvest: boolean;
  autoPesticide: boolean;
  autoPlant: boolean;
  preferSeed: string;
  autoWater: boolean;
  autoFertilize: boolean;
  autoBuyPlots: boolean;

  // 3. Pet
  petAutoFeed: boolean;
  petAutoCuddle: boolean;
  petAutoBath: boolean;
  petAutoTrick: boolean;

  // 4. Barn (Buffalo & Cows)
  barnAutoFeedBuffalo: boolean;
  barnAutoBathBuffalo: boolean;
  barnAutoLendBuffalo: boolean;
  barnAutoFeedCows: boolean;
  barnAutoCureCows: boolean;
  barnAutoSellMilk: boolean;
  barnAutoPayHelper: boolean;

  // 5. Coop (Chickens)
  coopAutoCollectEggs: boolean;
  coopAutoBuyChick: boolean;
  coopAutoPayHelper: boolean;

  // 6. Pond (Fish Pond)
  pondAutoNet: boolean;
  pondAutoStock: boolean;
  preferPondFish: string;
  pondAutoFeed: boolean;
  pondAutoPayHelper: boolean;

  // 7. Market & Gold Shop
  autoDeliverOrder: boolean;
  autoVillageBoard: boolean;
  autoSellTrend: boolean;
  autoSellDailyTask: boolean;
  autoSellProduce: boolean;
  surplusKeepQty: number;
  goldAutoBuy: boolean;
  goldPreferType: string;
  goldKeepCash: number;
  goldAutoSell: boolean;
  goldProfitPercent: number;

  // 8. Di Bay & Quests
  autoClaimQuests: boolean;
  autoFirstDayTasks: boolean;
  autoNotebookPages: boolean;
  autoFeedPiggy: boolean;
  autoBreakPiggy: boolean;
  autoNewPiggy: boolean;
  autoSavings: boolean;
  savingsKeepGold: number;

  // Area 2: Ben Do Fishing Settings
  benAutoSpot: boolean;
  benSpot: 'dock' | 'bamboo' | 'bank';
  benAutoBuyBait: boolean;
  benPreferBait: 'moi20' | 'moi60' | 'moi150' | 'xinMoi';
  benAutoSell: boolean;
  benSellThreshold: number;
  benAutoKeepRare: boolean;
  benAutoGoiDau: boolean;
  benAutoRecoverStamina: boolean;
  benStaminaThreshold: number;
  benPreferFood: string;
  benAutoLuckDrink: boolean;
  benPreferDrink: string;
  benAutoLantern: boolean;
  benBuyLanternTicket: boolean;
  benAutoLotto: boolean;
  benAutoBuyLotto: boolean;
  benAutoAtm: boolean;
  benAtmThreshold: number;

  // Area 3: Sea Fishing Settings
  seaAutoSpot: boolean;
  seaSpot: 'pier' | 'rocks' | 'beach';
  seaAutoBuyBait: boolean;
  seaPreferBait: 'worm' | 'shrimp';
  seaBaitPacks: number;
  seaAutoSell: boolean;
  seaSellThreshold: number;
  seaAutoClaimDex: boolean;
  seaAutoEat: boolean;
  seaStaminaThreshold: number;
}
