import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { Button } from '@/components/ui/button';
import { AREA_META } from '@/shared/constants/default-config';
import { Play, Square } from 'lucide-react';

interface HudControlsProps {
  config: AppConfig;
  activeTab: AreaId;
  onToggleAll: () => void;
  onToggleTab: () => void;
}

export function HudControls({
  config,
  activeTab,
  onToggleAll,
  onToggleTab,
}: HudControlsProps) {
  const isRunningAll = config.running && config.runMode === 'all';
  const isRunningTab = config.running && config.runMode === 'tab';

  return (
    <div className="border-b border-slate-200/90 bg-slate-50/70 p-2 text-xs transition-colors">
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
    </div>
  );
}
