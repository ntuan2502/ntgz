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
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { ReleaseChangelogView } from '@/components/ReleaseChangelogView';
import { checkForUpdates } from '@/services/github-service';
import { UpdateCheckResult } from '@/shared/types/github';

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
    x: Math.max(10, window.innerWidth - 400),
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
        window.innerWidth - 390
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
      className="fixed left-0 top-0 z-[2147483647] w-[385px] overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl bg-white/98 text-slate-800 backdrop-blur-xl font-sans select-none ring-1 ring-black/5"
    >
      {/* macOS Styled Header with Traffic Light Buttons */}
      <HudHeader
        version={version}
        isMinimized={isMinimized}
        onToggleMinimize={() => setIsMinimized(!isMinimized)}
        onHide={handleHide}
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
          <div className="flex items-center gap-2 border-b border-slate-200/90 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-mono text-emerald-800">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <span className="truncate">{lastAction}</span>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={config.activeTab} onValueChange={handleTabChange} className="w-full p-2.5">
            <TabsList className="grid w-full grid-cols-4 h-8 text-[11px] rounded-xl p-1 bg-slate-100 border border-slate-200/80 text-slate-600">
              <TabsTrigger
                value="farm"
                className="px-1 py-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs font-medium"
              >
                🌾 Nông trại
              </TabsTrigger>
              <TabsTrigger
                value="benDo"
                className="px-1 py-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs font-medium"
              >
                🛶 Bến đò
              </TabsTrigger>
              <TabsTrigger
                value="sea"
                className="px-1 py-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs font-medium"
              >
                🏖️ Biển
              </TabsTrigger>
              <TabsTrigger
                value="city"
                className="px-1 py-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs font-medium"
              >
                🏙️ Phố xá
              </TabsTrigger>
            </TabsList>

            <div className="mt-2.5 max-h-[380px] overflow-y-auto pr-1">
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

      {/* GitHub Update Dialog (Scoped inside shadowRoot with ReleaseChangelogView) */}
      <Dialog open={isUpdateModalOpen} onOpenChange={setIsUpdateModalOpen}>
        <DialogContent
          container={shadowRoot as unknown as HTMLElement}
          className="max-w-[360px] bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl shadow-2xl"
        >
          {updateInfo && (
            <ReleaseChangelogView
              updateInfo={updateInfo}
              onClose={() => setIsUpdateModalOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
