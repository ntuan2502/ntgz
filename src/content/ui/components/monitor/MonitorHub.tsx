import React, { useState, useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { CricketDeckTab } from './CricketDeckTab';
import { FishDexTab } from './FishDexTab';
import { WharfBoardTab } from './WharfBoardTab';
import { WharfClosetTab } from './WharfClosetTab';
import { FriendsTab } from './FriendsTab';
import { WharfPackTab } from './WharfPackTab';
import { TabErrorBoundary } from './TabErrorBoundary';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { preloadGameAssets } from '@/content/bridge/game-assets';
import fishDexRaw from '@/shared/constants/fish-dex-data.json';

export type MonitorTabId =
  | 'crickets'
  | 'dex'
  | 'board'
  | 'closet'
  | 'friends'
  | 'pack';

interface MonitorHubProps {
  snap: GameSnapshot | null;
  onClose: () => void;
  defaultTab?: MonitorTabId;
  showHeader?: boolean;
}

const WHARF_TABS: Array<{ id: MonitorTabId; label: string; icon: string }> = [
  { id: 'board', label: 'Bảng vàng', icon: '🏆' },
  { id: 'pack', label: 'Túi đồ', icon: '🎒' },
  { id: 'crickets', label: 'Ống tre dế', icon: '🦗' },
  { id: 'dex', label: 'Sổ cá', icon: '📖' },
  { id: 'closet', label: 'Tủ đồ', icon: '👕' },
  { id: 'friends', label: 'Bạn bè', icon: '👥' },
];

export function MonitorHub({
  snap,
  onClose,
  defaultTab = 'board',
  showHeader = true,
}: MonitorHubProps) {
  const [activeTab, setActiveTab] = useState<MonitorTabId>(defaultTab);
  const [boardInitialCategory, setBoardInitialCategory] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  useEffect(() => {
    // Warm up common in-game pixel art assets
    const commonKeys = [
      'coin',
      'plotSoil',
      'plotSoilWet',
      'hoe',
      'wateringCan',
      'basket',
      'fertilizer',
      'pesticide',
      'coffee',
      'mysteryBag',
      'radish',
      'carrot',
      'corn',
      'rice',
      'crop-radish',
      'crop-carrot',
      'crop-corn',
      'crop-rice',
      'seed-radish',
      'seed-carrot',
      'seed-corn',
      'seed-rice',
      'ongTre',
      'gui',
      'cui',
      'gioCa',
      'thuocSau',
      'thuocCo',
      'canCau',
      'fsveg-rauMuong',
      'fsveg-caChua',
      'fsveg-duaLeo',
      'fsveg-ot',
      'fsveg-duaHau',
      'i-egg',
      'i-cow',
      'i-chick',
      'chicken',
      'i-soup',
      'i-corn',
      'i-juice',
      'i-sandwich',
      'i-rice',
      'i-cake',
      'i-bread',
      'i-drink',
      'i-crown',
      'i-fire',
      'i-sparkle',
      'i-hammer',
      'i-flex',
      'i-target',
      'i-leafBrown',
      'i-worm',
      'i-shirt',
      'i-shorts',
      'i-nonla',
      'i-cap',
      'i-hair',
      'i-bag',
      'i-trophy',
      'i-money',
      'i-moneybag',
      ...((fishDexRaw as Array<{ id: string }>).map((f) => `benfish-${f.id}`)),
    ];
    void preloadGameAssets(commonKeys);
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 overflow-hidden select-none">
      {/* Top Header Bar */}
      {showHeader && (
        <div className="flex items-center justify-between px-3 py-2 bg-white border-b border-slate-200/90 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-7 px-2 text-xs font-medium text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg gap-1 cursor-pointer"
              title="Quay lại bảng điều khiển chính (Esc)"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Quay lại</span>
            </Button>
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>🎒</span>
              <span>Giám Sát Bến Đò Realtime</span>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <Badge
              variant="outline"
              className="border-slate-200 bg-slate-50 text-slate-600 font-mono text-[10px] px-1.5 py-0"
            >
              Ngày #{snap?.day || 1}
            </Badge>
            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0 font-medium">
              Live
            </Badge>
          </div>
        </div>
      )}

      {/* Tab Navigation Pills with horizontal scroll */}
      <div className="px-3 py-1.5 bg-slate-100/95 border-b border-slate-200/90 shrink-0 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 min-w-max pr-8">
          {WHARF_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white text-emerald-800 shadow-xs font-bold border border-slate-200/80 ring-1 ring-emerald-500/20'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <span className="text-sm">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-slate-50/50">
        {activeTab === 'pack' && (
          <TabErrorBoundary fallbackName="Túi đồ">
            <WharfPackTab snap={snap} />
          </TabErrorBoundary>
        )}
        {activeTab === 'crickets' && (
          <TabErrorBoundary fallbackName="Ống tre dế">
            <CricketDeckTab
              snap={snap}
              onNavigateBoard={(catId) => {
                setBoardInitialCategory(catId || 'trumSoi');
                setActiveTab('board');
              }}
            />
          </TabErrorBoundary>
        )}
        {activeTab === 'dex' && (
          <TabErrorBoundary fallbackName="Sổ cá">
            <FishDexTab snap={snap} />
          </TabErrorBoundary>
        )}
        {activeTab === 'board' && (
          <TabErrorBoundary fallbackName="Bảng vàng">
            <WharfBoardTab snap={snap} initialCategoryId={boardInitialCategory} />
          </TabErrorBoundary>
        )}
        {activeTab === 'closet' && (
          <TabErrorBoundary fallbackName="Tủ đồ">
            <WharfClosetTab snap={snap} />
          </TabErrorBoundary>
        )}
        {activeTab === 'friends' && (
          <TabErrorBoundary fallbackName="Bạn bè">
            <FriendsTab snap={snap} />
          </TabErrorBoundary>
        )}
      </div>
    </div>
  );
}
