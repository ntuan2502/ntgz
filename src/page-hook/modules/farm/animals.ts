import { getMainState } from '../../core/engine-access';
import { AppConfig } from '../../../shared/types/config';
import { StepResult, NOT_ACTED, formatVnd } from './types';

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
const isFed = (res: string | undefined) => res === 'ok' || res === 'fav';

export function handlePetSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (m.pets?.pet?.away) {
    m.pickUpPet?.();
    return getMainState().pets?.pet?.away ? NOT_ACTED : { acted: true, msg: '🐾 Đã đón thú cưng về nhà' };
  }

  const pet = m.pets?.pet;
  if (!pet) return NOT_ACTED;
  const petName = pet.name || 'Bé';

  // Feed once per day
  if (cfg.petAutoFeed !== false && pet.fedDay !== m.day) {
    const diet = PET_DIETS.find((d) => d.kinds.includes(pet.kind || ''));
    const foods = diet?.foods || DEFAULT_PET_FOOD;
    const shop = diet?.shop || DEFAULT_PET_SHOP;

    for (const f of foods) {
      if (isFed(getMainState().feedPet?.(f))) {
        return { acted: true, msg: `🐕 Đã cho thú cưng (${petName}) ăn no` };
      }
    }
    for (const sf of shop) {
      if (getMainState().buyPetFood?.(sf, 1) === 'ok' && isFed(getMainState().feedPet?.(sf))) {
        return { acted: true, msg: `🦴 Đã mua đồ ăn & cho thú cưng (${petName}) ăn` };
      }
    }
  }

  // Cuddle up to 3 times per day
  const curM = getMainState();
  const curPet = curM.pets?.pet;
  if (cfg.petAutoCuddle !== false && curPet) {
    const cuddlesToday = curPet.cuddleDay === curM.day ? curPet.cuddles || 0 : 0;
    if (cuddlesToday < 3 && curM.cuddlePet?.() === 'ok') {
      return { acted: true, msg: `💕 Đã vuốt ve thú cưng (${cuddlesToday + 1}/3)` };
    }
  }

  // Bath (game enforces the 2-day interval)
  if (cfg.petAutoBath !== false && getMainState().bathPet?.() === 'ok') {
    return { acted: true, msg: '🛁 Đã tắm thơm tho cho thú cưng' };
  }

  // Play fetch & train tricks once per day
  const st = getMainState();
  const trickPet = st.pets?.pet;
  if (cfg.petAutoTrick !== false && trickPet) {
    if (trickPet.playDay !== st.day && st.pets?.gear?.includes('ball') && st.doTrick?.('fetch') === 'ok') {
      return { acted: true, msg: '🎾 Chơi ném bóng cùng thú cưng (+8 tim)' };
    }
    if (trickPet.trickDay !== st.day) {
      for (const tr of PET_TRICKS) {
        if (getMainState().doTrick?.(tr) === 'ok') {
          return { acted: true, msg: `🎾 Tập trò "${tr}" cùng thú cưng` };
        }
      }
    }
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// BARN (Buffalo & Dairy cows)
// ---------------------------------------------------------------------------

export function handleBarnSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (cfg.barnAutoFeedBuffalo !== false && m.buffalo?.home) {
    if (m.buffalo.fedDay !== m.day && m.buffalo.lentDay !== m.day && m.feedBuffalo?.() === 'ok') {
      return { acted: true, msg: '🐃 Đã cho Trâu ăn rơm' };
    }
  }

  const stB = getMainState();
  if (cfg.barnAutoBathBuffalo !== false && stB.buffalo?.home) {
    if (stB.buffalo.bathDay !== stB.day && stB.buffalo.lentDay !== stB.day && stB.bathBuffalo?.() === 'ok') {
      return { acted: true, msg: '🚿 Đã tắm mát cho Trâu' };
    }
  }

  const stL = getMainState();
  if (
    cfg.barnAutoLendBuffalo !== false &&
    stL.buffalo?.home &&
    stL.buffalo.lentDay !== stL.day &&
    (stL.buffalo.mood || 0) >= 50 &&
    stL.lendBuffalo?.() === 'ok'
  ) {
    return { acted: true, msg: '🤝 Đã cho bà con thuê Trâu cày ruộng' };
  }

  const stC = getMainState();
  if (cfg.barnAutoFeedCows !== false && (stC.dairy?.cows || []).some((c) => c.fedDay !== stC.day)) {
    if (stC.feedCows?.() === 'ok') {
      return { acted: true, msg: '🐄 Đã cho đàn Bò sữa ăn cỏ' };
    }
  }

  if (cfg.barnAutoCureCows !== false) {
    const stCure = getMainState();
    for (const cow of stCure.dairy?.cows || []) {
      if ((cow.sickDay || 0) <= 0) continue;
      if ((stCure.dairy?.medicine || 0) <= 0 && (stCure.gold || 0) >= 80000) {
        stCure.buyMedicine?.();
      }
      if (getMainState().cureCow?.(cow.id) === 'ok') {
        return { acted: true, msg: `💊 Đã tiêm thuốc chữa bệnh cho Bò ${cow.name || '#' + cow.id}` };
      }
    }
  }

  const stMilk = getMainState();
  if (cfg.barnAutoSellMilk !== false && (stMilk.dairy?.milk || 0) > 0) {
    const res = stMilk.sellMilk?.();
    if (res && res.liters > 0) {
      return { acted: true, msg: `🥛 Đã vắt & bán ${res.liters} lít sữa bò (+${formatVnd(res.total)}đ)` };
    }
  }

  if (cfg.barnAutoPayHelper !== false) {
    const stH = getMainState();
    if (stH.helpers?.buffalo?.hired && (stH.helpers.buffalo.unpaid || 0) > 0 && stH.payHelper?.('buffalo') === true) {
      return { acted: true, msg: '💸 Đã trả lương anh Tám chăn trâu' };
    }
    const stH2 = getMainState();
    if (stH2.helpers?.dairy?.hired && (stH2.helpers.dairy.unpaid || 0) > 0 && stH2.payHelper?.('dairy') === true) {
      return { acted: true, msg: '💸 Đã trả lương chị Mận chăm bò' };
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
    const got = m.collectEggs?.();
    if (typeof got === 'number' && got > 0) {
      return { acted: true, msg: `🥚 Đã nhặt ${got} quả trứng gà trong ổ` };
    }
  }

  const stG = getMainState();
  const maxHens = MAX_HENS_BY_LEVEL[stG.coopLevel || 0] || 4;
  const henCount = stG.hens?.length || 0;
  if (cfg.coopAutoBuyChick && !stG.flu && henCount < maxHens && (stG.gold || 0) >= 60000 && stG.buyChick?.() === 'ok') {
    return { acted: true, msg: `🐤 Đã mua thêm 1 gà con vào chuồng (${henCount + 1}/${maxHens})` };
  }

  const stP = getMainState();
  if (
    cfg.coopAutoPayHelper !== false &&
    stP.helpers?.poultry?.hired &&
    (stP.helpers.poultry.unpaid || 0) > 0 &&
    stP.payHelper?.('poultry') === true
  ) {
    return { acted: true, msg: '💸 Đã trả lương chú Ba chăm gà' };
  }

  return NOT_ACTED;
}

// ---------------------------------------------------------------------------
// POND (Fish pond)
// ---------------------------------------------------------------------------

const POND_MATURE_DAYS: Record<string, number> = { ro: 3, tre: 5, chep: 7 };
const POND_FISH_NAMES: Record<string, string> = { chep: 'Cá chép', tre: 'Cá trê', ro: 'Cá rô' };
const POND_CAPACITY = 12;

export function handlePondSubArea(cfg: AppConfig): StepResult {
  const m = getMainState();
  if (!m.pond?.ready) return NOT_ACTED;

  if (m.notebook?.found && !m.pond.noteRead) {
    m.readPondNote?.();
  }

  const fish = getMainState().pond?.fish || [];
  if (cfg.pondAutoNet !== false && fish.some((f) => (f.days || 0) >= (POND_MATURE_DAYS[f.id || ''] || 7))) {
    const res = getMainState().netFish?.();
    if (res && res.n > 0) {
      return { acted: true, msg: `🐟 Đã kéo lưới bán ${res.n} con cá ao (+${formatVnd(res.total)}đ)` };
    }
  }

  const stP = getMainState();
  const stocked = stP.pond?.fish?.length ?? POND_CAPACITY;
  if (cfg.pondAutoStock !== false && Array.isArray(stP.pond?.fish) && stocked < POND_CAPACITY) {
    const fishType = cfg.preferPondFish || 'chep';
    if (stP.stockFish?.(fishType) === 'ok') {
      return {
        acted: true,
        msg: `🐟 Đã thả giống ${POND_FISH_NAMES[fishType] || fishType} xuống ao (${stocked + 1}/${POND_CAPACITY})`,
      };
    }
  }

  const stF = getMainState();
  if (
    cfg.pondAutoFeed !== false &&
    (stF.pond?.fish?.length || 0) > 0 &&
    stF.pond?.fedDay !== stF.day &&
    stF.pond?.bebi !== 'helper' &&
    stF.feedFish?.() === 'ok'
  ) {
    return { acted: true, msg: '🍞 Đã rải cám cho đàn cá trong ao ăn' };
  }

  // Original JS had no pond helper payment; keep the config option working via payHelper('pond')
  const stH = getMainState();
  if (cfg.pondAutoPayHelper !== false && stH.helpers?.pond?.hired && (stH.helpers.pond.unpaid || 0) > 0 && stH.payHelper?.('pond') === true) {
    return { acted: true, msg: '💸 Đã trả lương người phụ Ao cá' };
  }

  return NOT_ACTED;
}
