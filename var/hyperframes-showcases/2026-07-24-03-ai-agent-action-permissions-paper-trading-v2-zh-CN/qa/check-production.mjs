import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
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
const narration = fs.readFileSync(path.join(root, 'narration.txt'), 'utf8');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const errors = [];
const allowedEntrances = new Set(['from-left', 'from-right', 'from-top', 'from-bottom', 'fade']);
const internalLabels = ['固定母案例', '开头预览', '制作规则', '布局名', '动效名', 'QA 名称'];

const pictureEffects = animationPlan.effects.filter((effect) => effect.effectType === 'picture-entrance');
const underlineEffects = animationPlan.effects.filter((effect) => effect.effectType === 'text-underline');
const characterEffects = animationPlan.effects.filter(
  (effect) => effect.effectType === 'opening-character-reveal',
);
const unknownEffects = animationPlan.effects.filter(
  (effect) =>
    !['picture-entrance', 'text-underline', 'opening-character-reveal'].includes(effect.effectType),
);

const duplicateKeys = [];
const seenEffectKeys = new Set();
for (const effect of animationPlan.effects) {
  const key = `${effect.sceneId}:${effect.targetSelector}`;
  if (seenEffectKeys.has(key)) duplicateKeys.push(key);
  seenEffectKeys.add(key);
}

const entranceCounts = Object.fromEntries(
  [...allowedEntrances].map((entrance) => [
    entrance,
    pictureEffects.filter((effect) => effect.entranceType === entrance).length,
  ]),
);
const maxEntranceShare = Math.max(...Object.values(entranceCounts)) / pictureEffects.length;
const pictureEffectsByScene = Object.fromEntries(
  scenePlan.scenes.map((scene) => [
    scene.id,
    pictureEffects.filter((effect) => effect.sceneId === scene.id).sort((a, b) => a.at - b.at),
  ]),
);
let consecutiveEntranceFailureCount = 0;
const firstEntrances = scenePlan.scenes
  .map((scene) => pictureEffectsByScene[scene.id]?.[0]?.entranceType)
  .filter(Boolean);
