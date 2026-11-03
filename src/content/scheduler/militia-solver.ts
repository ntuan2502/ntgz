/**
 * Militia Verification (Captcha) Solver for Bến Đò
 * 
 * Automatically detects the "🪖 Dân quân kiểm tra!" puzzle modal,
 * triggers an audio chime to notify the player, analyzes the 260x128 pixel art
 * river image using offscreen Canvas BFS Connected Component Analysis & Color/Shape classification,
 * and clicks the correct option button.
 */

export type MilitiaAskKind = 'fish' | 'crab' | 'shrimp' | 'snail';

export interface MilitiaClassificationResult {
  fish: number;
  crab: number;
  shrimp: number;
  snail: number;
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

/**
 * Performs Connected Component Analysis & Feature Classification on pixel data of the river captcha.
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

  // 1. Detect river background color from image border samples
  const cornerCoords = [
    [2, 2],
    [width - 3, 2],
    [2, height - 3],
    [width - 3, height - 3],
    [Math.floor(width / 2), 2],
    [Math.floor(width / 2), height - 3],
    [2, Math.floor(height / 2)],
    [width - 3, Math.floor(height / 2)],
  ];

  let bgR = 0;
  let bgG = 0;
  let bgB = 0;
  for (const [cx, cy] of cornerCoords) {
    const p = getPixel(cx, cy);
    bgR += p[0];
    bgG += p[1];
    bgB += p[2];
  }
  bgR /= cornerCoords.length;
  bgG /= cornerCoords.length;
  bgB /= cornerCoords.length;

  // Outline color #2b2230: R:43, G:34, B:48
  const isForeground = (r: number, g: number, b: number, a: number): boolean => {
    if (a < 128) return false;
    const isDarkOutline = colorDistance(r, g, b, 43, 34, 48) < 25;
    const distToBg = colorDistance(r, g, b, bgR, bgG, bgB);
    return distToBg > 22 || isDarkOutline;
  };

  const visited = new Uint8Array(width * height);
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
    redCount: number;
    orangeCount: number;
  }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const [r, g, b, a] = getPixel(x, y);
      if (!isForeground(r, g, b, a)) continue;

      // 8-Connected BFS
      visited[idx] = 1;
      const q: number[] = [x, y];
      let head = 0;

      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let pixelCount = 0;
      let tanFootCount = 0;
      let whiteEyeCount = 0;
      let redCount = 0;
      let orangeCount = 0;

      while (head < q.length) {
        const cx = q[head++];
        const cy = q[head++];
        pixelCount++;

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        const [pr, pg, pb] = getPixel(cx, cy);

        // Feature tests:
        // 1. Snail Tan Foot: #b8a888 -> R:184, G:168, B:136
        if (colorDistance(pr, pg, pb, 184, 168, 136) < 30) tanFootCount++;

        // 2. Fish White Eye: bright white #ffffff
        if (pr > 235 && pg > 235 && pb > 235) whiteEyeCount++;

        // 3. Crab Red & Wine: #e0393e (224, 57, 62) or #96202a (150, 32, 42)
        if (
          (pr > 135 && pr > pg + 30 && pr > pb + 30) ||
          colorDistance(pr, pg, pb, 224, 57, 62) < 35 ||
          colorDistance(pr, pg, pb, 150, 32, 42) < 35
        ) {
          redCount++;
        }

        // 4. Shrimp Orange Segment: #ff9a2a (255, 154, 42)
        if (pr > 200 && pg > 110 && pg < 190 && pb < 90) orangeCount++;

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
                q.push(nx, ny);
              }
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      // Filter creature sprites (typically 12-32px wide, 8-24px high, >= 20 pixels)
      if (bw >= 8 && bw <= 55 && bh >= 6 && bh <= 45 && pixelCount >= 20) {
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
          redCount,
          orangeCount,
        });
      }
    }
  }

  const counts: MilitiaClassificationResult = {
    fish: 0,
    crab: 0,
    shrimp: 0,
    snail: 0,
    blobsCount: blobs.length,
  };

  for (const b of blobs) {
    const aspect = b.bw / b.bh;
    let kind: MilitiaAskKind;

    if (b.tanFootCount >= 2) {
      kind = 'snail';
    } else if (b.whiteEyeCount >= 1) {
      kind = 'fish';
    } else if (b.orangeCount >= 4 && aspect >= 1.6) {
      kind = 'shrimp';
    } else if (b.redCount >= 12) {
      kind = 'crab';
    } else if (aspect >= 1.7) {
      kind = 'fish';
    } else if (aspect >= 1.3) {
      kind = 'crab';
    } else {
      kind = 'snail';
    }

    counts[kind]++;
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

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return { fish: 0, crab: 0, shrimp: 0, snail: 0, blobsCount: 0 };
  }

  ctx.drawImage(imgEl, 0, 0);
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

  // 2. Nearest numeric option
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
