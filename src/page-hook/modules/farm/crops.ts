import { getMainState, getActiveScene } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { BuySeedsPayload } from '../../../shared/types/game-store';
import { StepResult, NOT_ACTED, CROP_NAMES } from './types';

interface MainSceneLike {
  doWork?: (args: { plot: string; tool: string }) => void;
  plots?: { playEffect?: (res: unknown, plot: string) => void };
}

/** Each harvested plot yields ~4 crops; used to project upcoming produce */
const YIELD_PER_PLOT = 4;
const SEED_FALLBACK_ORDER = ['rice', 'corn', 'carrot', 'radish'];

function applyOnPlot(key: string, tool: string): boolean {
  const mainScene = getActiveScene('MainScene') as MainSceneLike | null;
  const s0 = getMainState();
  s0.setActiveTool?.(tool);
  const p0 = s0.plots?.[key];
  const prevWatered = p0?.watered;
  const prevCrop = p0?.crop;
  const prevCropId = prevCrop?.id;
  const prevStage = prevCrop?.stage;
  const prevFertilized = prevCrop?.fertilized;
  const prevPests = prevCrop?.pests;

  if (mainScene && typeof mainScene.doWork === 'function') {
    try {
      mainScene.doWork({ plot: key, tool });
    } catch {
      // Scene may reject the work call; fall back to the store action below
    }
    const pAfter = getMainState().plots?.[key];
    const hasChanged =
      pAfter !== p0 ||
      pAfter?.watered !== prevWatered ||
      pAfter?.crop?.id !== prevCropId ||
      pAfter?.crop?.stage !== prevStage ||
      pAfter?.crop?.fertilized !== prevFertilized ||
      pAfter?.crop?.pests !== prevPests;
    if (hasChanged) return true;
  }

  const res = getMainState().applyTool?.(key, tool);
  if (res && mainScene?.plots?.playEffect) {
    try {
      mainScene.plots.playEffect(res, key);
    } catch {
      // Visual effect only
    }
  }

  const pFinal = getMainState().plots?.[key];
  return (
    Boolean(res) ||
    pFinal !== p0 ||
    pFinal?.watered !== prevWatered ||
    pFinal?.crop?.id !== prevCropId ||
    pFinal?.crop?.stage !== prevStage ||
    pFinal?.crop?.fertilized !== prevFertilized ||
    pFinal?.crop?.pests !== prevPests
  );
}

function ensureSeed(cropId: string, allowBuy: boolean): string | null {
  const cur = getMainState();
  if ((cur.seeds?.[cropId] || 0) > 0) return cropId;
  if (!allowBuy) return null;
  const payload: BuySeedsPayload = { radish: 0, carrot: 0, corn: 0, rice: 0 };
  if (!(cropId in payload)) return null;
  payload[cropId as keyof BuySeedsPayload] = 1;
  if (cur.buySeeds?.(payload) === true && (getMainState().seeds?.[cropId] || 0) > 0) {
    return cropId;
  }
  return null;
}

function countGrowingCrop(cropId: string): number {
  const plots = getMainState().plots || {};
  return Object.values(plots).filter((p) => p?.crop?.id === cropId).length;
}

/** Picks the most useful seed: preference → grocery order → daily task → village board → early game → fallback */
function chooseSeed(cfg: AppConfig): string | null {
  const cur = getMainState();
  const pref = cfg.preferSeed || 'auto';
  const allowBuy = cfg.autoBuySeeds === true;

  if (pref !== 'auto') {
    const got = ensureSeed(pref, allowBuy);
    if (got) return got;
  }

  if (cur.order?.crop) {
    const c = cur.order.crop;
    if ((cur.produce?.[c] || 0) + countGrowingCrop(c) * YIELD_PER_PLOT < cur.order.qty) {
      const got = ensureSeed(c, allowBuy);
      if (got) return got;
    }
  }

  for (const task of cur.daily?.tasks || []) {
    if (!task.claimed && task.kind === 'harvest' && task.crop) {
      const harvestedNow = (cur.stats?.harvested?.[task.crop] || 0) - (task.base || 0);
      if (harvestedNow + countGrowingCrop(task.crop) * YIELD_PER_PLOT < (task.need || 0)) {
        const got = ensureSeed(task.crop, allowBuy);
        if (got) return got;
      }
    }
  }

  for (const req of cur.village?.requests || []) {
    if (!req.done && req.goods && req.goods !== 'egg') {
      if ((cur.produce?.[req.goods] || 0) + countGrowingCrop(req.goods) * YIELD_PER_PLOT < (req.qty || 0)) {
        const got = ensureSeed(req.goods, allowBuy);
        if (got) return got;
      }
    }
  }

  if ((cur.day || 0) <= 2 && !cur.firstDay?.cooked && (cur.produce?.radish || 0) + countGrowingCrop('radish') * YIELD_PER_PLOT < 3) {
    const got = ensureSeed('radish', allowBuy);
    if (got) return got;
  }

  for (const c of SEED_FALLBACK_ORDER) {
    if ((cur.seeds?.[c] || 0) > 0) return c;
  }
  if (allowBuy) {
    for (const c of SEED_FALLBACK_ORDER) {
      const got = ensureSeed(c, true);
      if (got) return got;
    }
  }
  return null;
}