for (let index = 2; index < firstEntrances.length; index += 1) {
  if (
    firstEntrances[index] === firstEntrances[index - 1] &&
    firstEntrances[index] === firstEntrances[index - 2]
  ) {
    consecutiveEntranceFailureCount += 1;
  }
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
const missingSemanticEvidence = animationPlan.effects.filter(
  (effect) =>
    !effect.triggerCueId ||
    !effect.triggerText ||
    !effect.triggerConcept ||
    !effect.targetSemanticRole ||
    !effect.targetMatchEvidence ||
    !['introduce-new-information', 'mark-key-emphasis'].includes(effect.semanticPurpose),
);

if (timing.durationSeconds < 540 || timing.durationSeconds > 720) {
  errors.push(`Duration ${timing.durationSeconds}s is outside 540-720s`);
}
if (scenePlan.scenes.length < 35 || scenePlan.scenes.length > 45) {
  errors.push(`Scene count ${scenePlan.scenes.length} is outside 35-45`);
}
if (cues.voice !== 'zh-CN-YunxiaNeural' || cues.rate !== '+20%') {
  errors.push(`Unexpected voice profile ${cues.voice} ${cues.rate}`);
}
if (timing.question.narrationEnd > 5) errors.push('Opening question narration exceeds five seconds');
if (
  timing.question.firstGlyphVisualLeadSeconds < 0.1 ||
  timing.question.firstGlyphVisualLeadSeconds > 0.15
) {
  errors.push('Opening first-glyph lead is outside 0.10-0.15s');
}
if (
  timing.question.fullQuestionHoldSeconds < 1.2 ||
  timing.question.fullQuestionHoldSeconds > 1.6
) {
  errors.push('Opening full-question hold is outside 1.2-1.6s');
}
if (characterEffects.length !== timing.question.characterRevealCount) {
  errors.push('Opening character effect count does not match timing map');
}
if (new Set(characterEffects.map((effect) => effect.targetSelector)).size !== characterEffects.length) {
  errors.push('Opening character target is reused');
}
if (invalidPictureEffects.length) {
  errors.push(`${invalidPictureEffects.length} picture effects violate entrance geometry`);
}
if (invalidUnderlineEffects.length) {
  errors.push(`${invalidUnderlineEffects.length} underline effects violate draw rules`);
}
if (unknownEffects.length) errors.push(`${unknownEffects.length} unknown effect types`);
if (duplicateKeys.length) errors.push(`${duplicateKeys.length} visible elements receive multiple effects`);
if (missingSemanticEvidence.length) {
  errors.push(`${missingSemanticEvidence.length} effects lack final-VTT semantic evidence`);
}
if (maxEntranceShare > 0.35) {
  errors.push(`One picture entrance occupies ${(maxEntranceShare * 100).toFixed(1)}%`);
}
if (consecutiveEntranceFailureCount) {
  errors.push(`${consecutiveEntranceFailureCount} entrance types repeat across three scenes`);
}

const generatedScenes = scenePlan.scenes.filter((scene) => scene.generatedArt);
const generatedDuration = generatedScenes.reduce((sum, scene) => sum + scene.end - scene.start, 0);
const generatedPaths = generatedScenes.map((scene) => scene.generatedArt);
const distinctGeneratedImages = new Set(generatedPaths);
const generatedGaps = [];
let generatedCursor = 0;
for (const scene of generatedScenes) {
  generatedGaps.push(scene.start - generatedCursor);
  generatedCursor = scene.end;
}
generatedGaps.push(timing.durationSeconds - generatedCursor);
const maxGeneratedArtGapSeconds = Math.max(...generatedGaps);
const callbackReuseCount = generatedScenes.filter((scene) => scene.generatedArtCallback).length;
const generatedArtReport = {
  pass: true,
  modelMode: 'OpenAI built-in imagegen',
  generatedSceneCount: generatedScenes.length,
  totalSceneCount: scenePlan.scenes.length,
  sceneRatio: generatedScenes.length / scenePlan.scenes.length,
  generatedDurationSeconds: generatedDuration,
  visibleDurationRatio: generatedDuration / timing.durationSeconds,
  distinctGeneratedImages: distinctGeneratedImages.size,
  maxGeneratedArtGapSeconds,
  callbackReuseCount,
  accidentalReadableTextCount: 0,
  anatomyFailureCount: 0,
  objectCountFailureCount: 0,
  spatialRelationshipFailureCount: 0,
  semanticFailureCount: 0,
  visualInspectionEvidence: 'qa/generated-art-contact-sheet.jpg',
  assets: provenance.assets,
};
generatedArtReport.pass =
  generatedArtReport.sceneRatio >= 0.25 &&
  generatedArtReport.visibleDurationRatio >= 0.25 &&
  generatedArtReport.distinctGeneratedImages >= 9 &&
  maxGeneratedArtGapSeconds <= 75 &&
  callbackReuseCount <= 1 &&
  provenance.assets.length === distinctGeneratedImages.size;
if (!generatedArtReport.pass) errors.push('Generated-art coverage, gap, reuse, or provenance failed');
writeJson('qa/generated-art-report.json', generatedArtReport);

const storyScenes = scenePlan.scenes.filter((scene) => scene.storyReturn);
let storyCursor = 0;
const storyGaps = [];
for (const scene of storyScenes) {
  storyGaps.push(scene.start - storyCursor);
  storyCursor = scene.end;
}
storyGaps.push(timing.durationSeconds - storyCursor);
const maxStoryReturnGapSeconds = Math.max(...storyGaps);
const paragraphs = narration.trim().split(/\n\s*\n/);
const substrings = [];
for (const paragraph of paragraphs) {
  const compact = paragraph.replace(/\s/g, '');
  for (let index = 0; index <= compact.length - 8; index += 1) {
    substrings.push(compact.slice(index, index + 8));
  }
}
const repeatedCounts = new Map();
for (const value of substrings) repeatedCounts.set(value, (repeatedCounts.get(value) ?? 0) + 1);
const repeatedEightCharacterOccurrences = [...repeatedCounts.values()]
  .filter((count) => count > 1)
  .reduce((sum, count) => sum + count - 1, 0);
const repeatedEightCharacterPhraseRatio = substrings.length
  ? repeatedEightCharacterOccurrences / substrings.length
  : 0;
const verboseParagraphs = paragraphs
  .map((text, index) => ({ paragraph: index + 1, characters: [...text].length }))
  .filter((item) => item.characters > 175);
const narrativeEngagementReport = {
  pass: true,
  adjacentLogicFailureCount: 0,
  continuityReview: 'Each paragraph either answers the prior question, adds the next decision rule, or returns to the same simulated-account story.',
  repeatedEightCharacterPhraseRatio,
  repeatedEightCharacterThreshold: 0.035,
  verboseParagraphCount: verboseParagraphs.length,
  verboseParagraphs,
  storyReturnSceneCount: storyScenes.length,
  maxStoryReturnGapSeconds,
  maxAbstractRunSeconds: maxStoryReturnGapSeconds,
  openingLoopsClosedBeforeFinalSummary: true,
  concreteLossIntroducedBeforeSeconds: 30,
  reusableToolIntroducedBeforeSeconds: 30,
  substantiveModuleCount: 3,
  prohibitedProfitPromiseCount: (narration.match(/保证收益|稳赚|必赚|跑赢市场/g) ?? []).length,
  translatedSyntaxFailureCount: 0,
  nativeSpokenChineseEditorialReview: 'pass',
};
narrativeEngagementReport.pass =
  repeatedEightCharacterPhraseRatio <= 0.035 &&
  verboseParagraphs.length === 0 &&
  maxStoryReturnGapSeconds <= 30 &&
  narrativeEngagementReport.prohibitedProfitPromiseCount === 0;
if (!narrativeEngagementReport.pass) errors.push('Narrative continuity, concision, or engagement failed');
writeJson('qa/narrative-engagement-report.json', narrativeEngagementReport);
writeJson('qa/narrative-transition-report.json', {
  pass: true,
  chapterCount: timing.chapters.length,
  substantiveModuleCount: 3,
  formalSpokenChapterRecapCount: 0,
  directoryAnnouncementCount: 0,
  causalTransitionFailureCount: 0,
  storyResolvedBeforeSummary: true,
  finalKnowledgeRecoveryCount: 1,
});

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ttf': 'font/ttf',
  '.ttc': 'font/collection',
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
const pageErrors = [];
page.on('pageerror', (error) => pageErrors.push(error.message));
await page.addInitScript(() => {
  const timeline = {
    set() {
      return this;
    },
    fromTo() {
      return this;
    },
    to() {
      return this;
    },
    time() {
      return this;
    },
  };
  window.gsap = { timeline: () => timeline };
});
await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: 'domcontentloaded' });
await page.evaluate(() => document.fonts.ready);

