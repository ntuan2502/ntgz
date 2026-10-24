import { AppConfig } from '../../shared/types/config';
import { GameSnapshot } from '../../shared/types/game-state';
import { execGameAction } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick, triggerPointerDownOnly, sleep } from './dom-helpers';
import { handleFightMinigame } from './minigame';

let lastModalClickAt = 0;
let lastHookAt = 0;
let lastCastAt = 0;

export async function stepBenDoFishing(
  snap: GameSnapshot,
  config: AppConfig,
  setStatus: (text: string) => void,
  onCatchIncrement: () => void
): Promise<{ finishedArea: boolean; exhausted?: boolean }> {
  const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

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

  // 1. Handle Fight Minigame
  if (bn.fishing === 'fight' || document.querySelector('.ben-fight')) {
    handleFightMinigame(snap, setStatus);
    return { finishedArea: false };
  }

  const now = performance.now();

  // 2. Handle Catch Result Modal
  if (bn.fishing === 'landing' || document.querySelector('.catch-card.ben-catch')) {
    if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
      const card = document.querySelector('.catch-card.ben-catch') as HTMLElement | null;
      if (card) {
        const isRareSpecial =
          card.classList.contains('mythic') ||
          Boolean(card.querySelector('.catch-tag.rainbow, .catch-tag.odd'));
        const keepBtn = card.querySelector('.ben-catch-btns button.btn-yellow') as HTMLButtonElement | null;
        const bagBtn = card.querySelector('.ben-catch-btns button.btn-green') as HTMLButtonElement | null;

        if (config.benAutoKeepRare && isRareSpecial && keepBtn && !keepBtn.disabled) {
          triggerPointerDownAndClick(keepBtn);
          setStatus('⭐ Đã giữ lại cá Hiếm/Lạ/Cầu vồng!');
        } else if (bagBtn) {
          triggerPointerDownAndClick(bagBtn);
          setStatus('🧺 Đã bỏ cá vào giỏ Bến Đò');
        }
        lastModalClickAt = now;
        onCatchIncrement();
      }
    }
    return { finishedArea: false };
  }

  // 3. Handle Gift Modal
  const giftBtn = document.querySelector('.ben-gift-card button.btn-green') as HTMLButtonElement | null;
  if (giftBtn && isVisible(giftBtn) && now - lastModalClickAt > 500) {
    triggerPointerDownAndClick(giftBtn);
    lastModalClickAt = now;
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
    setStatus(
      bn.fishing === 'nibble'
        ? '🐟 Cá đang rỉa mồi... đợi phao chìm hẳn!'
        : '🌊 Đang canh phao ở Bến Đò...'
    );
    return { finishedArea: false };
  }

  // 6. Walking
  if (bu?.walking) {
    setStatus('🚶 Đang đi bộ ở Bến Đò...');
    return { finishedArea: false };
  }

  // 7. Idle phase
  if (bn.fishing === 'idle') {
    const prep = await execGameAction('BEN_STEP', { config });
    if (prep && prep.ok && prep.acted) {
      setStatus(prep.msg || '🛶 Đang chuẩn bị tại Bến Đò...');
      await sleep(delayMs);
      return { finishedArea: false };
    }

    if (prep && prep.exhausted) {
      const reasonMsg = typeof prep.reason === 'string' ? prep.reason : '🛶 Bến Đò: Đã hết Sức câu / mồi -> Chuyển sang khu vực tiếp theo!';
      setStatus(reasonMsg);
      return { finishedArea: true, exhausted: true };
    }

    const liveStam = bn.wallet?.liveStamina ?? 100;
    const castBtn = document.querySelector('button.ben-cast.btn-green, button.ben-cast.btn-yellow') as HTMLButtonElement | null;
    const btnText = (castBtn?.textContent || '').trim();

    if (liveStam < 4 || btnText.includes('Đuối sức')) {
      setStatus('😮‍💨 Bến Đò: Hết thể lực không câu được nữa -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    if ((bn.wallet?.bait || 0) <= 0 || btnText.includes('Hết mồi')) {
      setStatus('🪱 Bến Đò: Đã hết mồi câu -> Chuyển khu vực tiếp theo!');
      return { finishedArea: true, exhausted: true };
    }

    const greenCastBtn = document.querySelector('button.ben-cast.btn-green') as HTMLButtonElement | null;
    if (greenCastBtn && isVisible(greenCastBtn) && !greenCastBtn.disabled && now - lastCastAt > Math.max(600, delayMs)) {
      triggerPointerDownAndClick(greenCastBtn);
      lastCastAt = now;
      setStatus(`🎣 Bến Đò: Quăng câu (🪱 ${bn.wallet?.bait ?? 0} · ⚡ ${bn.wallet?.liveStamina ?? 0})`);
    } else if (!bu?.spot) {
      setStatus('📍 Hãy đứng sát mép nước (hoặc bật Tự ra vị trí câu)');
    }
  }

  return { finishedArea: false };
}
