#!/usr/bin/env node

import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const repoRoot = resolve(import.meta.dirname, '../..');
const tempRoot = mkdtempSync(join(tmpdir(), 'tiny-agent-zh-covers-'));

const projects = [
  {
    key: 'building-effective-agents',
    project: 'var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-zh-CN',
    source: 'var/hyperframes-showcases/2026-07-16-building-effective-agents-longform-en-US/thumbnails/adaptive-v7/illustration.generated.png',
    titles: {
      landscape: [['别急着做多', 112, 265], ['AGENT', 190, 500]],
      squareish: [['别急着', 195, 270], ['做多', 235, 520], ['AGENT', 215, 820]],
      portrait: [['别急着', 190, 255], ['做多', 240, 470], ['AGENT', 210, 680]],
    },
  },
  {
    key: 'agent-task-upgrade',
    project: 'var/hyperframes-showcases/2026-07-17-agent-task-upgrade-longform-zh-CN',
    source: 'var/hyperframes-showcases/2026-07-17-agent-task-upgrade-longform-en-US/thumbnails/adaptive-v7/illustration.generated.png',
    titles: {
      landscape: [['聊天还是', 142, 265], ['AGENT？', 180, 500]],
      squareish: [['聊天', 220, 270], ['还是', 220, 520], ['AGENT？', 195, 820]],
      portrait: [['聊天', 230, 265], ['还是', 230, 480], ['AGENT？', 180, 680]],
    },
  },
  {
    key: 'ai-work-modes',
    project: 'var/hyperframes-showcases/2026-07-18-ai-work-modes-longform-zh-CN',
    source: 'var/hyperframes-showcases/2026-07-18-ai-work-modes-longform-en-US/thumbnails/adaptive-v7/illustration.generated.png',
    titles: {
      landscape: [['提问、协作', 132, 265], ['还是委派？', 132, 500]],
      squareish: [['提问', 220, 270], ['协作还是', 195, 520], ['委派？', 235, 820]],
      portrait: [['提问、协作', 150, 215], ['还是', 240, 460], ['委派？', 225, 680]],
    },
  },
  {
    key: 'ai-fluency-4d',
    project: 'var/hyperframes-showcases/2026-07-19-03-ai-fluency-4d-longform-zh-CN',
    source: 'var/hyperframes-showcases/2026-07-19-03-ai-fluency-4d-longform-en-US/thumbnails/adaptive-v7/illustration.generated.png',
    titles: {
      landscape: [['会用 AI', 156, 265], ['不只会提问', 130, 500]],
      squareish: [['会用 AI', 220, 270], ['不只会', 225, 520], ['提问', 270, 820]],
      portrait: [['会用 AI', 225, 280], ['不只会', 220, 480], ['提问', 240, 675]],
    },
  },
];

const variants = [
  {
    key: 'landscape',
    aspectRatio: '16:9',
    width: 1280,
    height: 720,
    output: 'thumbnail.zh-CN.png',
    svg: 'thumbnail.zh-CN.svg',
    baseOutput: 'illustration.zh-CN.png',
    baseSvg: 'illustration.zh-CN.svg',
    preview: 'thumbnail.zh-CN.256x144.png',
    previewSize: '256x144!',
    illustration: { x: 720, y: 78, width: 520, height: 520 },
    titleStroke: 0,
    titleGate: null,
  },
  {
    key: 'squareish',
    aspectRatio: '4:3',
    width: 1200,
    height: 900,
    output: 'thumbnail.zh-CN.4x3.png',
    svg: 'thumbnail.zh-CN.4x3.svg',
    baseOutput: 'illustration.zh-CN.4x3.png',
    baseSvg: 'illustration.zh-CN.4x3.svg',
    preview: 'thumbnail.zh-CN.4x3.240x180.png',
    previewSize: '240x180!',
    illustration: { x: 720, y: 220, width: 440, height: 520 },
    titleStroke: 12,
    titleGate: { field: 'canvasCoverage', minimum: 0.5 },
  },
  {
    key: 'portrait',
    aspectRatio: '3:4',
    width: 900,
    height: 1200,
    output: 'thumbnail.zh-CN.3x4.png',
    svg: 'thumbnail.zh-CN.3x4.svg',
    baseOutput: 'illustration.zh-CN.3x4.png',
    baseSvg: 'illustration.zh-CN.3x4.svg',
    preview: 'thumbnail.zh-CN.3x4.180x240.png',
    previewSize: '180x240!',
    illustration: { x: 42, y: 736, width: 816, height: 448 },
    titleStroke: 14,
    titleGate: { field: 'textZoneCoverage', minimum: 0.68 },
  },
];

function run(command, args) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function escapeXml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function gridDefs() {
  return `
  <defs>
    <pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M 48 0 L 0 0 0 48" fill="none" stroke="#111413" stroke-width="1" opacity="0.035"/>
    </pattern>
  </defs>`;
}

