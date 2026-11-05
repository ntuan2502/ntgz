import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

function decodePng(buf) {
  let pos = 8;
  let width = 0, height = 0, bitDepth = 0, colorType = 0;
  const idatChunks = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.slice(pos + 4, pos + 8).toString('ascii');
    const data = buf.slice(pos + 8, pos + 8 + len);
    pos += 12 + len;
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
    } else if (type === 'IDAT') idatChunks.push(data);
    else if (type === 'IEND') break;
  }
  const decompressed = zlib.inflateSync(Buffer.concat(idatChunks));
  let bpp = colorType === 6 ? 4 : 3;
  const rowSize = width * bpp;
  const pixels = Buffer.alloc(width * height * 4);
  let srcPos = 0;
  const prevRow = Buffer.alloc(rowSize);
  const curRow = Buffer.alloc(rowSize);
  for (let y = 0; y < height; y++) {
    const filter = decompressed.readUInt8(srcPos++);
    for (let i = 0; i < rowSize; i++) curRow[i] = decompressed.readUInt8(srcPos++);
    if (filter === 1) {
      for (let i = bpp; i < rowSize; i++) curRow[i] = (curRow[i] + curRow[i - bpp]) & 0xff;
    } else if (filter === 2) {
      for (let i = 0; i < rowSize; i++) curRow[i] = (curRow[i] + prevRow[i]) & 0xff;
    } else if (filter === 3) {
      for (let i = 0; i < rowSize; i++) {
        const left = i >= bpp ? curRow[i - bpp] : 0;
        curRow[i] = (curRow[i] + Math.floor((left + prevRow[i]) / 2)) & 0xff;
      }
    } else if (filter === 4) {
      for (let i = 0; i < rowSize; i++) {
        const a = i >= bpp ? curRow[i - bpp] : 0, b = prevRow[i], c = i >= bpp ? prevRow[i - bpp] : 0;
        const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
        curRow[i] = (curRow[i] + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 0xff;
      }
    }
    curRow.copy(prevRow);
    for (let x = 0; x < width; x++) {
      const dstIdx = (y * width + x) * 4;
      pixels[dstIdx] = curRow[x * bpp];
      pixels[dstIdx + 1] = curRow[x * bpp + 1];
      pixels[dstIdx + 2] = curRow[x * bpp + 2];
      pixels[dstIdx + 3] = bpp === 4 ? curRow[x * 4 + 3] : 255;
    }
  }
  return { width, height, pixels };
}

