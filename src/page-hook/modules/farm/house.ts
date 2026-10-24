import { getMainState } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { AppConfig } from '../../../shared/types/config';
import { StepResult, NOT_ACTED, formatVnd } from './types';

const DISH_NAMES: Record<string, string> = {
  comTam: 'Cơm tấm',
  eggBread: 'Bánh mì trứng',
  radishSoup: 'Canh củ cải',
  carrotJuice: 'Nước ép cà rốt',
  grilledCorn: 'Bắp nướng',
  boiledEgg: 'Trứng luộc',
  cornCake: 'Bánh bắp',
};

const DISH_LABELS: Record<string, string> = {
  comTam: 'Cơm tấm 🍛',
  eggBread: 'Bánh mì trứng 🥪',
  radishSoup: 'Canh củ cải 🍲',
  grilledCorn: 'Bắp nướng 🌽',
  boiledEgg: 'Trứng luộc 🥚',
  cornCake: 'Bánh bắp 🥮',
  carrotJuice: 'Nước ép cà rốt 🧃',
};

const LEARN_LIST = ['grilledCorn', 'carrotJuice', 'eggBread', 'comTam', 'cornCake'];

/** Primary crop per dish, so cooking never eats crops reserved for an active grocery order */
const DISH_CROP_MAP: Record<string, { crop: string; need: number }> = {
  radishSoup: { crop: 'radish', need: 3 },
  carrotJuice: { crop: 'carrot', need: 2 },
  grilledCorn: { crop: 'corn', need: 2 },
  comTam: { crop: 'rice', need: 2 },
  cornCake: { crop: 'corn', need: 2 },
};

const SHOP_FOOD_PRICES: Record<string, number> = {
  banhMiThit: 15000,
  banhMiCha: 15000,
  banhMiTrung: 10000,
  banhBao: 8000,
  banhMiFull: 25000,
};
const SHOP_FOOD_LABELS: Record<string, string> = {
  banhMiThit: 'Bánh mì thịt 🥖',
  banhMiCha: 'Bánh mì chả cá 🐟',
  banhMiTrung: 'Bánh mì trứng 🍳',
  banhBao: 'Bánh bao 🥟',
  banhMiFull: 'Bánh mì full topping 🤤',
};

const DRINK_PRICES: Record<string, number> = { traDao: 15000, traSua: 18000, nuocMia: 8000, caPheSua: 12000, traDa: 3000 };
const DRINK_LABELS: Record<string, string> = {
  nuocMia: 'Nước mía 🥤',
  traDao: 'Trà đào cam sả 🍑',
  traSua: 'Trà sữa trân châu 🧋',
  caPheSua: 'Cà phê sữa đá ☕',
  traDa: 'Trà đá 🧊',
};

function tryCook(cfg: AppConfig): StepResult | null {
  const m = getMainState();
  for (const rId of LEARN_LIST) {
    if (!m.kitchen?.known?.includes(rId) && m.learnRecipe?.(rId) === 'ok') {
      return { acted: true, msg: `📖 Đã học công thức nấu món ${DISH_NAMES[rId] || rId}` };
    }
  }

  const cur = getMainState();
  const maxSlots = (cur.houseLevel || 0) >= 1 ? 2 : 1;
  if ((cur.kitchen?.cooking?.length || 0) >= maxSlots) return null;

  const dishes = [cfg.preferDish || 'comTam', 'comTam', 'eggBread', 'radishSoup', 'carrotJuice', 'grilledCorn', 'boiledEgg', 'cornCake'];
  const seen = new Set<string>();
  for (const d of dishes) {
    if (!d || seen.has(d)) continue;
    seen.add(d);
    if (!cur.kitchen?.known?.includes(d)) continue;
    if ((cur.kitchen?.stock?.[d] || 0) >= 3) continue;

    const ing = DISH_CROP_MAP[d];
    if (ing && cur.order && cur.order.crop === ing.crop && !(cur.day === 2 && !cur.firstDay?.cooked)) {
      const have = cur.produce?.[ing.crop] || 0;
      if (have < cur.order.qty + ing.need) continue;
    }

    if (cur.cook?.(d) === 'ok') {
      return { acted: true, msg: `🍳 Đã bắc bếp nấu món ${DISH_NAMES[d] || d}` };
    }
  }
  return null;
}

