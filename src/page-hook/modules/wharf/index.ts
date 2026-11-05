import { stores, getActiveScene, sendBenWs, discoverStores } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, WharfSubAreaId } from '../../../shared/types/config';
import {
  computeBasketKeepPlan,
  computeWharfBossStatus,
  shouldKeepFishByConfig,
  PACK_FOOD_PRICES,
} from '../../../shared/constants/wharf-catalog';
import { refreshCricketWatchers, getMyBout } from './cricket-watchers';
import { stepAlluvial, isAlluvialInTransit, getBaiSnapshot } from './alluvial';
import {
  BenStepResult,
  BenDoPhaserScene,
  BenExecutionContext,
  PanelActionContinuation,
  PanelActionOptions,
  FOOD_PRICES,
  HUNT_LIGHT_STALE_MS,
} from './types';
import {
  getWharfNextAtmTime,
  subscribeToBenNetIfNeeded,
  initWharfSeqsIfNeeded,
  syncAtmRefFromState,
  checkWharfServerEvents,
  wharfWatchState,
} from './ws-watchers';
import { runBossHuntOrImpendingStep } from './boss-hunter';
import { runFishingStep, updateSpotFishCounter, notifyLeftFishingSpot } from './fishing-manager';
import { runCricketBossStep, runCricketHuntStep, getHuntLightAt } from './cricket-arena';
import { runEntertainmentStep } from './entertainment';
import { refreshFishingWatcher, getFishingEvents } from './fishing-watcher';

export { refreshCricketWatchers, refreshFishingWatcher, getFishingEvents, stepAlluvial, getWharfNextAtmTime };

let keepBenPanelUntil = 0;
let keepBenPanelMsg = '';
let hadMyBout = false;

/** Panels whose buy/sell buttons are gated by a server shop token (`{ t: 'shop', at }` → `shop.k` + `shop.ready`). */
const SHOP_PANEL_AT: Record<string, string> = {
  bait: 'bait',
  tea: 'tea',
  food: 'food',
  hair: 'hair',
  sell: 'stall',
};
const SHOP_READY_TIMEOUT_MS = 8000;
const SHOP_CONFIRM_TIMEOUT_MS = 4000;
const SHOP_MAX_ATTEMPTS = 3;
const RETRYABLE_SHOP_ERRORS = new Set(['shopClosed', 'slow']);

interface PendingPanelAction {
  label: string;
  panelState: Record<string, unknown>;
  actionFn: () => void;
  shopAt: string | null;
  openAt: number;
  openedAt: number;
  triggerDelayMs: number;
  holdAfterMs: number;
  readySince: number;
  readyPauseMs: number;
  executedAt: number;
  attempts: number;
  baselineSig: string;
  baselineNoticeSeq: number;
  confirmed: boolean;
  closeAt: number;
  shouldContinue?: () => PanelActionContinuation;
  leaveOpen?: boolean;
}

let pendingPanel: PendingPanelAction | null = null;

function humanDelay(minMs: number, maxMs: number): number {
  return Math.floor(minMs + Math.random() * Math.max(0, maxMs - minMs));
}

/** Snapshot of everything a successful buy / sell / eat changes on the wharf store. */
function walletSignature(bn: Record<string, unknown>): string {
  const w = (bn.wallet || {}) as Record<string, unknown>;
  const seqOf = (key: string) => (bn[key] as { seq?: number } | null | undefined)?.seq ?? null;
  const pack = (bn.pack || {}) as Record<string, number>;
  const packTotal = Object.values(pack).reduce((s, n) => s + (Number(n) || 0), 0);
  return JSON.stringify([
    w.shells,
    w.bait,
    w.stamina,
    w.liveStamina,
    w.luckCasts,
    packTotal,
    seqOf('bought'),
    seqOf('sold'),
    seqOf('ate'),
  ]);
}

