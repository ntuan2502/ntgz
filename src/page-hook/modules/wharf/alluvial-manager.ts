import { AppConfig } from '../../../shared/types/config';
import { BaiFarmData, BaiInfoData, BaiPlotData, BaiCoconutData } from '../../../shared/types/game-store';
import { BaiSnapshotState } from '../../../shared/types/game-state';
import { stores, sendBenWs, addBenWsMessageListener } from '../../core/engine-access';

export interface AlluvialManagerState {
  kind: 'ben' | 'bai' | 'farm' | 'home' | string;
  hasLand: boolean;
  landPrice: number;
  shells: number;
  pearls: number;
  items: Record<string, number>;
  farm: BaiFarmData | null;
  info: BaiInfoData | null;
  owner: { me?: boolean; id?: string; name?: string } | null;
  lastInfoAt: number;
  lastFarmSurveyAt: number;
  nextReadyAt: number;
}

const state: AlluvialManagerState = {
  kind: 'ben',
  hasLand: false,
  landPrice: 100000,
  shells: 0,
  pearls: 0,
  items: {},
  farm: null,
  info: null,
  owner: null,
  lastInfoAt: 0,
  lastFarmSurveyAt: 0,
  nextReadyAt: 0,
};

let transitState: 'idle' | 'take_ferry_to_bai' | 'enter_farm' | 'work_farm' | 'exit_to_bai_sell' | 'exit_to_bai' | 'wait_back_to_ben' = 'idle';
let transitStartedAt = 0;
let lastWorkStepAt = 0;
let workStep = 0;
let isInitialized = false;

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
          state.info = info;
          state.hasLand = Boolean(info.land);
          if (typeof info.price === 'number') state.landPrice = info.price;
          if (typeof info.shells === 'number') state.shells = info.shells;
          if (typeof info.pearls === 'number') state.pearls = info.pearls;
          if (info.items && typeof info.items === 'object') {
            state.items = { ...state.items, ...info.items };
          }
          state.lastInfoAt = Date.now();
          break;
        }

        case 'landOk': {
          state.hasLand = true;
          if (typeof msg.shells === 'number') state.shells = msg.shells as number;
          break;
        }

        case 'scene': {
          const kind = (msg.kind as string) || 'ben';
          state.kind = kind;
          if (msg.owner && typeof msg.owner === 'object') {
            state.owner = msg.owner as { me?: boolean; id?: string; name?: string };
          }
          if (msg.farm && typeof msg.farm === 'object') {
            state.farm = msg.farm as BaiFarmData;
            recalculateNextReadyAt();
          }
          break;
        }

        case 'farm': {
          if (msg.farm && typeof msg.farm === 'object') {
            state.farm = msg.farm as BaiFarmData;
            recalculateNextReadyAt();
          }
          break;
        }

        case 'plot': {
          const p = msg.plot as BaiPlotData | undefined;
          if (p && state.farm && Array.isArray(state.farm.plots)) {
            state.farm.plots = state.farm.plots.map((old) => (old.plot === p.plot ? p : old));
            recalculateNextReadyAt();
          }
          break;
        }

        case 'plotBatch': {
          if (msg.items && typeof msg.items === 'object') {
            state.items = { ...state.items, ...(msg.items as Record<string, number>) };
          }
          break;
        }

        case 'coco': {
          const tree = msg.tree as BaiCoconutData | undefined;
          if (tree && state.farm && Array.isArray(state.farm.coconuts)) {
            state.farm.coconuts = [
              ...state.farm.coconuts.filter((c) => c.slot !== tree.slot),
              tree,
            ].sort((a, b) => a.slot - b.slot);
            recalculateNextReadyAt();
          }
          break;
        }

        case 'farmItems': {
          if (msg.items && typeof msg.items === 'object') {
            state.items = { ...state.items, ...(msg.items as Record<string, number>) };
          }
          if (typeof msg.shells === 'number') state.shells = msg.shells as number;
          if (typeof msg.pearls === 'number') state.pearls = msg.pearls as number;
          break;
        }

        case 'cropSold': {
          if (typeof msg.shells === 'number') state.shells = msg.shells as number;
          break;
        }
      }
    } catch {
      // ignore
    }
  });

  // Query initial farmInfo on wharf startup
  setTimeout(() => {
    sendBenWs({ t: 'farmInfo' });
  }, 1200);
}

