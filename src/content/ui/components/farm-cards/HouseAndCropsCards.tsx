import React from 'react';
import { AppConfig } from '@/shared/types/config';
import { Switch } from '@/components/ui/switch';
import { HudSelect } from '../HudSelect';

interface FarmCardProps {
  config: AppConfig;
  updateField: <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => void;
}

export function HouseCard({ config, updateField }: FarmCardProps) {
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
}

export function CropsCard({ config, updateField }: FarmCardProps) {
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
}

export function PetCard({ config, updateField }: FarmCardProps) {
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
}
