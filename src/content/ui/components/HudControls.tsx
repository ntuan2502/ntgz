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
    <div className="space-y-2 border-b border-slate-800/80 bg-slate-900/60 p-2 text-xs">
      {/* Auto Action Buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        <Button
          variant={isRunningAll ? 'destructive' : 'default'}
          size="sm"
          className="w-full justify-center font-bold text-[11px] shadow-sm"
          onClick={onToggleAll}
        >
          {isRunningAll ? (
            <>
              <Square className="h-3 w-3 fill-current mr-1" />
              DỪNG AUTO TẤT CẢ
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current mr-1" />
              ▶️ AUTO TẤT CẢ (Alt+A)
            </>
          )}
        </Button>

        <Button
          variant={isRunningTab ? 'destructive' : 'secondary'}
          size="sm"
          className="w-full justify-center font-bold text-[11px] border border-slate-700/60 shadow-sm"
          onClick={onToggleTab}
        >
          {isRunningTab ? (
            <>
              <Square className="h-3 w-3 fill-current mr-1" />
              DỪNG AUTO TAB
            </>
          ) : (
            <>
              <Play className="h-3 w-3 fill-current mr-1" />
              🎯 CHỈ AUTO {AREA_META[activeTab]?.name?.toUpperCase() || 'TAB NÀY'}
            </>
          )}
        </Button>
      </div>

      {/* Sliders and Drawer Toggle */}
      <div className="flex items-center justify-between gap-2 pt-0.5">
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>Tốc độ delay mỗi lệnh:</span>
            <span className="font-mono text-emerald-400 font-semibold">{config.taskDelayMs} ms</span>
          </div>
          <Slider
            value={[config.taskDelayMs]}
            min={400}
            max={4000}
            step={100}
            onValueChange={handleDelayChange}
            className="w-full"
          />
        </div>

        <Button
          variant="outline"
          size="xs"
          className={`border-slate-700 text-[10px] whitespace-nowrap self-end ${
            isOrderDrawerOpen ? 'bg-slate-800 text-emerald-400 border-emerald-500/40' : 'bg-slate-900'
          }`}
          onClick={onToggleOrderDrawer}
        >
          <ListOrdered className="h-3 w-3 mr-1" />
          Thứ tự khu
        </Button>
      </div>

      {/* Area Order Collapsible Drawer */}
      {isOrderDrawerOpen && (
        <div className="mt-1 rounded-md border border-slate-800 bg-slate-950/80 p-2 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium border-b border-slate-800/80 pb-1">
            <span>Thứ tự thực hiện Auto:</span>
            <div className="flex items-center gap-1">
              <span>Đổi khu sau</span>
              <input
                type="number"
                min={1}
                max={50}
                value={config.fishingSwitchCount}
                onChange={handleFishingSwitchChange}
                className="w-8 rounded bg-slate-900 px-1 py-0.5 text-center text-[10px] text-emerald-400 border border-slate-700 font-mono"
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
                  className="flex items-center justify-between rounded bg-slate-900/90 px-2 py-1 border border-slate-800/60 text-[11px]"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                    <span className={isEnabled ? 'text-slate-200' : 'text-slate-500 line-through'}>
                      {meta?.name || areaId}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="iconSm"
                        disabled={idx === 0}
                        className="h-5 w-5 text-slate-400 hover:text-white"
                        onClick={() => handleMoveArea(idx, 'up')}
                      >
                        <ChevronUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="iconSm"
                        disabled={idx === config.areaOrder.length - 1}
                        className="h-5 w-5 text-slate-400 hover:text-white"
                        onClick={() => handleMoveArea(idx, 'down')}
                      >
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                    </div>

                    <Switch
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
