import React, { useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { MonitorHub } from './monitor/MonitorHub';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export interface HudMonitorWindowProps {
  isOpen: boolean;
  onClose: () => void;
  snap: GameSnapshot | null;
  position: { x: number; y: number };
  hudSize: { width: number; height: number };
  monitorWidth: number;
  onUpdateMonitorWidth: (width: number) => void;
  onUpdateSharedHeight: (height: number) => void;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  isHudMinimized?: boolean;
  isTerminalOpen?: boolean;
  terminalWidth?: number;
}

export function HudMonitorWindow({
  isOpen,
  onClose,
  snap,
  position,
  hudSize,
  monitorWidth,
  onUpdateMonitorWidth,
  onUpdateSharedHeight,
  onMouseDownDrag,
  isHudMinimized,
  isTerminalOpen,
  terminalWidth,
}: HudMonitorWindowProps) {
  // Close monitor window on Escape key press
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const GAP = 10;
  const MIN_MON_WIDTH = 340;
  const MAX_MON_WIDTH = 800;
  const MIN_HEIGHT = 360;

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Shared height tied to HUD
  const sharedHeight = isHudMinimized
    ? 500
    : Math.min(hudSize.height, Math.max(MIN_HEIGHT, screenHeight - position.y - 10));

  const distToLeft = position.x;
  const distToRight = screenWidth - (position.x + hudSize.width);

  // Position Monitor intelligently relative to HUD and Terminal
  let isSideLeft: boolean;
  if (isTerminalOpen) {
    const terminalIsRight = distToRight >= distToLeft;
    if (terminalIsRight) {
      isSideLeft = distToLeft >= monitorWidth + GAP;
    } else {
      isSideLeft = !(distToRight >= monitorWidth + GAP);
    }
  } else {
    isSideLeft = distToRight < distToLeft;
  }

  let monX: number;
  if (isSideLeft) {
    const extraOffset = isTerminalOpen && isSideLeft ? (terminalWidth || 380) + GAP : 0;
    monX = Math.max(10, position.x - monitorWidth - GAP - extraOffset);
  } else {
    const extraOffset = isTerminalOpen && !isSideLeft ? (terminalWidth || 380) + GAP : 0;
    monX = Math.min(
      screenWidth - monitorWidth - 10,
      position.x + hudSize.width + GAP + extraOffset
    );
  }

  const monY = Math.max(10, Math.min(position.y, screenHeight - sharedHeight - 10));

  // Resizing handlers for Monitor Window
  const handleMouseDownResizeHeight = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = hudSize.height;
    let latestH = startH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dy = moveEvent.clientY - startY;
      const maxH = Math.max(MIN_HEIGHT, screenHeight - position.y - 10);
      const nextH = Math.round(Math.min(maxH, Math.max(MIN_HEIGHT, startH + dy)));
      latestH = nextH;
      onUpdateSharedHeight(nextH);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdateSharedHeight(latestH);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownResizeWidth = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = monitorWidth;
    let latestW = startW;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = isSideLeft ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const maxAvailableW = isSideLeft
        ? Math.max(MIN_MON_WIDTH, position.x - 20)
        : Math.max(MIN_MON_WIDTH, screenWidth - (position.x + hudSize.width) - 20);
      const nextW = Math.round(
        Math.min(Math.min(MAX_MON_WIDTH, maxAvailableW), Math.max(MIN_MON_WIDTH, startW + dx))
      );
      latestW = nextW;
      onUpdateMonitorWidth(nextW);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdateMonitorWidth(latestW);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownResizeCorner = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = monitorWidth;
    const startH = hudSize.height;
    let latestW = startW;
    let latestH = startH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = isSideLeft ? startX - moveEvent.clientX : moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      const maxAvailableW = isSideLeft
        ? Math.max(MIN_MON_WIDTH, position.x - 20)
        : Math.max(MIN_MON_WIDTH, screenWidth - (position.x + hudSize.width) - 20);
      const maxH = Math.max(MIN_HEIGHT, screenHeight - position.y - 10);

      latestW = Math.round(
        Math.min(Math.min(MAX_MON_WIDTH, maxAvailableW), Math.max(MIN_MON_WIDTH, startW + dx))
      );
      latestH = Math.round(Math.min(maxH, Math.max(MIN_HEIGHT, startH + dy)));

      onUpdateMonitorWidth(latestW);
      onUpdateSharedHeight(latestH);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdateMonitorWidth(latestW);
      onUpdateSharedHeight(latestH);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{
        transform: `translate3d(${monX}px, ${monY}px, 0)`,
        width: `${monitorWidth}px`,
        height: `${sharedHeight}px`,
        pointerEvents: 'auto',
      }}
      className="fixed left-0 top-0 z-[2147483595] flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl bg-white/98 text-slate-800 font-sans backdrop-blur-xl ring-1 ring-black/5 select-none animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* Title Bar / Header (Draggable) */}
      <div
        onMouseDown={onMouseDownDrag}
        className="flex items-center justify-between px-3.5 py-2.5 bg-slate-50 border-b border-slate-200/90 text-xs text-slate-700 cursor-move select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none">🎒</span>
          <span className="font-bold text-xs text-slate-900 truncate">
            Giám Sát Realtime
          </span>
          <Badge
            variant="outline"
            className="border-slate-200 bg-white font-mono text-[10px] text-slate-600 px-1.5 py-0"
          >
            Ngày #{snap?.day || 1}
          </Badge>
          <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-medium">
            Live
          </Badge>
        </div>

        {/* Close Button */}
        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-rose-500 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng cửa sổ Giám sát (Esc)"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Monitor Hub Content with Horizontal Scrollable Tabs */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        <MonitorHub snap={snap} onClose={onClose} showHeader={false} />
      </div>

      {/* Resize Handles */}
      {/* Side edge resize */}
      <div
        onMouseDown={handleMouseDownResizeWidth}
        style={{
          position: 'absolute',
          top: 36,
          bottom: 14,
          ...(isSideLeft ? { left: 0 } : { right: 0 }),
          width: 6,
          cursor: 'ew-resize',
          zIndex: 40,
        }}
      />

      {/* Bottom edge resize */}
      <div
        onMouseDown={handleMouseDownResizeHeight}
        style={{
          position: 'absolute',
          left: 14,
          right: 14,
          bottom: 0,
          height: 6,
          cursor: 'ns-resize',
          zIndex: 40,
        }}
      />

      {/* Corner resize handle */}
      <div
        title="Kéo để thay đổi kích thước cửa sổ"
        onMouseDown={handleMouseDownResizeCorner}
        style={{
          position: 'absolute',
          bottom: 0,
          ...(isSideLeft ? { left: 0 } : { right: 0 }),
          width: 16,
          height: 16,
          cursor: isSideLeft ? 'nesw-resize' : 'nwse-resize',
          zIndex: 41,
        }}
        className={`flex items-end text-slate-400 hover:text-emerald-600 transition-colors pb-1 ${
          isSideLeft ? 'justify-start pl-1' : 'justify-end pr-1'
        }`}
      >
        <svg
          width="9"
          height="9"
          viewBox="0 0 10 10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        >
          {isSideLeft ? (
            <path d="M1 3L7 9M1 7L3 9" />
          ) : (
            <path d="M9 3L3 9M9 7L7 9" />
          )}
        </svg>
      </div>
    </div>
  );
}
