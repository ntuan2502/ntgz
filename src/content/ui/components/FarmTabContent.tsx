import React from 'react';
import { AppConfig, FarmSubAreaId } from '@/shared/types/config';
import { SUBAREA_META } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';

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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Món ưu tiên:</span>
                  <select
                    value={config.preferDish}
                    onChange={(e) => updateField('preferDish', e.target.value)}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="auto">✨ Tự chọn món đủ nguyên liệu</option>
                    <option value="radishSoup">🍲 Canh củ cải (+20 no, +30 đã khát · 3 củ cải)</option>
                    <option value="boiledEgg">🥚 Trứng luộc (+25 no · 2 trứng)</option>
                    <option value="grilledCorn">🌽 Bắp nướng mỡ hành (+30 no · 2 ngô)</option>
                    <option value="carrotJuice">🧃 Nước ép cà rốt (+40 đã khát, 💧 Không khát · 3 cà rốt)</option>
                    <option value="eggBread">🥪 Bánh mì ốp la (+40 no, 💨 Đi nhanh · 2 trứng, 1 cà rốt)</option>
                    <option value="comTam">🍛 Cơm tấm ốp la (+60 no, +20 đã khát, 🍚 Không đói · 2 trứng, 2 củ cải, 2 cà rốt)</option>
                    <option value="cornCake">🥮 Bánh bắp nướng (+50 no, 🌾 Được mùa · 4 ngô, 2 trứng)</option>
                  </select>
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Nguồn ăn:</span>
                  <select
                    value={config.foodSource}
                    onChange={(e) => updateField('foodSource', e.target.value as AppConfig['foodSource'])}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="kitchen_first">🍲 Ưu tiên Bếp, thiếu mua Tiệm</option>
                    <option value="kitchen_only">🏡 Chỉ món ăn Bếp, Kho</option>
                    <option value="shop_only">🥖 Chỉ mua Tiệm</option>
                  </select>
                </div>
                {config.foodSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 shrink-0">Món ăn ở Bếp:</span>
                    <select
                      value={config.preferFoodKitchen || 'auto'}
                      onChange={(e) => updateField('preferFoodKitchen', e.target.value)}
                      className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                    >
                      <option value="auto">✨ Tự chọn món có sẵn trong Bếp</option>
                      <option value="radishSoup">🍲 Canh củ cải (+20 no, +30 đã khát)</option>
                      <option value="boiledEgg">🥚 Trứng luộc (+25 no)</option>
                      <option value="grilledCorn">🌽 Bắp nướng mỡ hành (+30 no)</option>
                      <option value="eggBread">🥪 Bánh mì ốp la (+40 no, 💨 Đi nhanh)</option>
                      <option value="comTam">🍛 Cơm tấm ốp la (+60 no, +20 đã khát, 🍚 Không đói)</option>
                      <option value="cornCake">🥮 Bánh bắp nướng (+50 no, 🌾 Được mùa)</option>
                    </select>
                  </div>
                )}
                {config.foodSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 shrink-0">Món mua ở Tiệm:</span>
                    <select
                      value={config.preferFoodShop}
                      onChange={(e) => updateField('preferFoodShop', e.target.value)}
                      className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                    >
                      <option value="banhBao">🥟 Bánh bao (+25 no · 8.000đ)</option>
                      <option value="banhMiTrung">🍳 Bánh mì trứng (+35 no · 10.000đ)</option>
                      <option value="banhMiThit">🥖 Bánh mì thịt (+50 no · 15.000đ)</option>
                      <option value="banhMiCha">🐟 Bánh mì chả cá (+45 no, +5 nước · 15.000đ)</option>
                      <option value="banhMiFull">🤤 Bánh mì full topping (+80 no · 25.000đ)</option>
                    </select>
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
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
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Nguồn nước:</span>
                  <select
                    value={config.drinkSource}
                    onChange={(e) => updateField('drinkSource', e.target.value as AppConfig['drinkSource'])}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="kitchen_first">🧃 Ưu tiên Bếp, thiếu mua Tiệm</option>
                    <option value="kitchen_only">🏡 Chỉ món nước Bếp, Kho</option>
                    <option value="shop_only">🥤 Chỉ mua Tiệm</option>
                  </select>
                </div>
                {config.drinkSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 shrink-0">Nước ở Bếp:</span>
                    <select
                      value={config.preferDrinkKitchen || 'auto'}
                      onChange={(e) => updateField('preferDrinkKitchen', e.target.value)}
                      className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                    >
                      <option value="auto">✨ Tự chọn nước có sẵn trong Bếp</option>
                      <option value="radishSoup">🍲 Canh củ cải (+30 đã khát, +20 no)</option>
                      <option value="carrotJuice">🧃 Nước ép cà rốt (+40 đã khát, 💧 Không khát)</option>
                      <option value="comTam">🍛 Cơm tấm ốp la (+20 đã khát, +60 no, 🍚 Không đói)</option>
                    </select>
                  </div>
                )}
                {config.drinkSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-600 shrink-0">Nước ở Tiệm:</span>
                    <select
                      value={config.preferDrinkShop}
                      onChange={(e) => updateField('preferDrinkShop', e.target.value)}
                      className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                    >
                      <option value="traDa">🧊 Trà đá (+20 nước · 3.000đ)</option>
                      <option value="nuocMia">🥤 Nước mía (+35 nước · 8.000đ)</option>
                      <option value="caPheSua">☕ Cà phê sữa đá (+25 nước, ⚡ Đi nhanh x1.5 · 12.000đ)</option>
                      <option value="traDao">🍑 Trà đào cam sả (+50 nước · 15.000đ)</option>
                      <option value="traSua">🧋 Trà sữa trân châu (+40 nước, +12 no · 18.000đ)</option>
                    </select>
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Hạt giống ưu tiên:</span>
                  <select
                    value={config.preferSeed}
                    onChange={(e) => updateField('preferSeed', e.target.value)}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="auto">✨ Tự chọn tối ưu</option>
                    <option value="radish">🌱 Củ cải (2 ngày · Hạt 20.000đ · Bán 12.000đ)</option>
                    <option value="carrot">🥕 Cà rốt (4 ngày · Hạt 40.000đ · Bán 28.000đ)</option>
                    <option value="corn">🌽 Ngô (6 ngày · Hạt 60.000đ · Bán 50.000đ)</option>
                    <option value="rice">🌾 Lúa thơm (8 ngày · Hạt 120.000đ · Bán 90.000đ)</option>
                  </select>
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Loại giống thả:</span>
                  <select
                    value={config.preferPondFish}
                    onChange={(e) => updateField('preferPondFish', e.target.value)}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="ro">🐟 Cá rô đồng (3 ngày · Giống 8.000đ · Bán 26.000đ)</option>
                    <option value="tre">🐟 Cá trê (5 ngày · Giống 15.000đ · Bán 50.000đ)</option>
                    <option value="chep">🐟 Cá chép (7 ngày · Giống 25.000đ · Bán 90.000đ)</option>
                  </select>
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
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-600 shrink-0">Loại vàng ưu tiên:</span>
                  <select
                    value={config.goldPreferType}
                    onChange={(e) => updateField('goldPreferType', e.target.value)}
                    className="max-w-[235px] truncate rounded-md bg-slate-50 px-2 py-1 text-slate-800 border border-slate-200 text-xs"
                  >
                    <option value="mieng">🟨 Vàng miếng 9999 (~8,2tr · Chênh 1,6% · Hợp giữ lâu)</option>
                    <option value="nhan">💍 Nhẫn trơn 9999 (~7,6tr · Chênh 1,2% · Ổn định nhất)</option>
                    <option value="k18">📿 Vàng 18K (~5,6tr · Chênh 9% · Trang sức)</option>
                    <option value="non">🪙 Vàng non 10K (~3,1tr · Chênh 5% · Lướt sóng)</option>
                  </select>
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
