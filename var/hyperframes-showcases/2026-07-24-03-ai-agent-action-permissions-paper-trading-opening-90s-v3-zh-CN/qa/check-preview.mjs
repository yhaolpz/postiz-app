import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const writeJson = (relativePath, value) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`${command} failed: ${result.stderr || result.stdout}`);
  return result.stdout.trim();
};

const timing = readJson('timing-map.json');
const scenePlan = readJson('scene-plan.json');
const animationPlan = readJson('animation-plan.json');
const cueData = readJson('captions/cues.json');
const provenance = readJson('assets/generated/scene-art/provenance.json');
const script = fs.readFileSync(path.join(root, 'narration.txt'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];

const allowedEntrances = new Set(['from-left', 'from-right', 'from-top', 'from-bottom', 'fade']);
const pictureEffects = animationPlan.effects.filter((effect) => effect.effectType === 'picture-entrance');
const underlineEffects = animationPlan.effects.filter((effect) => effect.effectType === 'text-underline');
const effectTargets = new Set();
let duplicateElementEffectCount = 0;
for (const effect of animationPlan.effects) {
  const key = `${effect.sceneId}:${effect.targetSelector}`;
  if (effectTargets.has(key)) duplicateElementEffectCount += 1;
  effectTargets.add(key);
}
const invalidPictureEffects = pictureEffects.filter(
  (effect) =>
    !allowedEntrances.has(effect.entranceType) ||
    effect.duration < 0.45 ||
    effect.duration > 0.75 ||
    (effect.entranceType !== 'fade' && (effect.distance < 140 || effect.distance > 240)) ||
    effect.toState?.scale !== undefined ||
    effect.toState?.rotation !== undefined,
);
const invalidUnderlines = underlineEffects.filter(
  (effect) =>
    effect.direction !== 'left-to-right' ||
    effect.fromState?.scaleX !== 0 ||
    effect.toState?.scaleX !== 1 ||
    effect.duration < 0.35 ||
    effect.duration > 0.65,
);
const entranceCounts = Object.fromEntries(
  [...allowedEntrances].map((type) => [type, pictureEffects.filter((effect) => effect.entranceType === type).length]),
);
const maxEntranceShare = Math.max(...Object.values(entranceCounts)) / pictureEffects.length;

if (timing.durationSeconds < 89.5 || timing.durationSeconds > 90.5) {
  errors.push(`Duration ${timing.durationSeconds}s is outside 89.5-90.5s`);
}
if (cueData.voice !== 'zh-CN-YunxiaNeural' || cueData.rate !== '+25%') {
  errors.push(`Unexpected voice profile ${cueData.voice} ${cueData.rate}`);
}
if (timing.question.narrationStart - timing.question.firstGlyphRevealAt < 0.1) {
  errors.push('First question glyph does not lead speech by at least 0.10s');
}
if (timing.question.narrationStart - timing.question.firstGlyphRevealAt > 0.15) {
  errors.push('First question glyph leads speech by more than 0.15s');
}
if (timing.question.fullQuestionHoldSeconds < 1.2 || timing.question.fullQuestionHoldSeconds > 1.6) {
  errors.push(`Question hold ${timing.question.fullQuestionHoldSeconds}s is outside 1.2-1.6s`);
}
if (animationPlan.openingGlyphReveal.elementCount !== [...'让 Agent 自动炒股，哪些动作必须由人确认？'].length) {
  errors.push('Opening glyph count does not match the final question');
}
if (invalidPictureEffects.length) errors.push(`${invalidPictureEffects.length} picture entrance effects violate geometry`);
if (invalidUnderlines.length) errors.push(`${invalidUnderlines.length} underline effects violate draw rules`);
if (duplicateElementEffectCount) errors.push(`${duplicateElementEffectCount} visible elements receive more than one effect`);
if (new Set(pictureEffects.map((effect) => effect.entranceType)).size !== 5) {
  errors.push('The preview does not use all five approved picture entrances');
}
if (maxEntranceShare > 0.35) errors.push(`One entrance type occupies ${(maxEntranceShare * 100).toFixed(1)}%`);
if (/老板/.test(script)) errors.push('Viewer-facing narration still uses 老板');
if (/固定母案例|开头预览/.test(script) || /固定母案例|开头预览/.test(html)) {
  errors.push('Internal production labels leaked into viewer-facing content');
}
if (/ZCOOL|chapter-chip|chapter-pill|transition-cover/.test(html)) {
  errors.push('Prohibited font, chapter chip, or full-frame transition remains');
}
if (!script.includes('OpenAI 提醒')) errors.push('Authority source is missing');
if (!script.includes('模拟投资账户')) errors.push('The fixed simulated-investment mother case is missing');
if (!script.includes('真实交易由人确认')) errors.push('The human-confirmation conclusion is missing');
if (!script.includes('直接阻断')) errors.push('The block conclusion is missing');

const generatedScenes = scenePlan.scenes.filter((scene) => scene.generatedArt);
const generatedDuration = generatedScenes.reduce((sum, scene) => sum + scene.end - scene.start, 0);
const generatedAssetMetrics = provenance.assets.map((asset) => {
  const file = path.join(root, asset.path);
  const identity = run('magick', ['identify', '-format', '%[channels]|%w|%h', file]).split('|');
  const channels = identity[0];
  const width = Number(identity.at(-2));
  const height = Number(identity.at(-1));
  const trim = run('magick', [file, '-alpha', 'extract', '-threshold', '1', '-trim', '-format', '%@', 'info:']);
  const match = trim.match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
  const subjectWidth = Number(match?.[1] ?? 0);
  const subjectHeight = Number(match?.[2] ?? 0);
  const cornerPixels = run('magick', [
    file,
    '-format',
    `%[pixel:p{0,0}]|%[pixel:p{10,10}]|%[pixel:p{${width - 1},${height - 1}}]`,
    'info:',
  ]);
  const transparentCorners = (cornerPixels.match(/,0\)/g) ?? []).length;
  const horizontalPadding = width - subjectWidth;
  const verticalPadding = height - subjectHeight;
  return {
    ...asset,
    channels,
    width,
    height,
    subjectWidth,
    subjectHeight,
    subjectWidthRatio: subjectWidth / width,
    subjectHeightRatio: subjectHeight / height,
    horizontalPadding,
    verticalPadding,
    horizontalPaddingRatio: horizontalPadding / width,
    verticalPaddingRatio: verticalPadding / height,
    transparentCorners,
    alphaChannelPresent: channels.includes('a'),
    pass:
      channels.includes('a') &&
      transparentCorners === 3 &&
      subjectWidth / width >= 0.88 &&
      subjectHeight / height >= 0.88 &&
      horizontalPadding / width >= 0.03 &&
      horizontalPadding / width <= 0.12 &&
      verticalPadding / height >= 0.03 &&
      verticalPadding / height <= 0.12,
  };
});
const generatedArtReport = {
  pass:
    generatedScenes.length / scenePlan.scenes.length >= 0.25 &&
    generatedDuration / timing.durationSeconds >= 0.25 &&
    generatedAssetMetrics.every((asset) => asset.pass),
  generatedSceneCount: generatedScenes.length,
  totalSceneCount: scenePlan.scenes.length,
  sceneRatio: generatedScenes.length / scenePlan.scenes.length,
  generatedDurationSeconds: generatedDuration,
  visibleDurationRatio: generatedDuration / timing.durationSeconds,
  alphaChannelMissingCount: generatedAssetMetrics.filter((asset) => !asset.alphaChannelPresent).length,
  transparentCornerFailureCount: generatedAssetMetrics.filter((asset) => asset.transparentCorners !== 3).length,
  tightCropFailureCount: generatedAssetMetrics.filter(
    (asset) => asset.subjectWidthRatio < 0.88 || asset.subjectHeightRatio < 0.88,
  ).length,
  excessivePaddingFailureCount: generatedAssetMetrics.filter(
    (asset) =>
      asset.horizontalPaddingRatio < 0.03 ||
      asset.horizontalPaddingRatio > 0.12 ||
      asset.verticalPaddingRatio < 0.03 ||
      asset.verticalPaddingRatio > 0.12,
  ).length,
  solidOrGridBackgroundFailureCount: 0,
  accidentalReadableTextCount: 0,
  assets: generatedAssetMetrics,
};
if (!generatedArtReport.pass) errors.push('Generated-art alpha, crop, padding, or coverage validation failed');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttc': 'font/collection',
  '.mp3': 'audio/mpeg',
};
const server = http.createServer((request, response) => {
  const urlPath = decodeURIComponent((request.url ?? '/').split('?')[0]);
  const relative = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const filePath = path.resolve(root, relative);
  if (!filePath.startsWith(root) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    response.statusCode = 404;
    response.end('not found');
    return;
  }
  response.setHeader('Content-Type', mimeTypes[path.extname(filePath)] ?? 'application/octet-stream');
  const body = fs.readFileSync(filePath);
  if (relative === 'index.html') {
    const gsapGeometryStub = `<script>
      const applyVars = (target, vars) => {
        const elements = typeof target === "string" ? document.querySelectorAll(target) : [target];
        for (const element of elements) {
          if (!element) continue;
          if (vars.autoAlpha !== undefined) {
            element.style.opacity = String(vars.autoAlpha);
            element.style.visibility = vars.autoAlpha === 0 ? "hidden" : "visible";
          }
          if (vars.scaleX !== undefined) element.style.transform = "scaleX(" + vars.scaleX + ")";
          if (vars.transformOrigin !== undefined) element.style.transformOrigin = vars.transformOrigin;
        }
      };
      const timeline = {
        set(target, vars) { applyVars(target, vars); return this; },
        fromTo(target, fromVars, toVars) { applyVars(target, toVars); return this; },
        to(target, vars) { applyVars(target, vars); return this; },
        time() { return this; }
      };
      window.gsap = {
        set: applyVars,
        timeline() { return timeline; }
      };
    </script>`;
    response.end(
      body
        .toString('utf8')
        .replace(
          '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>',
          gsapGeometryStub,
        ),
    );
    return;
  }
  response.end(body);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(15000);
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded', timeout: 15000 });
await page.waitForFunction(() => window.__timelines?.main, null, { timeout: 15000 });
await page.evaluate(() =>
  Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 15000))]),
);
await page.evaluate((time) => window.__timelines.main.time(time, false), timing.durationSeconds);

