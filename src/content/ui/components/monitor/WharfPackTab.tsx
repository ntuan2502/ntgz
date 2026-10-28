import React, { useState, useMemo } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Backpack, Star, ExternalLink, RefreshCw, Zap, Check, Sparkles, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';
import wharfCatalogRaw from '@/shared/constants/wharf-catalog-data.json';
import { GameItemIcon } from '@/content/ui/components/GameItemIcon';

interface FishEntry {
  id: string;
  name: string;
  rarity: string;
  [key: string]: unknown;
}

const fishMetaMap = new Map<string, FishEntry>(
  (fishDexRaw as FishEntry[]).map((f) => [f.id, f])
);

export const RARITY_NAMES: Record<string, string> = {
  common: 'Thường',
  uncommon: 'Hơi hiếm',
  rare: 'Hiếm',
  epic: 'Rất hiếm',
  legend: 'Huyền thoại',
  legendary: 'Huyền thoại',
  myth: 'Thần thoại',
  mythic: 'Thần thoại',
  junk: 'Rác',
  rac: 'Rác',
};

const RARITY_COLORS: Record<string, string> = {
  common: '#6a9a4a',
  uncommon: '#3c8fd0',
  rare: '#9b6bff',
  epic: '#e0443a',
  legend: '#e8a020',
  legendary: '#e8a020',
  myth: '#e0306a',
  mythic: '#e0306a',
  junk: '#8a8070',
  rac: '#8a8070',
};

export const STANDARD_RODS = [
  {
    level: 1,
    name: 'Cần tre',
    desc: 'Cần tre cơ bản, câu ven bờ',
    stats: 'Độ căng dây: 35',
    icon: '🎣',
  },
  {
    level: 2,
    name: 'Cần sợi thuỷ tinh',
    desc: 'Dẻo dai, nhạy phao hơn, dễ dính cá hiếm',
    stats: 'Cắn +150ms · Giật +120ms · Căng: 30',
    icon: '🎣',
  },
  {
    level: 3,
    name: 'Cần carbon',
    desc: 'Nhẹ và chắc, cá huyền thoại cũng phải nể',
    stats: 'Cắn +300ms · Giật +240ms · Căng: 25',
    icon: '🎣',
  },
  {
    level: 4,
    name: 'Cần nano',
    desc: 'Đỉnh cao kỹ thuật, bắt cá thần thoại',
    stats: 'Cắn +340ms · Giật +270ms · Căng: 23',
    icon: '🎣',
  },
];

export interface RodTraitMeta {
  id: string;
  icon: string;
  name: string;
  desc: string;
  statBadge?: string;
}

export const ROD_TRAITS_MAP: Record<string, RodTraitMeta> = {
  nhay: {
    id: 'nhay',
    icon: '🎯',
    name: 'Nhạy phao',
    desc: 'Phao chìm lâu hơn mới chạy, dễ canh giật',
    statBadge: '+250ms giật',
  },
  day: {
    id: 'day',
    icon: '🧵',
    name: 'Dây chắc',
    desc: 'Ghìm cần dư thời gian hơn, vuốt sai dây ít căng',
    statBadge: '+100ms ghìm, -7 căng',
  },
  to: {
    id: 'to',
    icon: '📏',
    name: 'Cá to',
    desc: 'Cá câu lên hay to hơn (tăng tỉ lệ cá khủng & kỷ lục)',
    statBadge: 'Cỡ x1.3',
  },
  tinh: {
    id: 'tinh',
    icon: '✨',
    name: 'Mắt tinh',
    desc: 'Dễ ra cá lạ và hiếm hơn',
    statBadge: 'Cá lạ x1.6',
  },
  cauVong: {
    id: 'cauVong',
    icon: '🌈',
    name: 'Cầu vồng',
    desc: 'Tăng mạnh tỉ lệ xuất hiện cá cầu vồng',
    statBadge: 'Cầu vồng x2',
  },
  nhe: {
    id: 'nhe',
    icon: '💪',
    name: 'Nhẹ tay',
    desc: 'Mỗi lần quăng tốn 3 Sức thay vì 4',
    statBadge: '-1 Sức (3⚡/lần)',
  },
  moi: {
    id: 'moi',
    icon: '🪱',
    name: 'Giữ mồi',
    desc: 'Ba lần quăng thì chừng một lần không mất mồi',
    statBadge: '33% giữ mồi',
  },
  dem: {
    id: 'dem',
    icon: '🌙',
    name: 'Cần đêm',
    desc: 'Thêm may mắn khi câu từ 18h tới 6h sáng',
    statBadge: '+2 May (18h-6h)',
  },
  som: {
    id: 'som',
    icon: '🌅',
    name: 'Cần sớm chiều',
    desc: 'Thêm may mắn từ 5h–9h sáng và 16h–19h chiều',
    statBadge: '+2 May (5-9h & 16-19h)',
  },
  hai: {
    id: 'hai',
    icon: '🐟',
    name: 'Hai lưỡi',
    desc: '1/10 tỉ lệ cá lên bờ dính thêm một con nữa',
    statBadge: '10% câu kép',
  },
  gia: {
    id: 'gia',
    icon: '💰',
    name: 'Được giá',
    desc: 'Cá câu bằng cần này bán được thêm 15% tiền',
    statBadge: '+15% tiền bán',
  },
};