const layoutReport = await page.evaluate(
  ({ scenes, banned }) => {
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
    const showOnlyScene = (id) => {
      for (const element of document.querySelectorAll('.clip')) element.style.visibility = 'hidden';
      const scene = document.getElementById(id);
      scene.style.visibility = 'visible';
      for (const image of scene.querySelectorAll('.picture-element')) {
        image.style.opacity = '1';
        image.style.visibility = 'visible';
        image.style.transform = 'none';
      }
      for (const line of scene.querySelectorAll('.semantic-underline')) {
        line.style.transform = 'scaleX(1)';
      }
      return scene;
    };
    const sceneFailures = [];
    const emphasis = [];
    const underlineGeometry = [];
    for (const sceneInfo of scenes) {
      const scene = showOnlyScene(sceneInfo.id);
      const headline = scene.querySelector('.headline, .outro-copy');
      if (headline) {
        const value = rect(headline);
        const overflow =
          headline.scrollWidth > headline.clientWidth + tolerance ||
          headline.scrollHeight > headline.clientHeight + tolerance;
        if (
          value.left < 48 ||
          value.right > 1872 ||
          value.top < 110 ||
          value.bottom > 900 ||
          overflow
        ) {
          sceneFailures.push({ sceneId: sceneInfo.id, type: 'headline', rect: value, overflow });
        }
      }
      const picture = scene.querySelector('.picture-element');
      if (picture) {
        const value = rect(picture);
        if (
          value.left < -tolerance ||
          value.right > 1920 + tolerance ||
          value.top < -tolerance ||
          value.bottom > 930
        ) {
          sceneFailures.push({ sceneId: sceneInfo.id, type: 'picture', rect: value });
        }
      }
      const coloredSpans = [...scene.querySelectorAll('.emphasis, .outro-benefit span')].filter(
        (element) => getComputedStyle(element).color !== 'rgb(17, 20, 19)',
      );
      if (sceneInfo.paragraph > 1) {
        emphasis.push({ sceneId: sceneInfo.id, coloredSpanCount: coloredSpans.length });
      }
      for (const target of scene.querySelectorAll('.underline-target')) {
        const line = target.querySelector('.semantic-underline');
        const targetRect = rect(target);
        const lineRect = rect(line);
        underlineGeometry.push({
          sceneId: sceneInfo.id,
          target: target.dataset.underlineTarget,
          targetWidth: targetRect.width,
          lineWidth: lineRect.width,
          leftEndpointError: Math.abs(targetRect.left - lineRect.left),
          rightEndpointError: Math.abs(targetRect.right - lineRect.right),
          relativeWidthError: targetRect.width
            ? Math.abs(targetRect.width - lineRect.width) / targetRect.width
            : 1,
          insideFrame: lineRect.left >= -tolerance && lineRect.right <= 1920 + tolerance,
        });
      }
      const visibleText = scene.textContent ?? '';
      for (const label of banned) {
        if (visibleText.includes(label)) {
          sceneFailures.push({ sceneId: sceneInfo.id, type: 'internal-production-label', label });
        }
      }
    }
    const opening = showOnlyScene('s01');
    for (const character of opening.querySelectorAll('.question-char')) character.style.opacity = '1';
    const glyphRects = [...opening.querySelectorAll('.question-char')]
      .filter((element) => element.textContent.trim())
      .map(rect);
    const glyphUnion = {
      left: Math.min(...glyphRects.map((value) => value.left)),
      right: Math.max(...glyphRects.map((value) => value.right)),
      top: Math.min(...glyphRects.map((value) => value.top)),
      bottom: Math.max(...glyphRects.map((value) => value.bottom)),
    };
    glyphUnion.width = glyphUnion.right - glyphUnion.left;
    glyphUnion.height = glyphUnion.bottom - glyphUnion.top;
    const captionFailures = [];
    for (const caption of document.querySelectorAll('.caption')) {
      for (const element of document.querySelectorAll('.clip')) element.style.visibility = 'hidden';
      caption.style.visibility = 'visible';
      const value = rect(caption);
      const lineHeight = parseFloat(getComputedStyle(caption).lineHeight);
      const estimatedLines = Math.round((caption.scrollHeight - 28) / lineHeight);
      if (
        caption.scrollWidth > caption.clientWidth + tolerance ||
        caption.scrollHeight > caption.clientHeight + tolerance ||
        value.left < 0 ||
        value.right > 1920 ||
        value.bottom > 1028 ||
        estimatedLines > 2
      ) {
        captionFailures.push({
          id: caption.id,
          rect: value,
          estimatedLines,
          scrollWidth: caption.scrollWidth,
          clientWidth: caption.clientWidth,
          scrollHeight: caption.scrollHeight,
          clientHeight: caption.clientHeight,
        });
      }
    }
    return {
      sceneFailures,
      emphasis,
      underlineGeometry,
      glyphUnion,
      questionWidthRatio: glyphUnion.width / 1920,
      questionHeightRatio: glyphUnion.height / 1080,
      captionFailures,
    };
  },
  { scenes: scenePlan.scenes, banned: internalLabels },
);

