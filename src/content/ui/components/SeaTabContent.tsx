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
      <div className="flex items-center justify-between rounded-md bg-cyan-950/40 border border-cyan-500/30 px-3 py-2 text-cyan-300">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏖️ Cho phép chạy Khu vực Biển
        </span>
        <Switch checked={isSeaAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
        <div className="font-semibold text-xs text-slate-200 border-b border-slate-800 pb-1">
          🌊 Vị Trí &amp; Thao Tác Câu Ở Biển
        </div>
        <p className="text-[11px] text-slate-400 italic">
          ✨ Tự nhận biết cá cắn câu để giật, tự ghìm cần theo hướng cá và cất cá vào giỏ.
        </p>

        <label className="flex items-center justify-between text-slate-300">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <Switch
            checked={Boolean(config.seaAutoSpot)}
            onCheckedChange={(c) => updateField('seaAutoSpot', c)}
          />
        </label>
        {config.seaAutoSpot && (
          <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vị trí câu ở Biển:</span>
              <select
                value={config.seaSpot}
                onChange={(e) => updateField('seaSpot', e.target.value as AppConfig['seaSpot'])}
                className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
              >
                <option value="pier">🌉 Cầu tàu</option>
                <option value="rocks">🪨 Bãi đá</option>
                <option value="beach">🏖️ Mép bãi cát</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300">
          <span>📖 Tự nhận thưởng Sổ cá Bách khoa Ông Tư</span>
          <Switch
            checked={Boolean(config.seaAutoClaimDex)}
            onCheckedChange={(c) => updateField('seaAutoClaimDex', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>🍙 Tự ăn uống hồi phục Đói Khát khi câu Biển</span>
          <Switch
            checked={Boolean(config.seaAutoEat)}
            onCheckedChange={(c) => updateField('seaAutoEat', c)}
          />
        </label>
      </div>

      {/* Ong Tu Hut Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
        <div className="font-semibold text-xs text-slate-200 border-b border-slate-800 pb-1">
          🛖 Chòi Ông Tư (Mua Mồi &amp; Bán Cá)
        </div>

        <label className="flex items-center justify-between text-slate-300">
          <span>🦐 Tự mua mồi câu khi hết mồi</span>
          <Switch
            checked={Boolean(config.seaAutoBuyBait)}
            onCheckedChange={(c) => updateField('seaAutoBuyBait', c)}
          />
        </label>
        {config.seaAutoBuyBait && (
          <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Loại mồi ưu tiên:</span>
              <select
                value={config.seaPreferBait}
                onChange={(e) => updateField('seaPreferBait', e.target.value as AppConfig['seaPreferBait'])}
                className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
              >
                <option value="worm">🪱 Mồi Giun / Trùn (Câu thường)</option>
                <option value="shrimp">🦐 Mồi Tép biển</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300">
          <span>💰 Tự bán hết cá trong giỏ cho Ông Tư (2 bước)</span>
          <Switch
            checked={Boolean(config.seaAutoSell)}
            onCheckedChange={(c) => updateField('seaAutoSell', c)}
          />
        </label>
      </div>
    </div>
  );
}
