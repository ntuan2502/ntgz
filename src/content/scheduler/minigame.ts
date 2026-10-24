import { isVisible, triggerPointerDownOnly } from './dom-helpers';
import { GameSnapshot } from '../../shared/types/game-state';

let lastPulledRunKey = '';
let lastPullAt = 0;

export function handleFightMinigame(snap: GameSnapshot, setStatus: (text: string) => void): boolean {
  const fightBox = document.querySelector('.ben-fight');
  if (!fightBox || !isVisible(fightBox)) {
    lastPulledRunKey = '';
    return false;
  }

  // Detect fish run direction from DOM or store
  const fishLeftEl = fightBox.querySelector('.ben-run-fish.left');
  const fishRightEl = fightBox.querySelector('.ben-run-fish.right');
  const timerBar = fightBox.querySelector('.ben-run-timer > i') as HTMLElement | null;

  const fishRun = (snap?.benNet?.fight as Record<string, unknown> | undefined)?.run as
    | { dir?: 'left' | 'right'; n?: string | number }
    | undefined;

  let runDir: 'left' | 'right' | null = null;
  if (fishLeftEl) runDir = 'left';
  else if (fishRightEl) runDir = 'right';
  else if (fishRun?.dir) runDir = fishRun.dir;

  if (!runDir) {
    return true; // In fight modal, waiting for fish's next run
  }

  // Identify unique run number so we pull exactly once per run
  const runN =
    fishRun?.n ||
    (timerBar ? timerBar.textContent || timerBar.style.animationDuration : '') ||
    'run';
  const runKey = `${runDir}:${runN}`;

  const now = performance.now();
  if (runKey === lastPulledRunKey && now - lastPullAt < 550) {
    return true;
  }

  // Wait ~120ms reaction time
  if (now - lastPullAt < 130) {
    return true;
  }

  // Opposite direction: fish runs left -> pull right; fish runs right -> pull left
  const pullDir = runDir === 'left' ? 'right' : 'left';
  const btns = Array.from(fightBox.querySelectorAll('.ben-fight-btns button')) as HTMLButtonElement[];
  const leftBtn = btns.find((b) => (b.textContent || '').includes('Ghìm trái'));
  const rightBtn = btns.find((b) => (b.textContent || '').includes('Ghìm phải'));

  const targetBtn = pullDir === 'left' ? leftBtn : rightBtn;
  if (targetBtn && !targetBtn.disabled) {
    triggerPointerDownOnly(targetBtn);
    lastPulledRunKey = runKey;
    lastPullAt = now;
    setStatus(`💪 Ghìm cần sang ${pullDir === 'left' ? 'TRÁI ⬅' : 'PHẢI ➡'}!`);
  } else {
    const key = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
    const code = pullDir === 'left' ? 'KeyA' : 'KeyD';
    window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));
    lastPulledRunKey = runKey;
    lastPullAt = now;
  }
  return true;
}
