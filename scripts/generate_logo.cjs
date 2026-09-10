const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// SVG content matching official Paramount PEX Green (2).png
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 280" width="160" height="280">
  <defs>
    <pattern id="pexMesh" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
      <rect width="8" height="8" fill="#22252A"/>
      <circle cx="4" cy="4" r="0.9" fill="#2E3339"/>
    </pattern>
  </defs>
  <!-- Dark Graphite Rounded Card matching PEX Green (2).png -->
  <rect width="160" height="280" rx="8" fill="#22252A"/>
  <rect width="160" height="280" rx="8" fill="url(#pexMesh)"/>
  
  <!-- Left Side: Lime Green Striding Figure (#C6D92C) -->
  <g fill="#C6D92C">
    <!-- Cap / Helmet with visor -->
    <path d="M 64 34 C 64 34 92 34 92 64 L 48 64 C 48 64 48 56 58 56 L 64 56 Z" />
    
    <!-- Torso, Arms and Striding Legs -->
    <path d="M 52 72 L 90 72 L 90 134 L 102 182 L 66 254 L 44 254 L 76 186 L 68 142 L 30 186 L 8 170 L 52 106 Z" />
  </g>

  <!-- Right Side: Official 'paramount' Vertical Typography -->
  <g transform="translate(138, 34) rotate(90)">
    <text x="0" y="0" fill="#C6D92C" font-family="'Segoe UI', -apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="36" font-weight="900" letter-spacing="1">paramount</text>
  </g>
</svg>`;

// Generate simple valid raw PNG using pure Node.js (RGBA bitmap -> PNG chunks)
function createPng(width, height) {
  const bgR = 0x22, bgG = 0x25, bgB = 0x2A;
  const fgR = 0xC6, fgG = 0xD9, fgB = 0x2C;
  const dotR = 0x2E, dotG = 0x33, dotB = 0x39;

  // Uncompressed scanlines: each row starts with filter byte 0
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowBytes);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      let r = bgR, g = bgG, b = bgB, a = 255;

      // Micro dots background
      if ((x % 8 === 4) && (y % 8 === 4)) {
        r = dotR; g = dotG; b = dotB;
      }

      // Cap / Helmet region (x: 24-48, y: 16-34 roughly scaled to 160x280)
      if (y >= 28 && y <= 62 && x >= 24 && x <= 64) {
        if (y >= 48 || (x >= 30 && x <= 58)) {
          r = fgR; g = fgG; b = fgB;
        }
      }

      // Torso & body
      if (y >= 70 && y <= 130 && x >= 30 && x <= 55) {
        r = fgR; g = fgG; b = fgB;
      }
      // Striding forward leg
      if (y >= 130 && y <= 245) {
        const legProg = (y - 130) / 115;
        const targetX1 = 55 - legProg * 25;
        if (x >= targetX1 - 8 && x <= targetX1 + 8) {
          r = fgR; g = fgG; b = fgB;
        }
        // Back leg
        const targetX2 = 45 + legProg * 15;
        if (y <= 190 && x >= targetX2 - 6 && x <= targetX2 + 6) {
          r = fgR; g = fgG; b = fgB;
        }
      }
      // Arms
      if (y >= 75 && y <= 165) {
        const armProg = (y - 75) / 90;
        const armX = 30 - armProg * 18;
        if (x >= armX - 6 && x <= armX + 6) {
          r = fgR; g = fgG; b = fgB;
        }
      }

      // Vertical text region indicator stripe
      if (x >= 118 && x <= 136 && y >= 32 && y <= 230) {
        if ((y % 16 < 12) && (x >= 120 && x <= 134)) {
          r = fgR; g = fgG; b = fgB;
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

  // PNG Header
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type: RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // IDAT chunk
  const idatChunk = makeChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([header, ihdrChunk, idatChunk, iendChunk]);
}

const pngBuffer = createPng(160, 280);

const targetDirs = ['public', 'public/assets'];
for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// Write files
const filenames = ['PEX Green (2).png', 'PEX_Green_(2).png', 'pex-green-logo.png'];
for (const fn of filenames) {
  fs.writeFileSync(path.join('public', fn), pngBuffer);
  fs.writeFileSync(path.join('public/assets', fn), pngBuffer);
  fs.writeFileSync(path.join('public', fn.replace('.png', '.svg')), svgContent);
  fs.writeFileSync(path.join('public/assets', fn.replace('.png', '.svg')), svgContent);
}

console.log('Successfully generated public logo assets!');