export interface SpecialRodMeta {
  id: string;
  grade: string;
  gradeName: string;
  gradeColor: string;
  name: string;
  desc: string;
  traits: string[];
  icon?: string;
}

export const SPECIAL_RODS_MAP: Record<string, SpecialRodMeta> = {
  tamVong: {
    id: 'tamVong',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần tầm vông',
    desc: 'Tầm vông phơi khô ba nắng, đầu cần rung là biết cá rỉa',
    traits: ['nhay'],
    icon: '🎣',
  },
  trucDen: {
    id: 'trucDen',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần trúc đen',
    desc: 'Trúc đen hun khói bếp, dẻo mà không gãy',
    traits: ['day'],
    icon: '🎣',
  },
  sayDong: {
    id: 'sayDong',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần sậy đồng',
    desc: 'Lưỡi ông Sáu uốn khéo, cá rỉa hoài không sổng mồi',
    traits: ['moi'],
    icon: '🎣',
  },
  mayRung: {
    id: 'mayRung',
    grade: 'good',
    gradeName: 'Tốt',
    gradeColor: '#6a9a4a',
    name: 'Cần mây rừng',
    desc: 'Mây rừng nhẹ hều, quăng cả buổi không mỏi tay',
    traits: ['nhe'],
    icon: '🎣',
  },
  trangRam: {
    id: 'trangRam',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần trăng rằm',
    desc: 'Sơn trắng ánh trăng, đêm rằm cá kéo nhau lên cắn',
    traits: ['dem', 'nhay'],
    icon: '🎣',
  },
  binhMinh: {
    id: 'binhMinh',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần bình minh',
    desc: 'Màu nắng sớm, gà gáy là phao bắt đầu nhúc nhích',
    traits: ['som', 'day'],
    icon: '🎣',
  },
  ongSau: {
    id: 'ongSau',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần ông Sáu chuốt',
    desc: 'Cây ruột của ông Sáu, chuốt tay cả tháng trời',
    traits: ['to', 'moi'],
    icon: '🎣',
  },
  gheNgo: {
    id: 'gheNgo',
    grade: 'rare',
    gradeName: 'Hiếm',
    gradeColor: '#3c8fd0',
    name: 'Cần ghe ngo',
    desc: 'Đỏ vàng như ghe ngo đua, thương lái thấy là trả giá cao',
    traits: ['gia', 'nhe'],
    icon: '🎣',
  },
  ngocBich: {
    id: 'ngocBich',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần ngọc bích',
    desc: 'Xanh trong như ngọc, cá lạ cá cầu vồng hay ghé',
    traits: ['tinh', 'nhay', 'cauVong'],
    icon: '🎣',
  },
  sungTrau: {
    id: 'sungTrau',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần sừng trâu',
    desc: 'Cán sừng trâu đen bóng, cá to cỡ nào cũng ghìm nổi',
    traits: ['to', 'day', 'gia'],
    icon: '🎣',
  },
  domDom: {
    id: 'domDom',
    grade: 'epic',
    gradeName: 'Quý',
    gradeColor: '#9b6bff',
    name: 'Cần đom đóm',
    desc: 'Đêm xuống cả cây cần lập loè như bầy đom đóm',
    traits: ['dem', 'tinh', 'moi'],
    icon: '🎣',
  },
  rongVang: {
    id: 'rongVang',
    grade: 'legend',
    gradeName: 'Huyền thoại',
    gradeColor: '#e8a020',
    name: 'Cần rồng vàng',
    desc: 'Chạm rồng vàng uốn quanh thân, cá chép thấy cũng muốn hoá rồng',
    traits: ['to', 'tinh', 'day', 'hai'],
    icon: '🎣',
  },
  thuongLuong: {
    id: 'thuongLuong',
    grade: 'legend',
    gradeName: 'Huyền thoại',
    gradeColor: '#e8a020',
    name: 'Cần thuồng luồng',
    desc: 'Vảy xanh rêu ánh vàng, nghe đồn lấy từ đáy sông sâu',
    traits: ['dem', 'cauVong', 'nhe', 'hai'],
    icon: '🎣',
  },
  haBa: {
    id: 'haBa',
    grade: 'ultimate',
    gradeName: 'Tối thượng',
    gradeColor: '#e0306a',
    name: 'Cần Hà Bá',
    desc: 'Cây cần của thần sông, cả trăm năm mới trồi lên một lần, cá nào cũng phải nể',
    traits: ['nhay', 'day', 'to', 'tinh', 'cauVong', 'hai'],
    icon: '🎣',
  },
};

