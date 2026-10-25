import { stores, getActiveScene, sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, WharfSubAreaId } from '../../../shared/types/config';
import { CricketItem, SoiNpc } from '../../../shared/types/game-store';

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
  { id: 'cuBin', name: 'Cu Bin', reward: 15 },
  { id: 'utMap', name: 'Út Mập', reward: 30 },
  { id: 'anhLuc', name: 'Anh Lực xe ôm', reward: 60 },
  { id: 'bacChin', name: 'Bác Chín thợ rèn', reward: 110 },
  { id: 'ongSau', name: 'Ông Sáu chủ sới', reward: 220 },
];

let keepBenPanelUntil = 0;
let keepBenPanelMsg = '';

export function execBenStep(cfg: AppConfig): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } {
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
  const tryRecoverStamina = (): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } | null => {
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
  const runFishingStep = (): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } => {
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

    // 3. Buy Bait when out of bait
    if (bait <= 0) {
      if (cfg.benAutoBuyBait !== false) {
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

        if (buyBaitChoice !== 'xinMoi' && shells >= (baitPrices[buyBaitChoice] || 15) && canAct('ben_bait', 3000)) {
          const baitLabel = BEN_BAIT_NAMES[buyBaitChoice] || buyBaitChoice;
          return walkAndRun(
            { x: 53, y: 11 },
            () => {
              sendBenWs({ t: 'buy', item: buyBaitChoice });
            },
            `Mua ${baitLabel} tại Sạp Chú Đực (-${baitPrices[buyBaitChoice]}🐚)`,
            'ben_bait',
            { panel: 'bait' },
            1500
          );
        }
      }

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
        reason: '🪱 Bến Đò: Đã hết mồi & vỏ sò -> Chuyển khu vực tiếp theo!',
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

    // 5. Walk to fishing spot
    if (cfg.benAutoSpot !== false) {
      const spotChoice = cfg.benSpot || 'bank';
      const spotTargets: Record<string, { x: number; y: number; kind: string; label: string }> = {
        dock: { x: 31, y: 4, kind: 'dock', label: 'Cầu tre' },
        bamboo: { x: 7, y: 6, kind: 'dock', label: 'Cầu tre' },
        bank: { x: 24, y: 10, kind: 'bank', label: 'Bờ sông' },
      };
      const target = spotTargets[spotChoice] || spotTargets.bank;

      if (!bu.spot || (bu.spot !== target.kind && (spotChoice as string) !== 'any')) {
        if (benScene && typeof benScene.goFarmer === 'function') {
          benScene.goFarmer({ x: target.x, y: target.y });
          return { acted: true, msg: `🚶 Đang đi ra ${target.label} câu cá...` };
        }
      }
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 2: CRICKET ARENA & BOSS FIGHT (Sới dế Ông Sáu & Đặt cửa)
  // ---------------------------------------------------------------------------
  const runCricketBossStep = (): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } => {
    // A. In-bout Feelers Tickle (Active in any bout)
    for (const bout of Object.values(bn.bouts || {})) {
      if (!bout.end && bout.id) {
        if (cfg.benAutoTickle && canAct('ben_cricket_tickle', 1200)) {
          sendBenWs({ t: 'tickle', id: bout.id });
          markActed('ben_cricket_tickle');
          return { acted: true, msg: '🌾 Khều râu dế lấy đà tấn công!' };
        }
      }
    }

    // B. Arena Betting (Tự động đặt cược nếu bật)
    if (cfg.benAutoBet) {
      for (const bout of Object.values(bn.bouts || {})) {
        if (!bout.end && bout.id && bout.betUntil && bout.betUntil > Date.now()) {
          const betsToday = bn.soi?.bets || 0;
          if (betsToday < 20 && canAct(`ben_bet_${bout.id}`, 8000)) {
            const redSum = (bout.red?.stats?.power || 0) + (bout.red?.stats?.tough || 0) + (bout.red?.stats?.nerve || 0);
            const blueSum = (bout.blue?.stats?.power || 0) + (bout.blue?.stats?.tough || 0) + (bout.blue?.stats?.nerve || 0);
            const side: 'red' | 'blue' = blueSum > redSum ? 'blue' : 'red';
            const sideLabel = side === 'red' ? (bout.red?.name || 'Đỏ') : (bout.blue?.name || 'Xanh');
            const betAmount = Math.min(shells, Math.max(10, Number(cfg.benBetAmount) || 50));
            if (shells >= betAmount) {
              sendBenWs({ t: 'bet', id: bout.id, side, shells: betAmount });
              markActed(`ben_bet_${bout.id}`);
              return { acted: true, msg: `🎲 Sới Dế: Đặt ${betAmount}🐚 vào cửa ${sideLabel} (${betsToday + 1}/20 lượt cược)` };
            }
          }
        }
      }
    }

    // C. Daily Boss Challenge Ladder (Cu Bin -> Ông Sáu)
    if (cfg.benAutoBossBout !== false) {
      const box = bn.crickets?.box || bn.soi?.box || [];
      if (box.length === 0) {
        // Tube is empty -> Cannot fight boss
        return { acted: false };
      }

      // Check if Sới info is known
      const npcs = bn.soi?.npcs;
      if (!npcs || npcs.length === 0) {
        if (canAct('ben_soi_open', 3500)) {
          return walkAndRun(
            { x: 4, y: 29 },
            () => {
              sendBenWs({ t: 'soi' });
            },
            '🦗 Ghé Sới Dế Ông Sáu kiểm tra danh sách Boss...',
            'ben_soi_open',
            { panel: 'soi' },
            1600
          );
        }
        return { acted: false };
      }

      // Find next available boss in ladder that hasn't been beaten/paid today
      const nextBoss = BOSS_LADDER.find((b) => {
        const npcState = npcs.find((n: SoiNpc) => n.id === b.id);
        return npcState?.open && !npcState?.paidToday;
      });

      if (!nextBoss) {
        // All unlocked bosses paid today -> Finished boss ladder for today!
        return { acted: false };
      }

      // Find best available cricket not resting
      const now = Date.now();
      const readyCrickets = box.filter((c: CricketItem) => !c.restUntil || c.restUntil <= now);
      if (readyCrickets.length === 0) {
        // Crickets are resting
        return { acted: false };
      }

      // Pick cricket with highest total stats
      readyCrickets.sort((a, b) => {
        const sumA = (a.stats?.power || 0) + (a.stats?.tough || 0) + (a.stats?.nerve || 0);
        const sumB = (b.stats?.power || 0) + (b.stats?.tough || 0) + (b.stats?.nerve || 0);
        return sumB - sumA;
      });
      const bestCricket = readyCrickets[0];
      const cName = CRICKET_SPECIES_NAMES[bestCricket.species] || 'Dế';
      const cTotal = (bestCricket.stats?.power || 0) + (bestCricket.stats?.tough || 0) + (bestCricket.stats?.nerve || 0);

      if (canAct('ben_boss_bout', 4000)) {
        return walkAndRun(
          { x: 4, y: 29 },
          () => {
            sendBenWs({ t: 'bout', npc: nextBoss.id, cricket: bestCricket.id });
          },
          `🥊 Thách đấu ${nextBoss.name} tại Sới Dế (+${nextBoss.reward}🐚) với ${cName} (Tổng: ${cTotal})`,
          'ben_boss_bout',
          { panel: 'bout' },
          2000
        );
      }
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 3: CRICKET HUNT & TUBE CARE (Bắt dế đêm & Nuôi dế ống tre)
  // ---------------------------------------------------------------------------
  const runCricketHuntStep = (): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } => {
    if (cfg.benAutoCricketHunt === false) {
      return { acted: false };
    }

    // 1. Time Check: Night hours (18:00 to 05:00)
    const minutes = m.minutes || 0;
    const gameHour = Math.floor((minutes % 1440) / 60);
    const isNight = gameHour >= 18 || gameHour < 5;
    const isRareHour = gameHour >= 23 || gameHour < 4;

    if (!isNight) {
      return { acted: false };
    }
    if (cfg.benHuntRareOnly && !isRareHour) {
      return { acted: false };
    }

    // 2. Stamina Check: Hunt requires 3 stamina
    if (stamina < 3) {
      const stamRes = tryRecoverStamina();
      if (stamRes) return stamRes;
      return {
        acted: false,
        exhausted: true,
        reason: '😮‍💨 Bến Đò: Hết Sức rọi đèn bắt dế đêm -> Chuyển khu vực tiếp theo!',
      };
    }

    const box = bn.crickets?.box || [];

    // 3. Bamboo Tube Management: Box capacity = 6
    if (box.length >= 6 && cfg.benAutoReleaseLowCricket !== false && canAct('ben_cricket_release', 3000)) {
      // Find lowest rarity or lowest stats cricket to release
      const rankOrder: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5 };
      const sorted = [...box].sort((a, b) => {
        const rarA = rankOrder[CRICKET_SPECIES_RARITY[a.species] || 'common'] || 1;
        const rarB = rankOrder[CRICKET_SPECIES_RARITY[b.species] || 'common'] || 1;
        if (rarA !== rarB) return rarA - rarB;
        const sumA = (a.stats?.power || 0) + (a.stats?.tough || 0) + (a.stats?.nerve || 0);
        const sumB = (b.stats?.power || 0) + (b.stats?.tough || 0) + (b.stats?.nerve || 0);
        return sumA - sumB;
      });

      const lowest = sorted[0];
      const lowestRarity = CRICKET_SPECIES_RARITY[lowest.species] || 'common';
      if (lowestRarity === 'common' || lowestRarity === 'uncommon') {
        const refund = CRICKET_RARITY_REFUND[lowestRarity] || 5;
        const cName = CRICKET_SPECIES_NAMES[lowest.species] || 'Dế';
        markActed('ben_cricket_release');
        sendBenWs({ t: 'release', id: lowest.id });
        return {
          acted: true,
          msg: `🎋 Ống tre đầy (6/6) -> Đã thả ${cName} về đồng (+${refund} vỏ sò 🐚)`,
        };
      }
    }

    // 4. Feed Best Cricket if enabled
    if (cfg.benAutoFeedCricket && box.length > 0 && canAct('ben_cricket_feed', 3000)) {
      // Find highest rarity/potential cricket
      const sortedBest = [...box].sort((a, b) => {
        const sumA = (a.caps?.power || 0) + (a.caps?.tough || 0) + (a.caps?.nerve || 0);
        const sumB = (b.caps?.power || 0) + (b.caps?.tough || 0) + (b.caps?.nerve || 0);
        return sumB - sumA;
      });
      const targetCricket = sortedBest[0];
      const prefFoodStat = cfg.benPreferCricketFood || 'balanced';

      let foodItem: { id: string; name: string; price: number } | null = null;
      if (prefFoodStat === 'tough' && targetCricket.stats.tough < targetCricket.caps.tough && shells >= 25) {
        foodItem = { id: 'laNon', name: '🌿 Lá non', price: 25 };
      } else if (prefFoodStat === 'power' && targetCricket.stats.power < targetCricket.caps.power && shells >= 40) {
        foodItem = { id: 'trungKien', name: '🥚 Trứng kiến', price: 40 };
      } else if (prefFoodStat === 'nerve' && targetCricket.stats.nerve < targetCricket.caps.nerve && shells >= 30) {
        foodItem = { id: 'otHiem', name: '🌶️ Ớt hiểm', price: 30 };
      } else if (prefFoodStat === 'balanced') {
        // Pick stat farthest from its cap
        const diffTough = targetCricket.caps.tough - targetCricket.stats.tough;
        const diffPower = targetCricket.caps.power - targetCricket.stats.power;
        const diffNerve = targetCricket.caps.nerve - targetCricket.stats.nerve;

        if (diffTough >= diffPower && diffTough >= diffNerve && diffTough > 0 && shells >= 25) {
          foodItem = { id: 'laNon', name: '🌿 Lá non', price: 25 };
        } else if (diffPower >= diffTough && diffPower >= diffNerve && diffPower > 0 && shells >= 40) {
          foodItem = { id: 'trungKien', name: '🥚 Trứng kiến', price: 40 };
        } else if (diffNerve > 0 && shells >= 30) {
          foodItem = { id: 'otHiem', name: '🌶️ Ớt hiểm', price: 30 };
        }
      }

      if (foodItem) {
        markActed('ben_cricket_feed');
        sendBenWs({ t: 'feed', id: targetCricket.id, food: foodItem.id });
        const cName = CRICKET_SPECIES_NAMES[targetCricket.species] || 'Dế';
        return {
          acted: true,
          msg: `🌿 Cho ${cName} ăn ${foodItem.name} (-${foodItem.price}🐚, +5 chỉ số)`,
        };
      }
    }

    // 5. Walk to Hunting Field (Vh = { x: 64, y: 11 })
    const huntTarget = { x: 64, y: 11 };
    if (!bu.field) {
      return walkAndRun(
        huntTarget,
        () => {
          sendBenWs({ t: 'light' });
        },
        '🚶 Ra đồng cỏ phía đông săn dế đêm...',
        'ben_hunt_walk'
      );
    }

    // 6. Minigame: Hopping Tuft
    if (bn.hunt?.phase === 'hop' && bn.hunt.hop) {
      const spot = bn.hunt.hop.spot;
      sendBenWs({ t: 'trap', n: bn.hunt.hop.n, spot });
      return {
        acted: true,
        msg: `🦗 Canh dế đáp xuống bụi cỏ ${spot + 1} -> ÚP BẮT!`,
      };
    }

    // 7. Shine Light
    if (!bn.hunt && canAct('ben_hunt_light', 2200)) {
      markActed('ben_hunt_light');
      sendBenWs({ t: 'light' });
      return {
        acted: true,
        msg: '🔦 Rọi đèn pin nghe ngóng tiếng dế gáy đêm... (⚡3 Sức)',
      };
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 4: ENTERTAINMENT & UTILITIES (Lồng đèn, Vé số, ATM)
  // ---------------------------------------------------------------------------
  const runEntertainmentStep = (): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } => {
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
    const atmMin = Number(cfg.benAtmThreshold) || 500;
    if (cfg.benAutoAtm && shells >= atmMin + 100 && canAct('ben_atm', 4000)) {
      const cashShells = Math.floor((shells - 100) / 50) * 50;
      if (cashShells >= 100) {
        return walkAndRun(
          { x: 34, y: 35 },
          () => {
            sendBenWs({ t: 'atmCash', shells: cashShells });
          },
          `🏧 Đổi ${cashShells.toLocaleString('vi-VN')} vỏ sò ra tiền mặt tại Cây ATM`,
          'ben_atm',
          { panel: 'atm' },
          1500
        );
      }
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // DISPATCHER: EXECUTE SUB-AREAS IN ORDER DEFINED BY benSubOrder
  // ---------------------------------------------------------------------------
  const subAreaRunners: Record<WharfSubAreaId, () => { acted: boolean; msg?: string; exhausted?: boolean; reason?: string }> = {
    fishing: runFishingStep,
    cricketBoss: runCricketBossStep,
    cricketHunt: runCricketHuntStep,
    entertainment: runEntertainmentStep,
  };

  const activeOrder: WharfSubAreaId[] =
    Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0
      ? cfg.benSubOrder
      : ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'];

  for (const subId of activeOrder) {
    if (cfg.benSubEnabled?.[subId] !== false) {
      const runner = subAreaRunners[subId];
      if (runner) {
        const result = runner();
        if (result.acted || result.exhausted) {
          return result;
        }
      }
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

  return { acted: false };
}
