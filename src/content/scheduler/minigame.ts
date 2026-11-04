import { isVisible, triggerPointerDownOnly } from './dom-helpers';
import { GameSnapshot } from '../../shared/types/game-state';

let lastPulledRunKey = '';
let lastPulledRunN: string | number = -1;
let lastPullAt = 0;

export function handleFightMinigame(snap: GameSnapshot, setStatus: (text: string) => void): boolean {
  if (snap.screen === 'benDo') {
    // In Ben Do, page-hook fishing-watcher handles fight via WebSocket with zero latency.
    return true;
  }

  const fightBox = document.querySelector('.ben-fight');
  if (!fightBox || !isVisible(fightBox)) {
    lastPulledRunKey = '';
    lastPulledRunN = -1;
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
    fishRun?.n !== undefined
      ? fishRun.n
      : (timerBar ? timerBar.textContent || timerBar.style.animationDuration : '') || 'run';
  const runKey = `${runDir}:${runN}`;

  const now = performance.now();
  // Do not pull the same run twice
  if (runN !== 'run' && runN === lastPulledRunN) {
    return true;
  }
  if (runKey === lastPulledRunKey && now - lastPullAt < 350) {
    return true;
  }

  // Minimum reaction time (~70ms) to ensure DOM/React have rendered the run
  if (now - lastPullAt < 80) {
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
  }
  // Dispatch native keyboard event on window so the game's keydown listener is triggered reliably
  const key = pullDir === 'left' ? 'ArrowLeft' : 'ArrowRight';
  const code = pullDir === 'left' ? 'KeyA' : 'KeyD';
  window.dispatchEvent(new KeyboardEvent('keydown', { key, code, bubbles: true }));

  lastPulledRunKey = runKey;
  lastPulledRunN = runN;
  lastPullAt = now;
  setStatus(`💪 Ghìm cần sang ${pullDir === 'left' ? 'TRÁI ⬅' : 'PHẢI ➡'}!`);
  return true;
}
