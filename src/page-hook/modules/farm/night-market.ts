import { getMainState } from '../../core/engine-access';
import { showFarmActionUI, getItemLabel, StepResult, NOT_ACTED } from './types';
import { AppConfig } from '../../../shared/types/config';

const DEFAULT_CROP_PRICES: Record<string, number> = {
  radish: 12000,
  carrot: 28000,
  corn: 50000,
  rice: 90000,
};

/**
 * Night Market (Chợ Đêm 18h00 - 23h30)
 * Allows selling up to 20 produce per night at 1.25x (+25%) price bonus.
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

  // Minimum inventory threshold to allow selling (default 50)
  const minStock = typeof cfg.nightMarketMinStock === 'number' ? cfg.nightMarketMinStock : 50;

  interface NightCandidate {
    id: string;
    qty: number;
    price: number;
  }

  const candidates: NightCandidate[] = [];
  const produce = (m.produce || {}) as Record<string, number | undefined>;

  for (const [cropId, count] of Object.entries(produce)) {
    const qty = Number(count) || 0;
    // Chặn không được bán nếu số lượng nhỏ hơn minStock (mặc định 50)
    if (qty < minStock) continue;

    const basePrice = m.prices?.[cropId] || DEFAULT_CROP_PRICES[cropId] || 10000;
    const price = Math.round(basePrice * 1.25);
    candidates.push({ id: cropId, qty, price });
  }

  if (candidates.length === 0) return NOT_ACTED;

  // Sort/filter candidates based on strategy
  const strategy = cfg.nightMarketStrategy || 'highest_price';

  if (strategy === 'selected_crop') {
    const chosen = cfg.nightMarketSelectedCrop || 'radish';
    const target = candidates.find((c) => c.id === chosen);
    if (!target) return NOT_ACTED;
    const res = m.sellNight?.(target.id);
    if (res === 'ok') {
      showFarmActionUI(cfg, { panel: 'nightMarket' });
      return {
        acted: true,
        msg: `🏮 Đã bán 1 ${getItemLabel(target.id)} ở Chợ Đêm (+25% giá · Còn ${quotaLeft - 1}/20 món)`,
      };
    }
    return NOT_ACTED;
  }

  if (strategy === 'max_stock') {
    candidates.sort((a, b) => b.qty - a.qty);
  } else {
    // Default: 'highest_price' - bán nông sản có giá cao nhất
    candidates.sort((a, b) => b.price - a.price);
  }

  const target = candidates[0];
  if (!target) return NOT_ACTED;

  const res = m.sellNight?.(target.id);
  if (res === 'ok') {
    showFarmActionUI(cfg, { panel: 'nightMarket' });
    return {
      acted: true,
      msg: `🏮 Đã bán 1 ${getItemLabel(target.id)} ở Chợ Đêm (+25% giá · Còn ${quotaLeft - 1}/20 món)`,
    };
  }

  return NOT_ACTED;
}
