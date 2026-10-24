import React from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { AREA_META } from '@/shared/constants/default-config';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Minus, X, Square, Play, Sparkles } from 'lucide-react';

interface HudHeaderProps {
  version: string;
  config: AppConfig;
  activeTab: AreaId;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onHide: () => void;
  onToggleAll: () => void;
  onToggleTab: () => void;
  onCheckUpdate: () => void;
  isCheckingUpdate: boolean;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
}

export function HudHeader({
  version,
  config,
  activeTab,
  isMinimized,
  onToggleMinimize,
  onHide,
  onToggleAll,
  onToggleTab,
  onCheckUpdate,
  isCheckingUpdate,
  onMouseDownDrag,
}: HudHeaderProps) {
  const isRunningAll = config.running && config.runMode === 'all';
  const isRunningTab = config.running && config.runMode === 'tab';
  const tabName = AREA_META[activeTab]?.name || 'Tab này';

  return (
    <div
      className="flex items-center justify-between bg-slate-950/95 px-3 py-2 border-b border-slate-800 text-slate-100 select-none cursor-move"
      onMouseDown={onMouseDownDrag}
    >
      {/* Title & Version */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 font-bold text-xs tracking-tight">
          <span className="text-emerald-400">🌾 NTG Auto</span>
          <span className="text-slate-400 font-normal">by Tún</span>
        </div>
        <Badge variant="outline" className="border-slate-700 bg-slate-900/80 px-1 py-0 text-[10px] font-mono text-slate-400">
          v{version}
        </Badge>
      </div>

      {/* Quick Auto buttons in Header */}
      <div className="flex items-center gap-1" onMouseDown={(e) => e.stopPropagation()}>
        <Button
          variant={isRunningAll ? 'destructive' : 'default'}
          size="xs"
          className="text-[10px] font-semibold h-5 px-1.5 shadow-xs"
          onClick={onToggleAll}
          title="Chạy tự động tất cả khu vực theo thứ tự (Alt+A)"
        >
          {isRunningAll ? <Square className="h-2.5 w-2.5 fill-current mr-0.5" /> : <Play className="h-2.5 w-2.5 fill-current mr-0.5" />}
          {isRunningAll ? 'Dừng' : 'Tất cả'}
        </Button>

        <Button
          variant={isRunningTab ? 'destructive' : 'secondary'}
          size="xs"
          className="text-[10px] font-semibold h-5 px-1.5 border border-slate-700/60 shadow-xs"
          onClick={onToggleTab}
          title={`Chạy tự động riêng ${tabName}`}
        >
          {isRunningTab ? <Square className="h-2.5 w-2.5 fill-current mr-0.5" /> : <Sparkles className="h-2.5 w-2.5 text-amber-400 mr-0.5" />}
          {isRunningTab ? 'Dừng Tab' : tabName.replace(/^[^\s]+\s/, '')}
        </Button>
      </div>

      {/* Action Icons */}
      <div className="flex items-center gap-0.5 text-slate-400" onMouseDown={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="iconSm"
          className="h-6 w-6 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          title="Kiểm tra cập nhật mới"
          onClick={onCheckUpdate}
        >
          <RefreshCw className={`h-3 w-3 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="h-6 w-6 text-slate-400 hover:text-slate-100 hover:bg-slate-800"
          title={isMinimized ? 'Mở rộng' : 'Thu gọn'}
          onClick={onToggleMinimize}
        >
          <Minus className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          className="h-6 w-6 text-slate-400 hover:text-red-400 hover:bg-slate-800"
          title="Ẩn bảng điều khiển (Alt+P)"
          onClick={onHide}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
