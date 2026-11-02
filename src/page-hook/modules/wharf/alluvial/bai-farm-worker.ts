import { AppConfig } from '../../../../shared/types/config';
import { stores, sendBenWs } from '../../../core/engine-access';
import {
  baiState,
  toTimestampMs,
  getBaiServerNowMs,
  ensureAtSceneTile,
  closeBaiPanel,
} from './bai-state';

const COCO_TREE_XS = [3, 7, 11, 15, 19, 23];
const CANDY_LOT_TILE = { x: 41, y: 15 };
const DRYFISH_LOT_TILE = { x: 41, y: 20 };
const COOP_TILE = { x: 40, y: 8 };
const NET_TILE = { x: 39, y: 3 };

/**
 * Trả về ô đường đi bộ ngay phía trước thửa ruộng `parcelIdx` (0..8).
 * Trong BaiScene (farm), mỗi thửa `PZ(parcelIdx)` chiếm 6x4 ô không đi vào được,
 * lối đi bộ hợp lệ nằm ngay cạnh dưới `y = py + 4`.
 */
function getParcelWorkTile(parcelIdx: number): { x: number; y: number } {
  const px = 3 + (parcelIdx % 3) * 7;
  const py = 6 + Math.floor(parcelIdx / 3) * 5;
  return { x: px + 2, y: py + 4 };
}

export interface AlluvialStepResult {
  acted: boolean;
  msg?: string;
  allowCast?: boolean;
  doneFarm?: boolean;
}

/**
 * Thực thi tuần tự các bước chăm sóc trên mảnh đất Bãi Phù Sa của người chơi (bắt buộc `baiState.kind === 'farm'`).
 * Di chuyển nhân vật tới đúng từng phân khu (từng thửa rau, gốc dừa, lò kẹo, sân phơi, chuồng gà, lưới cá)
 * và mở bảng UI tương ứng trước khi gửi lệnh WebSocket để vượt qua kiểm tra vị trí của máy chủ.
 */