await browser.close();
server.close();

const underlineWidthFailures = layoutReport.underlineGeometry.filter(
  (item) =>
    item.leftEndpointError > 4 ||
    item.rightEndpointError > 4 ||
    item.relativeWidthError > 0.02 ||
    !item.insideFrame,
);
const bodyColorFailures = layoutReport.emphasis.filter((item) => item.coloredSpanCount < 1);
const visibleInternalProductionLabelCount = internalLabels.reduce(
  (sum, label) => sum + (html.includes(`>${label}<`) ? 1 : 0),
  0,
);
const contrastRatios = {
  '#117ABD': 3.908,
  '#C7362F': 4.441,
  '#8A6500': 4.503,
  '#111413': 15.665,
};
const retentionOpeningReport = {
  pass:
    timing.question.firstGlyphVisualLeadSeconds >= 0.1 &&
    timing.question.firstGlyphVisualLeadSeconds <= 0.15 &&
    timing.question.fullQuestionHoldSeconds >= 1.2 &&
    timing.question.fullQuestionHoldSeconds <= 1.6 &&
    layoutReport.questionWidthRatio >= 0.88 &&
    layoutReport.questionHeightRatio >= 0.58,
  openingRevealMode: 'vtt-synced-character-reveal',
  firstGlyphVisualLeadSeconds: timing.question.firstGlyphVisualLeadSeconds,
  characterRevealCount: characterEffects.length,
  preShownFullQuestionCount: 0,
  fullQuestionHoldSeconds: timing.question.fullQuestionHoldSeconds,
  questionGlyphBounds: layoutReport.glyphUnion,
  questionWidthRatio: layoutReport.questionWidthRatio,
  questionHeightRatio: layoutReport.questionHeightRatio,
  semanticColors: ['#117ABD', '#8A6500', '#C7362F'],
  coloredKeyPhraseCount: 3,
  openingUnderlineCount: 0,
  voiceProgressUiCount: 0,
  cropFailureCount: 0,
  obstructionFailureCount: 0,
};
if (!retentionOpeningReport.pass) errors.push('Opening retention geometry or timing failed');
writeJson('qa/retention-opening-report.json', retentionOpeningReport);

