import { stores, getActiveScene } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig } from '../../../shared/types/config';

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

  // 1. Buy rod if rod === 0
  if ((m.fishing?.rod || 0) === 0 && (m.gold || 0) >= 15000) {
    if (m.buyRod?.() === true) {
      return { acted: true, msg: '🎣 Đã mua Cần câu tại Chòi Ông Tư' };
    }
  }

  // 2. Sell basket if >= threshold
  const sellMin = (m.minutes || 0) >= 1320 ? 1 : Number(cfg.seaSellThreshold) || 1;
  if (cfg.seaAutoSell !== false && (m.fishing?.basket?.length || 0) >= sellMin) {
    const count = m.fishing?.basket?.length || 0;
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
  const curM = mainStore.getState();
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
  if (totalBait > 0 && curM.fishing?.bait) {
    const pref = cfg.seaPreferBait || 'worm';
    const hasPref = (curM.fishing.bait[pref] || 0) > 0;
    const chipToSelect = hasPref ? pref : (curM.fishing.bait.worm || 0) > 0 ? 'worm' : 'shrimp';
    const activeChip = document.querySelector('.sea-bait-chip.active') as HTMLElement | null;
    if (!activeChip || !activeChip.textContent?.toLowerCase().includes(chipToSelect)) {
      const chipEl = Array.from(document.querySelectorAll('.sea-bait-chip')).find((el) =>
        el.textContent?.toLowerCase().includes(chipToSelect)
      ) as HTMLElement | null;
      if (chipEl) chipEl.click();
    }
  }

  // 6. Food & Drink recovery
  if (cfg.seaAutoEat !== false) {
    const seaHydrationTh = Number(cfg.seaStaminaThreshold) || 20;
    const seaHungerTh = Number(cfg.seaStaminaThreshold) || 20;

    const curM2 = mainStore.getState();
    if ((curM2.hydration || 0) < seaHydrationTh && canAct('sea_drink', 3500)) {
      if ((curM2.gold || 0) >= 8000 && curM2.drink?.('nuocMia') === 'ok') {
        markActed('sea_drink');
        return { acted: true, msg: '🥤 Đã uống Nước mía tại Biển hồi khát' };
      }
      if ((curM2.gold || 0) >= 3000 && curM2.drink?.('traDa') === 'ok') {
        markActed('sea_drink');
        return { acted: true, msg: '🧊 Đã uống Trà đá tại Biển hồi khát' };
      }
    }

    const curM3 = mainStore.getState();
    if ((curM3.fullness || 0) < seaHungerTh && canAct('sea_eat', 3500)) {
      for (const d of Object.keys(curM3.kitchen?.stock || {})) {
        if ((curM3.kitchen?.stock?.[d] || 0) > 0 && curM3.eat?.(d) === 'ok') {
          markActed('sea_eat');
          return { acted: true, msg: '🍲 Đã ăn món mang theo hồi sức tại Biển' };
        }
      }
      if ((curM3.gold || 0) >= 15000 && curM3.buyFood?.('banhMiThit') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥖 Đã ăn Bánh mì tại Biển hồi đói' };
      }
      if ((curM3.gold || 0) >= 8000 && curM3.buyFood?.('banhBao') === 'ok') {
        markActed('sea_eat');
        return { acted: true, msg: '🥟 Đã ăn Bánh bao tại Biển hồi đói' };
      }
    }
  }

  // 7. Close shop/dex panel if open while idle
  if (s.panel && s.phase === 'idle') {
    seaStore.setState({ panel: null });
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
      if (seaScene && typeof (seaScene as unknown as Record<string, (c: { x: number; y: number }) => void>).goFarmer === 'function') {
        (seaScene as unknown as Record<string, (c: { x: number; y: number }) => void>).goFarmer(coord);
        return { acted: true, msg: `🚶 Đang đi ra vị trí câu (${targetSpot})...` };
      } else {
        seaStore.setState({ spot: targetSpot, walking: false });
        return { acted: true, msg: `📍 Đã chọn vị trí câu (${targetSpot})` };
      }
    }
  }

  return { acted: false };
}
