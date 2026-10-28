import React, { useState, useMemo } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import {
  computeInventory,
  formatVnd,
  formatCompactVnd,
  CATEGORY_LABELS,
  ItemCategory,
  getInventoryAssetKey,
} from './inventory-data';
import { Badge } from '@/components/ui/badge';
import { Search, Package, Sparkles } from 'lucide-react';
import { GameItemIcon } from '@/content/ui/components/GameItemIcon';

interface InventoryTabProps {
  snap: GameSnapshot | null;
}

export function InventoryTab({ snap }: InventoryTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'count' | 'name'>('value');

  const { entries, totalValuation, categoryTotals } = useMemo(() => {
    return computeInventory(snap);
  }, [snap]);

  const filteredEntries = useMemo(() => {
    return entries
      .filter((item) => {
        const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        return matchesCategory && matchesSearch;
      })
      .sort((a, b) => {
        if (sortBy === 'value') return b.totalValue - a.totalValue;
        if (sortBy === 'count') return b.count - a.count;
        return a.name.localeCompare(b.name);
      });
  }, [entries, selectedCategory, searchTerm, sortBy]);

  const totalItemCount = useMemo(() => {
    return entries.reduce((sum, item) => sum + item.count, 0);
  }, [entries]);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Valuation Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-800 p-3.5 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-100">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              <span>Tổng Định Giá Kho Hàng Realtime</span>
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tight text-white font-mono">
                ~{formatVnd(totalValuation)}
              </span>
              <span className="text-xs font-semibold text-emerald-200">VNĐ</span>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-medium backdrop-blur-xs">
              {totalItemCount} món đồ
            </span>
            <span className="mt-1 text-[10px] text-emerald-200/80">
              Quy đổi giá thị trường
            </span>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        <div className="mt-2.5 flex flex-wrap gap-1.5 pt-2 border-t border-white/10 text-[10px]">
          {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => {
            const val = categoryTotals[cat] || 0;
            if (val <= 0) return null;
            return (
              <span
                key={cat}
                className="inline-flex items-center gap-1 bg-black/20 rounded px-1.5 py-0.5 text-white/90"
              >
                <span>{CATEGORY_LABELS[cat].icon}</span>
                <span className="font-mono">{formatCompactVnd(val)}</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
              onKeyUp={(e) => e.stopPropagation()}
              placeholder="Tìm kiếm vật phẩm..."
              className="w-full h-8 pl-8 pr-3 text-xs bg-white border border-slate-200 rounded-lg outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 select-text"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'value' | 'count' | 'name')}
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] text-slate-700 outline-none focus:border-emerald-500 font-medium"
          >
            <option value="value">Giá trị giảm dần</option>
            <option value="count">Số lượng giảm dần</option>
            <option value="name">Tên A-Z</option>
          </select>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tất cả ({entries.length})
          </button>
          {(Object.keys(CATEGORY_LABELS) as ItemCategory[]).map((cat) => {
            const count = entries.filter((e) => e.category === cat).length;
            if (count === 0) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{CATEGORY_LABELS[cat].icon}</span>
                <span>{CATEGORY_LABELS[cat].label}</span>
                <span className="text-[10px] opacity-80 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Item List / Grid */}
      {filteredEntries.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
          <Package className="h-8 w-8 text-slate-300 mb-1" />
          <p className="text-xs font-medium text-slate-500">Không tìm thấy vật phẩm nào</p>
          <p className="text-[11px] text-slate-400">Thử tìm với từ khóa khác hoặc chuyển danh mục</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {filteredEntries.map((item) => (
            <div
              key={item.id}
              className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="flex h-7 w-7 items-center justify-center shrink-0 overflow-hidden">
                    <GameItemIcon
                      itemKey={getInventoryAssetKey(item.id)}
                      fallbackEmoji={item.icon}
                      size={26}
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-800 truncate" title={item.name}>
                      {item.name}
                    </p>
                    {item.desc && (
                      <p className="text-[10px] text-slate-400 truncate">{item.desc}</p>
                    )}
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className="bg-emerald-50 text-emerald-800 border-emerald-200 font-mono text-[11px] px-1.5 py-0 shrink-0 font-bold"
                >
                  x{item.count}
                </Badge>
              </div>

              <div className="mt-2.5 flex items-baseline justify-between pt-1.5 border-t border-slate-100 text-[11px]">
                <span className="text-slate-400 font-mono text-[10px]">
                  {formatVnd(item.unitPrice)}đ
                </span>
                <span className="font-bold text-emerald-700 font-mono text-xs">
                  {formatVnd(item.totalValue)}đ
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
