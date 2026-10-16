// Gera MariaeduardAiro/assends/about-me-letters.gif
// Texto "██▓▒░Ⓢⓞⓑⓡⓔ Ⓜⓘⓜ" com cada letra pulando uma por uma (efeito bounce).
// pureimage (canvas 100% JS) + gifenc para o GIF animado.
import * as PImage from 'pureimage';
import { GIFEncoder, applyPalette } from './lib/gifenc.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { make: makeImage, registerFont } = PImage;

// ---- config ----
const TEXT = '██▓▒░Ⓢⓞⓑⓡⓔ Ⓜⓘⓜ';
const LETTERS = [...TEXT];

const WIDTH = 420;
const HEIGHT = 100;
const FONT_SIZE = 26;
const BASELINE = 64;
const JUMP = 32;           // altura do salto (bem visivel)
const FRAMES = 40;         // frames por loop
const DELAY = 45;          // ms por frame (mais rapido)
const GAP = 2;             // espacamento entre letras
const OVERLAP = 0.07;      // atraso de cada letra em relacao a anterior
const JUMP_PORTION = 0.30; // fracao do ciclo em que a letra fica no ar
const SCALE = 2;           // supersampling p/ antialias

const BG = [17, 20, 32];
const FG = [243, 199, 95]; // #c1b1fa
// cor reservada para o transparente (nao deve aparecer nas letras)
const TRANSPARENT = [0, 0, 0];

const registered = registerFont('C:/Windows/Fonts/seguisym.ttf', 'SegoeSym');
registered.loadSync();

const font = `${FONT_SIZE * SCALE} SegoeSym`;

const W = WIDTH * SCALE;
const H = HEIGHT * SCALE;

// medir cada letra
const measure = makeImage(W, H);
const mctx = measure.getContext('2d');
mctx.font = font;
const widths = LETTERS.map((ch) => mctx.measureText(ch).width);
const totalW = widths.reduce((a, b) => a + b, 0) + GAP * SCALE * (LETTERS.length - 1);
const startX = (W - totalW) / 2;

const xPos = [];
let cx = startX;
for (let i = 0; i < LETTERS.length; i++) {
  xPos.push(cx);
  cx += widths[i] + GAP * SCALE;
}

// ---- desenhar frames ----
const frames = [];
for (let f = 0; f < FRAMES; f++) {
  const img = makeImage(W, H);
  const ctx = img.getContext('2d');
  const t = f / FRAMES;

  // fundo transparente: nao pinta nada
  ctx.clearRect(0, 0, W, H);
  ctx.font = font;

  for (let i = 0; i < LETTERS.length; i++) {
    let p = (t - i * OVERLAP) % 1;
    if (p < 0) p += 1;
    let offset = 0;
    if (p < JUMP_PORTION) {
      const s = p / JUMP_PORTION; // 0..1
      // sobe devagar no inicio, cai com "quique" (ease-in)
      offset = -Math.sin(s * Math.PI) * JUMP * SCALE;
    }

    // sombra que encolhe conforme a letra sobe
    const lift = offset === 0 ? 0 : -offset / (JUMP * SCALE); // 0 no chao, 1 no ar
    const sx = xPos[i] + widths[i] / 2;
    const sy = BASELINE * SCALE + 7 * SCALE;
    const shadowScale = 1 - lift * 0.55;
    const shadowAlpha = 0.4 - lift * 0.28;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.scale(widths[i] * 0.45 * shadowScale, 3.5 * SCALE * shadowScale);
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.restore();

    // letra
    ctx.fillStyle = `rgb(${FG[0]},${FG[1]},${FG[2]})`;
    ctx.fillText(LETTERS[i], xPos[i], BASELINE * SCALE + offset);
  }

  frames.push(img);
}

// ---- montar GIF (paleta fixa com transparencia) ----
const gif = GIFEncoder();
// indice 0 = transparente
const palette = [
  TRANSPARENT,
  [FG[0], FG[1], FG[2]],
  [Math.round(FG[0] * 0.75), Math.round(FG[1] * 0.75), Math.round(FG[2] * 0.75)],
  [Math.round(FG[0] * 0.5), Math.round(FG[1] * 0.5), Math.round(FG[2] * 0.5)],
  [Math.round(FG[0] * 0.25), Math.round(FG[1] * 0.25), Math.round(FG[2] * 0.25)],
  [255, 255, 255],
];

for (const img of frames) {
  const rgba = img.data; // Uint8Array RGBA na resolucao W x H
  const out = new Uint8Array(WIDTH * HEIGHT * 4);
  for (let y = 0; y < HEIGHT; y++) {
    for (let x = 0; x < WIDTH; x++) {
      const si = ((y * SCALE) * W + x * SCALE) * 4;
      const di = (y * WIDTH + x) * 4;
      const alpha = rgba[si + 3];
      if (alpha < 40) {
        // pixel quase invisivel -> transparente
        out[di] = 0;
        out[di + 1] = 0;
        out[di + 2] = 0;
        out[di + 3] = 0;
      } else {
        out[di] = rgba[si];
        out[di + 1] = rgba[si + 1];
        out[di + 2] = rgba[si + 2];
        out[di + 3] = 255;
      }
    }
  }
  const index = applyPalette(out, palette, 'rgb444');
  gif.writeFrame(index, WIDTH, HEIGHT, {
    palette,
    delay: DELAY,
    transparent: true,
    transparentIndex: 0,
    dispose: 2,
  });
}

gif.finish();
const bytes = gif.bytes();

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'assends', 'about-me-letters.gif');
writeFileSync(out, bytes);
console.log('GIF gerado:', out, bytes.length, 'bytes');
