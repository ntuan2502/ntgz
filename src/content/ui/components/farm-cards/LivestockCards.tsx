import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';

interface FarmCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function BarnCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🌾 Tự cho Trâu ăn cỏ / rơm</span>
        <Switch
          checked={Boolean(config.barnAutoFeedBuffalo)}
          onCheckedChange={(c) => updateField('barnAutoFeedBuffalo', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🚿 Tự tắm mát cho Trâu</span>
        <Switch
          checked={Boolean(config.barnAutoBathBuffalo)}
          onCheckedChange={(c) => updateField('barnAutoBathBuffalo', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🤝 Cho hàng xóm thuê Trâu cày (+Tiền)</span>
        <Switch
          checked={Boolean(config.barnAutoLendBuffalo)}
          onCheckedChange={(c) => updateField('barnAutoLendBuffalo', c)}
        />
      </label>
      {config.barnAutoLendBuffalo && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Tâm trạng tối thiểu để cho thuê:</span>
            <input
              type="number"
              min={20}
              max={90}
              step={5}
              value={config.barnLendMoodMin}
              onChange={(e) => updateField('barnLendMoodMin', Number(e.target.value))}
              className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>
      )}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>💸 Tự trả lương Anh Tâm chăn trâu</span>
        <Switch
          checked={Boolean(config.barnAutoPayHelper)}
          onCheckedChange={(c) => updateField('barnAutoPayHelper', c)}
        />
      </label>
    </div>
  );
}

export function DairyCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🌿 Tự cho đàn Bò sữa ăn cỏ</span>
        <Switch
          checked={Boolean(config.dairyAutoFeedCows)}
          onCheckedChange={(c) => updateField('dairyAutoFeedCows', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🥛 Tự vắt sữa &amp; bán sữa tươi</span>
        <Switch
          checked={Boolean(config.dairyAutoSellMilk)}
          onCheckedChange={(c) => updateField('dairyAutoSellMilk', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>💊 Tự tiêm thuốc chữa bệnh cho Bò</span>
        <Switch
          checked={Boolean(config.dairyAutoCureCows)}
          onCheckedChange={(c) => updateField('dairyAutoCureCows', c)}
        />
      </label>
      {config.dairyAutoCureCows && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 text-[11px]">
          <label className="flex items-center justify-between text-slate-600 cursor-pointer">
            <span>Tự mua thuốc tiêm khi hết (-80.000đ)</span>
            <Switch
              size="sm"
              checked={Boolean(config.dairyAutoBuyMedicine)}
              onCheckedChange={(c) => updateField('dairyAutoBuyMedicine', c)}
            />
          </label>
        </div>
      )}
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🐄 Tự mua thêm Bò sữa khi chuồng trống (-1.800.000đ)</span>
        <Switch
          checked={Boolean(config.dairyAutoBuyCow)}
          onCheckedChange={(c) => updateField('dairyAutoBuyCow', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>💸 Tự trả lương Chị Mận chăm bò</span>
        <Switch
          checked={Boolean(config.dairyAutoPayHelper)}
          onCheckedChange={(c) => updateField('dairyAutoPayHelper', c)}
        />
      </label>
    </div>
  );
}

export function CoopCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🥚 Tự nhặt trứng gà mỗi ngày</span>
        <Switch
          checked={Boolean(config.coopAutoCollectEggs)}
          onCheckedChange={(c) => updateField('coopAutoCollectEggs', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🐤 Tự mua thêm Gà con khi chuồng trống</span>
        <Switch
          checked={Boolean(config.coopAutoBuyChick)}
          onCheckedChange={(c) => updateField('coopAutoBuyChick', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>💸 Tự trả lương Chú Ba chăm gà</span>
        <Switch
          checked={Boolean(config.coopAutoPayHelper)}
          onCheckedChange={(c) => updateField('coopAutoPayHelper', c)}
        />
      </label>
    </div>
  );
}

export function PondCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🐟 Tự kéo lưới thu hoạch cá trưởng thành</span>
        <Switch
          checked={Boolean(config.pondAutoNet)}
          onCheckedChange={(c) => updateField('pondAutoNet', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🍞 Tự rải cám cho cá ăn mỗi ngày</span>
        <Switch
          checked={Boolean(config.pondAutoFeed)}
          onCheckedChange={(c) => updateField('pondAutoFeed', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🐟 Tự thả cá giống mới khi ao trống</span>
        <Switch
          checked={Boolean(config.pondAutoStock)}
          onCheckedChange={(c) => updateField('pondAutoStock', c)}
        />
      </label>
      {config.pondAutoStock && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px] min-w-0 overflow-hidden">
          <div className="flex items-center justify-between gap-2 min-w-0">
            <span className="text-slate-600 shrink-0">Loại giống thả:</span>
            <HudSelect
              value={config.preferPondFish}
              onValueChange={(val) => updateField('preferPondFish', val)}
              options={[
                { value: 'ro', label: '🐟 Cá rô đồng (3 ngày · Giống 8.000đ · Bán 26.000đ)' },
                { value: 'tre', label: '🐟 Cá trê (5 ngày · Giống 15.000đ · Bán 50.000đ)' },
                { value: 'chep', label: '🐟 Cá chép (7 ngày · Giống 25.000đ · Bán 90.000đ)' },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function SalonCard({ config, updateField }: FarmCardProps) {
  return (
    <div className="space-y-2 text-xs">
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>💆 Salon Chị Linh: Gội đầu dưỡng sinh (Buff thư giãn)</span>
        <Switch
          checked={Boolean(config.autoSalonShampoo)}
          onCheckedChange={(c) => updateField('autoSalonShampoo', c)}
        />
      </label>
      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>✨ Salon Chị Linh: Tắm trắng nâng tông khi đen da</span>
        <Switch
          checked={Boolean(config.autoSalonWhiten)}
          onCheckedChange={(c) => updateField('autoSalonWhiten', c)}
        />
      </label>
    </div>
  );
}
