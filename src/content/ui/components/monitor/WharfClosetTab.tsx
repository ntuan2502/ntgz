import React, { useState, useMemo } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shirt, ExternalLink, Check } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';
import wharfCatalogRaw from '@/shared/constants/wharf-catalog-data.json';

interface CatalogItem {
  id: string;
  name: string;
  desc?: string;
  price?: number;
  slot?: string;
  tier?: string;
  icon?: string;
  limited?: boolean;
  [key: string]: unknown;
}

const rawData = wharfCatalogRaw as {
  backItems: CatalogItem[];
  closetItems: CatalogItem[];
};

const TIER_MAP: Record<string, { name: string; color: string }> = {
  common: { name: 'Thường', color: '#6a9a4a' },
  uncommon: { name: 'Hơi hiếm', color: '#3c8fd0' },
  rare: { name: 'Hiếm', color: '#9b6bff' },
  epic: { name: 'Rất hiếm', color: '#e0443a' },
  legend: { name: 'Huyền thoại', color: '#e8a020' },
  legendary: { name: 'Huyền thoại', color: '#e8a020' },
  myth: { name: 'Thần thoại', color: '#e0306a' },
  mythic: { name: 'Thần thoại', color: '#e0306a' },
};

const SLOTS = [
  { id: 'shirt', name: '👕 Áo', defaultText: 'Như ở quê', defaultSub: 'Mặc lại đồ đang mặc ở nông trại', icon: '👕' },
  { id: 'bottom', name: '👖 Quần', defaultText: 'Như ở quê', defaultSub: 'Mặc lại đồ đang mặc ở nông trại', icon: '👖' },
  { id: 'hat', name: '👒 Nón', defaultText: 'Như ở quê', defaultSub: 'Mặc lại nón đang đội ở nông trại', icon: '👒' },
  { id: 'back', name: '🎒 Lưng', defaultText: 'Không đeo gì', defaultSub: 'Cất đồ đeo lưng vô tủ đồ', icon: '🙌' },
  { id: 'pet', name: '🐾 Thú cưng', defaultText: 'Không dắt thú cưng', defaultSub: 'Để thú cưng ở nhà nghỉ ngơi', icon: '🏠' },
];

interface WharfClosetTabProps {
  snap: GameSnapshot | null;
}

