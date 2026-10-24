import { stores } from './engine-access';

interface InterruptState {
  phone?: unknown;
  closePhone?: () => void;
  announcement?: unknown;
  answerAnnouncement?: (ans: boolean) => void;
  tip?: unknown;
  answerTip?: (ans: boolean) => void;
  call?: {
    stage?: string;
    from?: string;
    topic?: string;
    [key: string]: unknown;
  };
  acceptCall?: () => void;
  hangUpGrandma?: (msg: string) => void;
  openSea?: () => void;
  endCall?: (msg: string) => void;
  uncleBa?: { met?: boolean };
  answerSau?: (ans: boolean) => void;
  panel?: string | null;
  finishChapterOne?: () => void;
  finishChapter?: () => void;
  setPanel?: (p: string | null) => void;
  pond?: { news?: unknown };
  ackPondNews?: () => void;
  buffalo?: { news?: unknown };
  ackBuffaloNews?: () => void;
  dairy?: { news?: unknown };
  ackDairyNews?: () => void;
  henNews?: unknown;
  ackHenNews?: () => void;
  pets?: { news?: unknown };
  ackPetNews?: () => void;
  missedOrder?: unknown;
  ackMissedOrder?: () => void;
  [key: string]: unknown;
}

export function dismissInterruptsIfNeeded(cfg?: { autoDismissInterrupts?: boolean }): { acted: boolean; msg: string } | null {
  const m = stores.main?.getState() as InterruptState | undefined;
  if (!m) return null;

  if (cfg && cfg.autoDismissInterrupts === false) return null;

  if (m.phone) {
    m.closePhone?.();
    return { acted: true, msg: '📱 Đã đóng thông báo điện thoại' };
  }
  if (m.announcement) {
    m.answerAnnouncement?.(false);
    return { acted: true, msg: '📢 Đã tắt thông báo Loa phường' };
  }
  if (m.tip) {
    m.answerTip?.(false);
    return { acted: true, msg: '💡 Đã đóng hướng dẫn nhanh' };
  }
  if (m.call) {
    if (m.call.stage === 'ringing') {
      m.acceptCall?.();
    }
    const stAfter = stores.main?.getState() as InterruptState | undefined;
    if (stAfter?.call) {
      if (stAfter.call.from === 'noi') {
        stAfter.hangUpGrandma?.('bye');
        return { acted: true, msg: '👵 Đã nghe điện thoại Bà Nội & nhận quà' };
      }
      if (stAfter.call.from === 'sau' && stAfter.call.topic === 'sea') {
        stAfter.openSea?.();
        stAfter.endCall?.('ok');
        return { acted: true, msg: '📞 Đã nghe điện Ông Sáu mở đường ra Biển' };
      }
      if (stAfter.call.from === 'sau' && !stAfter.uncleBa?.met) {
        stAfter.answerSau?.(false);
      }
      stAfter.endCall?.('ok');
      return { acted: true, msg: '📞 Đã nghe xong cuộc gọi điện thoại' };
    }
  }
  if (m.panel === 'chapterOne') {
    m.finishChapterOne?.();
    return { acted: true, msg: '📖 Đã xác nhận qua Chương 1' };
  }
  if (m.panel === 'chapterEnd') {
    m.finishChapter?.();
    return { acted: true, msg: '📖 Đã hoàn thành chương Sổ tay Ông Năm' };
  }
  if (m.panel === 'notebook') {
    m.setPanel?.(null);
    return { acted: true, msg: '📔 Đã đóng trang Sổ tay Ông Năm' };
  }

  if (m.pond?.news) m.ackPondNews?.();
  if (m.buffalo?.news) m.ackBuffaloNews?.();
  if (m.dairy?.news) m.ackDairyNews?.();
  if (m.henNews) m.ackHenNews?.();
  if (m.pets?.news) m.ackPetNews?.();
  if (m.missedOrder) m.ackMissedOrder?.();

  return null;
}