export function runBaiFarmWorkStep(
  cfg: AppConfig,
  currentWorkStep: number
): { nextWorkStep: number; result: AlluvialStepResult } {
  if (baiState.kind !== 'farm') {
    return {
      nextWorkStep: currentWorkStep,
      result: {
        acted: true,
        msg: '⏳ Đất Bãi: Đang chờ nhân vật bước vào khu vực Đất của mình...',
        allowCast: false,
      },
    };
  }

  const farm = baiState.farm;
  if (!farm) {
    return {
      nextWorkStep: 11,
      result: { acted: true, msg: '🌾 Rời vườn...', allowCast: false, doneFarm: true },
    };
  }

  const nowMs = getBaiServerNowMs();
  const plots = farm.plots || [];
  const coconuts = farm.coconuts || [];
  let step = currentWorkStep;

  // Step 0: Harvest ripe plots (parcel by parcel, walking to each parcel)
  if (step === 0) {
    if (cfg.benAutoBaiCrops !== false) {
      const ripePlots = plots.filter(
        (p) =>
          p.state === 'ripe' ||
          (p.state === 'growing' && typeof p.readyAt === 'number' && toTimestampMs(p.readyAt) <= nowMs)
      );
      if (ripePlots.length > 0) {
        const parcelIdx = Math.floor(ripePlots[0].plot / 6);
        const parcelPlots = ripePlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        const targetTile = getParcelWorkTile(parcelIdx);
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          targetTile,
          `🚶 Đất Bãi: Đang đi lại thửa số ${parcelIdx + 1} (${targetTile.x}, ${targetTile.y}) thu hoạch ${parcelPlots.length} luống chín...`,
          { onOpen: () => stores.bai?.setState({ tool: 'harvest' }) },
          250
        );
        if (!walk.ready) {
          return { nextWorkStep: 0, result: { acted: true, msg: walk.msg, allowCast: false } };
        }
        sendBenWs({ t: 'plotBatch', act: 'harvest', plots: parcelPlots.map((p) => p.plot) });
        for (const p of parcelPlots) {
          p.state = 'empty';
          p.crop = null;
        }
        const hasMoreParcels = ripePlots.length > parcelPlots.length;
        return {
          nextWorkStep: hasMoreParcels ? 0 : 1,
          result: {
            acted: true,
            msg: `🧺 Đất Bãi: Đã thu hoạch ${parcelPlots.length} luống rau chín tại thửa số ${parcelIdx + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 1;
  }

  // Step 1: Spray pests (parcel by parcel)
  if (step === 1) {
    if (cfg.benAutoBaiCrops !== false) {
      const pestPlots = plots.filter(
        (p) => Boolean(p.crop) && typeof p.pestAt === 'number' && toTimestampMs(p.pestAt) <= nowMs
      );
      if (pestPlots.length > 0) {
        const parcelIdx = Math.floor(pestPlots[0].plot / 6);
        const parcelPlots = pestPlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        const targetTile = getParcelWorkTile(parcelIdx);
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          targetTile,
          `🚶 Đất Bãi: Đang đi lại thửa số ${parcelIdx + 1} (${targetTile.x}, ${targetTile.y}) bắt sâu ${parcelPlots.length} luống...`,
          { onOpen: () => stores.bai?.setState({ tool: 'spray' }) },
          250
        );
        if (!walk.ready) {
          return { nextWorkStep: 1, result: { acted: true, msg: walk.msg, allowCast: false } };
        }
        sendBenWs({ t: 'plotBatch', act: 'spray', plots: parcelPlots.map((p) => p.plot) });
        for (const p of parcelPlots) {
          p.pestAt = null;
        }
        const hasMoreParcels = pestPlots.length > parcelPlots.length;
        return {
          nextWorkStep: hasMoreParcels ? 1 : 2,
          result: {
            acted: true,
            msg: `🐛 Đất Bãi: Đã bắt sâu ${parcelPlots.length} luống rau tại thửa số ${parcelIdx + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 2;
  }

  // Step 2: Pick coconuts (walk to each ready tree slot 0..5 to satisfy server `farTree` check)
  if (step === 2) {
    if (cfg.benAutoCocoPick !== false) {
      const readyCoco = coconuts.find((c) => {
        const matureOk = !c.matureAt || toTimestampMs(c.matureAt) <= nowMs;
        if (typeof c.ready === 'number') {
          return matureOk && c.ready > 0;
        }
        return typeof c.readyAt === 'number' && toTimestampMs(c.readyAt) <= nowMs;
      });

      if (readyCoco) {
        const treeX = COCO_TREE_XS[readyCoco.slot] ?? 3;
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          { x: treeX, y: 4 },
          `🚶 Đất Bãi: Đang đi lại gốc dừa số ${readyCoco.slot + 1} (${treeX}, 4) để hái dừa...`,
          undefined,
          0
        );
        if (!walk.ready) {
          return { nextWorkStep: 2, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'cocoPick', slot: readyCoco.slot });
        if (typeof readyCoco.ready === 'number') {
          readyCoco.ready = Math.max(0, readyCoco.ready - 1);
        } else {
          readyCoco.readyAt = Math.floor((nowMs + 2 * 3600 * 1000) / 1000);
        }
        baiState.items['coconut'] = (baiState.items['coconut'] || 0) + 1;
        return {
          nextWorkStep: 2,
          result: {
            acted: true,
            msg: `🥥 Đất Bãi: Đã hái dừa xiêm tại gốc dừa số ${readyCoco.slot + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 3;
  }

  // Step 3: Plant coconut saplings (slots 0..5)
  if (step === 3) {
    if (cfg.benAutoCocoPick !== false && (baiState.items['coco'] || 0) > 0) {
      const occupiedSlots = new Set(coconuts.map((c) => c.slot));
      const availableSlots = [0, 1, 2, 3, 4, 5].filter((s) => !occupiedSlots.has(s));
      if (availableSlots.length > 0) {
        const slotToPlant = availableSlots[0];
        const treeX = COCO_TREE_XS[slotToPlant] ?? 3;
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          { x: treeX, y: 4 },
          `🚶 Đất Bãi: Đang đi lại hố dừa số ${slotToPlant + 1} (${treeX}, 4) để trồng dừa con...`,
          undefined,
          0
        );
        if (!walk.ready) {
          return { nextWorkStep: 3, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'cocoPlant', slot: slotToPlant });
        baiState.items['coco'] = Math.max(0, (baiState.items['coco'] || 1) - 1);
        coconuts.push({ slot: slotToPlant, matureAt: nowMs + 6 * 3600 * 1000, ready: 0 });
        return {
          nextWorkStep: 3,
          result: {
            acted: true,
            msg: `🌴 Đất Bãi: Đã trồng cây dừa con vào vị trí số ${slotToPlant + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 4;
  }

  // Step 4: Plant empty plots (parcel by parcel; if missing seeds, record in pendingSupplies to buy at Vựa giống Cô Sáu in Chợ Bãi)
  if (step === 4) {
    if (cfg.benAutoBaiCrops !== false) {
      const emptyPlots = plots.filter((p) => p.state === 'empty');
      if (emptyPlots.length > 0) {
        const preferCrop = cfg.benBaiPreferCrop || 'rauMuong';
        const seedKey = `seed:${preferCrop}`;
        const currentSeeds = baiState.items[seedKey] || 0;
        const missingSeeds = Math.max(0, emptyPlots.length - currentSeeds);

        if (missingSeeds > 0) {
          baiState.pendingSupplies.seeds = { crop: preferCrop, qty: missingSeeds };
        }

        if (currentSeeds > 0) {
          const plotsToPlant = emptyPlots.slice(0, currentSeeds);
          const parcelIdx = Math.floor(plotsToPlant[0].plot / 6);
          const parcelPlots = plotsToPlant.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
          const targetTile = getParcelWorkTile(parcelIdx);
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            targetTile,
            `🚶 Đất Bãi: Đang đi lại thửa số ${parcelIdx + 1} (${targetTile.x}, ${targetTile.y}) gieo ${parcelPlots.length} luống...`,
            { onOpen: () => stores.bai?.setState({ tool: 'plant', seed: preferCrop }) },
            250
          );
          if (!walk.ready) {
            return { nextWorkStep: 4, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({
            t: 'plotBatch',
            act: 'plant',
            plots: parcelPlots.map((p) => p.plot),
            crop: preferCrop,
          });
          baiState.items[seedKey] = Math.max(0, currentSeeds - parcelPlots.length);
          for (const p of parcelPlots) {
            p.state = 'dry';
            p.crop = preferCrop;
          }
          const hasMoreParcels = plotsToPlant.length > parcelPlots.length;
          return {
            nextWorkStep: hasMoreParcels ? 4 : 5,
            result: {
              acted: true,
              msg: `🌱 Đất Bãi: Gieo ${parcelPlots.length} luống hạt giống ${preferCrop} tại thửa số ${parcelIdx + 1}!`,
              allowCast: false,
            },
          };
        }
      }
    }
    step = 5;
  }

  // Step 5: Water dry plots (parcel by parcel)
  if (step === 5) {
    if (cfg.benAutoBaiCrops !== false) {
      const dryPlots = plots.filter((p) => p.state === 'dry');
      if (dryPlots.length > 0) {
        const parcelIdx = Math.floor(dryPlots[0].plot / 6);
        const parcelPlots = dryPlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        const targetTile = getParcelWorkTile(parcelIdx);
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          targetTile,
          `🚶 Đất Bãi: Đang đi lại thửa số ${parcelIdx + 1} (${targetTile.x}, ${targetTile.y}) tưới ${parcelPlots.length} luống rau...`,
          { onOpen: () => stores.bai?.setState({ tool: 'water' }) },
          250
        );
        if (!walk.ready) {
          return { nextWorkStep: 5, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'plotBatch', act: 'water', plots: parcelPlots.map((p) => p.plot) });
        for (const p of parcelPlots) {
          p.state = 'growing';
        }
        const hasMoreParcels = dryPlots.length > parcelPlots.length;
        return {
          nextWorkStep: hasMoreParcels ? 5 : 6,
          result: {
            acted: true,
            msg: `💧 Đất Bãi: Đã tưới nước ${parcelPlots.length} luống rau tại thửa số ${parcelIdx + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 6;
  }

  // Step 6: Fertilize plots (parcel by parcel)
  if (step === 6) {
    const fertCount = (baiState.items['fert'] || 0) + (baiState.items['fertBio'] || 0);
    if (fertCount > 0) {
      const unfertilized = plots.filter(
        (p) => !p.fert && Boolean(p.crop) && (p.state === 'dry' || p.state === 'growing')
      );
      if (unfertilized.length > 0) {
        const parcelIdx = Math.floor(unfertilized[0].plot / 6);
        const parcelPlots = unfertilized.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        const targetTile = getParcelWorkTile(parcelIdx);
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          targetTile,
          `🚶 Đất Bãi: Đang đi lại thửa số ${parcelIdx + 1} (${targetTile.x}, ${targetTile.y}) bón phân ${parcelPlots.length} luống...`,
          { onOpen: () => stores.bai?.setState({ tool: 'fert' }) },
          250
        );
        if (!walk.ready) {
          return { nextWorkStep: 6, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'plotBatch', act: 'fert', plots: parcelPlots.map((p) => p.plot) });
        for (const p of parcelPlots) {
          p.fert = true;
        }
        const hasMoreParcels = unfertilized.length > parcelPlots.length;
        return {
          nextWorkStep: hasMoreParcels ? 6 : 7,
          result: {
            acted: true,
            msg: `🌿 Đất Bãi: Đã bón phân ${parcelPlots.length} luống rau tại thửa số ${parcelIdx + 1}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 7;
  }

  // Step 7 (Phase 2): Candy Kiln (Tuân theo switch cha benAutoCocoProcess & trạng thái 'candy' | 'sell')
  if (step === 7) {
    const cocoProcessEnabled = cfg.benAutoCocoProcess !== false;
    const cocoMode = cfg.benCocoMode || (cfg.benAutoCocoSell ? 'sell' : 'candy');
    const shouldCookCandy = cocoProcessEnabled && cocoMode === 'candy' && cfg.benAutoCandy !== false;

    // A. Luôn thu hoạch mẻ kẹo đã nấu chín trong lò nếu có
    if (
      (cocoProcessEnabled || cfg.benAutoCandy !== false) &&
      typeof farm.candyReadyAt === 'number' &&
      toTimestampMs(farm.candyReadyAt) <= nowMs
    ) {
      const walk = ensureAtSceneTile(
        'BaiScene',
        'farm',
        CANDY_LOT_TILE,
        '🚶 Đất Bãi: Đang đi lại Lò Kẹo Dừa (41, 15) để lấy kẹo chín...',
        { panel: 'lot', lotSel: 'candy' },
        500
      );
      if (!walk.ready) {
        return { nextWorkStep: 7, result: { acted: true, msg: walk.msg, allowCast: false } };
      }

      sendBenWs({ t: 'candyCollect' });
      farm.candyReadyAt = null;
      return {
        nextWorkStep: 7,
        result: {
          acted: true,
          msg: '🍬 Lò Kẹo Dừa: Kẹo dừa đã nấu chín, đang lấy ra lò...',
          allowCast: false,
        },
      };
    }

    // B. Nấu mẻ kẹo mới khi đang ở chế độ "Làm kẹo" ('candy')
    if (shouldCookCandy && !farm.candyReadyAt) {
      const recipe = baiState.info?.candyRecipe || { coco: 2, sugar: 1, out: 5, price: 350 };
      const cocoCount =
        baiState.items['coconut'] || baiState.items['coconuts'] || baiState.items['coco'] || 0;
      const sugarCount = baiState.items['sugar'] || 0;

      if (cocoCount >= recipe.coco) {
        if (sugarCount < recipe.sugar) {
          if (cfg.benAutoBuySugar !== false) {
            baiState.pendingSupplies.sugar = recipe.sugar - sugarCount;
          }
        } else {
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            CANDY_LOT_TILE,
            '🚶 Đất Bãi: Đang đi lại Lò Kẹo Dừa (41, 15) để nấu kẹo...',
            { panel: 'lot', lotSel: 'candy' },
            500
          );
          if (!walk.ready) {
            return { nextWorkStep: 7, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({ t: 'candyStart' });
          farm.candyReadyAt = nowMs + 2 * 3600 * 1000;
          closeBaiPanel();
          return {
            nextWorkStep: 8,
            result: {
              acted: true,
              msg: `🔥 Lò Kẹo Dừa: Đã nhóm lửa nấu mẻ kẹo dừa mới (${recipe.coco} 🥥 + ${recipe.sugar}kg đường)!`,
              allowCast: false,
            },
          };
        }
      }
    }
    step = 8;
  }

  // Step 8 (Phase 2): Fish Drying Racks & DryDex
  if (step === 8) {
    if (cfg.benAutoDryFish !== false) {
      const racks = farm.racks || [];
      // A. Collect dried fish from ready racks
      const readyRacks = racks.filter((r) => toTimestampMs(r.readyAt) <= nowMs);
      if (readyRacks.length > 0) {
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          DRYFISH_LOT_TILE,
          '🚶 Đất Bãi: Đang đi lại Sân Phơi Khô Cá (41, 20) để thu khô cá...',
          { panel: 'lot', lotSel: 'dryFish' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 8, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'dryCollect' });
        farm.racks = racks.filter((r) => toTimestampMs(r.readyAt) > nowMs);
        return {
          nextWorkStep: 8,
          result: {
            acted: true,
            msg: `🐟 Sân Phơi Khô Cá: Thu hoạch ${readyRacks.length} con cá đã phơi khô!`,
            allowCast: false,
          },
        };
      }

      // B. Put into DryDex collection book
      if (cfg.benAutoDryDexPut !== false && baiState.info?.specialty?.driedList) {
        const driedList = baiState.info.specialty.driedList;
        const dexMap = new Map((baiState.dryDex?.items || []).map((x) => [x.fish, x.size]));
        const candidateDex = driedList.find(
          (d) => !dexMap.has(d.fish) || d.size > (dexMap.get(d.fish) || 0)
        );

        if (candidateDex) {
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            DRYFISH_LOT_TILE,
            '🚶 Đất Bãi: Đang đi lại Sân Phơi Khô Cá (41, 20) để mở Sổ Khô Cá...',
            { panel: 'dryDex' },
            600
          );
          if (!walk.ready) {
            return { nextWorkStep: 8, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({ t: 'dryDexPut', id: candidateDex.id });
          baiState.info.specialty.driedList = driedList.filter((d) => d.id !== candidateDex.id);
          return {
            nextWorkStep: 8,
            result: {
              acted: true,
              msg: `📜 Sổ Khô Cá: Đã cất khô cá ${candidateDex.fish} (${candidateDex.size}cm) vào bộ sưu tập (+⭐ Nổi tiếng)!`,
              allowCast: false,
            },
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
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          DRYFISH_LOT_TILE,
          '🚶 Đất Bãi: Đang đi lại Sân Phơi Khô Cá (41, 20) để xếp cá lên nong...',
          { panel: 'lot', lotSel: 'dryFish' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 8, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        const fishToDry = dryableCandidates[0];
        sendBenWs({ t: 'dryPut', fish: fishToDry.id });
        closeBaiPanel();
        return {
          nextWorkStep: 9,
          result: {
            acted: true,
            msg: `🐟 Sân Phơi Khô Cá: Đã đưa cá ${fishToDry.fish || 'câu bến'} lên nong phơi!`,
            allowCast: false,
          },
        };
      }
    }
    step = 9;
  }

  // Step 9 (Phase 3): Poultry Coop
  if (step === 9) {
    if (cfg.benAutoCoop !== false) {
      const birds = farm.birds || [];

      // A. Pick eggs in nest
      const totalEggs = birds.reduce((s, b) => s + (b.eggs || 0), 0);
      if (totalEggs > 0) {
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          COOP_TILE,
          `🚶 Đất Bãi: Đang đi vào Chuồng Gà Vịt (40, 8) để nhặt ${totalEggs} trứng...`,
          { panel: 'coop' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 9, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'eggPick' });
        for (const b of birds) {
          b.eggs = 0;
        }
        return {
          nextWorkStep: 9,
          result: {
            acted: true,
            msg: `🥚 Chuồng Gà Vịt: Đã nhặt ${totalEggs} quả trứng gà/vịt từ ổ rơm!`,
            allowCast: false,
          },
        };
      }

      // B. Cure sick birds (if missing med, record in pendingSupplies to buy at Sạp Bà Bảy in Chợ Bãi)
      const sickBirds = birds.filter((b) => b.diesAt !== null);
      if (sickBirds.length > 0 && cfg.benAutoCureBirds !== false) {
        const medCount = baiState.items['med'] || 0;
        if (medCount < sickBirds.length) {
          baiState.pendingSupplies.med = sickBirds.length - medCount;
        }

        if (medCount > 0) {
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            COOP_TILE,
            `🚶 Đất Bãi: Đang đi vào Chuồng Gà Vịt (40, 8) chữa bệnh cho ${sickBirds.length} gia cầm...`,
            { panel: 'coop' },
            500
          );
          if (!walk.ready) {
            return { nextWorkStep: 9, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({ t: 'birdCure' });
          const curedCount = Math.min(sickBirds.length, medCount);
          for (let i = 0; i < curedCount; i++) {
            sickBirds[i].diesAt = null;
          }
          baiState.items['med'] = Math.max(0, medCount - curedCount);
          return {
            nextWorkStep: 9,
            result: {
              acted: true,
              msg: `💊 Chuồng Gà Vịt: Đã cho ${curedCount} con gia cầm uống thuốc chữa bệnh!`,
              allowCast: false,
            },
          };
        }
      }

      // C. Put newly bought poultry into coop
      const boughtPoultryCount = (baiState.items['hen'] || 0) + (baiState.items['duck'] || 0);
      if (boughtPoultryCount > 0) {
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          COOP_TILE,
          '🚶 Đất Bãi: Đang đi vào Chuồng Gà Vịt (40, 8) để thả giống...',
          { panel: 'coop' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 9, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'birdPut' });
        baiState.items['hen'] = 0;
        baiState.items['duck'] = 0;
        closeBaiPanel();
        return {
          nextWorkStep: 10,
          result: {
            acted: true,
            msg: '🐔 Chuồng Gà Vịt: Đã thả gia cầm mới vào chuồng nuôi!',
            allowCast: false,
          },
        };
      }
    }
    step = 10;
  }

  // Step 10 (Phase 3): River Net Fish
  if (step === 10) {
    if (cfg.benAutoNet !== false) {
      const netFish = farm.netFish || [];

      // A. Pull net for adult fish
      const adultFish = netFish.filter((f) => toTimestampMs(f.readyAt) <= nowMs);
      if (adultFish.length > 0) {
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          NET_TILE,
          `🚶 Đất Bãi: Đang đi ra Lưới Quây Cá Sông (39, 3) kéo ${adultFish.length} cá lớn...`,
          { panel: 'net' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 10, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'netPull' });
        farm.netFish = netFish.filter((f) => toTimestampMs(f.readyAt) > nowMs);
        return {
          nextWorkStep: 10,
          result: {
            acted: true,
            msg: `🎣 Lưới Quây Nuôi Cá: Kéo lưới thu hoạch ${adultFish.length} con cá trưởng thành!`,
            allowCast: false,
          },
        };
      }

      // B. Feed hungry fish (if missing feed, record in pendingSupplies to buy at Ghe Anh Mười in Chợ Bãi)
      const isHungry = netFish.some((f) => f.hungry);
      if (isHungry && cfg.benAutoFeedNet !== false) {
        const feedFishRatio = baiState.info?.net?.feedFish || 5;
        const neededFeed = Math.max(1, Math.ceil(netFish.length / feedFishRatio));
        const currentFeed = baiState.items['netFeed'] || 0;

        if (currentFeed < neededFeed) {
          baiState.pendingSupplies.netFeed = neededFeed - currentFeed;
        } else {
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            NET_TILE,
            '🚶 Đất Bãi: Đang đi ra Lưới Quây Cá Sông (39, 3) để rải cám...',
            { panel: 'net' },
            500
          );
          if (!walk.ready) {
            return { nextWorkStep: 10, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({ t: 'netFeed' });
          for (const f of netFish) {
            f.hungry = false;
          }
          baiState.items['netFeed'] = Math.max(0, currentFeed - neededFeed);
          return {
            nextWorkStep: 10,
            result: {
              acted: true,
              msg: '🌾 Lưới Quây Nuôi Cá: Đã rải cám cho đàn cá sông ăn no!',
              allowCast: false,
            },
          };
        }
      }

      // C. Put fry into net
      const fryKeys = Object.keys(baiState.items).filter(
        (k) => k.startsWith('fry:') && baiState.items[k] > 0
      );
      if (fryKeys.length > 0) {
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          NET_TILE,
          '🚶 Đất Bãi: Đang đi ra Lưới Quây Cá Sông (39, 3) để thả cá giống...',
          { panel: 'net' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 10, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'netPut' });
        for (const k of fryKeys) {
          baiState.items[k] = 0;
        }
        closeBaiPanel();
        return {
          nextWorkStep: 11,
          result: {
            acted: true,
            msg: '🐟 Lưới Quây Nuôi Cá: Đã thả cá giống vào khúc sông quây lưới!',
            allowCast: false,
          },
        };
      }
    }
  }

  closeBaiPanel();
  return {
    nextWorkStep: 11,
    result: {
      acted: true,
      msg: '🌾 Đất Bãi: Đã hoàn tất việc vườn, chuẩn bị đi ra cổng về Chợ Bãi...',
      allowCast: false,
      doneFarm: true,
    },
  };
}
