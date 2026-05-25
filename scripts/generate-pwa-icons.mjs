import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');

const srcAny = path.join(publicDir, 'app-icon.svg');
const srcMaskable = path.join(publicDir, 'app-icon-maskable.svg');

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function renderSvgToPng(inputPath, outputPath, size) {
  const svgBuffer = await fs.readFile(inputPath);
  await sharp(svgBuffer, { density: 300 })
    .resize(size, size)
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
}

async function main() {
  if (!(await exists(srcAny))) {
    console.warn(`[icons] Missing ${path.relative(rootDir, srcAny)}; skipping icon generation.`);
    return;
  }

  const tasks = [
    renderSvgToPng(srcAny, path.join(publicDir, 'apple-touch-icon.png'), 180),
    renderSvgToPng(srcAny, path.join(publicDir, 'pwa-192.png'), 192),
    renderSvgToPng(srcAny, path.join(publicDir, 'pwa-512.png'), 512),
  ];

  if (await exists(srcMaskable)) {
    tasks.push(renderSvgToPng(srcMaskable, path.join(publicDir, 'pwa-maskable-192.png'), 192));
    tasks.push(renderSvgToPng(srcMaskable, path.join(publicDir, 'pwa-maskable-512.png'), 512));
  }

  await Promise.all(tasks);
  console.log('[icons] Generated PWA/iOS PNG icons in public/.');
}

main().catch((err) => {
  console.error('[icons] Failed to generate icons:', err);
  process.exit(1);
});
