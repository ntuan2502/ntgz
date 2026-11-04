import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import {
  BEN_FOOD_NAMES,
  BEN_PACK_NAMES,
  BEN_DRINK_NAMES,
  PACK_FOOD_OPTIONS,
  PACK_FOOD_PRICES,
} from '../../../shared/constants/wharf-catalog';
import { BenExecutionContext, BenStepResult, FOOD_PRICES } from './types';
import { wharfWatchState } from './ws-watchers';

const STAMINA_RECOVERY_TARGET = 25;

/**
 * 1. Ăn thức ăn có sẵn trong ba lô (giữ modal ba lô mở và ăn liên tục cho đến khi Sức ≥ 25⚡ hoặc hết đồ).
 */
function tryEatFromPack(
  ctx: BenExecutionContext,
  packItems: string[]
): BenStepResult | null {
  const { bnStore, runWithOptionalPanel } = ctx;
  if (packItems.length === 0 || !canAct('ben_eat_pack', 1500)) return null;

  const packItem = packItems[0];
  const packLabel = BEN_PACK_NAMES[packItem] || packItem;
  markActed('ben_eat_pack');

  runWithOptionalPanel(
    () => {
      sendBenWs({ t: 'eat', item: packItem });
    },
    `Đã ăn ${packLabel} trong ba lô hồi Sức`,
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
          label: `Đã ăn tiếp ${nextLabel} trong ba lô hồi Sức (⚡${curStam})`,
          actionFn: () => {
            markActed('ben_eat_pack');
            sendBenWs({ t: 'eat', item: nextItem });
          },
        };
      },
    }
  );
  return { acted: true, msg: `Đã ăn ${packLabel} trong ba lô hồi Sức` };
}

/**
 * 2. Ra Quán Dì Tám ({ x: 39, y: 23 }) mua thức ăn bỏ ba lô (tối đa 12 món, mặc định bánh tét lá cẩm).
 */
function tryBuyPackFood(ctx: BenExecutionContext): BenStepResult | null {
  const { cfg, bnStore, shells, walkAndRun } = ctx;
  const targetDish = cfg.benPackFoodItem || 'banhTet';
  const targetStock = Math.min(12, Math.max(1, Number(cfg.benPackFoodStock) || 12));

  const curBn = bnStore.getState();
  const curPack = curBn?.pack || {};
  const curPackTotal = Object.values(curPack).reduce((s, n) => s + (Number(n) || 0), 0);

  const wallet = curBn?.wallet as Record<string, unknown> | undefined;
  const packCapacity =
    typeof wallet?.packSlots === 'number'
      ? wallet.packSlots
      : 6 + (Number(wallet?.packLevel) || 0) * 2;
  const effectiveLimit = Math.min(targetStock, packCapacity);

  if (curPackTotal >= effectiveLimit) {
    return null; // Ba lô đã đầy theo mức giới hạn
  }

  // Ưu tiên mua món đã chọn, nếu không đủ vỏ sò thì tìm món rẻ hơn
  const targetCost = PACK_FOOD_PRICES[targetDish] || 30;
  let dishToBuy = targetDish;
  let costToBuy = targetCost;

  if (shells < targetCost) {
    const affordable = PACK_FOOD_OPTIONS.find((f) => shells >= f.price);
    if (!affordable) {
      return null; // Không đủ vỏ sò mua bất kỳ món ăn bỏ túi nào
    }
    dishToBuy = affordable.id;
    costToBuy = affordable.price;
  }

  if (!canAct('ben_buy_food', 1800)) {
    return { acted: true, msg: '🍚 Đang chờ tới Quán Dì Tám mua đồ ăn bỏ ba lô...' };
  }

  const dishLabel = BEN_PACK_NAMES[dishToBuy] || dishToBuy;

  return walkAndRun(
    { x: 39, y: 23 },
    () => {
      sendBenWs({ t: 'buy', item: dishToBuy });
    },
    `Mua ${dishLabel} tại Quán ăn Dì Tám bỏ ba lô (-${costToBuy}🐚)`,
    'ben_buy_food',
    { panel: 'food' },
    350,
    400,
    {
      shouldContinue: () => {
        const latestBn = bnStore.getState();
        const latestPack = latestBn?.pack || {};
        const latestCount = Object.values(latestPack).reduce((s, n) => s + (Number(n) || 0), 0);
        const curShells = latestBn?.wallet?.shells ?? 0;
        if (latestCount >= effectiveLimit || curShells < costToBuy) {
          return { keepGoing: false };
        }
        return {
          keepGoing: true,
          label: `Mua tiếp ${dishLabel} bỏ ba lô (${latestCount + 1}/${effectiveLimit} · -${costToBuy}🐚)`,
          actionFn: () => {
            markActed('ben_buy_food');
            sendBenWs({ t: 'buy', item: dishToBuy });
          },
        };
      },
    }
  );
}

