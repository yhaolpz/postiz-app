import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const projectFlag = args.indexOf('--project');

if (projectFlag < 0 || !args[projectFlag + 1]) {
  console.error('Usage: node scripts/ai-video-pipeline/validate-tiny-agent-longform-output.mjs --project <PROJECT_DIR>');
  process.exit(2);
}

const project = path.resolve(root, args[projectFlag + 1]);
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const file = path.join(project, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return {};
  }
}

function required(value, label) {
  if (value === undefined || value === null || value === '') {
    fail(`${label}: missing`);
    return false;
  }
  return true;
}

function inRange(value, range, label) {
  if (!required(value, label)) return;
  if (typeof value !== 'number' || value < range.min || value > range.max) {
    fail(`${label}: expected ${range.min}-${range.max}, received ${JSON.stringify(value)}`);
  }
}

function isTrue(value, label) {
  if (value !== true) fail(`${label}: expected true, received ${JSON.stringify(value)}`);
}

function sceneList(scenePlan) {
  return (scenePlan.chapters ?? []).flatMap((chapter) => chapter.scenes ?? []);
}

function assetName(entry) {
  return path.basename(entry.file ?? entry.path ?? entry.asset ?? '');
}

const profile = JSON.parse(
  fs.readFileSync(
    path.join(root, 'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'),
    'utf8'
  )
);
const overrides = profile.postSnapshotUserOverrides ?? {};
const opening = overrides.openingQuestionReadability ?? {};
const recapRule = overrides.chapterRecapNarration?.screenCopy ?? {};
const episode = readJson('episode.json');
const summary = readJson('summary.json');
const scenePlan = readJson('scene-plan.json');
const timingMap = readJson('timing-map.json');
const openingReport = readJson('qa/retention-opening-report.json');
const hookQualityReport = readJson('qa/opening-hook-quality-report.json');
const chinesePronunciationReport = readJson('qa/chinese-pronunciation-report.json');
const chineseMandarinProsodyReport = readJson('qa/chinese-mandarin-prosody-report.json');
const onScreenTextCompletenessReport = readJson('qa/on-screen-text-completeness-report.json');
const finalCaptionCues = readJson('captions/cues.json');
const recapReport = readJson('qa/recap-visual-copy-report.json');
const alphaReport = readJson('qa/generated-art-alpha-report.json');
const scenes = sceneList(scenePlan);
const recaps = scenes.filter((scene) => scene.type === 'recap');
const generated = scenes.filter((scene) => scene.temporaryGenerated || scene.generatedArt);
const forbiddenRecapMarker = /本章小节|Chapter\s+recap|^(?:第?[一二三]|First|Second|Third)[，、.:：]|^\s*[123][.、]/i;
const locale = episode.locale;
const expectedAudio = profile.fixedBilingualGeneration?.[locale];
const durationRange = profile.fixedBilingualGeneration?.durationSeconds;

if (!['zh-CN', 'en-US'].includes(locale)) {
  fail(`episode.json locale: unsupported ${JSON.stringify(locale)}`);
}
if (!expectedAudio?.voice || !expectedAudio?.rate) {
  fail(`active profile: missing audio contract for ${JSON.stringify(locale)}`);
} else {
  for (const [source, record] of Object.entries({
    'episode.json': episode,
    'timing-map.json': timingMap,
    'summary.json': summary,
  })) {
    if (record.locale !== locale) fail(`${source} locale: expected ${locale}, received ${JSON.stringify(record.locale)}`);
    if (record.voice !== expectedAudio.voice) fail(`${source} voice: expected ${expectedAudio.voice}, received ${JSON.stringify(record.voice)}`);
    if (record.rate !== expectedAudio.rate) fail(`${source} rate: expected ${expectedAudio.rate}, received ${JSON.stringify(record.rate)}`);
  }
}
inRange(timingMap.duration, durationRange ?? {}, 'timing-map.json duration');
inRange(summary.duration, durationRange ?? {}, 'summary.json duration');

