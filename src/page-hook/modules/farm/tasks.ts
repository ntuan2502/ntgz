import { stores } from '../../core/engine-access';

export function handleDiBaySubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m) return { acted: false };

  // Safeguard: Ensure Dì Bảy savings counter is open if piggy exists or day >= 14
  const stP0 = stores.main.getState();
  if (stP0.savings && (stP0.savings.newsDay || 0) <= 0) {
    if ((stP0.savings.pig?.amount || 0) > 0 || stP0.day >= 14) {
      stores.main.setState((e: any) => ({
        savings: { ...e.savings, newsDay: Math.max(1, e.day) },
      }));
    }
  }

  // 8a. First-Day & Day-2 Guide Tasks
  if (cfg.autoFirstDayTasks !== false) {
    // Light incense on Ông Năm's altar
    if (!m.firstDay?.incense) {
      if (m.lightIncense?.() === 'first') {
        return { acted: true, msg: `🙏 Đã thắp nhang bàn thờ Ông Năm` };
      }
    }

    // Sprout tray (Day 1)
    const stF = stores.main.getState();
    if (stF.firstDay?.incense && !stF.firstDay?.sproutHarvested) {
      if (!stF.firstDay.sprout) {
        if (stF.plantSprouts?.() === 'ok') {
          return { acted: true, msg: `🌱 Đã gieo khay rau mầm cạnh nhà` };
        }
      } else if (stF.harvestSprouts?.() === true) {
        return { acted: true, msg: `🌿 Đã thu hoạch khay rau mầm (+4 củ cải)` };
      }
    }

    // Clear 5 garden debris items
    const stF2 = stores.main.getState();
    if ((stF2.firstDay?.cleared?.length || 0) < 5) {
      for (let i = 0; i < 5; i++) {
        if (!stF2.firstDay.cleared.includes(i)) {
          const cleared = stF2.clearDebris?.(i);
          if (cleared) {
            return { acted: true, msg: `🧹 Đã dọn cỏ/cành khô ngoài vườn (${stF2.firstDay.cleared.length + 1}/5)` };
          }
        }
      }
    }

    // Day 1 eat task & Day 2 drink task
    const stF3 = stores.main.getState();
    if (stF3.day === 1 && !(stF3.ledger || []).some((e: any) => e.kind === 'food') && stF3.gold >= 8000) {
      if (stF3.buyFood?.('banhBao') === 'ok') {
        return { acted: true, msg: `🥟 Đã mua Bánh bao ăn sáng (Việc Ngày 1)` };
      }
    }
    if (
      stF3.day === 2 &&
      !(stF3.ledger || []).some((e: any) => e.kind === 'food' && (e.label === 'Trà đá' || e.label === 'Nước mía')) &&
      stF3.gold >= 3000
    ) {
      if (stF3.buyFood?.('traDa') === 'ok') {
        return { acted: true, msg: `🧊 Đã uống Trà đá (Việc Ngày 2)` };
      }
    }
  }

  // 8b. Ông Năm's Notebook pages & rice seed soaking
  if (cfg.autoNotebookPages !== false) {
    const stN = stores.main.getState();
    if (stN.notebook?.found) {
      for (const pg of [1, 4, 5]) {
        if (stN.claimPage?.(pg) === true) {
          return { acted: true, msg: `📔 Đã thu thập trang Sổ tay Ông Năm #${pg}` };
        }
      }
      if (stN.startSoak?.() === true) {
        return { acted: true, msg: `🌾 Đã ngâm ủ giống Lúa thơm của Ông Năm` };
      }
    }
  }

  // 8c. Claim Daily Tasks & Chapter Goals
  if (cfg.autoClaimQuests !== false) {
    const stD = stores.main.getState();
    const taskCount = stD.daily?.tasks?.length || 0;
    for (let i = 0; i < taskCount; i++) {
      const reward = stores.main.getState().claimDaily?.(i);
      if (reward) {
        return { acted: true, msg: `🎁 Đã nhận thưởng Việc hôm nay #${i + 1} trong Sổ tay` };
      }
    }

    const goalReward = stores.main.getState().claimGoal?.();
    if (goalReward) {
      return { acted: true, msg: `🏆 Đã nhận thưởng Mục tiêu Sổ tay!` };
    }
  }

  // 8d. Piggy Bank: Break piggy when full (7-day streak)
  if (cfg.autoBreakPiggy !== false && cfg.autoPiggy !== false) {
    const stBrk = stores.main.getState();
    const pig = stBrk.savings?.pig;
    if (pig && pig.amount > 0) {
      const streak = pig.lastDay >= stBrk.day - 1 ? pig.streak || 0 : 0;
      if (streak >= 7) {
        const brk = stBrk.breakPiggy?.();
        if (brk) {
          const totalGot = (brk.coins || 0) + (brk.bonus || 0);
          return {
            acted: true,
            msg: `🔨 Đã đập Heo đất đủ 7 ngày (+${totalGot.toLocaleString('vi-VN')}đ)!`,
          };
        }
      }
    }
  }

  // 8e. Piggy Bank: Buy new piggy if none active
  if (cfg.autoNewPiggy !== false && cfg.autoPiggy !== false) {
    const stP2 = stores.main.getState();
    const pig2 = stP2.savings?.pig;
    if (!pig2 || pig2.amount === 0) {
      const tiers = [500000, 200000, 100000, 50000, 10000];
      let chosenTier = 0;
      for (const t of tiers) {
        if (stP2.gold >= t * 3) {
          chosenTier = t;
          break;
        }
      }
      if (!chosenTier && stP2.gold >= 15000) chosenTier = 10000;

      if (chosenTier > 0 && stP2.newPiggy?.(chosenTier) === true) {
        stores.main.getState().feedPiggy?.();
        return {
          acted: true,
          msg: `🐷 Đã mua & bỏ ống Heo đất mới (${chosenTier.toLocaleString('vi-VN')}đ/ngày)`,
        };
      }
    }
  }

  // 8f. Piggy Bank: Feed active piggy today
  if (cfg.autoFeedPiggy !== false && cfg.autoPiggy !== false) {
    const stP3 = stores.main.getState();
    const pig3 = stP3.savings?.pig;
    if (pig3 && pig3.amount > 0 && pig3.lastDay !== stP3.day && stP3.gold >= pig3.amount) {
      if (stP3.feedPiggy?.() === 'ok') {
        return {
          acted: true,
          msg: `🪙 Đã bỏ ống Heo đất hôm nay (${pig3.amount.toLocaleString('vi-VN')}đ)`,
        };
      }
    }
  }

  // 8g. Savings Deposit at Dì Bảy
  const stS = stores.main.getState();
  if (
    cfg.autoSavings &&
    (stS.savings?.newsDay || 0) > 0 &&
    !stS.savings?.loan &&
    (stS.savings?.books?.length || 0) < 10
  ) {
    const minGold = Number(cfg.savingsKeepGold) || 200000;
    if (stS.gold > minGold + 50000) {
      const matured = stS.savings.matured || 0;
      const cap = matured >= 10 ? 20000000 : matured >= 5 ? 12000000 : matured >= 2 ? 8000000 : 5000000;
      const depAmount = Math.min(cap, Math.floor((stS.gold - minGold) / 10000) * 10000);
      if (depAmount >= 50000 && stS.deposit?.(depAmount, 7) === 'ok') {
        return {
          acted: true,
          msg: `🏦 Đã gửi sổ tiết kiệm Dì Bảy ${depAmount.toLocaleString('vi-VN')}đ (7 ngày)`,
        };
      }
    }
  }

  return { acted: false };
}
