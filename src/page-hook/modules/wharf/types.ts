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
  /** True when alluvial land tasks are finished and waiting for next crop cycle */
  finishedFarm?: boolean;
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

export interface PanelActionContinuation {
  keepGoing: boolean;
  label?: string;
  actionFn?: () => void;
}

export interface PanelActionOptions {
  /**
   * Called after each confirmed action in the panel.
   * When `keepGoing` is true, the panel stays open and triggers the next action
   * after a short human-like pause instead of closing and reopening the panel.
   */
  shouldContinue?: () => PanelActionContinuation;
  /**
   * When true, leaves the panel open after the initial action completes
   * (used for modal-driven panels like `lantern`, `atm`, or `soi`).
   */
  leaveOpen?: boolean;
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
    triggerDelayMs?: number,
    holdAfterMs?: number,
    options?: PanelActionOptions
  ) => void;
  walkAndRun: (
    tile: { x: number; y: number },
    actionFn: () => void,
    label: string,
    actionKey?: string | null,
    panelState?: Record<string, unknown>,
    triggerDelayMs?: number,
    holdAfterMs?: number,
    options?: PanelActionOptions
  ) => BenStepResult;
}

export interface FishingSubSpotMeta {
  key: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
}

export interface FishingSpotMeta {
  key: string;
  kind: string;
  label: string;
  tiles: Array<{ x: number; y: number }>;
  subSpots?: FishingSubSpotMeta[];
}

