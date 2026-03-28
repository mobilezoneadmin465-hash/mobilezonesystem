/**
 * Generates PWA maskable + standard icons (requires: npm i -D sharp && node scripts/pwa-icons.mjs).
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "public", "icons");
mkdirSync(outDir, { recursive: true });

function svgFor(size, { maskable }) {
  const pad = maskable ? size * 0.1 : 0;
  const inner = size - pad * 2;
  const cx = size / 2;
  const cy = size / 2;
  const r = inner * 0.32;
  const stroke = size * 0.045;
  const fz = Math.round(size * 0.18);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="100%" height="100%" fill="#09090b"/>
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#14b8a6" stroke-width="${stroke}"/>
  <text x="${cx}" y="${cy + fz * 0.35}" text-anchor="middle" fill="#14b8a6" font-family="system-ui,Segoe UI,sans-serif" font-weight="700" font-size="${fz}">MZ</text>
</svg>`;
}

async function writePng(name, size, opts) {
  const buf = Buffer.from(svgFor(size, opts));
  await sharp(buf).png({ compressionLevel: 9 }).toFile(path.join(outDir, name));
}

await writePng("icon-192.png", 192, { maskable: false });
await writePng("icon-512.png", 512, { maskable: false });
await writePng("apple-touch-icon.png", 180, { maskable: false });
await writePng("icon-maskable-512.png", 512, { maskable: true });

console.log("PWA icons written to public/icons/");