function colorDistance(r1, g1, b1, r2, g2, b2) {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function analyzeImage(filePath) {
  const { width, height, pixels } = decodePng(fs.readFileSync(filePath));

  const getPixel = (x, y) => {
    const idx = (y * width + x) * 4;
    return [pixels[idx], pixels[idx + 1], pixels[idx + 2], pixels[idx + 3]];
  };

  const isForeground = (r, g, b, a) => {
    if (a < 128) return false;
    // Dark outline (#1e1e28 or #2b2230) is always creature/object outline
    if (r < 50 && g < 50 && b < 60) return true;
    // Blue/purple creatures (e.g. Blue Fish #5ba2da rgb(91,162,218), Purple Crab #9664b4)
    // Blue distinctly dominates green (b - g >= 35) and red (b - r >= 35)
    if (b >= 135 && b - g >= 35 && b - r >= 35) return true;
    // River water: typical teal/cyan river water (blue >= 105, green >= 80, red <= 90)
    if (b >= 105 && g >= 80 && r <= 90) return false;
    // River water ripples (cyan/light blue highlights): blue and green strongly dominate red
    if (b >= 155 && g >= 140 && (b - r >= 35 || g - r >= 25)) return false;
    // Weed green foliage (g > 95 and distinct green dominance)
    if (g > 95 && g > r + 25 && g > b + 20) return false;
    // Dialog beige card border
    if (r > 225 && g > 210 && b > 175 && Math.abs(r - g) < 25) return false;
    return true;
  };

  let minRiverY = height, maxRiverY = 0;
  for (let y = 0; y < height; y++) {
    let waterCount = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = getPixel(x, y);
      if (b >= 105 && g >= 80 && r <= 90) waterCount++;
    }
    if (waterCount > 50) {
      minRiverY = Math.min(minRiverY, y);
      maxRiverY = Math.max(maxRiverY, y);
    }
  }

  const riverX = 17;
  const riverY = minRiverY < height ? minRiverY : 115;
  const riverW = width - 34;
  const riverH = maxRiverY > minRiverY ? maxRiverY - riverY + 1 : 170;

  const visited = new Uint8Array(width * height);
  const q = new Int32Array(width * height * 2);
  const blobs = [];

  for (let y = riverY; y < riverY + riverH; y++) {
    for (let x = riverX; x < riverX + riverW; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const [r, g, b, a] = getPixel(x, y);
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
      let tanFootCount = 0;
      let whiteEyeCount = 0;
      let darkEyeCount = 0;
      let redCount = 0;
      let orangeCount = 0;
      const pixelCoords = new Set();
      const eyePixels = [];

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

        if (colorDistance(pr, pg, pb, 184, 168, 136) < 30) tanFootCount++;
        if (pr >= 235 && pg >= 235 && pb >= 235) {
          whiteEyeCount++;
          eyePixels.push({ x: cx, y: cy });
        }
        if (pr < 50 && pg < 50 && pb < 60) darkEyeCount++;

        if (
          (pr > 135 && pr > pg + 30 && pr > pb + 30) ||
          colorDistance(pr, pg, pb, 224, 57, 62) < 35 ||
          colorDistance(pr, pg, pb, 150, 32, 42) < 35
        ) {
          redCount++;
        }

        if (pr > 200 && pg > 110 && pg < 190 && pb < 90) orangeCount++;

        for (const [dx, dy] of [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [-1, -1], [1, -1], [-1, 1],
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

      if (bw >= 8 && bw <= 55 && bh >= 6 && bh <= 45 && pixelCount >= 15) {
        blobs.push({
          minX, maxX, minY, maxY, bw, bh,
          pixelCount, tanFootCount, whiteEyeCount, darkEyeCount,
          redCount, orangeCount, pixelCoords, eyePixels,
        });
      }
    }
  }

  const counts = { fish: 0, crab: 0, shrimp: 0, snail: 0, other: 0, blobsCount: blobs.length };
  const classified = [];

  for (const b of blobs) {
    const aspect = b.bw / b.bh;

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

    const checkRowClaws = (y) => {
      if (y === -1) return false;
      let left = 0, right = 0, mid = 0;
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

    let minX_at_maxY = b.maxX;
    let maxX_at_maxY = b.minX;
    for (let x = b.minX; x <= b.maxX; x++) {
      if (b.pixelCoords.has(`${x},${b.maxY}`)) {
        minX_at_maxY = Math.min(minX_at_maxY, x);
        maxX_at_maxY = Math.max(maxX_at_maxY, x);
      }
    }
    const bottomRowSpan = (maxX_at_maxY - minX_at_maxY + 1) / b.bw;

    let hasStalkRight = false;
    let hasStalkLeft = false;
    const midY1 = b.minY + Math.floor(b.bh * 0.45);
    const midY2 = b.minY + Math.floor(b.bh * 0.85);
    for (let y = midY1; y <= midY2; y++) {
      let hasRightEdge = false, hasRightGap = false;
      const rightStalkX = b.maxX - Math.max(1, Math.floor(b.bw * 0.15));
      for (let x = rightStalkX; x <= b.maxX; x++) {
        if (b.pixelCoords.has(`${x},${y}`)) hasRightEdge = true;
      }
      for (let x = Math.floor(b.minX + b.bw * 0.65); x < rightStalkX; x++) {
        if (!b.pixelCoords.has(`${x},${y}`)) hasRightGap = true;
      }
      if (hasRightEdge && hasRightGap) hasStalkRight = true;

      let hasLeftEdge = false, hasLeftGap = false;
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

    let hasShrimpWhisker = false;
    if (topRow1 !== -1) {
      let left = 0, right = 0, mid = 0;
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

    let kind = 'other';
    if (isCrab) {
      counts.crab++;
      kind = 'crab';
    } else if (isSnail) {
      counts.snail++;
      kind = 'snail';
    } else if (isFish) {
      let fishInBlob = 1;
      if (b.eyePixels.length >= 2 && b.bw >= 28) {
        const minEyeX = Math.min(...b.eyePixels.map((p) => p.x));
        const maxEyeX = Math.max(...b.eyePixels.map((p) => p.x));
        if (maxEyeX - minEyeX >= 11) {
          fishInBlob = 2;
        }
      }
      counts.fish += fishInBlob;
      kind = 'fish';
    } else if (isShrimp) {
      counts.shrimp++;
      kind = 'shrimp';
    } else {
      counts.other++;
    }
    classified.push({ kind, x: b.minX, y: b.minY, bw: b.bw, bh: b.bh, aspect: aspect.toFixed(2), bottomRowSpan: bottomRowSpan.toFixed(2) });
  }

  return { counts, classified };
}

function resolveAnswer(targetKind, counts, options) {
  const count = counts[targetKind] ?? 0;
  if (options.length === 0) {
    return { count, optionIndex: null, optionValue: count, confidence: 'exact' };
  }
  const exactIndex = options.indexOf(count);
  if (exactIndex !== -1) {
    return { count, optionIndex: exactIndex, optionValue: options[exactIndex], confidence: 'exact' };
  }
  let bestIndex = 0;
  let minDiff = Math.abs(options[0] - count);
  for (let i = 1; i < options.length; i++) {
    const diff = Math.abs(options[i] - count);
    if (diff < minDiff) {
      minDiff = diff;
      bestIndex = i;
    }
  }
  return { count, optionIndex: bestIndex, optionValue: options[bestIndex], confidence: 'closest' };
}

const fixtures = [
  { file: 'tests/fixtures/militia-captcha/captcha_01_snail_4.png', ask: 'snail', options: [3, 6, 5, 4], expected: 4 },
  { file: 'tests/fixtures/militia-captcha/captcha_02_crab_4.png', ask: 'crab', options: [5, 3, 6, 4], expected: 4 },
  { file: 'tests/fixtures/militia-captcha/captcha_03_snail_5.png', ask: 'snail', options: [7, 5, 6, 4], expected: 5 },
  { file: 'tests/fixtures/militia-captcha/captcha_04_snail_3.png', ask: 'snail', options: [2, 3, 5, 4], expected: 3 },
  { file: 'tests/fixtures/militia-captcha/captcha_05_crab_2.png', ask: 'crab', options: [2, 1, 4, 3], expected: 2 },
  { file: 'tests/fixtures/militia-captcha/captcha_06_shrimp_2.png', ask: 'shrimp', options: [2, 4, 1, 3], expected: 2 },
  { file: 'tests/fixtures/militia-captcha/captcha_07_crab_3.png', ask: 'crab', options: [4, 2, 3, 5], expected: 3 },
  { file: 'tests/fixtures/militia-captcha/captcha_08_fish_6.png', ask: 'fish', options: [7, 8, 6, 5], expected: 6 },
  { file: 'tests/fixtures/militia-captcha/captcha_09_shrimp_5.png', ask: 'shrimp', options: [6, 5, 7, 4], expected: 5 },
  { file: 'tests/fixtures/militia-captcha/captcha_10_shrimp_5.png', ask: 'shrimp', options: [7, 6, 4, 5], expected: 5 },
  { file: 'tests/fixtures/militia-captcha/captcha_11_fish_4.png', ask: 'fish', options: [3, 6, 5, 4], expected: 4 },
  { file: 'tests/fixtures/militia-captcha/captcha_12_crab_6.png', ask: 'crab', options: [8, 5, 6, 7], expected: 6 },
  { file: 'tests/fixtures/militia-captcha/captcha_13_crab_6.png', ask: 'crab', options: [6, 8, 7, 5], expected: 6 },
  { file: 'tests/fixtures/militia-captcha/captcha_14_shrimp_5.png', ask: 'shrimp', options: [6, 4, 5, 7], expected: 5 },
  { file: 'tests/fixtures/militia-captcha/captcha_15_crab_2.png', ask: 'crab', options: [4, 1, 3, 2], expected: 2 },
];

console.log('=== RUNNING MILITIA CAPTCHA TEST SUITE ===');
for (const fx of fixtures) {
  const res = analyzeImage(fx.file);
  const ans = resolveAnswer(fx.ask, res.counts, fx.options);
  const pass = ans.optionValue === fx.expected && ans.confidence === 'exact';
  console.log(`\nTest [${path.basename(fx.file)}]: Ask: "${fx.ask}"`);
  console.log('Detected Counts:', JSON.stringify(res.counts));
  console.log('Classified Sprites:');
  res.classified.forEach((c, idx) => console.log(`  #${idx + 1}: ${c.kind.padEnd(6)} at (${c.x}, ${c.y}) size: ${c.bw}x${c.bh} aspect: ${c.aspect} bottomSpan: ${c.bottomRowSpan}`));
  console.log(`Resolution: Count=${ans.count}, Picked="${ans.optionValue}" (Confidence: ${ans.confidence}) -> Expected: ${fx.expected} -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
  if (!pass) process.exitCode = 1;
}

// -------------------------------------------------------------
// V2 CAPTCHA TESTS ('odd' and 'quiz')
// -------------------------------------------------------------
function detectContentBounds(pixels, width, height) {
  const isDialogBeige = (r, g, b) =>
    (r > 235 && g > 225 && b > 200) || (r > 200 && g > 200 && b > 180 && Math.abs(r - g) < 15);

  let top = -1, bottom = -1, left = width, right = 0;
  for (let y = 30; y < height - 30; y++) {
    let rowNonBgCount = 0;
    for (let x = 10; x < width - 10; x++) {
      const idx = (y * width + x) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
      if (!isDialogBeige(r, g, b)) rowNonBgCount++;
    }
    if (rowNonBgCount > width * 0.7) {
      if (top === -1) top = y;
      bottom = y;
    }
  }

  if (top !== -1 && bottom - top > 80 && top > 30) {
    const midY = Math.floor((top + bottom) / 2);
    for (let x = 5; x < width - 5; x++) {
      const idx = (midY * width + x) * 4;
      const r = pixels[idx], g = pixels[idx + 1], b = pixels[idx + 2];
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

function solveOdd(filePath) {
  const { width, height, pixels } = decodePng(fs.readFileSync(filePath));
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);
  const cellW = w / 3;
  const cellH = h / 3;
  const pw = 48, ph = 24;
  const halfW = Math.floor(pw / 2), halfH = Math.floor(ph / 2);

  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      const cx = Math.floor(x0 + (c + 0.5) * cellW);
      const cy = Math.floor(y0 + (r + 0.42) * cellH);

      let fgCount = 0;
      let sumEyeX = 0, eyeCount = 0;
      const mask = [];

      for (let dy = -halfH; dy < halfH; dy++) {
        for (let dx = -halfW; dx < halfW; dx++) {
          const px = cx + dx, py = cy + dy;
          const idx = (py * width + px) * 4;
          const pr = pixels[idx], pg = pixels[idx + 1], pb = pixels[idx + 2];

          const isDark = pr < 60 && pg < 60 && pb < 70;
          const isNonWaterColor =
            (pr > 160 && (pr > pb + 30 || pr > pg + 30)) ||
            (pr > 95 && pr > pb + 20) ||
            (pg > 115 && pg > pb + 35);

          const isCreature = isDark || isNonWaterColor;
          mask.push(isCreature ? 1 : 0);
          if (isCreature) fgCount++;

          if (isDark) {
            if (Math.abs(dx) < 22 && Math.abs(dy) < 10) {
              const leftIdx = (py * width + Math.max(0, px - 4)) * 4;
              const rightIdx = (py * width + Math.min(width - 1, px + 4)) * 4;
              const hasBodyNeighbor =
                (pixels[leftIdx] > 160 && pixels[leftIdx + 1] > 140) ||
                (pixels[rightIdx] > 160 && pixels[rightIdx + 1] > 140) ||
                (pb > 150 && pg > 100);
              if (hasBodyNeighbor) {
                sumEyeX += (px - (cx - halfW)) / pw;
                eyeCount++;
              }
            }
          }
        }
      }

      const eyeX = eyeCount ? (sumEyeX / eyeCount) : 0.5;
      cells.push({ row: r, col: c, fgCount, eyeX, eyeCount, mask });
    }
  }

  // 1. Size
  const fgCounts = cells.map((c) => c.fgCount);
  const medFg = [...fgCounts].sort((a, b) => a - b)[4];
  const sizeCandidates = cells
    .map((c, i) => ({
      idx: i,
      ratio: medFg > 0 ? c.fgCount / medFg : 1,
      diff: Math.abs(c.fgCount - medFg),
    }))
    .sort((a, b) => b.diff - a.diff);

  if (sizeCandidates[0].diff > 80 && (sizeCandidates[0].ratio > 1.40 || sizeCandidates[0].ratio < 0.60)) {
    const chosen = cells[sizeCandidates[0].idx];
    return { ...chosen, reason: 'khác cỡ (kích thước bất thường)', confidence: sizeCandidates[0].diff };
  }

  // 2. Direction
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
    return { ...chosen, reason: 'quay đầu (bơi ngược hướng)', confidence: dirCandidates[0].diff };
  }

  // 3. Mask
  const maskScores = [];
  for (let i = 0; i < 9; i++) {
    const m1 = cells[i].mask;
    const diffs = [];
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
  return { ...chosen, reason: 'lật ngược (chổng ngược đầu đuôi)', confidence: maskScores[0].score };
}

function solveDrag(filePath) {
  const { width, height, pixels } = decodePng(fs.readFileSync(filePath));
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);

  const slotSize = 38;
  let minSum = Infinity;
  let bestSlotX = x0 + Math.floor(w * 0.5);
  let bestSlotY = y0 + Math.floor(h * 0.4);

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

  const normX = Number(((bestSlotX - x0) / w).toFixed(3));
  const normY = Number(((bestSlotY - y0) / h).toFixed(3));
  return { slotX: bestSlotX, slotY: bestSlotY, normX, normY, reason: 'Chỗ trống tối (slider slot)' };
}

function solveQuiz(filePath, askKey) {
  const { width, height, pixels } = decodePng(fs.readFileSync(filePath));
  const { x0, y0, w, h } = detectContentBounds(pixels, width, height);
  const cellW = w / 3;
  const cellH = h / 2;
  const cells = [];

  for (let r = 0; r < 2; r++) {
    for (let c = 0; c < 3; c++) {
      const cx0 = Math.floor(x0 + c * cellW);
      const cy0 = Math.floor(y0 + r * cellH);
      const cx1 = Math.floor(cx0 + cellW);
      const cy1 = Math.floor(cy0 + cellH);

      const marginX = Math.floor(cellW * 0.12);
      const marginY = Math.floor(cellH * 0.12);

      let darkPx = 0, greenPx = 0, whitePx = 0, bluePx = 0, redOrangePx = 0, greyBuffaloPx = 0, brownHullPx = 0;

      for (let y = cy0 + marginY; y < cy1 - marginY; y++) {
        for (let x = cx0 + marginX; x < cx1 - marginX; x++) {
          const idx = (y * width + x) * 4;
          const pr = pixels[idx], pg = pixels[idx + 1], pb = pixels[idx + 2];
          if (pr < 60 && pg < 60 && pb < 70) darkPx++;
          if (pg > 110 && pg > pr + 25 && pg > pb + 15) greenPx++;
          if (pr > 215 && pg > 215 && pb > 195) whitePx++;
          if (pb > 140 && pb > pr + 40 && pb > pg + 15) bluePx++;
          if (pr > 180 && pr > pb + 50 && pg < 130) redOrangePx++;
          if (pr >= 65 && pr <= 110 && pg >= 70 && pg <= 115 && pb >= 80 && pb <= 130 && Math.abs(pr - pg) < 20) {
            greyBuffaloPx++;
          }
          if (pr >= 110 && pr <= 165 && pg >= 70 && pg <= 115 && pb <= 80 && pr > pb + 40) {
            brownHullPx++;
          }
        }
      }

      cells.push({ row: r, col: c, darkPx, greenPx, whitePx, bluePx, redOrangePx, greyBuffaloPx, brownHullPx });
    }
  }

  let bestIdx = 0, maxScore = -1, reason = '';
  const normalizedAsk = askKey.toLowerCase();
  if (normalizedAsk.includes('plough') || normalizedAsk.includes('kéo cày')) {
    reason = 'Con trâu kéo cày ngoài ruộng';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].greyBuffaloPx * 2 + cells[i].darkPx;
      if (score > maxScore) { maxScore = score; bestIdx = i; }
    }
  } else if (normalizedAsk.includes('boat') || normalizedAsk.includes('chở người') || normalizedAsk.includes('thuyền')) {
    reason = 'Chiếc thuyền chở người qua sông';
    for (let i = 0; i < cells.length; i++) {
      const score = cells[i].whitePx + cells[i].brownHullPx * 2 - cells[i].redOrangePx * 5;
      if (score > maxScore) { maxScore = score; bestIdx = i; }
    }
  }

  return { ...cells[bestIdx], reason, confidence: maxScore };
}

function solveTap(filePath, askKey) {
  const { width, height, pixels } = decodePng(fs.readFileSync(filePath));
  const bounds = detectContentBounds(pixels, width, height);
  const { x0, y0, w, h } = bounds;

  const isRiverWater = (r, g, b) => {
    if (b >= 120 && g >= 100 && b > r + 20 && g > r + 10) return true;
    if (b >= 140 && g >= 130 && (b - r >= 20 || g - r >= 15)) return true;
    return false;
  };

  const isForeground = (r, g, b, a) => {
    if (a < 128) return false;
    if (r < 60 && g < 60 && b < 70) return true;
    if (g > 85 && g > r + 25 && g > b + 20 && r < 80 && b < 100) return false;
    if (r > 220 && g > 205 && b > 170 && Math.abs(r - g) < 25) return false;
    if (isRiverWater(r, g, b)) return false;
    return true;
  };

  const visited = new Uint8Array(width * height);
  const blobs = [];

  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      const idx = y * width + x;
      if (visited[idx]) continue;

      const pIdx = idx * 4;
      const r = pixels[pIdx], g = pixels[pIdx + 1], b = pixels[pIdx + 2], a = pixels[pIdx + 3];
      if (!isForeground(r, g, b, a)) continue;

      const q = [x, y];
      visited[idx] = 1;
      let head = 0;

      let minX = x, maxX = x, minY = y, maxY = y;
      let pixelCount = 0;
      const blobPixels = [];

      while (head < q.length) {
        const cx = q[head++];
        const cy = q[head++];
        pixelCount++;
        blobPixels.push(cy * width + cx);

        minX = Math.min(minX, cx);
        maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy);
        maxY = Math.max(maxY, cy);

        for (const [dx, dy] of [
          [1, 0], [-1, 0], [0, 1], [0, -1],
          [1, 1], [-1, -1], [1, -1], [-1, 1]
        ]) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= x0 && nx < x0 + w && ny >= y0 && ny < y0 + h) {
            const nIdx = ny * width + nx;
            if (!visited[nIdx]) {
              const npIdx = nIdx * 4;
              const nr = pixels[npIdx], ng = pixels[npIdx + 1], nb = pixels[npIdx + 2], na = pixels[npIdx + 3];
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

      if (bw >= 10 && bw <= 65 && bh >= 10 && bh <= 55 && pixelCount >= 25) {
        let redCrabPx = 0, purpleCrabPx = 0, brownSnailPx = 0, greenFrogPx = 0, silverShrimpPx = 0, orangeShrimpPx = 0, orangeFishPx = 0, blueFishPx = 0, turtleShellPx = 0, turtleLegsPx = 0;
        for (let i = 0; i < blobPixels.length; i++) {
          const bpIdx = blobPixels[i] * 4;
          const pr = pixels[bpIdx], pg = pixels[bpIdx + 1], pb = pixels[bpIdx + 2];
          // Crab red:
          if (pr > 160 && pr - pg >= 65 && pr - pb >= 70) redCrabPx++;
          // Crab purple:
          if (pb >= 100 && pr >= 80 && pb > pg + 25 && pr > pg + 20) purpleCrabPx++;
          // Snail brown:
          if (pr >= 130 && pr <= 185 && pg >= 75 && pg <= 130 && pb <= 85 && pr - pg >= 25 && pr - pg <= 65) brownSnailPx++;
          // Frog green:
          if (pg > 105 && (pg > pr + 20 && pg > pb + 20 || (pg > pr + 40 && pb > pr + 20))) greenFrogPx++;
          // Silver shrimp:
          if (Math.abs(pr - pg) <= 15 && Math.abs(pg - pb) <= 15 && pr >= 100 && pr <= 215) silverShrimpPx++;
          // Orange fish:
          if (pr > 180 && pg > 90 && pg < 150 && pb < 80) orangeFishPx++;
          // Blue fish:
          if (pb > 140 && pb > pr + 35 && pb > pg + 15) blueFishPx++;
          // Turtle shell (olive green/brown):
          if (pg >= 85 && pg <= 150 && pr >= 65 && pr <= 130 && pb <= 80 && (pg >= pr || Math.abs(pg - pr) < 25)) turtleShellPx++;
          // Turtle legs (tan/yellow-brown):
          if (pr >= 125 && pg >= 115 && pb <= 100 && pr > pb + 35 && pg > pb + 25) turtleLegsPx++;
        }

        const scores = {
          turtle: turtleShellPx + turtleLegsPx * 2,
          shrimp: silverShrimpPx + orangeShrimpPx,
          crab: redCrabPx + purpleCrabPx,
          snail: brownSnailPx,
          frog: greenFrogPx,
          fish: blueFishPx + orangeFishPx,
        };

        let kind = 'other';
        const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
        if (ranked[0][1] > 20) {
          kind = ranked[0][0];
        }

        blobs.push({
          minX, maxX, minY, maxY, bw, bh, pixelCount,
          centerX: Math.round((minX + maxX) / 2),
          centerY: Math.round((minY + maxY) / 2),
          kind, scores
        });
      }
    }
  }

  const freq = {};
  for (const b of blobs) {
    freq[b.kind] = (freq[b.kind] || 0) + 1;
  }

  const normalizedAsk = (askKey || '').toLowerCase();
  let targetKind = 'shrimp';
  if (normalizedAsk.includes('tom') || normalizedAsk.includes('shrimp') || normalizedAsk.includes('tôm') || normalizedAsk.includes('🦐')) targetKind = 'shrimp';
  else if (normalizedAsk.includes('cua') || normalizedAsk.includes('crab') || normalizedAsk.includes('🦀')) targetKind = 'crab';
  else if (normalizedAsk.includes('oc') || normalizedAsk.includes('snail') || normalizedAsk.includes('ốc') || normalizedAsk.includes('🐌')) targetKind = 'snail';
  else if (normalizedAsk.includes('ech') || normalizedAsk.includes('frog') || normalizedAsk.includes('ếch') || normalizedAsk.includes('🐸')) targetKind = 'frog';
  else if (normalizedAsk.includes('rua') || normalizedAsk.includes('turtle') || normalizedAsk.includes('rùa') || normalizedAsk.includes('🐢')) targetKind = 'turtle';
  else if (normalizedAsk.includes('ca') || normalizedAsk.includes('fish') || normalizedAsk.includes('cá') || normalizedAsk.includes('🐟')) targetKind = 'fish';

  let chosen = null;
  const matches = blobs.filter(b => b.kind === targetKind);
  if (matches.length === 1) {
    chosen = matches[0];
  } else if (matches.length > 1) {
    matches.sort((a, b) => (b.scores[targetKind] || 0) - (a.scores[targetKind] || 0));
    chosen = matches[0];
  } else {
    const singletons = blobs.filter(b => freq[b.kind] === 1);
    if (singletons.length === 1) {
      chosen = singletons[0];
    } else {
      const sortedByScore = [...blobs].sort((a, b) => (b.scores[targetKind] || 0) - (a.scores[targetKind] || 0));
      chosen = sortedByScore[0] || null;
    }
  }

  if (!chosen) {
    return { x: Math.round(width / 2), y: Math.round(height / 2), normX: 0.5, normY: 0.5, reason: 'fallback' };
  }

  const normX = Number(((chosen.centerX - x0) / w).toFixed(3));
  const normY = Number(((chosen.centerY - y0) / h).toFixed(3));
  return {
    x: chosen.centerX,
    y: chosen.centerY,
    normX,
    normY,
    reason: `Chạm vào ${targetKind} duy nhất tại (${chosen.centerX}, ${chosen.centerY})`,
    confidence: 1
  };
}

console.log('\n=== RUNNING MILITIA V2 (ODD, QUIZ, DRAG, TAP) TEST SUITE ===');
const v2Fixtures = [
  { file: 'tests/fixtures/militia-v2/sample_odd_01_turtle_size.png', type: 'odd', expRow: 1, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_odd_02_fish_direction.png', type: 'odd', expRow: 1, expCol: 0 },
  { file: 'tests/fixtures/militia-v2/sample_odd_03_shrimp_upsidedown.png', type: 'odd', expRow: 0, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_odd_04_fish_direction.png', type: 'odd', expRow: 0, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_odd_05_crab_upsidedown.png', type: 'odd', expRow: 2, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_quiz_01_plough_buffalo.png', type: 'quiz', ask: 'plough', expRow: 1, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_quiz_02_boat.png', type: 'quiz', ask: 'boat', expRow: 1, expCol: 1 },
  { file: 'tests/fixtures/militia-v2/sample_drag_01_slot.png', type: 'drag', expNormX: 0.508, expNormY: 0.369 },
  { file: 'tests/fixtures/militia-v2/sample_drag_02_slot.png', type: 'drag', expNormX: 0.571, expNormY: 0.420 },
  { file: 'tests/fixtures/militia-v2/sample_tap_01_shrimp.png', type: 'tap', ask: 'shrimp', expNormX: 0.940, expNormY: 0.131 },
  { file: 'tests/fixtures/militia-v2/sample_tap_02_turtle.png', type: 'tap', ask: 'turtle', expNormX: 0.460, expNormY: 0.634 },
];

for (const fx of v2Fixtures) {
  if (fx.type === 'odd' || fx.type === 'quiz') {
    const res = fx.type === 'odd' ? solveOdd(fx.file) : solveQuiz(fx.file, fx.ask);
    const pass = res.row === fx.expRow && res.col === fx.expCol;
    console.log(`\nTest V2 [${path.basename(fx.file)}]: Type="${fx.type}" ${fx.ask ? `Ask="${fx.ask}"` : ''}`);
    console.log(`Result: Target=[Row ${res.row + 1}, Col ${res.col + 1}] (${res.reason}) -> Expected: [Row ${fx.expRow + 1}, Col ${fx.expCol + 1}] -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) process.exitCode = 1;
  } else if (fx.type === 'drag') {
    const res = solveDrag(fx.file);
    const passX = Math.abs(res.normX - fx.expNormX) < 0.03;
    const passY = Math.abs(res.normY - fx.expNormY) < 0.03;
    const pass = passX && passY;
    console.log(`\nTest V2 [${path.basename(fx.file)}]: Type="drag"`);
    console.log(`Result: Slot at norm=(${res.normX}, ${res.normY}) -> Expected: norm=(${fx.expNormX}, ${fx.expNormY}) -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) process.exitCode = 1;
  } else if (fx.type === 'tap') {
    const res = solveTap(fx.file, fx.ask);
    const passX = Math.abs(res.normX - fx.expNormX) < 0.03;
    const passY = Math.abs(res.normY - fx.expNormY) < 0.03;
    const pass = passX && passY;
    console.log(`\nTest V2 [${path.basename(fx.file)}]: Type="tap" Ask="${fx.ask}"`);
    console.log(`Result: Target at pos=(${res.x}, ${res.y}), norm=(${res.normX}, ${res.normY}) (${res.reason}) -> Expected: norm=(${fx.expNormX}, ${fx.expNormY}) -> ${pass ? '✅ PASS' : '❌ FAIL'}`);
    if (!pass) process.exitCode = 1;
  }
}
