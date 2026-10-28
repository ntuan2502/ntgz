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
let lastFarmDoneDay = -1;
let benExhaustedUntil = 0;
let seaExhaustedUntil = 0;
let seaExhaustedDay = -1;
let farmstayCooldownUntil = 0;

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
    lastFarmDoneDay = -1;
    benExhaustedUntil = 0;
    seaExhaustedUntil = 0;
    farmstayCooldownUntil = 0;
    resetFarmTiming();
    resetFarmstayTiming();
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
    lastFarmDoneDay = -1;
    benExhaustedUntil = 0;
    seaExhaustedUntil = 0;
    farmstayCooldownUntil = 0;
    resetFarmTiming();
    resetFarmstayTiming();
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
  benExhaustedUntil = 0;
  seaExhaustedUntil = 0;
  farmstayCooldownUntil = 0;
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

    // Reset daily fishing & farmstay exhaustion flags on a new day
    if (seaExhaustedDay !== (snap.day ?? 0)) {
      seaExhaustedUntil = 0;
      farmstayCooldownUntil = 0;
      seaExhaustedDay = snap.day ?? 0;
    }

    // Check Night Sleep
    const isMidSeaCast = snap.screen === 'sea' && snap.sea && snap.sea.phase !== 'idle';
    const targetSleepMinutes = config.sleepLate ? 1350 : 1140;
    const targetTimeLabel = config.sleepLate ? '22:30' : '19:00';
    if (
      config.autoSleep &&
      !isMidSeaCast &&
      (snap.minutes || 0) >= targetSleepMinutes
    ) {
      setStatus(`😴 Đã ${formatClock(snap.minutes)} -> Về nhà đi ngủ qua ngày mới...`);
      await execGameAction('SLEEP_NOW');
      currentAreaIdx = 0;
      benExhaustedUntil = 0;
      seaExhaustedUntil = 0;
      farmstayCooldownUntil = 0;
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
          if (config.autoSleep && (snap.minutes || 0) < targetSleepMinutes && config.clockTurbo !== false) {
            setStatus(`⏩ Đang tua nhanh thời gian (${formatClock(snap.minutes)} ➔ ${targetTimeLabel}) để đi ngủ...`);
            await execGameAction('ADVANCE_CLOCK');
            await sleep(350);
          } else {
            setStatus('✅ Đã hoàn tất mọi việc được bật trong Nông Trại (Đang canh tự động...)');
            await sleep(1500);
          }
        }
      } else if (tab === 'benDo') {
        const res = await stepBenDoFishing(snap, config, setStatus, () => {});
        if (res.finishedArea && config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= targetSleepMinutes) {
          setStatus('🌙 Hết câu được ở Bến Đò buổi tối -> Về nhà đi ngủ...');
          await execGameAction('SLEEP_NOW');
          await sleep(1200);
        }
      } else if (tab === 'sea') {
        const res = await stepSeaFishing(snap, config, setStatus, () => {});
        if (res.finishedArea) {
          if (config.autoSleep && (config.sleepOnFishingLimit || res.lateNight || (snap.minutes || 0) >= targetSleepMinutes)) {
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
    const enabledAreas = config.areaOrder.filter((a) => a !== 'benDo' && config.areaEnabled[a]);
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
        const farmstayReady = nowMs >= farmstayCooldownUntil;
        const seaReady = nowMs >= seaExhaustedUntil && (snap.minutes || 0) < 1305;

        // Search for the next ready area among other enabled areas
        let foundReadyIdx = -1;
        for (let i = 1; i < enabledAreas.length; i++) {
          const candIdx = (currentAreaIdx + i) % enabledAreas.length;
          const candArea = enabledAreas[candIdx];
          if (candArea === 'farmstay' && farmstayReady) {
            foundReadyIdx = candIdx;
            break;
          } else if (candArea === 'sea' && seaReady) {
            foundReadyIdx = candIdx;
            break;
          }
        }

        if (foundReadyIdx !== -1) {
          currentAreaIdx = foundReadyIdx;
        } else {
          // All other areas are in cooldown / finished. Stay at Nông Trại!
          if (config.autoSleep && (snap.minutes || 0) < targetSleepMinutes && config.clockTurbo !== false) {
            setStatus(`⏩ Đang tua nhanh thời gian (${formatClock(snap.minutes)} ➔ ${targetTimeLabel}) để đi ngủ...`);
            await execGameAction('ADVANCE_CLOCK');
            await sleep(350);
          } else {
            setStatus('🌾 Đang trực tại Nông Trại (đợi các khu khác hồi sức / qua ngày)...');
            await sleep(1500);
          }
        }
      } else {
        if (!acted) {
          if (config.autoSleep && (snap.minutes || 0) < targetSleepMinutes && config.clockTurbo !== false) {
            setStatus(`⏩ Đang tua nhanh thời gian (${formatClock(snap.minutes)} ➔ ${targetTimeLabel}) để đi ngủ...`);
            await execGameAction('ADVANCE_CLOCK');
            await sleep(350);
          } else {
            setStatus('🌾 Nông Trại: Đã xong việc hiện tại...');
            await sleep(1500);
          }
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
        await sleep(1000);
        isBusy = false;
        return;
      }

      const res = await stepBenDoFishing(snap, config, setStatus, () => {});
      if (res.finishedArea) {
        if (res.exhausted) {
          benExhaustedUntil = Date.now() + 180000;
        }
        if (enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        } else if (config.autoSleep && config.sleepOnFishingLimit && (snap.minutes || 0) >= targetSleepMinutes) {
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
        await sleep(1000);
        isBusy = false;
        return;
      }

      const res = await stepSeaFishing(snap, config, setStatus, () => {});
      if (res.finishedArea) {
        if (res.exhausted) {
          seaExhaustedUntil = Date.now() + 180000;
        }
        if (config.autoSleep && (config.sleepOnFishingLimit || res.lateNight) && (snap.minutes || 0) >= targetSleepMinutes) {
          setStatus('🌙 Đã hết ngày ở Biển -> Về nhà đi ngủ qua ngày mới...');
          await execGameAction('SLEEP_NOW');
          currentAreaIdx = 0;
          benExhaustedUntil = 0;
          seaExhaustedUntil = 0;
          farmstayCooldownUntil = 0;
          await sleep(1200);
        } else if (enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        }
      }
    } else if (currentArea === 'farmstay') {
      if (enabledAreas.includes('farm') && lastFarmDoneDay !== snap.day) {
        currentAreaIdx = enabledAreas.indexOf('farm');
        isBusy = false;
        return;
      }

      if (Date.now() < farmstayCooldownUntil && enabledAreas.length > 1) {
        currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
        await sleep(1000);
        isBusy = false;
        return;
      }

      const res = await stepFarmstay(snap, config, setStatus, updateHeaderStats);
      if (res.finishedArea) {
        farmstayCooldownUntil = Date.now() + 60000;
        if (enabledAreas.length > 1) {
          currentAreaIdx = (currentAreaIdx + 1) % enabledAreas.length;
          if (snap.screen === 'farmstay') {
            await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
            await sleep(400);
          }
        } else {
          setStatus('🏡 Farmstay Ông Năm: Đã xong việc hiện tại (đang canh rau chín & khách đến...)');
          await sleep(1500);
        }
      }
    }
  } catch (err) {
    console.error('[NTG Auto] tick error:', err);
  } finally {
    isBusy = false;
  }
}
