import { stores } from '../../core/engine-access';

export function handlePetSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m) return { acted: false };

  if (m.pets?.pet?.away) {
    m.pickUpPet?.();
    if (!stores.main.getState().pets?.pet?.away) {
      return { acted: true, msg: `🐾 Đã đón thú cưng về nhà` };
    }
    return { acted: false };
  }

  const pet = m.pets?.pet;
  if (!pet || pet.away) return { acted: false };

  // 3a. Feed Pet
  if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
    const kind = pet.kind || '';
    let candidates = ['xuong', 'cakho', 'pate', 'hat', 'coKho', 'cam', 'crop:carrot', 'crop:corn', 'crop:radish'];
    let shopBuyList = ['pate', 'hat', 'xuong', 'cakho', 'coKho', 'cam'];

    if (['muop', 'tamThe', 'anhLongNgan', 'xiem'].includes(kind)) {
      candidates = ['cakho', 'pate', 'hat'];
      shopBuyList = ['cakho', 'pate', 'hat'];
    } else if (['thoTrang', 'thoNau'].includes(kind)) {
      candidates = ['crop:carrot', 'coKho', 'crop:radish'];
      shopBuyList = ['coKho'];
    } else if (['heoHong', 'heoMini'].includes(kind)) {
      candidates = ['crop:corn', 'cam', 'crop:radish', 'crop:carrot'];
      shopBuyList = ['cam'];
    } else if (['vang', 'muc', 'husky', 'corgi', 'pug'].includes(kind)) {
      candidates = ['xuong', 'pate', 'hat'];
      shopBuyList = ['xuong', 'pate', 'hat'];
    }

    for (const f of candidates) {
      const res = m.feedPet?.(f);
      if (res === 'ok' || res === 'fav') {
        return { acted: true, msg: `🐕 Đã cho thú cưng (${pet.name || 'Bé'}) ăn no` };
      }
    }

    // Buy pet food and feed
    for (const sf of shopBuyList) {
      if (stores.main.getState().buyPetFood?.(sf, 1) === 'ok') {
        const res = stores.main.getState().feedPet?.(sf);
        if (res === 'ok' || res === 'fav') {
          return { acted: true, msg: `🦴 Đã mua đồ ăn & cho thú cưng (${pet.name || 'Bé'}) ăn` };
        }
      }
    }
  }

  // 3b. Cuddle Pet
  const curM = stores.main.getState();
  const curPet = curM.pets?.pet;
  if (cfg.petAutoCuddle !== false && curPet) {
    const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
    if (cuddlesToday < 3 && curM.cuddlePet?.() === 'ok') {
      return { acted: true, msg: `💕 Đã vuốt ve thú cưng (${cuddlesToday + 1}/3)` };
    }
  }

  // 3c. Bath Pet
  const curM2 = stores.main.getState();
  if (cfg.petAutoBath !== false && curM2.bathPet?.() === 'ok') {
    return { acted: true, msg: `🛁 Đã tắm thơm tho cho thú cưng` };
  }

  // 3d. Train Tricks
  const curM3 = stores.main.getState();
  const curPet3 = curM3.pets?.pet;
  if (cfg.petAutoTrick !== false && curPet3) {
    if (curPet3.playDay !== curM3.day && curM3.pets?.gear?.includes('ball')) {
      if (curM3.doTrick?.('fetch') === 'ok') {
        return { acted: true, msg: `🎾 Chơi ném bóng cùng thú cưng (+8 tim)` };
      }
    }
    if (curPet3.trickDay !== curM3.day) {
      const tricks = ['dance', 'roll', 'paw', 'sit', 'come'];
      for (const tr of tricks) {
        if (curM3.doTrick?.(tr) === 'ok') {
          return { acted: true, msg: `🎾 Tập trò "${tr}" cùng thú cưng` };
        }
      }
    }
  }

  return { acted: false };
}

