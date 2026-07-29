import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = '/Volumes/SSD/Workspace/postiz-app';
const referenceImages = [
  'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/idle.png',
];
const identityProfileId = 'tiny-agent-generated-identity-near-match-2026-07-29';
const coverSetProfileId = 'tiny-agent-bilingual-cover-set-2026-07-29';
const contentFitProfileId = 'tiny-agent-cover-content-fit-2026-07-30';
const palette = {
  agentIdentity: '#117ABD',
  remainingTitle: '#111413',
  decorativeRule: '#F4C542',
};

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeText(root, relativePath, value) {
  const output = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, value.endsWith('\n') ? value : `${value}\n`);
}

function writeJson(root, relativePath, value) {
  writeText(root, relativePath, JSON.stringify(value, null, 2));
}

function escapeXml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

function projectDir(topic, locale) {
  return path.join(
    repoRoot,
    `var/hyperframes-showcases/${topic.baseRunKey}-${topic.slug}-longform-${locale}`,
  );
}

function heroDeclaration(topic, locale, ratio, asset) {
  return {
    asset,
    source: `imagegen-current-episode-${topic.runKey}-${locale}-${ratio}; fixed tiny-agent-v2 image reference; chroma-key alpha removal`,
    delivery: 'chroma-key alpha removal',
    characterCount: 1,
    tinyAgentCharacterCount: 1,
    humanCharacterCount: 0,
    secondaryAgentCharacterCount: 0,
    identityProfileId,
    referenceConditioningUsed: true,
    referenceImages,
    similarityDecision: 'minor-variation',
    finishClassification: 'minor-soft-3d-variation',
    majorRedesignDetected: false,
    integratedTopicAction: topic.covers[locale].topicAction,
    bilingualActionId: topic.coverActionId,
    generatedIllustrationText: false,
    locale,
  };
}

function commonSpec(topic, locale, ratio, heroAsset, headline, titleLines) {
  const cover = topic.covers[locale];
  return {
    version: 5,
    locale,
    coverSetProfileId,
    referenceLayout: '2026-07-23-approved-title-hero',
    referenceSvg: 'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/thumbnails/thumbnail.zh-CN.svg',
    headline,
    titleLines,
    headlineIntent: cover.headlineIntent,
    headlineIntentRationale: cover.headlineIntentRationale,
    requiredCoverKeywords: cover.requiredCoverKeywords,
    titlePalette: palette,
    auxiliaryCoverCopy: false,
    generatedIllustrationText: false,
    generatedHeroIllustration: heroDeclaration(topic, locale, ratio, heroAsset),
  };
}

function svgDefs() {
  return `<defs>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" stroke-opacity="0.035" opacity="0.035"/></pattern>
    <pattern id="paper-grid" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0L0 0 0 48" fill="none" stroke="#111413" stroke-width="1" stroke-opacity="0.035" opacity="0.035"/></pattern>
  </defs>`;
}

