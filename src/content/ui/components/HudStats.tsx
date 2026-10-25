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

  return (
    <div className="bg-slate-50 border-b border-slate-200/90 px-3 py-1.5 text-[11px] font-mono text-slate-700">
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
    </div>
  );
}
