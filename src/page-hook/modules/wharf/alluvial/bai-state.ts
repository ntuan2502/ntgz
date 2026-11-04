import {
  BaiFarmData,
  BaiInfoData,
  BaiPlotData,
  BaiCoconutData,
  BaiDryDexData,
  BaiSnapshotState,
} from '../../../../shared/types/game-store';
import {
  stores,
  addBenWsMessageListener,
  getActiveScene,
} from '../../../core/engine-access';
import { BenDoPhaserScene } from '../types';

export interface PendingBaiSupplies {
  seeds?: { crop: string; qty: number } | null;
  sugar?: number;
  med?: number;
  netFeed?: number;
}

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
  lastSceneChangeAt: number;
  nextReadyAt: number;
  pendingSupplies: PendingBaiSupplies;
  boughtSuppliesForFarm: boolean;
  lastHtxCheckedAt: number;
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
  lastSceneChangeAt: 0,
  nextReadyAt: 0,
  pendingSupplies: {},
  boughtSuppliesForFarm: false,
  lastHtxCheckedAt: 0,
};

let isInitialized = false;
let lastSyncedStoreInfo: BaiInfoData | null = null;

interface SceneWalkTracker {
  sceneKey: string;
  expectedKind: string;
  targetX: number;
  targetY: number;
  startedAt: number;
  lastIssuedAt: number;
  arrivedAt: number;
}

let walkTracker: SceneWalkTracker | null = null;

export function resetBaiWalkTracker(): void {
  walkTracker = null;
}

export function closeBaiPanel(): void {
  if (stores.benUI?.getState()?.panel) {
    stores.benUI.setState({ panel: null });
  }
}

export function clickBaiPanelButton(textSubstring: string): boolean {
  const panelEl = document.querySelector('.panel.ben-panel') as HTMLElement | null;
  if (!panelEl) return false;
  const btns = Array.from(panelEl.querySelectorAll('button')) as HTMLButtonElement[];
  const targetBtn = btns.find(
    (b) => !b.disabled && (b.textContent || '').includes(textSubstring)
  );
  if (!targetBtn) return false;
  try {
    const opts = {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      isPrimary: true,
      button: 0,
    };
    targetBtn.dispatchEvent(new PointerEvent('pointerdown', opts));
    targetBtn.dispatchEvent(new PointerEvent('pointerup', opts));
    targetBtn.click();
    return true;
  } catch {
    return false;
  }
}

type ExtendedPhaserScene = BenDoPhaserScene & {
  kind?: string;
  grid?: {
    walkable?: (x: number, y: number) => boolean;
    nearestWalkable?: (x: number, y: number) => { x: number; y: number } | null;
  };
};

/**
 * Di chuyển nhân vật tới đúng ô tọa độ trên bản đồ (BenDoScene hoặc BaiScene) và đúng khu vực (`expectedKind`),
 * chờ nhân vật thực sự đi bộ tới nơi rồi mới mở bảng UI tương ứng trước khi thực hiện hành động.
 */
