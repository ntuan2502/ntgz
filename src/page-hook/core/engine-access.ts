// Engine Access & Store Discovery for Phaser 3 and React 19 / Zustand Stores

export interface StoreRegistry {
  main: any;
  sea: any;
  benUI: any;
  benNet: any;
}

export const stores: StoreRegistry = {
  main: null,
  sea: null,
  benUI: null,
  benNet: null,
};

export let phaserGame: any = null;
export let benWs: WebSocket | null = null;
export let lastXinMoiAt = 0;
export let lastXinMoiDay = -1;

export function setLastXinMoi(at: number, day: number) {
  lastXinMoiAt = at;
  lastXinMoiDay = day;
}

// 1. Intercept WebSocket.prototype.send to capture Ben Do WebSocket
try {
  const origSend = WebSocket.prototype.send;
  WebSocket.prototype.send = function (data: any) {
    try {
      if (this && typeof this.url === 'string' && this.url.includes('/ws/ben-do')) {
        benWs = this;
        (window as any).__ntg_benWs = this;
      }
    } catch (_) {}
    return origSend.apply(this, arguments as any);
  };
} catch (_) {}

export function sendBenWs(obj: any): boolean {
  if (!benWs || benWs.readyState !== WebSocket.OPEN) {
    try {
      const sc = getActiveScene('BenDoScene');
      if (sc && typeof sc.announce === 'function') {
        sc.announce();
      }
    } catch (_) {}
  }
  if (benWs && benWs.readyState === WebSocket.OPEN) {
    benWs.send(JSON.stringify(obj));
    return true;
  }
  return false;
}

// 2. Capture Phaser.Game instance
export function hookPhaserGame(): any {
  if (phaserGame && phaserGame.scene) return phaserGame;
  if ((window as any).__ntg_phaserGame && (window as any).__ntg_phaserGame.scene) {
    phaserGame = (window as any).__ntg_phaserGame;
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
    Array.prototype.push = function (first: any) {
      try {
        if (first && typeof first === 'object' && first.sys && first.sys.game && first.sys.game.scene) {
          phaserGame = first.sys.game;
          (window as any).__ntg_phaserGame = phaserGame;
          restore();
        }
      } catch (_) {}
      return origPush.apply(this, arguments as any);
    };
    setTimeout(restore, 1500);
  } catch (_) {}
  return phaserGame;
}

hookPhaserGame();

export function getActiveScene(key: string): any {
  const game = hookPhaserGame();
  if (!game || !game.scene || typeof game.scene.getScene !== 'function') return null;
  try {
    const sc = game.scene.getScene(key);
    if (sc && sc.sys && sc.sys.isActive()) return sc;
    return sc || null;
  } catch (_) {
    return null;
  }
}

// 3. Discover Zustand stores from React 19 Fiber tree
function classifyStore(candidate: any) {
  if (!candidate || typeof candidate.getState !== 'function' || typeof candidate.setState !== 'function') {
    return;
  }
  let st: any;
  try {
    st = candidate.getState();
  } catch (_) {
    return;
  }
  if (!st || typeof st !== 'object') return;

  if ('plots' in st && 'fullness' in st && 'applyTool' in st && 'cook' in st) {
    stores.main = candidate;
  } else if ('phase' in st && 'spot' in st && 'float' in st && 'landed' in st && !('status' in st)) {
    stores.sea = candidate;
  } else if ('teaStand' in st && 'closetSlot' in st && 'spot' in st) {
    stores.benUI = candidate;
  } else if ('status' in st && 'fishing' in st && 'wallet' in st && 'basket' in st) {
    stores.benNet = candidate;
  }
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

  const visited = new Set();
  const queue: any[] = [];

  for (const el of roots) {
    for (const k of Object.keys(el)) {
      if (k.startsWith('__reactContainer$') || k.startsWith('__reactFiber$')) {
        if ((el as any)[k]) queue.push((el as any)[k]);
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
        if (ms.store) classifyStore(ms.store);
      }
      hook = hook.next;
    }

    if (fiber.child) queue.push(fiber.child);
    if (fiber.sibling) queue.push(fiber.sibling);
    if (fiber.return && steps < 250) queue.push(fiber.return);
  }

  (window as any).__ntg_stores = stores;
  return stores;
}
