import { stores, getActiveScene, sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { AppConfig } from '../../../shared/types/config';

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
  const nonKeptCount = Array.isArray(bn.basket) ? bn.basket.filter((x: { kept?: boolean }) => !x.kept).length : 0;
  const pack = bn.pack || {};
  const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);
  const stamMin = Number(cfg.benStaminaThreshold) || 20;

  const walkAndRun = (tile: { x: number; y: number }, actionFn: () => void, label: string, actionKey: string | null = null) => {
    if (actionKey && !canAct(actionKey)) {
      return { acted: false };
    }
    if (benScene && typeof benScene.goFarmer === 'function') {
      const cur = benScene.farmer?.tile;
      if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
        if (actionKey) markActed(actionKey);
        actionFn();
        return { acted: true, msg: label };
      }
      if (benScene.farmer?.running) {
        return { acted: true, msg: `🚶 Đang di chuyển...` };
      }
      benScene.goFarmer(tile, () => {
        setTimeout(() => {
          if (!actionKey || canAct(actionKey)) {
            if (actionKey) markActed(actionKey);
            actionFn();
          }
        }, 250);
      });
      return { acted: true, msg: `🚶 ${label}` };
    }
    if (actionKey) markActed(actionKey);
    actionFn();
    return { acted: true, msg: label };
  };

  const needShellsForBait = bait <= 0 && shells < 15;
  const needShellsForFood =
    (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) &&
    packItems.length === 0 &&
    shells < 10;

  // 1. Sell basket at Vựa cá Anh Tư
  const sellThreshold = Number(cfg.benSellThreshold) || 20;
  if (
    cfg.benAutoSell !== false &&
    nonKeptCount > 0 &&
    (nonKeptCount >= sellThreshold || nonKeptCount >= 55 || needShellsForBait || needShellsForFood)
  ) {
    return walkAndRun(
      { x: 40, y: 10 },
      () => {
        sendBenWs({ t: 'sell' });
        buStore.setState({ panel: null });
      },
      `Đi bán ${nonKeptCount} con cá tại Vựa Anh Tư`,
      'ben_sell'
    );
  }

  // 2. Recover Stamina when low
  if (stamina < 4 || (cfg.benAutoRecoverStamina !== false && stamina <= stamMin)) {
    if (cfg.benAutoRecoverStamina !== false) {
      // Eat from pack
      if (packItems.length > 0 && canAct('ben_eat_pack', 3000)) {
        markActed('ben_eat_pack');
        sendBenWs({ t: 'eat', item: packItems[0] });
        return { acted: true, msg: `🍙 Đã ăn ${packItems[0]} trong balo hồi Sức câu` };
      }

      // Út Mười shampoo
      if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct('ben_goi_dau', 4000)) {
        return walkAndRun(
          { x: 16, y: 24 },
          () => {
            sendBenWs({ t: 'buy', item: 'goiDau' });
            buStore.setState({ panel: null });
          },
          `Gội đầu massage Út Mười (+50 Sức câu, -25🐚)`,
          'ben_goi_dau'
        );
      }

      // Buy food from Dì Tám
      const foodPrices: Record<string, number> = {
        banhMi: 10,
        chaoCa: 15,
        huTieu: 25,
        comTam: 40,
        lauMam: 120,
      };
      const prefFood = cfg.benPreferFood || 'comTam';
      const buyItem = shells >= (foodPrices[prefFood] || 40) ? prefFood : 'banhMi';
      if (shells >= (foodPrices[buyItem] || 10) && canAct('ben_buy_food', 4000)) {
        return walkAndRun(
          { x: 19, y: 9 },
          () => {
            sendBenWs({ t: 'buy', item: buyItem });
            buStore.setState({ panel: null });
          },
          `Mua ${buyItem} tại Quán ăn Dì Tám hồi Sức câu`,
          'ben_buy_food'
        );
      }
    }

    if (stamina < 4) {
      // ATM withdrawal
      if (cfg.benAutoAtm && shells < (Number(cfg.benAtmThreshold) || 500) && canAct('ben_atm', 6000)) {
        return walkAndRun(
          { x: 30, y: 31 },
          () => {
            sendBenWs({ t: 'atm' });
            buStore.setState({ panel: null });
          },
          'Đến cây ATM Bến Đò đổi tiền mặt lấy Vỏ sò',
          'ben_atm'
        );
      }

      return {
        acted: false,
        exhausted: true,
        reason: '😮‍💨 Bến Đò: Hết Sức câu và không đủ vỏ sò để ăn/gội đầu -> Chuyển khu vực tiếp theo!',
      };
    }
  }

  // 3. Buy Bait when out of bait
  if (bait <= 0) {
    if (cfg.benAutoBuyBait !== false) {
      const baitPrices: Record<string, number> = {
        moi20: 15,
        moi60: 40,
        moi150: 95,
      };
      const prefBait = cfg.benPreferBait || 'moi60';
      const buyBaitChoice =
        shells >= (baitPrices[prefBait] || 40)
          ? prefBait
          : shells >= 15
            ? 'moi20'
            : 'xinMoi';

      if (buyBaitChoice !== 'xinMoi' && shells >= (baitPrices[buyBaitChoice] || 15) && canAct('ben_bait', 3000)) {
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: 'buy', item: buyBaitChoice });
            buStore.setState({ panel: null });
          },
          `Mua ${buyBaitChoice} tại Sạp Chú Đực (-${baitPrices[buyBaitChoice]}🐚)`,
          'ben_bait'
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
          buStore.setState({ panel: null });
        },
        `Đi xin 10 mồi miễn phí tại Chú Đực`,
        'ben_bait'
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
    if (shells >= (drinkPrices[drinkId] || 15)) {
      return walkAndRun(
        { x: 26, y: 12 },
        () => {
          sendBenWs({ t: 'buy', item: drinkId });
          buStore.setState({ panel: null });
        },
        `Đi uống nước tăng May mắn (${drinkId}) tại Chị Thơm`,
        'ben_luck_drink'
      );
    }
  }

  // 5. Sạp lồng đèn Cô Bảy
  if (cfg.benAutoLantern !== false) {
    const tickets = wallet.tickets || 0;
    if (tickets > 0 && canAct('ben_lantern_spin', 4000)) {
      return walkAndRun(
        { x: 37, y: 28 },
        () => {
          sendBenWs({ t: 'spin', n: 1 });
          buStore.setState({ panel: null });
        },
        `Quay Vòng quay may mắn Sạp lồng đèn Cô Bảy (còn ${tickets} vé 🎟️)`,
        'ben_lantern_spin'
      );
    }

    const boughtToday = bn.wheel?.bought || 0;
    if (cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600 && canAct('ben_lantern_buy', 4000)) {
      return walkAndRun(
        { x: 37, y: 28 },
        () => {
          sendBenWs({ t: 'ticket' });
          buStore.setState({ panel: null });
        },
        `Mua vé Vòng quay lồng đèn Cô Bảy (${boughtToday + 1}/5, -600🐚)`,
        'ben_lantern_buy'
      );
    }
  }

  // 6. Đại lý vé số Bến Đò
  if (cfg.benAutoLotto !== false) {
    const lottoState = bn.lotto;
    const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
    if (hasWins && canAct('ben_lotto_claim', 4000)) {
      return walkAndRun(
        { x: 36, y: 31 },
        () => {
          sendBenWs({ t: 'lottoClaim' });
          buStore.setState({ panel: null });
        },
        `Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
        'ben_lotto_claim'
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
            buStore.setState({ panel: null });
          },
          `Mua 1 vé số Bến Đò (${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
          'ben_lotto_buy'
        );
      }
    }
  }

  // 7. ATM
  if (cfg.benAutoAtm && shells < (Number(cfg.benAtmThreshold) || 500) && canAct('ben_atm', 6000)) {
    return walkAndRun(
      { x: 30, y: 31 },
      () => {
        sendBenWs({ t: 'atm' });
        buStore.setState({ panel: null });
      },
      'Đến cây ATM Bến Đò đổi tiền mặt lấy Vỏ sò',
      'ben_atm'
    );
  }

  // 8. Close panel if open
  if (bu.panel) {
    buStore.setState({ panel: null });
  }

  // 9. Walk to fishing spot
  if (cfg.benAutoSpot !== false) {
    const spotChoice = cfg.benSpot || 'dock';
    const spotTargets: Record<string, { x: number; y: number; kind: string; label: string }> = {
      dock: { x: 31, y: 4, kind: 'dock', label: 'Cầu tàu chính' },
      bamboo: { x: 7, y: 6, kind: 'dock', label: 'Cầu tre' },
      bank: { x: 24, y: 10, kind: 'bank', label: 'Bờ sông' },
    };
    const target = spotTargets[spotChoice] || spotTargets.dock;

    if (!bu.spot || (bu.spot !== target.kind && (spotChoice as string) !== 'any')) {
      if (benScene && typeof benScene.goFarmer === 'function') {
        benScene.goFarmer({ x: target.x, y: target.y });
        return { acted: true, msg: `🚶 Đang đi ra ${target.label} câu cá...` };
      }
    }
  }

  return { acted: false };
}
