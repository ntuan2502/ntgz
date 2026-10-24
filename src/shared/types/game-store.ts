/**
 * Strong typing for in-game Zustand stores (Main, Sea, BenUI, BenNet)
 */

export interface PlotCrop {
  id: string;
  stage?: number;
  watered?: boolean;
  fertilized?: boolean;
  pest?: boolean;
  mature?: boolean;
  [key: string]: unknown;
}

export interface PlotData {
  crop?: PlotCrop | null;
  watered?: boolean;
  fertilized?: boolean;
  pest?: boolean;
  unlocked?: boolean;
  [key: string]: unknown;
}

export interface KitchenBuff {
  kind: string;
  day?: number;
  [key: string]: unknown;
}

export interface KitchenState {
  known?: string[];
  stock?: Record<string, number>;
  buffs?: KitchenBuff[];
  [key: string]: unknown;
}

export interface PetData {
  away?: boolean;
  kind?: string;
  name?: string;
  fedDay?: number;
  cuddleDay?: number;
  cuddles?: number;
  bathedDay?: number;
  trickDay?: number;
  [key: string]: unknown;
}

export interface DairyCow {
  id: string | number;
  name?: string;
  fedDay?: number;
  sickDay?: number;
  [key: string]: unknown;
}

export interface DailyTask {
  id?: string | number;
  claimed?: boolean;
  kind?: string;
  base?: number;
  need?: number;
  [key: string]: unknown;
}

export interface VillageRequest {
  id: string | number;
  fulfilled?: boolean;
  crop?: string;
  item?: string;
  qty?: number;
  reward?: number;
  [key: string]: unknown;
}

