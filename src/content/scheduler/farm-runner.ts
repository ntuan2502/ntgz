import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { SUBAREA_META } from '../../shared/constants/default-config';
import { execGameAction, getGameState } from '../bridge/content-bridge';
import { sleep } from './dom-helpers';

export let lastFarmDoneDay = -1;
export let lastFarmRunAt = 0;

export function resetFarmTiming(): void {
  lastFarmDoneDay = -1;
  lastFarmRunAt = 0;
}

export async function runFarmSubAreas(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  updateHeaderStats: (snap: GameSnapshot) => void
): Promise<boolean> {
  const switchDelayMs = Math.max(150, Number(config.taskDelayMs) || 650);
  const repeatDelayMs = Math.max(0, Number(config.actionRepeatDelayMs ?? 100));

  // Ensure player is at Farm ('playing')
  if (snap.screen !== 'playing') {
    setStatus('🚜 Đang quay về Nông Trại...');
    await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
    await sleep(switchDelayMs);
    return true;
  }

  // Leave house if indoors before doing outdoor tasks
  if (snap.indoors) {
    await execGameAction('NAVIGATE', { target: 'playing', indoors: false });
    await sleep(Math.min(400, switchDelayMs));
  }

  let anyActed = false;

  for (const subId of config.farmSubOrder) {
    if (!config.running) break;
    if (!config.farmSubEnabled[subId]) continue;

    const meta = SUBAREA_META[subId];
    let stepSafety = 0;
    let subAreaActed = false;

    while (config.running && stepSafety < 50) {
      stepSafety++;
      const res = await execGameAction('FARM_SUBAREA_STEP', {
        subAreaId: subId,
        config,
      });

      if (res && res.ok && res.acted) {
        anyActed = true;
        subAreaActed = true;
        setStatus(res.msg || `${meta.icon} Đang xử lý ${meta.name}...`);
        if (repeatDelayMs > 0) {
          await sleep(repeatDelayMs);
        }
        const fresh = await getGameState();
        if (fresh && fresh.ok) {
          updateHeaderStats(fresh);
        }
      } else {
        if (res && !res.ok) {
          console.warn(`[Farm Runner] subArea "${subId}" step error:`, res.error);
        }
        break;
      }
    }

    // Delay between switching different sub-areas
    if (subAreaActed && switchDelayMs > 0) {
      await sleep(switchDelayMs);
    }
  }

  lastFarmDoneDay = snap.day ?? 0;
  lastFarmRunAt = Date.now();
  return anyActed;
}
