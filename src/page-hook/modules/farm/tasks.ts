import { getMainState, setMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { StepResult, NOT_ACTED, formatVnd, showFarmActionUI } from './types';

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

function claimQuests(cfg: AppConfig): StepResult | null {
  const taskCount = getMainState().daily?.tasks?.length || 0;
  for (let i = 0; i < taskCount; i++) {
    if (getMainState().claimDaily?.(i)) {
      showFarmActionUI(cfg, { panel: 'goals' });
      return { acted: true, msg: `🎁 Đã nhận thưởng Việc hôm nay #${i + 1} trong Sổ tay` };
    }
  }
  if (getMainState().claimGoal?.()) {
    showFarmActionUI(cfg, { panel: 'goals' });
    return { acted: true, msg: '🏆 Đã nhận thưởng Mục tiêu Sổ tay!' };
  }
  return null;
}

function breakFullPiggy(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  if (!pig || (pig.amount || 0) <= 0) return null;
  const day = st.day || 0;
  const streak = (pig.lastDay || 0) >= day - 1 ? pig.streak || 0 : 0;
  if (streak < PIGGY_FULL_STREAK) return null;
  const brk = st.breakPiggy?.();
  if (!brk) return null;
  const totalGot = (brk.coins || 0) + (brk.bonus || 0);
  showFarmActionUI(cfg, { vendor: 'savings', shop: 'piggy' });
  return { acted: true, msg: `🔨 Đã đập Heo đất đủ 7 ngày (+${formatVnd(totalGot)}đ)!` };
}

function buyNewPiggy(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  if (pig && pig.amount !== 0) return null;
  const gold = st.gold || 0;
  let tier = PIGGY_TIERS.find((t) => gold >= t * 3) || 0;
  if (!tier && gold >= 15000) tier = 10000;
  if (tier > 0 && st.newPiggy?.(tier) === true) {
    getMainState().feedPiggy?.();
    showFarmActionUI(cfg, { vendor: 'savings', shop: 'piggy' });
    return { acted: true, msg: `🐷 Đã mua & bỏ ống Heo đất mới (${formatVnd(tier)}đ/ngày)` };
  }
  return null;
}

function feedPiggy(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const pig = st.savings?.pig;
  const amount = pig?.amount || 0;
  if (!pig || amount <= 0 || pig.lastDay === st.day || (st.gold || 0) < amount) return null;
  if (st.feedPiggy?.() === 'ok') {
    showFarmActionUI(cfg, { vendor: 'savings', shop: 'piggy' });
    return { acted: true, msg: `🪙 Đã bỏ ống Heo đất hôm nay (${formatVnd(amount)}đ)` };
  }
  return null;
}

function depositSavings(cfg: AppConfig): StepResult | null {
  const st = getMainState();
  const savings = st.savings;
  if (!savings || (savings.newsDay || 0) <= 0 || savings.loan || (savings.books?.length || 0) >= 10) return null;

  // Ngưỡng giữ lại tiền an toàn (mặc định 10 triệu đồng)
  const minKeepMillion = typeof cfg.savingsMinKeepMillion === 'number'
    ? cfg.savingsMinKeepMillion
    : typeof cfg.savingsKeepGold === 'number'
      ? cfg.savingsKeepGold / 1_000_000
      : 10;
  const minKeepGold = Math.max(0, minKeepMillion * 1_000_000);

  const gold = st.gold || 0;
  if (gold <= minKeepGold + 50_000) return null;

  const matured = savings.matured || 0;
  // Hạn mức gửi tối đa theo bậc của game: 5M, 8M, 12M, 20M
  const cap = matured >= 10 ? 20_000_000 : matured >= 5 ? 12_000_000 : matured >= 2 ? 8_000_000 : 5_000_000;

  let amount: number;
  if (cfg.savingsDepositMax !== false) {
    // Gửi tối đa cho phép theo hạn mức mà không vi phạm ngưỡng giữ tiền
    const maxAffordable = gold - minKeepGold;
    amount = Math.min(cap, Math.floor(maxAffordable / 10_000) * 10_000);
  } else {
    // Gửi số tiền người dùng nhập
    const requested = Number(cfg.savingsDepositAmount) || 5_000_000;
    if (gold - requested < minKeepGold) return null;
    amount = Math.min(cap, requested);
  }

  if (amount < 50_000) return null;

  // Kỳ hạn gửi: 3 ngày (5%), 7 ngày (15%), 14 ngày (35%)
  const term = (cfg.savingsTerm === 3 || cfg.savingsTerm === 14) ? cfg.savingsTerm : 7;

  if (st.deposit?.(amount, term) === 'ok') {
    showFarmActionUI(cfg, { vendor: 'savings', shop: 'savings' });
    return { acted: true, msg: `🏦 Đã gửi sổ tiết kiệm Dì Bảy ${formatVnd(amount)}đ (${term} ngày)` };
  }
  return null;
}

export function handleDiBaySubArea(cfg: AppConfig): StepResult {
  ensureSavingsCounterOpen();
  return (
    (cfg.autoClaimQuests !== false ? claimQuests(cfg) : null) ||
    (cfg.autoBreakPiggy !== false ? breakFullPiggy(cfg) : null) ||
    (cfg.autoNewPiggy !== false ? buyNewPiggy(cfg) : null) ||
    (cfg.autoFeedPiggy !== false ? feedPiggy(cfg) : null) ||
    (cfg.autoSavings ? depositSavings(cfg) : null) ||
    NOT_ACTED
  );
}
