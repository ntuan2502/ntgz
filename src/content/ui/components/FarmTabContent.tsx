import React from 'react';
import { AppConfig, FarmSubAreaId } from '@/shared/types/config';
import { SUBAREA_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { HudSelect } from './HudSelect';

interface FarmTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function FarmTabContent({ config, onUpdateConfig }: FarmTabContentProps) {
  const isFarmAreaEnabled = config.areaEnabled.farm !== false;

  const handleToggleArea = (checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        farm: checked,
      },
    }));
  };

  const handleToggleSubEnabled = (subId: FarmSubAreaId, checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      farmSubEnabled: {
        ...prev.farmSubEnabled,
        [subId]: checked,
      },
    }));
  };

  const handleToggleCollapse = (subId: FarmSubAreaId) => {
    onUpdateConfig((prev) => ({
      ...prev,
      farmSubCollapsed: {
        ...prev.farmSubCollapsed,
        [subId]: !prev.farmSubCollapsed[subId],
      },
    }));
  };

  const handleMoveSub = (index: number, direction: 'up' | 'down') => {
    onUpdateConfig((prev) => {
      const order = [...prev.farmSubOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      const targetItem = order[targetIndex];
      if (temp && targetItem) {
        order[index] = targetItem;
        order[targetIndex] = temp;
      }
      return { ...prev, farmSubOrder: order };
    });
  };

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderSubCardBody = (subId: FarmSubAreaId) => {
    switch (subId) {
      case 'house':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💬 Tắt thông báo Loa &amp; Điện thoại</span>
              <Switch
                checked={Boolean(config.autoDismissInterrupts)}
                onCheckedChange={(c) => updateField('autoDismissInterrupts', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍳 Tự nấu món ăn trong Bếp</span>
              <Switch
                checked={Boolean(config.autoCook)}
                onCheckedChange={(c) => updateField('autoCook', c)}
              />
            </label>
            {config.autoCook && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Món ưu tiên:</span>
                  <HudSelect
                    value={config.preferDish}
                    onValueChange={(val) => updateField('preferDish', val)}
                    options={[
                      { value: 'auto', label: '✨ Tự chọn món đủ nguyên liệu' },
                      { value: 'radishSoup', label: '🍲 Canh củ cải (+20 no, +30 đã khát · 3 củ cải)' },
                      { value: 'boiledEgg', label: '🥚 Trứng luộc (+25 no · 2 trứng)' },
                      { value: 'grilledCorn', label: '🌽 Bắp nướng mỡ hành (+30 no · 2 ngô)' },
                      { value: 'carrotJuice', label: '🧃 Nước ép cà rốt (+40 đã khát, 💧 Không khát · 3 cà rốt)' },
                      { value: 'eggBread', label: '🥪 Bánh mì ốp la (+40 no, 💨 Đi nhanh · 2 trứng, 1 cà rốt)' },
                      { value: 'comTam', label: '🍛 Cơm tấm ốp la (+60 no, +20 đã khát, 🍚 Không đói · 2 trứng, 2 củ cải, 2 cà rốt)' },
                      { value: 'cornCake', label: '🥮 Bánh bắp nướng (+50 no, 🌾 Được mùa · 4 ngô, 2 trứng)' },
                    ]}
                  />
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍲 Tự ăn khi Đói</span>
              <Switch
                checked={Boolean(config.autoRecoverHunger)}
                onCheckedChange={(c) => updateField('autoRecoverHunger', c)}
              />
            </label>
            {config.autoRecoverHunger && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Ăn khi Đói &lt; (%):</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    step={5}
                    value={config.hungerThreshold}
                    onChange={(e) => updateField('hungerThreshold', Number(e.target.value))}
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Nguồn ăn:</span>
                  <HudSelect
                    value={config.foodSource}
                    onValueChange={(val) => updateField('foodSource', val as AppConfig['foodSource'])}
                    options={[
                      { value: 'kitchen_first', label: '🍲 Ưu tiên Bếp, thiếu mua Tiệm' },
                      { value: 'kitchen_only', label: '🏡 Chỉ món ăn Bếp, Kho' },
                      { value: 'shop_only', label: '🥖 Chỉ mua Tiệm' },
                    ]}
                  />
                </div>
                {config.foodSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Món ăn ở Bếp:</span>
                    <HudSelect
                      value={config.preferFoodKitchen || 'auto'}
                      onValueChange={(val) => updateField('preferFoodKitchen', val)}
                      options={[
                        { value: 'auto', label: '✨ Tự chọn món có sẵn trong Bếp' },
                        { value: 'radishSoup', label: '🍲 Canh củ cải (+20 no, +30 đã khát)' },
                        { value: 'boiledEgg', label: '🥚 Trứng luộc (+25 no)' },
                        { value: 'grilledCorn', label: '🌽 Bắp nướng mỡ hành (+30 no)' },
                        { value: 'eggBread', label: '🥪 Bánh mì ốp la (+40 no, 💨 Đi nhanh)' },
                        { value: 'comTam', label: '🍛 Cơm tấm ốp la (+60 no, +20 đã khát, 🍚 Không đói)' },
                        { value: 'cornCake', label: '🥮 Bánh bắp nướng (+50 no, 🌾 Được mùa)' },
                      ]}
                    />
                  </div>
                )}
                {config.foodSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Món mua ở Tiệm:</span>
                    <HudSelect
                      value={config.preferFoodShop}
                      onValueChange={(val) => updateField('preferFoodShop', val)}
                      options={[
                        { value: 'banhBao', label: '🥟 Bánh bao (+25 no · 8.000đ)' },
                        { value: 'banhMiTrung', label: '🍳 Bánh mì trứng (+35 no · 10.000đ)' },
                        { value: 'banhMiThit', label: '🥖 Bánh mì thịt (+50 no · 15.000đ)' },
                        { value: 'banhMiCha', label: '🐟 Bánh mì chả cá (+45 no, +5 nước · 15.000đ)' },
                        { value: 'banhMiFull', label: '🤤 Bánh mì full topping (+80 no · 25.000đ)' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🥤 Tự uống khi Khát</span>
              <Switch
                checked={Boolean(config.autoRecoverThirst)}
                onCheckedChange={(c) => updateField('autoRecoverThirst', c)}
              />
            </label>
            {config.autoRecoverThirst && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Uống khi Khát &lt; (%):</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    step={5}
                    value={config.thirstThreshold}
                    onChange={(e) => updateField('thirstThreshold', Number(e.target.value))}
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Nguồn nước:</span>
                  <HudSelect
                    value={config.drinkSource}
                    onValueChange={(val) => updateField('drinkSource', val as AppConfig['drinkSource'])}
                    options={[
                      { value: 'kitchen_first', label: '🧃 Ưu tiên Bếp, thiếu mua Tiệm' },
                      { value: 'kitchen_only', label: '🏡 Chỉ món nước Bếp, Kho' },
                      { value: 'shop_only', label: '🥤 Chỉ mua Tiệm' },
                    ]}
                  />
                </div>
                {config.drinkSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Nước ở Bếp:</span>
                    <HudSelect
                      value={config.preferDrinkKitchen || 'auto'}
                      onValueChange={(val) => updateField('preferDrinkKitchen', val)}
                      options={[
                        { value: 'auto', label: '✨ Tự chọn nước có sẵn trong Bếp' },
                        { value: 'radishSoup', label: '🍲 Canh củ cải (+30 đã khát, +20 no)' },
                        { value: 'carrotJuice', label: '🧃 Nước ép cà rốt (+40 đã khát, 💧 Không khát)' },
                        { value: 'comTam', label: '🍛 Cơm tấm ốp la (+20 đã khát, +60 no, 🍚 Không đói)' },
                      ]}
                    />
                  </div>
                )}
                {config.drinkSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Nước ở Tiệm:</span>
                    <HudSelect
                      value={config.preferDrinkShop}
                      onValueChange={(val) => updateField('preferDrinkShop', val)}
                      options={[
                        { value: 'traDa', label: '🧊 Trà đá (+20 nước · 3.000đ)' },
                        { value: 'nuocMia', label: '🥤 Nước mía (+35 nước · 8.000đ)' },
                        { value: 'caPheSua', label: '☕ Cà phê sữa đá (+25 nước, ⚡ Đi nhanh x1.5 · 12.000đ)' },
                        { value: 'traDao', label: '🍑 Trà đào cam sả (+50 nước · 15.000đ)' },
                        { value: 'traSua', label: '🧋 Trà sữa trân châu (+40 nước, +12 no · 18.000đ)' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>☕ Tự uống Cà phê sáng (+50% tốc độ chạy)</span>
              <Switch
                checked={Boolean(config.autoMorningCoffee)}
                onCheckedChange={(c) => updateField('autoMorningCoffee', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🔋 Tự sạc điện cho Xe máy điện EV</span>
              <Switch
                checked={Boolean(config.autoChargeVehicle)}
                onCheckedChange={(c) => updateField('autoChargeVehicle', c)}
              />
            </label>
            {config.autoChargeVehicle && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Sạc khi Pin &lt; (%):</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    step={5}
                    value={config.batteryThreshold}
                    onChange={(e) => updateField('batteryThreshold', Number(e.target.value))}
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
              </div>
            )}

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

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🛏️ Tự đi ngủ qua ngày mới</span>
              <Switch
                checked={Boolean(config.autoSleep)}
                onCheckedChange={(c) => updateField('autoSleep', c)}
              />
            </label>
            {config.autoSleep && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Giờ đi ngủ buổi tối (h):</span>
                  <input
                    type="number"
                    min={18}
                    max={23}
                    step={1}
                    value={config.sleepHour}
                    onChange={(e) => updateField('sleepHour', Number(e.target.value))}
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
                <label className="flex items-center justify-between text-slate-600">
                  <span>🌙 Ngủ ngay khi hết câu được buổi tối</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.sleepOnFishingLimit)}
                    onCheckedChange={(c) => updateField('sleepOnFishingLimit', c)}
                  />
                </label>
              </div>
            )}
          </div>
        );

      case 'crops':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🌾 Tự thu hoạch nông sản chín</span>
              <Switch
                checked={Boolean(config.autoHarvest)}
                onCheckedChange={(c) => updateField('autoHarvest', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🐛 Tự mua thuốc &amp; diệt sâu bệnh</span>
              <Switch
                checked={Boolean(config.autoPesticide)}
                onCheckedChange={(c) => updateField('autoPesticide', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💧 Tự tưới nước giữ ẩm đất</span>
              <Switch
                checked={Boolean(config.autoWater)}
                onCheckedChange={(c) => updateField('autoWater', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🧪 Tự mua &amp; bón phân NPK</span>
              <Switch
                checked={Boolean(config.autoFertilize)}
                onCheckedChange={(c) => updateField('autoFertilize', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🌱 Tự mua &amp; gieo hạt giống mới</span>
              <Switch
                checked={Boolean(config.autoPlant)}
                onCheckedChange={(c) => updateField('autoPlant', c)}
              />
            </label>
            {config.autoPlant && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Hạt giống ưu tiên:</span>
                  <HudSelect
                    value={config.preferSeed}
                    onValueChange={(val) => updateField('preferSeed', val)}
                    options={[
                      { value: 'auto', label: '✨ Tự chọn tối ưu' },
                      { value: 'radish', label: '🌱 Củ cải (2 ngày · Hạt 20.000đ · Bán 12.000đ)' },
                      { value: 'carrot', label: '🥕 Cà rốt (4 ngày · Hạt 40.000đ · Bán 28.000đ)' },
                      { value: 'corn', label: '🌽 Ngô (6 ngày · Hạt 60.000đ · Bán 50.000đ)' },
                      { value: 'rice', label: '🌾 Lúa thơm (8 ngày · Hạt 120.000đ · Bán 90.000đ)' },
                    ]}
                  />
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>⛏️ Tự mua thêm ô đất ruộng khi mở bán</span>
              <Switch
                checked={Boolean(config.autoBuyPlots)}
                onCheckedChange={(c) => updateField('autoBuyPlots', c)}
              />
            </label>
          </div>
        );

      case 'pet':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍖 Tự mua đồ ăn &amp; cho Thú cưng ăn</span>
              <Switch
                checked={Boolean(config.petAutoFeed)}
                onCheckedChange={(c) => updateField('petAutoFeed', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💖 Tự vuốt ve tăng vui vẻ</span>
              <Switch
                checked={Boolean(config.petAutoCuddle)}
                onCheckedChange={(c) => updateField('petAutoCuddle', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🧼 Tự tắm sạch cho Thú cưng</span>
              <Switch
                checked={Boolean(config.petAutoBath)}
                onCheckedChange={(c) => updateField('petAutoBath', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🎾 Tự tập trò huấn luyện (+XP)</span>
              <Switch
                checked={Boolean(config.petAutoTrick)}
                onCheckedChange={(c) => updateField('petAutoTrick', c)}
              />
            </label>
          </div>
        );

      case 'barn':
        return (
          <div className="space-y-2 text-xs">
            <div className="text-[11px] font-bold text-emerald-400 border-b border-slate-200 pb-1">
              🐃 Chuồng Trâu Ổi
            </div>
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

            <div className="text-[11px] font-bold text-emerald-400 border-b border-slate-200 pb-1 pt-2">
              🐄 Chuồng Bò Sữa
            </div>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🌿 Tự cho đàn Bò sữa ăn cỏ</span>
              <Switch
                checked={Boolean(config.barnAutoFeedCows)}
                onCheckedChange={(c) => updateField('barnAutoFeedCows', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🥛 Tự vắt sữa &amp; bán sữa tươi</span>
              <Switch
                checked={Boolean(config.barnAutoSellMilk)}
                onCheckedChange={(c) => updateField('barnAutoSellMilk', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💊 Tự mua thuốc &amp; chữa bệnh cho Bò</span>
              <Switch
                checked={Boolean(config.barnAutoCureCows)}
                onCheckedChange={(c) => updateField('barnAutoCureCows', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💸 Tự trả lương người phụ Chuồng</span>
              <Switch
                checked={Boolean(config.barnAutoPayHelper)}
                onCheckedChange={(c) => updateField('barnAutoPayHelper', c)}
              />
            </label>
          </div>
        );

      case 'coop':
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
              <span>💸 Tự trả lương người phụ Chuồng gà</span>
              <Switch
                checked={Boolean(config.coopAutoPayHelper)}
                onCheckedChange={(c) => updateField('coopAutoPayHelper', c)}
              />
            </label>
          </div>
        );

      case 'pond':
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
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💸 Tự trả lương người phụ Ao cá</span>
              <Switch
                checked={Boolean(config.pondAutoPayHelper)}
                onCheckedChange={(c) => updateField('pondAutoPayHelper', c)}
              />
            </label>
          </div>
        );

      case 'market':
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
              <span>📋 Tự giao đơn Bảng tin làng</span>
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
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>📜 Tự bán nông sản hoàn thành Việc Sổ tay</span>
              <Switch
                checked={Boolean(config.autoSellDailyTask)}
                onCheckedChange={(c) => updateField('autoSellDailyTask', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🏪 Tự bán nông sản dư thừa trong kho</span>
              <Switch
                checked={Boolean(config.autoSellProduce)}
                onCheckedChange={(c) => updateField('autoSellProduce', c)}
              />
            </label>
            {config.autoSellProduce && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tối thiểu giữ lại:</span>
                  <input
                    type="number"
                    min={5}
                    max={200}
                    step={5}
                    value={config.surplusKeepQty}
                    onChange={(e) => updateField('surplusKeepQty', Number(e.target.value))}
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
              </div>
            )}

            <div className="text-[11px] font-bold text-amber-400 border-b border-slate-200 pb-1 pt-2">
              🪙 Tiệm Vàng Cô Kim
            </div>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🪙 Tự mua vàng đầu tư</span>
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
                    className="w-20 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
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
                    className="w-14 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'dibay':
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
              <span>📜 Tự làm chuỗi hướng dẫn Ngày 1 &amp; 2</span>
              <Switch
                checked={Boolean(config.autoFirstDayTasks)}
                onCheckedChange={(c) => updateField('autoFirstDayTasks', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>📔 Tự thu thập trang Sổ tay Ông Năm</span>
              <Switch
                checked={Boolean(config.autoNotebookPages)}
                onCheckedChange={(c) => updateField('autoNotebookPages', c)}
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Giữ tiền mặt tối thiểu:</span>
                  <input
                    type="number"
                    min={50000}
                    max={5000000}
                    step={50000}
                    value={config.savingsKeepGold}
                    onChange={(e) => updateField('savingsKeepGold', Number(e.target.value))}
                    className="w-20 rounded-md bg-slate-50 px-1 py-0.5 text-center text-slate-800 border border-slate-200 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 text-xs">
      {/* Farm Banner Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2 text-emerald-900 shadow-xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🌾 Cho phép chạy Khu vực Nông Trại
        </span>
        <Switch checked={isFarmAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Sub-areas list */}
      <div className="space-y-2 pt-0.5">
        {config.farmSubOrder.map((subId, idx) => {
          const meta = SUBAREA_META[subId];
          const isCollapsed = Boolean(config.farmSubCollapsed[subId]);
          const isEnabled = config.farmSubEnabled[subId] !== false;

          return (
            <div
              key={subId}
              className={`rounded-xl border bg-white shadow-xs transition-all shadow-sm ${
                isEnabled
                  ? 'border-slate-200'
                  : 'border-slate-200/60 opacity-60'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-3 py-2 cursor-pointer select-none hover:bg-slate-50 rounded-t-xl"
                onClick={() => handleToggleCollapse(subId)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-xs text-slate-800">
                    {meta?.name || subId}
                  </span>
                </div>

                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={idx === 0}
                      className="h-5 w-5 text-slate-400 hover:text-slate-900"
                      onClick={() => handleMoveSub(idx, 'up')}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      disabled={idx === config.farmSubOrder.length - 1}
                      className="h-5 w-5 text-slate-400 hover:text-slate-900"
                      onClick={() => handleMoveSub(idx, 'down')}
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
