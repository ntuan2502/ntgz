import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppConfig, AreaId } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { DEFAULT_CONFIG } from '../../shared/constants/default-config';
import { HudApp } from './HudApp';
import tailwindStyles from '../../styles/tailwind.compiled.css';

let config: AppConfig = structuredClone(DEFAULT_CONFIG);
let hudRoot: ShadowRoot | null = null;
let reactRoot: Root | null = null;
let lastActionText = 'Đang chờ lệnh...';
let lastGameSnap: GameSnapshot | null = null;
let lockedTabArea: AreaId | null = null;

let onToggleAllHandler: (() => void) | null = null;
let onToggleTabHandler: (() => void) | null = null;

export function setAutoActionHandlers(onToggleAll: () => void, onToggleTab: () => void): void {
  onToggleAllHandler = onToggleAll;
  onToggleTabHandler = onToggleTab;
}

export function getConfig(): AppConfig {
  return config;
}

export function setConfig(newConfig: AppConfig): void {
  config = newConfig;
}

export function getHudRoot(): ShadowRoot | null {
  return hudRoot;
}

export function getLockedTabArea(): AreaId | null {
  return lockedTabArea;
}

export function setLockedTabArea(area: AreaId | null): void {
  lockedTabArea = area;
}

export function getLastActionText(): string {
  return lastActionText;
}

export function getLastGameSnap(): GameSnapshot | null {
  return lastGameSnap;
}

export function setLastGameSnap(snap: GameSnapshot | null): void {
  lastGameSnap = snap;
}

export function setStatus(text: string): void {
  lastActionText = text;
  window.dispatchEvent(
    new CustomEvent<string>('__NTG_ACTION_UPDATE__', { detail: text })
  );
}

export function updateHeaderStats(snap: GameSnapshot): void {
  lastGameSnap = snap;
  window.dispatchEvent(
    new CustomEvent<GameSnapshot>('__NTG_SNAP_UPDATE__', { detail: snap })
  );
}

export function mergeConfig(saved: Partial<AppConfig> | null | undefined): AppConfig {
  if (!saved || typeof saved !== 'object') return structuredClone(DEFAULT_CONFIG);
  const savedAny = saved as Record<string, unknown>;
  const next: AppConfig = {
    ...structuredClone(DEFAULT_CONFIG),
    ...saved,
    areaEnabled: { ...DEFAULT_CONFIG.areaEnabled, ...(saved.areaEnabled || {}) },
    farmSubEnabled: { ...DEFAULT_CONFIG.farmSubEnabled, ...(saved.farmSubEnabled || {}) },
    farmSubCollapsed: { ...DEFAULT_CONFIG.farmSubCollapsed, ...(saved.farmSubCollapsed || {}) },

    // Backward-compatibility migrations
    barnAutoFeedBuffalo: (saved.barnAutoFeedBuffalo ?? savedAny.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoFeedBuffalo) as boolean,
    barnAutoBathBuffalo: (saved.barnAutoBathBuffalo ?? savedAny.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoBathBuffalo) as boolean,
    barnAutoLendBuffalo: (saved.barnAutoLendBuffalo ?? DEFAULT_CONFIG.barnAutoLendBuffalo) as boolean,
    autoRecoverHunger: (saved.autoRecoverHunger ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverHunger) as boolean,
    preferFoodKitchen: (saved.preferFoodKitchen ?? DEFAULT_CONFIG.preferFoodKitchen) as string,
    autoRecoverThirst: (saved.autoRecoverThirst ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverThirst) as boolean,
    drinkSource: ((saved.drinkSource as string) === 'both'
      ? 'kitchen_first'
      : (saved.drinkSource ?? DEFAULT_CONFIG.drinkSource)) as AppConfig['drinkSource'],
    preferDrinkKitchen: (saved.preferDrinkKitchen ?? DEFAULT_CONFIG.preferDrinkKitchen) as string,
    autoChargeVehicle: (saved.autoChargeVehicle ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoChargeVehicle) as boolean,
    autoMorningCoffee: (saved.autoMorningCoffee ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoMorningCoffee) as boolean,
    autoFeedPiggy: (saved.autoFeedPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoFeedPiggy) as boolean,
    autoBreakPiggy: (saved.autoBreakPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoBreakPiggy) as boolean,
    autoNewPiggy: (saved.autoNewPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoNewPiggy) as boolean,
    autoSellTrend: (saved.autoSellTrend ?? DEFAULT_CONFIG.autoSellTrend) as boolean,
    autoSellDailyTask: (saved.autoSellDailyTask ?? DEFAULT_CONFIG.autoSellDailyTask) as boolean,
    autoSellProduce: saved.autoSellProduce === true && typeof saved.surplusKeepQty === 'number',
    surplusKeepQty: (saved.surplusKeepQty ?? DEFAULT_CONFIG.surplusKeepQty) as number,
    autoBuyPlots: (saved.autoBuyPlots ?? DEFAULT_CONFIG.autoBuyPlots) as boolean,
    autoSalonShampoo: (saved.autoSalonShampoo ?? DEFAULT_CONFIG.autoSalonShampoo) as boolean,
    autoSalonWhiten: (saved.autoSalonWhiten ?? DEFAULT_CONFIG.autoSalonWhiten) as boolean,
    autoFirstDayTasks: (saved.autoFirstDayTasks ?? DEFAULT_CONFIG.autoFirstDayTasks) as boolean,
    autoNotebookPages: (saved.autoNotebookPages ?? DEFAULT_CONFIG.autoNotebookPages) as boolean,
    hudWidth: (typeof saved.hudWidth === 'number' && saved.hudWidth >= 340 ? saved.hudWidth : DEFAULT_CONFIG.hudWidth),
    hudHeight: (typeof saved.hudHeight === 'number' && saved.hudHeight >= 360 ? saved.hudHeight : DEFAULT_CONFIG.hudHeight),
  };

  if (!Array.isArray(next.areaOrder) || next.areaOrder.length === 0) {
    next.areaOrder = [...DEFAULT_CONFIG.areaOrder];
  }
  if (!Array.isArray(next.farmSubOrder) || next.farmSubOrder.length === 0) {
    next.farmSubOrder = [...DEFAULT_CONFIG.farmSubOrder];
  }
  for (const k of DEFAULT_CONFIG.farmSubOrder) {
    if (!next.farmSubOrder.includes(k)) next.farmSubOrder.push(k);
  }
  return next;
}

