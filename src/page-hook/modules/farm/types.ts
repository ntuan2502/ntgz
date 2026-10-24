import { setMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { MainGameStoreState } from '../../../shared/types/game-store';

export interface StepResult {
  acted: boolean;
  msg?: string;
}

export const NOT_ACTED: StepResult = { acted: false };

export const CROP_NAMES: Record<string, string> = {
  radish: 'Củ cải',
  carrot: 'Cà rốt',
  corn: 'Bắp ngô',
  rice: 'Lúa thơm',
  egg: 'Trứng gà',
};

export const formatVnd = (n: number): string => n.toLocaleString('vi-VN');

let farmUiTimer: ReturnType<typeof setTimeout> | null = null;

export function showFarmActionUI(
  cfg: AppConfig,
  uiState: Partial<MainGameStoreState>,
  durationMs = 1200
): void {
  if (!cfg.showFullActions) return;
  if (farmUiTimer) {
    clearTimeout(farmUiTimer);
    farmUiTimer = null;
  }
  setMainState({
    panel: null,
    vendor: null,
    shop: null,
    ...uiState,
  });
  farmUiTimer = setTimeout(() => {
    setMainState({ panel: null, vendor: null, shop: null });
    farmUiTimer = null;
  }, durationMs);
}