export function ensureAtSceneTile(
  sceneKey: 'BenDoScene' | 'BaiScene',
  expectedKind: 'ben' | 'bai' | 'farm',
  targetTile: { x: number; y: number },
  walkMsg: string,
  panelState?: { panel?: string; lotSel?: string; onOpen?: () => void },
  holdPanelMs = 600
): { ready: boolean; msg: string } {
  const now = Date.now();

  // 1. Phải đứng đúng khu vực (ben / bai / farm) mới được thao tác
  const storeKind = stores.bai?.getState()?.kind;
  if (storeKind && storeKind !== baiState.kind) {
    baiState.kind = storeKind;
    baiState.lastSceneChangeAt = now;
    walkTracker = null;
  }
  if (baiState.kind !== expectedKind) {
    return { ready: false, msg: walkMsg };
  }

  // 2. Chờ hiệu ứng chuyển cảnh (fadeOut 300ms-700ms + restart) của Phaser hoàn tất
  if (baiState.lastSceneChangeAt > 0 && now - baiState.lastSceneChangeAt < 900) {
    return { ready: false, msg: walkMsg };
  }

  // 3. Kiểm tra Phaser Scene và đối tượng nhân vật đã sẵn sàng
  const sc = getActiveScene(sceneKey) as unknown as ExtendedPhaserScene | null;
  if (!sc || typeof sc.goFarmer !== 'function' || !sc.farmer || !sc.farmer.tile) {
    return { ready: false, msg: walkMsg };
  }
  if (sceneKey === 'BaiScene' && sc.kind && sc.kind !== expectedKind) {
    return { ready: false, msg: walkMsg };
  }

  // 4. Đảm bảo ô đích là ô có thể đi bộ tới (nếu ô đích bị chặn bởi luống rau/vật cản, lấy ô đi bộ sát nhất)
  let effectiveTarget = targetTile;
  if (
    sc.grid &&
    typeof sc.grid.walkable === 'function' &&
    !sc.grid.walkable(targetTile.x, targetTile.y) &&
    typeof sc.grid.nearestWalkable === 'function'
  ) {
    const nearest = sc.grid.nearestWalkable(targetTile.x, targetTile.y);
    if (nearest) {
      effectiveTarget = nearest;
    }
  }

  if (
    !walkTracker ||
    walkTracker.sceneKey !== sceneKey ||
    walkTracker.expectedKind !== expectedKind ||
    walkTracker.targetX !== effectiveTarget.x ||
    walkTracker.targetY !== effectiveTarget.y
  ) {
    walkTracker = {
      sceneKey,
      expectedKind,
      targetX: effectiveTarget.x,
      targetY: effectiveTarget.y,
      startedAt: now,
      lastIssuedAt: 0,
      arrivedAt: 0,
    };
  }

  // 5. Kiểm tra khoảng cách thực tế của nhân vật (tuyệt đối không bỏ qua bước đi bộ khi chưa tới nơi)
  const cur = sc.farmer.tile;
  const dist = Math.abs(cur.x - effectiveTarget.x) + Math.abs(cur.y - effectiveTarget.y);

  if (dist > 2 || sc.farmer.running) {
    walkTracker.arrivedAt = 0;
    if (
      !sc.farmer.running &&
      (walkTracker.lastIssuedAt === 0 || now - walkTracker.lastIssuedAt > 1200)
    ) {
      closeBaiPanel();
      sc.goFarmer(effectiveTarget);
      walkTracker.lastIssuedAt = now;
    }
    return { ready: false, msg: walkMsg };
  }

  // 6. Nhân vật đã đứng tại điểm đích -> Mở bảng UI (nếu chưa mở) và giữ đủ thời gian như người thật
  const curOpenPanel = stores.benUI?.getState()?.panel;
  const curLotSel = stores.bai?.getState()?.lotSel;
  const isTargetPanelAlreadyOpen = Boolean(
    panelState?.panel &&
      curOpenPanel === panelState.panel &&
      (!panelState.lotSel || curLotSel === panelState.lotSel)
  );

  if (walkTracker.arrivedAt === 0) {
    walkTracker.arrivedAt = now;
    if (panelState) {
      if (!isTargetPanelAlreadyOpen) {
        if (panelState.lotSel && stores.bai) {
          stores.bai.setState({ lotSel: panelState.lotSel });
        }
        if (panelState.panel && stores.benUI) {
          stores.benUI.setState({ panel: panelState.panel });
        }
        if (panelState.onOpen) {
          panelState.onOpen();
        }
        if (holdPanelMs > 0) {
          return { ready: false, msg: walkMsg };
        }
      }
    }
  }

  const effectiveHoldMs = isTargetPanelAlreadyOpen ? Math.min(200, holdPanelMs) : holdPanelMs;
  if (panelState && effectiveHoldMs > 0 && now - walkTracker.arrivedAt < effectiveHoldMs) {
    return { ready: false, msg: walkMsg };
  }

  walkTracker = null;
  return { ready: true, msg: walkMsg };
}

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