export function saveConfig(): void {
  chrome.storage.local.set({ autoConfig: config });
  renderAll();
}

export function renderAll(): void {
  window.dispatchEvent(
    new CustomEvent<AppConfig>('__NTG_CONFIG_UPDATE__', { detail: config })
  );
}

export function loadConfig(): Promise<AppConfig> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoConfig'], (res) => {
      if (res.autoConfig) {
        config = mergeConfig(res.autoConfig);
      }
      renderAll();
      resolve(config);
    });
  });
}

/**
 * Chromium ignores `@property` rules declared inside a ShadowRoot, so Tailwind v4's
 * `--tw-*` custom properties (translate, border-style, shadow, ring...) would stay
 * undefined in the HUD. Registering them at document level makes them apply globally.
 */
function registerTailwindProperties(css: string): void {
  const STYLE_ID = 'ntg-tw-properties';
  if (document.getElementById(STYLE_ID)) return;
  const rules = css.match(/@property\s+[^{]+\{[^}]*\}/g);
  if (!rules) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = rules.join('\n');
  (document.head || document.documentElement).appendChild(style);
}

export function createHud(): void {
  if (document.getElementById('ntg-auto-hud-host')) return;

  registerTailwindProperties(tailwindStyles);

  const host = document.createElement('div');
  host.id = 'ntg-auto-hud-host';
  host.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483647;pointer-events:none;';
  document.documentElement.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });
  hudRoot = shadow;

  // Inject compiled Tailwind stylesheet directly into Shadow DOM
  const style = document.createElement('style');
  style.textContent = tailwindStyles;
  shadow.appendChild(style);

  // Mount React App inside Shadow DOM
  const mountPoint = document.createElement('div');
  mountPoint.id = 'ntg-hud-root';
  shadow.appendChild(mountPoint);

  reactRoot = createRoot(mountPoint);
  reactRoot.render(
    <React.StrictMode>
      <HudApp
        shadowRoot={shadow}
        initialConfig={config}
        onSaveConfig={(updated) => {
          config = updated;
          chrome.storage.local.set({ autoConfig: updated });
        }}
        onToggleAll={() => onToggleAllHandler?.()}
        onToggleTab={() => onToggleTabHandler?.()}
      />
    </React.StrictMode>
  );
}