export interface MainGameStoreState {
  screen?: string;
  day?: number;
  minutes?: number;
  gold?: number;
  fullness?: number;
  hydration?: number;
  battery?: number;
  indoors?: boolean;
  onFoot?: boolean;
  sleeping?: boolean;
  panel?: string | null;
  shop?: unknown;
  vendor?: unknown;
  phone?: unknown;
  announcement?: unknown;
  tip?: unknown;
  call?: {
    stage?: string;
    from?: string;
    topic?: string;
    [key: string]: unknown;
  } | null;
  plots?: Record<string, PlotData>;
  seeds?: Record<string, number>;
  items?: Record<string, number>;
  produce?: Record<string, number>;
  prices?: Record<string, number>;
  eggs?: number;
  nestEggs?: number;
  hens?: unknown[];
  coopLevel?: number;
  flu?: boolean;
  henNews?: unknown;
  missedOrder?: unknown;
  kitchen?: KitchenState;
  pets?: {
    pet?: PetData;
    news?: unknown;
    [key: string]: unknown;
  };
  pond?: {
    ready?: boolean;
    news?: unknown;
    noteRead?: boolean;
    fedDay?: number;
    fish?: Array<{ id?: string; days?: number; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  buffalo?: {
    home?: boolean;
    news?: unknown;
    fedDay?: number;
    mudDay?: number;
    lentDay?: number;
    mood?: number;
    [key: string]: unknown;
  };
  dairy?: {
    news?: unknown;
    cows?: DairyCow[];
    medicine?: number;
    milk?: number;
    [key: string]: unknown;
  };
  helpers?: {
    buffalo?: { hired?: boolean; unpaid?: number };
    dairy?: { hired?: boolean; unpaid?: number };
    poultry?: { hired?: boolean; unpaid?: number };
    pond?: { hired?: boolean; unpaid?: number };
    [key: string]: unknown;
  };
  order?: {
    crop: string;
    qty: number;
    reward?: number;
    [key: string]: unknown;
  };
  village?: {
    newsDay?: number;
    met?: boolean;
    requests?: VillageRequest[];
    [key: string]: unknown;
  };
  savings?: {
    newsDay?: number;
    pig?: { amount?: number; streak?: number; broken?: boolean; fedDay?: number };
    balance?: number;
    term?: string;
    [key: string]: unknown;
  };
  daily?: {
    tasks?: DailyTask[];
    [key: string]: unknown;
  };
  goalIndex?: number;
  firstDay?: {
    incense?: boolean;
    sprout?: boolean;
    sproutHarvested?: boolean;
    cleared?: number[];
    [key: string]: unknown;
  };
  notebook?: {
    found?: boolean;
    read?: boolean;
    pages?: Array<{ id: string; found?: boolean; [key: string]: unknown }>;
    soakDone?: boolean;
    soakEnd?: number;
    seedReady?: boolean;
    seedClaimed?: boolean;
    [key: string]: unknown;
  };
  fishing?: {
    rod?: number;
    seaOpen?: boolean;
    bait?: {
      worm?: number;
      shrimp?: number;
      [key: string]: number | undefined;
    };
    basket?: unknown[];
    [key: string]: unknown;
  };
  unlockedZones?: string[];
  salonOpen?: boolean;
  trendLog?: {
    soldDay?: number;
    sold?: number;
    [key: string]: unknown;
  };
  stats?: {
    earned?: number;
    [key: string]: unknown;
  };
  player?: {
    outfit?: {
      tan?: number;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  vehicle?: {
    battery?: number;
    [key: string]: unknown;
  } | boolean | null;
  ledger?: Array<{ kind?: string; label?: string; [key: string]: unknown }>;
  goldStock?: Record<string, number>;
  goldAvgCost?: Record<string, number>;
  plotOffer?: unknown;
  zoneOffer?: unknown;

  // Actions
  showWorldMap?: () => void;
  enterFarm?: () => void;
  leaveHouse?: () => void;
  enterHouse?: () => void;
  openSea?: () => void;
  goToSea?: () => string;
  sellBasket?: () => number;
  goToSleep?: () => void;
  sleepThrough?: () => void;
  nextMorning?: () => void;
  stopSleeping?: () => void;
  setActiveTool?: (tool: string) => void;
  applyTool?: (plot: string, tool: string) => unknown;
  previewTool?: (plot: string, tool: string) => boolean;
  buyPlot?: () => string;
  buySeed?: (seed: string, count: number) => string;
  feedPet?: (food: string) => string;
  cuddlePet?: () => string;
  bathPet?: () => string;
  trickPet?: () => string;
  buyPetFood?: (food: string, count: number) => string;
  pickUpPet?: () => void;
  feedBuffalo?: (grass: string) => string;
  bathBuffalo?: () => string;
  lendBuffalo?: () => string;
  feedCows?: () => string;
  cureCow?: (cowId: string | number) => string;
  sellMilk?: () => { liters: number; total: number };
  buyMedicine?: () => void;
  collectEggs?: () => number;
  buyChick?: () => string;
  payHelper?: (type: string) => boolean;
  netFish?: () => { n: number; total: number };
  feedPond?: () => string;
  stockPond?: (fish: string) => string;
  buyFry?: (fish: string) => string;
  readPondNote?: () => void;
  deliverOrder?: () => boolean;
  meetKhang?: () => void;
  deliverVillageRequest?: (reqId: string | number) => boolean;
  sellProduce?: (crop: string, qty: number) => boolean;
  sellEgg?: (qty: number) => boolean;
  buyGold?: (type: string) => boolean;
  sellGold?: (type: string, qty: number) => boolean;
  claimDailyTask?: (taskId: string | number) => boolean;
  claimNotebookPage?: (pageId: string) => boolean;
  readNotebook?: () => void;
  startSoak?: () => string;
  claimSoakSeed?: () => string;
  lightIncense?: () => string;
  plantSprouts?: () => string;
  harvestSprouts?: () => boolean;
  clearDebris?: (index: number) => boolean;
  feedPiggy?: () => string;
  breakPiggy?: () => boolean;
  buyPiggy?: () => boolean;
  depositSavings?: (amt: number) => boolean;
  buyFood?: (food: string) => string;
  cook?: (recipe: string) => string;
  eat?: (food: string) => string;
  drink?: (drink: string) => string;
  learnRecipe?: (recipe: string) => string;
  chargeVehicle?: () => string;
  shampoo?: () => string;
  whiten?: () => string;
  buyRod?: () => boolean;
  buyBait?: (bait: string, packs: number) => boolean;
  claimDexReward?: () => boolean;
  closePhone?: () => void;
  answerAnnouncement?: (ans: boolean) => void;
  answerTip?: (ans: boolean) => void;
  acceptCall?: () => void;
  hangUpGrandma?: (msg: string) => void;
  endCall?: (msg: string) => void;
  answerSau?: (ans: boolean) => void;
  finishChapterOne?: () => void;
  finishChapter?: () => void;
  setPanel?: (panel: string | null) => void;
  ackPondNews?: () => void;
  ackBuffaloNews?: () => void;
  ackDairyNews?: () => void;
  ackHenNews?: () => void;
  ackPetNews?: () => void;
  ackMissedOrder?: () => void;
  [key: string]: unknown;
}

export interface SeaStoreState {
  spot?: string;
  walking?: boolean;
  phase?: string;
  panel?: string | null;
  bite?: boolean;
  setSpot?: (spot: string) => void;
  setPanel?: (panel: string | null) => void;
  castRod?: () => boolean;
  strikeRod?: () => boolean;
  [key: string]: unknown;
}

export interface BenUIStoreState {
  spot?: string;
  walking?: boolean;
  panel?: string | null;
  inSeat?: boolean;
  setSpot?: (spot: string) => void;
  setPanel?: (panel: string | null) => void;
  [key: string]: unknown;
}

export interface BenNetWallet {
  shells?: number;
  bait?: number;
  stamina?: number;
  staminaNext?: number;
  at?: number;
  liveStamina?: number;
  luckCasts?: number;
  tickets?: number;
  [key: string]: unknown;
}

export interface BenNetState {
  status?: string;
  fishing?: string;
  wallet?: BenNetWallet | null;
  basket?: Array<{ id?: string; kept?: boolean; [key: string]: unknown }>;
  pack?: Record<string, number>;
  fight?: {
    run?: {
      dir?: 'left' | 'right';
      n?: number | string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  wheel?: {
    bought?: number;
    [key: string]: unknown;
  };
  lotto?: {
    wins?: unknown[];
    pending?: number;
    selling?: number;
    mine?: Array<{ day?: number; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  notice?: {
    error?: string;
    [key: string]: unknown;
  };
  landed?: unknown;
  [key: string]: unknown;
}
