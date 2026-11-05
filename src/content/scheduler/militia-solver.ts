/**
 * Militia Verification (Captcha) Solver for Bến Đò
 * 
 * Automatically detects the "🪖 Dân quân kiểm tra!" puzzle modal,
 * triggers an audio chime to notify the player, analyzes the 260x128 pixel art
 * river image using offscreen Canvas BFS Connected Component Analysis & Structural/Anatomical classification,
 * and clicks the correct option button.
 */

export type MilitiaAskKind = 'fish' | 'crab' | 'shrimp' | 'snail' | 'frog' | 'turtle';

export type MilitiaCheckType = 'count' | 'odd' | 'quiz' | 'tap' | 'drag';

export interface MilitiaClassificationResult {
  fish: number;
  crab: number;
  shrimp: number;
  snail: number;
  frog?: number;
  turtle?: number;
  other: number;
  blobsCount: number;
}

export interface MilitiaAnswerResolution {
  count: number;
  optionIndex: number;
  optionValue: number;
  confidence: 'exact' | 'closest' | 'fallback';
}

export interface MilitiaTapAnswerResolution {
  x: number;
  y: number;
  normalizedX: number;
  normalizedY: number;
  row?: number;
  col?: number;
  reason: string;
  confidence: number;
}

export interface MilitiaDragAnswerResolution {
  x: number;
  y: number;
  slotCenterX: number;
  slotCenterY: number;
  normalizedX: number;
  normalizedY: number;
  path: [number, number, number][];
  confidence: number;
}

export const MILITIA_KIND_LABELS: Record<MilitiaAskKind, string> = {
  fish: 'cá 🐟',
  crab: 'cua 🦀',
  shrimp: 'tôm 🦐',
  snail: 'ốc 🐌',
  frog: 'ếch 🐸',
  turtle: 'rùa 🐢',
};

let audioCtx: AudioContext | null = null;

/**
 * Plays an audible two-tone alert chime (D5 -> A5) via Web Audio API
 * to alert the user that a militia verification check has appeared.
 */
export function playMilitiaAlertBeep(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.setValueAtTime(880, now + 0.15); // A5

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
    gain.gain.setValueAtTime(0.25, now + 0.22);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.65);
  } catch (err) {
    // Non-blocking if browser audio policy prevents sound before interaction
    console.warn('[Militia] Audio chime alert unavailable:', err);
  }
}

/**
 * Parses the target creature from the WebSocket ask string or modal subtitle text.
 */
export function parseMilitiaTarget(askStr?: string, modalText?: string): MilitiaAskKind {
  if (askStr) {
    const lower = askStr.toLowerCase();
    if (lower.includes('turtle') || lower.includes('rua') || lower.includes('rùa')) return 'turtle';
    if (lower.includes('frog') || lower.includes('ech') || lower.includes('ếch')) return 'frog';
    if (lower.includes('crab') || lower.includes('cua')) return 'crab';
    if (lower.includes('shrimp') || lower.includes('tom')) return 'shrimp';
    if (lower.includes('snail') || lower.includes('oc')) return 'snail';
    if (lower.includes('fish') || lower.includes('ca')) return 'fish';
  }

  if (modalText) {
    const lower = modalText.toLowerCase();
    if (lower.includes('rùa') || lower.includes('rua') || lower.includes('🐢')) return 'turtle';
    if (lower.includes('ếch') || lower.includes('ech') || lower.includes('🐸')) return 'frog';
    if (lower.includes('cua') || lower.includes('🦀')) return 'crab';
    if (lower.includes('tôm') || lower.includes('tom') || lower.includes('🦐')) return 'shrimp';
    if (lower.includes('ốc') || lower.includes('oc') || lower.includes('🐌')) return 'snail';
    if (lower.includes('cá') || lower.includes('ca') || lower.includes('🐟')) return 'fish';
  }

  return 'fish';
}

/**
 * Detects the militia verification type ('count' | 'odd' | 'quiz' | 'tap' | 'drag').
 */
export function detectMilitiaCheckType(type?: string, modalText?: string): MilitiaCheckType {
  if (type) {
    const t = type.toLowerCase().trim();
    if (t === 'odd') return 'odd';
    if (t === 'quiz') return 'quiz';
    if (t === 'tap') return 'tap';
    if (t === 'drag') return 'drag';
    if (t === 'count') return 'count';
  }

  if (modalText) {
    const lower = modalText.toLowerCase();
    if (
      lower.includes('có một con khác') ||
      lower.includes('lật ngược') ||
      lower.includes('quay đầu') ||
      lower.includes('khác màu') ||
      lower.includes('khác cỡ') ||
      lower.includes('mất mắt')
    ) {
      return 'odd';
    }
    if (
      lower.includes('chạm vào ô đúng') ||
      lower.includes('kéo cày') ||
      lower.includes('chở người') ||
      lower.includes('gáy ò ó o') ||
      lower.includes('kêu ộp ộp') ||
      lower.includes('uống nước mát') ||
      lower.includes('đeo mai cứng')
    ) {
      return 'quiz';
    }
    if (lower.includes('chạm vào con') || lower.includes('chỉ có một con')) {
      return 'tap';
    }
    if (lower.includes('kéo mảnh') || lower.includes('thả vào đúng chỗ trống')) {
      return 'drag';
    }
  }

  return 'count';
}

function colorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

// Static buffer memory pool to eliminate garbage collection overhead during repeated parses
let cachedVisitedBuffer: Uint8Array | null = null;
let cachedQueueBuffer: Int32Array | null = null;

function getVisitedBuffer(size: number): Uint8Array {
  if (!cachedVisitedBuffer || cachedVisitedBuffer.length < size) {
    cachedVisitedBuffer = new Uint8Array(Math.max(size, 400 * 250));
  }
  cachedVisitedBuffer.fill(0, 0, size);
  return cachedVisitedBuffer;
}

function getQueueBuffer(size: number): Int32Array {
  const reqLen = size * 2;
  if (!cachedQueueBuffer || cachedQueueBuffer.length < reqLen) {
    cachedQueueBuffer = new Int32Array(Math.max(reqLen, 400 * 250 * 2));
  }
  return cachedQueueBuffer;
}

