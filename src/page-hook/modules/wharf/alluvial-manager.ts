import { AppConfig } from '../../../shared/types/config';
import {
  BaiFarmData,
  BaiInfoData,
  BaiPlotData,
  BaiCoconutData,
  BaiDryDexData,
} from '../../../shared/types/game-store';
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
  dryDex: BaiDryDexData | null;
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
  dryDex: null,
  owner: null,
  lastInfoAt: 0,
  lastFarmSurveyAt: 0,
  nextReadyAt: 0,
};

let transitState:
  | 'idle'
  | 'take_ferry_to_bai'
  | 'enter_farm'
  | 'work_farm'
  | 'at_bai_market'
  | 'wait_back_to_ben' = 'idle';
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

        case 'dryDex': {
          const items = Array.isArray(msg.items) ? msg.items : [];
          state.dryDex = {
            owner: (msg.owner as { me?: boolean; id?: string; name?: string }) ?? null,
            items: items as Array<{ id?: string; fish: string; size: number; price?: number }>,
            total: typeof msg.total === 'number' ? msg.total : items.length,
          };
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

        case 'cropSold':
        case 'eggSold':
        case 'specialtySold':
        case 'netSold': {
          if (typeof msg.shells === 'number') state.shells = msg.shells as number;
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

function recalculateNextReadyAt(): void {
  const nowSec = Math.floor(Date.now() / 1000);
  let minReadySec = 0;

  if (state.farm) {
    // 1. Alluvial Crop Plots
    if (Array.isArray(state.farm.plots)) {
      for (const p of state.farm.plots) {
        if (p.crop && p.state === 'growing' && typeof p.readyAt === 'number' && p.readyAt > nowSec) {
          if (minReadySec === 0 || p.readyAt < minReadySec) {
            minReadySec = p.readyAt;
          }
        }
      }
    }

    // 2. Coconut Trees
    if (Array.isArray(state.farm.coconuts)) {
      for (const c of state.farm.coconuts) {
        if (typeof c.readyAt === 'number' && c.readyAt > nowSec) {
          if (minReadySec === 0 || c.readyAt < minReadySec) {
            minReadySec = c.readyAt;
          }
        }
      }
    }

    // 3. Candy Kiln
    if (typeof state.farm.candyReadyAt === 'number' && state.farm.candyReadyAt > nowSec) {
      if (minReadySec === 0 || state.farm.candyReadyAt < minReadySec) {
        minReadySec = state.farm.candyReadyAt;
      }
    }

    // 4. Fish Drying Racks
    if (Array.isArray(state.farm.racks)) {
      for (const r of state.farm.racks) {
        if (typeof r.readyAt === 'number' && r.readyAt > nowSec) {
          if (minReadySec === 0 || r.readyAt < minReadySec) {
            minReadySec = r.readyAt;
          }
        }
      }
    }

    // 5. River Net Fish
    if (Array.isArray(state.farm.netFish)) {
      for (const f of state.farm.netFish) {
        if (typeof f.readyAt === 'number' && f.readyAt > nowSec) {
          if (minReadySec === 0 || f.readyAt < minReadySec) {
            minReadySec = f.readyAt;
          }
        }
      }
    }

    // 6. Urgent: Sick Birds
    if (Array.isArray(state.farm.birds)) {
      for (const b of state.farm.birds) {
        if (typeof b.diesAt === 'number' && b.diesAt > nowSec) {
          if (minReadySec === 0 || b.diesAt < minReadySec) {
            minReadySec = b.diesAt;
          }
        }
      }
    }
  }

  state.nextReadyAt = minReadySec > 0 ? minReadySec * 1000 : 0;
}

export function getBaiSnapshot(): BaiSnapshotState | null {
  // Sync latest from Zustand store Y if available
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
        if (b.dryDex) state.dryDex = b.dryDex;
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
    dryDex: state.dryDex,
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

  if (cfg.benSubEnabled?.alluvialLand === false) {
    return null;
  }

  const now = Date.now();
  const nowSec = Math.floor(now / 1000);

  // Sync latest store data
  getBaiSnapshot();

  // Failsafe timeout for stuck transit (30 seconds)
  if (transitState !== 'idle' && now - transitStartedAt > 30000) {
    transitState = 'idle';
    sendBenWs({ t: 'ferry' });
    return { acted: true, msg: '⚠️ Đất Bãi: Hết thời gian chờ đò, đang quay lại Bến Đò...', allowCast: false };
  }

  // State 0: IDLE AT BẾN ĐÒ
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
      transitReason = 'Khảo sát nông trại & công trình bãi bồi';
    } else if (state.nextReadyAt > 0 && now >= state.nextReadyAt) {
      shouldTransit = true;
      transitReason = 'Nông sản, kẹo, cá hoặc dừa đã đến giờ chín!';
    } else if (now - state.lastFarmSurveyAt > 15 * 60 * 1000) {
      shouldTransit = true;
      transitReason = 'Kiểm tra chu kỳ định kỳ đất bãi';
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
        msg: '🌾 Đất Bãi: Đã vào vườn đất của mình, bắt đầu vận hành hệ sinh thái...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚪 Đang bước vào vườn đất bãi...', allowCast: false };
  }

  // State 3: WORKING ON FARM (Comprehensive Phase 1, 2, 3 workflow)
  if (transitState === 'work_farm') {
    if (now - lastWorkStepAt < 650) {
      return { acted: true, msg: '🌱 Đang chăm sóc đất bãi...', allowCast: false };
    }

    const farm = state.farm;
    if (!farm) {
      transitState = 'at_bai_market';
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

    // Step 7 (Phase 2): Candy Kiln
    if (workStep === 7) {
      workStep = 8;
      lastWorkStepAt = now;
      if (cfg.benAutoCandy !== false) {
        // A. Collect ready cooked candy
        if (typeof farm.candyReadyAt === 'number' && farm.candyReadyAt <= nowSec) {
          sendBenWs({ t: 'candyCollect' });
          return {
            acted: true,
            msg: '🍬 Lò Kẹo Dừa: Kẹo dừa đã nấu chín, đang lấy ra lò...',
            allowCast: false,
          };
        }

        // B. If kiln is empty, prepare and start a batch
        if (farm.candyReadyAt === null) {
          const recipe = state.info?.candyRecipe || { coco: 2, sugar: 1, out: 5, price: 350 };
          const cocoCount = (state.items['coconut'] || state.items['coconuts'] || state.items['coco'] || 0);
          const sugarCount = state.items['sugar'] || 0;

          if (cocoCount >= recipe.coco) {
            if (sugarCount < recipe.sugar && cfg.benAutoBuySugar !== false) {
              const missingSugar = recipe.sugar - sugarCount;
              sendBenWs({ t: 'supplyBuy', item: 'sugar', qty: missingSugar });
              return {
                acted: true,
                msg: `🍬 Lò Kẹo Dừa: Đã mua ${missingSugar} ký đường mía để nấu kẹo...`,
                allowCast: false,
              };
            }

            if (sugarCount >= recipe.sugar) {
              sendBenWs({ t: 'candyStart' });
              return {
                acted: true,
                msg: `🔥 Lò Kẹo Dừa: Đã nhóm lửa nấu mẻ kẹo dừa mới (${recipe.coco} 🥥 + ${recipe.sugar}kg đường)!`,
                allowCast: false,
              };
            }
          }
        }
      }
    }

    // Step 8 (Phase 2): Fish Drying Racks & DryDex
    if (workStep === 8) {
      workStep = 9;
      lastWorkStepAt = now;
      if (cfg.benAutoDryFish !== false) {
        // A. Collect dried fish from ready racks
        const racks = farm.racks || [];
        const readyRacks = racks.filter((r) => r.readyAt <= nowSec);
        if (readyRacks.length > 0) {
          sendBenWs({ t: 'dryCollect' });
          return {
            acted: true,
            msg: `🐟 Sân Phơi Khô Cá: Thu hoạch ${readyRacks.length} con cá đã phơi khô!`,
            allowCast: false,
          };
        }

        // B. Put into DryDex collection book
        if (cfg.benAutoDryDexPut !== false && state.info?.specialty?.driedList) {
          const driedList = state.info.specialty.driedList;
          const dexMap = new Map((state.dryDex?.items || []).map((x) => [x.fish, x.size]));
          const candidateDex = driedList.find((d) => !dexMap.has(d.fish) || d.size > (dexMap.get(d.fish) || 0));

          if (candidateDex) {
            sendBenWs({ t: 'dryDexPut', id: candidateDex.id });
            return {
              acted: true,
              msg: `📜 Sổ Khô Cá: Đã cất khô cá ${candidateDex.fish} (${candidateDex.size}cm) vào bộ sưu tập (+⭐ Nổi tiếng)!`,
              allowCast: false,
            };
          }
        }

        // C. Put fish from basket onto empty racks
        const maxRacks = 6 + ((farm.dryLv || 1) - 1) * 2;
        const emptyRackCount = Math.max(0, maxRacks - racks.length);
        const basket = stores.benNet?.getState().basket || [];
        const dryableCandidates = basket.filter(
          (f: { id?: string; kept?: boolean; odd?: boolean; rainbow?: boolean }) =>
            Boolean(f.id && !f.kept && !f.odd && !f.rainbow)
        );

        if (emptyRackCount > 0 && dryableCandidates.length > 0) {
          const fishToDry = dryableCandidates[0];
          sendBenWs({ t: 'dryPut', fish: fishToDry.id });
          return {
            acted: true,
            msg: `🐟 Sân Phơi Khô Cá: Đã đưa cá ${fishToDry.fish || 'câu bến'} lên nong phơi!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 9 (Phase 3): Poultry Coop
    if (workStep === 9) {
      workStep = 10;
      lastWorkStepAt = now;
      if (cfg.benAutoCoop !== false) {
        const birds = farm.birds || [];

        // A. Pick eggs in nest
        const totalEggs = birds.reduce((s, b) => s + (b.eggs || 0), 0);
        if (totalEggs > 0) {
          sendBenWs({ t: 'eggPick' });
          return {
            acted: true,
            msg: `🥚 Chuồng Gà Vịt: Đã nhặt ${totalEggs} quả trứng gà/vịt từ ổ rơm!`,
            allowCast: false,
          };
        }

        // B. Cure sick birds
        const sickBirds = birds.filter((b) => b.diesAt !== null);
        if (sickBirds.length > 0 && cfg.benAutoCureBirds !== false) {
          const medCount = state.items['med'] || 0;
          if (medCount < sickBirds.length) {
            const missingMed = sickBirds.length - medCount;
            sendBenWs({ t: 'medBuy', qty: missingMed });
            return {
              acted: true,
              msg: `💊 Tiệm Bà Bảy: Đã mua ${missingMed} liều thuốc chữa bệnh gia cầm...`,
              allowCast: false,
            };
          }

          sendBenWs({ t: 'birdCure' });
          return {
            acted: true,
            msg: `💊 Chuồng Gà Vịt: Đã cho ${sickBirds.length} con gia cầm uống thuốc chữa bệnh!`,
            allowCast: false,
          };
        }

        // C. Put newly bought poultry into coop
        const boughtPoultryCount = (state.items['hen'] || 0) + (state.items['duck'] || 0);
        if (boughtPoultryCount > 0) {
          sendBenWs({ t: 'birdPut' });
          return {
            acted: true,
            msg: `🐔 Chuồng Gà Vịt: Đã thả gia cầm mới vào chuồng nuôi!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 10 (Phase 3): River Net Fish
    if (workStep === 10) {
      workStep = 11;
      lastWorkStepAt = now;
      if (cfg.benAutoNet !== false) {
        const netFish = farm.netFish || [];

        // A. Pull net for adult fish
        const adultFish = netFish.filter((f) => f.readyAt <= nowSec);
        if (adultFish.length > 0) {
          sendBenWs({ t: 'netPull' });
          return {
            acted: true,
            msg: `🎣 Lưới Quây Nuôi Cá: Kéo lưới thu hoạch ${adultFish.length} con cá trưởng thành!`,
            allowCast: false,
          };
        }

        // B. Feed hungry fish
        const isHungry = netFish.some((f) => f.hungry);
        if (isHungry && cfg.benAutoFeedNet !== false) {
          const feedFishRatio = state.info?.net?.feedFish || 5;
          const neededFeed = Math.max(1, Math.ceil(netFish.length / feedFishRatio));
          const currentFeed = state.items['netFeed'] || 0;

          if (currentFeed < neededFeed) {
            const missingFeed = neededFeed - currentFeed;
            sendBenWs({ t: 'netBuy', kind: 'feed', qty: missingFeed });
            return {
              acted: true,
              msg: `🌾 Ghe Anh Mười: Đã mua ${missingFeed} bao cám nuôi cá sông...`,
              allowCast: false,
            };
          }

          sendBenWs({ t: 'netFeed' });
          return {
            acted: true,
            msg: `🌾 Lưới Quây Nuôi Cá: Đã rải cám cho đàn cá sông ăn no!`,
            allowCast: false,
          };
        }

        // C. Put fry into net
        const hasFry = Object.keys(state.items).some((k) => k.startsWith('fry:') && state.items[k] > 0);
        if (hasFry) {
          sendBenWs({ t: 'netPut' });
          return {
            acted: true,
            msg: `🐟 Lưới Quây Nuôi Cá: Đã thả cá giống vào khúc sông quây lưới!`,
            allowCast: false,
          };
        }
      }
    }

    // Step 11: Done farm operations, transition to Chợ Bãi
    recalculateNextReadyAt();
    transitState = 'at_bai_market';
    sendBenWs({ t: 'farmExit' });
    return {
      acted: true,
      msg: '🌾 Đất Bãi: Đã hoàn tất việc vườn, đang ra Chợ Bãi giao thương...',
      allowCast: false,
    };
  }

  // State 4: AT CHỢ BÃI (Sell specialties, eggs, fish, vegetables, then take ferry)
  if (transitState === 'at_bai_market') {
    if (state.kind === 'bai') {
      // 1. Sell coconuts if enabled
      const cocoCount = state.items['coconuts'] || state.items['coco'] || 0;
      if (cfg.benAutoCocoSell && cocoCount > 0) {
        sendBenWs({ t: 'cocoSell', pick: { coco: cocoCount } });
        return {
          acted: true,
          msg: `🥥 Chợ Bãi: Đã bán ${cocoCount} trái dừa xiêm tại quán cà phê chòi...`,
          allowCast: false,
        };
      }

      // 2. Sell specialties (candy + dried fish) to Cô Hai
      const candyCount = cfg.benAutoCandySell ? (state.items['candy'] || 0) : 0;
      const driedCount = cfg.benAutoDryFishSell ? (state.info?.specialty?.dried || 0) : 0;
      if (candyCount > 0 || driedCount > 0) {
        sendBenWs({
          t: 'specialtySell',
          pick: {
            ...(candyCount > 0 ? { candy: candyCount } : {}),
            ...(driedCount > 0 ? { dried: driedCount } : {}),
          },
        });
        return {
          acted: true,
          msg: `🏪 Tiệm Cô Hai: Đã bán ${candyCount} thanh kẹo dừa & ${driedCount} con khô cá đặc sản!`,
          allowCast: false,
        };
      }

      // 3. Sell eggs to Chú Năm
      const henEggs = cfg.benAutoEggSell ? (state.items['eggHen'] || 0) : 0;
      const duckEggs = cfg.benAutoEggSell ? (state.items['eggDuck'] || 0) : 0;
      if (henEggs > 0 || duckEggs > 0) {
        sendBenWs({
          t: 'eggSell',
          pick: {
            ...(henEggs > 0 ? { eggHen: henEggs } : {}),
            ...(duckEggs > 0 ? { eggDuck: duckEggs } : {}),
          },
        });
        return {
          acted: true,
          msg: `🥚 Sạp Chú Năm: Đã bán ${henEggs} trứng gà & ${duckEggs} trứng vịt lấy vỏ sò!`,
          allowCast: false,
        };
      }

      // 4. Sell crops to Ghe Lái Tư
      if (cfg.benAutoBaiSellCrops !== false) {
        const cropKeys = Object.keys(state.items).filter((k) => k.startsWith('crop:') && state.items[k] > 0);
        if (cropKeys.length > 0) {
          const pick: Record<string, number> = {};
          for (const k of cropKeys) {
            pick[k] = state.items[k];
          }
          sendBenWs({ t: 'cropSell', pick });
          return {
            acted: true,
            msg: `🛶 Ghe Lái Tư: Đã bán ${cropKeys.length} loại rau củ phù sa thu hoạch được!`,
            allowCast: false,
          };
        }
      }

      // 5. Board ferry back to Bến Đò
      transitState = 'wait_back_to_ben';
      sendBenWs({ t: 'ferry' });
      return {
        acted: true,
        msg: '⛵ Chợ Bãi: Đang lên đò Ông Tám quay về Bến Đò câu cá tiếp...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚶 Đang di chuyển trong Chợ Bãi...', allowCast: false };
  }

  // State 5: BACK AT BẾN ĐÒ
  if (transitState === 'wait_back_to_ben') {
    if (state.kind === 'ben') {
      transitState = 'idle';
      const nextTimeStr = state.nextReadyAt > 0
        ? new Date(state.nextReadyAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : 'đang tính';
      return {
        acted: true,
        msg: `🎉 Đã về tới Bến Đò! Tiếp tục câu cá (chu kỳ chăm sóc kế tiếp lúc ${nextTimeStr}).`,
        allowCast: true,
      };
    }
    return { acted: true, msg: '⛵ Đang sang sông về Bến Đò...', allowCast: false };
  }

  return null;
}
