import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';

interface WharfTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function WharfTabContent({ config, onUpdateConfig }: WharfTabContentProps) {
  const isWharfAreaEnabled = config.areaEnabled.benDo !== false;

  const handleToggleArea = (checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        benDo: checked,
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
      {/* Wharf Banner Toggle */}
      <div className="flex items-center justify-between rounded-md bg-blue-950/40 border border-blue-500/30 px-3 py-2 text-blue-300">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🛶 Cho phép chạy Khu vực Bến Đò
        </span>
        <Switch checked={isWharfAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
        <div className="font-semibold text-xs text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
          <span>🎣 Vị Trí &amp; Thao Tác Câu Bến Đò</span>
        </div>
        <p className="text-[11px] text-slate-400 italic">
          ✨ Tự nhận diện phao chìm hẳn mới giật và tự ghìm cần ngược hướng cá chạy.
        </p>

        <label className="flex items-center justify-between text-slate-300">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <Switch
            checked={Boolean(config.benAutoSpot)}
            onCheckedChange={(c) => updateField('benAutoSpot', c)}
          />
        </label>
        {config.benAutoSpot && (
          <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Vị trí ngồi câu:</span>
              <select
                value={config.benSpot}
                onChange={(e) => updateField('benSpot', e.target.value as AppConfig['benSpot'])}
                className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
              >
                <option value="dock">🌉 Cầu tàu chính</option>
                <option value="bamboo">🎋 Cầu tre</option>
                <option value="bank">🌿 Bờ sông</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300">
          <span>⭐ Tự bấm Giữ lại cá Lạ / Cầu vồng / Thần thoại</span>
          <Switch
            checked={Boolean(config.benAutoKeepRare)}
            onCheckedChange={(c) => updateField('benAutoKeepRare', c)}
          />
        </label>
      </div>

      {/* Bait & Sell Card */}
      <div className="rounded-lg border border-slate-800 bg-slate-900/80 p-2.5 space-y-2">
        <div className="font-semibold text-xs text-slate-200 border-b border-slate-800 pb-1">
          🪱 Mồi Câu, Bán Cá &amp; Hồi Sức Bến Đò
        </div>

        <label className="flex items-center justify-between text-slate-300">
          <span>🪱 Tự đi mua mồi Chú Đực khi hết mồi</span>
          <Switch
            checked={Boolean(config.benAutoBuyBait)}
            onCheckedChange={(c) => updateField('benAutoBuyBait', c)}
          />
        </label>
        {config.benAutoBuyBait && (
          <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Loại mồi ưu tiên:</span>
              <select
                value={config.benPreferBait}
                onChange={(e) => updateField('benPreferBait', e.target.value as AppConfig['benPreferBait'])}
                className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
              >
                <option value="moi60">🪱 Thau 60 mồi (40 vỏ sò)</option>
                <option value="moi150">🪱 Thùng 150 mồi (90 vỏ sò)</option>
                <option value="moi20">🪱 Hộp 20 mồi (15 vỏ sò)</option>
                <option value="xinMoi">🤲 Xin 10 mồi miễn phí</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300">
          <span>🐟 Tự đi bán cá tại Vựa Anh Tư</span>
          <Switch
            checked={Boolean(config.benAutoSell)}
            onCheckedChange={(c) => updateField('benAutoSell', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>💇 Tự gội đầu thư giãn tại Tiệm Bến đò</span>
          <Switch
            checked={Boolean(config.benAutoGoiDau)}
            onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>🥤 Tự hồi phục thể lực bằng đồ ăn quán</span>
          <Switch
            checked={Boolean(config.benAutoRecoverStamina)}
            onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>🍀 Tự mua nước may mắn (+May mắn câu cá)</span>
          <Switch
            checked={Boolean(config.benAutoLuckDrink)}
            onCheckedChange={(c) => updateField('benAutoLuckDrink', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>🏮 Thả đèn hoa đăng cầu may</span>
          <Switch
            checked={Boolean(config.benAutoLantern)}
            onCheckedChange={(c) => updateField('benAutoLantern', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300">
          <span>🎟️ Mua vé số cào Bến đò</span>
          <Switch
            checked={Boolean(config.benAutoLotto)}
            onCheckedChange={(c) => updateField('benAutoLotto', c)}
          />
        </label>
      </div>
    </div>
  );
}