let cachedOffscreenCanvas: OffscreenCanvas | HTMLCanvasElement | null = null;
let cachedCanvasCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

function getReusableCanvas(width: number, height: number): {
  canvas: OffscreenCanvas | HTMLCanvasElement | null;
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
} {
  if (!cachedOffscreenCanvas) {
    if (typeof OffscreenCanvas !== 'undefined') {
      try {
        cachedOffscreenCanvas = new OffscreenCanvas(width, height);
        cachedCanvasCtx = cachedOffscreenCanvas.getContext('2d', {
          willReadFrequently: true,
        }) as OffscreenCanvasRenderingContext2D | null;
      } catch {
        cachedOffscreenCanvas = null;
        cachedCanvasCtx = null;
      }
    }
    if (!cachedOffscreenCanvas && typeof document !== 'undefined') {
      const el = document.createElement('canvas');
      el.width = width;
      el.height = height;
      cachedOffscreenCanvas = el;
      cachedCanvasCtx = el.getContext('2d', { willReadFrequently: true });
    }
  }

  if (cachedOffscreenCanvas) {
    if (cachedOffscreenCanvas.width < width) cachedOffscreenCanvas.width = width;
    if (cachedOffscreenCanvas.height < height) cachedOffscreenCanvas.height = height;
  }

  return { canvas: cachedOffscreenCanvas, ctx: cachedCanvasCtx };
}

/**
 * Performs Connected Component Analysis & Structural Classification on pixel data of the river captcha.
 */
