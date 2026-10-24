import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';

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
    <div className="space-y-2 text-xs">
      {/* Sea Banner Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-cyan-950/40 light:bg-cyan-50 border border-cyan-500/30 px-3 py-2 text-cyan-300 light:text-cyan-900 shadow-sm">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏖️ Cho phép chạy Khu vực Biển
        </span>
        <Switch checked={isSeaAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot Card */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white p-3 space-y-2.5 shadow-sm">
        <div className="font-semibold text-xs text-slate-200 light:text-slate-800 border-b border-slate-800 light:border-slate-200 pb-1.5">
          🌊 Vị Trí &amp; Thao Tác Câu Ở Biển
        </div>
        <p className="text-[11px] text-slate-400 light:text-slate-500 italic">
          ✨ Tự nhận biết cá cắn câu để giật, tự ghìm cần theo hướng cá và cất cá vào giỏ.
        </p>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <Switch
            checked={Boolean(config.seaAutoSpot)}
            onCheckedChange={(c) => updateField('seaAutoSpot', c)}
          />
        </label>
        {config.seaAutoSpot && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Vị trí câu ở Biển:</span>
              <select
                value={config.seaSpot}
                onChange={(e) => updateField('seaSpot', e.target.value as AppConfig['seaSpot'])}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="pier">🌉 Cầu tàu (Đa dạng các loại cá)</option>
                <option value="rocks">🪨 Bãi đá (Nhiều cá hiếm)</option>
                <option value="beach">🏖️ Mép bãi cát (Cá ven bờ)</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>📖 Tự nhận thưởng Sổ cá Bách khoa Ông Tư</span>
          <Switch
            checked={Boolean(config.seaAutoClaimDex)}
            onCheckedChange={(c) => updateField('seaAutoClaimDex', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🍙 Tự ăn uống hồi phục Đói Khát khi câu Biển</span>
          <Switch
            checked={Boolean(config.seaAutoEat)}
            onCheckedChange={(c) => updateField('seaAutoEat', c)}
          />
        </label>
      </div>

      {/* Ong Tu Hut Card */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white p-3 space-y-2.5 shadow-sm">
        <div className="font-semibold text-xs text-slate-200 light:text-slate-800 border-b border-slate-800 light:border-slate-200 pb-1.5">
          🛖 Chòi Ông Tư (Mua Mồi &amp; Bán Cá)
        </div>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🦐 Tự mua mồi câu khi hết mồi</span>
          <Switch
            checked={Boolean(config.seaAutoBuyBait)}
            onCheckedChange={(c) => updateField('seaAutoBuyBait', c)}
          />
        </label>
        {config.seaAutoBuyBait && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Loại mồi ưu tiên:</span>
              <select
                value={config.seaPreferBait}
                onChange={(e) => updateField('seaPreferBait', e.target.value as AppConfig['seaPreferBait'])}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="worm">🪱 Mồi Giun / Trùn (Câu thường)</option>
                <option value="shrimp">🦐 Mồi Tôm (Câu cá hiếm)</option>
              </select>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Số gói mua mỗi lần:</span>
              <input
                type="number"
                min={1}
                max={20}
                value={config.seaBaitPacks}
                onChange={(e) => updateField('seaBaitPacks', Number(e.target.value))}
                className="w-14 rounded-md bg-slate-800 light:bg-slate-100 px-1 py-0.5 text-center text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-mono"
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🐟 Tự bán hải sản trong giỏ cho Ông Tư</span>
          <Switch
            checked={Boolean(config.seaAutoSell)}
            onCheckedChange={(c) => updateField('seaAutoSell', c)}
          />
        </label>
        {config.seaAutoSell && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Bán khi giỏ có từ (con):</span>
              <input
                type="number"
                min={1}
                max={30}
                value={config.seaSellThreshold}
                onChange={(e) => updateField('seaSellThreshold', Number(e.target.value))}
                className="w-14 rounded-md bg-slate-800 light:bg-slate-100 px-1 py-0.5 text-center text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
