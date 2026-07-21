#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const enDir = path.join(repoRoot, 'var/hyperframes-showcases/2026-07-20-15-ai-fluency-review-longform-en-US/thumbnails');
const zhDir = path.join(repoRoot, 'var/hyperframes-showcases/2026-07-20-15-ai-fluency-review-longform-zh-CN/thumbnails');
const youtubeRenderer = path.join(repoRoot, 'scripts/ai-video-pipeline/render-tiny-agent-youtube-thumbnail.mjs');

function run(command, args, cwd = repoRoot) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function write(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, value);
}

function gridDefs() {
  return `<defs><pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M 48 0 L 0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/></pattern></defs>`;
}

function canvas(width, height) {
  return `<rect width="${width}" height="${height}" fill="#ECECEA"/><rect width="${width}" height="${height}" fill="url(#paper-grid)"/>`;
}

function svg({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${gridDefs()}${body}</svg>\n`;
}

function renderSvg(svgPath, outputPath, width, height) {
  const temporary = `${outputPath}.raw.png`;
  run('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', temporary, svgPath]);
  run('magick', [temporary, '-strip', '-colorspace', 'sRGB', '-define', 'png:compression-level=9', '-define', 'png:compression-strategy=1', outputPath]);
  fs.rmSync(temporary, { force: true });
}

function imageInfo(filePath) {
  const [width, height, colorSpace] = run('magick', ['identify', '-format', '%w %h %[colorspace]', filePath]).split(/\s+/);
  return {
    file: path.basename(filePath),
    width: Number(width),
    height: Number(height),
    colorSpace,
    sizeBytes: fs.statSync(filePath).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
  };
}

function measureLayer(svgText, width, height, outputPath) {
  const svgPath = `${outputPath}.svg`;
  write(svgPath, svgText);
  renderSvg(svgPath, outputPath, width, height);
  const geometry = run('magick', [outputPath, '-format', '%@', 'info:']);
  const match = geometry.match(/(\d+)x(\d+)\+(-?\d+)\+(-?\d+)/);
  if (!match) throw new Error(`Could not measure ${outputPath}: ${geometry}`);
  return { width: Number(match[1]), height: Number(match[2]), x: Number(match[3]), y: Number(match[4]) };
}

function assertPng(filePath, width, height) {
  const info = imageInfo(filePath);
  if (info.width !== width || info.height !== height) throw new Error(`Wrong dimensions for ${filePath}`);
  if (info.colorSpace.toLowerCase() !== 'srgb') throw new Error(`Wrong colorspace for ${filePath}: ${info.colorSpace}`);
  if (info.sizeBytes > 2 * 1024 * 1024) throw new Error(`PNG exceeds 2 MB: ${filePath} (${info.sizeBytes})`);
  return info;
}

const enBodyBase = `${canvas(1280, 720)}<image x="835" y="174" width="405" height="372" preserveAspectRatio="xMidYMid meet" xlink:href="illustration.subject-cutout.png"/>`;
const enTitle = `<g fill="#111413" font-family="Arial Black, Arial, sans-serif" font-weight="900" letter-spacing="-4"><text x="42" y="202" font-size="138">POLISHED</text><text x="42" y="374" font-size="92">DOESN'T MEAN</text><text x="42" y="558" font-size="142">FINISHED</text></g>`;
const enDecor = `<rect x="44" y="46" width="176" height="14" rx="7" fill="#117ABD"/><rect x="44" y="660" width="620" height="18" rx="9" fill="#FFD04A"/>`;
write(path.join(enDir, 'base.en-US.svg'), svg({ width: 1280, height: 720, body: enBodyBase }));
write(path.join(enDir, 'thumbnail.en-US.svg'), svg({ width: 1280, height: 720, body: `${enBodyBase}${enDecor}${enTitle}` }));
renderSvg(path.join(enDir, 'base.en-US.svg'), path.join(enDir, 'base.en-US.png'), 3840, 2160);
run('node', [youtubeRenderer, '--svg', path.join(enDir, 'thumbnail.en-US.svg'), '--output', path.join(enDir, 'thumbnail.en-US.png'), '--preview-1280', path.join(enDir, 'thumbnail.en-US.1280x720.png'), '--preview-256', path.join(enDir, 'thumbnail.en-US.256x144.png'), '--qa', path.join(enDir, 'youtube-thumbnail-result.json')]);

const zhVariants = [
  {
    ratio: '16x9', width: 1280, height: 720, output: 'thumbnail.zh-CN.png', base: 'base.zh-CN.png', svgName: 'thumbnail.zh-CN.svg',
    image: `<image x="785" y="154" width="455" height="412" preserveAspectRatio="xMidYMid meet" xlink:href="illustration.subject-cutout.png"/>`,
    title: `<g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-3"><text x="48" y="285" font-size="168">越顺眼</text><text x="48" y="510" font-size="142">越要检查</text></g>`,
    decor: `<rect x="50" y="48" width="178" height="14" rx="7" fill="#117ABD"/><rect x="50" y="648" width="680" height="18" rx="9" fill="#FFD04A"/>`,
    preview: ['qa/thumbnail.zh-CN.256x144.png', 256, 144],
  },
  {
    ratio: '4x3', width: 1200, height: 900, output: 'thumbnail.zh-CN.4x3.png', base: 'base.zh-CN.4x3.png', svgName: 'thumbnail.zh-CN.4x3.svg',
    image: `<image x="840" y="310" width="320" height="350" preserveAspectRatio="xMidYMid meet" xlink:href="illustration.subject-cutout.png"/>`,
    title: `<g fill="#111413" stroke="#ECECEA" stroke-width="11" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4"><text x="38" y="270" font-size="250">越顺眼</text><text x="38" y="555" font-size="225">越要</text><text x="38" y="845" font-size="260">检查</text></g>`,
    decor: `<rect x="970" y="42" width="186" height="16" rx="8" fill="#117ABD"/><rect x="42" y="866" width="748" height="18" rx="9" fill="#FFD04A"/>`,
    preview: ['qa/thumbnail.zh-CN.4x3.240x180.png', 240, 180],
  },
  {
    ratio: '3x4', width: 900, height: 1200, output: 'thumbnail.zh-CN.3x4.png', base: 'base.zh-CN.3x4.png', svgName: 'thumbnail.zh-CN.3x4.svg',
    image: `<image x="88" y="742" width="724" height="430" preserveAspectRatio="xMidYMid meet" xlink:href="illustration.subject-cutout.png"/>`,
    title: `<g fill="#111413" stroke="#ECECEA" stroke-width="13" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4"><text x="38" y="250" font-size="250">越顺眼</text><text x="38" y="475" font-size="230">越要</text><text x="38" y="690" font-size="250">检查</text></g>`,
    decor: `<rect x="672" y="32" width="186" height="16" rx="8" fill="#117ABD"/><rect x="42" y="711" width="816" height="18" rx="9" fill="#FFD04A"/>`,
    preview: ['qa/thumbnail.zh-CN.3x4.180x240.png', 180, 240],
  },
];

const zhQa = { checkedAt: new Date().toISOString(), status: 'pass', files: {}, checks: {} };
for (const variant of zhVariants) {
  const baseBody = `${canvas(variant.width, variant.height)}${variant.image}`;
  const baseSvgPath = path.join(zhDir, variant.base.replace(/\.png$/, '.svg'));
  const finalSvgPath = path.join(zhDir, variant.svgName);
  write(baseSvgPath, svg({ width: variant.width, height: variant.height, body: baseBody }));
  write(finalSvgPath, svg({ width: variant.width, height: variant.height, body: `${baseBody}${variant.decor}${variant.title}` }));
  renderSvg(baseSvgPath, path.join(zhDir, variant.base), variant.width, variant.height);
  renderSvg(finalSvgPath, path.join(zhDir, variant.output), variant.width, variant.height);
  run('magick', [path.join(zhDir, variant.output), '-resize', `${variant.preview[1]}x${variant.preview[2]}!`, '-strip', '-colorspace', 'sRGB', path.join(zhDir, variant.preview[0])]);
  const titleBox = measureLayer(`<svg xmlns="http://www.w3.org/2000/svg" width="${variant.width}" height="${variant.height}" viewBox="0 0 ${variant.width} ${variant.height}">${variant.title}</svg>`, variant.width, variant.height, path.join(zhDir, `qa/title-layer.zh-CN.${variant.ratio}.png`));
  const titleCoverage = titleBox.width * titleBox.height / (variant.width * (variant.ratio === '3x4' ? 720 : variant.height));
  if (variant.ratio === '4x3' && titleCoverage < 0.5) throw new Error(`4:3 title coverage is ${titleCoverage}`);
  if (variant.ratio === '3x4' && titleCoverage < 0.68) throw new Error(`3:4 title-zone coverage is ${titleCoverage}`);
  if (variant.ratio === '3x4' && titleBox.y + titleBox.height > 720) throw new Error('3:4 title crosses the 60% divider');
  const info = assertPng(path.join(zhDir, variant.output), variant.width, variant.height);
  zhQa.files[variant.ratio] = { ...info, preview: variant.preview[0], titleBox, titleCoverage: Number(titleCoverage.toFixed(3)) };
  zhQa.checks[variant.ratio] = { exactDimensions: true, sRGB: true, under2MB: true, noOpaquePanel: true, illustrationContain: true, visualReview: 'pending' };
  write(path.join(zhDir, `thumbnail-spec.zh-CN.${variant.ratio}.json`), `${JSON.stringify({
    language: 'zh-CN', aspectRatio: variant.ratio, width: variant.width, height: variant.height,
    titleLines: variant.ratio === '16x9' ? ['越顺眼', '越要检查'] : ['越顺眼', '越要', '检查'],
    baseImage: variant.base, illustration: 'illustration.subject-cutout.png', illustrationFit: 'contain',
    titleBox, titleCoverage: Number(titleCoverage.toFixed(3)), dividerY: variant.ratio === '3x4' ? 720 : null,
    background: '#ECECEA paper grid', composition: 'text-dominant title-hero; no opaque panel',
  }, null, 2)}\n`);
}
write(path.join(zhDir, 'qa.json'), `${JSON.stringify(zhQa, null, 2)}\n`);

const enInfo = assertPng(path.join(enDir, 'thumbnail.en-US.png'), 3840, 2160);
const enTitleBox = measureLayer(`<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">${enTitle}</svg>`, 1280, 720, path.join(enDir, 'qa/title-layer.en-US.png'));
write(path.join(enDir, 'thumbnail-spec.en-US.16x9.json'), `${JSON.stringify({
  language: 'en-US', width: 3840, height: 2160, layoutCoordinateSystem: '1280x720',
  headline: "POLISHED DOESN'T MEAN FINISHED", titleLines: ['POLISHED', "DOESN'T MEAN", 'FINISHED'],
  titleBox: enTitleBox, textVisualBudget: '60-70%', illustrationVisibleFootprint: '30-40%',
  baseImage: 'base.en-US.png', illustration: 'illustration.subject-cutout.png', illustrationFit: 'contain',
  background: '#ECECEA paper grid', composition: 'title-hero; no opaque panel', master: enInfo,
}, null, 2)}\n`);

process.stdout.write(`${JSON.stringify({ english: enInfo, englishTitleBox: enTitleBox, chinese: zhQa }, null, 2)}\n`);