function analyzeImageData(
  imgData: ImageData,
  width: number,
  height: number
): MilitiaClassificationResult {
  const data = imgData.data;

  const getPixel = (x: number, y: number): [number, number, number, number] => {
    const idx = (y * width + x) * 4;
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  };

  // Foreground detection: distinguishes creature/object pixels from river water, ripples, and seaweed
  const isForeground = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 128) return false;
    // Dark outline (#1e1e28 or #2b2230) is always creature/object outline
    if (r < 50 && g < 50 && b < 60) return true;
    // Blue/purple creatures (e.g. Blue Fish #5ba2da rgb(91,162,218), Purple Crab #9664b4):
    // Blue distinctly dominates green (b - g >= 35) and red (b - r >= 35)
    if (b >= 135 && b - g >= 35 && b - r >= 35) return true;
    // River water: typical teal/cyan river water (blue >= 105, green >= 80, red <= 90)
    if (b >= 105 && g >= 80 && r <= 90) return false;
    // River water ripples (cyan/light blue highlights): blue and green strongly dominate red.
    // Silver/white creatures (like Tép Bạc / Tôm bạc #e0e4e8) have near-equal RGB and are preserved.
    if (b >= 155 && g >= 140 && (b - r >= 35 || g - r >= 25)) return false;
    // Seaweed green foliage (g > 95 and distinct green dominance)
    if (g > 95 && g > r + 25 && g > b + 20) return false;
    // Dialog card border (if image padding or borders touch the canvas)
    if (r > 225 && g > 210 && b > 175 && Math.abs(r - g) < 25) return false;
    return true;
  };

  const visited = getVisitedBuffer(width * height);
  const q = getQueueBuffer(width * height);
  const blobs: Array<{
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    bw: number;
    bh: number;
    pixelCount: number;
    tanFootCount: number;
    whiteEyeCount: number;
    darkEyeCount: number;
    redCount: number;
    orangeCount: number;
    pixelCoords: Set<string>;
    eyePixels: Array<{ x: number; y: number }>;
  }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const [r, g, b, a] = getPixel(x, y);
      if (!isForeground(r, g, b, a)) continue;

      // 8-Connected BFS with zero-allocation flat array
      visited[idx] = 1;
      let head = 0;
      let tail = 0;
      q[tail++] = x;
      q[tail++] = y;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;
      let tanFootCount = 0;
      let whiteEyeCount = 0;
      let darkEyeCount = 0;
      let redCount = 0;
      let orangeCount = 0;
      const pixelCoords = new Set<string>();
      const eyePixels: Array<{ x: number; y: number }> = [];

      while (head < tail) {
        const cx = q[head++];
        const cy = q[head++];
        pixelCount++;
        pixelCoords.add(`${cx},${cy}`);

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const [pr, pg, pb] = getPixel(cx, cy);

        // Feature tests:
        // 1. Snail Tan Foot: #b8a888 -> R:184, G:168, B:136 (strictly in lower half)
        if (colorDistance(pr, pg, pb, 184, 168, 136) < 30) {
          tanFootCount++;
        }

        // 2. Fish White Eye: bright white #ffffff (strict threshold >= 235)
        if (pr >= 235 && pg >= 235 && pb >= 235) {
          whiteEyeCount++;
          eyePixels.push({ x: cx, y: cy });
        }

        // 2b. Dark Eye / Pupil / Outline (pr < 50 && pg < 50 && pb < 60)
        if (pr < 50 && pg < 50 && pb < 60) {
          darkEyeCount++;
        }

        // 3. Red & Wine tones (some crabs, red fish): #e0393e or #96202a
        if (
          (pr > 135 && pr > pg + 30 && pr > pb + 30) ||
          colorDistance(pr, pg, pb, 224, 57, 62) < 35 ||
          colorDistance(pr, pg, pb, 150, 32, 42) < 35
        ) {
          redCount++;
        }

        // 4. Shrimp Orange Segment: #ff9a2a (255, 154, 42)
        if (pr > 200 && pg > 110 && pg < 190 && pb < 90) {
          orangeCount++;
        }

        // 8-neighbor expansion
        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              const [nr, ng, nb, na] = getPixel(nx, ny);
              if (isForeground(nr, ng, nb, na)) {
                visited[nIdx] = 1;
                q[tail++] = nx;
                q[tail++] = ny;
              }
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      // Filter creature sprites (typically 10-52px wide, 6-40px high, >= 15 pixels)
      if (bw >= 8 && bw <= 55 && bh >= 6 && bh <= 45 && pixelCount >= 15) {
        blobs.push({
          minX,
          maxX,
          minY,
          maxY,
          bw,
          bh,
          pixelCount,
          tanFootCount,
          whiteEyeCount,
          darkEyeCount,
          redCount,
          orangeCount,
          pixelCoords,
          eyePixels,
        });
      }
    }
  }

  const counts: MilitiaClassificationResult = {
    fish: 0,
    crab: 0,
    shrimp: 0,
    snail: 0,
    other: 0,
    blobsCount: blobs.length,
  };

  for (const b of blobs) {
    const aspect = b.bw / b.bh;

    // 1. CRAB: Distinct dual top claws at extreme left and right with empty center in top rows
    let topRow1 = -1;
    let topRow2 = -1;
    for (let y = b.minY; y <= b.maxY; y++) {
      let hasAny = false;
      for (let x = b.minX; x <= b.maxX; x++) {
        if (b.pixelCoords.has(`${x},${y}`)) {
          hasAny = true;
          break;
        }
      }
      if (hasAny) {
        if (topRow1 === -1) topRow1 = y;
        else if (topRow2 === -1) {
          topRow2 = y;
          break;
        }
      }
    }

    const checkRowClaws = (y: number): boolean => {
      if (y === -1) return false;
      let left = 0;
      let right = 0;
      let mid = 0;
      for (let x = b.minX; x <= b.maxX; x++) {
        if (b.pixelCoords.has(`${x},${y}`)) {
          if (x < b.minX + b.bw * 0.32) left++;
          else if (x > b.maxX - b.bw * 0.32) right++;
          else mid++;
        }
      }
      return left >= 1 && right >= 1 && mid === 0;
    };

    const hasClaws = checkRowClaws(topRow1) || checkRowClaws(topRow2);
    const isCrab = b.whiteEyeCount === 0 && hasClaws && aspect >= 1.25 && aspect <= 2.3;

    // Baseline bottom row span (at maxY)
    // Snails have a flat baseline foot extending across the whole bottom row (span >= 80%).
    // Fish ventral fin and shrimp tails only span a fraction of maxY (span <= 65%).
    let minX_at_maxY = b.maxX;
    let maxX_at_maxY = b.minX;
    for (let x = b.minX; x <= b.maxX; x++) {
      if (b.pixelCoords.has(`${x},${b.maxY}`)) {
        minX_at_maxY = Math.min(minX_at_maxY, x);
        maxX_at_maxY = Math.max(maxX_at_maxY, x);
      }
    }
    const bottomRowSpan = (maxX_at_maxY - minX_at_maxY + 1) / b.bw;

    // 2. SNAIL: Anatomical flat bottom foot + single-sided eye stalk tentacle bump (facing left or right)
    let hasStalkRight = false;
    let hasStalkLeft = false;
    const midY1 = b.minY + Math.floor(b.bh * 0.45);
    const midY2 = b.minY + Math.floor(b.bh * 0.85);
    for (let y = midY1; y <= midY2; y++) {
      let hasRightEdge = false;
      let hasRightGap = false;
      const rightStalkX = b.maxX - Math.max(1, Math.floor(b.bw * 0.15));
      for (let x = rightStalkX; x <= b.maxX; x++) {
        if (b.pixelCoords.has(`${x},${y}`)) hasRightEdge = true;
      }
      for (let x = Math.floor(b.minX + b.bw * 0.65); x < rightStalkX; x++) {
        if (!b.pixelCoords.has(`${x},${y}`)) hasRightGap = true;
      }
      if (hasRightEdge && hasRightGap) hasStalkRight = true;

      let hasLeftEdge = false;
      let hasLeftGap = false;
      const leftStalkX = b.minX + Math.max(1, Math.floor(b.bw * 0.15));
      for (let x = b.minX; x <= leftStalkX; x++) {
        if (b.pixelCoords.has(`${x},${y}`)) hasLeftEdge = true;
      }
      for (let x = leftStalkX + 1; x <= Math.floor(b.minX + b.bw * 0.35); x++) {
        if (!b.pixelCoords.has(`${x},${y}`)) hasLeftGap = true;
      }
      if (hasLeftEdge && hasLeftGap) hasStalkLeft = true;
    }

    const isSnail =
      !isCrab &&
      b.whiteEyeCount === 0 &&
      bottomRowSpan >= 0.80 &&
      ((hasStalkLeft || hasStalkRight) || b.tanFootCount >= 2) &&
      aspect >= 1.30 &&
      aspect <= 2.25;

    // 3. FISH:
    // Fish can have bright white eye (#ffffff) OR dark embedded eye (#1e1e28).
    // Fish is horizontally elongated (aspect >= 1.25), convex on top and bottom (bottomRowSpan <= 0.70).
    // Dorsal fin on top, ventral fin on bottom, tail peduncle at back.
    const hasWhiteEye = b.whiteEyeCount >= 1 && b.whiteEyeCount <= 6;
    let hasEmbeddedDarkEye = false;
    if (b.darkEyeCount >= 2 && !isCrab && !isSnail) {
      for (let y = b.minY + Math.floor(b.bh * 0.25); y <= b.minY + Math.floor(b.bh * 0.60); y++) {
        for (let x = b.minX; x <= b.maxX; x++) {
          const [pr, pg, pb] = getPixel(x, y);
          if (pr < 50 && pg < 50 && pb < 60) {
            const relX = (x - b.minX) / b.bw;
            if (relX > 0.65 || relX < 0.35) {
              hasEmbeddedDarkEye = true;
              break;
            }
          }
        }
        if (hasEmbeddedDarkEye) break;
      }
    }

    const isFish =
      !isCrab &&
      !isSnail &&
      (hasWhiteEye || hasEmbeddedDarkEye || (aspect >= 1.4 && bottomRowSpan <= 0.65)) &&
      bottomRowSpan <= 0.78 &&
      b.bw >= 10 &&
      b.bw <= 55 &&
      b.bh >= 6 &&
      b.bh <= 30 &&
      aspect >= 1.25 &&
      aspect <= 3.4;

    // 4. SHRIMP: Antenna whiskers on one side of top row, or curved crescent body.
    // Strictly requires NO white eyes (ruling out fish), NO crab claws, NO snail flat foot.
    let hasShrimpWhisker = false;
    if (topRow1 !== -1) {
      let left = 0;
      let right = 0;
      let mid = 0;
      for (let x = b.minX; x <= b.maxX; x++) {
        if (b.pixelCoords.has(`${x},${topRow1}`)) {
          if (x < b.minX + b.bw * 0.25) left++;
          else if (x > b.maxX - b.bw * 0.25) right++;
          else mid++;
        }
      }
      if (((left > 0 && right === 0) || (right > 0 && left === 0)) && mid === 0 && b.bw >= 15) {
        hasShrimpWhisker = true;
      }
    }

    const isShrimp =
      !isFish &&
      !isCrab &&
      !isSnail &&
      b.whiteEyeCount === 0 &&
      (hasShrimpWhisker ||
        (b.orangeCount >= 4 && aspect >= 1.5) ||
        (aspect >= 0.95 && aspect <= 1.35 && b.bh >= 15));

    if (isCrab) {
      counts.crab++;
    } else if (isSnail) {
      counts.snail++;
    } else if (isFish) {
      // Check for overlapping fish in a single blob
      let fishInBlob = 1;
      if (b.eyePixels.length >= 2 && b.bw >= 28) {
        const minEyeX = Math.min(...b.eyePixels.map((p) => p.x));
        const maxEyeX = Math.max(...b.eyePixels.map((p) => p.x));
        if (maxEyeX - minEyeX >= 11) {
          fishInBlob = 2;
        }
      }
      counts.fish += fishInBlob;
    } else if (isShrimp) {
      counts.shrimp++;
    } else {
      counts.other++;
    }
  }

  return counts;
}

