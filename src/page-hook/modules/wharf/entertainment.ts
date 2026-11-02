import { sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { WHEEL_ITEM_IDS } from '../../../shared/constants/wharf-catalog';
import { BenExecutionContext, BenStepResult } from './types';
import { atmRuntime, getNextHourTimestamp, setNextAtmTime } from './ws-watchers';

let lastHlwQueryAt = 0;
let lastHtxQueryAt = 0;
let lastHtxClaimAt = 0;

/**
 * SUB-AREA RUNNER 4: ENTERTAINMENT & UTILITIES (Lồng đèn, Vé số, ATM, Bà Tư Bí, HTX Cô Tư)
 */
export function runEntertainmentStep(ctx: BenExecutionContext): BenStepResult {
  const { cfg, m, bu, bn, bnStore, benScene, wallet, shells, benShowFullActions, walkAndRun } = ctx;

  // A. Sạp lồng đèn Cô Bảy ({ x: 37, y: 28 })
  if (cfg.benAutoLantern !== false) {
    const tickets = wallet.tickets || 0;
    const boughtToday = bn.wheel?.bought ?? 0;
    const needBuyTicket =
      Boolean(cfg.benBuyLanternTicket) && (!bn.wheel || boughtToday < 5) && shells >= 600;
    const shouldSpin = cfg.benLanternSpinMode === 'x1' ? tickets > 0 : tickets >= 10;

    if (needBuyTicket || shouldSpin) {
      const curTile = benScene?.farmer?.tile;
      const isAtLanternSpot = Boolean(
        curTile && Math.abs(curTile.x - 37) <= 1 && Math.abs(curTile.y - 28) <= 1
      );

      if (!isAtLanternSpot) {
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
          { panel: 'lantern' }
        );
      }

      if (benScene?.farmer?.lookAt) {
        benScene.farmer.lookAt(39 * 16, 28 * 16);
      }

      // Khi bật Hiển thị bảng thao tác và bảng .ben-wheel đang mở, nhường quyền click DOM cho wharf-modals.ts để tránh gửi đúp gói tin WS
      if (benShowFullActions && bu.panel === 'lantern') {
        return {
          acted: true,
          msg: '🏮 Vòng quay Cô Bảy: Đang thao tác trực tiếp trên bảng Vòng quay...',
        };
      }

      if (!bn.wheel && canAct('ben_wheel_query', 3000)) {
        markActed('ben_wheel_query');
        sendBenWs({ t: 'wheel' });
        return { acted: true, msg: '🏮 Đang hỏi Cô Bảy thông tin vòng quay...' };
      }

      if (cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600) {
        if (canAct('ben_lantern_buy', 1500)) {
          markActed('ben_lantern_buy');
          sendBenWs({ t: 'ticket' });
          return {
            acted: true,
            msg: `🎟️ Cô Bảy: Nè, một vé. Quay đi con! (${boughtToday + 1}/5 · -600 vỏ sò 🐚)`,
          };
        }
        return {
          acted: true,
          msg: `🎟️ Đang mua vé quay tại Sạp Cô Bảy (${boughtToday}/5)...`,
        };
      } else if (
        cfg.benBuyLanternTicket &&
        boughtToday >= 5 &&
        canAct('ben_lantern_limit_log', 120000)
      ) {
        markActed('ben_lantern_limit_log');
        return {
          acted: true,
          msg: '🏮 Cô Bảy: Hôm nay cô bán đủ 5 vé rồi, mai ghé nha. Ra câu đi, cá còn ngậm vé đó!',
        };
      } else if (
        cfg.benBuyLanternTicket &&
        shells < 600 &&
        boughtToday < 5 &&
        canAct('ben_lantern_poor_log', 60000)
      ) {
        markActed('ben_lantern_poor_log');
        return {
          acted: true,
          msg: `🏮 Cô Bảy: Thiếu vỏ sò rồi con. (cần 600🐚, hiện có ${shells}🐚)`,
        };
      }

      if (shouldSpin) {
        if (canAct('ben_lantern_spin', 2500)) {
          markActed('ben_lantern_spin');
          const curBn = bnStore.getState();
          const curPicks = curBn.wheel?.picks || [];
          const ownedCloset = Array.isArray(curBn.closet) ? curBn.closet : [];
          const unownedWheel = WHEEL_ITEM_IDS.filter((id) => !ownedCloset.includes(id));
          const needPicks = Math.min(3, unownedWheel.length);
          if (needPicks > 0 && curPicks.length < needPicks) {
            sendBenWs({ t: 'pick', items: unownedWheel.slice(0, needPicks) });
          }
          const spinCount = cfg.benLanternSpinMode === 'x1' ? 1 : 10;
          sendBenWs({ t: 'spin', n: spinCount });
          return {
            acted: true,
            msg: `🏮 Vòng quay Cô Bảy: Đang quay ${spinCount} vé tại sạp (còn ${tickets} vé 🎟️)...`,
          };
        }

        return {
          acted: true,
          msg: `🏮 Vòng quay Cô Bảy: Đang chờ kết quả vòng quay (còn ${tickets} vé 🎟️)...`,
        };
      }
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
      const alreadyBought = (lottoState?.mine || []).some(
        (t: { day?: number }) => t.day === sellingDay
      );
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

  // C. Exchange shells at ATM ({ x: 34, y: 35 })
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

      const curTile = benScene?.farmer?.tile;
      const isAtAtmSpot = Boolean(curTile && curTile.x === 34 && curTile.y === 35);

      if (!isAtAtmSpot) {
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
          { panel: 'atm' }
        );
      }

      if (benScene?.farmer?.lookAt) {
        benScene.farmer.lookAt((34 + 0.5) * 16, 34 * 16);
      }

      // Khi bật Hiển thị bảng thao tác và bảng .ben-atm đang mở, nhường quyền click DOM cho wharf-modals.ts để tránh gửi đúp
      if (benShowFullActions && bu.panel === 'atm') {
        return {
          acted: true,
          msg: '🏧 Cây ATM: Đang thao tác trực tiếp trên màn hình Cây ATM...',
        };
      }

      const hasFreshData =
        atmRuntime.lastAtmResponseReceivedAt > 0 &&
        atmRuntime.lastAtmResponseReceivedAt >= atmRuntime.lastAtmQuerySentAt &&
        now - atmRuntime.lastAtmResponseReceivedAt < 30000;

      if (!hasFreshData) {
        if (now - atmRuntime.lastAtmQuerySentAt > 3000 && canAct('ben_atm_query', 3000)) {
          atmRuntime.lastAtmQuerySentAt = now;
          markActed('ben_atm_query');
          sendBenWs({ t: 'atm' });
          return {
            acted: true,
            msg: '🏧 Đang kiểm tra tỷ giá và hạn mức tại Cây ATM...',
          };
        }
        return {
          acted: true,
          msg: '🏧 Đang chờ máy ATM phản hồi tỷ giá và hạn mức...',
        };
      }

      if (bn.atm) {
        const bnAtm = bn.atm;
        const rate =
          typeof bnAtm.rate === 'number'
            ? bnAtm.rate
            : (m.day || 1) >= 200
              ? 3000
              : (m.day || 1) >= 90
                ? 2000
                : (m.day || 1) >= 60
                  ? 1000
                  : 500;

        const MAX_ATM_HOURLY_MONEY = 20_000_000;
        const moneyQuota = Math.min(
          MAX_ATM_HOURLY_MONEY,
          typeof bnAtm.left === 'number' ? bnAtm.left : MAX_ATM_HOURLY_MONEY
        );

        if (moneyQuota < 100 * rate) {
          const reopenMs =
            typeof bnAtm.reopen === 'number' && bnAtm.reopen > now
              ? bnAtm.reopen + 3000
              : getNextHourTimestamp(now) + 3000;
          setNextAtmTime(reopenMs);
          markActed('ben_atm_cash');
          const reopenStr = new Date(reopenMs).toLocaleTimeString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          return {
            acted: true,
            msg: `⏳ Cây ATM: Giờ này hạn mức tiền đã hết (mở đổi lúc ${reopenStr}), chờ giờ sau đổi tiếp!`,
          };
        }

        const maxShellsByQuota = Math.floor(moneyQuota / rate);
        let shellsToCash = Math.min(shells, maxShellsByQuota);
        shellsToCash = Math.floor(shellsToCash / 100) * 100;

        if (shellsToCash >= 100) {
          if (now - atmRuntime.lastAtmExchangeSentAt > 4000 && canAct('ben_atm_cash', 4000)) {
            atmRuntime.lastAtmExchangeSentAt = now;
            markActed('ben_atm_cash');
            sendBenWs({ t: 'atmCash', shells: shellsToCash });
            return {
              acted: true,
              msg: `🏧 Đang đổi ${shellsToCash.toLocaleString('vi-VN')} vỏ sò tại Cây ATM...`,
            };
          }
          return {
            acted: true,
            msg: '🏧 Đang chờ máy ATM xác nhận đổi tiền...',
          };
        }
      }
    }
  }

  // D. Sạp Bà Tư Bí ({ x: 29, y: 18 }): Đổi Xương cá ma + Bí ngô con lấy Hộp quà Đêm Bí Ngô
  if (cfg.benAutoHlwExchange !== false) {
    const now = Date.now();
    if (!bn.hlw && now - lastHlwQueryAt > 60000 && canAct('ben_hlw_query', 60000)) {
      lastHlwQueryAt = now;
      markActed('ben_hlw_query');
      sendBenWs({ t: 'hlw' });
    }

    const hlw = bn.hlw;
    const bag = Array.isArray(hlw?.bag) ? hlw.bag : [];
    const boneItem = bag.find((i: { item: string }) => i.item === 'hlwBone');
    const pumpkinItem = bag.find((i: { item: string }) => i.item === 'hlwPumpkin');
    const boxItem = bag.find((i: { item: string }) => i.item === 'hlwBox');

    const bones = boneItem?.qty || 0;
    const pumpkins = pumpkinItem?.qty || 0;
    const boxes = boxItem?.qty || 0;

    const maxExchanges = Math.min(Math.floor(bones / 10), Math.floor(pumpkins / 5));
    if (maxExchanges > 0 && canAct('ben_hlw_exchange', 4000)) {
      const curTile = benScene?.farmer?.tile;
      const isAtBaTuSpot = Boolean(curTile && curTile.x === 29 && curTile.y === 18);

      if (!isAtBaTuSpot) {
        return walkAndRun(
          { x: 29, y: 18 },
          () => {
            if (benScene?.farmer?.lookAt) {
              benScene.farmer.lookAt((30 + 0.5) * 16, 17 * 16);
            }
            sendBenWs({ t: 'hlwExchange', n: maxExchanges });
          },
          `Đi lại Sạp Bà Tư Bí để đổi ${maxExchanges} phần quà (-${maxExchanges * 10}🦴, -${maxExchanges * 5}🎃)...`,
          'ben_hlw_walk',
          { panel: 'hlw' },
          1500
        );
      }

      if (benScene?.farmer?.lookAt) {
        benScene.farmer.lookAt((30 + 0.5) * 16, 17 * 16);
      }
      markActed('ben_hlw_exchange');
      sendBenWs({ t: 'hlwExchange', n: maxExchanges });
      return {
        acted: true,
        msg: `🎃 Đã đổi ${maxExchanges} phần quà tại Sạp Bà Tư Bí (-${maxExchanges * 10}🦴, -${maxExchanges * 5}🎃) ➔ Nhận ${maxExchanges} Hộp quà Đêm Bí Ngô 🎁`,
      };
    }

    if (cfg.benAutoHlwOpenBox !== false && boxes > 0 && canAct('ben_hlw_open', 3000)) {
      markActed('ben_hlw_open');
      sendBenWs({ t: 'hlwOpen', n: boxes });
      return {
        acted: true,
        msg: `🎁 Đang mở ${boxes} Hộp quà Đêm Bí Ngô...`,
      };
    }
  }

  // E. Hợp Tác Xã Cô Tư: Tự động điểm danh hàng ngày nhận quà
  if (cfg.benAutoHtxClaim !== false) {
    const now = Date.now();
    if (!bn.htx && now - lastHtxQueryAt > 180000 && canAct('ben_htx_query', 180000)) {
      lastHtxQueryAt = now;
      markActed('ben_htx_query');
      sendBenWs({ t: 'htx' });
    }

    if (
      bn.htx &&
      !bn.htx.claimed &&
      now - lastHtxClaimAt > 60000 &&
      canAct('ben_htx_claim', 60000)
    ) {
      lastHtxClaimAt = now;
      markActed('ben_htx_claim');
      sendBenWs({ t: 'htxClaim' });
      return {
        acted: true,
        msg: '🧺 Đang gửi lệnh lĩnh phần hàng ngày tại Hợp Tác Xã Cô Tư...',
      };
    }
  }

  return { acted: false };
}
