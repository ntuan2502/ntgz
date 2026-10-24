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
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Vị trí ngồi câu:</span>
              <select
                value={config.benSpot}
                onChange={(e) => updateField('benSpot', e.target.value as AppConfig['benSpot'])}
                className="rounded-lg bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="bank">🌾 Bờ sông</option>
                <option value="dock">🌉 Cầu tàu chính</option>
              </select>
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
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Loại mồi ưu tiên:</span>
              <select
                value={config.benPreferBait}
                onChange={(e) => updateField('benPreferBait', e.target.value as AppConfig['benPreferBait'])}
                className="rounded-lg bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="xinMoi">🤲 Xin 10 mồi miễn phí</option>
                <option value="moi20">🪱 Hộp 20 mồi (15 vỏ sò)</option>
                <option value="moi60">🪱 Thau 60 mồi (40 vỏ sò)</option>
                <option value="moi150">🪱 Thùng 150 mồi (90 vỏ sò)</option>
              </select>
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
                className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
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
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Hồi khi Sức (⚡) dưới:</span>
              <input
                type="number"
                min={5}
                max={80}
                step={5}
                value={config.benStaminaThreshold}
                onChange={(e) => updateField('benStaminaThreshold', Number(e.target.value))}
                className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Món ăn Quán Dì Tám:</span>
              <select
                value={config.benPreferFood}
                onChange={(e) => updateField('benPreferFood', e.target.value)}
                className="rounded-lg bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="banhMi">🥖 Bánh mì (+20⚡ · 10🐚)</option>
                <option value="chaoCa">🥣 Cháo cá lóc (+28⚡ · 14🐚)</option>
                <option value="huTieu">🍜 Hủ tiếu (+40⚡ · 20🐚)</option>
                <option value="comTam">🍛 Cơm tấm (+60⚡ · 28🐚)</option>
                <option value="lauMam">🍲 Lẩu cá linh (+100⚡ · 45🐚)</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-700 cursor-pointer">
          <span>💆 Tiệm Út Mười: Gội đầu (+50⚡ · 25🐚)</span>
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
          <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Nước uống Chị Thơm:</span>
              <select
                value={config.benPreferDrink}
                onChange={(e) => updateField('benPreferDrink', e.target.value)}
                className="rounded-lg bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="traDa">🧊 Trà đá (+8⚡ · 3🐚)</option>
                <option value="nuocMia">🥤 Nước mía (+1 May mắn · 15🐚)</option>
                <option value="rauMa">🥬 Nước rau má (+1 May mắn · 30🐚)</option>
                <option value="caPhe">☕ Cà phê đen (+2 May mắn · 35🐚)</option>
                <option value="duaTuoi">🥥 Dừa tươi Bến Tre (+3 May mắn · 80🐚)</option>
              </select>
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
                className="w-16 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