/**
 * Classifies an image element or base64 data URI into counts of fish, crab, shrimp, and snail.
 */
export async function classifyMilitiaImage(
  imgSource: HTMLImageElement | string
): Promise<MilitiaClassificationResult> {
  let imgEl: HTMLImageElement;

  if (typeof imgSource === 'string') {
    imgEl = new Image();
    imgEl.crossOrigin = 'anonymous';
    imgEl.src = imgSource.startsWith('data:') ? imgSource : `data:image/png;base64,${imgSource}`;
    await new Promise<void>((resolve, reject) => {
      if (imgEl.complete && imgEl.naturalWidth > 0) return resolve();
      imgEl.onload = () => resolve();
      imgEl.onerror = () => reject(new Error('Failed to load militia captcha image'));
    });
  } else {
    imgEl = imgSource;
    if (!imgEl.complete || imgEl.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        imgEl.onload = () => resolve();
        imgEl.onerror = () => reject(new Error('Failed to load militia image element'));
      });
    }
  }

  const width = imgEl.naturalWidth || 260;
  const height = imgEl.naturalHeight || 128;

  const { canvas, ctx } = getReusableCanvas(width, height);
  if (!canvas || !ctx) {
    return { fish: 0, crab: 0, shrimp: 0, snail: 0, other: 0, blobsCount: 0 };
  }

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(imgEl, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  return analyzeImageData(imgData, width, height);
}

/**
 * Determines the best option button to click given the classified counts and available options.
 */
export function resolveMilitiaAnswer(
  targetKind: MilitiaAskKind,
  result: MilitiaClassificationResult,
  options: number[]
): MilitiaAnswerResolution {
  const count = result[targetKind] ?? 0;

  if (!Array.isArray(options) || options.length === 0) {
    return {
      count,
      optionIndex: 0,
      optionValue: count,
      confidence: 'fallback',
    };
  }

  // 1. Exact match in options
  const exactIdx = options.indexOf(count);
  if (exactIdx !== -1) {
    return {
      count,
      optionIndex: exactIdx,
      optionValue: options[exactIdx],
      confidence: 'exact',
    };
  }

  // 2. Nearest numeric option (fallback when exact count slightly deviates)
  let closestIdx = 0;
  let minDiff = Infinity;
  for (let i = 0; i < options.length; i++) {
    const diff = Math.abs(options[i] - count);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = i;
    }
  }

  return {
    count,
    optionIndex: closestIdx,
    optionValue: options[closestIdx],
    confidence: 'closest',
  };
}

/**
 * Loads an HTMLImageElement from an element reference or base64 data string.
 */
async function loadMilitiaImageElement(imgSource: HTMLImageElement | string): Promise<HTMLImageElement> {
  if (typeof imgSource !== 'string') {
    if (!imgSource.complete || imgSource.naturalWidth === 0) {
      await new Promise<void>((resolve, reject) => {
        imgSource.onload = () => resolve();
        imgSource.onerror = () => reject(new Error('Failed to load militia image element'));
      });
    }
    return imgSource;
  }

  const imgEl = new Image();
  imgEl.crossOrigin = 'anonymous';
  imgEl.src = imgSource.startsWith('data:') ? imgSource : `data:image/png;base64,${imgSource}`;
  await new Promise<void>((resolve, reject) => {
    if (imgEl.complete && imgEl.naturalWidth > 0) return resolve();
    imgEl.onload = () => resolve();
    imgEl.onerror = () => reject(new Error('Failed to load militia base64 image'));
  });
  return imgEl;
}

/**
 * Extracts ImageData from an image source using an offscreen canvas.
 */
