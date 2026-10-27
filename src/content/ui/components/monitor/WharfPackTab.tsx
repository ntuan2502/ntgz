import React, { useState } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Backpack, Star, ExternalLink, RefreshCw, Zap, Check } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';

interface FishEntry {
  id: string;
  name: string;
  rarity: string;
  [key: string]: unknown;
}

const fishMetaMap = new Map<string, FishEntry>(
  (fishDexRaw as FishEntry[]).map((f) => [f.id, f])
);

const RARITY_COLORS: Record<string, string> = {
  common: '#6a9a4a',
  uncommon: '#3c8fd0',
  rare: '#9b6bff',
  epic: '#e0443a',
  legendary: '#e8a020',
  mythic: '#e0306a',
  junk: '#8a8070',
};

const STANDARD_RODS = [
  { level: 1, name: 'Cần tre', desc: 'Cần tre cơ bản, câu ven bờ', icon: '🎣' },
  { level: 2, name: 'Cần sợi thuỷ tinh', desc: 'Dẻo dai, nhạy phao hơn, dễ dính cá hiếm', icon: '🎣' },
  { level: 3, name: 'Cần carbon', desc: 'Nhẹ và chắc, cá huyền thoại cũng phải nể', icon: '🎣' },
  { level: 4, name: 'Cần nano', desc: 'Đỉnh cao kỹ thuật, bắt cá thần thoại', icon: '🎣' },
];

const FOOD_ITEMS = [
  { id: 'banhMi', name: 'Bánh mì thịt', stamina: 20, icon: '🥖', desc: 'Ăn lẹ rồi ra câu tiếp' },
  { id: 'chaoCa', name: 'Cháo cá lóc', stamina: 28, icon: '🥣', desc: 'Nóng hổi, thêm tiêu với hành phi' },
  { id: 'huTieu', name: 'Hủ tiếu nam vang', stamina: 40, icon: '🍜', desc: 'Nước lèo ngọt thanh, ăn xong khoẻ re' },
  { id: 'comTam', name: 'Cơm tấm sườn bì', stamina: 60, icon: '🍛', desc: 'Sườn nướng than, mỡ hành nước mắm kẹo' },
  { id: 'lauMam', name: 'Lẩu cá linh', stamina: 100, icon: '🍲', desc: 'Mùa nước nổi, một nồi là đầy Sức' },
  { id: 'xoiBap', name: 'Xôi bắp gói lá chuối', stamina: 15, icon: '🍙', desc: 'Hạt bắp dẻo thơm rắc đậu phộng' },
  { id: 'khoaiMi', name: 'Khoai mì hấp dừa', stamina: 12, icon: '🥔', desc: 'Khoai mì bùi béo ngọt dịu' },
  { id: 'nuocMia', name: 'Ly nước mía tắc', stamina: 10, icon: '🥤', desc: 'Mát lạnh giải nhiệt trưa hè' },
  { id: 'traDa', name: 'Ca trà đá đường', stamina: 8, icon: '🧊', desc: 'Đã khát bên bờ sông' },
  { id: 'cheBuoi', name: 'Chén chè bưởi', stamina: 18, icon: '🍧', desc: 'Cùi bưởi giòn sần sật' },
];

interface RodsStoreData {
  owned?: string[];
  using?: string | null;
  [key: string]: unknown;
}

interface WharfPackTabProps {
  snap: GameSnapshot | null;
}

