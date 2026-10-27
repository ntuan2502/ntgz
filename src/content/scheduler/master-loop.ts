import { AREA_META } from '../../shared/constants/default-config';
import { getGameState, execGameAction } from '../bridge/content-bridge';
import { sleep, formatClock } from './dom-helpers';
import { handleFightMinigame } from './minigame';
import { runFarmSubAreas, resetFarmTiming } from './farm-runner';
import { stepBenDoFishing } from './wharf-runner';
import { stepSeaFishing } from './sea-runner';
import { stepFarmstay, resetFarmstayTiming } from './farmstay-runner';
import {
  getConfig,
  saveConfig,
  setStatus,
  updateHeaderStats,
  setLastGameSnap,
  getLockedTabArea,
  setLockedTabArea,
} from '../ui/hud-core';

let isBusy = false;
let currentAreaIdx = 0;
let areaCatchesCount = 0;
let lastFarmDoneDay = -1;
let benExhaustedUntil = 0;
let seaExhaustedUntil = 0;
let seaExhaustedDay = -1;

export function toggleAutoAll(): void {
  const config = getConfig();
  if (config.running && config.runMode === 'all') {
    config.running = false;
    setStatus('⏸️ Đã dừng Auto Tất Cả');
  } else {
    config.running = true;
    config.runMode = 'all';
    setLockedTabArea(null);
    currentAreaIdx = 0;
    areaCatchesCount = 0;
    lastFarmDoneDay = -1;
    resetFarmTiming();
    setStatus('▶️ Bắt đầu chạy Auto Tất Cả theo thứ tự...');
  }
  saveConfig();
}

export function toggleAutoTab(): void {
  const config = getConfig();
  if (config.running && config.runMode === 'tab') {
    config.running = false;
    setLockedTabArea(null);
    setStatus('⏸️ Đã dừng Auto Tab');
  } else {
    config.running = true;
    config.runMode = 'tab';
    setLockedTabArea(config.activeTab);
    areaCatchesCount = 0;
    lastFarmDoneDay = -1;
    resetFarmTiming();
    const areaName = AREA_META[config.activeTab]?.name || config.activeTab;
    setStatus(`🎯 Bắt đầu chỉ Auto trong Tab: ${areaName}`);
  }
  saveConfig();
}

export function startAuto(mode: 'all' | 'tab' = 'all'): void {
  const config = getConfig();
  config.running = true;
  config.runMode = mode;
  lastFarmDoneDay = -1;
  resetFarmTiming();
  resetFarmstayTiming();
  if (mode === 'tab') {
    setLockedTabArea(config.activeTab);
  } else {
    setLockedTabArea(null);
  }
  saveConfig();
}

export function stopAuto(): void {
  const config = getConfig();
  config.running = false;
  setStatus('⏸️ Đã tạm dừng Auto');
  saveConfig();
}

export function togglePanel(): void {
  const config = getConfig();
  config.panelVisible = !config.panelVisible;
  saveConfig();
}

