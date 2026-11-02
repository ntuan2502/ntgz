import { AppConfig } from '../../../../shared/types/config';
import { stores, sendBenWs } from '../../../core/engine-access';
import { baiState, ensureAtSceneTile, closeBaiPanel } from './bai-state';
import { AlluvialStepResult } from './bai-farm-worker';

const CAFE_STALL_TILE = { x: 46, y: 8 };
const SPECIALTY_STALL_TILE = { x: 13, y: 20 };
const POULTRY_STALL_TILE = { x: 4, y: 15 };
const FISHBOAT_STALL_TILE = { x: 15, y: 5 };
const TRADER_STALL_TILE = { x: 5, y: 5 };
const SEEDS_STALL_TILE = { x: 19, y: 10 };
const TOOLS_STALL_TILE = { x: 10, y: 12 };
const HTX_STALL_TILE = { x: 29, y: 10 };

/**
 * Thực thi các giao dịch bán nông sản, đặc sản, trứng và cá lưới tại Chợ Bãi (state.kind === 'bai').
 * Đi bộ tới đúng sạp hàng (Cà phê Chị Út, Tiệm Cô Hai, Sạp Chú Năm, Ghe Anh Mười, Ghe Lái Tư),
 * mở menu giao dịch rồi mới gửi lệnh bán lên máy chủ.
 */
