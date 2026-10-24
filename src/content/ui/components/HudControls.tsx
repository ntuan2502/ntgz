import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { AREA_META } from '@/shared/constants/default-config';
import { Play, Square, ListOrdered, ChevronUp, ChevronDown } from 'lucide-react';

interface HudControlsProps {
  config: AppConfig;
  activeTab: AreaId;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  onToggleAll: () => void;
  onToggleTab: () => void;
  isOrderDrawerOpen: boolean;
  onToggleOrderDrawer: () => void;
}

export function HudControls({
  config,
  activeTab,
  onUpdateConfig,
  onToggleAll,
  onToggleTab,
  isOrderDrawerOpen,
  onToggleOrderDrawer,
}: HudControlsProps) {
  const isRunningAll = config.running && config.runMode === 'all';
  const isRunningTab = config.running && config.runMode === 'tab';

  const handleDelayChange = (vals: number[]) => {
    const val = vals[0] ?? 1200;
    onUpdateConfig((prev) => ({ ...prev, taskDelayMs: val }));
  };

  const handleFishingSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(1, Math.min(100, Number(e.target.value) || 10));
    onUpdateConfig((prev) => ({ ...prev, fishingSwitchCount: val }));
  };

  const handleMoveArea = (index: number, direction: 'up' | 'down') => {
    onUpdateConfig((prev) => {
      const order = [...prev.areaOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      const targetItem = order[targetIndex];
      if (temp && targetItem) {
        order[index] = targetItem;
        order[targetIndex] = temp;
      }
      return { ...prev, areaOrder: order };
    });
  };

  const handleToggleAreaEnabled = (id: AreaId, checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        [id]: checked,
      },
    }));
  };

  return (
    <div className="space-y-2 border-b border-slate-200/90 bg-slate-50/70 p-2.5 text-xs transition-colors">
      {/* Auto Action Buttons */}
      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={isRunningAll ? 'destructive' : 'default'}
          size="sm"
          className="w-full justify-center font-bold text-[11px] rounded-xl h-8.5 shadow-xs active:scale-[0.98] bg-emerald-600 hover:bg-emerald-700 text-white"
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
          className={`w-full justify-center font-bold text-[11px] rounded-xl h-8.5 border shadow-xs active:scale-[0.98] ${
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

      {/* Sliders and Drawer Toggle */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-600">
            <span>Tốc độ delay mỗi lệnh:</span>
            <span className="font-mono text-emerald-700 font-bold">{config.taskDelayMs} ms</span>
          </div>
          <Slider
            value={[config.taskDelayMs]}
            min={300}
            max={3500}
            step={100}
            onValueChange={handleDelayChange}
            className="w-full"
          />
        </div>

        <Button
          variant="outline"
          size="xs"
          className={`border-slate-200 text-[10px] rounded-lg whitespace-nowrap self-end h-6 px-2 shadow-xs ${
            isOrderDrawerOpen
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-semibold'
              : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
          onClick={onToggleOrderDrawer}
        >
          <ListOrdered className="h-3 w-3 mr-1" />
          Thứ tự khu
        </Button>
      </div>

      {/* Area Order Collapsible Drawer */}
      {isOrderDrawerOpen && (
        <div className="mt-1.5 rounded-xl border border-slate-200 bg-white p-2.5 space-y-2 shadow-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-600 font-medium border-b border-slate-100 pb-1.5">
            <span>Thứ tự chạy Auto các khu:</span>
            <div className="flex items-center gap-1">
              <span>Đổi khu sau</span>
              <input
                type="number"
                min={1}
                max={50}
                value={config.fishingSwitchCount}
                onChange={handleFishingSwitchChange}
                className="w-9 rounded-md bg-slate-50 px-1 py-0.5 text-center text-[10px] text-emerald-700 font-bold border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span>con cá</span>
            </div>
          </div>

          <div className="space-y-1">
            {config.areaOrder.map((areaId, idx) => {
              const meta = AREA_META[areaId];
              const isEnabled = config.areaEnabled[areaId] !== false;
              return (
                <div
                  key={areaId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-200/80 text-[11px]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">#{idx + 1}</span>
                    <span className={isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                      {meta?.name || areaId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === 0}
                        className="h-5 w-5 text-slate-500 hover:text-slate-900"
                        onClick={() => handleMoveArea(idx, 'up')}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === config.areaOrder.length - 1}
                        className="h-5 w-5 text-slate-500 hover:text-slate-900"
                        onClick={() => handleMoveArea(idx, 'down')}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <Switch
                      size="sm"
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleAreaEnabled(areaId, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
