// news-image-20261121 — "The Daily Globe" front page for Saturday 21 November 2026.
// Written from scratch in this session. Node 22 stdlib only, no network at run time.
// Draws a newspaper front page onto a 1024x1024 RGB canvas, then encodes it as PNG.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette: cream paper, black ink, deep navy, brick red, slate grey ----
const PAPER: [number, number, number] = [247, 242, 231];
const INK: [number, number, number] = [24, 24, 22];
const NAVY: [number, number, number] = [18, 34, 64];
const NAVY_SOFT: [number, number, number] = [38, 58, 96];
const RED: [number, number, number] = [178, 34, 28];
const GREY: [number, number, number] = [96, 96, 92];
const LIGHT: [number, number, number] = [232, 226, 212];
const WHITE: [number, number, number] = [252, 250, 246];

// ---- raw RGB canvas -------------------------------------------------------
const px = new Uint8Array(W * H * 3);

function put(x: number, y: number, c: [number, number, number]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: [number, number, number]): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) put(xx, yy, c);
  }
}

function frame(x: number, y: number, w: number, h: number, c: [number, number, number], t = 2): void {
  rect(x, y, w, t, c);
  rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c);
  rect(x + w - t, y, t, h, c);
}

function hline(x: number, y: number, w: number, c: [number, number, number], t = 2): void {
  rect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: [number, number, number], t = 2): void {
  rect(x, y, t, h, c);
}

// Bresenham line, thickness 1..3 by stamping small squares.
function line(x0: number, y0: number, x1: number, y1: number, c: [number, number, number], t = 2): void {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  for (;;) {
    rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
}

// ---- PNG encoding (zlib from Node stdlib; CRC32 table built at run time) ----
const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let v = n;
  for (let k = 0; k < 8; k++) v = (v & 1) ? (0xedb88320 ^ (v >>> 1)) : (v >>> 1);
  CRC_TABLE[n] = v >>> 0;
}
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---- bitmap font: my own 5x7 design, one string per row, "#" = ink --------
// Uppercase only; lowercase input is uppercased. Unknown chars render blank.
const FONT: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11111", "00010", "00100", "00010", "00001", "10001", "01110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
};

function glyph(ch: string): string[] {
  return FONT[ch.toUpperCase()] ?? FONT[" "];
}

// Draw one glyph at scale s (each font pixel becomes an s x s block).
function drawGlyph(ch: string, x: number, y: number, s: number, c: [number, number, number]): void {
  const g = glyph(ch);
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === "1") rect(x + col * s, y + r * s, s, s, c);
    }
  }
}

// Width of a string at scale s (6 font units per char, minus trailing gap).
function textW(s: string, sc: number): number {
  return s.length === 0 ? 0 : s.length * 6 * sc - sc;
}
function drawText(s: string, x: number, y: number, sc: number, c: [number, number, number]): void {
  for (let i = 0; i < s.length; i++) drawGlyph(s[i], x + i * 6 * sc, y, sc, c);
}
function drawTextCentered(s: string, cx: number, y: number, sc: number, c: [number, number, number]): void {
  drawText(s, cx - Math.floor(textW(s, sc) / 2), y, sc, c);
}

// Greedy word wrap into lines that fit maxW pixels at scale sc.
function wrap(s: string, sc: number, maxW: number): string[] {
  const words = s.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const trial = cur === "" ? w : cur + " " + w;
    if (textW(trial, sc) <= maxW) { cur = trial; continue; }
    if (cur !== "") lines.push(cur);
    cur = w;
  }
  if (cur !== "") lines.push(cur);
  return lines;
}
function drawPara(s: string, x: number, y: number, sc: number, maxW: number, c: [number, number, number], gap = 4): number {
  const lines = wrap(s, sc, maxW);
  lines.forEach((ln, i) => drawText(ln, x, y + i * (7 * sc + gap), sc, c));
  return y + lines.length * (7 * sc + gap);
}

// ---- page furniture --------------------------------------------------------
// Small red kicker tag: white text on a red bar.
function kicker(tag: string, x: number, y: number, sc = 2): number {
  const w = textW(tag, sc) + 16;
  rect(x, y, w, 7 * sc + 8, RED);
  drawText(tag, x + 8, y + 4, sc, WHITE);
  return w;
}

// A headline that may wrap to at most two lines, left aligned.
function headline(s: string, x: number, y: number, sc: number, maxW: number, c: [number, number, number] = INK): number {
  const lines = wrap(s, sc, maxW).slice(0, 2);
  lines.forEach((ln, i) => drawText(ln, x, y + i * (7 * sc + 5), sc, c));
  return y + lines.length * (7 * sc + 5);
}

