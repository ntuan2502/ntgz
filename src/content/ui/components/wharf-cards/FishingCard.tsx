import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';
import { MultiSelectCombobox } from '../MultiSelectCombobox';

const KEEP_RARITY_OPTIONS = [
  { id: 'mythic', label: 'Thần thoại', icon: '🔥' },
  { id: 'legendary', label: 'Huyền thoại', icon: '👑' },
  { id: 'rainbow', label: 'Cầu vồng', icon: '🌈' },
  { id: 'odd', label: 'Cá lạ', icon: '✨' },
  { id: 'epic', label: 'Rất hiếm', icon: '💎' },
  { id: 'rare', label: 'Hiếm', icon: '⭐' },
  { id: 'uncommon', label: 'Hơi hiếm', icon: '🐟' },
  { id: 'common', label: 'Thường', icon: '🐟' },
];

interface FishingCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function FishingCard({ config, updateField }: FishingCardProps) {
  return (
    <div className="space-y-2.5 text-xs">
      <p className="text-[11px] text-slate-500 italic">
        ✨ Tự nhận diện phao chìm hẳn mới giật và tự ghìm cần ngược hướng cá chạy.
      </p>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
        <Switch
          checked={Boolean(config.benAutoSpot)}
          onCheckedChange={(c) => updateField('benAutoSpot', c)}
        />
      </label>
      {config.benAutoSpot && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Vị trí ngồi câu:</span>
            <HudSelect
              value={config.benSpot}
              onValueChange={(val) => updateField('benSpot', val as AppConfig['benSpot'])}
              options={[
                { value: 'bank', label: '🌾 Bờ sông bến giữa' },
                { value: 'dock', label: '🌉 Cầu tàu lớn (Đầu mũi)' },
                { value: 'bamboo', label: '🎋 Cầu tre lắt lẻo' },
                { value: 'bridge', label: '🪵 Cầu ván qua lạch' },
                { value: 'rotate', label: '🔄 Tự luân phiên các điểm câu' },
                { value: 'random', label: '🎲 Đổi ngẫu nhiên các điểm câu' },
              ]}
            />
          </div>

          {(config.benSpot === 'rotate' || config.benSpot === 'random') && (
            <div className="rounded-lg bg-slate-50/80 p-2 border border-slate-100 space-y-1.5">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-slate-600 shrink-0">Tiêu chí đổi điểm câu:</span>
                <HudSelect
                  value={config.benSpotSwitchMode || 'count'}
                  onValueChange={(val) => updateField('benSpotSwitchMode', val as AppConfig['benSpotSwitchMode'])}
                  options={[
                    { value: 'count', label: '🐟 Theo số lượng cá câu được' },
                    { value: 'time', label: '⏳ Theo thời gian ngồi câu' },
                  ]}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Đổi điểm sau mỗi:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={config.benSpotSwitchMode === 'time' ? 1 : 5}
                    max={config.benSpotSwitchMode === 'time' ? 180 : 100}
                    step={config.benSpotSwitchMode === 'time' ? 5 : 5}
                    value={config.benSpotSwitchValue ?? 15}
                    onChange={(e) => updateField('benSpotSwitchValue', Math.max(1, Number(e.target.value) || 1))}
                    className="w-16 h-8 min-h-8 rounded-lg bg-white px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  <span className="text-slate-500 text-[10px]">
                    {config.benSpotSwitchMode === 'time' ? 'phút' : 'con cá'}
                  </span>
                </div>
              </div>
            </div>
          )}

          <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1 border-t border-slate-100">
            <span className="pr-2 leading-tight">
              <span className="font-medium text-slate-800">🛡️ Nhịp quăng ngẫu nhiên &amp; nghỉ tay</span>
              <span className="block text-[10px] text-slate-500">
                Độ trễ biến thiên (+0.2s - 1.0s) &amp; thỉnh thoảng giải lao vài giây như người thật
              </span>
            </span>
            <Switch
              size="sm"
              checked={Boolean(config.benHumanJitter ?? true)}
              onCheckedChange={(c) => updateField('benHumanJitter', c)}
            />
          </label>
        </div>
      )}

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>⭐ Tự động giữ lại cá trong giỏ</span>
        <Switch
          checked={Boolean(config.benAutoKeepRare)}
          onCheckedChange={(c) => updateField('benAutoKeepRare', c)}
        />
      </label>
      {config.benAutoKeepRare && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px]">
          <div className="space-y-1">
            <span className="text-slate-600 block font-medium">Độ hiếm &amp; phân loại giữ lại:</span>
            <MultiSelectCombobox
              options={KEEP_RARITY_OPTIONS}
              value={
                Array.isArray(config.benKeepRarities)
                  ? config.benKeepRarities
                  : ['mythic', 'legendary', 'rainbow', 'odd']
              }
              onChange={(next) => updateField('benKeepRarities', next)}
              placeholder="Chọn các độ hiếm cá cần giữ..."
            />
          </div>

