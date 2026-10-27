import { useState, useEffect } from 'react';
import { execGameAction } from './content-bridge';

// In-memory cache for game pixel assets across the content script session
const assetCache = new Map<string, string>();
const pendingKeys = new Set<string>();
const listeners = new Map<string, Set<(url: string) => void>>();

let batchTimer: number | null = null;

/**
 * Flush all accumulated pending keys in a single IPC call to page-hook
 */
async function flushPendingBatch(): Promise<void> {
  batchTimer = null;
  if (pendingKeys.size === 0) return;

  const keysToFetch = Array.from(pendingKeys);
  pendingKeys.clear();

  try {
    const res = await execGameAction('GET_GAME_ASSETS', { keys: keysToFetch });
    if (res && res.ok && res.assets && typeof res.assets === 'object') {
      const assets = res.assets as Record<string, string>;
      for (const [key, dataUrl] of Object.entries(assets)) {
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
          assetCache.set(key, dataUrl);
          const keyListeners = listeners.get(key);
          if (keyListeners) {
            keyListeners.forEach((cb) => {
              try {
                cb(dataUrl);
              } catch {
                // ignore
              }
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[NTG Asset Bridge] Failed to fetch game assets batch:', err);
  }
}

/**
 * Queue a key for batch retrieval
 */
export function queueAssetFetch(key: string): void {
  if (!key || assetCache.has(key)) return;
  pendingKeys.add(key);

  if (batchTimer === null) {
    batchTimer = window.setTimeout(() => {
      void flushPendingBatch();
    }, 16);
  }
}

/**
 * Synchronous cache lookup
 */
export function getCachedAsset(key: string): string | null {
  if (!key) return null;
  return assetCache.get(key) || null;
}

/**
 * Pre-fetch a list of known keys in one go
 */
export async function preloadGameAssets(keys: string[]): Promise<Record<string, string>> {
  const missing = keys.filter((k) => k && !assetCache.has(k));
  if (missing.length === 0) {
    const result: Record<string, string> = {};
    for (const k of keys) {
      const cached = assetCache.get(k);
      if (cached) result[k] = cached;
    }
    return result;
  }

  try {
    const res = await execGameAction('GET_GAME_ASSETS', { keys: missing });
    if (res && res.ok && res.assets && typeof res.assets === 'object') {
      const assets = res.assets as Record<string, string>;
      for (const [k, dataUrl] of Object.entries(assets)) {
        if (typeof dataUrl === 'string' && dataUrl.startsWith('data:image/')) {
          assetCache.set(k, dataUrl);
          const keyListeners = listeners.get(k);
          if (keyListeners) {
            keyListeners.forEach((cb) => cb(dataUrl));
          }
        }
      }
      return assets;
    }
  } catch (err) {
    console.warn('[NTG Asset Bridge] Preload failed:', err);
  }

  return {};
}

/**
 * React hook for consuming dynamic game assets seamlessly
 */
export function useGameAsset(key?: string | null): string | null {
  const [dataUrl, setDataUrl] = useState<string | null>(() => {
    return key ? getCachedAsset(key) : null;
  });

  useEffect(() => {
    if (!key) {
      setDataUrl(null);
      return;
    }

    const cached = getCachedAsset(key);
    if (cached) {
      setDataUrl(cached);
      return;
    }

    setDataUrl(null);

    // Register reactive listener for when the asset arrives
    let keySet = listeners.get(key);
    if (!keySet) {
      keySet = new Set();
      listeners.set(key, keySet);
    }

    const callback = (url: string) => {
      setDataUrl(url);
    };

    keySet.add(callback);
    queueAssetFetch(key);

    return () => {
      keySet?.delete(callback);
      if (keySet && keySet.size === 0) {
        listeners.delete(key);
      }
    };
  }, [key]);

  return dataUrl;
}
