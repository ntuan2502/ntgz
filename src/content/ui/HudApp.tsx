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
import { ReleaseChangelogView } from '@/components/ReleaseChangelogView';
import { checkForUpdates } from '@/services/github-service';
import { UpdateCheckResult } from '@/shared/types/github';

interface HudAppProps {
  shadowRoot?: ShadowRoot;
  initialConfig: AppConfig;
  onSaveConfig: (cfg: AppConfig) => void;
  onToggleAll: () => void;
  onToggleTab: () => void;
}

export function HudApp({
  shadowRoot: _shadowRoot,
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

  // Position, Size & Dragging/Resizing
  const MIN_WIDTH = 340;
  const MIN_HEIGHT = 360;
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: initialConfig.hudWidth || 400,
    height: initialConfig.hudHeight || 800,
  }));
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    const initW = initialConfig.hudWidth || 400;
    const initH = initialConfig.hudHeight || 800;
    return {
      x: Math.max(10, window.innerWidth - initW - 20),
      y: Math.max(10, Math.min(40, window.innerHeight - initH - 10)),
    };
  });
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
      if (typeof e.detail?.hudWidth === 'number' && typeof e.detail?.hudHeight === 'number') {
        setSize({
          width: Math.max(MIN_WIDTH, e.detail.hudWidth),
          height: Math.max(MIN_HEIGHT, e.detail.hudHeight),
        });
      }
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
        Math.max(10, window.innerWidth - size.width - 10)
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

  // Resizing handlers (edges & corners)
  const handleMouseDownResize = (
    direction: 'e' | 's' | 'w' | 'se' | 'sw',
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    e.preventDefault();
    e.stopPropagation();

    const startX = e.clientX;
    const startY = e.clientY;
    const startW = size.width;
    const startH = size.height;
    const startPosX = position.x;
    const startPosY = position.y;
    let latestW = startW;
    let latestH = startH;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      let nextW = startW;
      let nextH = startH;
      let nextX = startPosX;

      if (direction.includes('e')) {
        const maxW = Math.max(MIN_WIDTH, window.innerWidth - startPosX - 10);
        nextW = Math.min(maxW, Math.max(MIN_WIDTH, startW + dx));
      }
      if (direction.includes('w')) {
        const maxLeftDelta = startW - MIN_WIDTH;
        const clampedDx = Math.max(-startPosX + 10, Math.min(maxLeftDelta, dx));
        nextW = startW - clampedDx;
        nextX = startPosX + clampedDx;
      }
      if (direction.includes('s')) {
        const maxH = Math.max(MIN_HEIGHT, window.innerHeight - startPosY - 10);
        nextH = Math.min(maxH, Math.max(MIN_HEIGHT, startH + dy));
      }

      latestW = Math.round(nextW);
      latestH = Math.round(nextH);
      setSize({ width: latestW, height: latestH });
      if (direction.includes('w')) {
        setPosition({ x: Math.round(nextX), y: startPosY });
      }
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      handleUpdateConfig((prev) => ({
        ...prev,
        hudWidth: latestW,
        hudHeight: latestH,
      }));
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleResetSize = () => {
    const defaultW = 400;
    const defaultH = 800;
    setSize({ width: defaultW, height: defaultH });
    handleUpdateConfig((prev) => ({
      ...prev,
      hudWidth: defaultW,
      hudHeight: defaultH,
    }));
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
        width: `${size.width}px`,
        height: isMinimized ? 'auto' : `${Math.min(size.height, window.innerHeight - 20)}px`,
        pointerEvents: 'auto',
      }}
      className="fixed left-0 top-0 z-[2147483647] flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl bg-white/98 text-slate-800 backdrop-blur-xl font-sans select-none ring-1 ring-black/5"
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
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
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
          <div className="flex items-center gap-2 border-b border-slate-200/90 bg-emerald-50/80 px-3 py-1.5 text-[11px] font-mono text-emerald-800 shrink-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
            </span>
            <span className="truncate">{lastAction}</span>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={config.activeTab} onValueChange={handleTabChange} className="w-full flex-1 flex flex-col min-h-0 p-2.5 overflow-hidden">
            <TabsList className="grid w-full grid-cols-4 h-8 text-[11px] rounded-xl p-1 bg-slate-100 border border-slate-200/80 text-slate-600 shrink-0">
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

            <div className="mt-2.5 flex-1 overflow-y-auto pr-1 min-h-0">
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

      {/* Resize Handles (Edges & Corners) */}
      {!isMinimized && (
        <>
          {/* Left edge */}
          <div
            onMouseDown={(e) => handleMouseDownResize('w', e)}
            style={{ position: 'absolute', top: 36, bottom: 14, left: 0, width: 6, cursor: 'ew-resize', zIndex: 40 }}
          />
          {/* Right edge */}
          <div
            onMouseDown={(e) => handleMouseDownResize('e', e)}
            style={{ position: 'absolute', top: 36, bottom: 14, right: 0, width: 6, cursor: 'ew-resize', zIndex: 40 }}
          />
          {/* Bottom edge */}
          <div
            onMouseDown={(e) => handleMouseDownResize('s', e)}
            style={{ position: 'absolute', left: 14, right: 14, bottom: 0, height: 6, cursor: 'ns-resize', zIndex: 40 }}
          />
          {/* Bottom-left corner */}
          <div
            onMouseDown={(e) => handleMouseDownResize('sw', e)}
            style={{ position: 'absolute', left: 0, bottom: 0, width: 14, height: 14, cursor: 'nesw-resize', zIndex: 41 }}
          />
          {/* Bottom-right corner with visual grip */}
          <div
            title="Kéo để thay đổi kích thước (Nhấp đúp để về mặc định 400×800)"
            onMouseDown={(e) => handleMouseDownResize('se', e)}
            onDoubleClick={handleResetSize}
            style={{ position: 'absolute', right: 0, bottom: 0, width: 16, height: 16, cursor: 'nwse-resize', zIndex: 41 }}
            className="flex items-end justify-end pr-1 pb-1 text-slate-400 hover:text-emerald-600 transition-colors"
          >
            <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M9 3L3 9M9 7L7 9" />
            </svg>
          </div>
        </>
      )}

      {/* GitHub Update Modal (Scoped inside shadowRoot with ReleaseChangelogView) */}
      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 pointer-events-auto">
          <div className="relative w-full max-w-[360px] bg-white border border-slate-200 text-slate-900 p-4 rounded-2xl shadow-2xl animate-in fade-in-0 zoom-in-95 duration-150">
            {updateInfo && (
              <ReleaseChangelogView
                updateInfo={updateInfo}
                onClose={() => setIsUpdateModalOpen(false)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
