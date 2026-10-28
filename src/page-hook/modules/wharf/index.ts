import { stores, getActiveScene, sendBenWs, lastXinMoiAt, lastXinMoiDay, setLastXinMoi } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, WharfSubAreaId } from '../../../shared/types/config';
import { CricketItem, SoiNpc, BenNetState } from '../../../shared/types/game-store';
import { getBenHuntSpots, BEN_HUNT_ZONES } from '../../../shared/constants/default-config';
import { refreshCricketWatchers, getBenServerNow, getBenHour, getMyBout, markHuntLightSent } from './cricket-watchers';

export { refreshCricketWatchers };

interface BenStepResult {
  acted: boolean;
  msg?: string;
  exhausted?: boolean;
  reason?: string;
  /** Content runner may click the cast button (fishing owns the continuous slot and stands at the spot) */
  allowCast?: boolean;
  /** Continuous activity (fishing / hunting) to run only if no bounded task is ready */
  deferred?: () => BenStepResult;
}

const BEN_FOOD_NAMES: Record<string, string> = {
  banhMi: '🥖 Bánh mì thịt (+20⚡)',
  chaoCa: '🥣 Cháo cá lóc (+28⚡)',
  huTieu: '🍜 Hủ tiếu nam vang (+40⚡)',
  comTam: '🍛 Cơm tấm sườn bì (+60⚡)',
  lauMam: '🍲 Lẩu cá linh bông điên điển (+100⚡)',
};

const BEN_PACK_NAMES: Record<string, string> = {
  xoiBap: '🍙 Xôi bắp gói lá chuối (+15⚡)',
  banhMiGoi: '🥖 Bánh mì gói giấy (+20⚡)',
  banhBao: '🥟 Bánh bao nhân thịt (+22⚡)',
  comNam: '🍙 Cơm nắm muối mè (+30⚡)',
  banhTet: '🫔 Bánh tét lá cẩm (+50⚡)',
  traDaTui: '🧋 Trà đá túi xách (+8⚡)',
  nuocSuoi: '💧 Chai nước suối (+10⚡)',
};

const BEN_DRINK_NAMES: Record<string, string> = {
  traDa: '🧊 Trà đá (+8⚡)',
  nuocMia: '🥤 Nước mía tắc (+5⚡, May +1)',
  rauMa: '🍵 Rau má đậu xanh (+5⚡, May +1)',
  caPhe: '☕ Cà phê sữa đá (+10⚡, May +2)',
  duaTuoi: '🥥 Dừa xiêm tươi (+15⚡, May +3)',
};

const BEN_BAIT_NAMES: Record<string, string> = {
  xinMoi: '🤲 10 mồi miễn phí',
  moi20: '🪱 Hộp mồi trùn (+20 mồi)',
  moi60: '🪱 Thau mồi trùn (+60 mồi)',
  moi150: '🪱 Thùng mồi cám (+150 mồi)',
};

const WHEEL_ITEM_IDS = [
  'canhSaoDem',
  'canhHac',
  'rongMay',
  'trangRam',
  'canhPhuong',
  'vayRong',
  'canhCo',
  'denKeoQuan',
  'dieuSao',
  'danKimXaCu',
  'coGhe',
  'denCaChep',
  'loTre',
  'danKim',
  'dienDien',
  'denOngSao',
  'dieuGiay',
  'canCau',
];

interface WheelItemMeta {
  name: string;
  tier: 'common' | 'uncommon' | 'rare' | 'epic' | 'legend' | 'myth';
  tierLabel: string;
}