export function runBaiMarketWorkStep(cfg: AppConfig): {
  finishedMarket: boolean;
  result: AlluvialStepResult;
} {
  if (baiState.kind !== 'bai') {
    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: '⏳ Chợ Bãi: Đang chờ nhân vật bước ra khu vực Chợ Bãi...',
        allowCast: false,
      },
    };
  }

  // 1. Bán dừa xiêm tươi tại Cà phê chòi Chị Út (Chỉ khi bật switch cha benAutoCocoProcess VÀ chọn trạng thái 'sell')
  const cocoProcessEnabled = cfg.benAutoCocoProcess !== false;
  const cocoMode = cfg.benCocoMode || (cfg.benAutoCocoSell ? 'sell' : 'candy');
  const shouldSellCoconut = cocoProcessEnabled && cocoMode === 'sell';

  const cocoCount =
    baiState.items['coconut'] || baiState.items['coconuts'] || 0;
  if (shouldSellCoconut && cocoCount > 0) {
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      CAFE_STALL_TILE,
      `🚶 Chợ Bãi: Đang đi bộ tới Cà phê chòi Chị Út (46, 8) để bán ${cocoCount} trái dừa...`,
      { panel: 'cafe' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    const pick: Record<string, number> = {};
    if ((baiState.items['coconut'] || 0) > 0) pick['coconut'] = baiState.items['coconut'];
    if ((baiState.items['coconuts'] || 0) > 0) pick['coconuts'] = baiState.items['coconuts'];
    if (Object.keys(pick).length === 0) pick['coconut'] = cocoCount;

    sendBenWs({ t: 'cocoSell', pick });
    baiState.items['coconut'] = 0;
    baiState.items['coconuts'] = 0;
    closeBaiPanel();

    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🥥 Cà phê Chị Út: Đã bán ${cocoCount} trái dừa xiêm tươi lấy vỏ sò!`,
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
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      SPECIALTY_STALL_TILE,
      '🚶 Chợ Bãi: Đang đi bộ tới Tiệm Đặc Sản Cô Hai (13, 20)...',
      { panel: 'specialty' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

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
    closeBaiPanel();

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
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      POULTRY_STALL_TILE,
      '🚶 Chợ Bãi: Đang đi bộ tới Sạp Chú Năm (4, 15) để bán trứng...',
      { panel: 'poultry' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    sendBenWs({
      t: 'eggSell',
      pick: {
        ...(henEggs > 0 ? { eggHen: henEggs } : {}),
        ...(duckEggs > 0 ? { eggDuck: duckEggs } : {}),
      },
    });
    baiState.items['eggHen'] = 0;
    baiState.items['eggDuck'] = 0;
    closeBaiPanel();

    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🥚 Sạp Chú Năm: Đã bán ${henEggs} trứng gà & ${duckEggs} trứng vịt lấy vỏ sò!`,
        allowCast: false,
      },
    };
  }

  // 4. Bán cá nuôi lưới cho Ghe Anh Mười (hỗ trợ cả khóa netfish: chữ thường từ server)
  if (cfg.benAutoNetSell !== false) {
    const netFishCatalog = Object.keys(baiState.info?.net?.fish || {});
    const fishKeys = Object.keys(baiState.items).filter(
      (k) =>
        baiState.items[k] > 0 &&
        (k.startsWith('fish:') ||
          k.toLowerCase().startsWith('netfish:') ||
          netFishCatalog.includes(k))
    );

    if (fishKeys.length > 0) {
      const walk = ensureAtSceneTile(
        'BaiScene',
        'bai',
        FISHBOAT_STALL_TILE,
        '🚶 Chợ Bãi: Đang đi bộ tới Ghe Anh Mười (15, 5) để bán cá nuôi lưới...',
        { panel: 'fishBoat' },
        550
      );
      if (!walk.ready) {
        return {
          finishedMarket: false,
          result: { acted: true, msg: walk.msg, allowCast: false },
        };
      }

      const pick: Record<string, number> = {};
      let totalFishSold = 0;
      for (const k of fishKeys) {
        const qty = baiState.items[k];
        pick[k] = qty;
        const shortKey = k.replace(/^(fish:|netfish:|netFish:)/i, '');
        if (shortKey !== k) {
          pick[shortKey] = qty;
        }
        totalFishSold += qty;
        baiState.items[k] = 0;
      }

      sendBenWs({ t: 'netSell', pick });
      closeBaiPanel();
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
      const walk = ensureAtSceneTile(
        'BaiScene',
        'bai',
        TRADER_STALL_TILE,
        '🚶 Chợ Bãi: Đang đi bộ tới Ghe Thương Lái Tư (5, 5) để bán nông sản...',
        { panel: 'trader' },
        550
      );
      if (!walk.ready) {
        return {
          finishedMarket: false,
          result: { acted: true, msg: walk.msg, allowCast: false },
        };
      }

      const pick: Record<string, number> = {};
      for (const k of cropKeys) {
        pick[k] = baiState.items[k];
        const shortKey = k.replace(/^crop:/, '');
        if (shortKey !== k) {
          pick[shortKey] = baiState.items[k];
        }
        baiState.items[k] = 0;
      }
      sendBenWs({ t: 'cropSell', pick });
      closeBaiPanel();
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

  // 6. Mua hạt giống còn thiếu tại Vựa giống Cô Sáu (19, 10)
  const pendingSeeds = baiState.pendingSupplies.seeds;
  if (pendingSeeds && pendingSeeds.qty > 0) {
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      SEEDS_STALL_TILE,
      `🚶 Chợ Bãi: Đang đi bộ tới Vựa giống Cô Sáu (19, 10) mua ${pendingSeeds.qty} hạt giống ${pendingSeeds.crop}...`,
      { panel: 'seeds' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    sendBenWs({ t: 'seedBuy', crop: pendingSeeds.crop, qty: pendingSeeds.qty });
    const seedKey = `seed:${pendingSeeds.crop}`;
    baiState.items[seedKey] = (baiState.items[seedKey] || 0) + pendingSeeds.qty;
    baiState.pendingSupplies.seeds = null;
    baiState.boughtSuppliesForFarm = true;
    closeBaiPanel();
    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🌾 Vựa giống Cô Sáu: Đã mua ${pendingSeeds.qty} túi hạt giống ${pendingSeeds.crop}!`,
        allowCast: false,
      },
    };
  }

  // 7. Mua đường mía còn thiếu tại Tiệm vật tư Chú Ba (10, 12)
  const pendingSugar = baiState.pendingSupplies.sugar || 0;
  if (pendingSugar > 0) {
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      TOOLS_STALL_TILE,
      `🚶 Chợ Bãi: Đang đi bộ tới Tiệm Chú Ba (10, 12) mua ${pendingSugar} ký đường mía...`,
      { panel: 'tools' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    sendBenWs({ t: 'supplyBuy', item: 'sugar', qty: pendingSugar });
    baiState.items['sugar'] = (baiState.items['sugar'] || 0) + pendingSugar;
    baiState.pendingSupplies.sugar = 0;
    baiState.boughtSuppliesForFarm = true;
    closeBaiPanel();
    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🍬 Tiệm Chú Ba: Đã mua ${pendingSugar} ký đường mía về nấu kẹo dừa!`,
        allowCast: false,
      },
    };
  }

  // 8. Mua thuốc gia cầm tại Sạp Chú Năm / Bà Bảy (4, 15)
  const pendingMed = baiState.pendingSupplies.med || 0;
  if (pendingMed > 0) {
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      POULTRY_STALL_TILE,
      `🚶 Chợ Bãi: Đang đi bộ tới Sạp Bà Bảy (4, 15) mua ${pendingMed} liều thuốc gia cầm...`,
      { panel: 'poultry' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    sendBenWs({ t: 'medBuy', qty: pendingMed });
    baiState.items['med'] = (baiState.items['med'] || 0) + pendingMed;
    baiState.pendingSupplies.med = 0;
    baiState.boughtSuppliesForFarm = true;
    closeBaiPanel();
    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `💊 Sạp Bà Bảy: Đã mua ${pendingMed} liều thuốc chữa bệnh gia cầm!`,
        allowCast: false,
      },
    };
  }

  // 9. Mua cám cá tại Ghe Anh Mười (15, 5)
  const pendingNetFeed = baiState.pendingSupplies.netFeed || 0;
  if (pendingNetFeed > 0) {
    const walk = ensureAtSceneTile(
      'BaiScene',
      'bai',
      FISHBOAT_STALL_TILE,
      `🚶 Chợ Bãi: Đang đi bộ tới Ghe Anh Mười (15, 5) mua ${pendingNetFeed} bao cám cá...`,
      { panel: 'fishBoat' },
      550
    );
    if (!walk.ready) {
      return {
        finishedMarket: false,
        result: { acted: true, msg: walk.msg, allowCast: false },
      };
    }

    sendBenWs({ t: 'netBuy', kind: 'feed', qty: pendingNetFeed });
    baiState.items['netFeed'] = (baiState.items['netFeed'] || 0) + pendingNetFeed;
    baiState.pendingSupplies.netFeed = 0;
    baiState.boughtSuppliesForFarm = true;
    closeBaiPanel();
    return {
      finishedMarket: false,
      result: {
        acted: true,
        msg: `🌾 Ghe Anh Mười: Đã mua ${pendingNetFeed} bao cám nuôi cá sông!`,
        allowCast: false,
      },
    };
  }

  // 10. Ghé Kho HTX Cô Tư (29, 10) kiểm tra và nhận thưởng đóng góp HTX
  if (cfg.benAutoHtxClaim !== false) {
    const now = Date.now();
    const bn = stores.benNet?.getState();
    if (bn?.htx?.claimed) {
      baiState.lastHtxCheckedAt = now;
    } else if (now - baiState.lastHtxCheckedAt > 3600000) {
      const walk = ensureAtSceneTile(
        'BaiScene',
        'bai',
        HTX_STALL_TILE,
        '🚶 Chợ Bãi: Đang đi bộ tới Kho HTX Cô Tư (29, 10) kiểm tra sổ HTX...',
        { panel: 'htx' },
        800
      );
      if (!walk.ready) {
        return {
          finishedMarket: false,
          result: { acted: true, msg: walk.msg, allowCast: false },
        };
      }

      baiState.lastHtxCheckedAt = now;
      const latestBn = stores.benNet?.getState();
      if (
        latestBn?.htx &&
        typeof latestBn.htx.until === 'number' &&
        latestBn.htx.until > now &&
        !latestBn.htx.claimed
      ) {
        sendBenWs({ t: 'htxClaim' });
        closeBaiPanel();
        return {
          finishedMarket: false,
          result: {
            acted: true,
            msg: '📒 Kho HTX Cô Tư: Đã ký sổ nhận thưởng đóng góp HTX hôm nay!',
            allowCast: false,
          },
        };
      }
      closeBaiPanel();
    }
  }

  // 11. Đã hoàn tất giao thương tại Chợ Bãi
  closeBaiPanel();
  return {
    finishedMarket: true,
    result: {
      acted: true,
      msg: baiState.boughtSuppliesForFarm
        ? '🚶 Chợ Bãi: Đã mua đủ vật tư, đang quay lại vườn đất của mình...'
        : '🚶 Chợ Bãi: Đã hoàn tất giao thương, chuẩn bị đi bộ ra đò Ông Tám về Bến Đò...',
      allowCast: false,
    },
  };
}