function hasEnabledShopButton(): boolean {
  const btn = document.querySelector<HTMLButtonElement>(
    '.ben-panel button.ben-item-buy:not(:disabled), .ben-panel button.ben-sell-btn:not(:disabled)'
  );
  return Boolean(btn && btn.offsetParent !== null);
}

function finishPendingPanel(
  buStore: { setState: (s: Record<string, unknown>) => void },
  msg: string
): BenStepResult {
  buStore.setState({ panel: null, bagTab: null });
  pendingPanel = null;
  keepBenPanelUntil = 0;
  return { acted: true, msg };
}

/**
 * Drives one queued panel action like a human: pause after arriving → open panel →
 * wait for the shop token + lit buy button → short reaction pause → act →
 * wait for the server to confirm (wallet/bought/sold changes) → linger → close.
 */
function stepPendingPanel(
  bn: Record<string, unknown>,
  bu: { panel?: unknown },
  buStore: { setState: (s: Record<string, unknown>) => void }
): BenStepResult | null {
  const p = pendingPanel;
  if (!p) return null;
  const now = Date.now();

  if (!p.openedAt) {
    if (now < p.openAt) {
      return { acted: true, msg: `🧍 Đã tới nơi, chuẩn bị mở bảng: ${p.label}` };
    }
    buStore.setState(p.panelState);
    p.openedAt = now;
    return { acted: true, msg: `📂 Mở bảng: ${p.label}` };
  }

  if (!bu.panel) {
    pendingPanel = null;
    keepBenPanelUntil = 0;
    if (p.confirmed) return { acted: true, msg: `✅ Xong: ${p.label}` };
    return {
      acted: true,
      msg: `⚠️ Bảng bị đóng trước khi xác nhận xong: ${p.label} -> sẽ thử lại tại chỗ`,
    };
  }

  // 1. Waiting for the button to light up
  if (!p.executedAt) {
    let ready: boolean;
    if (p.shopAt) {
      const shop = bn.shop as { at?: string; k?: string; ready?: number } | null | undefined;
      ready =
        shop?.at === p.shopAt &&
        Boolean(shop.k) &&
        typeof shop.ready === 'number' &&
        shop.ready <= performance.now() &&
        hasEnabledShopButton();
      if (!ready && now - p.openedAt > SHOP_READY_TIMEOUT_MS) {
        return finishPendingPanel(
          buStore,
          `❌ ${p.label}: Chờ ${SHOP_READY_TIMEOUT_MS / 1000}s nút mua vẫn chưa sáng (shop=${shop?.at ?? 'null'}, token=${shop?.k ? 'có' : 'chưa'}) -> đóng bảng, thử lại sau`
        );
      }
    } else {
      ready = now - p.openedAt >= p.triggerDelayMs;
    }

    if (!ready) {
      return { acted: true, msg: `⏳ ${p.label} (chờ nút thao tác sáng lên...)` };
    }
    if (!p.readySince) {
      p.readySince = now;
      p.readyPauseMs = humanDelay(380, 820);
    }
    if (now - p.readySince < p.readyPauseMs) {
      return { acted: true, msg: `👀 ${p.label} (đang xem bảng...)` };
    }

    p.baselineSig = walletSignature(bn);
    p.baselineNoticeSeq = (bn.notice as { seq?: number } | null | undefined)?.seq ?? -1;
    p.attempts += 1;
    p.executedAt = now;
    try {
      p.actionFn();
    } catch (err) {
      console.error('[Wharf] Action execution error:', err);
    }
    return {
      acted: true,
      msg: `🖱️ Bấm thao tác${p.attempts > 1 ? ` (lần ${p.attempts})` : ''}: ${p.label}`,
    };
  }

  // 2. Waiting for the server to confirm
  if (!p.confirmed) {
    if (!p.shopAt) {
      if (now - p.executedAt < p.holdAfterMs) {
        return { acted: true, msg: `👁️ ${p.label} (đang xử lý...)` };
      }
      const nextStep = p.shouldContinue?.();
      if (nextStep?.keepGoing) {
        if (nextStep.label) p.label = nextStep.label;
        if (nextStep.actionFn) p.actionFn = nextStep.actionFn;
        p.executedAt = 0;
        p.confirmed = false;
        p.attempts = 0;
        p.readySince = now;
        p.readyPauseMs = humanDelay(320, 650);
        return { acted: true, msg: `🔄 Tiếp tục: ${p.label}` };
      }
      if (p.leaveOpen) {
        pendingPanel = null;
        keepBenPanelUntil = 0;
        return { acted: true, msg: `✅ ${p.label}` };
      }
      p.confirmed = true;
      p.closeAt = now + humanDelay(250, 600);
      return { acted: true, msg: `✅ ${p.label}` };
    }

    const notice = bn.notice as { error?: string; seq?: number } | null | undefined;
    const newError = notice && (notice.seq ?? -1) !== p.baselineNoticeSeq ? notice.error : undefined;
    if (walletSignature(bn) !== p.baselineSig) {
      const nextStep = p.shouldContinue?.();
      if (nextStep?.keepGoing) {
        if (nextStep.label) p.label = nextStep.label;
        if (nextStep.actionFn) p.actionFn = nextStep.actionFn;
        p.executedAt = 0;
        p.confirmed = false;
        p.attempts = 0;
        p.readySince = now;
        p.readyPauseMs = humanDelay(320, 650);
        return { acted: true, msg: `✅ Đã mua · Tiếp tục: ${p.label}` };
      }
      if (p.leaveOpen) {
        pendingPanel = null;
        keepBenPanelUntil = 0;
        return { acted: true, msg: `✅ Thành công: ${p.label}` };
      }
      p.confirmed = true;
      p.closeAt = now + humanDelay(p.holdAfterMs, p.holdAfterMs + 450);
      return { acted: true, msg: `✅ Thành công: ${p.label}` };
    }

    const retry = (reason: string): BenStepResult => {
      if (p.attempts >= SHOP_MAX_ATTEMPTS) {
        return finishPendingPanel(
          buStore,
          `❌ ${p.label}: Thất bại sau ${p.attempts} lần (${reason}) -> đóng bảng, thử lại sau`
        );
      }
      p.executedAt = 0;
      p.readySince = 0;
      return {
        acted: true,
        msg: `⚠️ ${p.label}: Chưa mua được (${reason}) -> đứng lại chờ nút sáng để bấm lại`,
      };
    };

    if (newError) {
      if (RETRYABLE_SHOP_ERRORS.has(newError)) return retry(newError);
      return finishPendingPanel(buStore, `❌ ${p.label}: Máy chủ từ chối (${newError})`);
    }
    if (now - p.executedAt > SHOP_CONFIRM_TIMEOUT_MS) {
      return retry('không thấy máy chủ xác nhận');
    }
    return { acted: true, msg: `⏳ ${p.label} (chờ xác nhận...)` };
  }

  // 3. Linger briefly like a human reading the toast, then close
  if (now < p.closeAt) {
    return { acted: true, msg: `👁️ ${p.label} (xong, chuẩn bị đóng bảng...)` };
  }
  return finishPendingPanel(buStore, '🚪 Đã đóng bảng thao tác');
}