export async function tickAuto(): Promise<void> {
  if (isBusy) return;
  isBusy = true;

  try {
    const snap = await getGameState();
    if (snap && snap.ok) {
      setLastGameSnap(snap);
      updateHeaderStats(snap);
    }

    const config = getConfig();
    if (!config.running || !snap || !snap.ok) {
      isBusy = false;
      return;
    }

    // Priority 0: Handle fight minigame if visible on screen
    if (document.querySelector('.ben-fight')) {
      handleFightMinigame(snap, setStatus);
      isBusy = false;
      return;
    }

    // Reset daily fishing exhaustion flags on a new day
    if (seaExhaustedDay !== (snap.day ?? 0)) {
      seaExhaustedUntil = 0;
      seaExhaustedDay = snap.day ?? 0;
    }

    // Check Night Sleep
    const isMidSeaCast = snap.screen === 'sea' && snap.sea && snap.sea.phase !== 'idle';
    if (
      config.autoSleep &&
      !isMidSeaCast &&
      (snap.minutes || 0) >= 1350
    ) {
      setStatus(`😴 Đã ${formatClock(snap.minutes)} -> Về nhà đi ngủ qua ngày mới...`);
      await execGameAction('SLEEP_NOW');
      areaCatchesCount = 0;
      currentAreaIdx = 0;
      benExhaustedUntil = 0;
      seaExhaustedUntil = 0;
      await sleep(1200);
      isBusy = false;
      return;
    }

    // MODE A: "🎯 AUTO TAB NÀY"
    if (config.runMode === 'tab') {
      const tab = getLockedTabArea() || config.activeTab;
      if (tab === 'farm') {
        const acted = await runFarmSubAreas(snap, config, setStatus, updateHeaderStats);
        if (!acted) {
          setStatus('✅ Đã hoàn tất mọi việc được bật trong Nông Trại (Đang canh tự động...)');
        }
      } else if (tab === 'benDo') {
        const res = await stepBenDoFishing(snap, config, setStatus, () => {
          areaCatchesCount++;
        });
        if (res.finishedArea && config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
          setStatus('🌙 Hết câu được ở Bến Đò buổi tối -> Về nhà đi ngủ...');
          await execGameAction('SLEEP_NOW');
          await sleep(1200);
        }
      } else if (tab === 'sea') {
        const res = await stepSeaFishing(snap, config, setStatus, () => {
          areaCatchesCount++;
        });
        if (res.finishedArea) {
          if (config.autoSleep && (config.sleepOnFishingLimit || res.lateNight || (snap.minutes || 0) >= 1140)) {
            setStatus('🌙 Hết câu được ở Biển -> Về nhà đi ngủ qua ngày mới...');
            await execGameAction('SLEEP_NOW');
            await sleep(1200);
          } else {
            await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
          }
        }
      } else if (tab === 'farmstay') {
        const res = await stepFarmstay(snap, config, setStatus, updateHeaderStats);
        if (res.finishedArea && !res.acted && snap.screen === 'farmstay') {
          setStatus('🏡 Farmstay Ông Năm: Đã xong việc hiện tại (Đang canh rau chín & khách đến...)');
          await sleep(1500);
        }
      }
      isBusy = false;
      return;
    }

    // MODE B: "▶️ AUTO TẤT CẢ"
    const enabledAreas = config.areaOrder.filter((a) => config.areaEnabled[a]);
    if (enabledAreas.length === 0) {
      setStatus('⚠️ Chưa bật Khu vực nào trong danh sách Auto Tất Cả!');
      isBusy = false;
      return;
    }

    if (currentAreaIdx >= enabledAreas.length) {
      currentAreaIdx = 0;
    }
    const currentArea = enabledAreas[currentAreaIdx];

    if (currentArea === 'farm') {
      const acted = await runFarmSubAreas(snap, config, setStatus, updateHeaderStats);
      if (config.running) {
        lastFarmDoneDay = snap.day ?? 0;
      }

      if (enabledAreas.length > 1) {
        const nowMs = Date.now();
        const nextIdx = (currentAreaIdx + 1) % enabledAreas.length;
        const nextArea = enabledAreas[nextIdx];
        const benReady = nowMs >= benExhaustedUntil;
        const seaReady = nowMs >= seaExhaustedUntil && (snap.minutes || 0) < 1305;

        if (
          nextArea === 'farmstay' ||
          (nextArea === 'benDo' && benReady) ||
          (nextArea === 'sea' && seaReady) ||
          enabledAreas.length > 2
        ) {
          currentAreaIdx = nextIdx;
          areaCatchesCount = 0;
        } else {
          let foundReadyIdx = -1;
          for (let i = 1; i < enabledAreas.length; i++) {
            const candIdx = (currentAreaIdx + i) % enabledAreas.length;
            const candArea = enabledAreas[candIdx];
            if (
              candArea === 'farmstay' ||
              (candArea === 'benDo' && benReady) ||
              (candArea === 'sea' && seaReady)
            ) {
              foundReadyIdx = candIdx;
              break;
            }
          }
          if (foundReadyIdx !== -1) {
            currentAreaIdx = foundReadyIdx;
            areaCatchesCount = 0;
          } else {
            setStatus('🌾 Đang trực tại Nông Trại (đợi các khu khác hồi sức / qua ngày)...');
            await sleep(1500);
          }
        }
      } else {
        if (!acted) {
          setStatus('🌾 Nông Trại: Đã xong việc hiện tại...');
          await sleep(1500);
        }
      }
    } else if (currentArea === 'benDo') {
      if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
        currentAreaIdx = enabledAreas.indexOf('farm');
        isBusy = false;
        return;
      }

      if (Date.now() < benExhaustedUntil && enabledAreas.length > 1) {
        currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        isBusy = false;
        return;
      }

      const res = await stepBenDoFishing(snap, config, setStatus, () => {
        areaCatchesCount++;
      });
      const switchMax = Math.max(1, Number(config.fishingSwitchCount) || 15);
      if (res.finishedArea || (enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.benNet?.fishing === 'idle')) {
        if (res.exhausted) {
          benExhaustedUntil = Date.now() + 180000;
        }
        areaCatchesCount = 0;
        if (enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        } else if (config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= 1140) {
          setStatus('🌙 Đã hết sức câu ở Bến Đò buổi tối -> Về nhà đi ngủ...');
          await execGameAction('SLEEP_NOW');
          await sleep(1200);
        }
      }
    } else if (currentArea === 'sea') {
      if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
        currentAreaIdx = enabledAreas.indexOf('farm');
        isBusy = false;
        return;
      }

      if (Date.now() < seaExhaustedUntil && enabledAreas.length > 1) {
        currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        isBusy = false;
        return;
      }

      const res = await stepSeaFishing(snap, config, setStatus, () => {
        areaCatchesCount++;
      });
      const switchMax = Math.max(1, Number(config.fishingSwitchCount) || 15);
      if (res.finishedArea) {
        if (res.exhausted) {
          seaExhaustedUntil = Date.now() + 180000;
        }
        if (config.autoSleep && (config.sleepOnFishingLimit || res.lateNight) && (snap.minutes || 0) >= 1140) {
          setStatus('🌙 Đã hết ngày ở Biển -> Về nhà đi ngủ qua ngày mới...');
          await execGameAction('SLEEP_NOW');
          areaCatchesCount = 0;
          currentAreaIdx = 0;
          benExhaustedUntil = 0;
          seaExhaustedUntil = 0;
          await sleep(1200);
        } else if (enabledAreas.length > 1) {
          areaCatchesCount = 0;
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        }
      } else if (enabledAreas.length > 1 && areaCatchesCount >= switchMax && snap.sea?.phase === 'idle') {
        areaCatchesCount = 0;
        currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
      }
    } else if (currentArea === 'farmstay') {
      if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
        currentAreaIdx = enabledAreas.indexOf('farm');
        isBusy = false;
        return;
      }

      const res = await stepFarmstay(snap, config, setStatus, updateHeaderStats);
      if (res.finishedArea) {
        if (enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          if (snap.screen === 'farmstay') {
            await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
          }
        }
      }
    }
  } catch (err) {
    console.error('[NTG Auto] tick error:', err);
  } finally {
    isBusy = false;
  }
}
