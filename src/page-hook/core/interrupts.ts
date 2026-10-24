import { stores } from './engine-access';

export function dismissInterruptsIfNeeded(cfg?: any): { acted: boolean; msg: string } | null {
  const m = stores.main?.getState();
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
    const stAfter = stores.main.getState();
    if (stAfter.call) {
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