export const ALL_SPECIAL_RODS = Object.values(SPECIAL_RODS_MAP);

function formatRodDuration(ms: number): string {
  if (ms <= 0) return 'Đã hết hạn';
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days} ngày ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  return `${Math.max(1, mins)} phút`;
}

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

const wharfCatalogItems = (
  (wharfCatalogRaw as {
    catalog?: Array<{ id: string; name: string; stamina?: number; icon?: string; desc?: string; kind?: string }>;
  }).catalog || []
).filter(
  (c) =>
    c.kind === 'food' ||
    c.kind === 'pack' ||
    c.kind === 'drink' ||
    (typeof c.stamina === 'number' && c.stamina > 0)
);

export interface OwnedRodItem {
  rod: string;
  until?: number;
  [key: string]: unknown;
}

export interface RodsStoreData {
  owned?: (string | OwnedRodItem)[];
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
  const [showCatalog, setShowCatalog] = useState<boolean>(false);

  const benNet = snap?.benNet;
  const wallet = benNet?.wallet;
  const shells = Number(wallet?.shells) || 0;
  const stamina = Number(wallet?.liveStamina ?? wallet?.stamina) || 0;
  const bait = Number(wallet?.bait) || 0;
  const rodLevel = Number(wallet?.rod) || 1;

  const pack: Record<string, number> = (benNet?.pack as Record<string, number>) || {};
  const basket = benNet?.basket || [];
  const rodsData = benNet?.rods as RodsStoreData | null | undefined;

  // Safely parse owned special rods: can be strings or objects { rod: string, until: number }
  const ownedRaw = (rodsData?.owned as (string | OwnedRodItem)[]) || [];
  const ownedRods: OwnedRodItem[] = Array.isArray(ownedRaw)
    ? ownedRaw.map((item) => {
        if (typeof item === 'object' && item !== null && 'rod' in item) {
          return item as OwnedRodItem;
        }
        return { rod: String(item) };
      })
    : [];

  const usingRod: string | null = rodsData?.using ? String(rodsData.using) : null;

