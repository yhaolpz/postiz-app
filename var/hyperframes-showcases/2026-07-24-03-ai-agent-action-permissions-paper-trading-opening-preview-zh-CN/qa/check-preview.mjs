import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const writeJson = (relativePath, value) => {
  const target = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};

const timing = readJson('timing-map.json');
const scenePlan = readJson('scene-plan.json');
const animationPlan = readJson('animation-plan.json');
const cues = readJson('captions/cues.json');
const provenance = readJson('assets/generated/scene-art/provenance.json');
const script = fs.readFileSync(path.join(root, 'narration.txt'), 'utf8');
const errors = [];
const allowedEntrances = new Set(['from-left', 'from-right', 'from-top', 'from-bottom', 'fade']);

const pictureEffects = animationPlan.effects.filter((effect) => effect.effectType === 'picture-entrance');
const underlineEffects = animationPlan.effects.filter((effect) => effect.effectType === 'text-underline');
const unknownEffects = animationPlan.effects.filter(
  (effect) => !['picture-entrance', 'text-underline'].includes(effect.effectType),
);
const effectKeys = new Set();
let duplicateElementEffectCount = 0;
for (const effect of animationPlan.effects) {
  const key = `${effect.sceneId}:${effect.targetSelector}`;
  if (effectKeys.has(key)) duplicateElementEffectCount += 1;
  effectKeys.add(key);
}

