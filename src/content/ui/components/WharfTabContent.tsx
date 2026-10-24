import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from './HudSelect';

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
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      {/* Wharf Banner Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-blue-50 border border-blue-200/80 px-3.5 py-2 text-blue-900 shadow-xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🛶 Cho phép chạy Khu vực Bến Đò
        </span>
        <Switch checked={isWharfAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
        <div className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5 flex items-center justify-between">
          <span>🎣 Vị Trí &amp; Thao Tác Câu Bến Đò</span>
        </div>
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
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Vị trí ngồi câu:</span>
              <HudSelect
                value={config.benSpot}
                onValueChange={(val) => updateField('benSpot', val as AppConfig['benSpot'])}
                options={[
                  { value: 'bank', label: '🌾 Bờ sông' },
                  { value: 'dock', label: '🌉 Cầu tre' },
                ]}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>⭐ Tự bấm Giữ lại cá Lạ / Cầu vồng / Thần thoại</span>
          <Switch
            checked={Boolean(config.benAutoKeepRare)}
            onCheckedChange={(c) => updateField('benAutoKeepRare', c)}
          />
        </label>
      </div>

      {/* Bait & Sell Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
        <div className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
          🪱 Mồi Câu, Bán Cá &amp; Hồi Sức Bến Đò
        </div>

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
                  { value: 'xinMoi', label: '🤲 Xin chú ít mồi (+10 mồi · Miễn phí)' },
                  { value: 'moi20', label: '🪱 Hộp mồi trùn (+20 mồi · 15 vỏ sò)' },
                  { value: 'moi60', label: '🪱 Thau mồi trùn (+60 mồi · 40 vỏ sò)' },
                  { value: 'moi150', label: '🪱 Thùng mồi cám (+150 mồi · 90 vỏ sò)' },
                ]}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🐟 Tự đi bán cá tại Vựa Anh Tư</span>
          <Switch
            checked={Boolean(config.benAutoSell)}
            onCheckedChange={(c) => updateField('benAutoSell', c)}
          />
        </label>
        {config.benAutoSell && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Bán khi giỏ cá đạt (con):</span>
              <input
                type="number"
                min={1}
                max={60}
                value={config.benSellThreshold}
                onChange={(e) => updateField('benSellThreshold', Number(e.target.value))}
                className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Recover Stamina Food selection */}
        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🍱 Tự ăn hồi Sức câu (⚡) khi đuối sức</span>
          <Switch
            checked={Boolean(config.benAutoRecoverStamina)}
            onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
          />
        </label>
        {config.benAutoRecoverStamina && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Hồi khi Sức (⚡) dưới:</span>
              <input
                type="number"
                min={1}
                max={80}
                step={1}
                value={config.benStaminaThreshold}
                onChange={(e) => updateField('benStaminaThreshold', Number(e.target.value))}
                className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Món ăn Quán Dì Tám:</span>
              <HudSelect
                value={config.benPreferFood}
                onValueChange={(val) => updateField('benPreferFood', val)}
                options={[
                  { value: 'banhMi', label: '🥖 Bánh mì thịt (+20 Sức · 10 vỏ sò)' },
                  { value: 'chaoCa', label: '🥣 Cháo cá lóc (+28 Sức · 14 vỏ sò)' },
                  { value: 'huTieu', label: '🍜 Hủ tiếu nam vang (+40 Sức · 20 vỏ sò)' },
                  { value: 'comTam', label: '🍛 Cơm tấm sườn bì (+60 Sức · 28 vỏ sò)' },
                  { value: 'lauMam', label: '🍲 Lẩu cá linh bông điên điển (+100 Sức · 45 vỏ sò)' },
                ]}
              />
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>💆 Tiệm Út Mười: Gội đầu massage (+50 Sức · 25 vỏ sò)</span>
          <Switch
            checked={Boolean(config.benAutoGoiDau)}
            onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🍀 Xe trà đá Chị Thơm: Uống nước May Mắn</span>
          <Switch
            checked={Boolean(config.benAutoLuckDrink)}
            onCheckedChange={(c) => updateField('benAutoLuckDrink', c)}
          />
        </label>
        {config.benAutoLuckDrink && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Nước uống Chị Thơm:</span>
              <HudSelect
                value={config.benPreferDrink}
                onValueChange={(val) => updateField('benPreferDrink', val)}
                options={[
                  { value: 'traDa', label: '🧊 Trà đá (+8 Sức · 3 vỏ sò)' },
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

      {/* Entertainment & Utility Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5 shadow-xs">
        <div className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
          🏮 Giải Trí &amp; Tiện Ích Bến Đò
        </div>

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🏮 Lồng đèn Cô Bảy: Tự quay khi có vé</span>
          <Switch
            checked={Boolean(config.benAutoLantern)}
            onCheckedChange={(c) => updateField('benAutoLantern', c)}
          />
        </label>
        {config.benAutoLantern && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
            <label className="flex items-center justify-between text-slate-600 cursor-pointer">
              <span>🎟️ Tự mua thêm vé quay (600🐚/vé)</span>
              <Switch
                size="sm"
                checked={Boolean(config.benBuyLanternTicket)}
                onCheckedChange={(c) => updateField('benBuyLanternTicket', c)}
              />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🎟️ Đại lý vé số Bến Đò: Tự đổi thưởng</span>
          <Switch
            checked={Boolean(config.benAutoLotto)}
            onCheckedChange={(c) => updateField('benAutoLotto', c)}
          />
        </label>
        {config.benAutoLotto && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
            <label className="flex items-center justify-between text-slate-600 cursor-pointer">
              <span>🍀 Mua 1 vé số cầu may mỗi ngày (10🐚)</span>
              <Switch
                size="sm"
                checked={Boolean(config.benAutoBuyLotto)}
                onCheckedChange={(c) => updateField('benAutoBuyLotto', c)}
              />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>🏧 Cây ATM: Đổi vỏ sò ra tiền mặt</span>
          <Switch
            checked={Boolean(config.benAutoAtm)}
            onCheckedChange={(c) => updateField('benAutoAtm', c)}
          />
        </label>
        {config.benAutoAtm && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Đổi khi vỏ sò &gt;=:</span>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={config.benAtmThreshold}
                onChange={(e) => updateField('benAtmThreshold', Number(e.target.value))}
                className="w-20 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