          <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1 border-t border-slate-100">
            <span className="pr-2 leading-tight">
              <span className="font-medium text-slate-800">Tự bán cá giữ lại trùng loại:</span>
              <span className="block text-[10px] text-slate-500">
                Chỉ giữ 1 con đắt nhất mỗi loài cá, bán các con trùng giá rẻ hơn
              </span>
            </span>
            <Switch
              checked={Boolean(config.benAutoSellDuplicateKept ?? true)}
              onCheckedChange={(c) => updateField('benAutoSellDuplicateKept', c)}
            />
          </label>
        </div>
      )}

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🪱 Tự đi mua mồi Chú Đực khi hết mồi</span>
        <Switch
          checked={Boolean(config.benAutoBuyBait)}
          onCheckedChange={(c) => updateField('benAutoBuyBait', c)}
        />
      </label>
      {config.benAutoBuyBait && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Loại mồi ưu tiên:</span>
            <HudSelect
              value={config.benPreferBait}
              onValueChange={(val) => updateField('benPreferBait', val as AppConfig['benPreferBait'])}
              options={[
                { value: 'moi150', label: '🪱 Thùng mồi cám (150 mồi · 90 vỏ sò)' },
                { value: 'moi60', label: '🪱 Thau mồi trùn (60 mồi · 40 vỏ sò)' },
                { value: 'moi20', label: '🪱 Hộp mồi trùn (20 mồi · 15 vỏ sò)' },
                { value: 'xinMoi', label: '🤲 Xin 10 mồi miễn phí (khi hết vỏ sò)' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Số lượng mồi tối đa trong túi:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={100}
                max={100000}
                step={100}
                value={config.benBaitMaxCount ?? 10000}
                onChange={(e) => updateField('benBaitMaxCount', Math.max(0, Number(e.target.value) || 0))}
                className="w-20 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 text-[10px]">mồi</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Dừng mua khi vỏ sò &lt;:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={1000000}
                step={100}
                value={config.benBaitMinShells ?? 10000}
                onChange={(e) => updateField('benBaitMinShells', Math.max(0, Number(e.target.value) || 0))}
                className="w-20 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 text-[10px]">🐚</span>
            </div>
          </div>
        </div>
      )}

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🐟 Tự đem cá ra bán tại Vựa cá Anh Tư khi giỏ cá đầy (60/60 con)</span>
        <Switch
          checked={Boolean(config.benAutoSell)}
          onCheckedChange={(c) => updateField('benAutoSell', c)}
        />
      </label>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🥤 Xe Chị Thơm: Uống nước tăng May mắn</span>
        <Switch
          checked={Boolean(config.benAutoLuckDrink)}
          onCheckedChange={(c) => updateField('benAutoLuckDrink', c)}
        />
      </label>
      {config.benAutoLuckDrink && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Loại nước uống:</span>
            <HudSelect
              value={config.benPreferDrink}
              onValueChange={(val) => updateField('benPreferDrink', val)}
              options={[
                { value: 'nuocMia', label: '🥤 Nước mía tắc (+5 Sức, May +1 · 15 vỏ sò)' },
                { value: 'rauMa', label: '🍵 Rau má đậu xanh (+5 Sức, May +1 · 30 vỏ sò)' },
                { value: 'caPhe', label: '☕ Cà phê sữa đá (+10 Sức, May +2 · 35 vỏ sò)' },
                { value: 'duaTuoi', label: '🥥 Dừa xiêm tươi (+15 Sức, May +3 · 80 vỏ sò)' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}
