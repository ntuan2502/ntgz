/**
 * Militia Verification (Captcha) Solver for Bến Đò
 * 
 * Automatically detects the "🪖 Dân quân kiểm tra!" puzzle modal,
 * triggers an audio chime to notify the player, analyzes the 260x128 pixel art
 * river image using offscreen Canvas BFS Connected Component Analysis & Structural/Anatomical classification,
 * and clicks the correct option button.
 */

export type MilitiaAskKind = 'fish' | 'crab' | 'shrimp' | 'snail';

export interface MilitiaClassificationResult {
  fish: number;
  crab: number;
  shrimp: number;
  snail: number;
  other: number;
  blobsCount: number;
}

export interface MilitiaAnswerResolution {
  count: number;
  optionIndex: number;
  optionValue: number;
  confidence: 'exact' | 'closest' | 'fallback';
}

export const MILITIA_KIND_LABELS: Record<MilitiaAskKind, string> = {
  fish: 'cá 🐟',
  crab: 'cua 🦀',
  shrimp: 'tôm 🦐',
  snail: 'ốc 🐌',
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
    if (lower.includes('crab') || lower.includes('cua')) return 'crab';
    if (lower.includes('shrimp') || lower.includes('tom')) return 'shrimp';
    if (lower.includes('snail') || lower.includes('oc')) return 'snail';
    if (lower.includes('fish') || lower.includes('ca')) return 'fish';
  }

  if (modalText) {
    const lower = modalText.toLowerCase();
    if (lower.includes('cua') || lower.includes('🦀')) return 'crab';
    if (lower.includes('tôm') || lower.includes('tom') || lower.includes('🦐')) return 'shrimp';
    if (lower.includes('ốc') || lower.includes('oc') || lower.includes('🐌')) return 'snail';
    if (lower.includes('cá') || lower.includes('ca') || lower.includes('🐟')) return 'fish';
  }

  return 'fish';
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
