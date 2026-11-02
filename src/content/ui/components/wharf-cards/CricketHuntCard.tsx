import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';
import { MultiSelectCombobox } from '../MultiSelectCombobox';

const CRICKET_SPECIES_OPTIONS = [
  { id: 'deVuong', label: 'Dế Vương (Huyền thoại)', icon: '👑' },
  { id: 'deMa', label: 'Dế Ma (Sử thi)', icon: '🔮' },
  { id: 'deSat', label: 'Dế Sắt (Sử thi)', icon: '🛡️' },
  { id: 'deNgoc', label: 'Dế Ngọc (Hiếm)', icon: '💎' },
  { id: 'deLua', label: 'Dế Lửa (Hiếm)', icon: '🔥' },
  { id: 'deVang', label: 'Dế Vàng (Hiếm)', icon: '🌟' },
  { id: 'deCo', label: 'Dế Cồ (Đặc biệt)', icon: '🪨' },
  { id: 'deTrui', label: 'Dế Trũi (Đặc biệt)', icon: '🕳️' },
  { id: 'deThan', label: 'Dế Than (Đặc biệt)', icon: '🪵' },
  { id: 'deMen', label: 'Dế Mèn (Thường)', icon: '🦗' },
  { id: 'deCom', label: 'Dế Cơm (Thường)', icon: '🌾' },
  { id: 'deDat', label: 'Dế Đất (Thường)', icon: '🌱' },
];

interface CricketHuntCardProps {
  config: AppConfig;
  isNightHuntOpen: boolean;
  vnHour: number;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function CricketHuntCard({ config, isNightHuntOpen, vnHour, updateField }: CricketHuntCardProps) {
  return (
    <div className="space-y-2.5 text-xs">
      <p className="text-[11px] text-slate-500 italic">
        🔦 Bắt dế đêm (18h-5h) tại đồng cỏ phía đông và bãi lau sậy. Tốn ⚡3 Sức, bẫy dế nuôi trong ống tre.
      </p>

      {!isNightHuntOpen && (
        <div className="rounded-lg bg-amber-50 border border-amber-200/80 p-2 text-[11px] text-amber-800 flex items-start gap-1.5">
          <span className="shrink-0 text-sm">☀️</span>
          <span>
            Hiện tại là {vnHour}h (ban ngày). Bến Đò chỉ mở bắt dế đêm vào khung giờ <strong>18h00 – 05h00 sáng</strong>. Ban ngày dế đang ngủ nên tính năng được tạm khóa.
          </span>
        </div>
      )}

      <label
        className={`flex items-center justify-between text-slate-700 ${
          !isNightHuntOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
      >
        <span>🔦 Tự động rọi đèn bắt dế ban đêm (18h-5h)</span>
        <Switch
          disabled={!isNightHuntOpen}
          checked={Boolean(isNightHuntOpen && config.benAutoCricketHunt)}
          onCheckedChange={(c) => updateField('benAutoCricketHunt', c)}
        />
      </label>

      {config.benAutoCricketHunt && isNightHuntOpen && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px] min-w-0">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Khu vực săn dế:</span>
            <HudSelect
              value={config.benHuntZone || 'field'}
              onValueChange={(val) => updateField('benHuntZone', val as AppConfig['benHuntZone'])}
              options={[
                { value: 'field', label: '🌾 Đồng cỏ phía đông (mọi loài · Dế vương 0h-3h)' },
                { value: 'reeds', label: '🎋 Bãi lau sậy (Dế ngọc · Dế ma 23h-4h)' },
                { value: 'rice', label: '🌾 Bờ ruộng (Dế trũi · Dế vàng · Dế sắt)' },
                { value: 'garden', label: '🥬 Quanh luống rau (Dế cồ · Dế lửa)' },
                { value: 'grass', label: '🌱 Bãi cỏ khắp bến (Dế đất · Dế cồ)' },
                { value: 'rotate', label: '🔄 Tự luân phiên qua lại các khu' },
              ]}
            />
          </div>

          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>🌙 Chỉ săn khung giờ Dế hiếm/khuya (23h-4h)</span>
            <Switch
              size="sm"
              checked={Boolean(config.benHuntRareOnly)}
              onCheckedChange={(c) => updateField('benHuntRareOnly', c)}
            />
          </label>
          <p className="text-[10px] text-slate-500">
            Dế ma (23h-4h, Sử thi · thả +120🐚) và Dế vương (0h-3h, Huyền thoại · thả +400🐚).
          </p>
        </div>
      )}

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🎋 Ống tre đầy (6/6): Tự thả dế yếu đổi vỏ sò</span>
        <Switch
          checked={Boolean(config.benAutoReleaseLowCricket)}
          onCheckedChange={(c) => updateField('benAutoReleaseLowCricket', c)}
        />
      </label>

      {config.benAutoReleaseLowCricket && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px] min-w-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className="text-slate-600 font-medium">Loài dế ưu tiên giữ trong ống tre:</span>
            <MultiSelectCombobox
              options={CRICKET_SPECIES_OPTIONS}
              value={config.benKeepCricketSpecies || ['deVuong', 'deMa', 'deSat', 'deNgoc', 'deLua', 'deVang']}
              onChange={(val) => updateField('benKeepCricketSpecies', val)}
              placeholder="Chọn các loài dế muốn giữ..."
            />
          </div>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            💡 Ưu tiên giữ lại dế có độ hiếm cao hơn và chỉ số CP cao hơn. Khi ống tre đầy (6/6), tự động thả con có CP thấp nhất hoặc không thuộc danh sách giữ để nhận lại vỏ sò (+5 đến +400🐚).
          </p>
        </div>
      )}
    </div>
  );
}