export function WharfPackTab({ snap }: WharfPackTabProps) {
  const [activeTab, setActiveTab] = useState<'food' | 'fish' | 'rods'>('food');
  const [fishFilter, setFishFilter] = useState<'all' | 'kept'>('all');
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  const benNet = snap?.benNet;
  const wallet = benNet?.wallet;
  const shells = Number(wallet?.shells) || 0;
  const stamina = Number(wallet?.liveStamina ?? wallet?.stamina) || 0;
  const bait = Number(wallet?.bait) || 0;
  const rodLevel = Number(wallet?.rod) || 1;

  const pack: Record<string, number> = (benNet?.pack as Record<string, number>) || {};
  const basket = benNet?.basket || [];
  const rodsData = benNet?.rods as RodsStoreData | null | undefined;
  const ownedRods: string[] = Array.isArray(rodsData?.owned) ? rodsData.owned : [];
  const usingRod: string | null = rodsData?.using ? String(rodsData.using) : null;

  const handleOpenGamePanel = async () => {
    await execGameAction('BEN_SET_PANEL', { panel: 'pack', bagTab: activeTab });
  };

  const handleRefreshRods = async () => {
    setIsRefreshing(true);
    await execGameAction('BEN_REFRESH', { kind: 'rods' });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleToggleKeep = async (fishId: string | undefined, currentKept: boolean | undefined) => {
    if (!fishId) return;
    await execGameAction('BEN_KEEP_FISH', { id: fishId, on: !currentKept });
  };

  const handleUseRod = async (rodId: string) => {
    await execGameAction('BEN_USE_ROD', { rod: rodId });
  };

  // Filtered fish basket
  const displayedBasket = basket.filter((f) => (fishFilter === 'kept' ? Boolean(f.kept) : true));
  const keptCount = basket.filter((f) => Boolean(f.kept)).length;

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* Header Wallet Chip Bar */}
      <div className="rounded-xl border border-pink-200 bg-gradient-to-r from-pink-50 via-rose-50 to-orange-50 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-600 text-white shadow-xs">
              <Backpack className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Túi đồ Bến đò</span>
                <Badge className="bg-pink-600 text-white text-[10px] px-1.5 py-0 font-medium">
                  Hành Trang
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Chứa đồ ăn hồi phục thể lực, cá trong giỏ và các loại cần câu.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenGamePanel}
            className="h-7 px-2.5 text-xs bg-pink-600 hover:bg-pink-700 text-white rounded-lg gap-1 cursor-pointer font-medium shadow-xs ml-auto"
          >
            <span>Mở trong game</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Realtime Resources Chip */}
        <div className="mt-2.5 grid grid-cols-3 gap-1.5 pt-2 border-t border-pink-200/60 text-center">
          <div className="flex flex-col bg-white/80 rounded-lg p-1.5 border border-pink-200/60 shadow-2xs">
            <span className="text-[10px] text-slate-500">Vỏ sò</span>
            <span className="font-mono font-bold text-amber-700 text-xs">{shells.toLocaleString('vi-VN')} 🐚</span>
          </div>
          <div className="flex flex-col bg-white/80 rounded-lg p-1.5 border border-pink-200/60 shadow-2xs">
            <span className="text-[10px] text-slate-500">Thể lực</span>
            <span className="font-mono font-bold text-emerald-700 text-xs">{stamina}/100 ⚡</span>
          </div>
          <div className="flex flex-col bg-white/80 rounded-lg p-1.5 border border-pink-200/60 shadow-2xs">
            <span className="text-[10px] text-slate-500">Mồi câu</span>
            <span className="font-mono font-bold text-pink-700 text-xs">{bait} 🪱</span>
          </div>
        </div>
      </div>

      {/* Sub-Tabs: Food, Fish, Rods */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('food')}
            className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
              activeTab === 'food'
                ? 'bg-white text-pink-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🍙 Đồ ăn ({Object.values(pack).reduce((acc: number, v: unknown) => acc + (Number(v) || 0), 0)})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fish')}
            className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
              activeTab === 'fish'
                ? 'bg-white text-pink-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🐟 Cá ({basket.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rods')}
            className={`px-3 py-1 rounded-md cursor-pointer transition-all ${
              activeTab === 'rods'
                ? 'bg-white text-pink-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🎣 Cần câu ({ownedRods.length + 1})
          </button>
        </div>

        {activeTab === 'fish' && (
          <div className="flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => setFishFilter('all')}
              className={`px-2 py-0.5 rounded cursor-pointer ${
                fishFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => setFishFilter('kept')}
              className={`px-2 py-0.5 rounded cursor-pointer flex items-center gap-0.5 ${
                fishFilter === 'kept' ? 'bg-amber-500 text-white font-bold' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              <span>⭐ Đang giữ ({keptCount})</span>
            </button>
          </div>
        )}

        {activeTab === 'rods' && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRefreshRods}
            disabled={isRefreshing}
            className="h-6 px-2 text-xs text-slate-700 hover:bg-slate-100 gap-1 cursor-pointer"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[11px]">Đồng bộ cần</span>
          </Button>
        )}
      </div>

      {/* Content for Tab 1: Food */}
      {activeTab === 'food' && (
        <div className="flex flex-col gap-2">
          {FOOD_ITEMS.map((item) => {
            const count = Number(pack[item.id]) || 0;
            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  count > 0
                    ? 'bg-white border-slate-200 hover:border-slate-300 shadow-2xs'
                    : 'bg-slate-50/60 border-dashed border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-base">
                    {item.icon}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1 py-0 flex items-center gap-0.5">
                        <Zap className="h-2.5 w-2.5" />
                        <span>+{item.stamina} ⚡</span>
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-bold font-mono text-xs text-slate-800">x{count}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Content for Tab 2: Fish in Basket */}
      {activeTab === 'fish' && (
        <div className="flex flex-col gap-2">
          {displayedBasket.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
              <p>Giỏ cá hiện đang trống. Hãy vung cần câu cá nào 🎣</p>
            </div>
          ) : (
            displayedBasket.map((fish, idx) => {
              const meta = fish.fish ? fishMetaMap.get(fish.fish) : null;
              const name = meta?.name ?? fish.fish ?? 'Cá';
              const rarity = meta?.rarity ?? 'common';
              const color = RARITY_COLORS[rarity] || '#6a9a4a';
              const isKept = Boolean(fish.kept);

              return (
                <div
                  key={fish.id || idx}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isKept
                      ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                      {fish.rainbow ? '🌈' : fish.odd ? '✨' : '🐟'}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{name}</span>
                        {fish.size && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {fish.size} cm
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 font-normal border"
                          style={{ color, borderColor: color }}
                        >
                          {rarity}
                        </Badge>
                      </div>
                      <div className="text-[11px] text-amber-800 font-mono font-medium mt-0.5">
                        🐚 {Number(fish.price || 0).toLocaleString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isKept ? 'default' : 'outline'}
                    onClick={() => handleToggleKeep(fish.id, isKept)}
                    className={`h-7 px-2.5 text-xs rounded-lg cursor-pointer ${
                      isKept
                        ? 'bg-amber-500 hover:bg-amber-600 text-white font-bold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Star className={`h-3 w-3 ${isKept ? 'fill-white' : ''}`} />
                    <span>{isKept ? 'Bỏ giữ' : 'Giữ'}</span>
                  </Button>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Content for Tab 3: Rods */}
      {activeTab === 'rods' && (
        <div className="flex flex-col gap-2">
          {/* Standard Rod Level */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-xs font-bold text-slate-900 block mb-2">Cần câu chuẩn:</span>
            <div className="grid grid-cols-2 gap-2">
              {STANDARD_RODS.map((rod) => {
                const isUnlocked = rodLevel >= rod.level;
                const isCurrent = rodLevel === rod.level;

                return (
                  <div
                    key={rod.level}
                    className={`p-2 rounded-lg border text-xs flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-emerald-50 border-emerald-300 font-bold text-emerald-900 shadow-2xs'
                        : isUnlocked
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{rod.name}</span>
                      {isCurrent && (
                        <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0">Đang dùng</Badge>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">{rod.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pulled Special Rods */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <span className="text-xs font-bold text-slate-900 block mb-2">Cần bốc tiệm chú Đực:</span>
            {ownedRods.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Chưa sở hữu cần bốc nào. Quay mồi may mắn ở tiệm chú Đực để nhận cần xịn!
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {ownedRods.map((rodId) => {
                  const isUsing = usingRod === rodId;
                  return (
                    <div
                      key={rodId}
                      className={`flex items-center justify-between p-2 rounded-lg border ${
                        isUsing
                          ? 'bg-indigo-50 border-indigo-300 font-semibold'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎣</span>
                        <div>
                          <span className="text-xs font-bold text-slate-900">{rodId}</span>
                        </div>
                      </div>

                      <Button
                        type="button"
                        size="sm"
                        variant={isUsing ? 'default' : 'outline'}
                        disabled={isUsing}
                        onClick={() => handleUseRod(rodId)}
                        className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
                          isUsing
                            ? 'bg-indigo-600 text-white font-bold cursor-default'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isUsing ? (
                          <span className="flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            <span>Đang dùng</span>
                          </span>
                        ) : (
                          'Trang bị'
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
