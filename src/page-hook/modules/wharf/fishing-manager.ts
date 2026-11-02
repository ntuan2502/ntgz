import { sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import {
  BEN_BAIT_NAMES,
  BEN_DRINK_NAMES,
  getFishDisplayName,
} from '../../../shared/constants/wharf-catalog';
import { BenExecutionContext, BenStepResult, FISHING_SPOTS, SPOT_KEYS } from './types';
import { tryRecoverBenStamina } from './stamina-recovery';

let isStockingBait = false;
let activeSpotIdx = -1;
let activeTileIdx = 0;
let spotSessionStartedAt = Date.now();
let spotFishCount = 0;
let lastBasketCountForSpot = -1;
let lastJitterCatchCount = 0;
let lastRunning = false;
let lastSpotChoice: string | null = null;

export function randomizeFishingSpot(avoidIdx = -1): void {
  const pool =
    avoidIdx >= 0
      ? SPOT_KEYS.map((_, i) => i).filter((i) => i !== avoidIdx)
      : SPOT_KEYS.map((_, i) => i);
  const picked =
    pool[Math.floor(Math.random() * pool.length)] ?? Math.floor(Math.random() * SPOT_KEYS.length);
  activeSpotIdx = picked;
  const spotMeta = FISHING_SPOTS[SPOT_KEYS[activeSpotIdx]];
  activeTileIdx = Math.floor(Math.random() * (spotMeta?.tiles.length || 1));
  spotFishCount = 0;
  spotSessionStartedAt = Date.now();
  lastJitterCatchCount = 0;
}

export function updateSpotFishCounter(curBasketLen: number): void {
  if (lastBasketCountForSpot >= 0 && curBasketLen > lastBasketCountForSpot) {
    spotFishCount += curBasketLen - lastBasketCountForSpot;
  }
  lastBasketCountForSpot = curBasketLen;
}

/**
 * SUB-AREA RUNNER 1: FISHING (Câu cá & Bán cá Bến Đò)
 */
export function runFishingStep(ctx: BenExecutionContext): BenStepResult {
  const {
    cfg,
    m,
    bu,
    bn,
    benScene,
    wallet,
    shells,
    bait,
    nonKeptCount,
    totalSellShells,
    needShellsForBait,
    needShellsForFood,
    isBossImpending,
    runWithOptionalPanel,
    walkAndRun,
  } = ctx;

  // 0. Tự động bỏ giữ cá trùng loại nếu bật benAutoSellDuplicateKept (chỉ giữ 1 con đắt nhất mỗi loài)
  if (cfg.benAutoSellDuplicateKept !== false && Array.isArray(bn.basket)) {
    const keptList = bn.basket.filter(
      (x: { kept?: boolean; id?: string; fish?: string; price?: number; size?: number }) =>
        Boolean(x.kept) && Boolean(x.id)
    );
    const bySpecies = new Map<string, typeof keptList>();
    for (const f of keptList) {
      const key = f.fish || 'unknown';
      if (!bySpecies.has(key)) bySpecies.set(key, []);
      bySpecies.get(key)!.push(f);
    }
    for (const [, list] of bySpecies.entries()) {
      if (list.length > 1) {
        list.sort(
          (a, b) =>
            (Number(b.price) || 0) - (Number(a.price) || 0) ||
            (Number(b.size) || 0) - (Number(a.size) || 0)
        );
        for (const dup of list.slice(1)) {
          if (dup.id && canAct(`ben_unkeep_${dup.id}`, 1000)) {
            markActed(`ben_unkeep_${dup.id}`);
            const fishName = getFishDisplayName(dup.fish, (dup as { name?: string }).name);
            const unkeepMsg = `🔄 Bỏ giữ cá trùng: ${fishName} (${Number(dup.price || 0).toLocaleString('vi-VN')}🐚) để bán (ưu tiên giữ con ${Number(list[0].price || 0).toLocaleString('vi-VN')}🐚)`;
            runWithOptionalPanel(
              () => {
                sendBenWs({ t: 'keep', id: dup.id, on: false });
              },
              unkeepMsg,
              { panel: 'pack', bagTab: 'fish' },
              1200
            );
            return {
              acted: true,
              msg: unkeepMsg,
            };
          }
        }
      }
    }
  }

  // 1. Sell basket at Vựa cá Anh Tư khi giỏ cá đầy (hoặc đạt ngưỡng dọn sớm) hoặc khi thiếu sò mua mồi/ăn uống
  const clearThreshold =
    cfg.benAutoClearBasketNearFull !== false && typeof cfg.benBasketNearFullThreshold === 'number'
      ? Math.max(10, Math.min(60, cfg.benBasketNearFullThreshold))
      : 60;
  const isBasketFull =
    nonKeptCount >= 60 ||
    nonKeptCount >= clearThreshold ||
    bn.notice?.error === 'basketFull';

  if (
    cfg.benAutoSell !== false &&
    nonKeptCount > 0 &&
    (isBasketFull || needShellsForBait || needShellsForFood)
  ) {
    const reasonText =
      nonKeptCount >= 60 || bn.notice?.error === 'basketFull'
        ? ' (Giỏ đã đầy 60/60)'
        : nonKeptCount >= clearThreshold
          ? ` (Đạt ngưỡng dọn sớm ${nonKeptCount}/${clearThreshold})`
          : '';
    return walkAndRun(
      { x: 40, y: 10 },
      () => {
        sendBenWs({ t: 'sell' });
      },
      `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚)${reasonText}`,
      'ben_sell',
      { panel: 'sell' },
      1400
    );
  }

  // 2. Recover Stamina when low
  const stamRes = tryRecoverBenStamina(ctx);
  if (stamRes) return stamRes;

  // 3. Buy Bait when out of bait or stocking up to benBaitMaxCount
  const maxBait = typeof cfg.benBaitMaxCount === 'number' ? cfg.benBaitMaxCount : 10000;
  const minShellsForBait = typeof cfg.benBaitMinShells === 'number' ? cfg.benBaitMinShells : 10000;

  if (bait <= 0) {
    isStockingBait = true;
  } else if (bait >= maxBait || shells < minShellsForBait) {
    isStockingBait = false;
  }

  if (isStockingBait && cfg.benAutoBuyBait !== false) {
    const baitPrices: Record<string, number> = {
      moi20: 15,
      moi60: 40,
      moi150: 90,
    };
    const prefBait = cfg.benPreferBait || 'moi150';
    const buyBaitChoice =
      shells >= (baitPrices[prefBait] || 40)
        ? prefBait
        : shells >= 15
          ? 'moi20'
          : 'xinMoi';

    const baitCost = baitPrices[buyBaitChoice] || 0;
    const canAfford = shells >= minShellsForBait + baitCost || (bait <= 0 && shells >= baitCost);

    if (buyBaitChoice !== 'xinMoi' && canAfford && canAct('ben_bait', 1200)) {
      const baitLabel = BEN_BAIT_NAMES[buyBaitChoice] || buyBaitChoice;
      return walkAndRun(
        { x: 53, y: 11 },
        () => {
          sendBenWs({ t: 'buy', item: buyBaitChoice });
        },
        `Mua ${baitLabel} tại Sạp Chú Đực (-${baitCost}🐚, hiện có ${bait}/${maxBait} mồi)`,
        'ben_bait',
        { panel: 'bait' },
        1200
      );
    }

    if (bait > 0 && shells < minShellsForBait) {
      isStockingBait = false;
    }
  }

  if (bait <= 0) {
    const xinMoiBlocked =
      shells > 0 ||
      (lastXinMoiDay === (m.day || 0) && Date.now() - lastXinMoiAt < 600000) ||
      bn.notice?.error === 'used' ||
      bn.notice?.error === 'noFree';

    if (!xinMoiBlocked && canAct('ben_bait', 3000)) {
      setLastXinMoi(Date.now(), m.day || 0);
      return walkAndRun(
        { x: 53, y: 11 },
        () => {
          sendBenWs({ t: 'buy', item: 'xinMoi' });
        },
        `Xin ${BEN_BAIT_NAMES.xinMoi} tại Sạp Chú Đực`,
        'ben_bait',
        { panel: 'bait' },
        1500
      );
    }

    return {
      acted: false,
      exhausted: true,
      reason: '🪱 Bến Đò: Đã hết mồi & không đủ điều kiện mua tiếp -> Chuyển khu vực tiếp theo!',
    };
  }

  // 4. Drink Luck Tea
  if (cfg.benAutoLuckDrink && (wallet.luckCasts || 0) <= 0 && canAct('ben_luck_drink', 5000)) {
    const drinkId = cfg.benPreferDrink || 'nuocMia';
    const drinkPrices: Record<string, number> = {
      traDa: 3,
      nuocMia: 15,
      rauMa: 30,
      caPhe: 35,
      duaTuoi: 80,
    };
    const drinkCost = drinkPrices[drinkId] || 15;
    const drinkLabel = BEN_DRINK_NAMES[drinkId] || drinkId;
    if (shells >= drinkCost) {
      return walkAndRun(
        { x: 26, y: 12 },
        () => {
          sendBenWs({ t: 'buy', item: drinkId });
        },
        `Uống ${drinkLabel} tại Xe trà đá Chị Thơm (-${drinkCost}🐚)`,
        'ben_luck_drink',
        { panel: 'tea', teaStand: 'river' },
        1500
      );
    }
  }

  // 5. Walk to fishing spot, then let the content runner cast (deferred so ready bounded tasks go first)
  if (cfg.benAutoSpot !== false) {
    const spotChoice = cfg.benSpot || 'bank';
    const isDynamicSpot = spotChoice === 'rotate' || spotChoice === 'random';

    // Khi người dùng bấm Bắt đầu (running từ false -> true) hoặc đổi sang chế độ random/rotate:
    const isSessionStart = (cfg.running && !lastRunning) || spotChoice !== lastSpotChoice;
    lastRunning = Boolean(cfg.running);
    lastSpotChoice = spotChoice;

    if (spotChoice === 'random' && (isSessionStart || activeSpotIdx < 0)) {
      randomizeFishingSpot();
    } else if (spotChoice === 'rotate' && activeSpotIdx < 0) {
      activeSpotIdx = 0;
      activeTileIdx = 0;
      spotFishCount = 0;
      spotSessionStartedAt = Date.now();
      lastJitterCatchCount = 0;
    }

    if (isDynamicSpot && activeSpotIdx >= 0) {
      const switchMode = cfg.benSpotSwitchMode || 'count';
      const switchVal = Math.max(1, Number(cfg.benSpotSwitchValue) || 15);
      const shouldSwitch =
        switchMode === 'time'
          ? Date.now() - spotSessionStartedAt >= switchVal * 60000
          : spotFishCount >= switchVal;

      if (shouldSwitch) {
        if (spotChoice === 'random') {
          randomizeFishingSpot(activeSpotIdx);
        } else {
          activeSpotIdx = (activeSpotIdx + 1) % SPOT_KEYS.length;
          activeTileIdx = 0;
          spotFishCount = 0;
          spotSessionStartedAt = Date.now();
          lastJitterCatchCount = 0;
        }
      }
    }

    const spotKey = isDynamicSpot
      ? SPOT_KEYS[Math.max(0, activeSpotIdx) % SPOT_KEYS.length]
      : spotChoice;
    const spotMeta = FISHING_SPOTS[spotKey] || FISHING_SPOTS.bank;

    if (cfg.benHumanJitter !== false && spotFishCount - lastJitterCatchCount >= 6) {
      lastJitterCatchCount = spotFishCount;
      activeTileIdx = (activeTileIdx + 1) % spotMeta.tiles.length;
    }

    const candidateTiles = spotMeta.tiles;
    const targetTile = candidateTiles[activeTileIdx % candidateTiles.length] || candidateTiles[0];

    const curTile = benScene?.farmer?.tile;
    const isAtTargetTile = curTile
      ? curTile.x === targetTile.x && curTile.y === targetTile.y
      : bu.spot === spotMeta.kind;

    const needsWalkToSpot = !bu.spot || (!isAtTargetTile && (spotChoice as string) !== 'any');

    if (needsWalkToSpot) {
      if (benScene && typeof benScene.goFarmer === 'function') {
        const goFarmer = benScene.goFarmer.bind(benScene);
        return {
          acted: false,
          deferred: () => {
            if (benScene.farmer?.running) return { acted: true, msg: '🚶 Đang di chuyển...' };
            goFarmer(targetTile);
            const progressMsg = isDynamicSpot
              ? cfg.benSpotSwitchMode === 'time'
                ? `[${Math.floor((Date.now() - spotSessionStartedAt) / 60000)}/${cfg.benSpotSwitchValue || 15}p]`
                : `[${spotFishCount}/${cfg.benSpotSwitchValue || 15} cá]`
              : '';
            return {
              acted: true,
              msg: `🚶 Đang đi ra sát mép nước ${spotMeta.label} (${targetTile.x}, ${targetTile.y}) câu cá ${progressMsg}...`,
            };
          },
        };
      }
    }

    if (benScene?.farmer?.lookAt && Math.random() < 0.04) {
      const lookDir =
        spotMeta.kind === 'bank' || spotKey === 'dock' ? { dx: 0, dy: -24 } : { dx: 24, dy: 0 };
      benScene.farmer.lookAt(
        (benScene.farmer.x ?? 0) + lookDir.dx,
        (benScene.farmer.y ?? 0) + lookDir.dy
      );
    }
  }

  if (isBossImpending) {
    return { acted: false, allowCast: false };
  }

  return { acted: false, deferred: () => ({ acted: false, allowCast: true }) };
}
