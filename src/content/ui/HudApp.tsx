import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppConfig, AreaId } from '@/shared/types/config';
import { GameSnapshot } from '@/shared/types/game-state';
import { HudHeader } from './components/HudHeader';
import { HudStats } from './components/HudStats';
import { HudControls } from './components/HudControls';
import { HudStatusBar } from './components/HudStatusBar';
import { HudTerminalWindow } from './components/HudTerminalWindow';
import { FarmTabContent } from './components/FarmTabContent';
import { WharfTabContent } from './components/WharfTabContent';
import { SeaTabContent } from './components/SeaTabContent';
import { FarmstayTabContent } from './components/FarmstayTabContent';
import { HudLogEntry, getSessionLogs, clearSessionLogs } from './hud-core';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft } from 'lucide-react';
import { ReleaseChangelogView } from '@/components/ReleaseChangelogView';
import { HudMonitorWindow } from './components/HudMonitorWindow';
import { MonitorTabId } from './components/monitor/MonitorHub';
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
  const [logs, setLogs] = useState<HudLogEntry[]>(() => getSessionLogs());
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isOrderDrawerOpen, setIsOrderDrawerOpen] = useState<boolean>(false);
  const [version, setVersion] = useState<string>('1.0.0');

  // Terminal Window State
  const [terminalWidth, setTerminalWidth] = useState<number>(() => initialConfig.terminalWidth || 380);
  const [isTerminalOpen, setIsTerminalOpen] = useState<boolean>(() => Boolean(initialConfig.isTerminalOpen));

  // Monitor Window State (Side window opening horizontally)
  const [monitorWidth, setMonitorWidth] = useState<number>(420);
  const [isMonitorOpen, setIsMonitorOpen] = useState<boolean>(false);
  const [monitorTab, setMonitorTab] = useState<MonitorTabId>('inventory');

  const handleOpenMonitorTab = (tab: MonitorTabId) => {
    setMonitorTab(tab);
    setIsMonitorOpen(true);
  };

  // Dialog & View states
  const [isCheckingUpdate, setIsCheckingUpdate] = useState<boolean>(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [viewMode, setViewMode] = useState<'main' | 'changelog'>('main');

  // Position, Size & Dragging/Resizing
  const MIN_WIDTH = 340;
  const MIN_HEIGHT = 360;
  const [size, setSize] = useState<{ width: number; height: number }>(() => ({
    width: initialConfig.hudWidth || 400,
    height: initialConfig.hudHeight || 800,
  }));
  // Default position: appear from the left
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    return {
      x: 16,
      y: 16,
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

  // Close changelog view or monitor window on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMonitorOpen) {
          setIsMonitorOpen(false);
        } else if (viewMode === 'changelog') {
          setViewMode('main');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMonitorOpen, viewMode]);

  // Expose global bridge update listeners
  useEffect(() => {
    const handleSnapUpdate = (e: CustomEvent<GameSnapshot>) => {
      setSnap(e.detail);
    };
    const handleActionUpdate = (e: CustomEvent<string>) => {
      setLastAction(e.detail);
    };
    const handleLogsUpdate = (e: CustomEvent<HudLogEntry[]>) => {
      setLogs(e.detail);
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
    window.addEventListener('__NTG_LOGS_UPDATE__' as unknown as keyof WindowEventMap, handleLogsUpdate as EventListener);
    window.addEventListener('__NTG_CONFIG_UPDATE__' as unknown as keyof WindowEventMap, handleConfigExternalUpdate as EventListener);

    return () => {
      window.removeEventListener('__NTG_SNAP_UPDATE__' as unknown as keyof WindowEventMap, handleSnapUpdate as EventListener);
      window.removeEventListener('__NTG_ACTION_UPDATE__' as unknown as keyof WindowEventMap, handleActionUpdate as EventListener);
      window.removeEventListener('__NTG_LOGS_UPDATE__' as unknown as keyof WindowEventMap, handleLogsUpdate as EventListener);
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
      const minX = 10;
      const maxX = Math.max(minX, window.innerWidth - size.width - 10);
      const minY = 10;
      const maxY = Math.max(minY, window.innerHeight - size.height - 10);

      const newX = Math.min(
        Math.max(minX, moveEvent.clientX - dragOffsetRef.current.x),
        maxX
      );
      const newY = Math.min(
        Math.max(minY, moveEvent.clientY - dragOffsetRef.current.y),
        maxY
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

  const handleUpdateTerminalWidth = (w: number) => {
    setTerminalWidth(w);
    handleUpdateConfig((prev) => ({ ...prev, terminalWidth: w }));
  };

  const handleUpdateSharedHeight = (h: number) => {
    setSize((prev) => ({ ...prev, height: h }));
    handleUpdateConfig((prev) => ({ ...prev, hudHeight: h }));
  };

  const handleToggleTerminal = () => {
    setIsTerminalOpen((prev) => {
      const next = !prev;
      handleUpdateConfig((c) => ({ ...c, isTerminalOpen: next }));
      return next;
    });
  };

  const handleUpdateMonitorWidth = (w: number) => {
    setMonitorWidth(w);
  };

  const handleToggleMonitor = () => {
    setIsMonitorOpen((prev) => !prev);
  };

  // Clamp HUD inside viewport bounds on browser window resize
  useEffect(() => {
    const handleWindowResize = () => {
      setPosition((prev) => {
        const maxX = Math.max(10, window.innerWidth - size.width - 10);
        const maxY = Math.max(10, window.innerHeight - size.height - 10);
        return {
          x: Math.min(Math.max(10, prev.x), maxX),
          y: Math.min(Math.max(10, prev.y), maxY),
        };
      });
    };
    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [size.width, size.height]);

  const handleCheckUpdate = async () => {
    setIsCheckingUpdate(true);
    try {
      const info = await checkForUpdates();
      setUpdateInfo(info);
      setViewMode('changelog');
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
    <>
      <div
        style={{
          transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
          width: `${size.width}px`,
          height: isMinimized ? 'auto' : `${Math.min(size.height, Math.max(MIN_HEIGHT, window.innerHeight - position.y - 10))}px`,
          pointerEvents: 'auto',
        }}
        className="fixed left-0 top-0 z-[2147483600] flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 shadow-2xl bg-white/98 text-slate-800 backdrop-blur-xl font-sans select-none ring-1 ring-black/5"
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
        onToggleMonitor={handleToggleMonitor}
        isMonitorActive={isMonitorOpen}
      />

      {/* Body content when not minimized */}
      {!isMinimized && (
        viewMode === 'changelog' && updateInfo ? (
          <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-white">
            {/* Edge-to-edge Changelog Header Bar with Back button */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border-b border-slate-200 shrink-0 select-none">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 h-7 px-2 -ml-1 cursor-pointer"
                onClick={() => setViewMode('main')}
              >
                <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                Quay lại bảng điều khiển
              </Button>
              <Badge variant="outline" className="text-[10px] font-mono text-slate-500 bg-white">
                v{version}
              </Badge>
            </div>

            {/* Scrollable Changelog View - reused cleanly matching Popup */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ReleaseChangelogView
                updateInfo={updateInfo}
                showHeader={false}
                onClose={() => setViewMode('main')}
              />
            </div>
          </div>
        ) : (
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

            {/* Current Action Status Bar (Terminal toggles separate window) */}
            <HudStatusBar
              lastAction={lastAction}
              logsCount={logs.length}
              isTerminalOpen={isTerminalOpen}
              onToggleTerminal={handleToggleTerminal}
            />

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
                  value="farmstay"
                  className="px-1 py-1 rounded-lg data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-xs font-medium"
                >
                  🏡 Farmstay
                </TabsTrigger>
              </TabsList>

              <div className="mt-2.5 flex-1 overflow-y-auto overflow-x-hidden pr-1 min-h-0">
                <TabsContent value="farm" className="m-0">
                  <FarmTabContent config={config} onUpdateConfig={handleUpdateConfig} />
                </TabsContent>

                <TabsContent value="benDo" className="m-0">
                  <WharfTabContent
                    config={config}
                    onUpdateConfig={handleUpdateConfig}
                    onOpenMonitorTab={handleOpenMonitorTab}
                  />
                </TabsContent>

                <TabsContent value="sea" className="m-0">
                  <SeaTabContent config={config} onUpdateConfig={handleUpdateConfig} />
                </TabsContent>

                <TabsContent value="farmstay" className="m-0">
                  <FarmstayTabContent config={config} onUpdateConfig={handleUpdateConfig} />
                </TabsContent>
              </div>
            </Tabs>
          </div>
        )
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
    </div>

    {/* Standalone Detached Terminal Window */}
    <HudTerminalWindow
      isOpen={isTerminalOpen && !isMinimized}
      onClose={handleToggleTerminal}
      logs={logs}
      onClearLogs={clearSessionLogs}
      lastAction={lastAction}
      position={position}
      hudSize={size}
      terminalWidth={terminalWidth}
      onUpdateTerminalWidth={handleUpdateTerminalWidth}
      onUpdateSharedHeight={handleUpdateSharedHeight}
      onMouseDownDrag={handleMouseDownDrag}
      isHudMinimized={isMinimized}
    />

    {/* Standalone Detached Realtime Monitor Window */}
    <HudMonitorWindow
      isOpen={isMonitorOpen && !isMinimized}
      onClose={handleToggleMonitor}
      snap={snap}
      position={position}
      hudSize={size}
      monitorWidth={monitorWidth}
      onUpdateMonitorWidth={handleUpdateMonitorWidth}
      onUpdateSharedHeight={handleUpdateSharedHeight}
      onMouseDownDrag={handleMouseDownDrag}
      isHudMinimized={isMinimized}
      isTerminalOpen={isTerminalOpen}
      terminalWidth={terminalWidth}
      defaultTab={monitorTab}
    />
  </>
  );
}
