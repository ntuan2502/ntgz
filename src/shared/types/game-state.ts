import { CricketItem, SoiState, BoutState, CricketHuntState, CricketCaughtState } from './game-store';

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

export interface BenNetState {
  status?: string;
  fishing?: 'idle' | 'cast' | 'bite' | 'fight' | 'landing' | string;
  wallet?: BenNetWallet | null;
  basketCount?: number;
  totalBasket?: number;
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

export interface GameSnapshot {
  ok: boolean;
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
  [key: string]: unknown;
}
