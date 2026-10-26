import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { execGameAction, getGameState } from '../bridge/content-bridge';
import { sleep } from './dom-helpers';

export let lastFarmstayDoneDay = -1;
export let lastFarmstayRunAt = 0;

export function resetFarmstayTiming(): void {
  lastFarmstayDoneDay = -1;
  lastFarmstayRunAt = 0;
}

export interface FarmstayStepResult {
  finishedArea: boolean;
  acted: boolean;
}

export async function stepFarmstay(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  updateHeaderStats?: (snap: GameSnapshot) => void
): Promise<FarmstayStepResult> {
  const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

  // If not currently in Farmstay screen, navigate there
  if (snap.screen !== 'farmstay') {
    setStatus('🏡 Đang ghé thăm Farmstay Ông Năm...');
    await execGameAction('NAVIGATE', { target: 'farmstay' });
    await sleep(delayMs);
    const fresh = await getGameState();
    if (fresh && fresh.ok && updateHeaderStats) {
      updateHeaderStats(fresh);
    }
    return { finishedArea: false, acted: true };
  }

  let anyActed = false;
  let safetyCount = 0;

  // Process all available farmstay tasks sequentially
  while (config.running && safetyCount < 30) {
    safetyCount++;
    const res = await execGameAction('FARMSTAY_STEP', { config });

    if (res && res.ok && res.acted) {
      anyActed = true;
      setStatus(res.msg || '🏡 Đang xử lý hoạt động Farmstay Ông Năm...');
      await sleep(delayMs);

      const fresh = await getGameState();
      if (fresh && fresh.ok && updateHeaderStats) {
        updateHeaderStats(fresh);
      }
    } else {
      if (res && !res.ok) {
        console.warn('[Farmstay Runner] FARMSTAY_STEP error:', res.error);
      }
      break;
    }
  }

  lastFarmstayDoneDay = snap.day ?? 0;
  lastFarmstayRunAt = Date.now();

  return { finishedArea: true, acted: anyActed };
}
