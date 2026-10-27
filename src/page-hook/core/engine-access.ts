// Engine Access & Store Discovery for Phaser 3 and React 19 / Zustand Stores

import {
  MainGameStoreState,
  SeaStoreState,
  BenUIStoreState,
  BenNetState,
  FriendsStoreState,
} from '../../shared/types/game-store';

export interface ZustandStore<T> {
  getState: () => T;
  setState: (partial: Partial<T> | ((state: T) => Partial<T>)) => void;
  subscribe?: (listener: (state: T, prevState: T) => void) => () => void;
}

export interface StoreRegistry {
  main: ZustandStore<MainGameStoreState> | null;
  sea: ZustandStore<SeaStoreState> | null;
  benUI: ZustandStore<BenUIStoreState> | null;
  benNet: ZustandStore<BenNetState> | null;
  friends: ZustandStore<FriendsStoreState> | null;
}

export interface PhaserSceneInstance {
  sys?: {
    isActive: () => boolean;
    game?: PhaserGameInstance;
    [key: string]: unknown;
  };
  announce?: () => void;
  [key: string]: unknown;
}

export interface PhaserGameInstance {
  scene?: {
    getScene: (key: string) => PhaserSceneInstance | null;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

export const stores: StoreRegistry = {
  main: null,
  sea: null,
  benUI: null,
  benNet: null,
  friends: null,
};

export function getMainStore(): ZustandStore<MainGameStoreState> | null {
  if (!stores.main) discoverStores();
  return stores.main;
}

export function getMainState(): MainGameStoreState {
  const s = getMainStore();
  return (s ? s.getState() : {}) as MainGameStoreState;
}

export function setMainState(
  partial: Partial<MainGameStoreState> | ((state: MainGameStoreState) => Partial<MainGameStoreState>)
): void {
  const s = getMainStore();
  if (s) s.setState(partial);
}

export let phaserGame: PhaserGameInstance | null = null;
export let benWs: WebSocket | null = null;
export let lastXinMoiAt = 0;
export let lastXinMoiDay = -1;

export function setLastXinMoi(at: number, day: number): void {
  lastXinMoiAt = at;
  lastXinMoiDay = day;
}

// 1. Intercept WebSocket.prototype.send to capture Ben Do WebSocket
try {
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (...args: [string | ArrayBufferLike | Blob | ArrayBufferView]): void {
    try {
      const socket = this as WebSocket;
      if (socket && typeof socket.url === 'string' && socket.url.includes('/ws/ben-do')) {
        benWs = socket;
        (window as unknown as Record<string, unknown>).__ntg_benWs = socket;
      }
    } catch {
      // ignore
    }
    return origSend.apply(this, args);
  };
} catch {
  // ignore
}

export function sendBenWs(obj: Record<string, unknown>): boolean {
  if (!benWs || benWs.readyState !== WebSocket.OPEN) {
    try {
      const sc = getActiveScene('BenDoScene');
      if (sc && typeof sc.announce === 'function') {
        sc.announce();
      }
    } catch {
      // ignore
    }
  }
  if (benWs && benWs.readyState === WebSocket.OPEN) {
    benWs.send(JSON.stringify(obj));
    return true;
  }
  return false;
}

// 2. Capture Phaser.Game instance
export function hookPhaserGame(): PhaserGameInstance | null {
  if (phaserGame && phaserGame.scene) return phaserGame;
  const win = window as unknown as Record<string, unknown>;
  const cachedGame = win.__ntg_phaserGame as PhaserGameInstance | undefined;
  if (cachedGame && cachedGame.scene) {
    phaserGame = cachedGame;
    return phaserGame;
  }
  try {
    const origPush = Array.prototype.push;
    let restored = false;
    const restore = () => {
      if (!restored) {
        restored = true;
        Array.prototype.push = origPush;
      }
    };
    Array.prototype.push = function (...items: unknown[]) {
      try {
        const first = items[0] as { sys?: { game?: PhaserGameInstance } } | undefined;
        if (first && typeof first === 'object' && first.sys && first.sys.game && first.sys.game.scene) {
          phaserGame = first.sys.game;
          win.__ntg_phaserGame = phaserGame;
          restore();
        }
      } catch {
        // ignore
      }
      return origPush.apply(this, items);
    };
    setTimeout(restore, 1500);
  } catch {
    // ignore
  }
  return phaserGame;
}

hookPhaserGame();

export function getActiveScene(key: string): PhaserSceneInstance | null {
  const game = hookPhaserGame();
  if (!game || !game.scene || typeof game.scene.getScene !== 'function') return null;
  try {
    const sc = game.scene.getScene(key);
    if (sc && sc.sys && sc.sys.isActive()) return sc;
    return sc || null;
  } catch {
    return null;
  }
}

// 3. Discover Zustand stores from React 19 Fiber tree
function classifyStore(candidate: unknown) {
  if (!candidate || typeof candidate !== 'object') return;
  const store = candidate as ZustandStore<Record<string, unknown>>;
  if (typeof store.getState !== 'function' || typeof store.setState !== 'function') {
    return;
  }
  let st: Record<string, unknown>;
  try {
    st = store.getState();
  } catch {
    return;
  }
  if (!st || typeof st !== 'object') return;

  if ('plots' in st && 'fullness' in st && 'applyTool' in st && 'cook' in st) {
    stores.main = store as unknown as ZustandStore<MainGameStoreState>;
  } else if ('phase' in st && 'spot' in st && 'float' in st && 'landed' in st && !('status' in st)) {
    stores.sea = store as unknown as ZustandStore<SeaStoreState>;
  } else if ('teaStand' in st && 'closetSlot' in st && 'spot' in st) {
    stores.benUI = store as unknown as ZustandStore<BenUIStoreState>;
  } else if ('status' in st && 'fishing' in st && 'wallet' in st && 'basket' in st) {
    stores.benNet = store as unknown as ZustandStore<BenNetState>;
  } else if ('visitsOff' in st && 'giftsLeft' in st && 'friends' in st) {
    stores.friends = store as unknown as ZustandStore<FriendsStoreState>;
  }
}

interface FiberNode {
  memoizedState?: {
    memoizedState?: unknown;
    next?: FiberNode['memoizedState'];
  };
  child?: FiberNode | null;
  sibling?: FiberNode | null;
  return?: FiberNode | null;
  [key: string]: unknown;
}

export function discoverStores(): StoreRegistry {
  const roots = [
    document.getElementById('root'),
    document.querySelector('.app'),
    document.querySelector('.ui-layer'),
    document.querySelector('.sea-controls'),
    document.querySelector('.ben-screen'),
    document.querySelector('.ben-fish-side'),
  ].filter(Boolean) as Element[];

  const visited = new Set<unknown>();
  const queue: FiberNode[] = [];

  for (const el of roots) {
    const elRecord = el as unknown as Record<string, unknown>;
    for (const k of Object.keys(el)) {
      if (k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')) {
        const val = elRecord[k] as FiberNode | undefined;
        if (val) queue.push(val);
      }
    }
  }

  let steps = 0;
  while (queue.length > 0 && steps < 6000) {
    const fiber = queue.shift();
    if (!fiber || visited.has(fiber)) continue;
    visited.add(fiber);
    steps++;

    let hook = fiber.memoizedState;
    let hSteps = 0;
    while (hook && hSteps < 60) {
      hSteps++;
      const ms = hook.memoizedState;
      if (Array.isArray(ms) && ms.length === 2 && Array.isArray(ms[1])) {
        for (const dep of ms[1]) classifyStore(dep);
      }
      if (ms && typeof ms === 'object') {
        classifyStore(ms);
        const msObj = ms as { store?: unknown };
        if (msObj.store) classifyStore(msObj.store);
      }
      hook = hook.next;
    }

    if (fiber.child) queue.push(fiber.child);
    if (fiber.sibling) queue.push(fiber.sibling);
    if (fiber.return && steps < 250) queue.push(fiber.return);
  }

  (window as unknown as Record<string, unknown>).__ntg_stores = stores;
  return stores;
}
