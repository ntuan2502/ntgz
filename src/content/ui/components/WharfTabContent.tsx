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
      <div className="flex items-center justify-between rounded-xl bg-blue-950/40 light:bg-blue-50 border border-blue-500/30 px-3 py-2 text-blue-300 light:text-blue-900 shadow-sm">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🛶 Cho phép chạy Khu vực Bến Đò
        </span>
        <Switch checked={isWharfAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Spot Card */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white p-3 space-y-2.5 shadow-sm">
        <div className="font-semibold text-xs text-slate-200 light:text-slate-800 border-b border-slate-800 light:border-slate-200 pb-1.5 flex items-center justify-between">
          <span>🎣 Vị Trí &amp; Thao Tác Câu Bến Đò</span>
        </div>
        <p className="text-[11px] text-slate-400 light:text-slate-500 italic">
          ✨ Tự nhận diện phao chìm hẳn mới giật và tự ghìm cần ngược hướng cá chạy.
        </p>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>📍 Tự đi bộ ra vị trí ngồi câu</span>
          <Switch
            checked={Boolean(config.benAutoSpot)}
            onCheckedChange={(c) => updateField('benAutoSpot', c)}
          />
        </label>
        {config.benAutoSpot && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Vị trí ngồi câu:</span>
              <select
                value={config.benSpot}
                onChange={(e) => updateField('benSpot', e.target.value as AppConfig['benSpot'])}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="dock">🌉 Cầu tàu chính</option>
                <option value="bamboo">🎋 Cầu tre</option>
                <option value="bank">🌿 Bờ sông</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>⭐ Tự bấm Giữ lại cá Lạ / Cầu vồng / Thần thoại</span>
          <Switch
            checked={Boolean(config.benAutoKeepRare)}
            onCheckedChange={(c) => updateField('benAutoKeepRare', c)}
          />
        </label>
      </div>

      {/* Bait & Sell Card */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white p-3 space-y-2.5 shadow-sm">
        <div className="font-semibold text-xs text-slate-200 light:text-slate-800 border-b border-slate-800 light:border-slate-200 pb-1.5">
          🪱 Mồi Câu, Bán Cá &amp; Hồi Sức Bến Đò
        </div>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🪱 Tự đi mua mồi Chú Đực khi hết mồi</span>
          <Switch
            checked={Boolean(config.benAutoBuyBait)}
            onCheckedChange={(c) => updateField('benAutoBuyBait', c)}
          />
        </label>
        {config.benAutoBuyBait && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Loại mồi ưu tiên:</span>
              <select
                value={config.benPreferBait}
                onChange={(e) => updateField('benPreferBait', e.target.value as AppConfig['benPreferBait'])}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="moi60">🪱 Thau 60 mồi (40 vỏ sò)</option>
                <option value="moi150">🪱 Thùng 150 mồi (90 vỏ sò)</option>
                <option value="moi20">🪱 Hộp 20 mồi (15 vỏ sò)</option>
                <option value="xinMoi">🤲 Xin 10 mồi miễn phí</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🐟 Tự đi bán cá tại Vựa Anh Tư</span>
          <Switch
            checked={Boolean(config.benAutoSell)}
            onCheckedChange={(c) => updateField('benAutoSell', c)}
          />
        </label>
        {config.benAutoSell && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Bán khi giỏ cá đạt (con):</span>
              <input
                type="number"
                min={1}
                max={60}
                value={config.benSellThreshold}
                onChange={(e) => updateField('benSellThreshold', Number(e.target.value))}
                className="w-14 rounded-md bg-slate-800 light:bg-slate-100 px-1 py-0.5 text-center text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-mono"
              />
            </div>
          </div>
        )}

        {/* Restore Recover Stamina Food selection */}
        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🍱 Tự ăn hồi Sức câu (⚡) khi đuối sức</span>
          <Switch
            checked={Boolean(config.benAutoRecoverStamina)}
            onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
          />
        </label>
        {config.benAutoRecoverStamina && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Hồi khi Sức (⚡) dưới:</span>
              <input
                type="number"
                min={5}
                max={80}
                step={5}
                value={config.benStaminaThreshold}
                onChange={(e) => updateField('benStaminaThreshold', Number(e.target.value))}
                className="w-14 rounded-md bg-slate-800 light:bg-slate-100 px-1 py-0.5 text-center text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Món ăn Quán Dì Tám:</span>
              <select
                value={config.benPreferFood}
                onChange={(e) => updateField('benPreferFood', e.target.value)}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="comTam">🍛 Cơm tấm (+60⚡ · 28🐚)</option>
                <option value="lauMam">🍲 Lẩu cá linh (+100⚡ · 45🐚)</option>
                <option value="huTieu">🍜 Hủ tiếu (+40⚡ · 20🐚)</option>
                <option value="chaoCa">🥣 Cháo cá lóc (+28⚡ · 14🐚)</option>
                <option value="banhMi">🥖 Bánh mì (+20⚡ · 10🐚)</option>
              </select>
            </div>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>💆 Tiệm Út Mười: Gội đầu (+50⚡ · 25🐚)</span>
          <Switch
            checked={Boolean(config.benAutoGoiDau)}
            onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
          />
        </label>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🍀 Xe trà đá Chị Thơm: Uống nước May Mắn</span>
          <Switch
            checked={Boolean(config.benAutoLuckDrink)}
            onCheckedChange={(c) => updateField('benAutoLuckDrink', c)}
          />
        </label>
        {config.benAutoLuckDrink && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Nước uống Chị Thơm:</span>
              <select
                value={config.benPreferDrink}
                onChange={(e) => updateField('benPreferDrink', e.target.value)}
                className="rounded-md bg-slate-800 light:bg-slate-100 px-2 py-1 text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 text-xs"
              >
                <option value="nuocMia">🥤 Nước mía (+1 May mắn · 15🐚)</option>
                <option value="rauMa">🥬 Nước rau má (+2 May mắn · 30🐚)</option>
                <option value="caPhe">☕ Cà phê đen (+2 May mắn · 35🐚)</option>
                <option value="duaTuoi">🥥 Dừa tươi Bến Tre (+3 May mắn · 80🐚)</option>
                <option value="traDa">🧊 Trà đá (+8⚡ · 3🐚)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Entertainment & Utility Card */}
      <div className="rounded-xl border border-slate-800 dark:border-slate-800 light:border-slate-200 bg-slate-900/80 dark:bg-slate-900/80 light:bg-white p-3 space-y-2.5 shadow-sm">
        <div className="font-semibold text-xs text-slate-200 light:text-slate-800 border-b border-slate-800 light:border-slate-200 pb-1.5">
          🏮 Giải Trí &amp; Tiện Ích Bến Đò
        </div>

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🏮 Lồng đèn Cô Bảy: Tự quay khi có vé</span>
          <Switch
            checked={Boolean(config.benAutoLantern)}
            onCheckedChange={(c) => updateField('benAutoLantern', c)}
          />
        </label>
        {config.benAutoLantern && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1 text-[11px]">
            <label className="flex items-center justify-between text-slate-400 light:text-slate-600">
              <span>🎟️ Tự mua thêm vé quay (600🐚/vé)</span>
              <Switch
                size="sm"
                checked={Boolean(config.benBuyLanternTicket)}
                onCheckedChange={(c) => updateField('benBuyLanternTicket', c)}
              />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🎟️ Đại lý vé số Bến Đò: Tự đổi thưởng</span>
          <Switch
            checked={Boolean(config.benAutoLotto)}
            onCheckedChange={(c) => updateField('benAutoLotto', c)}
          />
        </label>
        {config.benAutoLotto && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1 text-[11px]">
            <label className="flex items-center justify-between text-slate-400 light:text-slate-600">
              <span>🍀 Mua 1 vé số cầu may mỗi ngày (10🐚)</span>
              <Switch
                size="sm"
                checked={Boolean(config.benAutoBuyLotto)}
                onCheckedChange={(c) => updateField('benAutoBuyLotto', c)}
              />
            </label>
          </div>
        )}

        <label className="flex items-center justify-between text-slate-300 light:text-slate-700">
          <span>🏧 Cây ATM: Đổi vỏ sò ra tiền mặt</span>
          <Switch
            checked={Boolean(config.benAutoAtm)}
            onCheckedChange={(c) => updateField('benAutoAtm', c)}
          />
        </label>
        {config.benAutoAtm && (
          <div className="ml-2 pl-2.5 border-l-2 border-slate-700/60 light:border-slate-300 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 light:text-slate-600">Đổi khi vỏ sò &gt;=:</span>
              <input
                type="number"
                min={100}
                max={5000}
                step={50}
                value={config.benAtmThreshold}
                onChange={(e) => updateField('benAtmThreshold', Number(e.target.value))}
                className="w-16 rounded-md bg-slate-800 light:bg-slate-100 px-1 py-0.5 text-center text-slate-200 light:text-slate-800 border border-slate-700 light:border-slate-300 font-mono"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
