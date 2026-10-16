// Gera o GIF glitch do "Sobre Mim" usando Noto Sans Cherokee.
// pureimage (canvas 100% JS) + gifenc para o GIF animado.
import * as PImage from 'pureimage';
import { GIFEncoder, applyPalette } from './lib/gifenc.mjs';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const { make: makeImage, registerFont } = PImage;

// ---- config ----
const TEXT = 'ᏕᎧᏰᏒᏋ ᎷᎥᎷ';

const WIDTH = 460;
const HEIGHT = 110;
const FONT_SIZE = 42;
const BASELINE = 78;
const FRAMES = 40;
const DELAY = 80;
const SCALE = 2;

const FG = [143, 167, 255]; // #8fa7ff
const GLITCH_YELLOW = [243, 199, 95]; // #f3c75f
const GLITCH_BLUE = [56, 182, 255]; // #38b6ff
// cor reservada para o transparente (nao deve aparecer nas letras)
const TRANSPARENT = [0, 0, 0];

const here = dirname(fileURLToPath(import.meta.url));
const registered = registerFont(join(here, 'fonts', 'NotoSansCherokee.ttf'), 'NotoSansCherokee');
registered.loadSync();

const font = `${FONT_SIZE * SCALE} NotoSansCherokee`;

const W = WIDTH * SCALE;
const H = HEIGHT * SCALE;

// medir a frase inteira para manter o centro estável durante o glitch
const measure = makeImage(W, H);
const mctx = measure.getContext('2d');
mctx.font = font;
const textWidth = mctx.measureText(TEXT).width;
const startX = (W - textWidth) / 2;

// ---- desenhar frames ----
const frames = [];
for (let f = 0; f < FRAMES; f++) {
  const img = makeImage(W, H);
  const ctx = img.getContext('2d');
  const phase = f % 10;
  const glitch = phase === 2 || phase === 3 || phase === 7;
  const shift = phase === 2 ? 5 * SCALE : phase === 3 ? -4 * SCALE : 3 * SCALE;

  // fundo transparente: nao pinta nada
  ctx.clearRect(0, 0, W, H);
  ctx.font = font;

  if (glitch) {
    ctx.fillStyle = `rgb(${GLITCH_YELLOW[0]},${GLITCH_YELLOW[1]},${GLITCH_YELLOW[2]})`;
    ctx.fillText(TEXT, startX + shift, BASELINE * SCALE);
    ctx.fillStyle = `rgb(${GLITCH_BLUE[0]},${GLITCH_BLUE[1]},${GLITCH_BLUE[2]})`;
    ctx.fillText(TEXT, startX - shift, BASELINE * SCALE);
  }

  ctx.fillStyle = `rgb(${FG[0]},${FG[1]},${FG[2]})`;
  ctx.fillText(TEXT, startX + (glitch ? (phase % 2 ? -2 : 2) * SCALE : 0), BASELINE * SCALE);

  if (glitch) {
    const bandY = (BASELINE - FONT_SIZE + (phase * 7) % FONT_SIZE) * SCALE;
    ctx.fillStyle = `rgb(${phase === 3 ? GLITCH_YELLOW : GLITCH_BLUE})`;
    ctx.fillRect(startX + shift, bandY, textWidth * 0.18, 2 * SCALE);

    const blocks = [
      [0.04, 0.12, 6], [0.16, 0.72, 8], [0.29, 0.28, 5], [0.43, 0.82, 10],
      [0.57, 0.18, 6], [0.68, 0.58, 8], [0.82, 0.12, 5], [0.93, 0.70, 7],
    ];
    for (let i = 0; i < blocks.length; i++) {
      const [xRatio, yRatio, size] = blocks[i];
      const jitterX = ((f + i * 3) % 5 - 2) * SCALE;
      const jitterY = ((f + i) % 3 - 1) * SCALE;
      const color = (f + i) % 2 ? GLITCH_YELLOW : GLITCH_BLUE;
      ctx.fillStyle = `rgb(${color})`;
      ctx.fillRect(
        startX + textWidth * xRatio + jitterX,
        (BASELINE - FONT_SIZE + FONT_SIZE * yRatio) * SCALE + jitterY,
        size * SCALE,
        size * SCALE,
      );
    }
  }

  frames.push(img);
}

// ---- montar GIF (paleta fixa com transparencia) ----
const gif = GIFEncoder();
// indice 0 = transparente
const palette = [
  TRANSPARENT,
  [FG[0], FG[1], FG[2]],
  GLITCH_YELLOW,
  GLITCH_BLUE,
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

const out = join(here, '..', 'assends', 'about-me-glitch-ciano.gif');
writeFileSync(out, bytes);
console.log('GIF gerado:', out, bytes.length, 'bytes');
