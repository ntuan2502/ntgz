import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { AppConfig, AreaId } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { DEFAULT_CONFIG } from '../../shared/constants/default-config';
import { HudApp } from './HudApp';
import tailwindStyles from '../../styles/tailwind.compiled.css';

export interface HudLogEntry {
  id: number;
  time: string;
  gameTime?: string;
  text: string;
}

let config: AppConfig = structuredClone(DEFAULT_CONFIG);
let hudRoot: ShadowRoot | null = null;
let reactRoot: Root | null = null;
let lastActionText = 'Đang chờ lệnh...';
let lastGameSnap: GameSnapshot | null = null;
let lockedTabArea: AreaId | null = null;
let logSeq = 0;
let sessionLogs: HudLogEntry[] = [];

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

function formatRealClock(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

function formatGameClock(snap: GameSnapshot | null): string | undefined {
  if (!snap || typeof snap.day !== 'number') return undefined;
  const mins = typeof snap.minutes === 'number' ? snap.minutes : 0;
  const hh = String(Math.floor(mins / 60) % 24).padStart(2, '0');
  const mm = String(mins % 60).padStart(2, '0');
  return `N${snap.day} ${hh}:${mm}`;
}

export function getSessionLogs(): HudLogEntry[] {
  return sessionLogs;
}

export function clearSessionLogs(): void {
  sessionLogs = [];
  window.dispatchEvent(
    new CustomEvent<HudLogEntry[]>('__NTG_LOGS_UPDATE__', { detail: sessionLogs })
  );
}

export function setStatus(text: string): void {
  lastActionText = text;
  window.dispatchEvent(
    new CustomEvent<string>('__NTG_ACTION_UPDATE__', { detail: text })
  );

  const lastEntry = sessionLogs[sessionLogs.length - 1];
  if (!lastEntry || lastEntry.text !== text) {
    const nextEntry: HudLogEntry = {
      id: ++logSeq,
      time: formatRealClock(new Date()),
      gameTime: formatGameClock(lastGameSnap),
      text,
    };
    sessionLogs = [...sessionLogs, nextEntry];
    window.dispatchEvent(
      new CustomEvent<HudLogEntry[]>('__NTG_LOGS_UPDATE__', { detail: sessionLogs })
    );
  }
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
    benSubEnabled: { ...DEFAULT_CONFIG.benSubEnabled, ...(saved.benSubEnabled || {}) },
    benSubCollapsed: { ...DEFAULT_CONFIG.benSubCollapsed, ...(saved.benSubCollapsed || {}) },
    farmstaySubEnabled: { ...DEFAULT_CONFIG.farmstaySubEnabled, ...(saved.farmstaySubEnabled || {}) },
    farmstaySubCollapsed: { ...DEFAULT_CONFIG.farmstaySubCollapsed, ...(saved.farmstaySubCollapsed || {}) },

    // Backward-compatibility migrations
    barnAutoFeedBuffalo: (saved.barnAutoFeedBuffalo ?? savedAny.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoFeedBuffalo) as boolean,
    barnAutoBathBuffalo: (saved.barnAutoBathBuffalo ?? savedAny.barnAutoBuffalo ?? DEFAULT_CONFIG.barnAutoBathBuffalo) as boolean,
    barnAutoLendBuffalo: (saved.barnAutoLendBuffalo ?? DEFAULT_CONFIG.barnAutoLendBuffalo) as boolean,
    barnLendMoodMin: (saved.barnLendMoodMin ?? DEFAULT_CONFIG.barnLendMoodMin) as number,
    dairyAutoFeedCows: (saved.dairyAutoFeedCows ?? savedAny.barnAutoFeedCows ?? DEFAULT_CONFIG.dairyAutoFeedCows) as boolean,
    dairyAutoCureCows: (saved.dairyAutoCureCows ?? savedAny.barnAutoCureCows ?? DEFAULT_CONFIG.dairyAutoCureCows) as boolean,
    dairyAutoSellMilk: (saved.dairyAutoSellMilk ?? savedAny.barnAutoSellMilk ?? DEFAULT_CONFIG.dairyAutoSellMilk) as boolean,
    dairyAutoPayHelper: (saved.dairyAutoPayHelper ?? savedAny.barnAutoPayHelper ?? DEFAULT_CONFIG.dairyAutoPayHelper) as boolean,
    autoPayHelperCrops: (saved.autoPayHelperCrops ?? DEFAULT_CONFIG.autoPayHelperCrops) as boolean,
    petFeedMode: (saved.petFeedMode ?? DEFAULT_CONFIG.petFeedMode) as AppConfig['petFeedMode'],
    petPreferFood: (saved.petPreferFood ?? DEFAULT_CONFIG.petPreferFood) as string,
    petAutoBuyFood: (saved.petAutoBuyFood ?? DEFAULT_CONFIG.petAutoBuyFood) as boolean,
    petBuyFoodType: (saved.petBuyFoodType ?? DEFAULT_CONFIG.petBuyFoodType) as string,
    petAutoWalk: (saved.petAutoWalk ?? DEFAULT_CONFIG.petAutoWalk) as boolean,
    autoRecoverHunger: (saved.autoRecoverHunger ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverHunger) as boolean,
    preferFoodKitchen: (saved.preferFoodKitchen ?? DEFAULT_CONFIG.preferFoodKitchen) as string,
    autoRecoverThirst: (saved.autoRecoverThirst ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoRecoverThirst) as boolean,
    drinkSource: ((saved.drinkSource as string) === 'both'
      ? 'kitchen_first'
      : (saved.drinkSource ?? DEFAULT_CONFIG.drinkSource)) as AppConfig['drinkSource'],
    preferDrinkKitchen: (saved.preferDrinkKitchen ?? DEFAULT_CONFIG.preferDrinkKitchen) as string,
    autoChargeVehicle: (saved.autoChargeVehicle ?? savedAny.autoRecoverNeeds ?? DEFAULT_CONFIG.autoChargeVehicle) as boolean,
    eatUntilFull: (saved.eatUntilFull ?? DEFAULT_CONFIG.eatUntilFull) as boolean,
    drinkUntilFull: (saved.drinkUntilFull ?? DEFAULT_CONFIG.drinkUntilFull) as boolean,
    autoFeedPiggy: (saved.autoFeedPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoFeedPiggy) as boolean,
    autoBreakPiggy: (saved.autoBreakPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoBreakPiggy) as boolean,
    autoNewPiggy: (saved.autoNewPiggy ?? savedAny.autoPiggy ?? DEFAULT_CONFIG.autoNewPiggy) as boolean,
    autoSellTrend: (saved.autoSellTrend ?? DEFAULT_CONFIG.autoSellTrend) as boolean,
    autoBuyPlots: (saved.autoBuyPlots ?? DEFAULT_CONFIG.autoBuyPlots) as boolean,
    autoBuyPesticide: (saved.autoBuyPesticide ?? DEFAULT_CONFIG.autoBuyPesticide) as boolean,
    autoBuyFertilizer: (saved.autoBuyFertilizer ?? DEFAULT_CONFIG.autoBuyFertilizer) as boolean,
    autoBuySeeds: (saved.autoBuySeeds ?? DEFAULT_CONFIG.autoBuySeeds) as boolean,
    dairyAutoBuyMedicine: (saved.dairyAutoBuyMedicine ?? DEFAULT_CONFIG.dairyAutoBuyMedicine) as boolean,
    savingsDepositAmount: (saved.savingsDepositAmount ?? DEFAULT_CONFIG.savingsDepositAmount) as number,
    savingsDepositMax: (saved.savingsDepositMax ?? DEFAULT_CONFIG.savingsDepositMax) as boolean,
    savingsTerm: (saved.savingsTerm ?? DEFAULT_CONFIG.savingsTerm) as AppConfig['savingsTerm'],
    savingsMinKeepMillion: (saved.savingsMinKeepMillion ?? DEFAULT_CONFIG.savingsMinKeepMillion) as number,
    autoSalonShampoo: (saved.autoSalonShampoo ?? DEFAULT_CONFIG.autoSalonShampoo) as boolean,
    autoSalonWhiten: (saved.autoSalonWhiten ?? DEFAULT_CONFIG.autoSalonWhiten) as boolean,
    autoSellNightMarket: (saved.autoSellNightMarket ?? DEFAULT_CONFIG.autoSellNightMarket) as boolean,
    nightMarketMinStock: (saved.nightMarketMinStock ?? DEFAULT_CONFIG.nightMarketMinStock) as number,
    nightMarketStrategy: (saved.nightMarketStrategy ?? DEFAULT_CONFIG.nightMarketStrategy) as AppConfig['nightMarketStrategy'],
    nightMarketSelectedCrop: (saved.nightMarketSelectedCrop ?? DEFAULT_CONFIG.nightMarketSelectedCrop) as string,
    hudWidth: (typeof saved.hudWidth === 'number' && saved.hudWidth >= 340 ? saved.hudWidth : DEFAULT_CONFIG.hudWidth),
    hudHeight: (typeof saved.hudHeight === 'number' && saved.hudHeight >= 360 ? saved.hudHeight : DEFAULT_CONFIG.hudHeight),
    showFullActions: Boolean(saved.showFullActions ?? DEFAULT_CONFIG.showFullActions),
    benHuntZone: (saved.benHuntZone ?? DEFAULT_CONFIG.benHuntZone) as AppConfig['benHuntZone'],
  };

  if (!Array.isArray(next.areaOrder) || next.areaOrder.length === 0) {
    next.areaOrder = [...DEFAULT_CONFIG.areaOrder];
  } else {
    // Migrate legacy 'city' to 'farmstay'
    next.areaOrder = (next.areaOrder as string[]).map((a) => (a === 'city' ? 'farmstay' : a)) as AreaId[];
    const validAreas = new Set(DEFAULT_CONFIG.areaOrder);
    next.areaOrder = next.areaOrder.filter((k, i, arr) => validAreas.has(k) && arr.indexOf(k) === i);
    for (const k of DEFAULT_CONFIG.areaOrder) {
      if (!next.areaOrder.includes(k)) next.areaOrder.push(k);
    }
  }

  if ((next.activeTab as string) === 'city') {
    next.activeTab = 'farmstay';
  }

  if (!Array.isArray(next.farmSubOrder) || next.farmSubOrder.length === 0) {
    next.farmSubOrder = [...DEFAULT_CONFIG.farmSubOrder];
  }
  for (const k of DEFAULT_CONFIG.farmSubOrder) {
    if (!next.farmSubOrder.includes(k)) next.farmSubOrder.push(k);
  }
  const validBenSubs = new Set(DEFAULT_CONFIG.benSubOrder);
  next.benSubOrder = Array.isArray(next.benSubOrder)
    ? next.benSubOrder.filter((k, i, arr) => validBenSubs.has(k) && arr.indexOf(k) === i)
    : [];
  for (const k of DEFAULT_CONFIG.benSubOrder) {
    if (!next.benSubOrder.includes(k)) next.benSubOrder.push(k);
  }

  const validFarmstaySubs = new Set(DEFAULT_CONFIG.farmstaySubOrder);
  next.farmstaySubOrder = Array.isArray(next.farmstaySubOrder)
    ? next.farmstaySubOrder.filter((k, i, arr) => validFarmstaySubs.has(k) && arr.indexOf(k) === i)
    : [];
  for (const k of DEFAULT_CONFIG.farmstaySubOrder) {
    if (!next.farmstaySubOrder.includes(k)) next.farmstaySubOrder.push(k);
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
 * Chromium ignores `@property` rules declared inside a ShadowRoot, and Radix UI Portals
 * (such as shadcn `SelectContent`) mount into `document.body`. Injecting the compiled
 * Tailwind stylesheet (with `@layer base` stripped so host page elements are untouched)
 * at document level enables `@property` in the Shadow DOM and styles Radix Portals.
 */
function registerTailwindProperties(css: string): void {
  const STYLE_ID = 'ntg-tw-properties';
  if (document.getElementById(STYLE_ID)) return;
  const baseIdx = css.indexOf('@layer base{');
  const compIdx = css.indexOf('@layer components;');
  const safeDocCss =
    baseIdx !== -1 && compIdx > baseIdx
      ? css.slice(0, baseIdx) + css.slice(compIdx)
      : css;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = safeDocCss;
  (document.head || document.documentElement).appendChild(style);
}

export function createHud(): void {
  if (document.getElementById('ntg-auto-hud-host')) return;

  registerTailwindProperties(tailwindStyles);

  const host = document.createElement('div');
  host.id = 'ntg-auto-hud-host';
  host.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:0;z-index:2147483600;pointer-events:none;';
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
