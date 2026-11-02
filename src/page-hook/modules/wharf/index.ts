import { stores, getActiveScene, sendBenWs } from '../../core/engine-access';
import { canAct, markActed } from '../../core/cooldown';
import { computeBenStamina } from '../../core/store-watcher';
import { dismissInterruptsIfNeeded } from '../../core/interrupts';
import { AppConfig, WharfSubAreaId } from '../../../shared/types/config';
import { computeWharfBossStatus } from '../../../shared/constants/wharf-catalog';
import { refreshCricketWatchers, getMyBout } from './cricket-watchers';
import { stepAlluvial, isAlluvialInTransit, getBaiSnapshot } from './alluvial';
import {
  BenStepResult,
  BenDoPhaserScene,
  BenExecutionContext,
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
import { runFishingStep, updateSpotFishCounter } from './fishing-manager';
import { runCricketBossStep, runCricketHuntStep, getHuntLightAt } from './cricket-arena';
import { runEntertainmentStep } from './entertainment';

export { refreshCricketWatchers, stepAlluvial, getWharfNextAtmTime };

let keepBenPanelUntil = 0;
let keepBenPanelMsg = '';
let hadMyBout = false;

export function execBenStep(cfg: AppConfig, onlyAlluvial?: boolean): BenStepResult {
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

  const benScene = getActiveScene('BenDoScene') as unknown as BenDoPhaserScene | null;
  const isBossVisible = Boolean(benScene?.boss?.visible);
  const bossStatus = computeWharfBossStatus(bn, cfg.benAutoBossHunt !== false);
  const isBossActive = Boolean(
    cfg.benAutoBossHunt !== false && (isBossVisible || bossStatus.isBossActive)
  );
  const isBossImpending = bossStatus.isBossImpending;
  const secondsToNextBoss = bossStatus.secondsToNextBoss;

  // =========================================================================
  // 👑 HIGHEST PRIORITY #1: WORLD BOSS BÍ NGÔ (SĂN BOSS & ĐÓN LÕNG 10S GIỮA MAP)
  // Luôn luôn ưu tiên việc này trước tiên, bất kể đang ở khu nào hay làm gì!
  // =========================================================================
  if (isBossActive || isBossImpending) {
    const baiSnap = getBaiSnapshot();
    const currentKind = baiSnap?.kind || 'ben';

    // Nếu đang ở bên Chợ Bãi / Farm, gấp rút qua đò về lại Bến Đò ngay
    if (currentKind !== 'ben') {
      const alluvialRes = stepAlluvial(cfg);
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
      sendBenWs({ t: 'hook' });
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
    const alluvialRes = stepAlluvial(cfg);
    if (alluvialRes && alluvialRes.acted) {
      return {
        acted: true,
        msg: alluvialRes.msg,
        allowCast: false,
      };
    }
    return {
      acted: true,
      msg:
        currentKind === 'farm'
          ? '🌱 Đang ở khu Đất Của Mình (Bãi Phù Sa)...'
          : '🏪 Đang ở khu Chợ Bãi (Bãi Phù Sa)...',
      allowCast: false,
    };
  }

  // Priority at Bến Đò: If currently walking to Ông Tám to board the ferry,
  // continue the Alluvial state machine before checking `bu.walking` or Bến Đò fishing tasks.
  if (!isBossActive && !isBossImpending && isAlluvialInTransit()) {
    const alluvialTransitRes = stepAlluvial(cfg);
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

  // Dedicated Nông Trại Online mode: only execute alluvial steps, skip fishing and crickets
  if (onlyAlluvial || cfg.activeTab === 'alluvialLand') {
    const alluvialRes = stepAlluvial(cfg);
    if (alluvialRes && alluvialRes.acted) {
      return {
        acted: true,
        msg: alluvialRes.msg,
        allowCast: Boolean(alluvialRes.allowCast),
      };
    }
    return { acted: false };
  }

  const benShowFullActions = true;
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
  const targetFoodPrice = FOOD_PRICES[prefFood] || 45;

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
    holdMs = 1500
  ) => {
    if (panelState) {
      buStore.setState(panelState);
      keepBenPanelUntil = Date.now() + holdMs;
      keepBenPanelMsg = label;
      setTimeout(() => {
        actionFn();
      }, 350);
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
    holdMs = 1500
  ): BenStepResult => {
    if (actionKey && !canAct(actionKey)) {
      return { acted: false };
    }
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
    if (!benScene.farmer?.running && Math.abs(cur.x - tile.x) + Math.abs(cur.y - tile.y) <= 1) {
      if (actionKey) markActed(actionKey);
      runWithOptionalPanel(actionFn, label, panelState, holdMs);
      return { acted: true, msg: label };
    }
    if (benScene.farmer?.running) {
      return { acted: true, msg: `🚶 ${label}` };
    }
    benScene.goFarmer(tile, () => {
      setTimeout(() => {
        const latestKind = getBaiSnapshot()?.kind || 'ben';
        const latestTile = benScene.farmer?.tile;
        const arrived =
          latestKind === 'ben' &&
          latestTile &&
          Math.abs(latestTile.x - tile.x) + Math.abs(latestTile.y - tile.y) <= 2;
        if (arrived && (!actionKey || canAct(actionKey))) {
          if (actionKey) markActed(actionKey);
          runWithOptionalPanel(actionFn, label, panelState, holdMs);
        }
      }, 250);
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
  if (bossRes) return bossRes;

  // 3. Active cricket hunt lock
  if (bn.hunt) {
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
    fishing: () => runFishingStep(ctx),
    cricketBoss: () => runCricketBossStep(ctx),
    cricketHunt: () => runCricketHuntStep(ctx),
    entertainment: () => runEntertainmentStep(ctx),
    alluvialLand: () => {
      const res = stepAlluvial(cfg);
      if (res && res.acted) {
        return { acted: true, msg: res.msg, allowCast: Boolean(res.allowCast) };
      }
      return { acted: false };
    },
  };
  const continuousSubs = new Set<WharfSubAreaId>(['fishing', 'cricketHunt']);

  const defaultOrder: WharfSubAreaId[] = [
    'alluvialLand',
    'cricketBoss',
    'entertainment',
    'fishing',
    'cricketHunt',
  ];
  const savedOrder: WharfSubAreaId[] =
    Array.isArray(cfg.benSubOrder) && cfg.benSubOrder.length > 0 ? [...cfg.benSubOrder] : [];
  for (const id of defaultOrder) {
    if (!savedOrder.includes(id)) {
      savedOrder.push(id);
    }
  }
  // Ensure bounded periodic tasks (alluvialLand) are checked before continuous fishing/cricketHunt
  const activeOrder: WharfSubAreaId[] = [
    ...savedOrder.filter((id) => !continuousSubs.has(id)),
    ...savedOrder.filter((id) => continuousSubs.has(id)),
  ];

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
