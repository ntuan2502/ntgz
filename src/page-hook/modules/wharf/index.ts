import { stores, getActiveScene, sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';

export function execBenStep(cfg: any): { acted: boolean; msg?: string; exhausted?: boolean; reason?: string } {
  const m = stores.main?.getState();
  const bu = stores.benUI?.getState();
  const bn = stores.benNet?.getState();
  if (!m || !bu || !bn || m.screen !== 'benDo' || bn.status !== 'in') {
    return { acted: false };
  }
  if (bu.walking || bn.fishing !== 'idle') {
    return { acted: false };
  }

  const benScene = getActiveScene('BenDoScene');
  const wallet = bn.wallet;
  if (!wallet) return { acted: false };

  const stamina = computeBenStamina(wallet);
  const shells = wallet.shells || 0;
  const bait = wallet.bait || 0;
  const nonKeptCount = Array.isArray(bn.basket) ? bn.basket.filter((x: any) => !x.kept).length : 0;
  const pack = bn.pack || {};
  const packItems = Object.keys(pack).filter((k) => pack[k] > 0);
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
        stores.benUI.setState({ panel: null });
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
            stores.benUI.setState({ panel: null });
          },
          `Gội đầu massage Út Mười (+50 Sức câu, -25🐚)`,
          'ben_goi_dau'
        );
      }

      // Quán cơm Dì Tám
      if (shells >= 10 && canAct('ben_food', 4000)) {
        const foodId = cfg.benPreferFood || 'comTam';
        const foodPrices: Record<string, number> = { banhMi: 10, chaoCa: 14, huTieu: 20, comTam: 28, lauMam: 45 };
        let chosenFood = foodId;
        if (shells < (foodPrices[chosenFood] || 10)) {
          if (shells >= 28) chosenFood = 'comTam';
          else if (shells >= 20) chosenFood = 'huTieu';
          else if (shells >= 14) chosenFood = 'chaoCa';
          else chosenFood = 'banhMi';
        }
        return walkAndRun(
          { x: 39, y: 23 },
          () => {
            sendBenWs({ t: 'buy', item: chosenFood });
            stores.benUI.setState({ panel: null });
          },
          `Đi ăn (${chosenFood}) tại Quán Dì Tám hồi Sức câu`,
          'ben_food'
        );
      }

      // Xe trà đá Chị Thơm
      if (shells >= 3 && canAct('ben_drink', 4000)) {
        return walkAndRun(
          { x: 26, y: 12 },
          () => {
            sendBenWs({ t: 'buy', item: 'traDa' });
            stores.benUI.setState({ panel: null });
          },
          `Đi uống Trà đá Chị Thơm hồi Sức câu`,
          'ben_drink'
        );
      }
    }

    // Out of stamina and cannot recover
    if (stamina < 4) {
      if (cfg.benAutoSell !== false && nonKeptCount > 0) {
        return walkAndRun(
          { x: 40, y: 10 },
          () => {
            sendBenWs({ t: 'sell' });
            stores.benUI.setState({ panel: null });
          },
          `Bán hết ${nonKeptCount} cá trong giỏ trước khi rời Bến Đò`,
          'ben_sell'
        );
      }
      return {
        acted: false,
        exhausted: true,
        reason: '😮‍💨 Bến Đò: Đã hết Sức câu (không thể hồi thêm) -> Chuyển khu vực tiếp theo!',
      };
    }
  }

  // 3. Buy bait at Tiệm mồi Chú Đực
  if (bait <= 0) {
    if (cfg.benAutoBuyBait === false) {
      return {
        acted: false,
        exhausted: true,
        reason: '🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!',
      };
    }

    const prefBait = cfg.benPreferBait || 'moi60';
    const prices: Record<string, number> = { xinMoi: 0, moi20: 15, moi60: 40, moi150: 90 };

    if (shells >= 15 && canAct('ben_bait', 3000)) {
      let pick = prefBait === 'xinMoi' ? 'moi20' : prefBait;
      if (shells < (prices[pick] || 15)) {
        if (shells >= 40) pick = 'moi60';
        else pick = 'moi20';
      }
      return walkAndRun(
        { x: 53, y: 11 },
        () => {
          sendBenWs({ t: 'buy', item: pick });
          stores.benUI.setState({ panel: null });
        },
        `Đi mua mồi câu (${pick}) tại Chú Đực`,
        'ben_bait'
      );
    }

    const xinMoiBlocked =
      shells > 0 ||
      (lastXinMoiDay === m.day && Date.now() - lastXinMoiAt < 600000) ||
      bn.notice?.error === 'used' ||
      bn.notice?.error === 'noFree';

    if (!xinMoiBlocked && canAct('ben_bait', 3000)) {
      setLastXinMoi(Date.now(), m.day);
      return walkAndRun(
        { x: 53, y: 11 },
        () => {
          sendBenWs({ t: 'buy', item: 'xinMoi' });
          stores.benUI.setState({ panel: null });
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
          stores.benUI.setState({ panel: null });
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
          stores.benUI.setState({ panel: null });
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
          stores.benUI.setState({ panel: null });
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
          stores.benUI.setState({ panel: null });
        },
        `Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
        'ben_lotto_claim'
      );
    }

    if (cfg.benAutoBuyLotto && shells >= 10 && canAct('ben_lotto_buy', 60000)) {
      const sellingDay = lottoState?.selling;
      const alreadyBought = (lottoState?.mine || []).some((t: any) => t.day === sellingDay);
      if (!alreadyBought) {
        const randNum = Math.floor(Math.random() * 100);
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
            stores.benUI.setState({ panel: null });
          },
          `Mua 1 vé số Bến Đò (${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
          'ben_lotto_buy'
        );
      }
    }
  }

  // 7. Exchange shells at ATM
  const atmMin = Number(cfg.benAtmThreshold) || 500;
  if (cfg.benAutoAtm && shells >= atmMin + 100 && canAct('ben_atm', 4000)) {
    const cashShells = Math.floor((shells - 100) / 50) * 50;
    if (cashShells >= 100) {
      return walkAndRun(
        { x: 34, y: 35 },
        () => {
          sendBenWs({ t: 'atmCash', shells: cashShells });
          stores.benUI.setState({ panel: null });
        },
        `Đi đổi ${cashShells} vỏ sò ra tiền mặt tại ATM`,
        'ben_atm'
      );
    }
  }

  // 8. Close open panel
  if (bu.panel) {
    stores.benUI.setState({ panel: null });
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

    if (!bu.spot || (bu.spot !== target.kind && spotChoice !== 'any')) {
      if (benScene && typeof benScene.goFarmer === 'function') {
        benScene.goFarmer({ x: target.x, y: target.y });
        return { acted: true, msg: `🚶 Đang đi ra ${target.label} câu cá...` };
      }
    }
  }

  return { acted: false };
}
