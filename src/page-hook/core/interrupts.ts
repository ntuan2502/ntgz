import { stores } from './engine-access';
import { ImportantAlert } from '../../shared/types/game-state';

let activeImportantAlert: ImportantAlert | null = null;

export function getActiveImportantAlert(): ImportantAlert | null {
  return activeImportantAlert;
}

function recordImportantAlertIfNeeded(raw: unknown, idHint?: string): void {
  if (!raw || typeof raw !== 'object') return;
  const rec = raw as Record<string, unknown>;
  const text = extractNotificationText(raw);
  const id = typeof rec.id === 'string' ? rec.id : idHint || '';
  const lower = (text + ' ' + id).toLowerCase();

  let icon = '';
  if (id.includes('storm') || lower.includes('bão')) {
    icon = '⛈️ Bão';
  } else if (id.includes('gold') || lower.includes('vàng')) {
    icon = '🪙 Giá vàng';
  } else if (id.includes('fish') || lower.includes('cá biển')) {
    icon = '🐟 Biển';
  } else if (id.includes('buffalo') || lower.includes('dịch') || lower.includes('bệnh')) {
    icon = '🐃 Gia súc';
  } else if (id.includes('hui') || lower.includes('hụi')) {
    icon = '🐷 Hụi Dì Bảy';
  }

  if (icon && text) {
    const m = stores.main?.getState();
    activeImportantAlert = {
      id: id || 'alert',
      text: `${icon}: ${text}`,
      icon: icon.split(' ')[0],
      day: m?.day,
    };
  }
}

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

function extractNotificationText(obj: unknown): string {
  if (!obj) return '';
  if (typeof obj === 'string') return obj.trim();
  if (typeof obj === 'object') {
    const rec = obj as Record<string, unknown>;
    const title = typeof rec.title === 'string' ? rec.title.trim() : '';
    const body =
      typeof rec.text === 'string'
        ? rec.text.trim()
        : typeof rec.msg === 'string'
          ? rec.msg.trim()
          : typeof rec.content === 'string'
            ? rec.content.trim()
            : typeof rec.body === 'string'
              ? rec.body.trim()
              : typeof rec.desc === 'string'
                ? rec.desc.trim()
                : '';
    if (title && body) return `${title}: ${body}`;
    if (title) return title;
    if (body) return body;
    const topic = typeof rec.topic === 'string' ? rec.topic.trim() : '';
    if (topic) return `Chủ đề: ${topic}`;
  }
  return '';
}

export function dismissInterruptsIfNeeded(cfg?: { autoDismissInterrupts?: boolean }): { acted: boolean; msg: string } | null {
  const m = stores.main?.getState() as InterruptState | undefined;
  if (!m) return null;

  if (cfg && cfg.autoDismissInterrupts === false) return null;

  if (m.phone) {
    recordImportantAlertIfNeeded(m.phone, 'phone');
    const info = extractNotificationText(m.phone);
    m.closePhone?.();
    const detailMsg = info ? `📱 [Điện thoại]: "${info}"` : '📱 [Điện thoại]: Có thông báo mới';
    return { acted: true, msg: detailMsg };
  }

  if (m.announcement) {
    recordImportantAlertIfNeeded(m.announcement, 'announcement');
    const info = extractNotificationText(m.announcement);
    m.answerAnnouncement?.(false);
    const detailMsg = info ? `📢 [Loa xã]: "${info}"` : '📢 [Loa xã]: Thông báo phát thanh mới';
    return { acted: true, msg: detailMsg };
  }

  if (m.tip) {
    const info = extractNotificationText(m.tip);
    m.answerTip?.(false);
    return { acted: true, msg: info ? `💡 [Mẹo nhanh]: ${info}` : '💡 Đã đóng hướng dẫn nhanh' };
  }

  if (m.call) {
    if (m.call.stage === 'ringing') {
      m.acceptCall?.();
    }
    const stAfter = stores.main?.getState() as InterruptState | undefined;
    if (stAfter?.call) {
      const fromName =
        stAfter.call.from === 'noi'
          ? 'Bà Nội'
          : stAfter.call.from === 'sau'
            ? 'Ông Sáu'
            : stAfter.call.from || 'Người gọi';
      const callText = extractNotificationText(stAfter.call);
      const detailInfo = callText ? ` - "${callText}"` : '';

      if (stAfter.call.from === 'noi') {
        stAfter.hangUpGrandma?.('bye');
        return { acted: true, msg: `👵 [Điện thoại Bà Nội]: Đã nghe máy & nhận quà${detailInfo}` };
      }
      if (stAfter.call.from === 'sau' && stAfter.call.topic === 'sea') {
        stAfter.openSea?.();
        stAfter.endCall?.('ok');
        return { acted: true, msg: `📞 [Điện thoại Ông Sáu]: Mở đường ra Biển${detailInfo}` };
      }
      if (stAfter.call.from === 'sau' && !stAfter.uncleBa?.met) {
        stAfter.answerSau?.(false);
      }
      stAfter.endCall?.('ok');
      return { acted: true, msg: `📞 [Điện thoại ${fromName}]: Đã nghe cuộc gọi${detailInfo}` };
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

  if (m.missedOrder) {
    m.ackMissedOrder?.();
    return { acted: true, msg: '⚠️ [Chị Na]: Đã bỏ lỡ đơn giao hàng hôm nay!' };
  }
  if (m.dairy?.news) {
    const n = extractNotificationText(m.dairy.news);
    m.ackDairyNews?.();
    return { acted: true, msg: n ? `🐄 [Bò sữa]: ${n}` : '🐄 [Bò sữa]: Có thông báo mới về đàn bò!' };
  }
  if (m.buffalo?.news) {
    const n = extractNotificationText(m.buffalo.news);
    m.ackBuffaloNews?.();
    return { acted: true, msg: n ? `🐃 [Trâu]: ${n}` : '🐃 [Trâu]: Có thông báo mới về Trâu!' };
  }
  if (m.henNews) {
    const n = extractNotificationText(m.henNews);
    m.ackHenNews?.();
    return { acted: true, msg: n ? `🐔 [Chuồng gà]: ${n}` : '🐔 [Chuồng gà]: Có thông báo mới về đàn gà!' };
  }
  if (m.pond?.news) {
    const n = extractNotificationText(m.pond.news);
    m.ackPondNews?.();
    return { acted: true, msg: n ? `🐟 [Ao cá]: ${n}` : '🐟 [Ao cá]: Có thông báo mới về Ao cá!' };
  }
  if (m.pets?.news) {
    const n = extractNotificationText(m.pets.news);
    m.ackPetNews?.();
    return { acted: true, msg: n ? `🐕 [Thú cưng]: ${n}` : '🐕 [Thú cưng]: Có tin mới về thú cưng!' };
  }

  return null;
}
