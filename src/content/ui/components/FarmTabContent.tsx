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
            <label className="flex items-center justify-between text-slate-300">
              <span>💬 Tắt thông báo Loa &amp; Điện thoại</span>
              <Switch
                checked={Boolean(config.autoDismissInterrupts)}
                onCheckedChange={(c) => updateField('autoDismissInterrupts', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🍳 Tự nấu món ăn trong Bếp</span>
              <Switch
                checked={Boolean(config.autoCook)}
                onCheckedChange={(c) => updateField('autoCook', c)}
              />
            </label>
            {config.autoCook && (
              <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Món ưu tiên:</span>
                  <select
                    value={config.preferDish}
                    onChange={(e) => updateField('preferDish', e.target.value)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
                  >
                    <option value="auto">✨ Tự chọn món đủ nguyên liệu</option>
                    <option value="comTam">🍛 Cơm tấm ốp la (No lâu)</option>
                    <option value="eggBread">🥪 Bánh mì ốp la (Tốc độ)</option>
                    <option value="radishSoup">🍲 Canh củ cải</option>
                    <option value="carrotJuice">🧃 Nước ép cà rốt</option>
                    <option value="grilledCorn">🌽 Bắp nướng mỡ hành</option>
                    <option value="boiledEgg">🥚 Trứng luộc</option>
                    <option value="cornCake">🥮 Bánh bắp nướng</option>
                  </select>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-300">
              <span>🍲 Tự ăn khi Đói</span>
              <Switch
                checked={Boolean(config.autoRecoverHunger)}
                onCheckedChange={(c) => updateField('autoRecoverHunger', c)}
              />
            </label>
            {config.autoRecoverHunger && (
              <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Ăn khi Đói &lt; (%):</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    step={5}
                    value={config.hungerThreshold}
                    onChange={(e) => updateField('hungerThreshold', Number(e.target.value))}
                    className="w-14 rounded bg-slate-800 px-1 py-0.5 text-center text-slate-200 border border-slate-700"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Nguồn ăn:</span>
                  <select
                    value={config.foodSource}
                    onChange={(e) => updateField('foodSource', e.target.value as AppConfig['foodSource'])}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
                  >
                    <option value="kitchen_first">🍲 Ưu tiên Bếp, thiếu mua Tiệm</option>
                    <option value="kitchen_only">🏡 Chỉ ăn món Bếp / Kho</option>
                    <option value="shop_only">🥖 Chỉ mua Tiệm bánh mì</option>
                  </select>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-300">
              <span>🥤 Tự uống khi Khát</span>
              <Switch
                checked={Boolean(config.autoRecoverThirst)}
                onCheckedChange={(c) => updateField('autoRecoverThirst', c)}
              />
            </label>
            {config.autoRecoverThirst && (
              <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Uống khi Khát &lt; (%):</span>
                  <input
                    type="number"
                    min={10}
                    max={90}
                    step={5}
                    value={config.thirstThreshold}
                    onChange={(e) => updateField('thirstThreshold', Number(e.target.value))}
                    className="w-14 rounded bg-slate-800 px-1 py-0.5 text-center text-slate-200 border border-slate-700"
                  />
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-300">
              <span>☕ Tự uống Cà phê sáng (+50% tốc độ chạy)</span>
              <Switch
                checked={Boolean(config.autoMorningCoffee)}
                onCheckedChange={(c) => updateField('autoMorningCoffee', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🔋 Tự sạc điện cho Xe máy điện EV</span>
              <Switch
                checked={Boolean(config.autoChargeVehicle)}
                onCheckedChange={(c) => updateField('autoChargeVehicle', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>😴 Tự về nhà ngủ khi hết ngày (&gt; 22:00)</span>
              <Switch
                checked={Boolean(config.autoSleep)}
                onCheckedChange={(c) => updateField('autoSleep', c)}
              />
            </label>
          </div>
        );

      case 'crops':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-300">
              <span>🌾 Tự thu hoạch cây chín</span>
              <Switch
                checked={Boolean(config.autoHarvest)}
                onCheckedChange={(c) => updateField('autoHarvest', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🌱 Tự gieo hạt giống vào đất trống</span>
              <Switch
                checked={Boolean(config.autoPlant)}
                onCheckedChange={(c) => updateField('autoPlant', c)}
              />
            </label>
            {config.autoPlant && (
              <div className="ml-2 pl-2 border-l border-slate-700/60 space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Loại hạt gieo:</span>
                  <select
                    value={config.preferSeed}
                    onChange={(e) => updateField('preferSeed', e.target.value)}
                    className="rounded bg-slate-800 px-2 py-0.5 text-slate-200 border border-slate-700 text-xs"
                  >
                    <option value="auto">✨ Tự chọn hạt trong túi</option>
                    <option value="radish">🌱 Củ cải trắng (Nhanh nhất)</option>
                    <option value="carrot">🥕 Cà rốt (Kinh tế cao)</option>
                    <option value="corn">🌽 Bắp ngô</option>
                    <option value="rice">🌾 Lúa gạo</option>
                  </select>
                </div>
              </div>
            )}

            <label className="flex items-center justify-between text-slate-300">
              <span>💧 Tự tưới nước khi đất khô</span>
              <Switch
                checked={Boolean(config.autoWater)}
                onCheckedChange={(c) => updateField('autoWater', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🐛 Tự bắt sâu khi cây bị sâu</span>
              <Switch
                checked={Boolean(config.autoPesticide)}
                onCheckedChange={(c) => updateField('autoPesticide', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🧪 Tự bón phân kích thích lớn</span>
              <Switch
                checked={Boolean(config.autoFertilize)}
                onCheckedChange={(c) => updateField('autoFertilize', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-300">
              <span>🏡 Tự mở rộng đất trồng mới</span>
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
            <label className="flex items-center justify-between text-slate-300">
              <span>🦴 Cho Gấu ăn xương gặm</span>
              <Switch
                checked={Boolean(config.petAutoFeed)}
                onCheckedChange={(c) => updateField('petAutoFeed', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🚿 Tắm rửa cho Gấu</span>
              <Switch
                checked={Boolean(config.petAutoBath)}
                onCheckedChange={(c) => updateField('petAutoBath', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>💖 Cưng nựng Gấu</span>
              <Switch
                checked={Boolean(config.petAutoCuddle)}
                onCheckedChange={(c) => updateField('petAutoCuddle', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>💃 Tập xiếc / Nhảy múa</span>
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
            <div className="text-[11px] font-semibold text-emerald-400 border-b border-slate-800 pb-0.5">
              🐃 Chuồng Trâu Ổi
            </div>
            <label className="flex items-center justify-between text-slate-300">
              <span>🌾 Cho Trâu ăn rơm</span>
              <Switch
                checked={Boolean(config.barnAutoFeedBuffalo)}
                onCheckedChange={(c) => updateField('barnAutoFeedBuffalo', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🚿 Tắm bùn cho Trâu</span>
              <Switch
                checked={Boolean(config.barnAutoBathBuffalo)}
                onCheckedChange={(c) => updateField('barnAutoBathBuffalo', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🚜 Cho Anh Tâm mượn trâu đi kéo</span>
              <Switch
                checked={Boolean(config.barnAutoLendBuffalo)}
                onCheckedChange={(c) => updateField('barnAutoLendBuffalo', c)}
              />
            </label>

            <div className="text-[11px] font-semibold text-emerald-400 border-b border-slate-800 pb-0.5 pt-2">
              🐄 Chuồng Bò Sữa
            </div>
            <label className="flex items-center justify-between text-slate-300">
              <span>🌿 Cho Bò sữa ăn cỏ tươi</span>
              <Switch
                checked={Boolean(config.barnAutoFeedCows)}
                onCheckedChange={(c) => updateField('barnAutoFeedCows', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🥛 Vắt sữa &amp; Bán sữa tươi</span>
              <Switch
                checked={Boolean(config.barnAutoSellMilk)}
                onCheckedChange={(c) => updateField('barnAutoSellMilk', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>💊 Chữa bệnh cho Bò khi ốm</span>
              <Switch
                checked={Boolean(config.barnAutoCureCows)}
                onCheckedChange={(c) => updateField('barnAutoCureCows', c)}
              />
            </label>
          </div>
        );

      case 'coop':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-300">
              <span>🥚 Nhặt trứng gà trong ổ</span>
              <Switch
                checked={Boolean(config.coopAutoCollectEggs)}
                onCheckedChange={(c) => updateField('coopAutoCollectEggs', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🐥 Tự mua thêm gà con khi chuồng trống</span>
              <Switch
                checked={Boolean(config.coopAutoBuyChick)}
                onCheckedChange={(c) => updateField('coopAutoBuyChick', c)}
              />
            </label>
          </div>
        );

      case 'pond':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-300">
              <span>🍞 Rải cám nuôi cá</span>
              <Switch
                checked={Boolean(config.pondAutoFeed)}
                onCheckedChange={(c) => updateField('pondAutoFeed', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🕸️ Kéo lưới bắt cá lớn</span>
              <Switch
                checked={Boolean(config.pondAutoNet)}
                onCheckedChange={(c) => updateField('pondAutoNet', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🐟 Mua thả cá giống mới khi ao trống</span>
              <Switch
                checked={Boolean(config.pondAutoStock)}
                onCheckedChange={(c) => updateField('pondAutoStock', c)}
              />
            </label>
          </div>
        );

      case 'market':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-300">
              <span>📦 Giao đơn hàng Chị Na (Tạp hoá)</span>
              <Switch
                checked={Boolean(config.autoDeliverOrder)}
                onCheckedChange={(c) => updateField('autoDeliverOrder', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🏘️ Giao việc Bảng tin Làng</span>
              <Switch
                checked={Boolean(config.autoVillageBoard)}
                onCheckedChange={(c) => updateField('autoVillageBoard', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>📈 Bán nông sản chạy theo Trend Giá</span>
              <Switch
                checked={Boolean(config.autoSellTrend)}
                onCheckedChange={(c) => updateField('autoSellTrend', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🌾 Bán nông sản dư trong kho</span>
              <Switch
                checked={Boolean(config.autoSellProduce)}
                onCheckedChange={(c) => updateField('autoSellProduce', c)}
              />
            </label>
          </div>
        );

      case 'dibay':
        return (
          <div className="space-y-2 text-xs">
            <label className="flex items-center justify-between text-slate-300">
              <span>🐷 Bỏ heo tiết kiệm Dì Bảy</span>
              <Switch
                checked={Boolean(config.autoFeedPiggy)}
                onCheckedChange={(c) => updateField('autoFeedPiggy', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🔨 Tự đập heo khi đầy</span>
              <Switch
                checked={Boolean(config.autoBreakPiggy)}
                onCheckedChange={(c) => updateField('autoBreakPiggy', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🏦 Tự gửi sổ tiết kiệm khi dư tiền</span>
              <Switch
                checked={Boolean(config.autoSavings)}
                onCheckedChange={(c) => updateField('autoSavings', c)}
              />
            </label>
            <label className="flex items-center justify-between text-slate-300">
              <span>🎉 Nhận thưởng Sổ tay &amp; Nhiệm vụ ngày</span>
              <Switch
                checked={Boolean(config.autoClaimQuests)}
                onCheckedChange={(c) => updateField('autoClaimQuests', c)}
              />
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2 text-xs">
      {/* Farm Banner Toggle */}
      <div className="flex items-center justify-between rounded-md bg-emerald-950/40 border border-emerald-500/30 px-3 py-2 text-emerald-300">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🌾 Cho phép chạy Khu vực Nông Trại
        </span>
        <Switch checked={isFarmAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Sub-areas list */}
      <div className="space-y-1.5 pt-0.5">
        {config.farmSubOrder.map((subId, idx) => {
          const meta = SUBAREA_META[subId];
          const isCollapsed = Boolean(config.farmSubCollapsed[subId]);
          const isEnabled = config.farmSubEnabled[subId] !== false;

          return (
            <div
              key={subId}
              className={`rounded-lg border bg-slate-900/80 transition-colors ${
                isEnabled ? 'border-slate-800' : 'border-slate-800/40 opacity-60'
              }`}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-2.5 py-1.5 cursor-pointer select-none hover:bg-slate-800/40 rounded-t-lg"
                onClick={() => handleToggleCollapse(subId)}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400">
                    {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                  </span>
                  <span className="font-semibold text-xs text-slate-200">
                    {meta?.name || subId}
                  </span>
                </div>

                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === 0}
                      className="h-5 w-5 text-slate-400 hover:text-white"
                      onClick={() => handleMoveSub(idx, 'up')}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="iconSm"
                      disabled={idx === config.farmSubOrder.length - 1}
                      className="h-5 w-5 text-slate-400 hover:text-white"
                      onClick={() => handleMoveSub(idx, 'down')}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>

                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleSubEnabled(subId, checked)}
                  />
                </div>
              </div>

              {/* Body */}
              {!isCollapsed && (
                <div className="border-t border-slate-800/60 p-2.5 bg-slate-950/40 rounded-b-lg">
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
