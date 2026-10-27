import React from 'react';
import { Settings } from 'lucide-react';

interface HudHeaderProps {
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onHide: () => void;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  onOpenSettings?: () => void;
  onToggleMonitor?: () => void;
  isMonitorActive?: boolean;
}

export function HudHeader({
  isMinimized,
  onToggleMinimize,
  onHide,
  onCheckUpdate,
  isCheckingUpdate,
  onMouseDownDrag,
  onOpenSettings,
  onToggleMonitor,
  isMonitorActive,
}: HudHeaderProps) {
  return (
    <div
      className="relative flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200/90 select-none cursor-move transition-colors"
      onMouseDown={onMouseDownDrag}
    >
      {/* macOS Traffic Light Buttons */}
      <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
        {/* Red: Ẩn bảng điều khiển */}
        <button
          type="button"
          onClick={onHide}
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 border border-red-600/40 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title="Ẩn bảng điều khiển (Alt+P)"
        >
          <span className="text-[8px] font-bold text-red-950 leading-none select-none">✕</span>
        </button>

        {/* Yellow: Thu gọn / Mở rộng */}
        <button
          type="button"
          onClick={onToggleMinimize}
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-400 hover:bg-amber-500 border border-amber-500/40 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title={isMinimized ? 'Mở rộng bảng điều khiển' : 'Thu gọn bảng điều khiển'}
        >
          <span className="text-[9px] font-bold text-amber-950 leading-none select-none">−</span>
        </button>

        {/* Green: Kiểm tra bản cập nhật mới */}
        <button
          type="button"
          onClick={onCheckUpdate}
          className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 border border-emerald-600/40 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title="Kiểm tra bản cập nhật mới từ GitHub"
        >
          <span
            className={`text-[9px] font-bold text-emerald-950 leading-none select-none ${
              isCheckingUpdate ? 'animate-spin inline-block' : ''
            }`}
          >
            ↻
          </span>
        </button>
      </div>

      {/* Clean Centered Title */}
      <div className="absolute left-1/2 -translate-x-1/2 font-bold text-xs tracking-tight text-emerald-700 pointer-events-none select-none">
        NTG Auto
      </div>

      {/* Right Corner: Giám sát (🎒) & Cài đặt (⚙️) icon buttons */}
      <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
        {onToggleMonitor && (
          <button
            type="button"
            onClick={onToggleMonitor}
            className={`flex h-6 w-6 items-center justify-center rounded-lg border text-xs transition-colors cursor-pointer shadow-2xs ${
              isMonitorActive
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-white text-slate-600 border-slate-200/90 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Mở Trung tâm Giám sát Realtime (Kho, Sổ cá, Dế, Tủ đồ)"
          >
            <span className="text-xs leading-none">🎒</span>
          </button>
        )}

        {onOpenSettings && (
          <button
            type="button"
            onClick={onOpenSettings}
            className="flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200/90 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer shadow-2xs"
            title="Mở Cài đặt hệ thống"
          >
            <Settings className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
