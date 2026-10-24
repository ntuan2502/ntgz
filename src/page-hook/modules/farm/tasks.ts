import { getMainState, setMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { StepResult, NOT_ACTED, formatVnd } from './types';

const DEBRIS_COUNT = 5;
const NOTEBOOK_PAGES = [1, 4, 5];
const PIGGY_TIERS = [500000, 200000, 100000, 50000, 10000];
const PIGGY_FULL_STREAK = 7;

/** Keeps Dì Bảy's savings counter open once a piggy exists or from day 14 */
function ensureSavingsCounterOpen(): void {
  const st = getMainState();
  if (!st.savings || (st.savings.newsDay || 0) > 0) return;
  if ((st.savings.pig?.amount || 0) > 0 || (st.day || 0) >= 14) {
    setMainState((e) => ({ savings: { ...e.savings, newsDay: Math.max(1, e.day || 1) } }));
  }
}

function runFirstDayGuide(): StepResult | null {
  const m = getMainState();
  if (!m.firstDay?.incense && m.lightIncense?.() === 'first') {
    return { acted: true, msg: '🙏 Đã thắp nhang bàn thờ Ông Năm' };
  }

  const stF = getMainState();
  if (stF.firstDay?.incense && !stF.firstDay.sproutHarvested) {
    if (!stF.firstDay.sprout) {
      if (stF.plantSprouts?.() === 'ok') return { acted: true, msg: '🌱 Đã gieo khay rau mầm cạnh nhà' };
    } else if (stF.harvestSprouts?.() === true) {
      return { acted: true, msg: '🌿 Đã thu hoạch khay rau mầm (+4 củ cải)' };
    }
  }

  const stD = getMainState();
  const cleared = stD.firstDay?.cleared || [];
  if (stD.firstDay && cleared.length < DEBRIS_COUNT) {
    for (let i = 0; i < DEBRIS_COUNT; i++) {
      if (!cleared.includes(i) && stD.clearDebris?.(i)) {
        return { acted: true, msg: `🧹 Đã dọn cỏ/cành khô ngoài vườn (${cleared.length + 1}/${DEBRIS_COUNT})` };
      }
    }
  }

  const stE = getMainState();
  const ledger = stE.ledger || [];
  if (stE.day === 1 && !ledger.some((e) => e.kind === 'food') && (stE.gold || 0) >= 8000 && stE.buyFood?.('banhBao') === 'ok') {
    return { acted: true, msg: '🥟 Đã mua Bánh bao ăn sáng (Việc Ngày 1)' };
  }
  const drankToday = ledger.some((e) => e.kind === 'food' && (e.label === 'Trà đá' || e.label === 'Nước mía'));
  if (stE.day === 2 && !drankToday && (stE.gold || 0) >= 3000 && stE.buyFood?.('traDa') === 'ok') {
    return { acted: true, msg: '🧊 Đã uống Trà đá (Việc Ngày 2)' };
  }
  return null;
}

function collectNotebookPages(): StepResult | null {
  const st = getMainState();
  if (!st.notebook?.found) return null;
  for (const pg of NOTEBOOK_PAGES) {
    if (getMainState().claimPage?.(pg) === true) {
      return { acted: true, msg: `📔 Đã thu thập trang Sổ tay Ông Năm #${pg}` };
    }
  }
  if (getMainState().startSoak?.() === true) {
    return { acted: true, msg: '🌾 Đã ngâm ủ giống Lúa thơm của Ông Năm' };
  }
  return null;
}

function claimQuests(): StepResult | null {
  const taskCount = getMainState().daily?.tasks?.length || 0;
  for (let i = 0; i < taskCount; i++) {
    if (getMainState().claimDaily?.(i)) {
      return { acted: true, msg: `🎁 Đã nhận thưởng Việc hôm nay #${i + 1} trong Sổ tay` };
    }
  }
  if (getMainState().claimGoal?.()) {
    return { acted: true, msg: '🏆 Đã nhận thưởng Mục tiêu Sổ tay!' };
  }
  return null;
}

function breakFullPiggy(): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  if (!pig || (pig.amount || 0) <= 0) return null;
  const day = st.day || 0;
  const streak = (pig.lastDay || 0) >= day - 1 ? pig.streak || 0 : 0;
  if (streak < PIGGY_FULL_STREAK) return null;
  const brk = st.breakPiggy?.();
  if (!brk) return null;
  const totalGot = (brk.coins || 0) + (brk.bonus || 0);
  return { acted: true, msg: `🔨 Đã đập Heo đất đủ 7 ngày (+${formatVnd(totalGot)}đ)!` };
}

function buyNewPiggy(): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  if (pig && pig.amount !== 0) return null;
  const gold = st.gold || 0;
  let tier = PIGGY_TIERS.find((t) => gold >= t * 3) || 0;
  if (!tier && gold >= 15000) tier = 10000;
  if (tier > 0 && st.newPiggy?.(tier) === true) {
    getMainState().feedPiggy?.();
    return { acted: true, msg: `🐷 Đã mua & bỏ ống Heo đất mới (${formatVnd(tier)}đ/ngày)` };
  }
  return null;
}

function feedPiggy(): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  const amount = pig?.amount || 0;
  if (!pig || amount <= 0 || pig.lastDay === st.day || (st.gold || 0) < amount) return null;
  if (st.feedPiggy?.() === 'ok') {
    return { acted: true, msg: `🪙 Đã bỏ ống Heo đất hôm nay (${formatVnd(amount)}đ)` };
  }
  return null;
}

function depositSavings(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const savings = st.savings;
  if (!savings || (savings.newsDay || 0) <= 0 || savings.loan || (savings.books?.length || 0) >= 10) return null;
  const minGold = Number(cfg.savingsKeepGold) || 200000;
  const gold = st.gold || 0;
  if (gold <= minGold + 50000) return null;
  const matured = savings.matured || 0;
  const cap = matured >= 10 ? 20000000 : matured >= 5 ? 12000000 : matured >= 2 ? 8000000 : 5000000;
  const amount = Math.min(cap, Math.floor((gold - minGold) / 10000) * 10000);
  if (amount >= 50000 && st.deposit?.(amount, 7) === 'ok') {
    return { acted: true, msg: `🏦 Đã gửi sổ tiết kiệm Dì Bảy ${formatVnd(amount)}đ (7 ngày)` };
  }
  return null;
}

export function handleDiBaySubArea(cfg: AppConfig): StepResult {
  ensureSavingsCounterOpen();
  return (
    (cfg.autoFirstDayTasks !== false ? runFirstDayGuide() : null) ||
    (cfg.autoNotebookPages !== false ? collectNotebookPages() : null) ||
    (cfg.autoClaimQuests !== false ? claimQuests() : null) ||
    (cfg.autoBreakPiggy !== false ? breakFullPiggy() : null) ||
    (cfg.autoNewPiggy !== false ? buyNewPiggy() : null) ||
    (cfg.autoFeedPiggy !== false ? feedPiggy() : null) ||
    (cfg.autoSavings ? depositSavings(cfg) : null) ||
    NOT_ACTED
  );
}