function illustrationMarkup(variant) {
  const box = variant.illustration;
  return `<image x="${box.x}" y="${box.y}" width="${box.width}" height="${box.height}" preserveAspectRatio="xMidYMid meet" href="illustration.subject-cutout.png"/>`;
}

function titleMarkup(lines, variant) {
  const stroke = variant.titleStroke > 0
    ? ` stroke="#ECECEA" stroke-width="${variant.titleStroke}" stroke-linejoin="round" paint-order="stroke"`
    : '';
  const text = lines
    .map(([value, size, y]) => `    <text x="50" y="${y}" font-size="${size}">${escapeXml(value)}</text>`)
    .join('\n');
  return `<g fill="#111413"${stroke} font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-3">
${text}
  </g>`;
}

function fullSvg(lines, variant, { titleOnly = false, baseOnly = false } = {}) {
  const background = titleOnly
    ? ''
    : `${gridDefs()}
  <rect width="${variant.width}" height="${variant.height}" fill="#ECECEA"/>
  <rect width="${variant.width}" height="${variant.height}" fill="url(#paper-grid)"/>`;
  const illustration = titleOnly ? '' : illustrationMarkup(variant);
  const title = baseOnly ? '' : titleMarkup(lines, variant);
  const accents = titleOnly || baseOnly
    ? ''
    : variant.key === 'portrait'
      ? '<rect x="52" y="48" width="188" height="16" rx="8" fill="#117ABD"/>\n  <rect x="52" y="711" width="796" height="18" rx="9" fill="#FFD04A"/>'
      : variant.key === 'squareish'
        ? '<rect x="52" y="48" width="188" height="16" rx="8" fill="#117ABD"/>\n  <rect x="52" y="852" width="650" height="22" rx="11" fill="#FFD04A"/>'
        : '<rect x="44" y="54" width="168" height="14" rx="7" fill="#117ABD"/>\n  <rect x="44" y="654" width="610" height="20" rx="10" fill="#FFD04A"/>';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${variant.width}" height="${variant.height}" viewBox="0 0 ${variant.width} ${variant.height}">
  ${background}
  ${illustration}
  ${accents}
  ${title}
</svg>
`;
}

function extractCutout(project, thumbnailDir) {
  const source = resolve(repoRoot, project.source);
  const output = join(thumbnailDir, 'illustration.subject-cutout.png');
  const edges = join(tempRoot, `${project.key}-edges.png`);
  const closed = join(tempRoot, `${project.key}-closed.png`);
  const mask = join(tempRoot, `${project.key}-mask.png`);
  run('magick', [source, '-colorspace', 'gray', '-canny', '0x1+20%+40%', edges]);
  run('magick', [edges, '-morphology', 'close', 'disk:1', '-morphology', 'dilate', 'disk:1', closed]);
  run('magick', [closed, '-fill', '#808080', '-draw', 'color 0,0 floodfill', '-fill', 'white', '-opaque', 'black', '-fill', 'black', '-opaque', '#808080', '-morphology', 'close', 'disk:2', mask]);
  run('magick', [source, mask, '-alpha', 'off', '-compose', 'CopyOpacity', '-composite', '-trim', '+repage', output]);
  const opaque = run('identify', ['-format', '%[opaque]', output]);
  if (opaque !== 'False') throw new Error(`Expected transparent cutout: ${output}`);
}

function measureTitle(titleLayer) {
  const geometry = run('identify', ['-format', '%@', titleLayer]);
  const match = geometry.match(/^(\d+)x(\d+)\+(\d+)\+(\d+)$/);
  if (!match) throw new Error(`Unexpected title geometry: ${geometry}`);
  return { width: Number(match[1]), height: Number(match[2]), x: Number(match[3]), y: Number(match[4]) };
}

function validateImage(file, width, height) {
  const result = run('identify', ['-format', '%w %h %[colorspace]', file]).split(' ');
  const actualWidth = Number(result[0]);
  const actualHeight = Number(result[1]);
  const colorSpace = result[2];
  const sizeBytes = statSync(file).size;
  if (actualWidth !== width || actualHeight !== height || colorSpace !== 'sRGB' || sizeBytes >= 2 * 1024 * 1024) {
    throw new Error(`Image QA failed: ${file} ${actualWidth}x${actualHeight} ${colorSpace} ${sizeBytes}`);
  }
  return { width: actualWidth, height: actualHeight, colorSpace, sizeBytes };
}

function archiveCurrent(thumbnailDir) {
  const archiveDir = join(thumbnailDir, 'archive', 'pre-title-hero-2026-07-19');
  mkdirSync(archiveDir, { recursive: true });
  for (const name of ['thumbnail.zh-CN.png', 'thumbnail.zh-CN.4x3.png', 'thumbnail.zh-CN.3x4.png']) {
    const source = join(thumbnailDir, name);
    const destination = join(archiveDir, name);
    if (existsSync(source) && !existsSync(destination)) copyFileSync(source, destination);
  }
}

const checkedAt = new Date().toISOString();

try {
  for (const project of projects) {
    const projectDir = resolve(repoRoot, project.project);
    const thumbnailDir = join(projectDir, 'thumbnails');
    archiveCurrent(thumbnailDir);
    extractCutout(project, thumbnailDir);
    const qaFiles = [];

    for (const variant of variants) {
      const lines = project.titles[variant.key];
      const svgPath = join(thumbnailDir, variant.svg);
      const baseSvgPath = join(thumbnailDir, variant.baseSvg);
      const outputPath = join(thumbnailDir, variant.output);
      const baseOutputPath = join(thumbnailDir, variant.baseOutput);
      const previewPath = join(thumbnailDir, variant.preview);
      const titleSvgPath = join(tempRoot, `${project.key}-${variant.key}-title.svg`);
      const titlePngPath = join(tempRoot, `${project.key}-${variant.key}-title.png`);

      writeFileSync(svgPath, fullSvg(lines, variant));
      writeFileSync(baseSvgPath, fullSvg(lines, variant, { baseOnly: true }));
      writeFileSync(titleSvgPath, fullSvg(lines, variant, { titleOnly: true }));

      run('rsvg-convert', ['-w', String(variant.width), '-h', String(variant.height), svgPath, '-o', outputPath]);
      run('rsvg-convert', ['-w', String(variant.width), '-h', String(variant.height), baseSvgPath, '-o', baseOutputPath]);
      run('rsvg-convert', ['-w', String(variant.width), '-h', String(variant.height), titleSvgPath, '-o', titlePngPath]);
      run('magick', [outputPath, '-resize', variant.previewSize, previewPath]);

      const measured = measureTitle(titlePngPath);
      measured.canvasCoverage = Number(((measured.width * measured.height) / (variant.width * variant.height)).toFixed(4));
      if (variant.key === 'portrait') {
        measured.textZoneCoverage = Number(((measured.width * measured.height) / (variant.width * variant.height * 0.6)).toFixed(4));
      }
      if (variant.titleGate && measured[variant.titleGate.field] < variant.titleGate.minimum) {
        throw new Error(`${project.key} ${variant.aspectRatio} title coverage ${measured[variant.titleGate.field]} < ${variant.titleGate.minimum}`);
      }

      const imageQa = validateImage(outputPath, variant.width, variant.height);
      validateImage(baseOutputPath, variant.width, variant.height);
      const previewDimensions = variant.previewSize.replace('!', '').split('x').map(Number);
      validateImage(previewPath, previewDimensions[0], previewDimensions[1]);

      const specName = variant.key === 'landscape'
        ? 'thumbnail-spec.zh-CN.json'
        : `thumbnail-spec.zh-CN.${variant.aspectRatio.replace(':', 'x')}.json`;
      const spec = {
        language: 'zh-CN',
        version: 'text-overlay-title-hero-v3',
        aspectRatio: variant.aspectRatio,
        width: variant.width,
        height: variant.height,
        fontFamily: 'Hiragino Sans GB',
        sourceIllustration: relative(projectDir, resolve(repoRoot, project.source)),
        illustration: 'illustration.subject-cutout.png',
        baseImage: variant.baseOutput,
        titleLines: lines.map(([text]) => text),
        titlePointSizes: lines.map(([, size]) => size),
        measuredVisibleTitleBoundingBox: measured,
        titleCoverageGate: variant.titleGate ? `>=${variant.titleGate.minimum} ${variant.titleGate.field}` : null,
        fixedLayout: variant.key === 'portrait'
          ? { textZone: 'top 60%', illustrationZone: 'bottom 40%', dividerY: 720 }
          : { relationship: 'title-left, complete-illustration-right' },
        illustrationPlacement: {
          ...variant.illustration,
          fit: 'contain',
          cropped: false,
          overlap: 'none',
        },
        backgroundStrategy: '完整插画底图，仅叠加文字与短装饰线，不使用不透明文字面板',
      };
      writeFileSync(join(thumbnailDir, specName), `${JSON.stringify(spec, null, 2)}\n`);

      qaFiles.push({
        path: variant.output,
        aspectRatio: variant.aspectRatio,
        ...imageQa,
        preview: variant.preview,
        titleBoundingBox: measured,
        opaquePanel: false,
        completeIllustrationVisible: true,
        visualCheck: 'pending-manual-review',
      });
    }

    writeFileSync(join(thumbnailDir, 'qa.json'), `${JSON.stringify({
      checkedAt,
      status: 'pending-manual-review',
      style: 'text-overlay-title-hero-v3',
      files: qaFiles,
    }, null, 2)}\n`);
  }
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}

console.log(JSON.stringify({
  ok: true,
  checkedAt,
  projects: projects.map(({ key, project }) => ({ key, project })),
  coversGenerated: projects.length * variants.length,
}, null, 2));
