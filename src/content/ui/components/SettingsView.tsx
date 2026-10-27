import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { AREA_META } from '@/shared/constants/default-config';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { clearSessionLogs } from '../hud-core';
import {
  ArrowLeft,
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
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
          ⚡ Nhanh
        </span>
      );
    }
    if (ms <= 1800) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
          ✅ Chuẩn & Khuyến nghị
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
        🐢 Rất an toàn
      </span>
    );
  };

  const getRepeatDelayBadge = (ms: number) => {
    if (ms === 0) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 font-bold">
          🚀 Tức thì 0ms (Đồng loạt cả vườn)
        </span>
      );
    }
    if (ms <= 250) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
          ⚡ Siêu tốc & Mượt
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 font-medium">
        🚶 Nhịp từng ô
      </span>
    );
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-slate-50 text-slate-800">
      {/* Edge-to-edge Header Bar with Back Button */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white border-b border-slate-200/90 shrink-0 select-none shadow-2xs">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-7.5 px-2 -ml-1 cursor-pointer font-medium"
          onClick={onClose}
        >
          <ArrowLeft className="h-4 w-4 mr-1 text-slate-500" />
          Quay lại bảng điều khiển
        </Button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-xs text-slate-700">⚙️ Cài đặt hệ thống</span>
          <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-slate-50">
            v{version}
          </Badge>
        </div>
      </div>

      {/* Scrollable Settings Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* 1. Tốc độ & Độ trễ chuyển bước thao tác */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-3.5 shadow-2xs">
          {/* Slider 1: Độ trễ chuyển bước khác loại */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Clock className="h-4 w-4 text-emerald-600" />
                <span>Độ trễ chuyển bước thao tác (Khác loại)</span>
              </div>
              <div className="flex items-center gap-2">
                {getDelayBadge(config.taskDelayMs)}
                <span className="font-mono text-emerald-700 font-bold text-xs">
                  {config.taskDelayMs} ms
                </span>
              </div>
            </div>

            <div className="pt-1">
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
              Khoảng nghỉ khi chuyển giữa các nhóm việc khác nhau (Thu hoạch ➔ Gieo hạt ➔ Tưới nước ➔ Chăm sóc vật nuôi ➔ Đổi khu).
            </p>
          </div>

          <div className="border-t border-slate-100" />

          {/* Slider 2: Tốc độ lặp lệnh cùng loại */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <Clock className="h-4 w-4 text-purple-600" />
                <span>Tốc độ lặp lệnh cùng loại (Tưới / Gieo / Bón)</span>
              </div>
              <div className="flex items-center gap-2">
                {getRepeatDelayBadge(config.actionRepeatDelayMs ?? 100)}
                <span className="font-mono text-purple-700 font-bold text-xs">
                  {config.actionRepeatDelayMs ?? 100} ms
                </span>
              </div>
            </div>

            <div className="pt-1">
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
              Khoảng cách giữa các ô đất cùng loại (Tưới ô 1 ➔ ô 2 ➔ ô 3...). Kéo về <strong className="text-purple-700">0ms</strong> để kích hoạt cơ chế <strong>Làm đồng loạt cả vườn trong 1 lượt</strong>!
            </p>
          </div>
        </div>

        {/* 2. Chế độ hiển thị thao tác (Stealth vs Full Actions) */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <Eye className="h-4 w-4 text-indigo-600" />
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

          <div className="rounded-lg bg-slate-50 border border-slate-200/80 p-2.5 space-y-1.5 text-[11px]">
            <div className="flex items-start gap-1.5">
              <span className="font-bold text-slate-700 shrink-0">
                {config.showFullActions ? '👁️ Đang BẬT UI Gốc:' : '🕶️ Đang chạy ngầm (Khuyến nghị):'}
              </span>
              <span className="text-slate-600">
                {config.showFullActions
                  ? 'Mở đầy đủ các bảng popup của game (Vòng quay lồng đèn quay số, bảng ATM, menu sạp hàng...) để xem trực quan.'
                  : 'Không mở popup menu che màn hình game. Lệnh được gửi ngầm mượt mà, màn hình luôn sạch sẽ.'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-2.5 py-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Bảo vệ Anti-cheat:</strong> Nhân vật luôn tự động đi bộ tới vị trí NPC trước khi thực hiện hành động, đảm bảo an toàn tuyệt đối.
            </span>
          </div>
        </div>

        {/* 3. Thứ tự & Điều phối Đa khu vực */}
        <div className="rounded-xl border border-slate-200/90 bg-white p-3 space-y-2.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ListOrdered className="h-4 w-4 text-amber-600" />
              <span>Thứ tự & Điều phối các khu</span>
            </div>
            <Badge variant="outline" className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200/80 font-medium">
              ✨ Tự đổi thông minh khi xong việc
            </Badge>
          </div>

          <p className="text-[11px] text-slate-500">
            Thứ tự ưu tiên chạy từ trên xuống dưới khi bật chế độ <strong>▶️ TẤT CẢ (Alt+A)</strong>. Hệ thống sẽ tự động chuyển khu tiếp theo ngay khi hoàn tất các việc được bật trong khu hiện tại:
          </p>

          <div className="space-y-1.5">
            {activeAreaOrder.map((areaId, idx) => {
              const meta = AREA_META[areaId];
              const isEnabled = config.areaEnabled[areaId] !== false;
              return (
                <div
                  key={areaId}
                  className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-1.5 border border-slate-200/80 text-[11px] hover:bg-slate-100/70 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold w-4">
                      #{idx + 1}
                    </span>
                    <span className="text-sm">{meta?.icon || '📍'}</span>
                    <span className={isEnabled ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}>
                      {meta?.name || areaId}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === 0}
                        className="h-5.5 w-5.5 text-slate-500 hover:text-slate-900"
                        onClick={() => handleMoveArea(idx, 'up')}
                        title="Đẩy lên trước"
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        disabled={idx === activeAreaOrder.length - 1}
                        className="h-5.5 w-5.5 text-slate-500 hover:text-slate-900"
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
              <Sliders className="h-4 w-4 text-slate-600" />
              <span>Kích thước bảng điều khiển HUD</span>
            </div>
            <span className="text-[11px] font-mono font-semibold text-slate-500">
              {currentW} × {currentH} px
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500 font-medium">Chiều rộng (W)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={340}
                  max={1920}
                  step={10}
                  value={inputWidth}
                  onChange={(e) => setInputWidth(e.target.value)}
                  className="w-full h-7 rounded-lg bg-slate-50 px-2 text-xs text-slate-800 font-mono font-medium border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Width"
                />
                <span className="text-[10px] text-slate-400">px</span>
              </div>
            </div>

            <div className="flex-1 space-y-1">
              <span className="text-[10px] text-slate-500 font-medium">Chiều cao (H)</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={360}
                  max={1200}
                  step={10}
                  value={inputHeight}
                  onChange={(e) => setInputHeight(e.target.value)}
                  className="w-full h-7 rounded-lg bg-slate-50 px-2 text-xs text-slate-800 font-mono font-medium border border-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  placeholder="Height"
                />
                <span className="text-[10px] text-slate-400">px</span>
              </div>
            </div>

            <div className="pt-4">
              <Button
                variant="default"
                size="sm"
                className="h-7 text-xs px-3 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer font-medium"
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
              className="w-full justify-center text-[11px] h-8 rounded-lg border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer shadow-2xs"
              onClick={onResetSize}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1 text-slate-500" />
              Đặt lại kích thước HUD (400×800)
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="w-full justify-center text-[11px] h-8 rounded-lg border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 cursor-pointer shadow-2xs"
              onClick={() => {
                clearSessionLogs();
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1 text-red-500" />
              Xóa sạch nhật ký log
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
