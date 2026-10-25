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

export const DISH_NAMES: Record<string, string> = {
  radishSoup: 'Canh củ cải',
  boiledEgg: 'Trứng luộc',
  grilledCorn: 'Bắp nướng mỡ hành',
  carrotJuice: 'Nước ép cà rốt',
  eggBread: 'Bánh mì ốp la',
  comTam: 'Cơm tấm ốp la',
  cornCake: 'Bánh bắp nướng',
};

export const DISH_LABELS: Record<string, string> = {
  radishSoup: 'Canh củ cải 🍲',
  boiledEgg: 'Trứng luộc 🥚',
  grilledCorn: 'Bắp nướng mỡ hành 🌽',
  carrotJuice: 'Nước ép cà rốt 🧃',
  eggBread: 'Bánh mì ốp la 🥪',
  comTam: 'Cơm tấm ốp la 🍛',
  cornCake: 'Bánh bắp nướng 🥮',
};

export const PET_FOOD_NAMES: Record<string, string> = {
  xuong: 'Xương gặm 🦴',
  cakho: 'Cá khô 🐟',
  pate: 'Pate cá ngừ 🥫',
  hat: 'Hạt tổng hợp 🥣',
  coKho: 'Cỏ khô 🌿',
  cam: 'Cám heo 🌾',
  'crop:carrot': 'Cà rốt 🥕',
  'crop:corn': 'Bắp ngô 🌽',
  'crop:radish': 'Củ cải 🌱',
};

export const POND_FISH_NAMES: Record<string, string> = {
  chep: 'Cá chép',
  tre: 'Cá trê',
  ro: 'Cá rô đồng',
};

export const GOLD_NAMES: Record<string, string> = {
  mieng: 'Vàng miếng 9999',
  nhan: 'Nhẫn trơn 9999',
  k18: 'Vàng 18K',
  non: 'Vàng non 10K',
};

export const SHOP_FOOD_NAMES: Record<string, string> = {
  banhBao: 'Bánh bao 🥟',
  banhMiTrung: 'Bánh mì trứng 🍳',
  banhMiThit: 'Bánh mì thịt 🥖',
  banhMiCha: 'Bánh mì chả cá 🐟',
  banhMiFull: 'Bánh mì full topping 🤤',
};

export const SHOP_DRINK_NAMES: Record<string, string> = {
  traDa: 'Trà đá 🧊',
  nuocMia: 'Nước mía 🥤',
  caPheSua: 'Cà phê sữa đá ☕',
  traDao: 'Trà đào cam sả 🍑',
  traSua: 'Trà sữa trân châu 🧋',
};

/** Formats any item or crop ID into friendly Vietnamese name */
export function getItemLabel(id: string): string {
  return (
    DISH_NAMES[id] ||
    CROP_NAMES[id] ||
    PET_FOOD_NAMES[id] ||
    POND_FISH_NAMES[id] ||
    GOLD_NAMES[id] ||
    SHOP_FOOD_NAMES[id] ||
    SHOP_DRINK_NAMES[id] ||
    id
  );
}

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
