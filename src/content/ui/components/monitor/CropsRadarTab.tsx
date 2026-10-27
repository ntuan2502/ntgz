import React, { useState, useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { CROP_CONFIG, FS_VEG_CONFIG } from './inventory-data';
import { Badge } from '@/components/ui/badge';
import { Droplet, Bug, Sparkles } from 'lucide-react';

interface CropsRadarTabProps {
  snap: GameSnapshot | null;
}

interface RawPlotData {
  crop?: {
    id?: string;
    stage?: number;
    mature?: boolean;
    pests?: boolean;
    fertilized?: boolean;
  };
  watered?: boolean;
  pest?: boolean;
}

export function CropsRadarTab({ snap }: CropsRadarTabProps) {
  const [activeArea, setActiveArea] = useState<'farm' | 'farmstay'>('farm');
  const [now, setNow] = useState(() => Date.now());

  // Ticking timer for real-time countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Process 12 Farm plots
  const rawPlots = (snap?.plots || {}) as Record<string, RawPlotData | undefined>;
  const farmPlotKeys = Object.keys(rawPlots);
  const farmPlots = farmPlotKeys.map((key, idx) => {
    const p = rawPlots[key];
    const cropId = p?.crop?.id || '';
    const stage = Number(p?.crop?.stage) || 0;
    const isMature = stage >= 3 || Boolean(p?.crop?.mature);
    const watered = Boolean(p?.watered);
    const pest = Boolean(p?.crop?.pests || p?.pest);
    const fertilized = Boolean(p?.crop?.fertilized);

    return {
      key,
      index: idx + 1,
      hasCrop: Boolean(cropId),
      cropId,
      stage,
      isMature,
      watered,
      pest,
      fertilized,
    };
  });

  const farmMatureCount = farmPlots.filter((p) => p.isMature).length;
  const farmDryCount = farmPlots.filter((p) => p.hasCrop && !p.watered).length;
  const farmPestCount = farmPlots.filter((p) => p.pest).length;
  const farmGrowingCount = farmPlots.filter((p) => p.hasCrop && !p.isMature).length;
  const _farmEmptyCount = farmPlots.filter((p) => !p.hasCrop).length;

  // 2. Process 24 Farmstay veg plots
  const fsVeg = snap?.farmstay?.veg;
  const fsOpenCount = Math.min(24, Math.max(0, fsVeg?.open || 0));
  const rawFsPlots = fsVeg?.plots || [];
  const farmstayPlots = Array.from({ length: 24 }).map((_, idx) => {
    const isUnlocked = idx < fsOpenCount;
    const plotData = rawFsPlots[idx] || null;
    const cropKey = plotData?.crop || '';
    const readyAt = typeof plotData?.readyAt === 'number' ? plotData.readyAt : null;
    const isDry = plotData !== null && plotData?.readyAt === null;
    const isReady = readyAt !== null && now >= readyAt;
    const isGrowing = readyAt !== null && now < readyAt;
    const secondsLeft = readyAt !== null && readyAt > now ? Math.ceil((readyAt - now) / 1000) : 0;
    const fed = Boolean(plotData?.fed);

    return {
      index: idx + 1,
      isUnlocked,
      isEmpty: isUnlocked && !plotData,
      cropKey,
      readyAt,
      isDry,
      isReady,
      isGrowing,
      secondsLeft,
      fed,
    };
  });

  const fsReadyCount = farmstayPlots.filter((p) => p.isReady).length;
  const fsDryCount = farmstayPlots.filter((p) => p.isDry).length;
  const fsGrowingCount = farmstayPlots.filter((p) => p.isGrowing).length;
  const fsEmptyCount = farmstayPlots.filter((p) => p.isEmpty).length;

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Area Switcher Tabs */}
      <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/80 text-xs font-medium">
        <button
          type="button"
          onClick={() => setActiveArea('farm')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeArea === 'farm'
              ? 'bg-white text-emerald-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🌾</span>
          <span>Ruộng Làng (12 Ô)</span>
          {farmMatureCount > 0 && (
            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
              {farmMatureCount} 🧺
            </Badge>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveArea('farmstay')}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
            activeArea === 'farmstay'
              ? 'bg-white text-emerald-700 shadow-xs font-bold'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🏡</span>
          <span>Rau Farmstay ({fsOpenCount}/24)</span>
          {fsReadyCount > 0 && (
            <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0 h-4">
              {fsReadyCount} 🧺
            </Badge>
          )}
        </button>
      </div>

      {activeArea === 'farm' ? (
        <>
          {/* Farm Plots Summary Bar */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-600 font-medium">Sẵn sàng thu</span>
              <span className="text-base font-bold text-emerald-800 font-mono">
                {farmMatureCount}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-600 font-medium">Đang lớn</span>
              <span className="text-base font-bold text-blue-800 font-mono">
                {farmGrowingCount}
              </span>
            </div>
            <div
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                farmDryCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-[10px] font-medium">Khô nước</span>
              <span className="text-base font-bold font-mono">{farmDryCount}</span>
            </div>
            <div
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                farmPestCount > 0
                  ? 'bg-rose-50 border-rose-300 text-rose-800 animate-pulse'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-[10px] font-medium">Sâu bệnh</span>
              <span className="text-base font-bold font-mono">{farmPestCount}</span>
            </div>
          </div>

          {/* 12 Plots Grid */}
          <div className="grid grid-cols-3 gap-2">
            {farmPlots.map((plot) => {
              const meta = CROP_CONFIG[plot.cropId];
              return (
                <div
                  key={plot.key}
                  className={`flex flex-col justify-between p-2 rounded-xl border text-xs transition-colors ${
                    plot.isMature
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-xs'
                      : plot.pest
                        ? 'bg-rose-50/80 border-rose-300'
                        : plot.hasCrop
                          ? 'bg-white border-slate-200'
                          : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] text-slate-400 font-semibold">
                      #{plot.index}
                    </span>
                    {plot.isMature ? (
                      <Badge className="bg-emerald-600 text-white text-[9px] px-1 py-0">
                        Chín 🧺
                      </Badge>
                    ) : plot.hasCrop ? (
                      <span className="text-[10px] font-mono text-slate-500">
                        GĐ {plot.stage}/3
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-400">Đất trống</span>
                    )}
                  </div>

                  {/* Crop Content */}
                  <div className="my-2 flex flex-col items-center justify-center text-center">
                    {plot.hasCrop ? (
                      <>
                        <span className="text-2xl leading-none">{meta?.icon || '🌱'}</span>
                        <span className="mt-1 font-semibold text-slate-800 text-[11px] truncate max-w-full">
                          {meta?.name || plot.cropId}
                        </span>
                      </>
                    ) : (
                      <div className="py-2 text-slate-300">🟫</div>
                    )}
                  </div>

                  {/* Status Pills */}
                  {plot.hasCrop && (
                    <div className="flex items-center justify-center gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
                      {plot.pest && (
                        <span
                          className="text-rose-600 font-bold flex items-center gap-0.5"
                          title="Có sâu! Cần xịt thuốc trừ sâu"
                        >
                          <Bug className="h-3 w-3" />
                          <span>Sâu</span>
                        </span>
                      )}
                      {!plot.watered ? (
                        <span
                          className="text-amber-600 font-medium flex items-center gap-0.5"
                          title="Đất khô! Cần tưới nước"
                        >
                          <Droplet className="h-3 w-3" />
                          <span>Khô</span>
                        </span>
                      ) : (
                        <span
                          className="text-blue-500 flex items-center gap-0.5"
                          title="Đã tưới nước đủ ẩm"
                        >
                          <Droplet className="h-3 w-3 fill-current" />
                        </span>
                      )}
                      {plot.fertilized && (
                        <span
                          className="text-cyan-600 font-medium flex items-center gap-0.5"
                          title="Đã bón phân NPK"
                        >
                          <Sparkles className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {/* Farmstay Veg Summary Bar */}
          <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[10px] text-emerald-600 font-medium">Chín rồi</span>
              <span className="text-base font-bold text-emerald-800 font-mono">
                {fsReadyCount}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-blue-50 border border-blue-200">
              <span className="text-[10px] text-blue-600 font-medium">Đang đếm ngược</span>
              <span className="text-base font-bold text-blue-800 font-mono">
                {fsGrowingCount}
              </span>
            </div>
            <div
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                fsDryCount > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-800'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <span className="text-[10px] font-medium">Cần tưới</span>
              <span className="text-base font-bold font-mono">{fsDryCount}</span>
            </div>
            <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              <span className="text-[10px] font-medium">Luống trống</span>
              <span className="text-base font-bold font-mono">{fsEmptyCount}</span>
            </div>
          </div>

          {/* 24 Farmstay Plots Grid */}
          <div className="grid grid-cols-4 gap-1.5">
            {farmstayPlots.map((plot) => {
              const meta = FS_VEG_CONFIG[plot.cropKey];
              if (!plot.isUnlocked) {
                return (
                  <div
                    key={`fs_${plot.index}`}
                    className="flex flex-col items-center justify-center p-2 rounded-lg border border-dashed border-slate-200 bg-slate-50/50 text-slate-300 min-h-[72px]"
                  >
                    <span className="text-[9px] font-mono">#{plot.index}</span>
                    <span className="text-sm">🔒</span>
                    <span className="text-[8px] text-slate-400">Chưa mở</span>
                  </div>
                );
              }

              return (
                <div
                  key={`fs_${plot.index}`}
                  className={`flex flex-col justify-between p-1.5 rounded-lg border text-xs min-h-[76px] transition-colors ${
                    plot.isReady
                      ? 'bg-emerald-50 border-emerald-300 shadow-2xs'
                      : plot.isDry
                        ? 'bg-amber-50/70 border-amber-200'
                        : plot.isEmpty
                          ? 'bg-slate-50/60 border-dashed border-slate-200 text-slate-400'
                          : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px]">
                    <span className="font-mono text-slate-400 font-semibold">#{plot.index}</span>
                    {plot.fed && (
                      <span title="Đã bón phân hữu cơ" className="text-cyan-600">
                        🧪
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col items-center justify-center my-0.5">
                    {plot.isEmpty ? (
                      <span className="text-slate-300 text-sm">🌱</span>
                    ) : (
                      <>
                        <span className="text-base leading-none">{meta?.icon || '🥬'}</span>
                        <span className="text-[9px] font-semibold text-slate-800 truncate max-w-full">
                          {meta?.name ? meta.name.split(' ')[0] : plot.cropKey}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Status Indicator */}
                  <div className="text-center font-mono text-[9px]">
                    {plot.isReady ? (
                      <span className="text-emerald-700 font-bold bg-emerald-100 rounded px-1 py-0.2">
                        Thu 🧺
                      </span>
                    ) : plot.isGrowing ? (
                      <span className="text-blue-700 font-semibold">
                        {formatSeconds(plot.secondsLeft)}
                      </span>
                    ) : plot.isDry ? (
                      <span className="text-amber-700 font-medium">Khô 💧</span>
                    ) : (
                      <span className="text-slate-400">Trống</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
