import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { checkForUpdates } from '../services/github-service';
import { UpdateCheckResult } from '../shared/types/github';
import { Play, Square, ExternalLink, RefreshCw, Eye, Sparkles, Download, CheckCircle2 } from 'lucide-react';

const GAME_URL = 'https://nongtraigenz.online/play/';

interface StatusResponse {
  ok?: boolean;
  running?: boolean;
  isRunning?: boolean;
  config?: { running?: boolean };
  lastActionText?: string;
  currentState?: string;
  [key: string]: unknown;
}

export function PopupApp() {
  const [version, setVersion] = useState<string>('1.0.0');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>('Mọi tuỳ chỉnh chi tiết đều nằm trong Menu nổi ở góc phải màn hình game.');
  const [isError, setIsError] = useState<boolean>(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      const manifestVer = chrome.runtime.getManifest().version;
      if (manifestVer) setVersion(manifestVer);
    } catch {
      // Fallback
    }
  }, []);

  const findGameTab = useCallback(async (): Promise<chrome.tabs.Tab | undefined> => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((t) => t.url && t.url.includes('nongtraigenz.online'));
  }, []);

  const getActiveTab = useCallback(async (): Promise<chrome.tabs.Tab | undefined> => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }, []);

  const sendToGameTab = useCallback(
    async (message: Record<string, unknown>): Promise<StatusResponse | null> => {
      let tab = await getActiveTab();
      if (!tab || !tab.url || !tab.url.includes('nongtraigenz.online')) {
        tab = await findGameTab();
      }
      if (!tab || !tab.id) {
        setIsError(true);
        setStatusMsg('Chưa mở tab game. Hãy bấm "🚀 Vào Game Nông Trại GenZ"!');
        return null;
      }

      try {
        return (await chrome.tabs.sendMessage(tab.id, message)) as StatusResponse;
      } catch {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          });
          return (await chrome.tabs.sendMessage(tab.id, message)) as StatusResponse;
        } catch {
          setIsError(true);
          setStatusMsg('Không thể kết nối tab game. Hãy tải lại trang game.');
          return null;
        }
      }
    },
    [getActiveTab, findGameTab]
  );

  const syncStatus = useCallback(async () => {
    const res = await sendToGameTab({ action: 'GET_STATUS' });
    if (res) {
      setIsError(false);
      setIsRunning(Boolean(res.running ?? res.config?.running ?? res.isRunning));
    }
  }, [sendToGameTab]);

  useEffect(() => {
    syncStatus();
  }, [syncStatus]);

  const handleOpenGame = async () => {
    const existing = await findGameTab();
    if (existing && existing.id) {
      await chrome.tabs.update(existing.id, { active: true });
      if (existing.windowId) {
        await chrome.windows.update(existing.windowId, { focused: true });
      }
    } else {
      await chrome.tabs.create({ url: GAME_URL });
    }
  };

  const handleToggleAuto = async () => {
    const res = await sendToGameTab({ action: 'TOGGLE_AUTO' });
    if (res) {
      setIsError(false);
      const running = Boolean(res.running ?? res.config?.running ?? res.isRunning);
      setIsRunning(running);
      setStatusMsg(running ? '🟢 Auto đã được BẬT thành công!' : '🔴 Auto đã DỪNG.');
    }
  };

  const handleTogglePanel = async () => {
    const res = await sendToGameTab({ action: 'TOGGLE_PANEL' });
    if (res) {
      setIsError(false);
      setStatusMsg('🖥️ Đã đảo trạng thái ẩn/hiện bảng điều khiển.');
    }
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    setStatusMsg('Đang kiểm tra bản phát hành trên GitHub...');
    setIsError(false);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setIsUpdateModalOpen(true);
      if (info.hasUpdate) {
        setStatusMsg(`✨ Đã có bản cập nhật mới v${info.latestVersion}!`);
      } else {
        setStatusMsg(`✅ Bạn đang dùng phiên bản mới nhất (v${info.currentVersion}).`);
      }
    } catch {
      setIsError(true);
      setStatusMsg('Không thể kiểm tra cập nhật. Vui lòng thử lại sau.');
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  return (
    <div className="w-[360px] bg-slate-950 p-3 text-slate-100 font-sans selection:bg-emerald-500/30">
      <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-md">
        <CardHeader className="pb-3 pt-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Sparkles className="h-4 w-4" />
                <span
                  className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                    isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                  }`}
                />
              </div>
              <div>
                <CardTitle className="text-sm font-bold text-slate-100 tracking-wide flex items-center gap-1.5">
                  🌾 NTG Auto <span className="text-xs font-normal text-emerald-400">by Tún</span>
                </CardTitle>
                <CardDescription className="text-[11px] text-slate-400 font-mono">
                  Phiên bản v{version}
                </CardDescription>
              </div>
            </div>

            <Badge variant={isRunning ? 'success' : 'secondary'} className="px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold">
              {isRunning ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
            </Badge>
          </div>
        </CardHeader>

        <Separator className="bg-slate-800" />

        <CardContent className="space-y-2 pt-3 pb-2">
          <Button
            variant="emerald"
            className="w-full justify-between h-9 text-xs font-semibold shadow-md shadow-emerald-950/40"
            onClick={handleOpenGame}
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="h-3.5 w-3.5" />
              Vào Game Nông Trại GenZ
            </span>
            <span className="text-[10px] bg-emerald-700/60 rounded px-1.5 py-0.5 font-normal">Mở Tab</span>
          </Button>

          <Button
            variant={isRunning ? 'destructive' : 'default'}
            className="w-full justify-between h-9 text-xs font-semibold shadow-md"
            onClick={handleToggleAuto}
          >
            <span className="flex items-center gap-2">
              {isRunning ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {isRunning ? 'DỪNG AUTO' : 'BẬT AUTO'}
            </span>
            <span className="text-[10px] bg-black/20 rounded px-1.5 py-0.5 font-mono">Alt + A</span>
          </Button>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-slate-700/80 bg-slate-800/60 hover:bg-slate-800 text-slate-200 text-xs"
              onClick={handleTogglePanel}
            >
              <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
              Ẩn/Hiện HUD
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={isCheckingUpdate}
              className="w-full bg-slate-800 text-slate-200 hover:bg-slate-700 text-xs border border-slate-700/50"
              onClick={handleCheckUpdate}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1 text-slate-400 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
              Kiểm Tra Cập Nhật
            </Button>
          </div>
        </CardContent>

        <CardFooter className="pt-1 pb-3 px-3">
          <div
            className={`w-full rounded-md px-2.5 py-1.5 text-[11px] leading-relaxed border transition-colors ${
              isError
                ? 'border-red-900/50 bg-red-950/30 text-red-300'
                : 'border-slate-800 bg-slate-950/40 text-slate-400'
            }`}
          >
            {statusMsg}
          </div>
        </CardFooter>
      </Card>

      {/* GitHub Update Dialog */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent className="max-w-[340px] bg-slate-900 border-slate-800 text-slate-100 p-4">
          <DialogHeader>
            <div className="flex items-center gap-2">
              {updateInfo?.hasUpdate ? (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <Sparkles className="h-4 w-4" />
                </div>
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              )}
              <div>
                <DialogTitle className="text-sm font-bold">
                  {updateInfo?.hasUpdate ? 'Đã Có Phiên Bản Mới!' : 'Bạn Đang Dùng Bản Mới Nhất'}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400">
                  {updateInfo?.hasUpdate
                    ? `Bản hiện tại: v${updateInfo?.currentVersion} ➔ Mới nhất: v${updateInfo?.latestVersion}`
                    : `Phiên bản hiện tại v${updateInfo?.currentVersion}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2 max-h-[180px] overflow-y-auto rounded-md bg-slate-950 p-2.5 text-xs text-slate-300 border border-slate-800 space-y-1 font-sans">
            <div className="font-semibold text-emerald-400 text-[11px] mb-1">
              {updateInfo?.releaseName || `Release v${updateInfo?.latestVersion}`}
            </div>
            <div className="whitespace-pre-wrap leading-relaxed text-[11px] text-slate-300">
              {updateInfo?.releaseNotes || 'Không có nhật ký cập nhật.'}
            </div>
          </div>

          <DialogFooter className="flex justify-between sm:justify-between items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-xs"
              onClick={() => setIsUpdateModalOpen(false)}
            >
              Đóng
            </Button>
            {updateInfo?.hasUpdate && updateInfo?.downloadUrl && (
              <Button
                variant="emerald"
                size="sm"
                className="text-xs"
                onClick={() => {
                  if (updateInfo.downloadUrl) {
                    window.open(updateInfo.downloadUrl, '_blank');
                  }
                }}
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Tải Bản Mới
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