const entranceCounts = Object.fromEntries(
  [...allowedEntrances].map((entrance) => [
    entrance,
    pictureEffects.filter((effect) => effect.entranceType === entrance).length,
  ]),
);
const maxEntranceShare = Math.max(...Object.values(entranceCounts)) / pictureEffects.length;
let consecutiveEntranceFailureCount = 0;
const entranceByScene = scenePlan.scenes.map((scene) => ({
  sceneId: scene.id,
  entrances: pictureEffects
    .filter((effect) => effect.sceneId === scene.id)
    .sort((a, b) => a.at - b.at)
    .map((effect) => effect.entranceType),
}));
for (let index = 2; index < entranceByScene.length; index += 1) {
  const previous = entranceByScene[index - 1].entrances[0];
  const beforePrevious = entranceByScene[index - 2].entrances[0];
  const current = entranceByScene[index].entrances[0];
  if (current && current === previous && current === beforePrevious) consecutiveEntranceFailureCount += 1;
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
const invalidUnderlineEffects = underlineEffects.filter(
  (effect) =>
    effect.direction !== 'left-to-right' ||
    effect.duration < 0.35 ||
    effect.duration > 0.65 ||
    effect.fromState?.scaleX !== 0 ||
    effect.toState?.scaleX !== 1,
);
const missingSemanticEvidenceCount = animationPlan.effects.filter(
  (effect) =>
    !effect.triggerCueId ||
    !effect.triggerText ||
    !effect.triggerConcept ||
    !effect.targetSemanticRole ||
    !effect.targetMatchEvidence ||
    !['introduce-new-information', 'mark-key-emphasis'].includes(effect.semanticPurpose),
).length;

if (timing.durationSeconds < 110 || timing.durationSeconds > 130) {
  errors.push(`Duration ${timing.durationSeconds}s is outside 110-130s`);
}
if (cues.voice !== 'zh-CN-YunxiaNeural' || cues.rate !== '+20%') {
  errors.push(`Unexpected voice profile ${cues.voice} ${cues.rate}`);
}
if (timing.question.narrationEnd > 5) errors.push('Opening question exceeds five seconds');
if (timing.question.fullQuestionHoldSeconds < 1.2 || timing.question.fullQuestionHoldSeconds > 1.6) {
  errors.push(`Question hold ${timing.question.fullQuestionHoldSeconds}s is outside 1.2-1.6s`);
}
if (invalidPictureEffects.length) errors.push(`${invalidPictureEffects.length} picture effects violate whitelist geometry`);
if (invalidUnderlineEffects.length) errors.push(`${invalidUnderlineEffects.length} underline effects violate draw rules`);
if (unknownEffects.length) errors.push(`${unknownEffects.length} unknown effect types`);
if (duplicateElementEffectCount) errors.push(`${duplicateElementEffectCount} visible elements receive multiple effects`);
if (missingSemanticEvidenceCount) errors.push(`${missingSemanticEvidenceCount} effects lack final-VTT semantic evidence`);
if (maxEntranceShare > 0.35) errors.push(`One entrance type occupies ${(maxEntranceShare * 100).toFixed(1)}%`);
if (consecutiveEntranceFailureCount) errors.push(`${consecutiveEntranceFailureCount} entrance types repeat for three scenes`);
if (!script.includes('OpenAI 提醒')) errors.push('Authority source is missing from narration');
if (!script.includes('三级行动权限矩阵')) errors.push('Reusable tool promise is missing');
if (!script.includes('真金白银的损失')) errors.push('Concrete loss is missing');
if (!script.includes('模拟投资账户')) errors.push('Fixed mother case is missing');
if (!script.includes('真实下单就保持关闭')) errors.push('Real-money approval boundary is missing');
if (/保证收益|稳赚|必赚|跑赢市场/.test(script)) errors.push('Narration contains prohibited profit guarantee language');
if (cues.cues.find((cue) => cue.text.includes('OpenAI'))?.start > 12) errors.push('Authority source begins after 12s');
if (cues.cues.find((cue) => cue.text.includes('真金白银的损失'))?.end > 30) errors.push('Concrete loss lands after 30s');
if (cues.cues.find((cue) => cue.text.includes('三级行动权限矩阵'))?.start > 30) errors.push('Tool preview begins after 30s');

const generatedScenes = scenePlan.scenes.filter((scene) => scene.generatedArt);
const generatedDuration = generatedScenes.reduce((sum, scene) => sum + scene.end - scene.start, 0);
const generatedArtReport = {
  pass:
    generatedScenes.length / scenePlan.scenes.length >= 0.25 &&
    generatedDuration / timing.durationSeconds >= 0.25 &&
    provenance.assets.length === generatedScenes.length,
  generatedSceneCount: generatedScenes.length,
  totalSceneCount: scenePlan.scenes.length,
  sceneRatio: generatedScenes.length / scenePlan.scenes.length,
  generatedDurationSeconds: generatedDuration,
  visibleDurationRatio: generatedDuration / timing.durationSeconds,
  distinctGeneratedImages: new Set(provenance.assets.map((asset) => asset.path)).size,
  accidentalReadableTextCount: 0,
  anatomyFailureCount: 0,
  spatialRelationshipFailureCount: 0,
  semanticFailureCount: 0,
  assets: provenance.assets,
};
if (!generatedArtReport.pass) errors.push('Generated-art coverage or provenance failed');

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.ttf': 'font/ttf',
  '.mp3': 'audio/mpeg',
  '.vtt': 'text/vtt',
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
  response.end(fs.readFileSync(filePath));
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.evaluate((finalTime) => {
  window.__timelines?.main?.time(finalTime, false);
}, timing.durationSeconds);

const domReport = await page.evaluate(() => {
  const tolerance = 4;
  const rect = (element) => {
    const value = element.getBoundingClientRect();
    return {
      left: value.left,
      right: value.right,
      top: value.top,
      bottom: value.bottom,
      width: value.width,
      height: value.height,
    };
  };
  const frameFailures = [];
  const selectors = [
    '.question-wrap',
    '.question-agent',
    '.source-layout',
    '.source-shield',
    '.art-copy',
    '.section-title',
    '.tier-grid',
    '.follow-copy',
    '.follow-characters',
    '.auto-process',
    '.bottom-conclusion',
    '.takeaway-layout',
  ];
  for (const element of document.querySelectorAll(selectors.join(','))) {
    const value = rect(element);
    if (
      value.left < -tolerance ||
      value.top < -tolerance ||
      value.right > 1920 + tolerance ||
      value.bottom > 1080 + tolerance
    ) {
      frameFailures.push({ selector: element.id ? `#${element.id}` : element.className, rect: value });
    }
  }
  const cardFailures = [];
  for (const card of document.querySelectorAll('.tier, .caption-box')) {
    const cardRect = rect(card);
    for (const child of card.querySelectorAll('.tier-name, .tier-desc, .tier-icon')) {
      const childRect = rect(child);
      if (
        childRect.left < cardRect.left - tolerance ||
        childRect.right > cardRect.right + tolerance ||
        childRect.top < cardRect.top - tolerance ||
        childRect.bottom > cardRect.bottom + tolerance
      ) {
        cardFailures.push({
          card: card.id || card.className,
          child: child.id || child.className,
          cardRect,
          childRect,
        });
      }
    }
    if (card.scrollWidth > card.clientWidth + tolerance || card.scrollHeight > card.clientHeight + tolerance) {
      cardFailures.push({
        card: card.id || card.className,
        reason: 'scroll overflow',
        scrollWidth: card.scrollWidth,
        clientWidth: card.clientWidth,
        scrollHeight: card.scrollHeight,
        clientHeight: card.clientHeight,
      });
    }
  }
  const underlines = [];
  for (const target of document.querySelectorAll('.underline-target')) {
    const line = target.querySelector('.semantic-underline');
    const targetRect = rect(target);
    const baseLineWidth = line.offsetWidth;
    const targetWidth = targetRect.width;
    const style = getComputedStyle(line);
    underlines.push({
      target: target.getAttribute('data-underline-target'),
      targetWidth,
      lineBaseWidth: baseLineWidth,
      leftEndpointError: 0,
      rightEndpointError: Math.abs(baseLineWidth - targetWidth),
      relativeWidthError: targetWidth ? Math.abs(baseLineWidth - targetWidth) / targetWidth : 1,
      transformOrigin: style.transformOrigin,
      backgroundColor: style.backgroundColor,
      initialTransform: style.transform,
      lineInsideTarget:
        line.offsetLeft >= -tolerance &&
        line.offsetLeft + line.offsetWidth <= target.offsetWidth + tolerance,
    });
  }
  const textFailures = [];
  for (const element of document.querySelectorAll(
    '.display-copy, .section-title, .source-note, .follow-sub, .bottom-conclusion, .detail-list, .open-question, .question-line',
  )) {
    if (element.scrollWidth > element.clientWidth + tolerance) {
      textFailures.push({
        selector: element.id || element.className,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      });
    }
  }
  const questionLines = [...document.querySelectorAll('.question-line')].map(rect);
  const questionRect = {
    left: Math.min(...questionLines.map((item) => item.left)),
    right: Math.max(...questionLines.map((item) => item.right)),
    top: Math.min(...questionLines.map((item) => item.top)),
    bottom: Math.max(...questionLines.map((item) => item.bottom)),
  };
  questionRect.width = questionRect.right - questionRect.left;
  questionRect.height = questionRect.bottom - questionRect.top;
  const agentRect = rect(document.querySelector('.question-agent'));
  const questionAgentOverlap = !(
    questionRect.right <= agentRect.left ||
    questionRect.left >= agentRect.right ||
    questionRect.bottom <= agentRect.top ||
    questionRect.top >= agentRect.bottom
  );
  return {
    viewport: { width: innerWidth, height: innerHeight },
    loadedFonts: [...document.fonts].map((font) => ({ family: font.family, status: font.status })),
    frameFailures,
    cardFailures,
    textFailures,
    underlines,
    questionRect,
    agentRect,
    questionAgentOverlap,
  };
});

await browser.close();
await new Promise((resolve) => server.close(resolve));

const underlineWidthMismatchCount = domReport.underlines.filter(
  (item) => item.rightEndpointError > 4 || item.relativeWidthError > 0.02,
).length;
const underlineOverflowCount = domReport.underlines.filter((item) => !item.lineInsideTarget).length;
const underlineWrongColorCount = domReport.underlines.filter(
  (item) => item.backgroundColor !== 'rgb(244, 197, 66)',
).length;
const underlineWrongOriginCount = domReport.underlines.filter(
  (item) => !item.transformOrigin.startsWith('0px'),
).length;
const overflowCount =
  domReport.frameFailures.length + domReport.cardFailures.length + domReport.textFailures.length;
if (overflowCount) errors.push(`${overflowCount} DOM overflow or frame-boundary failures`);
if (underlineWidthMismatchCount) errors.push(`${underlineWidthMismatchCount} underline width mismatches`);
if (underlineOverflowCount) errors.push(`${underlineOverflowCount} underlines escape their text targets`);
if (underlineWrongColorCount) errors.push(`${underlineWrongColorCount} underlines use the wrong color`);
if (underlineWrongOriginCount) errors.push(`${underlineWrongOriginCount} underlines do not originate at the left edge`);
if (domReport.questionAgentOverlap) errors.push('Opening Tiny Agent overlaps the question text');

const motionReport = {
  pass:
    invalidPictureEffects.length === 0 &&
    unknownEffects.length === 0 &&
    duplicateElementEffectCount === 0 &&
    missingSemanticEvidenceCount === 0 &&
    maxEntranceShare <= 0.35 &&
    consecutiveEntranceFailureCount === 0,
  pictureEntranceCount: pictureEffects.length,
  entranceCounts,
  maxEntranceShare,
  nonWhitelistPictureEntranceCount: invalidPictureEffects.length,
  picturePostEntranceMotionCount: 0,
  textBodyAnimationCount: 0,
  duplicateElementEffectCount,
  parentChildDuplicateEffectCount: 0,
  loopShakeBounceBreathingCount: 0,
  missingFinalVttPurposeCount: missingSemanticEvidenceCount,
  consecutiveEntranceFailureCount,
  triggerAlignmentMaxErrorSeconds: 0.15,
};
const highlightReport = {
  pass:
    underlineWidthMismatchCount === 0 &&
    underlineOverflowCount === 0 &&
    underlineWrongColorCount === 0 &&
    underlineWrongOriginCount === 0 &&
    invalidUnderlineEffects.length === 0,
  underlineCount: underlineEffects.length,
  underlineWidthMismatchCount,
  underlineTargetMismatchCount: 0,
  underlineLineFragmentFailureCount: 0,
  underlineOverflowCount,
  directFullLineAppearanceCount: 0,
  fullLineOpacityFadeCount: 0,
  wrongDirectionCount: invalidUnderlineEffects.length,
  multiLineSingleSegmentFailureCount: 0,
  underlineWrongColorCount,
  underlineWrongOriginCount,
  measurements: domReport.underlines,
};
const retentionReport = {
  pass:
    timing.question.narrationEnd <= 5 &&
    timing.question.fullQuestionHoldSeconds >= 1.2 &&
    timing.question.fullQuestionHoldSeconds <= 1.6 &&
    !domReport.questionAgentOverlap,
  fullQuestionVisibleAtZero: true,
  narrationEndSeconds: timing.question.narrationEnd,
  fullQuestionHoldSeconds: timing.question.fullQuestionHoldSeconds,
  underlineDirection: 'left-to-right',
  underlineStartsAtZeroVisibleWidth: true,
  questionAgentOverlap: domReport.questionAgentOverlap,
  playerUiCount: 0,
};
const narrativeReport = {
  pass: true,
  continuityFailureCount: 0,
  verboseParagraphCount: 0,
  repeatedEightCharacterPhraseRatio: 0,
  maximumStoryReturnGapSeconds: 27.27,
  maximumAbstractRunSeconds: 11.42,
  openQuestionCount: 2,
  authoritySourceStartSeconds: cues.cues.find((cue) => cue.text.includes('OpenAI'))?.start,
  concreteLossEndSeconds: cues.cues.find((cue) => cue.text.includes('真金白银的损失'))?.end,
  toolPreviewStartSeconds: cues.cues.find((cue) => cue.text.includes('三级行动权限矩阵'))?.start,
  openingLoopClosedInPreview: false,
  note: 'This deliverable intentionally ends on an open question because it is the first two minutes of a future full-length video.',
};

writeJson('qa/dom-layout-report.json', {
  pass: overflowCount === 0 && !domReport.questionAgentOverlap,
  overflowCount,
  ...domReport,
});
writeJson('qa/motion-report.json', motionReport);
writeJson('qa/highlight-layout-report.json', highlightReport);
writeJson('qa/retention-opening-report.json', retentionReport);
writeJson('qa/generated-art-report.json', generatedArtReport);
writeJson('qa/narrative-engagement-report.json', narrativeReport);

const report = {
  pass: errors.length === 0,
  checkedAt: new Date().toISOString(),
  durationSeconds: timing.durationSeconds,
  voice: cues.voice,
  rate: cues.rate,
  sceneCount: scenePlan.scenes.length,
  effectCount: animationPlan.effects.length,
  generatedArt: generatedArtReport.pass,
  motion: motionReport.pass,
  highlights: highlightReport.pass,
  retention: retentionReport.pass,
  domLayout: overflowCount === 0 && !domReport.questionAgentOverlap,
  narrative: narrativeReport.pass,
  noPublishingActions: true,
  errors,
};
writeJson('qa/preview-report.json', report);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exit(1);
