import React from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { execGameAction } from '@/content/bridge/content-bridge';
import { ExternalLink, RefreshCw, Sparkles, AlertTriangle } from 'lucide-react';

interface AlluvialMonitorTabProps {
  snap: GameSnapshot | null;
}

function toMs(val: number | null | undefined): number {
  if (typeof val !== 'number' || val <= 0) return 0;
  return val < 1e11 ? val * 1000 : val;
}

function formatRemainingTime(targetRawTimestamp: number): string {
  const targetMs = toMs(targetRawTimestamp);
  const diffSec = Math.floor((targetMs - Date.now()) / 1000);
  if (diffSec <= 0) return 'Sẵn sàng';
  const hours = Math.floor(diffSec / 3600);
  const minutes = Math.floor((diffSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${minutes}p`;
  return `${minutes}p`;
}

export function AlluvialMonitorTab({ snap }: AlluvialMonitorTabProps) {
  const bai = snap?.baiState;
  const farm = bai?.farm;
  const info = bai?.info;
  const dryDex = bai?.dryDex;
  const items = bai?.items || {};
  const plots = farm?.plots || [];
  const coconuts = farm?.coconuts || [];
  const racks = farm?.racks || [];
  const birds = farm?.birds || [];
  const netFish = farm?.netFish || [];

  const nowMs = Date.now();

  // 1. Plots summary
  const ripePlots = plots.filter(
    (p) => p.state === 'ripe' || (p.state === 'growing' && typeof p.readyAt === 'number' && toMs(p.readyAt) <= nowMs)
  );
  const growingPlots = plots.filter(
    (p) => p.state === 'growing' && typeof p.readyAt === 'number' && toMs(p.readyAt) > nowMs
  );
  const dryPlots = plots.filter((p) => p.state === 'dry');
  const emptyPlots = plots.filter((p) => p.state === 'empty');

  // 2. Coconuts summary
  const ripeCocos = coconuts.filter((c) => typeof c.readyAt === 'number' && toMs(c.readyAt) <= nowMs);
  const growingCocos = coconuts.filter((c) => typeof c.readyAt === 'number' && toMs(c.readyAt) > nowMs);

  // 3. Candy Kiln summary
  const candyReadyAt = farm?.candyReadyAt ?? null;
  const isCandyCooking = typeof candyReadyAt === 'number' && toMs(candyReadyAt) > nowMs;
  const isCandyReady = typeof candyReadyAt === 'number' && toMs(candyReadyAt) <= nowMs;

  // 4. Dried Fish Racks summary
  const maxRacks = 6 + ((farm?.dryLv || 1) - 1) * 2;
  const readyRacks = racks.filter((r) => toMs(r.readyAt) <= nowMs);
  const dryingRacks = racks.filter((r) => toMs(r.readyAt) > nowMs);

  // 5. Poultry summary
  const totalEggs = birds.reduce((s, b) => s + (b.eggs || 0), 0);
  const sickBirds = birds.filter((b) => b.diesAt !== null);

  // 6. River Net Fish summary
  const adultFish = netFish.filter((f) => toMs(f.readyAt) <= nowMs);
  const isFishHungry = netFish.some((f) => f.hungry);

  const handleRefresh = () => {
    execGameAction('BAI_REFRESH_INFO', {});
  };

  const handleTakeFerry = () => {
    execGameAction('BAI_FERRY', {});
  };

  return (
    <div className="space-y-3 p-1 text-slate-800 font-sans text-xs">
      {/* 1. Header Card: Tổng quan & Đò ngang */}
      <div className="rounded-xl border border-emerald-200/90 bg-gradient-to-br from-emerald-50/70 via-white to-amber-50/50 p-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌾</span>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                Đất Bãi Phù Sa & Chợ Bãi
              </h3>
              <p className="text-[11px] text-slate-500">
                {bai?.hasLand
                  ? `Đã sở hữu đất bãi (${farm?.parcels || 2} thửa · ${plots.length} luống)`
                  : 'Chưa mua giấy tay đất bãi (Giá: 100.000 🐚)'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-[11px] px-2.5 gap-1 border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
              onClick={handleRefresh}
              title="Làm mới thông tin đất bãi & chợ bãi"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Làm mới</span>
            </Button>
            <Button
              size="sm"
              className="h-7 text-[11px] px-2.5 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleTakeFerry}
            >
              <ExternalLink className="h-3 w-3" />
              <span>Lên đò</span>
            </Button>
          </div>
        </div>

        {/* Đồng hồ hẹn giờ đò */}
        <div className="mt-2.5 pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-600">
            ⏱️ Đợt chăm sóc tiếp theo:
          </span>
          <span className="font-semibold text-emerald-800">
            {bai?.nextReadyAt && bai.nextReadyAt > Date.now()
              ? `Còn ${formatRemainingTime(Math.floor(bai.nextReadyAt / 1000))} (lúc ${new Date(bai.nextReadyAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })})`
              : 'Đã sẵn sàng chăm sóc!'}
          </span>
        </div>
      </div>

      {/* 2. Grid các công trình hệ sinh thái */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* A. Luống Rau Phù Sa */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🌱</span> Luống Rau ({plots.length})
            </span>
            {ripePlots.length > 0 ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-300">
                {ripePlots.length} chín
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                0 chín
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>🌿 Đang lớn: <b>{growingPlots.length}</b> luống</p>
            <p>💧 Khô cần tưới: <b>{dryPlots.length}</b> luống</p>
            <p>🕳️ Trống chưa gieo: <b>{emptyPlots.length}</b> luống</p>
          </div>
        </div>

        {/* B. Vườn Dừa Xiêm */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🥥</span> Vườn Dừa ({coconuts.length})
            </span>
            {ripeCocos.length > 0 ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                {ripeCocos.length} chín
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                0 chín
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>🌴 Đang kết trái: <b>{growingCocos.length}</b> cây</p>
            <p>
              ⏱️ Trái gần nhất: <b>
                {growingCocos.length > 0
                  ? formatRemainingTime(Math.min(...growingCocos.map((c) => toMs(c.readyAt) || nowMs)))
                  : 'Không có'}
              </b>
            </p>
            <p>🥥 Dừa trong kho: <b>{items['coconut'] || items['coconuts'] || items['coco'] || 0}</b> trái</p>
          </div>
        </div>

        {/* C. Lò Kẹo Dừa */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🍬</span> Lò Kẹo Dừa
            </span>
            {isCandyReady ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-pink-50 text-pink-700 border-pink-300">
                Kẹo ra lò!
              </Badge>
            ) : isCandyCooking ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                Đang nấu
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                Lò trống
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>
              ⏱️ Thời gian: <b>
                {isCandyCooking && candyReadyAt ? formatRemainingTime(candyReadyAt) : isCandyReady ? 'Đã chín' : 'Chưa nấu'}
              </b>
            </p>
            <p>🍬 Kẹo thành phẩm: <b>{items['candy'] || 0}</b> thanh</p>
            <p>🍯 Đường mía kho: <b>{items['sugar'] || 0}</b> kg</p>
          </div>
        </div>

        {/* D. Sân Phơi Khô Cá */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🐟</span> Sân Phơi ({racks.length}/{maxRacks})
            </span>
            {readyRacks.length > 0 ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                {readyRacks.length} con khô
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                {dryingRacks.length} đang phơi
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>📜 Sổ khô cá (DryDex): <b>{dryDex?.items?.length || 0}/{dryDex?.total || 24}</b> loài</p>
            <p>🐟 Khô cá trong kho: <b>{info?.specialty?.dried || 0}</b> con</p>
            <p>
              ⏱️ Khô gần nhất: <b>
                {dryingRacks.length > 0
                  ? formatRemainingTime(Math.min(...dryingRacks.map((r) => toMs(r.readyAt))))
                  : 'Trống nong'}
              </b>
            </p>
          </div>
        </div>

        {/* E. Chuồng Gà Vịt */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🐔</span> Chuồng Gà Vịt ({birds.length})
            </span>
            {totalEggs > 0 ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-amber-50 text-amber-700 border-amber-300">
                {totalEggs} trứng
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                0 trứng
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            <p>🥚 Trứng gà kho: <b>{items['eggHen'] || 0}</b> · Trứng vịt: <b>{items['eggDuck'] || 0}</b></p>
            {sickBirds.length > 0 ? (
              <p className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                <span>{sickBirds.length} con bị bệnh!</span>
              </p>
            ) : (
              <p className="text-emerald-700 font-medium">✨ Đàn gia cầm khỏe mạnh</p>
            )}
            <p>💊 Thuốc thú y: <b>{items['med'] || 0}</b> liều</p>
          </div>
        </div>

        {/* F. Lưới Quây Nuôi Cá Sông */}
        <div className="rounded-xl border border-slate-200 bg-white p-2.5 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-800 flex items-center gap-1">
              <span>🕸️</span> Lưới Cá ({netFish.length})
            </span>
            {adultFish.length > 0 ? (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] bg-blue-50 text-blue-700 border-blue-300">
                {adultFish.length} cá lớn
              </Badge>
            ) : (
              <Badge variant="outline" className="h-4.5 px-1.5 text-[10px] text-slate-400 border-slate-200">
                0 lớn
              </Badge>
            )}
          </div>
          <div className="text-[10px] text-slate-600 space-y-0.5">
            {isFishHungry ? (
              <p className="text-amber-700 font-semibold">⚠️ Cá đang đói cám!</p>
            ) : (
              <p className="text-emerald-700 font-medium">✨ Đàn cá ăn no</p>
            )}
            <p>🌾 Bao cám nuôi cá: <b>{items['netFeed'] || 0}</b> bao</p>
            <p>
              ⏱️ Cá lớn sớm nhất: <b>
                {netFish.length > 0
                  ? formatRemainingTime(Math.min(...netFish.map((f) => toMs(f.readyAt))))
                  : 'Lưới trống'}
              </b>
            </p>
          </div>
        </div>
      </div>

      {/* 3. Kho Đặc Sản & Nông Sản Chợ Bãi */}
      <div className="rounded-xl border border-slate-200 bg-white p-3 space-y-2 shadow-2xs">
        <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-amber-500" />
          <span>Kho Hàng Đặc Sản & Nông Sản Chợ Bãi</span>
        </h4>
        <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🍬</span>
            <span className="text-slate-500">Kẹo dừa</span>
            <b className="block text-slate-800 font-semibold">{items['candy'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🐟</span>
            <span className="text-slate-500">Khô cá</span>
            <b className="block text-slate-800 font-semibold">{info?.specialty?.dried || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🥚</span>
            <span className="text-slate-500">Trứng gà</span>
            <b className="block text-slate-800 font-semibold">{items['eggHen'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🥚</span>
            <span className="text-slate-500">Trứng vịt</span>
            <b className="block text-slate-800 font-semibold">{items['eggDuck'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🥥</span>
            <span className="text-slate-500">Dừa xiêm</span>
            <b className="block text-slate-800 font-semibold">{items['coconut'] || items['coconuts'] || items['coco'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🍯</span>
            <span className="text-slate-500">Đường mía</span>
            <b className="block text-slate-800 font-semibold">{items['sugar'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">💊</span>
            <span className="text-slate-500">Thuốc thú y</span>
            <b className="block text-slate-800 font-semibold">{items['med'] || 0}</b>
          </div>
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-1.5">
            <span className="block text-base">🌾</span>
            <span className="text-slate-500">Cám cá</span>
            <b className="block text-slate-800 font-semibold">{items['netFeed'] || 0}</b>
          </div>
        </div>
      </div>
    </div>
  );
}
