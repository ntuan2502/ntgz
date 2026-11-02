import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';

interface CricketBossCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function CricketBossCard({ config, updateField }: CricketBossCardProps) {
  return (
    <div className="space-y-2.5 text-xs">
      <p className="text-[11px] text-slate-500 italic">
        🥊 Sới Dế Ông Sáu tại gốc đa (x:4, y:29). Thách đấu thang Boss nhận vỏ sò ngày đầu và điểm Trùm Sới đua BXH tuần.
      </p>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🥊 Tự thách đấu thang Boss Sới Dế mỗi ngày</span>
        <Switch
          checked={Boolean(config.benAutoBossBout)}
          onCheckedChange={(c) => updateField('benAutoBossBout', c)}
        />
      </label>
      <p className="text-[10px] text-slate-500 pl-2 border-l-2 border-slate-200">
        Lần lượt: Cu Bin (15🐚) ➔ Út Mập (30🐚) ➔ Anh Lực (60🐚) ➔ Bác Chín (110🐚) ➔ Ông Sáu (220🐚). Tự động dùng con dế khỏe nhất trong ống tre.
      </p>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🌾 Tự động &quot;Khều râu dế&quot; trong trận đấu</span>
        <Switch
          checked={Boolean(config.benAutoTickle)}
          onCheckedChange={(c) => updateField('benAutoTickle', c)}
        />
      </label>
      <p className="text-[10px] text-slate-500 pl-2 border-l-2 border-slate-200">
        Tự động khều râu theo nhịp để kích thích dế hăng máu, lấy đà húc mạnh và lật kèo đối thủ.
      </p>

      <label className="flex items-center justify-between text-slate-700 cursor-pointer">
        <span>🎲 Tự động Đặt Cửa sới dế (Trận PvP)</span>
        <Switch
          checked={Boolean(config.benAutoBet)}
          onCheckedChange={(c) => updateField('benAutoBet', c)}
        />
      </label>
      {config.benAutoBet && (
        <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
          <div className="flex items-center justify-between">
            <span className="text-slate-600">Số vỏ sò cược mỗi trận:</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={10}
                max={5000}
                step={10}
                value={config.benBetAmount || 50}
                onChange={(e) => updateField('benBetAmount', Number(e.target.value))}
                className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <span className="text-slate-500 text-[10px]">🐚</span>
            </div>
          </div>
          <p className="text-[10px] text-amber-600">
            ⚠️ Giới hạn tối đa 20 cược/ngày. Tự động soi chỉ số 2 bên để cược cửa có tỷ lệ thắng cao hơn.
          </p>
        </div>
      )}
    </div>
  );
}
