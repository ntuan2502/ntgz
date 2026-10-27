import { stores, getActiveScene, sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, WharfSubAreaId } from '../../../shared/types/config';
import { CricketItem, SoiNpc } from '../../../shared/types/game-store';
import { getBenHuntSpots, BEN_HUNT_ZONES } from '../../../shared/constants/default-config';
import { refreshCricketWatchers, getBenServerNow, getBenHour, getMyBout, markHuntLightSent } from './cricket-watchers';

export { refreshCricketWatchers };

interface BenStepResult {
  acted: boolean;
  msg?: string;
  exhausted?: boolean;
  reason?: string;
  /** Content runner may click the cast button (fishing owns the continuous slot and stands at the spot) */
  allowCast?: boolean;
  /** Continuous activity (fishing / hunting) to run only if no bounded task is ready */
  deferred?: () => BenStepResult;
}

const BEN_FOOD_NAMES: Record<string, string> = {
  banhMi: '🥖 Bánh mì thịt (+20⚡)',
  chaoCa: '🥣 Cháo cá lóc (+28⚡)',
  huTieu: '🍜 Hủ tiếu nam vang (+40⚡)',
  comTam: '🍛 Cơm tấm sườn bì (+60⚡)',
  lauMam: '🍲 Lẩu cá linh bông điên điển (+100⚡)',
};

const BEN_PACK_NAMES: Record<string, string> = {
  xoiBap: '🍙 Xôi bắp gói lá chuối (+15⚡)',
  banhMiGoi: '🥖 Bánh mì gói giấy (+20⚡)',
  banhBao: '🥟 Bánh bao nhân thịt (+22⚡)',
  comNam: '🍙 Cơm nắm muối mè (+30⚡)',
  banhTet: '🫔 Bánh tét lá cẩm (+50⚡)',
  traDaTui: '🧋 Trà đá túi xách (+8⚡)',
  nuocSuoi: '💧 Chai nước suối (+10⚡)',
};

const BEN_DRINK_NAMES: Record<string, string> = {
  traDa: '🧊 Trà đá (+8⚡)',
  nuocMia: '🥤 Nước mía tắc (+5⚡, May +1)',
  rauMa: '🍵 Rau má đậu xanh (+5⚡, May +1)',
  caPhe: '☕ Cà phê sữa đá (+10⚡, May +2)',
  duaTuoi: '🥥 Dừa xiêm tươi (+15⚡, May +3)',
};

const BEN_BAIT_NAMES: Record<string, string> = {
  xinMoi: '🤲 10 mồi miễn phí',
  moi20: '🪱 Hộp mồi trùn (+20 mồi)',
  moi60: '🪱 Thau mồi trùn (+60 mồi)',
  moi150: '🪱 Thùng mồi cám (+150 mồi)',
};

const WHEEL_ITEM_IDS = [
  'canhSaoDem',
  'canhHac',
  'rongMay',
  'trangRam',
  'canhPhuong',
  'vayRong',
  'canhCo',
  'denKeoQuan',
  'dieuSao',
  'danKimXaCu',
  'coGhe',
  'denCaChep',
  'loTre',
  'danKim',
  'dienDien',
  'denOngSao',
  'dieuGiay',
  'canCau',
];

export const CRICKET_SPECIES_NAMES: Record<string, string> = {
  deCom: 'Dế cơm',
  deMen: 'Dế mèn',
  deDat: 'Dế đất',
  deThan: 'Dế than',
  deTrui: 'Dế trũi',
  deCo: 'Dế cồ',
  deLua: 'Dế lửa',
  deNgoc: 'Dế ngọc',
  deVang: 'Dế vàng',
  deMa: 'Dế ma',
  deSat: 'Dế sắt',
  deVuong: 'Dế vương',
};

export const CRICKET_RARITY_REFUND: Record<string, number> = {
  common: 5,
  uncommon: 15,
  rare: 40,
  epic: 120,
  legendary: 400,
};