async function extractMilitiaImageData(imgSource: HTMLImageElement | string): Promise<{
  imgData: ImageData;
  width: number;
  height: number;
} | null> {
  const imgEl = await loadMilitiaImageElement(imgSource);
  const width = imgEl.naturalWidth || 260;
  const height = imgEl.naturalHeight || 128;
  const { canvas, ctx } = getReusableCanvas(width, height);
  if (!canvas || !ctx) return null;

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(imgEl, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  return { imgData, width, height };
}

/**
 * Detects inner image content bounding box.
 * If input is a screenshot of the modal dialog, trims modal padding/background.
 * If input is a pure captcha image (raw base64 from websocket), returns full bounds.
 */
function detectContentBounds(
  pixels: Uint8ClampedArray,
  width: number,
  height: number
): { x0: number; y0: number; w: number; h: number } {
  const isDialogBeige = (r: number, g: number, b: number) =>
    (r > 235 && g > 225 && b > 200) || (r > 200 && g > 200 && b > 180 && Math.abs(r - g) < 15);

  let top = -1;
  let bottom = -1;
  let left = width;
  let right = 0;

  for (let y = 30; y < height - 30; y++) {
    let rowNonBgCount = 0;
    for (let x = 10; x < width - 10; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      if (!isDialogBeige(r, g, b)) rowNonBgCount++;
    }
    if (rowNonBgCount > width * 0.7) {
      if (top === -1) top = y;
      bottom = y;
    }
  }

  // Screenshot detected if top padding has dialog header text
  if (top !== -1 && bottom - top > 80 && top > 30) {
    const midY = Math.floor((top + bottom) / 2);
    for (let x = 5; x < width - 5; x++) {
      const idx = (midY * width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      if (!isDialogBeige(r, g, b)) {
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
    return {
      x0: left + 8,
      y0: top + 8,
      w: Math.max(1, right - left - 15),
      h: Math.max(1, bottom - top - 15),
    };
  }

  return { x0: 0, y0: 0, w: width, h: height };
}

/**
 * Solves "odd" captcha: 3x3 grid where 1 creature has an anomaly
 * (lật ngược, quay đầu, khác màu, khác cỡ, hoặc mất mắt).
 */
export async function solveMilitiaOddImage(
  imgSource: HTMLImageElement | string
): Promise<MilitiaTapAnswerResolution> {
  const extracted = await extractMilitiaImageData(imgSource);
  if (!extracted) {
    return { x: 130, y: 64, normalizedX: 0.5, normalizedY: 0.5, row: 1, col: 1, reason: 'fallback', confidence: 0 };
  }

  const { imgData, width, height } = extracted;
  const pixels = imgData.data;
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);

  const cellW = w / 3;
  const cellH = h / 3;
  const pw = 48;
  const ph = 24;
  const halfW = Math.floor(pw / 2);
  const halfH = Math.floor(ph / 2);

  const cells: Array<{
    r: number;
    c: number;
    x: number;
    y: number;
    normalizedX: number;
    normalizedY: number;
    fgCount: number;
    eyeX: number;
    eyeCount: number;
    mask: number[];
  }> = [];

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = Math.floor(x0 + (c + 0.5) * cellW);
      const cy = Math.floor(y0 + (r + 0.42) * cellH);

      let fgCount = 0;
      let sumEyeX = 0;
      let eyeCount = 0;
      const mask: number[] = [];

      for (let dy = -halfH; dy < halfH; dy++) {
        for (let dx = -halfW; dx < halfW; dx++) {
          const px = cx + dx;
          const py = cy + dy;
          const idx = (py * width + px) * 4;
          const pr = pixels[idx];
          const pg = pixels[idx + 1];
          const pb = pixels[idx + 2];

          const isDark = pr < 60 && pg < 60 && pb < 70;
          const isNonWaterColor =
            (pr > 160 && (pr > pb + 30 || pr > pg + 30)) || // pink shrimp or yellow fish
            (pr > 95 && pr > pb + 20) || // turtle shell / brown fin
            (pg > 115 && pg > pb + 35); // turtle legs green

          const isCreature = isDark || isNonWaterColor;
          mask.push(isCreature ? 1 : 0);
          if (isCreature) fgCount++;

          if (isDark) {
            // Check if within inner body region away from cell borders
            if (Math.abs(dx) < 22 && Math.abs(dy) < 10) {
              const leftIdx = (py * width + Math.max(0, px - 4)) * 4;
              const rightIdx = (py * width + Math.min(width - 1, px + 4)) * 4;
              const hasBodyNeighbor =
                (pixels[leftIdx] > 160 && pixels[leftIdx + 1] > 140) ||
                (pixels[rightIdx] > 160 && pixels[rightIdx + 1] > 140) ||
                (pb > 150 && pg > 100); // blue fish
              if (hasBodyNeighbor) {
                sumEyeX += (px - (cx - halfW)) / pw;
                eyeCount++;
              }
            }
          }
        }
      }

      const eyeX = eyeCount ? sumEyeX / eyeCount : 0.5;
      const normalizedX = Number(((c + 0.5) / 3).toFixed(3));
      const normalizedY = Number(((r + 0.5) / 3).toFixed(3));

      cells.push({
        r,
        c,
        x: cx,
        y: cy,
        normalizedX,
        normalizedY,
        fgCount,
        eyeX,
        eyeCount,
        mask,
      });
    }
  }

  // 1. Check SIZE anomaly (khác cỡ)
  const fgCounts = cells.map((c) => c.fgCount);
  const medFg = [...fgCounts].sort((a, b) => a - b)[4];
  const sizeCandidates = cells
    .map((c, i) => ({
      idx: i,
      ratio: medFg > 0 ? c.fgCount / medFg : 1,
      diff: Math.abs(c.fgCount - medFg),
    }))
    .sort((a, b) => b.diff - a.diff);

  if (sizeCandidates[0].diff > 80 && (sizeCandidates[0].ratio > 1.4 || sizeCandidates[0].ratio < 0.6)) {
    const chosen = cells[sizeCandidates[0].idx];
    return {
      x: chosen.x,
      y: chosen.y,
      normalizedX: chosen.normalizedX,
      normalizedY: chosen.normalizedY,
      row: chosen.r,
      col: chosen.c,
      reason: 'khác cỡ (kích thước bất thường)',
      confidence: Number((sizeCandidates[0].diff / 50).toFixed(2)),
    };
  }

  // 2. Check DIRECTION anomaly (quay đầu - eye horizontal position)
  const eyeXs = cells.map((c) => c.eyeX);
  const medEyeX = [...eyeXs].sort((a, b) => a - b)[4];
  const dirCandidates = cells
    .map((c, i) => ({
      idx: i,
      diff: Math.abs(c.eyeX - medEyeX),
    }))
    .sort((a, b) => b.diff - a.diff);

  if (dirCandidates[0].diff > 0.12 && (dirCandidates[0].diff > 0.18 || dirCandidates[0].diff > dirCandidates[1].diff * 1.35)) {
    const chosen = cells[dirCandidates[0].idx];
    return {
      x: chosen.x,
      y: chosen.y,
      normalizedX: chosen.normalizedX,
      normalizedY: chosen.normalizedY,
      row: chosen.r,
      col: chosen.c,
      reason: 'quay đầu (bơi ngược hướng)',
      confidence: Number((dirCandidates[0].diff * 10).toFixed(2)),
    };
  }

  // 3. Check MASK anomaly (lật ngược - vertical inversion or shape anomaly)
  const maskScores: Array<{ idx: number; score: number }> = [];
  for (let i = 0; i < 9; i++) {
    const m1 = cells[i].mask;
    const diffs: number[] = [];
    for (let j = 0; j < 9; j++) {
      if (i === j) continue;
      const m2 = cells[j].mask;
      let d = 0;
      for (let k = 0; k < m1.length; k++) {
        if (m1[k] !== m2[k]) d++;
      }
      diffs.push(d);
    }
    diffs.sort((a, b) => a - b);
    maskScores.push({ idx: i, score: diffs[2] });
  }
  maskScores.sort((a, b) => b.score - a.score);
  const chosen = cells[maskScores[0].idx];
  return {
    x: chosen.x,
    y: chosen.y,
    normalizedX: chosen.normalizedX,
    normalizedY: chosen.normalizedY,
    row: chosen.r,
    col: chosen.c,
    reason: 'lật ngược (chổng ngược đầu đuôi)',
    confidence: Number((maskScores[0].score / 100).toFixed(2)),
  };
}

/**
 * Solves "drag" puzzle: Slider piece on left edge must be dragged into
 * the recessed dark square slot in the river background image.
 */
export async function solveMilitiaDragImage(
  imgSource: HTMLImageElement | string,
  pieceY?: number
): Promise<MilitiaDragAnswerResolution> {
  const extracted = await extractMilitiaImageData(imgSource);
  if (!extracted) {
    return {
      x: 180,
      y: 60,
      slotCenterX: 180,
      slotCenterY: 60,
      normalizedX: 0.5,
      normalizedY: 0.4,
      path: [[0, 20, 60], [300, 100, 60], [600, 180, 60]],
      confidence: 0,
    };
  }

  const { imgData, width, height } = extracted;
  const pixels = imgData.data;
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);

  const slotSize = 38;
  let minSum = Infinity;
  let bestSlotX = x0 + Math.floor(w * 0.5);
  let bestSlotY = y0 + Math.floor(h * 0.4);

  // Scan in the right 75% region (avoiding the left draggable piece)
  const startX = x0 + Math.floor(w * 0.25);
  const endX = x0 + w - slotSize - 8;
  const startY = y0 + 10;
  const endY = y0 + h - slotSize - 10;

  for (let y = startY; y < endY; y += 2) {
    for (let x = startX; x < endX; x += 2) {
      let sumBrightness = 0;
      for (let dy = 2; dy < slotSize - 2; dy += 2) {
        for (let dx = 2; dx < slotSize - 2; dx += 2) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          sumBrightness += pixels[idx] + pixels[idx + 1] + pixels[idx + 2];
        }
      }
      if (sumBrightness < minSum) {
        minSum = sumBrightness;
        bestSlotX = x;
        bestSlotY = y;
      }
    }
  }

  const slotCenterX = Math.round(bestSlotX + slotSize / 2);
  const slotCenterY = Math.round(bestSlotY + slotSize / 2);
  const normX = Number(((bestSlotX - x0) / w).toFixed(3));
  const normY = Number(((bestSlotY - y0) / h).toFixed(3));

  // Generate smooth human-like path
  const originX = 18;
  const originY = typeof pieceY === 'number' && pieceY > 0 ? pieceY : (slotCenterY - y0);
  const targetX = bestSlotX - x0;
  const targetY = bestSlotY - y0;

  const totalDuration = 450 + Math.floor(Math.random() * 150); // 450 - 600ms
  const steps = 12;
  const path: [number, number, number][] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ease = 1 - Math.pow(1 - t, 3);
    const ms = Math.round(t * totalDuration);
    const jitterX = i > 0 && i < steps ? (Math.random() - 0.5) * 2 : 0;
    const jitterY = i > 0 && i < steps ? (Math.random() - 0.5) * 2 : 0;
    const curX = Math.round(originX + (targetX - originX) * ease + jitterX);
    const curY = Math.round(originY + (targetY - originY) * ease + jitterY);
    path.push([ms, curX, curY]);
  }

  return {
    x: targetX,
    y: targetY,
    slotCenterX,
    slotCenterY,
    normalizedX: normX,
    normalizedY: normY,
    path,
    confidence: Number((100000 / Math.max(1, minSum)).toFixed(2)),
  };
}

