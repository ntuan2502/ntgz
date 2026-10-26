import { getMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { StepResult, NOT_ACTED, formatVnd, PET_FOOD_NAMES, POND_FISH_NAMES } from './types';

// ---------------------------------------------------------------------------
// PET
// ---------------------------------------------------------------------------

const DEFAULT_PET_FOOD = ['xuong', 'cakho', 'pate', 'hat', 'coKho', 'cam', 'crop:carrot', 'crop:corn', 'crop:radish'];
const DEFAULT_PET_SHOP = ['pate', 'hat', 'xuong', 'cakho', 'coKho', 'cam'];

const PET_DIETS: Array<{ kinds: string[]; foods: string[]; shop: string[] }> = [
  { kinds: ['muop', 'tamThe', 'anhLongNgan', 'xiem'], foods: ['cakho', 'pate', 'hat'], shop: ['cakho', 'pate', 'hat'] },
  { kinds: ['thoTrang', 'thoNau'], foods: ['crop:carrot', 'coKho', 'crop:radish'], shop: ['coKho'] },
  { kinds: ['heoHong', 'heoMini'], foods: ['crop:corn', 'cam', 'crop:radish', 'crop:carrot'], shop: ['cam'] },
  { kinds: ['vang', 'muc', 'husky', 'corgi', 'pug'], foods: ['xuong', 'pate', 'hat'], shop: ['xuong', 'pate', 'hat'] },
];

const PET_TRICKS = ['dance', 'roll', 'paw', 'sit', 'come'];
const PET_TRICK_NAMES: Record<string, string> = {
  dance: 'Nhảy múa',
  roll: 'Lăn vòng',
  paw: 'Bắt tay',
  sit: 'Ngồi ngoan',
  come: 'Lại đây',
};
const isFed = (res: string | undefined) => res === 'ok' || res === 'fav';

export function handlePetSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (m.pets?.pet?.away) {
    try {
      m.pickUpPet?.();
    } catch (e) {
      console.warn('[Pet] pickUpPet failed:', e);
    }
    return getMainState().pets?.pet?.away ? NOT_ACTED : { acted: true, msg: '🐾 Đã đón thú cưng về nhà' };
  }

  const pet = m.pets?.pet;
  if (!pet) return NOT_ACTED;
  const petName = pet.name || 'Bé';

  // 1. Cho ăn (Feed once per day)
  if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
    const diet = PET_DIETS.find((d) => d.kinds.includes(pet.kind || ''));
    const mode = cfg.petFeedMode || 'smart_diet';

    const foodOrder =
      mode === 'custom' && cfg.petPreferFood && cfg.petPreferFood !== 'auto'
        ? [cfg.petPreferFood]
        : mode === 'fav_only'
          ? diet?.foods?.slice(0, 1) || DEFAULT_PET_FOOD.slice(0, 1)
          : diet?.foods || DEFAULT_PET_FOOD;

    // Try feeding foods from inventory first
    for (const f of foodOrder) {
      try {
        if (isFed(getMainState().feedPet?.(f))) {
          return { acted: true, msg: `🐕 Đã cho thú cưng (${petName}) ăn ${PET_FOOD_NAMES[f] || f}` };
        }
      } catch (e) {
        console.warn(`[Pet] feedPet(${f}) error:`, e);
      }
    }

    // If still not fed and auto-buy is allowed (not inventory_only)
    if (mode !== 'inventory_only' && cfg.petAutoBuyFood !== false) {
      const buyPref = cfg.petBuyFoodType || 'auto_fav';
      const shopItems = buyPref !== 'auto_fav' ? [buyPref] : diet?.shop || DEFAULT_PET_SHOP;

      for (const sf of shopItems) {
        try {
          if (getMainState().buyPetFood?.(sf, 1) === 'ok' && isFed(getMainState().feedPet?.(sf))) {
            return { acted: true, msg: `🦴 Đã mua ${PET_FOOD_NAMES[sf] || sf} & cho thú cưng (${petName}) ăn` };
          }
        } catch (e) {
          console.warn(`[Pet] buyPetFood/feedPet(${sf}) error:`, e);
        }
      }
    }
  }

  // 2. Vuốt ve (Cuddle up to 3 times per day)
  const curM = getMainState();
  const curPet = curM.pets?.pet;
  if (cfg.petAutoCuddle !== false && curPet) {
    const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
    if (cuddlesToday < 3) {
      try {
        if (curM.cuddlePet?.() === 'ok') {
          return { acted: true, msg: `💕 Đã vuốt ve thú cưng (${cuddlesToday + 1}/3)` };
        }
      } catch (e) {
        console.warn('[Pet] cuddlePet error:', e);
      }
    }
  }

  // 3. Tắm thơm tho (Bath - game enforces 2-day interval)
  if (cfg.petAutoBath !== false) {
    try {
      if (getMainState().bathPet?.() === 'ok') {
        return { acted: true, msg: '🛁 Đã tắm thơm tho cho thú cưng' };
      }
    } catch (e) {
      console.warn('[Pet] bathPet error:', e);
    }
  }

  // 4. Chơi ném bóng & tập trò (Play fetch & train tricks once per day)
  const st = getMainState();
  const trickPet = st.pets?.pet;
  if (cfg.petAutoTrick !== false && trickPet) {
    // Validate gear tồn tại và là mảng trước khi kiểm tra 'ball' (ngăn game crash khi st.pets.gear = undefined)
    const petGear = st.pets?.gear;
    const hasBall = Array.isArray(petGear) && petGear.includes('ball');

    if (trickPet.playDay !== st.day && hasBall) {
      try {
        if (st.doTrick?.('fetch') === 'ok') {
          return { acted: true, msg: '🎾 Chơi ném bóng cùng thú cưng (+8 tim)' };
        }
      } catch (e) {
        console.warn('[Pet] doTrick(fetch) error:', e);
      }
    }

    if (trickPet.trickDay !== st.day) {
      for (const tr of PET_TRICKS) {
        try {
          if (getMainState().doTrick?.(tr) === 'ok') {
            return { acted: true, msg: `🎾 Tập trò "${PET_TRICK_NAMES[tr] || tr}" cùng thú cưng` };
          }
        } catch (e) {
          console.warn(`[Pet] doTrick(${tr}) error:`, e);
        }
      }
    }
  }

  // 5. Dắt thú cưng đi dạo (Walk pet once per day)
  const stWalk = getMainState();
  const walkPetObj = stWalk.pets?.pet;
  if (cfg.petAutoWalk !== false && walkPetObj) {
    const walkedToday = walkPetObj.walkDay === stWalk.day || walkPetObj.walkedDay === stWalk.day;
    if (!walkedToday) {
      try {
        const anySt = stWalk as unknown as Record<string, ((...args: unknown[]) => unknown) | undefined>;
        // Game gốc dùng setPetFollow(true) để pet đi theo người chơi, KHÔNG gọi doTrick('walk') vì game không có trick này
        let walked = false;
        if (typeof anySt.walkPet === 'function') {
          walked = anySt.walkPet() === 'ok' || anySt.walkPet() === true;
        } else if (typeof anySt.setPetFollow === 'function' && !walkPetObj.follow) {
          walked = anySt.setPetFollow(true) === 'ok';
        }
        if (walked) {
          return { acted: true, msg: `🦮 Đã dắt thú cưng (${petName}) đi dạo mát (+tim)` };
        }
      } catch (e) {
        console.warn('[Pet] walkPet/setPetFollow error:', e);
      }
    }
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// BARN (Buffalo - Anh Tám)
// ---------------------------------------------------------------------------

export function handleBarnSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (cfg.barnAutoFeedBuffalo !== false && m.buffalo?.home) {
    if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day) {
      try {
        if (m.feedBuffalo?.() === 'ok') {
          return { acted: true, msg: '🐃 Đã cho Trâu ăn rơm' };
        }
      } catch (e) {
        console.warn('[Barn] feedBuffalo failed:', e);
      }
    }
  }

  const stB = getMainState();
  if (cfg.barnAutoBathBuffalo !== false && stB.buffalo?.home) {
    if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day) {
      try {
        if (stB.bathBuffalo?.() === 'ok') {
          return { acted: true, msg: '🚿 Đã tắm mát cho Trâu' };
        }
      } catch (e) {
        console.warn('[Barn] bathBuffalo failed:', e);
      }
    }
  }

  const stL = getMainState();
  const minMood = Number(cfg.barnLendMoodMin) || 50;
  if (
    cfg.barnAutoLendBuffalo !== false &&
    stL.buffalo?.home &&
    stL.buffalo.lentDay !== stL.day &&
    (stL.buffalo.mood || 0) >= minMood
  ) {
    try {
      if (stL.lendBuffalo?.() === 'ok') {
        return { acted: true, msg: '🤝 Đã cho bà con thuê Trâu cày ruộng' };
      }
    } catch (e) {
      console.warn('[Barn] lendBuffalo failed:', e);
    }
  }

  if (cfg.barnAutoPayHelper !== false) {
    const stH = getMainState();
    if (stH.helpers?.buffalo?.hired && (stH.helpers.buffalo.unpaid || 0) > 0) {
      try {
        if (stH.payHelper?.('buffalo') === true) {
          return { acted: true, msg: '💸 Đã trả lương anh Tâm chăn trâu' };
        }
      } catch (e) {
        console.warn('[Barn] payHelper(buffalo) failed:', e);
      }
    }
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// DAIRY (Dairy cows - Chị Mận)
// ---------------------------------------------------------------------------

export function handleDairySubArea(cfg: AppConfig): StepResult {
  const stC = getMainState();
  if (cfg.dairyAutoFeedCows !== false && (stC.dairy?.cows || []).some((c) => c.fedDay !== stC.day)) {
    try {
      if (stC.feedCows?.() === 'ok') {
        return { acted: true, msg: '🐄 Đã cho đàn Bò sữa ăn cỏ' };
      }
    } catch (e) {
      console.warn('[Dairy] feedCows failed:', e);
    }
  }

  if (cfg.dairyAutoCureCows !== false) {
    const stCure = getMainState();
    for (const cow of stCure.dairy?.cows || []) {
      if ((cow.sickDay || 0) <= 0) continue;
      try {
        if ((stCure.dairy?.medicine || 0) <= 0 && (stCure.gold || 0) >= 80000) {
          stCure.buyMedicine?.();
        }
        if (getMainState().cureCow?.(cow.id) === 'ok') {
          return { acted: true, msg: `💊 Đã tiêm thuốc chữa bệnh cho Bò ${cow.name || '#' + cow.id}` };
        }
      } catch (e) {
        console.warn(`[Dairy] cureCow(${cow.id}) failed:`, e);
      }
    }
  }

  const stMilk = getMainState();
  if (cfg.dairyAutoSellMilk !== false && (stMilk.dairy?.milk || 0) > 0) {
    try {
      const res = stMilk.sellMilk?.();
      if (res && res.liters > 0) {
        return { acted: true, msg: `🥛 Đã vắt & bán ${res.liters} lít sữa bò (+${formatVnd(res.total)}đ)` };
      }
    } catch (e) {
      console.warn('[Dairy] sellMilk failed:', e);
    }
  }

  if (cfg.dairyAutoPayHelper !== false) {
    const stH2 = getMainState();
    if (stH2.helpers?.dairy?.hired && (stH2.helpers.dairy.unpaid || 0) > 0) {
      try {
        if (stH2.payHelper?.('dairy') === true) {
          return { acted: true, msg: '💸 Đã trả lương chị Mận chăm bò' };
        }
      } catch (e) {
        console.warn('[Dairy] payHelper(dairy) failed:', e);
      }
    }
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// COOP (Chickens)
// ---------------------------------------------------------------------------

const MAX_HENS_BY_LEVEL = [4, 6, 9, 12];

export function handleCoopSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (!m.unlockedZones?.includes('poultry')) return NOT_ACTED;

  if (cfg.coopAutoCollectEggs !== false && (m.nestEggs || 0) > 0) {
    try {
      const got = m.collectEggs?.();
      if (typeof got === 'number' && got > 0) {
        return { acted: true, msg: `🥚 Đã nhặt ${got} quả trứng gà trong ổ` };
      }
    } catch (e) {
      console.warn('[Coop] collectEggs failed:', e);
    }
  }

  const stG = getMainState();
  const maxHens = MAX_HENS_BY_LEVEL[stG.coopLevel || 0] || 4;
  const henCount = stG.hens?.length || 0;
  if (cfg.coopAutoBuyChick && !stG.flu && henCount < maxHens && (stG.gold || 0) >= 60000) {
    try {
      if (stG.buyChick?.() === 'ok') {
        return { acted: true, msg: `🐤 Đã mua thêm 1 gà con vào chuồng (${henCount + 1}/${maxHens})` };
      }
    } catch (e) {
      console.warn('[Coop] buyChick failed:', e);
    }
  }

  const stP = getMainState();
  if (
    cfg.coopAutoPayHelper !== false &&
    stP.helpers?.poultry?.hired &&
    (stP.helpers.poultry.unpaid || 0) > 0
  ) {
    try {
      if (stP.payHelper?.('poultry') === true) {
        return { acted: true, msg: '💸 Đã trả lương chú Ba chăm gà' };
      }
    } catch (e) {
      console.warn('[Coop] payHelper(poultry) failed:', e);
    }
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// POND (Fish pond)
// ---------------------------------------------------------------------------

const POND_MATURE_DAYS: Record<string, number> = { ro: 3, tre: 5, chep: 7 };
const POND_CAPACITY = 12;

export function handlePondSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (!m.pond?.ready) return NOT_ACTED;

  if (m.notebook?.found && !m.pond.noteRead) {
    try {
      m.readPondNote?.();
    } catch (e) {
      console.warn('[Pond] readPondNote failed:', e);
    }
  }

  const fish = getMainState().pond?.fish || [];
  if (cfg.pondAutoNet !== false && fish.some((f) => (f.days || 0) >= (POND_MATURE_DAYS[f.id || ''] || 7))) {
    try {
      const res = getMainState().netFish?.();
      if (res && res.n > 0) {
        return { acted: true, msg: `🐟 Đã kéo lưới bán ${res.n} con cá ao (+${formatVnd(res.total)}đ)` };
      }
    } catch (e) {
      console.warn('[Pond] netFish failed:', e);
    }
  }

  const stP = getMainState();
  const stocked = stP.pond?.fish?.length ?? POND_CAPACITY;
  if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stocked < POND_CAPACITY) {
    const fishType = cfg.preferPondFish || 'chep';
    try {
      if (stP.stockFish?.(fishType) === 'ok') {
        return {
          acted: true,
          msg: `🐟 Đã thả giống ${POND_FISH_NAMES[fishType] || fishType} xuống ao (${stocked + 1}/${POND_CAPACITY})`,
        };
      }
    } catch (e) {
      console.warn(`[Pond] stockFish(${fishType}) failed:`, e);
    }
  }

  const stF = getMainState();
  if (
    cfg.pondAutoFeed !== false &&
    (stF.pond?.fish?.length || 0) > 0 &&
    stF.pond?.fedDay !== stF.day &&
    stF.pond?.bebi !== 'helper'
  ) {
    try {
      if (stF.feedFish?.() === 'ok') {
        return { acted: true, msg: '🍞 Đã rải cám cho đàn cá trong ao ăn' };
      }
    } catch (e) {
      console.warn('[Pond] feedFish failed:', e);
    }
  }

  // NOTE: Game không có helper 'pond'. Chỉ có 5 loại: crops/fishing/poultry/buffalo/dairy.
  // Ao cá dùng NPC Bé Bi (state.pond.bebi === 'helper'), không nhận lương.
  // Ref: play.formatted.js:47728-47734 (WM), 42834 (Bé Bi).

  return NOT_ACTED;
}
