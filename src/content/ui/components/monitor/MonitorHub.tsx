import React, { useState } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { InventoryTab } from './InventoryTab';
import { CropsRadarTab } from './CropsRadarTab';
import { WealthPortfolioTab } from './WealthPortfolioTab';
import { LivestockTab } from './LivestockTab';
import { CricketDeckTab } from './CricketDeckTab';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';

export type MonitorTabId = 'inventory' | 'crops' | 'wealth' | 'livestock' | 'crickets';

interface MonitorHubProps {
  snap: GameSnapshot | null;
  onClose: () => void;
  defaultTab?: MonitorTabId;
}

export function MonitorHub({ snap, onClose, defaultTab = 'inventory' }: MonitorHubProps) {
  const [activeTab, setActiveTab] = useState<MonitorTabId>(defaultTab);

  const tabs: Array<{ id: MonitorTabId; label: string; icon: string }> = [
    { id: 'inventory', label: 'Kho đồ', icon: '🎒' },
    { id: 'crops', label: 'Mùa vụ', icon: '🌱' },
    { id: 'wealth', label: 'Tiết kiệm', icon: '🏦' },
    { id: 'livestock', label: 'Gia súc', icon: '🐾' },
    { id: 'crickets', label: 'Dế chiến', icon: '🦗' },
  ];

  return (
    <div className="flex flex-col flex-1 min-h-0 bg-slate-50 overflow-hidden select-none">
      {/* Top Header Bar */}
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

      {/* 5 Tab Navigation Pills */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-100/90 border-b border-slate-200 shrink-0 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-emerald-700 shadow-xs font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Main Tab Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 bg-slate-50/50">
        {activeTab === 'inventory' && <InventoryTab snap={snap} />}
        {activeTab === 'crops' && <CropsRadarTab snap={snap} />}
        {activeTab === 'wealth' && <WealthPortfolioTab snap={snap} />}
        {activeTab === 'livestock' && <LivestockTab snap={snap} />}
        {activeTab === 'crickets' && <CricketDeckTab snap={snap} />}
      </div>
    </div>
  );
}
