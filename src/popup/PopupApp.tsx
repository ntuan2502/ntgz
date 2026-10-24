import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ReleaseChangelogView } from '@/components/ReleaseChangelogView';
import { checkForUpdates } from '../services/github-service';
import { UpdateCheckResult } from '../shared/types/github';
import { Play, Square, ExternalLink, RefreshCw, Eye, Sparkles, ArrowLeft, Sun, Moon } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'main' | 'changelog'>('main');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    try {
      const manifestVer = chrome.runtime.getManifest().version;
      if (manifestVer) setVersion(manifestVer);
    } catch {
      // Fallback
    }

    try {
      const savedTheme = localStorage.getItem('ntg_theme');
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme);
      }
    } catch {
      // Fallback
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      localStorage.setItem('ntg_theme', next);
    } catch {
      // Fallback
    }
  };

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
      setViewMode('changelog');
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
    <div
      className={`w-[360px] p-2.5 font-sans select-none transition-colors ${
        theme === 'dark' ? 'dark bg-slate-950 text-slate-100' : 'light bg-slate-50 text-slate-900'
      }`}
    >
      <Card className="border border-slate-700/60 dark:border-slate-800/80 light:border-slate-200 bg-slate-900/95 dark:bg-slate-900/95 light:bg-white shadow-2xl rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* macOS Title Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-950/80 dark:bg-slate-950/80 light:bg-slate-100/90 border-b border-slate-800/80 dark:border-slate-800/80 light:border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.close()}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-red-500 hover:bg-red-600 transition-colors shadow-xs"
              title="Đóng popup"
            />
            <button
              type="button"
              onClick={() => setViewMode(viewMode === 'changelog' ? 'main' : 'changelog')}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-500 hover:bg-amber-600 transition-colors shadow-xs"
              title="Chuyển chế độ xem"
            />
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 hover:bg-emerald-600 transition-colors shadow-xs"
              title="Đổi giao diện Sáng / Tối"
            />
          </div>

          <div className="flex items-center gap-1 text-xs font-bold">
            <span className="text-emerald-400">🌾 NTG Auto</span>
            <span className="text-slate-400 font-normal">by Tún</span>
          </div>

          <Button
            variant="ghost"
            size="icon-xs"
            className="h-6 w-6 text-slate-400 hover:text-amber-400 rounded-md"
            onClick={toggleTheme}
            title={`Đổi sang chế độ ${theme === 'dark' ? 'Sáng' : 'Tối'}`}
          >
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-400" /> : <Moon className="h-3.5 w-3.5 text-indigo-500" />}
          </Button>
        </div>

        {/* View Mode: Changelog View */}
        {viewMode === 'changelog' && updateInfo ? (
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-400 hover:text-slate-100 h-7 px-2"
                onClick={() => setViewMode('main')}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Quay lại
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono">
                v{version}
              </Badge>
            </div>

            <ReleaseChangelogView
              updateInfo={updateInfo}
              onClose={() => setViewMode('main')}
            />
          </div>
        ) : (
          /* View Mode: Main Dashboard */
          <>
            <CardHeader className="pb-3 pt-3 px-3.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="relative flex h-8.5 w-8.5 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm">
                    <Sparkles className="h-4.5 w-4.5" />
                    <span
                      className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-900 ${
                        isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
                      }`}
                    />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-100 light:text-slate-900 tracking-tight">
                      Bảng Điều Khiển Auto
                    </CardTitle>
                    <CardDescription className="text-[11px] text-slate-400 light:text-slate-500 font-mono">
                      Phiên bản v{version}
                    </CardDescription>
                  </div>
                </div>

                <Badge
                  variant={isRunning ? 'default' : 'secondary'}
                  className={`px-2 py-0.5 text-[10px] tracking-wider uppercase font-bold rounded-lg ${
                    isRunning ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : ''
                  }`}
                >
                  {isRunning ? 'ĐANG CHẠY' : 'ĐÃ DỪNG'}
                </Badge>
              </div>
            </CardHeader>

            <Separator className="bg-slate-800 dark:bg-slate-800 light:bg-slate-200" />

            <CardContent className="space-y-2.5 pt-3 pb-2 px-3.5">
              <Button
                variant="default"
                className="w-full justify-between h-9 text-xs font-bold rounded-xl shadow-md shadow-emerald-950/30 bg-emerald-600 hover:bg-emerald-500 text-white"
                onClick={handleOpenGame}
              >
                <span className="flex items-center gap-2">
                  <ExternalLink className="h-3.5 w-3.5" />
                  Vào Game Nông Trại GenZ
                </span>
                <span className="text-[10px] bg-black/20 rounded px-1.5 py-0.5 font-normal">Mở Tab</span>
              </Button>

              <Button
                variant={isRunning ? 'destructive' : 'default'}
                className="w-full justify-between h-9 text-xs font-bold rounded-xl shadow-md"
                onClick={handleToggleAuto}
              >
                <span className="flex items-center gap-2">
                  {isRunning ? <Square className="h-3.5 w-3.5 fill-current" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                  {isRunning ? 'DỪNG AUTO TOÀN BỘ' : 'BẬT AUTO TOÀN BỘ'}
                </span>
                <span className="text-[10px] bg-black/20 rounded px-1.5 py-0.5 font-mono">Alt + A</span>
              </Button>

              <div className="grid grid-cols-2 gap-2 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-700 light:border-slate-300 bg-slate-800/60 light:bg-slate-100 hover:bg-slate-800 text-slate-200 light:text-slate-800 text-xs rounded-xl"
                  onClick={handleTogglePanel}
                >
                  <Eye className="h-3.5 w-3.5 mr-1 text-slate-400" />
                  Ẩn/Hiện HUD
                </Button>

                <Button
                  variant="secondary"
                  size="sm"
                  disabled={isCheckingUpdate}
                  className="w-full bg-slate-800 light:bg-slate-200 text-slate-200 light:text-slate-800 hover:bg-slate-700 text-xs border border-slate-700/60 light:border-slate-300 rounded-xl"
                  onClick={handleCheckUpdate}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1 text-slate-400 ${isCheckingUpdate ? 'animate-spin text-emerald-400' : ''}`} />
                  Kiểm Tra Cập Nhật
                </Button>
              </div>
            </CardContent>

            <CardFooter className="pt-1 pb-3 px-3.5">
              <div
                className={`w-full rounded-xl px-2.5 py-2 text-[11px] leading-relaxed border transition-colors ${
                  isError
                    ? 'border-red-900/50 bg-red-950/30 text-red-300'
                    : 'border-slate-800/80 light:border-slate-200 bg-slate-950/40 light:bg-slate-100/60 text-slate-400 light:text-slate-600'
                }`}
              >
                {statusMsg}
              </div>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
