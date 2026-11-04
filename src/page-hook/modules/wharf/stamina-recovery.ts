import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import {
  BEN_FOOD_NAMES,
  BEN_PACK_NAMES,
  BEN_DRINK_NAMES,
} from '../../../shared/constants/wharf-catalog';
import { BenExecutionContext, BenStepResult, FOOD_PRICES } from './types';
import { wharfWatchState } from './ws-watchers';

const STAMINA_RECOVERY_TARGET = 25;

/**
 * Hồi phục thể lực Bến Đò (Dùng chung cho cả Câu cá & Bắt dế đêm khi Sức cạn).
 * Thứ tự ưu tiên: Đồ ăn trong ba lô -> Gội đầu Út Mười -> Quán ăn Dì Tám -> Trà đá Chị Thơm.
 * Giữ bảng UI mở và ăn/uống liên tục cho đến khi thể lực đạt ngưỡng an toàn (≥ 25⚡) hoặc hết đồ/vỏ sò.
 */
export function tryRecoverBenStamina(ctx: BenExecutionContext): BenStepResult | null {
  const {
    cfg,
    bnStore,
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
    // 1. Eat from backpack first (keep pack open until stamina >= 25 or backpack is empty)
    if (packItems.length > 0 && canAct('ben_eat_pack', 1500)) {
      const packItem = packItems[0];
      const packLabel = BEN_PACK_NAMES[packItem] || packItem;
      markActed('ben_eat_pack');
      runWithOptionalPanel(
        () => {
          sendBenWs({ t: 'eat', item: packItem });
        },
        `Đã ăn ${packLabel} trong balo hồi Sức`,
        { panel: 'pack', bagTab: 'food' },
        350,
        400,
        {
          shouldContinue: () => {
            const latestBn = bnStore.getState();
            const curStam = computeBenStamina(latestBn?.wallet);
            if (curStam >= 4) {
              wharfWatchState.benNoticeTired = false;
            }
            const remPack = latestBn?.pack || {};
            const remItems = Object.keys(remPack).filter((k) => (remPack[k] || 0) > 0);
            if (curStam >= STAMINA_RECOVERY_TARGET || remItems.length === 0) {
              return { keepGoing: false };
            }
            const nextItem = remItems[0];
            const nextLabel = BEN_PACK_NAMES[nextItem] || nextItem;
            return {
              keepGoing: true,
              label: `Đã ăn tiếp ${nextLabel} trong balo hồi Sức (⚡${curStam})`,
              actionFn: () => {
                markActed('ben_eat_pack');
                sendBenWs({ t: 'eat', item: nextItem });
              },
            };
          },
        }
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
        350
      );
    }

    // 3. Buy food from Dì Tám ({ x: 39, y: 23 }) — keep panel open if stamina < 25
    const pickBestFoodItem = (availShells: number) =>
      availShells >= targetFoodPrice
        ? prefFood
        : availShells >= 28
          ? 'comTam'
          : availShells >= 20
            ? 'huTieu'
            : availShells >= 14
              ? 'chaoCa'
              : 'banhMi';

    const buyItem = pickBestFoodItem(shells);
    const foodCost = FOOD_PRICES[buyItem] || 10;
    const foodLabel = BEN_FOOD_NAMES[buyItem] || buyItem;
    if (shells >= foodCost && canAct('ben_buy_food', 1800)) {
      return walkAndRun(
        { x: 39, y: 23 },
        () => {
          sendBenWs({ t: 'buy', item: buyItem });
        },
        `Mua ${foodLabel} tại Quán ăn Dì Tám (-${foodCost}🐚)`,
        'ben_buy_food',
        { panel: 'food' },
        350,
        400,
        {
          shouldContinue: () => {
            const latestBn = bnStore.getState();
            const curStam = computeBenStamina(latestBn?.wallet);
            if (curStam >= 4) {
              wharfWatchState.benNoticeTired = false;
            }
            const curShells = latestBn?.wallet?.shells ?? 0;
            const nextDish = pickBestFoodItem(curShells);
            const nextCost = FOOD_PRICES[nextDish] || 10;
            if (curStam >= STAMINA_RECOVERY_TARGET || curShells < nextCost) {
              return { keepGoing: false };
            }
            const nextDishLabel = BEN_FOOD_NAMES[nextDish] || nextDish;
            return {
              keepGoing: true,
              label: `Mua tiếp ${nextDishLabel} tại Quán ăn Dì Tám (-${nextCost}🐚 · ⚡${curStam})`,
              actionFn: () => {
                markActed('ben_buy_food');
                sendBenWs({ t: 'buy', item: nextDish });
              },
            };
          },
        }
      );
    }

    // 4. Fallback: Drink iced tea at Chị Thơm ({ x: 26, y: 12 }) — keep panel open until stamina >= 25
    if (shells >= 3 && canAct('ben_drink', 1500)) {
      return walkAndRun(
        { x: 26, y: 12 },
        () => {
          sendBenWs({ t: 'buy', item: 'traDa' });
        },
        `Uống ${BEN_DRINK_NAMES.traDa} tại Xe trà đá Chị Thơm (-3🐚)`,
        'ben_drink',
        { panel: 'tea', teaStand: 'river' },
        350,
        400,
        {
          shouldContinue: () => {
            const latestBn = bnStore.getState();
            const curStam = computeBenStamina(latestBn?.wallet);
            if (curStam >= 4) {
              wharfWatchState.benNoticeTired = false;
            }
            const curShells = latestBn?.wallet?.shells ?? 0;
            if (curStam >= STAMINA_RECOVERY_TARGET || curShells < 3) {
              return { keepGoing: false };
            }
            return {
              keepGoing: true,
              label: `Uống tiếp ${BEN_DRINK_NAMES.traDa} tại Xe trà đá Chị Thơm (-3🐚 · ⚡${curStam})`,
              actionFn: () => {
                markActed('ben_drink');
                sendBenWs({ t: 'buy', item: 'traDa' });
              },
            };
          },
        }
      );
    }

    if (
      !canAct('ben_buy_food', 1800) ||
      !canAct('ben_eat_pack', 1500) ||
      !canAct('ben_goi_dau', 4000) ||
      !canAct('ben_drink', 1500)
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
      350
    );
  }

  return {
    acted: false,
    exhausted: true,
    reason:
      '😮‍💨 Bến Đò: Không đủ Sức (≤ 0⚡) và không đủ vỏ sò để ăn/gội đầu -> Chuyển khu vực tiếp theo!',
  };
}
