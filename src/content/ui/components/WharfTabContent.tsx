import React from 'react';
import { AppConfig, WharfSubAreaId } from '@/shared/types/config';
import { WHARF_SUBAREA_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HudSelect } from './HudSelect';
import { MonitorTabId } from './monitor/MonitorHub';
import {
  PACK_FOOD_SELECT_OPTIONS,
  DI_TAM_FOOD_SELECT_OPTIONS,
} from '@/shared/constants/wharf-catalog';
import { FishingCard } from './wharf-cards/FishingCard';
import { CricketBossCard } from './wharf-cards/CricketBossCard';
import { CricketHuntCard } from './wharf-cards/CricketHuntCard';
import { EntertainmentCard } from './wharf-cards/EntertainmentCard';
import { AlluvialLandCard } from './wharf-cards/AlluvialLandCard';

interface WharfTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  onOpenMonitorTab?: (tab: MonitorTabId) => void;
}

export function WharfTabContent({ config, onUpdateConfig, onOpenMonitorTab: _onOpenMonitorTab }: WharfTabContentProps) {
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000);
  const vnHour = vnDate.getUTCHours();
  const isNightHuntOpen = vnHour >= 18 || vnHour < 5;

  const subOrder: WharfSubAreaId[] = ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'];

  const handleToggleSubEnabled = (subId: WharfSubAreaId, checked: boolean) => {
    onUpdateConfig((prev) => {
      const nextEnabled = {
        ...(prev.benSubEnabled || {}),
        [subId]: checked,
      };

      // Continuous task mutual exclusion: fishing vs cricket hunt
      if (checked) {
        if (subId === 'fishing') {
          nextEnabled.cricketHunt = false;
        } else if (subId === 'cricketHunt') {
          if (!isNightHuntOpen) return prev; // Cannot enable cricket hunt during daytime
          nextEnabled.fishing = false;
        }
      }

      return {
        ...prev,
        benSubEnabled: nextEnabled,
      };
    });
  };

  const handleToggleCollapse = (subId: WharfSubAreaId) => {
    onUpdateConfig((prev) => ({
      ...prev,
      benSubCollapsed: {
        ...(prev.benSubCollapsed || {}),
        [subId]: !prev.benSubCollapsed?.[subId],
      },
    }));
  };

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderSubCardBody = (subId: WharfSubAreaId) => {
    switch (subId) {
      case 'fishing':
        return <FishingCard config={config} updateField={updateField} />;
      case 'cricketBoss':
        return <CricketBossCard config={config} updateField={updateField} />;
      case 'cricketHunt':
        return (
          <CricketHuntCard
            config={config}
            isNightHuntOpen={isNightHuntOpen}
            vnHour={vnHour}
            updateField={updateField}
          />
        );
      case 'entertainment':
        return <EntertainmentCard config={config} updateField={updateField} />;
      case 'alluvialLand':
        return <AlluvialLandCard config={config} updateField={updateField} onUpdateConfig={onUpdateConfig} />;
      default:
        return null;
    }
  };

  const isStaminaCollapsed = Boolean(config.benStaminaCollapsed);
  const isStaminaEnabled = config.benAutoRecoverStamina !== false;

  return (
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      {/* ⚡ Hồi Phục Thể Lực Bến Đò (Dùng chung cho cả Câu Cá & Bắt Dế) */}
      <div
        className={`rounded-xl border bg-white shadow-xs transition-all ${
          isStaminaEnabled ? 'border-amber-200/90' : 'border-slate-200/60 opacity-60'
        }`}
      >
        <div
          className={`flex items-center justify-between px-3 py-2 select-none hover:bg-amber-50/50 cursor-pointer ${
            isStaminaCollapsed ? 'rounded-xl' : 'rounded-t-xl'
          }`}
          onClick={() => updateField('benStaminaCollapsed', !isStaminaCollapsed)}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-amber-500">
              {isStaminaCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </span>
            <span className="shrink-0 text-sm">⚡</span>
            <div className="min-w-0">
              <span className="font-semibold text-xs text-slate-800 block truncate">
                Hồi phục Thể Lực Bến Đò
              </span>
              <span className="block text-[10px] text-amber-700 font-medium truncate">
                Tự ăn uống hồi Sức (túi đồ / Quán Dì Tám)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <Switch
              size="sm"
              checked={isStaminaEnabled}
              onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
              title="Bật/Tắt tự động hồi phục thể lực Bến Đò"
            />
          </div>
        </div>

        {!isStaminaCollapsed && (
          <div className="p-3 border-t border-amber-100 bg-amber-50/20 rounded-b-xl space-y-2 text-[11px]">
            {isStaminaEnabled ? (
              <>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0 font-medium">Ưu tiên hồi phục:</span>
                  <HudSelect
                    value={config.benStaminaPriority || 'bag'}
                    onValueChange={(val) => updateField('benStaminaPriority', val as 'bag' | 'stall')}
                    options={[
                      { value: 'bag', label: '🎒 Ăn đồ trong túi (ba lô)' },
                      { value: 'stall', label: '🍲 Ăn món ở Quán Dì Tám' },
                    ]}
                  />
                </div>

                {(config.benStaminaPriority || 'bag') === 'bag' ? (
                  <>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-600 shrink-0">Món mua dự trữ khi hết:</span>
                      <HudSelect
                        value={config.benPackFoodItem || 'banhTet'}
                        onValueChange={(val) => updateField('benPackFoodItem', val)}
                        options={PACK_FOOD_SELECT_OPTIONS}
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-600 shrink-0">Số lượng mua tối đa (1-12):</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={config.benPackFoodStock ?? 12}
                          onChange={(e) => {
                            const val = Math.max(1, Math.min(12, Number(e.target.value) || 12));
                            updateField('benPackFoodStock', val);
                          }}
                          className="w-14 h-6 text-center rounded border border-slate-300 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[10px] text-slate-500">món</span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Món ăn tại quán:</span>
                    <HudSelect
                      value={config.benPreferFood || 'lauMam'}
                      onValueChange={(val) => updateField('benPreferFood', val)}
                      options={DI_TAM_FOOD_SELECT_OPTIONS}
                    />
                  </div>
                )}

                <p className="text-[10px] text-slate-500 italic">
                  {(config.benStaminaPriority || 'bag') === 'bag'
                    ? '💡 Tự động ăn thức ăn trong ba lô trước; khi hết thức ăn sẽ tự ghé Quán Dì Tám mua dự trữ (tối đa 12 món).'
                    : '💡 Tự động ghé Quán Dì Tám ăn món đã chọn; nếu thiếu vỏ sò sẽ ăn đồ dự phòng trong ba lô.'}
                </p>
              </>
            ) : (
              <p className="text-[10px] text-slate-400 italic">
                Đang tắt tự động hồi phục thể lực. Nhân vật sẽ dừng hoạt động khi hết sức.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sub-areas list */}
      <div className="space-y-2 pt-0.5">
        {subOrder.map((subId) => {
          const meta = WHARF_SUBAREA_META[subId];
          const isCollapsed = Boolean(config.benSubCollapsed?.[subId]);
          const isEnabled = config.benSubEnabled?.[subId] !== false;

          return (
            <div
              key={subId}
              className={`rounded-xl border bg-white shadow-xs transition-all ${
                isEnabled ? 'border-slate-200' : 'border-slate-200/60 opacity-60'
              }`}
            >
              <div
                className="flex items-center justify-between px-3 py-2 select-none hover:bg-slate-50 rounded-t-xl cursor-pointer"
                onClick={() => handleToggleCollapse(subId)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {meta?.name || subId}
                  </span>
                  {subId === 'cricketHunt' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ml-1 ${
                        isNightHuntOpen
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                      title={isNightHuntOpen ? 'Giờ săn dế đêm (18h-5h)' : 'Ban ngày dế đang ngủ. Giờ săn mở lúc 18h00 tối.'}
                    >
                      {isNightHuntOpen ? '🌙 Đang mở (18h-5h)' : '☀️ Dế ngủ'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    size="sm"
                    disabled={subId === 'cricketHunt' && !isNightHuntOpen}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleSubEnabled(subId, checked)}
                    title={subId === 'cricketHunt' && !isNightHuntOpen ? 'Chỉ mở bắt dế vào ban đêm (18h-5h)' : undefined}
                  />
                </div>
              </div>

              {!isCollapsed && (
                <div className="border-t border-slate-100 p-3 bg-slate-50/60 rounded-b-xl">
                  {renderSubCardBody(subId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
