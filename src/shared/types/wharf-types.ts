/**
 * Định nghĩa kiểu dữ liệu tập trung cho Khu Vực Bến Đò, Sới Dế, Sự Kiện & Bãi Phù Sa.
 * Dùng chung cho cả Zustand Store (game-store.ts) và Snapshot (game-state.ts).
 */

export interface BenUIStoreState {
  spot?: string;
  walking?: boolean;
  panel?: string | null;
  inSeat?: boolean;
  hasBite?: boolean;
  fightActive?: boolean;
  field?: string | null;
  setSpot?: (spot: string) => void;
  setPanel?: (panel: string | null) => void;
  [key: string]: unknown;
}

export type BenUIState = BenUIStoreState;

export interface BenNetWallet {
  shells?: number;
  bait?: number;
  stamina?: number;
  staminaNext?: number;
  at?: number;
  liveStamina?: number;
  luckCasts?: number;
  tickets?: number;
  keepSlots?: number;
  keepLevel?: number;
  [key: string]: unknown;
}

export interface BenNetAtmState {
  rate?: number;
  left?: number;
  reopen?: number;
  nextTime?: number;
  day?: number;
  log?: unknown[];
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
    seq?: number;
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
  fishing?: 'idle' | 'cast' | 'bite' | 'fight' | 'landing' | string;
  /** Own player id on the wharf server */
  you?: string;
  /** Server clock skew; server time = Date.now() + skew */
  ti?: { skew?: number; [key: string]: unknown } | null;
  watching?: string | null;
  myBets?: Record<string, { side: BoutSide; shells: number; mult?: number } | undefined>;
  wallet?: BenNetWallet | null;
  basketCount?: number;
  totalBasket?: number;
  basket?: Array<{ id?: string; fish?: string; price?: number; size?: number; kept?: boolean; [key: string]: unknown }>;
  pack?: Record<string, number>;
  closet?: string[];
  look?: Record<string, string>;
  dex?: Record<string, { count: number; best: number; [key: string]: unknown }>;
  title?: string | null;
  board?: {
    records?: Record<string, { name: string; size: number; id: string }>;
    boards?: Record<string, Array<{ id: string; name: string; value: number; fish?: string }>>;
    me?: Record<string, { rank: number; value: number }>;
    weekStart?: number;
    at?: number;
    lastWeek?: Array<{ name: string; value: number }>;
    [key: string]: unknown;
  } | null;
  rods?: {
    owned?: string[];
    using?: string | null;
    [key: string]: unknown;
  } | null;
  rooms?: {
    size: number;
    rooms: Array<{ id: number; players: number }>;
  } | null;
  room?: number | null;
  crickets?: {
    box?: CricketItem[];
    dex?: Array<{ species: string; count: number; best: number }>;
  } | null;
  soi?: SoiState | null;
  bouts?: Record<string, BoutState>;
  hunt?: CricketHuntState | null;
  /** Hunt ended without a catch: none = no cricket heard, escaped = ran out of hops, moved = walked away */
  gotAway?: { why: 'none' | 'escaped' | 'moved' | string; seq: number } | null;
  cricketEvents?: Array<{ seq: number; text: string }>;
  fishingEvents?: Array<{ seq: number; text: string }>;
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
    } | null;
    [key: string]: unknown;
  } | null;
  wheel?: {
    bought?: number;
    picks?: string[];
    [key: string]: unknown;
  };
  spun?: {
    slots?: unknown[];
    hits?: Array<{ slot?: number; shells?: number; item?: string }>;
    won?: string | null;
    seq?: number;
    [key: string]: unknown;
  } | null;
  lotto?: {
    wins?: unknown[];
    pending?: number;
    selling?: number;
    mine?: Array<{ day?: number; [key: string]: unknown }>;
    [key: string]: unknown;
  };
  atm?: BenNetAtmState | null;
  hlw?: {
    state?: unknown;
    bag?: Array<{ item: string; qty: number }>;
    board?: unknown;
    [key: string]: unknown;
  } | null;
  hlwBoss?: {
    start?: number;
    seed?: number;
    [key: string]: unknown;
  } | null;
  hlwLive?: {
    on?: boolean;
    endsAt?: number | null;
    [key: string]: unknown;
  } | null;
  hlwToast?: { text: string; seq: number } | null;
  htx?: {
    claimed?: boolean;
    card?: unknown;
    until?: number;
    [key: string]: unknown;
  } | null;
  htxDone?: {
    bought?: boolean;
    week?: boolean;
    seq?: number;
    [key: string]: unknown;
  } | null;
  cashed?: {
    shells: number;
    money: number;
    seq: number;
    [key: string]: unknown;
  } | null;
  notice?: {
    error?: string;
    seq?: number;
    until?: number;
    [key: string]: unknown;
  };
  shop?: {
    at?: string;
    k?: string;
    ready?: number;
    [key: string]: unknown;
  } | null;
  check?: {
    img?: string;
    ask?: 'fish' | 'crab' | 'shrimp' | 'snail' | string;
    options?: number[];
    ms?: number;
    until?: number;
    kinds?: string[];
    count?: number;
    ans?: number;
    solution?: number;
    correct?: number;
    pick?: number;
    [key: string]: unknown;
  } | null;
  checkDone?: {
    ok?: boolean;
    result?: string;
    seq?: number;
    holdUntil?: number;
    [key: string]: unknown;
  } | null;
  landed?: {
    id?: string;
    fish?: string;
    rarity?: string;
    price?: number;
    size?: number;
    odd?: boolean;
    rainbow?: boolean;
    released?: boolean;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
}

