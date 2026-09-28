import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Ensure public directory exists
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(4 + 4 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);
  const typeAndData = chunk.subarray(4, 8 + len);
  const crc = crc32(typeAndData);
  chunk.writeUInt32BE(crc, 8 + len);
  return chunk;
}

function generatePng(width, height, isMaskable = false) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // 8 bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanline filter bytes
  const bytesPerPixel = 4;
  const rawData = Buffer.alloc(height * (1 + width * bytesPerPixel));

  // Indigo gradient and brand icon rendering
  const cx = width / 2;
  const cy = height / 2;
  const radius = width * 0.42;

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter: 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Rounded rectangle or full bleed
      let inCard = false;
      if (isMaskable) {
        // Full bleed background for maskable
        inCard = true;
      } else {
        // Squircle / rounded container with smooth antialiasing
        const cornerR = width * 0.22;
        const cornerDistX = Math.max(0, Math.abs(dx) - (cx - cornerR));
        const cornerDistY = Math.max(0, Math.abs(dy) - (cy - cornerR));
        const cornerDist = Math.sqrt(cornerDistX * cornerDistX + cornerDistY * cornerDistY);
        inCard = cornerDist <= cornerR;
      }

      if (!inCard) {
        // Transparent
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        rawData[offset++] = 0;
        continue;
      }

      // Background gradient (Deep Indigo to Rich Violet/Blue)
      // #4338ca (67, 56, 202) -> #6366f1 (99, 102, 241)
      const gradT = (x + y) / (width + height);
      let r = Math.round(67 + gradT * 32);
      let g = Math.round(56 + gradT * 46);
      let b = Math.round(202 + gradT * 39);
      let a = 255;

      // Inner safe-zone icon rendering:
      // School Building / Graduation Cap / Checkmark symbol
      // Safe scale:
      const scale = (isMaskable ? 0.6 : 0.72) * (width / 512);

      // Check if pixel is inside the central school badge / graduation cap / shield
      const nx = (x - cx) / scale;
      const ny = (y - cy) / scale;

      let isWhite = false;
      let isAccent = false;

      // Graduation Cap top diamond:
      // Diamond: |nx| / 140 + |ny + 40| / 70 <= 1
      const capDiamond = (Math.abs(nx) / 140) + (Math.abs(ny + 50) / 60);
      if (capDiamond <= 1 && ny <= -20) {
        isWhite = true;
      }

      // Cap headband / skullcap:
      if (ny >= -25 && ny <= 10 && Math.abs(nx) <= 75 - (ny + 25) * 0.5) {
        isWhite = true;
      }

      // Tassel on side
      if (nx >= 80 && nx <= 95 && ny >= -45 && ny <= 25) {
        isAccent = true; // gold / amber tassel
      }

      // Lower badge: Verified checkmark shield or columns
      // Checkmark:
      // Left stroke: from (-45, 60) to (-15, 90)
      // Right stroke: from (-15, 90) to (55, 30)
      const dCheck1 = Math.abs((nx - -45) * 30 - (ny - 60) * 30) / Math.sqrt(900 + 900);
      const inSeg1 = nx >= -55 && nx <= -10 && ny >= 50 && ny <= 100 && dCheck1 <= 14;

      const dCheck2 = Math.abs((nx - -15) * -60 - (ny - 90) * 70) / Math.sqrt(3600 + 4900);
      const inSeg2 = nx >= -20 && nx <= 65 && ny >= 20 && ny <= 100 && dCheck2 <= 14;

      if (inSeg1 || inSeg2) {
        isWhite = true;
      }

      // Small accent circle / star
      const starDist = Math.sqrt((nx - 0) * (nx - 0) + (ny - 130) * (ny - 130));
      if (starDist <= 8) {
        isAccent = true;
      }

      if (isWhite) {
        r = 255;
        g = 255;
        b = 255;
      } else if (isAccent) {
        r = 251; // Amber #f59e0b
        g = 191;
        b = 36;
      }

      rawData[offset++] = r;
      rawData[offset++] = g;
      rawData[offset++] = b;
      rawData[offset++] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

// Generate SVG Icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
  <defs>
    <linearGradient id="edutrack-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#4f46e5"/>
      <stop offset="50%" stop-color="#4338ca"/>
      <stop offset="100%" stop-color="#3730a3"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="8" stdDeviation="12" flood-color="#1e1b4b" flood-opacity="0.25"/>
    </filter>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#edutrack-grad)"/>
  <g filter="url(#shadow)">
    <!-- Graduation Cap Top -->
    <path d="M 256 120 L 416 195 L 256 270 L 96 195 Z" fill="#ffffff"/>
    <!-- Headband / Cap Under -->
    <path d="M 166 230 L 166 280 C 166 315 346 315 346 280 L 346 230 L 256 272 Z" fill="#e0e7ff"/>
    <!-- Tassel -->
    <path d="M 376 200 L 400 280 L 412 280 L 388 200 Z" fill="#fbbf24"/>
    <circle cx="406" cy="285" r="7" fill="#f59e0b"/>
    <!-- Verification Checkmark / Shield -->
    <circle cx="256" cy="370" r="54" fill="#ffffff" opacity="0.18"/>
    <path d="M 220 370 L 244 394 L 296 342" fill="none" stroke="#ffffff" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgContent);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);

// Generate PNG sizes
console.log('Generating PWA PNG icons...');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), generatePng(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), generatePng(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), generatePng(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), generatePng(180, 180, false));

// Also generate a basic favicon.ico (can be copy of 192x192 PNG or similar)
fs.writeFileSync(path.join(publicDir, 'favicon.ico'), generatePng(64, 64, false));

console.log('All icons generated successfully!');
