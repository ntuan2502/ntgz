import { AppConfig } from '../../../../shared/types/config';
import { stores, sendBenWs } from '../../../core/engine-access';
import { computeWharfBossStatus } from '../../../../shared/constants/wharf-catalog';
import {
  baiState,
  initAlluvialManager,
  getBaiSnapshot,
  recalculateNextReadyAt,
  getBaiServerNowMs,
  toTimestampMs,
  ensureAtSceneTile,
  resetBaiWalkTracker,
  closeBaiPanel,
  clickBaiPanelButton,
} from './bai-state';
import { runBaiFarmWorkStep, AlluvialStepResult } from './bai-farm-worker';
import { runBaiMarketWorkStep } from './bai-market-worker';

export { initAlluvialManager, getBaiSnapshot, toTimestampMs };
export type { AlluvialStepResult };

const BEN_FERRY_TILE = { x: 7, y: 10 };
const BAI_GATE_TILE = { x: 26, y: 23 };
const FARM_EXIT_TILE = { x: 3, y: 26 };
const BAI_FERRY_TILE = { x: 26, y: 5 };

let transitState:
  | 'idle'
  | 'walk_to_ben_ferry'
  | 'take_ferry_to_bai'
  | 'enter_farm'
  | 'work_farm'
  | 'exit_farm'
  | 'at_bai_market'
  | 'walk_to_bai_ferry'
  | 'wait_back_to_ben' = 'idle';
let transitStartedAt = 0;
let ferryInfoWaitStartedAt = 0;
let transitReasonText = '';
let workStep = 0;

export function isAlluvialInTransit(): boolean {
  return transitState !== 'idle' || (baiState.kind !== 'ben' && Boolean(baiState.kind));
}

