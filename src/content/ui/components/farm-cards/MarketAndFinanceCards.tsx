import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';

interface FarmCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function MarketCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>📦 Tự giao đơn hàng Tạp hóa Chị Na</span>
        <Switch
          checked={Boolean(config.autoDeliverOrder)}
          onCheckedChange={(c) => updateField('autoDeliverOrder', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>📋 Tự giao đơn Bảng tin làng (Anh Khang)</span>
        <Switch
          checked={Boolean(config.autoVillageBoard)}
          onCheckedChange={(c) => updateField('autoVillageBoard', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🔥 Bán Nông sản Trend (x2 giá, đúng quota)</span>
        <Switch
          checked={Boolean(config.autoSellTrend)}
          onCheckedChange={(c) => updateField('autoSellTrend', c)}
        />
      </label>
    </div>
  );
}

export function NightMarketCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-lg bg-amber-50/80 border border-amber-200/80 p-2.5 text-[11px] text-amber-900 space-y-1">
        <div className="flex items-center justify-between font-semibold">
          <span className="flex items-center gap-1.5">🏮 Khung giờ: 18h00 – 23h30</span>
          <span className="text-emerald-700 bg-emerald-100/80 px-1.5 py-0.5 rounded text-[10px]">+25% Giá Bán</span>
        </div>
        <p className="text-amber-800/80 text-[10px] leading-relaxed">
          Chợ Đêm làng mở cửa mỗi tối sau khi giữ đất thành công. Hạn mức bán tối đa 20 món/đêm với giá cao hơn ban ngày 1.25x.
        </p>
      </div>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🏮 Tự động bán hàng tại Chợ Đêm (18h-23h30)</span>
        <Switch
          checked={Boolean(config.autoSellNightMarket)}
          onCheckedChange={(c) => updateField('autoSellNightMarket', c)}
        />
      </label>

      {config.autoSellNightMarket && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Chiến lược bán:</span>
            <HudSelect
              value={config.nightMarketStrategy ?? 'highest_price'}
              onValueChange={(val) => updateField('nightMarketStrategy', val as AppConfig['nightMarketStrategy'])}
              options={[
                { value: 'highest_price', label: '💰 Bán nông sản có giá cao nhất' },
                { value: 'max_stock', label: '📦 Bán nông sản có số lượng nhiều nhất' },
                { value: 'selected_crop', label: '🎯 Bán nông sản được chỉ định' },
              ]}
            />
          </div>

          {config.nightMarketStrategy === 'selected_crop' && (
            <div className="flex items-center justify-between gap-2 min-w-0">
              <span className="text-slate-600 shrink-0">Nông sản chỉ định:</span>
              <HudSelect
                value={config.nightMarketSelectedCrop ?? 'radish'}
                onValueChange={(val) => updateField('nightMarketSelectedCrop', val)}
                options={[
                  { value: 'radish', label: '🌱 Củ cải' },
                  { value: 'carrot', label: '🥕 Cà rốt' },
                  { value: 'corn', label: '🌽 Bắp ngô' },
                  { value: 'rice', label: '🌾 Lúa thơm' },
                ]}
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-slate-600">Chặn không bán nếu tồn kho dưới:</span>
            <input
              type="number"
              min={0}
              max={1000}
              step={5}
              value={config.nightMarketMinStock ?? 50}
              onChange={(e) => updateField('nightMarketMinStock', Number(e.target.value))}
              className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function DibayCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🎁 Tự nhận thưởng Việc hôm nay &amp; Sổ tay</span>
        <Switch
          checked={Boolean(config.autoClaimQuests)}
          onCheckedChange={(c) => updateField('autoClaimQuests', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🪙 Tự bỏ tiền vào Heo đất mỗi ngày</span>
        <Switch
          checked={Boolean(config.autoFeedPiggy)}
          onCheckedChange={(c) => updateField('autoFeedPiggy', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🔨 Tự đập Heo đất khi no (đủ 7 ngày)</span>
        <Switch
          checked={Boolean(config.autoBreakPiggy)}
          onCheckedChange={(c) => updateField('autoBreakPiggy', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🛒 Tự mua Heo đất mới khi chuồng trống</span>
        <Switch
          checked={Boolean(config.autoNewPiggy)}
          onCheckedChange={(c) => updateField('autoNewPiggy', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🏦 Tự gửi Sổ tiết kiệm Dì Bảy</span>
        <Switch
          checked={Boolean(config.autoSavings)}
          onCheckedChange={(c) => updateField('autoSavings', c)}
        />
      </label>
      {config.autoSavings && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Kỳ hạn gửi:</span>
            <HudSelect
              value={String(config.savingsTerm ?? 7)}
              onValueChange={(val) => updateField('savingsTerm', Number(val) as 3 | 7 | 14)}
              options={[
                { value: '3', label: '📅 3 ngày (+5% lãi)' },
                { value: '7', label: '📅 7 ngày (+15% lãi · Chuẩn)' },
                { value: '14', label: '📅 14 ngày (+35% lãi · Cao nhất)' },
              ]}
            />
          </div>

          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>Gửi tối đa hạn mức cho phép</span>
            <Switch
              size="sm"
              checked={config.savingsDepositMax !== false}
              onCheckedChange={(c) => updateField('savingsDepositMax', c)}
            />
          </label>

          {!config.savingsDepositMax && (
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Số tiền gửi (đ):</span>
              <input
                type="number"
                min={50000}
                step={50000}
                value={config.savingsDepositAmount ?? 5000000}
                onChange={(e) => updateField('savingsDepositAmount', Number(e.target.value))}
                className="w-24 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-slate-600">Dừng gửi khi tiền dưới (triệu):</span>
            <input
              type="number"
              min={0}
              max={1000}
              step={1}
              value={config.savingsMinKeepMillion ?? 10}
              onChange={(e) => updateField('savingsMinKeepMillion', Number(e.target.value))}
              className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function GoldShopCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🪙 Tự mua vàng đầu tư tại Tiệm Vàng Cô Kim</span>
        <Switch
          checked={Boolean(config.goldAutoBuy)}
          onCheckedChange={(c) => updateField('goldAutoBuy', c)}
        />
      </label>
      {config.goldAutoBuy && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Loại vàng ưu tiên:</span>
            <HudSelect
              value={config.goldPreferType}
              onValueChange={(val) => updateField('goldPreferType', val)}
              options={[
                { value: 'mieng', label: '🟨 Vàng miếng 9999 (~8,2tr · Chênh 1,6% · Hợp giữ lâu)' },
                { value: 'nhan', label: '💍 Nhẫn trơn 9999 (~7,6tr · Chênh 1,2% · Ổn định nhất)' },
                { value: 'k18', label: '📿 Vàng 18K (~5,6tr · Chênh 9% · Trang sức)' },
                { value: 'non', label: '🪙 Vàng non 10K (~3,1tr · Chênh 5% · Lướt sóng)' },
              ]}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Tiền mặt tối thiểu giữ:</span>
            <input
              type="number"
              min={100000}
              max={10000000}
              step={100000}
              value={config.goldKeepCash}
              onChange={(e) => updateField('goldKeepCash', Number(e.target.value))}
              className="w-24 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>📈 Tự bán vàng khi có lãi</span>
        <Switch
          checked={Boolean(config.goldAutoSell)}
          onCheckedChange={(c) => updateField('goldAutoSell', c)}
        />
      </label>
      {config.goldAutoSell && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Chốt lời khi lãi &gt;= (%):</span>
            <input
              type="number"
              min={3}
              max={50}
              step={1}
              value={config.goldProfitPercent}
              onChange={(e) => updateField('goldProfitPercent', Number(e.target.value))}
              className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
