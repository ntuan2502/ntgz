import { stores, ZustandStore } from '../../core/engine-access';
import { BenNetState, BenUIStoreState } from '../../../shared/types/game-store';
import { WHEEL_ITEM_METAS } from '../../../shared/constants/wharf-catalog';
import { BenStepResult } from './types';

const ATM_NEXT_TIME_KEY = 'ntg_ben_next_atm_time';

export const atmRuntime = {
  nextAtmTime: (() => {
    try {
      const raw = localStorage.getItem(ATM_NEXT_TIME_KEY) || sessionStorage.getItem(ATM_NEXT_TIME_KEY);
      const val = raw ? Number(raw) || 0 : 0;
      return val > Date.now() + 3600000 * 2 ? 0 : val;
    } catch {
      return 0;
    }
  })(),
  lastAtmLogAt: 0,
  lastAtmExchangeAt: 0,
  lastAtmQuerySentAt: 0,
  lastAtmResponseReceivedAt: 0,
  lastAtmExchangeSentAt: 0,
  lastObservedAtmRef: null as unknown,
};

export const wharfWatchState = {
  benNoticeTired: false,
  hasInitializedWharfSeqs: false,
  isSubscribedToBenNet: false,
  lastObservedCashedSeq: -1,
  lastObservedNoticeSeq: -1,
  lastObservedSpunSeq: -1,
  lastObservedHlwToastSeq: -1,
};

export function getNextHourTimestamp(now: number): number {
  return now + 3600000;
}

export function setNextAtmTime(timestamp: number): void {
  atmRuntime.nextAtmTime = timestamp;
  try {
    localStorage.setItem(ATM_NEXT_TIME_KEY, String(timestamp));
    sessionStorage.setItem(ATM_NEXT_TIME_KEY, String(timestamp));
  } catch {
    // Ignore storage errors
  }
}

export function getWharfNextAtmTime(): number {
  const now = Date.now();
  const bn = stores.benNet?.getState();
  if (typeof bn?.atm?.reopen === 'number' && bn.atm.reopen > now) {
    const serverReopen = bn.atm.reopen + 3000;
    if (serverReopen > atmRuntime.nextAtmTime) {
      setNextAtmTime(serverReopen);
      return serverReopen;
    }
  }

  if (atmRuntime.nextAtmTime > 0) {
    if (atmRuntime.nextAtmTime < now - 3600000 || atmRuntime.nextAtmTime > now + 3600000 * 2) {
      atmRuntime.nextAtmTime = 0;
      return 0;
    }
    return atmRuntime.nextAtmTime;
  }

  try {
    const raw = localStorage.getItem(ATM_NEXT_TIME_KEY) || sessionStorage.getItem(ATM_NEXT_TIME_KEY);
    const val = raw ? Number(raw) || 0 : 0;
    if (val <= 0 || val < now - 3600000 || val > now + 3600000 * 2) {
      return 0;
    }
    atmRuntime.nextAtmTime = val;
    return val;
  } catch {
    return 0;
  }
}

export function subscribeToBenNetIfNeeded(bnStore: ZustandStore<BenNetState>): void {
  if (wharfWatchState.isSubscribedToBenNet || typeof bnStore.subscribe !== 'function') return;
  wharfWatchState.isSubscribedToBenNet = true;
  try {
    bnStore.subscribe((state, prevState) => {
      if (state.atm && state.atm !== prevState?.atm) {
        atmRuntime.lastObservedAtmRef = state.atm;
        atmRuntime.lastAtmResponseReceivedAt = Date.now();
        if (typeof state.atm.reopen === 'number' && state.atm.reopen > Date.now()) {
          setNextAtmTime(state.atm.reopen + 3000);
        }
      }
    });
  } catch {
    // Fallback to per-tick polling in execBenStep
  }
}

export function initWharfSeqsIfNeeded(bn: BenNetState): void {
  if (wharfWatchState.hasInitializedWharfSeqs) return;
  wharfWatchState.hasInitializedWharfSeqs = true;
  wharfWatchState.lastObservedCashedSeq = typeof bn.cashed?.seq === 'number' ? bn.cashed.seq : 0;
  wharfWatchState.lastObservedNoticeSeq = typeof bn.notice?.seq === 'number' ? bn.notice.seq : 0;
  wharfWatchState.lastObservedSpunSeq = typeof bn.spun?.seq === 'number' ? bn.spun.seq : 0;
  wharfWatchState.lastObservedHlwToastSeq = typeof bn.hlwToast?.seq === 'number' ? bn.hlwToast.seq : 0;
}

export function syncAtmRefFromState(bn: BenNetState): void {
  if (bn.atm && bn.atm !== atmRuntime.lastObservedAtmRef) {
    atmRuntime.lastObservedAtmRef = bn.atm;
    atmRuntime.lastAtmResponseReceivedAt = Date.now();
    if (typeof bn.atm.reopen === 'number' && bn.atm.reopen > Date.now()) {
      setNextAtmTime(bn.atm.reopen + 3000);
    }
  }
}

/**
 * Kiểm tra các gói phản hồi bất đồng bộ từ máy chủ Bến Đò (ATM cashed, Notice lỗi, Kết quả quay lồng đèn, Toast sự kiện).
 */
