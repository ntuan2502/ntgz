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
                  <span className="text-slate-600">Ngưỡng đói cần ăn (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={config.hungerThreshold ?? 10}
                    onChange={(e) => updateField('hungerThreshold', Number(e.target.value))}
                    className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span>Ăn no tới khi đầy 100%</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.eatUntilFull)}
                    onCheckedChange={(c) => updateField('eatUntilFull', c)}
                  />
                </label>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Nguồn thức ăn:</span>
                  <HudSelect
                    value={config.foodSource}
                    onValueChange={(val) => updateField('foodSource', val as AppConfig['foodSource'])}
                    options={[
                      { value: 'kitchen_first', label: '🍲 Bếp trước ➔ Tiệm sau' },
                      { value: 'kitchen_only', label: '🏠 Chỉ ăn món trong Bếp' },
                      { value: 'shop_only', label: '🥖 Chỉ mua Tiệm bánh' },
                    ]}
                  />
                </div>
                {config.foodSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Ưu tiên Bếp:</span>
                    <HudSelect
                      value={config.preferFoodKitchen}
                      onValueChange={(val) => updateField('preferFoodKitchen', val)}
                      options={[
                        { value: 'auto', label: '✨ Tự chọn món có sẵn' },
                        { value: 'radishSoup', label: '🍲 Canh củ cải (+20 no, +30 đã khát)' },
                        { value: 'boiledEgg', label: '🥚 Trứng luộc (+25 no)' },
                        { value: 'grilledCorn', label: '🌽 Bắp nướng mỡ hành (+30 no)' },
                        { value: 'eggBread', label: '🥪 Bánh mì ốp la (+40 no)' },
                        { value: 'comTam', label: '🍛 Cơm tấm ốp la (+60 no)' },
                        { value: 'cornCake', label: '🥮 Bánh bắp nướng (+50 no)' },
                      ]}
                    />
                  </div>
                )}
                {config.foodSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Ưu tiên Tiệm bánh:</span>
                    <HudSelect
                      value={config.preferFoodShop}
                      onValueChange={(val) => updateField('preferFoodShop', val)}
                      options={[
                        { value: 'banhMiThit', label: '🥖 Bánh mì thịt (+35 no · 15.000đ)' },
                        { value: 'banhMiCha', label: '🐟 Bánh mì chả (+35 no · 15.000đ)' },
                        { value: 'banhMiTrung', label: '🍳 Bánh mì trứng (+25 no · 10.000đ)' },
                        { value: 'banhBao', label: '🥟 Bánh bao (+20 no · 8.000đ)' },
                        { value: 'banhMiFull', label: '🤤 Bánh mì full topping (+55 no · 25.000đ)' },
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
                  <span className="text-slate-600">Ngưỡng khát cần uống (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={config.thirstThreshold ?? 10}
                    onChange={(e) => updateField('thirstThreshold', Number(e.target.value))}
                    className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span>Uống tới khi đã khát 100%</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.drinkUntilFull)}
                    onCheckedChange={(c) => updateField('drinkUntilFull', c)}
                  />
                </label>
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Nguồn đồ uống:</span>
                  <HudSelect
                    value={config.drinkSource}
                    onValueChange={(val) => updateField('drinkSource', val as AppConfig['drinkSource'])}
                    options={[
                      { value: 'kitchen_first', label: '🧃 Bếp trước ➔ Quán sau' },
                      { value: 'kitchen_only', label: '🏠 Chỉ uống nước trong Bếp' },
                      { value: 'shop_only', label: '🥤 Chỉ mua Quán nước' },
                    ]}
                  />
                </div>
                {config.drinkSource !== 'shop_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Ưu tiên Bếp:</span>
                    <HudSelect
                      value={config.preferDrinkKitchen}
                      onValueChange={(val) => updateField('preferDrinkKitchen', val)}
                      options={[
                        { value: 'auto', label: '✨ Tự chọn nước có sẵn' },
                        { value: 'radishSoup', label: '🍲 Canh củ cải (+30 đã khát, +20 no)' },
                        { value: 'carrotJuice', label: '🧃 Nước ép cà rốt (+40 đã khát)' },
                        { value: 'comTam', label: '🍛 Cơm tấm ốp la (+20 đã khát, +60 no)' },
                      ]}
                    />
                  </div>
                )}
                {config.drinkSource !== 'kitchen_only' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Ưu tiên Quán nước:</span>
                    <HudSelect
                      value={config.preferDrinkShop}
                      onValueChange={(val) => updateField('preferDrinkShop', val)}
                      options={[
                        { value: 'nuocMia', label: '🥤 Nước mía (+20 khát · 8.000đ)' },
                        { value: 'traDa', label: '🧊 Trà đá (+10 khát · 3.000đ)' },
                        { value: 'caPheSua', label: '☕ Cà phê sữa (+25 khát, chạy nhanh · 12.000đ)' },
                        { value: 'traDao', label: '🍑 Trà đào cam sả (+30 khát · 15.000đ)' },
                        { value: 'traSua', label: '🧋 Trà sữa trân châu (+35 khát · 18.000đ)' },
                      ]}
                    />
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🔋 Tự sạc Xe điện EV</span>
              <Switch
                checked={Boolean(config.autoChargeVehicle)}
                onCheckedChange={(c) => updateField('autoChargeVehicle', c)}
              />
            </label>
            {config.autoChargeVehicle && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Sạc khi pin dưới (%):</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={config.batteryThreshold ?? 10}
                    onChange={(e) => updateField('batteryThreshold', Number(e.target.value))}
                    className="w-16 h-8 min-h-8 rounded-lg bg-slate-50 px-2 py-1 text-center text-xs text-slate-800 border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>😴 Tự về nhà đi ngủ qua ngày mới</span>
              <Switch
                checked={Boolean(config.autoSleep)}
                onCheckedChange={(c) => updateField('autoSleep', c)}
              />
            </label>

            {config.autoSleep && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px]">
                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <div className="flex flex-col pr-2">
                    <span className="font-medium text-slate-700">Đi ngủ trễ lúc 22h30 (chờ Chợ Đêm)</span>
                    <span className="text-[10px] text-slate-500">
                      {config.sleepLate ? 'Bật: Chờ đến 22h30 để bán Chợ Đêm' : 'Tắt: Ngủ sớm lúc 19h00 ngay khi xong việc'}
                    </span>
                  </div>
                  <Switch
                    checked={Boolean(config.sleepLate)}
                    onCheckedChange={(c) => updateField('sleepLate', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <div className="flex flex-col pr-2">
                    <span className="font-medium text-slate-700">Tua nhanh nhịp thời gian (Clock Turbo)</span>
                    <span className="text-[10px] text-slate-500">
                      {config.clockTurbo !== false
                        ? 'Bật: Tự nhích nhanh đồng hồ khi xong việc để tới giờ ngủ trong 15-20s'
                        : 'Tắt: Chờ thời gian trôi tự nhiên theo nhịp game'}
                    </span>
                  </div>
                  <Switch
                    checked={config.clockTurbo !== false}
                    onCheckedChange={(c) => updateField('clockTurbo', c)}
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
              <span>🐛 Tự xịt thuốc diệt sâu bệnh</span>
              <Switch
                checked={Boolean(config.autoPesticide)}
                onCheckedChange={(c) => updateField('autoPesticide', c)}
              />
            </label>
            {config.autoPesticide && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 text-[11px]">
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span>Tự mua thuốc sâu khi hết (-8.000đ)</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.autoBuyPesticide)}
                    onCheckedChange={(c) => updateField('autoBuyPesticide', c)}
                  />
                </label>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💧 Tự tưới nước giữ ẩm đất</span>
              <Switch
                checked={Boolean(config.autoWater)}
                onCheckedChange={(c) => updateField('autoWater', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🧪 Tự bón phân NPK</span>
              <Switch
                checked={Boolean(config.autoFertilize)}
                onCheckedChange={(c) => updateField('autoFertilize', c)}
              />
            </label>
            {config.autoFertilize && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 text-[11px]">
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span>Tự mua phân NPK khi hết (-15.000đ)</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.autoBuyFertilizer)}
                    onCheckedChange={(c) => updateField('autoBuyFertilizer', c)}
                  />
                </label>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🌱 Tự gieo hạt giống vào ô đất trống</span>
              <Switch
                checked={Boolean(config.autoPlant)}
                onCheckedChange={(c) => updateField('autoPlant', c)}
              />
            </label>
            {config.autoPlant && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <label className="flex items-center justify-between text-slate-600 cursor-pointer">
                  <span>Tự mua hạt giống khi hết</span>
                  <Switch
                    size="sm"
                    checked={Boolean(config.autoBuySeeds)}
                    onCheckedChange={(c) => updateField('autoBuySeeds', c)}
                  />
                </label>
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

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💸 Tự trả lương Tèo phụ ruộng</span>
              <Switch
                checked={Boolean(config.autoPayHelperCrops)}
                onCheckedChange={(c) => updateField('autoPayHelperCrops', c)}
              />
            </label>
          </div>
        );

      case 'pet':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍖 Tự cho Thú cưng ăn hàng ngày</span>
              <Switch
                checked={Boolean(config.petAutoFeed)}
                onCheckedChange={(c) => updateField('petAutoFeed', c)}
              />
            </label>
            {config.petAutoFeed && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-1.5 text-[11px] min-w-0 overflow-hidden">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-slate-600 shrink-0">Chế độ cho ăn:</span>
                  <HudSelect
                    value={config.petFeedMode}
                    onValueChange={(val) => updateField('petFeedMode', val as AppConfig['petFeedMode'])}
                    options={[
                      { value: 'smart_diet', label: '✨ Thông minh theo loài (món ưa thích nhất)' },
                      { value: 'inventory_only', label: '📦 Chỉ ăn đồ có sẵn trong kho (không mua)' },
                      { value: 'fav_only', label: '💖 Chỉ ăn món ưa thích (+nhiều tim)' },
                      { value: 'custom', label: '🍽️ Chỉ ăn món chỉ định bên dưới' },
                    ]}
                  />
                </div>

                {config.petFeedMode === 'custom' && (
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="text-slate-600 shrink-0">Món chỉ định:</span>
                    <HudSelect
                      value={config.petPreferFood}
                      onValueChange={(val) => updateField('petPreferFood', val)}
                      options={[
                        { value: 'auto', label: '✨ Tự động theo loài' },
                        { value: 'xuong', label: '🦴 Xương gặm (Chó)' },
                        { value: 'cakho', label: '🐟 Cá khô (Mèo)' },
                        { value: 'pate', label: '🥫 Pate cá ngừ (Chó/Mèo)' },
                        { value: 'hat', label: '🥣 Hạt tổng hợp (Chó/Mèo)' },
                        { value: 'coKho', label: '🌿 Cỏ khô (Thỏ)' },
                        { value: 'cam', label: '🌾 Cám heo (Heo)' },
                        { value: 'crop:carrot', label: '🥕 Cà rốt (Thỏ/Heo)' },
                        { value: 'crop:corn', label: '🌽 Bắp ngô (Heo)' },
                        { value: 'crop:radish', label: '🌱 Củ cải (Thỏ/Heo)' },
                      ]}
                    />
                  </div>
                )}

                {config.petFeedMode !== 'inventory_only' && (
                  <>
                    <label className="flex items-center justify-between text-slate-600 cursor-pointer pt-0.5">
                      <span>🛒 Tự mua thêm thức ăn khi trong kho hết</span>
                      <Switch
                        size="sm"
                        checked={Boolean(config.petAutoBuyFood)}
                        onCheckedChange={(c) => updateField('petAutoBuyFood', c)}
                      />
                    </label>

                    {config.petAutoBuyFood && (
                      <div className="flex items-center justify-between gap-2 min-w-0">
                        <span className="text-slate-600 shrink-0">Loại thức ăn mua:</span>
                        <HudSelect
                          value={config.petBuyFoodType}
                          onValueChange={(val) => updateField('petBuyFoodType', val)}
                          options={[
                            { value: 'auto_fav', label: '✨ Tự mua món ưa thích của Pet' },
                            { value: 'pate', label: '🥫 Pate cá ngừ (3.000đ)' },
                            { value: 'hat', label: '🥣 Hạt tổng hợp (3.000đ)' },
                            { value: 'xuong', label: '🦴 Xương gặm (2.000đ)' },
                            { value: 'cakho', label: '🐟 Cá khô (2.500đ)' },
                            { value: 'coKho', label: '🌿 Cỏ khô (1.500đ)' },
                            { value: 'cam', label: '🌾 Cám heo (2.000đ)' },
                          ]}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💖 Tự vuốt ve tăng vui vẻ (3 lần/ngày)</span>
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
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🦮 Tự dắt Thú cưng đi dạo mát quanh làng</span>
              <Switch
                checked={Boolean(config.petAutoWalk)}
                onCheckedChange={(c) => updateField('petAutoWalk', c)}
              />
            </label>
          </div>
        );

      case 'barn':
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

      case 'dairy':
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
              <span>💸 Tự trả lương Chú Ba chăm gà</span>
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
          </div>
        );

      case 'salon':
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

      case 'nightMarket':
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

      case 'goldShop':
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
