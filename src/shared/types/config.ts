export type AreaId = 'farm' | 'benDo' | 'sea' | 'city';

export type FarmSubAreaId =
  | 'house'
  | 'crops'
  | 'pet'
  | 'barn'
  | 'dairy'
  | 'coop'
  | 'pond'
  | 'salon'
  | 'market'
  | 'dibay'
  | 'goldShop';

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
  hudWidth: number;
  hudHeight: number;
  terminalWidth?: number;
  isTerminalOpen?: boolean;

  // General Delay & Transition settings
  taskDelayMs: number;
  fishingSwitchCount: number;
  showFullActions: boolean;

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
  preferFoodKitchen: string;
  preferFoodShop: string;
  autoRecoverThirst: boolean;
  thirstThreshold: number;
  drinkSource: 'kitchen_first' | 'kitchen_only' | 'shop_only';
  preferDrinkKitchen: string;
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

  // 2. Crops (Bác Tèo)
  autoHarvest: boolean;
  autoPesticide: boolean;
  autoPlant: boolean;
  preferSeed: string;
  autoWater: boolean;
  autoFertilize: boolean;
  autoBuyPlots: boolean;
  autoPayHelperCrops: boolean;

  // 3. Pet (Thú cưng)
  petAutoFeed: boolean;
  petFeedMode: 'smart_diet' | 'inventory_only' | 'fav_only' | 'custom';
  petPreferFood: string;
  petAutoBuyFood: boolean;
  petBuyFoodType: string;
  petAutoCuddle: boolean;
  petAutoBath: boolean;
  petAutoTrick: boolean;

  // 4. Barn (Trâu - Anh Tám)
  barnAutoFeedBuffalo: boolean;
  barnAutoBathBuffalo: boolean;
  barnAutoLendBuffalo: boolean;
  barnLendMoodMin: number;
  barnAutoPayHelper: boolean;

  // 5. Dairy (Bò Sữa - Chị Mận)
  dairyAutoFeedCows: boolean;
  dairyAutoCureCows: boolean;
  dairyAutoSellMilk: boolean;
  dairyAutoPayHelper: boolean;

  // 6. Coop (Chuồng Gà - Chú Ba)
  coopAutoCollectEggs: boolean;
  coopAutoBuyChick: boolean;
  coopAutoPayHelper: boolean;

  // 7. Pond (Ao Cá - Bé Bi)
  pondAutoNet: boolean;
  pondAutoStock: boolean;
  preferPondFish: string;
  pondAutoFeed: boolean;
  pondAutoPayHelper: boolean;

  // 8. Salon (Chị Linh Tây) - already covered in section 1 fields autoSalonShampoo, autoSalonWhiten

  // 9. Market (Tạp Hóa Chị Na & Bảng Tin Làng)
  autoDeliverOrder: boolean;
  autoVillageBoard: boolean;
  autoSellTrend: boolean;
  autoSellDailyTask: boolean;
  autoSellProduce: boolean;
  autoSellSmart: boolean;
  sellStrategy: 'smart_all' | 'produce_only' | 'food_only';
  sellReserveForOrders: boolean;
  sellReserveForVillage: boolean;
  sellReserveForKitchen: boolean;
  surplusKeepQty: number;

  // 10. Di Bay & Quests (Dì Bảy & Sổ Tay)
  autoClaimQuests: boolean;
  autoFirstDayTasks: boolean;
  autoNotebookPages: boolean;
  autoFeedPiggy: boolean;
  autoBreakPiggy: boolean;
  autoNewPiggy: boolean;
  autoSavings: boolean;
  savingsKeepGold: number;

  // 11. Gold Shop (Tiệm Vàng Cô Kim)
  goldAutoBuy: boolean;
  goldPreferType: string;
  goldKeepCash: number;
  goldAutoSell: boolean;
  goldProfitPercent: number;

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
