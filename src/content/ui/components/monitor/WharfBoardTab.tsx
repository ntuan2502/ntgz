import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, RefreshCw, ExternalLink, Calendar } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';
import { GameItemIcon } from '@/content/ui/components/GameItemIcon';

interface FishEntry {
  id: string;
  name: string;
  [key: string]: unknown;
}

const fishMap = new Map<string, string>(
  (fishDexRaw as FishEntry[]).map((f) => [f.id, f.name])
);

interface BoardItem {
  id: string;
  name: string;
  value: number;
  fish?: string;
  title?: string;
  rank?: number;
  cricket?: string;
  [key: string]: unknown;
}

interface BoardData {
  records?: Record<string, { name: string; size: number; id: string }>;
  boards?: Record<string, BoardItem[]>;
  me?: Record<string, { rank: number; value: number }>;
  weekStart?: number;
  at?: number;
  lastWeek?: Array<{ name: string; value: number }>;
  [key: string]: unknown;
}

interface BoardCategory {
  id: string;
  name: string;
  hint: string;
  formatValue: (val: number, item?: { fish?: string }) => string;
}

const BOARD_CATEGORIES: BoardCategory[] = [
  {
    id: 'species',
    name: '📖 Nhiều loài',
    hint: 'Sổ cá đủ loài nhất bến',
    formatValue: (v) => `${v}/89 loài`,
  },
  {
    id: 'size',
    name: '📏 Cá to',
    hint: 'Con cá to nhất từng câu lên trên bến',
    formatValue: (v, item) => `${v} cm${item?.fish ? ` (${fishMap.get(item.fish) ?? item.fish})` : ''}`,
  },
  {
    id: 'caught',
    name: '🎣 Chăm câu',
    hint: 'Câu được nhiều con nhất (không tính rác)',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} con`,
  },
  {
    id: 'earned',
    name: '🐚 Giàu vỏ sò',
    hint: 'Kiếm nhiều vỏ sò nhất từ trước tới giờ',
    formatValue: (v) => `🐚 ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'mythic',
    name: '🐉 Săn thần thoại',
    hint: 'Câu nhiều cá Thần thoại nhất bến',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} con`,
  },
  {
    id: 'junk',
    name: '♻️ Ve chai',
    hint: 'Vớt rác nhiều nhất bến (dép, chai, lon, bao...)',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} món`,
  },
  {
    id: 'records',
    name: '📏 Giữ kỷ lục',
    hint: 'Người giữ nhiều kỷ lục cá to nhất các loài',
    formatValue: (v) => `${v} loài`,
  },
  {
    id: 'week',
    name: '📅 Vua câu tuần',
    hint: 'Tổng giá trị cá câu được từ 0h thứ Hai',
    formatValue: (v) => `🐚 ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'trumSoi',
    name: '🥊 Trùm sới',
    hint: 'Điểm thắng Boss sới dế đua BXH tuần',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} điểm`,
  },
];

const TRUM_SOI_ALIASES = ['trumSoi', 'soi', 'boss', 'cricket', 'trum_soi', 'arena', 'soiBoss'];
const AUTO_RELOAD_INTERVAL_SEC = 60;

const MEDALS = ['🥇', '🥈', '🥉'];
const WEEK_MS = 604800000;

function formatWeekTimeLeft(weekStart: number, at: number): string {
  const diffHours = Math.max(0, Math.floor((weekStart + WEEK_MS - at) / 3600000));
  if (diffHours >= 24) {
    return `${Math.floor(diffHours / 24)} ngày ${diffHours % 24} giờ`;
  }
  return `${Math.max(1, diffHours)} giờ`;
}

interface WharfBoardTabProps {
  snap: GameSnapshot | null;
  initialCategoryId?: string;
}