// One story block: kicker, headline, body paragraph, dateline in grey.
function story(x: number, y: number, w: number, tag: string, head: string, body: string, place: string, headSc = 3): number {
  kicker(tag, x, y);
  let cy = y + 7 * 2 + 12;
  cy = headline(head, x, cy, headSc, w);
  cy += 8;
  drawText(place + " -", x, cy, 2, GREY);
  const lead = textW(place + " - ", 2);
  cy = drawPara(body, x + lead, cy, 2, w - lead, INK, 3);
  return cy;
}

// Falling-market chart: axes, gridlines, a steep red polyline, end labels.
function marketChart(x: number, y: number, w: number, h: number): void {
  frame(x, y, w, h, INK, 2);
  const gx = x + 34, gy = y + 12, gw = w - 48, gh = h - 40;
  for (let i = 1; i <= 3; i++) {
    const yy = gy + Math.floor((gh * i) / 4);
    line(gx, yy, gx + gw, yy, LIGHT, 1);
  }
  line(gx, gy + gh, gx + gw, gy + gh, INK, 2); // x axis
  line(gx, gy, gx, gy + gh, INK, 2); // y axis
  drawText("NASDAQ", x + 6, y + 4, 1, GREY);
  drawText("-5.3%", x + w - 34, y + 4, 1, RED);
  // A week of falling closes, steepening into Friday.
  const pts: [number, number][] = [
    [0, 0.08], [0.14, 0.16], [0.28, 0.14], [0.42, 0.30],
    [0.56, 0.38], [0.70, 0.52], [0.84, 0.72], [1, 0.97],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    const ax = gx + Math.floor(pts[i][0] * gw);
    const ay = gy + Math.floor(pts[i][1] * gh);
    const bx = gx + Math.floor(pts[i + 1][0] * gw);
    const by = gy + Math.floor(pts[i + 1][1] * gh);
    line(ax, ay, bx, by, RED, 3);
  }
  drawText("MON", gx - 2, gy + gh + 6, 1, GREY);
  drawText("FRI", gx + gw - 18, gy + gh + 6, 1, GREY);
}

// Simple globe: circle, equator, two meridians, a few land dots.
function globe(cx: number, cy: number, r: number, c: [number, number, number]): void {
  const steps = 72;
  for (let i = 0; i < steps; i++) {
    const a0 = (i / steps) * Math.PI * 2, a1 = ((i + 1) / steps) * Math.PI * 2;
    line(Math.round(cx + r * Math.cos(a0)), Math.round(cy + r * Math.sin(a0)),
      Math.round(cx + r * Math.cos(a1)), Math.round(cy + r * Math.sin(a1)), c, 2);
  }
  line(cx - r, cy, cx + r, cy, c, 1);
  for (let k = -1; k <= 1; k++) {
    for (let i = 0; i < steps; i++) {
      const a0 = (i / steps) * Math.PI, a1 = ((i + 1) / steps) * Math.PI;
      const rx = r * 0.55;
      line(Math.round(cx + rx * Math.cos(a0) + k * r * 0.28), Math.round(cy + r * Math.sin(a0) * 0.96),
        Math.round(cx + rx * Math.cos(a1) + k * r * 0.28), Math.round(cy + r * Math.sin(a1) * 0.96), c, 1);
    }
  }
  // Land dots, roughly placed.
  const dots: [number, number][] = [[-0.45, -0.3], [-0.3, -0.1], [0.1, -0.45], [0.3, -0.2], [0.55, 0.25], [-0.15, 0.4], [0.35, 0.5]];
  for (const [dx, dy] of dots) rect(Math.round(cx + dx * r), Math.round(cy + dy * r), 4, 4, c);
}

