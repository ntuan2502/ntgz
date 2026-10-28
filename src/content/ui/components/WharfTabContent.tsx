import React, { useState } from 'react';
import { AppConfig, WharfSubAreaId } from '@/shared/types/config';
import { WHARF_SUBAREA_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp, GripVertical } from 'lucide-react';
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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndexRef = React.useRef<number | null>(null);

  const subOrder: WharfSubAreaId[] =
    Array.isArray(config.benSubOrder) && config.benSubOrder.length > 0
      ? config.benSubOrder
      : ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'];

  const handleToggleSubEnabled = (subId: WharfSubAreaId, checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      benSubEnabled: {
        ...(prev.benSubEnabled || {}),
        [subId]: checked,
      },
    }));
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

  const handleMoveSub = (index: number, direction: 'up' | 'down') => {
    onUpdateConfig((prev) => {
      const order = [...subOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      const targetItem = order[targetIndex];
      if (temp && targetItem) {
        order[index] = targetItem;
        order[targetIndex] = temp;
      }
      return { ...prev, benSubOrder: order };
    });
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragSourceIndexRef.current = index;
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDraggingIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const rawData = e.dataTransfer.getData('text/plain');
    const sourceIndex = dragSourceIndexRef.current !== null ? dragSourceIndexRef.current : Number(rawData);
    dragSourceIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
    if (sourceIndex === null || isNaN(sourceIndex) || sourceIndex === targetIndex) return;

    onUpdateConfig((prev) => {
      const order = [...subOrder];
      const [moved] = order.splice(sourceIndex, 1);
      if (moved) {
        order.splice(targetIndex, 0, moved);
      }
      return { ...prev, benSubOrder: order };
    });
  };

  const handleDragEnd = () => {
    dragSourceIndexRef.current = null;
    setDraggingIndex(null);
    setDragOverIndex(null);
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
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
                    ]}
                  />
                </div>
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
              <span>💆 Tiệm Út Mười: Gội đầu massage (+50⚡ · 25🐚)</span>
              <Switch
                checked={Boolean(config.benAutoGoiDau)}
                onCheckedChange={(c) => updateField('benAutoGoiDau', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍲 Tự ăn uống hồi phục khi không đủ Sức câu</span>
              <Switch
                checked={Boolean(config.benAutoRecoverStamina)}
                onCheckedChange={(c) => updateField('benAutoRecoverStamina', c)}
              />
            </label>
            {config.benAutoRecoverStamina && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Món ăn ưu tiên:</span>
                  <HudSelect
                    value={config.benPreferFood}
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
              </div>
            )}

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

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🔦 Tự động rọi đèn bắt dế ban đêm (18h-5h)</span>
              <Switch
                checked={Boolean(config.benAutoCricketHunt)}
                onCheckedChange={(c) => updateField('benAutoCricketHunt', c)}
              />
            </label>

            {config.benAutoCricketHunt && (
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

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🌿 Tự mua thức ăn bồi bổ dế mạnh nhất</span>
              <Switch
                checked={Boolean(config.benAutoFeedCricket)}
                onCheckedChange={(c) => updateField('benAutoFeedCricket', c)}
              />
            </label>
            {config.benAutoFeedCricket && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Chỉ số ưu tiên:</span>
                  <HudSelect
                    value={config.benPreferCricketFood || 'balanced'}
                    onValueChange={(val) => updateField('benPreferCricketFood', val as AppConfig['benPreferCricketFood'])}
                    options={[
                      { value: 'balanced', label: '✨ Tự cân bằng (bổ sung chỉ số xa trần nhất)' },
                      { value: 'tough', label: '🌿 Lá non (+5 Lì · 25 vỏ sò)' },
                      { value: 'power', label: '🥚 Trứng kiến (+5 Sức · 40 vỏ sò)' },
                      { value: 'nerve', label: '🌶️ Ớt hiểm (+5 Gan · 30 vỏ sò)' },
                    ]}
                  />
                </div>
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
          </div>
        );

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

      <div className="text-[11px] text-slate-500 px-1 flex items-center gap-1">
        <span>↕️ Kéo thả hoặc bấm mũi tên để sắp xếp độ ưu tiên hành động:</span>
      </div>

      {/* Sub-areas list with Drag & Drop */}
      <div className="space-y-2 pt-0.5">
        {subOrder.map((subId, idx) => {
          const meta = WHARF_SUBAREA_META[subId];
          const isCollapsed = Boolean(config.benSubCollapsed?.[subId]);
          const isEnabled = config.benSubEnabled?.[subId] !== false;
          const isDragging = draggingIndex === idx;
          const isDragOver = dragOverIndex === idx;

          return (
            <div
              key={subId}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, idx)}
              className={`relative rounded-xl border bg-white shadow-xs transition-all shadow-sm ${
                isDragging
                  ? 'opacity-40 border-dashed border-blue-400'
                  : isDragOver
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : isEnabled
                      ? 'border-slate-200'
                      : 'border-slate-200/60 opacity-60'
              }`}
            >
              {/* Header (Draggable) */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragEnd={handleDragEnd}
                className="flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none hover:bg-slate-50 rounded-t-xl"
                onClick={() => handleToggleCollapse(subId)}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <span
                    className="text-slate-400 hover:text-slate-700 p-0.5 -ml-1"
                    title="Kéo thả để sắp xếp độ ưu tiên"
                  >
                    <GripVertical className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-xs text-slate-800 truncate">
                    {meta?.name || subId}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={idx === 0}
                      className="h-5 w-5 text-slate-400 hover:text-slate-900"
                      onClick={() => handleMoveSub(idx, 'up')}
                      title="Tăng độ ưu tiên"
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={idx === subOrder.length - 1}
                      className="h-5 w-5 text-slate-400 hover:text-slate-900"
                      onClick={() => handleMoveSub(idx, 'down')}
                      title="Giảm độ ưu tiên"
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <Switch
                    size="sm"
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleSubEnabled(subId, checked)}
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