export function WharfClosetTab({ snap }: WharfClosetTabProps) {
  const [activeSlot, setActiveSlot] = useState<string>('shirt');
  const [viewMode, setViewMode] = useState<'owned' | 'all'>('owned');

  const benNet = snap?.benNet;
  const closet: string[] = Array.isArray(benNet?.closet) ? benNet.closet : [];
  const look: Record<string, string> = (benNet?.look as Record<string, string>) || {};
  const currentEquippedId = look[activeSlot] ?? null;

  const currentSlotDef = SLOTS.find((s) => s.id === activeSlot) || SLOTS[0];

  // All catalog items for current slot
  const slotCatalogItems: CatalogItem[] = useMemo(() => {
    if (activeSlot === 'back') {
      return rawData.backItems.map((b) => ({
        ...b,
        slot: 'back',
        icon: '🎒',
      }));
    }
    return rawData.closetItems.filter((item) => item.slot === activeSlot);
  }, [activeSlot]);

  // Owned items for this slot
  const ownedSlotItems = useMemo(() => {
    return slotCatalogItems.filter((item) => closet.includes(item.id));
  }, [slotCatalogItems, closet]);

  const displayedItems = viewMode === 'owned' ? ownedSlotItems : slotCatalogItems;

  const handleOpenGamePanel = async () => {
    await execGameAction('BEN_SET_PANEL', { panel: 'closet', closetSlot: activeSlot });
  };

  const handleEquip = async (itemId: string | null) => {
    await execGameAction('BEN_SET_LOOK', { slot: activeSlot, id: itemId });
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* Header Banner */}
      <div className="rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-xs">
              <Shirt className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Tủ đồ ở Bến đò</span>
                <Badge className="bg-indigo-600 text-white text-[10px] px-1.5 py-0 font-medium">
                  {closet.length} món sở hữu
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Đồ mua ở bến chỉ mặc ở bến, đè lên đồ quê. Thay đổi tức thì không tốn lượt!
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleOpenGamePanel}
            className="h-7 px-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg gap-1 cursor-pointer font-medium shadow-xs ml-auto"
          >
            <span>Mở trong game</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Current Equipped Look Summary Bar */}
        <div className="mt-2.5 grid grid-cols-5 gap-1.5 pt-2 border-t border-indigo-200/60 text-center">
          {SLOTS.map((slot) => {
            const equippedId = look[slot.id];
            const item = (slot.id === 'back' ? rawData.backItems : rawData.closetItems).find(
              (i) => i.id === equippedId
            );

            return (
              <div
                key={slot.id}
                onClick={() => setActiveSlot(slot.id)}
                className={`flex flex-col p-1.5 rounded-lg border cursor-pointer transition-all ${
                  activeSlot === slot.id
                    ? 'bg-white border-indigo-400 ring-1 ring-indigo-400 shadow-2xs font-bold'
                    : 'bg-white/60 border-slate-200 hover:bg-white text-slate-700'
                }`}
              >
                <span className="text-[10px] text-slate-500">{slot.name.split(' ')[1]}</span>
                <span className="text-xs truncate font-medium text-indigo-900" title={item?.name || 'Mặc định'}>
                  {item ? item.name : 'Mặc định'}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slot Selection Tabs & View Filter */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
          {SLOTS.map((slot) => (
            <button
              key={slot.id}
              type="button"
              onClick={() => setActiveSlot(slot.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer border ${
                activeSlot === slot.id
                  ? 'bg-indigo-100 border-indigo-300 text-indigo-900 font-bold shadow-xs'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{slot.name}</span>
            </button>
          ))}
        </div>

        {/* Filter Toggle: Owned vs All */}
        <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => setViewMode('owned')}
            className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
              viewMode === 'owned'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Đã có ({ownedSlotItems.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2 py-0.5 rounded-md cursor-pointer transition-all ${
              viewMode === 'all'
                ? 'bg-white text-slate-900 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tất cả ({slotCatalogItems.length})
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="flex flex-col gap-2">
        {/* Default Slot Option (Mặc định / Như quê / Không đeo) */}
        <div className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
              {currentSlotDef.icon}
            </span>
            <div>
              <span className="font-bold text-xs text-slate-900">{currentSlotDef.defaultText}</span>
              <p className="text-[11px] text-slate-500">{currentSlotDef.defaultSub}</p>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            variant={currentEquippedId === null ? 'default' : 'outline'}
            disabled={currentEquippedId === null}
            onClick={() => handleEquip(null)}
            className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
              currentEquippedId === null
                ? 'bg-emerald-600 text-white hover:bg-emerald-600 cursor-default font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            {currentEquippedId === null ? (
              <span className="flex items-center gap-1">
                <Check className="h-3 w-3" />
                <span>Đang chọn</span>
              </span>
            ) : (
              'Chọn'
            )}
          </Button>
        </div>

        {/* Owned or Catalog Items */}
        {displayedItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
            <p>Chưa sở hữu món nào trong ngăn {currentSlotDef.name.split(' ')[1]}.</p>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className="mt-2 text-indigo-600 font-semibold hover:underline cursor-pointer"
            >
              Xem tất cả mẫu ở tiệm Bến Đò 🛍️
            </button>
          </div>
        ) : (
          displayedItems.map((item) => {
            const isOwned = closet.includes(item.id);
            const isEquipped = currentEquippedId === item.id;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                  isEquipped
                    ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs font-semibold'
                    : isOwned
                    ? 'bg-white border-slate-200 hover:border-slate-300'
                    : 'bg-slate-50/60 border-dashed border-slate-200 opacity-75'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-base">
                    {item.icon || '👕'}
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-slate-900">{item.name}</span>
                      {item.tier && TIER_MAP[item.tier] && (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1 py-0 font-normal border"
                          style={{
                            color: TIER_MAP[item.tier].color,
                            borderColor: TIER_MAP[item.tier].color,
                          }}
                        >
                          {TIER_MAP[item.tier].name}
                        </Badge>
                      )}
                      {item.limited && (
                        <Badge className="bg-amber-100 text-amber-800 text-[9px] px-1 py-0">Giới hạn</Badge>
                      )}
                      {!isOwned && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-slate-500">
                          {item.price ? `🐚 ${item.price}` : 'Chưa sở hữu'}
                        </Badge>
                      )}
                    </div>
                    {item.desc && <p className="text-[11px] text-slate-500 line-clamp-1">{item.desc}</p>}
                  </div>
                </div>

                <div>
                  {isOwned ? (
                    <Button
                      type="button"
                      size="sm"
                      variant={isEquipped ? 'default' : 'outline'}
                      disabled={isEquipped}
                      onClick={() => handleEquip(item.id)}
                      className={`h-7 px-3 text-xs rounded-lg cursor-pointer ${
                        isEquipped
                          ? 'bg-emerald-600 text-white hover:bg-emerald-600 cursor-default font-bold'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {isEquipped ? (
                        <span className="flex items-center gap-1">
                          <Check className="h-3 w-3" />
                          <span>Đang chọn</span>
                        </span>
                      ) : (
                        'Chọn'
                      )}
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={handleOpenGamePanel}
                      className="h-7 px-2 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                    >
                      <span>Mua tại tiệm</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
