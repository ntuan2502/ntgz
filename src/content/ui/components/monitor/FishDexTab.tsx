import React, { useState, useMemo } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, ExternalLink, RefreshCw, Search } from 'lucide-react';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';
import { execGameAction } from '@/content/bridge/content-bridge';

interface FishEntry {
  id: string;
  name: string;
  rarity: 'junk' | 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';
  price: number;
  size?: [number, number];
  desc?: string;
  spot?: 'bank' | 'dock';
  time?: 'dawn' | 'day' | 'dusk' | 'night';
  weekend?: boolean;
  minRod?: number;
}

const fishCatalog: FishEntry[] = fishDexRaw as FishEntry[];

const RARITY_META: Record<
  string,
  { name: string; color: string; border: string; bg: string; text: string }
> = {
  common: { name: 'Thường', color: '#6a9a4a', border: 'border-emerald-200', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  uncommon: { name: 'Hơi hiếm', color: '#3c8fd0', border: 'border-sky-200', bg: 'bg-sky-50', text: 'text-sky-800' },
  rare: { name: 'Hiếm', color: '#9b6bff', border: 'border-purple-200', bg: 'bg-purple-50', text: 'text-purple-800' },
  epic: { name: 'Rất hiếm', color: '#e0443a', border: 'border-rose-200', bg: 'bg-rose-50', text: 'text-rose-800' },
  legend: { name: 'Huyền thoại', color: '#e8a020', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800' },
  legendary: { name: 'Huyền thoại', color: '#e8a020', border: 'border-amber-200', bg: 'bg-amber-50', text: 'text-amber-800' },
  myth: { name: 'Thần thoại', color: '#e0306a', border: 'border-pink-200', bg: 'bg-pink-50', text: 'text-pink-800' },
  mythic: { name: 'Thần thoại', color: '#e0306a', border: 'border-pink-200', bg: 'bg-pink-50', text: 'text-pink-800' },
  junk: { name: 'Rác', color: '#8a8070', border: 'border-stone-200', bg: 'bg-stone-50', text: 'text-stone-700' },
};

const TITLE_MILESTONES = [
  { at: 5, title: 'Tập câu', icon: '🎣' },
  { at: 15, title: 'Cần thủ', icon: '🐟' },
  { at: 30, title: 'Cao thủ sông nước', icon: '🌊' },
  { at: 50, title: 'Thần câu', icon: '⭐' },
  { at: 70, title: 'Huyền thoại bến đò', icon: '🏆' },
  { at: 89, title: 'Vua bến đò', icon: '👑' },
];

const SPOT_NAMES: Record<string, string> = { bank: 'bờ sông', dock: 'cầu tre' };
const TIME_NAMES: Record<string, string> = {
  dawn: 'sáng sớm 5h–9h',
  day: 'ban ngày',
  dusk: 'chiều tà 16h–19h',
  night: 'ban đêm',
};
const ROD_NAMES = ['Cần tre', 'Cần thuỷ tinh', 'Cần carbon', 'Cần nano'];

function formatHint(f: FishEntry): string {
  const parts: string[] = [];
  if (f.minRod !== undefined && f.minRod > 0) {
    parts.push(`🎣 ${ROD_NAMES[f.minRod - 1] ?? `cần ${f.minRod}`} trở lên`);
  }
  parts.push(f.spot ? SPOT_NAMES[f.spot] || f.spot : 'khắp bến');
  parts.push(f.time ? TIME_NAMES[f.time] || f.time : 'giờ nào cũng có');
  if (f.weekend) parts.push('thứ Bảy, CN');
  return parts.join(' · ');
}

interface FishDexTabProps {
  snap: GameSnapshot | null;
}

export function FishDexTab({ snap }: FishDexTabProps) {
  const [activeTab, setActiveTab] = useState<string>('common');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const benNet = snap?.benNet;
  const dex: Record<string, { count?: number; best?: number; rainbow?: number; odd?: number }> =
    (benNet?.dex as Record<string, { count?: number; best?: number; rainbow?: number; odd?: number }>) || {};
  const records: Record<string, { name: string; size: number }> =
    ((benNet?.board as { records?: Record<string, { name: string; size: number }> } | undefined)?.records) || {};
  const currentTitle: string | null = benNet?.title ? String(benNet.title) : null;

  // Species count (non-junk, non-mythic)
  const speciesList = useMemo(
    () => fishCatalog.filter((f) => f.rarity !== 'junk' && f.rarity !== 'mythic'),
    []
  );
  const caughtSpeciesCount = useMemo(
    () => speciesList.filter((f) => Boolean(dex[f.id])).length,
    [speciesList, dex]
  );
  const totalSpeciesCount = speciesList.length;

  const nextMilestone = useMemo(
    () => TITLE_MILESTONES.find((m) => caughtSpeciesCount < m.at),
    [caughtSpeciesCount]
  );

  const handleOpenGamePanel = async () => {
    await execGameAction('BEN_SET_PANEL', { panel: 'dex' });
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await execGameAction('BEN_REFRESH', { kind: 'board' });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const rarityTabs = ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic', 'junk'];

  // Filtered fishes
  const displayedFishes = useMemo(() => {
    let list: FishEntry[] = [];
    if (activeTab === 'rainbow') {
      list = fishCatalog.filter((f) => f.rarity !== 'junk');
    } else if (activeTab === 'odd') {
      list = fishCatalog.filter((f) => f.rarity !== 'junk');
    } else if (activeTab !== 'guide') {
      list = fishCatalog.filter((f) => f.rarity === activeTab);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((f) => f.name.toLowerCase().includes(q) || f.id.toLowerCase().includes(q));
    }
    return list;
  }, [activeTab, searchTerm]);

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* Header Banner */}
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-teal-50 to-sky-50 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
              <BookOpen className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Sổ cá Bến đò</span>
                <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-mono">
                  {caughtSpeciesCount}/{totalSpeciesCount} loài
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600">
                Danh hiệu: <b className="text-slate-800">{currentTitle ?? 'Chưa có'}</b>
                {nextMilestone ? (
                  <span>
                    {' '}· Mốc kế: cần <b>{nextMilestone.at}</b> loài ({nextMilestone.icon} {nextMilestone.title})
                  </span>
                ) : (
                  <span> · Đã đạt danh hiệu tối cao 👑</span>
                )}
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
              title="Làm mới bảng kỷ lục bến"
            >
              <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">Cập nhật</span>
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleOpenGamePanel}
              className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg gap-1 cursor-pointer font-medium shadow-xs"
            >
              <span>Mở trong game</span>
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-2.5 w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, (caughtSpeciesCount / Math.max(1, totalSpeciesCount)) * 100)}%`,
            }}
          />
        </div>
      </div>

      {/* Rarity Navigation Tabs + Search */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin pb-1">
          {rarityTabs.map((key) => {
            const meta = RARITY_META[key] || {
              name: key,
              color: '#6a9a4a',
              border: 'border-slate-200',
              bg: 'bg-slate-50',
              text: 'text-slate-800',
            };
            const pool = fishCatalog.filter((f) => f.rarity === key);
            const caughtPool = pool.filter((f) => Boolean(dex[f.id]));
            const isSelected = activeTab === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTab(key)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
                  isSelected
                    ? `${meta.bg} ${meta.border} font-bold ring-1 ring-emerald-500/30 shadow-xs`
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
                style={{ color: isSelected ? meta.color : undefined }}
              >
                <span>{meta.name}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  {caughtPool.length}/{pool.length}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setActiveTab('rainbow')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
              activeTab === 'rainbow'
                ? 'bg-amber-50 border-amber-300 text-amber-900 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>🌈 Cầu vồng</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('odd')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
              activeTab === 'odd'
                ? 'bg-purple-50 border-purple-300 text-purple-900 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>✨ Cá lạ</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
              activeTab === 'guide'
                ? 'bg-blue-50 border-blue-300 text-blue-900 font-bold shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>📜 Cẩm nang</span>
          </button>
        </div>

        {/* Search Bar */}
        {activeTab !== 'guide' && (
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên cá..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}
      </div>

      {/* Guide Tab Content */}
      {activeTab === 'guide' ? (
        <div className="flex flex-col gap-2.5">
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
              <span className="text-base">🎣</span>
              <span>Canh phao câu sao cho dính</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Đứng sát mép nước rồi quăng câu. Phao rỉa nhẹ hay chìm một cái rồi nổi lên là cá đang thử mồi, giật lúc đó cá chạy mất.
              <b> Phao chìm hẳn, nằm luôn dưới nước mới GIẬT!</b> Lên tới ghìm cần thì cá chạy bên nào vuốt ngược bên kia (phím ← → hoặc A D), sai hay chậm là dây căng, căng quá đứt dây.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-sky-800">
              <span className="text-base">🐟</span>
              <span>Độ hiếm & Thời gian xuất hiện</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Cá có 7 bậc: Rác, Thường, Hơi hiếm, Hiếm, Rất hiếm, Huyền thoại, Thần thoại. Cần câu xịn hơn ở tiệm mồi chú Đực giúp bắt cá hiếm dễ hơn. Có loài chỉ xuất hiện vào sáng sớm (5h–9h), ban đêm, hay cuối tuần (thứ Bảy, CN). Trong sổ có ghi rõ gợi ý chỗ và giờ xuất hiện của loài chưa bắt được!
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-800">
              <span className="text-base">✨</span>
              <span>Cá lạ & Cá cầu vồng</span>
            </div>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Loài nào cũng có biến thể màu lạ (bạch tạng, vàng kim, đen tuyền, xanh biếc) và biến thể cầu vồng 🌈 cực hiếm. Bắt được cá lạ sẽ có giá bán vỏ sò cao gấp nhiều lần so với bình thường!
            </p>
          </div>
        </div>
      ) : (
        /* Fish Cards Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {displayedFishes.map((f) => {
            const caught = dex[f.id];
            const isKnown = Boolean(caught);
            const record = records[f.id];
            const isMyRecord = Boolean(isKnown && record && (caught?.best ?? 0) >= record.size);
            const meta = RARITY_META[f.rarity] || RARITY_META.common;

            const isRainbowTab = activeTab === 'rainbow';
            const isOddTab = activeTab === 'odd';
            const variantCount = isRainbowTab
              ? Number(caught?.rainbow) || 0
              : isOddTab
              ? Number(caught?.odd) || 0
              : 0;

            const cardIsKnown = isRainbowTab || isOddTab ? variantCount > 0 : isKnown;

            return (
              <div
                key={f.id}
                className={`flex flex-col justify-between p-2.5 rounded-xl border transition-all ${
                  cardIsKnown
                    ? 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                    : 'bg-slate-100/70 border-dashed border-slate-300 opacity-80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg text-base shrink-0 ${
                        cardIsKnown ? meta.bg : 'bg-slate-200'
                      }`}
                    >
                      {f.rarity === 'junk' ? '🗑️' : cardIsKnown ? '🐟' : '❓'}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">
                          {cardIsKnown ? f.name : '???'}
                        </span>
                        {isRainbowTab && <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0">Cầu vồng</Badge>}
                        {isOddTab && <Badge className="bg-purple-100 text-purple-800 text-[9px] px-1 py-0">Cá lạ</Badge>}
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[9px] px-1.5 py-0 border font-normal ${meta.border} ${meta.bg}`}
                        style={{ color: meta.color }}
                      >
                        {meta.name} · {f.price} 🐚
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Stats or Hint */}
                <div className="mt-2 text-[11px] border-t border-slate-100 pt-1.5 flex flex-col gap-0.5">
                  {cardIsKnown ? (
                    <div className="flex items-center justify-between text-slate-700">
                      <span>
                        {isRainbowTab || isOddTab
                          ? `Đã câu: ${variantCount} con`
                          : f.size
                          ? `${caught.count} con · to nhất ${caught.best} cm`
                          : `${caught.count} lần`}
                      </span>
                      {f.size && (
                        <span className="text-[10px] text-slate-500 font-mono">
                          (khoảng {f.size[0]}–{f.size[1]}cm)
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-500 text-[10px] leading-snug">
                      💡 {formatHint(f)}
                    </span>
                  )}

                  {/* Record Holder */}
                  {record && (
                    <div
                      className={`text-[10px] font-medium flex items-center gap-1 mt-0.5 ${
                        isMyRecord ? 'text-emerald-700 font-bold' : 'text-slate-500'
                      }`}
                    >
                      <span>📏</span>
                      <span>
                        {isMyRecord
                          ? `Bạn giữ kỷ lục bến: ${record.size} cm`
                          : `Kỷ lục bến: ${record.size} cm (${record.name})`}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
