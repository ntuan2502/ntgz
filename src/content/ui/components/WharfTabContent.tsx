import React from 'react';
import { AppConfig, WharfSubAreaId } from '@/shared/types/config';
import { WHARF_SUBAREA_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HudSelect } from './HudSelect';
import { MonitorTabId } from './monitor/MonitorHub';
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
                Tự ăn uống / gội đầu khi hết Sức
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
                  <span className="text-slate-600 shrink-0">Món ăn ưu tiên (Quán ăn Dì Tám):</span>
                  <HudSelect
                    value={config.benPreferFood || 'lauMam'}
                    onValueChange={(val) => updateField('benPreferFood', val)}
                    options={[
                      { value: 'lauMam', label: '🍲 Lẩu cá linh (+100 Sức · 45 vỏ sò)' },
                      { value: 'comTam', label: '🍛 Cơm tấm sườn bì (+60 Sức · 28 vỏ sò)' },
                      { value: 'huTieu', label: '🍜 Hủ tiếu nam vang (+40 Sức · 20 vỏ sò)' },
                      { value: 'chaoCa', label: '🥣 Cháo cá lóc (+28 Sức · 14 vỏ sò)' },
                      { value: 'banhMi', label: '🥖 Bánh mì thịt (+20 Sức · 10 vỏ sò)' },
                    ]}
                  />
                </div>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-0.5">
                  <span>💆 Tiệm Út Mười: Gội đầu massage (+50⚡ · 25🐚)</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.benAutoGoiDau ?? false)}
                    onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
                  />
                </label>
                <p className="text-[10px] text-slate-500 italic">
                  💡 Tự động ăn bánh mì, xôi bắp trong ba lô trước; nếu hết mới ghé Quán Dì Tám mua thức ăn hoặc tiệm Út Mười gội đầu.
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
