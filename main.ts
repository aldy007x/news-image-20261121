// news-image-20261121 — a program that draws a newspaper front page summing up
// Saturday 21 November 2026 and writes it to /output/entry.png.
// Node 22, standard library only. No network, no clock, no randomness:
// every run draws the same pixels and writes byte-identical output.
//
// The image is 1024x1024, drawn by a small software rasteriser in this file:
// a 5x7 bitmap font, flat-colour scenes per story, and a hand-rolled PNG
// encoder (node:zlib for the compressed data). All stories were verified
// against news reports dated 21 November 2026 before being drawn.

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

// ------------------------------------------------------------------ font --
// 5x7 bitmap font, written for this entry. Each glyph is 7 rows; each row is
// a 5-bit number, bit 4 = leftmost pixel. Lowercase glyphs sit on rows 1..6,
// with descenders reaching row 6. Headlines are set in capitals; body copy
// uses mixed case.
const GLYPHS: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x1b, 0x11],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  '0': [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  '1': [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  '2': [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  '3': [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  '4': [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  '5': [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  '6': [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  '7': [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  '8': [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  '9': [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  ' ': [0, 0, 0, 0, 0, 0, 0],
  '.': [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ',': [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  ':': [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ';': [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  '!': [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  '?': [0x0e, 0x11, 0x01, 0x02, 0x04, 0, 0x04],
  '-': [0, 0, 0, 0x0e, 0, 0, 0],
  '(': [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ')': [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  '/': [0x01, 0x01, 0x02, 0x04, 0x08, 0x10, 0x10],
  '&': [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  '%': [0x19, 0x19, 0x02, 0x04, 0x08, 0x13, 0x13],
  '$': [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  '+': [0, 0x04, 0x04, 0x0e, 0x04, 0x04, 0],
  '=': [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0x0a, 0, 0, 0, 0],
  '*': [0, 0x04, 0x15, 0x0e, 0x15, 0x04, 0],
  '•': [0, 0, 0, 0x0c, 0x0c, 0, 0],
  a: [0, 0, 0x0e, 0x01, 0x0f, 0x11, 0x0f],
  b: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x1e],
  c: [0, 0, 0x0e, 0x10, 0x10, 0x10, 0x0e],
  d: [0x01, 0x01, 0x0f, 0x11, 0x11, 0x11, 0x0f],
  e: [0, 0, 0x0e, 0x11, 0x1f, 0x10, 0x0e],
  f: [0x06, 0x08, 0x1e, 0x08, 0x08, 0x08, 0x08],
  g: [0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  h: [0x10, 0x10, 0x1e, 0x11, 0x11, 0x11, 0x11],
  i: [0x04, 0, 0x0c, 0x04, 0x04, 0x04, 0x0e],
  j: [0x02, 0, 0x06, 0x02, 0x02, 0x12, 0x0c],
  k: [0x10, 0x10, 0x12, 0x14, 0x18, 0x14, 0x11],
  l: [0x0c, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  m: [0, 0, 0x1a, 0x15, 0x15, 0x15, 0x15],
  n: [0, 0, 0x1e, 0x11, 0x11, 0x11, 0x11],
  o: [0, 0, 0x0e, 0x11, 0x11, 0x11, 0x0e],
  p: [0, 0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10],
  q: [0, 0x0f, 0x11, 0x11, 0x0f, 0x01, 0x01],
  r: [0, 0, 0x16, 0x19, 0x10, 0x10, 0x10],
  s: [0, 0, 0x0f, 0x10, 0x0e, 0x01, 0x1e],
  t: [0x04, 0x04, 0x1f, 0x04, 0x04, 0x04, 0x03],
  u: [0, 0, 0x11, 0x11, 0x11, 0x13, 0x0d],
  v: [0, 0, 0x11, 0x11, 0x11, 0x0a, 0x04],
  w: [0, 0, 0x11, 0x15, 0x15, 0x15, 0x0a],
  x: [0, 0, 0x11, 0x0a, 0x04, 0x0a, 0x11],
  y: [0, 0, 0x11, 0x11, 0x0f, 0x01, 0x0e],
  z: [0, 0, 0x1f, 0x02, 0x04, 0x08, 0x1f],
};

// ---------------------------------------------------------------- surface --
type RGB = [number, number, number];

const W = 1024;
const H = 1024;

// A flat RGB pixel buffer with the drawing primitives the page needs.
class Sheet {
  data = new Uint8Array(W * H * 3);

  dot(x: number, y: number, c: RGB): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
  }

  box(x: number, y: number, w: number, h: number, c: RGB): void {
    const x0 = Math.max(0, Math.floor(x));
    const y0 = Math.max(0, Math.floor(y));
    const x1 = Math.min(W, Math.ceil(x + w));
    const y1 = Math.min(H, Math.ceil(y + h));
    for (let yy = y0; yy < y1; yy++) {
      let i = (yy * W + x0) * 3;
      for (let xx = x0; xx < x1; xx++, i += 3) {
        this.data[i] = c[0]; this.data[i + 1] = c[1]; this.data[i + 2] = c[2];
      }
    }
  }

  border(x: number, y: number, w: number, h: number, t: number, c: RGB): void {
    this.box(x, y, w, t, c);
    this.box(x, y + h - t, w, t, c);
    this.box(x, y, t, h, c);
    this.box(x + w - t, y, t, h, c);
  }

  // Filled circle.
  blob(cx: number, cy: number, r: number, c: RGB): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx, dy = y - cy;
        if (dx * dx + dy * dy <= r * r) this.dot(x, y, c);
      }
    }
  }

  // Filled ellipse.
  oval(cx: number, cy: number, rx: number, ry: number, c: RGB): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.dot(x, y, c);
      }
    }
  }

  // Thick line: Bresenham walk with a square brush.
  stroke(x0: number, y0: number, x1: number, y1: number, t: number, c: RGB): void {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy, x = x0, y = y0;
    const half = Math.floor(t / 2);
    for (let guard = 0; guard < 8192; guard++) {
      this.box(x - half, y - half, t, t, c);
      if (x === x1 && y === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }

  // Filled triangle by barycentric scan.
  wedge(ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: RGB): void {
    const minY = Math.max(0, Math.floor(Math.min(ay, by, cy)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(ay, by, cy)));
    const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
    const d = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (d === 0) return;
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const w0 = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / d;
        const w1 = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / d;
        const w2 = 1 - w0 - w1;
        if (w0 >= 0 && w1 >= 0 && w2 >= 0) this.dot(x, y, c);
      }
    }
  }

  // ---- text ----
  measure(s: string, sc: number): number {
    return s.length * 6 * sc - sc;
  }

  print(x: number, y: number, s: string, sc: number, c: RGB): void {
    let cx = x;
    for (const ch of s) {
      const g = GLYPHS[ch] ?? GLYPHS['?'] ?? GLYPHS[' '];
      if (ch !== ' ') {
        for (let r = 0; r < 7; r++) {
          const row = g[r];
          for (let col = 0; col < 5; col++) {
            if (row & (1 << (4 - col))) this.box(cx + col * sc, y + r * sc, sc, sc, c);
          }
        }
      }
      cx += 6 * sc;
    }
  }

  // Greedy word wrap into at most maxLines lines within maxW pixels.
  wrap(s: string, sc: number, maxW: number, maxLines: number): string[] {
    const words = s.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const wd of words) {
      const trial = cur ? cur + ' ' + wd : wd;
      if (this.measure(trial, sc) <= maxW || !cur) {
        cur = trial;
      } else {
        lines.push(cur);
        cur = wd;
        if (lines.length === maxLines) return lines;
      }
    }
    if (cur && lines.length < maxLines) lines.push(cur);
    return lines.slice(0, maxLines);
  }

  block(x: number, y: number, s: string, sc: number, maxW: number, maxLines: number, c: RGB, lh?: number): void {
    const lines = this.wrap(s, sc, maxW, maxLines);
    const step = lh ?? 9 * sc;
    lines.forEach((ln, i) => this.print(x, y + i * step, ln, sc, c));
  }
}

// --------------------------------------------------------------- PNG out --
// Minimal deterministic PNG encoder: signature, IHDR, one IDAT (zlib
// deflate at level 9, which is deterministic), IEND. CRC32 table is built
// once from the standard polynomial.
const CRC_TABLE: number[] = (() => {
  const t: number[] = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t.push(c >>> 0);
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function encodePNG(sh: Sheet): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // 8-bit samples
  ihdr[9] = 2; // colour type 2 = RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // no compression/filter/interlace tricks
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter type 0 (none) per scanline
    raw.set(sh.data.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------- palette --
const PAPER: RGB = [247, 243, 235];
const INK: RGB = [24, 24, 24];
const WHITE: RGB = [255, 255, 255];
const RED: RGB = [176, 32, 40];
const NAVY: RGB = [28, 52, 88];
const TEAL: RGB = [16, 104, 98];
const GOLD: RGB = [196, 138, 28];
const SKY: RGB = [132, 188, 222];
const GREY: RGB = [104, 102, 94];
const BODY: RGB = [58, 56, 50];
const BROWN: RGB = [146, 88, 32];
const GREEN: RGB = [22, 92, 58];
const PURPLE: RGB = [88, 38, 108];
const DARK: RGB = [18, 38, 56];

// ------------------------------------------------------------- story card --
// One story panel: coloured kicker bar, a small flat-colour scene, a
// two-line headline and a short summary. All text stays inside the frame.
type Scene = (sh: Sheet, x: number, y: number, w: number, h: number) => void;

function storyCard(
  sh: Sheet, x: number, y: number, w: number, h: number,
  kicker: string, kc: RGB, headline: string, summary: string, scene: Scene,
): void {
  sh.box(x, y, w, h, WHITE);
  sh.border(x, y, w, h, 2, INK);
  sh.box(x + 2, y + 2, w - 4, 22, kc);
  sh.print(x + 10, y + 7, kicker, 2, WHITE);
  scene(sh, x + 2, y + 26, w - 4, 84);
  const hl = sh.wrap(headline, 3, w - 24, 2);
  hl.forEach((ln, i) => sh.print(x + 12, y + 116 + i * 25, ln, 3, INK));
  sh.block(x + 12, y + 170, summary, 2, w - 24, 3, BODY, 18);
}

// ------------------------------------------------------------------ page --
// Front page, 1024x1024:
//   masthead 10..100 | lead 106..350 | grid rows 358..606, 614..862
//   ticker 870..958 | footer 966..1012. All text inside the frame.
function drawPage(sh: Sheet): void {
  sh.box(0, 0, W, H, PAPER);

  // ---- masthead ----
  const title = 'THE DAILY GLOBE';
  sh.print(Math.floor((W - sh.measure(title, 7)) / 2), 12, title, 7, INK);
  sh.box(16, 64, W - 32, 2, INK);
  sh.print(16, 72, 'THE DAY IN FULL', 2, GREY);
  const date = 'SATURDAY 21 NOVEMBER 2026';
  sh.print(Math.floor((W - sh.measure(date, 3)) / 2), 70, date, 3, RED);
  const ed = 'LATE EDITION';
  sh.print(W - 16 - sh.measure(ed, 2), 72, ed, 2, GREY);
  sh.box(16, 98, W - 32, 2, INK);

  // ---- lead: the Wall Street rout ----
  const lx = 16, ly = 106, lw = W - 32, lh = 244;
  sh.box(lx, ly, lw, lh, WHITE);
  sh.border(lx, ly, lw, lh, 2, INK);
  sh.box(lx + 2, ly + 2, lw - 4, 24, RED);
  sh.print(lx + 10, ly + 7, 'LEAD STORY - MARKETS', 2, WHITE);
  sceneMarket(sh, lx + 12, ly + 38, 320, 194);
  const tx = lx + 348, tw = lw - 348 - 16;
  const hl = sh.wrap("WALL STREET'S WORST WEEK SINCE 2020", 4, tw, 2);
  hl.forEach((ln, i) => sh.print(tx, ly + 40 + i * 34, ln, 4, INK));
  const subY = ly + 40 + hl.length * 34 + 6;
  sh.print(tx, subY, 'NASDAQ -5.3% AS AI SELLOFF DEEPENS', 3, NAVY);
  sh.block(tx, subY + 30,
    'The S&P 500 falls 3.7% for a seventh straight day and the Dow enters correction territory. Nvidia tumbles 14% as more than $4 trillion in value is wiped from US stocks in a week.',
    2, tw, 4, BODY, 18);

  // ---- grid: six more stories of the day ----
  const cw = 320, ch = 248;
  const cols = [16, 352, 688];
  const rows = [358, 614];
  storyCard(sh, cols[0], rows[0], cw, ch, 'THE GULF', RED,
    'MISSILES AT RIYADH STOPPED',
    'Saudi defences down three Houthi missiles; Hormuz attacks peak.',
    sceneGulf);
  storyCard(sh, cols[1], rows[0], cw, ch, 'THE BALTIC', NAVY,
    'DRONE FIRE HITS RUSSIAN SHIP',
    'Sanctioned cargo ship hit in the Gulf of Finland; crew evacuated.',
    sceneBaltic);
  storyCard(sh, cols[2], rows[0], cw, ch, 'EUROPE', TEAL,
    'DENMARK EXPELS RUSSIAN ATTACHE',
    'Copenhagen ties Moscow to a foiled assassination plot.',
    sceneDenmark);
  storyCard(sh, cols[0], rows[1], cw, ch, 'MEXICO', BROWN,
    'MEXICO NABS CARTEL KINGPIN',
    "'Chapo Isidro' seized in a chaotic military operation, Mexico says.",
    sceneMexico);
  storyCard(sh, cols[1], rows[1], cw, ch, 'WASHINGTON', GREEN,
    'THE PENNY IS DEAD',
    'Trump signs the Common Cents Act; cash rounds to the nearest nickel.',
    scenePenny);
  storyCard(sh, cols[2], rows[1], cw, ch, 'CULTURE', PURPLE,
    'GTA VI: $2.36BN IN A DAY',
    'An estimated 24.59 million copies sold on day one, a record opening.',
    sceneGta);

  // ---- ticker: in brief ----
  const ty = 870, th = 88;
  sh.box(16, ty, W - 32, th, NAVY);
  sh.print(28, ty + 8, 'IN BRIEF: COP31 talks slip into overtime over fossil fuels', 2, WHITE);
  sh.print(28, ty + 32, 'Earthquake shakes central Peru • Kryvyi Rih strike kills paramedic and boy, 7', 2, WHITE);
  sh.print(28, ty + 56, "Trump touts Putin talks at briefing • Virginia's first measles death of 2026", 2, WHITE);

  // ---- footer ----
  const foot = 'THE DAILY GLOBE • SATURDAY 21 NOVEMBER 2026 • ALL STORIES REPORTED THAT DAY';
  sh.print(Math.floor((W - sh.measure(foot, 2)) / 2), 978, foot, 2, GREY);
}

// ---------------------------------------------------------------- scenes --
// Each scene draws inside a box (x, y, w, h) with flat colours only.

// LEAD: a falling market chart on a dark board, red line plunging down.
function sceneMarket(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, DARK);
  for (let i = 1; i < 5; i++) sh.box(x + 8, y + i * Math.floor(h / 5), w - 16, 1, [42, 72, 96]);
  for (let i = 1; i < 4; i++) sh.box(x + i * Math.floor(w / 4), y + 8, 1, h - 16, [42, 72, 96]);
  // falling line: high left, low right, with a down arrow at the end
  const pts: [number, number][] = [[0.04, 0.14], [0.22, 0.26], [0.40, 0.22], [0.58, 0.48], [0.74, 0.58], [0.92, 0.76]];
  for (let i = 0; i < pts.length - 1; i++) {
    sh.stroke(
      x + Math.floor(w * pts[i][0]), y + Math.floor(h * pts[i][1]),
      x + Math.floor(w * pts[i + 1][0]), y + Math.floor(h * pts[i + 1][1]),
      5, [255, 70, 60],
    );
  }
  const ex = x + Math.floor(w * 0.92), ey = y + Math.floor(h * 0.76);
  sh.wedge(ex - 12, ey - 4, ex + 12, ey - 4, ex, ey + 14, [255, 70, 60]);
  // big fall figure, top left, on a solid patch so the line passes behind it
  sh.box(x + 6, y + 4, 124, 42, DARK);
  sh.print(x + 10, y + 8, '-5.3%', 4, [255, 210, 90]);
  sh.print(x + 10, y + h - 26, 'NASDAQ', 2, [120, 200, 230]);
  sh.print(x + 92, y + h - 26, 'S&P -3.7%', 2, [255, 120, 110]);
  sh.print(x + 212, y + h - 26, 'DOW -1.9%', 2, [255, 120, 110]);
}

// THE GULF: a tanker at sea, missile trails overhead, an intercept burst.
function sceneGulf(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, [214, 228, 238]); // hazy sky
  sh.blob(x + w - 46, y + 16, 11, [255, 224, 140]); // low sun
  const seaY = y + Math.floor(h * 0.58);
  sh.box(x, seaY, w, h - Math.floor(h * 0.58), [44, 96, 140]); // sea
  for (let i = 0; i < 5; i++) sh.box(x + 12 + i * 56, seaY + 10 + (i % 2) * 10, 36, 3, [120, 178, 210]);
  // tanker: dark hull, red stripe, stacked containers
  const hy = seaY - 14;
  sh.box(x + 40, hy, w - 110, 14, [40, 44, 50]);
  sh.box(x + 40, hy + 10, w - 110, 4, RED);
  sh.box(x + 52, hy - 22, 34, 22, [190, 70, 50]);
  sh.box(x + 92, hy - 22, 34, 22, [60, 120, 90]);
  sh.box(x + 132, hy - 22, 34, 22, [210, 160, 60]);
  sh.box(x + w - 74, hy - 26, 22, 26, [220, 220, 214]); // bridge
  sh.box(x + w - 70, hy - 34, 14, 8, [220, 220, 214]);
  // missile trails arcing down from the top right
  sh.stroke(x + w - 30, y + 6, x + w - 90, y + 34, 3, [90, 90, 92]);
  sh.stroke(x + w - 60, y + 4, x + w - 130, y + 30, 3, [90, 90, 92]);
  // intercept burst where a trail is cut
  const bx = x + w - 110, by = y + 30;
  for (let a = 0; a < 8; a++) {
    const ang = (a * Math.PI) / 4;
    sh.stroke(bx, by, Math.round(bx + Math.cos(ang) * 20), Math.round(by + Math.sin(ang) * 20), 4, a % 2 ? [255, 190, 60] : [255, 110, 30]);
  }
  sh.blob(bx, by, 8, [255, 220, 110]);
}

// THE BALTIC: a cargo ship on grey water, flames and smoke, drones above.
function sceneBaltic(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, [168, 182, 192]); // cold sky
  const seaY = y + Math.floor(h * 0.60);
  sh.box(x, seaY, w, h - Math.floor(h * 0.60), [70, 104, 128]); // grey sea
  for (let i = 0; i < 5; i++) sh.box(x + 10 + i * 56, seaY + 12 + (i % 2) * 10, 34, 3, [140, 168, 184]);
  // ship: grey hull with a red waterline, low superstructure
  const hy = seaY - 12;
  sh.box(x + 36, hy, w - 92, 12, [80, 84, 88]);
  sh.box(x + 36, hy + 8, w - 92, 4, RED);
  sh.box(x + w - 76, hy - 20, 26, 20, [200, 200, 194]);
  sh.box(x + 56, hy - 14, 44, 14, [120, 122, 116]);
  // flames licking from mid-deck
  const fx = x + Math.floor(w * 0.45), fy = hy - 2;
  sh.wedge(fx - 16, fy, fx, fy - 30, fx + 6, fy, [255, 110, 30]);
  sh.wedge(fx - 4, fy, fx + 12, fy - 22, fx + 20, fy, [255, 190, 60]);
  sh.wedge(fx + 8, fy, fx + 18, fy - 14, fx + 28, fy, [255, 110, 30]);
  sh.blob(fx + 4, fy - 8, 7, [255, 220, 110]);
  // smoke puffs drifting up-left
  sh.blob(fx - 26, fy - 26, 9, [110, 110, 108]);
  sh.blob(fx - 42, fy - 34, 11, [140, 140, 138]);
  sh.blob(fx - 60, fy - 40, 8, [110, 110, 108]);
  // three drones, small crosses in the sky
  const drone = (dx: number, dy: number) => {
    sh.box(dx - 7, dy - 1, 14, 3, INK);
    sh.box(dx - 1, dy - 7, 3, 14, INK);
  };
  drone(x + 44, y + 14);
  drone(x + 84, y + 8);
  drone(x + w - 40, y + 12);
}

// EUROPE: the Danish flag on a pole beside a ministry building.
function sceneDenmark(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, [216, 226, 232]);
  sh.box(x, y + h - 22, w, 22, [118, 138, 108]); // lawn
  // flagpole with the Danish flag (red field, white cross)
  const px = x + 30;
  sh.box(px, y + 8, 4, h - 30, [70, 60, 50]);
  const fw = 86, fh = 52, fy = y + 10;
  sh.box(px + 4, fy, fw, fh, RED);
  sh.box(px + 4 + 26, fy, 12, fh, WHITE); // vertical arm of the cross
  sh.box(px + 4, fy + 20, fw, 12, WHITE); // horizontal arm
  // ministry building with columns
  const bx = x + 150, bw = w - 166;
  const by = y + Math.floor(h * 0.34);
  sh.box(bx, by, bw, h - Math.floor(h * 0.34) - 22, [238, 230, 210]);
  sh.wedge(bx - 6, by, bx + bw / 2, by - 16, bx + bw + 6, by, [176, 54, 48]);
  for (let i = 0; i < 4; i++) {
    const cx = bx + 14 + i * Math.floor((bw - 28) / 3);
    sh.box(cx, by + 8, 10, h - Math.floor(h * 0.34) - 36, [200, 190, 168]);
  }
  sh.box(bx + bw / 2 - 8, by + h - Math.floor(h * 0.34) - 22 - 18, 16, 18, [90, 70, 55]);
}

// MEXICO: a wanted poster on a desert wall, stamped CAUGHT.
function sceneMexico(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, [232, 204, 158]); // desert wall
  sh.box(x, y + h - 14, w, 14, [196, 158, 104]); // ground
  // poster
  const px = x + Math.floor(w * 0.30), pw = Math.floor(w * 0.40);
  sh.box(px, y + 4, pw, h - 8, [246, 238, 220]);
  sh.border(px, y + 4, pw, h - 8, 2, INK);
  sh.print(px + Math.floor((pw - sh.measure('WANTED', 2)) / 2), y + 10, 'WANTED', 2, INK);
  // silhouette: head and shoulders
  const cx = px + Math.floor(pw / 2);
  sh.blob(cx, y + 34, 11, [70, 64, 58]);
  sh.wedge(cx - 20, y + 62, cx + 20, y + 62, cx, y + 44, [70, 64, 58]);
  sh.box(cx - 20, y + 56, 40, 8, [70, 64, 58]);
  // red CAUGHT stamp bar across the poster bottom (text sits inside the bar)
  sh.box(px + 4, y + h - 26, pw - 8, 18, RED);
  sh.print(px + Math.floor((pw - sh.measure('CAUGHT', 2)) / 2), y + h - 22, 'CAUGHT', 2, WHITE);
}

// WASHINGTON: the Capitol dome behind a giant copper penny, crossed out.
function scenePenny(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, SKY);
  sh.blob(x + w - 40, y + 14, 10, [255, 226, 150]);
  // Capitol dome silhouette, small, at the back
  const bx = x + 16, by = y + h - 30;
  sh.box(bx, by - 22, 74, 22, [240, 240, 236]);
  sh.oval(bx + 37, by - 24, 20, 12, [240, 240, 236]);
  sh.box(bx + 35, by - 40, 4, 10, [240, 240, 236]);
  sh.box(bx + 6, by - 12, 8, 12, [200, 200, 196]);
  sh.box(bx + 60, by - 12, 8, 12, [200, 200, 196]);
  // giant copper penny, right side
  const cx = x + Math.floor(w * 0.68), cy = y + Math.floor(h * 0.46), r = 30;
  sh.blob(cx, cy, r, [184, 110, 62]);
  sh.blob(cx, cy, r - 5, [206, 134, 82]);
  // red cross-out, then the 1 on top in a pale tone so it still reads
  sh.stroke(cx - 24, cy - 24, cx + 24, cy + 24, 5, RED);
  sh.stroke(cx + 24, cy - 24, cx - 24, cy + 24, 5, RED);
  sh.print(cx - 8, cy - 12, '1', 3, [255, 232, 200]);
}

// CULTURE: neon dusk over a game-city skyline, a giant VI.
function sceneGta(sh: Sheet, x: number, y: number, w: number, h: number): void {
  sh.box(x, y, w, h, [64, 30, 92]); // dusk purple
  sh.box(x, y + Math.floor(h * 0.42), w, Math.floor(h * 0.16), [200, 80, 90]); // sunset band
  sh.blob(x + Math.floor(w * 0.74), y + 18, 15, [255, 120, 90]); // sun
  sh.blob(x + Math.floor(w * 0.74), y + 18, 10, [255, 176, 116]);
  // skyline silhouettes
  const base = y + h;
  const towers: [number, number, number][] = [[0.08, 0.40, 0.14], [0.24, 0.58, 0.12], [0.38, 0.34, 0.14], [0.54, 0.52, 0.12], [0.68, 0.30, 0.13]];
  for (const [fx, fh, fw] of towers) {
    const tx = x + Math.floor(w * fx), tw = Math.floor(w * fw), th = Math.floor(h * fh);
    sh.box(tx, base - th - 18, tw, th + 18, [22, 14, 42]);
    for (let r = 0; r < 2; r++) for (let c2 = 0; c2 < 3; c2++)
      sh.box(tx + 4 + c2 * 11, base - th - 10 + r * 13, 5, 6, (r + c2) % 2 ? [255, 210, 90] : [90, 220, 220]);
  }
  sh.box(x, base - 18, w, 18, [14, 10, 28]); // street
  // giant VI, gold with a pink shadow offset down-right
  sh.print(x + 12, y + 8, 'VI', 5, [255, 90, 140]);
  sh.print(x + 8, y + 4, 'VI', 5, [255, 210, 90]);
}

// ------------------------------------------------------------------ entry --
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
const sheet = new Sheet();
drawPage(sheet);
writeFileSync(join(outDir, 'entry.png'), encodePNG(sheet));