export function WharfBoardTab({ snap, initialCategoryId }: WharfBoardTabProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>(initialCategoryId || 'species');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [autoReload, setAutoReload] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(AUTO_RELOAD_INTERVAL_SEC);
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (initialCategoryId) {
      setActiveCategoryId(initialCategoryId);
    }
  }, [initialCategoryId]);

  const benNet = snap?.benNet;
  const board = benNet?.board as BoardData | null | undefined;
  const currentCategory =
    BOARD_CATEGORIES.find((c) => c.id === activeCategoryId) || BOARD_CATEGORIES[0];

  const isTrumSoi = activeCategoryId === 'trumSoi' || TRUM_SOI_ALIASES.includes(activeCategoryId);

  // Extract category items supporting aliases & fallback to benNet.soi
  const boardItems: BoardItem[] = (() => {
    if (board?.boards?.[activeCategoryId]?.length) {
      return board.boards[activeCategoryId];
    }
    if (isTrumSoi) {
      if (board?.boards) {
        for (const alias of TRUM_SOI_ALIASES) {
          if (board.boards[alias]?.length) return board.boards[alias];
        }
      }
      const soi = benNet?.soi as Record<string, unknown> | undefined;
      if (soi) {
        const candidates = [
          soi.board,
          (soi.boards as Record<string, unknown> | undefined)?.boss,
          (soi.boards as Record<string, unknown> | undefined)?.soi,
          (soi.boards as Record<string, unknown> | undefined)?.trumSoi,
          soi.top,
          soi.ranks,
          soi.weekly,
          soi.bxh,
          soi.ladderRankings,
        ];
        for (const c of candidates) {
          if (Array.isArray(c) && c.length > 0) {
            return c.map((it: Record<string, unknown>, idx: number) => ({
              id: (it.id as string) || `soi_${idx}`,
              name: (it.name as string) || (it.playerName as string) || (it.user as string) || `Đấu thủ #${idx + 1}`,
              value: Number(it.value ?? it.score ?? it.points ?? it.point ?? it.wins ?? 0),
              title: it.title as string | undefined,
              rank: typeof it.rank === 'number' ? it.rank : idx + 1,
              cricket: (it.cricket as string) || (it.species as string) || undefined,
            }));
          }
        }
      }
    }
    return [];
  })();

  const myRank: { rank: number; value: number } | undefined = (() => {
    if (board?.me?.[activeCategoryId]) {
      return board.me[activeCategoryId];
    }
    if (isTrumSoi) {
      if (board?.me) {
        for (const alias of TRUM_SOI_ALIASES) {
          if (board.me[alias]) return board.me[alias];
        }
      }
      const soi = benNet?.soi as Record<string, unknown> | undefined;
      if (soi) {
        const soiMe = soi.me as { rank?: number; value?: number; score?: number; points?: number } | undefined;
        if (soiMe && typeof soiMe.rank === 'number') {
          return { rank: soiMe.rank, value: Number(soiMe.value ?? soiMe.score ?? soiMe.points ?? 0) };
        }
        if (typeof soi.myRank === 'number') {
          return { rank: soi.myRank, value: Number(soi.myPoints ?? soi.myScore ?? 0) };
        }
        if (typeof soi.rank === 'number' && typeof soi.score === 'number') {
          return { rank: soi.rank, value: soi.score };
        }
      }
    }
    return undefined;
  })();

  const handleOpenGamePanel = async (overridePanel?: 'board' | 'soi') => {
    const target = overridePanel || (isTrumSoi ? 'soi' : 'board');
    await execGameAction('BEN_SET_PANEL', { panel: target });
  };

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    setCountdown(AUTO_RELOAD_INTERVAL_SEC);

    try {
      await execGameAction('BEN_REFRESH', { kind: 'board' });
      await execGameAction('BEN_REFRESH', { kind: 'soi' });
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }, 800);
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    handleRefresh();
  }, [handleRefresh]);

  // 1-second interval for countdown & auto-refresh every 60s
  useEffect(() => {
    if (!autoReload) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          handleRefresh();
          return AUTO_RELOAD_INTERVAL_SEC;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoReload, handleRefresh]);

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* Header Banner */}
      <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500 text-white shadow-xs">
              <Trophy className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-900 text-sm">Bảng vàng Bến đò</span>
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-medium">
                  BXH Trực Tuyến
                </Badge>
                <button
                  type="button"
                  onClick={() => setAutoReload((prev) => !prev)}
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-mono cursor-pointer transition-all border ${
                    autoReload
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 shadow-2xs'
                      : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                  }`}
                  title={
                    autoReload
                      ? 'Tự động làm mới mỗi 60s đang BẬT. Bấm để tạm dừng.'
                      : 'Tự động làm mới đang TẮT. Bấm để kích hoạt.'
                  }
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      autoReload ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`}
                  />
                  <span>{autoReload ? `Tự reload: ${countdown}s` : 'Tự reload: Tắt'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {currentCategory.hint} ·{' '}
                {autoReload ? (
                  <span className="text-emerald-700 font-medium">
                    tự động làm mới sau {countdown}s
                  </span>
                ) : (
                  <span className="text-slate-500">cập nhật thủ công</span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleRefresh()}
              disabled={isRefreshing}
              className="h-7 px-2 text-xs text-slate-700 bg-white hover:bg-slate-50 rounded-lg gap-1 cursor-pointer"
              title="Bấm để tải lại BXH ngay lập tức"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin text-amber-600' : ''}`} />
              <span className="text-[11px] font-mono">
                {isRefreshing ? 'Đang tải...' : `Làm mới (${countdown}s)`}
              </span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={() => handleOpenGamePanel()}
              className="h-7 px-2.5 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-lg gap-1 cursor-pointer font-medium shadow-xs"
            >
              <span>Mở trong game</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* My Current Rank Badge */}
        {myRank && (
          <div className="mt-2.5 flex items-center justify-between bg-white/80 rounded-lg px-2.5 py-1.5 border border-amber-200/70 text-xs">
            <span className="text-slate-700 font-medium flex items-center gap-1">
              <span>Hạng của bạn:</span>
              <b className="text-amber-800 font-mono">#{myRank.rank}</b>
            </span>
            <span className="text-slate-600 font-medium">
              Thành tích: <b className="text-slate-900">{currentCategory.formatValue(myRank.value)}</b>
            </span>
          </div>
        )}
      </div>

      {/* Week countdown & Last week winners */}
      {(activeCategoryId === 'week' || isTrumSoi) && board?.weekStart && board?.at && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 flex flex-col gap-1 text-xs text-sky-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span>Còn {formatWeekTimeLeft(board.weekStart, board.at)} tới thứ Hai tính lại</span>
          </div>
          {activeCategoryId === 'week' && Array.isArray(board.lastWeek) && board.lastWeek.length > 0 && (
            <div className="text-[11px] text-sky-800/90 pt-1 border-t border-sky-200/60 flex items-center gap-1 flex-wrap">
              <span className="font-semibold">Tuần trước:</span>
              {board.lastWeek.map((w, idx) => (
                <span key={idx} className="inline-flex items-center gap-0.5">
                  <span>{MEDALS[idx]}</span>
                  <b>{w.name}</b>
                  <span className="text-slate-600 font-mono">(🐚 {w.value.toLocaleString('vi-VN')})</span>
                  {idx < (board.lastWeek?.length ?? 0) - 1 && <span>·</span>}
                </span>
              ))}
            </div>
          )}
          {isTrumSoi && (
            <div className="text-[10.5px] text-sky-800/90 pt-1 border-t border-sky-200/60 flex items-center gap-1">
              <span>🥊 Đua điểm đánh bại Boss Sới Dế: Cu Bin ➔ Út Mập ➔ Anh Lực ➔ Bác Chín ➔ Ông Sáu</span>
            </div>
          )}
        </div>
      )}

      {/* Categories Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {BOARD_CATEGORIES.map((cat) => {
          const isSelected = activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategoryId(cat.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-amber-100 border-amber-300 text-amber-900 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      {/* Rankings List */}
      <div className="flex flex-col gap-2">
        {boardItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
            <p>
              {isTrumSoi
                ? 'Chưa có dữ liệu BXH Trùm sới hoặc máy chủ đang tổng hợp điểm...'
                : 'Bảng còn trống hoặc đang tải dữ liệu từ máy chủ bến đò...'}
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleRefresh()}
                className="text-xs cursor-pointer"
              >
                Tải lại bảng 🔄
              </Button>
              {isTrumSoi && (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => handleOpenGamePanel('soi')}
                  className="text-xs bg-amber-600 hover:bg-amber-700 text-white cursor-pointer"
                >
                  Mở Sới dế 🥊
                </Button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Top 3 Podium Cards */}
            <div className="flex flex-col gap-2">
              {boardItems.slice(0, 3).map((item, idx) => {
                const isMe = myRank?.rank === idx + 1;

                if (idx === 0) {
                  // TOP 1 - Gold Champion
                  return (
                    <div
                      key={item.id || 'top1'}
                      className="relative overflow-hidden rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-200/50 via-yellow-100/60 to-amber-200/40 p-3 shadow-md ring-2 ring-amber-300/60 transition-all hover:shadow-lg"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Crown + #1 Gold Badge */}
                          <div className="flex flex-col items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-b from-amber-300 via-amber-400 to-yellow-500 text-amber-950 font-black shadow-md ring-2 ring-amber-200/80 shrink-0">
                            <span className="text-base leading-none">👑</span>
                            <span className="text-[11px] font-black font-mono leading-none mt-0.5">#1</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-sm font-black text-amber-950 tracking-tight truncate">
                                {item.name}
                              </span>
                              <span className="text-[9.5px] uppercase font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-amber-950 px-1.5 py-0.5 rounded shadow-2xs leading-none">
                                🥇 Quán quân
                              </span>
                              {isMe && (
                                <span className="text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded leading-none">
                                  Bạn
                                </span>
                              )}
                            </div>
                            {item.title && (
                              <div className="text-[11px] text-amber-900/90 font-semibold mt-0.5 truncate">
                                ✨ {item.title}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex items-center justify-end gap-1.5 shrink-0">
                          {item.fish && (
                            <div className="flex h-6 w-6 items-center justify-center shrink-0 overflow-hidden">
                              <GameItemIcon itemKey={`benfish-${item.fish}`} fallbackEmoji="🐟" size={22} />
                            </div>
                          )}
                          {item.cricket && (
                            <div className="flex h-6 w-6 items-center justify-center shrink-0 overflow-hidden" title={`Dế chiến: ${item.cricket}`}>
                              <GameItemIcon itemKey={item.cricket} fallbackEmoji="🦗" size={22} />
                            </div>
                          )}
                          <span className="font-black text-xs md:text-sm font-mono text-amber-950 bg-amber-300/80 px-2.5 py-1 rounded-lg border border-amber-400 shadow-2xs">
                            {currentCategory.formatValue(item.value, item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                if (idx === 1) {
                  // TOP 2 - Silver Runner-up
                  return (
                    <div
                      key={item.id || 'top2'}
                      className="relative overflow-hidden rounded-xl border-2 border-slate-300 bg-gradient-to-r from-slate-200/70 via-gray-100/80 to-slate-200/50 p-2.5 shadow-sm ring-1 ring-slate-300/80 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* #2 Silver Badge */}
                          <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-slate-100 via-slate-200 to-slate-400 text-slate-800 font-black shadow-xs ring-1 ring-slate-300/80 shrink-0">
                            <span className="text-sm leading-none">🥈</span>
                            <span className="text-[10.5px] font-black font-mono leading-none mt-0.5">#2</span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 tracking-tight truncate">
                                {item.name}
                              </span>
                              <span className="text-[9px] uppercase font-bold bg-slate-300 text-slate-800 px-1.5 py-0.5 rounded shadow-2xs leading-none">
                                🥈 Á quân
                              </span>
                              {isMe && (
                                <span className="text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded leading-none">
                                  Bạn
                                </span>
                              )}
                            </div>
                            {item.title && (
                              <div className="text-[10px] text-slate-600 font-medium mt-0.5 truncate">
                                {item.title}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right flex items-center justify-end gap-1.5 shrink-0">
                          {item.fish && (
                            <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden">
                              <GameItemIcon itemKey={`benfish-${item.fish}`} fallbackEmoji="🐟" size={18} />
                            </div>
                          )}
                          {item.cricket && (
                            <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden" title={`Dế chiến: ${item.cricket}`}>
                              <GameItemIcon itemKey={item.cricket} fallbackEmoji="🦗" size={18} />
                            </div>
                          )}
                          <span className="font-bold text-xs font-mono text-slate-900 bg-white/95 px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
                            {currentCategory.formatValue(item.value, item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }

                // TOP 3 - Bronze
                return (
                  <div
                    key={item.id || 'top3'}
                    className="relative overflow-hidden rounded-xl border-2 border-amber-600/40 bg-gradient-to-r from-amber-700/10 via-orange-100/70 to-amber-700/10 p-2.5 shadow-sm ring-1 ring-amber-500/40 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* #3 Bronze Badge */}
                        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-b from-amber-500 via-amber-600 to-orange-700 text-white font-black shadow-xs ring-1 ring-amber-400/80 shrink-0">
                          <span className="text-sm leading-none">🥉</span>
                          <span className="text-[10.5px] font-black font-mono leading-none mt-0.5">#3</span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-amber-950 tracking-tight truncate">
                              {item.name}
                            </span>
                            <span className="text-[9px] uppercase font-bold bg-amber-600/20 text-amber-900 px-1.5 py-0.5 rounded shadow-2xs leading-none">
                              🥉 Hạng 3
                            </span>
                            {isMe && (
                              <span className="text-[9.5px] font-bold bg-emerald-600 text-white px-1.5 py-0.5 rounded leading-none">
                                Bạn
                              </span>
                            )}
                          </div>
                          {item.title && (
                            <div className="text-[10px] text-amber-800 font-medium mt-0.5 truncate">
                              {item.title}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center justify-end gap-1.5 shrink-0">
                        {item.fish && (
                          <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden">
                            <GameItemIcon itemKey={`benfish-${item.fish}`} fallbackEmoji="🐟" size={18} />
                          </div>
                        )}
                        {item.cricket && (
                          <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden" title={`Dế chiến: ${item.cricket}`}>
                            <GameItemIcon itemKey={item.cricket} fallbackEmoji="🦗" size={18} />
                          </div>
                        )}
                        <span className="font-bold text-xs font-mono text-amber-950 bg-white/95 px-2.5 py-1 rounded-lg border border-amber-300 shadow-2xs">
                          {currentCategory.formatValue(item.value, item)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Other Ranks Divider & List (#4+) */}
            {boardItems.length > 3 && (
              <div className="pt-2 flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold px-1 pb-0.5 border-b border-slate-200">
                  <span>Thứ hạng khác (Hạng 4 – {boardItems.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">cập nhật trực tiếp</span>
                </div>

                {boardItems.slice(3).map((item, i) => {
                  const rankNum = i + 4;
                  const isMe = myRank?.rank === rankNum;

                  return (
                    <div
                      key={item.id || `rank_${rankNum}`}
                      className={`flex items-center justify-between p-2 rounded-xl border transition-all ${
                        isMe
                          ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs ring-1 ring-emerald-200'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex items-center justify-center w-7 text-center text-xs font-bold font-mono text-slate-500 shrink-0">
                          #{rankNum}
                        </span>
                        <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs truncate ${isMe ? 'font-bold text-emerald-950' : 'font-medium text-slate-800'}`}>
                            {item.name}
                          </span>
                          {isMe && (
                            <span className="text-[9px] font-bold bg-emerald-600 text-white px-1 py-0.2 rounded">
                              Bạn
                            </span>
                          )}
                          {item.title && (
                            <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-normal shrink-0">
                              {item.title}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right flex items-center justify-end gap-1.5 shrink-0">
                        {item.fish && (
                          <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden">
                            <GameItemIcon itemKey={`benfish-${item.fish}`} fallbackEmoji="🐟" size={18} />
                          </div>
                        )}
                        {item.cricket && (
                          <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden" title={`Dế chiến: ${item.cricket}`}>
                            <GameItemIcon itemKey={item.cricket} fallbackEmoji="🦗" size={18} />
                          </div>
                        )}
                        <span className="font-mono text-xs font-bold text-emerald-800">
                          {currentCategory.formatValue(item.value, item)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
