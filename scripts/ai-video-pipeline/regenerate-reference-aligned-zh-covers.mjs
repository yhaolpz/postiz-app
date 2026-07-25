#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const projectDir = path.join(
  repoRoot,
  'var/hyperframes-showcases/2026-07-24-03-agent-prompt-injection-regenerated-zh-CN',
);
const thumbnailDir = path.join(projectDir, 'thumbnails');
const referenceDir = path.join(
  repoRoot,
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/thumbnails',
);
const referenceIllustration = path.join(referenceDir, 'illustration.subject-transparent.png');
const illustration = path.join(thumbnailDir, 'illustration.subject-transparent.png');
const archiveDir = path.join(thumbnailDir, 'archive', 'pre-reference-alignment-2026-07-25');

const variants = [
  {
    key: '16x9',
    width: 1280,
    height: 720,
    output: 'thumbnail.zh-CN.16x9.png',
    svg: 'thumbnail.zh-CN.16x9.svg',
    preview: 'qa/thumbnail.zh-CN.16x9.256x144.png',
    previewSize: '256x144!',
    illustration: { x: 770, y: 62, width: 478, height: 596 },
    blueRule: { x: 44, y: 42, width: 176, height: 14, radius: 7 },
    yellowRule: { x: 44, y: 652, width: 675, height: 18, radius: 9 },
    title: [
      { text: 'AI Agent', y: 170, size: 138, blue: true },
      { text: '哪些动作', y: 360, size: 164 },
      { text: '要人确认？', y: 548, size: 142 },
    ],
    titleBox: { x: 42, y: 62, width: 680, height: 530 },
    composition: 'text-left complete-illustration-right title-hero; no opaque panel',
  },
  {
    key: '4x3',
    width: 1200,
    height: 900,
    output: 'thumbnail.zh-CN.4x3.png',
    svg: 'thumbnail.zh-CN.4x3.svg',
    preview: 'qa/thumbnail.zh-CN.4x3.240x180.png',
    previewSize: '240x180!',
    illustration: { x: 685, y: 245, width: 490, height: 620 },
    blueRule: { x: 38, y: 28, width: 168, height: 15, radius: 7 },
    yellowRule: { x: 38, y: 882, width: 640, height: 12, radius: 6 },
    title: [
      { text: 'AI Agent', y: 172, size: 156, blue: true },
      { text: '哪些动作', y: 382, size: 192 },
      { text: '必须由人', y: 600, size: 182 },
      { text: '确认？', y: 824, size: 210 },
    ],
    titleBox: { x: 34, y: 24, width: 650, height: 830 },
    composition: 'text-left complete-illustration-right title-hero; no opaque panel',
  },
  {
    key: '3x4',
    width: 900,
    height: 1200,
    output: 'thumbnail.zh-CN.3x4.png',
    svg: 'thumbnail.zh-CN.3x4.svg',
    preview: 'qa/thumbnail.zh-CN.3x4.180x240.png',
    previewSize: '180x240!',
    illustration: { x: 172, y: 744, width: 556, height: 432 },
    blueRule: { x: 36, y: 30, width: 170, height: 15, radius: 7 },
    yellowRule: { x: 36, y: 711, width: 828, height: 18, radius: 9 },
    title: [
      { text: 'AI Agent', y: 168, size: 146, blue: true },
      { text: '哪些动作', y: 352, size: 176 },
      { text: '必须由人', y: 536, size: 168 },
      { text: '确认？', y: 694, size: 178 },
    ],
    titleBox: { x: 32, y: 36, width: 834, height: 650 },
    composition: 'top-60-percent-title; bottom-40-percent-contained-illustration; no opaque panel',
  },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function svgFor(variant) {
  const title = variant.title.map(({ text, y, size, blue }) => (
    `<text x="42" y="${y}" font-size="${size}">${blue ? `<tspan fill="#117ABD">${escapeXml(text)}</tspan>` : escapeXml(text)}</text>`
  )).join('');
  const { blueRule, yellowRule, illustration: art } = variant;
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${variant.width}" height="${variant.height}" viewBox="0 0 ${variant.width} ${variant.height}">
  <defs><pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/></pattern></defs>
  <rect width="${variant.width}" height="${variant.height}" fill="#ECECEA"/>
  <rect width="${variant.width}" height="${variant.height}" fill="url(#paper-grid)"/>
  <image x="${art.x}" y="${art.y}" width="${art.width}" height="${art.height}" preserveAspectRatio="xMidYMid meet" xlink:href="illustration.subject-transparent.png"/>
  <rect x="${blueRule.x}" y="${blueRule.y}" width="${blueRule.width}" height="${blueRule.height}" rx="${blueRule.radius}" fill="#117ABD"/>
  <rect x="${yellowRule.x}" y="${yellowRule.y}" width="${yellowRule.width}" height="${yellowRule.height}" rx="${yellowRule.radius}" fill="#F4C542"/>
  <g fill="#111413" stroke="#ECECEA" stroke-width="${variant.key === '16x9' ? 9 : 11}" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="${variant.key === '16x9' ? -4 : -6}">${title}</g>
</svg>\n`;
}

function archiveCurrent() {
  fs.mkdirSync(archiveDir, { recursive: true });
  for (const variant of variants) {
    const current = path.join(thumbnailDir, variant.output);
    const destination = path.join(archiveDir, variant.output);
    if (fs.existsSync(current) && !fs.existsSync(destination)) fs.copyFileSync(current, destination);
  }
}

function info(file) {
  const [width, height, colorSpace] = run('identify', ['-format', '%w %h %[colorspace]', file]).split(/\s+/);
  return {
    path: path.basename(file),
    width: Number(width),
    height: Number(height),
    colorSpace,
    sizeBytes: fs.statSync(file).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  };
}

fs.mkdirSync(thumbnailDir, { recursive: true });
fs.mkdirSync(path.join(thumbnailDir, 'qa'), { recursive: true });
if (!fs.existsSync(referenceIllustration)) throw new Error(`Missing approved reference illustration: ${referenceIllustration}`);
archiveCurrent();
fs.copyFileSync(referenceIllustration, illustration);

const outputs = variants.map((variant) => {
  const svgPath = path.join(thumbnailDir, variant.svg);
  const outputPath = path.join(thumbnailDir, variant.output);
  const previewPath = path.join(thumbnailDir, variant.preview);
  const svg = svgFor(variant);
  if (!svg.includes('#117ABD') || !svg.includes('#F4C542') || svg.includes('#8A6500') || svg.includes('#C7362F')) {
    throw new Error(`Invalid reference-aligned title palette: ${variant.key}`);
  }
  fs.writeFileSync(svgPath, svg);
  run('rsvg-convert', ['-w', String(variant.width), '-h', String(variant.height), '-o', outputPath, svgPath]);
  run('magick', [outputPath, '-strip', '-colorspace', 'sRGB', outputPath]);
  run('magick', [outputPath, '-resize', variant.previewSize, '-strip', '-colorspace', 'sRGB', previewPath]);
  const image = info(outputPath);
  const preview = info(previewPath);
  if (image.width !== variant.width || image.height !== variant.height || image.colorSpace !== 'sRGB' || image.sizeBytes > 2 * 1024 * 1024) {
    throw new Error(`Image QA failed: ${variant.key}`);
  }
  const spec = {
    language: 'zh-CN',
    aspectRatio: variant.key,
    width: variant.width,
    height: variant.height,
    headline: 'AI Agent 哪些动作要人确认？',
    titleLines: variant.title.map(({ text }) => text),
    titleIdentity: true,
    referenceLayout: '2026-07-23-approved-title-hero',
    referenceSvg: path.relative(projectDir, path.join(referenceDir, `thumbnail.zh-CN${variant.key === '16x9' ? '' : `.${variant.key}`}.svg`)),
    illustration: 'illustration.subject-transparent.png',
    illustrationSource: path.relative(projectDir, referenceIllustration),
    illustrationFit: 'contain',
    titleBox: variant.titleBox,
    titlePalette: { agentIdentity: '#117ABD', remainingTitle: '#111413', decorativeRule: '#F4C542' },
    composition: variant.composition,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
  };
  fs.writeFileSync(path.join(thumbnailDir, `thumbnail-spec.zh-CN.${variant.key}.json`), `${JSON.stringify(spec, null, 2)}\n`);
  return { aspectRatio: variant.key, image, preview, titleColors: ['#117ABD', '#111413'], decorativeRule: '#F4C542' };
});

fs.writeFileSync(path.join(thumbnailDir, 'qa', 'reference-alignment-qa.json'), `${JSON.stringify({
  checkedAt: new Date().toISOString(),
  status: 'pass',
  reference: path.relative(projectDir, referenceDir),
  checks: {
    referenceAgentAsset: true,
    shortBlueTopRule: true,
    blueBlackTitleOnly: true,
    yellowRuleNotTitleUnderline: true,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
    archivedPreviousCovers: true,
  },
  outputs,
}, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({ status: 'pass', project: path.relative(repoRoot, projectDir), outputs }, null, 2)}\n`);
