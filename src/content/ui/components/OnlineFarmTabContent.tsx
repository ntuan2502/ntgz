import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { AlluvialLandCard } from './wharf-cards/AlluvialLandCard';
import { MonitorTabId } from './monitor/MonitorHub';
import { Button } from '@/components/ui/button';
import { BookOpen, Trophy } from 'lucide-react';

interface OnlineFarmTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  onOpenMonitorTab?: (tab: MonitorTabId) => void;
}

export function OnlineFarmTabContent({
  config,
  onUpdateConfig,
  onOpenMonitorTab,
}: OnlineFarmTabContentProps) {
  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-2 text-xs">
      {/* Quick Action Navigation Bar */}
      <div className="flex items-center gap-1.5 p-1.5 bg-emerald-50/80 border border-emerald-200/90 rounded-xl shadow-2xs">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <span className="text-sm">🌾</span>
          <div className="min-w-0">
            <span className="font-bold text-[11px] text-emerald-900 block truncate">
              Đất Bãi Phù Sa &amp; Chợ Bãi
            </span>
            <span className="text-[10px] text-emerald-700/80 block truncate">
              Khu nông trại trực tuyến (Multiplayer)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenMonitorTab?.('alluvial')}
            className="h-7 px-2 text-[10px] font-semibold bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100/70 cursor-pointer shadow-2xs"
            title="Mở Sổ Đất Bãi Phù Sa"
          >
            <BookOpen className="h-3 w-3 mr-1 text-emerald-600" />
            Sổ Đất Bãi
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenMonitorTab?.('board')}
            className="h-7 px-2 text-[10px] font-semibold bg-white border-amber-200 text-amber-800 hover:bg-amber-100/70 cursor-pointer shadow-2xs"
            title="Mở Bảng Vàng Bãi Phù Sa"
          >
            <Trophy className="h-3 w-3 mr-1 text-amber-600" />
            Bảng Vàng
          </Button>
        </div>
      </div>

      {/* Main Alluvial Land Card */}
      <div className="rounded-xl border border-slate-200/90 bg-white shadow-2xs p-3">
        <AlluvialLandCard
          config={config}
          updateField={updateField}
          onUpdateConfig={onUpdateConfig}
        />
      </div>
    </div>
  );
}
