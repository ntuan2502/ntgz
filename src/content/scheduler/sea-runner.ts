import { AppConfig } from '../../shared/types/config';
import { execGameAction, getGameState } from '../bridge/content-bridge';
import { isVisible, triggerPointerDownAndClick, triggerPointerDownOnly, sleep } from './dom-helpers';
import { handleFightMinigame } from './minigame';

let lastModalClickAt = 0;
let lastHookAt = 0;
let lastCastAt = 0;

export async function stepSeaFishing(
  snap: any,
  config: AppConfig,
  setStatus: (text: string) => void,
  onCatchIncrement: () => void
): Promise<{ finishedArea: boolean; exhausted?: boolean; lateNight?: boolean }> {
  const delayMs = Math.max(150, Number(config.taskDelayMs) || 650);

  if (snap.screen !== 'sea') {
    if (!snap.fishing?.seaOpen && (snap.day || 1) < 2) {
      setStatus('🔒 Chưa mở khóa đường ra Biển');
      return { finishedArea: true, exhausted: true };
    }
    if (snap.minutes >= 1305) {
      setStatus('🌙 Đã khuya, không thể ra Biển');
      return { finishedArea: true, lateNight: true };
    }
    setStatus('🏖️ Đang đi ra Biển...');
    const nav = await execGameAction('NAVIGATE', { target: 'sea' });
    if (!nav || !nav.ok) {
      setStatus('⛈️ Không thể ra Biển lúc này (bão hoặc quá khuya)');
      return { finishedArea: true, exhausted: true, lateNight: (snap.minutes || 0) >= 1260 };
    }
    await sleep(delayMs + 350);
    return { finishedArea: false };
  }

  const s = snap.sea;
  if (!s) return { finishedArea: false };

  // 1. Minigame
  if (s.phase === 'reel' || document.querySelector('.ben-fight')) {
    handleFightMinigame(snap, setStatus);
    return { finishedArea: false };
  }

  const now = performance.now();

  // 2. Catch Result Modal
  if (s.phase === 'result' || document.querySelector('.catch-card')) {
    if (now - lastModalClickAt > Math.max(350, delayMs * 0.7)) {
      const card = document.querySelector('.catch-card') as HTMLElement | null;
      if (card) {
        const notebookBtn = card.querySelector('button.btn-yellow') as HTMLButtonElement | null;
        if (notebookBtn && (notebookBtn.textContent || '').includes('Đọc trang sổ')) {
          triggerPointerDownAndClick(notebookBtn);
          lastModalClickAt = now;
          return { finishedArea: false };
        }
        const storeBtn = card.querySelector('.foot-buttons button.btn-brown') as HTMLButtonElement | null;
        const againBtn = card.querySelector('.foot-buttons button.btn-green') as HTMLButtonElement | null;
        if (storeBtn) {
          triggerPointerDownAndClick(storeBtn);
          lastModalClickAt = now;
          onCatchIncrement();
          setStatus('🧺 Đã cất cá vào giỏ Biển');
        } else if (againBtn) {
          triggerPointerDownAndClick(againBtn);
          lastModalClickAt = now;
          onCatchIncrement();
        }
      }
    }
    return { finishedArea: false };
  }

  // 3. Bite
  const redBiteBtn = document.querySelector('button.sea-cast.btn-red') as HTMLButtonElement | null;
  if (s.phase === 'bite' || (redBiteBtn && isVisible(redBiteBtn))) {
    if (now - lastHookAt > 250) {
      if (redBiteBtn) {
        triggerPointerDownOnly(redBiteBtn);
      } else {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', code: 'Space', bubbles: true }));
      }
      lastHookAt = now;
      setStatus('🔴 Biển: Cá cắn thật rồi -> GIẬT!');
    }
    return { finishedArea: false };
  }

  // 4. Waiting
  if (s.phase === 'wait') {
    setStatus('🌊 Biển: Đang canh phao... đợi nút đỏ mới giật!');
    return { finishedArea: false };
  }

  // 5. Walking
  if (s.walking) {
    setStatus('🚶 Đang đi bộ ra vị trí câu ở Biển...');
    return { finishedArea: false };
  }

  // 6. Idle phase
  if (s.phase === 'idle') {
    const prep = await execGameAction('SEA_STEP', { config });
    if (prep && prep.ok && prep.acted) {
      setStatus(prep.msg || '🏖️ Đang chuẩn bị tại Biển...');
      await sleep(delayMs);
      return { finishedArea: false };
    }

    if (snap.minutes >= 1320) {
      setStatus('🌙 Biển đã khuya, kết thúc câu ở Biển -> Quay về nhà!');
      return { finishedArea: true, lateNight: true };
    }

    const freshSnap = await getGameState();
    const curM = freshSnap && freshSnap.ok ? freshSnap : snap;

    const totalBait = (curM.fishing?.bait?.worm || 0) + (curM.fishing?.bait?.shrimp || 0);
    if (totalBait <= 0) {
      setStatus('🪱 Biển: Đã hết mồi câu và không đủ tiền mua thêm!');
      return { finishedArea: true, exhausted: true };
    }

    if ((curM.fullness ?? 100) <= 0 || (curM.hydration ?? 100) <= 0) {
      setStatus('😵 Biển: Đã hết thể lực (Đói/Khát) không kéo cần được nữa!');
      return { finishedArea: true, exhausted: true };
    }

    const castBtn = document.querySelector('button.sea-cast.btn-green') as HTMLButtonElement | null;
    if (castBtn && isVisible(castBtn) && !castBtn.disabled && now - lastCastAt > Math.max(600, delayMs)) {
      triggerPointerDownAndClick(castBtn);
      lastCastAt = now;
      setStatus(`🎣 Biển (${s.spot || 'pier'}): Quăng câu!`);
    }
  }

  return { finishedArea: false };
}