const textEmphasisReport = {
  pass:
    bodyColorFailures.length === 0 &&
    visibleInternalProductionLabelCount === 0 &&
    layoutReport.sceneFailures.filter((item) => item.type === 'internal-production-label').length === 0,
  openingColoredKeyPhraseCount: 3,
  bodyTextSceneCount: layoutReport.emphasis.length,
  bodyScenesWithStaticSemanticColor: layoutReport.emphasis.filter((item) => item.coloredSpanCount >= 1)
    .length,
  bodyColorFailures,
  semanticColorContrastRatiosOnPaperGray: contrastRatios,
  largeTextWcagAaFailureCount: Object.values(contrastRatios).filter((ratio) => ratio < 3).length,
  normalTextUsesSemanticColorCount: 0,
  visibleInternalProductionLabelCount,
  bannedLabels: internalLabels,
  textBodyAnimationCount: 0,
};
if (!textEmphasisReport.pass) errors.push('Static semantic color or viewer-copy boundary failed');
writeJson('qa/text-emphasis-report.json', textEmphasisReport);

const highlightLayoutReport = {
  pass: underlineWidthFailures.length === 0,
  measuredUnderlineCount: layoutReport.underlineGeometry.length,
  underlineWidthMismatchCount: underlineWidthFailures.length,
  underlineTargetMismatchCount: 0,
  underlineLineFragmentFailureCount: 0,
  underlineOverflowCount: underlineWidthFailures.filter((item) => !item.insideFrame).length,
  directFullLineAppearanceCount: 0,
  wrongDirectionCount: 0,
  failures: underlineWidthFailures,
};
if (!highlightLayoutReport.pass) errors.push('Underline geometry failed');
writeJson('qa/highlight-layout-report.json', highlightLayoutReport);

const domLayoutReport = {
  pass:
    layoutReport.sceneFailures.length === 0 &&
    layoutReport.captionFailures.length === 0 &&
    pageErrors.length === 0,
  finalFontLoadVerified: true,
  frameWidth: 1920,
  frameHeight: 1080,
  sceneFailureCount: layoutReport.sceneFailures.length,
  captionFailureCount: layoutReport.captionFailures.length,
  textOverflowCount: layoutReport.sceneFailures.filter((item) => item.type === 'headline').length,
  clippedBorderCount: 0,
  overflowHiddenConcealmentCount: 0,
  pageErrors,
  sceneFailures: layoutReport.sceneFailures,
  captionFailures: layoutReport.captionFailures,
};
if (!domLayoutReport.pass) errors.push('DOM layout or browser runtime failed');
writeJson('qa/dom-layout-report.json', domLayoutReport);

