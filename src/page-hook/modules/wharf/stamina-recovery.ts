import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import {
  BEN_FOOD_NAMES,
  BEN_PACK_NAMES,
  BEN_DRINK_NAMES,
} from '../../../shared/constants/wharf-catalog';
import { BenExecutionContext, BenStepResult, FOOD_PRICES } from './types';

/**
 * Hồi phục thể lực Bến Đò (Dùng chung cho cả Câu cá & Bắt dế đêm khi Sức cạn).
 * Thứ tự ưu tiên: Đồ ăn trong ba lô -> Gội đầu Út Mười -> Quán ăn Dì Tám -> Trà đá Chị Thơm.
 */
export function tryRecoverBenStamina(ctx: BenExecutionContext): BenStepResult | null {
  const {
    cfg,
    shells,
    packItems,
    isStaminaDepleted,
    prefFood,
    targetFoodPrice,
    nonKeptCount,
    totalSellShells,
    runWithOptionalPanel,
    walkAndRun,
  } = ctx;

  if (!isStaminaDepleted) {
    return null;
  }

  if (cfg.benAutoRecoverStamina !== false) {
    // 1. Eat from backpack first
    if (packItems.length > 0 && canAct('ben_eat_pack', 3000)) {
      const packItem = packItems[0];
      const packLabel = BEN_PACK_NAMES[packItem] || packItem;
      markActed('ben_eat_pack');
      runWithOptionalPanel(
        () => {
          sendBenWs({ t: 'eat', item: packItem });
        },
        `Đã ăn ${packLabel} trong balo hồi Sức`,
        { panel: 'pack', bagTab: 'food' },
        1400
      );
      return { acted: true, msg: `Đã ăn ${packLabel} trong balo hồi Sức` };
    }

    // 2. Út Mười shampoo (+50⚡, 25🐚)
    if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct('ben_goi_dau', 4000)) {
      return walkAndRun(
        { x: 16, y: 24 },
        () => {
          sendBenWs({ t: 'buy', item: 'goiDau' });
        },
        '💆 Gội đầu massage tại Tiệm Út Mười (+50⚡, -25🐚)',
        'ben_goi_dau',
        { panel: 'hair' },
        1500
      );
    }

    // 3. Buy food from Dì Tám ({ x: 39, y: 23 })
    const buyItem =
      shells >= targetFoodPrice
        ? prefFood
        : shells >= 28
          ? 'comTam'
          : shells >= 20
            ? 'huTieu'
            : shells >= 14
              ? 'chaoCa'
              : 'banhMi';

    const foodCost = FOOD_PRICES[buyItem] || 10;
    const foodLabel = BEN_FOOD_NAMES[buyItem] || buyItem;
    if (shells >= foodCost && canAct('ben_buy_food', 4000)) {
      return walkAndRun(
        { x: 39, y: 23 },
        () => {
          sendBenWs({ t: 'buy', item: buyItem });
        },
        `Mua ${foodLabel} tại Quán ăn Dì Tám (-${foodCost}🐚)`,
        'ben_buy_food',
        { panel: 'food' },
        1500
      );
    }

    // 4. Fallback: Drink iced tea at Chị Thơm ({ x: 26, y: 12 })
    if (shells >= 3 && canAct('ben_drink', 4000)) {
      return walkAndRun(
        { x: 26, y: 12 },
        () => {
          sendBenWs({ t: 'buy', item: 'traDa' });
        },
        `Uống ${BEN_DRINK_NAMES.traDa} tại Xe trà đá Chị Thơm (-3🐚)`,
        'ben_drink',
        { panel: 'tea', teaStand: 'river' },
        1500
      );
    }

    if (
      !canAct('ben_buy_food', 4000) ||
      !canAct('ben_eat_pack', 3000) ||
      !canAct('ben_goi_dau', 4000) ||
      !canAct('ben_drink', 4000)
    ) {
      return { acted: true, msg: '🍚 Đang chờ ăn hồi phục Sức...' };
    }
  }

  // 5. Out of shells to eat -> Sell fish basket if available
  if (cfg.benAutoSell !== false && nonKeptCount > 0) {
    return walkAndRun(
      { x: 40, y: 10 },
      () => {
        sendBenWs({ t: 'sell' });
      },
      `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚) để lấy tiền ăn`,
      'ben_sell',
      { panel: 'sell' },
      1400
    );
  }

  return {
    acted: false,
    exhausted: true,
    reason:
      '😮‍💨 Bến Đò: Không đủ Sức (≤ 0⚡) và không đủ vỏ sò để ăn/gội đầu -> Chuyển khu vực tiếp theo!',
  };
}
