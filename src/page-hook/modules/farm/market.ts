import { getMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { MainGameStoreState } from '../../../shared/types/game-store';
import { getActiveTrend, getTrendQuota } from './trend';
import { StepResult, NOT_ACTED, CROP_NAMES, formatVnd, showFarmActionUI } from './types';

const stockOf = (st: MainGameStoreState, goods: string): number =>
  goods === 'egg' ? st.eggs || 0 : st.produce?.[goods] || 0;

/** Calculates all reserved quantities for active orders and village board requests */
function getReservedQty(st: MainGameStoreState, item: string): number {
  let reserved = 0;

  // 1. Chị Na grocery order
  if (st.order && st.order.crop === item) {
    reserved += (st.order.qty || 0);
  }

  // 2. Village board requests
  if (Array.isArray(st.village?.requests)) {
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

  const reserved = getReservedQty(st, trend.goods);
  const toSell = Math.min(Math.max(0, stockOf(st, trend.goods) - reserved), quota);
  if (toSell <= 0) return null;

  const sold = st.sellQty?.(trend.goods, toSell) || 0;
  if (sold > 0) {
    showFarmActionUI(cfg, { vendor: 'grocery', shop: 'storage' });
    return { acted: true, msg: `🔥 Đã bán đúng ${sold} ${CROP_NAMES[trend.goods] || trend.goods} theo Trend sốt dẻo (x2 giá)` };
  }
  return null;
}

export function handleMarketSubArea(cfg: AppConfig): StepResult {
  return (
    (cfg.autoDeliverOrder !== false ? deliverGroceryOrder(cfg) : null) ||
    (cfg.autoVillageBoard !== false ? deliverVillageBoard(cfg) : null) ||
    (cfg.autoSellTrend !== false ? sellTrendGoods(cfg) : null) ||
    NOT_ACTED
  );
}
