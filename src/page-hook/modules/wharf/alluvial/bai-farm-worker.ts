import { AppConfig } from '../../../../shared/types/config';
import { stores, sendBenWs } from '../../../core/engine-access';
import { baiState, toTimestampMs, getBaiServerNowMs } from './bai-state';

export interface AlluvialStepResult {
  acted: boolean;
  msg?: string;
  allowCast?: boolean;
  doneFarm?: boolean;
}

/**
 * Thực thi tuần tự các bước chăm sóc trên mảnh đất Bãi Phù Sa của người chơi.
 * Tách nhịp rõ ràng giữa lệnh mua vật tư (seedBuy, supplyBuy, medBuy, netBuy)
 * và lệnh sử dụng sang 2 tick kế tiếp để tránh race condition.
 */
export function runBaiFarmWorkStep(
  cfg: AppConfig,
  currentWorkStep: number
): { nextWorkStep: number; result: AlluvialStepResult } {
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

  // Step 0: Harvest ripe plots
  if (step === 0) {
    step = 1;
    if (cfg.benAutoBaiCrops !== false) {
      const ripePlots = plots.filter(
        (p) =>
          p.state === 'ripe' ||
          (p.state === 'growing' && typeof p.readyAt === 'number' && toTimestampMs(p.readyAt) <= nowMs)
      );
      if (ripePlots.length > 0) {
        sendBenWs({ t: 'plotBatch', act: 'harvest', plots: ripePlots.map((p) => p.plot) });
        for (const p of ripePlots) {
          p.state = 'empty';
          p.crop = null;
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🧺 Đất Bãi: Đã thu hoạch ${ripePlots.length} luống rau chín!`,
            allowCast: false,
          },
        };
      }
    }
  }

  // Step 1: Spray pests
  if (step === 1) {
    step = 2;
    if (cfg.benAutoBaiCrops !== false) {
      const pestPlots = plots.filter(
        (p) => Boolean(p.crop) && typeof p.pestAt === 'number' && toTimestampMs(p.pestAt) <= nowMs
      );
      if (pestPlots.length > 0) {
        sendBenWs({ t: 'plotBatch', act: 'spray', plots: pestPlots.map((p) => p.plot) });
        for (const p of pestPlots) {
          p.pestAt = null;
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🐛 Đất Bãi: Đã bắt sâu & phun thuốc ${pestPlots.length} luống rau!`,
            allowCast: false,
          },
        };
      }
    }
  }

  // Step 2: Pick coconuts
  if (step === 2) {
    step = 3;
    if (cfg.benAutoCocoPick !== false) {
      const readyCocos = coconuts.filter(
        (c) => typeof c.readyAt === 'number' && toTimestampMs(c.readyAt) <= nowMs
      );
      if (readyCocos.length > 0) {
        for (const c of readyCocos) {
          sendBenWs({ t: 'cocoPick', slot: c.slot });
          c.readyAt = Math.floor((nowMs + 4 * 3600 * 1000) / 1000);
        }
        baiState.items['coconut'] = (baiState.items['coconut'] || 0) + readyCocos.length;
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🥥 Đất Bãi: Đã hái ${readyCocos.length} trái dừa xiêm chín!`,
            allowCast: false,
          },
        };
      }
    }
  }

  // Step 3: Plant coconut saplings
  if (step === 3) {
    step = 4;
    if (cfg.benAutoCocoPick !== false && (baiState.items['coco'] || 0) > 0) {
      const occupiedSlots = new Set(coconuts.map((c) => c.slot));
      const availableSlots = [0, 1, 2, 3].filter((s) => !occupiedSlots.has(s));
      if (availableSlots.length > 0) {
        const slotToPlant = availableSlots[0];
        sendBenWs({ t: 'cocoPlant', slot: slotToPlant });
        baiState.items['coco'] = Math.max(0, (baiState.items['coco'] || 1) - 1);
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🌴 Đất Bãi: Đã trồng cây dừa con vào vị trí số ${slotToPlant + 1}!`,
            allowCast: false,
          },
        };
      }
    }
  }

  // Step 4: Plant empty plots (2-phase: buy seeds first -> plant on next tick)
  if (step === 4) {
    if (cfg.benAutoBaiCrops !== false) {
      const emptyPlots = plots.filter((p) => p.state === 'empty');
      if (emptyPlots.length > 0) {
        const preferCrop = cfg.benBaiPreferCrop || 'rauMuong';
        const seedKey = `seed:${preferCrop}`;
        const currentSeeds = baiState.items[seedKey] || 0;
        const missingSeeds = Math.max(0, emptyPlots.length - currentSeeds);

        if (missingSeeds > 0) {
          sendBenWs({ t: 'seedBuy', crop: preferCrop, qty: missingSeeds });
          baiState.items[seedKey] = currentSeeds + missingSeeds;
          return {
            nextWorkStep: 4, // Giữ ở bước 4 để tick kế tiếp mới gieo hạt
            result: {
              acted: true,
              msg: `🌾 Sạp Cô Sáu: Đã mua ${missingSeeds} hạt giống ${preferCrop}...`,
              allowCast: false,
            },
          };
        }

        step = 5;
        sendBenWs({
          t: 'plotBatch',
          act: 'plant',
          plots: emptyPlots.map((p) => p.plot),
          crop: preferCrop,
        });
        baiState.items[seedKey] = Math.max(0, currentSeeds - emptyPlots.length);
        for (const p of emptyPlots) {
          p.state = 'dry';
          p.crop = preferCrop;
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🌱 Đất Bãi: Gieo ${emptyPlots.length} luống hạt giống ${preferCrop}!`,
            allowCast: false,
          },
        };
      }
    }
    step = 5;
  }

  // Step 5: Water dry plots
  if (step === 5) {
    step = 6;
    if (cfg.benAutoBaiCrops !== false) {
      const dryPlots = plots.filter((p) => p.state === 'dry');
      if (dryPlots.length > 0) {
        sendBenWs({ t: 'plotBatch', act: 'water', plots: dryPlots.map((p) => p.plot) });
        for (const p of dryPlots) {
          p.state = 'growing';
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `💧 Đất Bãi: Đã tưới nước ${dryPlots.length} luống rau!`,
            allowCast: false,
          },
        };
      }
    }
  }

  // Step 6: Fertilize plots
  if (step === 6) {
    step = 7;
    const fertCount = (baiState.items['fert'] || 0) + (baiState.items['fertBio'] || 0);
    if (fertCount > 0) {
      const unfertilized = plots.filter(
        (p) => !p.fert && Boolean(p.crop) && (p.state === 'dry' || p.state === 'growing')
      );
      if (unfertilized.length > 0) {
        sendBenWs({ t: 'plotBatch', act: 'fert', plots: unfertilized.map((p) => p.plot) });
        for (const p of unfertilized) {
          p.fert = true;
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: `🌿 Đất Bãi: Đã bón phân ${unfertilized.length} luống rau!`,
            allowCast: false,
          },
        };
      }
    }
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
      sendBenWs({ t: 'candyCollect' });
      farm.candyReadyAt = null;
      return {
        nextWorkStep: 7, // Giữ ở bước 7 để tick tiếp theo có thể nấu mẻ mới ngay
        result: {
          acted: true,
          msg: '🍬 Lò Kẹo Dừa: Kẹo dừa đã nấu chín, đang lấy ra lò...',
          allowCast: false,
        },
      };
    }

    // B. Nấu mẻ kẹo mới khi đang ở chế độ "Làm kẹo" ('candy')
    if (shouldCookCandy && farm.candyReadyAt === null) {
      const recipe = baiState.info?.candyRecipe || { coco: 2, sugar: 1, out: 5, price: 350 };
      const cocoCount =
        baiState.items['coconut'] || baiState.items['coconuts'] || baiState.items['coco'] || 0;
      const sugarCount = baiState.items['sugar'] || 0;

      if (cocoCount >= recipe.coco) {
        if (sugarCount < recipe.sugar && cfg.benAutoBuySugar !== false) {
          const missingSugar = recipe.sugar - sugarCount;
          sendBenWs({ t: 'supplyBuy', item: 'sugar', qty: missingSugar });
          baiState.items['sugar'] = sugarCount + missingSugar;
          return {
            nextWorkStep: 7, // Giữ ở bước 7 để tick tiếp theo nhóm lửa nấu kẹo
            result: {
              acted: true,
              msg: `🍬 Lò Kẹo Dừa: Đã mua ${missingSugar} ký đường mía để nấu kẹo...`,
              allowCast: false,
            },
          };
        }

        if (sugarCount >= recipe.sugar) {
          step = 8;
          sendBenWs({ t: 'candyStart' });
          farm.candyReadyAt = nowMs + 2 * 3600 * 1000;
          return {
            nextWorkStep: step,
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
        sendBenWs({ t: 'dryCollect' });
        farm.racks = racks.filter((r) => toTimestampMs(r.readyAt) > nowMs);
        return {
          nextWorkStep: 8, // Giữ ở bước 8 để tick kế tiếp cất vào DryDex hoặc phơi cá mới
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
        step = 9;
        const fishToDry = dryableCandidates[0];
        sendBenWs({ t: 'dryPut', fish: fishToDry.id });
        return {
          nextWorkStep: step,
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
        sendBenWs({ t: 'eggPick' });
        for (const b of birds) {
          b.eggs = 0;
        }
        return {
          nextWorkStep: 9, // Giữ ở bước 9 để kiểm tra tiếp gia cầm ốm
          result: {
            acted: true,
            msg: `🥚 Chuồng Gà Vịt: Đã nhặt ${totalEggs} quả trứng gà/vịt từ ổ rơm!`,
            allowCast: false,
          },
        };
      }

      // B. Cure sick birds (2-phase: buy med first -> cure on next tick)
      const sickBirds = birds.filter((b) => b.diesAt !== null);
      if (sickBirds.length > 0 && cfg.benAutoCureBirds !== false) {
        const medCount = baiState.items['med'] || 0;
        if (medCount < sickBirds.length) {
          const missingMed = sickBirds.length - medCount;
          sendBenWs({ t: 'medBuy', qty: missingMed });
          baiState.items['med'] = medCount + missingMed;
          return {
            nextWorkStep: 9, // Giữ ở bước 9 để tick tiếp theo cho uống thuốc
            result: {
              acted: true,
              msg: `💊 Tiệm Bà Bảy: Đã mua ${missingMed} liều thuốc chữa bệnh gia cầm...`,
              allowCast: false,
            },
          };
        }

        sendBenWs({ t: 'birdCure' });
        for (const b of sickBirds) {
          b.diesAt = null;
        }
        baiState.items['med'] = Math.max(0, medCount - sickBirds.length);
        return {
          nextWorkStep: 9,
          result: {
            acted: true,
            msg: `💊 Chuồng Gà Vịt: Đã cho ${sickBirds.length} con gia cầm uống thuốc chữa bệnh!`,
            allowCast: false,
          },
        };
      }

      // C. Put newly bought poultry into coop
      const boughtPoultryCount = (baiState.items['hen'] || 0) + (baiState.items['duck'] || 0);
      if (boughtPoultryCount > 0) {
        step = 10;
        sendBenWs({ t: 'birdPut' });
        baiState.items['hen'] = 0;
        baiState.items['duck'] = 0;
        return {
          nextWorkStep: step,
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
        sendBenWs({ t: 'netPull' });
        farm.netFish = netFish.filter((f) => toTimestampMs(f.readyAt) > nowMs);
        return {
          nextWorkStep: 10, // Giữ ở bước 10 để kiểm tra tiếp rải cám / thả giống
          result: {
            acted: true,
            msg: `🎣 Lưới Quây Nuôi Cá: Kéo lưới thu hoạch ${adultFish.length} con cá trưởng thành!`,
            allowCast: false,
          },
        };
      }

      // B. Feed hungry fish (2-phase: buy feed first -> feed on next tick)
      const isHungry = netFish.some((f) => f.hungry);
      if (isHungry && cfg.benAutoFeedNet !== false) {
        const feedFishRatio = baiState.info?.net?.feedFish || 5;
        const neededFeed = Math.max(1, Math.ceil(netFish.length / feedFishRatio));
        const currentFeed = baiState.items['netFeed'] || 0;

        if (currentFeed < neededFeed) {
          const missingFeed = neededFeed - currentFeed;
          sendBenWs({ t: 'netBuy', kind: 'feed', qty: missingFeed });
          baiState.items['netFeed'] = currentFeed + missingFeed;
          return {
            nextWorkStep: 10, // Giữ ở bước 10 để tick tiếp theo rải cám
            result: {
              acted: true,
              msg: `🌾 Ghe Anh Mười: Đã mua ${missingFeed} bao cám nuôi cá sông...`,
              allowCast: false,
            },
          };
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

      // C. Put fry into net
      const fryKeys = Object.keys(baiState.items).filter(
        (k) => k.startsWith('fry:') && baiState.items[k] > 0
      );
      if (fryKeys.length > 0) {
        step = 11;
        sendBenWs({ t: 'netPut' });
        for (const k of fryKeys) {
          baiState.items[k] = 0;
        }
        return {
          nextWorkStep: step,
          result: {
            acted: true,
            msg: '🐟 Lưới Quây Nuôi Cá: Đã thả cá giống vào khúc sông quây lưới!',
            allowCast: false,
          },
        };
      }
    }
  }

  return {
    nextWorkStep: 11,
    result: {
      acted: true,
      msg: '🌾 Đất Bãi: Đã hoàn tất việc vườn, đang ra Chợ Bãi giao thương...',
      allowCast: false,
      doneFarm: true,
    },
  };
}
