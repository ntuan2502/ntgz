import {
  BaiFarmData,
  BaiInfoData,
  BaiPlotData,
  BaiCoconutData,
  BaiDryDexData,
  BaiSnapshotState,
} from '../../../../shared/types/game-store';
import { stores, sendBenWs, addBenWsMessageListener } from '../../../core/engine-access';

export interface AlluvialManagerState {
  kind: 'ben' | 'bai' | 'farm' | 'home' | string;
  hasLand: boolean;
  landPrice: number;
  shells: number;
  pearls: number;
  items: Record<string, number>;
  farm: BaiFarmData | null;
  info: BaiInfoData | null;
  dryDex: BaiDryDexData | null;
  owner: { me?: boolean; id?: string; name?: string } | null;
  lastInfoAt: number;
  lastFarmSurveyAt: number;
  nextReadyAt: number;
}

export const baiState: AlluvialManagerState = {
  kind: 'ben',
  hasLand: false,
  landPrice: 100000,
  shells: 0,
  pearls: 0,
  items: {},
  farm: null,
  info: null,
  dryDex: null,
  owner: null,
  lastInfoAt: 0,
  lastFarmSurveyAt: 0,
  nextReadyAt: 0,
};

let isInitialized = false;

/**
 * Chuẩn hóa timestamp (hỗ trợ cả đơn vị giây Unix lẫn mili-giây Unix từ server).
 */
export function toTimestampMs(val: number | null | undefined): number {
  if (typeof val !== 'number' || val <= 0) return 0;
  return val < 1e11 ? val * 1000 : val;
}

export function getBaiServerNowMs(): number {
  const skew = stores.benNet?.getState()?.ti?.skew ?? 0;
  return Date.now() + skew;
}

export function recalculateNextReadyAt(): void {
  const nowMs = getBaiServerNowMs();
  let minReadyMs = 0;

  const consider = (rawTs: number | null | undefined) => {
    const ms = toTimestampMs(rawTs);
    if (ms > nowMs && (minReadyMs === 0 || ms < minReadyMs)) {
      minReadyMs = ms;
    }
  };

  if (baiState.farm) {
    // 1. Alluvial Crop Plots
    if (Array.isArray(baiState.farm.plots)) {
      for (const p of baiState.farm.plots) {
        if (p.crop && p.state === 'growing') {
          consider(p.readyAt);
        }
      }
    }

    // 2. Coconut Trees
    if (Array.isArray(baiState.farm.coconuts)) {
      for (const c of baiState.farm.coconuts) {
        consider(c.readyAt);
      }
    }

    // 3. Candy Kiln
    consider(baiState.farm.candyReadyAt);

    // 4. Fish Drying Racks
    if (Array.isArray(baiState.farm.racks)) {
      for (const r of baiState.farm.racks) {
        consider(r.readyAt);
      }
    }

    // 5. River Net Fish
    if (Array.isArray(baiState.farm.netFish)) {
      for (const f of baiState.farm.netFish) {
        consider(f.readyAt);
      }
    }

    // 6. Urgent: Sick Birds
    if (Array.isArray(baiState.farm.birds)) {
      for (const b of baiState.farm.birds) {
        consider(b.diesAt);
      }
    }
  }

  baiState.nextReadyAt = minReadyMs;
}

