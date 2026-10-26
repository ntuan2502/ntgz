import React, { useState } from 'react';
import { AppConfig, FarmstaySubAreaId } from '@/shared/types/config';
import { FARMSTAY_SUBAREA_META, FARMSTAY_VEG_SEEDS } from '@/shared/constants/default-config';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, ChevronUp, GripVertical } from 'lucide-react';
import { HudSelect } from './HudSelect';

interface FarmstayTabContentProps {
  config: AppConfig;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
}

export function FarmstayTabContent({ config, onUpdateConfig }: FarmstayTabContentProps) {
  const isFarmstayAreaEnabled = config.areaEnabled.farmstay !== false;
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragSourceIndexRef = React.useRef<number | null>(null);

  const subOrder: FarmstaySubAreaId[] =
    Array.isArray(config.farmstaySubOrder) && config.farmstaySubOrder.length > 0
      ? config.farmstaySubOrder
      : ['operation', 'repairs', 'garden', 'staff', 'orders'];

  const handleToggleArea = (checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        farmstay: checked,
      },
    }));
  };

  const handleToggleSubEnabled = (subId: FarmstaySubAreaId, checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      farmstaySubEnabled: {
        ...(prev.farmstaySubEnabled || {}),
        [subId]: checked,
      },
    }));
  };

  const handleToggleCollapse = (subId: FarmstaySubAreaId) => {
    onUpdateConfig((prev) => ({
      ...prev,
      farmstaySubCollapsed: {
        ...(prev.farmstaySubCollapsed || {}),
        [subId]: !prev.farmstaySubCollapsed?.[subId],
      },
    }));
  };

  const handleMoveSub = (index: number, direction: 'up' | 'down') => {
    onUpdateConfig((prev) => {
      const order = [...subOrder];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      order[index] = order[targetIndex];
      order[targetIndex] = temp;
      return {
        ...prev,
        farmstaySubOrder: order,
      };
    });
  };

  const handleDragStart = (index: number, e: React.DragEvent) => {
    setDraggingIndex(index);
    dragSourceIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (index: number, e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDrop = (targetIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const sourceIdx = dragSourceIndexRef.current ?? draggingIndex;
    if (sourceIdx !== null && sourceIdx !== targetIndex) {
      onUpdateConfig((prev) => {
        const order = [...subOrder];
        const [moved] = order.splice(sourceIdx, 1);
        order.splice(targetIndex, 0, moved);
        return {
          ...prev,
          farmstaySubOrder: order,
        };
      });
    }
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragSourceIndexRef.current = null;
  };

  const handleDragEnd = () => {
    setDraggingIndex(null);
    setDragOverIndex(null);
    dragSourceIndexRef.current = null;
  };

  const updateField = <K extends keyof AppConfig>(key: K, value: AppConfig[K]) => {
    onUpdateConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const renderSubAreaSettings = (subId: FarmstaySubAreaId) => {
    switch (subId) {
      case 'operation':
        return (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🚪 Tự động mở cửa đón khách (Khi có Cổng &amp; Quản lý)</span>
              <Switch
                checked={Boolean(config.farmstayAutoOpen)}
                onCheckedChange={(c) => updateField('farmstayAutoOpen', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>📖 Tự tiếp nhận cẩm nang đón khách du lịch</span>
              <Switch
                checked={Boolean(config.farmstayAutoGuide)}
                onCheckedChange={(c) => updateField('farmstayAutoGuide', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💰 Tự động thanh toán lương nhân viên</span>
              <Switch
                checked={Boolean(config.farmstayAutoPayStaff)}
                onCheckedChange={(c) => updateField('farmstayAutoPayStaff', c)}
              />
            </label>

            <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
              <span className="text-slate-600">Giữ lại tối thiểu vàng:</span>
              <HudSelect
                value={String(config.farmstayMinGoldKeep || 10000)}
                onValueChange={(val) => updateField('farmstayMinGoldKeep', Number(val))}
                options={[
                  { value: '5000', label: '5.000 vàng' },
                  { value: '10000', label: '10.000 vàng (khuyên dùng)' },
                  { value: '20000', label: '20.000 vàng' },
                  { value: '50000', label: '50.000 vàng' },
                  { value: '100000', label: '100.000 vàng' },
                ]}
              />
            </div>
          </div>
        );

      case 'repairs':
        return (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 italic">
              ✨ Khách nghỉ dưỡng có thể làm hỏng tiện ích (karaoke, thuyền, hồ bơi...). Tự động sửa chữa giúp giữ sao đánh giá 5.0 ⭐ và duy trì nguồn thu.
            </p>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🛠️ Tự động sửa chữa đồ khách làm hư hỏng</span>
              <Switch
                checked={Boolean(config.farmstayAutoRepair)}
                onCheckedChange={(c) => updateField('farmstayAutoRepair', c)}
              />
            </label>
          </div>
        );

      case 'garden':
        return (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🥬 Tự động chăm sóc vườn rau hữu cơ (24 luống)</span>
              <Switch
                checked={Boolean(config.farmstayAutoVeg)}
                onCheckedChange={(c) => updateField('farmstayAutoVeg', c)}
              />
            </label>

            {config.farmstayAutoVeg && (
              <div className="ml-2 pl-2.5 border-l-2 border-slate-200 space-y-2 text-[11px]">
                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <span>🧺 Tự thu hoạch rau chín vào kho bếp Farmstay</span>
                  <Switch
                    checked={Boolean(config.farmstayVegAutoHarvest)}
                    onCheckedChange={(c) => updateField('farmstayVegAutoHarvest', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <span>🚿 Tự tưới nước cho các luống rau khô</span>
                  <Switch
                    checked={Boolean(config.farmstayVegAutoWater)}
                    onCheckedChange={(c) => updateField('farmstayVegAutoWater', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <span>🧪 Tự bón phân hữu cơ (khi có sẵn phân)</span>
                  <Switch
                    checked={Boolean(config.farmstayVegAutoFeed)}
                    onCheckedChange={(c) => updateField('farmstayVegAutoFeed', c)}
                  />
                </label>

                <label className="flex items-center justify-between text-slate-700 cursor-pointer">
                  <span>🌱 Tự gieo hạt giống vào luống trống</span>
                  <Switch
                    checked={Boolean(config.farmstayVegAutoPlant)}
                    onCheckedChange={(c) => updateField('farmstayVegAutoPlant', c)}
                  />
                </label>

                {config.farmstayVegAutoPlant && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-slate-600 shrink-0">Loại hạt ưu tiên gieo:</span>
                    <HudSelect
                      value={config.farmstayVegPreferSeed || 'auto'}
                      onValueChange={(val) => updateField('farmstayVegPreferSeed', val)}
                      options={FARMSTAY_VEG_SEEDS.map((s) => ({
                        value: s.id,
                        label: `${s.icon} ${s.name}`,
                      }))}
                    />
                  </div>
                )}

                <label className="flex items-center justify-between text-slate-700 cursor-pointer pt-0.5">
                  <span>🚜 Tự khai hoang mở thêm luống rau mới</span>
                  <Switch
                    checked={Boolean(config.farmstayVegAutoBuyPlots)}
                    onCheckedChange={(c) => updateField('farmstayVegAutoBuyPlots', c)}
                  />
                </label>
              </div>
            )}
          </div>
        );

      case 'staff':
        return (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <p className="text-[11px] text-slate-500 italic">
              ✨ Gồm 5 nhân sự (Quản lý, Làm vườn, Đầu bếp, Tạp vụ, Hướng dẫn viên). Nâng điểm thân thiết lên 10 để mở khóa các đặc quyền.
            </p>
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>💬 Tự trò chuyện hàng ngày với nhân viên (Tăng thân thiết)</span>
              <Switch
                checked={Boolean(config.farmstayAutoChatStaff)}
                onCheckedChange={(c) => updateField('farmstayAutoChatStaff', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>📜 Tự động giải quyết tâm tư, sự kiện nhân viên</span>
              <Switch
                checked={Boolean(config.farmstayAutoAnswerStory)}
                onCheckedChange={(c) => updateField('farmstayAutoAnswerStory', c)}
              />
            </label>
          </div>
        );

      case 'orders':
        return (
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🍽️ Tự phục vụ món ăn cho khách (Khi đủ nguyên liệu)</span>
              <Switch
                checked={Boolean(config.farmstayAutoOrders)}
                onCheckedChange={(c) => updateField('farmstayAutoOrders', c)}
              />
            </label>

            <label className="flex items-center justify-between text-slate-700 cursor-pointer">
              <span>🚌 Tự động nhận tour đoàn du lịch Chị Hồng</span>
              <Switch
                checked={Boolean(config.farmstayAutoGroupBooking)}
                onCheckedChange={(c) => updateField('farmstayAutoGroupBooking', c)}
              />
            </label>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-2.5 text-xs font-sans text-slate-800">
      {/* Top Banner Toggle */}
      <div className="flex items-center justify-between rounded-xl bg-amber-50 border border-amber-200/80 px-3.5 py-2 text-amber-900 shadow-xs">
        <span className="font-semibold text-xs flex items-center gap-1.5">
          🏡 Cho phép chạy Khu vực Farmstay Ông Năm
        </span>
        <Switch checked={isFarmstayAreaEnabled} onCheckedChange={handleToggleArea} />
      </div>

      {/* Sub-areas list */}
      <div className="space-y-2">
        {subOrder.map((subId, index) => {
          const meta = FARMSTAY_SUBAREA_META[subId];
          const isEnabled = config.farmstaySubEnabled?.[subId] !== false;
          const isCollapsed = Boolean(config.farmstaySubCollapsed?.[subId]);
          const isDragging = draggingIndex === index;
          const isOver = dragOverIndex === index;

          return (
            <div
              key={subId}
              draggable
              onDragStart={(e) => handleDragStart(index, e)}
              onDragOver={(e) => handleDragOver(index, e)}
              onDrop={(e) => handleDrop(index, e)}
              onDragEnd={handleDragEnd}
              className={`rounded-xl border transition-all duration-150 ${
                isDragging
                  ? 'opacity-40 border-amber-400 bg-amber-50/50 scale-[0.98]'
                  : isOver
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                    : isEnabled
                      ? 'border-slate-200 bg-white shadow-xs hover:border-slate-300'
                      : 'border-slate-200/70 bg-slate-50/80 opacity-75'
              }`}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-3 py-2 select-none gap-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 shrink-0"
                    title="Kéo thả để đổi thứ tự ưu tiên"
                  >
                    <GripVertical className="h-4 w-4" />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleToggleCollapse(subId)}
                    className="flex items-center gap-1.5 min-w-0 flex-1 text-left font-semibold text-xs text-slate-800 hover:text-slate-900"
                  >
                    <span className="shrink-0">{meta.icon}</span>
                    <span className="truncate">{meta.name}</span>
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-0.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-0.5" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === 0}
                    onClick={() => handleMoveSub(index, 'up')}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Chuyển lên trên"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={index === subOrder.length - 1}
                    onClick={() => handleMoveSub(index, 'down')}
                    className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600 disabled:opacity-30"
                    title="Chuyển xuống dưới"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                  <Switch
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleToggleSubEnabled(subId, checked)}
                    title={isEnabled ? 'Tắt phân khu này' : 'Bật phân khu này'}
                  />
                </div>
              </div>

              {/* Body */}
              {!isCollapsed && (
                <div className="px-3 pb-3 text-[11px] text-slate-700">
                  {renderSubAreaSettings(subId)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
