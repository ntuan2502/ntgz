import { stores } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { getActiveTrend, getTrendQuota } from '../../core/store-watcher';
import { GOLD_CATALOG, getGoldBuyPrice, getGoldSellPrice } from './gold-sim';

export function handleMarketSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
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
  const stV = stores.main.getState();
  if (cfg.autoVillageBoard !== false) {
    if (stV.village?.newsDay > 0 && !stV.village?.met) {
      stV.meetKhang?.();
    }
    const curV = stores.main.getState();
    if (Array.isArray(curV.village?.requests)) {
      for (const req of curV.village.requests) {
        if (!req.done) {
          const have = req.goods === 'egg' ? curV.eggs || 0 : curV.produce?.[req.goods] || 0;
          if (have >= req.qty && curV.deliverRequest?.(req.id) === true) {
            return {
              acted: true,
              msg: `📋 Đã giao ${req.qty} ${cropNames[req.goods] || req.goods} giúp ${req.who} (Bảng tin làng)`,
            };
          }
        }
      }
    }
  }

  // 7c. Sell Trend goods (ONLY exact boosted quota, never over-sell!)
  const stT = stores.main.getState();
  if (cfg.autoSellTrend !== false) {
    const curTrend = getActiveTrend(stT.day);
    if (curTrend) {
      const plotCount = Object.keys(stT.plots || {}).length;
      const quota = getTrendQuota(curTrend.goods, stT.day, plotCount, stT.trendLog);
      if (quota > 0) {
        const have = curTrend.goods === 'egg' ? stT.eggs || 0 : stT.produce?.[curTrend.goods] || 0;
        const reserved = stT.order && stT.order.crop === curTrend.goods ? stT.order.qty : 0;
        const sellable = Math.max(0, have - reserved);
        const toSell = Math.min(sellable, quota);
        if (toSell > 0) {
          const sold = stT.sellQty?.(curTrend.goods, toSell);
          if (sold > 0) {
            return {
              acted: true,
              msg: `🔥 Đã bán đúng ${sold} ${cropNames[curTrend.goods] || curTrend.goods} theo Trend sốt dẻo (x2 giá)`,
            };
          }
        }
      }
    }
  }

  // 7d. Sell produce to complete Sổ tay "Bán hàng" task or Day 1 sell task
  const stS = stores.main.getState();
  if (cfg.autoSellDailyTask !== false) {
    const sellTask = (stS.daily?.tasks || []).find(
      (t: any) => !t.claimed && t.kind === 'sell' && (stS.stats?.earned || 0) - (t.base || 0) < t.need
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
            const missing = sellTask.need - ((stS.stats?.earned || 0) - (sellTask.base || 0));
            const unitPrice = item === 'egg' ? 1000 : (stS.prices?.[item] || 500);
            qtyToSell = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
          }
          const sold = stS.sellQty?.(item, qtyToSell);
          if (sold > 0) {
            return {
              acted: true,
              msg: `📋 Đã bán ${sold} ${cropNames[item] || item} để hoàn thành Việc Sổ tay hôm nay`,
            };
          }
        }
      }
    }
  }

  // 7e. Auto sell surplus crops
  const stSurplus = stores.main.getState();
  if (cfg.autoSellProduce === true) {
    const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 20);
    const items = ['rice', 'corn', 'carrot', 'radish', 'egg'];
    for (const item of items) {
      const have = item === 'egg' ? stSurplus.eggs || 0 : stSurplus.produce?.[item] || 0;
      const reserved = (stSurplus.order && stSurplus.order.crop === item ? stSurplus.order.qty : 0) + minKeep;
      const sellable = have - reserved;
      if (sellable > 0) {
        const sold = stSurplus.sellQty?.(item, sellable);
        if (sold > 0) {
          return {
            acted: true,
            msg: `🏪 Đã bán ${sold} ${cropNames[item] || item} nông sản dư (giữ lại ${minKeep})`,
          };
        }
      }
    }
  }

  // 7f. Cô Kim Tiệm Vàng
  const stG = stores.main.getState();
  if (stG.goldShop && (stG.goldShop.newsDay > 0 || stG.day >= 30)) {
    // Auto Sell Gold
    if (cfg.goldAutoSell !== false) {
      const targetProfitPct = Number(cfg.goldProfitPercent) || 10;
      for (const type of ['mieng', 'nhan', 'k18', 'non']) {
        const holding = stG.goldShop.hold?.[type];
        if (holding && holding.qty > 0 && holding.cost > 0) {
          const costPerUnit = holding.cost / holding.qty;
          const sellPrice = getGoldSellPrice(stG.goldShop.seed, type, stG.day, stG.minutes);
          const profitPerUnit = sellPrice - costPerUnit;
          const profitPct = (profitPerUnit / costPerUnit) * 100;
          if (profitPct >= targetProfitPct && canAct('farm_gold', 3500)) {
            const profit = stG.sellGold?.(type, holding.qty);
            if (profit !== null && profit !== undefined) {
              markActed('farm_gold');
              return {
                acted: true,
                msg: `🪙 Đã bán chốt lời ${holding.qty} chỉ ${GOLD_CATALOG[type]?.name || type} tại Tiệm Vàng Cô Kim (+${profit.toLocaleString('vi-VN')}đ, lãi ${Math.round(profitPct)}%)`,
              };
            }
          }
        }
      }
    }

    // Auto Buy Gold
    if (cfg.goldAutoBuy && canAct('farm_gold', 3500)) {
      const prefType = cfg.goldPreferType || 'mieng';
      const keepCash = Number(cfg.goldKeepCash) || 500000;
      const buyPrice = getGoldBuyPrice(stG.goldShop.seed, prefType, stG.day, stG.minutes);
      if (buyPrice > 0 && stG.gold - buyPrice >= keepCash) {
        const res = stG.buyGold?.(prefType, 1);
        if (res === 'ok') {
          markActed('farm_gold');
          return {
            acted: true,
            msg: `🪙 Đã mua 1 chỉ ${GOLD_CATALOG[prefType]?.name || prefType} đầu tư tại Tiệm Vàng Cô Kim (-${buyPrice.toLocaleString('vi-VN')}đ)`,
          };
        }
      }
    }
  }

  return { acted: false };
}
