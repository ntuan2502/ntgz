import { getMainState, setMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';

export function handleDiBaySubArea(cfg: AppConfig): { acted: boolean; msg?: string } {
  const m = getMainState();
  if (!m) return { acted: false };

  // Safeguard: Ensure Dì Bảy savings counter is open if piggy exists or day >= 14
  const stP0 = getMainState();
  if (stP0.savings && (stP0.savings.newsDay || 0) <= 0) {
    if ((stP0.savings.pig?.amount || 0) > 0 || (stP0.day || 0) >= 14) {
      setMainState((e) => ({
        savings: { ...(e.savings || {}), newsDay: Math.max(1, e.day || 1) },
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
    const stF = getMainState();
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
    const stF2 = getMainState();
    if ((stF2.firstDay?.cleared?.length || 0) < 5) {
      const clearedList = stF2.firstDay?.cleared || [];
      for (let i = 0; i < 5; i++) {
        if (!clearedList.includes(i)) {
          const cleared = stF2.clearDebris?.(i);
          if (cleared) {
            return { acted: true, msg: `🧹 Đã dọn cỏ/cành khô ngoài vườn (${clearedList.length + 1}/5)` };
          }
        }
      }
    }

    // Day 1 eat task & Day 2 drink task
    const stF3 = getMainState();
    if (stF3.day === 1 && !(stF3.ledger || []).some((e: { kind?: string }) => e.kind === 'food') && (stF3.gold || 0) >= 8000) {
      if (stF3.buyFood?.('banhBao') === 'ok') {
        return { acted: true, msg: `🥟 Đã mua Bánh bao ăn sáng (Việc Ngày 1)` };
      }
    }
    if (
      stF3.day === 2 &&
      !(stF3.ledger || []).some((e: { kind?: string; label?: string }) => e.kind === 'food' && (e.label === 'Trà đá' || e.label === 'Nước mía')) &&
      (stF3.gold || 0) >= 3000
    ) {
      if (stF3.buyFood?.('traDa') === 'ok') {
        return { acted: true, msg: `🧊 Đã uống Trà đá (Việc Ngày 2)` };
      }
    }
  }

  // 8b. Ông Năm's Notebook pages & rice seed soaking
  if (cfg.autoNotebookPages !== false) {
    const stN = getMainState();
    if (stN.notebook?.found) {
      if (!stN.notebook.read) {
        stN.readNotebook?.();
      }
      for (const p of stN.notebook.pages || []) {
        if (p.found && !p.read) {
          stN.claimNotebookPage?.(p.id);
        }
      }
    }
    const curN = getMainState();
    if (curN.notebook?.pages?.some((p) => p.id === 'soak' && p.found)) {
      if (!curN.notebook.soakDone && !curN.notebook.soakEnd && (curN.gold || 0) >= 1000) {
        if (curN.startSoak?.() === 'ok') {
          return { acted: true, msg: `🌾 Đã ngâm giống lúa thơm theo sổ Ông Năm` };
        }
      }
      const curN2 = getMainState();
      if (curN2.notebook?.seedReady && !curN2.notebook.seedClaimed) {
        if (curN2.claimSoakSeed?.() === 'ok') {
          return { acted: true, msg: `🌾 Đã nhận giống lúa thơm ngâm ủ thành công` };
        }
      }
    }
  }

  // 8c. Piggy Bank (Heo đất tiết kiệm)
  const stPig = getMainState();
  const pig = stPig.savings?.pig;

  // Feed piggy daily (if not fed today & not broken)
  if (cfg.autoFeedPiggy !== false && pig && !pig.broken && pig.fedDay !== stPig.day && (stPig.gold || 0) >= 50000) {
    const res = stPig.feedPiggy?.();
    if (res === 'ok' || res === 'broke') {
      return { acted: true, msg: `🐷 Đã bỏ ống heo tiết kiệm (Nuôi heo ${pig.streak || 1} ngày)` };
    }
  }

  // Break piggy if streak >= 7 days
  const stPig2 = getMainState();
  const pig2 = stPig2.savings?.pig;
  if (cfg.autoBreakPiggy !== false && pig2 && !pig2.broken && (pig2.streak || 0) >= 7) {
    if (stPig2.breakPiggy?.() === true) {
      return {
        acted: true,
        msg: `🔨 Đã đập heo đất tiết kiệm đủ 7 ngày streak (+${(pig2.amount || 0).toLocaleString('vi-VN')}đ)`,
      };
    }
  }

  // Buy new piggy if broken or haven't got one
  const stPig3 = getMainState();
  const pig3 = stPig3.savings?.pig;
  if (
    cfg.autoNewPiggy !== false &&
    (!pig3 || pig3.broken) &&
    (stPig3.gold || 0) >= 100000 &&
    (stPig3.savings?.newsDay || 0) > 0
  ) {
    if (stPig3.buyPiggy?.() === true) {
      return { acted: true, msg: `🐷 Đã mua heo đất mới tại Quầy Dì Bảy` };
    }
  }

  // 8d. Passbook Savings (Sổ tiết kiệm Dì Bảy)
  if (cfg.autoSavings) {
    const stSav = getMainState();
    const keepLimit = Number(cfg.savingsKeepGold) || 200000;
    const surplusCash = (stSav.gold || 0) - keepLimit;
    if (surplusCash >= 100000 && !stSav.savings?.balance) {
      const depositAmt = Math.floor(surplusCash / 50000) * 50000;
      if (depositAmt >= 100000 && stSav.depositSavings?.(depositAmt) === true) {
        return {
          acted: true,
          msg: `🏦 Đã gửi tiết kiệm ${depositAmt.toLocaleString('vi-VN')}đ tại Quầy Dì Bảy`,
        };
      }
    }
  }

  // 8e. Claim Quests & Handbook Achievements
  if (cfg.autoClaimQuests !== false) {
    const stQ = getMainState();
    for (const t of stQ.daily?.tasks || []) {
      if (!t.claimed && (stQ.stats?.earned || 0) - (t.base || 0) >= (t.need || 0)) {
        if (t.id !== undefined && stQ.claimDailyTask?.(t.id) === true) {
          return { acted: true, msg: `🎉 Đã nhận thưởng Việc hôm nay tại Sổ tay` };
        }
      }
    }
  }

  return { acted: false };
}
