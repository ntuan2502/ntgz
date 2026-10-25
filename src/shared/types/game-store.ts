/**
 * Strong typing for in-game Zustand stores (Main, Sea, BenUI, BenNet)
 */

export interface PlotCrop {
  id: string;
  stage?: number;
  watered?: boolean;
  fertilized?: boolean;
  pests?: boolean;
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
  cooking?: unknown[];
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
  playDay?: number;
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
  crop?: string;
  base?: number;
  need?: number;
  [key: string]: unknown;
}

export interface VillageRequest {
  id: string | number;
  done?: boolean;
  goods?: string;
  qty?: number;
  who?: string;
  reward?: number;
  [key: string]: unknown;
}

export interface HelperState {
  hired?: boolean;
  unpaid?: number;
}

export interface GoldHolding {
  qty: number;
  cost: number;
}

export interface PiggyBank {
  amount?: number;
  streak?: number;
  lastDay?: number;
  broken?: boolean;
}

export interface BrokenPiggyResult {
  coins?: number;
  bonus?: number;
}

export type BuyItemsPayload = { fertilizer: number; pesticide: number; mysteryBag: number };
export type BuySeedsPayload = { radish: number; carrot: number; corn: number; rice: number };

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
  houseLevel?: number;
  coffeeDay?: number;
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
  uncleBa?: { met?: boolean; [key: string]: unknown };
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
    gear?: string[];
    news?: unknown;
    [key: string]: unknown;
  };
  pond?: {
    ready?: boolean;
    news?: unknown;
    noteRead?: boolean;
    fedDay?: number;
    bebi?: string;
    fish?: Array<{ id?: string; days?: number; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  buffalo?: {
    home?: boolean;
    news?: unknown;
    fedDay?: number;
    bathDay?: number;
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
    crops?: HelperState;
    buffalo?: HelperState;
    dairy?: HelperState;
    poultry?: HelperState;
    pond?: HelperState;
    [key: string]: unknown;
  };
  order?: {
    crop: string;
    qty: number;
    reward?: number;
    [key: string]: unknown;
  } | null;
  village?: {
    newsDay?: number;
    met?: boolean;
    requests?: VillageRequest[];
    marketOpen?: boolean;
    marketBuild?: unknown;
    nightSold?: { day?: number; n?: number };
    [key: string]: unknown;
  };
  savings?: {
    newsDay?: number;
    pig?: PiggyBank | null;
    loan?: unknown;
    books?: unknown[];
    matured?: number;
    balance?: number;
    term?: string;
    [key: string]: unknown;
  };
  goldShop?: {
    newsDay?: number;
    seed?: number;
    hold?: Record<string, GoldHolding | undefined>;
    [key: string]: unknown;
  };
  daily?: {
    tasks?: DailyTask[];
    [key: string]: unknown;
  };
  goalIndex?: number;
  firstDay?: {
    cooked?: boolean;
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
    useShrimp?: boolean;
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
    harvested?: Record<string, number>;
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
  plotOffer?: { price?: number; [key: string]: unknown } | null;
  zoneOffer?: unknown;

  // Navigation & sleep
  showWorldMap?: () => void;
  enterFarm?: () => void;
  leaveHouse?: () => void;
  enterHouse?: () => void;
  openSea?: () => void;
  goToSea?: () => string;
  goToSleep?: () => void;
  sleepThrough?: () => void;
  nextMorning?: () => void;
  stopSleeping?: () => void;

  // House, kitchen & needs
  learnRecipe?: (recipe: string) => string;
  cook?: (recipe: string) => string;
  eatDish?: (dish: string) => boolean;
  buyFood?: (food: string) => string;
  chargeVehicle?: () => number;
  shampoo?: () => string;
  whiten?: () => string;

  // Crops
  setActiveTool?: (tool: string) => void;
  applyTool?: (plot: string, tool: string) => unknown;
  previewTool?: (plot: string, tool: string) => unknown;
  buyItems?: (payload: BuyItemsPayload) => unknown;
  consumeItem?: (item: string) => unknown;
  buySeeds?: (payload: BuySeedsPayload) => boolean;
  buyPlot?: () => boolean;
  payHelper?: (type: string) => boolean;

  // Pet
  pickUpPet?: () => void;
  feedPet?: (food: string) => string;
  buyPetFood?: (food: string, count: number) => string;
  cuddlePet?: () => string;
  bathPet?: () => string;
  doTrick?: (trick: string) => string;

  // Barn
  feedBuffalo?: () => string;
  bathBuffalo?: () => string;
  lendBuffalo?: () => string;
  feedCows?: () => string;
  buyMedicine?: () => void;
  cureCow?: (cowId: string | number) => string;
  sellMilk?: () => { liters: number; total: number } | null;

  // Coop & pond
  collectEggs?: () => number;
  buyChick?: () => string;
  readPondNote?: () => void;
  netFish?: () => { n: number; total: number } | null;
  stockFish?: (fish: string) => string;
  feedFish?: () => string;

  // Market & gold shop
  deliverOrder?: () => boolean;
  meetKhang?: () => void;
  deliverRequest?: (reqId: string | number) => boolean;
  sellQty?: (goods: string, qty: number) => number;
  sellNight?: (goods: string) => 'ok' | 'closed' | 'quota' | 'empty' | string;
  buyGold?: (type: string, qty: number) => string;
  sellGold?: (type: string, qty: number) => number | null;

  // Di Bay, notebook & quests
  lightIncense?: () => string;
  plantSprouts?: () => string;
  harvestSprouts?: () => boolean;
  clearDebris?: (index: number) => unknown;
  claimPage?: (page: number) => boolean;
  startSoak?: () => boolean;
  claimDaily?: (index: number) => unknown;
  claimGoal?: () => unknown;
  breakPiggy?: () => BrokenPiggyResult | null;
  newPiggy?: (tier: number) => boolean;
  feedPiggy?: () => string;
  deposit?: (amount: number, days: number) => string;

  // Sea fishing
  buyRod?: () => boolean;
  sellBasket?: () => number;
  claimDexReward?: () => boolean;
  buyBait?: (bait: string, packs: number) => boolean;
  setUseShrimp?: (use: boolean) => void;

  // Interrupts
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
  field?: string | null;
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

export interface CricketStats {
  power: number;
  tough: number;
  nerve: number;
}

export interface CricketItem {
  id: string;
  species: string;
  stats: CricketStats;
  caps: CricketStats;
  diesAt?: number;
  restUntil?: number;
  [key: string]: unknown;
}

export interface CricketHuntState {
  phase?: 'light' | 'seek' | 'hop' | string;
  hop?: {
    n: number;
    spot: number;
    left: number;
    air: number;
    window: number;
    from: number;
    /** performance.now() timestamp when the hop message arrived */
    at: number;
  };
  rarity?: string;
  miss?: {
    kind: string;
  };
  [key: string]: unknown;
}

export interface CricketCaughtState {
  seq: number;
  isNew?: boolean;
  cricket: CricketItem;
  [key: string]: unknown;
}

export interface SoiNpc {
  id: string;
  open?: boolean;
  beaten?: boolean;
  paidToday?: boolean;
  [key: string]: unknown;
}

export interface SoiState {
  npcs: SoiNpc[];
  box?: CricketItem[];
  bets?: number;
  [key: string]: unknown;
}

export interface BoutParticipant {
  id: string;
  name: string;
  species: string;
  stats: CricketStats;
  [key: string]: unknown;
}

export type BoutSide = 'red' | 'blue';

export interface BoutState {
  id: string;
  n?: number;
  /** Server timestamp (ms) when the first clash happens; clashes every 1600ms after */
  startAt?: number;
  red: BoutParticipant;
  blue: BoutParticipant;
  end?: { winner: BoutSide; why: string } | null;
  tickles?: Record<BoutSide, number>;
  fire?: Record<BoutSide, number>;
  grit?: Record<BoutSide, number>;
  tickle?: { side: string; seq: number } | null;
  clash?: { seq: number; flip?: boolean } | null;
  betUntil?: number;
  odds?: Record<BoutSide, number>;
  [key: string]: unknown;
}

export interface BenNetState {
  status?: string;
  fishing?: string;
  /** Own player id on the wharf server */
  you?: string;
  /** Server clock skew; server time = Date.now() + skew */
  ti?: { skew?: number; [key: string]: unknown } | null;
  watching?: string | null;
  myBets?: Record<string, { side: BoutSide; shells: number; mult?: number } | undefined>;
  wallet?: BenNetWallet | null;
  basket?: Array<{ id?: string; fish?: string; price?: number; size?: number; kept?: boolean; [key: string]: unknown }>;
  pack?: Record<string, number>;
  closet?: string[];
  crickets?: {
    box?: CricketItem[];
    dex?: Array<{ species: string; count: number; best: number }>;
  } | null;
  soi?: SoiState | null;
  bouts?: Record<string, BoutState>;
  hunt?: CricketHuntState | null;
  caught?: CricketCaughtState;
  boutDone?: {
    won?: boolean;
    reward?: number;
    points?: number;
  };
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
    picks?: string[];
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