const WHEEL_ITEM_METAS: Record<string, WheelItemMeta> = {
  // Common
  gui: { name: 'Gùi tre', tier: 'common', tierLabel: 'Thường' },
  gioCa: { name: 'Giỏ cá tre', tier: 'common', tierLabel: 'Thường' },
  cui: { name: 'Bó củi khô', tier: 'common', tierLabel: 'Thường' },
  thuocSau: { name: 'Bình xịt thuốc sâu', tier: 'common', tierLabel: 'Thường' },
  thuocCo: { name: 'Bình xịt thuốc cỏ', tier: 'common', tierLabel: 'Thường' },
  ongTre: { name: 'Ống tre đựng nước', tier: 'common', tierLabel: 'Thường' },
  baoLua: { name: 'Bao lúa', tier: 'common', tierLabel: 'Thường' },
  // Uncommon
  maiCheo: { name: 'Mái chèo gỗ', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  canCau: { name: 'Cần câu tre đeo chéo', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  dieuGiay: { name: 'Diều giấy', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  denOngSao: { name: 'Lồng đèn ông sao', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  dienDien: { name: 'Bó bông điên điển', tier: 'uncommon', tierLabel: 'Hơi hiếm' },
  // Rare
  danKim: { name: 'Đàn kìm', tier: 'rare', tierLabel: 'Hiếm' },
  loTre: { name: 'Lờ tre bắt cá', tier: 'rare', tierLabel: 'Hiếm' },
  denCaChep: { name: 'Lồng đèn cá chép', tier: 'rare', tierLabel: 'Hiếm' },
  coGhe: { name: 'Cờ đuôi nheo đua ghe', tier: 'rare', tierLabel: 'Hiếm' },
  // Epic
  danKimXaCu: { name: 'Đàn kìm cẩn xà cừ', tier: 'epic', tierLabel: 'Rất hiếm' },
  dieuSao: { name: 'Diều sáo vi vu', tier: 'epic', tierLabel: 'Rất hiếm' },
  denKeoQuan: { name: 'Lồng đèn kéo quân', tier: 'epic', tierLabel: 'Rất hiếm' },
  // Legend
  canhCo: { name: 'Đôi cánh cò trắng', tier: 'legend', tierLabel: 'Huyền thoại' },
  vayRong: { name: 'Vây cá chép hoá rồng', tier: 'legend', tierLabel: 'Huyền thoại' },
  canhThienThan: { name: 'Đôi cánh thiên thần', tier: 'legend', tierLabel: 'Huyền thoại' },
  // Myth
  canhPhuong: { name: 'Đôi cánh phượng hoàng lửa', tier: 'myth', tierLabel: 'Thần thoại' },
  trangRam: { name: 'Vầng trăng rằm', tier: 'myth', tierLabel: 'Thần thoại' },
  rongMay: { name: 'Rồng mây vàng', tier: 'myth', tierLabel: 'Thần thoại' },
  canhHac: { name: 'Đôi cánh hạc tiên', tier: 'myth', tierLabel: 'Thần thoại' },
  canhSaoDem: { name: 'Đôi cánh sao đêm', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhPhaLe: { name: 'Đôi cánh pha lê', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhBuomNeon: { name: 'Đôi cánh bướm neon', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhCoKhi: { name: 'Đôi cánh cơ khí', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhLuaXanh: { name: 'Đôi cánh lửa xanh', tier: 'myth', tierLabel: 'Thần thoại' },
  limCanhCauVong: { name: 'Đôi cánh cầu vồng', tier: 'myth', tierLabel: 'Thần thoại' },
};

export const CRICKET_SPECIES_NAMES: Record<string, string> = {
  deCom: 'Dế cơm',
  deMen: 'Dế mèn',
  deDat: 'Dế đất',
  deThan: 'Dế than',
  deTrui: 'Dế trũi',
  deCo: 'Dế cồ',
  deLua: 'Dế lửa',
  deNgoc: 'Dế ngọc',
  deVang: 'Dế vàng',
  deMa: 'Dế ma',
  deSat: 'Dế sắt',
  deVuong: 'Dế vương',
};

export const CRICKET_RARITY_REFUND: Record<string, number> = {
  common: 5,
  uncommon: 15,
  rare: 40,
  epic: 120,
  legendary: 400,
};

export const CRICKET_SPECIES_RARITY: Record<string, string> = {
  deCom: 'common',
  deMen: 'common',
  deDat: 'common',
  deThan: 'uncommon',
  deTrui: 'uncommon',
  deCo: 'uncommon',
  deLua: 'rare',
  deNgoc: 'rare',
  deVang: 'rare',
  deMa: 'epic',
  deSat: 'epic',
  deVuong: 'legendary',
};

const BOSS_LADDER = [
  { id: 'cuBin', aliases: ['cubin', 'bin'], name: 'Cu Bin', reward: 15, total: 60 },
  { id: 'utMap', aliases: ['utmap', 'map'], name: 'Út Mập', reward: 30, total: 112 },
  { id: 'anhLuc', aliases: ['anhluc', 'luc'], name: 'Anh Lực xe ôm', reward: 60, total: 138 },
  { id: 'bacChin', aliases: ['bacchin', 'chin'], name: 'Bác Chín thợ rèn', reward: 110, total: 194 },
  { id: 'ongSau', aliases: ['ongsau', 'sau'], name: 'Ông Sáu chủ sới', reward: 220, total: 242 },
];
const SOI_TILE = { x: 4, y: 29 };
const CRICKET_BOX_MAX = 6;
const HUNT_STAMINA_COST = 3;
const HUNT_LIGHT_STALE_MS = 8000;

let keepBenPanelUntil = 0;
let keepBenPanelMsg = '';
let huntLightAt = 0;
let hadMyBout = false;
let huntSpotIdx = 0;
let lastHandledGotAwaySeq = -1;
let lastHuntZoneChoice: string | null = null;
let benNoticeTired = false;

const ATM_NEXT_TIME_KEY = 'ntg_ben_next_atm_time';
let nextAtmTime = (() => {
  try {
    const raw = localStorage.getItem(ATM_NEXT_TIME_KEY) || sessionStorage.getItem(ATM_NEXT_TIME_KEY);
    const val = raw ? Number(raw) || 0 : 0;
    // Discard invalid / far future timestamps (> 2 hours)
    return val > Date.now() + 3600000 * 2 ? 0 : val;
  } catch {
    return 0;
  }
})();
let lastAtmLogAt = 0;
let lastAtmExchangeAt = 0;
let lastAtmQuerySentAt = 0;
let lastAtmResponseReceivedAt = 0;
let lastAtmExchangeSentAt = 0;
let lastObservedAtmRef: unknown = null;

export function getWharfNextAtmTime(): number {
  const now = Date.now();
  const bn = stores.benNet?.getState();
  if (typeof bn?.atm?.reopen === 'number' && bn.atm.reopen > now) {
    const serverReopen = bn.atm.reopen + 3000;
    if (serverReopen > nextAtmTime) {
      setNextAtmTime(serverReopen);
      return serverReopen;
    }
  }

  if (nextAtmTime > 0) {
    if (nextAtmTime < now - 3600000 || nextAtmTime > now + 3600000 * 2) {
      nextAtmTime = 0;
      return 0;
    }
    return nextAtmTime;
  }
  try {
    const raw = localStorage.getItem(ATM_NEXT_TIME_KEY) || sessionStorage.getItem(ATM_NEXT_TIME_KEY);
    const val = raw ? Number(raw) || 0 : 0;
    if (val <= 0 || val < now - 3600000 || val > now + 3600000 * 2) {
      return 0;
    }
    nextAtmTime = val;
    return val;
  } catch {
    return 0;
  }
}

function getNextHourTimestamp(now: number): number {
  return now + 3600000;
}

function setNextAtmTime(timestamp: number): void {
  nextAtmTime = timestamp;
  try {
    localStorage.setItem(ATM_NEXT_TIME_KEY, String(timestamp));
    sessionStorage.setItem(ATM_NEXT_TIME_KEY, String(timestamp));
  } catch {
    // Ignore storage errors
  }
}

let hasInitializedWharfSeqs = false;
let isSubscribedToBenNet = false;
let isStockingBait = false;
let lastObservedCashedSeq = -1;
let lastObservedNoticeSeq = -1;
let lastObservedSpunSeq = -1;

function subscribeToBenNetIfNeeded(bnStore: import('../../core/engine-access').ZustandStore<BenNetState>): void {
  if (isSubscribedToBenNet || typeof bnStore.subscribe !== 'function') return;
  isSubscribedToBenNet = true;
  try {
    bnStore.subscribe((state, prevState) => {
      if (state.atm && state.atm !== prevState?.atm) {
        lastObservedAtmRef = state.atm;
        lastAtmResponseReceivedAt = Date.now();
        if (typeof state.atm.reopen === 'number' && state.atm.reopen > Date.now()) {
          setNextAtmTime(state.atm.reopen + 3000);
        }
      }
    });
  } catch {
    // Fallback to per-tick polling in execBenStep
  }
}

function initWharfSeqsIfNeeded(bn: BenNetState): void {
  if (hasInitializedWharfSeqs) return;
  hasInitializedWharfSeqs = true;
  lastObservedCashedSeq = typeof bn.cashed?.seq === 'number' ? bn.cashed.seq : 0;
  lastObservedNoticeSeq = typeof bn.notice?.seq === 'number' ? bn.notice.seq : 0;
  lastObservedSpunSeq = typeof bn.spun?.seq === 'number' ? bn.spun.seq : 0;
}

const cricketTotal = (c: { stats?: { power?: number; tough?: number; nerve?: number } }) =>
  (c.stats?.power || 0) + (c.stats?.tough || 0) + (c.stats?.nerve || 0);

export function execBenStep(cfg: AppConfig): BenStepResult {
  const mStore = stores.main;
  const buStore = stores.benUI;
  const bnStore = stores.benNet;
  if (!mStore || !buStore || !bnStore) {
    return { acted: false };
  }

  const m = mStore.getState();
  const bu = buStore.getState();
  const bn = bnStore.getState();

  subscribeToBenNetIfNeeded(bnStore);

  if (bn.atm && bn.atm !== lastObservedAtmRef) {
    lastObservedAtmRef = bn.atm;
    lastAtmResponseReceivedAt = Date.now();
    if (typeof bn.atm.reopen === 'number' && bn.atm.reopen > Date.now()) {
      setNextAtmTime(bn.atm.reopen + 3000);
    }
  }

  if (m.screen !== 'benDo' || bn.status !== 'in') {
    return { acted: false };
  }
  initWharfSeqsIfNeeded(bn);
  refreshCricketWatchers(cfg);
  if (bu.walking || bn.fishing !== 'idle') {
    return { acted: false };
  }

  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  // Bến Đò uses its own independent showFullActions config, not affected by global settings
  const benShowFullActions = Boolean(cfg.benShowFullActions);
  if (benShowFullActions && bu.panel && Date.now() < keepBenPanelUntil) {
    return { acted: true, msg: keepBenPanelMsg || '👁️ Đang hiển thị giao diện thao tác...' };
  }

  const rawScene = getActiveScene('BenDoScene');
  const benScene = rawScene as unknown as {
    goFarmer?: (tile: { x: number; y: number }, cb?: () => void) => void;
    farmer?: {
      tile?: { x: number; y: number };
      running?: boolean;
      lookAt?: (x: number, y: number) => void;
    };
  } | null;

  const wallet = bn.wallet;
  if (!wallet) return { acted: false };

  // Watch for ATM cash success confirmation from server
  if (bn.cashed && typeof bn.cashed.seq === 'number' && bn.cashed.seq !== lastObservedCashedSeq) {
    lastObservedCashedSeq = bn.cashed.seq;
    const cashed = bn.cashed;
    const nextHour = (typeof bn.atm?.reopen === 'number' && bn.atm.reopen > Date.now())
      ? bn.atm.reopen + 3000
      : getNextHourTimestamp(Date.now()) + 3000;
    const nextHourStr = new Date(nextHour).toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    lastAtmExchangeAt = Date.now();
    setNextAtmTime(nextHour);
    if (buStore.getState().panel === 'atm') {
      buStore.setState({ panel: null });
    }
    return {
      acted: true,
      msg: `🏧 Cây ATM: 🎉 Đổi thành công ${cashed.shells.toLocaleString('vi-VN')} vỏ sò ➔ ${cashed.money.toLocaleString('vi-VN')}đ tiền mặt! Lần đổi kế tiếp lúc ${nextHourStr}`,
    };
  }

  // Watch for ATM server error notices
  if (bn.notice && typeof bn.notice.seq === 'number' && bn.notice.seq !== lastObservedNoticeSeq) {
    lastObservedNoticeSeq = bn.notice.seq;
    const err = bn.notice.error;
    if (err === 'tired') {
      benNoticeTired = true;
      return {
        acted: true,
        msg: '😮‍💨 Bến Đò: Không đủ Sức câu -> Chuẩn bị đi ăn hồi phục Sức...',
      };
    } else if (err === 'farAtm') {
      lastAtmQuerySentAt = 0;
      return {
        acted: true,
        msg: '⚠️ Cây ATM: Đứng ngay trước cây ATM mới rút tiền được nha 🏧',
      };
    } else if (err === 'atmLimit') {
      const nextHour = (typeof bn.atm?.reopen === 'number' && bn.atm.reopen > Date.now())
        ? bn.atm.reopen + 3000
        : getNextHourTimestamp(Date.now()) + 3000;
      setNextAtmTime(nextHour);
      if (buStore.getState().panel === 'atm') {
        buStore.setState({ panel: null });
      }
      const nextHourStr = new Date(nextHour).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
      return {
        acted: true,
        msg: `⏳ Cây ATM: Giờ này nhận chạm hạn mức tiền rồi, bớt số sò hoặc chờ tới ${nextHourStr} đổi tiếp nha ⏳`,
      };
    } else if (err === 'atmMin') {
      return {
        acted: true,
        msg: '⚠️ Cây ATM: Mỗi lần đổi ít nhất 100 vỏ sò nha 🏧',
      };
    }
  }

  // Watch for wheel spin results from server
  if (bn.spun && typeof bn.spun.seq === 'number' && bn.spun.seq !== lastObservedSpunSeq) {
    lastObservedSpunSeq = bn.spun.seq;
    const spun = bn.spun;
    const hits = Array.isArray(spun.hits) ? spun.hits : [];
    const totalShells = hits.reduce(
      (sum: number, h: { shells?: number }) => sum + (Number(h.shells) || 0),
      0
    );
    const wonItemIds: string[] = [];
    if (spun.won) {
      wonItemIds.push(spun.won);
    }
    for (const h of hits) {
      if (h.item && !wonItemIds.includes(h.item)) {
        wonItemIds.push(h.item);
      }
    }

    const msg = wonItemIds.length > 0
      ? (() => {
          const itemLabels = wonItemIds.map((id) => {
            const meta = WHEEL_ITEM_METAS[id];
            return meta ? `"${meta.name}" (${meta.tierLabel})` : `"${id}"`;
          });
          return `🏮 Vòng quay Cô Bảy: 🎉 TRÚNG ${itemLabels.join(', ')}!${totalShells > 0 ? ` (+${totalShells.toLocaleString('vi-VN')} vỏ sò 🐚)` : ''}`;
        })()
      : `🏮 Vòng quay Cô Bảy: Kết quả quay${hits.length > 0 ? ` (x${hits.length})` : ''} ➔ Nhận +${totalShells.toLocaleString('vi-VN')} vỏ sò an ủi 🐚`;
    return {
      acted: true,
      msg,
    };
  }

  const huntEnabled = cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false;
  const bossEnabled = cfg.benSubEnabled?.cricketBoss !== false && cfg.benAutoBossBout !== false;
  const arenaEnabled = cfg.benSubEnabled?.cricketBoss !== false && (bossEnabled || Boolean(cfg.benAutoBet));

  // Active hunt: stay still so no other task walks the player off the field.
  if (bn.hunt) {
    if (bn.hunt.phase === 'light' && Date.now() - huntLightAt > HUNT_LIGHT_STALE_MS) {
      bnStore.setState({ hunt: null });
      return { acted: false };
    }
    const hop = bn.hunt.phase === 'hop' ? bn.hunt.hop : undefined;
    return {
      acted: true,
      msg: hop
        ? `🦗 Dế đang nhảy (còn ${hop.left} lần) -> canh bụi cỏ ${hop.spot + 1} để úp...`
        : bn.hunt.rarity
          ? '🦗 Nghe tiếng dế gáy, đang chờ nó nhảy ra...'
          : '🔦 Đang rọi đèn nghe ngóng tiếng dế gáy...',
    };
  }

  // Own bout in progress: stay at the arena (tickles are handled by the watcher).
  const myBout = getMyBout(bn);
  if (myBout) {
    hadMyBout = true;
    const { bout, side } = myBout;
    return {
      acted: true,
      msg: `🥊 Sới Dế: Đang thi đấu ${bout.n ? `(giáp ${bout.n}/12)` : '(sắp vào trận)'} · còn ${bout.tickles?.[side] ?? 0} lần khều râu`,
    };
  }
  if (hadMyBout) {
    // Bout just ended: refresh arena + tube so rest timers and paid rewards are up to date.
    hadMyBout = false;
    markActed('ben_boss_wait');
    sendBenWs({ t: 'soi' });
    sendBenWs({ t: 'crickets' });
  }

  // Cricket/arena state is null until requested; it can be fetched from anywhere on the map.
  if ((huntEnabled || arenaEnabled) && (!bn.crickets || !bn.soi) && canAct('ben_cricket_init', 5000)) {
    markActed('ben_cricket_init');
    if (!bn.crickets) sendBenWs({ t: 'crickets' });
    if (!bn.soi) sendBenWs({ t: 'soi' });
  } else if (arenaEnabled && bn.soi && canAct('ben_soi_refresh', 60000)) {
    markActed('ben_soi_refresh');
    sendBenWs({ t: 'soi' });
  }

  if (canAct('ben_board_bg_refresh', 60000)) {
    markActed('ben_board_bg_refresh');
    sendBenWs({ t: 'board' });
  }


  const stamina = computeBenStamina(wallet);
  const shells = wallet.shells || 0;
  const bait = wallet.bait || 0;
  const nonKeptFish = Array.isArray(bn.basket)
    ? bn.basket.filter((x: { kept?: boolean; price?: number }) => !x.kept)
    : [];
  const nonKeptCount = nonKeptFish.length;
  const totalSellShells = nonKeptFish.reduce(
    (sum: number, x: { price?: number }) => sum + (Number(x.price) || 0),
    0
  );
  const pack = bn.pack || {};
  const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);

  const runWithOptionalPanel = (
    actionFn: () => void,
    label: string,
    panelState?: Record<string, unknown>,
    holdMs = 1500
  ) => {
    if (benShowFullActions && panelState) {
      buStore.setState(panelState);
      keepBenPanelUntil = Date.now() + holdMs;
      keepBenPanelMsg = label;
      setTimeout(() => {
        actionFn();
      }, 250);
    } else {
      actionFn();
      buStore.setState({ panel: null });
    }
  };

  const walkAndRun = (
    tile: { x: number; y: number },
    actionFn: () => void,
    label: string,
    actionKey: string | null = null,
    panelState?: Record<string, unknown>,
    holdMs = 1500
  ) => {
    if (actionKey && !canAct(actionKey)) {
      return { acted: false };
    }
    if (benScene && typeof benScene.goFarmer === 'function') {
      const cur = benScene.farmer?.tile;
      if (cur && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
        if (actionKey) markActed(actionKey);
        runWithOptionalPanel(actionFn, label, panelState, holdMs);
        return { acted: true, msg: label };
      }
      if (benScene.farmer?.running) {
        return { acted: true, msg: `🚶 Đang di chuyển...` };
      }
      benScene.goFarmer(tile, () => {
        setTimeout(() => {
          if (!actionKey || canAct(actionKey)) {
            if (actionKey) markActed(actionKey);
            runWithOptionalPanel(actionFn, label, panelState, holdMs);
          }
        }, 250);
      });
      return { acted: true, msg: `🚶 ${label}` };
    }
    if (actionKey) markActed(actionKey);
    runWithOptionalPanel(actionFn, label, panelState, holdMs);
    return { acted: true, msg: label };
  };

  const foodPrices: Record<string, number> = {
    banhMi: 10,
    chaoCa: 14,
    huTieu: 20,
    comTam: 28,
    lauMam: 45,
  };
  const prefFood = cfg.benPreferFood || 'lauMam';
  const targetFoodPrice = foodPrices[prefFood] || 45;

  if (stamina >= 25 && bn.notice?.error !== 'tired') {
    benNoticeTired = false;
  }
  // Tự động nhận diện không đủ sức: liveStamina < 4, nhận notice 'tired' từ server hoặc flag benNoticeTired
  const isStaminaDepleted = stamina < 4 || bn.notice?.error === 'tired' || benNoticeTired;
  const needShellsForBait = bait <= 0 && shells < 15;
  const needShellsForFood =
    isStaminaDepleted &&
    packItems.length === 0 &&
    shells < targetFoodPrice;

  // Helper: Recover Stamina (Dùng chung cho cả Câu cá & Bắt dế khi Sức <= 0)
  const tryRecoverStamina = (): BenStepResult | null => {
    if (isStaminaDepleted) {
      if (cfg.benAutoRecoverStamina !== false) {
        // Eat from pack
        if (packItems.length > 0 && canAct('ben_eat_pack', 3000)) {
          const packItem = packItems[0];
          const packLabel = BEN_PACK_NAMES[packItem] || packItem;
          markActed('ben_eat_pack');
          runWithOptionalPanel(
            () => {
              sendBenWs({ t: 'eat', item: packItem });
            },
            `Đã ăn ${packLabel} trong balo hồi Sức`,
            { panel: 'pack', bagTab: 'food' },
            1400
          );
          return { acted: true, msg: `Đã ăn ${packLabel} trong balo hồi Sức` };
        }

        // Út Mười shampoo
        if (cfg.benAutoGoiDau !== false && shells >= 25 && canAct('ben_goi_dau', 4000)) {
          return walkAndRun(
            { x: 16, y: 24 },
            () => {
              sendBenWs({ t: 'buy', item: 'goiDau' });
            },
            `💆 Gội đầu massage tại Tiệm Út Mười (+50⚡, -25🐚)`,
            'ben_goi_dau',
            { panel: 'hair' },
            1500
          );
        }

        // Buy food from Dì Tám ({ x: 39, y: 23 })
        const buyItem =
          shells >= targetFoodPrice
            ? prefFood
            : shells >= 28
              ? 'comTam'
              : shells >= 20
                ? 'huTieu'
                : shells >= 14
                  ? 'chaoCa'
                  : 'banhMi';

        const foodCost = foodPrices[buyItem] || 10;
        const foodLabel = BEN_FOOD_NAMES[buyItem] || buyItem;
        if (shells >= foodCost && canAct('ben_buy_food', 4000)) {
          return walkAndRun(
            { x: 39, y: 23 },
            () => {
              sendBenWs({ t: 'buy', item: buyItem });
            },
            `Mua ${foodLabel} tại Quán ăn Dì Tám (-${foodCost}🐚)`,
            'ben_buy_food',
            { panel: 'food' },
            1500
          );
        }

        // Fallback: Drink iced tea at Chị Thơm
        if (shells >= 3 && canAct('ben_drink', 4000)) {
          return walkAndRun(
            { x: 26, y: 12 },
            () => {
              sendBenWs({ t: 'buy', item: 'traDa' });
            },
            `Uống ${BEN_DRINK_NAMES.traDa} tại Xe trà đá Chị Thơm (-3🐚)`,
            'ben_drink',
            { panel: 'tea', teaStand: 'river' },
            1500
          );
        }

        if (!canAct('ben_buy_food', 4000) || !canAct('ben_eat_pack', 3000) || !canAct('ben_goi_dau', 4000) || !canAct('ben_drink', 4000)) {
          return { acted: true, msg: '🍚 Đang chờ ăn hồi phục Sức...' };
        }
      }

      if (isStaminaDepleted) {
        if (cfg.benAutoSell !== false && nonKeptCount > 0) {
          return walkAndRun(
            { x: 40, y: 10 },
            () => {
              sendBenWs({ t: 'sell' });
            },
            `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚) để lấy tiền ăn`,
            'ben_sell',
            { panel: 'sell' },
            1400
          );
        }

        return {
          acted: false,
          exhausted: true,
          reason: '😮‍💨 Bến Đò: Không đủ Sức (≤ 0⚡) và không đủ vỏ sò để ăn/gội đầu -> Chuyển khu vực tiếp theo!',
        };
      }
    }
    return null;
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 1: FISHING (Câu cá & Bán cá Bến Đò)
  // ---------------------------------------------------------------------------
  const runFishingStep = (): BenStepResult => {
    // 0. Tự động bỏ giữ cá trùng loại nếu bật benAutoSellDuplicateKept (chỉ giữ 1 con đắt nhất mỗi loài)
    if (cfg.benAutoSellDuplicateKept !== false && Array.isArray(bn.basket)) {
      const keptList = bn.basket.filter(
        (x: { kept?: boolean; id?: string; fish?: string; price?: number; size?: number }) =>
          Boolean(x.kept) && Boolean(x.id)
      );
      const bySpecies = new Map<string, typeof keptList>();
      for (const f of keptList) {
        const key = f.fish || 'unknown';
        if (!bySpecies.has(key)) bySpecies.set(key, []);
        bySpecies.get(key)!.push(f);
      }
      for (const [, list] of bySpecies.entries()) {
        if (list.length > 1) {
          list.sort(
            (a, b) =>
              (Number(b.price) || 0) - (Number(a.price) || 0) ||
              (Number(b.size) || 0) - (Number(a.size) || 0)
          );
          for (const dup of list.slice(1)) {
            if (dup.id && canAct(`ben_unkeep_${dup.id}`, 1000)) {
              markActed(`ben_unkeep_${dup.id}`);
              sendBenWs({ t: 'keep', id: dup.id, on: false });
              const fishName = (dup as { name?: string }).name || dup.fish || 'Cá';
              return {
                acted: true,
                msg: `🔄 Bỏ giữ cá trùng: ${fishName} (${Number(dup.price || 0).toLocaleString('vi-VN')}🐚) để bán (ưu tiên giữ con ${Number(list[0].price || 0).toLocaleString('vi-VN')}🐚)`,
              };
            }
          }
        }
      }
    }

    // 1. Sell basket at Vựa cá Anh Tư khi giỏ cá đầy (60 con) hoặc khi thiếu sò mua mồi/ăn uống
    const isBasketFull = nonKeptCount >= 60 || bn.notice?.error === 'basketFull';
    if (
      cfg.benAutoSell !== false &&
      nonKeptCount > 0 &&
      (isBasketFull || needShellsForBait || needShellsForFood)
    ) {
      return walkAndRun(
        { x: 40, y: 10 },
        () => {
          sendBenWs({ t: 'sell' });
        },
        `🐟 Bán ${nonKeptCount} con cá tại Vựa Anh Tư (+${totalSellShells.toLocaleString('vi-VN')} vỏ sò 🐚)${isBasketFull ? ' (Giỏ đã đầy 60/60)' : ''}`,
        'ben_sell',
        { panel: 'sell' },
        1400
      );
    }

    // 2. Recover Stamina when low
    const stamRes = tryRecoverStamina();
    if (stamRes) return stamRes;

    // 3. Buy Bait when out of bait or stocking up to benBaitMaxCount
    const maxBait = typeof cfg.benBaitMaxCount === 'number' ? cfg.benBaitMaxCount : 10000;
    const minShellsForBait = typeof cfg.benBaitMinShells === 'number' ? cfg.benBaitMinShells : 10000;

    if (bait <= 0) {
      isStockingBait = true;
    } else if (bait >= maxBait || shells < minShellsForBait) {
      isStockingBait = false;
    }

    if (isStockingBait && cfg.benAutoBuyBait !== false) {
      const baitPrices: Record<string, number> = {
        moi20: 15,
        moi60: 40,
        moi150: 90,
      };
      const prefBait = cfg.benPreferBait || 'moi150';
      const buyBaitChoice =
        shells >= (baitPrices[prefBait] || 40)
          ? prefBait
          : shells >= 15
            ? 'moi20'
            : 'xinMoi';

      const baitCost = baitPrices[buyBaitChoice] || 0;
      const canAfford = shells >= minShellsForBait + baitCost || (bait <= 0 && shells >= baitCost);

      if (buyBaitChoice !== 'xinMoi' && canAfford && canAct('ben_bait', 1200)) {
        const baitLabel = BEN_BAIT_NAMES[buyBaitChoice] || buyBaitChoice;
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: 'buy', item: buyBaitChoice });
          },
          `Mua ${baitLabel} tại Sạp Chú Đực (-${baitCost}🐚, hiện có ${bait}/${maxBait} mồi)`,
          'ben_bait',
          { panel: 'bait' },
          1200
        );
      }

      if (bait > 0 && shells < minShellsForBait) {
        isStockingBait = false;
      }
    }

    if (bait <= 0) {
      const xinMoiBlocked =
        shells > 0 ||
        (lastXinMoiDay === (m.day || 0) && Date.now() - lastXinMoiAt < 600000) ||
        bn.notice?.error === 'used' ||
        bn.notice?.error === 'noFree';

      if (!xinMoiBlocked && canAct('ben_bait', 3000)) {
        setLastXinMoi(Date.now(), m.day || 0);
        return walkAndRun(
          { x: 53, y: 11 },
          () => {
            sendBenWs({ t: 'buy', item: 'xinMoi' });
          },
          `Xin ${BEN_BAIT_NAMES.xinMoi} tại Sạp Chú Đực`,
          'ben_bait',
          { panel: 'bait' },
          1500
        );
      }

      return {
        acted: false,
        exhausted: true,
        reason: '🪱 Bến Đò: Đã hết mồi & không đủ điều kiện mua tiếp -> Chuyển khu vực tiếp theo!',
      };
    }

    // 4. Drink Luck Tea
    if (cfg.benAutoLuckDrink && (wallet.luckCasts || 0) <= 0 && canAct('ben_luck_drink', 5000)) {
      const drinkId = cfg.benPreferDrink || 'nuocMia';
      const drinkPrices: Record<string, number> = { traDa: 3, nuocMia: 15, rauMa: 30, caPhe: 35, duaTuoi: 80 };
      const drinkCost = drinkPrices[drinkId] || 15;
      const drinkLabel = BEN_DRINK_NAMES[drinkId] || drinkId;
      if (shells >= drinkCost) {
        return walkAndRun(
          { x: 26, y: 12 },
          () => {
            sendBenWs({ t: 'buy', item: drinkId });
          },
          `Uống ${drinkLabel} tại Xe trà đá Chị Thơm (-${drinkCost}🐚)`,
          'ben_luck_drink',
          { panel: 'tea', teaStand: 'river' },
          1500
        );
      }
    }

    // 5. Walk to fishing spot, then let the content runner cast (deferred so ready bounded tasks go first)
    if (cfg.benAutoSpot !== false) {
      const spotChoice = cfg.benSpot || 'bank';
      const spotTargets: Record<string, { x: number; y: number; kind: string; label: string }> = {
        dock: { x: 31, y: 3, kind: 'dock', label: 'Cầu tàu lớn (Đầu mũi)' },
        bamboo: { x: 7, y: 6, kind: 'dock', label: 'Cầu tre lắt lẻo' },
        bank: { x: 24, y: 10, kind: 'bank', label: 'Bờ sông bến giữa' },
        bridge: { x: 46, y: 15, kind: 'dock', label: 'Cầu ván qua lạch' },
      };
      const target = spotTargets[spotChoice] || spotTargets.bank;
      const curTile = benScene?.farmer?.tile;
      const atSpot = curTile
        ? curTile.x === target.x && curTile.y === target.y
        : bu.spot === target.kind;

      if (!atSpot && (spotChoice as string) !== 'any') {
        if (benScene && typeof benScene.goFarmer === 'function') {
          const goFarmer = benScene.goFarmer.bind(benScene);
          return {
            acted: false,
            deferred: () => {
              if (benScene.farmer?.running) return { acted: true, msg: '🚶 Đang di chuyển...' };
              goFarmer({ x: target.x, y: target.y });
              return { acted: true, msg: `🚶 Đang đi ra ${target.label} (${target.x}, ${target.y}) câu cá...` };
            },
          };
        }
      }
    }

    return { acted: false, deferred: () => ({ acted: false, allowCast: true }) };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 2: CRICKET ARENA & BOSS FIGHT (Sới dế Ông Sáu)
  // Tickles and arena bets are timing-critical and run in cricket-watchers.ts.
  // ---------------------------------------------------------------------------
  const runCricketBossStep = (): BenStepResult => {
    if (!bossEnabled) {
      return { acted: false };
    }

    if (!bn.soi) {
      if (canAct('ben_soi_fetch', 4000)) {
        markActed('ben_soi_fetch');
        sendBenWs({ t: 'soi' });
        return { acted: true, msg: '🥊 Đang tải danh sách Boss Sới Dế Ông Sáu...' };
      }
      return { acted: false };
    }

    if (!canAct('ben_boss_wait', 3000)) {
      return { acted: false };
    }

    const npcs: SoiNpc[] = bn.soi.npcs || [];
    let targetNpcId: string | null = null;
    let nextBossMeta: (typeof BOSS_LADDER)[number] | null = null;

    for (const b of BOSS_LADDER) {
      const npcState = npcs.find((n: SoiNpc) => {
        const nid = String(n.id).toLowerCase();
        return b.aliases.some((a) => nid === a || nid.includes(a));
      });
      if (npcState && npcState.open && !npcState.paidToday) {
        targetNpcId = npcState.id;
        nextBossMeta = b;
        break;
      }
    }
    if (!nextBossMeta) return { acted: false };

    const box: CricketItem[] = bn.soi.box?.length ? bn.soi.box : bn.crickets?.box || [];
    const nowServer = getBenServerNow(bn);
    const readyCrickets = box
      .filter((c) => (!c.restUntil || c.restUntil <= nowServer) && (!c.diesAt || c.diesAt > nowServer))
      .sort((a, b) => {
        // Weighted combat score: Power (damage) 1.2 > Tough (grit/hp) 1.1 > Nerve (morale) 1.0
        const combatScore = (c: CricketItem) =>
          (c.stats?.power || 0) * 1.2 + (c.stats?.tough || 0) * 1.1 + (c.stats?.nerve || 0) * 1.0;
        return combatScore(b) - combatScore(a);
      });
    const bestCricket = readyCrickets[0];
    if (!bestCricket) return { acted: false };

    const bossNpcId = targetNpcId || nextBossMeta.id;
    const cTotal = cricketTotal(bestCricket);
    const cName = CRICKET_SPECIES_NAMES[bestCricket.species] || 'Dế';
    return walkAndRun(
      SOI_TILE,
      () => {
        sendBenWs({ t: 'bout', npc: bossNpcId, cricket: bestCricket.id });
      },
      `🥊 Thách đấu ${nextBossMeta.name} tại Sới Dế (+${nextBossMeta.reward}🐚) với ${cName} (Tổng: ${cTotal} vs ${nextBossMeta.total})`,
      'ben_boss_bout',
      { panel: 'soi' },
      1200
    );
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 3: CRICKET HUNT & TUBE CARE (Bắt dế đêm & Nuôi dế ống tre)
  // The trap timing itself runs in cricket-watchers.ts.
  // ---------------------------------------------------------------------------
  const runCricketHuntStep = (): BenStepResult => {
    if (!huntEnabled || !bn.crickets) {
      return { acted: false };
    }
    const box: CricketItem[] = bn.crickets.box || [];

    // 1. Night window check (wharf runs on real Vietnam time, 18h-5h)
    const hour = getBenHour(bn);
    const isNight = hour >= 18 || hour < 5;
    const isRareHour = hour >= 23 || hour < 4;
    if (!isNight || (cfg.benHuntRareOnly && !isRareHour)) {
      return { acted: false };
    }

    // 3. Full tube: release cricket according to smart priority rules (keep high rarity, high CP, configured species)
    if (box.length >= CRICKET_BOX_MAX) {
      if (cfg.benAutoReleaseLowCricket === false || !canAct('ben_cricket_release', 3000)) {
        return { acted: false };
      }

      const keepSpecies = Array.isArray(cfg.benKeepCricketSpecies)
        ? cfg.benKeepCricketSpecies
        : ['deVuong', 'deMa', 'deSat', 'deNgoc', 'deLua', 'deVang'];
      const keepRarities = Array.isArray(cfg.benKeepCricketRarities)
        ? cfg.benKeepCricketRarities
        : ['rare', 'epic', 'legendary'];

      const rankOrder: Record<string, number> = {
        common: 1,
        uncommon: 2,
        rare: 3,
        epic: 4,
        legendary: 5,
      };

      // Sort candidate to release to the front (index 0 is the least desirable / weakest)
      const sortedBox = [...box].sort((a, b) => {
        const rarityA = CRICKET_SPECIES_RARITY[a.species] || 'common';
        const rarityB = CRICKET_SPECIES_RARITY[b.species] || 'common';
        const rankA = rankOrder[rarityA] || 1;
        const rankB = rankOrder[rarityB] || 1;

        const wantedA = keepSpecies.includes(a.species) || keepRarities.includes(rarityA);
        const wantedB = keepSpecies.includes(b.species) || keepRarities.includes(rarityB);

        // 1. Unwanted species / rarities are released before wanted ones
        if (wantedA !== wantedB) {
          return wantedA ? 1 : -1;
        }

        // 2. Lower rarity crickets are released before higher rarity
        if (rankA !== rankB) {
          return rankA - rankB;
        }

        // 3. Lower CP crickets are released before higher CP
        const cpA = cricketTotal(a);
        const cpB = cricketTotal(b);
        if (cpA !== cpB) {
          return cpA - cpB;
        }

        // 4. Lower potential cap total released first
        const capA = (a.caps?.power || 0) + (a.caps?.tough || 0) + (a.caps?.nerve || 0);
        const capB = (b.caps?.power || 0) + (b.caps?.tough || 0) + (b.caps?.nerve || 0);
        return capA - capB;
      });

      const lowest = sortedBox[0];
      const lowestRarity = CRICKET_SPECIES_RARITY[lowest.species] || 'common';
      const lowestCp = cricketTotal(lowest);

      markActed('ben_cricket_release');
      sendBenWs({ t: 'release', id: lowest.id });
      const cName = CRICKET_SPECIES_NAMES[lowest.species] || 'Dế';
      const rarityLabelMap: Record<string, string> = {
        common: 'Thường',
        uncommon: 'Đặc biệt',
        rare: 'Hiếm',
        epic: 'Sử thi',
        legendary: 'Huyền thoại',
      };
      const rarityStr = rarityLabelMap[lowestRarity] || lowestRarity;

      return {
        acted: true,
        msg: `🎋 Ống tre đầy (6/6) -> Thả ${cName} (CP ${lowestCp} · ${rarityStr}) về đồng (+${CRICKET_RARITY_REFUND[lowestRarity] || 5}🐚)`,
      };
    }

    // 4. Stamina: each light costs 3
    if (stamina < HUNT_STAMINA_COST) {
      const stamRes = tryRecoverStamina();
      if (stamRes) return stamRes;
      return {
        acted: false,
        exhausted: true,
        reason: '😮‍💨 Bến Đò: Hết Sức rọi đèn bắt dế đêm -> Chuyển khu vực tiếp theo!',
      };
    }

    // 5. Hunt spot & zone selection
    const zoneChoice = cfg.benHuntZone || 'field';
    if (zoneChoice !== lastHuntZoneChoice) {
      lastHuntZoneChoice = zoneChoice;
      huntSpotIdx = 0;
    }
    const spots = getBenHuntSpots(zoneChoice);
    if (!spots || spots.length === 0) {
      return { acted: false };
    }

    // Handle gotAway: only move to next tile when empty bush / no crickets heard ('none')
    const gotAway = bn.gotAway;
    if (gotAway && typeof gotAway.seq === 'number' && gotAway.seq !== lastHandledGotAwaySeq) {
      lastHandledGotAwaySeq = gotAway.seq;
      if (gotAway.why === 'none') {
        huntSpotIdx = (huntSpotIdx + 1) % spots.length;
        const nextSpot = spots[huntSpotIdx % spots.length];
        const nextMeta = BEN_HUNT_ZONES[nextSpot.zone] ?? BEN_HUNT_ZONES.field;
        return {
          acted: true,
          msg: `🌾 Bụi này im re không có tiếng dế -> Di chuyển sang ${nextMeta.label} (${nextSpot.x}, ${nextSpot.y}) tìm dế...`,
        };
      }
    }

    const currentSpot = spots[huntSpotIdx % spots.length];
    const zoneMeta = BEN_HUNT_ZONES[currentSpot.zone] ?? BEN_HUNT_ZONES.field;

    // 6. Walk to target spot and shine flashlight
    return {
      acted: false,
      deferred: () => {
        if (!benScene || typeof benScene.goFarmer !== 'function') return { acted: false };
        const cur = benScene.farmer?.tile;
        const atTarget = Boolean(
          cur && Math.abs(cur.x - currentSpot.x) <= 1 && Math.abs(cur.y - currentSpot.y) <= 1
        );

        if (!atTarget) {
          if (benScene.farmer?.running) {
            return { acted: true, msg: `🚶 Đang di chuyển sang ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y})...` };
          }
          benScene.goFarmer({ x: currentSpot.x, y: currentSpot.y });
          return { acted: true, msg: `🚶 Ra ${zoneMeta.label} (${currentSpot.x}, ${currentSpot.y}) săn dế đêm...` };
        }

        if (!canAct('ben_hunt_light', 2500)) {
          return { acted: true, msg: '🔦 Chuẩn bị rọi đèn bắt dế...' };
        }

        markActed('ben_hunt_light');
        markHuntLightSent();
        huntLightAt = Date.now();
        bnStore.setState({ hunt: { phase: 'light' } });
        sendBenWs({ t: 'light' });

        return {
          acted: true,
          msg: `🔦 Rọi đèn bắt dế đêm tại ${zoneMeta.label} (⚡${HUNT_STAMINA_COST} Sức · ống tre ${box.length}/${CRICKET_BOX_MAX})`,
        };
      },
    };
  };

  // ---------------------------------------------------------------------------
  // SUB-AREA RUNNER 4: ENTERTAINMENT & UTILITIES (Lồng đèn, Vé số, ATM)
  // ---------------------------------------------------------------------------
  const runEntertainmentStep = (): BenStepResult => {
    // A. Sạp lồng đèn Cô Bảy (bắt buộc lội bộ ra tận nơi, không kiểm tra hay thao tác từ xa)
    if (cfg.benAutoLantern !== false) {
      const tickets = wallet.tickets || 0;
      const boughtToday = bn.wheel?.bought ?? 0;
      const needBuyTicket =
        Boolean(cfg.benBuyLanternTicket) &&
        (!bn.wheel || boughtToday < 5) &&
        shells >= 600;
      const shouldSpin = cfg.benLanternSpinMode === 'x1' ? tickets > 0 : tickets >= 10;

      // Chỉ đi lại sạp khi có việc cần làm (cần mua vé hoặc có vé để quay)
      if (needBuyTicket || shouldSpin) {
        const curTile = benScene?.farmer?.tile;
        const isAtLanternSpot = Boolean(
          curTile && Math.abs(curTile.x - 37) <= 1 && Math.abs(curTile.y - 28) <= 1
        );

        if (!isAtLanternSpot) {
          return walkAndRun(
            { x: 37, y: 28 },
            () => {
              if (benScene?.farmer?.lookAt) {
                benScene.farmer.lookAt(39 * 16, 28 * 16);
              }
              sendBenWs({ t: 'wheel' });
            },
            `Đi lại Sạp Lồng Đèn Cô Bảy để ${shouldSpin ? `quay ${tickets} vé 🎟️` : 'mua vé quay'}...`,
            'ben_lantern_walk',
            { panel: 'lantern' }
          );
        }

        // Đã đứng tại Sạp Lồng Đèn Cô Bảy { x: 37, y: 28 }
        if (benScene?.farmer?.lookAt) {
          benScene.farmer.lookAt(39 * 16, 28 * 16);
        }

        // 1. Kiểm tra trạng thái vòng quay nếu chưa có dữ liệu
        if (!bn.wheel && canAct('ben_wheel_query', 3000)) {
          markActed('ben_wheel_query');
          sendBenWs({ t: 'wheel' });
          return { acted: true, msg: '🏮 Đang hỏi Cô Bảy thông tin vòng quay...' };
        }

        // 2. Tự mua 5 lượt vé quay tại sạp
        if (cfg.benBuyLanternTicket && boughtToday < 5 && shells >= 600) {
          if (canAct('ben_lantern_buy', 1500)) {
            markActed('ben_lantern_buy');
            sendBenWs({ t: 'ticket' });
            return {
              acted: true,
              msg: `🎟️ Cô Bảy: Nè, một vé. Quay đi con! (${boughtToday + 1}/5 · -600 vỏ sò 🐚)`,
            };
          }
          return {
            acted: true,
            msg: `🎟️ Đang mua vé quay tại Sạp Cô Bảy (${boughtToday}/5)...`,
          };
        } else if (cfg.benBuyLanternTicket && boughtToday >= 5 && canAct('ben_lantern_limit_log', 120000)) {
          markActed('ben_lantern_limit_log');
          return {
            acted: true,
            msg: '🏮 Cô Bảy: Hôm nay cô bán đủ 5 vé rồi, mai ghé nha. Ra câu đi, cá còn ngậm vé đó!',
          };
        } else if (cfg.benBuyLanternTicket && shells < 600 && boughtToday < 5 && canAct('ben_lantern_poor_log', 60000)) {
          markActed('ben_lantern_poor_log');
          return {
            acted: true,
            msg: `🏮 Cô Bảy: Thiếu vỏ sò rồi con. (cần 600🐚, hiện có ${shells}🐚)`,
          };
        }

        // 3. Quay vé lồng đèn Cô Bảy tại sạp (quay liên tục cho tới khi hết vé eligible)
        if (shouldSpin) {
          if (canAct('ben_lantern_spin', 2500)) {
            markActed('ben_lantern_spin');
            const curBn = bnStore.getState();
            const curPicks = curBn.wheel?.picks || [];
            const ownedCloset = Array.isArray(curBn.closet) ? curBn.closet : [];
            const unownedWheel = WHEEL_ITEM_IDS.filter((id) => !ownedCloset.includes(id));
            const needPicks = Math.min(3, unownedWheel.length);
            if (needPicks > 0 && curPicks.length < needPicks) {
              sendBenWs({ t: 'pick', items: unownedWheel.slice(0, needPicks) });
            }
            const spinCount = cfg.benLanternSpinMode === 'x1' ? 1 : 10;
            sendBenWs({ t: 'spin', n: spinCount });
            return {
              acted: true,
              msg: `🏮 Vòng quay Cô Bảy: Đang quay ${spinCount} vé tại sạp (còn ${tickets} vé 🎟️)...`,
            };
          }

          // Giữ chân nhân vật tại sạp trong thời gian chờ cooldown giữa các lượt quay (không để ATM / vựa cá kéo đi)
          return {
            acted: true,
            msg: `🏮 Vòng quay Cô Bảy: Đang chờ kết quả vòng quay (còn ${tickets} vé 🎟️)...`,
          };
        }
      } else if (tickets > 0 && cfg.benLanternSpinMode === 'x10' && canAct('ben_lantern_wait_x10', 120000)) {
        markActed('ben_lantern_wait_x10');
        return {
          acted: true,
          msg: `🏮 Vòng quay Cô Bảy: Có ${tickets}/10 vé (chờ đủ 10 vé mới quay x10) · Tiếp tục các việc khác`,
        };
      }
    }

    // B. Đại lý vé số Bến Đò
    if (cfg.benAutoLotto !== false) {
      const lottoState = bn.lotto;
      const hasWins = (lottoState?.wins?.length || 0) > 0 || (lottoState?.pending || 0) > 0;
      if (hasWins && canAct('ben_lotto_claim', 4000)) {
        return walkAndRun(
          { x: 36, y: 31 },
          () => {
            sendBenWs({ t: 'lottoClaim' });
          },
          `🎟️ Đổi thưởng vé số Bến Đò tại Đại lý Chú Bảy (+${(lottoState?.pending || 0).toLocaleString('vi-VN')}🐚)`,
          'ben_lotto_claim',
          { panel: 'agent' },
          1500
        );
      }

      if (cfg.benAutoBuyLotto && shells >= 10 && canAct('ben_lotto_buy', 60000)) {
        const sellingDay = lottoState?.selling;
        const alreadyBought = (lottoState?.mine || []).some((t: { day?: number }) => t.day === sellingDay);
        if (!alreadyBought) {
          const randNum = Math.floor(Math.random() * 100);
          return walkAndRun(
            { x: 36, y: 31 },
            () => {
              sendBenWs({ t: 'lottoBuy', num: randNum, qty: 1 });
            },
            `🍀 Mua 1 vé số Bến Đò (số ${randNum < 10 ? '0' + randNum : randNum}) tại Đại lý Chú Bảy (-10🐚)`,
            'ben_lotto_buy',
            { panel: 'agent' },
            1500
          );
        }
      }
    }

    // C. Exchange shells at ATM ({x: 34, y: 35}) - bắt buộc lội bộ ra tận nơi, không kiểm tra hay thao tác từ xa
    if (cfg.benAutoAtm) {
      const now = Date.now();
      const atmMin = typeof cfg.benAtmThreshold === 'number' ? cfg.benAtmThreshold : 10000;

      // 1. Chỉ thực hiện khi số vỏ sò hiện có đạt ngưỡng cấu hình
      if (shells >= atmMin) {
        // 2. Kiểm tra xem đã tới giờ đổi chưa
        let reopenAt = 0;
        if (typeof bn.atm?.reopen === 'number' && bn.atm.reopen > now) {
          reopenAt = bn.atm.reopen;
        } else if (nextAtmTime > now) {
          reopenAt = nextAtmTime;
        }

        if (reopenAt > now) {
          if (nextAtmTime !== reopenAt) {
            setNextAtmTime(reopenAt);
          }

          const diffMs = reopenAt - now;
          const diffMin = Math.floor(diffMs / 60000);
          const diffSec = Math.floor((diffMs % 60000) / 1000);
          const waitStr = diffMin > 0 ? `${diffMin} phút ${diffSec} giây` : `${diffSec} giây`;
          const timeStr = new Date(reopenAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

          if (now - lastAtmExchangeAt > 60000 && now - lastAtmLogAt > 300000 && canAct('ben_atm_wait_log', 300000)) {
            lastAtmLogAt = now;
            markActed('ben_atm_wait_log');
            return {
              acted: true,
              msg: `⏳ Cây ATM: Chưa tới giờ đổi (mở đổi lúc ${timeStr}, còn ${waitStr}) · Tiếp tục các việc khác`,
            };
          }

          return { acted: false };
        }

        // 3. Đã tới giờ đổi và đủ sò: BẮT BUỘC lội bộ ra tận cây ATM { x: 34, y: 35 }
        const curTile = benScene?.farmer?.tile;
        const isAtAtmSpot = Boolean(curTile && curTile.x === 34 && curTile.y === 35);

        if (!isAtAtmSpot) {
          return walkAndRun(
            { x: 34, y: 35 },
            () => {
              if (benScene?.farmer?.lookAt) {
                benScene.farmer.lookAt((34 + 0.5) * 16, 34 * 16);
              }
              lastAtmQuerySentAt = Date.now();
              sendBenWs({ t: 'atm' });
            },
            'Đi lại Cây ATM để đổi vỏ sò...',
            'ben_atm_walk',
            { panel: 'atm' }
          );
        }

        // Đã đứng ngay trước cây ATM { x: 34, y: 35 }
        if (benScene?.farmer?.lookAt) {
          benScene.farmer.lookAt((34 + 0.5) * 16, 34 * 16);
        }

        // 4. BẮT BUỘC có dữ liệu tươi mới từ server tại chỗ, không dùng dữ liệu cache cũ từ giờ trước
        const hasFreshData =
          lastAtmResponseReceivedAt > 0 &&
          lastAtmResponseReceivedAt >= lastAtmQuerySentAt &&
          now - lastAtmResponseReceivedAt < 30000;

        if (!hasFreshData) {
          if (now - lastAtmQuerySentAt > 3000 && canAct('ben_atm_query', 3000)) {
            lastAtmQuerySentAt = now;
            markActed('ben_atm_query');
            sendBenWs({ t: 'atm' });
            return {
              acted: true,
              msg: '🏧 Đang kiểm tra tỷ giá và hạn mức tại Cây ATM...',
            };
          }
          return {
            acted: true,
            msg: '🏧 Đang chờ máy ATM phản hồi tỷ giá và hạn mức...',
          };
        }

        // 5. Đã có dữ liệu ATM tươi mới từ server tại chỗ, tính toán đổi tiền
        if (bn.atm) {
          const bnAtm = bn.atm;
          const rate = typeof bnAtm.rate === 'number'
            ? bnAtm.rate
            : ((m.day || 1) >= 200 ? 3000 : (m.day || 1) >= 90 ? 2000 : (m.day || 1) >= 60 ? 1000 : 500);

          const MAX_ATM_HOURLY_MONEY = 20_000_000;
          const moneyQuota = Math.min(
            MAX_ATM_HOURLY_MONEY,
            typeof bnAtm.left === 'number' ? bnAtm.left : MAX_ATM_HOURLY_MONEY
          );

          if (moneyQuota < 100 * rate) {
            const reopenMs = (typeof bnAtm.reopen === 'number' && bnAtm.reopen > now)
              ? bnAtm.reopen + 3000
              : getNextHourTimestamp(now) + 3000;
            setNextAtmTime(reopenMs);
            markActed('ben_atm_cash');
            const reopenStr = new Date(reopenMs).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            return {
              acted: true,
              msg: `⏳ Cây ATM: Giờ này hạn mức tiền đã hết (mở đổi lúc ${reopenStr}), chờ giờ sau đổi tiếp!`,
            };
          }

          const maxShellsByQuota = Math.floor(moneyQuota / rate);
          let shellsToCash = Math.min(shells, maxShellsByQuota);
          shellsToCash = Math.floor(shellsToCash / 100) * 100;

          if (shellsToCash >= 100) {
            if (now - lastAtmExchangeSentAt > 4000 && canAct('ben_atm_cash', 4000)) {
              lastAtmExchangeSentAt = now;
              markActed('ben_atm_cash');
              sendBenWs({ t: 'atmCash', shells: shellsToCash });
              return {
                acted: true,
                msg: `🏧 Đang đổi ${shellsToCash.toLocaleString('vi-VN')} vỏ sò tại Cây ATM...`,
              };
            }
            return {
              acted: true,
              msg: `🏧 Đang chờ máy ATM xác nhận đổi tiền...`,
            };
          }
        }
      }
    }

    return { acted: false };
  };

  // ---------------------------------------------------------------------------
  // DISPATCHER: EXECUTE SUB-AREAS IN ORDER DEFINED BY benSubOrder
  // Bounded tasks (boss, entertainment, maintenance) run as soon as they are ready,
  // in priority order. Continuous activities (fishing, night hunt) compete for a
  // single slot: the highest-priority available one wins and the other is skipped,
  // so the player never ping-pongs between the river and the grass field.
  // ---------------------------------------------------------------------------
  const subAreaRunners: Record<WharfSubAreaId, () => BenStepResult> = {
    fishing: runFishingStep,
    cricketBoss: runCricketBossStep,
    cricketHunt: runCricketHuntStep,
    entertainment: runEntertainmentStep,
  };
  const continuousSubs = new Set<WharfSubAreaId>(['fishing', 'cricketHunt']);

  const activeOrder: WharfSubAreaId[] =
    Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0
      ? cfg.benSubOrder
      : ['fishing', 'cricketBoss', 'cricketHunt', 'entertainment'];

  let deferred: (() => BenStepResult) | null = null;
  let exhaustedResult: BenStepResult | null = null;
  for (const subId of activeOrder) {
    if (cfg.benSubEnabled?.[subId] === false) continue;
    if (deferred && continuousSubs.has(subId)) continue;
    const runner = subAreaRunners[subId];
    if (!runner) continue;
    const result = runner();
    if (result.acted) return result;
    if (result.deferred) {
      deferred = result.deferred;
    } else if (result.exhausted && !exhaustedResult) {
      exhaustedResult = result;
    }
  }

  // Close panel if open (once hold duration expires)
  if (bu.panel && (!benShowFullActions || Date.now() >= keepBenPanelUntil)) {
    buStore.setState({ panel: null });
  }

  if (deferred) {
    const result = deferred();
    if (result.acted || result.allowCast) return result;
  }
  if (exhaustedResult) return exhaustedResult;

  return { acted: false, allowCast: false };
}
