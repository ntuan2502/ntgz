import { getMainState } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { AppConfig } from '../../../shared/types/config';
import { GOLD_CATALOG, getGoldBuyPrice, getGoldSellPrice } from './gold-sim';
import { StepResult, NOT_ACTED, formatVnd, showFarmActionUI } from './types';

const GOLD_TYPES = ['mieng', 'nhan', 'k18', 'non'];

/** Cô Kim gold shop (Chợ Lớn, unlocked day 30+) */
export function handleGoldShopSubArea(cfg: AppConfig): StepResult {
  const st = getMainState();
  const shop = st.goldShop;
  if (!shop || !((shop.newsDay || 0) > 0 || (st.day || 0) >= 30)) return NOT_ACTED;
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
          showFarmActionUI(cfg, { vendor: 'goldShop', shop: 'goldShop' });
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
      showFarmActionUI(cfg, { vendor: 'goldShop', shop: 'goldShop' });
      return {
        acted: true,
        msg: `🪙 Đã mua 1 chỉ ${GOLD_CATALOG[prefType]?.name || prefType} đầu tư tại Tiệm Vàng Cô Kim (-${formatVnd(buyPrice)}đ)`,
      };
    }
  }

  return NOT_ACTED;
}