/**
 * Solves "quiz" captcha: 2 rows x 3 columns trivia grid.
 * Targets:
 * - 'plough': Con trâu kéo cày ngoài ruộng
 * - 'boat': Chiếc thuyền chở người qua sông
 * - 'crow': Gà trống gáy sáng
 * - 'croak': Con ếch kêu ộp ộp
 * - 'shell': Con rùa / ốc đeo mai cứng
 * - 'water': Động vật thủy sinh (cá / tôm)
 * - 'coconut': Cây dừa cho trái mát
 */
export async function solveMilitiaQuizImage(
  imgSource: HTMLImageElement | string,
  askKeyOrText: string
): Promise<MilitiaTapAnswerResolution> {
  const extracted = await extractMilitiaImageData(imgSource);
  if (!extracted) {
    return { x: 130, y: 64, normalizedX: 0.5, normalizedY: 0.75, row: 1, col: 1, reason: 'fallback', confidence: 0 };
  }

  const { imgData, width, height } = extracted;
  const pixels = imgData.data;
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);

  const cellW = w / 3;
  const cellH = h / 2;

  const cells: Array<{
    row: number;
    col: number;
    x: number;
    y: number;
    normalizedX: number;
    normalizedY: number;
    darkPx: number;
    greenPx: number;
    whitePx: number;
    bluePx: number;
    redOrangePx: number;
    greyBuffaloPx: number;
    brownHullPx: number;
  }> = [];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const cx0 = Math.floor(x0 + c * cellW);
      const cy0 = Math.floor(y0 + r * cellH);
      const cx1 = Math.floor(cx0 + cellW);
      const cy1 = Math.floor(cy0 + cellH);

      const marginX = Math.floor(cellW * 0.12);
      const marginY = Math.floor(cellH * 0.12);

      let darkPx = 0;
      let greenPx = 0;
      let whitePx = 0;
      let bluePx = 0;
      let redOrangePx = 0;
      let greyBuffaloPx = 0;
      let brownHullPx = 0;

      for (let y = cy0 + marginY; y < cy1 - marginY; y++) {
        for (let x = cx0 + marginX; x < cx1 - marginX; x++) {
          const idx = (y * width + x) * 4;
          const pr = pixels[idx];
          const pg = pixels[idx + 1];
          const pb = pixels[idx + 2];

          if (pr < 60 && pg < 60 && pb < 70) darkPx++;
          if (pg > 110 && pg > pr + 25 && pg > pb + 15) greenPx++;
          if (pr > 215 && pg > 215 && pb > 195) whitePx++;
          if (pb > 140 && pb > pr + 40 && pb > pg + 15) bluePx++;
          if (pr > 180 && pr > pb + 50 && pg < 130) redOrangePx++;

          // Slate grey buffalo (#4d5364 ~ 77, 83, 100)
          if (pr >= 65 && pr <= 110 && pg >= 70 && pg <= 115 && pb >= 80 && pb <= 130 && Math.abs(pr - pg) < 20) {
            greyBuffaloPx++;
          }
          // Boat hull brown
          if (pr >= 110 && pr <= 165 && pg >= 70 && pg <= 115 && pb <= 80 && pr > pb + 40) {
            brownHullPx++;
          }
        }
      }

      const centerX = Math.round(cx0 + cellW / 2);
      const centerY = Math.round(cy0 + cellH / 2);

      cells.push({
        row: r,
        col: c,
        x: centerX,
        y: centerY,
        normalizedX: Number(((c + 0.5) / 3).toFixed(3)),
        normalizedY: Number(((r + 0.5) / 2).toFixed(3)),
        darkPx,
        greenPx,
        whitePx,
        bluePx,
        redOrangePx,
        greyBuffaloPx,
        brownHullPx,
      });
    }
  }

  const normalizedAsk = (askKeyOrText || '').toLowerCase();
  let bestIdx = 0;
  let maxScore = -1;
  let matchedReason: string;

  if (normalizedAsk.includes('plough') || normalizedAsk.includes('kéo cày') || normalizedAsk.includes('ruộng')) {
    matchedReason = 'Con trâu kéo cày ngoài ruộng';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].greyBuffaloPx * 2 + cells[i].darkPx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('boat') || normalizedAsk.includes('chở người') || normalizedAsk.includes('thuyền') || normalizedAsk.includes('sông')) {
    matchedReason = 'Chiếc thuyền chở người qua sông';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].whitePx + cells[i].brownHullPx * 2 - cells[i].redOrangePx * 5;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('crow') || normalizedAsk.includes('gáy') || normalizedAsk.includes('ò ó o') || normalizedAsk.includes('gà')) {
    matchedReason = 'Gà trống gáy sáng';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].redOrangePx * 5 + cells[i].whitePx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('croak') || normalizedAsk.includes('ộp') || normalizedAsk.includes('ếch')) {
    matchedReason = 'Con ếch kêu ộp ộp';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].greenPx * 2 + cells[i].darkPx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('water') || normalizedAsk.includes('dưới nước')) {
    matchedReason = 'Con cá/thủy sinh dưới nước';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].bluePx * 2 + cells[i].redOrangePx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('shell') || normalizedAsk.includes('mai cứng') || normalizedAsk.includes('chậm rì')) {
    matchedReason = 'Con ốc / rùa đeo mai cứng';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].brownHullPx * 2 + cells[i].darkPx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else if (normalizedAsk.includes('coconut') || normalizedAsk.includes('uống nước mát') || normalizedAsk.includes('dừa')) {
    matchedReason = 'Cây dừa cho trái mát';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].greenPx + cells[i].brownHullPx;
      if (score > maxScore) {
        maxScore = score;
        bestIdx = i;
      }
    }
  } else {
    matchedReason = 'Đố vui tự động';
    bestIdx = 0;
  }

  const chosen = cells[bestIdx];
  return {
    x: chosen.x,
    y: chosen.y,
    normalizedX: chosen.normalizedX,
    normalizedY: chosen.normalizedY,
    row: chosen.row,
    col: chosen.col,
    reason: matchedReason,
    confidence: maxScore,
  };
}

