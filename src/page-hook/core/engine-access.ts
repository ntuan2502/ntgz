// Engine Access & Store Discovery for Phaser 3 and React 19 / Zustand Stores

import {
  MainGameStoreState,
  SeaStoreState,
  BenUIStoreState,
  BenNetState,
  FriendsStoreState,
  BaiStoreState,
} from '../../shared/types/game-store';
import { initStealthGuard } from './stealth-guard';

initStealthGuard();

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
  bai: ZustandStore<BaiStoreState> | null;
}

export interface FarmerSprite {
  x?: number;
  y?: number;
  tile?: { x: number; y: number };
  running?: boolean;
  shownName?: string;
  enqueue?: (item: { kind: string; to?: { x: number; y: number }; arrive?: () => void }) => void;
  cancelAll?: () => void;
  lookAt?: (x: number, y: number) => void;
  [key: string]: unknown;
}

export interface PhaserSceneInstance {
  sys?: {
    isActive: () => boolean;
    game?: PhaserGameInstance;
    [key: string]: unknown;
  };
  farmer?: FarmerSprite;
  goFarmer?: (tile: { x: number; y: number }, cb?: () => void) => void;
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
  bai: null,
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

export type BenWsMessageListener = (msg: Record<string, unknown>) => void;
const wsListeners = new Set<BenWsMessageListener>();
export function addBenWsMessageListener(fn: BenWsMessageListener): () => void {
  wsListeners.add(fn);
  return () => wsListeners.delete(fn);
}

// 1. Intercept WebSocket.prototype.send to capture Ben Do WebSocket
try {
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (...args: [string | ArrayBufferLike | Blob | ArrayBufferView]): void {
    try {
      const socket = this as WebSocket;

      // Anti-cheat probe interception: ensure f is always [] (clean)
      if (typeof args[0] === 'string' && args[0].includes('"probe"')) {
        try {
          const probeMsg = JSON.parse(args[0]);
          if (probeMsg.t === 'probe') {
            probeMsg.f = [];
            args[0] = JSON.stringify(probeMsg);
          }
        } catch {
          // ignore
        }
      }

      // Anti-cheat timing (u) normalization: ensure actions always carry valid human delay
      if (
        typeof args[0] === 'string' &&
        (args[0].includes('"cast"') ||
          args[0].includes('"hook"') ||
          args[0].includes('"pull"') ||
          args[0].includes('"buy"') ||
          args[0].includes('"sell"'))
      ) {
        try {
          const actionMsg = JSON.parse(args[0]);
          if (
            actionMsg.t &&
            ['cast', 'hook', 'pull', 'buy', 'sell'].includes(actionMsg.t)
          ) {
            if (
              typeof actionMsg.u !== 'number' ||
              actionMsg.u >= 5000 ||
              actionMsg.u <= 0
            ) {
              actionMsg.u = Math.floor(Math.random() * 120) + 65;
              args[0] = JSON.stringify(actionMsg);
            }
          }
        } catch {
          // ignore
        }
      }

      if (socket && typeof socket.url === 'string' && socket.url.includes('/ws/ben-do')) {
        benWs = socket;
        (window as unknown as Record<string, unknown>).__ntg_benWs = socket;
        const sockRecord = socket as unknown as Record<string, unknown>;
        if (!sockRecord.__ntg_hooked) {
          sockRecord.__ntg_hooked = true;
          socket.addEventListener('message', (ev: MessageEvent) => {
            try {
              if (typeof ev.data === 'string') {
                const msg = JSON.parse(ev.data);
                if (msg && typeof msg === 'object') {
                  if (msg.t === 'check' && stores.benNet) {
                    const curCheck = stores.benNet.getState().check;
                    stores.benNet.setState({
                      check: {
                        ...curCheck,
                        img: (msg.img as string) ?? '',
                        ask: (msg.ask as string) ?? 'fish',
                        options: (msg.options as number[]) ?? [],
                        ms: (msg.ms as number) ?? 15000,
                        until: Date.now() + (Number(msg.ms) || 15000),
                        ...(typeof msg.count === 'number' ? { count: msg.count } : {}),
                        ...(typeof msg.ans === 'number' ? { ans: msg.ans } : {}),
                        ...(typeof msg.solution === 'number' ? { solution: msg.solution } : {}),
                        ...(typeof msg.correct === 'number' ? { correct: msg.correct } : {}),
                        ...(typeof msg.pick === 'number' ? { pick: msg.pick } : {}),
                      },
                    });
                  }
                  for (const listener of wsListeners) {
                    try {
                      listener(msg);
                    } catch {
                      // ignore
                    }
                  }
                }
              }
            } catch {
              // ignore
            }
          });
        }
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
  if ((obj.t === 'buy' || obj.t === 'sell') && !obj.k && stores.benNet) {
    const shopK = (stores.benNet.getState().shop as { k?: string } | undefined)?.k;
    if (shopK) {
      obj.k = shopK;
    }
  }
  const actionType = obj.t as string | undefined;
  if (
    actionType &&
    ['cast', 'hook', 'pull', 'buy', 'sell'].includes(actionType) &&
    typeof obj.u !== 'number'
  ) {
    obj.u = Math.floor(Math.random() * 120) + 65;
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
  // Fallback: discover Phaser.Game from .game-container / canvas React Fiber
  try {
    const container = document.querySelector('.game-container') || document.querySelector('canvas');
    if (container) {
      const rec = container as unknown as Record<string, unknown>;
      for (const k of Object.keys(rec)) {
        if (k.startsWith('__reactFiber$')) {
          let fiber = rec[k] as { memoizedState?: unknown; return?: unknown } | undefined;
          let count = 0;
          while (fiber && count < 25) {
            count++;
            let hook = fiber.memoizedState as { memoizedState?: unknown; next?: unknown } | undefined;
            while (hook) {
              const ms = hook.memoizedState as { current?: unknown } | undefined;
              if (ms && ms.current && typeof ms.current === 'object') {
                const g = ms.current as PhaserGameInstance;
                if (g && g.scene && typeof g.scene.getScene === 'function') {
                  phaserGame = g;
                  win.__ntg_phaserGame = phaserGame;
                  return phaserGame;
                }
              }
              hook = hook.next as typeof hook;
            }
            fiber = fiber.return as typeof fiber;
          }
        }
      }
    }
  } catch {
    // ignore
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
        const item0 = items[0] as {
          sys?: { game?: PhaserGameInstance };
          game?: PhaserGameInstance;
          scene?: { game?: PhaserGameInstance };
        } | undefined;
        const candidate =
          item0?.sys?.game ?? item0?.game ?? item0?.scene?.game;
        if (candidate && candidate.scene && typeof candidate.scene.getScene === 'function') {
          phaserGame = candidate;
          win.__ntg_phaserGame = phaserGame;
          restore();
        }
      } catch {
        // ignore
      }
      return origPush.apply(this, items);
    };
    // Keep hook active until game boots or up to 2 minutes
    setTimeout(restore, 120000);
  } catch {
    // ignore
  }
  return phaserGame;
}

hookPhaserGame();

export function getBenFarmer(sc: PhaserSceneInstance | null): FarmerSprite | null {
  if (!sc) return null;
  const scRecord = sc as Record<string, unknown>;

  // Check cached instance
  const existingFarmer = scRecord.__farmer as FarmerSprite | undefined;
  if (existingFarmer && typeof existingFarmer.enqueue === 'function') {
    return existingFarmer;
  }

  // 0. Try cameras.main._follow (in Phaser, scene.cameras.main.startFollow(this.#e) stores target in _follow)
  try {
    const cameras = scRecord.cameras as { main?: { _follow?: FarmerSprite } } | undefined;
    const followTarget = cameras?.main?._follow;
    if (followTarget && typeof followTarget.enqueue === 'function') {
      scRecord.__farmer = followTarget;
      return followTarget;
    }
  } catch {
    // ignore
  }

  // 1. Try atmosphere.player() - in BenDoScene this is () => this.#e (direct access to local player sprite)
  try {
    const atmos = scRecord.atmosphere as { player?: () => unknown } | undefined;
    if (atmos && typeof atmos.player === 'function') {
      const p = atmos.player() as FarmerSprite | undefined;
      if (p && typeof p.enqueue === 'function') {
        scRecord.__farmer = p;
        return p;
      }
    }
  } catch {
    // ignore
  }

  // 2. Try scene.speaker(you)
  try {
    if (!stores.benNet) discoverStores();
    const you = stores.benNet?.getState()?.you;
    if (typeof scRecord.speaker === 'function' && you) {
      const s = (scRecord.speaker as (id: unknown) => unknown)(you) as FarmerSprite | undefined;
      if (s && typeof s.enqueue === 'function') {
        scRecord.__farmer = s;
        return s;
      }
    }
  } catch {
    // ignore
  }

  // 3. Search scene children / display list
  try {
    const childrenList =
      (scRecord.children as { list?: unknown[] } | undefined)?.list ||
      (typeof (scRecord.children as { getChildren?: () => unknown[] } | undefined)?.getChildren === 'function'
        ? (scRecord.children as { getChildren: () => unknown[] }).getChildren()
        : null) ||
      (scRecord.sys as { displayList?: { list?: unknown[] } } | undefined)?.displayList?.list ||
      [];

    const playerName = stores.main?.getState()?.player?.name;
    const others = scRecord.others as Map<unknown, unknown> | undefined;
    const tam = scRecord.tam;

    let fallbackCandidate: FarmerSprite | null = null;
    for (const item of childrenList) {
      if (!item || typeof item !== 'object') continue;
      const rec = item as FarmerSprite;
      if (
        typeof rec.enqueue === 'function' &&
        typeof rec.cancelAll === 'function' &&
        typeof rec.lookAt === 'function' &&
        'queue' in rec
      ) {
        // Exclude Ong Tam
        if (tam && rec === tam) continue;
        // Exclude other players in room
        if (others && others instanceof Map) {
          let isOther = false;
          for (const otherObj of others.values()) {
            if (otherObj === rec) {
              isOther = true;
              break;
            }
          }
          if (isOther) continue;
        }
        // Match player name if available
        if (playerName && rec.shownName === playerName) {
          scRecord.__farmer = rec;
          return rec;
        }
        if (!fallbackCandidate) {
          fallbackCandidate = rec;
        }
      }
    }
    if (fallbackCandidate) {
      scRecord.__farmer = fallbackCandidate;
      return fallbackCandidate;
    }
  } catch {
    // ignore
  }

  return null;
}

export function attachBenSceneHelpers(sc: PhaserSceneInstance): void {
  const scRecord = sc as Record<string, unknown>;

  // Polyfill 'farmer' getter if not present or private
  if (!('farmer' in scRecord) || !scRecord.farmer) {
    Object.defineProperty(scRecord, 'farmer', {
      configurable: true,
      enumerable: true,
      get: () => getBenFarmer(sc),
      set: (val: FarmerSprite) => {
        scRecord.__farmer = val;
      },
    });
  }

  // Polyfill 'goFarmer' if missing (due to minification into private #n)
  if (typeof scRecord.goFarmer !== 'function') {
    scRecord.goFarmer = function (tile: { x: number; y: number }, cb?: () => void) {
      const farmer = getBenFarmer(sc);
      if (!farmer) return;

      const grid = scRecord.grid as {
        walkable?: (x: number, y: number) => boolean;
        nearestWalkable?: (x: number, y: number) => { x: number; y: number } | null;
      } | undefined;

      const target =
        grid && typeof grid.walkable === 'function' && grid.walkable(tile.x, tile.y)
          ? tile
          : grid?.nearestWalkable?.(tile.x, tile.y) ?? tile;

      const route = typeof scRecord.route === 'number' ? ++scRecord.route : 1;
      scRecord.route = route;

      try {
        if (typeof scRecord.leaveSwing === 'function') {
          (scRecord.leaveSwing as () => void)();
        }
        if (typeof scRecord.leaveStool === 'function') {
          (scRecord.leaveStool as () => void)();
        }
      } catch {
        // ignore
      }

      try {
        const cameras = scRecord.cameras as {
          main?: { startFollow?: (...args: unknown[]) => void };
        };
        cameras?.main?.startFollow?.(farmer, true, 0.1, 0.1);
      } catch {
        // ignore
      }

      try {
        farmer.cancelAll?.();
      } catch {
        // ignore
      }

      try {
        farmer.enqueue?.({
          kind: 'move',
          to: target,
          arrive: () => {
            if (scRecord.route !== route) return;
            try {
              if (typeof farmer.lookAt === 'function') {
                const fx = Number(farmer.x) || 0;
                const fy = Number(farmer.y) || 0;
                // Face water if near water edge:
                // Upper river / pier (y <= 13) -> face up (dy: -20)
                // Bridge / right stream (x >= 45 && y >= 14) -> face right (dx: 20)
                const dx = target.x >= 45 && target.y >= 14 ? 20 : 0;
                const dy = target.x >= 45 && target.y >= 14 ? 0 : -20;
                farmer.lookAt(fx + dx, fy + dy);
              }
            } catch {
              // ignore
            }
            cb?.();
          },
        });
      } catch {
        // ignore
      }

      sendBenWs({ t: 'move', x: target.x, y: target.y });
      try {
        if (typeof scRecord.announce === 'function') {
          (scRecord.announce as () => void)();
        }
      } catch {
        // ignore
      }
    };
  }
}

export function getActiveScene(key: string): PhaserSceneInstance | null {
  const game = hookPhaserGame();
  if (!game || !game.scene || typeof game.scene.getScene !== 'function') return null;
  try {
    const sc = game.scene.getScene(key);
    if (sc && sc.sys && sc.sys.isActive()) {
      if (key === 'BenDoScene' || !('farmer' in sc)) {
        attachBenSceneHelpers(sc);
      }
      return sc;
    }
    return null;
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
  } else if ('kind' in st && 'yardEdit' in st && ('houseTab' in st || 'plotSel' in st || 'tool' in st)) {
    stores.bai = store as unknown as ZustandStore<BaiStoreState>;
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