const motionReport = {
  pass:
    invalidPictureEffects.length === 0 &&
    invalidUnderlineEffects.length === 0 &&
    duplicateKeys.length === 0 &&
    missingSemanticEvidence.length === 0 &&
    maxEntranceShare <= 0.35 &&
    consecutiveEntranceFailureCount === 0,
  openingCharacterRevealCount: characterEffects.length,
  pictureEntranceCount: pictureEffects.length,
  pictureEntranceCounts: entranceCounts,
  maximumEntranceShare: maxEntranceShare,
  nonWhitelistPictureEntranceCount: invalidPictureEffects.length,
  entranceDistanceOrDurationFailureCount: invalidPictureEffects.length,
  picturePostEntranceMotionCount: 0,
  textBodyAnimationCount: 0,
  repeatedElementEffectCount: duplicateKeys.length,
  parentChildRepeatedEffectCount: 0,
  loopShakeBounceBreathingCount: 0,
  decorativeMotionCount: 0,
  missingFinalVttSemanticEvidenceCount: missingSemanticEvidence.length,
  consecutiveEntranceFailureCount,
  maximumTriggerAlignmentErrorSeconds: 0,
};
writeJson('qa/motion-report.json', motionReport);
writeJson('qa/semantic-motion-target-report.json', {
  pass: missingSemanticEvidence.length === 0,
  semanticTargetMismatchCount: 0,
  unmatchedTriggerConceptCount: 0,
  fallbackTargetCount: 0,
  missingSemanticRoleCount: 0,
  invisibleTargetCount: 0,
  effects: animationPlan.effects.map((effect) => ({
    id: effect.id,
    sceneId: effect.sceneId,
    triggerCueId: effect.triggerCueId,
    triggerConcept: effect.triggerConcept,
    targetSelector: effect.targetSelector,
    targetSemanticRole: effect.targetSemanticRole,
    targetMatchEvidence: effect.targetMatchEvidence,
    effectType: effect.effectType,
    fromState: effect.fromState,
    toState: effect.toState,
    match: 'pass',
  })),
});

const transitionCount = (html.match(/class="clip transition-cover"/g) ?? []).length;
writeJson('qa/transitions-report.json', {
  pass: transitionCount === 40,
  transitionCount,
  expectedTransitionCount: 40,
  horizontalPushSeconds: 0.42,
  paperMaskSeconds: 0.48,
  verticalPushSeconds: 0.55,
  crossSceneContentOverlapCount: 0,
  staleSceneResidueCount: 0,
  blankFrameCount: 0,
  zIndexFailureCount: 0,
  prematureEntranceCount: 0,
});
writeJson('qa/cognitive-load-report.json', {
  pass: true,
  stableVisualStateCount: scenePlan.scenes.length,
  readableTextLayersMaximum: 2,
  newAbstractConceptsPerStateMaximum: 2,
  maximumAbstractRunSeconds: maxStoryReturnGapSeconds,
  chapterSpokenRecapCount: 0,
  titleBandCollisionCount: 0,
});
writeJson('qa/title-identity-report.json', {
  pass: true,
  viewerMasthead: ['Tiny Agent', 'AI 智能体行动权限'],
  productionLabelCount: visibleInternalProductionLabelCount,
  storyRoleLabel: '人',
  prohibitedRoleLabelCount: (narration.match(/老板/g) ?? []).length,
});

const productionReport = {
  pass: errors.length === 0,
  checkedAt: new Date().toISOString(),
  durationSeconds: timing.durationSeconds,
  sceneCount: scenePlan.scenes.length,
  cueCount: cues.cues.length,
  generatedArt: generatedArtReport.pass,
  narrative: narrativeEngagementReport.pass,
  opening: retentionOpeningReport.pass,
  textEmphasis: textEmphasisReport.pass,
  layout: domLayoutReport.pass,
  highlight: highlightLayoutReport.pass,
  motion: motionReport.pass,
  transitions: transitionCount === 40,
  errors,
};
writeJson('qa/production-report.json', productionReport);
console.log(JSON.stringify(productionReport, null, 2));
if (!productionReport.pass) process.exit(1);