export function hasPendingBaiSupplies(): boolean {
  const p = baiState.pendingSupplies;
  return Boolean(
    (p.seeds && p.seeds.qty > 0) ||
      (p.sugar && p.sugar > 0) ||
      (p.med && p.med > 0) ||
      (p.netFeed && p.netFeed > 0)
  );
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
        consider(c.matureAt);
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
          baiState.lastInfoAt = Date.now();
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
          if (baiState.kind !== kind) {
            baiState.lastSceneChangeAt = Date.now();
            walkTracker = null;
          }
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

        case 'farm':
        case 'lotDone':
        case 'harvested':
        case 'birdBought':
        case 'medBought':
        case 'yardDone': {
          if (msg.farm && typeof msg.farm === 'object') {
            baiState.farm = msg.farm as BaiFarmData;
            recalculateNextReadyAt();
          }
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          if (msg.specialty && typeof msg.specialty === 'object' && baiState.info) {
            baiState.info = {
              ...baiState.info,
              specialty: msg.specialty as BaiInfoData['specialty'],
            };
          }
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          if (typeof msg.pearls === 'number') baiState.pearls = msg.pearls as number;
          break;
        }

        case 'plot': {
          const p = msg.plot as BaiPlotData | undefined;
          if (p && baiState.farm && Array.isArray(baiState.farm.plots)) {
            baiState.farm.plots = baiState.farm.plots.map((old) => (old.plot === p.plot ? p : old));
            recalculateNextReadyAt();
          }
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          break;
        }

        case 'plotBatch': {
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
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
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          break;
        }

        case 'farmItems':
        case 'netBought': {
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          if (typeof msg.pearls === 'number') baiState.pearls = msg.pearls as number;
          break;
        }

        case 'mudDone': {
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          if (typeof msg.left === 'number' && baiState.farm) {
            baiState.farm.mudLeft = msg.left;
          }
          if (typeof msg.stamina === 'number') {
            const currentWallet = stores.benNet?.getState()?.wallet;
            if (currentWallet) {
              stores.benNet?.setState({
                wallet: { ...currentWallet, stamina: msg.stamina, liveStamina: msg.stamina },
              });
            }
          }
          break;
        }

        case 'cropSold':
        case 'eggSold':
        case 'specialtySold':
        case 'netSold':
        case 'cocoSold': {
          if (typeof msg.shells === 'number') baiState.shells = msg.shells as number;
          if (msg.items && typeof msg.items === 'object') {
            baiState.items = { ...(msg.items as Record<string, number>) };
          }
          break;
        }
      }
    } catch {
      // ignore
    }
  });
}

export function getBaiSnapshot(): BaiSnapshotState | null {
  initAlluvialManager();
  const baiStore = stores.bai;
  if (baiStore) {
    try {
      const b = baiStore.getState();
      if (b) {
        if (b.kind) {
          if (baiState.kind !== b.kind) {
            baiState.lastSceneChangeAt = Date.now();
            walkTracker = null;
          }
          baiState.kind = b.kind;
        }
        if (b.info && b.info !== lastSyncedStoreInfo) {
          lastSyncedStoreInfo = b.info;
          baiState.info = b.info;
          if (typeof b.info.land === 'boolean') baiState.hasLand = b.info.land;
          if (typeof b.info.price === 'number') baiState.landPrice = b.info.price;
          if (typeof b.info.shells === 'number') baiState.shells = b.info.shells;
          if (typeof b.info.pearls === 'number') baiState.pearls = b.info.pearls;
          if (b.info.items) baiState.items = { ...b.info.items };
          if (baiState.lastInfoAt === 0) baiState.lastInfoAt = Date.now();
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
    lastFarmSurveyAt: baiState.lastFarmSurveyAt,
    lastInfoAt: baiState.lastInfoAt,
  };
}
