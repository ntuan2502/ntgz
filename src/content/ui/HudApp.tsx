import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { GameSnapshot } from '@/shared/types/game-state';
import { HudHeader } from './components/HudHeader';
import { HudStats } from './components/HudStats';
import { HudControls } from './components/HudControls';
import { FarmTabContent } from './components/FarmTabContent';
import { WharfTabContent } from './components/WharfTabContent';
import { SeaTabContent } from './components/SeaTabContent';
import { CityTabContent } from './components/CityTabContent';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { checkForUpdates } from '@/services/github-service';
import { UpdateCheckResult } from '@/shared/types/github';
import { Sparkles, Download, CheckCircle2 } from 'lucide-react';

interface HudAppProps {
  shadowRoot: ShadowRoot;
  initialConfig: AppConfig;
  onSaveConfig: (cfg: AppConfig) => void;
  onToggleAll: () => void;
  onToggleTab: () => void;
}

export function HudApp({
  shadowRoot,
  initialConfig,
  onSaveConfig,
  onToggleAll,
  onToggleTab,
}: HudAppProps) {
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [snap, setSnap] = useState<GameSnapshot | null>(null);
  const [lastAction, setLastAction] = useState<string>('Đang chờ lệnh...');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('1.0.0');

  // Dialog states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState<boolean>(false);

  // Position & Dragging
  const [position, setPosition] = useState<{ x: number; y: number }>(() => ({
    x: Math.max(10, window.innerWidth - 370),
    y: 70,
  }));
  const isDraggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  // Get manifest version
  useEffect(() => {
    try {
      const v = chrome.runtime.getManifest().version;
      if (v) setVersion(v);
    } catch {
      // Ignore
    }
  }, []);

  // Expose global bridge update listeners
  useEffect(() => {
    const handleSnapUpdate = (e: CustomEvent<GameSnapshot>) => {
      setSnap(e.detail);
    };
    const handleActionUpdate = (e: CustomEvent<string>) => {
      setLastAction(e.detail);
    };
    const handleConfigExternalUpdate = (e: CustomEvent<AppConfig>) => {
      setConfig(e.detail);
    };

    window.addEventListener('__NTG_SNAP_UPDATE__' as unknown as keyof WindowEventMap, handleSnapUpdate as EventListener);
    window.addEventListener('__NTG_ACTION_UPDATE__' as unknown as keyof WindowEventMap, handleActionUpdate as EventListener);
    window.addEventListener('__NTG_CONFIG_UPDATE__' as unknown as keyof WindowEventMap, handleConfigExternalUpdate as EventListener);

    return () => {
      window.removeEventListener('__NTG_SNAP_UPDATE__' as unknown as keyof WindowEventMap, handleSnapUpdate as EventListener);
      window.removeEventListener('__NTG_ACTION_UPDATE__' as unknown as keyof WindowEventMap, handleActionUpdate as EventListener);
      window.removeEventListener('__NTG_CONFIG_UPDATE__' as unknown as keyof WindowEventMap, handleConfigExternalUpdate as EventListener);
    };
  }, []);

  const handleUpdateConfig = useCallback(
    (updater: (prev: AppConfig) => AppConfig) => {
      setConfig((prev) => {
        const next = updater(prev);
        onSaveConfig(next);
        return next;
      });
    },
    [onSaveConfig]
  );

  // Dragging handlers
  const handleMouseDownDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    isDraggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const newX = Math.min(
        Math.max(10, moveEvent.clientX - dragOffsetRef.current.x),
        window.innerWidth - 350
      );
      const newY = Math.min(
        Math.max(10, moveEvent.clientY - dragOffsetRef.current.y),
        window.innerHeight - 50
      );
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setIsUpdateModalOpen(true);
    } catch {
      // Ignore
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  const handleHide = () => {
    handleUpdateConfig((prev) => ({ ...prev, panelVisible: false }));
  };

  const handleTabChange = (val: string) => {
    handleUpdateConfig((prev) => ({ ...prev, activeTab: val as AreaId }));
  };

  if (!config.panelVisible) {
    return null;
  }

  return (
    <div
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
        pointerEvents: 'auto',
      }}
      className="fixed left-0 top-0 z-[2147483647] w-[350px] overflow-hidden rounded-xl border border-slate-800 bg-slate-950/95 shadow-2xl backdrop-blur-md text-slate-100 font-sans select-none"
    >
      {/* Header */}
      <HudHeader
        version={version}
        config={config}
        activeTab={config.activeTab}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
        onHide={handleHide}
        onToggleAll={onToggleAll}
        onToggleTab={onToggleTab}
        onCheckUpdate={handleCheckUpdate}
        isCheckingUpdate={isCheckingUpdate}
        onMouseDownDrag={handleMouseDownDrag}
      />

      {/* Body content when not minimized */}
      {!isMinimized && (
        <div className="flex flex-col">
          {/* Live Stats Bar */}
          <HudStats snap={snap} />

          {/* Master Auto Controls & Sliders */}
          <HudControls
            config={config}
            activeTab={config.activeTab}
            onUpdateConfig={handleUpdateConfig}
            onToggleAll={onToggleAll}
            onToggleTab={onToggleTab}
            isOrderDrawerOpen={isOrderDrawerOpen}
            onToggleOrderDrawer={() => setIsOrderDrawerOpen(!isOrderDrawerOpen)}
          />

          {/* Current Action Status Text */}
          <div className="flex items-center gap-2 border-b border-slate-800/80 bg-slate-950 px-2.5 py-1 text-[11px] font-mono text-emerald-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="truncate">{lastAction}</span>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={config.activeTab} onValueChange={handleTabChange} className="w-full p-2">
            <TabsList className="grid w-full grid-cols-4 h-7 text-[11px]">
              <TabsTrigger value="farm" className="px-1 py-0.5">🌾 Nông trại</TabsTrigger>
              <TabsTrigger value="benDo" className="px-1 py-0.5">🛶 Bến đò</TabsTrigger>
              <TabsTrigger value="sea" className="px-1 py-0.5">🏖️ Biển</TabsTrigger>
              <TabsTrigger value="city" className="px-1 py-0.5">🏙️ Phố xá</TabsTrigger>
            </TabsList>

            <div className="mt-2 max-h-[360px] overflow-y-auto pr-1">
              <TabsContent value="farm" className="m-0">
                <FarmTabContent config={config} onUpdateConfig={handleUpdateConfig} />
              </TabsContent>

              <TabsContent value="benDo" className="m-0">
                <WharfTabContent config={config} onUpdateConfig={handleUpdateConfig} />
              </TabsContent>

              <TabsContent value="sea" className="m-0">
                <SeaTabContent config={config} onUpdateConfig={handleUpdateConfig} />
              </TabsContent>

              <TabsContent value="city" className="m-0">
                <CityTabContent config={config} onUpdateConfig={handleUpdateConfig} />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      )}

      {/* GitHub Update Dialog (Scoped inside shadowRoot) */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent
          portalContainer={shadowRoot as unknown as HTMLElement}
          className="max-w-[320px] bg-slate-900 border-slate-800 text-slate-100 p-4"
        >
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
                  {updateInfo?.hasUpdate ? 'Đã Có Phiên Bản Mới!' : 'Bản Đang Dùng Mới Nhất'}
                </DialogTitle>
                <DialogDescription className="text-[11px] text-slate-400">
                  {updateInfo?.hasUpdate
                    ? `v${updateInfo?.currentVersion} ➔ v${updateInfo?.latestVersion}`
                    : `Phiên bản hiện tại v${updateInfo?.currentVersion}`}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="my-2 max-h-[160px] overflow-y-auto rounded-md bg-slate-950 p-2 text-xs text-slate-300 border border-slate-800 space-y-1 font-sans">
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
