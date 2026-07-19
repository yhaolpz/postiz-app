#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const outDir = path.join(
  root,
  'var/ai-video-pipeline/branding/tiny-agent-youtube'
);
const sourceDir = path.join(outDir, 'source');
const uploadDir = path.join(outDir, 'upload');
const archiveDir = path.join(outDir, 'archive');
const characterPath = path.join(sourceDir, 'banner-characters-v2.png');
const bannerPath = path.join(
  uploadDir,
  'UPLOAD-THIS-tiny-agent-youtube-banner-v3.png'
);
const desktopPreviewPath = path.join(
  outDir,
  'tiny-agent-youtube-banner-v3.desktop-preview.png'
);
const pcPreviewPath = path.join(
  outDir,
  'tiny-agent-youtube-banner-v3.pc-preview-2226x338.png'
);
const safeCheckPath = path.join(
  outDir,
  'tiny-agent-youtube-banner-v3.safe-area-check.png'
);

const canvas = { width: 2560, height: 1440 };
const safe = { left: 507, top: 508, width: 1546, height: 423 };

await mkdir(outDir, { recursive: true });
await mkdir(sourceDir, { recursive: true });
await mkdir(uploadDir, { recursive: true });
await mkdir(archiveDir, { recursive: true });

const characterCluster = await sharp(characterPath)
  .trim()
  .resize({ height: 350, fit: 'inside', withoutEnlargement: true })
  .png()
  .toBuffer();

const layoutSvg = Buffer.from(`
<svg width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="grid" width="96" height="96" patternUnits="userSpaceOnUse">
      <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#DDE0DA" stroke-width="2" opacity="0.28"/>
    </pattern>
  </defs>
  <rect width="2560" height="1440" fill="#ECECEA"/>
  <rect width="2560" height="1440" fill="url(#grid)"/>

  <!-- Full-canvas atmosphere for TV; intentionally non-critical. -->
  <path d="M100 250 C320 90 560 330 790 170" fill="none" stroke="#C9CBC5" stroke-width="8" stroke-linecap="round" stroke-dasharray="16 30" opacity="0.72"/>
  <path d="M1790 1215 C1990 1060 2230 1290 2470 1090" fill="none" stroke="#C9CBC5" stroke-width="8" stroke-linecap="round" stroke-dasharray="16 30" opacity="0.72"/>
  <circle cx="315" cy="1110" r="20" fill="#FFC933"/>
  <circle cx="2235" cy="250" r="20" fill="#168FE5"/>
  <circle cx="2310" cy="1085" r="17" fill="#FF4040"/>
  <path d="M300 1020 h150 M375 945 v150" stroke="#168FE5" stroke-width="11" stroke-linecap="round" opacity="0.22"/>
  <path d="M2100 190 l110 110 M2210 190 l-110 110" stroke="#111413" stroke-width="11" stroke-linecap="round" opacity="0.10"/>

  <!-- Desktop-safe composition: no card, frame, or stretched artwork. -->
  <ellipse cx="1775" cy="720" rx="245" ry="175" fill="#DDE0DA" opacity="0.62"/>
  <path d="M1515 835 C1650 900 1860 900 2010 805" fill="none" stroke="#168FE5" stroke-width="8" stroke-linecap="round" opacity="0.72"/>
  <circle cx="1495" cy="600" r="13" fill="#FFC933"/>
  <path d="M1474 600 h42 M1495 579 v42" stroke="#111413" stroke-width="5" stroke-linecap="round" opacity="0.65"/>

  <text x="590" y="697" font-family="Hiragino Sans GB, sans-serif" font-weight="700" font-size="100" letter-spacing="7" fill="#111413">TINY AGENT</text>
  <path d="M590 728 C800 713 1035 713 1280 727" fill="none" stroke="#168FE5" stroke-width="10" stroke-linecap="round"/>
  <text x="594" y="797" font-family="Chalkboard SE, sans-serif" font-size="34" fill="#111413">Tiny Agent helps you get better at using AI.</text>
</svg>
`);

await sharp(layoutSvg)
  .composite([{ input: characterCluster, left: 1595, top: 548 }])
  .toColorspace('srgb')
  .withIccProfile('srgb')
  .png({ compressionLevel: 9, adaptiveFiltering: true })
  .toFile(bannerPath);

await sharp(bannerPath)
  .extract({ left: 0, top: safe.top, width: canvas.width, height: safe.height })
  .png({ compressionLevel: 9 })
  .toFile(desktopPreviewPath);

await sharp(desktopPreviewPath)
  .resize(2226, 338, { fit: 'cover', position: 'centre' })
  .png({ compressionLevel: 9 })
  .toFile(pcPreviewPath);

const safeOverlay = Buffer.from(`
<svg width="2560" height="1440" xmlns="http://www.w3.org/2000/svg">
  <rect x="${safe.left}" y="${safe.top}" width="${safe.width}" height="${safe.height}" fill="none" stroke="#FF4040" stroke-width="8" stroke-dasharray="24 16"/>
</svg>
`);

await sharp(bannerPath)
  .composite([{ input: safeOverlay, left: 0, top: 0 }])
  .png({ compressionLevel: 9 })
  .toFile(safeCheckPath);

const bannerMeta = await sharp(bannerPath).metadata();
const previewMeta = await sharp(pcPreviewPath).metadata();

await writeFile(
  path.join(outDir, 'qa-v3.json'),
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      canvas,
      safeArea: safe,
      output: path.relative(root, bannerPath),
      desktopPreview: path.relative(root, desktopPreviewPath),
      pcPreview: path.relative(root, pcPreviewPath),
      dimensionsPass:
        bannerMeta.width === canvas.width &&
        bannerMeta.height === canvas.height,
      pcPreviewPass: previewMeta.width === 2226 && previewMeta.height === 338,
      colorSpace: bannerMeta.space,
      source: path.relative(root, characterPath),
      criticalContentBounds: {
        left: 590,
        top: 548,
        right: 1945,
        bottom: 898,
        insideSafeArea: true,
      },
    },
    null,
    2
  )}\n`
);

console.log(bannerPath);
console.log(pcPreviewPath);
