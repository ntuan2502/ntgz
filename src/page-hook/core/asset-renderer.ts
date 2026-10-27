// Asset Renderer & Dynamic Canvas Extractor for Game Items

interface PixelIconProps {
  name: string;
  size?: number;
}

interface ReactElementResult {
  type?: unknown;
  props?: {
    className?: string;
    src?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

type PixelIconComponent = (props: PixelIconProps) => ReactElementResult | null;

interface FiberNode {
  type?: unknown;
  return?: FiberNode | null;
  child?: FiberNode | null;
  sibling?: FiberNode | null;
  memoizedProps?: Record<string, unknown>;
  [key: string]: unknown;
}

let pixelIconFn: PixelIconComponent | null = null;
const cachedDataUrls = new Map<string, string>();
const resolvedKeyCache = new Map<string, string>();

/**
 * Validates whether a candidate function is indeed the game's PixelIcon component (o$)
 */
function testCandidate(fn: unknown): fn is PixelIconComponent {
  if (typeof fn !== 'function') return false;
  try {
    const res = (fn as PixelIconComponent)({ name: 'coin', size: 32 });
    if (
      res &&
      res.props &&
      typeof res.props.src === 'string' &&
      res.props.src.startsWith('data:image/')
    ) {
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

/**
 * Strategy 1: Find PixelIcon component directly from existing DOM elements (fastest & zero-cost)
 */
function findPixelIconFromDom(): PixelIconComponent | null {
  try {
    const candidates = document.querySelectorAll<HTMLImageElement>('img.pixel-icon, img[src^="data:image/"]');
    for (const img of Array.from(candidates)) {
      const imgRecord = img as unknown as Record<string, unknown>;
      for (const k of Object.keys(imgRecord)) {
        if (k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$')) {
          let fiber: FiberNode | null | undefined = imgRecord[k] as FiberNode | null | undefined;
          let depth = 0;
          while (fiber && depth < 5) {
            depth++;
            if (testCandidate(fiber.type)) {
              return fiber.type;
            }
            if (fiber.return && testCandidate(fiber.return.type)) {
              return fiber.return.type;
            }
            fiber = fiber.return;
          }
        }
      }
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Strategy 2: Traverse React Fiber Tree from roots if DOM query has not populated yet
 */
function findPixelIconFromFiber(): PixelIconComponent | null {
  try {
    const roots = [
      document.getElementById('root'),
      document.querySelector('.app'),
      document.querySelector('.ui-layer'),
      document.querySelector('.ben-screen'),
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
    while (queue.length > 0 && steps < 2500) {
      const fiber = queue.shift();
      if (!fiber || visited.has(fiber)) continue;
      visited.add(fiber);
      steps++;

      if (testCandidate(fiber.type)) {
        return fiber.type;
      }

      if (fiber.child) queue.push(fiber.child);
      if (fiber.sibling) queue.push(fiber.sibling);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Ensures PixelIcon component is loaded
 */
export function getPixelIconComponent(): PixelIconComponent | null {
  if (pixelIconFn) return pixelIconFn;
  pixelIconFn = findPixelIconFromDom() || findPixelIconFromFiber();
  if (pixelIconFn) {
    (window as unknown as Record<string, unknown>).__ntg_pixelIcon = pixelIconFn;
  }
  return pixelIconFn;
}

/**
 * Generates candidate keys with appropriate prefixes for the game's drawing registry (Yw)
 */
function getPrefixCandidates(key: string): string[] {
  const clean = key.trim();
  if (!clean) return [];

  // If already prefixed, check directly
  if (
    clean.startsWith('benfish-') ||
    clean.startsWith('fish-') ||
    clean.startsWith('crop-') ||
    clean.startsWith('seed-') ||
    clean.startsWith('fsveg-') ||
    clean.startsWith('benback-') ||
    clean.startsWith('benpet-') ||
    clean.startsWith('fur-')
  ) {
    return [clean];
  }

  // Handle seed prefix variants: 'seed:radish' -> 'seed-radish'
  if (clean.startsWith('seed:')) {
    const sub = clean.slice(5);
    return [`seed-${sub}`, clean];
  }

  // Handle crop prefix variants: 'crop_radish' -> 'crop-radish'
  if (clean.startsWith('crop_')) {
    const sub = clean.slice(5);
    return [`crop-${sub}`, sub];
  }

  return [
    clean,                     // exact match (e.g. 'coin', 'ongTre', 'hoe', 'gui')
    `benfish-${clean}`,        // Wharf fish / junk (e.g. 'caLoc', 'depNhua')
    `crop-${clean}`,           // Harvested crop (e.g. 'radish')
    `seed-${clean}`,           // Seed (e.g. 'radish')
    `fsveg-${clean}`,          // Farmstay vegetable (e.g. 'rauMuong')
    `benback-${clean}-0`,      // Wharf back equipment (e.g. 'ongTre', 'gui')
    `benback-${clean}`,
    `crop-${clean}-3`,         // Mature crop stage
    `fish-${clean}`,           // Sea fish
    `fur-${clean}`,            // Furniture
    `house-${clean}`,          // House
  ];
}

/**
 * Draws a single asset dynamically via the game's canvas rendering function.
 * Returns data URL ("data:image/png;base64,...") or null if not found.
 */
export function drawGameAsset(rawKey: string): string | null {
  if (!rawKey) return null;
  const key = rawKey.trim();

  // 1. Check in-memory data URL cache
  if (cachedDataUrls.has(key)) {
    return cachedDataUrls.get(key) || null;
  }

  const comp = getPixelIconComponent();
  if (!comp) return null;

  // 2. Check if we already resolved the exact internal key for this input
  const resolved = resolvedKeyCache.get(key);
  if (resolved) {
    try {
      const res = comp({ name: resolved, size: 32 });
      const src = res?.props?.src;
      if (typeof src === 'string' && src.startsWith('data:image/')) {
        cachedDataUrls.set(key, src);
        return src;
      }
    } catch {
      // ignore
    }
  }

  // 3. Try all candidates
  const candidates = getPrefixCandidates(key);
  for (const candidate of candidates) {
    try {
      const res = comp({ name: candidate, size: 32 });
      const src = res?.props?.src;
      if (typeof src === 'string' && src.startsWith('data:image/')) {
        cachedDataUrls.set(key, src);
        cachedDataUrls.set(candidate, src);
        resolvedKeyCache.set(key, candidate);
        return src;
      }
    } catch {
      // continue to next candidate
    }
  }

  return null;
}

/**
 * Batch renders multiple assets in a single call for high performance.
 */
export function getGameAssets(keys: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  if (!Array.isArray(keys) || keys.length === 0) return result;

  for (const k of keys) {
    const dataUrl = drawGameAsset(k);
    if (dataUrl) {
      result[k] = dataUrl;
    }
  }

  return result;
}