function strictSvg({ ratio, locale, heroAsset, titleLines, fontSizes }) {
  const portrait = ratio === '3x4';
  const width = portrait ? 900 : 1200;
  const height = portrait ? 1200 : 900;
  const x = portrait ? 36 : 38;
  const baselines = portrait ? [148, 316, 500, 684] : [166, 348, 550, 786];
  const hero = portrait
    ? { x: 75, y: 729, width: 750, height: 480 }
    : { x: 640, y: 230, width: 550, height: 640 };
  const blue = portrait
    ? { x: 36, y: 30, width: 160, height: 14, rx: 7 }
    : { x: 38, y: 28, width: 176, height: 14, rx: 7 };
  const yellow = portrait
    ? { x: 36, y: 711, width: 828, height: 18, rx: 9 }
    : { x: 38, y: 882, width: 624, height: 18, rx: 9 };
  const title = titleLines.map((line, index) => {
    const text = index === 0
      ? `<tspan fill="#117ABD">${escapeXml(line)}</tspan>`
      : escapeXml(line);
    return `    <text data-cover-title-line="${index + 1}" x="${x}" y="${baselines[index]}" font-size="${fontSizes[index]}">${text}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${svgDefs()}
  <rect width="${width}" height="${height}" fill="#ECECEA"/>
  <rect width="${width}" height="${height}" fill="url(#grid)"/>
  <image href="${heroAsset}" x="${hero.x}" y="${hero.y}" width="${hero.width}" height="${hero.height}" preserveAspectRatio="xMidYMid meet"/>
  <rect x="${blue.x}" y="${blue.y}" width="${blue.width}" height="${blue.height}" rx="${blue.rx}" fill="#117ABD"/>
  <rect x="${yellow.x}" y="${yellow.y}" width="${yellow.width}" height="${yellow.height}" rx="${yellow.rx}" fill="#F4C542"/>
  <g fill="#111413" stroke="#ECECEA" stroke-width="9" stroke-linejoin="round" paint-order="stroke" font-family="Hiragino Sans GB, PingFang SC, sans-serif" font-weight="900" letter-spacing="-4">
${title}
  </g>
</svg>`;
}

function landscapeSvg(heroAsset, titleLines) {
  const baselines = [190, 290, 390, 490];
  const sizes = [82, 78, 76, 72];
  const title = titleLines.map((line, index) => {
    const text = index === 0
      ? `<tspan fill="#117ABD">${escapeXml(line)}</tspan>`
      : escapeXml(line);
    return `  <text data-cover-title-line="${index + 1}" x="74" y="${baselines[index]}" font-family="Hiragino Sans GB, Arial, sans-serif" font-size="${sizes[index]}" font-weight="800" letter-spacing="-4" fill="#111413">${text}</text>`;
  }).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs><pattern id="grid" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M44 0H0V44" fill="none" stroke="#111413" stroke-opacity="0.09" stroke-width="1"/></pattern></defs>
  <rect width="1280" height="720" fill="#ECECEA"/><rect width="1280" height="720" fill="url(#grid)"/>
  <image href="${heroAsset}" x="620" y="82" width="600" height="560" preserveAspectRatio="xMidYMid meet"/>
  <rect x="44" y="42" width="118" height="10" fill="#117ABD"/>
${title}
  <rect x="44" y="652" width="1192" height="12" fill="#F4C542"/>
</svg>`;
}

function renderSvg(thumbnails, svgFile, pngFile, width, height) {
  execFileSync('rsvg-convert', [
    '-w', String(width),
    '-h', String(height),
    '-o', pngFile,
    svgFile,
  ], { cwd: thumbnails });
}

function resizePng(thumbnails, source, output, width, height) {
  execFileSync('magick', [
    source,
    '-colorspace', 'sRGB',
    '-resize', `${width}x${height}!`,
    '-strip',
    '-define', 'png:compression-level=9',
    output,
  ], { cwd: thumbnails });
}

function normalizeGeneratedHero(thumbnails, heroAsset) {
  const source = path.join(thumbnails, heroAsset);
  const normalized = `${source}.content-fit.png`;
  execFileSync('magick', [
    source,
    '-trim',
    '+repage',
    '-bordercolor',
    'none',
    '-border',
    '4%x4%',
    normalized,
  ]);
  fs.renameSync(normalized, source);
}

function makeRatio(topic, locale, ratio) {
  const directory = projectDir(topic, locale);
  const thumbnails = path.join(directory, 'thumbnails');
  const heroAsset = `generated-hero.${locale}.${ratio}.png`;
  const prefix = `thumbnail.${locale}${ratio === '16x9' ? '' : `.${ratio}`}`;
  const specPath = `thumbnails/thumbnail-spec.${locale}.${ratio}.json`;
  const cover = topic.covers[locale];
  const headline = cover.headlinesByRatio?.[ratio] ?? cover.headline;
  const titleLines = cover.titleLinesByRatio?.[ratio] ?? cover.titleLines;
  const fontSizes = cover.fontSizesByRatio?.[ratio] ?? cover.fontSizes;
  normalizeGeneratedHero(thumbnails, heroAsset);
  const spec = {
    ...commonSpec(topic, locale, ratio, heroAsset, headline, titleLines),
    composition: ratio === '3x4'
      ? 'top-60-percent-title; bottom-40-percent-contained current-topic hero'
      : 'text-left and right current-topic hero',
    ...(ratio === '16x9'
      ? { bilingualGeometryProfileId: 'tiny-agent-bilingual-cover-16x9-parity-2026-07-27' }
      : {
        strictGeometryProfileId: locale === 'zh-CN'
          ? 'tiny-agent-zh-cover-approved-geometry-2026-07-26'
          : 'tiny-agent-en-cover-approved-geometry-2026-07-29',
        contentFitProfileId,
        alphaSubjectNormalization: {
          method: 'trim-to-visible-alpha-bounds',
          transparentPaddingPercent: 4,
        },
      }),
  };
  writeJson(directory, specPath, spec);
  const svg = ratio === '16x9'
    ? landscapeSvg(heroAsset, cover.titleLines)
    : strictSvg({
      ratio,
      locale,
      heroAsset,
      titleLines,
      fontSizes,
    });
  writeText(directory, `thumbnails/${prefix}.svg`, svg);
  if (ratio === '16x9') {
    renderSvg(thumbnails, `${prefix}.svg`, `${prefix}.png`, 3840, 2160);
    resizePng(thumbnails, `${prefix}.png`, `${prefix}.1280x720.png`, 1280, 720);
    resizePng(thumbnails, `${prefix}.png`, `${prefix}.256x144.png`, 256, 144);
  } else if (ratio === '4x3') {
    renderSvg(thumbnails, `${prefix}.svg`, `${prefix}.png`, 1200, 900);
    resizePng(thumbnails, `${prefix}.png`, `${prefix}.240x180.png`, 240, 180);
  } else {
    renderSvg(thumbnails, `${prefix}.svg`, `${prefix}.png`, 900, 1200);
    resizePng(thumbnails, `${prefix}.png`, `${prefix}.180x240.png`, 180, 240);
  }
}

const specPath = process.argv[2];
if (!specPath) throw new Error('Usage: node finalize-tiny-agent-covers.mjs <topic-spec.json>');
const topic = readJson(path.resolve(specPath));
const localeFlagIndex = process.argv.indexOf('--locale');
const selectedLocale = localeFlagIndex >= 0 ? process.argv[localeFlagIndex + 1] : null;
if (selectedLocale && !['en-US', 'zh-CN'].includes(selectedLocale)) {
  throw new Error(`Unsupported --locale: ${selectedLocale}`);
}
if (!selectedLocale || selectedLocale === 'en-US') {
  makeRatio(topic, 'en-US', '16x9');
  makeRatio(topic, 'en-US', '4x3');
  makeRatio(topic, 'en-US', '3x4');
}
if (!selectedLocale || selectedLocale === 'zh-CN') {
  makeRatio(topic, 'zh-CN', '4x3');
  makeRatio(topic, 'zh-CN', '3x4');
}
process.stdout.write(`${JSON.stringify({
  runKey: topic.runKey,
  locale: selectedLocale ?? 'all',
  covers: {
    'en-US': !selectedLocale || selectedLocale === 'en-US' ? ['16x9', '4x3', '3x4'] : [],
    'zh-CN': !selectedLocale || selectedLocale === 'zh-CN' ? ['4x3', '3x4'] : [],
  },
}, null, 2)}\n`);
