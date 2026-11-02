import { AppConfig } from '../../../shared/types/config';
import { BenNetState, BenUIStoreState, MainGameStoreState, BenNetWallet } from '../../../shared/types/game-store';
import { ZustandStore } from '../../core/engine-access';

export interface BenStepResult {
  acted: boolean;
  msg?: string;
  exhausted?: boolean;
  reason?: string;
  isBossHunt?: boolean;
  /** Content runner may click the cast button (fishing owns the continuous slot and stands at the spot) */
  allowCast?: boolean;
  /** Continuous activity (fishing / hunting) to run only if no bounded task is ready */
  deferred?: () => BenStepResult;
}

export interface BenDoPhaserScene {
  goFarmer?: (tile: { x: number; y: number }, cb?: () => void) => void;
  farmer?: {
    tile?: { x: number; y: number };
    running?: boolean;
    lookAt?: (x: number, y: number) => void;
    x?: number;
    y?: number;
  };
  boss?: {
    visible?: boolean;
    x?: number;
    y?: number;
  };
}

export interface BenExecutionContext {
  cfg: AppConfig;
  m: MainGameStoreState;
  bu: BenUIStoreState;
  bn: BenNetState;
  buStore: ZustandStore<BenUIStoreState>;
  bnStore: ZustandStore<BenNetState>;
  benScene: BenDoPhaserScene | null;
  wallet: BenNetWallet;
  stamina: number;
  shells: number;
  bait: number;
  nonKeptCount: number;
  totalSellShells: number;
  packItems: string[];
  isStaminaDepleted: boolean;
  needShellsForBait: boolean;
  needShellsForFood: boolean;
  targetFoodPrice: number;
  prefFood: string;
  benShowFullActions: boolean;
  isBossActive: boolean;
  isBossImpending: boolean;
  secondsToNextBoss: number;
  huntEnabled: boolean;
  bossEnabled: boolean;
  arenaEnabled: boolean;
  runWithOptionalPanel: (
    actionFn: () => void,
    label: string,
    panelState?: Record<string, unknown>,
    holdMs?: number
  ) => void;
  walkAndRun: (
    tile: { x: number; y: number },
    actionFn: () => void,
    label: string,
    actionKey?: string | null,
    panelState?: Record<string, unknown>,
    holdMs?: number
  ) => BenStepResult;
}

export interface FishingSpotMeta {
  key: string;
  kind: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
}

export const FISHING_SPOTS: Record<string, FishingSpotMeta> = {
  bank: {
    key: 'bank',
    kind: 'bank',
    label: 'Bờ sông bến giữa',
    tiles: [
      { x: 24, y: 10 },
      { x: 23, y: 10 },
      { x: 25, y: 10 },
    ],
  },
  dock: {
    key: 'dock',
    kind: 'dock',
    label: 'Cầu tàu lớn (Đầu mũi)',
    tiles: [
      { x: 31, y: 3 },
      { x: 30, y: 3 },
      { x: 32, y: 3 },
    ],
  },
  bamboo: {
    key: 'bamboo',
    kind: 'dock',
    label: 'Cầu tre lắt lẻo',
    tiles: [
      { x: 7, y: 6 },
      { x: 7, y: 7 },
      { x: 8, y: 6 },
      { x: 8, y: 7 },
    ],
  },
  bridge: {
    key: 'bridge',
    kind: 'dock',
    label: 'Cầu ván qua lạch',
    tiles: [
      { x: 46, y: 15 },
      { x: 47, y: 15 },
      { x: 48, y: 15 },
    ],
  },
};

export const SPOT_KEYS = ['bank', 'dock', 'bamboo', 'bridge'];

export const BOSS_LADDER = [
  { id: 'cuBin', aliases: ['cubin', 'bin'], name: 'Cu Bin', reward: 15, total: 60 },
  { id: 'utMap', aliases: ['utmap', 'map'], name: 'Út Mập', reward: 30, total: 112 },
  { id: 'anhLuc', aliases: ['anhluc', 'luc'], name: 'Anh Lực xe ôm', reward: 60, total: 138 },
  { id: 'bacChin', aliases: ['bacchin', 'chin'], name: 'Bác Chín thợ rèn', reward: 110, total: 194 },
  { id: 'ongSau', aliases: ['ongsau', 'sau'], name: 'Ông Sáu chủ sới', reward: 220, total: 242 },
];

export const SOI_TILE = { x: 4, y: 29 };
/** Central courtyard of Bến Đò village (middle of map & boss roaming bounds ZY: { x0: 4, x1: 40, y0: 14, y1: 35 }) */
export const BEN_MAP_CENTER_TILE = { x: 24, y: 23 };
export const CRICKET_BOX_MAX = 6;
export const HUNT_STAMINA_COST = 3;
export const HUNT_LIGHT_STALE_MS = 8000;

export const FOOD_PRICES: Record<string, number> = {
  banhMi: 10,
  chaoCa: 14,
  huTieu: 20,
  comTam: 28,
  lauMam: 45,
};

export const cricketTotal = (c: { stats?: { power?: number; tough?: number; nerve?: number } }): number =>
  (c.stats?.power || 0) + (c.stats?.tough || 0) + (c.stats?.nerve || 0);
