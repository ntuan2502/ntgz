import React, { useState } from 'react';
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
];

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
}

export function WharfBoardTab({ snap }: WharfBoardTabProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string>('species');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const benNet = snap?.benNet;
  const board = benNet?.board as BoardData | null | undefined;
  const currentCategory =
    BOARD_CATEGORIES.find((c) => c.id === activeCategoryId) || BOARD_CATEGORIES[0];

  const boardItems: BoardItem[] = board?.boards?.[activeCategoryId] || [];
  const myRank = board?.me?.[activeCategoryId];

  const handleOpenGamePanel = async () => {
    await execGameAction('BEN_SET_PANEL', { panel: 'board' });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await execGameAction('BEN_REFRESH', { kind: 'board' });
    setTimeout(() => setIsRefreshing(false), 800);
  };

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
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Bảng vàng Bến đò</span>
                <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 font-medium">
                  BXH Trực Tuyến
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {currentCategory.hint} · <span className="text-slate-500">cập nhật tự động</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="h-7 px-2 text-xs text-slate-700 bg-white hover:bg-slate-50 rounded-lg gap-1 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Cập nhật</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleOpenGamePanel}
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
      {activeCategoryId === 'week' && board?.weekStart && board?.at && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 flex flex-col gap-1 text-xs text-sky-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span>Còn {formatWeekTimeLeft(board.weekStart, board.at)} tới thứ Hai tính lại</span>
          </div>
          {Array.isArray(board.lastWeek) && board.lastWeek.length > 0 && (
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
      <div className="flex flex-col gap-1.5">
        {boardItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
            <p>Bảng còn trống hoặc đang tải dữ liệu từ máy chủ bến đò...</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="mt-2 text-xs"
            >
              Tải lại bảng 🔄
            </Button>
          </div>
        ) : (
          boardItems.map((item, idx) => {
            const isTop3 = idx < 3;
            const medal = isTop3 ? MEDALS[idx] : null;

            return (
              <div
                key={item.id || idx}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  idx === 0
                    ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300 shadow-2xs font-semibold'
                    : idx === 1
                    ? 'bg-gradient-to-r from-slate-50 to-gray-50 border-slate-300 shadow-2xs'
                    : idx === 2
                    ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 shadow-2xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex items-center justify-center w-6 text-center text-xs font-bold font-mono">
                    {medal || `#${idx + 1}`}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-slate-900">{item.name}</span>
                  </div>
                </div>

                <div className="text-right flex items-center justify-end gap-1.5">
                  {item.fish && (
                    <div className="flex h-5 w-5 items-center justify-center shrink-0 overflow-hidden">
                      <GameItemIcon itemKey={`benfish-${item.fish}`} fallbackEmoji="🐟" size={18} />
                    </div>
                  )}
                  <span className="font-bold text-xs font-mono text-emerald-800">
                    {currentCategory.formatValue(item.value, item)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