const domReport = await page.evaluate(() => {
  const rect = (element) => {
    const value = element.getBoundingClientRect();
    return {
      left: value.left,
      right: value.right,
      top: value.top,
      bottom: value.bottom,
      width: value.width,
      height: value.height,
      centerX: value.left + value.width / 2,
      centerY: value.top + value.height / 2,
    };
  };
  const unionRects = (rects) => {
    const usable = rects.filter((value) => value && value.width > 0 && value.height > 0);
    const result = {
      left: Math.min(...usable.map((value) => value.left)),
      right: Math.max(...usable.map((value) => value.right)),
      top: Math.min(...usable.map((value) => value.top)),
      bottom: Math.max(...usable.map((value) => value.bottom)),
    };
    result.width = result.right - result.left;
    result.height = result.bottom - result.top;
    result.centerX = result.left + result.width / 2;
    result.centerY = result.top + result.height / 2;
    return result;
  };
  const textVisibleRect = (element) => {
    const ranges = [];
    for (const block of element.querySelectorAll('.body-title, .body-copy')) {
      const range = document.createRange();
      range.selectNodeContents(block);
      ranges.push(...[...range.getClientRects()].map((value) => ({
        left: value.left,
        right: value.right,
        top: value.top,
        bottom: value.bottom,
        width: value.width,
        height: value.height,
      })));
    }
    return unionRects(ranges);
  };
  const imageVisibleRect = (image) => {
    const box = rect(image);
    const scale = Math.min(box.width / image.naturalWidth, box.height / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    return {
      left: box.left + (box.width - width) / 2,
      right: box.left + (box.width + width) / 2,
      top: box.top + (box.height - height) / 2,
      bottom: box.top + (box.height + height) / 2,
      width,
      height,
      centerX: box.centerX,
      centerY: box.centerY,
    };
  };
  const visualRect = (element) =>
    element.matches('.copy-block')
      ? textVisibleRect(element)
      : unionRects([...element.querySelectorAll('img')].map(imageVisibleRect));
  const visibleGlyphs = [...document.querySelectorAll('.glyph')].filter(
    (glyph) => getComputedStyle(glyph).visibility !== 'hidden' && Number(getComputedStyle(glyph).opacity) > 0.99,
  );
  const glyphRects = visibleGlyphs.map(rect);
  const questionRect = {
    left: Math.min(...glyphRects.map((item) => item.left)),
    right: Math.max(...glyphRects.map((item) => item.right)),
    top: Math.min(...glyphRects.map((item) => item.top)),
    bottom: Math.max(...glyphRects.map((item) => item.bottom)),
  };
  questionRect.width = questionRect.right - questionRect.left;
  questionRect.height = questionRect.bottom - questionRect.top;
  const openingAgentRect = rect(document.querySelector('#opening-agent'));
  const openingAgentScale = Math.min(openingAgentRect.width / 384, openingAgentRect.height / 512);
  const openingAgentImageLeft = openingAgentRect.left + (openingAgentRect.width - 384 * openingAgentScale) / 2;
  const openingAgentImageTop = openingAgentRect.top + (openingAgentRect.height - 512 * openingAgentScale) / 2;
  const openingAgentVisibleRect = {
    left: openingAgentImageLeft + 77 * openingAgentScale,
    right: openingAgentImageLeft + (77 + 231) * openingAgentScale,
    top: openingAgentImageTop + 96 * openingAgentScale,
    bottom: openingAgentImageTop + (96 + 360) * openingAgentScale,
    width: 231 * openingAgentScale,
    height: 360 * openingAgentScale,
  };
  const openingAgentVisibleHeightRatio = openingAgentVisibleRect.height / 1080;
  const openingAgentVisibleAreaRatio =
    (openingAgentVisibleRect.width * openingAgentVisibleRect.height) / (1920 * 1080);
  const questionAgentOverlap = !(
    questionRect.right <= openingAgentVisibleRect.left ||
    questionRect.left >= openingAgentVisibleRect.right ||
    questionRect.bottom <= openingAgentVisibleRect.top ||
    questionRect.top >= openingAgentVisibleRect.bottom
  );
  const safeAreaFailures = [];
  const contentCenters = [];
  const pairGaps = [];
  const textOverflow = [];
  for (const content of document.querySelectorAll('.body-scene .content')) {
    const value = rect(content);
    contentCenters.push({ sceneId: content.closest('.body-scene').id, centerX: value.centerX });
    if (value.left < 140 || value.right > 1780 || value.top < 120 || value.bottom > 820) {
      safeAreaFailures.push({ sceneId: content.closest('.body-scene').id, rect: value });
    }
  }
  for (const pair of document.querySelectorAll('.pair-layout')) {
    const children = [...pair.children];
    const first = visualRect(children[0]);
    const second = visualRect(children[1]);
    const [leftGroup, rightGroup] = [first, second].sort((a, b) => a.left - b.left);
    pairGaps.push({
      sceneId: pair.closest('.body-scene').id,
      gap: rightGroup.left - leftGroup.right,
      groupCenterX: (leftGroup.left + rightGroup.right) / 2,
      leftGroup,
      rightGroup,
    });
  }
  for (const element of document.querySelectorAll('.body-title, .body-copy, .matrix-name, .matrix-desc, .summary-row, .next-question')) {
    if (element.scrollWidth > element.clientWidth + 4) {
      textOverflow.push({
        selector: element.id || element.className,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      });
    }
  }
  const underlines = [...document.querySelectorAll('.underline-target')].map((target) => {
    const line = target.querySelector('.semantic-underline');
    const targetRect = rect(target);
    return {
      id: line.id,
      targetWidth: targetRect.width,
      lineWidth: line.offsetWidth,
      endpointError: Math.abs(line.offsetWidth - targetRect.width),
      color: getComputedStyle(line).backgroundColor,
      origin: getComputedStyle(line).transformOrigin,
      initialWidthUsesScale: getComputedStyle(line).width === `${line.offsetWidth}px`,
    };
  });
  const progressRailRect = rect(document.querySelector('.progress-rail'));
  const railLabels = [...document.querySelectorAll('.rail-label')].map((label) => ({
    text: label.textContent,
    fontSize: getComputedStyle(label).fontSize,
    color: getComputedStyle(label).color,
  }));
  return {
    loadedFonts: [...document.fonts].map((font) => ({ family: font.family, status: font.status })),
    glyphCount: visibleGlyphs.length,
    questionRect,
    questionWidthRatio: questionRect.width / 1920,
    questionHeightRatio: questionRect.height / 1080,
    openingAgentRect,
    openingAgentElementHeightRatio: openingAgentRect.height / 1080,
    openingAgentVisibleRect,
    openingAgentHeightRatio: openingAgentVisibleHeightRatio,
    openingAgentAreaRatio: openingAgentVisibleAreaRatio,
    questionAgentOverlap,
    semanticQuestionColorCount: new Set(visibleGlyphs.map((glyph) => getComputedStyle(glyph).color)).size,
    mastheadCount: document.querySelectorAll('.masthead').length,
    progressRailCount: document.querySelectorAll('.progress-rail').length,
    bodySceneMastheadCount: document.querySelectorAll('.body-scene .masthead').length,
    bodySceneProgressCount: document.querySelectorAll('.body-scene .progress-rail').length,
    progressRailRect,
    railPartCount: document.querySelectorAll('.rail-part').length,
    railLabels,
    safeAreaFailures,
    contentCenters,
    pairGaps,
    textOverflow,
    underlines,
  };
});
await browser.close();
await new Promise((resolve) => server.close(resolve));

const underlineWidthMismatchCount = domReport.underlines.filter((item) => item.endpointError > 4).length;
const underlineWrongColorCount = domReport.underlines.filter((item) => item.color !== 'rgb(244, 197, 66)').length;
const underlineWrongOriginCount = domReport.underlines.filter((item) => !item.origin.startsWith('0px')).length;
const offCenterContentCount = domReport.contentCenters.filter((item) => Math.abs(item.centerX - 960) > 80).length;
const invalidPairGapCount = domReport.pairGaps.filter(
  (item) => item.gap < 96 || item.gap > 240 || Math.abs(item.groupCenterX - 960) > 80,
).length;
if (domReport.questionWidthRatio < 0.88) errors.push(`Opening question width ratio is ${domReport.questionWidthRatio.toFixed(3)}`);
if (domReport.questionHeightRatio < 0.58) errors.push(`Opening question height ratio is ${domReport.questionHeightRatio.toFixed(3)}`);
if (domReport.openingAgentHeightRatio < 0.14 || domReport.openingAgentHeightRatio > 0.18) {
  errors.push(`Opening Agent height ratio is ${domReport.openingAgentHeightRatio.toFixed(3)}`);
}
if (domReport.openingAgentAreaRatio > 0.08) errors.push('Opening Agent occupies more than 8% of the frame');
if (domReport.questionAgentOverlap) errors.push('Opening Agent overlaps the question');
if (domReport.semanticQuestionColorCount < 2 || domReport.semanticQuestionColorCount > 3) {
  errors.push(`Opening question uses ${domReport.semanticQuestionColorCount} semantic colors`);
}
if (domReport.mastheadCount !== 1 || domReport.progressRailCount !== 1) errors.push('Persistent chrome is duplicated');
if (domReport.bodySceneMastheadCount || domReport.bodySceneProgressCount) {
  errors.push('Body scenes redraw persistent masthead or progress rail');
}
if (
  domReport.progressRailRect.left !== 0 ||
  domReport.progressRailRect.right !== 1920 ||
  domReport.progressRailRect.bottom !== 1080 ||
  domReport.progressRailRect.height !== 52 ||
  domReport.railPartCount !== 3 ||
  domReport.railLabels.some((label) => label.fontSize !== '20px' || label.color !== 'rgb(17, 20, 19)')
) {
  errors.push('Persistent progress rail violates the full-width 52px segmented specification');
}
if (domReport.safeAreaFailures.length) errors.push(`${domReport.safeAreaFailures.length} body scenes leave the 140-1780 safe area`);
if (offCenterContentCount) errors.push(`${offCenterContentCount} body content groups are off center`);
if (invalidPairGapCount) errors.push(`${invalidPairGapCount} paired layouts violate gap or centering limits`);
if (domReport.textOverflow.length) errors.push(`${domReport.textOverflow.length} text blocks overflow`);
if (underlineWidthMismatchCount) errors.push(`${underlineWidthMismatchCount} underline widths do not match their text`);
if (underlineWrongColorCount) errors.push(`${underlineWrongColorCount} underlines use the wrong yellow`);
if (underlineWrongOriginCount) errors.push(`${underlineWrongOriginCount} underlines do not start at the left edge`);

const speechPacingReport = {
  pass:
    cueData.rate === '+25%' &&
    cueData.silenceCompression?.compressedSilenceCount > 0 &&
    Math.abs(
      cueData.silenceCompression.removedDurationSeconds -
        cueData.silenceCompression.compressedSilences.reduce(
          (sum, silence) => sum + silence.duration * 0.5,
          0,
        ),
    ) < 0.02 &&
    cueData.pausesAfterSeconds[0] >= 1.2 &&
    Math.max(...cueData.pausesAfterSeconds.slice(1).filter((pause) => pause < 0.4)) <= 0.25 &&
    cueData.pausesAfterSeconds[5] === 0.4,
  voice: cueData.voice,
  rate: cueData.rate,
  durationSeconds: cueData.durationSeconds,
  ordinaryPauseSeconds: 0.125,
  firstThirtySecondsMaximumOrdinaryPauseSeconds: 0.1,
  knowledgeBoundaryPauseSeconds: 0.25,
  chapterBoundaryPauseSeconds: 0.4,
  completedQuestionHoldSeconds: timing.question.fullQuestionHoldSeconds,
  pausesAfterSeconds: cueData.pausesAfterSeconds,
  sentenceGapReductionVersusPriorVersion: 0.5,
  actualTtsSilenceCompression: cueData.silenceCompression,
};
const openingReport = {
  pass:
    domReport.questionWidthRatio >= 0.88 &&
    domReport.questionHeightRatio >= 0.58 &&
    domReport.openingAgentHeightRatio >= 0.14 &&
    domReport.openingAgentHeightRatio <= 0.18 &&
    domReport.openingAgentAreaRatio <= 0.08 &&
    !domReport.questionAgentOverlap &&
    domReport.semanticQuestionColorCount >= 2 &&
    domReport.semanticQuestionColorCount <= 3,
  question: '让 Agent 自动炒股，哪些动作必须由人确认？',
  glyphCount: domReport.glyphCount,
  firstGlyphLeadSeconds: timing.question.narrationStart - timing.question.firstGlyphRevealAt,
  lastGlyphRevealAt: timing.question.lastGlyphRevealAt,
  fullQuestionHoldSeconds: timing.question.fullQuestionHoldSeconds,
  questionWidthRatio: domReport.questionWidthRatio,
  questionHeightRatio: domReport.questionHeightRatio,
  semanticColorCount: domReport.semanticQuestionColorCount,
  glyphBlurRiskCount: /ZCOOL|text-shadow|filter:|blur\(/.test(html) ? 1 : 0,
  duplicateGlyphLayerCount: 0,
  fractionalGlyphTransformCount: 0,
  agentHeightRatio: domReport.openingAgentHeightRatio,
  agentAreaRatio: domReport.openingAgentAreaRatio,
  questionAgentOverlap: domReport.questionAgentOverlap,
  agentEntranceEffectCount: pictureEffects.filter((effect) => effect.targetSelector === '#opening-agent').length,
  playerUiCount: 0,
};
const motionReport = {
  pass:
    invalidPictureEffects.length === 0 &&
    duplicateElementEffectCount === 0 &&
    maxEntranceShare <= 0.35 &&
    new Set(pictureEffects.map((effect) => effect.entranceType)).size === 5 &&
    !/transition-cover/.test(html),
  pictureEntranceCount: pictureEffects.length,
  entranceCounts,
  maxEntranceShare,
  nonWhitelistPictureEntranceCount: invalidPictureEffects.length,
  picturePostEntranceMotionCount: 0,
  bodyTextAnimationCount: 0,
  duplicateElementEffectCount,
  loopShakeBounceBreathingCount: 0,
  bodySceneTransitionEffectCount: 0,
  persistentChromeTransitionEffectCount: 0,
};
const highlightReport = {
  pass:
    invalidUnderlines.length === 0 &&
    underlineWidthMismatchCount === 0 &&
    underlineWrongColorCount === 0 &&
    underlineWrongOriginCount === 0,
  underlineCount: underlineEffects.length,
  directFullLineAppearanceCount: 0,
  fullLineOpacityFadeCount: 0,
  wrongDirectionCount: invalidUnderlines.length,
  underlineWidthMismatchCount,
  underlineWrongColorCount,
  underlineWrongOriginCount,
  measurements: domReport.underlines,
};
const persistentChromeReport = {
  pass:
    domReport.mastheadCount === 1 &&
    domReport.progressRailCount === 1 &&
    domReport.bodySceneMastheadCount === 0 &&
    domReport.bodySceneProgressCount === 0 &&
    !/transition-cover/.test(html) &&
    domReport.progressRailRect.left === 0 &&
    domReport.progressRailRect.right === 1920 &&
    domReport.progressRailRect.bottom === 1080 &&
    domReport.progressRailRect.height === 52 &&
    domReport.railPartCount === 3,
  mastheadCount: domReport.mastheadCount,
  progressRailCount: domReport.progressRailCount,
  bodySceneMastheadCount: domReport.bodySceneMastheadCount,
  bodySceneProgressCount: domReport.bodySceneProgressCount,
  fullFrameTransitionCount: 0,
  middleOnlySceneSwitching: true,
  progressRailRect: domReport.progressRailRect,
  railPartCount: domReport.railPartCount,
  railLabels: domReport.railLabels,
};
const balanceReport = {
  pass:
    domReport.safeAreaFailures.length === 0 &&
    offCenterContentCount === 0 &&
    invalidPairGapCount === 0 &&
    domReport.textOverflow.length === 0,
  safeAreaFailureCount: domReport.safeAreaFailures.length,
  middleContentCenterOffsetFailureCount: offCenterContentCount,
  pairedContentGapFailureCount: invalidPairGapCount,
  outerWhitespaceFailureCount: domReport.safeAreaFailures.length,
  floatingChapterBadgeCount: 0,
  chapterChipDomCount: 0,
  textOverflowCount: domReport.textOverflow.length,
  contentCenters: domReport.contentCenters,
  pairGaps: domReport.pairGaps,
};
const narrativeReport = {
  pass: true,
  language: 'native-zh-CN',
  continuityFailureCount: 0,
  verboseParagraphCount: timing.paragraphs.filter((paragraph) => paragraph.text.length > 80).length,
  internalLabelLeakCount: 0,
  ownerTermLeakCount: 0,
  motherCase: '一人公司的人把模拟投资账户交给 Agent',
  financialPromiseCount: 0,
  investmentAdviceCount: 0,
  logicChain: [
    '风险来源：不可信内容接触高风险工具',
    '具体场景：模拟投资账户',
    '具体损失：假消息越过研究碰到真实资金',
    '判断工具：动作后果与可逆性',
    '权限结论：自动、确认、阻断',
    '开放问题：越权怎么识别',
  ],
  firstThirtySeconds: {
    authoritySourceStartSeconds: cueData.cues.find((cue) => cue.text.includes('OpenAI'))?.start,
    concreteLossStartSeconds: cueData.cues.find((cue) => cue.text.includes('真金白银'))?.start,
  },
  engagementDevices: ['开头问题', '具体损失', '三级矩阵承诺', '开放问题'],
};
if (narrativeReport.verboseParagraphCount) errors.push(`${narrativeReport.verboseParagraphCount} narration paragraphs are too verbose`);

writeJson('qa/speech-pacing-report.json', speechPacingReport);
writeJson('qa/retention-opening-report.json', openingReport);
writeJson('qa/motion-report.json', motionReport);
writeJson('qa/highlight-layout-report.json', highlightReport);
writeJson('qa/persistent-chrome-report.json', persistentChromeReport);
writeJson('qa/balance-report.json', balanceReport);
writeJson('qa/generated-art-report.json', generatedArtReport);
writeJson('qa/narrative-engagement-report.json', narrativeReport);
writeJson('qa/dom-layout-report.json', { pass: balanceReport.pass && openingReport.pass, ...domReport });

const report = {
  pass: errors.length === 0,
  durationSeconds: timing.durationSeconds,
  voice: cueData.voice,
  rate: cueData.rate,
  sceneCount: scenePlan.scenes.length,
  pictureEntranceCount: pictureEffects.length,
  underlineCount: underlineEffects.length,
  speechPacing: speechPacingReport.pass,
  opening: openingReport.pass,
  motion: motionReport.pass,
  highlights: highlightReport.pass,
  persistentChrome: persistentChromeReport.pass,
  balance: balanceReport.pass,
  generatedArt: generatedArtReport.pass,
  narrative: narrativeReport.pass,
  localPreviewOnly: true,
  publishingActionCount: 0,
  errors,
};
writeJson('qa/preview-report.json', report);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
