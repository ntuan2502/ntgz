import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';

interface EntertainmentCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function EntertainmentCard({ config, updateField }: EntertainmentCardProps) {
  return (
    <div className="space-y-2.5 text-xs">
      {/* Điểm danh Bến Đò */}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span className="flex items-center gap-1.5 font-medium">
          <span>📅 Điểm danh Bến Đò hàng ngày (Nhận sò, ngọc trai &amp; cần câu)</span>
        </span>
        <Switch
          checked={Boolean(config.benAutoCheckin ?? true)}
          onCheckedChange={(c) => updateField('benAutoCheckin', c)}
        />
      </label>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🏮 Lồng đèn Cô Bảy: Tự quay khi có vé</span>
        <Switch
          checked={Boolean(config.benAutoLantern)}
          onCheckedChange={(c) => updateField('benAutoLantern', c)}
        />
      </label>
      {config.benAutoLantern && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Chế độ quay:</span>
            <HudSelect
              value={config.benLanternSpinMode || 'x10'}
              onValueChange={(val) => updateField('benLanternSpinMode', val as AppConfig['benLanternSpinMode'])}
              options={[
                { value: 'x10', label: '⚡ Quay x10 (đủ 10 vé mới quay)' },
                { value: 'x1', label: '🎟️ Quay x1 từng vé' },
              ]}
            />
          </div>
          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>🎟️ Tự mua thêm 5 lượt vé quay hàng ngày (600🐚/vé, tối đa 5/5)</span>
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
        <span>🏧 Cây ATM: Đổi tối đa vỏ sò ra tiền mặt</span>
        <Switch
          checked={Boolean(config.benAutoAtm)}
          onCheckedChange={(c) => updateField('benAutoAtm', c)}
        />
      </label>
      {config.benAutoAtm && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Dừng đổi nếu vỏ sò &lt;:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={100}
                max={1000000}
                step={100}
                value={config.benAtmThreshold ?? 10000}
                onChange={(e) => updateField('benAtmThreshold', Math.max(0, Number(e.target.value) || 0))}
                className="w-20 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 text-[10px]">🐚</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-500">
            ⏳ Tự động đổi tối đa 20 triệu/giờ ra tiền mặt theo tỷ giá game. Tự canh đúng giờ mở đổi tiếp theo.
          </p>
        </div>
      )}

      {/* Boss Bí Ngô */}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1 border-t border-slate-200/60">
        <span className="flex items-center gap-1.5 font-medium">
          <span>👑 Săn Boss Bí Ngô (đếm ngược 10s thu cần chờ tại chỗ &amp; bám nhặt quà)</span>
        </span>
        <Switch
          checked={Boolean(config.benAutoBossHunt ?? true)}
          onCheckedChange={(c) => updateField('benAutoBossHunt', c)}
        />
      </label>
      {config.benAutoBossHunt !== false && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>🏃 Bám sát bước chân Boss khi di chuyển để nhặt quà</span>
            <Switch
              size="sm"
              checked={Boolean(config.benBossTracking ?? true)}
              onCheckedChange={(c) => updateField('benBossTracking', c)}
            />
          </label>
        </div>
      )}

      {/* Sạp Bà Tư Bí & Pháo Hoa Halloween */}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🎃 Sạp Bà Tư Bí: Tự đổi quà (10 xương + 5 bí)</span>
        </span>
        <Switch
          checked={Boolean(config.benAutoHlwExchange ?? false)}
          onCheckedChange={(c) => updateField('benAutoHlwExchange', c)}
        />
      </label>
      {config.benAutoHlwExchange !== false && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>🎁 Tự động mở Hộp quà Đêm Bí Ngô (hlwBox)</span>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoHlwOpenBox ?? true)}
              onCheckedChange={(c) => updateField('benAutoHlwOpenBox', c)}
            />
          </label>
          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>🎆 Tự bắn pháo hoa Bí Ngô tích lũy (+50⭐ Nổi tiếng)</span>
            <Switch
              size="sm"
              checked={Boolean(config.benAutoHlwFire ?? true)}
              onCheckedChange={(c) => updateField('benAutoHlwFire', c)}
            />
          </label>
        </div>
      )}

      {/* Hợp Tác Xã Cô Tư */}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🧺 Hợp Tác Xã Cô Tư: Tự điểm danh nhận quà hàng ngày</span>
        </span>
        <Switch
          checked={Boolean(config.benAutoHtxClaim ?? false)}
          onCheckedChange={(c) => updateField('benAutoHtxClaim', c)}
        />
      </label>

      {/* Chế độ ngủ thông minh tiết kiệm năng lượng */}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-1 border-t border-slate-200/60">
        <span className="flex items-center gap-1.5 font-medium">
          <span>🌙 Chế độ ngủ thông minh tiết kiệm pin &amp; CPU</span>
        </span>
        <Switch
          checked={Boolean(config.benSmartSleepMode ?? true)}
          onCheckedChange={(c) => updateField('benSmartSleepMode', c)}
        />
      </label>
    </div>
  );
}
