import { RequestType, GameActionResult } from '../../shared/types/protocol';
import { GameSnapshot } from '../../shared/types/game-state';

let reqSeq = 0;
const pendingReqs = new Map<number, (res: any) => void>();

export function injectPageHook(): void {
  try {
    const s = document.createElement('script');
    s.src = chrome.runtime.getURL('page-hook.js');
    s.onload = () => s.remove();
    (document.head || document.documentElement).appendChild(s);
  } catch (e) {
    console.error('[NTG Auto] Inject page-hook failed:', e);
  }
}

export function initBridgeListener(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window || !e.data || e.data.source !== 'ntg-page') return;
    const { id, data } = e.data;
    const resolve = pendingReqs.get(id);
    if (resolve) {
      pendingReqs.delete(id);
      resolve(data);
    }
  });
}

export function callPageHook<T = any>(type: RequestType, action: string | null = null, payload: any = {}): Promise<T> {
  return new Promise((resolve) => {
    const id = ++reqSeq;
    const timer = setTimeout(() => {
      pendingReqs.delete(id);
      resolve({ ok: false, error: 'TIMEOUT' } as any);
    }, 2500);
    pendingReqs.set(id, (res) => {
      clearTimeout(timer);
      resolve(res);
    });
    window.postMessage({ source: 'ntg-content', id, type, action, payload }, '*');
  });
}

export const getGameState = (): Promise<GameSnapshot> => callPageHook<GameSnapshot>('GET_GAME_STATE');
export const execGameAction = (action: string, payload: any = {}): Promise<GameActionResult> =>
  callPageHook<GameActionResult>('EXEC_GAME_ACTION', action, payload);