export function handleCropsSubArea(cfg: AppConfig): StepResult {
  const st = getMainState();
  const plotKeys = Object.keys(st.plots || {});

  // A. Harvest 1 mature plot
  if (cfg.autoHarvest !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'basket')) {
        const cropId = st.plots?.[key]?.crop?.id || '';
        if (applyOnPlot(key, 'basket')) {
          return { acted: true, msg: `🧺 Thu hoạch ${CROP_NAMES[cropId] || 'nông sản'} ô (${key})` };
        }
      }
    }
  }

  // B. Spray pesticide on 1 pest-infested plot
  if (cfg.autoPesticide !== false) {
    for (const key of plotKeys) {
      if (!st.plots?.[key]?.crop?.pests) continue;
      if ((st.items?.pesticide || 0) <= 0) {
        if (cfg.autoBuyPesticide && (st.gold || 0) >= 8000) {
          st.buyItems?.({ fertilizer: 0, pesticide: 1, mysteryBag: 0 });
        }
      }
      if ((getMainState().items?.pesticide || 0) > 0 && applyOnPlot(key, 'pesticide')) {
        return { acted: true, msg: `🐛 Đã xịt thuốc trừ sâu ô (${key})` };
      }
    }
  }

  // C. Plant seed on empty plots
  if (cfg.autoPlant !== false) {
    const curP = getMainState();
    const emptyKeys = plotKeys.filter((k) => {
      const p = curP.plots?.[k];
      return p && !p.crop;
    });

    if (emptyKeys.length > 0) {
      if ((curP.items?.mysteryBag || 0) > 0 && curP.consumeItem?.('mysteryBag')) {
        return { acted: true, msg: '🎁 Đã mở Túi hạt bí ẩn nhận thêm hạt giống' };
      }

      const seed = chooseSeed(cfg);
      if (seed) {
        for (const emptyKey of emptyKeys) {
          if (applyOnPlot(emptyKey, `seed:${seed}`)) {
            return { acted: true, msg: `🌱 Đã gieo hạt ${CROP_NAMES[seed] || seed} ô (${emptyKey})` };
          }
        }
      }
    }
  }

  // D. Water 1 dry plot
  if (cfg.autoWater !== false) {
    const curW = getMainState();
    for (const key of plotKeys) {
      const p = curW.plots?.[key];
      const isDry = p?.crop && !p.watered;
      if (curW.previewTool?.(key, 'wateringCan') || isDry) {
        if (applyOnPlot(key, 'wateringCan')) {
          return { acted: true, msg: `💧 Đã tưới nước ô (${key})` };
        }
      }
    }
  }

  // E. Fertilize 1 unfertilized growing plot
  if (cfg.autoFertilize) {
    const cur = getMainState();
    for (const key of plotKeys) {
      const p = cur.plots?.[key];
      if (!p?.crop || p.crop.fertilized || !cur.previewTool?.(key, 'fertilizer')) continue;
      if ((cur.items?.fertilizer || 0) <= 0) {
        if (cfg.autoBuyFertilizer && (cur.gold || 0) >= 15000) {
          cur.buyItems?.({ fertilizer: 1, pesticide: 0, mysteryBag: 0 });
        }
      }
      if ((getMainState().items?.fertilizer || 0) > 0 && applyOnPlot(key, 'fertilizer')) {
        return { acted: true, msg: `✨ Đã bón phân NPK ô (${key})` };
      }
    }
  }

  // F. Pay crop helper (Tèo) if unpaid
  if (cfg.autoPayHelperCrops !== false) {
    const curHelper = getMainState();
    if (curHelper.helpers?.crops?.hired && (curHelper.helpers.crops.unpaid || 0) > 0 && curHelper.payHelper?.('crops') === true) {
      return { acted: true, msg: '💸 Đã trả lương nợ cho Tèo phụ ruộng' };
    }
  }

  // G. Buy new land plot if offered
  const curOffer = getMainState();
  if (cfg.autoBuyPlots !== false && curOffer.plotOffer && (curOffer.gold || 0) >= (curOffer.plotOffer.price || 0)) {
    if (curOffer.buyPlot?.() === true) {
      return { acted: true, msg: '🌱 Đã mua thêm ô đất ruộng mới (+1 ô)' };
    }
  }

  return NOT_ACTED;
}
