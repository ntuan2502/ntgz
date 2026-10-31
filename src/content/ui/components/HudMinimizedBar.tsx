import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { AREA_META } from '@/shared/constants/default-config';
import { Play, Pause, Maximize2 } from 'lucide-react';

interface HudMinimizedBarProps {
  config: AppConfig;
  onToggleTabAuto: () => void;
  onExpand: () => void;
}

export function HudMinimizedBar({
  config,
  onToggleTabAuto,
  onExpand,
}: HudMinimizedBarProps) {
  const isRunning = config.running;
  const currentArea = AREA_META[config.activeTab]?.name || 'Tab này';

  return (
    <div className="flex items-center gap-1.5 p-1 select-none">
      {/* Nút 1: Pause / Play Auto Tab Này */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onToggleTabAuto}
        title={
          isRunning
            ? `Tạm dừng Auto ${currentArea} (Tab này)`
            : `Chạy Auto ${currentArea} (Tab này)`
        }
        className={`flex h-8 items-center gap-1.5 px-3 rounded-xl font-semibold text-xs transition-all active:scale-[0.97] cursor-pointer shadow-xs ${
          isRunning
            ? 'bg-red-600 hover:bg-red-700 text-white border border-red-700/80 ring-1 ring-red-500/20'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-700/80 ring-1 ring-emerald-500/20'
        }`}
      >
        {isRunning ? (
          <>
            <Pause className="h-3.5 w-3.5 fill-current shrink-0" />
            <span className="whitespace-nowrap">Dừng {currentArea}</span>
          </>
        ) : (
          <>
            <Play className="h-3.5 w-3.5 fill-current shrink-0" />
            <span className="whitespace-nowrap">Chạy {currentArea}</span>
          </>
        )}
      </button>

      {/* Nút 2: Mở Rộng Lại Tool */}
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={onExpand}
        title="Mở rộng bảng điều khiển"
        className="flex h-8 items-center gap-1.5 px-2.5 rounded-xl font-medium text-xs bg-slate-100 hover:bg-slate-200 active:scale-[0.97] text-slate-700 border border-slate-200/90 transition-all cursor-pointer shadow-2xs whitespace-nowrap"
      >
        <Maximize2 className="h-3.5 w-3.5 text-slate-600 shrink-0" />
        <span>Mở rộng</span>
      </button>
    </div>
  );
}