export const CRICKET_SPECIES_RARITY: Record<string, string> = {
  deCom: 'common',
  deMen: 'common',
  deDat: 'common',
  deThan: 'uncommon',
  deTrui: 'uncommon',
  deCo: 'uncommon',
  deLua: 'rare',
  deNgoc: 'rare',
  deVang: 'rare',
  deMa: 'epic',
  deSat: 'epic',
  deVuong: 'legendary',
};

const BOSS_LADDER = [
  { id: 'cuBin', name: 'Cu Bin', reward: 15, total: 60 },
  { id: 'utMap', name: 'Út Mập', reward: 30, total: 112 },
  { id: 'anhLuc', name: 'Anh Lực xe ôm', reward: 60, total: 138 },
  { id: 'bacChin', name: 'Bác Chín thợ rèn', reward: 110, total: 194 },
  { id: 'ongSau', name: 'Ông Sáu chủ sới', reward: 220, total: 242 },
];
/** Only challenge a boss when our best cricket is at least this strong relative to it */
const BOSS_MIN_STRENGTH_RATIO = 0.85;
const SOI_TILE = { x: 4, y: 29 };
const CRICKET_BOX_MAX = 6;
const HUNT_STAMINA_COST = 3;
const HUNT_LIGHT_STALE_MS = 8000;

let keepBenPanelUntil = 0;
let keepBenPanelMsg = '';
let huntLightAt = 0;
let hadMyBout = false;
let huntSpotIdx = 0;
let lastHandledGotAwaySeq = -1;
let lastHuntZoneChoice: string | null = null;

const ATM_STORAGE_KEY = 'ntg_ben_last_atm_at';
let lastAtmExchangeAt = (() => {
  try {
    const raw = sessionStorage.getItem(ATM_STORAGE_KEY);
    return raw ? Number(raw) || 0 : 0;
  } catch {
    return 0;
  }
})();

function recordAtmExchange(): void {
  lastAtmExchangeAt = Date.now();
  try {
    sessionStorage.setItem(ATM_STORAGE_KEY, String(lastAtmExchangeAt));
  } catch {
    // Ignore storage errors
  }
}

let isStockingBait = false;

const cricketTotal = (c: { stats?: { power?: number; tough?: number; nerve?: number } }) =>
  (c.stats?.power || 0) + (c.stats?.tough || 0) + (c.stats?.nerve || 0);