function recalculateNextReadyAt(): void {
  const nowSec = Math.floor(Date.now() / 1000);
  let minReadySec = 0;

  if (state.farm) {
    if (Array.isArray(state.farm.plots)) {
      for (const p of state.farm.plots) {
        if (p.crop && p.state === 'growing' && typeof p.readyAt === 'number' && p.readyAt > nowSec) {
          if (minReadySec === 0 || p.readyAt < minReadySec) {
            minReadySec = p.readyAt;
          }
        }
      }
    }

    if (Array.isArray(state.farm.coconuts)) {
      for (const c of state.farm.coconuts) {
        if (typeof c.readyAt === 'number' && c.readyAt > nowSec) {
          if (minReadySec === 0 || c.readyAt < minReadySec) {
            minReadySec = c.readyAt;
          }
        }
      }
    }
  }

  state.nextReadyAt = minReadySec > 0 ? minReadySec * 1000 : 0;
}

export function getBaiSnapshot(): BaiSnapshotState | null {
  // Pull from Zustand store Y if available
  const baiStore = stores.bai;
  if (baiStore) {
    try {
      const b = baiStore.getState();
      if (b) {
        if (b.kind) state.kind = b.kind;
        if (b.info) {
          state.info = b.info;
          if (typeof b.info.land === 'boolean') state.hasLand = b.info.land;
          if (typeof b.info.price === 'number') state.landPrice = b.info.price;
          if (typeof b.info.shells === 'number') state.shells = b.info.shells;
          if (typeof b.info.pearls === 'number') state.pearls = b.info.pearls;
          if (b.info.items) state.items = { ...state.items, ...b.info.items };
        }
        if (b.farm) {
          state.farm = b.farm;
          recalculateNextReadyAt();
        }
        if (b.owner) state.owner = b.owner;
      }
    } catch {
      // ignore
    }
  }

  return {
    kind: state.kind,
    hasLand: state.hasLand,
    landPrice: state.landPrice,
    shells: state.shells,
    pearls: state.pearls,
    items: state.items,
    farm: state.farm,
    info: state.info,
    owner: state.owner,
    nextReadyAt: state.nextReadyAt,
  };
}

export interface AlluvialStepResult {
  acted: boolean;
  msg?: string;
  allowCast?: boolean;
}

