import { createHash } from 'node:crypto';
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

function normalizeSemanticText(value) {
  return String(value ?? '').replace(/\s+/g, '').toLocaleLowerCase();
}

function sceneList(scenePlan) {
  return (scenePlan.chapters ?? []).flatMap((chapter) => chapter.scenes ?? []);
}

function assetName(entry) {
  return path.basename(entry.file ?? entry.path ?? entry.asset ?? '');
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function projectRunKey(projectPath) {
  return projectPath.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function ruleIsEffective(rule, projectPath) {
  if (!rule?.effectiveFromRunKey) return true;
  const runKey = projectRunKey(projectPath);
  return runKey === null || runKey >= rule.effectiveFromRunKey;
}

const profile = JSON.parse(
  fs.readFileSync(
    path.join(root, 'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'),
    'utf8'
  )
);
const snapshotManifest = JSON.parse(
  fs.readFileSync(path.join(root, profile.sourceSnapshot.manifest), 'utf8')
);
const frozenImplementationSource = snapshotManifest.frozenRuleSources.find(
  (source) => source.path.endsWith('/implementation-profile.zh-CN.json')
);
if (!frozenImplementationSource) {
  throw new Error('Active snapshot manifest does not name its frozen implementation profile');
}
const frozenImplementationProfile = JSON.parse(
  fs.readFileSync(path.join(root, frozenImplementationSource.path), 'utf8')
);
const overrides = profile.postSnapshotUserOverrides ?? {};
const opening = overrides.openingQuestionReadability ?? {};
const recapRule = overrides.chapterRecapNarration?.screenCopy ?? {};
const bilingualParityRule = overrides.englishChineseProductionParity ?? {};
const publishingMaterialsRule = overrides.bilingualPublishingMaterials ?? {};
const generatedIdentityRule = overrides.tinyAgentGeneratedIdentityConsistency ?? {};
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
const visualVariationReport = readJson('qa/visual-variation-report.json');
const motionReport = readJson('qa/motion-report.json');
const progressReport = readJson('qa/progress-report.json');
const highlightLayoutReport = readJson('qa/highlight-layout-report.json');
const internalPropStyleReport = readJson('qa/internal-prop-style-report.json');
const visualCadenceReport = readJson('qa/visual-cadence-report.json');
const speechPacingReport = readJson('qa/speech-pacing-report.json');
const videoOutputReport = readJson('qa/video-output-report.json');
const transitionReport = readJson('qa/transitions-report.json');
const semanticsReport = readJson('qa/semantics-report.json');
const balanceReport = readJson('qa/balance-report.json');
const domLayoutReport = readJson('qa/dom-layout-report.json');
const scenes = sceneList(scenePlan);
const recaps = scenes.filter((scene) => scene.type === 'recap');
const generated = scenes.filter((scene) => scene.temporaryGenerated || scene.generatedArt);
const forbiddenRecapMarker = /本章小节|Chapter\s+recap|^(?:第?[一二三]|First|Second|Third)[，,、.:：]|^\s*[123][.、]/i;
const locale = episode.locale;
const expectedAudio = profile.fixedBilingualGeneration?.[locale];
const durationRange = profile.fixedBilingualGeneration?.durationSeconds;
const bilingualParityRequired = bilingualParityRule.status === 'active'
  && ruleIsEffective(bilingualParityRule, project);
const publishingMaterialsRequired = publishingMaterialsRule.status === 'active'
  && ruleIsEffective(publishingMaterialsRule, project);
const generatedIdentityRequired = generatedIdentityRule.status === 'active'
  && ruleIsEffective(generatedIdentityRule, project);

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
  if (hookQualityRule.requireDirectEpisodeTopic) {
    const directTopicTerms = Array.isArray(hookQualityReport.directTopicTerms)
      ? hookQualityReport.directTopicTerms.map((term) => String(term).trim()).filter(Boolean)
      : [];
    const concreteTopicTerms = directTopicTerms.filter((term) => {
      const normalized = normalizeSemanticText(term);
      return normalized.length >= 3 && !/^(?:ai-?agents?|智能体)$/.test(normalized);
    });
    const normalizedQuestion = normalizeSemanticText(hookQualityReport.visibleQuestion);
    const allTermsPresent = concreteTopicTerms.length > 0
      && concreteTopicTerms.every((term) => normalizedQuestion.includes(normalizeSemanticText(term)));
    if (!allTermsPresent || hookQualityReport.checks?.directEpisodeTopic !== true) {
      fail('opening hook quality: directTopicTerms must name the concrete episode topic in the visible question');
    }
  }
  if (hookQualityRule.requireViewerValueOrCuriosity) {
    if (
      typeof hookQualityReport.viewerValue !== 'string'
      || hookQualityReport.viewerValue.trim().length < 12
      || hookQualityReport.checks?.viewerValueOrCuriosity !== true
    ) {
      fail('opening hook quality: viewer value or useful curiosity is missing');
    }
  }
  if (hookQualityRule.forbidTangentialScenarioSetup) {
    if (
      hookQualityReport.tangentialSetupRisk !== 'none'
      || typeof hookQualityReport.topicAlignmentRationale !== 'string'
      || hookQualityReport.topicAlignmentRationale.trim().length < 12
      || hookQualityReport.checks?.noTangentialScenarioSetup !== true
    ) {
      fail('opening hook quality: tangential scenario setup is present or not reviewed');
    }
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
} else if (uniformTypography.scope?.includes(locale) && ruleIsEffective(uniformTypography, project)) {
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
  const accentTokenContract = uniformTypography.accentTokenContract ?? {};
  const expectedAccentTokens = episode.openingAccentTokens ?? [];
  if (!Array.isArray(expectedAccentTokens) || expectedAccentTokens.length === 0) {
    fail('opening typography accent: episode.openingAccentTokens is required');
  }
  const expectedTones = new Set(expectedAccentTokens.map((entry) => entry?.tone));
  for (const requiredTone of accentTokenContract.requiredTones ?? []) {
    if (!expectedTones.has(requiredTone)) {
      fail(`opening typography accent: missing required tone ${requiredTone}`);
    }
  }
  const identityEntry = expectedAccentTokens.find((entry) => entry?.tone === 'identity');
  if (!normalizeSemanticText(identityEntry?.token).includes(normalizeSemanticText(accentTokenContract.identityToken))) {
    fail(`opening typography accent: identity token must include ${accentTokenContract.identityToken}`);
  }
  if (new Set(typographyMeasurement.lineFontSizesPx ?? []).size !== 1) {
    fail('opening typography lineFontSizesPx: every line must use one shared final size');
  }
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
  const frozenVisual = frozenImplementationProfile.visual ?? {};
  const requiredTokens = [
    'id="chapter-progress"',
    'class="caption-cue"',
    `font-size:${frozenVisual.captionPx}px`,
    `border:${frozenVisual.captionBorderPx}px solid var(--ink)`,
    `height:${snapshotManifest.generationContract.visual.chapterBar.match(/(\d+)px/)?.[1]}px`,
  ];
  for (const token of requiredTokens) {
    if (!html.includes(token)) fail(`index.html: frozen visual token is missing: ${token}`);
  }
} catch (error) {
  fail(`index.html: ${error.message}`);
}

const frozenVisual = frozenImplementationProfile.visual ?? {};
const eligibleScenes = scenes.filter((scene) => scene.type !== 'outro');
const generatedScenes = eligibleScenes.filter((scene) => scene.temporaryGenerated || scene.generatedArt);
const generatedRatio = generatedScenes.length / Math.max(1, eligibleScenes.length);
const generatedRatioMatch = snapshotManifest.generationContract.visual.temporaryGeneratedSceneRatio.match(/(\d+)-(\d+)/);
const generatedRatioMinimum = generatedRatioMatch ? Number(generatedRatioMatch[1]) / 100 : frozenVisual.temporaryGeneratedSceneRatioMinimum;
const generatedRatioMaximum = generatedRatioMatch ? Number(generatedRatioMatch[2]) / 100 : 0.2;

isTrue(visualVariationReport.pass, 'qa/visual-variation-report.json pass');
if (visualVariationReport.eligibleScenes !== eligibleScenes.length
  || visualVariationReport.generatedSceneCount !== generatedScenes.length
  || Math.abs((visualVariationReport.generatedRatio ?? -1) - Number(generatedRatio.toFixed(4))) > 0.0001) {
  fail('qa/visual-variation-report.json: scene counts or generated-art ratio are stale');
}
inRange(generatedRatio, { min: generatedRatioMinimum, max: generatedRatioMaximum }, 'temporary generated-art scene ratio');
if ((visualVariationReport.humanVisibleScenes ?? 0) < 1 || (visualVariationReport.agentVisibleScenes ?? 0) < 1) {
  fail('qa/visual-variation-report.json: frozen human and Tiny Agent visual roles are missing');
}

let previousLayout;
let consecutiveLayoutCount = 0;
for (const scene of scenes.filter((candidate) => !['recap', 'outro'].includes(candidate.type))) {
  if (scene.layout === previousLayout) {
    consecutiveLayoutCount += 1;
  } else {
    previousLayout = scene.layout;
    consecutiveLayoutCount = 1;
  }
  if (consecutiveLayoutCount > 2) {
    fail(`scene-plan.json: layout ${scene.layout} repeats more than twice at ${scene.id}`);
  }
}
for (const chapter of (scenePlan.chapters ?? []).slice(1, -1)) {
  const chapterScenes = (chapter.scenes ?? []).filter((scene) => !['recap', 'outro'].includes(scene.type));
  const chapterDuration = (chapter.scenes?.at(-1)?.end ?? 0) - (chapter.scenes?.[0]?.start ?? 0);
  const requiredLayouts = chapterDuration > 60 ? 3 : 2;
  const distinctLayouts = new Set(chapterScenes.map((scene) => scene.layout)).size;
  if (distinctLayouts < requiredLayouts) {
    fail(`scene-plan.json: ${chapter.label ?? chapter.title} requires ${requiredLayouts} frozen layout families, received ${distinctLayouts}`);
  }
}

isTrue(motionReport.pass, 'qa/motion-report.json pass');
if (motionReport.typeCount < frozenVisual.motionTypeMinimum
  || motionReport.beatCount < frozenVisual.motionBeatMinimum) {
  fail(`qa/motion-report.json: expected at least ${frozenVisual.motionTypeMinimum} motion types and ${frozenVisual.motionBeatMinimum} motion beats`);
}
const motionScenes = scenes.filter((scene) => scene.motionType && scene.type !== 'recap');
if (motionReport.beatCount !== motionScenes.length
  || motionReport.typeCount !== new Set(motionScenes.map((scene) => scene.motionType)).size) {
  fail('qa/motion-report.json: motion evidence is stale');
}

isTrue(progressReport.pass, 'qa/progress-report.json pass');
if (progressReport.widthPx !== 1920
  || progressReport.heightPx !== 52
  || progressReport.playedColor !== '#A8D8F0'
  || progressReport.unplayedColor !== '#DDE0DA'
  || progressReport.labelColor !== frozenVisual.ink
  || progressReport.visibleAt !== timingMap.hookTiming?.hookTimelineCutAt && progressReport.visibleAt !== timingMap.checkpoints?.hookTimelineCutAt) {
  fail('qa/progress-report.json: frozen full-width chapter rail contract is not satisfied');
}

isTrue(visualCadenceReport.pass, 'qa/visual-cadence-report.json pass');
const referenceCadence = snapshotManifest.implementationReference.chinese;
if (visualCadenceReport.sceneCount !== scenes.length
  || visualCadenceReport.chapterCount !== (scenePlan.chapters ?? []).length
  || visualCadenceReport.recapSceneCount !== recaps.length) {
  fail('qa/visual-cadence-report.json: current scene, chapter, or recap counts are stale');
}
if (visualCadenceReport.referenceComparison?.reference?.scenes !== referenceCadence.sceneCount
  || visualCadenceReport.referenceComparison?.reference?.chapters !== referenceCadence.chapterCount
  || visualCadenceReport.referenceComparison?.reference?.recaps !== referenceCadence.recapSceneCount
  || !visualCadenceReport.referenceComparison?.reason) {
  fail('qa/visual-cadence-report.json: frozen 63/7/15 comparison or episode-specific variance reason is missing');
}

isTrue(speechPacingReport.pass, 'qa/speech-pacing-report.json pass');
if (speechPacingReport.locale !== locale
  || speechPacingReport.voice !== expectedAudio?.voice
  || speechPacingReport.rate !== expectedAudio?.rate
  || speechPacingReport.durationSeconds !== timingMap.duration
  || speechPacingReport.timingAuthority !== 'final-vtt') {
  fail('qa/speech-pacing-report.json: locale, voice, rate, duration, or final-VTT authority is stale');
}

isTrue(videoOutputReport.pass, 'qa/video-output-report.json pass');
const renderedFilePath = path.join(project, videoOutputReport.renderedFile ?? '');
inRange(videoOutputReport.durationSeconds, durationRange ?? {}, 'qa/video-output-report.json durationSeconds');
if (Math.abs((videoOutputReport.durationSeconds ?? 0) - timingMap.duration) > 0.1) {
  fail('qa/video-output-report.json: rendered duration differs from the final timing map by more than 100ms');
}
if (videoOutputReport.pendingRender === true) {
  const expected = videoOutputReport.expected ?? {};
  if (expected.width !== 1920
    || expected.height !== 1080
    || expected.fps !== 30
    || expected.videoCodec !== 'h264'
    || expected.audioCodec !== 'aac'
    || expected.pixelFormat !== 'yuv420p'
    || expected.colorSpace !== 'bt709'
    || expected.colorTransfer !== 'bt709'
    || expected.colorPrimaries !== 'bt709'
    || expected.blackDetectThresholdSeconds !== 0.5) {
    fail('qa/video-output-report.json: pre-render technical-output contract is incomplete');
  }
  if (fs.existsSync(renderedFilePath)) {
    fail('qa/video-output-report.json: pending-render validation requires the stale delivery file to be archived before rendering');
  }
} else {
  if (videoOutputReport.pendingRender !== false
    || videoOutputReport.width !== 1920
    || videoOutputReport.height !== 1080
    || videoOutputReport.fps !== 30
    || videoOutputReport.videoCodec !== 'h264'
    || videoOutputReport.audioCodec !== 'aac'
    || videoOutputReport.pixelFormat !== 'yuv420p'
    || videoOutputReport.colorSpace !== 'bt709'
    || videoOutputReport.colorTransfer !== 'bt709'
    || videoOutputReport.colorPrimaries !== 'bt709'
    || videoOutputReport.blackDetect?.detected !== false) {
    fail('qa/video-output-report.json: rendered 1920x1080/30fps H.264/AAC BT.709 or black-frame evidence is invalid');
  }
  if (!fs.existsSync(renderedFilePath)) {
    fail(`qa/video-output-report.json: rendered file is missing: ${JSON.stringify(videoOutputReport.renderedFile)}`);
  }
}

for (const [report, label] of [
  [highlightLayoutReport, 'qa/highlight-layout-report.json pass'],
  [internalPropStyleReport, 'qa/internal-prop-style-report.json pass'],
  [transitionReport, 'qa/transitions-report.json pass'],
  [semanticsReport, 'qa/semantics-report.json pass'],
  [balanceReport, 'qa/balance-report.json pass'],
  [domLayoutReport, 'qa/dom-layout-report.json pass'],
]) {
  isTrue(report.pass, label);
}

if (bilingualParityRequired) {
  const parityReportPath = path.join(project, bilingualParityRule.qa?.report ?? 'qa/bilingual-parity-report.json');
  let parityReport = {};
  let parityReportBuffer = Buffer.alloc(0);
  try {
    parityReportBuffer = fs.readFileSync(parityReportPath);
    parityReport = JSON.parse(parityReportBuffer.toString('utf8'));
  } catch (error) {
    fail(`qa/bilingual-parity-report.json: ${error.message}`);
  }
  isTrue(parityReport.pass, 'qa/bilingual-parity-report.json pass');
  if (parityReport.contractProfileId !== profile.profileId) {
    fail(`qa/bilingual-parity-report.json contractProfileId: expected ${profile.profileId}, received ${JSON.stringify(parityReport.contractProfileId)}`);
  }
  const currentCoverSet = ruleIsEffective(bilingualParityRule.coverSet, project);
  const expectedCoverIdentity = currentCoverSet
    ? bilingualParityRule.coverSet?.coverSetProfileId
    : bilingualParityRule.coverSet?.legacy16x9ParityBeforeEffectiveRun?.geometryProfileId;
  const receivedCoverIdentity = currentCoverSet
    ? parityReport.parityContract?.coverSetProfileId
    : parityReport.parityContract?.geometryProfileId;
  if (parityReport.parityContract?.effectiveFromRunKey !== bilingualParityRule.effectiveFromRunKey
    || receivedCoverIdentity !== expectedCoverIdentity) {
    fail('qa/bilingual-parity-report.json: active parity contract identity is stale or mismatched');
  }
  const pairProject = locale === 'en-US'
    ? parityReport.pair?.englishProject
    : parityReport.pair?.chineseProject;
  if (!pairProject || path.resolve(pairProject) !== project) {
    fail(`qa/bilingual-parity-report.json pair: current ${locale} project is not the validated project`);
  }
  if (parityReport.pair?.runKey !== projectRunKey(project)) {
    fail(`qa/bilingual-parity-report.json runKey: expected ${projectRunKey(project)}, received ${JSON.stringify(parityReport.pair?.runKey)}`);
  }
  const localeHashes = parityReport.artifactHashes?.[locale] ?? {};
  for (const [relativePath, expectedHash] of Object.entries(localeHashes)) {
    const file = path.join(project, relativePath);
    try {
      const actualHash = sha256(fs.readFileSync(file));
      if (actualHash !== expectedHash) {
        fail(`qa/bilingual-parity-report.json stale artifact ${relativePath}: expected ${expectedHash}, received ${actualHash}`);
      }
    } catch (error) {
      fail(`qa/bilingual-parity-report.json artifact ${relativePath}: ${error.message}`);
    }
  }
  const siblingProject = locale === 'en-US'
    ? parityReport.pair?.chineseProject
    : parityReport.pair?.englishProject;
  if (!siblingProject) {
    fail('qa/bilingual-parity-report.json pair: sibling project is missing');
  } else {
    try {
      const siblingReport = fs.readFileSync(path.join(
        path.resolve(siblingProject),
        bilingualParityRule.qa?.report ?? 'qa/bilingual-parity-report.json',
      ));
      if (!parityReportBuffer.equals(siblingReport)) {
        fail('qa/bilingual-parity-report.json: locale reports are not byte-identical');
      }
    } catch (error) {
      fail(`qa/bilingual-parity-report.json sibling: ${error.message}`);
    }
  }
}

if (publishingMaterialsRequired) {
  const materialsReportRelativePath = publishingMaterialsRule.files?.report
    ?? 'qa/bilingual-publishing-materials-report.json';
  const materialsReportPath = path.join(project, materialsReportRelativePath);
  let materialsReport = {};
  let materialsReportBuffer = Buffer.alloc(0);
  try {
    materialsReportBuffer = fs.readFileSync(materialsReportPath);
    materialsReport = JSON.parse(materialsReportBuffer.toString('utf8'));
  } catch (error) {
    fail(`${materialsReportRelativePath}: ${error.message}`);
  }
  isTrue(materialsReport.pass, `${materialsReportRelativePath} pass`);
  isTrue(materialsReport.applicable, `${materialsReportRelativePath} applicable`);
  if (materialsReport.contractProfileId !== profile.profileId
    || materialsReport.effectiveFromRunKey !== publishingMaterialsRule.effectiveFromRunKey) {
    fail(`${materialsReportRelativePath}: active publishing-materials contract identity is stale or mismatched`);
  }
  const pairProject = locale === 'en-US'
    ? materialsReport.pair?.englishProject
    : materialsReport.pair?.chineseProject;
  if (!pairProject || path.resolve(pairProject) !== project) {
    fail(`${materialsReportRelativePath}: current ${locale} project is not the validated project`);
  }
  if (materialsReport.pair?.runKey !== projectRunKey(project)) {
    fail(`${materialsReportRelativePath} runKey: expected ${projectRunKey(project)}, received ${JSON.stringify(materialsReport.pair?.runKey)}`);
  }
  const localeHashes = materialsReport.artifactHashes?.[locale] ?? {};
  const expectedLocaleArtifacts = [
    `publish-metadata.${locale}.json`,
    publishingMaterialsRule.files?.[locale] ?? `local-publishing-materials.${locale}.json`,
  ];
  if (!expectedLocaleArtifacts.every((relativePath) => typeof localeHashes[relativePath] === 'string')) {
    fail(`${materialsReportRelativePath}: ${locale} metadata/material hashes are incomplete`);
  }
  for (const [relativePath, expectedHash] of Object.entries(localeHashes)) {
    try {
      const actualHash = sha256(fs.readFileSync(path.join(project, relativePath)));
      if (actualHash !== expectedHash) {
        fail(`${materialsReportRelativePath} stale artifact ${relativePath}: expected ${expectedHash}, received ${actualHash}`);
      }
    } catch (error) {
      fail(`${materialsReportRelativePath} artifact ${relativePath}: ${error.message}`);
    }
  }
  const siblingProject = locale === 'en-US'
    ? materialsReport.pair?.chineseProject
    : materialsReport.pair?.englishProject;
  if (!siblingProject) {
    fail(`${materialsReportRelativePath}: sibling project is missing`);
  } else {
    try {
      const siblingReport = fs.readFileSync(path.join(
        path.resolve(siblingProject),
        materialsReportRelativePath,
      ));
      if (!materialsReportBuffer.equals(siblingReport)) {
        fail(`${materialsReportRelativePath}: locale reports are not byte-identical`);
      }
    } catch (error) {
      fail(`${materialsReportRelativePath} sibling: ${error.message}`);
    }
  }
}

if (generatedIdentityRequired) {
  const identityReportRelativePath = generatedIdentityRule.evidence?.reportFile
    ?? 'qa/tiny-agent-identity-consistency-report.json';
  const identityReport = readJson(identityReportRelativePath);
  isTrue(identityReport.pass, `${identityReportRelativePath} pass`);
  isTrue(identityReport.applicable, `${identityReportRelativePath} applicable`);
  if (identityReport.contractProfileId !== profile.profileId
    || identityReport.identityProfileId !== generatedIdentityRule.identityProfileId
    || identityReport.effectiveFromRunKey !== generatedIdentityRule.effectiveFromRunKey) {
    fail(`${identityReportRelativePath}: active Tiny Agent identity contract is stale or mismatched`);
  }
  if (path.resolve(identityReport.project ?? '') !== project
    || identityReport.runKey !== projectRunKey(project)
    || identityReport.locale !== locale) {
    fail(`${identityReportRelativePath}: current project, runKey, or locale binding is invalid`);
  }
  if (identityReport.activePackId !== generatedIdentityRule.fixedReference?.requiredPackId) {
    fail(`${identityReportRelativePath}: fixed Tiny Agent asset-pack identity is invalid`);
  }
  const artifactHashes = identityReport.artifactHashes ?? {};
  if (Object.keys(artifactHashes).length === 0) {
    fail(`${identityReportRelativePath}: no generated artifact hashes were recorded`);
  }
  for (const [relativePath, expectedHash] of Object.entries(artifactHashes)) {
    try {
      const actualHash = sha256(fs.readFileSync(path.join(project, relativePath)));
      if (actualHash !== expectedHash) {
        fail(`${identityReportRelativePath} stale artifact ${relativePath}: expected ${expectedHash}, received ${actualHash}`);
      }
    } catch (error) {
      fail(`${identityReportRelativePath} artifact ${relativePath}: ${error.message}`);
    }
  }
  for (const referencePath of generatedIdentityRule.fixedReference
    ?.canonicalReferenceImages ?? []) {
    try {
      const actualHash = sha256(fs.readFileSync(path.join(root, referencePath)));
      if (identityReport.fixedReferenceHashes?.[referencePath] !== actualHash) {
        fail(`${identityReportRelativePath} stale fixed reference ${referencePath}`);
      }
    } catch (error) {
      fail(`${identityReportRelativePath} fixed reference ${referencePath}: ${error.message}`);
    }
  }
  if (!Array.isArray(identityReport.entries)
    || identityReport.entries.length === 0
    || identityReport.entries.some((entry) => entry.pass !== true)) {
    fail(`${identityReportRelativePath}: generated asset identity entries are missing or failing`);
  }
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