const chinesePronunciationRule = overrides.chinesePronunciation ?? {};
const chineseMandarinProsodyRule = overrides.chineseMandarinProsody ?? {};
const onScreenTextCompletenessRule = overrides.onScreenTextCompleteness ?? {};
if (locale === 'zh-CN') {
  if (chinesePronunciationRule.status !== 'active') {
    fail('active profile: Chinese pronunciation rule is missing or inactive');
  } else {
    isTrue(chinesePronunciationReport.pass, 'qa/chinese-pronunciation-report.json pass');
    if (chinesePronunciationReport.locale !== 'zh-CN') {
      fail(`Chinese pronunciation report locale: expected zh-CN, received ${JSON.stringify(chinesePronunciationReport.locale)}`);
    }
    if (chinesePronunciationReport.scriptFile !== episode.scriptFile) {
      fail(`Chinese pronunciation report scriptFile: expected ${JSON.stringify(episode.scriptFile)}, received ${JSON.stringify(chinesePronunciationReport.scriptFile)}`);
    }
    if (chinesePronunciationReport.allDeclaredTermsResolved !== true) {
      fail('Chinese pronunciation report: allDeclaredTermsResolved must be true');
    }
    const entries = chinesePronunciationReport.entries;
    if (!Array.isArray(entries)) {
      fail('Chinese pronunciation report: entries must be an array');
    } else {
      for (const entry of entries) {
        required(entry.ambiguousForm, 'Chinese pronunciation entry ambiguousForm');
        required(entry.intendedPinyin, 'Chinese pronunciation entry intendedPinyin');
        required(entry.approvedTtsText, 'Chinese pronunciation entry approvedTtsText');
        if (!['lexical-rewrite', 'grammatical-context'].includes(entry.strategy)) {
          fail(`Chinese pronunciation entry ${JSON.stringify(entry.ambiguousForm)}: unsupported strategy ${JSON.stringify(entry.strategy)}`);
        }
        if (!Array.isArray(entry.segmentIds) || entry.segmentIds.length === 0) {
          fail(`Chinese pronunciation entry ${JSON.stringify(entry.ambiguousForm)}: segmentIds are required`);
          continue;
        }
        for (const segmentId of entry.segmentIds) {
          const segment = (timingMap.segments ?? []).find((candidate) => candidate.id === segmentId);
          if (!segment || !String(segment.text ?? '').includes(entry.approvedTtsText)) {
            fail(`Chinese pronunciation entry ${JSON.stringify(entry.ambiguousForm)}: final TTS evidence is missing for ${segmentId}`);
          }
        }
        if (entry.strategy === 'lexical-rewrite' && entry.ambiguousForm === entry.approvedTtsText) {
          fail(`Chinese pronunciation entry ${JSON.stringify(entry.ambiguousForm)}: lexical rewrite must replace the ambiguous bare phrase`);
        }
      }
    }
  }
  if (chineseMandarinProsodyRule.status !== 'active') {
    fail('active profile: Chinese Mandarin prosody rule is missing or inactive');
  } else {
    isTrue(chineseMandarinProsodyReport.pass, 'qa/chinese-mandarin-prosody-report.json pass');
    if (chineseMandarinProsodyReport.locale !== 'zh-CN') {
      fail(`Chinese Mandarin prosody report locale: expected zh-CN, received ${JSON.stringify(chineseMandarinProsodyReport.locale)}`);
    }
    if (JSON.stringify(chineseMandarinProsodyReport.sentenceTerminators) !== JSON.stringify(chineseMandarinProsodyRule.ttsSegmentation?.sentenceTerminators)) {
      fail('Chinese Mandarin prosody report: sentence terminators do not match the active profile');
    }
    if (JSON.stringify(chineseMandarinProsodyReport.forbiddenTtsSegmentBoundaryPunctuation) !== JSON.stringify(chineseMandarinProsodyRule.ttsSegmentation?.forbiddenBoundaryPunctuation)) {
      fail('Chinese Mandarin prosody report: forbidden TTS boundaries do not match the active profile');
    }
    const prosodySegments = chineseMandarinProsodyReport.ttsSegments;
    if (!Array.isArray(prosodySegments) || prosodySegments.length !== (timingMap.segments ?? []).length) {
      fail('Chinese Mandarin prosody report: final TTS segment evidence is missing or stale');
    } else {
      for (const finalSegment of timingMap.segments ?? []) {
        const evidence = prosodySegments.find((entry) => entry.id === finalSegment.id);
        if (!evidence || evidence.pass !== true || evidence.text !== finalSegment.text) {
          fail(`Chinese Mandarin prosody report: invalid final TTS evidence for ${finalSegment.id}`);
        }
      }
    }
    const prosodyCues = chineseMandarinProsodyReport.captionCues;
    if (!Array.isArray(prosodyCues) || prosodyCues.length !== (Array.isArray(finalCaptionCues) ? finalCaptionCues.length : 0)) {
      fail('Chinese Mandarin prosody report: final VTT evidence is missing or stale');
    } else {
      for (const cue of Array.isArray(finalCaptionCues) ? finalCaptionCues : []) {
        const evidence = prosodyCues.find((entry) => entry.segmentId === cue.segmentId && entry.text === cue.text);
        if (!evidence || evidence.pass !== true) {
          fail(`Chinese Mandarin prosody report: invalid final VTT evidence for ${cue.segmentId}`);
        }
      }
    }
  }
}

