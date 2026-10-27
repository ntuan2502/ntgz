export type AreaId = 'farm' | 'benDo' | 'sea' | 'farmstay';

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
  | 'nightMarket'
  | 'dibay'
  | 'goldShop';

export type WharfSubAreaId = 'fishing' | 'cricketBoss' | 'cricketHunt' | 'entertainment';
/** Cricket hunting zones on the wharf map (matches the game's fg() zone ids) + rotate-all */
export type BenHuntZone = 'field' | 'reeds' | 'rice' | 'grass' | 'garden';
export type BenHuntZoneChoice = BenHuntZone | 'rotate';

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

export interface WharfSubAreaMeta {
  id: WharfSubAreaId;
  icon: string;
  name: string;
}

export type FarmstaySubAreaId = 'operation' | 'repairs' | 'garden' | 'staff' | 'orders';

export interface FarmstaySubAreaMeta {
  id: FarmstaySubAreaId;
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
  actionRepeatDelayMs?: number;
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
  eatUntilFull?: boolean;
  foodSource: 'kitchen_first' | 'kitchen_only' | 'shop_only';
  preferFoodKitchen: string;
  preferFoodShop: string;
  autoRecoverThirst: boolean;
  thirstThreshold: number;
  drinkUntilFull?: boolean;
  drinkSource: 'kitchen_first' | 'kitchen_only' | 'shop_only';
  preferDrinkKitchen: string;
  preferDrinkShop: string;
  needThreshold: number;
  autoChargeVehicle: boolean;
  batteryThreshold: number;
  autoSalonShampoo: boolean;
  autoSalonWhiten: boolean;
  autoSleep: boolean;
  sleepOnFishingLimit: boolean;

  // 2. Crops (Tèo)
  autoHarvest: boolean;
  autoPesticide: boolean;
  autoBuyPesticide?: boolean;
  autoPlant: boolean;
  autoBuySeeds?: boolean;
  preferSeed: string;
  autoWater: boolean;
  autoFertilize: boolean;
  autoBuyFertilizer?: boolean;
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
  petAutoWalk: boolean;

  // 4. Barn (Trâu - Anh Tâm)
  barnAutoFeedBuffalo: boolean;
  barnAutoBathBuffalo: boolean;
  barnAutoLendBuffalo: boolean;
  barnLendMoodMin: number;
  barnAutoPayHelper: boolean;

  // 5. Dairy (Bò Sữa - Chị Mận)
  dairyAutoFeedCows: boolean;
  dairyAutoCureCows: boolean;
  dairyAutoBuyMedicine?: boolean;
  dairyAutoBuyCow?: boolean;
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

  // 8. Salon (Chị Linh Tây) - already covered in section 1 fields autoSalonShampoo, autoSalonWhiten

  // 9. Market (Tạp Hóa Chị Na & Bảng Tin Làng)
  autoDeliverOrder: boolean;
  autoVillageBoard: boolean;
  autoSellTrend: boolean;

  // 10. Di Bay & Quests (Dì Bảy & Sổ Tay)
  autoClaimQuests: boolean;
  autoFeedPiggy: boolean;
  autoBreakPiggy: boolean;
  autoNewPiggy: boolean;
  autoSavings: boolean;
  savingsDepositAmount?: number;
  savingsDepositMax?: boolean;
  savingsTerm?: 3 | 7 | 14;
  savingsMinKeepMillion?: number;
  savingsKeepGold?: number;

  // 11. Gold Shop (Tiệm Vàng Cô Kim)
  goldAutoBuy: boolean;
  goldPreferType: string;
  goldKeepCash: number;
  goldAutoSell: boolean;
  goldProfitPercent: number;

  // 12. Night Market (Chợ Đêm 18h00 - 23h30)
  autoSellNightMarket: boolean;
  nightMarketMinStock: number;
  nightMarketStrategy: 'highest_price' | 'max_stock' | 'selected_crop';
  nightMarketSelectedCrop: string;

  // Area 2: Ben Do Sub-Area Order & Enable/Disable toggles
  benSubOrder: WharfSubAreaId[];
  benSubEnabled: Record<WharfSubAreaId, boolean>;
  benSubCollapsed: Record<WharfSubAreaId, boolean>;

  // Ben Do Fishing Settings
  benAutoSpot: boolean;
  benSpot: 'dock' | 'bamboo' | 'bank' | 'bridge';
  benAutoBuyBait: boolean;
  benPreferBait: 'moi20' | 'moi60' | 'moi150' | 'xinMoi';
  benBaitMaxCount?: number;
  benBaitMinShells?: number;
  benAutoSell: boolean;
  benSellThreshold: number;
  benAutoKeepRare: boolean;
  benKeepRarities?: string[];
  benAutoSellDuplicateKept?: boolean;
  benAutoGoiDau: boolean;
  benAutoRecoverStamina: boolean;
  benStaminaThreshold: number;
  benPreferFood: string;
  benAutoLuckDrink: boolean;
  benPreferDrink: string;
  benShowFullActions?: boolean;
  benDelayMs?: number;

  // Ben Do Cricket Arena (Sới Dế Ông Sáu & Đặt Cửa)
  benAutoBossBout: boolean;
  benAutoTickle: boolean;
  benAutoBet: boolean;
  benBetAmount: number;

  // Ben Do Cricket Hunt (Bắt Dế Đêm & Ống Tre)
  benAutoCricketHunt: boolean;
  benHuntZone: BenHuntZoneChoice;
  benHuntRareOnly: boolean;
  benAutoReleaseLowCricket: boolean;
  benAutoFeedCricket: boolean;
  benPreferCricketFood: 'balanced' | 'tough' | 'power' | 'nerve';

  // Ben Do Entertainment & Utilities
  benAutoLantern: boolean;
  benLanternSpinMode?: 'x1' | 'x10';
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

  // Area 4: Farmstay Settings
  farmstaySubOrder: FarmstaySubAreaId[];
  farmstaySubEnabled: Record<FarmstaySubAreaId, boolean>;
  farmstaySubCollapsed: Record<FarmstaySubAreaId, boolean>;

  // 1. Operation & Reception
  farmstayAutoOpen: boolean;
  farmstayAutoGuide: boolean;
  farmstayAutoPayStaff: boolean;
  farmstayMinGoldKeep: number;

  // 2. Repairs & Maintenance
  farmstayAutoRepair: boolean;

  // 3. Organic Veg Garden (24 plots)
  farmstayAutoVeg: boolean;
  farmstayVegAutoPlant: boolean;
  farmstayVegPreferSeed: string;
  farmstayVegAutoWater: boolean;
  farmstayVegAutoFeed: boolean;
  farmstayVegAutoHarvest: boolean;
  farmstayVegAutoBuyPlots: boolean;

  // 4. Staff & Bonds
  farmstayAutoChatStaff: boolean;
  farmstayAutoAnswerStory: boolean;

  // 5. Orders & Tour Bookings
  farmstayAutoOrders: boolean;
  farmstayAutoGroupBooking: boolean;
}
