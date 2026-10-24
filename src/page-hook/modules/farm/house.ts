import { stores } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';

export function handleHouseSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
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

    const curM = stores.main.getState();
    const maxSlots = (curM.houseLevel || 0) >= 1 ? 2 : 1;
    const cookingNow = curM.kitchen?.cooking?.length || 0;

    if (cookingNow < maxSlots) {
      const dishes = [
        cfg.preferDish || 'comTam',
        'comTam',
        'eggBread',
        'radishSoup',
        'carrotJuice',
        'grilledCorn',
        'boiledEgg',
        'cornCake',
      ];
      const dishCropMap: Record<string, { crop: string; need: number }> = {
        radishSoup: { crop: 'radish', need: 3 },
        carrotJuice: { crop: 'carrot', need: 2 },
        grilledCorn: { crop: 'corn', need: 2 },
        comTam: { crop: 'rice', need: 2 },
        cornCake: { crop: 'corn', need: 2 },
      };
      const seen = new Set<string>();
      for (const d of dishes) {
        if (!d || seen.has(d)) continue;
        seen.add(d);
        if (!curM.kitchen?.known?.includes(d)) continue;
        if ((curM.kitchen?.stock?.[d] || 0) >= 3) continue;

        // Reserve crops for active grocery order if needed
        const ing = dishCropMap[d];
        if (ing && curM.order && curM.order.crop === ing.crop && !(curM.day === 2 && !curM.firstDay?.cooked)) {
          const have = curM.produce?.[ing.crop] || 0;
          if (have < curM.order.qty + ing.need) continue;
        }

        if (curM.cook?.(d) === 'ok') {
          return { acted: true, msg: `🍳 Đã bắc bếp nấu món ${dishNames[d] || d}` };
        }
      }
    }
  }

  const thH = Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 45;
  const thT = Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 45;
  const thB = Number(cfg.batteryThreshold) || 35;

  // Unbundled Need 1: Recover Hunger
  if (cfg.autoRecoverHunger !== false && cfg.autoRecoverNeeds !== false) {
    const stH = stores.main.getState();
    if (stH.fullness < thH && canAct('farm_eat', 3500)) {
      const foodSource = cfg.foodSource || 'kitchen_first';

      // A. Try Kitchen pantry / warehouse if permitted
      if (foodSource !== 'shop_only') {
        const dishOrder =
          cfg.preferDish && cfg.preferDish !== 'auto'
            ? [cfg.preferDish, 'comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg', 'cornCake', 'carrotJuice']
            : ['comTam', 'eggBread', 'radishSoup', 'grilledCorn', 'boiledEgg', 'cornCake', 'carrotJuice'];
        const dishLabels: Record<string, string> = {
          comTam: 'Cơm tấm 🍛',
          eggBread: 'Bánh mì trứng 🥪',
          radishSoup: 'Canh củ cải 🍲',
          grilledCorn: 'Bắp nướng 🌽',
          boiledEgg: 'Trứng luộc 🥚',
          cornCake: 'Bánh bắp 🥮',
          carrotJuice: 'Nước ép cà rốt 🧃',
        };
        for (const d of dishOrder) {
          if ((stH.kitchen?.stock?.[d] || 0) > 0 && stH.eatDish?.(d) === true) {
            markActed('farm_eat');
            return { acted: true, msg: `🍲 Đã ăn ${dishLabels[d] || d} trong bếp hồi Đói (${stH.fullness}%)` };
          }
        }
      }

      // B. Try Bakery shop if permitted & kitchen didn't satisfy
      if (foodSource !== 'kitchen_only') {
        const prefShop = cfg.preferFoodShop || 'banhMiThit';
        const shopItems = [prefShop, 'banhMiThit', 'banhMiCha', 'banhMiTrung', 'banhBao', 'banhMiFull'];
        const prices: Record<string, number> = { banhMiThit: 15000, banhMiCha: 15000, banhMiTrung: 10000, banhBao: 8000, banhMiFull: 25000 };
        const shopLabels: Record<string, string> = {
          banhMiThit: 'Bánh mì thịt 🥖',
          banhMiCha: 'Bánh mì chả cá 🐟',
          banhMiTrung: 'Bánh mì trứng 🍳',
          banhBao: 'Bánh bao 🥟',
          banhMiFull: 'Bánh mì full topping 🤤',
        };
        for (const item of shopItems) {
          if (stH.gold >= (prices[item] || 8000) && stH.buyFood?.(item) === 'ok') {
            markActed('farm_eat');
            return { acted: true, msg: `🥖 Đã mua & ăn ${shopLabels[item] || item} tại Tiệm bánh hồi Đói` };
          }
        }
      }
    }
  }

  // Unbundled Need 2: Recover Thirst
  if (cfg.autoRecoverThirst !== false && cfg.autoRecoverNeeds !== false) {
    const stT = stores.main.getState();
    if (stT.hydration < thT && canAct('farm_drink', 3500)) {
      const drinkSource = cfg.drinkSource || 'kitchen_first';

      // A. Try kitchen drinks if permitted
      if (drinkSource !== 'shop_only') {
        for (const d of ['carrotJuice', 'radishSoup']) {
          if ((stT.kitchen?.stock?.[d] || 0) > 0 && stT.eatDish?.(d) === true) {
            markActed('farm_drink');
            return { acted: true, msg: `🧃 Đã uống ${d === 'carrotJuice' ? 'Nước ép cà rốt' : 'Canh củ cải'} giải Khát (${stT.hydration}%)` };
          }
        }
      }

      // B. Try Drink Shop
      if (drinkSource !== 'kitchen_only') {
        const prefDrink = cfg.preferDrinkShop || 'nuocMia';
        const drinkPrices: Record<string, number> = { traDao: 15000, traSua: 18000, nuocMia: 8000, caPheSua: 12000, traDa: 3000 };
        const drinkLabels: Record<string, string> = {
          nuocMia: 'Nước mía 🥤',
          traDao: 'Trà đào cam sả 🍑',
          traSua: 'Trà sữa trân châu 🧋',
          caPheSua: 'Cà phê sữa đá ☕',
          traDa: 'Trà đá 🧊',
        };
        const drinkOrder = [prefDrink, 'nuocMia', 'traDa', 'traDao', 'traSua', 'caPheSua'];
        for (const dr of drinkOrder) {
          if (stT.gold >= (drinkPrices[dr] || 3000) && stT.buyFood?.(dr) === 'ok') {
            markActed('farm_drink');
            return { acted: true, msg: `🥤 Đã mua & uống ${drinkLabels[dr] || dr} giải Khát` };
          }
        }
      }
    }
  }

  // Unbundled Need 3: Morning Coffee
  if (cfg.autoMorningCoffee !== false && cfg.autoRecoverNeeds !== false) {
    const stC = stores.main.getState();
    if (stC.coffeeDay !== stC.day && stC.gold >= 30000 && canAct('farm_coffee', 4000) && stC.buyFood?.('caPheSua') === 'ok') {
      markActed('farm_coffee');
      return { acted: true, msg: `☕ Đã uống Cà phê sữa đá (+25% nước, chạy nhanh suốt ngày)` };
    }
  }

  // Unbundled Need 4: EV Vehicle Charging
  if (cfg.autoChargeVehicle !== false && cfg.autoRecoverNeeds !== false) {
    const stE = stores.main.getState();
    if (stE.vehicle && stE.battery < thB && stE.gold >= 35000 && canAct('farm_vehicle', 4000)) {
      const charged = stE.chargeVehicle?.();
      if (typeof charged === 'number' && charged > 0) {
        markActed('farm_vehicle');
        return { acted: true, msg: `🔋 Đã sạc đầy pin xe điện (-${charged.toLocaleString('vi-VN')}đ)` };
      }
    }
  }

  // NPC Feature: Chị Linh Tây Tiệm Tóc & Spa
  if (m.salonOpen) {
    if (cfg.autoSalonShampoo !== false) {
      const stSal = stores.main.getState();
      const hasRelax = (stSal.kitchen?.buffs || []).some((b: any) => b.kind === 'relax' && b.day === stSal.day);
      if (!hasRelax && stSal.gold >= 150000 && stSal.shampoo?.() === 'ok') {
        return { acted: true, msg: `💆 Đã ghé Chị Linh Tây gội đầu dưỡng sinh (Buff thư giãn)` };
      }
    }
    if (cfg.autoSalonWhiten) {
      const stW = stores.main.getState();
      if ((stW.player?.outfit?.tan || 0) > 0 && stW.gold >= 300000 && stW.whiten?.() === 'ok') {
        return { acted: true, msg: `✨ Đã ghé Chị Linh Tây tắm trắng nâng tông da` };
      }
    }
  }

  return { acted: false };
}