if (onScreenTextCompletenessRule.status !== 'active') {
  fail('active profile: on-screen text completeness rule is missing or inactive');
} else {
  isTrue(onScreenTextCompletenessReport.pass, 'qa/on-screen-text-completeness-report.json pass');
  isTrue(onScreenTextCompletenessReport.renderedDomScanPass, 'qa/on-screen-text-completeness-report.json renderedDomScanPass');
  isTrue(onScreenTextCompletenessReport.authority?.sourceBacked, 'on-screen authority sourceBacked');
  required(onScreenTextCompletenessReport.authority?.publisher, 'on-screen authority publisher');
  const screenEntries = onScreenTextCompletenessReport.entries;
  if (!Array.isArray(screenEntries) || screenEntries.length === 0) {
    fail('on-screen text completeness report: entries are required');
  } else {
    for (const entry of screenEntries) {
      required(entry.id, 'on-screen text entry id');
      required(entry.kind, `on-screen text entry ${entry.id ?? 'unknown'} kind`);
      required(entry.text, `on-screen text entry ${entry.id ?? 'unknown'} text`);
      required(entry.sourceBinding, `on-screen text entry ${entry.id ?? 'unknown'} sourceBinding`);
      if (entry.pass !== true || entry.strictNarrationPrefixFragment === true || entry.danglingEnding === true) {
        fail(`on-screen text entry ${entry.id}: incomplete visual copy evidence`);
      }
    }
  }
  const authorityScene = scenes.find((scene) => scene.type === 'authority');
  const authorityEntry = screenEntries?.find((entry) => entry.kind === 'authority-source');
  if (!authorityScene || !authorityEntry || !authorityScene.narration?.includes(authorityEntry.text)) {
    fail('on-screen authority label: must be sourced from the current authority narration');
  }
}

if (recapRule.displayField !== 'recapDisplayText') {
  fail('active profile: recap screen-copy display field is not recapDisplayText');
}
if (recapRule.bodyNumbering?.visible !== true
  || recapRule.bodyNumbering?.style !== 'arabic-dot'
  || JSON.stringify(recapRule.bodyNumbering?.values) !== JSON.stringify(['1.', '2.', '3.'])
  || recapRule.bodyTextAlignment !== 'left') {
  fail('active profile: recap body must use left-aligned visible 1./2./3. numbering');
}
if (recaps.length === 0) fail('scene-plan.json: no recap scenes');
for (const scene of recaps) {
  if (!required(scene.recapDisplayText, `scene ${scene.id} recapDisplayText`)) continue;
  if (forbiddenRecapMarker.test(scene.recapDisplayText.trim())) {
    fail(`scene ${scene.id} recapDisplayText contains a spoken-only marker: ${scene.recapDisplayText}`);
  }
  if (scene.recapDisplayText === scene.narration) {
    fail(`scene ${scene.id} recapDisplayText must be separate from narration`);
  }
}

