import React, { useState } from 'react';
import { GameSnapshot } from '@/shared/types/game-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Ship, RefreshCw, ExternalLink, Copy, Check, Gift } from 'lucide-react';
import { execGameAction } from '@/content/bridge/content-bridge';

interface WharfRoomItem {
  id: number;
  players: number;
}

interface WharfRoomsData {
  size: number;
  rooms: WharfRoomItem[];
}

function formatLastSeen(ms: number): string {
  if (!ms) return 'Vừa mới đây';
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa online';
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  return `${days} ngày trước`;
}

interface FriendsTabProps {
  snap: GameSnapshot | null;
}

export function FriendsTab({ snap }: FriendsTabProps) {
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [activeSubTab, setActiveSubTab] = useState<'rooms' | 'friends'>('rooms');

  const benNet = snap?.benNet;
  const friendsStore = snap?.friends;

  const currentRoomId = benNet?.room ?? 1;
  const roomsData = benNet?.rooms as WharfRoomsData | null | undefined;
  const roomList: WharfRoomItem[] = Array.isArray(roomsData?.rooms) ? roomsData.rooms : [];
  const roomCapacity = roomsData?.size || 20;

  const friendCode = friendsStore?.code || null;
  const friendsList = friendsStore?.friends || [];
  const giftsLeft = friendsStore?.giftsLeft ?? 0;

  const handleCopyCode = () => {
    if (!friendCode) return;
    navigator.clipboard.writeText(friendCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1500);
  };

  const handleRefreshRooms = async () => {
    setIsRefreshing(true);
    await execGameAction('BEN_REFRESH', { kind: 'rooms' });
    setTimeout(() => setIsRefreshing(false), 800);
  };

  const handleSwitchRoom = async (roomId: number) => {
    await execGameAction('BEN_SWITCH_ROOM', { id: roomId });
  };

  const handleOpenGameFriends = async () => {
    await execGameAction('SET_PANEL', { panel: 'friends' });
  };

  return (
    <div className="flex flex-col gap-3 p-3 pr-4 overflow-y-auto min-h-0 select-none">
      {/* Header Banner */}
      <div className="rounded-xl border border-teal-200 bg-gradient-to-r from-teal-50 via-cyan-50 to-sky-50 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white shadow-xs">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">Bạn bè & Bến đò</span>
                <Badge className="bg-teal-600 text-white text-[10px] px-1.5 py-0 font-medium">
                  Trực Tuyến
                </Badge>
              </div>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Xem các bến đò đang mở, chuyển bến linh hoạt & quản lý danh bạ bạn bè.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            {activeSubTab === 'rooms' ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshRooms}
                disabled={isRefreshing}
                className="h-7 px-2 text-xs text-slate-700 bg-white hover:bg-slate-50 rounded-lg gap-1 cursor-pointer"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span className="text-[11px]">Tải lại bến</span>
              </Button>
            ) : (
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={handleOpenGameFriends}
                className="h-7 px-2.5 text-xs bg-teal-600 hover:bg-teal-700 text-white rounded-lg gap-1 cursor-pointer font-medium shadow-xs"
              >
                <span>Mở danh bạ</span>
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Friend Code Bar */}
        {friendCode && (
          <div className="mt-2.5 flex items-center justify-between bg-white/80 rounded-lg px-2.5 py-1.5 border border-teal-200/70 text-xs">
            <span className="text-slate-700 flex items-center gap-1.5 font-medium">
              <span>Mã kết bạn của bạn:</span>
              <b className="font-mono text-teal-900 bg-teal-100/60 px-1.5 py-0.5 rounded tracking-wider">
                {friendCode}
              </b>
            </span>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopyCode}
              className="h-6 px-2 text-xs text-teal-800 hover:bg-teal-50 gap-1 cursor-pointer"
            >
              {copiedCode ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
              <span className="text-[11px]">{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
            </Button>
          </div>
        )}
      </div>

      {/* Sub-Tabs Selector */}
      <div className="flex items-center gap-1.5 bg-slate-200/80 p-0.5 rounded-lg text-xs font-medium w-fit">
        <button
          type="button"
          onClick={() => setActiveSubTab('rooms')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md cursor-pointer transition-all ${
            activeSubTab === 'rooms'
              ? 'bg-white text-teal-900 font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Ship className="h-3.5 w-3.5 text-teal-600" />
          <span>Các Bến Đang Mở ({roomList.length || 1})</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('friends')}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md cursor-pointer transition-all ${
            activeSubTab === 'friends'
              ? 'bg-white text-teal-900 font-bold shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="h-3.5 w-3.5 text-teal-600" />
          <span>Bạn Bè ({friendsList.length}/30)</span>
        </button>
      </div>

      {/* Sub-tab 1: Rooms list */}
      {activeSubTab === 'rooms' && (
        <div className="flex flex-col gap-2">
          {roomList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
              <p>Đang tải danh sách các bến đò đang mở...</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRefreshRooms}
                className="mt-2 text-xs"
              >
                Cập nhật danh sách bến 🔄
              </Button>
            </div>
          ) : (
            roomList.map((room) => {
              const isHere = room.id === currentRoomId;
              const isFull = room.players >= roomCapacity;
              const percent = Math.min(100, (room.players / Math.max(1, roomCapacity)) * 100);

              return (
                <div
                  key={room.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                    isHere
                      ? 'bg-emerald-50/80 border-emerald-300 shadow-2xs font-semibold'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-800 text-sm font-bold font-mono">
                      #{room.id}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">Bến đò {room.id}</span>
                        {isHere && (
                          <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 font-medium">
                            Đang ở đây 📍
                          </Badge>
                        )}
                        {isFull && (
                          <Badge variant="destructive" className="text-[9px] px-1 py-0">
                            Đầy
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] text-slate-500 font-mono">
                          👥 {room.players}/{roomCapacity} người
                        </span>
                        <div className="w-24 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${isFull ? 'bg-rose-500' : 'bg-teal-500'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    {isHere ? (
                      <span className="text-xs font-bold text-emerald-700 font-mono pr-2">Hiện tại</span>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isFull}
                        onClick={() => handleSwitchRoom(room.id)}
                        className="h-7 px-2.5 text-xs text-teal-800 border-teal-300 hover:bg-teal-50 rounded-lg cursor-pointer font-medium"
                      >
                        Qua bến này ⛵
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Sub-tab 2: Friends list */}
      {activeSubTab === 'friends' && (
        <div className="flex flex-col gap-2">
          {/* Gifts Left Banner */}
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-900 shadow-2xs">
            <span className="flex items-center gap-1.5 font-medium">
              <Gift className="h-4 w-4 text-amber-600" />
              <span>Hôm nay còn tặng quà được:</span>
              <b className="font-mono text-amber-950 font-bold">{giftsLeft} lần</b>
            </span>
            <span className="text-[11px] text-amber-700">Mỗi ngày tối đa 3 lần</span>
          </div>

          {friendsList.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-6 text-center text-xs text-slate-500">
              <p>Chưa có bạn bè nào trong danh bạ hoặc chưa đồng bộ.</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleOpenGameFriends}
                className="mt-2 text-xs"
              >
                Mở bảng kết bạn trong game 👥
              </Button>
            </div>
          ) : (
            friendsList.map((friend) => (
              <div
                key={friend.code}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-2xs"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-50 text-teal-700 text-sm font-bold">
                    🌾
                  </span>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-900">{friend.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">#{friend.code}</span>
                      {friend.helped && (
                        <Badge className="bg-emerald-100 text-emerald-800 text-[9px] px-1 py-0">
                          ✅ Đã giúp
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                      <span>Nông trại Ngày #{friend.day}</span>
                      <span>·</span>
                      <span>{formatLastSeen(friend.lastSeen)}</span>
                      {friend.ask?.crop && (
                        <>
                          <span>·</span>
                          <span className="text-amber-700 font-medium">
                            Cần {friend.ask.crop}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleOpenGameFriends}
                  className="h-7 px-2 text-xs text-teal-700 hover:bg-teal-50 rounded-lg cursor-pointer"
                >
                  <span>Ghé thăm</span>
                </Button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
