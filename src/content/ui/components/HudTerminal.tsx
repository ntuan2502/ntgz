import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Terminal, Trash2 } from 'lucide-react';
import { HudLogEntry } from '../hud-core';

interface HudTerminalProps {
  lastAction: string;
  logs: HudLogEntry[];
  onClearLogs: () => void;
}

export function HudTerminal({ lastAction, logs, onClearLogs }: HudTerminalProps) {
  const [isOpen, setIsOpen] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const stickToBottomRef = useRef<boolean>(true);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 24;
    stickToBottomRef.current = isNearBottom;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && isOpen && stickToBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [logs, isOpen]);

  return (
    <div className="border-b border-slate-200/90 shrink-0">
      {/* Live Status Bar + Terminal Toggle */}
      <div className="flex items-center justify-between gap-2 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-mono text-emerald-800">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
          </span>
          <span className="truncate" title={lastAction}>
            {lastAction}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex items-center gap-1 shrink-0 rounded-md bg-white/90 hover:bg-white border border-emerald-200/90 px-1.5 py-0.5 text-[10px] font-sans font-medium text-emerald-800 shadow-2xs transition-colors cursor-pointer"
          title={isOpen ? 'Thu gọn cửa sổ Terminal log' : 'Mở rộng cửa sổ Terminal log'}
        >
          <Terminal className="h-3 w-3 text-emerald-600" />
          <span>Log ({logs.length})</span>
          {isOpen ? (
            <ChevronUp className="h-3 w-3 text-slate-500" />
          ) : (
            <ChevronDown className="h-3 w-3 text-slate-500" />
          )}
        </button>
      </div>

      {/* Expandable Terminal Window */}
      {isOpen && (
        <div className="bg-slate-900 text-slate-100 font-mono text-[10.5px] border-t border-slate-800">
          <div className="flex items-center justify-between px-2.5 py-1 bg-slate-950/80 border-b border-slate-800 text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-sans font-medium text-slate-300">
                Terminal · Lịch sử phiên hiện tại
              </span>
            </div>
            <button
              type="button"
              onClick={onClearLogs}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-sans text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors cursor-pointer"
              title="Xoá lịch sử log phiên hiện tại"
            >
              <Trash2 className="h-2.5 w-2.5" />
              <span>Xoá</span>
            </button>
          </div>

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="h-[110px] max-h-[110px] overflow-y-auto px-2.5 py-1.5 space-y-1 leading-relaxed select-text"
          >
            {logs.length === 0 ? (
              <div className="text-slate-500 italic py-2 text-center font-sans text-[11px]">
                Chưa có lịch sử hoạt động trong phiên này...
              </div>
            ) : (
              logs.map((entry, idx) => {
                const isLatest = idx === logs.length - 1;
                return (
                  <div
                    key={entry.id}
                    className={`leading-snug break-words ${
                      isLatest ? 'text-emerald-300 font-medium' : 'text-slate-300'
                    }`}
                  >
                    <span className="text-slate-500">[{entry.time}]</span>{' '}
                    {entry.gameTime && (
                      <>
                        <span className="text-amber-400/90">[{entry.gameTime}]</span>{' '}
                      </>
                    )}
                    <span>{entry.text}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
