/**
 * Stealth Guard - Defends against client-side anti-cheat probes and synthetic input flags
 * Ensures that iframe-based native function checks (iq/aq) pass, synthetic interactions
 * keep ZK interaction timers fresh without triggering QK (fakeInput) counters, and
 * WebSocket outgoing messages never leak extension detection flags or stale interaction times.
 */

function patchIframeContentWindow(cw: Window | null): void {
  try {
    const cwRec = cw as unknown as {
      Function?: { prototype?: { toString?: (this: unknown) => string } };
      WebSocket?: { prototype?: WebSocket };
    } | null;
    if (!cwRec) return;

    // 1. Hook iframe WebSocket prototype so sockets instantiated via bq() are captured
    if (cwRec.WebSocket && cwRec.WebSocket.prototype) {
      const win = window as unknown as Record<string, unknown>;
      const hookFn = win.__ntg_hookWebSocketPrototype as ((proto: WebSocket) => void) | undefined;
      if (typeof hookFn === 'function') {
        hookFn(cwRec.WebSocket.prototype);
      } else {
        if (!Array.isArray(win.__ntg_pendingWsProtos)) {
          win.__ntg_pendingWsProtos = [];
        }
        (win.__ntg_pendingWsProtos as WebSocket[]).push(cwRec.WebSocket.prototype);
      }
    }

    if (!cwRec.Function || !cwRec.Function.prototype || !cwRec.Function.prototype.toString) return;
    const realToString = cwRec.Function.prototype.toString;
    const iframeWsSend = cwRec.WebSocket?.prototype?.send;
    const iframeWsAddEv = cwRec.WebSocket?.prototype?.addEventListener;

    cwRec.Function.prototype.toString = function (this: unknown) {
      if (
        this === WebSocket.prototype.send ||
        this === WebSocket.prototype.addEventListener ||
        this === iframeWsSend ||
        this === iframeWsAddEv ||
        this === window.WebSocket ||
        (cwRec.WebSocket && this === cwRec.WebSocket) ||
        this === JSON.parse ||
        this === JSON.stringify ||
        this === Function.prototype.toString ||
        this === realToString ||
        this === cwRec.Function?.prototype?.toString ||
        (typeof this === 'function' && (this as { name?: string })?.name === 'toString')
      ) {
        const name = (this as { name?: string })?.name || 'toString';
        return `function ${name}() { [native code] }`;
      }
      return realToString.call(this);
    };
  } catch {
    // ignore
  }
}

export function initStealthGuard(): void {
  // 0. Spoof navigator.webdriver
  try {
    if (typeof navigator !== 'undefined') {
      const navProto = Object.getPrototypeOf(navigator);
      if (navProto) {
        Object.defineProperty(navProto, 'webdriver', {
          get: () => false,
          configurable: true,
          enumerable: true,
        });
      }
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true,
        enumerable: true,
      });
    }
  } catch {
    // ignore
  }
  // 1. Defend iframe-based Function.prototype.toString inspection (iq / aq in game bundle)
  try {
    const origAppendChild = Node.prototype.appendChild;
    Node.prototype.appendChild = function <T extends Node>(node: T): T {
      const res = origAppendChild.call(this, node) as T;
      try {
        if ((node as unknown as { tagName?: string })?.tagName === 'IFRAME') {
          patchIframeContentWindow((node as unknown as HTMLIFrameElement).contentWindow);
        }
      } catch {
        // ignore
      }
      return res;
    };
  } catch {
    // ignore
  }

  try {
    const cwDesc = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    if (cwDesc && cwDesc.get) {
      const origGet = cwDesc.get;
      Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
        configurable: true,
        enumerable: true,
        get: function (this: HTMLIFrameElement) {
          const cw = origGet.call(this);
          if (cw) patchIframeContentWindow(cw);
          return cw;
        },
      });
    }
  } catch {
    // ignore
  }

  // 2. Defend synthetic input detection (QK fakeInput counter in game's window capture listeners)
  try {
    const origAddEventListener = EventTarget.prototype.addEventListener;
    const origRemoveEventListener = EventTarget.prototype.removeEventListener;
    const listenerMap = new WeakMap<EventListenerOrEventListenerObject, EventListener>();

    const monitoredTypes = new Set([
      'pointerdown',
      'mousedown',
      'touchstart',
      'keydown',
      'pointerup',
      'mouseup',
      'touchend',
      'keyup',
    ]);

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions
    ): void {
      if (
        (this === window || this === document || this === document.documentElement || this === document.body) &&
        typeof listener === 'function' &&
        monitoredTypes.has(type)
      ) {
        let wrapped = listenerMap.get(listener);
        if (!wrapped) {
          const origListener = listener as (ev: Event) => void;
          wrapped = function (this: unknown, ev: Event) {
            try {
              if (!ev.isTrusted) {
                const proxyEv = new Proxy(ev, {
                  get(target, prop, receiver) {
                    if (prop === 'isTrusted') return true;
                    const val = Reflect.get(target, prop, receiver);
                    return typeof val === 'function'
                      ? (val as (...args: unknown[]) => unknown).bind(target)
                      : val;
                  },
                });
                return origListener.call(this, proxyEv);
              }
            } catch {
              // ignore
            }
            return origListener.call(this, ev);
          };
          listenerMap.set(listener, wrapped);
        }
        return origAddEventListener.call(this, type, wrapped, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions
    ): void {
      if (listener && typeof listener === 'function') {
        const wrapped = listenerMap.get(listener);
        if (wrapped) {
          origRemoveEventListener.call(this, type, wrapped, options);
        }
      }
      return origRemoveEventListener.call(this, type, listener, options);
    };
  } catch {
    // ignore
  }
}
