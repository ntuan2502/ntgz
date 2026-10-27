import React, { useEffect, useRef, useState } from 'react';
import { Terminal, Trash2, X, ArrowDown, Copy, Check } from 'lucide-react';
import { HudLogEntry } from '../hud-core';

export interface HudTerminalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  logs: HudLogEntry[];
  onClearLogs: () => void;
  lastAction: string;
  position: { x: number; y: number };
  hudSize: { width: number; height: number };
  terminalWidth: number;
  onUpdateTerminalWidth: (width: number) => void;
  onUpdateSharedHeight: (height: number) => void;
  onMouseDownDrag: (e: React.MouseEvent<HTMLDivElement>) => void;
  isHudMinimized?: boolean;
}

export function HudTerminalWindow({
  isOpen,
  onClose,
  logs,
  onClearLogs,
  lastAction,
  position,
  hudSize,
  terminalWidth,
  onUpdateTerminalWidth,
  onUpdateSharedHeight,
  onMouseDownDrag,
  isHudMinimized,
}: HudTerminalWindowProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef<boolean>(true);
  const [isAutoScroll, setIsAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-scroll handler
  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 28;
    stickToBottomRef.current = isNearBottom;
    setIsAutoScroll(isNearBottom);
  };

  // Auto-scroll to bottom immediately when opening terminal
  useEffect(() => {
    if (isOpen) {
      const frameId = requestAnimationFrame(() => {
        const el = scrollRef.current;
        if (el) {
          el.scrollTop = el.scrollHeight;
          stickToBottomRef.current = true;
          setIsAutoScroll(true);
        }
      });
      return () => cancelAnimationFrame(frameId);
    }
  }, [isOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      stickToBottomRef.current = true;
      setIsAutoScroll(true);
    }
  };

  const handleCopyLogs = () => {
    if (logs.length === 0) return;
    const text = logs
      .map((l) => `[${l.time}] ${l.gameTime ? `[${l.gameTime}] ` : ''}${l.text}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!isOpen) return null;

  const GAP = 10;
  const MIN_TERM_WIDTH = 280;
  const MAX_TERM_WIDTH = 800;
  const MIN_HEIGHT = 360;

  const screenWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const screenHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Shared height tied to HUD
  const sharedHeight = isHudMinimized
    ? 480
    : Math.min(hudSize.height, Math.max(MIN_HEIGHT, screenHeight - position.y - 10));

  // Determine whether Terminal is placed to the LEFT or RIGHT of HUD
  const distToLeft = position.x;
  const distToRight = screenWidth - (position.x + hudSize.width);
  const isSideLeft = distToRight < distToLeft;

  let termX: number;
  if (isSideLeft) {
    termX = Math.max(10, position.x - terminalWidth - GAP);
  } else {
    termX = Math.min(screenWidth - terminalWidth - 10, position.x + hudSize.width + GAP);
  }

  const termY = Math.max(10, Math.min(position.y, screenHeight - sharedHeight - 10));

  // Resizing handlers for Terminal
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
    const startW = terminalWidth;
    let latestW = startW;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = isSideLeft ? (startX - moveEvent.clientX) : (moveEvent.clientX - startX);
      const maxAvailableW = isSideLeft
        ? Math.max(MIN_TERM_WIDTH, position.x - 20)
        : Math.max(MIN_TERM_WIDTH, screenWidth - (position.x + hudSize.width) - 20);
      const nextW = Math.round(
        Math.min(Math.min(MAX_TERM_WIDTH, maxAvailableW), Math.max(MIN_TERM_WIDTH, startW + dx))
      );
      latestW = nextW;
      onUpdateTerminalWidth(nextW);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdateTerminalWidth(latestW);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseDownResizeCorner = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = terminalWidth;
    const startH = hudSize.height;
    let latestW = startW;
    let latestH = startH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = isSideLeft ? (startX - moveEvent.clientX) : (moveEvent.clientX - startX);
      const dy = moveEvent.clientY - startY;

      const maxAvailableW = isSideLeft
        ? Math.max(MIN_TERM_WIDTH, position.x - 20)
        : Math.max(MIN_TERM_WIDTH, screenWidth - (position.x + hudSize.width) - 20);
      const maxH = Math.max(MIN_HEIGHT, screenHeight - position.y - 10);

      latestW = Math.round(
        Math.min(Math.min(MAX_TERM_WIDTH, maxAvailableW), Math.max(MIN_TERM_WIDTH, startW + dx))
      );
      latestH = Math.round(Math.min(maxH, Math.max(MIN_HEIGHT, startH + dy)));

      onUpdateTerminalWidth(latestW);
      onUpdateSharedHeight(latestH);
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      onUpdateTerminalWidth(latestW);
      onUpdateSharedHeight(latestH);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <div
      style={{
        transform: `translate3d(${termX}px, ${termY}px, 0)`,
        width: `${terminalWidth}px`,
        height: `${sharedHeight}px`,
        pointerEvents: 'auto',
      }}
      className="fixed left-0 top-0 z-[2147483590] flex flex-col overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-950/98 text-slate-100 font-mono backdrop-blur-xl ring-1 ring-white/10 select-none animate-in fade-in-0 zoom-in-95 duration-150"
    >
      {/* Title Bar / Header (Draggable) */}
      <div
        onMouseDown={onMouseDownDrag}
        className="flex items-center justify-between px-3 py-2 bg-slate-900/90 border-b border-slate-800 text-[11px] font-sans text-slate-300 cursor-move select-none shrink-0"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="font-bold text-xs text-slate-100 truncate">
            Terminal · Lịch Sử Phiên
          </span>
          <span className="rounded bg-slate-800 px-1.5 py-0.2 font-mono text-[10px] text-emerald-400 border border-slate-700/80">
            {logs.length}
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-1 shrink-0" onMouseDown={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={scrollToBottom}
            className={`flex items-center justify-center h-6 w-6 rounded-md transition-colors cursor-pointer ${
              isAutoScroll
                ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/80'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
            title={isAutoScroll ? 'Đang tự động cuộn xuống đáy' : 'Bấm để cuộn xuống dòng mới nhất'}
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={handleCopyLogs}
            className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Sao chép toàn bộ log vào bộ nhớ tạm"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>

          <button
            type="button"
            onClick={onClearLogs}
            className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Xoá lịch sử log"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center h-6 w-6 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer ml-1"
            title="Đóng cửa sổ Terminal"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Log Output (Scrollable Body) */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-1 font-mono text-[11px] leading-relaxed select-text bg-slate-950/80"
      >
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 italic py-10 font-sans text-xs">
            <Terminal className="h-8 w-8 text-slate-700 mb-2 stroke-[1.2]" />
            <span>Chưa có lịch sử hoạt động trong phiên này...</span>
            <span className="text-[10px] text-slate-600 mt-1">Các hành động auto sẽ được ghi chi tiết tại đây.</span>
          </div>
        ) : (
          logs.map((entry, idx) => {
            const isLatest = idx === logs.length - 1;
            return (
              <div
                key={entry.id}
                className={`leading-snug break-words py-0.5 px-1 rounded transition-colors ${
                  isLatest
                    ? 'text-emerald-300 font-medium bg-emerald-950/40'
                    : 'text-slate-300 hover:bg-slate-900/60'
                }`}
              >
                <span className="text-slate-500">[{entry.time}]</span>{' '}
                {entry.gameTime && (
                  <>
                    <span className="text-amber-400/90 font-mono">[{entry.gameTime}]</span>{' '}
                  </>
                )}
                <span>{entry.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Terminal Footer Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-900/90 border-t border-slate-800/80 text-[10px] text-slate-400 shrink-0 select-none">
        <div className="flex items-center gap-1.5 truncate mr-2">
          <span className="text-emerald-500 font-semibold shrink-0">Live:</span>
          <span className="truncate text-slate-300" title={lastAction}>
            {lastAction}
          </span>
        </div>
        <span className="text-slate-500 font-mono text-[9px] shrink-0">
          {terminalWidth}×{sharedHeight}px
        </span>
      </div>

      {/* Resize Handle - Bottom Edge (Height) */}
      <div
        onMouseDown={handleMouseDownResizeHeight}
        style={{ position: 'absolute', left: 14, right: 14, bottom: 0, height: 6, cursor: 'ns-resize', zIndex: 40 }}
        title="Kéo để thay đổi chiều cao (đồng bộ với HUD)"
      />

      {/* Resize Handle - Outer Side Edge (Width) */}
      {isSideLeft ? (
        <div
          onMouseDown={handleMouseDownResizeWidth}
          style={{ position: 'absolute', top: 36, bottom: 14, left: 0, width: 6, cursor: 'ew-resize', zIndex: 40 }}
          title="Kéo để thay đổi chiều rộng Terminal"
        />
      ) : (
        <div
          onMouseDown={handleMouseDownResizeWidth}
          style={{ position: 'absolute', top: 36, bottom: 14, right: 0, width: 6, cursor: 'ew-resize', zIndex: 40 }}
          title="Kéo để thay đổi chiều rộng Terminal"
        />
      )}

      {/* Corner Grip (Bottom-Outer Corner) */}
      {isSideLeft ? (
        <div
          onMouseDown={handleMouseDownResizeCorner}
          onDoubleClick={() => onUpdateTerminalWidth(380)}
          style={{ position: 'absolute', left: 0, bottom: 0, width: 16, height: 16, cursor: 'nesw-resize', zIndex: 41 }}
          className="flex items-end justify-start pl-1 pb-1 text-slate-500 hover:text-emerald-400 transition-colors"
          title="Kéo để đổi kích thước (Nhấp đúp để về 380px)"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M1 3L7 9M1 7L3 9" />
          </svg>
        </div>
      ) : (
        <div
          onMouseDown={handleMouseDownResizeCorner}
          onDoubleClick={() => onUpdateTerminalWidth(380)}
          style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 41 }}
          className="flex items-end justify-end pr-1 pb-1 text-slate-500 hover:text-emerald-400 transition-colors"
          title="Kéo để đổi kích thước (Nhấp đúp để về 380px)"
        >
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
            <path d="M9 3L3 9M9 7L7 9" />
          </svg>
        </div>
      )}
    </div>
  );
}
