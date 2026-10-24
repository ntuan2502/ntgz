import { stores, getActiveScene } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';

export function execSeaStep(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  const s = stores.sea?.getState();
  if (!m || !s || m.screen !== 'sea') return { acted: false };

  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  const seaScene = getActiveScene('SeaScene');

  // 1. Buy rod if rod === 0
  if ((m.fishing?.rod || 0) === 0 && m.gold >= 15000) {
    if (m.buyRod?.() === true) {
      return { acted: true, msg: '🎣 Đã mua Cần câu tại Chòi Ông Tư' };
    }
  }

  // 2. Sell basket if >= threshold
  const sellMin = m.minutes >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
  if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
    const count = m.fishing.basket.length;
    const earned = m.sellBasket?.();
    if (typeof earned === 'number' && earned > 0) {
      return { acted: true, msg: `💰 Đã bán ${count} cá ở Biển (+${earned.toLocaleString('vi-VN')}đ)` };
    }
  }

  // 3. Claim Dex reward if available
  if (cfg.seaAutoClaimDex !== false && m.claimDexReward?.() === true) {
    return { acted: true, msg: '📖 Đã nhận thưởng Sổ cá Ông Tư' };
  }

  // 4. Buy bait if out of bait
  const curM = stores.main.getState();
  const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
  if (cfg.seaAutoBuyBait !== false && totalBait <= 0) {
    const pref = cfg.seaPreferBait || 'worm';
    const packs = Number(cfg.seaBaitPacks) || 2;
    if (curM.buyBait?.(pref, packs) === true) {
      return { acted: true, msg: `🪱 Đã mua ${packs} gói mồi ${pref === 'shrimp' ? 'Tôm' : 'Giun'}` };
    } else if (curM.buyBait?.('worm', 1) === true) {
      return { acted: true, msg: `🪱 Đã mua 1 gói mồi Giun` };
    }
  }

  // 5. Select preferred bait chip
  const curM2 = stores.main.getState();
  if (cfg.seaPreferBait === 'shrimp' && (curM2.fishing?.bait?.shrimp || 0) > 0 && !curM2.fishing.useShrimp) {
    curM2.setUseShrimp?.(true);
  } else if (cfg.seaPreferBait === 'worm' && (curM2.fishing?.bait?.worm || 0) > 0 && curM2.fishing.useShrimp) {
    curM2.setUseShrimp?.(false);
  }

  // 6. Recover hunger/thirst at Sea
  const seaHungerTh = Math.max(20, Number(cfg.hungerThreshold) || Number(cfg.needThreshold) || 35);
  const seaThirstTh = Math.max(20, Number(cfg.thirstThreshold) || Number(cfg.needThreshold) || 35);
  if (cfg.seaAutoEat !== false) {
    if (curM2.hydration < seaThirstTh && canAct('sea_drink', 3500)) {
      for (const d of ['carrotJuice', 'radishSoup']) {
        if ((curM2.kitchen?.stock?.[d] || 0) > 0 && curM2.eatDish?.(d) === true) {
          markActed('sea_drink');
          return { acted: true, msg: `🧃 Đã uống ${d === 'carrotJuice' ? 'Nước ép cà rốt' : 'Canh củ cải'} giải khát tại Biển` };
        }
      }
      if (curM2.gold >= 15000 && curM2.buyFood?.('nuocDua') === 'ok') {
        markActed('sea_drink');
        return { acted: true, msg: '🥥 Đã uống Nước dừa tươi tại Biển hồi khát' };
      }
      if (curM2.gold >= 8000 && curM2.buyFood?.('nuocMia') === 'ok') {
        markActed('sea_drink');
        return { acted: true, msg: '🥤 Đã uống Nước mía tại Biển hồi khát' };
      }
      if (curM2.gold >= 3000 && curM2.buyFood?.('traDa') === 'ok') {
        markActed('sea_drink');
        return { acted: true, msg: '🧊 Đã uống Trà đá tại Biển hồi khát' };
      }
    }

    const curM3 = stores.main.getState();
    if (curM3.fullness < seaHungerTh && canAct('sea_eat', 3500)) {
      for (const d of Object.keys(curM3.kitchen?.stock || {})) {
        if ((curM3.kitchen.stock[d] || 0) > 0 && curM3.eatDish?.(d) === true) {
          markActed('sea_eat');
          return { acted: true, msg: '🍲 Đã ăn món mang theo hồi sức tại Biển' };
        }
      }
      if (curM3.gold >= 15000 && curM3.buyFood?.('banhMiThit') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥖 Đã ăn Bánh mì tại Biển hồi đói' };
      }
      if (curM3.gold >= 8000 && curM3.buyFood?.('banhBao') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥟 Đã ăn Bánh bao tại Biển hồi đói' };
      }
    }
  }

  // 7. Close shop/dex panel if open while idle
  if (s.panel && s.phase === 'idle') {
    stores.sea.setState({ panel: null });
  }

  // 8. Walk to selected spot
  if (cfg.seaAutoSpot !== false && s.phase === 'idle' && !s.walking) {
    const targetSpot = cfg.seaSpot || 'pier';
    if (s.spot !== targetSpot) {
      const spotCoords: Record<string, { x: number; y: number }> = {
        pier: { x: 24, y: 4 },
        rocks: { x: 41, y: 9 },
        beach: { x: 20, y: 14 },
      };
      const coord = spotCoords[targetSpot] || spotCoords.pier;
      if (seaScene && typeof seaScene.goFarmer === 'function') {
        seaScene.goFarmer(coord);
        return { acted: true, msg: `🚶 Đang đi ra vị trí câu (${targetSpot})...` };
      } else {
        stores.sea.setState({ spot: targetSpot, walking: false });
        return { acted: true, msg: `📍 Đã chọn vị trí câu (${targetSpot})` };
      }
    }
  }

  return { acted: false };
}
