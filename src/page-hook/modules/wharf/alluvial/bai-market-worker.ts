import { AppConfig } from '../../../../shared/types/config';
import { sendBenWs } from '../../../core/engine-access';
import { baiState } from './bai-state';
import { AlluvialStepResult } from './bai-farm-worker';

/**
 * Thực thi các giao dịch bán nông sản, đặc sản, trứng và cá lưới tại Chợ Bãi (state.kind === 'bai').
 * Ngay sau khi gửi lệnh bán, xóa số lượng cục bộ trong `baiState` để tránh gửi lặp lại ở tick kế tiếp.
 */
export function runBaiMarketWorkStep(cfg: AppConfig): {
  finishedMarket: boolean;
  result: AlluvialStepResult;
} {
  // 1. Bán dừa xiêm tươi (Chỉ khi bật switch cha benAutoCocoProcess VÀ chọn trạng thái 'sell')
  const cocoProcessEnabled = cfg.benAutoCocoProcess !== false;
  const cocoMode = cfg.benCocoMode || (cfg.benAutoCocoSell ? 'sell' : 'candy');
  const shouldSellCoconut = cocoProcessEnabled && cocoMode === 'sell';

  const cocoCount =
    baiState.items['coconut'] || baiState.items['coconuts'] || baiState.items['coco'] || 0;
  if (shouldSellCoconut && cocoCount > 0) {
    const pick: Record<string, number> = {};
    if ((baiState.items['coconut'] || 0) > 0) pick['coconut'] = baiState.items['coconut'];
    if ((baiState.items['coconuts'] || 0) > 0) pick['coconuts'] = baiState.items['coconuts'];
    if ((baiState.items['coco'] || 0) > 0) pick['coco'] = baiState.items['coco'];
    if (Object.keys(pick).length === 0) pick['coconut'] = cocoCount;

    sendBenWs({ t: 'cocoSell', pick });
    baiState.items['coconut'] = 0;
    baiState.items['coconuts'] = 0;
    baiState.items['coco'] = 0;

    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🥥 Chợ Bãi: Đã bán ${cocoCount} trái dừa xiêm tươi lấy vỏ sò!`,
        allowCast: false,
      },
    };
  }

  // 2. Bán đặc sản (Kẹo dừa + Khô cá) cho Tiệm Cô Hai
  const sellSpecialties = cfg.benAutoCandySell !== false;
  const candyCount = sellSpecialties
    ? Math.max(baiState.items['candy'] || 0, baiState.info?.specialty?.candy || 0)
    : 0;
  const driedCount =
    sellSpecialties && cfg.benAutoDryFishSell !== false
      ? baiState.info?.specialty?.dried || 0
      : 0;

  if (candyCount > 0 || driedCount > 0) {
    sendBenWs({
      t: 'specialtySell',
      pick: {
        ...(candyCount > 0 ? { candy: candyCount } : {}),
        ...(driedCount > 0 ? { dried: driedCount } : {}),
      },
    });
    baiState.items['candy'] = 0;
    if (baiState.info?.specialty) {
      baiState.info.specialty.candy = 0;
      baiState.info.specialty.dried = 0;
      baiState.info.specialty.driedList = [];
    }

    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🏪 Tiệm Cô Hai: Đã bán ${candyCount} thanh kẹo dừa & ${driedCount} con khô cá đặc sản!`,
        allowCast: false,
      },
    };
  }

  // 3. Bán trứng gà & trứng vịt cho Sạp Chú Năm
  const henEggs = cfg.benAutoEggSell !== false ? baiState.items['eggHen'] || 0 : 0;
  const duckEggs = cfg.benAutoEggSell !== false ? baiState.items['eggDuck'] || 0 : 0;
  if (henEggs > 0 || duckEggs > 0) {
    sendBenWs({
      t: 'eggSell',
      pick: {
        ...(henEggs > 0 ? { eggHen: henEggs } : {}),
        ...(duckEggs > 0 ? { eggDuck: duckEggs } : {}),
      },
    });
    baiState.items['eggHen'] = 0;
    baiState.items['eggDuck'] = 0;

    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🥚 Sạp Chú Năm: Đã bán ${henEggs} trứng gà & ${duckEggs} trứng vịt lấy vỏ sò!`,
        allowCast: false,
      },
    };
  }

  // 4. Bán cá nuôi lưới cho Ghe Anh Mười (Sửa lỗi thiếu netSell trước đây)
  if (cfg.benAutoNetSell !== false) {
    const netFishCatalog = Object.keys(baiState.info?.net?.fish || {});
    const fishKeys = Object.keys(baiState.items).filter(
      (k) =>
        baiState.items[k] > 0 &&
        (k.startsWith('fish:') || k.startsWith('netFish:') || netFishCatalog.includes(k))
    );

    if (fishKeys.length > 0) {
      const pick: Record<string, number> = {};
      let totalFishSold = 0;
      for (const k of fishKeys) {
        const qty = baiState.items[k];
        pick[k] = qty;
        const shortKey = k.replace(/^(fish:|netFish:)/, '');
        if (shortKey !== k) {
          pick[shortKey] = qty;
        }
        totalFishSold += qty;
        baiState.items[k] = 0;
      }

      sendBenWs({ t: 'netSell', pick });
      return {
        finishedMarket: false,
        result: {
          acted: true,
          msg: `🐟 Ghe Anh Mười: Đã bán ${totalFishSold} con cá nuôi lưới lấy vỏ sò!`,
          allowCast: false,
        },
      };
    }
  }

  // 5. Bán rau tươi cho Ghe Thương Lái Tư
  if (cfg.benAutoBaiSellCrops !== false) {
    const cropKeys = Object.keys(baiState.items).filter(
      (k) => k.startsWith('crop:') && baiState.items[k] > 0
    );
    if (cropKeys.length > 0) {
      const pick: Record<string, number> = {};
      for (const k of cropKeys) {
        pick[k] = baiState.items[k];
        baiState.items[k] = 0;
      }
      sendBenWs({ t: 'cropSell', pick });
      return {
        finishedMarket: false,
        result: {
          acted: true,
          msg: `🛶 Ghe Lái Tư: Đã bán ${cropKeys.length} loại rau củ phù sa thu hoạch được!`,
          allowCast: false,
        },
      };
    }
  }

  // 6. Đã bán xong toàn bộ hàng hóa -> Lên đò Ông Tám quay về Bến Đò
  sendBenWs({ t: 'ferry' });
  return {
    finishedMarket: true,
    result: {
      acted: true,
      msg: '⛵ Chợ Bãi: Đang lên đò Ông Tám quay về Bến Đò câu cá tiếp...',
      allowCast: false,
    },
  };
}