/**
 * Solves "tap" captcha: Chạm vào con [loài] trong hình nha (chỉ có 1 con).
 */
export async function solveMilitiaTapImage(
  imgSource: HTMLImageElement | string,
  targetKind: MilitiaAskKind | string
): Promise<MilitiaTapAnswerResolution> {
  const extracted = await extractMilitiaImageData(imgSource);
  if (!extracted) {
    return { x: 130, y: 64, normalizedX: 0.5, normalizedY: 0.5, reason: 'fallback', confidence: 0 };
  }

  const { imgData, width, height } = extracted;
  const pixels = imgData.data;
  const bounds = detectContentBounds(pixels, width, height);
  const { x0, y0, w, h } = bounds;

  const isRiverWater = (r: number, g: number, b: number): boolean => {
    if (b >= 120 && g >= 100 && b > r + 20 && g > r + 10) return true;
    if (b >= 140 && g >= 130 && (b - r >= 20 || g - r >= 15)) return true;
    return false;
  };

  const isForeground = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 128) return false;
    if (r < 60 && g < 60 && b < 70) return true;
    if (g > 85 && g > r + 25 && g > b + 20 && r < 80 && b < 100) return false;
    if (r > 220 && g > 205 && b > 170 && Math.abs(r - g) < 25) return false;
    if (isRiverWater(r, g, b)) return false;
    return true;
  };

  const visited = getVisitedBuffer(width * height);
  const q = getQueueBuffer(width * height);

  interface TapBlob {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    bw: number;
    bh: number;
    pixelCount: number;
    centerX: number;
    centerY: number;
    kind: string;
    scores: Record<string, number>;
  }

  const blobs: TapBlob[] = [];

  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      const r = pixels[pIdx];
      const g = pixels[pIdx + 1];
      const b = pixels[pIdx + 2];
      const a = pixels[pIdx + 3];
      if (!isForeground(r, g, b, a)) continue;

      visited[idx] = 1;
      let head = 0;
      let tail = 0;
      q[tail++] = x;
      q[tail++] = y;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;
      const blobPixels: number[] = [];

      while (head < tail) {
        const cx = q[head++];
        const cy = q[head++];
        pixelCount++;
        blobPixels.push(cy * width + cx);

        if (cx < minX) minX = cx;
        if (cx > maxX) maxX = cx;
        if (cy < minY) minY = cy;
        if (cy > maxY) maxY = cy;

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [1, 1],
          [-1, -1],
          [1, -1],
          [-1, 1],
        ]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx >= x0 && nx < x0 + w && ny >= y0 && ny < y0 + h) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              const npIdx = nIdx * 4;
              const nr = pixels[npIdx];
              const ng = pixels[npIdx + 1];
              const nb = pixels[npIdx + 2];
              const na = pixels[npIdx + 3];
              if (isForeground(nr, ng, nb, na)) {
                visited[nIdx] = 1;
                q[tail++] = nx;
                q[tail++] = ny;
              }
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      if (bw >= 10 && bw <= 65 && bh >= 10 && bh <= 55 && pixelCount >= 25) {
        let redCrabPx = 0;
        let brownSnailPx = 0;
        let greenFrogPx = 0;
        let silverShrimpPx = 0;
        let orangeShrimpPx = 0;
        let blueFishPx = 0;

        for (let i = 0; i < blobPixels.length; i++) {
          const bpIdx = blobPixels[i] * 4;
          const pr = pixels[bpIdx];
          const pg = pixels[bpIdx + 1];
          const pb = pixels[bpIdx + 2];

          if (pr > 160 && pr - pg >= 65 && pr - pb >= 70) redCrabPx++;
          if (pr >= 130 && pr <= 185 && pg >= 75 && pg <= 130 && pb <= 85 && pr - pg >= 25 && pr - pg <= 65) brownSnailPx++;
          if (pg > 105 && pg > pr + 20 && pg > pb + 20) greenFrogPx++;
          if (Math.abs(pr - pg) <= 15 && Math.abs(pg - pb) <= 15 && pr >= 100 && pr <= 215) silverShrimpPx++;
          if (pr > 200 && pg > 110 && pg < 190 && pb < 90) orangeShrimpPx++;
          if (pb > 140 && pb > pr + 35 && pb > pg + 15) blueFishPx++;
        }

        const scores: Record<string, number> = {
          shrimp: silverShrimpPx + orangeShrimpPx,
          crab: redCrabPx,
          snail: brownSnailPx,
          frog: greenFrogPx,
          fish: blueFishPx,
        };

        let kind = 'other';
        const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (ranked[0][1] > 20) {
          kind = ranked[0][0];
        }

        blobs.push({
          minX,
          maxX,
          minY,
          maxY,
          bw,
          bh,
          pixelCount,
          centerX: Math.round((minX + maxX) / 2),
          centerY: Math.round((minY + maxY) / 2),
          kind,
          scores,
        });
      }
    }
  }

  // Count kind frequencies
  const freq: Record<string, number> = {};
  for (const b of blobs) {
    freq[b.kind] = (freq[b.kind] || 0) + 1;
  }

  const normalizedAsk = String(targetKind || '').toLowerCase();
  let normalizedKind = 'shrimp';
  if (normalizedAsk.includes('tom') || normalizedAsk.includes('shrimp') || normalizedAsk.includes('tôm') || normalizedAsk.includes('🦐')) {
    normalizedKind = 'shrimp';
  } else if (normalizedAsk.includes('cua') || normalizedAsk.includes('crab') || normalizedAsk.includes('🦀')) {
    normalizedKind = 'crab';
  } else if (normalizedAsk.includes('oc') || normalizedAsk.includes('snail') || normalizedAsk.includes('ốc') || normalizedAsk.includes('🐌')) {
    normalizedKind = 'snail';
  } else if (normalizedAsk.includes('ech') || normalizedAsk.includes('frog') || normalizedAsk.includes('ếch') || normalizedAsk.includes('🐸')) {
    normalizedKind = 'frog';
  } else if (normalizedAsk.includes('ca') || normalizedAsk.includes('fish') || normalizedAsk.includes('cá') || normalizedAsk.includes('🐟')) {
    normalizedKind = 'fish';
  }

  let chosen: TapBlob | null;
  const matches = blobs.filter((b) => b.kind === normalizedKind);
  if (matches.length === 1) {
    chosen = matches[0];
  } else if (matches.length > 1) {
    matches.sort((a, b) => (b.scores[normalizedKind] || 0) - (a.scores[normalizedKind] || 0));
    chosen = matches[0];
  } else {
    // Check if there is an exact singleton creature
    const singletons = blobs.filter((b) => freq[b.kind] === 1);
    if (singletons.length === 1) {
      chosen = singletons[0];
    } else {
      // Pick highest score for targetKind among all blobs
      const sortedByScore = [...blobs].sort(
        (a, b) => (b.scores[normalizedKind] || 0) - (a.scores[normalizedKind] || 0)
      );
      chosen = sortedByScore[0] || null;
    }
  }

  if (!chosen) {
    return {
      x: Math.round(width / 2),
      y: Math.round(height / 2),
      normalizedX: 0.5,
      normalizedY: 0.5,
      reason: `Fallback trung tâm hình`,
      confidence: 0,
    };
  }

  const normX = Number(((chosen.centerX - x0) / w).toFixed(3));
  const normY = Number(((chosen.centerY - y0) / h).toFixed(3));

  return {
    x: chosen.centerX,
    y: chosen.centerY,
    normalizedX: normX,
    normalizedY: normY,
    reason: `Chạm vào ${normalizedKind} duy nhất tại (${chosen.centerX}, ${chosen.centerY})`,
    confidence: 1,
  };
}