/**
 * 3. Ăn trực tiếp tại Quán ăn Dì Tám ({ x: 39, y: 23 }).
 */
function tryEatAtStall(ctx: BenExecutionContext): BenStepResult | null {
  const { bnStore, shells, prefFood, targetFoodPrice, walkAndRun } = ctx;

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

  if (shells < foodCost) {
    return null;
  }

  if (!canAct('ben_buy_food', 1800)) {
    return { acted: true, msg: '🍚 Đang chờ ăn món tại Quán Dì Tám...' };
  }

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

/**
 * Hồi phục thể lực Bến Đò (Dùng chung cho cả Câu cá & Bắt dế đêm khi Sức cạn).
 * Hỗ trợ chọn ưu tiên:
 * - 'bag' (Mặc định): Ăn đồ ăn trong túi/ba lô trước -> nếu hết thì ra Quán Dì Tám mua (tối đa 12 món, mặc định bánh tét lá cẩm).
 * - 'stall': Ăn trực tiếp các món nóng tại Quán Dì Tám -> nếu hết vỏ sò mới ăn đồ trong ba lô.
 */
export function tryRecoverBenStamina(ctx: BenExecutionContext): BenStepResult | null {
  const {
    cfg,
    shells,
    packItems,
    isStaminaDepleted,
    nonKeptCount,
    totalSellShells,
    walkAndRun,
  } = ctx;

  if (!isStaminaDepleted) {
    return null;
  }

  if (cfg.benAutoRecoverStamina !== false) {
    const priority = cfg.benStaminaPriority || 'bag';

    if (priority === 'bag') {
      // 1. Ăn thức ăn trong ba lô trước
      if (packItems.length > 0) {
        const eatRes = tryEatFromPack(ctx, packItems);
        if (eatRes) return eatRes;
      }

      // 2. Nếu ba lô hết đồ ăn: Ra Quán Dì Tám mua thức ăn bỏ ba lô (tối đa 12 món, mặc định bánh tét lá cẩm)
      const buyRes = tryBuyPackFood(ctx);
      if (buyRes) return buyRes;

      // 3. Fallback: Nếu ba lô đầy các món khác không mua thêm được, ăn món tại Quán Dì Tám
      const stallRes = tryEatAtStall(ctx);
      if (stallRes) return stallRes;
    } else {
      // Ưu tiên ăn trực tiếp tại Quán Dì Tám
      // 1. Ăn món tại Quán Dì Tám
      const stallRes = tryEatAtStall(ctx);
      if (stallRes) return stallRes;

      // 2. Fallback: Ăn đồ ăn trong ba lô nếu có sẵn
      if (packItems.length > 0) {
        const eatRes = tryEatFromPack(ctx, packItems);
        if (eatRes) return eatRes;
      }

      // 3. Fallback: Mua thức ăn bỏ ba lô
      const buyRes = tryBuyPackFood(ctx);
      if (buyRes) return buyRes;
    }

    // 4. Nếu thiếu vỏ sò để ăn/mua thức ăn -> Bán cá tại Vựa cá Anh Tư để lấy vỏ sò
    if (cfg.benAutoSell !== false && nonKeptCount > 0) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: 'sell' });
        },
        `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚) để lấy tiền ăn hồi Sức`,
        'ben_sell',
        { panel: 'sell' },
        350
      );
    }

    // 5. Fallback cuối cùng: Uống trà đá Chị Thơm (-3🐚) nếu còn đủ 3 vỏ sò
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
            const latestBn = ctx.bnStore.getState();
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

    if (!canAct('ben_buy_food', 1800) || !canAct('ben_eat_pack', 1500) || !canAct('ben_drink', 1500)) {
      return { acted: true, msg: '🍚 Đang chờ ăn hồi phục Sức...' };
    }
  }

  return {
    acted: false,
    exhausted: true,
    reason:
      '😮‍💨 Bến Đò: Không đủ Sức (≤ 0⚡) và không đủ vỏ sò để ăn hồi Sức -> Chuyển khu vực tiếp theo!',
  };
}