isTrue(recapReport.pass, 'qa/recap-visual-copy-report.json pass');
isTrue(recapReport.renderedMarkerScanPass, 'qa/recap-visual-copy-report.json renderedMarkerScanPass');
const recapEvidence = recapReport.recaps ?? recapReport.scenes ?? [];
for (const scene of recaps) {
  const evidence = recapEvidence.find((item) => item.sceneId === scene.id);
  if (!evidence) {
    fail(`qa/recap-visual-copy-report.json: missing evidence for ${scene.id}`);
    continue;
  }
  required(evidence.narration, `recap evidence ${scene.id} narration`);
  required(evidence.recapDisplayText, `recap evidence ${scene.id} recapDisplayText`);
  if (evidence.recapDisplayText !== scene.recapDisplayText) {
    fail(`recap evidence ${scene.id}: recapDisplayText does not match scene plan`);
  }
  if (evidence.forbiddenMarkerCount !== 0 || evidence.numberedBulletPresent !== true
    || evidence.bodyTextAlignment !== 'left' || evidence.bodyUsesOnlyRecapDisplayText !== true) {
    fail(`recap evidence ${scene.id}: numbered, left-aligned recap body is missing or contains spoken ordinal copy`);
  }
  const chapterRecaps = scenes.filter((candidate) => candidate.type === 'recap' && candidate.chapterNumber === scene.chapterNumber);
  const revealCount = chapterRecaps.findIndex((candidate) => candidate.id === scene.id) + 1;
  const expectedBodyNumbers = ['1.', '2.', '3.'].slice(0, revealCount);
  if (JSON.stringify(evidence.visibleBodyNumbers) !== JSON.stringify(expectedBodyNumbers)) {
    fail(`recap evidence ${scene.id}: visible body numbers must be ${expectedBodyNumbers.join(', ')}`);
  }
  const expectedSectionLabel = locale === 'zh-CN' ? `第 ${scene.chapterNumber} 章小节` : `Chapter ${scene.chapterNumber} recap`;
  if (evidence.sidebar?.visible !== true
    || evidence.sidebar?.sectionLabel !== expectedSectionLabel
    || evidence.sidebar?.chapterTitle !== scene.chapter) {
    fail(`recap evidence ${scene.id}: missing or incorrect chapter-recap sidebar`);
  }
  if (evidence.captionTranscript !== true || evidence.captionOrdinalMarkerPresent !== true) {
    fail(`recap evidence ${scene.id}: captions must preserve the spoken recap and ordinal prefix`);
  }
  const renderedCaptionTexts = evidence.renderedCaptionTexts;
  if (!Array.isArray(renderedCaptionTexts) || renderedCaptionTexts.length === 0) {
    fail(`recap evidence ${scene.id}: missing rendered caption text`);
  } else {
    for (const text of renderedCaptionTexts) {
      if (!scene.narration.includes(text)) {
        fail(`recap evidence ${scene.id}: rendered caption is not a final-VTT narration transcript: ${text}`);
      }
    }
  }
}

