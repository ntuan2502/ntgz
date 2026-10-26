import { getMainState } from '../../core/engine-access';
import { showFarmActionUI, getItemLabel, StepResult, NOT_ACTED } from './types';
import { AppConfig } from '../../../shared/types/config';

/**
 * Night Market (Chợ Đêm 18h00 - 23h30)
 * Allows selling up to 20 produce/eggs per night at 1.25x (+25%) price bonus.
 */
export function handleNightMarketSubArea(cfg: AppConfig): StepResult {
  if (cfg.autoSellNightMarket === false) return NOT_ACTED;

  const m = getMainState();
  if (!m.village?.marketOpen) return NOT_ACTED;

  const mins = m.minutes ?? 0;
  // Opening hours: 18h00 (1080) to 23h30 (1410)
  if (mins < 1080 || mins >= 1410) return NOT_ACTED;

  // Check quota: max 20 items per night
  const soldToday = m.village?.nightSold?.day === m.day ? (m.village?.nightSold?.n || 0) : 0;
  const quotaLeft = 20 - soldToday;
  if (quotaLeft <= 0) return NOT_ACTED;

  // Build reservations map for active orders if enabled
  const reservedMap: Record<string, number> = {};
  if (cfg.nightMarketReserveOrders !== false) {
    if (m.order && !m.order.delivered && m.order.crop) {
      reservedMap[m.order.crop] = (reservedMap[m.order.crop] || 0) + (m.order.qty || 0);
    }
    const villageReqs = m.village?.requests || [];
    for (const req of villageReqs) {
      if (!req.done && req.goods) {
        reservedMap[req.goods] = (reservedMap[req.goods] || 0) + (req.qty || 0);
      }
    }
  }

  const minKeep = Math.max(0, Number(cfg.nightMarketMinKeep) || 0);

  interface NightCandidate {
    id: string;
    surplus: number;
    price: number;
    isEgg: boolean;
  }

  const candidates: NightCandidate[] = [];

  // Evaluate raw crops in warehouse/produce
  const produce = (m.produce || {}) as Record<string, number | undefined>;
  for (const [cropId, count] of Object.entries(produce)) {
    const qty = Number(count) || 0;
    const reserved = reservedMap[cropId] || 0;
    const surplus = qty - minKeep - reserved;
    if (surplus > 0) {
      candidates.push({
        id: cropId,
        surplus,
        price: m.prices?.[cropId] || 0,
        isEgg: false,
      });
    }
  }

  // Evaluate eggs
  if (cfg.nightMarketSellEggs !== false) {
    const eggs = m.eggs || 0;
    const eggReserved = reservedMap['egg'] || 0;
    const eggSurplus = eggs - minKeep - eggReserved;
    if (eggSurplus > 0) {
      const EGG_BASE_PRICE = 15_000;      // mt — play.formatted.js:15073
      const NIGHT_MARKET_MULT = 1.25;     // ZE — play.formatted.js:43878
      candidates.push({
        id: 'egg',
        surplus: eggSurplus,
        price: Math.round(EGG_BASE_PRICE * NIGHT_MARKET_MULT), // 18_750
        isEgg: true,
      });
    }
  }

  if (candidates.length === 0) return NOT_ACTED;

  // Sort candidates based on strategy
  const strategy = cfg.nightMarketStrategy || 'max_stock';
  if (strategy === 'highest_price') {
    candidates.sort((a, b) => b.price - a.price);
  } else if (strategy === 'lowest_price') {
    candidates.sort((a, b) => a.price - b.price);
  } else {
    // Default: 'max_stock' - sell crops with highest surplus first
    candidates.sort((a, b) => b.surplus - a.surplus);
  }

  const target = candidates[0];
  if (!target) return NOT_ACTED;

  const res = m.sellNight?.(target.id);
  if (res === 'ok') {
    showFarmActionUI(cfg, { panel: 'nightMarket' });
    const label = target.isEgg ? 'Trứng gà 🥚' : getItemLabel(target.id);
    return {
      acted: true,
      msg: `🏮 Đã bán 1 ${label} ở Chợ Đêm (+25% giá · Còn ${quotaLeft - 1}/20 món)`,
    };
  }

  return NOT_ACTED;
}