  const allFoodItems = useMemo(() => {
    const knownIds = new Set(FOOD_ITEMS.map((f) => f.id));
    const list = [...FOOD_ITEMS];

    for (const item of wharfCatalogItems) {
      if (!knownIds.has(item.id)) {
        list.push({
          id: item.id,
          name: item.name,
          stamina: item.stamina || 10,
          icon: item.icon || '🍱',
          desc: item.desc || 'Món ăn tiếp sức',
        });
        knownIds.add(item.id);
      }
    }

    for (const [packId, count] of Object.entries(pack)) {
      if (!knownIds.has(packId) && Number(count) > 0) {
        list.push({
          id: packId,
          name: packId,
          stamina: 10,
          icon: '🍱',
          desc: 'Món ăn trong túi',
        });
        knownIds.add(packId);
      }
    }

    return list;
  }, [pack]);

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
          {allFoodItems.map((item) => {
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
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-50 text-base shrink-0 overflow-hidden">
                    <GameItemIcon itemKey={item.id} fallbackEmoji={item.icon} size={28} />
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
              const fishId = String(fish.fish || fish.id || '');
              const meta = fishMetaMap.get(fishId);
              const name = meta?.name || (fish as { name?: string }).name || fishId || 'Cá bến đò';
              const rawRarity = String((fish as { rarity?: string }).rarity || meta?.rarity || 'common');
              const rarityKey = rawRarity.toLowerCase();
              const rarityLabel = RARITY_NAMES[rarityKey] || 'Thường';
              const color = RARITY_COLORS[rarityKey] || '#6a9a4a';
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
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base shrink-0 overflow-hidden">
                      <GameItemIcon
                        itemKey={
                          fish.rainbow
                            ? `benfish-rainbow-${fishId}`
                            : fish.odd
                            ? `benfish-odd-${fishId}`
                            : `benfish-${fishId}`
                        }
                        fallbackEmoji={fish.rainbow ? '🌈' : fish.odd ? '✨' : '🐟'}
                        size={28}
                      />
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
                          {rarityLabel}
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
        <div className="flex flex-col gap-2.5">
          {/* Standard Rod Level */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-900">Cần câu chuẩn:</span>
              <span className="text-[10px] text-slate-500 font-medium">Cấp {rodLevel} / 4</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {STANDARD_RODS.map((rod) => {
                const isUnlocked = rodLevel >= rod.level;
                const isCurrent = rodLevel === rod.level && !usingRod;

                return (
                  <div
                    key={rod.level}
                    className={`p-2.5 rounded-lg border text-xs flex flex-col justify-between transition-all ${
                      isCurrent
                        ? 'bg-emerald-50/90 border-emerald-300 font-bold text-emerald-900 shadow-2xs'
                        : isUnlocked
                        ? 'bg-white border-slate-200 text-slate-800'
                        : 'bg-slate-50 border-dashed border-slate-200 text-slate-400 opacity-70'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <GameItemIcon itemKey="canCau" fallbackEmoji="🎣" size={18} />
                          <span className="font-bold">{rod.name}</span>
                        </div>
                        {isCurrent && (
                          <Badge className="bg-emerald-600 text-white text-[8px] px-1 py-0">Đang dùng</Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 leading-tight">{rod.desc}</p>
                    </div>
                    {rod.stats && (
                      <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                        <span className="text-[9.5px] font-mono text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/60 block">
                          ⚡ {rod.stats}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pulled Special Rods */}
          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
            <div className="flex items-center justify-between mb-2.5 flex-wrap gap-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-900">Cần bốc tiệm chú Đực:</span>
                <span className="text-[10px] text-slate-500 font-medium">({ownedRods.length} cây)</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowCatalog((prev) => !prev)}
                className="h-6 px-2 text-[10.5px] text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <BookOpen className="h-3 w-3" />
                <span>{showCatalog ? 'Thu gọn tra cứu' : 'Tra cứu 14 cần & tính năng'}</span>
                {showCatalog ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
            </div>

            {/* Collapsible 14 Special Rods Reference Catalog */}
            {showCatalog && (
              <div className="mb-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-200">
                  <span className="font-bold text-slate-800 flex items-center gap-1">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    <span>Bảng tra cứu cần bốc may mắn & tính năng</span>
                  </span>
                  <span className="text-[10px] text-slate-500">14 loại cần</span>
                </div>
                <div className="flex flex-col gap-2 max-h-[360px] overflow-y-auto pr-1">
                  {ALL_SPECIAL_RODS.map((rod) => (
                    <div
                      key={rod.id}
                      className="p-2 rounded-lg bg-white border border-slate-200 shadow-2xs flex flex-col gap-1.5"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-1.5">
                          <GameItemIcon itemKey="canCau" fallbackEmoji="🎣" size={18} />
                          <span className="font-bold text-slate-900 text-xs">{rod.name}</span>
                          <Badge
                            style={{ backgroundColor: rod.gradeColor }}
                            className="text-white text-[9px] px-1.5 py-0 font-medium"
                          >
                            {rod.gradeName}
                          </Badge>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {rod.grade === 'good' ? '⚡ Bằng cần carbon' : '⚡ Mạnh hơn cần carbon'}
                        </span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 italic leading-snug">{rod.desc}</p>
                      <div className="flex flex-wrap gap-1">
                        {rod.traits.map((tId) => {
                          const tMeta = ROD_TRAITS_MAP[tId];
                          if (!tMeta) return null;
                          return (
                            <span
                              key={tId}
                              title={tMeta.desc}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-900 border border-amber-200/70"
                            >
                              <span>{tMeta.icon}</span>
                              <span className="font-semibold">{tMeta.name}:</span>
                              <span className="text-amber-800">{tMeta.desc}</span>
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {ownedRods.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-2">
                Chưa sở hữu cần bốc nào. Ghé tiệm chú Đực bốc cần để sở hữu cần xịn nhé! 🎣
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {ownedRods.map((item, idx) => {
                  const rodId = item.rod;
                  const meta = SPECIAL_RODS_MAP[rodId];
                  const rodName = meta?.name || rodId;
                  const rodDesc = meta?.desc || 'Cần bốc may mắn từ tiệm chú Đực';
                  const isUsing = usingRod === rodId;
                  const gradeName = meta?.gradeName || 'Hiếm';
                  const gradeColor = meta?.gradeColor || '#3c8fd0';
                  const timeLeft = item.until ? item.until - Date.now() : 0;
                  const isExpired = item.until ? timeLeft <= 0 : false;
                  const traits =
                    Array.isArray(item.traits) && item.traits.length > 0
                      ? (item.traits as string[])
                      : meta?.traits || [];

                  return (
                    <div
                      key={rodId || `rod_${idx}`}
                      className={`p-3 rounded-lg border transition-all ${
                        isUsing
                          ? 'bg-indigo-50/90 border-indigo-300 font-semibold shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2.5 min-w-0">
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-base shrink-0 overflow-hidden border border-indigo-100 mt-0.5">
                            <GameItemIcon itemKey="canCau" fallbackEmoji="🎣" size={26} />
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900">{rodName}</span>
                              <Badge
                                style={{ backgroundColor: gradeColor }}
                                className="text-white text-[9px] px-1.5 py-0 font-medium"
                              >
                                {gradeName}
                              </Badge>
                              {item.until && (
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded border ${
                                    isExpired
                                      ? 'bg-rose-50 text-rose-600 border-rose-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}
                                >
                                  ⏳ {isExpired ? 'Đã hết hạn' : `Còn ${formatRodDuration(timeLeft)}`}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 italic mt-0.5 leading-snug">{rodDesc}</p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant={isUsing ? 'default' : 'outline'}
                          disabled={isUsing || isExpired}
                          onClick={() => handleUseRod(rodId)}
                          className={`h-7 px-3 text-xs rounded-lg shrink-0 cursor-pointer ${
                            isUsing
                              ? 'bg-indigo-600 text-white font-bold cursor-default hover:bg-indigo-600'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {isUsing ? (
                            <span className="flex items-center gap-1">
                              <Check className="h-3 w-3" />
                              <span>Đang dùng</span>
                            </span>
                          ) : isExpired ? (
                            'Hết hạn'
                          ) : (
                            'Trang bị'
                          )}
                        </Button>
                      </div>

                      {/* Base power note */}
                      <div className="mt-2 text-[10.5px] text-slate-600 bg-slate-50 px-2 py-1 rounded-md border border-slate-200/60 flex items-center gap-1.5">
                        <span className="text-xs">⚡</span>
                        <span>
                          {meta?.grade === 'good'
                            ? 'Sức cần tương đương cần carbon (Cấp 3)'
                            : 'Mạnh hơn cần carbon: cá hiếm cắn nhiều hơn, phao chìm lâu hơn'}
                        </span>
                      </div>

                      {/* Special Traits list */}
                      {traits.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-100 flex flex-col gap-1.5">
                          <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                            <Sparkles className="h-3 w-3 text-amber-500" />
                            <span>Tính năng đặc biệt ({traits.length}):</span>
                          </span>
                          <div className="grid grid-cols-1 gap-1">
                            {traits.map((tId) => {
                              const tMeta = ROD_TRAITS_MAP[tId];
                              if (!tMeta) return null;
                              return (
                                <div
                                  key={tId}
                                  className="flex items-center justify-between bg-amber-50/70 border border-amber-200/60 rounded-md px-2 py-1 text-[11px]"
                                >
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="text-xs shrink-0">{tMeta.icon}</span>
                                    <span className="font-bold text-amber-950 shrink-0">{tMeta.name}:</span>
                                    <span className="text-amber-900/90 truncate">{tMeta.desc}</span>
                                  </div>
                                  {tMeta.statBadge && (
                                    <span className="shrink-0 bg-amber-100 text-amber-900 font-semibold text-[9.5px] px-1.5 py-0.2 rounded border border-amber-200/80 ml-1.5">
                                      {tMeta.statBadge}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
