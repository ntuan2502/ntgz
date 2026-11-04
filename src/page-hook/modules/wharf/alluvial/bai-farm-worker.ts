import { AppConfig } from '../../../../shared/types/config';
import { stores, sendBenWs, getActiveScene } from '../../../core/engine-access';
import {
  FISH_CATALOG_MAP,
  getFishDisplayName,
  getFishRarity,
  resolveFishId,
  shouldKeepFishByConfig,
  computeTideStatus,
} from '../../../../shared/constants/wharf-catalog';
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

let farmSyncWaitStartedAt = 0;

/**
 * Hướng mặt nhân vật về phía thửa ruộng `parcelIdx` (0..8) trong BaiScene (farm).
 * Thao tác trên luống rau có thể thực hiện từ xa ở bất cứ đâu trong khuôn viên nông trại,
 * mô phỏng chính xác phương thức `toolTap` của game (chỉ quay mặt về thửa rồi gửi batch).
 */
function lookAtParcel(parcelIdx: number): void {
  const sc = getActiveScene('BaiScene') as unknown as {
    farmer?: { lookAt?: (x: number, y: number) => void };
  } | null;
  if (sc?.farmer?.lookAt) {
    const px = 3 + (parcelIdx % 3) * 7 + 3;
    const py = 6 + Math.floor(parcelIdx / 3) * 5 + 2;
    sc.farmer.lookAt(px * 16, py * 16);
  }
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

  const storeFarm = stores.bai?.getState()?.farm;
  const farm = storeFarm || baiState.farm;
  if (!farm) {
    if (farmSyncWaitStartedAt === 0) {
      farmSyncWaitStartedAt = Date.now();
      sendBenWs({ t: 'farmInfo' });
      sendBenWs({ t: 'farmGo', to: 'me' });
    }
    if (Date.now() - farmSyncWaitStartedAt < 4000) {
      return {
        nextWorkStep: currentWorkStep,
        result: {
          acted: true,
          msg: '⏳ Đất Bãi: Đang đồng bộ dữ liệu ruộng vườn...',
          allowCast: false,
        },
      };
    }
    farmSyncWaitStartedAt = 0;
    return {
      nextWorkStep: 12,
      result: { acted: true, msg: '🌾 Rời vườn...', allowCast: false, doneFarm: true },
    };
  }
  farmSyncWaitStartedAt = 0;

  if (baiState.lastInfoAt === 0 || !baiState.info) {
    sendBenWs({ t: 'farmInfo' });
  }

  const nowMs = getBaiServerNowMs();
  const plots = farm.plots || [];
  const coconuts = farm.coconuts || [];
  let step = currentWorkStep;

  // Step 0: Harvest ripe plots (remote execution inside farm, faces parcel)
  if (step === 0) {
    if (cfg.benAutoBaiCrops !== false && cfg.benAutoBaiHarvest !== false) {
      const ripePlots = plots.filter(
        (p) =>
          p.state === 'ripe' ||
          (p.state === 'growing' && typeof p.readyAt === 'number' && toTimestampMs(p.readyAt) <= nowMs)
      );
      if (ripePlots.length > 0) {
        const parcelIdx = Math.floor(ripePlots[0].plot / 6);
        const parcelPlots = ripePlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        lookAtParcel(parcelIdx);
        stores.bai?.setState({ tool: 'harvest' });
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

  // Step 1: Spray pests (remote execution inside farm, faces parcel)
  if (step === 1) {
    if (cfg.benAutoBaiCrops !== false && cfg.benAutoBaiSpray !== false) {
      const pestPlots = plots.filter(
        (p) => Boolean(p.crop) && typeof p.pestAt === 'number' && toTimestampMs(p.pestAt) <= nowMs
      );
      if (pestPlots.length > 0) {
        const parcelIdx = Math.floor(pestPlots[0].plot / 6);
        const parcelPlots = pestPlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        lookAtParcel(parcelIdx);
        stores.bai?.setState({ tool: 'spray' });
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

  // Step 4: Plant empty plots (remote execution inside farm, faces parcel; if missing seeds, record in pendingSupplies)
  if (step === 4) {
    if (cfg.benAutoBaiCrops !== false && cfg.benAutoBaiPlant !== false) {
      const emptyPlots = plots.filter((p) => p.state === 'empty');
      if (emptyPlots.length > 0) {
        const preferCrop = cfg.benBaiPreferCrop || 'rauMuong';
        const seedKey = `seed:${preferCrop}`;
        const currentSeeds = baiState.items[seedKey] || 0;
        const missingSeeds = Math.max(0, emptyPlots.length - currentSeeds);

        if (missingSeeds > 0) {
          baiState.pendingSupplies.seeds = { crop: preferCrop, qty: missingSeeds };
        } else {
          baiState.pendingSupplies.seeds = null;
        }

        if (currentSeeds > 0) {
          const plotsToPlant = emptyPlots.slice(0, currentSeeds);
          const parcelIdx = Math.floor(plotsToPlant[0].plot / 6);
          const parcelPlots = plotsToPlant.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
          lookAtParcel(parcelIdx);
          stores.bai?.setState({ tool: 'plant', seed: preferCrop });

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

  // Step 5: Water dry plots (remote execution inside farm, faces parcel)
  if (step === 5) {
    if (cfg.benAutoBaiCrops !== false && cfg.benAutoBaiWater !== false) {
      const dryPlots = plots.filter((p) => p.state === 'dry');
      if (dryPlots.length > 0) {
        const parcelIdx = Math.floor(dryPlots[0].plot / 6);
        const parcelPlots = dryPlots.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
        lookAtParcel(parcelIdx);
        stores.bai?.setState({ tool: 'water' });

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

  // Step 6: Fertilize plots (remote execution inside farm, faces parcel)
  if (step === 6) {
    if (cfg.benAutoBaiCrops !== false && cfg.benAutoBaiFertilize !== false) {
      const fertCount = baiState.items['fert'] || 0;
      if (fertCount > 0) {
        const unfertilized = plots.filter(
          (p) => !p.fert && Boolean(p.crop) && (p.state === 'dry' || p.state === 'growing')
        );
        if (unfertilized.length > 0) {
          const plotsToFert = unfertilized.slice(0, fertCount);
          const parcelIdx = Math.floor(plotsToFert[0].plot / 6);
          const parcelPlots = plotsToFert.filter((p) => Math.floor(p.plot / 6) === parcelIdx);
          lookAtParcel(parcelIdx);
          stores.bai?.setState({ tool: 'fert' });

          sendBenWs({ t: 'plotBatch', act: 'fert', plots: parcelPlots.map((p) => p.plot) });
          baiState.items['fert'] = Math.max(0, fertCount - parcelPlots.length);
          for (const p of parcelPlots) {
            p.fert = true;
          }
          const hasMoreParcels = plotsToFert.length > parcelPlots.length;
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

      const fertBioCount = baiState.items['fertBio'] || 0;
      if (fertBioCount > 0) {
        const unbioPlots = plots.filter(
          (p) => !p.bio && Boolean(p.crop) && p.state === 'growing'
        );
        if (unbioPlots.length > 0) {
          const targetPlot = unbioPlots[0];
          const parcelIdx = Math.floor(targetPlot.plot / 6);
          lookAtParcel(parcelIdx);
          sendBenWs({ t: 'fertBio', plot: targetPlot.plot });
          targetPlot.bio = true;
          baiState.items['fertBio'] = Math.max(0, fertBioCount - 1);
          const hasMoreBio = fertBioCount - 1 > 0 && unbioPlots.length > 1;
          return {
            nextWorkStep: hasMoreBio ? 6 : 7,
            result: {
              acted: true,
              msg: `🧪 Đất Bãi: Đã bón phân vi sinh cho ô đất #${targetPlot.plot + 1} (giảm 50% thời gian chín)!`,
              allowCast: false,
            },
          };
        }
      }
    }
    step = 7;
  }

  // Step 7 (Phase 2): Candy Kiln (Chỉ thực hiện khi đã xây Lò Kẹo Dừa `farm.candy`)
  if (step === 7) {
    if (farm.candy) {
      const cocoProcessEnabled = cfg.benAutoCocoProcess !== false;
      const cocoMode = cfg.benCocoMode || (cfg.benAutoCocoSell ? 'sell' : 'candy');
      const shouldCookCandy =
        cocoProcessEnabled && cocoMode === 'candy' && cfg.benAutoCandy !== false;

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
        const recipe = baiState.info?.candyRecipe || { coco: 4, sugar: 1, out: 5, price: 350 };
        const cocoCount = baiState.items['coconut'] || baiState.items['coconuts'] || 0;
        const sugarCount = baiState.items['sugar'] || 0;

        if (cocoCount >= recipe.coco) {
          if (sugarCount < recipe.sugar) {
            if (cfg.benAutoBuySugar !== false) {
              baiState.pendingSupplies.sugar = recipe.sugar - sugarCount;
            }
          } else {
            baiState.pendingSupplies.sugar = 0;
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
            if (baiState.items['coconut']) {
              baiState.items['coconut'] = Math.max(0, baiState.items['coconut'] - recipe.coco);
            }
            if (baiState.items['sugar']) {
              baiState.items['sugar'] = Math.max(0, baiState.items['sugar'] - recipe.sugar);
            }
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
    }
    closeBaiPanel();
    step = 8;
  }

  // Step 8 (Phase 2): Fish Drying Racks & DryDex (Chỉ thực hiện khi đã xây Sân Phơi `farm.dryFish`)
  if (step === 8) {
    if (farm.dryFish) {
      const racks = farm.racks || [];

      // A. Thu hoạch cá đã phơi khô khi đến giờ
      if (cfg.benAutoDryCollect !== false) {
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
              msg: `🐟 Sân Phơi Khô Cá: Thu hoạch ${readyRacks.length} con cá đã phơi khô vào kho!`,
              allowCast: false,
            },
          };
        }
      }

      // B. Cất khô cá vào Sổ bộ sưu tập DryDex (+⭐ Nổi tiếng)
      if (cfg.benAutoDryDexPut !== false && baiState.info?.specialty?.driedList?.length) {
        if (!baiState.dryDex) {
          sendBenWs({ t: 'dryDex' });
        } else {
          const driedList = baiState.info.specialty.driedList;
          const dexMap = new Map((baiState.dryDex.items || []).map((x) => [x.fish, x.size]));
          const candidateDex = driedList.find(
            (d) => !dexMap.has(d.fish) || d.size > (dexMap.get(d.fish) || 0)
          );

          if (candidateDex) {
            const walk = ensureAtSceneTile(
              'BaiScene',
              'farm',
              DRYFISH_LOT_TILE,
              '🚶 Đất Bãi: Đang đi lại Sân Phơi Khô Cá (41, 20) để cất khô cá vào bộ sưu tập...',
              { panel: 'lot', lotSel: 'dryFish' },
              500
            );
            if (!walk.ready) {
              return { nextWorkStep: 8, result: { acted: true, msg: walk.msg, allowCast: false } };
            }

            const fishName = getFishDisplayName(candidateDex.fish);
            sendBenWs({ t: 'dryDexPut', id: candidateDex.id });
            baiState.info.specialty.driedList = driedList.filter((d) => d.id !== candidateDex.id);
            return {
              nextWorkStep: 8,
              result: {
                acted: true,
                msg: `🐟 Sân Phơi Khô Cá: Đã cất khô cá ${fishName} (${candidateDex.size}cm) vào bộ sưu tập (+⭐ Nổi tiếng)!`,
                allowCast: false,
              },
            };
          }
        }
      }

      // C. Đưa cá tươi từ giỏ lên nong phơi (ưu tiên cá có giá trị cao nhất trước)
      if (cfg.benAutoDryFish !== false) {
        const dryLv = Number(farm.dryLv) || 1;
        const maxRacks = [6, 9, 12][Math.min(3, Math.max(1, dryLv)) - 1] || 6;
        const emptyRackCount = Math.max(0, maxRacks - (farm.racks?.length || 0));
        const basket = stores.benNet?.getState().basket || [];

        const allowDryKept = cfg.benDryIncludeKept === true;
        const dryableCandidates = basket
          .filter(
            (f: {
              id?: string;
              kept?: boolean;
              odd?: boolean;
              rainbow?: boolean;
              price?: number;
              size?: number;
              fish?: string;
              name?: string;
              rarity?: string;
              released?: boolean;
            }) => {
              if (!f.id || f.released) return false;
              if (f.odd || f.rainbow) return false;
              if ((Number(f.price) || 0) <= 0) return false;
              const canonicalId = resolveFishId(f.fish, f.name);
              const meta = canonicalId ? FISH_CATALOG_MAP.get(canonicalId) : undefined;
              if (meta?.ghost || meta?.release) return false;
              const rarity = getFishRarity(f.fish || f.name, f.rarity);
              if (rarity === 'junk' || f.fish === 'rac' || f.fish?.startsWith('junk')) return false;
              if (!allowDryKept && (f.kept || shouldKeepFishByConfig(f, cfg))) return false;
              return true;
            }
          )
          .sort((a, b) => {
            const priceDiff = (Number(b.price) || 0) - (Number(a.price) || 0);
            if (priceDiff !== 0) return priceDiff;
            return (Number(b.size) || 0) - (Number(a.size) || 0);
          });

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
          const fishName = getFishDisplayName(fishToDry.fish || fishToDry.id);
          const fishPrice = Number(fishToDry.price) || 0;

          if (fishToDry.kept) {
            sendBenWs({ t: 'keep', id: fishToDry.id, on: false });
          }
          sendBenWs({ t: 'dryPut', fish: fishToDry.id });

          // Ghi nhận nong đang sử dụng và trừ cá khỏi giỏ
          farm.racks = [
            ...(farm.racks || []),
            {
              slot: farm.racks?.length || 0,
              fish: fishToDry.fish || '',
              size: fishToDry.size,
              price: fishPrice,
              readyAt: Math.floor(nowMs / 1000) + 6 * 3600,
            },
          ];
          if (stores.benNet) {
            const curBasket = stores.benNet.getState().basket || [];
            stores.benNet.setState({
              basket: curBasket.filter((f: { id?: string }) => f.id !== fishToDry.id),
            });
          }

          const remainingEmptyRacks = Math.max(0, maxRacks - farm.racks.length);
          const remainingCandidates = dryableCandidates.slice(1);
          const hasMoreToDry = remainingEmptyRacks > 0 && remainingCandidates.length > 0;

          if (!hasMoreToDry) {
            closeBaiPanel();
          }

          const unkeepNote = fishToDry.kept ? ' (đã mở giữ)' : '';
          return {
            nextWorkStep: hasMoreToDry ? 8 : 9,
            result: {
              acted: true,
              msg: `🐟 Sân Phơi Khô Cá: Đã đưa cá giá trị cao ${fishName}${unkeepNote} (${fishPrice.toLocaleString('vi-VN')}🐚, ${fishToDry.size || 0}cm) lên nong phơi (${farm.racks.length}/${maxRacks})!`,
              allowCast: false,
            },
          };
        }
      }
    }
    closeBaiPanel();
    step = 9;
  }

  // Step 9 (Phase 3): Poultry Coop (Chỉ thực hiện khi đã dựng Chuồng Gà Vịt `farm.coop >= 1`)
  if (step === 9) {
    if (cfg.benAutoCoop !== false && (farm.coop ?? 0) >= 1) {
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
        } else {
          baiState.pendingSupplies.med = 0;
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
      const henCount = baiState.items['hen'] || 0;
      const duckCount = baiState.items['duck'] || 0;
      const boughtPoultryCount = henCount + duckCount;
      const maxCoopCap = baiState.info?.coop?.cap ?? (farm.coop ? farm.coop * 5 : 5);
      const currentBirdsCount = birds.length;
      const coopSpaceLeft = Math.max(0, maxCoopCap - currentBirdsCount);

      if (boughtPoultryCount > 0 && coopSpaceLeft > 0) {
        const henPut = Math.min(coopSpaceLeft, henCount);
        const duckPut = Math.min(coopSpaceLeft - henPut, duckCount);
        const actualPut = henPut + duckPut;

        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          COOP_TILE,
          `🚶 Đất Bãi: Đang đi vào Chuồng Gà Vịt (40, 8) để thả ${actualPut} con giống...`,
          { panel: 'coop' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 9, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'birdPut' });
        baiState.items['hen'] = Math.max(0, henCount - henPut);
        baiState.items['duck'] = Math.max(0, duckCount - duckPut);
        closeBaiPanel();
        const details = [
          henPut > 0 ? `${henPut} gà mái` : '',
          duckPut > 0 ? `${duckPut} vịt mái` : '',
        ].filter(Boolean).join(' + ');
        return {
          nextWorkStep: 10,
          result: {
            acted: true,
            msg: `🐔 Chuồng Gà Vịt: Đã thả ${details} (tổng ${actualPut} con) vào chuồng (${currentBirdsCount + actualPut}/${maxCoopCap})!`,
            allowCast: false,
          },
        };
      }
    }
    closeBaiPanel();
    step = 10;
  }

  // Step 10 (Phase 3): River Net Fish (Chỉ thực hiện khi đã giăng Lưới Quây `Boolean(farm.net)`)
  if (step === 10) {
    if (cfg.benAutoNet !== false && Boolean(farm.net)) {
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
          baiState.pendingSupplies.netFeed = 0;
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
      const totalFryInBag = fryKeys.reduce((acc, k) => acc + (baiState.items[k] || 0), 0);
      const maxNetCap = baiState.info?.net?.cap ?? (farm.net ? 20 : 10);
      const currentNetCount = netFish.length;
      const netSpaceLeft = Math.max(0, maxNetCap - currentNetCount);

      if (totalFryInBag > 0 && netSpaceLeft > 0) {
        const actualFryPut = Math.min(totalFryInBag, netSpaceLeft);
        const walk = ensureAtSceneTile(
          'BaiScene',
          'farm',
          NET_TILE,
          `🚶 Đất Bãi: Đang đi ra Lưới Quây Cá Sông (39, 3) để thả ${actualFryPut} cá giống...`,
          { panel: 'net' },
          500
        );
        if (!walk.ready) {
          return { nextWorkStep: 10, result: { acted: true, msg: walk.msg, allowCast: false } };
        }

        sendBenWs({ t: 'netPut' });
        let remainingToDeduct = actualFryPut;
        const putDetails: string[] = [];
        for (const k of fryKeys) {
          if (remainingToDeduct <= 0) break;
          const fishKind = k.replace(/^fry:/, '');
          const fishName =
            baiState.info?.net?.fish?.[fishKind]?.name || getFishDisplayName(fishKind);
          const count = baiState.items[k] || 0;
          const take = Math.min(count, remainingToDeduct);
          baiState.items[k] = count - take;
          remainingToDeduct -= take;
          putDetails.push(`${take} ${fishName}`);
        }
        closeBaiPanel();
        return {
          nextWorkStep: 11,
          result: {
            acted: true,
            msg: `🐟 Lưới Quây Nuôi Cá: Đã thả ${putDetails.join(' + ')} (tổng ${actualFryPut} con) vào lưới (${currentNetCount + actualFryPut}/${maxNetCap})!`,
            allowCast: false,
          },
        };
      }
    }
    closeBaiPanel();
    step = 11;
  }

  // Step 11: Mud Digging (Bắt ốc, cua bãi bùn khi Nước ròng)
  if (step === 11) {
    if (cfg.benAutoMudDig !== false) {
      const tide = computeTideStatus(nowMs);
      const mudDug = farm.mudDug || [];
      const mudDugSet = new Set(mudDug.map((d) => `${d.x},${d.y}`));
      const mudHints = (farm.mudHints || []).filter((h) => !mudDugSet.has(`${h.x},${h.y}`));
      const mudLeft =
        typeof farm.mudLeft === 'number'
          ? farm.mudLeft
          : farm.mudHints
            ? mudHints.length
            : Math.max(0, 8 - mudDug.length);

      const wallet = stores.benNet?.getState().wallet;
      const stamina = typeof wallet?.liveStamina === 'number' ? wallet.liveStamina : (wallet?.stamina ?? 100);

      if (tide.phase === 'rong' && mudLeft > 0 && stamina >= 2) {
        let candidateTile: { x: number; y: number } | null = null;
        if (mudHints.length > 0) {
          candidateTile = mudHints[0];
        } else {
          // Bãi bùn wZ = { x: 0..24, y: 0..2 }, ưu tiên các ô giữa an toàn không cấn biên
          for (let y = 1; y <= 2; y++) {
            for (let x = 2; x <= 22; x++) {
              if (!mudDugSet.has(`${x},${y}`)) {
                candidateTile = { x, y };
                break;
              }
            }
            if (candidateTile) break;
          }
        }

        if (candidateTile) {
          const walk = ensureAtSceneTile(
            'BaiScene',
            'farm',
            candidateTile,
            `🚶 Đất Bãi: Đang lội ra bãi bùn nước ròng (${candidateTile.x}, ${candidateTile.y}) mò ốc, cua...`,
            undefined,
            400
          );
          if (!walk.ready) {
            return { nextWorkStep: 11, result: { acted: true, msg: walk.msg, allowCast: false } };
          }

          sendBenWs({ t: 'mudDig', x: candidateTile.x, y: candidateTile.y });
          farm.mudDug = [...mudDug, candidateTile];
          farm.mudLeft = Math.max(0, mudLeft - 1);
          if (farm.mudHints) {
            farm.mudHints = farm.mudHints.filter((h) => !(h.x === candidateTile.x && h.y === candidateTile.y));
          }
          const hasMoreMud = farm.mudLeft > 0 && stamina - 2 >= 2;
          return {
            nextWorkStep: hasMoreMud ? 11 : 12,
            result: {
              acted: true,
              msg: `🫳 Bãi Bùn Nước Ròng: Đang mò ốc, cua tại ổ (${candidateTile.x}, ${candidateTile.y})! (Bãi còn ~${farm.mudLeft} ổ, ⚡-2)`,
              allowCast: false,
            },
          };
        }
      }
    }
  }

  closeBaiPanel();

  let mudNote = '';
  if (cfg.benAutoMudDig !== false) {
    const tide = computeTideStatus(nowMs);
    const mudDug = farm.mudDug || [];
    const mudLeft =
      typeof farm.mudLeft === 'number'
        ? farm.mudLeft
        : farm.mudHints
          ? Math.max(0, farm.mudHints.length - mudDug.length)
          : Math.max(0, 8 - mudDug.length);
    const wallet = stores.benNet?.getState().wallet;
    const stamina = typeof wallet?.liveStamina === 'number' ? wallet.liveStamina : (wallet?.stamina ?? 100);

    if (tide.phase !== 'rong') {
      mudNote = ` (Bãi bùn đang ngập - triều ${tide.phaseName})`;
    } else if (mudLeft <= 0) {
      mudNote = ' (Đã mò hết 8/8 ổ bùn con nước này)';
    } else if (stamina < 2) {
      mudNote = ` (Hết thể lực mò ốc ⚡${stamina}/2)`;
    }
  }

  return {
    nextWorkStep: 12,
    result: {
      acted: true,
      msg: `🌾 Đất Bãi: Đã hoàn tất việc vườn${mudNote}, chuẩn bị đi ra cổng về Chợ Bãi...`,
      allowCast: false,
      doneFarm: true,
    },
  };
}