export function stepAlluvial(cfg: AppConfig): AlluvialStepResult | null {
  initAlluvialManager();

  // Sync latest store data
  getBaiSnapshot();

  const now = Date.now();
  const serverNowMs = getBaiServerNowMs();

  // Priority #1: If Boss Bí Ngô is impending (<= 10s) or active, rush back to Bến Đò immediately!
  const bn = stores.benNet?.getState();
  const bossStatus = computeWharfBossStatus(bn, cfg.benAutoBossHunt !== false);
  if (bossStatus.isBossActive || bossStatus.isBossImpending) {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      return null;
    }
    if (baiState.kind === 'farm' && transitState !== 'exit_farm') {
      transitState = 'exit_farm';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else if (baiState.kind === 'bai' && transitState !== 'walk_to_bai_ferry') {
      transitState = 'walk_to_bai_ferry';
      transitStartedAt = now;
      resetBaiWalkTracker();
    }
  }

  // If Alluvial Land sub-area is disabled (and not currently running dedicated alluvialLand tab):
  // - If at Bến Đò ('ben'), stay idle.
  // - If currently inside 'farm' or 'bai', safely walk out and take the ferry back to 'ben'!
  if (cfg.activeTab !== 'alluvialLand' && cfg.benSubEnabled?.alluvialLand === false) {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      return null;
    }
    if (baiState.kind === 'farm' && transitState !== 'exit_farm') {
      transitState = 'exit_farm';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else if (baiState.kind === 'bai' && transitState !== 'walk_to_bai_ferry') {
      transitState = 'walk_to_bai_ferry';
      transitStartedAt = now;
      resetBaiWalkTracker();
    }
  }

  // Failsafe timeout if stuck in a single state without progress (60 seconds)
  if (transitState !== 'idle' && now - transitStartedAt > 60000) {
    resetBaiWalkTracker();
    closeBaiPanel();
    if (baiState.kind === 'farm') {
      transitState = 'exit_farm';
      transitStartedAt = now;
      return {
        acted: true,
        msg: '⚠️ Đất Bãi: Đang đi bộ ra cổng vườn (3, 26) để quay về Chợ Bãi...',
        allowCast: false,
      };
    }
    if (baiState.kind === 'bai') {
      transitState = 'walk_to_bai_ferry';
      transitStartedAt = now;
      return {
        acted: true,
        msg: '⚠️ Chợ Bãi: Đang đi bộ ra bến đò Ông Tám (26, 5) để quay về Bến Đò...',
        allowCast: false,
      };
    }
    transitState = 'idle';
    return null;
  }

  // Handle starting Auto when player is already inside Farm or Chợ Bãi
  if (transitState === 'idle') {
    if (baiState.kind === 'farm') {
      baiState.lastFarmSurveyAt = now;
      transitState = 'work_farm';
      workStep = 0;
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else if (baiState.kind === 'bai') {
      const needsFarmVisit =
        (baiState.hasLand || baiState.lastInfoAt === 0) &&
        (baiState.lastFarmSurveyAt === 0 ||
          (baiState.nextReadyAt > 0 && serverNowMs >= baiState.nextReadyAt));
      const hasLand = baiState.hasLand || Boolean(stores.bai?.getState()?.info?.land);
      if (needsFarmVisit && hasLand) {
        sendBenWs({ t: 'farmQuick' });
        transitState = 'enter_farm';
        transitStartedAt = now;
        resetBaiWalkTracker();
        return {
          acted: true,
          msg: '🌾 Chợ Bãi: Đang chuyển nhanh về Đất Của Mình...',
          allowCast: false,
        };
      }
      transitState = needsFarmVisit ? 'take_ferry_to_bai' : 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
    }
  }

  // State 0: IDLE AT BẾN ĐÒ (kind === 'ben')
  if (transitState === 'idle') {
    const currentShells = stores.benNet?.getState()?.wallet?.shells ?? baiState.shells;

    // A. If we already checked Ông Tám and confirmed the player does NOT own land yet:
    if (baiState.lastInfoAt > 0 && !baiState.hasLand) {
      if (cfg.benAutoBuyLand && currentShells >= baiState.landPrice) {
        transitReasonText = 'Đi ra chỗ Ông Tám mua giấy tay đất bãi';
        transitState = 'walk_to_ben_ferry';
        transitStartedAt = now;
        ferryInfoWaitStartedAt = 0;
        resetBaiWalkTracker();
      } else {
        return null;
      }
    } else {
      // B. Either we haven't checked Ông Tám yet (lastInfoAt === 0) OR we own land (hasLand === true)
      if (cfg.activeTab !== 'alluvialLand' && !cfg.benAutoBaiFerry && baiState.lastInfoAt > 0) {
        return null;
      }

      let shouldTransit = false;
      let transitReason = '';

      if (baiState.lastInfoAt === 0 || baiState.lastFarmSurveyAt === 0) {
        shouldTransit = true;
        transitReason = 'Qua đò Ông Tám sang Chợ Bãi & vào ruộng kiểm tra';
      } else if (baiState.nextReadyAt > 0 && serverNowMs >= baiState.nextReadyAt) {
        shouldTransit = true;
        transitReason = 'Nông sản, kẹo, cá hoặc dừa bên đất bãi đã đến giờ chín!';
      } else if (now - baiState.lastFarmSurveyAt > 15 * 60 * 1000) {
        shouldTransit = true;
        transitReason = 'Qua đò kiểm tra chu kỳ định kỳ đất bãi';
      }

      if (shouldTransit) {
        transitReasonText = transitReason;
        const hasLand = baiState.hasLand || Boolean(stores.bai?.getState()?.info?.land);
        if (hasLand) {
          sendBenWs({ t: 'farmQuick' });
          transitState = 'enter_farm';
          transitStartedAt = now;
          resetBaiWalkTracker();
          return {
            acted: true,
            msg: `🌾 Nông Trại Online: ${transitReason} ➔ Chuyển nhanh về Đất Của Mình...`,
            allowCast: false,
          };
        }
        transitState = 'walk_to_ben_ferry';
        transitStartedAt = now;
        ferryInfoWaitStartedAt = 0;
        resetBaiWalkTracker();
      } else {
        return null;
      }
    }
  }

  // State 0.5: WALK TO ÔNG TÁM AT BẾN ĐÒ (7, 10) -> OPEN FERRY MENU -> BUY LAND OR BOARD FERRY TO CHỢ BÃI
  if (transitState === 'walk_to_ben_ferry') {
    if (baiState.kind === 'bai') {
      transitState = 'take_ferry_to_bai';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else {
      const walk = ensureAtSceneTile(
        'BenDoScene',
        'ben',
        BEN_FERRY_TILE,
        `🚶 Bến Đò: ${transitReasonText || 'Có việc bên bãi'} -> Đang đi bộ ra chỗ Ông Tám (7, 10)...`,
        { panel: 'ferry' },
        800
      );
      if (!walk.ready) {
        transitStartedAt = now;
        return {
          acted: true,
          msg:
            stores.benUI?.getState()?.panel === 'ferry'
              ? '⛵ Đò ngang Ông Tám: Đang mở bảng nói chuyện với Ông Tám...'
              : walk.msg,
          allowCast: false,
        };
      }

      // Wait briefly for `farmInfo` response if Ông Tám is still loading ("Ông Tám đang lục giấy tờ…")
      if (baiState.lastInfoAt === 0) {
        if (ferryInfoWaitStartedAt === 0) {
          ferryInfoWaitStartedAt = now;
          sendBenWs({ t: 'farmInfo' });
        }
        if (now - ferryInfoWaitStartedAt < 2000) {
          transitStartedAt = now;
          return {
            acted: true,
            msg: '📜 Đò ngang Ông Tám: Đang chờ Ông Tám lục giấy tờ đất bãi...',
            allowCast: false,
          };
        }
        baiState.lastInfoAt = now;
      }

      // Check if player owns land
      if (!baiState.hasLand) {
        const currentShells = stores.benNet?.getState()?.wallet?.shells ?? baiState.shells;
        if (cfg.benAutoBuyLand && currentShells >= baiState.landPrice) {
          if (!clickBaiPanelButton('Mua đất')) {
            sendBenWs({ t: 'land' });
          }
          transitStartedAt = now;
          return {
            acted: true,
            msg: `🌾 Đò ngang Ông Tám: Đang mua giấy tay đất bãi (${baiState.landPrice.toLocaleString('vi-VN')} 🐚)...`,
            allowCast: false,
          };
        }
        closeBaiPanel();
        transitState = 'idle';
        return null;
      }

      if (!cfg.benAutoBaiFerry) {
        closeBaiPanel();
        transitState = 'idle';
        return null;
      }

      if (!clickBaiPanelButton('Qua chợ Bãi')) {
        sendBenWs({ t: 'ferry' });
        closeBaiPanel();
      }
      transitState = 'take_ferry_to_bai';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: `⛵ Đò ngang Ông Tám: Đã chọn "Qua chợ Bãi" -> Đang lên đò qua sông...`,
        allowCast: false,
      };
    }
  }

  // State 1: REACH CHỢ BÃI (kind === 'bai') -> WALK TO "ĐƯỜNG VÔ ĐẤT" (26, 23) -> OPEN GATE MENU -> ENTER FARM
  if (transitState === 'take_ferry_to_bai') {
    if (baiState.kind === 'farm') {
      transitState = 'enter_farm';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else if (baiState.kind === 'bai') {
      const hasLand = baiState.hasLand || Boolean(stores.bai?.getState()?.info?.land);
      if (hasLand) {
        sendBenWs({ t: 'farmQuick' });
        transitState = 'enter_farm';
        transitStartedAt = now;
        resetBaiWalkTracker();
        return {
          acted: true,
          msg: '🌾 Chợ Bãi: Đang chuyển nhanh về Đất Của Mình...',
          allowCast: false,
        };
      }
      const walk = ensureAtSceneTile(
        'BaiScene',
        'bai',
        BAI_GATE_TILE,
        '🚶 Chợ Bãi: Đang đi bộ tới cổng "Đường vô đất" (26, 23)...',
        {
          panel: 'gate',
          onOpen: () => {
            sendBenWs({ t: 'farmList' });
          },
        },
        800
      );
      if (!walk.ready) {
        transitStartedAt = now;
        return {
          acted: true,
          msg:
            stores.benUI?.getState()?.panel === 'gate'
              ? '🌾 Đường vô đất: Đang mở bảng chọn "Về đất của mình"...'
              : walk.msg,
          allowCast: false,
        };
      }

      if (!clickBaiPanelButton('Về đất của mình')) {
        sendBenWs({ t: 'farmGo', to: 'me' });
        closeBaiPanel();
      }
      transitState = 'enter_farm';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🏡 Đường vô đất: Đã chọn "Về đất của mình" -> Đang bước vào ruộng...',
        allowCast: false,
      };
    } else {
      return { acted: true, msg: '⛵ Đang chèo đò qua sông sang Chợ Bãi...', allowCast: false };
    }
  }

  // State 2: ENTERING FARM (wait until kind === 'farm' and farm data loaded)
  if (transitState === 'enter_farm') {
    if (baiState.kind === 'farm' && baiState.farm) {
      baiState.lastFarmSurveyAt = now;
      transitState = 'work_farm';
      workStep = 0;
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🌾 Đất Bãi: Đã vào ruộng của mình, bắt đầu đi kiểm tra từng khu vực...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚪 Đang bước vào vườn đất bãi...', allowCast: false };
  }

  // State 3: WORKING ON FARM (strictly inside kind === 'farm')
  if (transitState === 'work_farm') {
    transitStartedAt = now;
    const { nextWorkStep, result } = runBaiFarmWorkStep(cfg, workStep);
    workStep = nextWorkStep;

    if (result.doneFarm) {
      recalculateNextReadyAt();
      transitState = 'exit_farm';
      resetBaiWalkTracker();
    }
    return result;
  }

  // State 3.5: WALK TO FARM EXIT GATE (3, 26) -> EXIT TO CHỢ BÃI
  if (transitState === 'exit_farm') {
    if (baiState.kind === 'bai') {
      transitState = 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else {
      const walk = ensureAtSceneTile(
        'BaiScene',
        'farm',
        FARM_EXIT_TILE,
        '🚶 Đất Bãi: Đang đi bộ ra lối cổng vườn (3, 26) để về Chợ Bãi...',
        undefined,
        0
      );
      if (!walk.ready) {
        transitStartedAt = now;
        return { acted: true, msg: walk.msg, allowCast: false };
      }

      closeBaiPanel();
      sendBenWs({ t: 'farmExit' });
      transitState = 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🚪 Đất Bãi: Đang rời vườn ra Chợ Bãi giao thương...',
        allowCast: false,
      };
    }
  }

  // State 4: AT CHỢ BÃI (strictly inside kind === 'bai': walk to stalls & sell products / buy supplies / claim HTX)
  if (transitState === 'at_bai_market') {
    if (baiState.kind === 'bai') {
      transitStartedAt = now;
      const { finishedMarket, result } = runBaiMarketWorkStep(cfg);
      if (finishedMarket) {
        if (baiState.boughtSuppliesForFarm) {
          baiState.boughtSuppliesForFarm = false;
          const hasLand = baiState.hasLand || Boolean(stores.bai?.getState()?.info?.land);
          if (hasLand) {
            sendBenWs({ t: 'farmQuick' });
            transitState = 'enter_farm';
            transitStartedAt = now;
            resetBaiWalkTracker();
            return {
              acted: true,
              msg: '🌾 Chợ Bãi: Đã mua vật tư, đang chuyển nhanh về Đất Của Mình...',
              allowCast: false,
            };
          }
          transitState = 'take_ferry_to_bai';
        } else {
          transitState = 'walk_to_bai_ferry';
        }
        resetBaiWalkTracker();
      }
      return result;
    }
    return { acted: true, msg: '🚶 Đang di chuyển ra khu vực Chợ Bãi...', allowCast: false };
  }

  // State 4.5: WALK TO ÔNG TÁM AT CHỢ BÃI (26, 5) -> OPEN BAI FERRY MENU -> BOARD FERRY BACK TO BẾN ĐÒ
  if (transitState === 'walk_to_bai_ferry') {
    if (baiState.kind === 'ben') {
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else {
      const walk = ensureAtSceneTile(
        'BaiScene',
        'bai',
        BAI_FERRY_TILE,
        '🚶 Chợ Bãi: Đang đi bộ ra bến đò Ông Tám (26, 5) để về Bến Đò...',
        { panel: 'baiFerry' },
        800
      );
      if (!walk.ready) {
        transitStartedAt = now;
        return {
          acted: true,
          msg:
            stores.benUI?.getState()?.panel === 'baiFerry'
              ? '⛵ Đò Ông Tám: Đang mở menu chọn "Về Bến đò"...'
              : walk.msg,
          allowCast: false,
        };
      }

      if (!clickBaiPanelButton('Về Bến đò')) {
        sendBenWs({ t: 'ferry' });
        closeBaiPanel();
      }
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '⛵ Chợ Bãi: Đang lên đò Ông Tám quay về Bến Đò câu cá tiếp...',
        allowCast: false,
      };
    }
  }

  // State 5: BACK AT BẾN ĐÒ (kind === 'ben')
  if (transitState === 'wait_back_to_ben') {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      resetBaiWalkTracker();
      const nextTimeStr =
        baiState.nextReadyAt > 0
          ? new Date(baiState.nextReadyAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
            })
          : 'đang tính';
      return {
        acted: true,
        msg: `🎉 Đã về tới Bến Đò! Tiếp tục câu cá (chu kỳ chăm sóc kế tiếp lúc ${nextTimeStr}).`,
        allowCast: true,
      };
    }
    return { acted: true, msg: '⛵ Đang sang sông về Bến Đò...', allowCast: false };
  }

  return null;
}
