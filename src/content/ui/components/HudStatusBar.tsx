import React from 'react';
import { Terminal } from 'lucide-react';

export interface HudStatusBarProps {
  lastAction: string;
  logsCount: number;
  isTerminalOpen: boolean;
  onToggleTerminal: () => void;
}

export function HudStatusBar({
  lastAction,
  logsCount,
  isTerminalOpen,
  onToggleTerminal,
}: HudStatusBarProps) {
  return (
    <div className="border-b border-slate-200/90 shrink-0 select-none">
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
          onClick={onToggleTerminal}
          className={`flex items-center gap-1.5 shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-sans font-medium transition-all shadow-2xs cursor-pointer ${
            isTerminalOpen
              ? 'bg-slate-900 hover:bg-slate-800 text-emerald-400 border-slate-800 ring-1 ring-emerald-500/40 shadow-xs'
              : 'bg-white/90 hover:bg-white text-emerald-800 border-emerald-200/90'
          }`}
          title={isTerminalOpen ? 'Đóng cửa sổ Terminal' : 'Mở cửa sổ Terminal lịch sử'}
        >
          <Terminal className={`h-3 w-3 ${isTerminalOpen ? 'text-emerald-400' : 'text-emerald-600'}`} />
          <span>Log ({logsCount})</span>
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              isTerminalOpen ? 'bg-emerald-400 animate-pulse' : 'bg-slate-300'
            }`}
          />
        </button>
      </div>
    </div>
  );
}