/**
 * Tự động đóng modal nhận cá câu được (.catch-card.ben-catch),
 * cất cá quý vào ngăn giữ lại (nếu bật cấu hình) và chuyển trạng thái cần câu về idle.
 */
export function dismissBenCatchModal(cfg?: AppConfig): void {
  const bnStore = stores.benNet;
  if (!bnStore) return;
  const bn = bnStore.getState();
  if (bn?.landed) {
    const landed = bn.landed as {
      id?: string;
      fish?: string;
      rarity?: string;
      price?: number;
      size?: number;
      rainbow?: boolean;
      odd?: boolean;
      released?: boolean;
    };
    if (shouldKeepFishByConfig(landed, cfg) && landed.id) {
      const curBasket = Array.isArray(bn.basket) ? bn.basket : [];
      const plan = computeBasketKeepPlan(curBasket, bn.wallet, cfg);
      const shouldKeep =
        plan.desiredKeptIds.size > 0 ? plan.desiredKeptIds.has(landed.id) : true;
      if (shouldKeep) {
        const unkeptIds = new Set<string>();
        for (const u of plan.toUnkeep) {
          if (u.fish.id) {
            sendBenWs({ t: 'keep', id: u.fish.id, on: false });
            unkeptIds.add(u.fish.id);
          }
        }
        sendBenWs({ t: 'keep', id: landed.id, on: true });
        bnStore.setState({
          fishing: 'idle',
          landed: null,
          basket: curBasket.map((f) =>
            f.id === landed.id
              ? { ...f, kept: true }
              : f.id && unkeptIds.has(f.id)
                ? { ...f, kept: false }
                : f
          ),
        });
        return;
      }
    }
  }
  bnStore.setState({ fishing: 'idle', landed: null });
}