export interface BaiPlotData {
  plot: number;
  crop: string | null;
  state: 'empty' | 'dry' | 'growing' | 'ripe' | string;
  readyAt?: number;
  pestAt?: number | null;
  fert?: boolean;
  bio?: boolean;
}

export interface BaiCoconutData {
  slot: number;
  matureAt?: number;
  ready?: number;
  readyAt?: number;
  state?: string;
}

export interface BaiDryRackData {
  slot: number;
  readyAt: number;
  fish: string;
  size?: number;
  price?: number;
  [key: string]: unknown;
}

export interface BaiBirdData {
  kind: 'hen' | 'duck' | string;
  eggs: number;
  diesAt: number | null;
  [key: string]: unknown;
}

export interface BaiNetFishData {
  kind: string;
  readyAt: number;
  hungry?: boolean;
  diesAt?: number | null;
  [key: string]: unknown;
}

export interface BaiDryDexItem {
  id?: string;
  fish: string;
  size: number;
  price?: number;
}

export interface BaiDryDexData {
  owner: { me?: boolean; id?: string; name?: string } | null;
  items: BaiDryDexItem[];
  total: number;
}

export interface BaiCandyRecipeData {
  coco: number;
  sugar: number;
  out: number;
  price: number;
}

export interface BaiSpecialtyData {
  candy?: number;
  dried?: number;
  driedValue?: number;
  driedPrices?: number[];
  driedList?: Array<{ id: string; fish: string; size: number; price: number; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface BaiFarmData {
  plots: BaiPlotData[];
  coconuts: BaiCoconutData[];
  candyReadyAt?: number | null;
  candyLv?: number;
  candyPans?: number;
  racks?: BaiDryRackData[];
  dryLv?: number;
  coop?: number;
  birds?: BaiBirdData[];
  net?: number | boolean;
  netFish?: BaiNetFishData[];
  netFedUntil?: number | null;
  netBoostNo?: number | null;
  mudLeft?: number;
  mudDug?: Array<{ x: number; y: number }>;
  mudHints?: Array<{ x: number; y: number }>;
  home?: unknown[];
  parcels?: number;
  [key: string]: unknown;
}

export interface BaiInfoData {
  shells?: number;
  pearls?: number;
  harvests?: number;
  land?: boolean;
  price?: number;
  baiOpen?: boolean;
  items?: Record<string, number>;
  crops?: Array<{ id: string; name: string; unit: string; price?: number; seedPrice?: number; growSec?: number; pearl?: boolean }>;
  candyRecipe?: BaiCandyRecipeData;
  specialty?: BaiSpecialtyData;
  dryMult?: number;
  coop?: {
    level?: number;
    nest?: number;
    cap?: number;
    birds?: Record<string, { everyMs: number }>;
    names?: string[];
    next?: { price: number; name: string; birds: number };
    [key: string]: unknown;
  };
  net?: {
    level?: number;
    cap?: number;
    feedFish?: number;
    names?: string[];
    fish?: Record<string, { name: string; price: number }>;
    next?: { price: number; name: string; fish: number };
    [key: string]: unknown;
  };
  guards?: Record<string, { name?: string; price?: number; have?: boolean }>;
  luckSticks?: number;
  sold?: number;
  rate?: number;
  [key: string]: unknown;
}

export interface BaiStoreState {
  kind: 'ben' | 'bai' | 'farm' | 'home' | string;
  owner: { me?: boolean; id?: string; name?: string; level?: number } | null;
  farm: BaiFarmData | null;
  info: BaiInfoData | null;
  dryDex?: BaiDryDexData | null;
  list: {
    mine?: unknown;
    friends?: Array<{ h: string; name: string; ripe: number }>;
    strangers?: Array<{ h: string; name: string; ripe: number }>;
  } | null;
  steals?: unknown[] | null;
  seed?: string | null;
  tool?: string;
  yardEdit?: boolean;
  [key: string]: unknown;
}

export interface BaiSnapshotState {
  kind: 'ben' | 'bai' | 'farm' | 'home' | string;
  hasLand: boolean;
  landPrice: number;
  shells: number;
  pearls: number;
  items: Record<string, number>;
  farm: BaiFarmData | null;
  info: BaiInfoData | null;
  dryDex?: BaiDryDexData | null;
  owner: { me?: boolean; id?: string; name?: string } | null;
  nextReadyAt: number;
  lastFarmSurveyAt?: number;
  lastInfoAt?: number;
}
