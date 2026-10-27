import React from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Swords, Shield, Zap, Moon, Sun, Compass, ExternalLink } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';

interface CricketDeckTabProps {
  snap: GameSnapshot | null;
}

export function CricketDeckTab({ snap }: CricketDeckTabProps) {
  const benNet = snap?.benNet;
  const wallet = benNet?.wallet;
  const shells = Number(wallet?.shells) || 0;
  const stamina = Number(wallet?.liveStamina ?? wallet?.stamina) || 0;
  const tickets = Number(wallet?.tickets) || 0;
  const bait = Number(wallet?.bait) || 0;

  // In-game minutes (1 day = 1440 mins)
  const minutes = snap?.minutes || 0;
  const hour = Math.floor(minutes / 60);
  const min = minutes % 60;
  const timeFormatted = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;

  // Golden hour for cricket hunt: 18:00 (1080) to 05:00 (300)
  const isNightHuntOpen = minutes >= 1080 || minutes < 300;

  // 6 Bamboo tubes
  const cricketsBox = benNet?.crickets?.box || [];
  const cricketsDex = benNet?.crickets?.dex || [];

  const speciesMeta: Record<string, { label: string; icon: string; specialty: string }> = {
    deVuong: { label: 'Dế Vương', icon: '👑', specialty: 'Sức mạnh cực đại, thống trị đấu trường' },
    deLua: { label: 'Dế Lửa', icon: '🔥', specialty: 'Gan dạ, phản xạ búng càng cực nhanh' },
    deThan: { label: 'Dế Than', icon: '🪵', specialty: 'Lỳ đòn, phòng ngự dẻo dai vô đối' },
    deTrui: { label: 'Dế Trũi', icon: '🕳️', specialty: 'Nặng ký, giáp cứng như đá' },
    deCom: { label: 'Dế Cơm', icon: '🌾', specialty: 'Càng bự, đòn kẹp sát thương cao' },
    deMen: { label: 'Dế Mèn', icon: '🦗', specialty: 'Cân bằng, tốc độ ra đòn ổn định' },
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0">
      {/* Night Hunt Golden Hour Radar Banner */}
      <div
        className={`relative overflow-hidden rounded-xl p-3.5 text-white shadow-md border ${
          isNightHuntOpen
            ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border-emerald-500/30'
            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {isNightHuntOpen ? (
              <>
                <Moon className="h-4 w-4 text-amber-300 animate-pulse" />
                <span className="text-amber-200">GIỜ VÀNG SĂN DẾ ĐÊM ĐANG MỞ!</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-400" />
                <span className="text-slate-300">Ban Ngày (Dế đang ngủ dưới hang)</span>
              </>
            )}
          </div>
          <Badge
            className={`font-mono text-[10px] px-2 py-0 ${
              isNightHuntOpen
                ? 'bg-amber-400 text-amber-950 font-bold'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            {timeFormatted}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 mt-2">
          <p className="text-[11px] text-slate-300">
            {isNightHuntOpen
              ? '🌙 Khung giờ 18h00 - 05h00 sáng: Dế quý hiếm xuất hiện dày đặc quanh Bến Đò.'
              : '☀️ Khung giờ săn dế đêm mở lại vào lúc 18h00 tối. Hãy tích lũy thể lực và đèn pin!'}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => execGameAction('BEN_SET_PANEL', { panel: 'soi' })}
            className="h-6 px-2 text-[11px] bg-white/10 hover:bg-white/20 text-white border-white/20 rounded-lg gap-1 shrink-0 cursor-pointer"
          >
            <span>Sới dế</span>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>

        {/* Wharf Quick Resources */}
        <div className="mt-3 grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 text-center text-xs">
          <div className="flex flex-col bg-white/5 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-400">Vỏ sò</span>
            <span className="font-mono font-bold text-amber-300">{shells} 🐚</span>
          </div>
          <div className="flex flex-col bg-white/5 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-400">Thể lực</span>
            <span className="font-mono font-bold text-emerald-400">{stamina}/100 ⚡</span>
          </div>
          <div className="flex flex-col bg-white/5 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-400">Vé quay</span>
            <span className="font-mono font-bold text-sky-400">{tickets} 🎟️</span>
          </div>
          <div className="flex flex-col bg-white/5 rounded-lg p-1.5">
            <span className="text-[10px] text-slate-400">Mồi câu</span>
            <span className="font-mono font-bold text-pink-300">{bait} 🪱</span>
          </div>
        </div>
      </div>

      {/* 6 Bamboo Tubes Cricket Deck Header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          <Swords className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            Hồ Sơ 6 Ống Tre Dế Chiến ({cricketsBox.length}/6)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Dex: {cricketsDex.length} loài
        </span>
      </div>

      {/* 6 Tubes Grid */}
      <div className="grid grid-cols-2 gap-2 min-w-0">
        {Array.from({ length: 6 }).map((_, idx) => {
          const cricket = cricketsBox[idx];

          if (!cricket) {
            return (
              <div
                key={`tube_${idx}`}
                className="flex flex-col items-center justify-center p-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-center min-h-[110px]"
              >
                <span className="text-[10px] font-mono text-slate-400 font-semibold mb-1">
                  Ống tre #{idx + 1}
                </span>
                <span className="text-lg text-slate-300">🎋</span>
                <span className="text-[10px] text-slate-400 mt-1">Ống tre còn trống</span>
              </div>
            );
          }

          const species = cricket.species || 'deMen';
          const meta = speciesMeta[species] || {
            label: species,
            icon: '🦗',
            specialty: 'Dế chiến dũng mãnh',
          };
          const stats = cricket.stats || { power: 10, tough: 10, nerve: 10 };
          const caps = cricket.caps || stats;
          const combatPower = (stats.power || 0) + (stats.tough || 0) + (stats.nerve || 0);

          return (
            <div
              key={cricket.id || `cricket_${idx}`}
              className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold text-slate-400">
                    Ống #{idx + 1}
                  </span>
                  <Badge className="bg-emerald-600 text-white font-mono text-[9px] px-1.5 py-0 font-bold">
                    CP {combatPower}
                  </Badge>
                </div>

                <div className="mt-1 flex items-center gap-1.5">
                  <span className="text-xl leading-none">{meta.icon}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{meta.label}</p>
                    <p className="text-[9px] text-slate-400 truncate">{meta.specialty}</p>
                  </div>
                </div>
              </div>

              {/* 3 Stats bars */}
              <div className="mt-2.5 flex flex-col gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
                {/* Power */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                    <Swords className="h-2.5 w-2.5 text-rose-500" />
                    <span>Công:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {stats.power}
                    <span className="text-[8px] text-slate-400 font-normal">/{caps.power}</span>
                  </span>
                </div>

                {/* Tough */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                    <Shield className="h-2.5 w-2.5 text-blue-500" />
                    <span>Lỳ đòn:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {stats.tough}
                    <span className="text-[8px] text-slate-400 font-normal">/{caps.tough}</span>
                  </span>
                </div>

                {/* Nerve */}
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                    <Zap className="h-2.5 w-2.5 text-amber-500" />
                    <span>Gan dạ:</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800">
                    {stats.nerve}
                    <span className="text-[8px] text-slate-400 font-normal">/{caps.nerve}</span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Golden Hunting Spots Guide */}
      <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs">
        <div className="flex items-center gap-1 text-slate-700 font-semibold mb-2">
          <Compass className="h-3.5 w-3.5 text-emerald-600" />
          <span>Địa Điểm Săn Dế Đêm Bến Đò</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🌳 Cây Bàng Cổ Thụ</span>
            <span>Dế Vương (Công khủng, cực hiếm)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🌾 Bãi Cỏ Bờ Sông</span>
            <span>Dế Lửa (Búng nhảy cực nhanh)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🪵 Đống Củi Cũ</span>
            <span>Dế Than (Lỳ đòn, thủ trâu)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🕳️ Hang Đất Ẩm</span>
            <span>Dế Trũi & Dế Cơm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
