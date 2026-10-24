import { getMainState } from '../../core/engine-access';
import { getActiveTrend, getTrendQuota } from '../../core/store-watcher';
import { GOLD_CATALOG, getGoldBuyPrice, getGoldSellPrice } from './gold-sim';
import { AppConfig } from '../../../shared/types/config';

export function handleMarketSubArea(cfg: AppConfig): { acted: boolean; msg?: string } {
  const m = getMainState();
  if (!m) return { acted: false };

  const cropNames: Record<string, string> = {
    radish: 'Củ cải',
    carrot: 'Cà rốt',
    corn: 'Bắp ngô',
    rice: 'Lúa thơm',
    egg: 'Trứng gà',
  };

  // 7a. Deliver Grocery Order to Chị Na
  if (cfg.autoDeliverOrder !== false && m.order) {
    const have = m.produce?.[m.order.crop] || 0;
    if (have >= m.order.qty) {
      const reward = m.order.reward || 0;
      const cropLabel = cropNames[m.order.crop] || m.order.crop;
      if (m.deliverOrder?.() === true) {
        return {
          acted: true,
          msg: `📦 Đã giao đơn hàng Chị Na (${cropLabel}) +${reward.toLocaleString('vi-VN')}đ`,
        };
      }
    }
  }

  // 7b. Unlock & Deliver Village Board Requests
  const stV = getMainState();
  if (cfg.autoVillageBoard !== false) {
    if ((stV.village?.newsDay || 0) > 0 && !stV.village?.met) {
      stV.meetKhang?.();
    }
    const curV = getMainState();
    if (Array.isArray(curV.village?.requests)) {
      for (const req of curV.village.requests) {
        if (!req.fulfilled) {
          const itemKey = req.crop || req.item || '';
          const have = itemKey === 'egg' ? curV.eggs || 0 : curV.produce?.[itemKey] || 0;
          if (have >= (req.qty || 0)) {
            if (curV.deliverVillageRequest?.(req.id) === true) {
              return {
                acted: true,
                msg: `📋 Đã giao đơn Bảng tin làng (${cropNames[itemKey] || itemKey}) +${(req.reward || 0).toLocaleString('vi-VN')}đ`,
              };
            }
          }
        }
      }
    }
  }

  // 7c. Sell Trend produce (x2 price during trend hours)
  const stT = getMainState();
  if (cfg.autoSellTrend !== false && stT.day) {
    const tr = getActiveTrend(stT.day);
    if (tr) {
      const quota = getTrendQuota(tr.goods, stT.day, Object.keys(stT.plots || {}).length, stT.trendLog);
      if (quota > 0) {
        const have = tr.goods === 'egg' ? stT.eggs || 0 : stT.produce?.[tr.goods] || 0;
        const sellCount = Math.min(quota, have);
        if (sellCount > 0) {
          const ok = tr.goods === 'egg' ? stT.sellEgg?.(sellCount) : stT.sellProduce?.(tr.goods, sellCount);
          if (ok === true) {
            return {
              acted: true,
              msg: `📈 Bán ${sellCount} ${cropNames[tr.goods] || tr.goods} Xu hướng x2 giá chợ`,
            };
          }
        }
      }
    }
  }

  // 7d. Sell produce to complete Sổ tay "Bán hàng" task or Day 1 sell task
  const stS = getMainState();
  if (cfg.autoSellDailyTask !== false) {
    const sellTask = (stS.daily?.tasks || []).find(
      (t: { claimed?: boolean; kind?: string; base?: number; need?: number }) =>
        !t.claimed && t.kind === 'sell' && (stS.stats?.earned || 0) - (t.base || 0) < (t.need || 0)
    );
    const day1NeedSell = stS.day === 1 && (stS.stats?.earned || 0) === 0;

    if (sellTask || day1NeedSell) {
      const items = ['radish', 'carrot', 'corn', 'rice', 'egg'];
      for (const item of items) {
        const have = item === 'egg' ? stS.eggs || 0 : stS.produce?.[item] || 0;
        const reserved = stS.order && stS.order.crop === item ? stS.order.qty : 0;
        const sellable = Math.max(0, have - reserved);
        if (sellable > 0) {
          let qtyToSell = 1;
          if (sellTask) {
            const missing = (sellTask.need || 0) - ((stS.stats?.earned || 0) - (sellTask.base || 0));
            const unitPrice = item === 'egg' ? 1000 : (stS.prices?.[item] || 500);
            qtyToSell = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
          }
          const ok = item === 'egg' ? stS.sellEgg?.(qtyToSell) : stS.sellProduce?.(item, qtyToSell);
          if (ok === true) {
            return {
              acted: true,
              msg: `🏪 Bán ${qtyToSell} ${cropNames[item] || item} hoàn thành nhiệm vụ bán hàng`,
            };
          }
        }
      }
    }
  }

  // 7e. Sell surplus produce (Warehouse protection: only sell if quantity > surplusKeepQty)
  if (cfg.autoSellProduce && typeof cfg.surplusKeepQty === 'number') {
    const stSur = getMainState();
    const keepLimit = Number(cfg.surplusKeepQty) || 20;
    const items = ['radish', 'carrot', 'corn', 'rice', 'egg'];

    for (const item of items) {
      const have = item === 'egg' ? stSur.eggs || 0 : stSur.produce?.[item] || 0;
      const reserved = stSur.order && stSur.order.crop === item ? stSur.order.qty : 0;
      const surplus = have - Math.max(keepLimit, reserved);
      if (surplus > 0) {
        const ok = item === 'egg' ? stSur.sellEgg?.(surplus) : stSur.sellProduce?.(item, surplus);
        if (ok === true) {
          return {
            acted: true,
            msg: `📦 Bán ${surplus} ${cropNames[item] || item} dư kho (giữ lại tối thiểu ${keepLimit})`,
          };
        }
      }
    }
  }

  // 7f. Gold Cô Kim Investment Algorithm
  if (cfg.goldAutoBuy || cfg.goldAutoSell) {
    const stG = getMainState();
    const curGold = stG.gold || 0;
    const seed = (stG.day || 1) * 1000 + Math.floor((stG.minutes || 0) / 720);
    const day = stG.day || 1;
    const min = stG.minutes || 0;

    // Auto Sell Gold when profit reached
    if (cfg.goldAutoSell !== false) {
      const profitTarget = Number(cfg.goldProfitPercent) || 10;
      for (const t of Object.keys(GOLD_CATALOG)) {
        const have = stG.goldStock?.[t] || 0;
        const avgCost = stG.goldAvgCost?.[t] || 0;
        if (have > 0 && avgCost > 0) {
          const sellPrice = getGoldSellPrice(seed, t, day, min);
          const profit = ((sellPrice - avgCost) / avgCost) * 100;
          if (profit >= profitTarget) {
            if (stG.sellGold?.(t, have) === true) {
              return {
                acted: true,
                msg: `🪙 Bán chốt lời ${have} ${GOLD_CATALOG[t]?.name || t} (Lãi +${profit.toFixed(1)}%)`,
              };
            }
          }
        }
      }
    }

    // Auto Buy Gold
    if (cfg.goldAutoBuy) {
      const prefType = cfg.goldPreferType || 'mieng';
      const keepCash = Number(cfg.goldKeepCash) || 500000;
      const buyPrice = getGoldBuyPrice(seed, prefType, day, min);

      if (curGold >= keepCash + buyPrice && buyPrice > 0) {
        if (stG.buyGold?.(prefType) === true) {
          return {
            acted: true,
            msg: `🪙 Mua tích lũy 1 ${GOLD_CATALOG[prefType]?.name || prefType} Cô Kim (-${buyPrice.toLocaleString('vi-VN')}đ)`,
          };
        }
      }
    }
  }

  return { acted: false };
}