const hookTiming = timingMap.hookTiming ?? {};
const hookQualityRule = opening.hookQuestionQuality ?? {};
if (hookQualityRule.status !== 'active' || !Array.isArray(hookQualityRule.allowedIntents)) {
  fail('active profile: opening hook-quality rule is missing or inactive');
} else {
  isTrue(hookQualityReport.pass, 'qa/opening-hook-quality-report.json pass');
  if (hookQualityReport.visibleQuestion !== hookTiming.visibleQuestion) {
    fail(`opening hook quality: visibleQuestion must match final VTT hook; expected ${JSON.stringify(hookTiming.visibleQuestion)}, received ${JSON.stringify(hookQualityReport.visibleQuestion)}`);
  }
  if (!hookQualityRule.allowedIntents.includes(hookQualityReport.intent)) {
    fail(`opening hook quality: unsupported intent ${JSON.stringify(hookQualityReport.intent)}`);
  }
  if (hookQualityRule.requireTopicIdentity && hookQualityReport.checks?.topicIdentityPresent !== true) {
    fail('opening hook quality: topic identity is missing');
  }
  if (hookQualityRule.requireAudiencePainPoint && hookQualityReport.checks?.audiencePainPointPresent !== true) {
    fail('opening hook quality: audience pain point is missing');
  }
  if (hookQualityRule.requireUnresolvedCuriosity && hookQualityReport.checks?.unresolvedCuriosity !== true) {
    fail('opening hook quality: unresolved curiosity is missing');
  }
  if (hookQualityReport.checks?.causalOrDiscoveryForm !== true || hookQualityReport.checks?.noObviousYesNoForm !== true) {
    fail('opening hook quality: question must use a causal/discovery form and cannot be an obvious yes-or-no question');
  }
  if (hookQualityReport.obviousAnswerRisk !== 'none') {
    fail(`opening hook quality: obviousAnswerRisk must be none, received ${JSON.stringify(hookQualityReport.obviousAnswerRisk)}`);
  }
  if (!hookQualityReport.rejectedObviousQuestion || hookQualityReport.rejectedObviousQuestion === hookQualityReport.visibleQuestion) {
    fail('opening hook quality: a distinct rejected obvious question is required');
  }
}
if (hookTiming.earlyRevealCount !== opening.earlyRevealCount) {
  fail(`timing-map.json hookTiming.earlyRevealCount: expected ${opening.earlyRevealCount}, received ${JSON.stringify(hookTiming.earlyRevealCount)}`);
}
isTrue(openingReport.pass, 'qa/retention-opening-report.json pass');
if (openingReport.earlyRevealCount !== opening.earlyRevealCount) {
  fail(`opening report earlyRevealCount: expected ${opening.earlyRevealCount}, received ${JSON.stringify(openingReport.earlyRevealCount)}`);
}
inRange(openingReport.firstGlyphLeadMilliseconds, opening.firstGlyphLeadMilliseconds ?? {}, 'opening report firstGlyphLeadMilliseconds');
if (typeof openingReport.maximumPerGlyphLeadMilliseconds !== 'number' || openingReport.maximumPerGlyphLeadMilliseconds > opening.maximumPerGlyphLeadMilliseconds) {
  fail(`opening report maximumPerGlyphLeadMilliseconds: expected <= ${opening.maximumPerGlyphLeadMilliseconds}, received ${JSON.stringify(openingReport.maximumPerGlyphLeadMilliseconds)}`);
}
const perGlyphLeadRule = opening.perGlyphAudibleLeadMilliseconds ?? {};
const measuredOpeningUnits = hookTiming.audibleUnits;
const reportedPerGlyphLeads = openingReport.perGlyphAudibleLeadMilliseconds;
if (!Array.isArray(measuredOpeningUnits) || measuredOpeningUnits.length === 0) {
  fail('timing-map.json hookTiming.audibleUnits: final VTT-derived per-unit timing is required');
}
if (!Array.isArray(reportedPerGlyphLeads?.values) || reportedPerGlyphLeads.values.length === 0) {
  fail('opening report perGlyphAudibleLeadMilliseconds.values: measured evidence is required');
}
if (Array.isArray(measuredOpeningUnits) && Array.isArray(reportedPerGlyphLeads?.values)) {
  if (measuredOpeningUnits.length !== reportedPerGlyphLeads.values.length) {
    fail(`opening per-unit timing: expected ${measuredOpeningUnits.length} measured units, received ${reportedPerGlyphLeads.values.length}`);
  }
  for (const unit of measuredOpeningUnits) {
    const measuredLead = Math.round((unit.audibleAt - unit.at) * 1000);
    inRange(measuredLead, perGlyphLeadRule, `timing-map.json ${unit.id} measured audible lead`);
    const reported = reportedPerGlyphLeads.values.find((candidate) => candidate.id === unit.id);
    if (!reported) {
      fail(`opening report per-unit timing: missing ${unit.id}`);
      continue;
    }
    if (reported.leadMilliseconds !== measuredLead
      || reported.audibleOnsetSeconds !== unit.audibleAt
      || reported.visualStartSeconds !== unit.at
      || reported.visualSettleSeconds !== unit.settleAt) {
      fail(`opening report per-unit timing: stale or mismatched evidence for ${unit.id}`);
    }
  }
}
inRange(openingReport.perGlyphAudibleLeadMilliseconds?.min, perGlyphLeadRule, 'opening report perGlyphAudibleLeadMilliseconds.min');
inRange(openingReport.perGlyphAudibleLeadMilliseconds?.max, perGlyphLeadRule, 'opening report perGlyphAudibleLeadMilliseconds.max');
inRange(openingReport.literalQuestionCompletionLeadMilliseconds, opening.literalQuestionCompletionLeadMilliseconds ?? {}, 'opening report literalQuestionCompletionLeadMilliseconds');
if (typeof hookTiming.literalQuestionCueEnd !== 'number' || typeof hookTiming.literalQuestionCueStart !== 'number') {
  fail('timing-map.json hookTiming: literal question cue bounds are required');
}
inRange(openingReport.fullQuestionReadLeadMilliseconds, opening.fullQuestionReadLeadMilliseconds ?? {}, 'opening report fullQuestionReadLeadMilliseconds');
inRange(openingReport.canvasGlyphCoveragePercent?.width, opening.canvasGlyphCoveragePercent?.width ?? {}, 'opening report canvasGlyphCoveragePercent.width');
inRange(openingReport.canvasGlyphCoveragePercent?.height, opening.canvasGlyphCoveragePercent?.height ?? {}, 'opening report canvasGlyphCoveragePercent.height');
const compactTextBlock = opening.compactTextBlock ?? {};
if (compactTextBlock.status !== 'active') {
  fail('active profile: opening compact-text-block rule is missing or inactive');
} else {
  const compactMeasurement = openingReport.domMeasurement ?? {};
  const lineBounds = compactMeasurement.lineGlyphBounds;
  if (!Array.isArray(lineBounds)
    || lineBounds.length < compactTextBlock.semanticLineCount?.min
    || lineBounds.length > compactTextBlock.semanticLineCount?.max) {
    fail(`opening compact text: expected ${compactTextBlock.semanticLineCount?.min}-${compactTextBlock.semanticLineCount?.max} final glyph rows, received ${Array.isArray(lineBounds) ? lineBounds.length : JSON.stringify(lineBounds)}`);
  }
  inRange(compactMeasurement.glyphMassHeightPercent, compactTextBlock.glyphMassHeightPercent ?? {}, 'opening compact text glyphMassHeightPercent');
  if (typeof compactMeasurement.maxInterlineGapPx !== 'number'
    || compactMeasurement.maxInterlineGapPx > compactTextBlock.maxInterlineGapPx) {
    fail(`opening compact text maxInterlineGapPx: expected <= ${compactTextBlock.maxInterlineGapPx}, received ${JSON.stringify(compactMeasurement.maxInterlineGapPx)}`);
  }
  isTrue(compactMeasurement.compactTextBlockPass, 'opening compact text compactTextBlockPass');
}
const uniformTypography = opening.uniformAdaptiveTypography ?? {};
if (uniformTypography.status !== 'active') {
  fail('active profile: opening uniform-adaptive-typography rule is missing or inactive');
} else if (uniformTypography.scope?.includes(locale)) {
  const typographyMeasurement = openingReport.domMeasurement?.typography ?? {};
  isTrue(typographyMeasurement.uniformFontSizePass, 'opening typography uniformFontSizePass');
  isTrue(typographyMeasurement.fontFamilyPass, 'opening typography fontFamilyPass');
  isTrue(typographyMeasurement.fontWeightPass, 'opening typography fontWeightPass');
  isTrue(typographyMeasurement.accentTokenPass, 'opening typography accentTokenPass');
  if (!Array.isArray(typographyMeasurement.lineFontSizesPx) || typographyMeasurement.lineFontSizesPx.length === 0) {
    fail('opening typography lineFontSizesPx: missing');
  }
  if (typographyMeasurement.fontFamily !== uniformTypography.fontFamily) {
    fail(`opening typography fontFamily: expected ${uniformTypography.fontFamily}, received ${JSON.stringify(typographyMeasurement.fontFamily)}`);
  }
  if (typographyMeasurement.fontWeight !== String(uniformTypography.fontWeight)) {
    fail(`opening typography fontWeight: expected ${uniformTypography.fontWeight}, received ${JSON.stringify(typographyMeasurement.fontWeight)}`);
  }
  const expectedAccentTokens = uniformTypography.accentTokens?.[locale] ?? [];
  const accentRuns = typographyMeasurement.accentRuns ?? [];
  for (const expectedAccent of expectedAccentTokens) {
    const normalizedExpected = String(expectedAccent.token).replace(/\s+/g, '');
    if (!accentRuns.some((run) => run.tone === expectedAccent.tone && String(run.text).replace(/\s+/g, '').includes(normalizedExpected))) {
      fail(`opening typography accent: missing ${expectedAccent.tone} token ${expectedAccent.token}`);
    }
  }
}
isTrue(openingReport.agentFirstFrame?.visible, 'opening report agentFirstFrame.visible');
if (openingReport.agentFirstFrame?.position !== opening.agentReservation?.position) {
  fail(`opening report agentFirstFrame.position: expected ${opening.agentReservation?.position}, received ${JSON.stringify(openingReport.agentFirstFrame?.position)}`);
}
if ((openingReport.agentFirstFrame?.visibleHeightPx ?? 0) < (opening.agentReservation?.minimumVisibleHeightPx ?? 0)) {
  fail(`opening report agentFirstFrame.visibleHeightPx: expected >= ${opening.agentReservation?.minimumVisibleHeightPx}, received ${JSON.stringify(openingReport.agentFirstFrame?.visibleHeightPx)}`);
}
for (const [key, expected] of Object.entries({ progressRailPresent: false, leftBlueCirclePresent: false, voiceLabelPresent: false })) {
  if (openingReport.openingUi?.[key] !== expected) {
    fail(`opening report openingUi.${key}: expected ${expected}, received ${JSON.stringify(openingReport.openingUi?.[key])}`);
  }
}
try {
  const html = fs.readFileSync(path.join(project, 'index.html'), 'utf8');
  if (html.includes('id="hook-voice"')) fail('index.html: forbidden opening voice/progress UI remains in the DOM');
} catch (error) {
  fail(`index.html: ${error.message}`);
}

