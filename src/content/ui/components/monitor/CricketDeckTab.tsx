import React, { useState, useEffect } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Swords, Shield, Zap, Moon, Sun, Compass, ExternalLink, Flame } from 'lucide-react';
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

  // Real-time ticking clock for Wharf (multiplayer online area)
  const [realtime, setRealtime] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setRealtime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Bến Đò operates on Vietnam time (UTC+7) synchronized with server skew
  const nowMs = realtime.getTime() + (benNet?.ti?.skew ?? 0);
  const vnDate = new Date(nowMs);
  const hour = vnDate.getHours();
  const min = vnDate.getMinutes();
  const sec = vnDate.getSeconds();
  const timeFormatted = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

  // Hunting windows:
  // - Night hunt (Bắt dế đêm): 18h00 to 05h00
  // - Rare & legendary golden hunt (Khung giờ dế quý hiếm): 23h00 to 04h00
  const isNightHuntOpen = hour >= 18 || hour < 5;
  const isRareHour = hour >= 23 || hour < 4;

  // 6 Bamboo tubes
  const cricketsBox = benNet?.crickets?.box || [];
  const cricketsDex = benNet?.crickets?.dex || [];

  // All 12 in-game cricket species metadata
  const speciesMeta: Record<
    string,
    {
      label: string;
      icon: string;
      rarity: 'legendary' | 'epic' | 'rare' | 'uncommon' | 'common';
      rarityLabel: string;
      specialty: string;
    }
  > = {
    deVuong: {
      label: 'Dế Vương',
      icon: '👑',
      rarity: 'legendary',
      rarityLabel: 'Huyền thoại',
      specialty: 'Công thủ toàn diện, thống trị sới dế',
    },
    deMa: {
      label: 'Dế Ma',
      icon: '🔮',
      rarity: 'epic',
      rarityLabel: 'Sử thi',
      specialty: 'Xuất quỷ nhập thần, đòn đánh hiểm hóc',
    },
    deSat: {
      label: 'Dế Sắt',
      icon: '🛡️',
      rarity: 'epic',
      rarityLabel: 'Sử thi',
      specialty: 'Giáp thép lỳ đòn, phòng ngự vô đối',
    },
    deNgoc: {
      label: 'Dế Ngọc',
      icon: '💎',
      rarity: 'rare',
      rarityLabel: 'Hiếm',
      specialty: 'Tinh anh đồng cỏ, né đòn xuất sắc',
    },
    deLua: {
      label: 'Dế Lửa',
      icon: '🔥',
      rarity: 'rare',
      rarityLabel: 'Hiếm',
      specialty: 'Gan dạ bốc lửa, búng càng cực nhanh',
    },
    deVang: {
      label: 'Dế Vàng',
      icon: '🌟',
      rarity: 'rare',
      rarityLabel: 'Hiếm',
      specialty: 'Uy dũng nhanh nhẹn, kẹp càng cực đau',
    },
    deCo: {
      label: 'Dế Cồ',
      icon: '🪨',
      rarity: 'uncommon',
      rarityLabel: 'Đặc biệt',
      specialty: 'Thân hình vạm vỡ, sức húc uy lực',
    },
    deTrui: {
      label: 'Dế Trũi',
      icon: '🕳️',
      rarity: 'uncommon',
      rarityLabel: 'Đặc biệt',
      specialty: 'Đào bới thiện chiến, thể lực dồi dào',
    },
    deThan: {
      label: 'Dế Than',
      icon: '🪵',
      rarity: 'uncommon',
      rarityLabel: 'Đặc biệt',
      specialty: 'Lỳ lợm dẻo dai, thủ vững như đá',
    },
    deMen: {
      label: 'Dế Mèn',
      icon: '🦗',
      rarity: 'common',
      rarityLabel: 'Thường',
      specialty: 'Dũng cảm can trường, tốc độ ổn định',
    },
    deCom: {
      label: 'Dế Cơm',
      icon: '🌾',
      rarity: 'common',
      rarityLabel: 'Thường',
      specialty: 'Càng to chắc khỏe, đòn kẹp sát thương',
    },
    deDat: {
      label: 'Dế Đất',
      icon: '🌱',
      rarity: 'common',
      rarityLabel: 'Thường',
      specialty: 'Bám đất chắc chắn, đòn thế mộc mạc',
    },
  };

  const rarityBadgeStyles: Record<string, string> = {
    legendary: 'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
    epic: 'bg-purple-100 text-purple-900 border-purple-300 font-semibold',
    rare: 'bg-sky-100 text-sky-900 border-sky-300 font-medium',
    uncommon: 'bg-emerald-100 text-emerald-900 border-emerald-300 font-medium',
    common: 'bg-slate-100 text-slate-700 border-slate-300 font-medium',
  };

  const formatRemainingTime = (targetTimestamp?: number) => {
    if (!targetTimestamp || targetTimestamp <= 0) return null;
    const diffMs = targetTimestamp - nowMs;
    if (diffMs <= 0) {
      return <span className="text-[9px] text-rose-600 font-semibold">💀 Đã hết hạn</span>;
    }
    const totalMinutes = Math.floor(diffMs / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const timeStr =
      days > 0
        ? `${days} ngày ${hours}h`
        : hours > 0
        ? `${hours}h ${minutes}p`
        : `${minutes} phút`;

    return (
      <span
        className="text-[9px] font-mono font-medium text-amber-700 truncate"
        title={`Hạn sống: ${new Date(targetTimestamp).toLocaleString('vi-VN')}`}
      >
        ⏳ Còn {timeStr}
      </span>
    );
  };

  const formatRestStatus = (restUntil?: number) => {
    if (!restUntil || restUntil <= nowMs) {
      return (
        <span className="text-[9px] font-medium text-emerald-700 flex items-center gap-0.5 shrink-0">
          ⚔️ Sẵn sàng
        </span>
      );
    }
    const diffMins = Math.ceil((restUntil - nowMs) / 60000);
    return (
      <span className="text-[9px] font-medium text-amber-700 flex items-center gap-0.5 shrink-0" title={`Hồi phục lúc: ${new Date(restUntil).toLocaleTimeString('vi-VN')}`}>
        💤 Nghỉ ({diffMins}p)
      </span>
    );
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0">
      {/* Night Hunt Golden Hour Radar Banner */}
      <div
        className={`relative overflow-hidden rounded-xl p-3 text-white shadow-md border ${
          isRareHour
            ? 'bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-900 border-purple-500/40'
            : isNightHuntOpen
            ? 'bg-gradient-to-br from-indigo-950 via-slate-900 to-emerald-950 border-emerald-500/30'
            : 'bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700/50'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold min-w-0">
            {isRareHour ? (
              <>
                <Flame className="h-4 w-4 text-amber-400 animate-pulse shrink-0" />
                <span className="text-amber-300 font-bold truncate">GIỜ VÀNG DẾ HIẾM ĐANG MỞ!</span>
              </>
            ) : isNightHuntOpen ? (
              <>
                <Moon className="h-4 w-4 text-amber-300 animate-pulse shrink-0" />
                <span className="text-amber-200 font-bold truncate">GIỜ SĂN DẾ ĐÊM ĐANG MỞ!</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 font-medium truncate">Ban Ngày (Dế đang ngủ dưới hang)</span>
              </>
            )}
          </div>
          <Badge
            className={`font-mono text-[10px] px-2 py-0 shrink-0 ${
              isRareHour
                ? 'bg-purple-500 text-white font-bold'
                : isNightHuntOpen
                ? 'bg-amber-400 text-amber-950 font-bold'
                : 'bg-slate-700 text-slate-300'
            }`}
          >
            ⏰ {timeFormatted}
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5">
          <p className="text-[11px] text-slate-300 leading-snug">
            {isRareHour
              ? '🔥 Khung 23h00 – 04h00: Dế Vương (Huyền thoại) & Dế Ma (Sử thi) xuất hiện quanh Bến Đò.'
              : isNightHuntOpen
              ? '🌙 Khung 18h00 – 05h00 sáng: Dế đêm xuất hiện dày đặc quanh các bụi cỏ Bến Đò.'
              : '☀️ Khung giờ săn dế đêm mở lại lúc 18h00 tối (khung dế hiếm: 23h00 – 04h00).'}
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

        {/* Wharf Quick Resources - Aligned vertically with Vietnamese number formatting */}
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 pt-2 border-t border-white/10 text-center">
          <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-1.5 min-h-[46px]">
            <span className="text-[10px] text-slate-400 font-medium">Vỏ sò</span>
            <span className="font-mono font-bold text-amber-300 tabular-nums text-xs">
              {shells.toLocaleString('vi-VN')} 🐚
            </span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-1.5 min-h-[46px]">
            <span className="text-[10px] text-slate-400 font-medium">Thể lực</span>
            <span className="font-mono font-bold text-emerald-400 tabular-nums text-xs">
              {stamina.toLocaleString('vi-VN')}/100 ⚡
            </span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-1.5 min-h-[46px]">
            <span className="text-[10px] text-slate-400 font-medium">Vé quay</span>
            <span className="font-mono font-bold text-sky-400 tabular-nums text-xs">
              {tickets.toLocaleString('vi-VN')} 🎟️
            </span>
          </div>
          <div className="flex flex-col items-center justify-center bg-white/5 rounded-lg p-1.5 min-h-[46px]">
            <span className="text-[10px] text-slate-400 font-medium">Mồi câu</span>
            <span className="font-mono font-bold text-pink-300 tabular-nums text-xs">
              {bait.toLocaleString('vi-VN')} 🪱
            </span>
          </div>
        </div>
      </div>

      {/* 6 Bamboo Tubes Cricket Deck Header */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center gap-1.5">
          <Swords className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold text-slate-800">
            Hồ Sơ 6 Ống Tre Dế Chiến ({cricketsBox.length}/6)
          </span>
        </div>
        <span className="text-[11px] font-mono text-slate-500 font-medium">
          Đã mở: {cricketsDex.length}/12 loài
        </span>
      </div>

      {/* 6 Tubes Grid with equal height cards and vertical alignment */}
      <div className="grid grid-cols-2 gap-2 min-w-0">
        {Array.from({ length: 6 }).map((_, idx) => {
          const cricket = cricketsBox[idx];

          if (!cricket) {
            return (
              <div
                key={`tube_${idx}`}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-center min-h-[175px]"
              >
                <span className="text-[10px] font-mono text-slate-400 font-semibold mb-1">
                  Ống tre #{idx + 1}
                </span>
                <span className="text-2xl text-slate-300 select-none my-1">🎋</span>
                <span className="text-[10px] text-slate-400 font-medium">Ống tre còn trống</span>
                <span className="text-[9px] text-slate-400/80 mt-1">Sẵn sàng nuôi dế</span>
              </div>
            );
          }

          const species = cricket.species || 'deMen';
          const meta = speciesMeta[species] || {
            label: species.startsWith('de') ? `Dế ${species.slice(2)}` : species,
            icon: '🦗',
            rarity: 'common' as const,
            rarityLabel: 'Thường',
            specialty: 'Dế chiến dũng mãnh',
          };
          const stats = cricket.stats || { power: 10, tough: 10, nerve: 10 };
          const caps = cricket.caps || stats;
          const combatPower = (stats.power || 0) + (stats.tough || 0) + (stats.nerve || 0);
          const maxPotential = (caps.power || 0) + (caps.tough || 0) + (caps.nerve || 0);

          return (
            <div
              key={cricket.id || `cricket_${idx}`}
              className="flex flex-col justify-between p-2.5 rounded-xl bg-white border border-slate-200/90 shadow-2xs hover:border-emerald-300 transition-colors min-h-[175px]"
            >
              <div>
                {/* Header row: Tube #, Rarity Badge, CP */}
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-[10px] font-mono font-semibold text-slate-400 shrink-0">
                      #{idx + 1}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[9px] px-1 py-0 h-4 border leading-none ${
                        rarityBadgeStyles[meta.rarity] || rarityBadgeStyles.common
                      }`}
                    >
                      {meta.rarityLabel}
                    </Badge>
                  </div>
                  <Badge className="bg-emerald-600 text-white font-mono text-[9.5px] px-1.5 py-0 font-bold shrink-0">
                    CP {combatPower}
                  </Badge>
                </div>

                {/* Species Icon & Name */}
                <div className="mt-1.5 flex items-start gap-1.5">
                  <span className="text-xl leading-none shrink-0 select-none">{meta.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                      {meta.label}
                    </p>
                    <p className="text-[9px] text-slate-400 truncate leading-tight mt-0.5">
                      {meta.specialty}
                    </p>
                  </div>
                </div>

                {/* Expiry & Rest status row */}
                <div className="mt-1 flex items-center justify-between gap-1 text-[9px] pt-1 border-t border-slate-100">
                  {formatRemainingTime(cricket.diesAt)}
                  {formatRestStatus(cricket.restUntil)}
                </div>
              </div>

              {/* 3 Stats bars with mini progress bars */}
              <div className="mt-1.5 flex flex-col gap-1 pt-1.5 border-t border-slate-100 text-[10px]">
                {/* Power */}
                <div>
                  <div className="flex items-center justify-between leading-none">
                    <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Swords className="h-2.5 w-2.5 text-rose-500 shrink-0" />
                      <span>Công:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[9.5px]">
                      {stats.power}
                      <span className="text-[8px] text-slate-400 font-normal">/{caps.power}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-rose-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((stats.power || 0) / (caps.power || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Tough */}
                <div>
                  <div className="flex items-center justify-between leading-none">
                    <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Shield className="h-2.5 w-2.5 text-blue-500 shrink-0" />
                      <span>Lỳ đòn:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[9.5px]">
                      {stats.tough}
                      <span className="text-[8px] text-slate-400 font-normal">/{caps.tough}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-blue-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((stats.tough || 0) / (caps.tough || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Nerve */}
                <div>
                  <div className="flex items-center justify-between leading-none">
                    <span className="flex items-center gap-1 text-slate-500 text-[9px]">
                      <Zap className="h-2.5 w-2.5 text-amber-500 shrink-0" />
                      <span>Gan dạ:</span>
                    </span>
                    <span className="font-mono font-bold text-slate-800 text-[9.5px]">
                      {stats.nerve}
                      <span className="text-[8px] text-slate-400 font-normal">/{caps.nerve}</span>
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden mt-0.5">
                    <div
                      className="h-full bg-amber-500 rounded-full"
                      style={{
                        width: `${Math.min(100, Math.round(((stats.nerve || 0) / (caps.nerve || 1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-[8.5px] text-slate-400 text-right leading-none pt-0.5 font-mono">
                  Tiềm năng: {combatPower}/{maxPotential} ({Math.round((combatPower / (maxPotential || 1)) * 100)}%)
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
          <span>Địa Điểm Săn Dế Đêm Bến Đò (18h00 – 05h00)</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-600">
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🌾 Đồng Cỏ Phía Đông</span>
            <span>Mọi loài dế · Dế Vương (Huyền thoại, 0h-3h)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🎋 Bãi Lau Sậy</span>
            <span>Dế Ngọc & Dế Ma (Sử thi, 23h-4h)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🌾 Bờ Ruộng</span>
            <span>Dế Trũi, Dế Vàng & Dế Sắt (Sử thi)</span>
          </div>
          <div className="p-1.5 rounded bg-white border border-slate-200">
            <span className="font-bold text-slate-800 block">🥬 Quanh Luống Rau & Bãi Cỏ</span>
            <span>Dế Cồ, Dế Lửa, Dế Mèn & Dế Cơm</span>
          </div>
        </div>
      </div>
    </div>
  );
}
