import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { BenExecutionContext, BenStepResult } from './types';
import { atmRuntime, setNextAtmTime } from './ws-watchers';

/**
 * SUB-AREA RUNNER 4: ENTERTAINMENT & UTILITIES (Lồng đèn, Vé số, ATM, Bà Tư Bí)
 * Toàn bộ thao tác đều đi bộ tới đúng vị trí NPC/máy và mở bảng UI giả lập thao tác người dùng.
 */
export function runEntertainmentStep(ctx: BenExecutionContext): BenStepResult {
  const { cfg, bu, bn, bnStore, benScene, wallet, shells, walkAndRun } = ctx;

  // 0. Điểm danh hàng ngày ở Bến Đò
  if (cfg.benAutoCheckin !== false) {
    const checkin = bn.checkin as { today?: number; claimed?: number[] } | undefined;
    if (!checkin && canAct('ben_checkin_query', 60000)) {
      markActed('ben_checkin_query');
      sendBenWs({ t: 'checkin' });
    } else if (
      checkin &&
      Array.isArray(checkin.claimed) &&
      typeof checkin.today === 'number'
    ) {
      const alreadyClaimed = checkin.claimed.includes(checkin.today);
      if (!alreadyClaimed && canAct('ben_checkin_claim', 10000)) {
        markActed('ben_checkin_claim');
        sendBenWs({ t: 'checkinClaim' });
        checkin.claimed.push(checkin.today);
        return {
          acted: true,
          msg: `📅 Điểm Danh Bến Đò: Đã nhận quà điểm danh Ngày ${checkin.today} (+vỏ sò/ngọc trai)!`,
        };
      }
    }
  }

  // A. Sạp lồng đèn Cô Bảy ({ x: 37, y: 28 })
  if (cfg.benAutoLantern !== false) {
    const tickets = wallet.tickets || 0;
    const boughtToday = bn.wheel?.bought ?? 0;
    const needBuyTicket =
      Boolean(cfg.benBuyLanternTicket) && (!bn.wheel || boughtToday < 5) && shells >= 600;
    const shouldSpin = cfg.benLanternSpinMode === 'x1' ? tickets > 0 : tickets >= 10;

    if (needBuyTicket || shouldSpin) {
      if (bu.panel === 'lantern') {
        return {
          acted: true,
          msg: '🏮 Vòng quay Cô Bảy: Đang thao tác trực tiếp trên bảng Vòng quay...',
        };
      }

      return walkAndRun(
        { x: 37, y: 28 },
        () => {
          if (benScene?.farmer?.lookAt) {
            benScene.farmer.lookAt(39 * 16, 28 * 16);
          }
          sendBenWs({ t: 'wheel' });
        },
        `Đi lại Sạp Lồng Đèn Cô Bảy để ${shouldSpin ? `quay ${tickets} vé 🎟️` : 'mua vé quay'}...`,
        'ben_lantern_walk',
        { panel: 'lantern' },
        500,
        400,
        { leaveOpen: true }
      );
    } else if (
      tickets > 0 &&
      cfg.benLanternSpinMode === 'x10' &&
      canAct('ben_lantern_wait_x10', 120000)
    ) {
      markActed('ben_lantern_wait_x10');
      return {
        acted: true,
        msg: `🏮 Vòng quay Cô Bảy: Có ${tickets}/10 vé (chờ đủ 10 vé mới quay x10) · Tiếp tục các việc khác`,
      };
    }
  }

  // B. Đại lý vé số Bến Đò ({ x: 36, y: 31 })
  if (cfg.benAutoLotto !== false) {
    const lottoState = bn.lotto;
    if ((!lottoState || canAct('ben_lotto_sync', 300000)) && canAct('ben_lotto_query', 60000)) {
      markActed('ben_lotto_query');
      markActed('ben_lotto_sync');
      sendBenWs({ t: 'lotto' });
    }
    const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
    if (hasWins && canAct('ben_lotto_claim', 4000)) {
      let chainedBuy = false;
      return walkAndRun(
        { x: 36, y: 31 },
        () => {
          sendBenWs({ t: 'lottoClaim' });
          if (lottoState) {
            lottoState.wins = [];
            lottoState.pending = 0;
          }
        },
        `🎟️ Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
        'ben_lotto_claim',
        { panel: 'agent' },
        350,
        400,
        {
          shouldContinue: () => {
            if (chainedBuy || !cfg.benAutoBuyLotto) {
              return { keepGoing: false };
            }
            const latestBn = bnStore.getState();
            const curLotto = latestBn?.lotto || lottoState;
            const curShells = latestBn?.wallet?.shells ?? shells;
            if (!curLotto || typeof curLotto.selling !== 'number' || curShells < 10) {
              return { keepGoing: false };
            }
            const sellingDay = curLotto.selling;
            const alreadyBought = (curLotto.mine || []).some(
              (t: { day?: number }) => t.day === sellingDay
            );
            if (alreadyBought) {
              return { keepGoing: false };
            }
            chainedBuy = true;
            const randNum = Math.floor(Math.random() * 100);
            return {
              keepGoing: true,
              label: `🍀 Mua 1 vé số Bến Đò (số ${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
              actionFn: () => {
                markActed('ben_lotto_buy');
                sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
                curLotto.mine = [...(curLotto.mine || []), { day: sellingDay, num: randNum, qty: 1 }];
              },
            };
          },
        }
      );
    }

    if (
      cfg.benAutoBuyLotto &&
      lottoState &&
      typeof lottoState.selling === 'number' &&
      shells >= 10 &&
      canAct('ben_lotto_buy', 60000)
    ) {
      const sellingDay = lottoState.selling;
      const alreadyBought = (lottoState.mine || []).some(
        (t: { day?: number }) => t.day === sellingDay
      );
      if (!alreadyBought) {
        const randNum = Math.floor(Math.random() * 100);
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
            lottoState.mine = [...(lottoState.mine || []), { day: sellingDay, num: randNum, qty: 1 }];
          },
          `🍀 Mua 1 vé số Bến Đò (số ${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
          'ben_lotto_buy',
          { panel: 'agent' },
          350
        );
      }
    }
  }

  // C. Exchange shells at ATM ({ x: 34, y: 35 }) - Mở bảng ATM và để wharf-modals.ts bấm nút trực tiếp
  if (cfg.benAutoAtm) {
    const now = Date.now();
    const atmMin = typeof cfg.benAtmThreshold === 'number' ? cfg.benAtmThreshold : 10000;

    if (shells >= atmMin) {
      let reopenAt = 0;
      if (typeof bn.atm?.reopen === 'number' && bn.atm.reopen > now) {
        reopenAt = bn.atm.reopen;
      } else if (atmRuntime.nextAtmTime > now) {
        reopenAt = atmRuntime.nextAtmTime;
      }

      if (reopenAt > now) {
        if (atmRuntime.nextAtmTime !== reopenAt) {
          setNextAtmTime(reopenAt);
        }

        const diffMs = reopenAt - now;
        const diffMin = Math.floor(diffMs / 60000);
        const diffSec = Math.floor((diffMs % 60000) / 1000);
        const waitStr = diffMin > 0 ? `${diffMin} phút ${diffSec} giây` : `${diffSec} giây`;
        const timeStr = new Date(reopenAt).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        if (
          now - atmRuntime.lastAtmExchangeAt > 60000 &&
          now - atmRuntime.lastAtmLogAt > 300000 &&
          canAct('ben_atm_wait_log', 300000)
        ) {
          atmRuntime.lastAtmLogAt = now;
          markActed('ben_atm_wait_log');
          return {
            acted: true,
            msg: `⏳ Cây ATM: Chưa tới giờ đổi (mở đổi lúc ${timeStr}, còn ${waitStr}) · Tiếp tục các việc khác`,
          };
        }

        return { acted: false };
      }

      if (bu.panel === 'atm') {
        return {
          acted: true,
          msg: '🏧 Cây ATM: Đang thao tác trực tiếp trên màn hình Cây ATM...',
        };
      }

      return walkAndRun(
        { x: 34, y: 35 },
        () => {
          if (benScene?.farmer?.lookAt) {
            benScene.farmer.lookAt((34 + 0.5) * 16, 34 * 16);
          }
          atmRuntime.lastAtmQuerySentAt = Date.now();
          sendBenWs({ t: 'atm' });
        },
        'Đi lại Cây ATM để đổi vỏ sò...',
        'ben_atm_walk',
        { panel: 'atm' },
        500,
        400,
        { leaveOpen: true }
      );
    }
  }

  // D. Sạp Bà Tư Bí ({ x: 29, y: 18 }): Đi bộ tới sạp, mở bảng hlw và đổi/mở quà liền mạch
  if (cfg.benAutoHlwExchange !== false) {
    const hlw = bn.hlw;
    if (!hlw && canAct('ben_hlw_query', 60000)) {
      markActed('ben_hlw_query');
      sendBenWs({ t: 'hlw' });
    }
    const bag = Array.isArray(hlw?.bag) ? hlw.bag : [];
    const boneItem = bag.find((i: { item: string }) => i.item === 'hlwBone');
    const pumpkinItem = bag.find((i: { item: string }) => i.item === 'hlwPumpkin');
    const boxItem = bag.find((i: { item: string }) => i.item === 'hlwBox');

    const bones = boneItem?.qty || 0;
    const pumpkins = pumpkinItem?.qty || 0;
    const boxes = boxItem?.qty || 0;

    const maxExchanges = Math.min(Math.floor(bones / 10), Math.floor(pumpkins / 5));
    if (maxExchanges > 0 && canAct('ben_hlw_exchange', 4000)) {
      let openedBoxesInSameSession = false;
      return walkAndRun(
        { x: 29, y: 18 },
        () => {
          if (benScene?.farmer?.lookAt) {
            benScene.farmer.lookAt((30 + 0.5) * 16, 17 * 16);
          }
          sendBenWs({ t: 'hlwExchange', n: maxExchanges });
          if (boneItem) boneItem.qty = Math.max(0, (boneItem.qty || 0) - maxExchanges * 10);
          if (pumpkinItem) pumpkinItem.qty = Math.max(0, (pumpkinItem.qty || 0) - maxExchanges * 5);
          if (boxItem) {
            boxItem.qty = (boxItem.qty || 0) + maxExchanges;
          } else if (hlw && Array.isArray(hlw.bag)) {
            hlw.bag.push({ item: 'hlwBox', qty: maxExchanges });
          }
        },
        `🎃 Đổi ${maxExchanges} phần quà tại Sạp Bà Tư Bí (-${maxExchanges * 10}🦴, -${maxExchanges * 5}🎃)`,
        'ben_hlw_exchange',
        { panel: 'hlw' },
        350,
        400,
        {
          shouldContinue: () => {
            if (openedBoxesInSameSession || cfg.benAutoHlwOpenBox === false) {
              return { keepGoing: false };
            }
            const latestBn = bnStore.getState();
            const curBag = Array.isArray(latestBn?.hlw?.bag) ? latestBn.hlw.bag : bag;
            const curBoxItem = curBag.find((i: { item: string; qty?: number }) => i.item === 'hlwBox');
            const curBoxes = curBoxItem?.qty || 0;
            if (curBoxes <= 0) {
              return { keepGoing: false };
            }
            openedBoxesInSameSession = true;
            return {
              keepGoing: true,
              label: `🎁 Mở tiếp ${curBoxes} Hộp quà Đêm Bí Ngô tại Sạp Bà Tư Bí`,
              actionFn: () => {
                markActed('ben_hlw_open');
                sendBenWs({ t: 'hlwOpen', n: curBoxes });
                if (curBoxItem) curBoxItem.qty = 0;
              },
            };
          },
        }
      );
    }

    if (cfg.benAutoHlwOpenBox !== false && boxes > 0 && canAct('ben_hlw_open', 3500)) {
      return walkAndRun(
        { x: 29, y: 18 },
        () => {
          if (benScene?.farmer?.lookAt) {
            benScene.farmer.lookAt((30 + 0.5) * 16, 17 * 16);
          }
          sendBenWs({ t: 'hlwOpen', n: boxes });
          if (boxItem) boxItem.qty = 0;
        },
        `🎁 Mở ${boxes} Hộp quà Đêm Bí Ngô tại Sạp Bà Tư Bí`,
        'ben_hlw_open',
        { panel: 'hlw' },
        350
      );
    }

    // E. Bắn pháo hoa Đêm Bí Ngô (+50⭐ Nổi tiếng / quả)
    if (cfg.benAutoHlwFire !== false) {
      const fireworkItem = bag.find(
        (i: { item: string; qty?: number }) => i.item === 'hlwFirework' || i.item === 'firework'
      );
      const fireworks = fireworkItem?.qty || 0;
      if (fireworks > 0 && canAct('ben_hlw_fire', 8000)) {
        markActed('ben_hlw_fire');
        sendBenWs({ t: 'hlwFire' });
        if (fireworkItem && typeof fireworkItem.qty === 'number') {
          fireworkItem.qty = Math.max(0, fireworkItem.qty - 1);
        }
        return {
          acted: true,
          msg: `🎆 Đêm Bí Ngô: Đã bắn 1 quả pháo hoa bí ngô (+50⭐ Nổi tiếng)! (Kho còn ${Math.max(0, fireworks - 1)} quả)`,
        };
      }
    }
  }

  return { acted: false };
}
