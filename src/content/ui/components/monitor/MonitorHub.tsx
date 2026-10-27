import React, { useState, useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { InventoryTab } from './InventoryTab';
import { CropsRadarTab } from './CropsRadarTab';
import { WealthPortfolioTab } from './WealthPortfolioTab';
import { LivestockTab } from './LivestockTab';
import { CricketDeckTab } from './CricketDeckTab';
import { FishDexTab } from './FishDexTab';
import { WharfBoardTab } from './WharfBoardTab';
import { WharfClosetTab } from './WharfClosetTab';
import { FriendsTab } from './FriendsTab';
import { WharfPackTab } from './WharfPackTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

export type MonitorTabId =
  | 'inventory'
  | 'crops'
  | 'wealth'
  | 'livestock'
  | 'crickets'
  | 'dex'
  | 'board'
  | 'closet'
  | 'friends'
  | 'pack';

type DomainId = 'farm' | 'wharf' | 'all';

interface MonitorHubProps {
  snap: GameSnapshot | null;
  onClose: () => void;
  defaultTab?: MonitorTabId;
  showHeader?: boolean;
}

const WHARF_TABS: MonitorTabId[] = ['crickets', 'dex', 'board', 'closet', 'friends', 'pack'];

export function MonitorHub({
  snap,
  onClose,
  defaultTab = 'inventory',
  showHeader = true,
}: MonitorHubProps) {
  const [activeTab, setActiveTab] = useState<MonitorTabId>(defaultTab);
  const [activeDomain, setActiveDomain] = useState<DomainId>(() => {
    return WHARF_TABS.includes(defaultTab) ? 'wharf' : 'farm';
  });

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
      setActiveDomain(WHARF_TABS.includes(defaultTab) ? 'wharf' : 'farm');
    }
  }, [defaultTab]);

  const allTabs: Array<{ id: MonitorTabId; label: string; icon: string; domain: 'farm' | 'wharf' }> = [
    // Nông trại
    { id: 'inventory', label: 'Kho đồ', icon: '🎒', domain: 'farm' },
    { id: 'crops', label: 'Mùa vụ', icon: '🌱', domain: 'farm' },
    { id: 'wealth', label: 'Tiết kiệm', icon: '🏦', domain: 'farm' },
    { id: 'livestock', label: 'Gia súc', icon: '🐾', domain: 'farm' },
    // Bến đò
    { id: 'crickets', label: 'Ống tre dế', icon: '🦗', domain: 'wharf' },
    { id: 'dex', label: 'Sổ cá', icon: '📖', domain: 'wharf' },
    { id: 'board', label: 'Bảng vàng', icon: '🏆', domain: 'wharf' },
    { id: 'closet', label: 'Tủ đồ', icon: '👕', domain: 'wharf' },
    { id: 'friends', label: 'Bạn bè', icon: '👥', domain: 'wharf' },
    { id: 'pack', label: 'Túi đồ', icon: '🎒', domain: 'wharf' },
  ];

  const visibleTabs = allTabs.filter((t) => (activeDomain === 'all' ? true : t.domain === activeDomain));

  const handleDomainChange = (domain: DomainId) => {
    setActiveDomain(domain);
    if (domain === 'farm' && !allTabs.find((t) => t.domain === 'farm' && t.id === activeTab)) {
      setActiveTab('inventory');
    } else if (domain === 'wharf' && !allTabs.find((t) => t.domain === 'wharf' && t.id === activeTab)) {
      setActiveTab('crickets');
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 overflow-hidden select-none">
      {/* Top Header Bar (Optional, used if standalone full-panel) */}
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
              <span>Giám Sát Realtime</span>
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

      {/* Domain Switcher Bar (Nông trại vs Bến đò vs Tất cả) */}
      <div className="px-3 py-1 bg-white border-b border-slate-200/60 shrink-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
          <button
            type="button"
            onClick={() => handleDomainChange('farm')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeDomain === 'farm'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🌾 Nông Trại
          </button>
          <button
            type="button"
            onClick={() => handleDomainChange('wharf')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeDomain === 'wharf'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🛶 Bến Đò
          </button>
          <button
            type="button"
            onClick={() => handleDomainChange('all')}
            className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              activeDomain === 'all'
                ? 'bg-white text-emerald-800 font-bold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            ✨ Tất cả
          </button>
        </div>

        <span className="text-[11px] text-slate-500 font-medium pr-1">
          {activeDomain === 'farm' ? '4 mục nông trại' : activeDomain === 'wharf' ? '6 mục bến đò' : '10 mục giám sát'}
        </span>
      </div>

      {/* Tab Navigation Pills with horizontal scroll & generous right margin */}
      <div className="px-3 py-1.5 bg-slate-100/95 border-b border-slate-200/90 shrink-0 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1.5 min-w-max pr-8">
          {visibleTabs.map((tab) => (
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
        {activeTab === 'inventory' && <InventoryTab snap={snap} />}
        {activeTab === 'crops' && <CropsRadarTab snap={snap} />}
        {activeTab === 'wealth' && <WealthPortfolioTab snap={snap} />}
        {activeTab === 'livestock' && <LivestockTab snap={snap} />}
        {activeTab === 'crickets' && <CricketDeckTab snap={snap} />}
        {activeTab === 'dex' && <FishDexTab snap={snap} />}
        {activeTab === 'board' && <WharfBoardTab snap={snap} />}
        {activeTab === 'closet' && <WharfClosetTab snap={snap} />}
        {activeTab === 'friends' && <FriendsTab snap={snap} />}
        {activeTab === 'pack' && <WharfPackTab snap={snap} />}
      </div>
    </div>
  );
}
