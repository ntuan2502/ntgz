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
/**
 * Generates candidate keys with appropriate prefixes for the game's drawing registry (Yw)
 */
const EMOJI_ASSET_MAP: Record<string, string> = {
  '🏠': 'i-house',
  '🛖': 'i-hut',
  '🏪': 'i-shop',
  '🛒': 'i-cart',
  '🛍️': 'i-cart',
  '🎁': 'i-gift',
  '📖': 'i-book',
  '📒': 'i-notebook',
  '📔': 'i-grandbook',
  '📜': 'i-scroll',
  '📋': 'i-clipboard',
  '🎯': 'i-target',
  '✅': 'i-check',
  '🔒': 'i-lock',
  '🏆': 'i-trophy',
  '💡': 'i-bulb',
  '🔥': 'i-fire',
  '❤️': 'i-heart',
  '⚡': 'i-bolt',
  '🔋': 'i-battery',
  '🍞': 'i-bread',
  '🥖': 'i-bread',
  '🥤': 'i-drink',
  '🧋': 'i-drink',
  '🧃': 'i-juice',
  '🧊': 'i-ice',
  '☕': 'i-coffee',
  '🥚': 'i-egg',
  '🐣': 'i-chick',
  '🍳': 'i-pan',
  '🍲': 'i-soup',
  '🍜': 'i-noodle',
  '🍛': 'i-rice',
  '🍚': 'i-rice',
  '🥮': 'i-cake',
  '🥟': 'i-dumpling',
  '🥪': 'i-sandwich',
  '🍑': 'i-peach',
  '🥥': 'i-coconut',
  '🍹': 'i-coconutDrink',
  '🍡': 'i-iceStick',
  '🍦': 'i-iceCone',
  '🍨': 'i-iceCoconut',
  '🔔': 'i-bell',
  '🌽': 'i-corn',
  '🤤': 'i-sandwich',
  '💸': 'i-money',
  '💰': 'i-moneybag',
  '📱': 'i-phone',
  '💬': 'i-speech',
  '📢': 'i-loud',
  '❗': 'i-bang',
  '⚠️': 'i-warn',
  '🚨': 'i-warn',
  '❓': 'i-question',
  '⏳': 'i-hourglass',
  '⏰': 'i-clock',
  '🎣': 'i-rod',
  '🌊': 'i-wave',
  '📍': 'i-pin',
  '📏': 'i-ruler',
  '🚫': 'i-no',
  '✕': 'i-close',
  '✔️': 'i-tick',
  '🔄': 'i-turn',
  '👑': 'i-crown',
  '👴': 'i-oldman',
  '👦': 'i-boy',
  '👧': 'i-girl',
  '🧑‍🌾': 'i-farmer',
  '🚧': 'i-build',
  '🔨': 'i-hammer',
  '🎉': 'i-party',
  '✨': 'i-sparkle',
  '💨': 'i-wind',
  '🌾': 'i-wheat',
  '🌧️': 'i-rain',
  '⛈️': 'i-storm',
  '🥵': 'i-heat',
  '🌅': 'i-sunrise',
  '☀️': 'sun',
  '🌙': 'moon',
  '😷': 'i-sick',
  '😋': 'i-yum',
  '🤝': 'i-handshake',
  '🎲': 'i-dice',
  '🚶': 'i-walk',
  '🏃': 'i-walk',
  '💪': 'i-flex',
  '🗺️': 'i-map',
  '⚙️': 'i-gear',
  '🎵': 'i-music',
  '🔊': 'i-sound',
  '💾': 'i-save',
  '📷': 'i-camera',
  '📸': 'i-camera',
  '🔦': 'i-flashlight',
  '📞': 'i-call',
  '✌️': 'i-peace',
  '💇': 'i-hair',
  '👕': 'i-shirt',
  '👗': 'i-dress',
  '🎒': 'i-bag',
  '🧢': 'i-cap',
  '✂️': 'i-scissors',
  '🎨': 'i-palette',
  '💆': 'i-spa',
  '🩳': 'i-shorts',
  '👒': 'i-nonla',
  '🏙️': 'i-city',
  '🌲': 'pine',
  '🐄': 'i-cow',
  '🐂': 'i-cow',
  '🏁': 'i-flag',
  '🪱': 'i-worm',
  '🌿': 'i-leaf',
  '🌱': 'i-sprout',
  '🧺': 'basket',
  '🧪': 'i-flask',
  '🧴': 'pesticide',
  '🐔': 'chicken',
  '🐟': 'fish-caNuc',
  '🦐': 'fish-tomSu',
  '🐢': 'fish-ruaBien',
  '🛵': 'ebike-side',
  '📦': 'i-box',
  '📭': 'i-box',
  '🪧': 'sign',
  '🐛': 'pestBug',
  '🗑️': 'benfish-depNhua',
  '👞': 'benfish-depNhua',
  '🪙': 'coin',
  '🪨': 'i-hammer',
  '🕳️': 'i-target',
  '🪵': 'i-leafBrown',
  '🔮': 'i-sparkle',
  '🛡️': 'i-battery',
  '💎': 'i-sparkle',
  '🌟': 'i-sparkle',
  '🦗': 'ongTre',
  '🎋': 'ongTre',
  '🎟️': 'i-turn',
  '🥛': 'i-drink',
  '🥕': 'crop-carrot',
  '🥬': 'fsveg-rauMuong',
  '🍅': 'fsveg-caChua',
  '🥒': 'fsveg-duaLeo',
  '🌶️': 'fsveg-ot',
  '🍉': 'fsveg-duaHau',
};