isTrue(alphaReport.pass, 'qa/generated-art-alpha-report.json pass');
isTrue(alphaReport.sharedGridComposition, 'qa/generated-art-alpha-report.json sharedGridComposition');
const alphaAssets = alphaReport.assets ?? [];
for (const scene of generated) {
  const name = path.basename(scene.generatedArt ?? '');
  const file = path.join(project, 'assets/generated/scene-art', name);
  if (!fs.existsSync(file)) {
    fail(`generated art ${scene.id}: missing ${name}`);
    continue;
  }
  const evidence = alphaAssets.find((item) => assetName(item) === name);
  if (!evidence) {
    fail(`qa/generated-art-alpha-report.json: missing evidence for ${name}`);
    continue;
  }
  isTrue(evidence.hasAlpha, `generated art ${name} hasAlpha`);
  const opaqueBounds = evidence.opaqueBounds;
  if (!Number.isFinite(opaqueBounds?.width) || !Number.isFinite(opaqueBounds?.height)
    || opaqueBounds.width < 2 || opaqueBounds.height < 2) {
    fail(`generated art ${name}: alpha evidence has no visible subject bounds`);
  }
  for (const corner of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    if (evidence.cornerAlpha?.[corner] !== 0) {
      fail(`generated art ${name} ${corner} alpha: expected 0, received ${JSON.stringify(evidence.cornerAlpha?.[corner])}`);
    }
  }
  if (evidence.canvasEdgeBackgroundDetected !== false) {
    fail(`generated art ${name}: canvas-edge background was detected`);
  }
  if (!Array.isArray(evidence.sceneIds) || !evidence.sceneIds.includes(scene.id)) {
    fail(`generated art ${name}: evidence does not name scene ${scene.id}`);
  }
  try {
    const sips = execFileSync('sips', ['-g', 'hasAlpha', file], { encoding: 'utf8' });
    if (!/hasAlpha:\s+yes/.test(sips)) fail(`generated art ${name}: source file has no alpha channel`);
  } catch (error) {
    fail(`generated art ${name}: cannot inspect alpha channel (${error.message})`);
  }
}

if (errors.length > 0) {
  console.error(`Tiny Agent longform output validation failed for ${project}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Tiny Agent longform output validation passed: ${project}`);
