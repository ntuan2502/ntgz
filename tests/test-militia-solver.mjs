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
