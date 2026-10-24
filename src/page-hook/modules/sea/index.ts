import { stores, getActiveScene } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig } from '../../../shared/types/config';

const SEA_DISH_NAMES: Record<string, string> = {
  radishSoup: 'Canh củ cải 🍲',
  boiledEgg: 'Trứng luộc 🥚',
  grilledCorn: 'Bắp nướng mỡ hành 🌽',
  carrotJuice: 'Nước ép cà rốt 🧃',
  eggBread: 'Bánh mì ốp la 🥪',
  comTam: 'Cơm tấm ốp la 🍛',
  cornCake: 'Bánh bắp nướng 🥮',
};

const SEA_SPOT_NAMES: Record<string, string> = {
  pier: '🌉 Cầu tàu',
  rocks: '🪨 Bãi đá',
  beach: '🏖️ Mép bãi cát',
};

let keepSeaPanelUntil = 0;

export function execSeaStep(cfg: AppConfig): { acted: boolean; msg?: string } {
  const mainStore = stores.main;
  const seaStore = stores.sea;
  if (!mainStore || !seaStore) return { acted: false };

  const m = mainStore.getState();
  const s = seaStore.getState();
  if (m.screen !== 'sea') return { acted: false };

  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  const seaScene = getActiveScene('SeaScene');

  const showSeaPanelIfEnabled = (panelName: string, holdMs = 1400) => {
    if (cfg.showFullActions) {
      seaStore.setState({ panel: panelName });
      keepSeaPanelUntil = Date.now() + holdMs;
    }
  };

  // 1. Buy rod if rod === 0
  if ((m.fishing?.rod || 0) === 0 && (m.gold || 0) >= 15000) {
    if (m.buyRod?.() === true) {
      showSeaPanelIfEnabled('shop');
      return { acted: true, msg: '🎣 Đã mua Cần câu tại Chòi Ông Tư (-15.000đ)' };
    }
  }

  // 2. Sell basket if >= threshold
  const sellMin = (m.minutes || 0) >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
  if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
    const count = m.fishing?.basket?.length || 0;
    const earned = m.sellBasket?.();
    if (typeof earned === 'number' && earned > 0) {
      showSeaPanelIfEnabled('shop');
      return { acted: true, msg: `🐟 Đã bán ${count} hải sản ở Biển cho Ông Tư (+${earned.toLocaleString('vi-VN')}đ)` };
    }
  }

  // 3. Claim Dex reward if available
  if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
    showSeaPanelIfEnabled('dex');
    return { acted: true, msg: '📖 Đã nhận thưởng Sổ cá Bách khoa Ông Tư' };
  }

  // 4. Buy bait if out of bait
  const curM = mainStore.getState();
  const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
  if (cfg.seaAutoBuyBait !== false && totalBait <= 0) {
    const pref = cfg.seaPreferBait || 'worm';
    const packs = Number(cfg.seaBaitPacks) || 2;
    if (curM.buyBait?.(pref, packs) === true) {
      showSeaPanelIfEnabled('shop');
      return {
        acted: true,
        msg: `🪱 Đã mua ${packs} gói ${pref === 'shrimp' ? 'Mồi tôm 🦐' : 'Mồi trùn 🪱'} tại Chòi Ông Tư`,
      };
    } else if (curM.buyBait?.('worm', 1) === true) {
      showSeaPanelIfEnabled('shop');
      return { acted: true, msg: `🪱 Đã mua 1 gói Mồi trùn tại Chòi Ông Tư` };
    }
  }

  // 5. Select preferred bait chip
  const curM2 = mainStore.getState();
  if (cfg.seaPreferBait === 'shrimp' && (curM2.fishing?.bait?.shrimp || 0) > 0 && !curM2.fishing?.useShrimp) {
    curM2.setUseShrimp?.(true);
  } else if (cfg.seaPreferBait === 'worm' && (curM2.fishing?.bait?.worm || 0) > 0 && curM2.fishing?.useShrimp) {
    curM2.setUseShrimp?.(false);
  }

  // 6. Recover hunger/thirst at Sea (castLine fails with 'tired' when fullness or hydration hits 0)
  if (cfg.seaAutoEat !== false) {
    const seaHungerTh = Math.max(20, Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 35);
    const seaThirstTh = Math.max(20, Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 35);

    const stT = mainStore.getState();
    if ((stT.hydration || 0) < seaThirstTh && canAct('sea_drink', 3500)) {
      for (const d of ['carrotJuice', 'radishSoup']) {
        if ((stT.kitchen?.stock?.[d] || 0) > 0 && stT.eatDish?.(d) === true) {
          markActed('sea_drink');
          return { acted: true, msg: `🧃 Đã uống ${SEA_DISH_NAMES[d] || d} giải khát tại Biển` };
        }
      }
      const drinks: Array<{ id: string; price: number; msg: string }> = [
        { id: 'nuocDua', price: 15000, msg: '🥥 Đã mua & uống Nước dừa tươi tại Biển hồi khát (-15.000đ)' },
        { id: 'nuocMia', price: 8000, msg: '🥤 Đã mua & uống Nước mía tại Biển hồi khát (-8.000đ)' },
        { id: 'traDa', price: 3000, msg: '🧊 Đã mua & uống Trà đá tại Biển hồi khát (-3.000đ)' },
      ];
      for (const dr of drinks) {
        if ((mainStore.getState().gold || 0) >= dr.price && mainStore.getState().buyFood?.(dr.id) === 'ok') {
          markActed('sea_drink');
          showSeaPanelIfEnabled('coconut');
          return { acted: true, msg: dr.msg };
        }
      }
    }

    const stH = mainStore.getState();
    if ((stH.fullness || 0) < seaHungerTh && canAct('sea_eat', 3500)) {
      for (const d of Object.keys(stH.kitchen?.stock || {})) {
        if ((stH.kitchen?.stock?.[d] || 0) > 0 && stH.eatDish?.(d) === true) {
          markActed('sea_eat');
          return { acted: true, msg: `🍲 Đã ăn ${SEA_DISH_NAMES[d] || d} mang theo hồi sức tại Biển` };
        }
      }
      if ((stH.gold || 0) >= 15000 && stH.buyFood?.('banhMiThit') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥖 Đã mua & ăn Bánh mì thịt tại Biển hồi đói (-15.000đ)' };
      }
      if ((mainStore.getState().gold || 0) >= 8000 && mainStore.getState().buyFood?.('banhBao') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥟 Đã mua & ăn Bánh bao tại Biển hồi đói (-8.000đ)' };
      }
    }
  }

  // 7. Close shop/dex panel if open while idle (once hold duration expires)
  if (s.panel && s.phase === 'idle' && (!cfg.showFullActions || Date.now() >= keepSeaPanelUntil)) {
    seaStore.setState({ panel: null });
  }

  // 8. Walk to selected spot
  if (cfg.seaAutoSpot !== false && s.phase === 'idle' && !s.walking) {
    const targetSpot = cfg.seaSpot || 'pier';
    const spotLabel = SEA_SPOT_NAMES[targetSpot] || targetSpot;
    if (s.spot !== targetSpot) {
      const spotCoords: Record<string, { x: number; y: number }> = {
        pier: { x: 24, y: 4 },
        rocks: { x: 41, y: 9 },
        beach: { x: 20, y: 14 },
      };
      const coord = spotCoords[targetSpot] || spotCoords.pier;
      if (seaScene && typeof (seaScene as unknown as Record<string, (c: { x: number; y: number }) => void>).goFarmer === 'function') {
        (seaScene as unknown as Record<string, (c: { x: number; y: number }) => void>).goFarmer(coord);
        return { acted: true, msg: `🚶 Đang đi ra vị trí câu (${spotLabel})...` };
      } else {
        seaStore.setState({ spot: targetSpot, walking: false });
        return { acted: true, msg: `📍 Đã chọn vị trí câu (${spotLabel})` };
      }
    }
  }

  return { acted: false };
}