export function execBenStep(
  cfg: AppConfig,
  onlineTarget: 'all' | 'benDo' | 'alluvialLand' = 'all'
): BenStepResult {
  if (!stores.main || !stores.benUI || !stores.benNet) {
    discoverStores();
  }
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
  syncAtmRefFromState(bn);

  if (m.screen !== 'benDo' || bn.status !== 'in') {
    return { acted: false };
  }
  initWharfSeqsIfNeeded(bn);
  refreshCricketWatchers(cfg);
  refreshFishingWatcher(cfg);

  // =========================================================================
  // 🪖 HIGHEST PRIORITY #0: MILITIA CHECK ("🪖 Dân quân kiểm tra!")
  // Tạm dừng mọi hành vi di chuyển/câu cá để chờ hoàn tất giải câu đố xác thực
  // =========================================================================
  if (bn.check) {
    return {
      acted: true,
      msg: '🪖 Dân quân kiểm tra: Đang phân tích hình ảnh và trả lời câu đố...',
      allowCast: false,
    };
  }

  // =========================================================================
  // 🎣 HIGHEST PRIORITY #0.5: ACTIVE FISHING FIGHT (ĐANG GHÌM CẦN TRÁI/PHẢI)
  // Hoàn thành xong hành động ghìm cần rồi mới thực hiện mọi hành động khác (kể cả Boss Bí Ngô)
  // =========================================================================
  if (bn.fishing === 'fight' || Boolean(document.querySelector('.ben-fight'))) {
    return {
      acted: true,
      msg: '🎣 Bến Đò: Đang ghìm cần câu cá (ưu tiên hoàn tất ghìm cần trước mọi việc khác)...',
      allowCast: false,
    };
  }

  const benScene = getActiveScene('BenDoScene') as unknown as BenDoPhaserScene | null;
  const isBossVisible = Boolean(benScene?.boss?.visible);
  const bossStatus = computeWharfBossStatus(bn, cfg.benAutoBossHunt !== false);
  const isBossActive = Boolean(
    cfg.benAutoBossHunt !== false && (isBossVisible || bossStatus.isBossActive)
  );
  const isBossImpending = bossStatus.isBossImpending;
  const secondsToNextBoss = bossStatus.secondsToNextBoss;

  // =========================================================================
  // 👑 HIGHEST PRIORITY #1: WORLD BOSS BÍ NGÔ (SĂN BOSS & THU CẦN CHỜ SẴN)
  // Luôn luôn ưu tiên việc này trước tiên, bất kể đang ở khu nào hay làm gì!
  // =========================================================================
  if (isBossActive || isBossImpending) {
    const baiSnap = getBaiSnapshot();
    const currentKind = baiSnap?.kind || 'ben';

    // Nếu đang ở bên Chợ Bãi / Farm, gấp rút qua đò về lại Bến Đò ngay
    if (currentKind !== 'ben') {
      const alluvialRes = stepAlluvial(cfg, onlineTarget);
      if (alluvialRes && alluvialRes.acted) {
        return {
          acted: true,
          msg: `👑 Boss Bí Ngô sắp xuất hiện (còn ${secondsToNextBoss}s)! Đang gấp rút về Bến Đò 🎃`,
          allowCast: false,
        };
      }
    }

    // Tại Bến Đò: Đóng toàn bộ bảng panel nếu đang mở, ngắt câu/săn dế
    if (bu.panel) {
      buStore.setState({ panel: null });
    }
    keepBenPanelUntil = 0;

    if (bn.fishing !== 'idle') {
      if (bn.fishing === 'landing' || bn.landed) {
        dismissBenCatchModal(cfg);
      } else {
        sendBenWs({ t: 'hook' });
      }
    }
    if (bn.hunt) {
      bnStore.setState({ hunt: null });
    }

    const dummyCtx: BenExecutionContext = {
      cfg,
      m,
      bu,
      bn,
      buStore,
      bnStore,
      benScene,
      wallet: bn.wallet || { shells: 0, bait: 0, liveStamina: 100 },
      stamina: computeBenStamina(bn.wallet || { shells: 0, bait: 0 }),
      shells: bn.wallet?.shells || 0,
      bait: bn.wallet?.bait || 0,
      nonKeptCount: 0,
      totalSellShells: 0,
      packItems: [],
      isStaminaDepleted: false,
      needShellsForBait: false,
      needShellsForFood: false,
      targetFoodPrice: 45,
      prefFood: 'lauMam',
      benShowFullActions: true,
      isBossActive,
      isBossImpending,
      secondsToNextBoss,
      huntEnabled: false,
      bossEnabled: false,
      arenaEnabled: false,
      runWithOptionalPanel: () => {},
      walkAndRun: () => ({ acted: false }),
    };

    const bossRes = runBossHuntOrImpendingStep(dummyCtx);
    if (bossRes) return bossRes;
  }

  const interrupted = dismissInterruptsIfNeeded(cfg);
  if (interrupted) return interrupted;

  const baiSnap = getBaiSnapshot();
  const currentKind = baiSnap?.kind || 'ben';

  // Strict Area Isolation: When across the river at Chợ Bãi ('bai') or Đất Của Mình ('farm'),
  // ONLY run the Alluvial state machine. Never fall through to Bến Đò tasks.
  if (currentKind !== 'ben') {
    const alluvialRes = stepAlluvial(cfg, onlineTarget);
    if (alluvialRes && alluvialRes.acted) {
      return {
        acted: true,
        msg: alluvialRes.msg,
        allowCast: false,
      };
    }
    return {
      acted: false,
      msg:
        alluvialRes?.msg ||
        (currentKind === 'farm'
          ? '🌱 Đang ở khu Đất Của Mình (Bãi Phù Sa)...'
          : '🏪 Đang ở khu Chợ Bãi (Bãi Phù Sa)...'),
      allowCast: false,
      finishedFarm: true,
    };
  }

  // Dedicated Nông Trại Online mode: only execute alluvial steps, skip fishing and crickets
  if (onlineTarget === 'alluvialLand') {
    if (bn.fishing === 'landing' || bn.landed) {
      dismissBenCatchModal(cfg);
    } else if (bn.fishing === 'cast' || bn.fishing === 'bite') {
      sendBenWs({ t: 'hook' });
    }
    const alluvialRes = stepAlluvial(cfg, 'alluvialLand');
    if (alluvialRes && alluvialRes.acted) {
      return {
        acted: true,
        msg: alluvialRes.msg,
        allowCast: Boolean(alluvialRes.allowCast),
      };
    }
    return { acted: false };
  }

  // Priority at Bến Đò: If currently in transit across the river, continue Alluvial machine
  if (!isBossActive && !isBossImpending && onlineTarget !== 'benDo' && isAlluvialInTransit()) {
    if (bn.fishing === 'landing' || bn.landed) {
      dismissBenCatchModal(cfg);
    }
    const alluvialTransitRes = stepAlluvial(cfg, onlineTarget);
    if (alluvialTransitRes && alluvialTransitRes.acted) {
      return {
        acted: true,
        msg: alluvialTransitRes.msg,
        allowCast: Boolean(alluvialTransitRes.allowCast),
      };
    }
  }

  if (!isBossActive && !isBossImpending && (bu.walking || bn.fishing !== 'idle')) {
    return { acted: false };
  }

  const benShowFullActions = true;

  const pendingRes = stepPendingPanel(
    bn as unknown as Record<string, unknown>,
    bu,
    buStore as unknown as { setState: (s: Record<string, unknown>) => void }
  );
  if (pendingRes) return pendingRes;

  if (bu.panel && Date.now() < keepBenPanelUntil) {
    return { acted: true, msg: keepBenPanelMsg || '👁️ Đang thao tác trên giao diện...' };
  }

  const wallet = bn.wallet;
  if (!wallet) return { acted: false };

  // 1. Check server event notifications (ATM cashed, notices, wheel spins, HLW toasts)
  const serverEventResult = checkWharfServerEvents(bn, buStore);
  if (serverEventResult) return serverEventResult;

  const huntEnabled = cfg.benSubEnabled?.cricketHunt !== false && cfg.benAutoCricketHunt !== false;
  const bossEnabled = cfg.benSubEnabled?.cricketBoss !== false && cfg.benAutoBossBout !== false;
  const arenaEnabled =
    cfg.benSubEnabled?.cricketBoss !== false && (bossEnabled || Boolean(cfg.benAutoBet));

  const stamina = computeBenStamina(wallet);
  const shells = wallet.shells || 0;
  const bait = wallet.bait || 0;
  const nonKeptFish = Array.isArray(bn.basket)
    ? bn.basket.filter((x: { kept?: boolean; price?: number }) => !x.kept)
    : [];
  const nonKeptCount = nonKeptFish.length;
  updateSpotFishCounter(Array.isArray(bn.basket) ? bn.basket.length : 0);

  const totalSellShells = nonKeptFish.reduce(
    (sum: number, x: { price?: number }) => sum + (Number(x.price) || 0),
    0
  );
  const pack = bn.pack || {};
  const packItems = Object.keys(pack).filter((k) => (pack[k] || 0) > 0);

  const prefFood = cfg.benPreferFood || 'lauMam';
  const packFoodItem = cfg.benPackFoodItem || 'banhTet';
  const targetFoodPrice =
    (cfg.benStaminaPriority || 'bag') === 'stall'
      ? FOOD_PRICES[prefFood] || 45
      : PACK_FOOD_PRICES[packFoodItem] || 30;

  if (stamina >= 25 && bn.notice?.error !== 'tired') {
    wharfWatchState.benNoticeTired = false;
  }
  const isStaminaDepleted =
    stamina < 4 || bn.notice?.error === 'tired' || wharfWatchState.benNoticeTired;
  const needShellsForBait = bait <= 0 && shells < 15;
  const needShellsForFood =
    isStaminaDepleted && packItems.length === 0 && shells < targetFoodPrice;

  const runWithOptionalPanel = (
    actionFn: () => void,
    label: string,
    panelState?: Record<string, unknown>,
    triggerDelayMs = 550,
    holdAfterMs = 400,
    options?: PanelActionOptions
  ) => {
    if (panelState) {
      if (pendingPanel) return;
      const targetPanelKey = panelState.panel as string | undefined;
      const isAlreadyOpen = Boolean(targetPanelKey && bu.panel === targetPanelKey);
      // The game's shop panel requests its own shop token on mount (and re-polls every 2s).
      // Sending an extra `{ t: 'shop' }` here would rotate the token and void the purchase.
      const human = cfg.benHumanJitter !== false;
      pendingPanel = {
        label,
        panelState,
        actionFn,
        shopAt: (targetPanelKey && SHOP_PANEL_AT[targetPanelKey]) || null,
        openAt: isAlreadyOpen ? Date.now() : Date.now() + (human ? humanDelay(320, 750) : 150),
        openedAt: isAlreadyOpen ? Date.now() : 0,
        triggerDelayMs: Math.max(500, triggerDelayMs),
        holdAfterMs: Math.max(human ? 550 : 300, holdAfterMs),
        readySince: 0,
        readyPauseMs: 0,
        executedAt: 0,
        attempts: 0,
        baselineSig: '',
        baselineNoticeSeq: -1,
        confirmed: false,
        closeAt: 0,
        shouldContinue: options?.shouldContinue,
        leaveOpen: options?.leaveOpen,
      };
      keepBenPanelMsg = label;
    } else {
      actionFn();
    }
  };

  const walkAndRun = (
    tile: { x: number; y: number },
    actionFn: () => void,
    label: string,
    actionKey: string | null = null,
    panelState?: Record<string, unknown>,
    triggerDelayMs = 550,
    holdAfterMs = 400,
    options?: PanelActionOptions
  ): BenStepResult => {
    if (actionKey && !canAct(actionKey, 1000)) {
      return { acted: false };
    }
    notifyLeftFishingSpot();
    if (
      (getBaiSnapshot()?.kind || 'ben') !== 'ben' ||
      !benScene ||
      typeof benScene.goFarmer !== 'function'
    ) {
      return { acted: false };
    }
    const cur = benScene.farmer?.tile;
    if (!cur) {
      return { acted: false };
    }
    // Same tolerance as the arrival callback below, otherwise a stall whose
    // nearest walkable tile is 2 steps away makes the farmer re-walk on every retry.
    if (!benScene.farmer?.running && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 2) {
      if (actionKey) markActed(actionKey);
      runWithOptionalPanel(actionFn, label, panelState, triggerDelayMs, holdAfterMs, options);
      return { acted: true, msg: label };
    }
    if (benScene.farmer?.running) {
      return { acted: true, msg: `🚶 ${label}` };
    }
    benScene.goFarmer(tile, () => {
      const latestKind = getBaiSnapshot()?.kind || 'ben';
      const latestTile = benScene.farmer?.tile;
      const arrived =
        latestKind === 'ben' &&
        latestTile &&
        Math.abs(latestTile.x - tile.x) + Math.abs(latestTile.y - tile.y) <= 2;
      if (arrived && (!actionKey || canAct(actionKey, 1000))) {
        if (actionKey) markActed(actionKey);
        runWithOptionalPanel(actionFn, label, panelState, triggerDelayMs, holdAfterMs, options);
      }
    });
    return { acted: true, msg: `🚶 ${label}` };
  };

  const ctx: BenExecutionContext = {
    cfg,
    m,
    bu,
    bn,
    buStore,
    bnStore,
    benScene,
    wallet,
    stamina,
    shells,
    bait,
    nonKeptCount,
    totalSellShells,
    packItems,
    isStaminaDepleted,
    needShellsForBait,
    needShellsForFood,
    targetFoodPrice,
    prefFood,
    benShowFullActions,
    isBossActive,
    isBossImpending,
    secondsToNextBoss,
    huntEnabled,
    bossEnabled,
    arenaEnabled,
    runWithOptionalPanel,
    walkAndRun,
  };

  // 2. World Boss Hunter & 10s Impending Wait at Map Center
  const bossRes = runBossHuntOrImpendingStep(ctx);
  if (bossRes) {
    if (bossRes.acted) notifyLeftFishingSpot();
    return bossRes;
  }

  // 3. Active cricket hunt lock
  if (bn.hunt) {
    notifyLeftFishingSpot();
    if (bn.hunt.phase === 'light' && Date.now() - getHuntLightAt() > HUNT_LIGHT_STALE_MS) {
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

  // 4. Own cricket arena bout lock
  const myBout = getMyBout(bn);
  if (myBout) {
    hadMyBout = true;
    notifyLeftFishingSpot();
    const { bout, side } = myBout;
    return {
      acted: true,
      msg: `🥊 Sới Dế: Đang thi đấu ${bout.n ? `(giáp ${bout.n}/12)` : '(sắp vào trận)'} · còn ${bout.tickles?.[side] ?? 0} lần khều râu`,
    };
  }
  if (hadMyBout) {
    hadMyBout = false;
    markActed('ben_boss_wait');
  }

  // 5. Sub-area dispatcher
  const subAreaRunners: Record<WharfSubAreaId, () => BenStepResult> = {
    alluvialLand: () => {
      if (onlineTarget === 'benDo' || cfg.areaEnabled?.alluvialLand === false) {
        return { acted: false };
      }
      if (bn.fishing === 'landing' || bn.landed) {
        dismissBenCatchModal(cfg);
      }
      const res = stepAlluvial(cfg, onlineTarget);
      if (res && res.acted) {
        notifyLeftFishingSpot();
        return { acted: true, msg: res.msg, allowCast: Boolean(res.allowCast) };
      }
      return { acted: false };
    },
    cricketBoss: () => {
      const res = runCricketBossStep(ctx);
      if (res.acted) notifyLeftFishingSpot();
      return res;
    },
    cricketHunt: () => {
      const res = runCricketHuntStep(ctx);
      if (res.acted) notifyLeftFishingSpot();
      return res;
    },
    entertainment: () => {
      const res = runEntertainmentStep(ctx);
      if (res.acted) notifyLeftFishingSpot();
      return res;
    },
    fishing: () => runFishingStep(ctx),
  };
  const continuousSubs = new Set<WharfSubAreaId>(['fishing', 'cricketHunt']);

  const defaultSubs: WharfSubAreaId[] = [
    'fishing',
    'cricketBoss',
    'cricketHunt',
    'entertainment',
    'alluvialLand',
  ];
  const savedOrder: WharfSubAreaId[] =
    Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0 ? [...cfg.benSubOrder] : defaultSubs;

  // Always ensure bounded periodic alluvialLand is evaluated first in activeOrder
  const activeOrder: WharfSubAreaId[] = [
    'alluvialLand',
    ...savedOrder.filter((id) => id !== 'alluvialLand' && !continuousSubs.has(id)),
    ...savedOrder.filter((id) => id !== 'alluvialLand' && continuousSubs.has(id)),
  ];

  let deferred: (() => BenStepResult) | null = null;
  let exhaustedResult: BenStepResult | null = null;
  for (const subId of activeOrder) {
    if (subId === 'alluvialLand') {
      if (onlineTarget === 'benDo' || cfg.areaEnabled?.alluvialLand === false) continue;
    } else {
      if (cfg.benSubEnabled?.[subId] === false) continue;
    }
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

  const modalManagedPanels = new Set(['lantern', 'atm', 'militiaCheck', 'soi']);
  if (
    bu.panel &&
    !modalManagedPanels.has(String(bu.panel)) &&
    (!benShowFullActions || Date.now() >= keepBenPanelUntil)
  ) {
    buStore.setState({ panel: null });
  }

  if (deferred) {
    const result = deferred();
    if (result.acted || result.allowCast) return result;
  }
  if (exhaustedResult) return exhaustedResult;

  return { acted: false, allowCast: false };
}
