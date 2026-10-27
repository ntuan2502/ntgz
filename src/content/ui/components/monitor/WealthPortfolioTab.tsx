import React, { useMemo } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import {
  computeInventory,
  computeNetWorth,
  formatVnd,
  formatCompactVnd,
} from './inventory-data';
import { Badge } from '@/components/ui/badge';
import { Wallet, Landmark, PiggyBank, Sparkles, TrendingUp } from 'lucide-react';

interface WealthPortfolioTabProps {
  snap: GameSnapshot | null;
}

interface SavingsBookItem {
  id?: string | number;
  amount?: number;
  days?: number;
  start?: number;
}

export function WealthPortfolioTab({ snap }: WealthPortfolioTabProps) {
  const { totalValuation } = useMemo(() => computeInventory(snap), [snap]);
  const netWorth = useMemo(() => computeNetWorth(snap, totalValuation), [snap, totalValuation]);

  const savings = snap?.savings as {
    books?: SavingsBookItem[];
    matured?: number;
    pig?: { amount?: number; streak?: number };
  } | undefined;
  const books: SavingsBookItem[] = Array.isArray(savings?.books) ? savings!.books : [];
  const maturedCount = Number(savings?.matured) || 0;
  const currentDay = snap?.day || 0;

  // Tier info
  const tier = useMemo(() => {
    if (maturedCount >= 10) {
      return {
        name: 'Người Nhà Dì Bảy',
        icon: '🌟',
        cap: 20_000_000,
        desc: 'Hạn mức tối đa 20 Triệu / sổ (Tối đa 10 sổ)',
        color: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    }
    if (maturedCount >= 5) {
      return {
        name: 'Khách Ruột',
        icon: '💎',
        cap: 12_000_000,
        desc: 'Hạn mức tối đa 12 Triệu / sổ',
        color: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      };
    }
    if (maturedCount >= 2) {
      return {
        name: 'Khách Quen',
        icon: '🥉',
        cap: 8_000_000,
        desc: 'Hạn mức tối đa 8 Triệu / sổ',
        color: 'bg-blue-100 text-blue-900 border-blue-300',
      };
    }
    return {
      name: 'Khách Mới',
      icon: '🌱',
      cap: 5_000_000,
      desc: 'Hạn mức tối đa 5 Triệu / sổ',
      color: 'bg-slate-100 text-slate-800 border-slate-300',
    };
  }, [maturedCount]);

  // Piggy bank calculation
  const pigAmount = savings?.pig?.amount || 0;
  const pigStreak = savings?.pig?.streak || 0;
  const pigMax = 500_000;
  const pigPercent = Math.min(100, Math.round((pigAmount / pigMax) * 100));

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Net Worth Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-teal-950 to-emerald-950 p-4 text-white shadow-md border border-emerald-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
            <Sparkles className="h-4 w-4 text-amber-300" />
            <span>Tổng Tài Sản Ròng (Net Worth)</span>
          </div>
          <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px]">
            Realtime
          </Badge>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-2xl font-black tracking-tight text-white font-mono">
            {formatVnd(netWorth.totalNetWorth)}
          </span>
          <span className="text-xs font-semibold text-emerald-300">VNĐ</span>
        </div>

        {/* Wealth Breakdown Matrix */}
        <div className="mt-3 grid grid-cols-2 gap-2 pt-2.5 border-t border-white/10 text-[11px]">
          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
            <span className="flex items-center gap-1 text-slate-300">
              <Wallet className="h-3.5 w-3.5 text-emerald-400" />
              <span>Tiền mặt trong ví:</span>
            </span>
            <span className="font-mono font-bold text-white">{formatVnd(netWorth.gold)}đ</span>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
            <span className="flex items-center gap-1 text-slate-300">
              <Landmark className="h-3.5 w-3.5 text-blue-400" />
              <span>Gốc sổ tiết kiệm:</span>
            </span>
            <span className="font-mono font-bold text-white">
              {formatVnd(netWorth.savingsPrincipal)}đ
            </span>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
            <span className="flex items-center gap-1 text-slate-300">
              <TrendingUp className="h-3.5 w-3.5 text-amber-400" />
              <span>Lãi dự kiến nhận:</span>
            </span>
            <span className="font-mono font-bold text-emerald-300">
              +{formatVnd(netWorth.savingsInterest)}đ
            </span>
          </div>

          <div className="flex items-center justify-between bg-white/5 rounded-lg p-2">
            <span className="flex items-center gap-1 text-slate-300">
              <PiggyBank className="h-3.5 w-3.5 text-pink-400" />
              <span>Heo đất Dì Bảy:</span>
            </span>
            <span className="font-mono font-bold text-white">{formatVnd(netWorth.pigAmount)}đ</span>
          </div>
        </div>
      </div>

      {/* Dì Bảy Customer Tier & Piggy Bank */}
      <div className="grid grid-cols-2 gap-2">
        {/* Tier Card */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Cấp khách hàng</span>
              <span className="text-base">{tier.icon}</span>
            </div>
            <p className="mt-1 text-xs font-bold text-slate-900">{tier.name}</p>
            <p className="text-[10px] text-slate-500 mt-0.5">{tier.desc}</p>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Đã tất toán:</span>
            <span className="font-mono font-bold text-emerald-700">{maturedCount} cuốn sổ</span>
          </div>
        </div>

        {/* Piggy Card */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Heo đất tiết kiệm</span>
              <span className="text-base">🐷</span>
            </div>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-xs font-bold text-slate-900 font-mono">
                {formatVnd(pigAmount)}đ
              </span>
              <span className="text-[10px] text-slate-400 font-mono">
                /{formatCompactVnd(pigMax)}
              </span>
            </div>

            {/* Progress bar */}
            <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-500 to-rose-500 transition-all"
                style={{ width: `${pigPercent}%` }}
              />
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-slate-500">Chuỗi ngày:</span>
            <span className="font-mono font-bold text-pink-600">{pigStreak} ngày liên tiếp</span>
          </div>
        </div>
      </div>

      {/* Active Savings Books Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <Landmark className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            Sổ Tiết Kiệm Đang Gửi ({books.length}/10 sổ)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-400">
          Tổng vốn: {formatCompactVnd(netWorth.savingsPrincipal)}
        </span>
      </div>

      {/* Books List */}
      {books.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Landmark className="h-7 w-7 text-slate-300 mb-1" />
          <p className="text-xs font-medium text-slate-600">Chưa có sổ tiết kiệm nào</p>
          <p className="text-[10px] text-slate-400">
            Bật tính năng Tự động gửi Dì Bảy để tích lũy sinh lời
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {books.map((book, idx) => {
            const amount = Number(book.amount) || 0;
            const days = Number(book.days) || 7;
            const startDay = Number(book.start) || 0;
            const endDay = startDay + days;
            const daysLeft = Math.max(0, endDay - currentDay);
            const rate = days === 3 ? 0.05 : days === 14 ? 0.35 : 0.15;
            const ratePercent = days === 3 ? '5%' : days === 14 ? '35%' : '15%';
            const estInterest = Math.round(amount * rate);
            const totalMaturity = amount + estInterest;

            const daysPassed = Math.max(0, Math.min(days, currentDay - startDay));
            const progressPercent = Math.min(100, Math.round((daysPassed / days) * 100));

            return (
              <div
                key={book.id || `book_${idx}`}
                className="flex flex-col p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-800 font-mono">
                      #{idx + 1}
                    </span>
                    <span className="text-xs font-bold text-slate-900 font-mono">
                      {formatVnd(amount)}đ
                    </span>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 font-medium text-[10px] px-1.5 py-0"
                  >
                    Kỳ hạn {days} ngày ({ratePercent})
                  </Badge>
                </div>

                {/* Progress bar */}
                <div className="mt-2.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>
                      Gửi ngày #{startDay} → Đáo hạn ngày #{endDay}
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {daysLeft === 0 ? 'Đã đến ngày nhận! 💰' : `Còn ${daysLeft} ngày`}
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Valuation details */}
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                  <span className="text-slate-500 text-[10px]">Lãi dự kiến:</span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-bold text-emerald-600 font-mono">
                      +{formatVnd(estInterest)}đ
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Nhận: {formatCompactVnd(totalMaturity)})
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
