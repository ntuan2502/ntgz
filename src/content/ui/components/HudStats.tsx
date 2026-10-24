import React from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { formatClock, formatGold } from '@/content/scheduler/dom-helpers';

interface HudStatsProps {
  snap: GameSnapshot | null;
}

export function HudStats({ snap }: HudStatsProps) {
  const day = snap?.day ?? 1;
  const timeStr = typeof snap?.minutes === 'number' ? formatClock(snap.minutes) : '--:--';
  const goldStr = typeof snap?.gold === 'number' ? formatGold(snap.gold) : '--';
  const fullness = typeof snap?.fullness === 'number' ? `${Math.round(snap.fullness)}%` : '--';
  const hydration = typeof snap?.hydration === 'number' ? `${Math.round(snap.hydration)}%` : '--';
  const energy = typeof snap?.energy === 'number' ? `${Math.round(snap.energy)}%` : '--';

  let extraNote = '';
  if (snap?.screen === 'sea') {
    extraNote = snap.sea?.bite ? '🎣 Cá cắn câu!' : snap.sea?.phase ? `🌊 Biển: ${snap.sea.phase}` : '🌊 Biển';
  } else if (snap?.screen === 'benDo') {
    const stam = snap.benWallet?.liveStamina ?? snap.benWallet?.stamina;
    extraNote = typeof stam === 'number' ? `🛶 Sức: ${stam}` : '🛶 Bến đò';
  } else if (snap?.sleeping) {
    extraNote = '😴 Đang ngủ';
  }

  return (
    <div className="bg-slate-900/90 border-b border-slate-800/80 px-2.5 py-1.5 text-[11px] font-mono text-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex items-center gap-1 text-slate-300">
          <span className="text-amber-400 font-semibold">📅 Ngày {day}</span>
          <span className="text-slate-500">·</span>
          <span className="text-emerald-400 font-semibold">{timeStr}</span>
          <span className="text-slate-500">·</span>
          <span className="text-yellow-400 font-bold">{goldStr}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1" title="Độ no">
            <span>🥖</span>
            <span className="text-orange-300 font-medium">{fullness}</span>
          </div>
          <div className="flex items-center gap-1" title="Độ khát">
            <span>🥤</span>
            <span className="text-cyan-300 font-medium">{hydration}</span>
          </div>
          <div className="flex items-center gap-1" title="Năng lượng / Pin / Thể lực">
            <span>⚡</span>
            <span className="text-emerald-300 font-medium">{energy}</span>
          </div>
          {extraNote && (
            <span className="rounded bg-slate-800 px-1 py-0.5 text-[10px] text-amber-300 border border-slate-700">
              {extraNote}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
