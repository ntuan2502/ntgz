import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from './HudSelect';

interface SeaTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function SeaTabContent({ config, onUpdateConfig }: SeaTabContentProps) {
  const isSeaAreaEnabled = config.areaEnabled.sea !== false;

  const handleToggleArea = (checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        sea: checked,
      },
    }));
  };

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      {/* Sea Banner Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-cyan-50 border border-cyan-200/80 px-3.5 py-2 text-cyan-900 shadow-xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏖️ Cho phép chạy Khu vực Biển
        </span>
        <Switch checked={isSeaAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
        <div className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
          🌊 Vị Trí &amp; Thao Tác Câu Ở Biển
        </div>
        <p className="text-[11px] text-slate-500 italic">
          ✨ Tự nhận biết cá cắn câu để giật, tự ghìm cần theo hướng cá và cất cá vào giỏ.
        </p>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <Switch
            checked={Boolean(config.seaAutoSpot)}
            onCheckedChange={(c) => updateField('seaAutoSpot', c)}
          />
        </label>
        {config.seaAutoSpot && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Vị trí câu ở Biển:</span>
              <HudSelect
                value={config.seaSpot}
                onValueChange={(val) => updateField('seaSpot', val as AppConfig['seaSpot'])}
                options={[
                  { value: 'beach', label: '🏖️ Mép bãi cát (Nhiều cá nhỏ, hay vớt trúng rác)' },
                  { value: 'pier', label: '🌉 Cầu tàu (Nước sâu vừa, cá gì cũng có)' },
                  { value: 'rocks', label: '🪨 Bãi đá (Cá hiếm hay rình ở đây)' },
                ]}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>📖 Tự nhận thưởng Sổ cá Bách khoa Ông Tư</span>
          <Switch
            checked={Boolean(config.seaAutoClaimDex)}
            onCheckedChange={(c) => updateField('seaAutoClaimDex', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🍙 Tự ăn uống hồi phục Đói Khát khi câu Biển</span>
          <Switch
            checked={Boolean(config.seaAutoEat)}
            onCheckedChange={(c) => updateField('seaAutoEat', c)}
          />
        </label>
      </div>

      {/* Ong Tu Hut Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
        <div className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
          🛖 Chòi Ông Tư (Mua Mồi &amp; Bán Cá)
        </div>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🦐 Tự mua mồi câu khi hết mồi</span>
          <Switch
            checked={Boolean(config.seaAutoBuyBait)}
            onCheckedChange={(c) => updateField('seaAutoBuyBait', c)}
          />
        </label>
        {config.seaAutoBuyBait && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Loại mồi ưu tiên:</span>
              <HudSelect
                value={config.seaPreferBait}
                onValueChange={(val) => updateField('seaPreferBait', val as AppConfig['seaPreferBait'])}
                options={[
                  { value: 'worm', label: '🪱 Mồi trùn (10 mồi/gói · 2.000đ · Cá nào cũng ăn)' },
                  { value: 'shrimp', label: '🦐 Mồi tôm (5 mồi/gói · 10.000đ · Ít rác, nhiều cá hiếm)' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Số gói mua mỗi lần:</span>
              <input
                type="number"
                min={1}
                max={100}
                value={config.seaBaitPacks}
                onChange={(e) => updateField('seaBaitPacks', Number(e.target.value))}
                className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🐟 Tự bán hải sản trong giỏ cho Ông Tư</span>
          <Switch
            checked={Boolean(config.seaAutoSell)}
            onCheckedChange={(c) => updateField('seaAutoSell', c)}
          />
        </label>
        {config.seaAutoSell && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Bán khi giỏ có từ (con):</span>
              <input
                type="number"
                min={1}
                max={200}
                value={config.seaSellThreshold}
                onChange={(e) => updateField('seaSellThreshold', Number(e.target.value))}
                className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
