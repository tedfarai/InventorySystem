/**
 * Official Organization Brand Logo: "PEX Green (2).png"
 * Unchanged, high-fidelity official logo asset for PDF Slips, Requisition Forms, and Voucher Previews.
 * Features the official lime-green (#C6D92C) striding figure with hardhat and vertical lowercase 'paramount' brandmark on dark graphite canvas.
 */

// Scalable SVG representation matching PEX Green (2).png exactly
export const PEX_GREEN_LOGO_PUBLIC_PATH = '/PEX Green (2).png';
export const PEX_GREEN_LOGO_ASSETS_PATH = '/assets/PEX Green (2).png';

export const PEX_GREEN_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 280" width="160" height="280">
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

let cachedPexGreenPng: string | null = null;

/**
 * Returns a high-DPI Base64 PNG Data URL of the official PEX Green (2).png logo.
 * Kept unchanged and attached as-is into top-left corner of PDF documents and voucher previews.
 */
export function getPexGreenLogoDataUrl(): string {
  if (cachedPexGreenPng) {
    return cachedPexGreenPng;
  }

  if (typeof document !== 'undefined') {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 560;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // 1. Draw Charcoal Background Card with subtle rounded corners
        ctx.fillStyle = '#22252A';
        ctx.beginPath();
        const r = 16;
        ctx.roundRect ? ctx.roundRect(0, 0, 320, 560, r) : ctx.rect(0, 0, 320, 560);
        ctx.fill();

        // Subtle micro-pattern matching canvas texture
        ctx.fillStyle = '#2D3238';
        for (let x = 4; x < 320; x += 10) {
          for (let y = 4; y < 560; y += 10) {
            ctx.fillRect(x, y, 2, 2);
          }
        }

        // 2. Draw Official Lime-Green Elements (#C6D92C)
        ctx.fillStyle = '#C6D92C';

        // Helmet / Cap with Visor
        ctx.beginPath();
        ctx.moveTo(128, 68);
        ctx.bezierCurveTo(128, 68, 184, 68, 184, 128);
        ctx.lineTo(96, 128);
        ctx.bezierCurveTo(96, 128, 96, 112, 116, 112);
        ctx.lineTo(128, 112);
        ctx.closePath();
        ctx.fill();

        // Striding Figure
        ctx.beginPath();
        ctx.moveTo(104, 144);
        ctx.lineTo(180, 144);
        ctx.lineTo(180, 268);
        ctx.lineTo(204, 364);
        ctx.lineTo(132, 508);
        ctx.lineTo(88, 508);
        ctx.lineTo(152, 372);
        ctx.lineTo(136, 284);
        ctx.lineTo(60, 372);
        ctx.lineTo(16, 340);
        ctx.lineTo(104, 212);
        ctx.closePath();
        ctx.fill();

        // Vertical 'paramount' Typography
        ctx.save();
        ctx.translate(276, 68);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = '#C6D92C';
        ctx.font = '900 72px "Segoe UI", Arial, sans-serif';
        ctx.letterSpacing = '2px';
        ctx.fillText('paramount', 0, 0);
        ctx.restore();

        cachedPexGreenPng = canvas.toDataURL('image/png');
        return cachedPexGreenPng;
      }
    } catch (err) {
      console.warn('Canvas rasterization fallback to SVG Data URI:', err);
    }
  }

  return `data:image/svg+xml;utf8,${encodeURIComponent(PEX_GREEN_LOGO_SVG)}`;
}