export function handleBarnSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m) return { acted: false };

  // 4a. Buffalo: Feed
  if (cfg.barnAutoFeedBuffalo !== false && cfg.barnAutoBuffalo !== false && m.buffalo?.home) {
    if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day) {
      if (m.feedBuffalo?.() === 'ok') {
        return { acted: true, msg: `🐃 Đã cho Trâu ăn rơm` };
      }
    }
  }

  // 4b. Buffalo: Bath
  const stB = stores.main.getState();
  if (cfg.barnAutoBathBuffalo !== false && cfg.barnAutoBuffalo !== false && stB.buffalo?.home) {
    if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day) {
      if (stB.bathBuffalo?.() === 'ok') {
        return { acted: true, msg: `🚿 Đã tắm mát cho Trâu` };
      }
    }
  }

  // 4c. Buffalo: Lend
  const stB2 = stores.main.getState();
  if (
    cfg.barnAutoLendBuffalo !== false &&
    stB2.buffalo?.home &&
    stB2.buffalo.lentDay !== stB2.day &&
    (stB2.buffalo?.mood || 0) >= 50
  ) {
    if (stB2.lendBuffalo?.() === 'ok') {
      return { acted: true, msg: `🤝 Đã cho bà con thuê Trâu cày ruộng` };
    }
  }

  // 4d. Dairy Cows - Feed
  const stC = stores.main.getState();
  if (
    cfg.barnAutoFeedCows !== false &&
    Array.isArray(stC.dairy?.cows) &&
    stC.dairy.cows.some((c: any) => c.fedDay !== stC.day)
  ) {
    if (stC.feedCows?.() === 'ok') {
      return { acted: true, msg: `🐄 Đã cho đàn Bò sữa ăn cỏ` };
    }
  }

  // 4e. Dairy Cows - Cure sick cows
  const stC2 = stores.main.getState();
  if (cfg.barnAutoCureCows !== false && Array.isArray(stC2.dairy?.cows)) {
    for (const cow of stC2.dairy.cows) {
      if (cow.sickDay > 0) {
        if ((stC2.dairy.medicine || 0) <= 0 && stC2.gold >= 80000) {
          stC2.buyMedicine?.();
        }
        if (stores.main.getState().cureCow?.(cow.id) === 'ok') {
          return { acted: true, msg: `💊 Đã tiêm thuốc chữa bệnh cho Bò ${cow.name || '#' + cow.id}` };
        }
      }
    }
  }

  // 4f. Dairy Cows - Sell Milk
  const stC3 = stores.main.getState();
  if (cfg.barnAutoSellMilk !== false && (stC3.dairy?.milk || 0) > 0) {
    const res = stC3.sellMilk?.();
    if (res && res.liters > 0) {
      return {
        acted: true,
        msg: `🥛 Đã vắt & bán ${res.liters} lít sữa bò (+${res.total.toLocaleString('vi-VN')}đ)`,
      };
    }
  }

  // 4g. Pay Barn Helpers
  const stC4 = stores.main.getState();
  if (cfg.barnAutoPayHelper !== false) {
    if (stC4.helpers?.buffalo?.hired && (stC4.helpers.buffalo.unpaid || 0) > 0) {
      if (stC4.payHelper?.('buffalo') === true) {
        return { acted: true, msg: `💸 Đã trả lương anh Tâm chăn trâu` };
      }
    }
    const stC5 = stores.main.getState();
    if (stC5.helpers?.dairy?.hired && (stC5.helpers.dairy.unpaid || 0) > 0) {
      if (stC5.payHelper?.('dairy') === true) {
        return { acted: true, msg: `💸 Đã trả lương chị Mận chăm bò` };
      }
    }
  }

  return { acted: false };
}

export function handleCoopSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m || !m.unlockedZones?.includes('poultry')) return { acted: false };

  // Collect Eggs
  if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
    const got = m.collectEggs?.();
    if (typeof got === 'number' && got > 0) {
      return { acted: true, msg: `🥚 Đã nhặt ${got} quả trứng gà trong ổ` };
    }
  }

  // Buy Chick when coop has space
  const stG = stores.main.getState();
  const maxHens = [4, 6, 9, 12][stG.coopLevel || 0] || 4;
  if (cfg.coopAutoBuyChick && !stG.flu && (stG.hens?.length || 0) < maxHens && stG.gold >= 60000) {
    if (stG.buyChick?.() === 'ok') {
      return {
        acted: true,
        msg: `🐤 Đã mua thêm 1 gà con vào chuồng (${(stG.hens?.length || 0) + 1}/${maxHens})`,
      };
    }
  }

  // Pay Poultry Helper
  const stG2 = stores.main.getState();
  if (cfg.coopAutoPayHelper !== false && stG2.helpers?.poultry?.hired && (stG2.helpers.poultry.unpaid || 0) > 0) {
    if (stG2.payHelper?.('poultry') === true) {
      return { acted: true, msg: `💸 Đã trả lương chú Ba chăm gà` };
    }
  }

  return { acted: false };
}

export function handlePondSubArea(cfg: any): { acted: boolean; msg?: string } {
  const m = stores.main?.getState();
  if (!m || !m.pond?.ready) return { acted: false };

  if (m.notebook?.found && !m.pond.noteRead) {
    m.readPondNote?.();
  }

  const matureDays: Record<string, number> = { ro: 3, tre: 5, chep: 7 };
  const fishNames: Record<string, string> = { chep: 'Cá chép', tre: 'Cá trê', ro: 'Cá rô' };

  // Net mature fish
  if (
    cfg.pondAutoNet !== false &&
    Array.isArray(m.pond.fish) &&
    m.pond.fish.some((f: any) => (f.days || 0) >= (matureDays[f.id] || 7))
  ) {
    const res = m.netFish?.();
    if (res && res.n > 0) {
      return {
        acted: true,
        msg: `🐟 Đã kéo lưới bán ${res.n} con cá ao (+${res.total.toLocaleString('vi-VN')}đ)`,
      };
    }
  }

  // Stock fish
  const stP = stores.main.getState();
  if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stP.pond.fish.length < 12) {
    const fishType = cfg.preferPondFish || 'chep';
    if (stP.stockFish?.(fishType) === 'ok') {
      return {
        acted: true,
        msg: `🐟 Đã thả giống ${fishNames[fishType] || fishType} xuống ao (${stP.pond.fish.length + 1}/12)`,
      };
    }
  }

  // Feed fish
  const stP2 = stores.main.getState();
  if (
    cfg.pondAutoFeed !== false &&
    (stP2.pond?.fish?.length || 0) > 0 &&
    stP2.pond.fedDay !== stP2.day &&
    stP2.pond.bebi !== 'helper'
  ) {
    if (stP2.feedFish?.() === 'ok') {
      return { acted: true, msg: `🍞 Đã rải cám cho đàn cá trong ao ăn` };
    }
  }

  return { acted: false };
}
