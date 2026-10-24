import { getMainState } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { AppConfig } from '../../../shared/types/config';
import { MainGameStoreState } from '../../../shared/types/game-store';
import { GOLD_CATALOG, getGoldBuyPrice, getGoldSellPrice } from './gold-sim';
import { getActiveTrend, getTrendQuota } from './trend';
import { StepResult, NOT_ACTED, CROP_NAMES, formatVnd } from './types';

const GOLD_TYPES = ['mieng', 'nhan', 'k18', 'non'];

const stockOf = (st: MainGameStoreState, goods: string): number =>
  goods === 'egg' ? st.eggs || 0 : st.produce?.[goods] || 0;

/** Quantity reserved for the active grocery order (never sell below it) */
const reservedForOrder = (st: MainGameStoreState, goods: string): number =>
  st.order && st.order.crop === goods ? st.order.qty : 0;

function deliverGroceryOrder(): StepResult | null {
  const m = getMainState();
  if (!m.order || stockOf(m, m.order.crop) < m.order.qty) return null;
  const reward = m.order.reward || 0;
  const cropLabel = CROP_NAMES[m.order.crop] || m.order.crop;
  if (m.deliverOrder?.() === true) {
    return { acted: true, msg: `📦 Đã giao đơn hàng Chị Na (${cropLabel}) +${formatVnd(reward)}đ` };
  }
  return null;
}

function deliverVillageBoard(): StepResult | null {
  const st = getMainState();
  if ((st.village?.newsDay || 0) > 0 && !st.village?.met) {
    st.meetKhang?.();
  }
  const cur = getMainState();
  for (const req of cur.village?.requests || []) {
    if (req.done || !req.goods) continue;
    const qty = req.qty || 0;
    if (stockOf(cur, req.goods) >= qty && cur.deliverRequest?.(req.id) === true) {
      return { acted: true, msg: `📋 Đã giao ${qty} ${CROP_NAMES[req.goods] || req.goods} giúp ${req.who || 'bà con'} (Bảng tin làng)` };
    }
  }
  return null;
}

/** Sells ONLY the exact boosted trend quota, never over-sells */
function sellTrendGoods(): StepResult | null {
  const st = getMainState();
  const day = st.day || 0;
  const trend = getActiveTrend(day);
  if (!trend) return null;
  const quota = getTrendQuota(trend.goods, day, Object.keys(st.plots || {}).length, st.trendLog);
  if (quota <= 0) return null;
  const toSell = Math.min(Math.max(0, stockOf(st, trend.goods) - reservedForOrder(st, trend.goods)), quota);
  if (toSell <= 0) return null;
  const sold = st.sellQty?.(trend.goods, toSell) || 0;
  if (sold > 0) {
    return { acted: true, msg: `🔥 Đã bán đúng ${sold} ${CROP_NAMES[trend.goods] || trend.goods} theo Trend sốt dẻo (x2 giá)` };
  }
  return null;
}

/** Sells the MINIMUM produce needed to complete the notebook "sell" task (or the day-1 sell task) */
function sellForDailyTask(): StepResult | null {
  const st = getMainState();
  const earned = st.stats?.earned || 0;
  const sellTask = (st.daily?.tasks || []).find(
    (t) => !t.claimed && t.kind === 'sell' && earned - (t.base || 0) < (t.need || 0)
  );
  const day1NeedSell = st.day === 1 && earned === 0;
  if (!sellTask && !day1NeedSell) return null;

  for (const item of ['radish', 'carrot', 'corn', 'rice', 'egg']) {
    const sellable = Math.max(0, stockOf(st, item) - reservedForOrder(st, item));
    if (sellable <= 0) continue;
    let qty = 1;
    if (sellTask) {
      const missing = (sellTask.need || 0) - (earned - (sellTask.base || 0));
      const unitPrice = item === 'egg' ? 1000 : st.prices?.[item] || 500;
      qty = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
    }
    const sold = st.sellQty?.(item, qty) || 0;
    if (sold > 0) {
      return { acted: true, msg: `📋 Đã bán ${sold} ${CROP_NAMES[item] || item} để hoàn thành Việc Sổ tay hôm nay` };
    }
  }
  return null;
}

function sellSurplus(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 20);
  for (const item of ['rice', 'corn', 'carrot', 'radish', 'egg']) {
    const sellable = stockOf(st, item) - reservedForOrder(st, item) - minKeep;
    if (sellable <= 0) continue;
    const sold = st.sellQty?.(item, sellable) || 0;
    if (sold > 0) {
      return { acted: true, msg: `🏪 Đã bán ${sold} ${CROP_NAMES[item] || item} nông sản dư (giữ lại ${minKeep})` };
    }
  }
  return null;
}

/** Cô Kim gold shop (Chợ Lớn, unlocked day 30+) */
function tradeGold(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const shop = st.goldShop;
  if (!shop || !((shop.newsDay || 0) > 0 || (st.day || 0) >= 30)) return null;
  const seed = shop.seed || 0;
  const day = st.day || 0;
  const minutes = st.minutes || 0;

  if (cfg.goldAutoSell !== false) {
    const targetProfitPct = Number(cfg.goldProfitPercent) || 10;
    for (const type of GOLD_TYPES) {
      const holding = shop.hold?.[type];
      if (!holding || holding.qty <= 0 || holding.cost <= 0) continue;
      const costPerUnit = holding.cost / holding.qty;
      const sellPrice = getGoldSellPrice(seed, type, day, minutes);
      const profitPct = ((sellPrice - costPerUnit) / costPerUnit) * 100;
      if (profitPct >= targetProfitPct && canAct('farm_gold', 3500)) {
        const profit = st.sellGold?.(type, holding.qty);
        if (profit !== null && profit !== undefined) {
          markActed('farm_gold');
          return {
            acted: true,
            msg: `🪙 Đã bán chốt lời ${holding.qty} chỉ ${GOLD_CATALOG[type]?.name || type} tại Tiệm Vàng Cô Kim (+${formatVnd(profit)}đ, lãi ${Math.round(profitPct)}%)`,
          };
        }
      }
    }
  }

  if (cfg.goldAutoBuy && canAct('farm_gold', 3500)) {
    const prefType = cfg.goldPreferType || 'mieng';
    const keepCash = Number(cfg.goldKeepCash) || 500000;
    const buyPrice = getGoldBuyPrice(seed, prefType, day, minutes);
    if (buyPrice > 0 && (st.gold || 0) - buyPrice >= keepCash && st.buyGold?.(prefType, 1) === 'ok') {
      markActed('farm_gold');
      return {
        acted: true,
        msg: `🪙 Đã mua 1 chỉ ${GOLD_CATALOG[prefType]?.name || prefType} đầu tư tại Tiệm Vàng Cô Kim (-${formatVnd(buyPrice)}đ)`,
      };
    }
  }
  return null;
}

export function handleMarketSubArea(cfg: AppConfig): StepResult {
  return (
    (cfg.autoDeliverOrder !== false ? deliverGroceryOrder() : null) ||
    (cfg.autoVillageBoard !== false ? deliverVillageBoard() : null) ||
    (cfg.autoSellTrend !== false ? sellTrendGoods() : null) ||
    (cfg.autoSellDailyTask !== false ? sellForDailyTask() : null) ||
    (cfg.autoSellProduce === true ? sellSurplus(cfg) : null) ||
    tradeGold(cfg) ||
    NOT_ACTED
  );
}
