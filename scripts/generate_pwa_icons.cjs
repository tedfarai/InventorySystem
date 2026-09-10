const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// SVG Favicon with Paramount Procurement Icon
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <rect width="100" height="100" rx="20" fill="#0d9488"/>
  <rect x="6" y="6" width="88" height="88" rx="16" fill="#0f172a"/>
  <!-- Box / Clipboard / Procurement Icon -->
  <path d="M 30 25 L 70 25 L 70 35 L 30 35 Z" fill="#14b8a6"/>
  <rect x="25" y="32" width="50" height="46" rx="6" fill="none" stroke="#2dd4bf" stroke-width="4"/>
  <line x1="35" y1="46" x2="65" y2="46" stroke="#f8fafc" stroke-width="4" stroke-linecap="round"/>
  <line x1="35" y1="56" x2="55" y2="56" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
  <line x1="35" y1="66" x2="60" y2="66" stroke="#2dd4bf" stroke-width="4" stroke-linecap="round"/>
  <circle cx="72" cy="72" r="14" fill="#0d9488" stroke="#0f172a" stroke-width="3"/>
  <path d="M 67 72 L 71 76 L 78 68" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Generate raw PNG using pure Node.js (RGBA bitmap -> PNG chunks)
function createSquarePng(size, isMaskable = false) {
  const width = size;
  const height = size;

  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  const bgR = 15, bgG = 23, bgB = 42; // #0f172a
  const tealDarkR = 13, tealDarkG = 148, tealDarkB = 136; // #0d9488
  const tealLightR = 45, tealLightG = 212, tealLightB = 191; // #2dd4bf
  const whiteR = 248, whiteG = 250, whiteB = 252;

  const center = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      
      let r = bgR, g = bgG, b = bgB, a = 255;

      const dx = x - center;
      const dy = y - center;
      const distSq = dx * dx + dy * dy;

      // Outer accent border for non-maskable
      if (!isMaskable && distSq <= (radius + size * 0.04) * (radius + size * 0.04) && distSq >= (radius - size * 0.02) * (radius - size * 0.02)) {
        r = tealDarkR; g = tealDarkG; b = tealDarkB;
      }

      // Rounded Box symbol
      const boxLeft = size * 0.28;
      const boxRight = size * 0.72;
      const boxTop = size * 0.28;
      const boxBottom = size * 0.72;

      // Box body
      if (x >= boxLeft && x <= boxRight && y >= boxTop && y <= boxBottom) {
        // Border of box
        const strokeW = Math.max(2, Math.floor(size * 0.035));
        const isBorder = (x <= boxLeft + strokeW || x >= boxRight - strokeW || y <= boxTop + strokeW || y >= boxBottom - strokeW);
        if (isBorder) {
          r = tealLightR; g = tealLightG; b = tealLightB;
        } else {
          // Lines inside box
          const line1Y = size * 0.42;
          const line2Y = size * 0.52;
          const line3Y = size * 0.62;
          const lineH = Math.max(2, Math.floor(size * 0.03));

          if (y >= line1Y && y <= line1Y + lineH && x >= boxLeft + size * 0.08 && x <= boxRight - size * 0.08) {
            r = whiteR; g = whiteG; b = whiteB;
          } else if (y >= line2Y && y <= line2Y + lineH && x >= boxLeft + size * 0.08 && x <= boxRight - size * 0.18) {
            r = tealLightR; g = tealLightG; b = tealLightB;
          } else if (y >= line3Y && y <= line3Y + lineH && x >= boxLeft + size * 0.08 && x <= boxRight - size * 0.12) {
            r = tealDarkR; g = tealDarkG; b = tealDarkB;
          }
        }
      }

      // Checkmark badge in bottom right corner
      const badgeCenterX = size * 0.72;
      const badgeCenterY = size * 0.72;
      const badgeRadius = size * 0.15;
      const badgeDistSq = (x - badgeCenterX) * (x - badgeCenterX) + (y - badgeCenterY) * (y - badgeCenterY);

      if (badgeDistSq <= badgeRadius * badgeRadius) {
        r = tealDarkR; g = tealDarkG; b = tealDarkB;
        // Inner checkmark tick
        const cdx = (x - badgeCenterX) / badgeRadius;
        const cdy = (y - badgeCenterY) / badgeRadius;
        if ((cdy >= -0.2 && cdy <= 0.3 && Math.abs(cdx - (cdy - 0.1) * 0.8) < 0.2) || 
            (cdy >= -0.4 && cdy <= 0.3 && Math.abs(cdx - (0.4 - cdy * 0.8)) < 0.2)) {
          r = whiteR; g = whiteG; b = whiteB;
        }
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // Compress IDAT
  const compressed = zlib.deflateSync(rawData);

  // CRC32 helper
  function crc32(buf) {
    let c = ~0;
    for (let i = 0; i < buf.length; i++) {
      let b = buf[i];
      for (let j = 0; j < 8; j++) {
        c = (c >>> 1) ^ (((c ^ b) & 1) ? 0xEDB88320 : 0);
        b >>>= 1;
      }
    }
    return (c ^ -1) >>> 0;
  }

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const full = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(full), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressed);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const pwa192 = createSquarePng(192);
const pwa512 = createSquarePng(512);
const pwaMaskable = createSquarePng(512, true);

fs.writeFileSync('public/favicon.svg', faviconSvg);
fs.writeFileSync('public/pwa-192x192.png', pwa192);
fs.writeFileSync('public/pwa-512x512.png', pwa512);
fs.writeFileSync('public/maskable-icon.png', pwaMaskable);

console.log('Successfully generated PWA icon suite!');
