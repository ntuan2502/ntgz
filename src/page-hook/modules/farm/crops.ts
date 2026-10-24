import { stores, getActiveScene } from '../../core/engine-access';

export function handleCropsSubArea(cfg: any): { acted: boolean; msg?: string } {
  const st = stores.main?.getState();
  if (!st) return { acted: false };

  const mainScene = getActiveScene('MainScene');
  const plotKeys = Object.keys(st.plots || {});
  const cropNames: Record<string, string> = { radish: 'Củ cải', carrot: 'Cà rốt', corn: 'Bắp ngô', rice: 'Lúa thơm' };

  const applyOnPlot = (key: string, tool: string): boolean => {
    const s0 = stores.main.getState();
    s0.setActiveTool?.(tool);
    const prevPlotRef = s0.plots?.[key];

    if (mainScene && typeof mainScene.doWork === 'function') {
      try {
        mainScene.doWork({ plot: key, tool });
      } catch (_) {}
      if (stores.main.getState().plots?.[key] !== prevPlotRef) {
        return true;
      }
    }

    const res = stores.main.getState().applyTool?.(key, tool);
    if (res && mainScene?.plots?.playEffect) {
      try {
        mainScene.plots.playEffect(res, key);
      } catch (_) {}
    }
    return Boolean(res);
  };

  // Step A: Harvest 1 mature plot
  if (cfg.autoHarvest !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'basket')) {
        const cropId = st.plots[key]?.crop?.id;
        if (applyOnPlot(key, 'basket')) {
          return { acted: true, msg: `🧺 Thu hoạch ${cropNames[cropId] || 'nông sản'} ô (${key})` };
        }
      }
    }
  }

  // Step B: Spray pesticide on 1 pest-infested plot
  if (cfg.autoPesticide !== false) {
    for (const key of plotKeys) {
      const p = st.plots[key];
      if (p && p.crop && p.crop.pests) {
        if ((st.items?.pesticide || 0) <= 0 && st.gold >= 8000) {
          st.buyItems?.({ fertilizer: 0, pesticide: 1, mysteryBag: 0 });
        }
        if ((stores.main.getState().items?.pesticide || 0) > 0 && applyOnPlot(key, 'pesticide')) {
          return { acted: true, msg: `🐛 Đã xịt thuốc trừ sâu ô (${key})` };
        }
      }
    }
  }

  // Step C: Plant seed on 1 empty plot
  if (cfg.autoPlant !== false) {
    const hasEmptyPlot = plotKeys.some((k) => st.plots[k] && !st.plots[k].crop);
    if (hasEmptyPlot) {
      if ((st.items?.mysteryBag || 0) > 0) {
        const opened = st.consumeItem?.('mysteryBag');
        if (opened) {
          return { acted: true, msg: `🎁 Đã mở Túi hạt bí ẩn nhận thêm hạt giống` };
        }
      }

      const ensureSeed = (cropId: string): string | null => {
        if (!cropId) return null;
        const cur = stores.main.getState();
        if ((cur.seeds?.[cropId] || 0) > 0) return cropId;
        const payload: Record<string, number> = { radish: 0, carrot: 0, corn: 0, rice: 0 };
        if (!(cropId in payload)) return null;
        payload[cropId] = 1;
        if (cur.buySeeds?.(payload) === true && (stores.main.getState().seeds?.[cropId] || 0) > 0) {
          return cropId;
        }
        return null;
      };

      const countGrowingCrop = (cropId: string): number => {
        const cur = stores.main.getState();
        let count = 0;
        for (const k of Object.keys(cur.plots || {})) {
          if (cur.plots[k]?.crop?.id === cropId) count++;
        }
        return count;
      };

      const chooseSeed = (): string | null => {
        const cur = stores.main.getState();
        const pref = cfg.preferSeed || 'auto';

        if (pref !== 'auto') {
          const gotPref = ensureSeed(pref);
          if (gotPref) return gotPref;
        }

        // Smart auto-selection
        if (cur.order && cur.order.crop) {
          const c = cur.order.crop;
          const projected = (cur.produce?.[c] || 0) + countGrowingCrop(c) * 4;
          if (projected < cur.order.qty) {
            const got = ensureSeed(c);
            if (got) return got;
          }
        }

        if (Array.isArray(cur.daily?.tasks)) {
          for (const task of cur.daily.tasks) {
            if (!task.claimed && task.kind === 'harvest' && task.crop) {
              const harvestedNow = (cur.stats?.harvested?.[task.crop] || 0) - (task.base || 0);
              if (harvestedNow + countGrowingCrop(task.crop) * 4 < task.need) {
                const got = ensureSeed(task.crop);
                if (got) return got;
              }
            }
          }
        }

        if (Array.isArray(cur.village?.requests)) {
          for (const req of cur.village.requests) {
            if (!req.done && req.goods && req.goods !== 'egg') {
              const projected = (cur.produce?.[req.goods] || 0) + countGrowingCrop(req.goods) * 4;
              if (projected < req.qty) {
                const got = ensureSeed(req.goods);
                if (got) return got;
              }
            }
          }
        }

        if (cur.day <= 2 && !cur.firstDay?.cooked && (cur.produce?.radish || 0) + countGrowingCrop('radish') * 4 < 3) {
          const got = ensureSeed('radish');
          if (got) return got;
        }

        const order = ['rice', 'corn', 'carrot', 'radish'];
        for (const c of order) {
          if ((cur.seeds?.[c] || 0) > 0) return c;
        }
        for (const c of order) {
          const got = ensureSeed(c);
          if (got) return got;
        }
        return null;
      };

      for (const key of plotKeys) {
        const p = stores.main.getState().plots[key];
        if (p && !p.crop) {
          const seed = chooseSeed();
          if (seed && applyOnPlot(key, `seed:${seed}`)) {
            return { acted: true, msg: `🌱 Đã gieo hạt ${cropNames[seed] || seed} ô (${key})` };
          }
          break;
        }
      }
    }
  }

  // Step D: Water 1 dry plot
  if (cfg.autoWater !== false) {
    const curSt = stores.main.getState();
    for (const key of plotKeys) {
      if (curSt.previewTool?.(key, 'wateringCan')) {
        if (applyOnPlot(key, 'wateringCan')) {
          return { acted: true, msg: `💧 Đã tưới nước ô (${key})` };
        }
      }
    }
  }

  // Step E: Fertilize 1 unfertilized growing plot
  if (cfg.autoFertilize) {
    const curSt = stores.main.getState();
    for (const key of plotKeys) {
      const p = curSt.plots[key];
      if (p && p.crop && !p.crop.fertilized && curSt.previewTool?.(key, 'fertilizer')) {
        if ((curSt.items?.fertilizer || 0) <= 0 && curSt.gold >= 15000) {
          curSt.buyItems?.({ fertilizer: 1, pesticide: 0, mysteryBag: 0 });
        }
        if ((stores.main.getState().items?.fertilizer || 0) > 0 && applyOnPlot(key, 'fertilizer')) {
          return { acted: true, msg: `✨ Đã bón phân NPK ô (${key})` };
        }
      }
    }
  }

  // Step F: Pay crop helper (Tèo) if unpaid > 0
  const curSt2 = stores.main.getState();
  if (curSt2.helpers?.crops?.hired && (curSt2.helpers.crops.unpaid || 0) > 0) {
    if (curSt2.payHelper?.('crops') === true) {
      return { acted: true, msg: `💸 Đã trả lương nợ cho Tèo phụ ruộng` };
    }
  }

  // Step G: Buy new land plot if offered
  const curSt3 = stores.main.getState();
  if (cfg.autoBuyPlots !== false && curSt3.plotOffer && curSt3.gold >= (curSt3.plotOffer.price || 0)) {
    if (curSt3.buyPlot?.() === true) {
      return { acted: true, msg: `🌱 Đã mua thêm ô đất ruộng mới (+1 ô)` };
    }
  }

  return { acted: false };
}