export function checkWharfServerEvents(
  bn: BenNetState,
  buStore: ZustandStore<BenUIStoreState>
): BenStepResult | null {
  // 1. Watch for ATM cash success confirmation from server
  if (
    bn.cashed &&
    typeof bn.cashed.seq === 'number' &&
    bn.cashed.seq !== wharfWatchState.lastObservedCashedSeq
  ) {
    wharfWatchState.lastObservedCashedSeq = bn.cashed.seq;
    const cashed = bn.cashed;
    const nextHour =
      typeof bn.atm?.reopen === 'number' && bn.atm.reopen > Date.now()
        ? bn.atm.reopen + 3000
        : getNextHourTimestamp(Date.now()) + 3000;
    const nextHourStr = new Date(nextHour).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    atmRuntime.lastAtmExchangeAt = Date.now();
    setNextAtmTime(nextHour);
    if (buStore.getState().panel === 'atm') {
      buStore.setState({ panel: null });
    }
    return {
      acted: true,
      msg: `🏧 Cây ATM: 🎉 Đổi thành công ${cashed.shells.toLocaleString('vi-VN')} vỏ sò ➔ ${cashed.money.toLocaleString('vi-VN')}đ tiền mặt! Lần đổi kế tiếp lúc ${nextHourStr}`,
    };
  }

  // 2. Watch for ATM & Stamina server error notices
  if (
    bn.notice &&
    typeof bn.notice.seq === 'number' &&
    bn.notice.seq !== wharfWatchState.lastObservedNoticeSeq
  ) {
    wharfWatchState.lastObservedNoticeSeq = bn.notice.seq;
    const err = bn.notice.error;
    if (err === 'tired') {
      wharfWatchState.benNoticeTired = true;
      return {
        acted: true,
        msg: '😮‍💨 Bến Đò: Không đủ Sức câu -> Chuẩn bị đi ăn hồi phục Sức...',
      };
    } else if (err === 'farAtm') {
      atmRuntime.lastAtmQuerySentAt = 0;
      return {
        acted: true,
        msg: '⚠️ Cây ATM: Đứng ngay trước cây ATM mới rút tiền được nha 🏧',
      };
    } else if (err === 'atmLimit') {
      const nextHour =
        typeof bn.atm?.reopen === 'number' && bn.atm.reopen > Date.now()
          ? bn.atm.reopen + 3000
          : getNextHourTimestamp(Date.now()) + 3000;
      setNextAtmTime(nextHour);
      if (buStore.getState().panel === 'atm') {
        buStore.setState({ panel: null });
      }
      const nextHourStr = new Date(nextHour).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        acted: true,
        msg: `⏳ Cây ATM: Giờ này nhận chạm hạn mức tiền rồi, bớt số sò hoặc chờ tới ${nextHourStr} đổi tiếp nha ⏳`,
      };
    } else if (err === 'atmMin') {
      return {
        acted: true,
        msg: '⚠️ Cây ATM: Mỗi lần đổi ít nhất 100 vỏ sò nha 🏧',
      };
    }
  }

  // 3. Watch for wheel spin results from server
  if (
    bn.spun &&
    typeof bn.spun.seq === 'number' &&
    bn.spun.seq !== wharfWatchState.lastObservedSpunSeq
  ) {
    wharfWatchState.lastObservedSpunSeq = bn.spun.seq;
    const spun = bn.spun;
    const hits = Array.isArray(spun.hits) ? spun.hits : [];
    const totalShells = hits.reduce(
      (sum: number, h: { shells?: number }) => sum + (Number(h.shells) || 0),
      0
    );
    const wonItemIds: string[] = [];
    if (spun.won) {
      wonItemIds.push(spun.won);
    }
    for (const h of hits) {
      if (h.item && !wonItemIds.includes(h.item)) {
        wonItemIds.push(h.item);
      }
    }

    const msg =
      wonItemIds.length > 0
        ? (() => {
            const itemLabels = wonItemIds.map((id) => {
              const meta = WHEEL_ITEM_METAS[id];
              return meta ? `"${meta.name}" (${meta.tierLabel})` : `"${id}"`;
            });
            return `🏮 Vòng quay Cô Bảy: 🎉 TRÚNG ${itemLabels.join(', ')}!${totalShells > 0 ? ` (+${totalShells.toLocaleString('vi-VN')} vỏ sò 🐚)` : ''}`;
          })()
        : `🏮 Vòng quay Cô Bảy: Kết quả quay${hits.length > 0 ? ` (x${hits.length})` : ''} ➔ Nhận +${totalShells.toLocaleString('vi-VN')} vỏ sò an ủi 🐚`;
    return {
      acted: true,
      msg,
    };
  }

  // 4. Watch for Halloween event toasts / announcements from server
  if (
    bn.hlwToast &&
    typeof bn.hlwToast.seq === 'number' &&
    bn.hlwToast.seq !== wharfWatchState.lastObservedHlwToastSeq
  ) {
    wharfWatchState.lastObservedHlwToastSeq = bn.hlwToast.seq;
    return {
      acted: true,
      msg: `🎃 Sự kiện: ${bn.hlwToast.text}`,
    };
  }

  return null;
}
