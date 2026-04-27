/* eslint-disable */
/**
 * Generate app icon / adaptive-icon / splash / favicon from brand SVG.
 * Run: node scripts/generate-icons.js
 *
 * Uses text-to-svg to rasterize "nom" via the PermanentMarker TTF into SVG paths
 * (librsvg doesn't honor @font-face embedded fonts reliably), then sharp for PNG.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const TextToSVG = require('text-to-svg');

const ORANGE = '#FF6B1A';
const INK = '#141216';
const PAPER = '#FAF5EC';

const FONT_PATH = path.join(
  __dirname,
  '..',
  'assets',
  'fonts',
  'PermanentMarker-Regular.ttf'
);
const textRenderer = TextToSVG.loadSync(FONT_PATH);

// Splat path — a blob roughly centered in a 1024×1024 viewbox.
const SPLAT_PATH_1024 =
  'M 512 120 C 620 110 720 160 800 240 C 880 320 920 440 900 560 C 880 680 820 760 720 820 ' +
  'C 620 870 500 890 400 860 C 300 830 220 770 170 670 C 120 570 120 440 180 340 ' +
  'C 240 240 340 160 440 130 C 472 122 492 120 512 120 Z';

function splatSvg(size, color) {
  return `
    <g transform="rotate(-6 ${size / 2} ${size / 2})">
      <path d="${SPLAT_PATH_1024}" fill="${color}"
            transform="translate(${(size - 1024) / 2} ${(size - 1024) / 2})"/>
      <circle cx="${size * 0.86}" cy="${size * 0.30}" r="${size * 0.04}" fill="${color}"/>
      <circle cx="${size * 0.15}" cy="${size * 0.72}" r="${size * 0.035}" fill="${color}"/>
      <circle cx="${size * 0.78}" cy="${size * 0.82}" r="${size * 0.028}" fill="${color}"/>
    </g>`;
}

/** Render "nom" as centered SVG path data. */
function nomPaths(fontSize, fillColor, shadowColor) {
  const shadowOffset = Math.max(2, fontSize * 0.02);
  const ink = textRenderer.getD('nom', {
    x: 0,
    y: 0,
    fontSize,
    anchor: 'center middle',
  });
  return `
    <g>
      <path d="${ink}" fill="${shadowColor}"
            transform="translate(${shadowOffset} ${shadowOffset})"/>
      <path d="${ink}" fill="${fillColor}"/>
    </g>`;
}

function iconSvg(size, bg) {
  const fontSize = size * 0.38;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
     viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="${bg}"/>
  ${splatSvg(size, ORANGE)}
  <g transform="translate(${size / 2} ${size / 2}) rotate(-4)">
    ${nomPaths(fontSize, INK, bg)}
  </g>
</svg>`;
}

function adaptiveIconSvg(size) {
  // Adaptive icons need the art centered in the inner ~66% safe zone.
  const inner = size * 0.68;
  const offset = (size - inner) / 2;
  const fontSize = inner * 0.38;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"
     viewBox="0 0 ${size} ${size}">
  <g transform="translate(${offset} ${offset})">
    ${splatSvg(inner, ORANGE)}
    <g transform="translate(${inner / 2} ${inner / 2}) rotate(-4)">
      ${nomPaths(fontSize, INK, PAPER)}
    </g>
  </g>
</svg>`;
}

function splashSvg(width, height, bg) {
  const mark = Math.min(width, height) * 0.6;
  const cx = width / 2;
  const cy = height / 2;
  const fontSize = mark * 0.38;
  return `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="${bg}"/>
  <g transform="translate(${cx - mark / 2} ${cy - mark / 2})">
    ${splatSvg(mark, ORANGE)}
    <g transform="translate(${mark / 2} ${mark / 2}) rotate(-4)">
      ${nomPaths(fontSize, INK, bg)}
    </g>
  </g>
</svg>`;
}

async function render(svg, outPath) {
  const buf = Buffer.from(svg);
  await sharp(buf, { density: 300 }).png().toFile(outPath);
  console.log('✓', path.relative(process.cwd(), outPath));
}

async function main() {
  const out = path.join(__dirname, '..', 'assets');

  await render(iconSvg(1024, PAPER), path.join(out, 'icon.png'));
  await render(adaptiveIconSvg(1024), path.join(out, 'adaptive-icon.png'));
  await render(splashSvg(1242, 2688, PAPER), path.join(out, 'splash.png'));
  await render(iconSvg(256, PAPER), path.join(out, 'favicon.png'));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