const SPECIAL_KEY_ALIASES: Record<string, string[]> = {
  radishSoup: ['i-soup', 'soup'],
  boiledEgg: ['i-egg'],
  grilledCorn: ['i-corn'],
  carrotJuice: ['i-juice'],
  eggBread: ['i-sandwich', 'i-bread'],
  comTam: ['i-rice'],
  cornCake: ['i-cake'],
  tea: ['i-drink'],
  traSua: ['i-drink'],
  banhMi: ['i-bread', 'i-sandwich'],
  bapNuong: ['i-corn'],

  egg: ['i-egg'],
  produce_egg: ['i-egg'],
  milk: ['i-drink'],
  produce_milk: ['i-drink'],
  cow: ['i-cow'],
  buffalo: ['i-cow'],
  hen: ['chicken', 'i-chick'],
  chicken: ['chicken', 'i-chick'],

  fertilizer: ['fertilizer', 'i-flask'],
  pesticide: ['pesticide', 'i-flask'],
  medicine: ['i-flask'],
  coffee: ['coffee', 'i-coffee'],
  mysteryBag: ['mysteryBag', 'i-gift'],
  coin: ['coin', 'i-money'],
  gold: ['coin', 'i-money'],
  shells: ['coin', 'i-money'],
  bait: ['i-worm'],
  rod: ['canCau', 'i-rod'],

  deVuong: ['i-crown', 'ongTre'],
  deMa: ['i-sparkle', 'ongTre'],
  deSat: ['i-hammer', 'i-battery', 'ongTre'],
  deNgoc: ['i-sparkle', 'ongTre'],
  deLua: ['i-fire', 'ongTre'],
  deVang: ['i-money', 'i-bell', 'ongTre'],
  deCo: ['i-flex', 'ongTre'],
  deTrui: ['i-target', 'ongTre'],
  deThan: ['i-leafBrown', 'ongTre'],
  deMen: ['i-worm', 'ongTre'],
  deDat: ['i-wheat', 'ongTre'],
  deCom: ['i-rice', 'ongTre'],

  ongTre: ['ongTre', 'benback-ongTre-0'],
  gui: ['gui', 'benback-gui-0'],
  gioCa: ['gioCa', 'benback-gioCa-0'],
  cui: ['cui', 'benback-cui-0'],
  thuocSau: ['thuocSau', 'benback-thuocSau-0'],
  thuocCo: ['thuocCo', 'benback-thuocCo-0'],
  baoLua: ['baoLua', 'benback-baoLua-0'],
  maiCheo: ['maiCheo', 'benback-maiCheo-0'],
  canCau: ['canCau', 'benback-canCau-0'],
  dieuGiay: ['dieuGiay', 'benback-dieuGiay-0'],
  denOngSao: ['denOngSao', 'benback-denOngSao-0'],
  dienDien: ['dienDien', 'benback-dienDien-0'],
};

function getPrefixCandidates(key: string): string[] {
  const clean = key.trim();
  if (!clean) return [];

  const candidates: string[] = [];

  // Check alias table first
  if (SPECIAL_KEY_ALIASES[clean]) {
    candidates.push(...SPECIAL_KEY_ALIASES[clean]);
  }

  // Check emoji map
  if (EMOJI_ASSET_MAP[clean]) {
    candidates.push(EMOJI_ASSET_MAP[clean]);
  }

  // If already prefixed, check directly
  if (
    clean.startsWith('benfish-') ||
    clean.startsWith('fish-') ||
    clean.startsWith('crop-') ||
    clean.startsWith('seed-') ||
    clean.startsWith('fsveg-') ||
    clean.startsWith('benback-') ||
    clean.startsWith('benpet-') ||
    clean.startsWith('fur-') ||
    clean.startsWith('i-')
  ) {
    candidates.push(clean);
    return Array.from(new Set(candidates));
  }

  // Handle seed prefix variants: 'seed:radish' -> 'seed-radish'
  if (clean.startsWith('seed:')) {
    const sub = clean.slice(5);
    candidates.push(`seed-${sub}`, clean);
    return Array.from(new Set(candidates));
  }

  // Handle crop prefix variants: 'crop_radish' -> 'crop-radish'
  if (clean.startsWith('crop_')) {
    const sub = clean.slice(5);
    candidates.push(`crop-${sub}`, sub);
    return Array.from(new Set(candidates));
  }

  candidates.push(
    clean, // exact match (e.g. 'coin', 'ongTre', 'hoe', 'gui')
    `benfish-${clean}`, // Wharf fish / junk (e.g. 'caLoc', 'depNhua')
    `crop-${clean}`, // Harvested crop (e.g. 'radish')
    `seed-${clean}`, // Seed (e.g. 'radish')
    `fsveg-${clean}`, // Farmstay vegetable (e.g. 'rauMuong')
    `benback-${clean}-0`, // Wharf back equipment (e.g. 'ongTre', 'gui')
    `benback-${clean}`,
    `benpet-${clean}-0`, // Wharf pet
    `benpet-${clean}`,
    `i-${clean}`, // Game emoji-style pixel icon
    `crop-${clean}-3`, // Mature crop stage
    `fish-${clean}`, // Sea fish
    `fur-${clean}`, // Furniture
    `house-${clean}`, // House
  );

  return Array.from(new Set(candidates));
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
