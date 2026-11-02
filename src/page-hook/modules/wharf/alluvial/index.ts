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
import { runBaiMarketWorkStep, hasMarketWork } from './bai-market-worker';

export { initAlluvialManager, getBaiSnapshot, toTimestampMs };
export type { AlluvialStepResult };

const BEN_FERRY_TILE = { x: 7, y: 10 };
const BAI_GATE_TILE = { x: 26, y: 23 };

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

export function isAlluvialReadyForVisit(): boolean {
  const serverNowMs = getBaiServerNowMs();
  const now = Date.now();
  return (
    baiState.lastFarmSurveyAt === 0 ||
    baiState.lastInfoAt === 0 ||
    (baiState.nextReadyAt > 0 && serverNowMs >= baiState.nextReadyAt) ||
    now - baiState.lastFarmSurveyAt > 5 * 60 * 1000
  );
}

export function stepAlluvial(
  cfg: AppConfig,
  onlineTarget: 'all' | 'benDo' | 'alluvialLand' = 'all'
): AlluvialStepResult | null {
  initAlluvialManager();

  // Sync latest store data
  getBaiSnapshot();

  const now = Date.now();
  const serverNowMs = getBaiServerNowMs();

  // If onlineTarget is strictly 'benDo': character must return to and stay at Bến Đò!
  if (onlineTarget === 'benDo') {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      return null;
    }
    if (baiState.kind === 'farm') {
      sendBenWs({ t: 'farmExit' });
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🌾 Nông Trại Online: Đang chuyển nhanh về Bến Đò...',
        allowCast: false,
      };
    }
    if (baiState.kind === 'bai') {
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '⛵ Chợ Bãi: Đang lên đò quay về Bến Đò...',
        allowCast: false,
      };
    }
  }

  // Priority #1: If Boss Bí Ngô is impending (<= 10s) or active, rush back to Bến Đò immediately!
  const bn = stores.benNet?.getState();
  const bossStatus = computeWharfBossStatus(bn, cfg.benAutoBossHunt !== false);
  if (bossStatus.isBossActive || bossStatus.isBossImpending) {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      return null;
    }
    if (baiState.kind === 'farm') {
      sendBenWs({ t: 'farmExit' });
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '👑 Boss Bí Ngô xuất hiện! Đang chuyển nhanh về Bến Đò săn Boss 🎃',
        allowCast: false,
      };
    }
    if (baiState.kind === 'bai') {
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '👑 Boss Bí Ngô xuất hiện! Đang lên đò về Bến Đò săn Boss 🎃',
        allowCast: false,
      };
    }
  }

  // If Alluvial Land is disabled in settings (and not forced via onlineTarget === 'alluvialLand'):
  if (onlineTarget !== 'alluvialLand' && cfg.areaEnabled?.alluvialLand === false) {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
      return null;
    }
    if (baiState.kind === 'farm') {
      sendBenWs({ t: 'farmExit' });
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🌾 Nông Trại Online đã tắt: Đang quay về Bến Đò...',
        allowCast: false,
      };
    }
    if (baiState.kind === 'bai') {
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '⛵ Chợ Bãi: Đang lên đò quay về Bến Đò...',
        allowCast: false,
      };
    }
  }

  // Failsafe timeout if stuck in a single state without progress (25 seconds)
  if (transitState !== 'idle' && now - transitStartedAt > 25000) {
    resetBaiWalkTracker();
    closeBaiPanel();
    if (baiState.kind === 'farm') {
      sendBenWs({ t: 'farmExit' });
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      return {
        acted: true,
        msg: '⚠️ Đất Bãi: Quá thời gian chờ, chuyển nhanh về Bến Đò...',
        allowCast: false,
      };
    }
    if (baiState.kind === 'bai') {
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      return {
        acted: true,
        msg: '⚠️ Chợ Bãi: Quá thời gian chờ, lên đò quay về Bến Đò...',
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
      if (onlineTarget === 'benDo') {
        return null;
      }

      let shouldTransit = false;
      let transitReason = '';

      if (onlineTarget === 'alluvialLand') {
        shouldTransit = true;
        transitReason = 'Chuyển sang Nông Trại Online chăm sóc ruộng vườn';
      } else {
        if (baiState.lastInfoAt === 0 || baiState.lastFarmSurveyAt === 0) {
          shouldTransit = true;
          transitReason = 'Vào Đất Bãi kiểm tra đợt đầu';
        } else if (baiState.nextReadyAt > 0 && serverNowMs >= baiState.nextReadyAt) {
          shouldTransit = true;
          transitReason = 'Nông sản, kẹo, cá hoặc dừa bên đất bãi đã đến giờ chín!';
        } else if (now - baiState.lastFarmSurveyAt > 5 * 60 * 1000) {
          shouldTransit = true;
          transitReason = 'Kiểm tra chu kỳ định kỳ đất bãi (5 phút)';
        }
      }

      if (shouldTransit) {
        transitReasonText = transitReason;
        sendBenWs({ t: 'farmQuick' });
        transitState = 'enter_farm';
        transitStartedAt = now;
        resetBaiWalkTracker();
        return {
          acted: true,
          msg: `🌾 Nông Trại Online: ${transitReason} ➔ Về thẳng đất của mình (farmQuick)...`,
          allowCast: false,
        };
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

    // Failsafe timeout after 5000ms:
    if (now - transitStartedAt > 5000) {
      if (baiState.lastInfoAt === 0) {
        sendBenWs({ t: 'farmInfo' });
      }
      if (baiState.lastInfoAt > 0 && !baiState.hasLand) {
        const currentShells = stores.benNet?.getState()?.wallet?.shells ?? baiState.shells;
        if (cfg.benAutoBuyLand && currentShells >= baiState.landPrice) {
          transitState = 'walk_to_ben_ferry';
          transitStartedAt = now;
          return {
            acted: true,
            msg: '📜 Đò ngang Ông Tám: Đang đi ra chỗ Ông Tám để mua đất bãi...',
            allowCast: false,
          };
        }
        transitState = 'idle';
        baiState.lastFarmSurveyAt = now;
        return null;
      }
      sendBenWs({ t: 'farmQuick' });
      transitStartedAt = now;
    }

    return { acted: true, msg: '🚪 Đang chuyển nhanh về đất của mình (farmQuick)...', allowCast: false };
  }

  // State 3: WORKING ON FARM (strictly inside kind === 'farm')
  if (transitState === 'work_farm') {
    transitStartedAt = now;
    const { nextWorkStep, result } = runBaiFarmWorkStep(cfg, workStep);
    workStep = nextWorkStep;

    if (result.doneFarm) {
      recalculateNextReadyAt();
      baiState.lastFarmSurveyAt = now;

      if (onlineTarget === 'alluvialLand') {
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
          msg: `🌾 Nông Trại Online: Đã xong việc vườn, đang chờ chu kỳ kế tiếp lúc ${nextTimeStr}...`,
          allowCast: false,
        };
      }

      // Check if there are any market transactions needed at Chợ Bãi:
      if (!hasMarketWork(cfg)) {
        // BYPASS CHỢ BÃI COMPLETELY!
        closeBaiPanel();
        sendBenWs({ t: 'farmExit' });
        sendBenWs({ t: 'ferry' });
        transitState = 'wait_back_to_ben';
        transitStartedAt = now;
        resetBaiWalkTracker();
        return {
          acted: true,
          msg: '🌾 Nông Trại Online: Đã xong việc ruộng, quay về Bến Đò câu cá (bỏ qua Chợ Bãi vì không có đồ bán/mua)...',
          allowCast: true,
        };
      }

      // Has market work -> exit to Chợ Bãi
      closeBaiPanel();
      sendBenWs({ t: 'farmExit' });
      transitState = 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🚪 Đất Bãi: Đang ra Chợ Bãi giao thương nông sản / mua vật tư...',
        allowCast: false,
      };
    }
    return result;
  }

  // State 3.5: EXIT FARM TO CHỢ BÃI (only when hasMarketWork is true)
  if (transitState === 'exit_farm') {
    if (baiState.kind === 'bai') {
      transitState = 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else {
      closeBaiPanel();
      sendBenWs({ t: 'farmExit' });
      transitState = 'at_bai_market';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '🚪 Đất Bãi: Đang bước ra Chợ Bãi để giao thương...',
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
          sendBenWs({ t: 'farmQuick' });
          transitState = 'enter_farm';
          transitStartedAt = now;
          resetBaiWalkTracker();
          return {
            acted: true,
            msg: '🌾 Chợ Bãi: Đã mua đủ vật tư, chuyển nhanh về lại Đất Của Mình để tiếp tục trồng/nuôi...',
            allowCast: false,
          };
        }

        if (onlineTarget === 'alluvialLand') {
          sendBenWs({ t: 'farmQuick' });
          transitState = 'enter_farm';
          transitStartedAt = now;
          resetBaiWalkTracker();
          return {
            acted: true,
            msg: '🌾 Nông Trại Online: Đã hoàn tất giao thương, quay về ruộng vườn...',
            allowCast: false,
          };
        }

        // Return to Bến Đò: DO NOT WALK TO (26, 5)! Send ferry directly!
        sendBenWs({ t: 'ferry' });
        transitState = 'wait_back_to_ben';
        transitStartedAt = now;
        resetBaiWalkTracker();
        return {
          acted: true,
          msg: '⛵ Chợ Bãi: Đã lên đò về Bến Đò tiếp tục câu cá...',
          allowCast: false,
        };
      }
      return result;
    }
    return { acted: true, msg: '🚶 Đang ở khu vực Chợ Bãi...', allowCast: false };
  }

  // State 4.5: LEGACY / FAILSAFE WALK TO BAI FERRY (immediately ferries back)
  if (transitState === 'walk_to_bai_ferry') {
    if (baiState.kind === 'ben') {
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
    } else {
      sendBenWs({ t: 'ferry' });
      transitState = 'wait_back_to_ben';
      transitStartedAt = now;
      resetBaiWalkTracker();
      return {
        acted: true,
        msg: '⛵ Chợ Bãi: Đang lên đò quay về Bến Đò...',
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

    if (baiState.kind === 'bai') {
      sendBenWs({ t: 'ferry' });
    }

    // Fast map teleport fallback if stranded for > 3.5s:
    if (now - transitStartedAt > 3500) {
      stores.main?.getState()?.showWorldMap?.();
      setTimeout(() => {
        stores.main?.setState({ screen: 'benDo', panel: null });
      }, 150);
      transitStartedAt = now;
    }

    return { acted: true, msg: '⛵ Đang sang sông về Bến Đò...', allowCast: false };
  }

  return null;
}
