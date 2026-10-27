import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { AREA_META } from '@/shared/constants/default-config';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { clearSessionLogs } from '../hud-core';
import { HudSubHeader } from './HudSubHeader';
import {
  Clock,
  Eye,
  ListOrdered,
  RotateCcw,
  Trash2,
  ChevronUp,
  ChevronDown,
  ShieldCheck,
  Sliders,
} from 'lucide-react';

interface SettingsViewProps {
  config: AppConfig;
  version: string;
  onUpdateConfig: (updater: (prev: AppConfig) => AppConfig) => void;
  onClose: () => void;
  onResetSize: () => void;
  hudSize?: { width: number; height: number };
  onApplySize?: (width: number, height: number) => void;
}

export function SettingsView({
  config,
  version,
  onUpdateConfig,
  onClose,
  onResetSize,
  hudSize,
  onApplySize,
}: SettingsViewProps) {
  const currentW = hudSize?.width ?? config.hudWidth ?? 400;
  const currentH = hudSize?.height ?? config.hudHeight ?? 800;

  const [inputWidth, setInputWidth] = React.useState<string>(() => String(currentW));
  const [inputHeight, setInputHeight] = React.useState<string>(() => String(currentH));

  React.useEffect(() => {
    setInputWidth(String(currentW));
    setInputHeight(String(currentH));
  }, [currentW, currentH]);

  const handleApplySize = () => {
    const rawW = parseInt(inputWidth, 10);
    const rawH = parseInt(inputHeight, 10);
    const maxW = Math.max(800, window.innerWidth || 1920);
    const maxH = Math.max(800, window.innerHeight || 1080);
    const finalW = Math.max(340, Math.min(maxW, isNaN(rawW) ? currentW : rawW));
    const finalH = Math.max(360, Math.min(maxH, isNaN(rawH) ? currentH : rawH));
    setInputWidth(String(finalW));
    setInputHeight(String(finalH));
    if (onApplySize) {
      onApplySize(finalW, finalH);
    } else {
      onUpdateConfig((prev) => ({
        ...prev,
        hudWidth: finalW,
        hudHeight: finalH,
      }));
    }
  };

  const handleDelayChange = (vals: number[]) => {
    const val = vals[0] ?? 1200;
    onUpdateConfig((prev) => ({ ...prev, taskDelayMs: val }));
  };

  const handleRepeatDelayChange = (vals: number[]) => {
    const val = vals[0] ?? 100;
    onUpdateConfig((prev) => ({ ...prev, actionRepeatDelayMs: val }));
  };

  const activeAreaOrder = config.areaOrder.filter((a) => a !== 'benDo');

  const handleMoveArea = (index: number, direction: 'up' | 'down') => {
    onUpdateConfig((prev) => {
      const order = prev.areaOrder.filter((a) => a !== 'benDo');
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= order.length) return prev;
      const temp = order[index];
      const targetItem = order[targetIndex];
      if (temp && targetItem) {
        order[index] = targetItem;
        order[targetIndex] = temp;
      }
      return { ...prev, areaOrder: order };
    });
  };

  const handleToggleAreaEnabled = (id: AreaId, checked: boolean) => {
    onUpdateConfig((prev) => ({
      ...prev,
      areaEnabled: {
        ...prev.areaEnabled,
        [id]: checked,
      },
    }));
  };

  const getDelayBadge = (ms: number) => {
    if (ms < 600) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-medium shrink-0">
          ⚡ Nhanh
        </span>
      );
    }
    if (ms <= 1800) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium shrink-0">
          ✅ Chuẩn
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-medium shrink-0">
        🐢 An toàn
      </span>
    );
  };

  const getRepeatDelayBadge = (ms: number) => {
    if (ms === 0) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/80 font-bold shrink-0">
          🚀 Đồng loạt
        </span>
      );
    }
    if (ms <= 250) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium shrink-0">
          ⚡ Siêu tốc
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/80 font-medium shrink-0">
        🚶 Từng ô
      </span>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50 text-slate-800">
      <HudSubHeader title="⚙️ Cài đặt hệ thống" version={version} onBack={onClose} />

      {/* Scrollable Settings Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* 1. Tốc độ & Độ trễ chuyển bước thao tác */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-3 shadow-2xs">
          {/* Slider 1: Độ trễ chuyển bước khác loại */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                <Clock className="h-4 w-4 text-emerald-600 shrink-0" />
                <span className="truncate">Độ trễ chuyển bước (Khác loại)</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {getDelayBadge(config.taskDelayMs)}
                <span className="font-mono text-emerald-700 font-bold text-xs bg-emerald-50/80 border border-emerald-200/70 px-1.5 py-0.5 rounded-md">
                  {config.taskDelayMs} ms
                </span>
              </div>
            </div>

            <div className="pt-0.5">
              <Slider
                value={[config.taskDelayMs]}
                min={300}
                max={3500}
                step={100}
                onValueChange={handleDelayChange}
                className="w-full"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Khoảng nghỉ khi chuyển giữa các nhóm việc (Thu hoạch ➔ Gieo hạt ➔ Tưới nước ➔ Chăm vật nuôi...).
            </p>
          </div>

          <div className="border-t border-slate-100" />

          {/* Slider 2: Tốc độ lặp lệnh cùng loại */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
                <Clock className="h-4 w-4 text-purple-600 shrink-0" />
                <span className="truncate">Tốc độ lặp lệnh cùng loại</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {getRepeatDelayBadge(config.actionRepeatDelayMs ?? 100)}
                <span className="font-mono text-purple-700 font-bold text-xs bg-purple-50/80 border border-purple-200/70 px-1.5 py-0.5 rounded-md">
                  {config.actionRepeatDelayMs ?? 100} ms
                </span>
              </div>
            </div>

            <div className="pt-0.5">
              <Slider
                value={[config.actionRepeatDelayMs ?? 100]}
                min={0}
                max={1000}
                step={50}
                onValueChange={handleRepeatDelayChange}
                className="w-full"
              />
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Khoảng cách giữa các ô đất cùng loại (Tưới ô 1 ➔ ô 2...). Kéo về <strong className="text-purple-700 font-bold">0ms</strong> để <strong>làm đồng loạt cả vườn</strong>!
            </p>
          </div>
        </div>

        {/* 2. Chế độ hiển thị thao tác (Stealth vs Full Actions) */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Eye className="h-4 w-4 text-indigo-600 shrink-0" />
              <span>Hiển thị đầy đủ thao tác</span>
            </div>
            <Switch
              size="sm"
              checked={Boolean(config.showFullActions)}
              onCheckedChange={(checked) =>
                onUpdateConfig((prev) => ({ ...prev, showFullActions: checked }))
              }
            />
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 space-y-1 text-[11px]">
            <div className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>{config.showFullActions ? '👁️ Đang mở giao diện gốc' : '🕶️ Chế độ chạy ngầm (Khuyến nghị)'}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {config.showFullActions
                ? 'Mở đầy đủ các bảng popup của game (Vòng quay lồng đèn, ATM, menu sạp hàng...) để xem trực quan.'
                : 'Không mở popup menu che màn hình game. Lệnh được gửi ngầm mượt mà, màn hình luôn sạch sẽ.'}
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-2.5 py-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="leading-snug">
              <strong>Bảo vệ Anti-cheat:</strong> Nhân vật luôn tự động đi bộ tới vị trí NPC trước khi thực hiện hành động, đảm bảo an toàn tuyệt đối.
            </span>
          </div>
        </div>

        {/* 3. Thứ tự & Điều phối Đa khu vực */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 min-w-0">
              <ListOrdered className="h-4 w-4 text-amber-600 shrink-0" />
              <span className="truncate">Thứ tự điều phối các khu</span>
            </div>
            <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2 py-0.5 rounded-full font-medium shrink-0">
              ✨ Đổi thông minh
            </span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Thứ tự ưu tiên chạy từ trên xuống dưới khi bật chế độ <strong>▶️ TẤT CẢ (Alt+A)</strong>. Hệ thống tự động chuyển khu tiếp theo ngay khi xong việc:
          </p>

          <div className="space-y-1.5">
            {activeAreaOrder.map((areaId, idx) => {
              const meta = AREA_META[areaId];
              const isEnabled = config.areaEnabled[areaId] !== false;
              return (
                <div
                  key={areaId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-200/80 text-[11px] hover:bg-slate-100/70 transition-colors h-9"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 font-bold w-4.5 shrink-0 text-center">
                      #{idx + 1}
                    </span>
                    <span className="text-sm shrink-0 leading-none">{meta?.icon || '📍'}</span>
                    <span className={`text-xs truncate ${isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}`}>
                      {meta?.name || areaId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === 0}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        onClick={() => handleMoveArea(idx, 'up')}
                        title="Đẩy lên trước"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === activeAreaOrder.length - 1}
                        className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 disabled:opacity-30 cursor-pointer flex items-center justify-center"
                        onClick={() => handleMoveArea(idx, 'down')}
                        title="Đẩy xuống sau"
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <Switch
                      size="sm"
                      checked={isEnabled}
                      onCheckedChange={(checked) => handleToggleAreaEnabled(areaId, checked)}
                      title={isEnabled ? 'Khu vực đang được bật Auto' : 'Khu vực đã bị tắt'}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Kích thước & Tiện ích HUD */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-3 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Sliders className="h-4 w-4 text-slate-600 shrink-0" />
              <span>Kích thước bảng điều khiển HUD</span>
            </div>
            <span className="text-[11px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
              {currentW} × {currentH} px
            </span>
          </div>

          <div className="grid grid-cols-5 gap-2 items-end">
            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-slate-500 font-medium block">Chiều rộng (W)</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={340}
                  max={1920}
                  step={10}
                  value={inputWidth}
                  onChange={(e) => setInputWidth(e.target.value)}
                  className="w-full h-8 rounded-lg bg-slate-50 pl-2.5 pr-6 text-xs text-slate-800 font-mono font-medium border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="400"
                />
                <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none">px</span>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-[10px] text-slate-500 font-medium block">Chiều cao (H)</label>
              <div className="relative flex items-center">
                <input
                  type="number"
                  min={360}
                  max={1200}
                  step={10}
                  value={inputHeight}
                  onChange={(e) => setInputHeight(e.target.value)}
                  className="w-full h-8 rounded-lg bg-slate-50 pl-2.5 pr-6 text-xs text-slate-800 font-mono font-medium border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="800"
                />
                <span className="absolute right-2 text-[10px] text-slate-400 pointer-events-none select-none">px</span>
              </div>
            </div>

            <div className="col-span-1">
              <Button
                variant="default"
                size="sm"
                className="w-full h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer rounded-lg shadow-2xs"
                onClick={handleApplySize}
              >
                Áp dụng
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-100" />

          <div className="grid grid-cols-2 gap-2 pt-0.5">
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-[11px] h-8 px-2 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs truncate"
              onClick={onResetSize}
              title="Khôi phục kích thước chuẩn 400×800 px"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5 shrink-0 text-slate-500" />
              <span className="truncate">Mặc định (400×800)</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-[11px] h-8 px-2 rounded-lg border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer shadow-2xs truncate"
              onClick={() => {
                clearSessionLogs();
              }}
              title="Xóa toàn bộ nhật ký phiên làm việc"
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5 shrink-0 text-red-500" />
              <span className="truncate">Xóa nhật ký log</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
