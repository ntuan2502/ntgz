import { getMainStore, getMainState, getActiveScene } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';

export function handleCropsSubArea(cfg: AppConfig): { acted: boolean; msg?: string } {
  const mainStore = getMainStore();
  if (!mainStore) return { acted: false };
  const st = mainStore.getState();

  const mainScene = getActiveScene('MainScene') as unknown as {
    doWork?: (args: { plot: string; tool: string }) => void;
    plots?: { playEffect?: (res: unknown, plot: string) => void };
  } | null;

  const plotKeys = Object.keys(st.plots || {});
  const cropNames: Record<string, string> = { radish: 'Củ cải', carrot: 'Cà rốt', corn: 'Bắp ngô', rice: 'Lúa thơm' };

  const applyOnPlot = (key: string, tool: string): boolean => {
    const s0 = getMainState();
    s0.setActiveTool?.(tool);
    const prevPlotRef = s0.plots?.[key];

    if (mainScene && typeof mainScene.doWork === 'function') {
      try {
        mainScene.doWork({ plot: key, tool });
      } catch {
        // ignore
      }
      if (getMainState().plots?.[key] !== prevPlotRef) {
        return true;
      }
    }

    const res = getMainState().applyTool?.(key, tool);
    if (res && mainScene?.plots?.playEffect) {
      try {
        mainScene.plots.playEffect(res, key);
      } catch {
        // ignore
      }
    }
    return Boolean(res);
  };

  // Step A: Harvest 1 mature plot
  if (cfg.autoHarvest !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'basket')) {
        const cropId = st.plots?.[key]?.crop?.id || '';
        if (applyOnPlot(key, 'basket')) {
          return { acted: true, msg: `🧺 Thu hoạch ${cropNames[cropId] || 'nông sản'} ô (${key})` };
        }
      }
    }
  }

  // Step B: Pesticide (Kill pests)
  if (cfg.autoPesticide !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'pesticide')) {
        if (applyOnPlot(key, 'pesticide')) {
          return { acted: true, msg: `🐛 Xịt thuốc diệt sâu bọ ô (${key})` };
        }
      }
    }
  }

  // Step C: Auto-Planting (Buy seeds first if warehouse empty)
  if (cfg.autoPlant !== false) {
    const emptyPlots = plotKeys.filter((k) => !st.plots?.[k]?.crop);
    if (emptyPlots.length > 0) {
      const preferred = cfg.preferSeed || 'auto';
      let seedToPlant: string;
      const seedList = ['radish', 'carrot', 'corn', 'rice'];

      if (preferred === 'auto') {
        const curM = getMainState();
        const curGold = curM.gold || 0;
        if (curGold < 1500) seedToPlant = 'radish';
        else if (curGold < 5000) seedToPlant = 'carrot';
        else if (curGold < 15000) seedToPlant = 'corn';
        else seedToPlant = 'rice';
      } else {
        seedToPlant = preferred;
      }

      if (seedToPlant) {
        const seedStock = st.seeds?.[seedToPlant] || 0;
        if (seedStock < emptyPlots.length) {
          const needed = emptyPlots.length - seedStock;
          const buyCount = Math.min(needed, 10);
          const seedPrices: Record<string, number> = { radish: 50, carrot: 120, corn: 280, rice: 600 };
          const cost = (seedPrices[seedToPlant] || 100) * buyCount;

          if ((getMainState().gold || 0) >= cost) {
            if (getMainState().buySeed?.(seedToPlant, buyCount) === 'ok') {
              return {
                acted: true,
                msg: `🌱 Đã mua ${buyCount} hạt giống ${cropNames[seedToPlant] || seedToPlant}`,
              };
            }
          }
        }
      }

      const freshM = getMainState();
      let plantChoice: string | null = null;
      if (seedToPlant && (freshM.seeds?.[seedToPlant] || 0) > 0) {
        plantChoice = seedToPlant;
      } else {
        for (const sName of seedList) {
          if ((freshM.seeds?.[sName] || 0) > 0) {
            plantChoice = sName;
            break;
          }
        }
      }

      if (plantChoice) {
        const targetPlot = emptyPlots[0];
        if (applyOnPlot(targetPlot, `seed:${plantChoice}`)) {
          return {
            acted: true,
            msg: `🌱 Gieo hạt giống ${cropNames[plantChoice] || plantChoice} ô (${targetPlot})`,
          };
        }
      }
    }
  }

  // Step D: Water all unwatered plots
  if (cfg.autoWater !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'can')) {
        if (applyOnPlot(key, 'can')) {
          return { acted: true, msg: `💧 Tưới nước giữ ẩm đất ô (${key})` };
        }
      }
    }
  }

  // Step E: Fertilize plots
  if (cfg.autoFertilize !== false) {
    for (const key of plotKeys) {
      if (st.previewTool?.(key, 'fertilizer')) {
        if (applyOnPlot(key, 'fertilizer')) {
          return { acted: true, msg: `✨ Bón phân NPK tăng trưởng ô (${key})` };
        }
      }
    }
  }

  // Step F: Buy more farm plots if player has enough gold
  if (cfg.autoBuyPlots !== false) {
    const curGold = getMainState().gold || 0;
    const currentCount = plotKeys.length;
    const plotCosts = [
      0, 0, 0, 0,
      1000, 2000, 3500, 5000,
      8000, 12000, 18000, 25000,
      35000, 50000, 70000, 100000,
      140000, 190000, 250000, 320000,
      400000, 500000, 620000, 760000,
      920000, 1100000, 1300000, 1550000,
      1850000, 2200000, 2600000, 3100000,
    ];
    const nextCost = plotCosts[currentCount] || 0;

    if (currentCount < 32 && nextCost > 0 && curGold >= nextCost + 15000) {
      const res = getMainState().buyPlot?.();
      if (res === 'ok' || res === 'bought') {
        return { acted: true, msg: `🚜 Đã mua thêm ô đất ruộng #${currentCount + 1} (-${nextCost.toLocaleString('vi-VN')}đ)` };
      }
    }
  }

  return { acted: false };
}