function tryRecoverHunger(cfg: AppConfig, threshold: number): StepResult | null {
  const st = getMainState();
  if ((st.fullness || 0) >= threshold || !canAct('farm_eat', 3500)) return null;
  const foodSource = cfg.foodSource || 'kitchen_first';

  if (foodSource !== 'shop_only') {
    const base = ['comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg', 'cornCake', 'carrotJuice'];
    const dishOrder = cfg.preferDish && cfg.preferDish !== 'auto' ? [cfg.preferDish, ...base] : base;
    for (const d of dishOrder) {
      if ((st.kitchen?.stock?.[d] || 0) > 0 && st.eatDish?.(d) === true) {
        markActed('farm_eat');
        return { acted: true, msg: `🍲 Đã ăn ${DISH_LABELS[d] || d} trong bếp hồi Đói (${st.fullness}%)` };
      }
    }
  }

  if (foodSource !== 'kitchen_only') {
    const shopItems = [cfg.preferFoodShop || 'banhMiThit', 'banhMiThit', 'banhMiCha', 'banhMiTrung', 'banhBao', 'banhMiFull'];
    for (const item of shopItems) {
      if ((st.gold || 0) >= (SHOP_FOOD_PRICES[item] || 8000) && st.buyFood?.(item) === 'ok') {
        markActed('farm_eat');
        return { acted: true, msg: `🥖 Đã mua & ăn ${SHOP_FOOD_LABELS[item] || item} tại Tiệm bánh hồi Đói` };
      }
    }
  }
  return null;
}

function tryRecoverThirst(cfg: AppConfig, threshold: number): StepResult | null {
  const st = getMainState();
  if ((st.hydration || 0) >= threshold || !canAct('farm_drink', 3500)) return null;
  const drinkSource = cfg.drinkSource || 'kitchen_first';

  if (drinkSource !== 'shop_only') {
    for (const d of ['carrotJuice', 'radishSoup']) {
      if ((st.kitchen?.stock?.[d] || 0) > 0 && st.eatDish?.(d) === true) {
        markActed('farm_drink');
        const label = d === 'carrotJuice' ? 'Nước ép cà rốt' : 'Canh củ cải';
        return { acted: true, msg: `🧃 Đã uống ${label} giải Khát (${st.hydration}%)` };
      }
    }
  }

  const drinkOrder = [cfg.preferDrinkShop || 'nuocMia', 'nuocMia', 'traDa', 'traDao', 'traSua', 'caPheSua'];
  for (const dr of drinkOrder) {
    if ((st.gold || 0) >= (DRINK_PRICES[dr] || 3000) && st.buyFood?.(dr) === 'ok') {
      markActed('farm_drink');
      return { acted: true, msg: `🥤 Đã mua & uống ${DRINK_LABELS[dr] || dr} giải Khát` };
    }
  }
  return null;
}

export function handleHouseSubArea(cfg: AppConfig): StepResult {
  if (cfg.autoCook) {
    const cooked = tryCook(cfg);
    if (cooked) return cooked;
  }

  const thH = Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 45;
  const thT = Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 45;
  const thB = Number(cfg.batteryThreshold) || 35;

  if (cfg.autoRecoverHunger !== false) {
    const res = tryRecoverHunger(cfg, thH);
    if (res) return res;
  }

  if (cfg.autoRecoverThirst !== false) {
    const res = tryRecoverThirst(cfg, thT);
    if (res) return res;
  }

  if (cfg.autoMorningCoffee !== false) {
    const st = getMainState();
    if (st.coffeeDay !== st.day && (st.gold || 0) >= 30000 && canAct('farm_coffee', 4000) && st.buyFood?.('caPheSua') === 'ok') {
      markActed('farm_coffee');
      return { acted: true, msg: '☕ Đã uống Cà phê sữa đá (+25% nước, chạy nhanh suốt ngày)' };
    }
  }

  if (cfg.autoChargeVehicle !== false) {
    const st = getMainState();
    if (st.vehicle && (st.battery || 0) < thB && (st.gold || 0) >= 35000 && canAct('farm_vehicle', 4000)) {
      const charged = st.chargeVehicle?.();
      if (typeof charged === 'number' && charged > 0) {
        markActed('farm_vehicle');
        return { acted: true, msg: `🔋 Đã sạc đầy pin xe điện (-${formatVnd(charged)}đ)` };
      }
    }
  }

  if (getMainState().salonOpen) {
    if (cfg.autoSalonShampoo !== false) {
      const st = getMainState();
      const hasRelax = (st.kitchen?.buffs || []).some((b) => b.kind === 'relax' && b.day === st.day);
      if (!hasRelax && (st.gold || 0) >= 150000 && st.shampoo?.() === 'ok') {
        return { acted: true, msg: '💆 Đã ghé Chị Linh Tây gội đầu dưỡng sinh (Buff thư giãn)' };
      }
    }
    if (cfg.autoSalonWhiten) {
      const st = getMainState();
      if ((st.player?.outfit?.tan || 0) > 0 && (st.gold || 0) >= 300000 && st.whiten?.() === 'ok') {
        return { acted: true, msg: '✨ Đã ghé Chị Linh Tây tắm trắng nâng tông da' };
      }
    }
  }

  return NOT_ACTED;
}
