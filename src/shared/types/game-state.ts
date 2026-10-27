import {
  CricketItem,
  SoiState,
  BoutState,
  CricketHuntState,
  CricketCaughtState,
  FarmstayState,
  FriendsStoreState,
} from './game-store';

export interface VehicleState {
  id?: string;
  type?: string;
  battery?: number;
  [key: string]: unknown;
}

export interface InventoryItem {
  id: string;
  name?: string;
  count?: number;
  qty?: number;
  type?: string;
  [key: string]: unknown;
}

export interface PlotItem {
  id: string | number;
  cropId?: string;
  stage?: number;
  watered?: boolean;
  fertilized?: boolean;
  pest?: boolean;
  harvestable?: boolean;
  [key: string]: unknown;
}

export interface AnimalItem {
  id: string | number;
  type?: string;
  name?: string;
  hungry?: boolean;
  dirty?: boolean;
  sick?: boolean;
  ready?: boolean;
  [key: string]: unknown;
}

export interface SeaState {
  phase?: 'idle' | 'cast' | 'bite' | 'hooked' | 'reel' | 'caught' | string;
  spot?: string;
  bite?: boolean;
  pullDirection?: 'left' | 'right' | 'up' | 'down' | string;
  tension?: number;
  [key: string]: unknown;
}

export interface BenNetWallet {
  shells?: number;
  bait?: number;
  stamina?: number;
  liveStamina?: number;
  tickets?: number;
  [key: string]: unknown;
}

export interface BenNetAtmState {
  rate?: number;
  left?: number;
  reopen?: number;
  nextTime?: number;
  day?: number;
  [key: string]: unknown;
}

export interface BenNetState {
  status?: string;
  fishing?: 'idle' | 'cast' | 'bite' | 'fight' | 'landing' | string;
  wallet?: BenNetWallet | null;
  basketCount?: number;
  totalBasket?: number;
  basket?: Array<{ id?: string; fish?: string; price?: number; size?: number; kept?: boolean; [key: string]: unknown }>;
  atm?: BenNetAtmState | null;
  ti?: { skew?: number; [key: string]: unknown } | null;
  crickets?: {
    box?: CricketItem[];
    dex?: Array<{ species: string; count: number; best: number }>;
  } | null;
  soi?: SoiState | null;
  bouts?: Record<string, BoutState>;
  hunt?: CricketHuntState | null;
  gotAway?: { why: string; seq: number } | null;
  cricketEvents?: Array<{ seq: number; text: string }>;
  caught?: CricketCaughtState;
  boutDone?: {
    won?: boolean;
    reward?: number;
    points?: number;
  };
  wheel?: {
    bought?: number;
    picks?: string[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export interface BenUIState {
  inSeat?: boolean;
  hasBite?: boolean;
  fightActive?: boolean;
  spot?: string;
  field?: string | null;
  [key: string]: unknown;
}

export interface ImportantAlert {
  id: string;
  text: string;
  icon?: string;
  day?: number;
  time?: string;
}

export interface GameSnapshot {
  ok: boolean;
  recentAlert?: ImportantAlert | null;
  hasPhaser?: boolean;
  hasBenWs?: boolean;
  screen?: string;
  day?: number;
  minutes?: number;
  gold?: number;
  fullness?: number;
  hydration?: number;
  energy?: number;
  battery?: number;
  vehicle?: VehicleState | boolean | null;
  onFoot?: boolean;
  indoors?: boolean;
  sleeping?: boolean;
  panel?: unknown;
  cropsCount?: number;
  inventory?: InventoryItem[];
  warehouse?: Record<string, number>;
  plots?: PlotItem[] | Record<string, unknown>;
  animals?: AnimalItem[];
  sea?: SeaState | null;
  benUI?: BenUIState | null;
  benNet?: BenNetState | null;
  friends?: FriendsStoreState | null;
  benWallet?: BenNetWallet | null;
  benNonKeptCount?: number;
  village?: {
    marketOpen?: boolean;
    nightSold?: { day?: number; n?: number };
    quotaLeft?: number;
    [key: string]: unknown;
  };
  fishing?: {
    seaOpen?: boolean;
    bait?: {
      worm?: number;
      shrimp?: number;
      [key: string]: number | undefined;
    };
    basket?: unknown[];
    [key: string]: unknown;
  };
  prices?: Record<string, number>;
  farmstay?: FarmstayState | null;
  produce?: Record<string, number>;
  seeds?: Record<string, number>;
  items?: Record<string, number>;
  eggs?: number;
  nestEggs?: number;
  hens?: Array<{ id?: string | number; fedDay?: number; sickDay?: number; [key: string]: unknown }> | unknown[];
  coopLevel?: number;
  kitchen?: {
    stock?: Record<string, number>;
    cooking?: unknown[];
    known?: string[];
    [key: string]: unknown;
  } | unknown;
  pets?: {
    pet?: { name?: string; kind?: string; hunger?: number; [key: string]: unknown };
    gear?: string[];
    [key: string]: unknown;
  } | Array<{ name?: string; kind?: string; [key: string]: unknown }> | unknown;
  pond?: {
    fish?: Array<{ id?: string; days?: number; [key: string]: unknown }>;
    known?: boolean;
    [key: string]: unknown;
  } | unknown;
  buffalo?: {
    home?: boolean;
    mood?: number;
    bathDay?: number;
    mudDay?: number;
    lentDay?: number;
    [key: string]: unknown;
  } | unknown;
  dairy?: {
    cows?: Array<{ id?: string | number; name?: string; fedDay?: number; sickDay?: number }>;
    medicine?: number;
    milk?: number;
    coming?: Array<{ id?: string | number; at?: number }>;
    newsDay?: number;
    [key: string]: unknown;
  } | unknown;
  savings?: {
    books?: Array<{ id?: string | number; amount?: number; days?: number; start?: number; [key: string]: unknown }> | unknown[];
    matured?: number;
    earned?: number;
    pig?: { amount?: number; streak?: number; lastDay?: number; [key: string]: unknown } | null;
    [key: string]: unknown;
  } | unknown;
  [key: string]: unknown;
}
