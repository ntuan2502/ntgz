export const HUD_STYLES = `
  * { box-sizing: border-box; font-family: 'Segoe UI', Tahoma, sans-serif; user-select: none; }
  .hud-panel {
    position: fixed;
    top: 12px;
    right: 12px;
    width: 356px;
    max-height: calc(100vh - 24px);
    display: flex;
    flex-direction: column;
    background: rgba(15, 23, 42, 0.96);
    backdrop-filter: blur(12px);
    color: #f8fafc;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    box-shadow: 0 14px 36px rgba(0, 0, 0, 0.6);
    pointer-events: auto;
    overflow: hidden;
    font-size: 12px;
    transition: opacity 0.2s;
  }
  .hud-panel.hidden { display: none !important; }
  .hud-panel.minimized .hud-body,
  .hud-panel.minimized .hud-tabs,
  .hud-panel.minimized .hud-top-controls,
  .hud-panel.minimized .hud-stats { display: none !important; }
  .hud-panel.minimized { width: 356px; }

  .hud-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 10px;
    background: linear-gradient(135deg, #16a34a, #15803d);
    cursor: move;
    font-weight: 700;
    font-size: 12px;
    gap: 6px;
  }
  .hud-title { display: flex; align-items: center; gap: 5px; white-space: nowrap; font-size: 12px; }
  .hud-header-btns {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }
  .hdr-auto-btn {
    border: none;
    border-radius: 6px;
    padding: 4px 7px;
    font-size: 10.5px;
    font-weight: 700;
    color: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 3px;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .hdr-auto-btn.all {
    background: rgba(22, 101, 52, 0.9);
    border: 1px solid rgba(74, 222, 128, 0.4);
  }
  .hdr-auto-btn.all:hover {
    background: #15803d;
  }
  .hdr-auto-btn.all.active {
    background: #dc2626;
    border-color: #f87171;
  }
  .hdr-auto-btn.tab {
    background: rgba(30, 64, 175, 0.9);
    border: 1px solid rgba(96, 165, 250, 0.4);
  }
  .hdr-auto-btn.tab:hover {
    background: #1d4ed8;
  }
  .hdr-auto-btn.tab.active {
    background: #dc2626;
    border-color: #f87171;
  }
  .hud-actions { display: flex; gap: 4px; }
  .icon-btn {
    background: rgba(255, 255, 255, 0.16);
    border: none;
    color: #fff;
    width: 22px;
    height: 22px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
  }
  .icon-btn:hover { background: rgba(255, 255, 255, 0.3); }

  /* Live Stats Bar */
  .hud-stats {
    padding: 6px 10px;
    background: rgba(30, 41, 59, 0.85);
    border-bottom: 1px solid rgba(148, 163, 184, 0.15);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .stats-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 11px;
    color: #cbd5e1;
  }
  .stats-pills {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .stat-pill {
    background: rgba(15, 23, 42, 0.75);
    padding: 2px 6px;
    border-radius: 5px;
    font-size: 10.5px;
    border: 1px solid rgba(148, 163, 184, 0.16);
  }
  .status-banner {
    font-size: 11px;
    color: #fde047;
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-top: 2px;
  }

  /* Top Dual Auto Buttons & Delay Config */
  .hud-top-controls {
    padding: 8px 10px;
    background: rgba(15, 23, 42, 0.92);
    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .dual-btn-row {
    display: flex;
    gap: 6px;
  }
  .btn-auto-all, .btn-auto-tab {
    flex: 1;
    padding: 8px 6px;
    border: none;
    border-radius: 8px;
    font-weight: 700;
    font-size: 11.5px;
    cursor: pointer;
    color: #fff;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
  .btn-auto-all {
    background: linear-gradient(135deg, #22c55e, #16a34a);
    box-shadow: 0 3px 10px rgba(34, 197, 94, 0.25);
  }
  .btn-auto-tab {
    background: linear-gradient(135deg, #3b82f6, #2563eb);
    box-shadow: 0 3px 10px rgba(59, 130, 246, 0.25);
  }
  .btn-auto-all.active, .btn-auto-tab.active {
    background: linear-gradient(135deg, #ef4444, #dc2626);
    box-shadow: 0 3px 12px rgba(239, 68, 68, 0.35);
  }

  .quick-config-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 6px;
    font-size: 11px;
    color: #cbd5e1;
  }
  .delay-box {
    display: flex;
    align-items: center;
    gap: 5px;
    flex: 1;
  }
  .delay-box input[type="range"] {
    flex: 1;
    accent-color: #22c55e;
    cursor: pointer;
  }
  .delay-val {
    min-width: 48px;
    text-align: right;
    font-weight: 700;
    color: #4ade80;
    font-size: 11px;
  }
  .btn-drawer-toggle {
    background: rgba(51, 65, 85, 0.8);
    color: #e2e8f0;
    border: 1px solid rgba(148, 163, 184, 0.25);
    border-radius: 6px;
    padding: 3px 7px;
    font-size: 10.5px;
    font-weight: 600;
    cursor: pointer;
  }
  .btn-drawer-toggle:hover { background: rgba(71, 85, 105, 0.9); }

  /* Drag & Drop Area Order Drawer */
  .order-drawer {
    background: rgba(30, 41, 59, 0.75);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 8px;
    padding: 6px 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .order-drawer.collapsed { display: none; }
  .order-drawer-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    color: #94a3b8;
    font-weight: 600;
  }
  .area-order-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .area-order-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(15, 23, 42, 0.85);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 6px;
    padding: 4px 7px;
    cursor: grab;
    transition: background 0.15s, border-color 0.15s;
  }
  .area-order-item.dragging {
    opacity: 0.5;
    border-color: #4ade80;
  }
  .area-order-item.disabled-area {
    opacity: 0.55;
  }
  .area-order-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11.5px;
    font-weight: 600;
  }
  .drag-handle {
    color: #64748b;
    font-size: 13px;
    cursor: grab;
    padding: 0 2px;
  }
  .order-idx {
    background: rgba(34, 197, 94, 0.2);
    color: #4ade80;
    font-size: 10px;
    font-weight: 700;
    padding: 1px 5px;
    border-radius: 4px;
  }
  .area-order-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .mini-move-btn {
    background: rgba(51, 65, 85, 0.7);
    border: none;
    color: #cbd5e1;
    width: 18px;
    height: 18px;
    border-radius: 4px;
    font-size: 9px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mini-move-btn:hover { background: #475569; color: #fff; }

  /* 4 Area Tabs */
  .hud-tabs {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    background: rgba(15, 23, 42, 0.95);
    border-bottom: 1px solid rgba(148, 163, 184, 0.2);
  }
  .tab-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    padding: 8px 2px;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    border-bottom: 2.5px solid transparent;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }
  .tab-btn:hover { color: #e2e8f0; background: rgba(255, 255, 255, 0.03); }
  .tab-btn.active {
    color: #4ade80;
    border-bottom-color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
  }
  .tab-btn .tab-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #22c55e;
  }
  .tab-btn .tab-dot.off {
    background: #64748b;
  }

  /* Scrollable Tab Body */
  .hud-body {
    padding: 10px;
    overflow-y: auto;
    max-height: 410px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .hud-body::-webkit-scrollbar { width: 5px; }
  .hud-body::-webkit-scrollbar-thumb { background: rgba(148, 163, 184, 0.3); border-radius: 99px; }

  .tab-pane { display: none; flex-direction: column; gap: 8px; }
  .tab-pane.active { display: flex; }

  /* Area Master Enable Banner inside each Tab */
  .area-enable-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(22, 163, 74, 0.14);
    border: 1px solid rgba(34, 197, 94, 0.35);
    border-radius: 8px;
    padding: 7px 10px;
    font-weight: 700;
    font-size: 11.5px;
  }
  .area-enable-banner.off {
    background: rgba(51, 65, 85, 0.35);
    border-color: rgba(148, 163, 184, 0.2);
    color: #94a3b8;
  }

  /* Sub-Area Cards */
  .sub-card {
    background: rgba(30, 41, 59, 0.65);
    border: 1px solid rgba(148, 163, 184, 0.18);
    border-radius: 9px;
    overflow: hidden;
    transition: border-color 0.15s, opacity 0.15s;
  }
  .sub-card.dragging {
    opacity: 0.45;
    border-color: #4ade80;
  }
  .sub-card.disabled-card {
    opacity: 0.6;
  }
  .sub-card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 9px;
    background: rgba(15, 23, 42, 0.55);
    cursor: pointer;
  }
  .sub-card-head-left {
    display: flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    font-size: 11.5px;
    color: #93c5fd;
  }
  .sub-card-head-right {
    display: flex;
    align-items: center;
    gap: 4px;
  }
  .sub-card-body {
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border-top: 1px solid rgba(148, 163, 184, 0.12);
  }
  .sub-card.collapsed .sub-card-body,
  .sub-card.disabled-card .sub-card-body {
    display: none;
  }

  /* Rows & Progressive Disclosure Sub-Options */
  .opt-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    font-size: 11.5px;
    color: #e2e8f0;
  }
  .opt-sub {
    margin-left: 14px;
    padding: 5px 8px;
    background: rgba(15, 23, 42, 0.55);
    border-left: 2px solid #22c55e;
    border-radius: 0 6px 6px 0;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .opt-sub.hidden { display: none !important; }

  input[type="checkbox"] {
    width: 15px;
    height: 15px;
    accent-color: #22c55e;
    cursor: pointer;
    margin: 0;
  }
  select, input[type="number"] {
    background: #0f172a;
    color: #f8fafc;
    border: 1px solid rgba(148, 163, 184, 0.3);
    border-radius: 6px;
    padding: 3px 6px;
    font-size: 11px;
    outline: none;
  }
  input[type="number"] { width: 78px; text-align: right; }

  .hint-note {
    font-size: 10.5px;
    color: #94a3b8;
    line-height: 1.35;
  }

  /* Coming soon box */
  .coming-soon-box {
    padding: 28px 16px;
    text-align: center;
    background: rgba(30, 41, 59, 0.5);
    border: 1px dashed rgba(148, 163, 184, 0.3);
    border-radius: 10px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  .coming-soon-icon { font-size: 32px; }
  .coming-soon-title { font-size: 14px; font-weight: 700; color: #f8fafc; }
  .coming-soon-desc { font-size: 11.5px; color: #94a3b8; line-height: 1.45; }
`;
