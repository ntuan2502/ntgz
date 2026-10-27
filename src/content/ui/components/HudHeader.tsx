import React from 'react';
import { Badge } from '@/components/ui/badge';

interface HudHeaderProps {
  version: string;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onHide: () => void;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  onToggleMonitor?: () => void;
  isMonitorActive?: boolean;
}

export function HudHeader({
  version,
  isMinimized,
  onToggleMinimize,
  onHide,
  onCheckUpdate,
  isCheckingUpdate,
  onMouseDownDrag,
  onToggleMonitor,
  isMonitorActive,
}: HudHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/90 select-none cursor-move transition-colors"
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

      {/* Clean Center Title & Version */}
      <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight">
        <img
          src={chrome.runtime.getURL('images/icon-192.png')}
          alt="NTG"
          className="w-4 h-4 rounded-xs object-contain"
        />
        <span className="text-emerald-700">NTG Auto</span>
        <span className="text-slate-400 font-normal">by Tún</span>
        <Badge
          variant="outline"
          onClick={onCheckUpdate}
          className="ml-0.5 border-slate-200 bg-white px-1.5 py-0 text-[10px] font-mono text-slate-600 shadow-xs cursor-pointer hover:bg-slate-100 hover:text-emerald-700 transition-colors"
          title="Bấm để xem chi tiết nhật ký cập nhật (Changelog)"
        >
          v{version}
        </Badge>
      </div>

      {/* Right Shortcut & Monitor hint */}
      <div className="flex items-center gap-1.5" onMouseDown={(e) => e.stopPropagation()}>
        {onToggleMonitor && (
          <button
            type="button"
            onClick={onToggleMonitor}
            className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded font-medium border transition-colors cursor-pointer shadow-xs ${
              isMonitorActive
                ? 'bg-emerald-600 text-white border-emerald-700 font-bold'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100 hover:border-emerald-300'
            }`}
            title="Mở Trung tâm Giám sát Realtime (Kho, Mùa vụ, Tiết kiệm, Gia súc, Dế)"
          >
            <span>🎒</span>
            <span>Giám sát</span>
          </button>
        )}
        <span
          className="text-[10px] text-slate-400 font-mono bg-slate-200/60 rounded px-1.5 py-0.5 cursor-pointer hover:bg-slate-200 transition-colors"
          onClick={onHide}
          title="Phím tắt ẩn/hiện: Alt + P"
        >
          Alt+P
        </span>
      </div>
    </div>
  );
}