export function stepAlluvial(cfg: AppConfig): AlluvialStepResult | null {
  initAlluvialManager();

  // If alluvialLand sub-area is disabled in config, skip
  if (cfg.benSubEnabled?.alluvialLand === false) {
    return null;
  }

  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  // Sync latest store data
  getBaiSnapshot();

  // Failsafe timeout for stuck transit (25 seconds)
  if (transitState !== 'idle' && now - transitStartedAt > 25000) {
    transitState = 'idle';
    sendBenWs({ t: 'ferry' });
    return { acted: true, msg: '⚠️ Đất Bãi: Hết thời gian chờ đò, đang quay lại Bến Đò...', allowCast: false };
  }

  // State 0: IDLE
  if (transitState === 'idle') {
    // A. Check Land Purchase
    if (!state.hasLand) {
      if (cfg.benAutoBuyLand && state.shells >= state.landPrice) {
        sendBenWs({ t: 'land' });
        return {
          acted: true,
          msg: `🌾 Đất Bãi: Tự động mua giấy tay đất bãi Ông Tám (${state.landPrice.toLocaleString('vi-VN')} 🐚)...`,
          allowCast: false,
        };
      }
      return null;
    }

    // B. Check if Auto Ferry Transit is enabled
    if (!cfg.benAutoBaiFerry) {
      return null;
    }

    // C. Check if we need to visit the farm ("Khi có việc thôi")
    let shouldTransit = false;
    let transitReason = '';

    if (state.lastFarmSurveyAt === 0) {
      shouldTransit = true;
      transitReason = 'Kiểm tra vụ mùa ban đầu';
    } else if (state.nextReadyAt > 0 && now >= state.nextReadyAt) {
      shouldTransit = true;
      transitReason = 'Đã đến giờ thu hoạch rau/dừa!';
    } else if (now - state.lastFarmSurveyAt > 15 * 60 * 1000) {
      shouldTransit = true;
      transitReason = 'Kiểm tra định kỳ luống đất bãi';
    }

    if (shouldTransit) {
      transitState = 'take_ferry_to_bai';
      transitStartedAt = now;
      sendBenWs({ t: 'ferry' });
      return {
        acted: true,
        msg: `🌾 Đất Bãi: ${transitReason} -> Đang lên đò Ông Tám qua Chợ Bãi...`,
        allowCast: false,
      };
    }

    return null;
  }

  // State 1: WAITING TO REACH CHỢ BÃI
  if (transitState === 'take_ferry_to_bai') {
    if (state.kind === 'bai') {
      transitState = 'enter_farm';
      sendBenWs({ t: 'farmGo', to: 'me' });
      return {
        acted: true,
        msg: '🏡 Đất Bãi: Đã tới Chợ Bãi, đang vào đường vô đất của mình...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '⛵ Đang chèo đò qua Chợ Bãi...', allowCast: false };
  }

  // State 2: ENTERING FARM
  if (transitState === 'enter_farm') {
    if (state.kind === 'farm' && state.farm) {
      state.lastFarmSurveyAt = now;
      transitState = 'work_farm';
      workStep = 0;
      lastWorkStepAt = now;
      return {
        acted: true,
        msg: '🌾 Đất Bãi: Đã vào vườn đất của mình, chuẩn bị chăm sóc...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚪 Đang bước vào vườn đất bãi...', allowCast: false };
  }

  // State 3: WORKING ON FARM (Harvest -> Spray -> CocoPick -> Plant -> Water -> Fert)
  if (transitState === 'work_farm') {
    if (now - lastWorkStepAt < 650) {
      return { acted: true, msg: '🌱 Đang chăm sóc đất bãi...', allowCast: false };
    }

    const farm = state.farm;
    if (!farm) {
      transitState = 'exit_to_bai';
      sendBenWs({ t: 'farmExit' });
      return { acted: true, msg: '🌾 Rời vườn...', allowCast: false };
    }

    const plots = farm.plots || [];
    const coconuts = farm.coconuts || [];

    // Step 0: Harvest ripe plots
    if (workStep === 0) {
      workStep = 1;
      lastWorkStepAt = now;
      if (cfg.benAutoBaiCrops !== false) {
        const ripePlots = plots.filter(
          (p) => p.state === 'ripe' || (p.state === 'growing' && typeof p.readyAt === 'number' && p.readyAt <= nowSec)
        );
        if (ripePlots.length > 0) {
          sendBenWs({ t: 'plotBatch', act: 'harvest', plots: ripePlots.map((p) => p.plot) });
          return {
            acted: true,
            msg: `🧺 Đất Bãi: Đã thu hoạch ${ripePlots.length} luống rau chín!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 1: Spray pests
    if (workStep === 1) {
      workStep = 2;
      lastWorkStepAt = now;
      if (cfg.benAutoBaiCrops !== false) {
        const pestPlots = plots.filter(
          (p) => Boolean(p.crop) && typeof p.pestAt === 'number' && p.pestAt <= nowSec
        );
        if (pestPlots.length > 0) {
          sendBenWs({ t: 'plotBatch', act: 'spray', plots: pestPlots.map((p) => p.plot) });
          return {
            acted: true,
            msg: `🐛 Đất Bãi: Đã bắt sâu & phun thuốc ${pestPlots.length} luống rau!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 2: Pick coconuts
    if (workStep === 2) {
      workStep = 3;
      lastWorkStepAt = now;
      if (cfg.benAutoCocoPick !== false) {
        const readyCocos = coconuts.filter(
          (c) => typeof c.readyAt === 'number' && c.readyAt <= nowSec
        );
        if (readyCocos.length > 0) {
          for (const c of readyCocos) {
            sendBenWs({ t: 'cocoPick', slot: c.slot });
          }
          return {
            acted: true,
            msg: `🥥 Đất Bãi: Đã hái ${readyCocos.length} trái dừa xiêm chín!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 3: Plant coconuts
    if (workStep === 3) {
      workStep = 4;
      lastWorkStepAt = now;
      if (cfg.benAutoCocoPick !== false && (state.items['coco'] || 0) > 0) {
        const occupiedSlots = new Set(coconuts.map((c) => c.slot));
        const availableSlots = [0, 1, 2, 3].filter((s) => !occupiedSlots.has(s));
        if (availableSlots.length > 0) {
          const slotToPlant = availableSlots[0];
          sendBenWs({ t: 'cocoPlant', slot: slotToPlant });
          return {
            acted: true,
            msg: `🌴 Đất Bãi: Đã trồng cây dừa con vào vị trí số ${slotToPlant + 1}!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 4: Plant empty plots
    if (workStep === 4) {
      workStep = 5;
      lastWorkStepAt = now;
      if (cfg.benAutoBaiCrops !== false) {
        const emptyPlots = plots.filter((p) => p.state === 'empty');
        if (emptyPlots.length > 0) {
          const preferCrop = cfg.benBaiPreferCrop || 'rauMuong';
          const seedKey = `seed:${preferCrop}`;
          const currentSeeds = state.items[seedKey] || 0;
          const missingSeeds = Math.max(0, emptyPlots.length - currentSeeds);

          if (missingSeeds > 0) {
            sendBenWs({ t: 'seedBuy', crop: preferCrop, qty: missingSeeds });
          }

          sendBenWs({
            t: 'plotBatch',
            act: 'plant',
            plots: emptyPlots.map((p) => p.plot),
            crop: preferCrop,
          });

          return {
            acted: true,
            msg: `🌱 Đất Bãi: Gieo ${emptyPlots.length} luống hạt giống ${preferCrop}!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 5: Water dry plots
    if (workStep === 5) {
      workStep = 6;
      lastWorkStepAt = now;
      if (cfg.benAutoBaiCrops !== false) {
        const dryPlots = plots.filter((p) => p.state === 'dry');
        if (dryPlots.length > 0) {
          sendBenWs({ t: 'plotBatch', act: 'water', plots: dryPlots.map((p) => p.plot) });
          return {
            acted: true,
            msg: `💧 Đất Bãi: Đã tưới nước ${dryPlots.length} luống rau!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 6: Fertilize plots
    if (workStep === 6) {
      workStep = 7;
      lastWorkStepAt = now;
      const fertCount = (state.items['fert'] || 0) + (state.items['fertBio'] || 0);
      if (fertCount > 0) {
        const unfertilized = plots.filter(
          (p) => !p.fert && Boolean(p.crop) && (p.state === 'dry' || p.state === 'growing')
        );
        if (unfertilized.length > 0) {
          sendBenWs({ t: 'plotBatch', act: 'fert', plots: unfertilized.map((p) => p.plot) });
          return {
            acted: true,
            msg: `🌿 Đất Bãi: Đã bón phân ${unfertilized.length} luống rau!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 7: Done working! Recalculate timing and prepare to exit
    recalculateNextReadyAt();

    // Check if coco sell is requested
    const cocoCount = state.items['coconuts'] || state.items['coco'] || 0;
    if (cfg.benAutoCocoSell && cocoCount > 0) {
      transitState = 'exit_to_bai_sell';
      sendBenWs({ t: 'farmExit' });
      return {
        acted: true,
        msg: `🥥 Đất Bãi: Chăm sóc xong, đem ${cocoCount} trái dừa ra Chợ Bãi bán...`,
        allowCast: false,
      };
    }

    transitState = 'exit_to_bai';
    sendBenWs({ t: 'farmExit' });
    return {
      acted: true,
      msg: '✅ Đất Bãi: Đã hoàn tất mọi việc, đang rời vườn quay lại Chợ Bãi...',
      allowCast: false,
    };
  }

  // State 4: AT CHỢ BÃI SELLING COCONUTS
  if (transitState === 'exit_to_bai_sell') {
    if (state.kind === 'bai') {
      const cocoCount = state.items['coconuts'] || state.items['coco'] || 0;
      if (cocoCount > 0) {
        sendBenWs({ t: 'cocoSell', pick: { coco: cocoCount } });
      }
      transitState = 'exit_to_bai';
      return {
        acted: true,
        msg: `🥥 Đất Bãi: Đã bán dừa cho sạp Chợ Bãi, chuẩn bị lên đò...`,
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚶 Đang ra Chợ Bãi...', allowCast: false };
  }

  // State 5: RETURNING VIA FERRY
  if (transitState === 'exit_to_bai') {
    if (state.kind === 'bai') {
      transitState = 'wait_back_to_ben';
      sendBenWs({ t: 'ferry' });
      return {
        acted: true,
        msg: '⛵ Đất Bãi: Đang lên đò Ông Tám quay về Bến Đò câu cá tiếp...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚶 Đang đi về bến đò...', allowCast: false };
  }

  // State 6: BACK AT BẾN ĐÒ
  if (transitState === 'wait_back_to_ben') {
    if (state.kind === 'ben') {
      transitState = 'idle';
      const nextTimeStr = state.nextReadyAt > 0
        ? new Date(state.nextReadyAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : 'đang tính';
      return {
        acted: true,
        msg: `🎉 Đã về tới Bến Đò! Tiếp tục câu cá (hẹn chăm sóc vụ sau lúc ${nextTimeStr}).`,
        allowCast: true,
      };
    }
    return { acted: true, msg: '⛵ Đang sang sông về Bến Đò...', allowCast: false };
  }

  return null;
}
