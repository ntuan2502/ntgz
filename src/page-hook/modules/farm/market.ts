import { getMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { MainGameStoreState } from '../../../shared/types/game-store';
import { getActiveTrend, getTrendQuota } from './trend';
import { StepResult, NOT_ACTED, CROP_NAMES, formatVnd, showFarmActionUI } from './types';

const CROP_KEYS = ['rice', 'corn', 'carrot', 'radish', 'egg'];

const stockOf = (st: MainGameStoreState, goods: string): number =>
  goods === 'egg' ? st.eggs || 0 : st.produce?.[goods] || 0;

/** Calculates all reserved quantities for orders, village requests, daily tasks, and kitchen */
function getReservedQty(st: MainGameStoreState, item: string, cfg: AppConfig): number {
  let reserved = 0;

  // 1. Chị Na grocery order
  if (cfg.sellReserveForOrders !== false && st.order && st.order.crop === item) {
    reserved += (st.order.qty || 0);
  }

  // 2. Village board requests
  if (cfg.sellReserveForVillage !== false && Array.isArray(st.village?.requests)) {
    for (const req of st.village.requests) {
      if (!req.done && req.goods === item) {
        reserved += (req.qty || 0);
      }
    }
  }

  // 3. Daily notebook tasks (harvest/hold)
  if (Array.isArray(st.daily?.tasks)) {
    for (const t of st.daily.tasks) {
      if (!t.claimed && t.crop === item && t.kind === 'harvest') {
        const harvested = (st.stats?.harvested?.[item] || 0) - (t.base || 0);
        const missing = Math.max(0, (t.need || 0) - harvested);
        reserved += missing;
      }
    }
  }

  // 4. Kitchen recipes reservation
  if (cfg.sellReserveForKitchen !== false) {
    const dishNeeds: Record<string, number> = {
      radish: 3, // Canh củ cải
      carrot: 3, // Nước ép cà rốt
      corn: 2,   // Bắp nướng mỡ hành
      rice: 0,
      egg: 2,    // Trứng luộc / Bánh mì
    };
    reserved += (dishNeeds[item] || 0);
  }

  return reserved;
}

function deliverGroceryOrder(cfg: AppConfig): StepResult | null {
  const m = getMainState();
  if (!m.order || stockOf(m, m.order.crop) < m.order.qty) return null;
  const reward = m.order.reward || 0;
  const cropLabel = CROP_NAMES[m.order.crop] || m.order.crop;
  if (m.deliverOrder?.() === true) {
    showFarmActionUI(cfg, { vendor: 'grocery', shop: 'orders' });
    return { acted: true, msg: `📦 Đã giao đơn hàng Chị Na (${cropLabel}) +${formatVnd(reward)}đ` };
  }
  return null;
}

function deliverVillageBoard(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  if ((st.village?.newsDay || 0) > 0 && !st.village?.met) {
    st.meetKhang?.();
  }
  const cur = getMainState();
  for (const req of cur.village?.requests || []) {
    if (req.done || !req.goods) continue;
    const qty = req.qty || 0;
    if (stockOf(cur, req.goods) >= qty && cur.deliverRequest?.(req.id) === true) {
      showFarmActionUI(cfg, { panel: 'village' });
      return { acted: true, msg: `📋 Đã giao ${qty} ${CROP_NAMES[req.goods] || req.goods} giúp ${req.who || 'bà con'} (Bảng tin làng)` };
    }
  }
  return null;
}

/** Sells ONLY the exact boosted trend quota, never over-sells */
function sellTrendGoods(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const day = st.day || 0;
  const trend = getActiveTrend(day);
  if (!trend) return null;
  const quota = getTrendQuota(trend.goods, day, Object.keys(st.plots || {}).length, st.trendLog);
  if (quota <= 0) return null;

  const reserved = getReservedQty(st, trend.goods, cfg);
  const toSell = Math.min(Math.max(0, stockOf(st, trend.goods) - reserved), quota);
  if (toSell <= 0) return null;

  const sold = st.sellQty?.(trend.goods, toSell) || 0;
  if (sold > 0) {
    showFarmActionUI(cfg, { vendor: 'grocery', shop: 'storage' });
    return { acted: true, msg: `🔥 Đã bán đúng ${sold} ${CROP_NAMES[trend.goods] || trend.goods} theo Trend sốt dẻo (x2 giá)` };
  }
  return null;
}

/** Sells the MINIMUM produce needed to complete the notebook "sell" task with smart reservation */
function sellForDailyTask(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const earned = st.stats?.earned || 0;
  const sellTask = (st.daily?.tasks || []).find(
    (t) => !t.claimed && t.kind === 'sell' && earned - (t.base || 0) < (t.need || 0)
  );
  const day1NeedSell = st.day === 1 && earned === 0;
  if (!sellTask && !day1NeedSell) return null;

  // Sort candidate crops by highest sellable surplus first
  const candidates = CROP_KEYS.map((item) => {
    const reserved = getReservedQty(st, item, cfg);
    const sellable = Math.max(0, stockOf(st, item) - reserved);
    return { item, sellable };
  }).filter((c) => c.sellable > 0)
    .sort((a, b) => b.sellable - a.sellable);

  for (const { item, sellable } of candidates) {
    let qty = 1;
    if (sellTask) {
      const missing = (sellTask.need || 0) - (earned - (sellTask.base || 0));
      const unitPrice = item === 'egg' ? 1000 : st.prices?.[item] || 500;
      qty = Math.max(1, Math.min(sellable, Math.ceil(missing / unitPrice)));
    }
    const sold = st.sellQty?.(item, qty) || 0;
    if (sold > 0) {
      showFarmActionUI(cfg, { vendor: 'grocery', shop: 'storage' });
      return { acted: true, msg: `📋 Đã bán ${sold} ${CROP_NAMES[item] || item} để hoàn thành Việc Sổ tay hôm nay` };
    }
  }
  return null;
}

/** Comprehensive Smart Selling: sells cooked dishes or surplus produce */
function sellSmart(cfg: AppConfig): StepResult | null {
  if (!cfg.autoSellSmart && !cfg.autoSellProduce) return null;

  const st = getMainState();
  const strategy = cfg.sellStrategy || 'smart_all';

  // 1. Sell cooked food if allowed
  if (strategy === 'smart_all' || strategy === 'food_only') {
    const kitchenStock = st.kitchen?.stock || {};
    for (const [dish, count] of Object.entries(kitchenStock)) {
      if ((count || 0) > 1) {
        const toSell = (count || 0) - 1;
        // Try sellDish or fallback to sellQty
        const anySt = st as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>;
        const sold = typeof anySt.sellDish === 'function' ? anySt.sellDish(dish, toSell) : st.sellQty?.(dish, toSell);
        if (sold) {
          showFarmActionUI(cfg, { vendor: 'grocery', shop: 'storage' });
          return { acted: true, msg: `🍲 Đã bán ${toSell} phần món ăn (${dish}) dư trong Bếp` };
        }
      }
    }
    if (strategy === 'food_only') return null;
  }

  // 2. Sell surplus raw crops (sorted by surplus amount descending)
  const minKeep = Math.max(0, Number(cfg.surplusKeepQty) || 10);
  const itemsWithSurplus = CROP_KEYS.map((item) => {
    const reserved = getReservedQty(st, item, cfg);
    const surplus = stockOf(st, item) - reserved - minKeep;
    return { item, surplus };
  }).filter((x) => x.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus);

  for (const { item, surplus } of itemsWithSurplus) {
    const sold = st.sellQty?.(item, surplus) || 0;
    if (sold > 0) {
      showFarmActionUI(cfg, { vendor: 'grocery', shop: 'storage' });
      return { acted: true, msg: `🏪 Đã bán ${sold} ${CROP_NAMES[item] || item} nông sản dư (Bảo lưu đơn hàng + giữ lại ${minKeep})` };
    }
  }

  return null;
}

export function handleMarketSubArea(cfg: AppConfig): StepResult {
  return (
    (cfg.autoDeliverOrder !== false ? deliverGroceryOrder(cfg) : null) ||
    (cfg.autoVillageBoard !== false ? deliverVillageBoard(cfg) : null) ||
    (cfg.autoSellTrend !== false ? sellTrendGoods(cfg) : null) ||
    (cfg.autoSellDailyTask !== false ? sellForDailyTask(cfg) : null) ||
    sellSmart(cfg) ||
    NOT_ACTED
  );
}
