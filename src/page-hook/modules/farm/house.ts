import { getMainState } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { AppConfig } from '../../../shared/types/config';

export function handleHouseSubArea(cfg: AppConfig): { acted: boolean; msg?: string } {
  const m = getMainState();
  if (!m) return { acted: false };

  // Auto-learn recipes & Cook in kitchen if enabled
  if (cfg.autoCook) {
    const dishNames: Record<string, string> = {
      comTam: 'Cơm tấm',
      eggBread: 'Bánh mì trứng',
      radishSoup: 'Canh củ cải',
      carrotJuice: 'Nước ép cà rốt',
      grilledCorn: 'Bắp nướng',
      boiledEgg: 'Trứng luộc',
      cornCake: 'Bánh bắp',
    };
    const learnList = ['grilledCorn', 'carrotJuice', 'eggBread', 'comTam', 'cornCake'];
    for (const rId of learnList) {
      if (!m.kitchen?.known?.includes(rId) && m.learnRecipe?.(rId) === 'ok') {
        return { acted: true, msg: `📖 Đã học công thức nấu món ${dishNames[rId] || rId}` };
      }
    }

    const priorityDish = cfg.preferDish || 'auto';
    const cookList =
      priorityDish !== 'auto'
        ? [priorityDish]
        : ['comTam', 'eggBread', 'radishSoup', 'carrotJuice', 'grilledCorn', 'boiledEgg'];

    const recipeCost: Record<string, { crop?: string; qty?: number; egg?: number }> = {
      boiledEgg: { egg: 1 },
      grilledCorn: { crop: 'corn', qty: 1 },
      carrotJuice: { crop: 'carrot', qty: 2 },
      radishSoup: { crop: 'radish', qty: 2 },
      eggBread: { egg: 1, crop: 'radish', qty: 1 },
      cornCake: { crop: 'corn', qty: 2, egg: 1 },
      comTam: { crop: 'rice', qty: 1, egg: 1 },
    };

    for (const rId of cookList) {
      const cost = recipeCost[rId];
      if (!cost) continue;
      const curStock = m.kitchen?.stock?.[rId] || 0;
      if (curStock >= 5) continue;

      let canCook = true;
      if (cost.egg) {
        const haveEggs = (m.eggs || 0) + (m.produce?.egg || 0);
        if (haveEggs < cost.egg) canCook = false;
      }
      if (cost.crop && cost.qty) {
        const haveCrop = m.produce?.[cost.crop] || 0;
        if (haveCrop < cost.qty) canCook = false;
      }

      if (canCook && m.cook?.(rId) === 'ok') {
        return { acted: true, msg: `🍳 Đã nấu thành công món ${dishNames[rId] || rId} trong Bếp` };
      }
    }
  }

  // Recover Hunger
  const hungerTh = Number(cfg.hungerThreshold) || 45;
  if (cfg.autoRecoverHunger !== false && (m.fullness || 0) < hungerTh && canAct('recover_hunger', 3500)) {
    const curM = getMainState();

    if (cfg.foodSource !== 'shop_only') {
      const eatOrder =
        cfg.preferDish && cfg.preferDish !== 'auto'
          ? [cfg.preferDish, 'comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg']
          : ['comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg'];

      for (const d of eatOrder) {
        if ((curM.kitchen?.stock?.[d] || 0) > 0 && curM.eat?.(d) === 'ok') {
          markActed('recover_hunger');
          return { acted: true, msg: `🍲 Đã ăn ${d} từ Bếp hồi phục Đói (+Fullness)` };
        }
      }
    }

    if (cfg.foodSource !== 'kitchen_only') {
      const shopFood = cfg.preferFoodShop || 'banhMiThit';
      const prices: Record<string, number> = {
        banhBao: 8000,
        banhMiTrung: 10000,
        banhMiThit: 15000,
        banhMiCha: 15000,
        banhMiFull: 25000,
      };
      const price = prices[shopFood] || 15000;
      if ((curM.gold || 0) >= price && curM.buyFood?.(shopFood) === 'ok') {
        markActed('recover_hunger');
        return { acted: true, msg: `🥖 Đã mua & ăn ${shopFood} tại Tiệm bánh hồi phục Đói` };
      }
    }
  }

  // Recover Thirst
  const thirstTh = Number(cfg.thirstThreshold) || 45;
  if (cfg.autoRecoverThirst !== false && (m.hydration || 0) < thirstTh && canAct('recover_thirst', 3500)) {
    const curM = getMainState();
    if (cfg.drinkSource !== 'shop_only') {
      if ((curM.kitchen?.stock?.carrotJuice || 0) > 0 && curM.drink?.('carrotJuice') === 'ok') {
        markActed('recover_thirst');
        return { acted: true, msg: `🧃 Đã uống Nước ép cà rốt từ Bếp hồi phục Khát (+Hydration)` };
      }
    }

    if (cfg.drinkSource !== 'kitchen_first') {
      const shopDrink = cfg.preferDrinkShop || 'nuocMia';
      const prices: Record<string, number> = {
        traDa: 3000,
        nuocMia: 8000,
        caPheSua: 12000,
        traDao: 15000,
        traSua: 18000,
      };
      const price = prices[shopDrink] || 8000;
      if ((curM.gold || 0) >= price && curM.buyFood?.(shopDrink) === 'ok') {
        markActed('recover_thirst');
        return { acted: true, msg: `🥤 Đã mua & uống ${shopDrink} tại Tiệm giải khát hồi phục Khát` };
      }
    }
  }

  // Morning Coffee Speed Buff
  if (cfg.autoMorningCoffee !== false && canAct('morning_coffee', 10000)) {
    const curM = getMainState();
    const hasCoffeeBuff = (curM.kitchen?.buffs || []).some(
      (b: { kind?: string; day?: number }) => b.kind === 'coffee' && b.day === curM.day
    );
    if (!hasCoffeeBuff && (curM.gold || 0) >= 12000 && curM.buyFood?.('caPheSua') === 'ok') {
      markActed('morning_coffee');
      return { acted: true, msg: `☕ Đã uống Cà phê sáng (+50% tốc độ chạy toàn ngày)` };
    }
  }

  // Charge EV Vehicle
  const batTh = Number(cfg.batteryThreshold) || 35;
  if (cfg.autoChargeVehicle !== false && canAct('charge_vehicle', 5000)) {
    const curM = getMainState();
    const vehicleBat = typeof curM.vehicle === 'object' && curM.vehicle !== null ? curM.vehicle.battery : curM.battery;
    if (typeof vehicleBat === 'number' && vehicleBat < batTh) {
      if ((curM.gold || 0) >= 5000 && curM.chargeVehicle?.() === 'ok') {
        markActed('charge_vehicle');
        return { acted: true, msg: `🔋 Đã sạc đầy pin cho Xe máy điện EV` };
      }
    }
  }

  // Salon Spa
  if (m.salonOpen) {
    if (cfg.autoSalonShampoo !== false) {
      const stSal = getMainState();
      const hasRelax = (stSal.kitchen?.buffs || []).some((b: { kind?: string; day?: number }) => b.kind === 'relax' && b.day === stSal.day);
      if (!hasRelax && (stSal.gold || 0) >= 150000 && stSal.shampoo?.() === 'ok') {
        return { acted: true, msg: `💆 Đã ghé Chị Linh Tây gội đầu dưỡng sinh (Buff thư giãn)` };
      }
    }
    if (cfg.autoSalonWhiten) {
      const stW = getMainState();
      if ((stW.player?.outfit?.tan || 0) > 0 && (stW.gold || 0) >= 300000 && stW.whiten?.() === 'ok') {
        return { acted: true, msg: `✨ Đã ghé Chị Linh Tây tắm trắng nâng tông da` };
      }
    }
  }

  return { acted: false };
}