export function initAlluvialManager(): void {
  if (isInitialized) return;
  isInitialized = true;

  addBenWsMessageListener((msg: Record<string, unknown>) => {
    try {
      const t = msg.t as string | undefined;
      if (!t) return;

      switch (t) {
        case 'farmInfo': {
          const info = msg as unknown as BaiInfoData;
          baiState.info = info;
          baiState.hasLand = Boolean(info.land);
          if (typeof info.price === 'number') baiState.landPrice = info.price;
          if (typeof info.shells === 'number') baiState.shells = info.shells;
          if (typeof info.pearls === 'number') baiState.pearls = info.pearls;
          if (info.items && typeof info.items === 'object') {
            baiState.items = { ...info.items };
          }
          baiState.lastInfoAt = Date.now();
          break;
        }

        case 'landOk': {
          baiState.hasLand = true;
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          break;
        }

        case 'dryDex': {
          const items = Array.isArray(msg.items) ? msg.items : [];
          baiState.dryDex = {
            owner: (msg.owner as { me?: boolean; id?: string; name?: string }) ?? null,
            items: items as Array<{ id?: string; fish: string; size: number; price?: number }>,
            total: typeof msg.total === 'number' ? msg.total : items.length,
          };
          break;
        }

        case 'scene': {
          const kind = (msg.kind as string) || 'ben';
          baiState.kind = kind;
          if (msg.owner && typeof msg.owner === 'object') {
            baiState.owner = msg.owner as { me?: boolean; id?: string; name?: string };
          }
          if (msg.farm && typeof msg.farm === 'object') {
            baiState.farm = msg.farm as BaiFarmData;
            recalculateNextReadyAt();
          }
          break;
        }

        case 'farm': {
          if (msg.farm && typeof msg.farm === 'object') {
            baiState.farm = msg.farm as BaiFarmData;
            recalculateNextReadyAt();
          }
          break;
        }

        case 'plot': {
          const p = msg.plot as BaiPlotData | undefined;
          if (p && baiState.farm && Array.isArray(baiState.farm.plots)) {
            baiState.farm.plots = baiState.farm.plots.map((old) => (old.plot === p.plot ? p : old));
            recalculateNextReadyAt();
          }
          break;
        }

        case 'plotBatch': {
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...baiState.items, ...(msg.items as Record<string, number>) };
          }
          break;
        }

        case 'coco': {
          const tree = msg.tree as BaiCoconutData | undefined;
          if (tree && baiState.farm && Array.isArray(baiState.farm.coconuts)) {
            baiState.farm.coconuts = [
              ...baiState.farm.coconuts.filter((c) => c.slot !== tree.slot),
              tree,
            ].sort((a, b) => a.slot - b.slot);
            recalculateNextReadyAt();
          }
          break;
        }

        case 'farmItems':
        case 'netBought': {
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...baiState.items, ...(msg.items as Record<string, number>) };
          }
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          if (typeof msg.pearls === 'number') baiState.pearls = msg.pearls as number;
          break;
        }

        case 'cropSold':
        case 'eggSold':
        case 'specialtySold':
        case 'netSold':
        case 'cocoSold': {
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...baiState.items, ...(msg.items as Record<string, number>) };
          }
          break;
        }
      }
    } catch {
      // ignore
    }
  });

  // Query initial farmInfo and dryDex on wharf startup
  setTimeout(() => {
    sendBenWs({ t: 'farmInfo' });
    sendBenWs({ t: 'dryDex' });
  }, 1200);
}

export function getBaiSnapshot(): BaiSnapshotState | null {
  const baiStore = stores.bai;
  if (baiStore) {
    try {
      const b = baiStore.getState();
      if (b) {
        if (b.kind) baiState.kind = b.kind;
        if (b.info) {
          baiState.info = b.info;
          if (typeof b.info.land === 'boolean') baiState.hasLand = b.info.land;
          if (typeof b.info.price === 'number') baiState.landPrice = b.info.price;
          if (typeof b.info.shells === 'number') baiState.shells = b.info.shells;
          if (typeof b.info.pearls === 'number') baiState.pearls = b.info.pearls;
          if (b.info.items) baiState.items = { ...baiState.items, ...b.info.items };
        }
        if (b.farm) {
          baiState.farm = b.farm;
          recalculateNextReadyAt();
        }
        if (b.dryDex) baiState.dryDex = b.dryDex;
        if (b.owner) baiState.owner = b.owner;
      }
    } catch {
      // ignore
    }
  }

  return {
    kind: baiState.kind,
    hasLand: baiState.hasLand,
    landPrice: baiState.landPrice,
    shells: baiState.shells,
    pearls: baiState.pearls,
    items: baiState.items,
    farm: baiState.farm,
    info: baiState.info,
    dryDex: baiState.dryDex,
    owner: baiState.owner,
    nextReadyAt: baiState.nextReadyAt,
  };
}
