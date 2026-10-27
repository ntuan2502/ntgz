import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { Button } from '@/components/ui/button';
import { AREA_META } from '@/shared/constants/default-config';
import { Play, Square, Settings } from 'lucide-react';

interface HudControlsProps {
  config: AppConfig;
  activeTab: AreaId;
  onToggleAll: () => void;
  onToggleTab: () => void;
  onOpenSettings?: () => void;
  onToggleMonitor?: () => void;
  isMonitorActive?: boolean;
}

export function HudControls({
  config,
  activeTab,
  onToggleAll,
  onToggleTab,
  onOpenSettings,
  onToggleMonitor,
  isMonitorActive,
}: HudControlsProps) {
  const isRunningAll = config.running && config.runMode === 'all';
  const isRunningTab = config.running && config.runMode === 'tab';

  return (
    <div className="space-y-1.5 border-b border-slate-200/90 bg-slate-50/70 p-2 text-xs transition-colors">
      {/* Auto Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={isRunningAll ? 'destructive' : 'default'}
          size="sm"
          className="w-full justify-center font-bold text-[11px] rounded-xl h-8.5 shadow-xs active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          onClick={onToggleAll}
        >
          {isRunningAll ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current mr-1.5" />
              DỪNG AUTO TẤT CẢ
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current mr-1.5" />
              ▶️ TẤT CẢ (Alt+A)
            </>
          )}
        </Button>

        <Button
          variant={isRunningTab ? 'destructive' : 'outline'}
          size="sm"
          className={`w-full justify-center font-bold text-[11px] rounded-xl h-8.5 border shadow-xs active:scale-[0.98] cursor-pointer ${
            isRunningTab
              ? 'bg-red-600 hover:bg-red-700 text-white border-red-700'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
          }`}
          onClick={onToggleTab}
        >
          {isRunningTab ? (
            <>
              <Square className="h-3.5 w-3.5 fill-current mr-1.5" />
              DỪNG TAB NÀY
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current mr-1.5 text-emerald-600" />
              🎯 CHỈ {AREA_META[activeTab]?.name?.toUpperCase() || 'TAB NÀY'}
            </>
          )}
        </Button>
      </div>

      {/* Quick Settings & Tools Bar */}
      <div className="flex items-center justify-between px-1 text-[10px] text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/60">
            ⏱️ {config.taskDelayMs}ms
          </span>
          <span className="text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200/60">
            {config.showFullActions ? '👁️ UI Gốc' : '🕶️ Chạy ngầm'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleMonitor && (
            <button
              type="button"
              onClick={onToggleMonitor}
              className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium border transition-colors cursor-pointer shadow-2xs ${
                isMonitorActive
                  ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                  : 'bg-white text-emerald-800 border-emerald-200/80 hover:bg-emerald-50'
              }`}
              title="Mở Trung tâm Giám sát Realtime (Kho, Mùa vụ, Tiết kiệm, Gia súc, Dế)"
            >
              <span>🎒</span>
              <span>Giám sát</span>
            </button>
          )}

          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
              title="Mở Trang Cài đặt hệ thống"
            >
              <Settings className="h-3 w-3 text-slate-500" />
              <span>Cài đặt</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
