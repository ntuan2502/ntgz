import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';
import {
  FISH_NAME_MAP,
  TOTAL_CATCHABLE_SPECIES_COUNT,
} from '@/shared/constants/wharf-catalog';

const fishMap = FISH_NAME_MAP;

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
  emptyHint?: string;
  group: 'ben' | 'phusa';
  formatValue: (val: number, item?: { fish?: string; shells?: number; [key: string]: unknown }) => string;
}

/**
 * 15 Official In-Game Leaderboard Categories (from live game bundle `play-DvTO7mqQ.js`)
 * - Bến Đò (10 categories): fame, species, size, caught, earned, mythic, junk, records, week, soi
 * - Bãi Phù Sa (5 categories): harvest, home, likes, fashion, rich
 */
const BOARD_CATEGORIES: BoardCategory[] = [
  // --- Bến đò (Wharf) Official Categories ---
  {
    id: 'fame',
    name: '⭐ Nổi tiếng',
    hint: 'Độ nổi tiếng nhận từ quà người khác tặng (bó bông, trà sữa, bánh kem…) và tự bắn pháo hoa, cộng dồn mãi không reset',
    emptyHint: 'Chưa ai tặng quà cho bạn ⭐ Chạm vào bạn bè ở bến để tặng nhau nha',
    group: 'ben',
    formatValue: (v) => `⭐ ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'species',
    name: '📖 Nhiều loài',
    hint: 'Sổ cá đủ loài nhất bến',
    emptyHint: 'Bảng còn trống, câu con đầu tiên là có tên liền 🎣',
    group: 'ben',
    formatValue: (v) => `${v}/${TOTAL_CATCHABLE_SPECIES_COUNT} loài`,
  },
  {
    id: 'size',
    name: '📏 Cá to',
    hint: 'Con cá to nhất từng câu lên',
    emptyHint: 'Bảng còn trống, câu con đầu tiên là có tên liền 🎣',
    group: 'ben',
    formatValue: (v, item) => `${v} cm${item?.fish ? ` · ${fishMap.get(item.fish) ?? item.fish}` : ''}`,
  },
  {
    id: 'caught',
    name: '🎣 Chăm câu',
    hint: 'Câu được nhiều con nhất (không tính rác)',
    emptyHint: 'Bảng còn trống, câu con đầu tiên là có tên liền 🎣',
    group: 'ben',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} con`,
  },
  {
    id: 'earned',
    name: '🐚 Giàu vỏ sò',
    hint: 'Kiếm nhiều vỏ sò nhất từ trước tới giờ (tiêu không bị trừ)',
    emptyHint: 'Bảng còn trống 🐚',
    group: 'ben',
    formatValue: (v) => `🐚 ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'mythic',
    name: '🐉 Săn thần thoại',
    hint: 'Câu nhiều cá Thần thoại nhất (chỉ cần bốc từ hạng Quý mới dính)',
    emptyHint: 'Bảng còn trống, câu con đầu tiên là có tên liền 🎣',
    group: 'ben',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} con`,
  },
  {
    id: 'junk',
    name: '♻️ Ve chai',
    hint: 'Vớt rác nhiều nhất bến: dép, chai, lon, bao ni lông… sông sạch nhờ bạn',
    emptyHint: 'Bảng còn trống, vớt món rác đầu tiên là có tên liền ♻️',
    group: 'ben',
    formatValue: (v) => `${v.toLocaleString('vi-VN')} món`,
  },
  {
    id: 'records',
    name: '📏 Giữ kỷ lục',
    hint: 'Giữ nhiều kỷ lục nhất: loài nào cũng có một người câu con to nhất cả bến (coi trong Sổ cá)',
    emptyHint: 'Bảng còn trống, câu con kỷ lục là có tên liền 📏',
    group: 'ben',
    formatValue: (v) => `${v} loài`,
  },
  {
    id: 'week',
    name: '📅 Vua câu tuần',
    hint: 'Cộng giá cá câu được từ 0h thứ Hai. Top 3 đeo huy chương trước danh hiệu suốt tuần sau',
    emptyHint: 'Bảng còn trống, câu con cá đầu tuần là có tên liền 🎣',
    group: 'ben',
    formatValue: (v) => `🐚 ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'soi',
    name: '🦗 Trùm sới',
    hint: 'Điểm chọi dế từ 0h thứ Hai: thắng khách quen ở sới lần đầu trong ngày 1 điểm, thắng người 3 điểm (mỗi đối thủ một lần / ngày)',
    emptyHint: 'Bảng còn trống, thắng khách quen đầu tiên ở sới dế là có tên liền 🦗',
    group: 'ben',
    formatValue: (v) => `${v} điểm`,
  },

  // --- Bãi Phù Sa (Alluvial Land) Official Categories ---
  {
    id: 'harvest',
    name: '🌾 Nông dân',
    hint: 'Nông dân chăm nhất: thu hoạch nhiều luống nhất trên đất Bãi Phù Sa, bằng luống thì ai nhiều vỏ sò hơn đứng trên',
    emptyHint: 'Bạn chưa thu hoạch luống nào trên đất Bãi 🌾',
    group: 'phusa',
    formatValue: (v, item) => `${v.toLocaleString('vi-VN')} luống${item?.shells === undefined ? '' : ` · 🐚 ${Number(item.shells).toLocaleString('vi-VN')}`}`,
  },
  {
    id: 'home',
    name: '🏠 Nhà đẹp',
    hint: 'Mỗi loại đồ đang bày trong nhà cộng điểm theo giá (món trùng tính một lần, đồ ngọc trai điểm cao), cất về kho là mất điểm',
    emptyHint: 'Nhà bạn chưa bày món đồ nào 🏠 Mua ở Dì Chín / anh Tèo rồi về bấm 🛋️ Bày đồ nha',
    group: 'phusa',
    formatValue: (v) => `🏠 ${v.toLocaleString('vi-VN')} điểm`,
  },
  {
    id: 'likes',
    name: '❤️ Nhiều like',
    hint: 'Được nhiều người thả tim nhà nhất (mỗi người mỗi nhà chỉ một lần)',
    emptyHint: 'Nhà bạn chưa ai thả tim ❤️ Bày đồ cho đẹp rồi rủ bạn bè ghé chơi nha',
    group: 'phusa',
    formatValue: (v) => `❤️ ${v.toLocaleString('vi-VN')}`,
  },
  {
    id: 'fashion',
    name: '👗 Thời trang',
    hint: 'Mỗi món đồ + thú cưng nhà nông đang có cộng điểm bằng cấp của nó (món trùng tính một lần), dòng Thời trang ngẫu nhiên được thêm +1 tới +6',
    emptyHint: 'Bạn chưa có món đồ / thú cưng nhà nông nào 👗',
    group: 'phusa',
    formatValue: (v) => `👗 ${v.toLocaleString('vi-VN')} điểm`,
  },
  {
    id: 'rich',
    name: '💰 Đại gia',
    hint: 'Đang giữ nhiều vỏ sò nhất trong ví (tiêu là tụt hạng)',
    emptyHint: 'Bảng còn trống 🐚',
    group: 'phusa',
    formatValue: (v) => `🐚 ${v.toLocaleString('vi-VN')}`,
  },
];

const TRUM_SOI_ALIASES = ['trumSoi', 'soi', 'boss', 'cricket', 'trum_soi', 'arena', 'soiBoss'];
const AUTO_RELOAD_INTERVAL_SEC = 60;
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
  // Normalize initialCategoryId ('trumSoi' -> 'soi')
  const resolvedInitialCat = initialCategoryId === 'trumSoi' ? 'soi' : initialCategoryId;
  const initialCategoryObj = BOARD_CATEGORIES.find((c) => c.id === resolvedInitialCat);

  const [selectedArea, setSelectedArea] = useState<'ben' | 'phusa'>(
    initialCategoryObj?.group === 'phusa' ? 'phusa' : 'ben'
  );
  const [activeCategoryId, setActiveCategoryId] = useState<string>(resolvedInitialCat || 'fame');
  const isRefreshingRef = useRef(false);

  useEffect(() => {
    if (initialCategoryId) {
      const norm = initialCategoryId === 'trumSoi' ? 'soi' : initialCategoryId;
      setActiveCategoryId(norm);
      const cat = BOARD_CATEGORIES.find((c) => c.id === norm);
      if (cat) {
        setSelectedArea(cat.group);
      }
    }
  }, [initialCategoryId]);

  const benNet = snap?.benNet;
  const board = benNet?.board as BoardData | null | undefined;

  const isTrumSoi = activeCategoryId === 'soi' || TRUM_SOI_ALIASES.includes(activeCategoryId);
  const currentCategory =
    BOARD_CATEGORIES.find((c) => c.id === (isTrumSoi ? 'soi' : activeCategoryId)) ||
    BOARD_CATEGORIES[0];

  // Extract category items
  const boardItems: BoardItem[] = (() => {
    const targetCatId = isTrumSoi ? 'soi' : activeCategoryId;

    // Standard boards from server packet (species, size, caught, earned, mythic, junk, records, week, soi, fame, etc.)
    if (board?.boards?.[targetCatId]?.length) {
      return board.boards[targetCatId];
    }

    // Trùm sới dế boss leaderboard fallback
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
    const targetCatId = isTrumSoi ? 'soi' : activeCategoryId;
    if (board?.me?.[targetCatId]) {
      return board.me[targetCatId];
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

    try {
      await execGameAction('BEN_REFRESH', { kind: 'board' });
      await execGameAction('BEN_REFRESH', { kind: 'soi' });
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 800);
    }
  }, []);

  // Initial load on mount & periodic auto-refresh every 60s
  useEffect(() => {
    handleRefresh();
    const interval = setInterval(handleRefresh, AUTO_RELOAD_INTERVAL_SEC * 1000);
    return () => clearInterval(interval);
  }, [handleRefresh]);

  // Categories filtered by currently selected area (Bến đò vs Bãi Phù Sa)
  const areaCategories = BOARD_CATEGORIES.filter((c) => c.group === selectedArea);

  const handleSelectArea = (area: 'ben' | 'phusa') => {
    setSelectedArea(area);
    const firstCat = BOARD_CATEGORIES.find((c) => c.group === area);
    if (firstCat && !BOARD_CATEGORIES.some((c) => c.id === activeCategoryId && c.group === area)) {
      setActiveCategoryId(firstCat.id);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* 1. Group Bến đò / Bãi Phù Sa */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-2">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
          <button
            type="button"
            onClick={() => handleSelectArea('ben')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              selectedArea === 'ben'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ⚓ Bến đò (10)
          </button>
          <button
            type="button"
            onClick={() => handleSelectArea('phusa')}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
              selectedArea === 'phusa'
                ? 'bg-white text-emerald-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌾 Bãi Phù Sa (5)
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-mono hidden sm:inline">
          {selectedArea === 'ben' ? '10 bảng bến đò trực tuyến' : '5 bảng bãi phù sa'}
        </span>
      </div>

      {/* 2. Chọn BXH */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
        {areaCategories.map((cat) => {
          const isSelected = (isTrumSoi && cat.id === 'soi') || activeCategoryId === cat.id;
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

      {/* 3. Thông báo còn xx giờ... */}
      {(activeCategoryId === 'week' || isTrumSoi) && board?.weekStart && board?.at && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2.5 flex flex-col gap-1 text-xs text-sky-900 shadow-2xs">
          <div className="flex items-center gap-1.5 font-bold">
            <Calendar className="h-3.5 w-3.5 text-sky-600" />
            <span>⏳ Còn {formatWeekTimeLeft(board.weekStart, board.at)} tới thứ Hai tính lại</span>
          </div>
          {activeCategoryId === 'week' && Array.isArray(board.lastWeek) && board.lastWeek.length > 0 && (
            <div className="text-[11px] text-sky-800/90 pt-1 border-t border-sky-200/60 flex items-center gap-1 flex-wrap">
              <span className="font-semibold">Tuần trước:</span>
              {board.lastWeek.map((w, idx) => (
                <span key={idx} className="inline-flex items-center gap-0.5">
                  <span>{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉'}</span>
                  <b>{w.name}</b>
                  <span className="text-slate-600 font-mono">(🐚 {w.value.toLocaleString('vi-VN')})</span>
                  {idx < (board.lastWeek?.length ?? 0) - 1 && <span>·</span>}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {isTrumSoi && (
        <div className="rounded-xl border border-sky-200 bg-sky-50/80 p-2 text-[11px] text-sky-900 shadow-2xs">
          <span>🦗 Bảng vàng Trùm sới tính điểm từ 0h thứ Hai: thắng khách quen lần đầu trong ngày +1 điểm, thắng người +3 điểm (mỗi đối thủ 1 lần/ngày).</span>
        </div>
      )}

      {/* 4. Hạng của bạn (chỉ giữ lại duy nhất phần hạng của bạn) */}
      <div className="flex items-center justify-between bg-gradient-to-r from-amber-50/90 via-yellow-50/90 to-orange-50/90 rounded-xl px-3 py-2 border border-amber-200 text-xs shadow-2xs">
        {myRank ? (
          <>
            <span className="text-slate-700 font-medium flex items-center gap-1.5">
              <span>Hạng của bạn:</span>
              <b className="text-amber-800 font-mono text-sm">#{myRank.rank}</b>
            </span>
            <span className="text-slate-600 font-medium">
              Thành tích: <b className="text-slate-900 font-mono">{currentCategory.formatValue(myRank.value)}</b>
            </span>
          </>
        ) : (
          <span className="text-slate-500 text-[11px] italic">
            {currentCategory.emptyHint || 'Bạn chưa có tên ở bảng này, ráng câu nha 💪'}
          </span>
        )}
      </div>

      {/* 5. Dưới cùng là Bảng xếp hạng */}
      <div className="flex flex-col gap-1.5">
        {boardItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
            <p>
              {isTrumSoi
                ? 'Chưa có dữ liệu BXH Trùm sới hoặc máy chủ đang tổng hợp điểm...'
                : currentCategory.emptyHint || 'Bảng còn trống, câu con đầu tiên là có tên liền 🎣'}
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
          boardItems.map((item, idx) => {
            const rankNum = item.rank ?? idx + 1;
            const isTop1 = rankNum === 1;
            const isTop2 = rankNum === 2;
            const isTop3 = rankNum === 3;
            const isMe = myRank?.rank === rankNum;

            let rowStyle = 'bg-white border-slate-200 hover:border-slate-300';
            if (isMe) {
              rowStyle = 'bg-emerald-50/80 border-emerald-300 shadow-2xs ring-1 ring-emerald-200';
            } else if (isTop1) {
              rowStyle = 'bg-amber-50/70 border-amber-300 hover:border-amber-400 shadow-2xs';
            } else if (isTop2) {
              rowStyle = 'bg-slate-100/70 border-slate-300 hover:border-slate-400';
            } else if (isTop3) {
              rowStyle = 'bg-orange-50/50 border-orange-200 hover:border-orange-300';
            }

            return (
              <div
                key={item.id || `rank_${rankNum}_${idx}`}
                className={`flex items-center justify-between p-2 rounded-xl border transition-all ${rowStyle}`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="flex items-center justify-center w-7 text-center text-xs font-bold font-mono shrink-0">
                    {rankNum === 1 ? (
                      <span className="text-sm leading-none" title="Quán quân #1">
                        🥇
                      </span>
                    ) : rankNum === 2 ? (
                      <span className="text-sm leading-none" title="Á quân #2">
                        🥈
                      </span>
                    ) : rankNum === 3 ? (
                      <span className="text-sm leading-none" title="Hạng ba #3">
                        🥉
                      </span>
                    ) : (
                      <span className="text-slate-500">#{rankNum}</span>
                    )}
                  </span>

                  <div className="min-w-0 flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`text-xs truncate ${
                        isMe
                          ? 'font-bold text-emerald-950'
                          : isTop1
                          ? 'font-bold text-amber-950'
                          : isTop2
                          ? 'font-bold text-slate-900'
                          : isTop3
                          ? 'font-bold text-orange-950'
                          : 'font-medium text-slate-800'
                      }`}
                    >
                      {item.name}
                    </span>
                    {isMe && (
                      <span className="text-[9px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded leading-none">
                        Bạn
                      </span>
                    )}
                    {item.title && (
                      <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200 font-normal shrink-0 truncate max-w-[150px]">
                        {item.title}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex items-center justify-end gap-1.5 shrink-0 ml-2">
                  <span
                    className={`font-mono text-xs font-bold ${
                      isMe
                        ? 'text-emerald-800'
                        : isTop1
                        ? 'text-amber-900 bg-amber-100/70 px-2 py-0.5 rounded border border-amber-200'
                        : isTop2
                        ? 'text-slate-800 bg-slate-200/60 px-2 py-0.5 rounded border border-slate-300'
                        : isTop3
                        ? 'text-orange-900 bg-orange-100/60 px-2 py-0.5 rounded border border-orange-200'
                        : 'text-slate-700'
                    }`}
                  >
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
