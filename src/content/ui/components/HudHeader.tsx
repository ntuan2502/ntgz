import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Moon, Sun } from 'lucide-react';

interface HudHeaderProps {
  version: string;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onHide: () => void;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function HudHeader({
  version,
  theme,
  onToggleTheme,
  isMinimized,
  onToggleMinimize,
  onHide,
  onCheckUpdate,
  isCheckingUpdate,
  onMouseDownDrag,
}: HudHeaderProps) {
  return (
    <div
      className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100/90 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200 select-none cursor-move transition-colors rounded-t-2xl"
      onMouseDown={onMouseDownDrag}
    >
      {/* macOS Traffic Light Buttons */}
      <div className="flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onHide}
          className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title="Ẩn bảng điều khiển (Alt+P)"
        >
          <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-red-950 leading-none">✕</span>
        </button>

        <button
          type="button"
          onClick={onToggleMinimize}
          className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title={isMinimized ? 'Mở rộng' : 'Thu gọn'}
        >
          <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-amber-950 leading-none">−</span>
        </button>

        <button
          type="button"
          onClick={onToggleTheme}
          className="group relative flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 transition-transform active:scale-90 cursor-pointer shadow-xs"
          title={`Chuyển sang giao diện ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
        >
          <span className="opacity-0 group-hover:opacity-100 text-[8px] font-bold text-emerald-950 leading-none">⚡</span>
        </button>
      </div>

      {/* Clean Center Title & Version */}
      <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight">
        <span className="text-emerald-400">🌾 NTG Auto</span>
        <span className="text-slate-400 font-normal">by Tún</span>
        <Badge
          variant="outline"
          className="ml-0.5 border-slate-700/60 bg-slate-900/60 light:bg-white px-1.5 py-0 text-[10px] font-mono text-slate-400"
        >
          v{version}
        </Badge>
      </div>

      {/* Right Controls: Check Update & Theme Switch */}
      <div className="flex items-center gap-1 text-slate-400" onMouseDown={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 text-slate-400 hover:text-slate-100 hover:bg-slate-800/80 rounded-md"
          title="Kiểm tra bản cập nhật mới từ GitHub"
          onClick={onCheckUpdate}
        >
          <RefreshCw className={`h-3 w-3 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
        </Button>

        <Button
          variant="ghost"
          size="icon-xs"
          className="h-6 w-6 text-slate-400 hover:text-amber-400 hover:bg-slate-800/80 rounded-md"
          title={`Đổi sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
          onClick={onToggleTheme}
        >
          {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
        </Button>
      </div>
    </div>
  );
}
