import React from 'react';
import { AppConfig, WharfSubAreaId } from '@/shared/types/config';
import { WHARF_SUBAREA_META, BAI_CROPS_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { HudSelect } from './HudSelect';
import { MultiSelectCombobox } from './MultiSelectCombobox';
import { MonitorTabId } from './monitor/MonitorHub';

interface WharfTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  onOpenMonitorTab?: (tab: MonitorTabId) => void;
}

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

export function WharfTabContent({ config, onUpdateConfig, onOpenMonitorTab: _onOpenMonitorTab }: WharfTabContentProps) {
  const vnDate = new Date(Date.now() + 7 * 3600 * 1000);
  const vnHour = vnDate.getUTCHours();
  const isNightHuntOpen = vnHour >= 18 || vnHour < 5;

  const subOrder: WharfSubAreaId[] = ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment', 'alluvialLand'];

  const handleToggleSubEnabled = (subId: WharfSubAreaId, checked: boolean) => {
    onUpdateConfig((prev) => {
      const nextEnabled = {
        ...(prev.benSubEnabled || {}),
        [subId]: checked,
      };

      // Continuous task mutual exclusion: fishing vs cricket hunt
      if (checked) {
        if (subId === 'fishing') {
          nextEnabled.cricketHunt = false;
        } else if (subId === 'cricketHunt') {
          if (!isNightHuntOpen) return prev; // Cannot enable cricket hunt during daytime
          nextEnabled.fishing = false;
        }
      }

      return {
        ...prev,
        benSubEnabled: nextEnabled,
      };
    });
  };

  const handleToggleCollapse = (subId: WharfSubAreaId) => {
    onUpdateConfig((prev) => ({
      ...prev,
      benSubCollapsed: {
        ...(prev.benSubCollapsed || {}),
        [subId]: !prev.benSubCollapsed?.[subId],
      },
    }));
  };

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderSubCardBody = (subId: WharfSubAreaId) => {
    switch (subId) {
      case 'fishing':
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
                  <span className="text-slate-600 block font-medium">Độ hiếm & phân loại giữ lại:</span>
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

      case 'cricketBoss':
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

      case 'cricketHunt':
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

            <label className={`flex items-center justify-between text-slate-700 ${!isNightHuntOpen ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
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

      case 'entertainment':
        return (
          <div className="space-y-2.5 text-xs">
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
                <span>👑 Săn Boss Bí Ngô (bám theo nhặt quà mỗi 30p)</span>
              </span>
              <Switch
                checked={Boolean(config.benAutoBossHunt ?? true)}
                onCheckedChange={(c) => updateField('benAutoBossHunt', c)}
              />
            </label>

            {/* Sạp Bà Tư Bí */}
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span className="flex items-center gap-1.5 font-medium">
                <span>🎃 Sạp Bà Tư Bí: Tự đổi quà (10 xương + 5 bí)</span>
              </span>
              <Switch
                checked={Boolean(config.benAutoHlwExchange ?? true)}
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
              </div>
            )}

            {/* Hợp Tác Xã Cô Tư */}
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span className="flex items-center gap-1.5 font-medium">
                <span>🧺 Hợp Tác Xã Cô Tư: Tự điểm danh nhận quà hàng ngày</span>
              </span>
              <Switch
                checked={Boolean(config.benAutoHtxClaim ?? true)}
                onCheckedChange={(c) => updateField('benAutoHtxClaim', c)}
              />
            </label>
          </div>
        );

      case 'alluvialLand': {
        const cropOptions = BAI_CROPS_META.map((c) => ({
          value: c.id,
          label: `${c.name} (${c.minutes}p · ${c.pearl ? `${c.pearlSeed}🦪` : `${c.seed}🐚`} · Thu ${c.yield} ${c.unit})`,
        }));

        return (
          <div className="space-y-3 text-xs">
            <p className="text-[11px] text-slate-500 italic">
              🌾 Vận hành trọn gói hệ sinh thái Chợ Bãi & Đất Của Mình: Luống rau, Lò kẹo dừa, Sân phơi khô cá, Chuồng gà vịt và Lưới cá sông.
            </p>

            {/* Mục 1: Đi đò & Đất bãi */}
            <div className="space-y-2">
              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium text-slate-800">⛵ Tự đi đò qua chăm sóc đất bãi khi có việc</span>
                  <p className="text-[10px] text-slate-400">
                    Chỉ qua sông khi rau chín, đất trống, kẹo xong, dừa/cá chín; xong việc lập tức về Bến Đò câu cá tiếp.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBaiFerry ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBaiFerry', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">📜 Tự mua giấy tay đất bãi (100.000 🐚)</span>
                  <p className="text-[10px] text-slate-400">
                    Tự động mua một mảnh đất bãi của Ông Tám khi ví có đủ 100k vỏ sò nếu chưa có đất.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBuyLand ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBuyLand', c)}
                />
              </label>
            </div>

            {/* Mục 2: Luống rau bãi phù sa */}
            <div className="border-t border-slate-200/80 pt-2 space-y-2">
              <span className="font-semibold text-emerald-800 block text-[11px]">🌱 Luống Rau & Canh Tác Phù Sa</span>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🧺 Tự thu hoạch, tưới nước & bón phân rau màu</span>
                  <p className="text-[10px] text-slate-400">
                    Tự gặt rau chín (thu Bí Ngô Con 🎃), bắt sâu, tưới luống khô và bón phân.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBaiCrops ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBaiCrops', c)}
                />
              </label>

              <div className="space-y-1">
                <span className="text-slate-700 font-medium">Hạt giống ưu tiên gieo trồng (Cô Sáu):</span>
                <HudSelect
                  value={config.benBaiPreferCrop || 'rauMuong'}
                  onValueChange={(val) => updateField('benBaiPreferCrop', val)}
                  options={cropOptions}
                />
              </div>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🛶 Tự bán rau tươi cho Ghe Lái Tư</span>
                  <p className="text-[10px] text-slate-400">
                    Bán toàn bộ rau củ thu hoạch cho thương lái ở Chợ Bãi lấy vỏ sò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBaiSellCrops ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBaiSellCrops', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🥥 Tự hái dừa xiêm & trồng dừa con</span>
                  <p className="text-[10px] text-slate-400">
                    Hái dừa xiêm ngọt lịm khi chín tích lũy nấu kẹo & trồng cây con vào mé sông.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoCocoPick ?? true)}
                  onCheckedChange={(c) => updateField('benAutoCocoPick', c)}
                />
              </label>
            </div>

            {/* Mục 3: Chuỗi Chế Biến Đặc Sản (Phase 2) */}
            <div className="border-t border-slate-200/80 pt-2 space-y-2">
              <span className="font-semibold text-amber-800 block text-[11px]">🍬 Chế Biến Đặc Sản: Lò Kẹo & Khô Cá</span>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🍬 Tự nấu & thu hoạch kẹo dừa (2h/mẻ)</span>
                  <p className="text-[10px] text-slate-400">
                    Tự nhóm lửa nấu dừa + đường mía khi lò trống và lấy kẹo thơm phức khi ra lò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoCandy ?? true)}
                  onCheckedChange={(c) => updateField('benAutoCandy', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🛒 Tự mua đường mía khi thiếu để nấu kẹo</span>
                  <p className="text-[10px] text-slate-400">
                    Tự động ghé sạp vật tư Chợ Bãi mua đường mía mỗi khi chuẩn bị nấu mẻ mới.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoBuySugar ?? true)}
                  onCheckedChange={(c) => updateField('benAutoBuySugar', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🐟 Tự phơi cá bến đò lên nong & thu khô cá</span>
                  <p className="text-[10px] text-slate-400">
                    Lọc cá thường câu được ở Bến Đò đem lên các nong tre phơi khô (giá trị gấp nhiều lần cá tươi).
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoDryFish ?? true)}
                  onCheckedChange={(c) => updateField('benAutoDryFish', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">📜 Tự cất khô cá vào Sổ khô cá (+⭐ Nổi tiếng)</span>
                  <p className="text-[10px] text-slate-400">
                    Ưu tiên cất loài khô cá mới hoặc kích thước lớn hơn vào bộ sưu tập DryDex.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoDryDexPut ?? true)}
                  onCheckedChange={(c) => updateField('benAutoDryDexPut', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🏪 Tự bán kẹo dừa & khô cá cho Cô Hai</span>
                  <p className="text-[10px] text-slate-400">
                    Ghé Tiệm đặc sản Cô Hai ở Chợ Bãi bán thanh kẹo dừa và khô cá thừa lấy vỏ sò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoCandySell ?? true)}
                  onCheckedChange={(c) => updateField('benAutoCandySell', c)}
                />
              </label>
            </div>

            {/* Mục 4: Chăn Nuôi & Thủy Sản Bãi Bồi (Phase 3) */}
            <div className="border-t border-slate-200/80 pt-2 space-y-2">
              <span className="font-semibold text-blue-800 block text-[11px]">🐔 Chăn Nuôi Gia Cầm & Lưới Quây Cá Sông</span>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🥚 Tự nhặt trứng gà, trứng vịt trong ổ rơm</span>
                  <p className="text-[10px] text-slate-400">
                    Tự gom trứng gà vịt trong chuồng tránh để đầy ổ gà vịt ngừng đẻ.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoCoop ?? true)}
                  onCheckedChange={(c) => updateField('benAutoCoop', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">💊 Tự mua thuốc & chữa bệnh cho gà vịt</span>
                  <p className="text-[10px] text-slate-400">
                    Phát hiện gia cầm bị ủ rũ, tự mua thuốc thú y Bà Bảy cho uống tránh chết gia cầm.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoCureBirds ?? true)}
                  onCheckedChange={(c) => updateField('benAutoCureBirds', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🥚 Tự bán trứng gia cầm cho Chú Năm</span>
                  <p className="text-[10px] text-slate-400">
                    Ghé sạp Chú Năm ở Chợ Bãi bán trứng gà và trứng vịt lấy vỏ sò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoEggSell ?? true)}
                  onCheckedChange={(c) => updateField('benAutoEggSell', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🎣 Tự kéo lưới thu hoạch cá sông trưởng thành</span>
                  <p className="text-[10px] text-slate-400">
                    Tự kéo lưới quây mé sông thu hoạch cá lớn đem vào kho.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoNet ?? true)}
                  onCheckedChange={(c) => updateField('benAutoNet', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🌾 Tự mua cám & rải cám nuôi cá sông</span>
                  <p className="text-[10px] text-slate-400">
                    Tự mua bao cám từ ghe Anh Mười rải cho cá ăn khi đói giúp cá lớn nhanh.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoFeedNet ?? true)}
                  onCheckedChange={(c) => updateField('benAutoFeedNet', c)}
                />
              </label>

              <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                <div>
                  <span className="font-medium">🐟 Tự bán cá nuôi cho Ghe Anh Mười</span>
                  <p className="text-[10px] text-slate-400">
                    Bán cá kéo lưới cho ghe Anh Mười ở Chợ Bãi thu vỏ sò.
                  </p>
                </div>
                <Switch
                  size="sm"
                  checked={Boolean(config.benAutoNetSell ?? true)}
                  onCheckedChange={(c) => updateField('benAutoNetSell', c)}
                />
              </label>
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      {/* Hiển thị bảng thao tác Bến Đò */}
      <div className="flex items-center justify-between rounded-xl bg-white border border-slate-200/90 px-3.5 py-2 text-slate-800 shadow-2xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          <span>👁️ Hiển thị bảng thao tác Bến Đò</span>
        </span>
        <Switch
          checked={Boolean(config.benShowFullActions)}
          onCheckedChange={(c) => updateField('benShowFullActions', c)}
        />
      </div>

      {/* ⚡ Hồi Phục Thể Lực Bến Đò (Dùng chung cho cả Câu Cá & Bắt Dế) */}
      {(() => {
        const isStaminaCollapsed = Boolean(config.benStaminaCollapsed);
        const isStaminaEnabled = config.benAutoRecoverStamina !== false;

        return (
          <div
            className={`rounded-xl border bg-white shadow-xs transition-all ${
              isStaminaEnabled ? 'border-amber-200/90' : 'border-slate-200/60 opacity-60'
            }`}
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between px-3 py-2 select-none hover:bg-amber-50/50 cursor-pointer ${
                isStaminaCollapsed ? 'rounded-xl' : 'rounded-t-xl'
              }`}
              onClick={() => updateField('benStaminaCollapsed', !isStaminaCollapsed)}
            >
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-amber-500">
                  {isStaminaCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </span>
                <span className="shrink-0 text-sm">⚡</span>
                <div className="min-w-0">
                  <span className="font-semibold text-xs text-slate-800 block truncate">
                    Hồi phục Thể Lực Bến Đò
                  </span>
                  <span className="block text-[10px] text-amber-700 font-medium truncate">
                    Tự ăn uống / gội đầu khi hết Sức
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Switch
                  size="sm"
                  checked={isStaminaEnabled}
                  onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
                  title="Bật/Tắt tự động hồi phục thể lực Bến Đò"
                />
              </div>
            </div>

            {/* Body */}
            {!isStaminaCollapsed && (
              <div className="p-3 border-t border-amber-100 bg-amber-50/20 rounded-b-xl space-y-2 text-[11px]">
                {isStaminaEnabled ? (
                  <>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-slate-600 shrink-0">Món ăn ưu tiên (Quán ăn Dì Tám):</span>
                      <HudSelect
                        value={config.benPreferFood || 'lauMam'}
                        onValueChange={(val) => updateField('benPreferFood', val)}
                        options={[
                          { value: 'lauMam', label: '🍲 Lẩu cá linh (+100 Sức · 45 vỏ sò)' },
                          { value: 'comTam', label: '🍛 Cơm tấm sườn bì (+60 Sức · 28 vỏ sò)' },
                          { value: 'huTieu', label: '🍜 Hủ tiếu nam vang (+40 Sức · 20 vỏ sò)' },
                          { value: 'chaoCa', label: '🥣 Cháo cá lóc (+28 Sức · 14 vỏ sò)' },
                          { value: 'banhMi', label: '🥖 Bánh mì thịt (+20 Sức · 10 vỏ sò)' },
                        ]}
                      />
                    </div>

                    <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-0.5">
                      <span>💆 Tiệm Út Mười: Gội đầu massage (+50⚡ · 25🐚)</span>
                      <Switch
                        size="sm"
                        checked={Boolean(config.benAutoGoiDau ?? true)}
                        onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 italic">
                      💡 Tự động ăn bánh mì, xôi bắp trong ba lô trước; nếu hết mới ghé Quán Dì Tám mua thức ăn hoặc tiệm Út Mười gội đầu.
                    </p>
                  </>
                ) : (
                  <p className="text-[10px] text-slate-400 italic">
                    Đang tắt tự động hồi phục thể lực. Nhân vật sẽ dừng hoạt động khi hết sức.
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Sub-areas list */}
      <div className="space-y-2 pt-0.5">
        {subOrder.map((subId) => {
          const meta = WHARF_SUBAREA_META[subId];
          const isCollapsed = Boolean(config.benSubCollapsed?.[subId]);
          const isEnabled = config.benSubEnabled?.[subId] !== false;

          return (
            <div
              key={subId}
              className={`rounded-xl border bg-white shadow-xs transition-all ${
                isEnabled ? 'border-slate-200' : 'border-slate-200/60 opacity-60'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-3 py-2 select-none hover:bg-slate-50 rounded-t-xl cursor-pointer"
                onClick={() => handleToggleCollapse(subId)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {meta?.name || subId}
                  </span>
                  {subId === 'cricketHunt' && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded font-medium shrink-0 ml-1 ${
                        isNightHuntOpen
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                      title={isNightHuntOpen ? 'Giờ săn dế đêm (18h-5h)' : 'Ban ngày dế đang ngủ. Giờ săn mở lúc 18h00 tối.'}
                    >
                      {isNightHuntOpen ? '🌙 Đang mở (18h-5h)' : '☀️ Dế ngủ'}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Switch
                    size="sm"
                    disabled={subId === 'cricketHunt' && !isNightHuntOpen}
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleSubEnabled(subId, checked)}
                    title={subId === 'cricketHunt' && !isNightHuntOpen ? 'Chỉ mở bắt dế vào ban đêm (18h-5h)' : undefined}
                  />
                </div>
              </div>

              {/* Body */}
              {!isCollapsed && (
                <div className="border-t border-slate-100 p-3 bg-slate-50/60 rounded-b-xl">
                  {renderSubCardBody(subId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
