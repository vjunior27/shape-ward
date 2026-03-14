/**
 * Generates Shape Ward PWA icons using pure Node.js (no extra dependencies).
 * Creates: public/icons/icon-192.png, icon-512.png, icon-512-maskable.png, favicon.ico
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// ── PNG encoder ───────────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const tb = Buffer.from(type, 'ascii');
  const db = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lb = Buffer.allocUnsafe(4); lb.writeUInt32BE(db.length);
  const cb = Buffer.allocUnsafe(4); cb.writeUInt32BE(crc32(Buffer.concat([tb, db])));
  return Buffer.concat([lb, tb, db, cb]);
}

function encodePNG(width, height, getPixel) {
  // getPixel(x, y) → [r, g, b, a]
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  const raw = Buffer.allocUnsafe(height * (1 + width * 4));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    raw[offset++] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      raw[offset++] = r; raw[offset++] = g; raw[offset++] = b; raw[offset++] = a;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 6 });
  return Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', compressed), pngChunk('IEND', Buffer.alloc(0))]);
}

// ── Shape Ward icon pixel function ───────────────────────────────────────────
// Design: dark background + green radial glow + shield outline + "SW" letters
// Uses a "pixel font" approach for the letters.

function lerp(a, b, t) { return a + (b - a) * Math.max(0, Math.min(1, t)); }

// Simple 5×7 bitmap for "S"
const GLYPH_S = [
  [0,1,1,1,0],
  [1,0,0,0,1],
  [1,0,0,0,0],
  [0,1,1,1,0],
  [0,0,0,0,1],
  [1,0,0,0,1],
  [0,1,1,1,0],
];
// Simple 5×7 bitmap for "W"
const GLYPH_W = [
  [1,0,0,0,1],
  [1,0,0,0,1],
  [1,0,1,0,1],
  [1,0,1,0,1],
  [1,1,0,1,1],
  [1,1,0,1,1],
  [1,0,0,0,1],
];

function drawGlyph(glyph, cx, cy, scale, x, y) {
  const cols = glyph[0].length;
  const rows = glyph.length;
  const gx = Math.floor((x - (cx - cols * scale / 2)) / scale);
  const gy = Math.floor((y - (cy - rows * scale / 2)) / scale);
  if (gx < 0 || gx >= cols || gy < 0 || gy >= rows) return false;
  return glyph[gy][gx] === 1;
}

function shapeWardPixel(x, y, w, h) {
  const cx = w / 2, cy = h / 2;
  const size = Math.min(w, h);
  const r = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

  // Background: #0F0F1A
  let R = 15, G = 15, B = 26, A = 255;

  // Radial glow from center
  const glowR = size * 0.42;
  if (r < glowR * 1.5) {
    const t = Math.max(0, 1 - r / (glowR * 1.5));
    G = Math.round(lerp(G, 80, t * 0.6));
    B = Math.round(lerp(B, 60, t * 0.3));
  }

  // Shield shape: rounded hexagon approximation
  // Use distance from center + angle to create a shield silhouette
  const angle = Math.atan2(y - cy, x - cx);
  const shieldTop = cy - size * 0.38;
  const shieldBottom = cy + size * 0.43;
  const shieldWidth = size * 0.36;

  // Shield polygon test (simplified)
  const inShield = (() => {
    const dx = x - cx;
    const dy = y - cy;
    const normY = dy / (size * 0.43);
    const normX = dx / (size * 0.36);
    if (normY < -0.88) return false;
    if (normY > 1.0) return false;
    // Taper toward bottom
    const maxX = normY < 0 ? 1.0 : (1.0 - normY * 0.85);
    if (Math.abs(normX) > maxX) return false;
    // Round the top corners
    if (normY < -0.5 && Math.abs(normX) > 0.7) {
      const cornerDist = Math.sqrt((Math.abs(normX) - 0.7) ** 2 + (normY + 0.5) ** 2);
      if (cornerDist > 0.3) return false;
    }
    return true;
  })();

  if (inShield) {
    // Green fill with slight gradient
    const depthT = Math.max(0, 1 - r / (size * 0.4));
    R = Math.round(lerp(10, 25, 1 - depthT));
    G = Math.round(lerp(120, 220, depthT));
    B = Math.round(lerp(55, 100, depthT));
    A = 255;
  }

  // Shield border (1.5% of size thick)
  const borderThick = size * 0.022;
  const inShieldOuter = (() => {
    const dx = x - cx;
    const dy = y - cy;
    const normY = dy / (size * 0.43 + borderThick);
    const normX = dx / (size * 0.36 + borderThick);
    if (normY < -0.88) return false;
    if (normY > 1.0) return false;
    const maxX = normY < 0 ? 1.0 : (1.0 - normY * 0.85);
    if (Math.abs(normX) > maxX) return false;
    if (normY < -0.5 && Math.abs(normX) > 0.7) {
      const cornerDist = Math.sqrt((Math.abs(normX) - 0.7) ** 2 + (normY + 0.5) ** 2);
      if (cornerDist > 0.3) return false;
    }
    return true;
  })();

  if (inShieldOuter && !inShield) {
    R = 0; G = 255; B = 148; A = 255;
  }

  // "SW" letters — scale = size/24 pixels per grid unit
  const scale = Math.max(1, Math.floor(size / 24));
  const letterGap = Math.floor(scale * 1.5);
  const totalLetterW = 5 * scale * 2 + letterGap;
  const letterY = cy - scale * 3.5 + size * 0.02;

  const sOn = drawGlyph(GLYPH_S, cx - totalLetterW / 2 + scale * 2.5, letterY, scale, x, y);
  const wOn = drawGlyph(GLYPH_W, cx + totalLetterW / 2 - scale * 2.5, letterY, scale, x, y);

  if ((sOn || wOn) && inShield) {
    R = 5; G = 30; B = 15; A = 255;
  }

  return [R, G, B, A];
}

// ── Generate files ────────────────────────────────────────────────────────────

const outDir = path.join(__dirname, '..', 'public', 'icons');
fs.mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  const buf = encodePNG(size, size, shapeWardPixel);
  fs.writeFileSync(path.join(outDir, `icon-${size}.png`), buf);
  fs.writeFileSync(path.join(outDir, `icon-${size}-maskable.png`), buf);
  console.log(`✓ icon-${size}.png  (${buf.length} bytes)`);
}

// ── favicon.ico — 32×32 embedded as ICO ──────────────────────────────────────
// ICO format: header + directory entry + BMP/PNG image data
// We embed the 32×32 PNG directly (modern browsers accept PNG inside ICO)

const fav32 = encodePNG(32, 32, shapeWardPixel);

const icoHeader = Buffer.allocUnsafe(6);
icoHeader.writeUInt16LE(0, 0); // reserved
icoHeader.writeUInt16LE(1, 2); // type: ICO
icoHeader.writeUInt16LE(1, 4); // count: 1 image

const icoDirEntry = Buffer.allocUnsafe(16);
icoDirEntry[0] = 32;  // width
icoDirEntry[1] = 32;  // height
icoDirEntry[2] = 0;   // color count
icoDirEntry[3] = 0;   // reserved
icoDirEntry.writeUInt16LE(1, 4);   // color planes
icoDirEntry.writeUInt16LE(32, 6);  // bits per pixel
icoDirEntry.writeUInt32LE(fav32.length, 8);  // size of image data
icoDirEntry.writeUInt32LE(22, 12); // offset of image data (6 + 16)

const icoFile = Buffer.concat([icoHeader, icoDirEntry, fav32]);
fs.writeFileSync(path.join(__dirname, '..', 'public', 'favicon.ico'), icoFile);
console.log(`✓ favicon.ico  (${icoFile.length} bytes)`);
