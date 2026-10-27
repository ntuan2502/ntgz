import React from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Badge } from '@/components/ui/badge';
import { Milk, Syringe } from 'lucide-react';

interface LivestockTabProps {
  snap: GameSnapshot | null;
}

interface CowItem {
  id?: string | number;
  name?: string;
  fedDay?: number;
  sickDay?: number;
}

interface ComingCowItem {
  id?: string | number;
  at?: number;
}

interface BuffaloData {
  mood?: number;
  home?: boolean;
  bathDay?: number;
  mudDay?: number;
}

interface HenItem {
  id?: string | number;
}

export function LivestockTab({ snap }: LivestockTabProps) {
  const currentDay = snap?.day || 0;

  // 1. Dairy & Cows
  const dairy = snap?.dairy as {
    milk?: number;
    medicine?: number;
    cows?: CowItem[];
    coming?: ComingCowItem[];
  } | undefined;
  const milkLiters = Math.min(40, Math.max(0, dairy?.milk || 0));
  const milkPercent = Math.min(100, Math.round((milkLiters / 40) * 100));
  const medicineCount = Number(dairy?.medicine) || 0;
  const cows: CowItem[] = Array.isArray(dairy?.cows) ? dairy!.cows : [];
  const comingCows: ComingCowItem[] = Array.isArray(dairy?.coming) ? dairy!.coming : [];

  // 2. Buffalo
  const buffalo = snap?.buffalo as BuffaloData | undefined;
  const buffaloMood = Number(buffalo?.mood) || 0;
  const isBuffaloHome = buffalo?.home !== false;
  const isBuffaloBathed = buffalo?.bathDay === currentDay;
  const isBuffaloMud = buffalo?.mudDay === currentDay;

  // 3. Poultry (Gà & Trứng)
  const coopLevel = snap?.coopLevel || 1;
  const nestEggs = snap?.nestEggs || 0;
  const hens: HenItem[] = Array.isArray(snap?.hens) ? (snap!.hens as HenItem[]) : [];
  const hasFlu = Boolean(snap?.flu);

  // 4. Pet
  const petsData = snap?.pets;
  const pet =
    petsData && typeof petsData === 'object' && 'pet' in petsData
      ? (petsData as { pet?: { name?: string; kind?: string; fedDay?: number; cuddleDay?: number; bathedDay?: number; playDay?: number } }).pet
      : null;
  const isPetFed = pet?.fedDay === currentDay;
  const isPetCuddled = pet?.cuddleDay === currentDay;
  const isPetBathed = pet?.bathedDay === currentDay;

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Milk Tank Gauge Banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-900 via-sky-900 to-slate-900 p-3.5 text-white shadow-md border border-sky-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-200">
            <Milk className="h-4 w-4 text-sky-300" />
            <span>Bình Chứa Sữa Tươi Tập Trung</span>
          </div>
          <Badge
            variant="outline"
            className="border-sky-300/40 bg-sky-400/10 text-sky-200 font-mono text-[10px] px-2 py-0"
          >
            {milkLiters} / 40 Lít
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="mt-2.5">
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-sky-200/80">Sức chứa bình sữa:</span>
            <span className="font-bold font-mono text-white">{milkPercent}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                milkPercent >= 85
                  ? 'bg-gradient-to-r from-amber-400 to-rose-400 animate-pulse'
                  : 'bg-gradient-to-r from-sky-400 to-teal-300'
              }`}
              style={{ width: `${milkPercent}%` }}
            />
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-white/10 text-[10px]">
          <span className="text-sky-200/80">
            {milkLiters >= 35 ? '⚠️ Sữa sắp đầy bình, sẵn sàng xuất bán!' : 'Đang tích lũy từ đàn bò'}
          </span>
          <span className="flex items-center gap-1 font-mono text-white">
            <Syringe className="h-3 w-3 text-cyan-400" />
            <span>Thuốc thú y: {medicineCount} lọ</span>
          </span>
        </div>
      </div>

      {/* Cow Herd Section */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
            <span>🐄</span>
            <span>Đàn Bò Sữa ({cows.length} con)</span>
          </span>
          {comingCows.length > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]">
              +{comingCows.length} bò đang giao
            </Badge>
          )}
        </div>

        {cows.length === 0 ? (
          <div className="p-3 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Chuồng bò đang trống. Bật tự động mua bò để bắt đầu nuôi.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {cows.map((cow, idx) => {
              const isFed = cow.fedDay === currentDay;
              const isSick = cow.sickDay === currentDay;
              const cowName = cow.name || `Bò Sữa #${cow.id || idx + 1}`;

              return (
                <div
                  key={cow.id || idx}
                  className={`flex flex-col justify-between p-2.5 rounded-xl border text-xs ${
                    isSick
                      ? 'bg-rose-50/80 border-rose-300'
                      : 'bg-white border-slate-200/90 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate" title={cowName}>
                      {cowName}
                    </span>
                    <span className="text-sm">🐄</span>
                  </div>

                  <div className="mt-2 flex flex-col gap-1 text-[10px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Cỏ xanh:</span>
                      {isFed ? (
                        <span className="text-emerald-700 font-medium">🌿 Đã ăn no</span>
                      ) : (
                        <span className="text-amber-600 font-medium">⚠️ Đang đói</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Sức khỏe:</span>
                      {isSick ? (
                        <span className="text-rose-600 font-bold">🤒 Cần tiêm</span>
                      ) : (
                        <span className="text-emerald-700 font-medium">💪 Khỏe</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buffalo & Poultry Matrix */}
      <div className="grid grid-cols-2 gap-2">
        {/* Buffalo Card */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>🐂</span>
                <span>Trâu Bản Đôn</span>
              </span>
              <Badge
                variant="outline"
                className={`text-[9px] px-1.5 py-0 ${
                  isBuffaloHome
                    ? 'border-emerald-300 text-emerald-700 bg-emerald-50'
                    : 'border-blue-300 text-blue-700 bg-blue-50'
                }`}
              >
                {isBuffaloHome ? 'Ở chuồng' : 'Đi cày thuê'}
              </Badge>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Tâm trạng:</span>
              <span className="font-bold text-slate-800 font-mono">
                {buffaloMood}/100 {buffaloMood >= 80 ? '🥰' : buffaloMood >= 50 ? '🙂' : '🥺'}
              </span>
            </div>

            {/* Bath status */}
            <div className="mt-1.5 flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tắm mát:</span>
                <span className={isBuffaloBathed ? 'text-emerald-700' : 'text-slate-400'}>
                  {isBuffaloBathed ? '🚿 Đã tắm' : 'Chưa tắm'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Đầm bùn:</span>
                <span className={isBuffaloMud ? 'text-emerald-700' : 'text-slate-400'}>
                  {isBuffaloMud ? '🛁 Đã đầm' : 'Chưa đầm'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Poultry & Coop Card */}
        <div className="flex flex-col justify-between p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>🐔</span>
                <span>Chuồng Gà</span>
              </span>
              <span className="text-[10px] font-mono text-slate-400">Cấp {coopLevel}</span>
            </div>

            <div className="mt-2 flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Ổ trứng vàng:</span>
              <Badge
                className={`font-mono text-xs px-1.5 py-0 ${
                  nestEggs > 0 ? 'bg-amber-500 text-white animate-bounce' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {nestEggs} quả 🥚
              </Badge>
            </div>

            <div className="mt-1.5 flex flex-col gap-1 text-[10px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tổng đàn gà:</span>
                <span className="font-bold text-slate-700 font-mono">{hens.length} con gà</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Dịch cúm:</span>
                {hasFlu ? (
                  <span className="text-rose-600 font-bold animate-pulse">⚠️ Nhiễm cúm!</span>
                ) : (
                  <span className="text-emerald-700 font-medium">✅ An toàn</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pet Companion Card */}
      {pet && (
        <div className="p-3 rounded-xl bg-gradient-to-r from-amber-50/60 to-orange-50/60 border border-amber-200/80 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🐕</span>
              <div>
                <span className="text-xs font-bold text-slate-800">
                  {pet.name || 'Thú Cưng Đồng Hành'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {pet.kind || 'Chú cún trung thành'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  isPetFed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isPetFed ? '🍖 No nê' : 'Đói bụng'}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  isPetCuddled ? 'bg-pink-100 text-pink-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isPetCuddled ? '💖 Vui vẻ' : 'Cần vuốt ve'}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded font-medium ${
                  isPetBathed ? 'bg-sky-100 text-sky-800' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {isPetBathed ? '🚿 Sạch sẽ' : 'Chưa tắm'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