export const FISHING_SPOTS: Record<string, FishingSpotMeta> = {
  // 1. Cầu tàu lớn (Đầy đủ các loài cá Thần thoại / Huyền thoại / Cầu vồng)
  dock: {
    key: 'dock',
    kind: 'dock',
    label: '🌉 Cầu tàu lớn (Đầu mũi & thân cầu)',
    tiles: [
      { x: 27, y: 4 }, { x: 28, y: 4 }, { x: 27, y: 3 }, { x: 28, y: 3 },
      { x: 31, y: 3 }, { x: 30, y: 3 }, { x: 32, y: 3 }, { x: 29, y: 3 }, { x: 33, y: 3 },
      { x: 35, y: 4 }, { x: 36, y: 4 }, { x: 35, y: 3 }, { x: 36, y: 3 },
      { x: 31, y: 8 }, { x: 31, y: 7 }, { x: 31, y: 6 }, { x: 31, y: 9 },
      { x: 32, y: 8 }, { x: 32, y: 7 }, { x: 32, y: 6 }, { x: 32, y: 9 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu tàu (Rung lắc tự nhiên)',
        tiles: [
          { x: 27, y: 4 }, { x: 28, y: 4 }, { x: 31, y: 3 }, { x: 30, y: 3 },
          { x: 32, y: 3 }, { x: 35, y: 4 }, { x: 36, y: 4 }, { x: 31, y: 8 },
        ],
      },
      {
        key: 'west_head',
        label: '📍 Mép Tây mặt cầu (Sát Xe Chị Thơm: 8 bước)',
        tiles: [{ x: 27, y: 4 }, { x: 28, y: 4 }, { x: 27, y: 3 }, { x: 28, y: 3 }],
      },
      {
        key: 'west_stem',
        label: '📍 Thân cầu phía Tây (Gần Chị Thơm: 8 bước)',
        tiles: [{ x: 31, y: 8 }, { x: 31, y: 7 }, { x: 31, y: 9 }, { x: 31, y: 6 }],
      },
      {
        key: 'mid_head',
        label: '📍 Đầu mũi giữa sông (Chính diện)',
        tiles: [{ x: 31, y: 3 }, { x: 30, y: 3 }, { x: 32, y: 3 }, { x: 29, y: 3 }, { x: 33, y: 3 }],
      },
      {
        key: 'east_head',
        label: '📍 Mép Đông mặt cầu (Phía vựa cá)',
        tiles: [{ x: 35, y: 4 }, { x: 36, y: 4 }, { x: 35, y: 3 }, { x: 36, y: 3 }],
      },
      {
        key: 'east_stem',
        label: '📍 Thân cầu phía Đông (Nhìn sang vựa cá)',
        tiles: [{ x: 32, y: 8 }, { x: 32, y: 7 }, { x: 32, y: 9 }, { x: 32, y: 6 }],
      },
    ],
  },

  // 2. Cầu tre lắt lẻo (Mạn Tây)
  bamboo: {
    key: 'bamboo',
    kind: 'dock',
    label: '🎋 Cầu tre lắt lẻo (Mạn Tây)',
    tiles: [
      { x: 7, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 6 }, { x: 8, y: 7 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu tre',
        tiles: [{ x: 7, y: 6 }, { x: 8, y: 6 }, { x: 7, y: 7 }, { x: 8, y: 7 }],
      },
      {
        key: 'bamboo_head',
        label: '📍 Đầu cầu tre ngoài xa',
        tiles: [{ x: 7, y: 6 }, { x: 8, y: 6 }],
      },
      {
        key: 'bamboo_stem',
        label: '📍 Thân cầu tre',
        tiles: [{ x: 7, y: 7 }, { x: 8, y: 7 }],
      },
    ],
  },

  // 3. Cầu ván qua lạch (Mạn Đông)
  bridge: {
    key: 'bridge',
    kind: 'dock',
    label: '🪵 Cầu ván qua lạch (Mạn Đông)',
    tiles: [
      { x: 46, y: 15 }, { x: 47, y: 15 }, { x: 48, y: 15 }, { x: 49, y: 15 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Cầu ván',
        tiles: [{ x: 47, y: 15 }, { x: 48, y: 15 }, { x: 46, y: 15 }, { x: 49, y: 15 }],
      },
      {
        key: 'bridge_mid',
        label: '📍 Giữa cầu ván',
        tiles: [{ x: 47, y: 15 }, { x: 48, y: 15 }],
      },
      {
        key: 'bridge_ends',
        label: '📍 Hai đầu cầu ván',
        tiles: [{ x: 46, y: 15 }, { x: 49, y: 15 }],
      },
    ],
  },

  // 4. Bờ sông Bến Giữa (Gần Xe Chị Thơm)
  bank_center: {
    key: 'bank_center',
    kind: 'bank',
    label: '🌾 Bờ sông bến giữa (Sát Xe Chị Thơm)',
    tiles: [
      { x: 23, y: 10 }, { x: 24, y: 10 }, { x: 25, y: 10 },
      { x: 28, y: 10 }, { x: 29, y: 10 }, { x: 30, y: 10 }, { x: 33, y: 10 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến giữa',
        tiles: [{ x: 25, y: 10 }, { x: 24, y: 10 }, { x: 29, y: 10 }, { x: 30, y: 10 }],
      },
      {
        key: 'near_thom',
        label: '📍 Ngay sát Xe Chị Thơm (2 bước)',
        tiles: [{ x: 25, y: 10 }, { x: 24, y: 10 }, { x: 23, y: 10 }],
      },
      {
        key: 'dock_base',
        label: '📍 Chân Cầu Tàu lớn',
        tiles: [{ x: 29, y: 10 }, { x: 30, y: 10 }, { x: 33, y: 10 }],
      },
    ],
  },

  // 5. Bờ sông Bến Đông (Vựa Anh Tư & Sạp Chú Đực)
  bank_east: {
    key: 'bank_east',
    kind: 'bank',
    label: '🏪 Bờ sông bến Đông (Vựa Anh Tư & Chú Đực)',
    tiles: [
      { x: 38, y: 10 }, { x: 39, y: 10 }, { x: 40, y: 10 }, { x: 41, y: 10 },
      { x: 51, y: 11 }, { x: 52, y: 11 }, { x: 53, y: 11 }, { x: 55, y: 11 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến Đông',
        tiles: [{ x: 39, y: 10 }, { x: 40, y: 10 }, { x: 52, y: 11 }, { x: 53, y: 11 }],
      },
      {
        key: 'near_tu',
        label: '📍 Mép sông Vựa Anh Tư (Sát chỗ bán cá)',
        tiles: [{ x: 39, y: 10 }, { x: 40, y: 10 }, { x: 41, y: 10 }, { x: 38, y: 10 }],
      },
      {
        key: 'near_duc',
        label: '📍 Mép sông Sạp Chú Đực (Sát chỗ mua mồi)',
        tiles: [{ x: 52, y: 11 }, { x: 53, y: 11 }, { x: 55, y: 11 }, { x: 51, y: 11 }],
      },
    ],
  },

  // 6. Bờ sông Bến Tây (Mạn Đò ngang & Sới Dế)
  bank_west: {
    key: 'bank_west',
    kind: 'bank',
    label: '🛶 Bờ sông bến Tây (Gần Đò ngang & Sới Dế)',
    tiles: [
      { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 },
      { x: 6, y: 10 }, { x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Toàn bộ Bờ sông bến Tây',
        tiles: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 7, y: 10 }, { x: 8, y: 10 }],
      },
      {
        key: 'ferry',
        label: '📍 Mép bến đò ngang',
        tiles: [{ x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 }, { x: 1, y: 11 }],
      },
      {
        key: 'reed_bank',
        label: '📍 Bãi sậy ven đò',
        tiles: [{ x: 7, y: 10 }, { x: 8, y: 10 }, { x: 9, y: 10 }, { x: 6, y: 10 }],
      },
    ],
  },

  // 7. Hồ nước phía Đông (Ao sen bán nguyệt)
  lake_east: {
    key: 'lake_east',
    kind: 'bank',
    label: '🪷 Hồ nước phía Đông (Ao sen bán nguyệt)',
    tiles: [
      { x: 57, y: 16 }, { x: 58, y: 16 }, { x: 59, y: 16 }, { x: 55, y: 15 },
      { x: 54, y: 16 }, { x: 53, y: 18 }, { x: 53, y: 19 }, { x: 54, y: 20 },
      { x: 57, y: 22 }, { x: 58, y: 23 }, { x: 59, y: 22 }, { x: 56, y: 22 },
      { x: 61, y: 17 }, { x: 63, y: 19 }, { x: 63, y: 20 }, { x: 62, y: 21 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Quanh bờ ao sen (Rung lắc tự nhiên)',
        tiles: [{ x: 58, y: 16 }, { x: 53, y: 19 }, { x: 58, y: 23 }, { x: 63, y: 19 }],
      },
      {
        key: 'lake_north',
        label: '📍 Bờ Bắc ao sen (Lối đi Sạp Chú Đực)',
        tiles: [{ x: 57, y: 16 }, { x: 58, y: 16 }, { x: 59, y: 16 }, { x: 55, y: 15 }],
      },
      {
        key: 'lake_west',
        label: '📍 Bờ Tây ao sen (Lối đi chợ)',
        tiles: [{ x: 54, y: 16 }, { x: 53, y: 18 }, { x: 53, y: 19 }, { x: 54, y: 20 }],
      },
      {
        key: 'lake_south',
        label: '📍 Bờ Nam ao sen (Gần đồng lúa)',
        tiles: [{ x: 57, y: 22 }, { x: 58, y: 23 }, { x: 59, y: 22 }, { x: 56, y: 22 }],
      },
      {
        key: 'lake_east',
        label: '📍 Bờ Đông ao sen (Bãi cỏ vắng)',
        tiles: [{ x: 61, y: 17 }, { x: 63, y: 19 }, { x: 63, y: 20 }, { x: 62, y: 21 }],
      },
    ],
  },

  // 8. Kênh lạch phía Đông (Ven ruộng lúa bãi bồi)
  creek_east: {
    key: 'creek_east',
    kind: 'bank',
    label: '🏞️ Kênh lạch phía Đông (Ven ruộng lúa)',
    tiles: [
      { x: 45, y: 12 }, { x: 48, y: 12 }, { x: 45, y: 13 }, { x: 49, y: 13 },
      { x: 48, y: 19 }, { x: 49, y: 20 }, { x: 50, y: 21 }, { x: 50, y: 22 },
      { x: 54, y: 26 }, { x: 55, y: 27 }, { x: 56, y: 28 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Dọc bờ kênh lạch',
        tiles: [{ x: 45, y: 13 }, { x: 49, y: 20 }, { x: 55, y: 27 }],
      },
      {
        key: 'creek_north',
        label: '📍 Thượng nguồn lạch (Cạnh cầu ván)',
        tiles: [{ x: 45, y: 12 }, { x: 48, y: 12 }, { x: 45, y: 13 }, { x: 49, y: 13 }],
      },
      {
        key: 'creek_mid',
        label: '📍 Uốn lượn ven ruộng lúa',
        tiles: [{ x: 48, y: 19 }, { x: 49, y: 20 }, { x: 50, y: 21 }, { x: 50, y: 22 }],
      },
      {
        key: 'creek_south',
        label: '📍 Cửa lạch phía Nam',
        tiles: [{ x: 54, y: 26 }, { x: 55, y: 27 }, { x: 56, y: 28 }],
      },
    ],
  },

  // 9. Đầm nước phía Nam (Bãi lau sậy ven sông)
  south_swamp: {
    key: 'south_swamp',
    kind: 'bank',
    label: '🌾 Đầm nước phía Nam (Bãi lau sậy)',
    tiles: [
      { x: 2, y: 32 }, { x: 3, y: 32 }, { x: 4, y: 32 }, { x: 5, y: 32 },
      { x: 7, y: 33 }, { x: 8, y: 33 }, { x: 9, y: 34 }, { x: 10, y: 34 },
      { x: 13, y: 36 }, { x: 14, y: 37 }, { x: 15, y: 38 }, { x: 16, y: 39 },
    ],
    subSpots: [
      {
        key: 'all',
        label: '🎲 Khắp bờ đầm phía Nam',
        tiles: [{ x: 3, y: 32 }, { x: 8, y: 33 }, { x: 14, y: 37 }],
      },
      {
        key: 'swamp_west',
        label: '📍 Mép Tây đầm sậy',
        tiles: [{ x: 2, y: 32 }, { x: 3, y: 32 }, { x: 4, y: 32 }, { x: 5, y: 32 }],
      },
      {
        key: 'swamp_mid',
        label: '📍 Bãi sậy giữa đầm',
        tiles: [{ x: 7, y: 33 }, { x: 8, y: 33 }, { x: 9, y: 34 }, { x: 10, y: 34 }],
      },
      {
        key: 'swamp_east',
        label: '📍 Chân đầm phía Nam',
        tiles: [{ x: 13, y: 36 }, { x: 14, y: 37 }, { x: 15, y: 38 }, { x: 16, y: 39 }],
      },
    ],
  },
};

// Aliases for backwards compatibility
FISHING_SPOTS.bank = FISHING_SPOTS.bank_center;

export const SPOT_KEYS = [
  'dock',
  'bamboo',
  'bridge',
  'bank_center',
  'bank_east',
  'bank_west',
  'lake_east',
  'creek_east',
  'south_swamp',
];

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
