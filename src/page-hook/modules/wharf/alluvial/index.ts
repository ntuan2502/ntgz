import { AppConfig } from '../../../../shared/types/config';
import { sendBenWs } from '../../../core/engine-access';
import {
  baiState,
  initAlluvialManager,
  getBaiSnapshot,
  recalculateNextReadyAt,
  getBaiServerNowMs,
  toTimestampMs,
} from './bai-state';
import { runBaiFarmWorkStep, AlluvialStepResult } from './bai-farm-worker';
import { runBaiMarketWorkStep } from './bai-market-worker';

export { initAlluvialManager, getBaiSnapshot, toTimestampMs };
export type { AlluvialStepResult };

let transitState:
  | 'idle'
  | 'take_ferry_to_bai'
  | 'enter_farm'
  | 'work_farm'
  | 'at_bai_market'
  | 'wait_back_to_ben' = 'idle';
let transitStartedAt = 0;
let lastWorkStepAt = 0;
let workStep = 0;

export function stepAlluvial(cfg: AppConfig): AlluvialStepResult | null {
  initAlluvialManager();

  if (cfg.benSubEnabled?.alluvialLand === false) {
    return null;
  }

  const now = Date.now();
  const serverNowMs = getBaiServerNowMs();

  // Sync latest store data
  getBaiSnapshot();

  // Failsafe timeout for stuck transit (35 seconds)
  if (transitState !== 'idle' && now - transitStartedAt > 35000) {
    transitState = 'idle';
    sendBenWs({ t: 'ferry' });
    return {
      acted: true,
      msg: '⚠️ Đất Bãi: Hết thời gian chờ đò, đang quay lại Bến Đò...',
      allowCast: false,
    };
  }

  // State 0: IDLE AT BẾN ĐÒ
  if (transitState === 'idle') {
    // A. Check Land Purchase
    if (!baiState.hasLand) {
      if (cfg.benAutoBuyLand && baiState.shells >= baiState.landPrice) {
        sendBenWs({ t: 'land' });
        return {
          acted: true,
          msg: `🌾 Đất Bãi: Tự động mua giấy tay đất bãi Ông Tám (${baiState.landPrice.toLocaleString('vi-VN')} 🐚)...`,
          allowCast: false,
        };
      }
      return null;
    }

    // B. Check if Auto Ferry Transit is enabled
    if (!cfg.benAutoBaiFerry) {
      return null;
    }

    // C. Check if we need to visit the farm ("Khi có việc thôi")
    let shouldTransit = false;
    let transitReason = '';

    if (baiState.lastFarmSurveyAt === 0) {
      shouldTransit = true;
      transitReason = 'Khảo sát nông trại & công trình bãi bồi';
    } else if (baiState.nextReadyAt > 0 && serverNowMs >= baiState.nextReadyAt) {
      shouldTransit = true;
      transitReason = 'Nông sản, kẹo, cá hoặc dừa đã đến giờ chín!';
    } else if (now - baiState.lastFarmSurveyAt > 15 * 60 * 1000) {
      shouldTransit = true;
      transitReason = 'Kiểm tra chu kỳ định kỳ đất bãi';
    }

    if (shouldTransit) {
      transitState = 'take_ferry_to_bai';
      transitStartedAt = now;
      sendBenWs({ t: 'ferry' });
      return {
        acted: true,
        msg: `🌾 Đất Bãi: ${transitReason} -> Đang lên đò Ông Tám qua Chợ Bãi...`,
        allowCast: false,
      };
    }

    return null;
  }

  // State 1: WAITING TO REACH CHỢ BÃI
  if (transitState === 'take_ferry_to_bai') {
    if (baiState.kind === 'bai') {
      transitState = 'enter_farm';
      sendBenWs({ t: 'farmGo', to: 'me' });
      return {
        acted: true,
        msg: '🏡 Đất Bãi: Đã tới Chợ Bãi, đang vào đường vô đất của mình...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '⛵ Đang chèo đò qua Chợ Bãi...', allowCast: false };
  }

  // State 2: ENTERING FARM
  if (transitState === 'enter_farm') {
    if (baiState.kind === 'farm' && baiState.farm) {
      baiState.lastFarmSurveyAt = now;
      transitState = 'work_farm';
      workStep = 0;
      lastWorkStepAt = now;
      return {
        acted: true,
        msg: '🌾 Đất Bãi: Đã vào vườn đất của mình, bắt đầu vận hành hệ sinh thái...',
        allowCast: false,
      };
    }
    return { acted: true, msg: '🚪 Đang bước vào vườn đất bãi...', allowCast: false };
  }

  // State 3: WORKING ON FARM
  if (transitState === 'work_farm') {
    if (now - lastWorkStepAt < 650) {
      return { acted: true, msg: '🌱 Đang chăm sóc đất bãi...', allowCast: false };
    }

    lastWorkStepAt = now;
    const { nextWorkStep, result } = runBaiFarmWorkStep(cfg, workStep);
    workStep = nextWorkStep;

    if (result.doneFarm) {
      recalculateNextReadyAt();
      transitState = 'at_bai_market';
      sendBenWs({ t: 'farmExit' });
    }
    return result;
  }

  // State 4: AT CHỢ BÃI (Sell products & board ferry back)
  if (transitState === 'at_bai_market') {
    if (baiState.kind === 'bai') {
      if (now - lastWorkStepAt < 550) {
        return { acted: true, msg: '🏪 Đang giao dịch tại Chợ Bãi...', allowCast: false };
      }
      lastWorkStepAt = now;

      const { finishedMarket, result } = runBaiMarketWorkStep(cfg);
      if (finishedMarket) {
        transitState = 'wait_back_to_ben';
      }
      return result;
    }
    return { acted: true, msg: '🚶 Đang di chuyển ra Chợ Bãi...', allowCast: false };
  }

  // State 5: BACK AT BẾN ĐÒ
  if (transitState === 'wait_back_to_ben') {
    if (baiState.kind === 'ben') {
      transitState = 'idle';
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
