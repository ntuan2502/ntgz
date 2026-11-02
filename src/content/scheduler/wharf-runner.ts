import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { computeWharfBossStatus } from '../../shared/constants/wharf-catalog';
import { execGameAction } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick, triggerPointerDownOnly, sleep } from './dom-helpers';
import { handleFightMinigame } from './minigame';
import { handleBenCatchModal, handleBenOverlayModals } from './wharf-modals';

let lastHookAt = 0;
let lastCastAt = 0;
let lastCricketEventSeq = -1;
let lastGotAwaySeq = -1;
let nextCastDelayMs = 0;
let microBreakUntil = 0;

export async function stepBenDoFishing(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  onCatchIncrement: () => void
): Promise<{ finishedArea: boolean; exhausted?: boolean }> {
  const delayMs = Math.max(150, Number(config.benDelayMs ?? config.taskDelayMs) || 650);

  if (snap.screen !== 'benDo') {
    setStatus('🛶 Đang đi ra Bến Đò...');
    await execGameAction('NAVIGATE', { target: 'benDo' });
    await sleep(delayMs + 400);
    return { finishedArea: false };
  }

  const bn = snap.benNet;
  const bu = snap.benUI;
  if (!bn || bn.status !== 'in') {
    setStatus('⏳ Đang kết nối máy chủ Bến Đò...');
    return { finishedArea: false };
  }

  // Keep the page-hook cricket watchers (trap / tickle / bet timing) alive
  void execGameAction('BEN_WATCH', { config });

  // =========================================================================
  // 👑 HIGHEST PRIORITY #1: PUMPKIN BOSS (SĂN BOSS BÍ NGÔ & CHỜ 10S GIỮA MAP)
  // Luôn luôn ưu tiên việc này trước tiên, bất kể đang ở khu nào hay làm gì!
  // =========================================================================
  const { isBossActive, isBossImpending, secondsToNextBoss } = computeWharfBossStatus(
    bn,
    config.benAutoBossHunt !== false
  );

  if (isBossActive || isBossImpending) {
    // Thu cần câu ngay lập tức nếu đang câu cá / cắn câu / giằng co
    const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
    if (pullBtn && isVisible(pullBtn)) {
      triggerPointerDownOnly(pullBtn);
    } else if (bn.fishing !== 'idle') {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
    }

    const prep = await execGameAction('BEN_STEP', { config });
    if (prep && prep.ok && prep.msg) {
      setStatus(prep.msg);
    } else {
      setStatus(
        isBossActive
          ? '👑 Phát hiện Boss Bí Ngô xuất hiện! Đang áp sát săn Boss 🎃'
          : `👑 Boss Bí Ngô đếm ngược còn ${secondsToNextBoss}s ➔ Thu cần và ra giữa map chờ sẵn 🎃`
      );
    }
    await sleep(prep?.isBossHunt ? 120 : 250);
    return { finishedArea: false };
  }

  // Dedicated Nông Trại Online mode: only step Alluvial Land without casting fishing rod or catching crickets
  const isOnlyAlluvial = config.runMode === 'tab' && config.activeTab === 'alluvialLand';
  if (isOnlyAlluvial) {
    const prep = await execGameAction('BEN_STEP', { config, onlyAlluvial: true });
    if (prep && prep.ok && prep.msg) {
      setStatus(prep.msg);
    } else {
      const baiKind = snap.baiState?.kind || 'ben';
      if (baiKind === 'farm') {
        setStatus('🌱 Nông Trại Online: Đang kiểm tra & canh tác tại Đất Của Mình...');
      } else if (baiKind === 'bai') {
        setStatus('🏪 Nông Trại Online: Đang giao dịch tại Chợ Bãi...');
      } else {
        setStatus('🌾 Nông Trại Online: Ruộng vườn đang chờ chín/lớn, chuẩn bị kiểm tra đợt tiếp theo...');
      }
    }
    await sleep(delayMs);
    return { finishedArea: false };
  }

  // Strict Area Isolation: If currently across the river at Chợ Bãi ('bai') or Đất Của Mình ('farm'),
  // step the Alluvial Land state machine directly instead of running Bến Đò fishing checks.
  const currentKind = snap.baiState?.kind || 'ben';
  if (currentKind !== 'ben') {
    const prep = await execGameAction('BEN_STEP', { config });
    if (prep && prep.ok && prep.msg) {
      setStatus(prep.msg);
    } else {
      setStatus(
        currentKind === 'farm'
          ? '🌱 Đang kiểm tra & canh tác tại Đất Của Mình (Bãi Phù Sa)...'
          : '🏪 Đang giao dịch tại Chợ Bãi (Bãi Phù Sa)...'
      );
    }
    await sleep(delayMs);
    return { finishedArea: false };
  }

  // 0. Live status updates from page-hook cricket watchers (trapping / misses / tickles)
  const crEvents = snap.benNet?.cricketEvents;
  if (Array.isArray(crEvents) && crEvents.length > 0) {
    const latest = crEvents[crEvents.length - 1];
    if (latest && latest.seq > lastCricketEventSeq) {
      lastCricketEventSeq = latest.seq;
      setStatus(latest.text);
    }
  }

  // Handle hunt gotAway notice (empty bush / escaped)
  const gotAway = snap.benNet?.gotAway;
  if (gotAway && typeof gotAway.seq === 'number' && gotAway.seq !== lastGotAwaySeq) {
    lastGotAwaySeq = gotAway.seq;
    if (gotAway.why === 'none') {
      setStatus('🔦 Khu vực này im re không nghe dế gáy -> Di chuyển sang vị trí khác trong khu vực rọi tiếp...');
    } else if (gotAway.why === 'escaped') {
      setStatus('🦗 Dế đã nhảy mất vào bóng đêm!');
    }
  }

  // 1. Handle Fight Minigame
  if (bn.fishing === 'fight' || document.querySelector('.ben-fight')) {
    handleFightMinigame(snap, setStatus);
    return { finishedArea: false };
  }

  const now = performance.now();

  // 2. Handle Catch Result Modal
  const catchResult = handleBenCatchModal(snap, config, setStatus, onCatchIncrement, delayMs);
  if (catchResult.handled) {
    if (catchResult.microBreakMs && catchResult.microBreakMs > 0) {
      microBreakUntil = now + catchResult.microBreakMs;
    }
    if (typeof catchResult.nextCastDelayMs === 'number') {
      nextCastDelayMs = catchResult.nextCastDelayMs;
    }
    return { finishedArea: false };
  }

  // 3. Handle Gift / Lantern Wheel / ATM / Caught Cricket / Bout Modals
  if (handleBenOverlayModals(snap, config, setStatus, delayMs)) {
    return { finishedArea: false };
  }

  // 3e. Cricket hunt in progress: the page-hook watcher traps at the right moment
  if (bn.hunt) {
    const hop = bn.hunt.phase === 'hop' ? bn.hunt.hop : undefined;
    setStatus(
      hop
        ? `🦗 Dế đang nhảy (còn ${hop.left} lần) -> Canh bụi cỏ ${hop.spot + 1} để úp...`
        : bn.hunt.rarity
          ? '🦗 Nghe tiếng dế gáy, đang chờ nó nhảy ra...'
          : '🔦 Đang rọi đèn nghe ngóng tiếng dế gáy...'
    );
    return { finishedArea: false };
  }

  // 4. Handle Bite ("GIẬT!")
  const benBobberBite = document.querySelector('span.ben-bobber.bite');
  if (bn.fishing === 'bite' || (benBobberBite && isVisible(benBobberBite))) {
    if (now - lastHookAt > 260) {
      const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
      if (pullBtn && isVisible(pullBtn)) {
        triggerPointerDownOnly(pullBtn);
      } else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      }
      lastHookAt = now;
      setStatus('🎣 Bến Đò: Cá cắn câu -> GIẬT!');
    }
    return { finishedArea: false };
  }

  // 5. Waiting for fish
  if (bn.fishing === 'wait' || bn.fishing === 'nibble' || bn.fishing === 'casting') {
    if (isBossActive || isBossImpending) {
      const pullBtn = document.querySelector('button.ben-cast.btn-brown') as HTMLButtonElement | null;
      if (pullBtn && isVisible(pullBtn)) {
        triggerPointerDownOnly(pullBtn);
      } else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      }
      setStatus(
        isBossImpending
          ? `👑 Boss Bí Ngô đếm ngược còn ${secondsToNextBoss}s! Thu cần ngay để ra giữa map chờ 🎃`
          : '👑 Phát hiện Boss Bí Ngô xuất hiện! Đang thu cần gấp để bám theo săn Boss 🎃'
      );
      await sleep(150);
      return { finishedArea: false };
    }

    setStatus(
      bn.fishing === 'nibble'
        ? '🐟 Cá đang rỉa mồi... đợi phao chìm hẳn!'
        : '🌊 Đang canh phao ở Bến Đò...'
    );
    return { finishedArea: false };
  }

  // 6. Idle phase & Alluvial / Sub-area actions
  if (bn.fishing === 'idle') {
    if (isBossImpending) {
      const prep = await execGameAction('BEN_STEP', { config });
      if (prep && prep.ok && prep.msg) {
        setStatus(prep.msg);
      } else {
        setStatus(`👑 Boss Bí Ngô đếm ngược còn ${secondsToNextBoss}s ➔ Thu cần và ra giữa map chờ, không câu cố 🎃`);
      }
      await sleep(150);
      return { finishedArea: false };
    }
    const prep = await execGameAction('BEN_STEP', { config });
    if (prep && prep.ok && prep.acted) {
      setStatus(prep.msg || '🛶 Đang chuẩn bị tại Bến Đò...');
      const stepDelay = prep.isBossHunt ? 120 : delayMs;
      await sleep(stepDelay);
      return { finishedArea: false };
    }

    if (bu?.walking && !isBossActive && !isBossImpending) {
      setStatus('🚶 Đang đi bộ ở Bến Đò...');
      return { finishedArea: false };
    }

    if (prep && prep.exhausted) {
      const reasonMsg =
        typeof prep.reason === 'string'
          ? prep.reason
          : '🛶 Bến Đò: Đã hết Sức câu / mồi -> Chuyển sang khu vực tiếp theo!';
      setStatus(reasonMsg);
      return { finishedArea: true, exhausted: true };
    }

    const liveStam = bn.wallet?.liveStamina ?? 100;
    const castBtn = document.querySelector(
      'button.ben-cast.btn-green:not(.ben-light), button.ben-cast.btn-yellow'
    ) as HTMLButtonElement | null;
    const btnText = (castBtn?.textContent || '').trim();

    const isCastTired =
      liveStam < 4 ||
      btnText.includes('Đuối sức') ||
      Boolean(castBtn?.classList.contains('btn-yellow')) ||
      (bn.notice as { error?: string } | undefined)?.error === 'tired';

    if (!config.benAutoRecoverStamina && isCastTired) {
      setStatus('😮‍💨 Bến Đò: Không đủ thể lực câu cá -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    if (!config.benAutoBuyBait && ((bn.wallet?.bait || 0) <= 0 || btnText.includes('Hết mồi'))) {
      setStatus('🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    if (isCastTired) {
      setStatus('😮‍💨 Bến Đò: Không đủ Sức câu -> Đang chờ đi ăn hồi Sức...');
      if (config.benSmartSleepMode !== false) {
        await sleep(1000);
      }
      return { finishedArea: false };
    }

    if (now < microBreakUntil) {
      const remainingSec = Math.ceil((microBreakUntil - now) / 1000);
      setStatus(`☕ Bến Đò: Đang nghỉ tay thư giãn (${remainingSec}s)...`);
      if (config.benSmartSleepMode !== false) {
        await sleep(Math.min(remainingSec * 1000, 1500));
      }
      return { finishedArea: false };
    }

    const greenCastBtn = document.querySelector('button.ben-cast.btn-green:not(.ben-light)') as HTMLButtonElement | null;
    const holdUntil = Math.max(
      bn.notice?.error === 'held' ? Number(bn.notice.until) || 0 : 0,
      Number(bn.checkDone?.holdUntil) || 0
    );
    const isRodHeld = holdUntil > Date.now();
    if (isRodHeld) {
      const waitSec = Math.max(1, Math.ceil((holdUntil - Date.now()) / 1000));
      setStatus(`🪖 Dân quân đang giữ cần câu (còn ${waitSec}s) -> Tạm dừng quăng câu...`);
      if (config.benSmartSleepMode !== false) {
        await sleep(Math.min(waitSec * 1000, 1500));
      }
      return { finishedArea: false };
    }

    const allowCast = Boolean(prep?.ok && prep.allowCast);
    const targetCastDelay = Math.max(600, nextCastDelayMs || delayMs);
    if (
      allowCast &&
      greenCastBtn &&
      isVisible(greenCastBtn) &&
      !greenCastBtn.disabled &&
      now - lastCastAt > targetCastDelay
    ) {
      triggerPointerDownAndClick(greenCastBtn);
      lastCastAt = now;
      if (config.benHumanJitter !== false) {
        nextCastDelayMs = delayMs + Math.floor(Math.random() * 700) + 150;
      } else {
        nextCastDelayMs = delayMs;
      }
      setStatus(`🎣 Bến Đò: Quăng câu (🪱 ${bn.wallet?.bait ?? 0} · ⚡ ${bn.wallet?.liveStamina ?? 0})`);
    } else if (allowCast && !bu?.spot) {
      setStatus('📍 Hãy đứng sát mép nước (hoặc bật Tự ra vị trí câu)');
    } else if (!allowCast) {
      setStatus('✅ Bến Đò: Đã xong các việc được bật (đang canh tự động...)');
      if (config.benSmartSleepMode !== false) {
        await sleep(1500);
      }
    }
  }

  return { finishedArea: false };
}
