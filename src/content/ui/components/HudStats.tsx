import React, { useState, useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { AreaId } from '@/shared/types/config';
import { formatClock, formatGold } from '@/content/scheduler/dom-helpers';

interface HudStatsProps {
  snap: GameSnapshot | null;
  activeTab: AreaId;
}

export function HudStats({ snap, activeTab }: HudStatsProps) {
  // Realtime clock with continuous second updates for Bến Đò
  const [realtime, setRealtime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setRealtime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Nông Trại / Biển / Farmstay stats
  const isWharf = activeTab === 'benDo';

  const day = snap?.day ?? 1;
  const timeStr = typeof snap?.minutes === 'number' ? formatClock(snap.minutes) : '--:--';
  const goldStr = typeof snap?.gold === 'number' ? formatGold(snap.gold) : '--';
  const fullness = typeof snap?.fullness === 'number' ? `${Math.round(snap.fullness)}%` : '--';
  const hydration = typeof snap?.hydration === 'number' ? `${Math.round(snap.hydration)}%` : '--';
  const energy = typeof snap?.energy === 'number' ? `${Math.round(snap.energy)}%` : '--';

  // 2. Bến Đò stats
  const bn = snap?.benNet;
  const wallet = bn?.wallet;
  const shells = wallet?.shells ?? 0;
  const bait = wallet?.bait ?? 0;
  const tickets = wallet?.tickets ?? 0;
  const stamina = typeof wallet?.liveStamina === 'number' ? wallet.liveStamina : (wallet?.stamina ?? 0);
  const luck = typeof wallet?.luck === 'number' ? `${wallet.luck}%` : '0%';

  const dateRealtimeStr = realtime.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const timeRealtimeStr = realtime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const renderWharfAtmAlert = () => {
    const atmTargetTime = bn?.atm?.nextTime || bn?.atm?.reopen || 0;
    const nowMs = realtime.getTime();

    // 1. Target time in future or reached
    if (atmTargetTime > 0) {
      const diffMs = atmTargetTime - nowMs;
      if (diffMs > 0) {
        const diffMin = Math.floor(diffMs / 60000);
        const diffSec = Math.floor((diffMs % 60000) / 1000);
        const waitStr = diffMin > 0 ? `${diffMin} phút ${diffSec} giây` : `${diffSec} giây`;
        const timeStr = new Date(atmTargetTime).toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        return (
          <div
            className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-sans shadow-xs animate-in fade-in"
            title={`Cây ATM: Mở đổi lúc ${timeStr}`}
          >
            <span className="shrink-0">⏳</span>
            <span className="font-semibold truncate">
              Cây ATM: Mở đổi lúc {timeStr} (còn {waitStr})
            </span>
          </div>
        );
      }

      // Reached opening time
      return (
        <div
          className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-[10.5px] font-sans shadow-xs animate-in fade-in"
          title="Cây ATM đã đến giờ đổi tiền"
        >
          <span className="shrink-0">🏧</span>
          <span className="font-semibold truncate">
            Cây ATM: Đã đến giờ đổi tiền! Có thể ra rút tiền ngay
            {typeof bn?.atm?.left === 'number' && bn.atm.left > 0 ? ` (Hạn mức còn ${bn.atm.left.toLocaleString('vi-VN')}đ)` : ''}
          </span>
        </div>
      );
    }

    // 2. No target time, but ATM scanned and has quota info
    if (typeof bn?.atm?.left === 'number') {
      if (bn.atm.left > 0) {
        return (
          <div
            className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-100/90 border border-emerald-300 text-emerald-950 text-[10.5px] font-sans shadow-xs animate-in fade-in"
            title="Cây ATM sẵn sàng đổi tiền mặt"
          >
            <span className="shrink-0">🏧</span>
            <span className="font-semibold truncate">
              Cây ATM: Sẵn sàng đổi tiền mặt (Hạn mức còn {bn.atm.left.toLocaleString('vi-VN')}đ)
            </span>
          </div>
        );
      } else {
        return (
          <div
            className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-sans shadow-xs animate-in fade-in"
            title="Cây ATM hết hạn mức"
          >
            <span className="shrink-0">⏳</span>
            <span className="font-semibold truncate">Cây ATM: Hạn mức tiền giờ này đã hết, chờ giờ sau đổi tiếp</span>
          </div>
        );
      }
    }

    return null;
  };

  return (
    <div className="bg-slate-50 border-b border-slate-200/90 px-3 py-1.5 text-[11px] font-mono text-slate-700">
      {isWharf ? (
        /* Wharf (Bến Đò) Realtime Stats Bar */
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <span className="text-amber-800 font-bold" title="Thời gian thực tế">
              📅 {dateRealtimeStr}
            </span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700 font-bold tabular-nums">
              {timeRealtimeStr}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5" title="Số lượng vỏ sò">
              <span>🐚</span>
              <span className="text-amber-900 font-bold">
                {shells.toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="flex items-center gap-0.5" title="Số mồi câu">
              <span>🪱</span>
              <span className="text-emerald-800 font-semibold">
                {bait.toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="flex items-center gap-0.5" title="Vé vòng quay lồng đèn">
              <span>🎟️</span>
              <span className="text-rose-700 font-bold">
                {tickets.toLocaleString('vi-VN')}
              </span>
            </div>
            <div className="flex items-center gap-0.5" title="Sức lực bến đò">
              <span>⚡</span>
              <span className="text-amber-600 font-bold">
                {stamina}/100
              </span>
            </div>
            <div className="flex items-center gap-0.5" title="Chỉ số may mắn">
              <span>🍀</span>
              <span className="text-green-700 font-semibold">
                {luck}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Farm / Sea / Farmstay Stats Bar */
        <div className="flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <span className="text-amber-700">📅 Ngày {day}</span>
            <span className="text-slate-300">·</span>
            <span className="text-emerald-700">{timeStr}</span>
            <span className="text-slate-300">·</span>
            <span className="text-amber-800 font-bold">{goldStr}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1" title="Độ no">
              <span>🥖</span>
              <span className="text-orange-700 font-semibold">{fullness}</span>
            </div>
            <div className="flex items-center gap-1" title="Độ khát">
              <span>🥤</span>
              <span className="text-sky-700 font-semibold">{hydration}</span>
            </div>
            <div className="flex items-center gap-1" title="Năng lượng / Pin / Thể lực">
              <span>⚡</span>
              <span className="text-emerald-700 font-semibold">{energy}</span>
            </div>
          </div>
        </div>
      )}

      {isWharf ? (
        renderWharfAtmAlert()
      ) : (
        snap?.recentAlert && (
          <div
            className="mt-1.5 flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100/90 border border-amber-300 text-amber-950 text-[10.5px] font-sans shadow-xs animate-in fade-in"
            title={`Thông báo quan trọng: ${snap.recentAlert.text}`}
          >
            <span className="shrink-0">{snap.recentAlert.icon || '📢'}</span>
            <span className="font-semibold truncate">{snap.recentAlert.text}</span>
          </div>
        )
      )}
    </div>
  );
}