export function execBenStep(cfg: AppConfig): BenStepResult {
  const mStore = stores.main;
  const buStore = stores.benUI;
  const bnStore = stores.benNet;
  if (!mStore || !buStore || !bnStore) {
    return { acted: false };
  }

  const m = mStore.getState();
  const bu = buStore.getState();
  const bn = bnStore.getState();

  if (m.screen !== 'benDo' || bn.status !== 'in') {
    return { acted: false };
  }
  refreshCricketWatchers(cfg);
  if (bu.walking || bn.fishing !== 'idle') {
    return { acted: false };
  }

  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  // If showFullActions is enabled and a native panel is currently being displayed for an action, keep it visible
  if (cfg.showFullActions && bu.panel && Date.now() < keepBenPanelUntil) {
    return { acted: true, msg: keepBenPanelMsg || '👁️ Đang hiển thị giao diện thao tác...' };
  }

  const rawScene = getActiveScene('BenDoScene');
  const benScene = rawScene as unknown as {
    goFarmer?: (tile: { x: number; y: number }, cb?: () => void) => void;
    farmer?: { tile?: { x: number; y: number }; running?: boolean };
  } | null;

  const wallet = bn.wallet;
  if (!wallet) return { acted: false };

  const huntEnabled = cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false;
  const bossEnabled = cfg.benSubEnabled?.cricketBoss !== false && cfg.benAutoBossBout !== false;
  const arenaEnabled = cfg.benSubEnabled?.cricketBoss !== false && (bossEnabled || Boolean(cfg.benAutoBet));

  // Active hunt: stay still so no other task walks the player off the field.
  if (bn.hunt) {
    if (bn.hunt.phase === 'light' && Date.now() - huntLightAt > HUNT_LIGHT_STALE_MS) {
      bnStore.setState({ hunt: null });
      return { acted: false };
    }
    const hop = bn.hunt.phase === 'hop' ? bn.hunt.hop : undefined;
    return {
      acted: true,
      msg: hop
        ? `🦗 Dế đang nhảy (còn ${hop.left} lần) -> canh bụi cỏ ${hop.spot + 1} để úp...`
        : bn.hunt.rarity
          ? '🦗 Nghe tiếng dế gáy, đang chờ nó nhảy ra...'
          : '🔦 Đang rọi đèn nghe ngóng tiếng dế gáy...',
    };
  }

  // Own bout in progress: stay at the arena (tickles are handled by the watcher).
  const myBout = getMyBout(bn);
  if (myBout) {
    hadMyBout = true;
    const { bout, side } = myBout;
    return {
      acted: true,
      msg: `🥊 Sới Dế: Đang thi đấu ${bout.n ? `(giáp ${bout.n}/12)` : '(sắp vào trận)'} · còn ${bout.tickles?.[side] ?? 0} lần khều râu`,
    };
  }
  if (hadMyBout) {
    // Bout just ended: refresh arena + tube so rest timers and paid rewards are up to date.
    hadMyBout = false;
    markActed('ben_boss_wait');
    sendBenWs({ t: 'soi' });
    sendBenWs({ t: 'crickets' });
  }

  // Cricket/arena state is null until requested; it can be fetched from anywhere on the map.
  if ((huntEnabled || arenaEnabled) && (!bn.crickets || !bn.soi) && canAct('ben_cricket_init', 5000)) {
    markActed('ben_cricket_init');
    if (!bn.crickets) sendBenWs({ t: 'crickets' });
    if (!bn.soi) sendBenWs({ t: 'soi' });
  } else if (arenaEnabled && bn.soi && canAct('ben_soi_refresh', 60000)) {
    markActed('ben_soi_refresh');
    sendBenWs({ t: 'soi' });
  }

  const stamina = computeBenStamina(wallet);
  const shells = wallet.shells || 0;
  const bait = wallet.bait || 0;
  const nonKeptFish = Array.isArray(bn.basket)
    ? bn.basket.filter((x: { kept?: boolean; price?: number }) => !x.kept)
    : [];
  const nonKeptCount = nonKeptFish.length;
  const totalSellShells = nonKeptFish.reduce(
    (sum: number, x: { price?: number }) => sum + (Number(x.price) || 0),
    0
  );
  const pack = bn.pack || {};
  const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);
  const stamMin = Number(cfg.benStaminaThreshold ?? 4);

  const runWithOptionalPanel = (
    actionFn: () => void,
    label: string,
    panelState?: Record<string, unknown>,
    holdMs = 1500
  ) => {
    const forceOpen = panelState?.panel === 'lantern';
    if ((cfg.showFullActions || forceOpen) && panelState) {
      buStore.setState(panelState);
      keepBenPanelUntil = Date.now() + holdMs;
      keepBenPanelMsg = label;
      setTimeout(() => {
        actionFn();
      }, 250);
    } else {
      actionFn();
      buStore.setState({ panel: null });
    }
  };

  const walkAndRun = (
    tile: { x: number; y: number },
    actionFn: () => void,
    label: string,
    actionKey: string | null = null,
    panelState?: Record<string, unknown>,
    holdMs = 1500
  ) => {
    if (actionKey && !canAct(actionKey)) {
      return { acted: false };
    }
    if (benScene && typeof benScene.goFarmer === 'function') {
      const cur = benScene.farmer?.tile;
      if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
        if (actionKey) markActed(actionKey);
        runWithOptionalPanel(actionFn, label, panelState, holdMs);
        return { acted: true, msg: label };
      }
      if (benScene.farmer?.running) {
        return { acted: true, msg: `🚶 Đang di chuyển...` };
      }
      benScene.goFarmer(tile, () => {
        setTimeout(() => {
          if (!actionKey || canAct(actionKey)) {
            if (actionKey) markActed(actionKey);
            runWithOptionalPanel(actionFn, label, panelState, holdMs);
          }
        }, 250);
      });
      return { acted: true, msg: `🚶 ${label}` };
    }
    if (actionKey) markActed(actionKey);
    runWithOptionalPanel(actionFn, label, panelState, holdMs);
    return { acted: true, msg: label };
  };

  const foodPrices: Record<string, number> = {
    banhMi: 10,
    chaoCa: 14,
    huTieu: 20,
    comTam: 28,
    lauMam: 45,
  };
  const prefFood = cfg.benPreferFood || 'lauMam';
  const targetFoodPrice = foodPrices[prefFood] || 45;

  const needShellsForBait = bait <= 0 && shells < 15;
  const needShellsForFood =
    (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) &&
    packItems.length === 0 &&
    shells < targetFoodPrice;

  // Helper: Recover Stamina
  const tryRecoverStamina = (): BenStepResult | null => {
    if (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) {
      if (cfg.benAutoRecoverStamina !== false) {
        // Eat from pack
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

        // Út Mười shampoo
        if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct('ben_goi_dau', 4000)) {
          return walkAndRun(
            { x: 16, y: 24 },
            () => {
              sendBenWs({ t: 'buy', item: 'goiDau' });
            },
            `💆 Gội đầu massage tại Tiệm Út Mười (+50⚡, -25🐚)`,
            'ben_goi_dau',
            { panel: 'hair' },
            1500
          );
        }

        // Buy food from Dì Tám ({ x: 39, y: 23 })
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

        const foodCost = foodPrices[buyItem] || 10;
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

        // Fallback: Drink iced tea at Chị Thơm
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

        if (!canAct('ben_buy_food', 4000) || !canAct('ben_eat_pack', 3000) || !canAct('ben_goi_dau', 4000) || !canAct('ben_drink', 4000)) {
          return { acted: true, msg: '🍚 Đang chờ ăn hồi phục Sức...' };
        }
      }

      if (stamina < 4) {
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
          reason: '😮‍💨 Bến Đò: Hết Sức và không đủ vỏ sò để ăn/gội đầu -> Chuyển khu vực tiếp theo!',
        };
      }
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 1: FISHING (Câu cá & Bán cá Bến Đò)
  // ---------------------------------------------------------------------------
  const runFishingStep = (): BenStepResult => {
    // 1. Sell basket at Vựa cá Anh Tư
    const sellThreshold = Number(cfg.benSellThreshold) || 60;
    if (
      cfg.benAutoSell !== false &&
      nonKeptCount > 0 &&
      (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)
    ) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: 'sell' });
        },
        `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚)`,
        'ben_sell',
        { panel: 'sell' },
        1400
      );
    }

    // 2. Recover Stamina when low
    const stamRes = tryRecoverStamina();
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
      const drinkPrices: Record<string, number> = { traDa: 3, nuocMia: 15, rauMa: 30, caPhe: 35, duaTuoi: 80 };
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
      const spotTargets: Record<string, { x: number; y: number; kind: string; label: string }> = {
        dock: { x: 31, y: 3, kind: 'dock', label: 'Cầu tàu lớn (Đầu mũi)' },
        bamboo: { x: 7, y: 6, kind: 'dock', label: 'Cầu tre lắt lẻo' },
        bank: { x: 24, y: 10, kind: 'bank', label: 'Bờ sông bến giữa' },
        bridge: { x: 46, y: 15, kind: 'dock', label: 'Cầu ván qua lạch' },
      };
      const target = spotTargets[spotChoice] || spotTargets.bank;
      const curTile = benScene?.farmer?.tile;
      const atSpot = curTile
        ? curTile.x === target.x && curTile.y === target.y
        : bu.spot === target.kind;

      if (!atSpot && (spotChoice as string) !== 'any') {
        if (benScene && typeof benScene.goFarmer === 'function') {
          const goFarmer = benScene.goFarmer.bind(benScene);
          return {
            acted: false,
            deferred: () => {
              if (benScene.farmer?.running) return { acted: true, msg: '🚶 Đang di chuyển...' };
              goFarmer({ x: target.x, y: target.y });
              return { acted: true, msg: `🚶 Đang đi ra ${target.label} (${target.x}, ${target.y}) câu cá...` };
            },
          };
        }
      }
    }

    return { acted: false, deferred: () => ({ acted: false, allowCast: true }) };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 2: CRICKET ARENA & BOSS FIGHT (Sới dế Ông Sáu)
  // Tickles and arena bets are timing-critical and run in cricket-watchers.ts.
  // ---------------------------------------------------------------------------
  const runCricketBossStep = (): BenStepResult => {
    if (!bossEnabled || !bn.soi || !canAct('ben_boss_wait', 3000)) {
      return { acted: false };
    }

    const npcs = bn.soi.npcs || [];
    const nextBoss = BOSS_LADDER.find((b) => {
      const npcState = npcs.find((n: SoiNpc) => n.id === b.id);
      return npcState?.open && !npcState.paidToday;
    });
    if (!nextBoss) return { acted: false };

    const box: CricketItem[] = bn.soi.box?.length ? bn.soi.box : bn.crickets?.box || [];
    const nowServer = getBenServerNow(bn);
    const readyCrickets = box
      .filter((c) => (!c.restUntil || c.restUntil <= nowServer) && (!c.diesAt || c.diesAt > nowServer))
      .sort((a, b) => cricketTotal(b) - cricketTotal(a));
    const bestCricket = readyCrickets[0];
    if (!bestCricket) return { acted: false };

    const cTotal = cricketTotal(bestCricket);
    if (cTotal < nextBoss.total * BOSS_MIN_STRENGTH_RATIO) return { acted: false };

    const cName = CRICKET_SPECIES_NAMES[bestCricket.species] || 'Dế';
    return walkAndRun(
      SOI_TILE,
      () => {
        sendBenWs({ t: 'bout', npc: nextBoss.id, cricket: bestCricket.id });
      },
      `🥊 Thách đấu ${nextBoss.name} tại Sới Dế (+${nextBoss.reward}🐚) với ${cName} (Tổng: ${cTotal} vs ${nextBoss.total})`,
      'ben_boss_bout',
      { panel: 'soi' },
      1200
    );
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 3: CRICKET HUNT & TUBE CARE (Bắt dế đêm & Nuôi dế ống tre)
  // The trap timing itself runs in cricket-watchers.ts.
  // ---------------------------------------------------------------------------
  const runCricketHuntStep = (): BenStepResult => {
    if (!huntEnabled || !bn.crickets) {
      return { acted: false };
    }
    const box: CricketItem[] = bn.crickets.box || [];

    // 1. Feed the highest-potential cricket (off by default, costs shells)
    if (cfg.benAutoFeedCricket && box.length > 0 && canAct('ben_cricket_feed', 3000)) {
      const capTotal = (c: CricketItem) => (c.caps?.power || 0) + (c.caps?.tough || 0) + (c.caps?.nerve || 0);
      const target = [...box].sort((a, b) => capTotal(b) - capTotal(a))[0];
      const foods = {
        tough: { id: 'laNon', name: '🌿 Lá non', price: 25 },
        power: { id: 'trungKien', name: '🥚 Trứng kiến', price: 40 },
        nerve: { id: 'otHiem', name: '🌶️ Ớt hiểm', price: 30 },
      } as const;
      const gap = (stat: keyof typeof foods) => (target.caps?.[stat] || 0) - (target.stats?.[stat] || 0);
      const pref = cfg.benPreferCricketFood || 'balanced';
      const stat: keyof typeof foods | null =
        pref === 'balanced'
          ? (['tough', 'power', 'nerve'] as const).reduce((best, s) => (gap(s) > gap(best) ? s : best), 'tough' as keyof typeof foods)
          : pref;
      const food = stat && gap(stat) > 0 ? foods[stat] : null;
      if (food && shells >= food.price) {
        markActed('ben_cricket_feed');
        sendBenWs({ t: 'feed', id: target.id, food: food.id });
        const cName = CRICKET_SPECIES_NAMES[target.species] || 'Dế';
        return { acted: true, msg: `🌿 Cho ${cName} ăn ${food.name} (-${food.price}🐚)` };
      }
    }

    // 2. Night window check (wharf runs on real Vietnam time, 18h-5h)
    const hour = getBenHour(bn);
    const isNight = hour >= 18 || hour < 5;
    const isRareHour = hour >= 23 || hour < 4;
    if (!isNight || (cfg.benHuntRareOnly && !isRareHour)) {
      return { acted: false };
    }

    // 3. Full tube: release the weakest common/uncommon cricket to make room
    if (box.length >= CRICKET_BOX_MAX) {
      if (cfg.benAutoReleaseLowCricket === false || !canAct('ben_cricket_release', 3000)) {
        return { acted: false };
      }
      const rankOrder: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
      const rank = (c: CricketItem) => rankOrder[CRICKET_SPECIES_RARITY[c.species] || 'common'] || 1;
      const lowest = [...box].sort((a, b) => rank(a) - rank(b) || cricketTotal(a) - cricketTotal(b))[0];
      const lowestRarity = CRICKET_SPECIES_RARITY[lowest.species] || 'common';
      if (lowestRarity !== 'common' && lowestRarity !== 'uncommon') {
        return { acted: false };
      }
      markActed('ben_cricket_release');
      sendBenWs({ t: 'release', id: lowest.id });
      const cName = CRICKET_SPECIES_NAMES[lowest.species] || 'Dế';
      return {
        acted: true,
        msg: `🎋 Ống tre đầy (${box.length}/${CRICKET_BOX_MAX}) -> Thả ${cName} về đồng (+${CRICKET_RARITY_REFUND[lowestRarity] || 5}🐚)`,
      };
    }

    // 4. Stamina: each light costs 3
    if (stamina < HUNT_STAMINA_COST) {
      const stamRes = tryRecoverStamina();
      if (stamRes) return stamRes;
      return {
        acted: false,
        exhausted: true,
        reason: '😮‍💨 Bến Đò: Hết Sức rọi đèn bắt dế đêm -> Chuyển khu vực tiếp theo!',
      };
    }

    // 5. Hunt spot & zone selection
    const zoneChoice = cfg.benHuntZone || 'field';
    if (zoneChoice !== lastHuntZoneChoice) {
      lastHuntZoneChoice = zoneChoice;
      huntSpotIdx = 0;
    }
    const spots = getBenHuntSpots(zoneChoice);
    if (!spots || spots.length === 0) {
      return { acted: false };
    }

    // Handle gotAway: if why === 'none' (empty bush), move to next tile immediately
    const gotAway = bn.gotAway;
    if (gotAway && typeof gotAway.seq === 'number' && gotAway.seq !== lastHandledGotAwaySeq) {
      lastHandledGotAwaySeq = gotAway.seq;
      if (gotAway.why === 'none') {
        huntSpotIdx = (huntSpotIdx + 1) % spots.length;
      }
    }

    const currentSpot = spots[huntSpotIdx % spots.length];
    const zoneMeta = BEN_HUNT_ZONES[currentSpot.zone] ?? BEN_HUNT_ZONES.field;

    // 6. Walk to target spot and shine flashlight
    return {
      acted: false,
      deferred: () => {
        if (!benScene || typeof benScene.goFarmer !== 'function') return { acted: false };
        const cur = benScene.farmer?.tile;
        const atTarget = Boolean(
          cur && Math.abs(cur.x - currentSpot.x) <= 1 && Math.abs(cur.y - currentSpot.y) <= 1
        );

        if (!atTarget) {
          if (benScene.farmer?.running) {
            return { acted: true, msg: `🚶 Đang di chuyển sang ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y})...` };
          }
          benScene.goFarmer({ x: currentSpot.x, y: currentSpot.y });
          return { acted: true, msg: `🚶 Ra ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y}) săn dế đêm...` };
        }

        if (!canAct('ben_hunt_light', 2500)) {
          return { acted: true, msg: '🔦 Chuẩn bị rọi đèn bắt dế...' };
        }

        markActed('ben_hunt_light');
        markHuntLightSent();
        huntLightAt = Date.now();
        bnStore.setState({ hunt: { phase: 'light' } });
        sendBenWs({ t: 'light' });

        // Advance to the next spot in the zone so that after this hunt finishes (or fails), farmer walks to another tile
        huntSpotIdx = (huntSpotIdx + 1) % spots.length;

        return {
          acted: true,
          msg: `🔦 Rọi đèn bắt dế đêm tại ${zoneMeta.label} (⚡${HUNT_STAMINA_COST} Sức · ống tre ${box.length}/${CRICKET_BOX_MAX})`,
        };
      },
    };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 4: ENTERTAINMENT & UTILITIES (Lồng đèn, Vé số, ATM)
  // ---------------------------------------------------------------------------
  const runEntertainmentStep = (): BenStepResult => {
    // A. Sạp lồng đèn Cô Bảy
    if (cfg.benAutoLantern !== false) {
      const tickets = wallet.tickets || 0;
      const boughtToday = bn.wheel?.bought || 0;
      const canBuyTicket = Boolean(cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600);

      if ((tickets > 0 || canBuyTicket) && bu.panel !== 'lantern' && canAct('ben_lantern_open', 2500)) {
        return walkAndRun(
          { x: 37, y: 28 },
          () => {
            const curBn = bnStore.getState();
            const curPicks = curBn.wheel?.picks || [];
            const ownedCloset = Array.isArray(curBn.closet) ? curBn.closet : [];
            const unownedWheel = WHEEL_ITEM_IDS.filter((id) => !ownedCloset.includes(id));
            const needPicks = Math.min(3, unownedWheel.length);
            if (needPicks > 0 && curPicks.length < needPicks) {
              sendBenWs({ t: 'pick', items: unownedWheel.slice(0, needPicks) });
            }
            buStore.setState({ panel: 'lantern' });
          },
          tickets > 0
            ? `🏮 Mở Vòng quay lồng đèn Cô Bảy (hiện có ${tickets} vé 🎟️)`
            : `🏮 Ghé Sạp lồng đèn Cô Bảy mua vé quay (${boughtToday}/5, -600🐚)`,
          'ben_lantern_open',
          { panel: 'lantern' },
          5000
        );
      }
    }

    // B. Đại lý vé số Bến Đò
    if (cfg.benAutoLotto !== false) {
      const lottoState = bn.lotto;
      const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
      if (hasWins && canAct('ben_lotto_claim', 4000)) {
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: 'lottoClaim' });
          },
          `🎟️ Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
          'ben_lotto_claim',
          { panel: 'agent' },
          1500
        );
      }

      if (cfg.benAutoBuyLotto && shells >= 10 && canAct('ben_lotto_buy', 60000)) {
        const sellingDay = lottoState?.selling;
        const alreadyBought = (lottoState?.mine || []).some((t: { day?: number }) => t.day === sellingDay);
        if (!alreadyBought) {
          const randNum = Math.floor(Math.random() * 100);
          return walkAndRun(
            { x: 36, y: 31 },
            () => {
              sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
            },
            `🍀 Mua 1 vé số Bến Đò (số ${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
            'ben_lotto_buy',
            { panel: 'agent' },
            1500
          );
        }
      }
    }

    // C. Exchange shells at ATM ({x: 34, y: 35})
    const atmMin = typeof cfg.benAtmThreshold === 'number' ? cfg.benAtmThreshold : 10000;
    const ONE_HOUR_MS = 60 * 60 * 1000;
    const canRunHourly = lastAtmExchangeAt === 0 || Date.now() - lastAtmExchangeAt >= ONE_HOUR_MS;

    if (cfg.benAutoAtm && shells >= atmMin && canRunHourly && canAct('ben_atm', 4000)) {
      const bnAtm = bn.atm;
      const maxByAtmQuota =
        bnAtm && typeof bnAtm.left === 'number' && typeof bnAtm.rate === 'number'
          ? Math.floor(bnAtm.left / bnAtm.rate)
          : shells;
      const maxShells = Math.min(shells, maxByAtmQuota);
      const cashShells = Math.floor(maxShells / 100) * 100;

      if (cashShells >= 100) {
        return walkAndRun(
          { x: 34, y: 35 },
          () => {
            recordAtmExchange();
            sendBenWs({ t: 'atmCash', shells: cashShells });
          },
          `🏧 Đổi tối đa ${cashShells.toLocaleString('vi-VN')} vỏ sò ra tiền mặt tại Cây ATM (lần đổi kế tiếp sau 1 tiếng)`,
          'ben_atm',
          { panel: 'atm' },
          1500
        );
      } else if (bnAtm && typeof bnAtm.left === 'number' && bnAtm.left < 100 * (bnAtm.rate || 1)) {
        // Hourly quota reached, record timestamp so we wait for the next hour
        recordAtmExchange();
      }
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // DISPATCHER: EXECUTE SUB-AREAS IN ORDER DEFINED BY benSubOrder
  // Bounded tasks (boss, entertainment, maintenance) run as soon as they are ready,
  // in priority order. Continuous activities (fishing, night hunt) compete for a
  // single slot: the highest-priority available one wins and the other is skipped,
  // so the player never ping-pongs between the river and the grass field.
  // ---------------------------------------------------------------------------
  const subAreaRunners: Record<WharfSubAreaId, () => BenStepResult> = {
    fishing: runFishingStep,
    cricketBoss: runCricketBossStep,
    cricketHunt: runCricketHuntStep,
    entertainment: runEntertainmentStep,
  };
  const continuousSubs = new Set<WharfSubAreaId>(['fishing', 'cricketHunt']);

  const activeOrder: WharfSubAreaId[] =
    Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0
      ? cfg.benSubOrder
      : ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'];

  let deferred: (() => BenStepResult) | null = null;
  let exhaustedResult: BenStepResult | null = null;
  for (const subId of activeOrder) {
    if (cfg.benSubEnabled?.[subId] === false) continue;
    if (deferred && continuousSubs.has(subId)) continue;
    const runner = subAreaRunners[subId];
    if (!runner) continue;
    const result = runner();
    if (result.acted) return result;
    if (result.deferred) {
      deferred = result.deferred;
    } else if (result.exhausted && !exhaustedResult) {
      exhaustedResult = result;
    }
  }

  // Close panel if open (once hold duration expires, unless actively spinning lantern wheel)
  const lanternActive =
    bu.panel === 'lantern' &&
    cfg.benAutoLantern !== false &&
    ((wallet.tickets || 0) > 0 || Boolean(cfg.benBuyLanternTicket && (bn.wheel?.bought || 0) < 5 && shells >= 600));
  if (bu.panel && !lanternActive && (!cfg.showFullActions || Date.now() >= keepBenPanelUntil)) {
    buStore.setState({ panel: null });
  }

  if (deferred) {
    const result = deferred();
    if (result.acted || result.allowCast) return result;
  }
  if (exhaustedResult) return exhaustedResult;

  return { acted: false, allowCast: false };
}