// ---- the front page --------------------------------------------------------
function drawPage(): void {
  rect(0, 0, W, H, PAPER);
  frame(8, 8, W - 16, H - 16, INK, 3);

  // Masthead: navy band, globe at left, paper name, date line.
  rect(14, 14, W - 28, 132, NAVY);
  globe(86, 80, 44, WHITE);
  drawText("THE DAILY GLOBE", 152, 34, 7, WHITE);
  hline(152, 96, W - 152 - 40, WHITE, 2);
  drawText("SATURDAY, 21 NOVEMBER 2026", 152, 108, 3, WHITE);
  drawText("NO. 325", 900, 108, 2, [190, 200, 220]);

  // Thin rule + edition line under the masthead.
  hline(14, 152, W - 28, INK, 3);
  drawTextCentered("MARKETS ROUT  -  MISSILES AT RIYADH  -  KINGPIN CAUGHT  -  PENNY ENDS", W / 2, 164, 2, NAVY);

  // ---- Lead story: the market rout, left column with chart -----------------
  const leadY = 196;
  hline(24, leadY - 8, W - 48, INK, 2);
  kicker("LEAD STORY - MARKETS", 24, leadY);
  let cy = headline("MARKETS IN FREEFALL", 24, leadY + 34, 6, 620);
  cy += 10;
  cy = drawPara(
    "Wall Street's AI sell-off deepened on Friday. The Nasdaq fell 5.3% in a day and 10% in a week, its worst week since 2020, wiping out all its gains for 2026. The S&P 500 slid 3.7% into correction, and Bitcoin fell below $57,000.",
    24, cy, 2, 620, INK, 4,
  );
  marketChart(24, cy + 12, 620, 150);
  drawText("NEW YORK - THE ROUT CAPPED A WEEK OF GROWING", 24, cy + 172, 2, GREY);
  drawText("DOUBTS OVER AI SPENDING. NVIDIA FELL 14% FRIDAY.", 24, cy + 190, 2, GREY);

  // ---- Right rail: Gulf + Bahrain ------------------------------------------
  const railX = 676;
  vline(660, leadY, 470, INK, 2);
  let ry = story(railX, leadY, 324, "MIDDLE EAST", "MISSILES AT RIYADH",
    "Saudi defences destroyed three Houthi missiles fired at Riyadh early on Saturday, the third night running. Two tankers were also hit near Hormuz.",
    "RIYADH", 3);
  ry += 18;
  hline(railX, ry, 324, LIGHT, 2);
  ry += 16;
  ry = story(railX, ry, 324, "GULF", "IRAN HITS US BASES IN BAHRAIN",
    "Iran said it struck two US bases in Bahrain on Saturday night. Bahrain reported a fire at an industrial site.",
    "MANAMA", 3);
  ry += 18;
  hline(railX, ry, 324, LIGHT, 2);
  ry += 14;
  drawText("ALSO: DENMARK EXPELLED RUSSIA'S DEFENCE ATTACHE.", railX, ry, 1, INK);

  // ---- Middle band: Ukraine + Mexico, two columns --------------------------
  const midY = 700;
  hline(24, midY, W - 48, INK, 3);
  const colW = 470;
  let my = story(24, midY + 16, colW, "EUROPE - WAR", "WAR SPILLS OVER",
    "A Russian missile hit Kryvyi Rih, killing two people. Missiles also landed in Poland. Ukraine struck a cargo ship bound for Kaliningrad in the Gulf of Finland.",
    "KYIV", 3);
  vline(512, midY + 16, 150, INK, 2);
  my = story(528, midY + 16, colW, "AMERICAS - CRIME", "CARTEL KINGPIN CAUGHT",
    "Mexico captured Fausto Isidro Meza-Flores, 'Chapo Isidro', one of the FBI's ten most wanted, in a raid in Sinaloa. Eleven people were killed in the fighting.",
    "GUASAVE", 3);
  void my;

  // ---- Bottom strip: penny + GTA VI -----------------------------------------
  const botY = 884;
  hline(24, botY, W - 48, INK, 3);
  rect(24, botY + 12, 470, 96, LIGHT);
  frame(24, botY + 12, 470, 96, NAVY, 2);
  drawText("THE PENNY ENDS", 40, botY + 28, 3, NAVY);
  drawPara("Trump signed the Common Cents Act, ending penny production.",
    40, botY + 56, 2, 440, INK, 3);
  rect(530, botY + 12, 470, 96, NAVY);
  drawText("GTA VI'S $2.36BN DAY", 546, botY + 28, 3, WHITE);
  drawPara("Grand Theft Auto VI sold an estimated 24.59m copies on its first day.",
    546, botY + 56, 2, 440, WHITE, 3);

  // Footer.
  drawTextCentered("THE DAILY GLOBE  -  SATURDAY 21 NOVEMBER 2026  -  ALL THE DAY'S WORLD NEWS ON ONE PAGE", W / 2, 996, 1, GREY);
}

// ---- entry point -----------------------------------------------------------
function main(): void {
  drawPage();
  const png = encodePng();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, png);
}

main();
