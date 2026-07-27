import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const codexHome =
  process.env.CODEX_HOME ?? path.join(process.env.HOME ?? '', '.codex');
const snapshotId = '2026-07-23-scheduled-6m18';
const snapshotDir = path.join(
  root,
  'scripts/ai-video-pipeline/style-guides/snapshots',
  snapshotId
);
const sourceCommit = '457ba42d110d259ed03c4b008e1af2cc8b0b9935';
const profileId = 'tiny-agent-longform-scheduled-6m18-2026-07-23';

const files = {
  contentPlan: path.join(
    root,
    'scripts/ai-video-pipeline/content-plans/tiny-agent-longform-plan.md'
  ),
  runbook: path.join(
    root,
    'scripts/ai-video-pipeline/automation-guides/tiny-agent-daily-longform.md'
  ),
  commonGuide: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md'
  ),
  activeProfile: path.join(
    root,
    'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'
  ),
  outputValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-longform-output.mjs'
  ),
  manifest: path.join(snapshotDir, 'manifest.json'),
  invocation: path.join(snapshotDir, 'automation-invocation.txt'),
  prompt: path.join(snapshotDir, 'automation-prompt.txt'),
  snapshotGuide: path.join(snapshotDir, 'tiny-agent-longform.md'),
  implementationProfile: path.join(
    snapshotDir,
    'implementation-profile.zh-CN.json'
  ),
  automation: path.join(codexHome, 'automations/tiny-agent/automation.toml'),
  memory: path.join(codexHome, 'automations/tiny-agent/memory.md'),
  voiceReadme: path.join(
    root,
    'scripts/ai-video-pipeline/voice-catalogs/edge-tts/README.md'
  ),
};

const expectedHashes = {
  'automation-invocation.txt':
    '8a0c26879bc04f3c2d30754f79618365e8ad0587227c2a3d39cf711fdb571432',
  'automation-prompt.txt':
    'ca42a5e44c9243554d233e4f547fbd8268979045835bf4172fee55c45b960766',
  'tiny-agent-longform.md':
    '467a8a881b09f1c05eba8ed7cc7319289b53ae140f155e6d5be24dbd18ada2af',
  'implementation-profile.zh-CN.json':
    'd43497e418293adff1b50eb78d4b9c1c93f46f634ff652a2f6e7014203ea48cb',
};

const referenceArtifacts = {
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/BRIEF.md':
    '0687be6f50778359a37fae830f5f092b0e641d06c734aa50f6f359956823c14d',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/production-profile.json':
    'd43497e418293adff1b50eb78d4b9c1c93f46f634ff652a2f6e7014203ea48cb',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/episode.json':
    '97e4d1047000cad21bfac214cc1f71e1b741151cf90ac4fd265ba9d126fc3ef6',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/scene-plan.json':
    '7b1fb7e3982451aecea935cfe654598ca20dfbeacc8b4c6ebe7d06525626a6a2',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/animation-plan.json':
    '4d9b6bcb67851df6a8abdbec9ed9efce167736aa7f034ee3d14be5fff634d2a7',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/build.mjs':
    'b9e662c7e8f4cf3864751aaaf3d54946886d8e9a699d345286938e4c0bddfa77',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/qa/motion-report.json':
    '3de3d66b457b5d8df75fba28def7818bf88100d9df5e94825c490003f0a8ee34',
  'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/qa/retention-opening-report.json':
    '7cb5301c4ef474eb7fa7162007ffe9bbb2fe6a18922d5ea667980f82434f7c2c',
};

const expectedChineseRenderHash =
  'c3f3ca90f1de71caa5b4f86f3376bf2acc8a1c0e380b39cc8cdb38589b4ae4d4';
const expectedEnglishRenderHash =
  'ddc688cf2d531b7c24166cad8d7563bb4e4d3167ea8ca2da010b8d5b1de03d5b';

const errors = [];

function readBuffer(label, file) {
  if (!fs.existsSync(file)) {
    errors.push(`${label}: missing ${file}`);
    return Buffer.alloc(0);
  }
  return fs.readFileSync(file);
}

function readText(label, file) {
  return readBuffer(label, file).toString('utf8');
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    errors.push(`${label}: invalid JSON: ${error.message}`);
    return {};
  }
}

function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function requireEqual(label, actual, expected) {
  if (actual !== expected) {
    errors.push(
      `${label}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`
    );
  }
}

function requireMatch(label, text, pattern) {
  if (!pattern.test(text)) {
    errors.push(`${label}: missing required rule ${pattern}`);
  }
}

function forbidMatch(label, text, pattern, description) {
  if (pattern.test(text)) {
    errors.push(`${label}: contains inactive generation rule ${description}`);
  }
}

function readCommitted(relativePath) {
  try {
    return execFileSync('git', ['show', `${sourceCommit}:${relativePath}`], {
      cwd: root,
      maxBuffer: 128 * 1024 * 1024,
    });
  } catch (error) {
    errors.push(
      `git:${relativePath}: cannot read from ${sourceCommit}: ${error.message}`
    );
    return Buffer.alloc(0);
  }
}

const text = {
  contentPlan: readText('contentPlan', files.contentPlan),
  runbook: readText('runbook', files.runbook),
  commonGuide: readText('commonGuide', files.commonGuide),
  activeProfile: readText('activeProfile', files.activeProfile),
  outputValidator: readText('outputValidator', files.outputValidator),
  manifest: readText('manifest', files.manifest),
  invocation: readText('invocation', files.invocation),
  prompt: readText('prompt', files.prompt),
  snapshotGuide: readText('snapshotGuide', files.snapshotGuide),
  implementationProfile: readText(
    'implementationProfile',
    files.implementationProfile
  ),
  automation: readText('automation', files.automation),
  memory: readText('memory', files.memory),
  voiceReadme: readText('voiceReadme', files.voiceReadme),
};

const profile = parseJson('activeProfile', text.activeProfile);
const manifest = parseJson('manifest', text.manifest);
const implementationProfile = parseJson(
  'implementationProfile',
  text.implementationProfile
);

for (const [name, expected] of Object.entries(expectedHashes)) {
  requireEqual(
    `snapshot:${name}:sha256`,
    sha256(readBuffer(`snapshot:${name}`, path.join(snapshotDir, name))),
    expected
  );
}

const committedGuide = readCommitted(
  'scripts/ai-video-pipeline/style-guides/tiny-agent-longform.md'
);
requireEqual(
  'snapshotGuide:commitCopy',
  sha256(readBuffer('snapshotGuide', files.snapshotGuide)),
  sha256(committedGuide)
);
requireEqual(
  'commonGuide:snapshotCopy',
  sha256(readBuffer('commonGuide', files.commonGuide)),
  expectedHashes['tiny-agent-longform.md']
);

requireEqual('activeProfile.schemaVersion', profile.schemaVersion, 2);
requireEqual('activeProfile.status', profile.status, 'active-frozen-snapshot');
requireEqual('activeProfile.profileId', profile.profileId, profileId);
requireEqual(
  'activeProfile.sourceCommit',
  profile.sourceSnapshot?.sourceCommit,
  sourceCommit
);
requireEqual(
  'activeProfile.chineseRenderHash',
  profile.sourceSnapshot?.referenceChineseRenderSha256,
  expectedChineseRenderHash
);
requireEqual(
  'activeProfile.englishRenderHash',
  profile.sourceSnapshot?.referenceEnglishRenderSha256,
  expectedEnglishRenderHash
);
requireEqual(
  'activeProfile.snapshotHashes',
  JSON.stringify(profile.integrity?.expectedSnapshotHashes),
  JSON.stringify(expectedHashes)
);
requireEqual('activeProfile.failClosed', profile.integrity?.failClosed, true);
requireEqual(
  'activeProfile.chapterRecapOverride.status',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.status,
  'active'
);
requireEqual(
  'activeProfile.chapterRecapOverride.zh.firstPointPrefix',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['zh-CN']?.firstPointPrefix,
  '本章小节。第一，'
);
requireEqual(
  'activeProfile.chapterRecapOverride.zh.secondPrefix',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['zh-CN']?.followingPointPrefixes?.[0],
  '第二，'
);
requireEqual(
  'activeProfile.chapterRecapOverride.zh.thirdPrefix',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['zh-CN']?.followingPointPrefixes?.[1],
  '第三，'
);
requireEqual(
  'activeProfile.chapterRecapOverride.zh.followingPointsForbiddenLabel',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['zh-CN']?.forbiddenInFollowingPoints,
  '本章小节'
);
requireEqual(
  'activeProfile.chapterRecapOverride.en.firstPointPrefix',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['en-US']?.firstPointPrefix,
  'Chapter recap. First, '
);
requireEqual(
  'activeProfile.chapterRecapOverride.en.followingPointsForbiddenLabel',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.['en-US']?.forbiddenInFollowingPoints,
  'Chapter recap'
);
requireEqual(
  'activeProfile.chapterRecapOverride.screenCopy.displayField',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.displayField,
  'recapDisplayText'
);
requireMatch(
  'activeProfile.chapterRecapOverride.screenCopy.rule',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.rule ?? '',
  /not narration or headline/
);
requireMatch(
  'activeProfile.chapterRecapOverride.screenCopy.rule',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.rule ?? '',
  /left-aligned/
);
requireEqual(
  'activeProfile.chapterRecapOverride.screenCopy.bodyNumbering.visible',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.bodyNumbering?.visible,
  true
);
requireEqual(
  'activeProfile.chapterRecapOverride.screenCopy.bodyNumbering.style',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.bodyNumbering?.style,
  'arabic-dot'
);
requireEqual(
  'activeProfile.chapterRecapOverride.screenCopy.bodyNumbering.values',
  JSON.stringify(profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.bodyNumbering?.values),
  JSON.stringify(['1.', '2.', '3.'])
);
requireEqual(
  'activeProfile.chapterRecapOverride.screenCopy.bodyTextAlignment',
  profile.postSnapshotUserOverrides?.chapterRecapNarration?.screenCopy?.bodyTextAlignment,
  'left'
);
requireEqual(
  'activeProfile.openingQuestionReadability.status',
  profile.postSnapshotUserOverrides?.openingQuestionReadability?.status,
  'active'
);
const openingOverride = profile.postSnapshotUserOverrides?.openingQuestionReadability;
requireEqual(
  'activeProfile.openingQuestionReadability.firstGlyphLead.min',
  openingOverride?.firstGlyphLeadMilliseconds?.min,
  120
);
requireEqual(
  'activeProfile.openingQuestionReadability.firstGlyphLead.max',
  openingOverride?.firstGlyphLeadMilliseconds?.max,
  180
);
requireEqual(
  'activeProfile.openingQuestionReadability.earlyRevealCount',
  openingOverride?.earlyRevealCount,
  1
);
requireEqual(
  'activeProfile.openingQuestionReadability.maximumPerGlyphLeadMilliseconds',
  openingOverride?.maximumPerGlyphLeadMilliseconds,
  280
);
requireEqual(
  'activeProfile.openingQuestionReadability.perGlyphAudibleLead.min',
  openingOverride?.perGlyphAudibleLeadMilliseconds?.min,
  120
);
requireEqual(
  'activeProfile.openingQuestionReadability.perGlyphAudibleLead.max',
  openingOverride?.perGlyphAudibleLeadMilliseconds?.max,
  180
);
requireEqual(
  'activeProfile.openingQuestionReadability.literalQuestionCompletionLead.min',
  openingOverride?.literalQuestionCompletionLeadMilliseconds?.min,
  40
);
requireEqual(
  'activeProfile.openingQuestionReadability.literalQuestionCompletionLead.max',
  openingOverride?.literalQuestionCompletionLeadMilliseconds?.max,
  180
);
requireEqual(
  'activeProfile.openingQuestionReadability.fullQuestionReadLead.min',
  openingOverride?.fullQuestionReadLeadMilliseconds?.min,
  1100
);
requireEqual(
  'activeProfile.openingQuestionReadability.fullQuestionReadLead.max',
  openingOverride?.fullQuestionReadLeadMilliseconds?.max,
  1650
);
requireEqual(
  'activeProfile.openingQuestionReadability.spokenBridge.min',
  openingOverride?.spokenBridge?.durationMilliseconds?.min,
  1100
);
requireEqual(
  'activeProfile.openingQuestionReadability.spokenBridge.max',
  openingOverride?.spokenBridge?.durationMilliseconds?.max,
  1650
);
requireMatch(
  'activeProfile.openingQuestionReadability.spokenBridge.rule',
  openingOverride?.spokenBridge?.rule ?? '',
  /literal visible-question VTT prefix/
);
requireEqual(
  'activeProfile.openingQuestionReadability.canvasCoverage.width.min',
  openingOverride?.canvasGlyphCoveragePercent?.width?.min,
  64
);
requireEqual(
  'activeProfile.openingQuestionReadability.canvasCoverage.width.max',
  openingOverride?.canvasGlyphCoveragePercent?.width?.max,
  92
);
requireEqual(
  'activeProfile.openingQuestionReadability.canvasCoverage.height.min',
  openingOverride?.canvasGlyphCoveragePercent?.height?.min,
  90
);
requireEqual(
  'activeProfile.openingQuestionReadability.canvasCoverage.height.max',
  openingOverride?.canvasGlyphCoveragePercent?.height?.max,
  98
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.status',
  openingOverride?.compactTextBlock?.status,
  'active'
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.semanticLineCount.min',
  openingOverride?.compactTextBlock?.semanticLineCount?.min,
  2
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.semanticLineCount.max',
  openingOverride?.compactTextBlock?.semanticLineCount?.max,
  4
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.maxInterlineGapPx',
  openingOverride?.compactTextBlock?.maxInterlineGapPx,
  24
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.glyphMassHeightPercent.min',
  openingOverride?.compactTextBlock?.glyphMassHeightPercent?.min,
  86
);
requireEqual(
  'activeProfile.openingQuestionReadability.compactTextBlock.glyphMassHeightPercent.max',
  openingOverride?.compactTextBlock?.glyphMassHeightPercent?.max,
  94
);
requireMatch(
  'activeProfile.openingQuestionReadability.compactTextBlock.purpose',
  openingOverride?.compactTextBlock?.purpose ?? '',
  /actual visible text mass/
);
requireMatch(
  'activeProfile.openingQuestionReadability.compactTextBlock.layout',
  openingOverride?.compactTextBlock?.layout ?? '',
  /add a semantic line/
);
requireMatch(
  'activeProfile.openingQuestionReadability.compactTextBlock.qa',
  openingOverride?.compactTextBlock?.qa ?? '',
  /glyphMassHeightPercent/
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.status',
  openingOverride?.uniformAdaptiveTypography?.status,
  'active'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.scope',
  JSON.stringify(openingOverride?.uniformAdaptiveTypography?.scope),
  JSON.stringify(['zh-CN'])
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.fontFamily',
  openingOverride?.uniformAdaptiveTypography?.fontFamily,
  'Hiragino Sans GB'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.fontFile',
  openingOverride?.uniformAdaptiveTypography?.fontFile,
  'assets/fonts/HiraginoSansGB.ttc'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.fontWeight',
  openingOverride?.uniformAdaptiveTypography?.fontWeight,
  700
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.uniformFontSize',
  openingOverride?.uniformAdaptiveTypography?.uniformFontSize,
  true
);
requireMatch(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.layout',
  openingOverride?.uniformAdaptiveTypography?.layout ?? '',
  /one largest safe final font size/
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentTokens.zh-CN',
  JSON.stringify(openingOverride?.uniformAdaptiveTypography?.accentTokens?.['zh-CN']),
  JSON.stringify([
    { token: 'AI Agent', tone: 'identity' },
    { token: '长期任务', tone: 'topic' },
    { token: '跑偏', tone: 'risk' },
  ])
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentColors',
  JSON.stringify(openingOverride?.uniformAdaptiveTypography?.accentColors),
  JSON.stringify({ identity: '#117ABD', topic: '#117ABD', risk: '#D84B3E' })
);
requireMatch(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.qa',
  openingOverride?.uniformAdaptiveTypography?.qa ?? '',
  /uniformFontSizePass/
);
requireEqual(
  'activeProfile.openingQuestionReadability.agentFirstFrame',
  openingOverride?.agentReservation?.visibleAtFirstFrame,
  true
);
requireEqual(
  'activeProfile.openingQuestionReadability.agentPosition',
  openingOverride?.agentReservation?.position,
  'bottom-right'
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.questionMarkGapPx',
  openingOverride?.kineticGlyphEntrance?.questionMarkGapPx,
  24
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.regularGlyph.durationMilliseconds',
  openingOverride?.kineticGlyphEntrance?.regularGlyph?.durationMilliseconds,
  240
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.regularGlyph.ease',
  openingOverride?.kineticGlyphEntrance?.regularGlyph?.ease,
  'power3.out'
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.regularGlyph.entryVectorsPx',
  openingOverride?.kineticGlyphEntrance?.regularGlyph?.entryVectorsPx?.length,
  4
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.finalQuestionGlyph.durationMilliseconds',
  openingOverride?.kineticGlyphEntrance?.finalQuestionGlyph?.durationMilliseconds,
  250
);
requireEqual(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.finalQuestionGlyph.ease',
  openingOverride?.kineticGlyphEntrance?.finalQuestionGlyph?.ease,
  'back.out(1.8)'
);
requireMatch(
  'activeProfile.openingQuestionReadability.kineticGlyphEntrance.purpose',
  openingOverride?.kineticGlyphEntrance?.purpose ?? '',
  /deterministic four-direction kinetic entrance/
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.status',
  openingOverride?.hookQuestionQuality?.status,
  'active'
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.allowedIntents',
  JSON.stringify(openingOverride?.hookQuestionQuality?.allowedIntents),
  JSON.stringify(['causal-diagnosis', 'mechanism', 'trade-off', 'trigger', 'actionable-path'])
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.requireTopicIdentity',
  openingOverride?.hookQuestionQuality?.requireTopicIdentity,
  true
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.requireAudiencePainPoint',
  openingOverride?.hookQuestionQuality?.requireAudiencePainPoint,
  true
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.requireUnresolvedCuriosity',
  openingOverride?.hookQuestionQuality?.requireUnresolvedCuriosity,
  true
);
requireMatch(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.forbiddenQuestionForms',
  JSON.stringify(openingOverride?.hookQuestionQuality?.forbiddenQuestionForms ?? []),
  /obvious yes-or-no validation question/
);
requireMatch(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.semanticLineBreak',
  openingOverride?.hookQuestionQuality?.semanticLineBreak ?? '',
  /causal clause together/
);
requireMatch(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.qa',
  openingOverride?.hookQuestionQuality?.qa ?? '',
  /opening-hook-quality-report\.json/
);
const chinesePronunciationOverride = profile.postSnapshotUserOverrides?.chinesePronunciation;
requireEqual(
  'activeProfile.chinesePronunciation.status',
  chinesePronunciationOverride?.status,
  'active'
);
requireEqual(
  'activeProfile.chinesePronunciation.scope',
  JSON.stringify(chinesePronunciationOverride?.scope),
  JSON.stringify(['zh-CN'])
);
requireMatch(
  'activeProfile.chinesePronunciation.authoring',
  chinesePronunciationOverride?.authoring ?? '',
  /content-bearing polyphonic term/
);
requireMatch(
  'activeProfile.chinesePronunciation.authoring',
  chinesePronunciationOverride?.authoring ?? '',
  /长期任务/
);
requireMatch(
  'activeProfile.chinesePronunciation.evidence',
  chinesePronunciationOverride?.evidence ?? '',
  /chinesePronunciationReview\.entries/
);
requireMatch(
  'activeProfile.chinesePronunciation.qa',
  chinesePronunciationOverride?.qa ?? '',
  /qa\/chinese-pronunciation-report\.json/
);
const chineseMandarinProsodyOverride = profile.postSnapshotUserOverrides?.chineseMandarinProsody;
requireEqual(
  'activeProfile.chineseMandarinProsody.status',
  chineseMandarinProsodyOverride?.status,
  'active'
);
requireEqual(
  'activeProfile.chineseMandarinProsody.scope',
  JSON.stringify(chineseMandarinProsodyOverride?.scope),
  JSON.stringify(['zh-CN'])
);
requireEqual(
  'activeProfile.chineseMandarinProsody.sentenceTerminators',
  JSON.stringify(chineseMandarinProsodyOverride?.ttsSegmentation?.sentenceTerminators),
  JSON.stringify(['。', '！', '？', '!', '?'])
);
requireMatch(
  'activeProfile.chineseMandarinProsody.authoring',
  chineseMandarinProsodyOverride?.authoring ?? '',
  /Do not use a comma, enumeration comma, colon, or semicolon as an artificial TTS-segment boundary/
);
requireMatch(
  'activeProfile.chineseMandarinProsody.ttsSegmentation.rule',
  chineseMandarinProsodyOverride?.ttsSegmentation?.rule ?? '',
  /Each Chinese TTS segment must be one complete sentence/
);
requireMatch(
  'activeProfile.chineseMandarinProsody.captions.partialSentenceException',
  chineseMandarinProsodyOverride?.captions?.partialSentenceException ?? '',
  /Only the final bottom VTT caption may be a partial spoken sentence/
);
requireMatch(
  'activeProfile.chineseMandarinProsody.qa',
  chineseMandarinProsodyOverride?.qa ?? '',
  /qa\/chinese-mandarin-prosody-report\.json/
);
const onScreenTextCompletenessOverride = profile.postSnapshotUserOverrides?.onScreenTextCompleteness;
requireEqual(
  'activeProfile.onScreenTextCompleteness.status',
  onScreenTextCompletenessOverride?.status,
  'active'
);
requireEqual(
  'activeProfile.onScreenTextCompleteness.scope',
  JSON.stringify(onScreenTextCompletenessOverride?.scope),
  JSON.stringify(['zh-CN', 'en-US'])
);
requireMatch(
  'activeProfile.onScreenTextCompleteness.captionsOnlyException',
  onScreenTextCompletenessOverride?.captionsOnlyException ?? '',
  /Only final bottom VTT captions may show a partial spoken sentence/
);
requireMatch(
  'activeProfile.onScreenTextCompleteness.authoring',
  onScreenTextCompletenessOverride?.authoring ?? '',
  /Never take an arbitrary leading slice of narration/
);
requireMatch(
  'activeProfile.onScreenTextCompleteness.authoring',
  onScreenTextCompletenessOverride?.authoring ?? '',
  /never hard-code an unrelated product or publisher/
);
requireMatch(
  'activeProfile.onScreenTextCompleteness.qa',
  onScreenTextCompletenessOverride?.qa ?? '',
  /qa\/on-screen-text-completeness-report\.json/
);
requireEqual(
  'activeProfile.openingQuestionReadability.forbiddenOpeningUi',
  JSON.stringify(openingOverride?.forbiddenOpeningUi),
  JSON.stringify(['opening progress rail', 'left blue circle', 'VOICE label'])
);
requireMatch(
  'activeProfile.openingQuestionReadability.timing',
  openingOverride?.timing ?? '',
  /120-180 milliseconds before the final VTT audible onset/
);
requireMatch(
  'activeProfile.openingQuestionReadability.timing',
  openingOverride?.timing ?? '',
  /Every later visible unit must also begin 120-180 milliseconds before its own VTT-derived audible onset/
);
requireMatch(
  'activeProfile.openingQuestionReadability.timing',
  openingOverride?.timing ?? '',
  /fail closed unless every measured lead is in range/
);
requireMatch(
  'activeProfile.openingQuestionReadability.openingUi',
  openingOverride?.openingUi ?? '',
  /Delete those elements from the opening DOM and timeline/
);
requireEqual(
  'activeProfile.generatedArtTransparency.status',
  profile.postSnapshotUserOverrides?.generatedArtTransparency?.status,
  'active'
);
requireEqual(
  'activeProfile.englishAdultNarration.status',
  profile.postSnapshotUserOverrides?.englishAdultNarration?.status,
  'active'
);
requireEqual(
  'activeProfile.englishAdultNarration.voice',
  profile.postSnapshotUserOverrides?.englishAdultNarration?.voice,
  'en-US-ChristopherNeural'
);
requireEqual(
  'activeProfile.englishAdultNarration.rate',
  profile.postSnapshotUserOverrides?.englishAdultNarration?.rate,
  '+30%'
);
requireEqual(
  'activeProfile.englishAdultNarration.forbiddenVoice',
  profile.postSnapshotUserOverrides?.englishAdultNarration?.forbiddenVoice,
  'en-US-AnaNeural'
);
requireMatch(
  'activeProfile.englishAdultNarration.selection',
  profile.postSnapshotUserOverrides?.englishAdultNarration?.selection ?? '',
  /mainstream adult US-English Christopher voice/
);
requireEqual(
  'activeProfile.fixedBilingualGeneration.durationSeconds',
  JSON.stringify(profile.fixedBilingualGeneration?.durationSeconds),
  JSON.stringify({ min: 300, max: 480 })
);
requireEqual(
  'activeProfile.fixedBilingualGeneration.en-US.voice',
  profile.fixedBilingualGeneration?.['en-US']?.voice,
  'en-US-ChristopherNeural'
);
requireEqual(
  'activeProfile.fixedBilingualGeneration.en-US.rate',
  profile.fixedBilingualGeneration?.['en-US']?.rate,
  '+30%'
);
requireMatch(
  'activeProfile.generatedArtTransparency.deliveryAsset',
  profile.postSnapshotUserOverrides?.generatedArtTransparency?.deliveryAsset ?? '',
  /real alpha channel/
);
requireMatch(
  'activeProfile.generatedArtTransparency.qa',
  profile.postSnapshotUserOverrides?.generatedArtTransparency?.qa ?? '',
  /qa\/generated-art-alpha-report\.json/
);
for (const [label, pattern] of [
  ['recap display field', /recapDisplayText/],
  ['recap rendered scan', /renderedMarkerScanPass/],
  ['opening early reveal', /earlyRevealCount/],
  ['opening UI absence', /voiceLabelPresent/],
  ['Chinese pronunciation report', /chinese-pronunciation-report\.json/],
  ['Chinese Mandarin prosody report', /chinese-mandarin-prosody-report\.json/],
  ['on-screen text completeness report', /on-screen-text-completeness-report\.json/],
  ['generated alpha report', /generated-art-alpha-report\.json/],
  ['source alpha inspection', /sips/],
]) {
  requireMatch(`outputValidator.${label}`, text.outputValidator, pattern);
}
requireEqual(
  'activeProfile.coverPrimaryTitleOnly.status',
  profile.postSnapshotUserOverrides?.coverPrimaryTitleOnly?.status,
  'active'
);
requireMatch(
  'activeProfile.coverPrimaryTitleOnly.rule',
  profile.postSnapshotUserOverrides?.coverPrimaryTitleOnly?.rule ?? '',
  /only its deterministic primary title/
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.status',
  profile.postSnapshotUserOverrides?.coverTitleTopicAlignment?.status,
  'active'
);
requireMatch(
  'activeProfile.coverTitleTopicAlignment.rule',
  profile.postSnapshotUserOverrides?.coverTitleTopicAlignment?.rule ?? '',
  /coverTitleContract/
);
requireMatch(
  'activeProfile.coverTitleTopicAlignment.qa',
  profile.postSnapshotUserOverrides?.coverTitleTopicAlignment?.qa ?? '',
  /validate-tiny-agent-zh-cover-reference\.mjs/
);
requireMatch(
  'activeProfile.coverTitleTopicAlignment.qa.en',
  profile.postSnapshotUserOverrides?.coverTitleTopicAlignment?.qa ?? '',
  /validate-tiny-agent-en-cover-reference\.mjs/
);
requireEqual(
  'activeProfile.coverReferenceAlignment.status',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.status,
  'active'
);
requireMatch(
  'activeProfile.coverReferenceAlignment.reference',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.reference ?? '',
  /2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.titleColors',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.titleColors ?? '',
  /exactly two title colors/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.character',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.character ?? '',
  /4:3 right-side hero and 3:4 lower hero must each be newly generated[\s\S]*English episode, the delivered 16:9 hero must likewise be newly generated/
);
requireEqual(
  'activeProfile.publishingMetadata.status',
  profile.postSnapshotUserOverrides?.publishingMetadata?.status,
  'active'
);
requireEqual(
  'activeProfile.publishingMetadata.zh.fixedFollowSentence',
  profile.postSnapshotUserOverrides?.publishingMetadata?.['zh-CN']?.fixedFollowSentence,
  '关注 Tiny Agent，成为更擅长使用 AI 的人！'
);
requireEqual(
  'activeProfile.publishingMetadata.en.fixedFollowSentence',
  profile.postSnapshotUserOverrides?.publishingMetadata?.['en-US']?.fixedFollowSentence,
  'Follow Tiny Agent. Tiny Agent helps you get better at using AI.'
);

requireEqual('manifest.schemaVersion', manifest.schemaVersion, 1);
requireEqual('manifest.snapshotId', manifest.snapshotId, profileId);
requireEqual('manifest.status', manifest.status, 'frozen');
requireEqual(
  'manifest.threadId',
  manifest.provenance?.threadId,
  '019f8b33-68dd-7d02-973f-ce3273ffcebf'
);
requireEqual(
  'manifest.automationMessageId',
  manifest.provenance?.automationInvocation?.messageId,
  'msg_019f8b33-7d32-70c1-b1d5-18344a587edf'
);
requireEqual(
  'manifest.sourceCommit',
  manifest.provenance?.sourceCommit?.sha,
  sourceCommit
);
requireEqual(
  'manifest.excludedLaterCommit',
  manifest.provenance?.excludedLaterRuleCommit?.sha,
  '2caf583df2b91d7d7f6248796bae0c7ce885ccab'
);
requireEqual(
  'manifest.chineseDuration',
  manifest.implementationReference?.chinese?.durationSeconds,
  378.176
);
requireEqual(
  'manifest.chineseRenderHash',
  manifest.implementationReference?.chinese?.renderSha256,
  expectedChineseRenderHash
);
requireEqual(
  'manifest.englishRenderHash',
  manifest.implementationReference?.english?.renderSha256,
  expectedEnglishRenderHash
);

const manifestHashes = Object.fromEntries(
  (manifest.frozenRuleSources ?? []).map((item) => [
    path.basename(item.path ?? ''),
    item.sha256,
  ])
);
requireEqual(
  'manifest.frozenRuleSources',
  JSON.stringify(manifestHashes),
  JSON.stringify(expectedHashes)
);

requireEqual(
  'implementationProfile.id',
  implementationProfile.id,
  'tiny-agent-longform-kinetic-retention-2026-07-23-zh-CN'
);
requireEqual(
  'implementationProfile.voice',
  implementationProfile.audio?.voice,
  'zh-CN-YunxiaNeural'
);
requireEqual(
  'implementationProfile.rate',
  implementationProfile.audio?.rate,
  '+35%'
);
requireEqual(
  'implementationProfile.recapPattern',
  implementationProfile.visual?.recapPattern,
  'persistent-blue-left-panel-cumulative-1-2-3'
);

const exactPromptChecks = [
  /英文使用 edge-tts en-US-AnaNeural、rate \+30%；中文使用 edge-tts zh-CN-YunxiaNeural、rate \+35%/,
  /固定控制在 5-8 分钟/,
  /每个实质章节有章节开场和可朗读的三点编号小结/,
  /earlyRevealCount=0/,
  /临时图片生成的新场景素材占非结束页视觉状态约 15%-20%/,
  /至少包含 7 种实际可见动作类型和 20 个动作节点/,
];
for (const pattern of exactPromptChecks) {
  requireMatch('snapshotPrompt', text.prompt, pattern);
}

const exactGuideChecks = [
  /固定成片范围：`5-8 分钟`/,
  /中文默认声音为 `zh-CN-YunxiaNeural`，固定使用 `\+35%` 语速；英文长视频默认声音为 `en-US-AnaNeural`，固定使用 `\+30%` 语速/,
  /中文总结必须进入旁白脚本，并固定从 `本章小节：第一/,
  /英文固定使用 `Chapter recap\. First/,
  /任何字或单词不得在其语音触发点前完整可见/,
  /临时图片生成的新场景素材占全部非结束页视觉状态约 `15%-20%`/,
  /至少包含 `7` 种动作类型和 `20` 个动作节点/,
];
for (const pattern of exactGuideChecks) {
  requireMatch('snapshotGuide', text.snapshotGuide, pattern);
}

const contentPlanChecks = [
  /2026-07-23-scheduled-6m18/,
  /en-US-ChristopherNeural`，固定语速 `\+30%`/,
  /zh-CN-YunxiaNeural`，固定语速 `\+35%`/,
  /中英文长视频均为 `5-8` 分钟/,
  /2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/,
  /2026-07-23-03-ai-agent-uncertainty-longform-en-US/,
];
for (const pattern of contentPlanChecks) {
  requireMatch('contentPlan', text.contentPlan, pattern);
}
forbidMatch(
  'contentPlan',
  text.contentPlan,
  /snapshots\/2026-07-23-v4-accepted/,
  'V4 snapshot path'
);
forbidMatch(
  'contentPlan',
  text.contentPlan,
  /2026-07-23-ai-agent-uncertainty-story-v4-zh-CN/,
  'V4 implementation reference'
);

const runbookChecks = [
  /2026-07-23-scheduled-6m18/,
  /只读取 active profile 的 `fixedBilingualGeneration` 与具名覆盖项/,
  /章节开场、正文和可朗读的三点编号小结/,
  /openingQuestionReadability/,
  /chapterRecapNarration\.screenCopy/,
  /generatedArtTransparency/,
  /validate-tiny-agent-longform-output\.mjs --project <PROJECT_DIR>/,
  /右下角的批准 Tiny Agent 从开场第一帧完整可见/,
  /不得出现独立进度条、左侧蓝色圆点或 `VOICE` 标签/,
  /蓝色 `AI Agent` 身份词、黑色其余标题文字、黄色底部\/纵向分区线/,
  /blueBlackTitleHierarchy=true/,
  /关注 Tiny Agent，成为更擅长使用 AI 的人！/,
  /Follow Tiny Agent\. Tiny Agent helps you get better at using AI\./,
];
for (const pattern of runbookChecks) {
  requireMatch('runbook', text.runbook, pattern);
}
forbidMatch(
  'runbook',
  text.runbook,
  /2026-07-23-v4-accepted/,
  'V4 snapshot path'
);
forbidMatch(
  'runbookMandatoryReads',
  text.runbook.split('本手册只规定每日状态机和发布流程。')[0] ?? '',
  /tiny-agent-deep-longform-cognitive-load\.md/,
  'historical deep guide in mandatory read order'
);

const automationPromptMatch = text.automation.match(/^prompt = (".*")$/m);
let automationPrompt = '';
if (!automationPromptMatch) {
  errors.push('automation: prompt field is missing');
} else {
  try {
    automationPrompt = JSON.parse(automationPromptMatch[1]);
  } catch (error) {
    errors.push(`automation: prompt cannot be decoded: ${error.message}`);
  }
}
const automationChecks = [
  /2026-07-23-scheduled-6m18/,
  /active profile 是唯一当前行为契约/,
  /fixedBilingualGeneration 和具名 postSnapshotUserOverrides/,
  /validate-tiny-agent-longform-output\.mjs --project <PROJECT_DIR>/,
];
for (const pattern of automationChecks) {
  requireMatch('automationPrompt', automationPrompt, pattern);
}
forbidMatch(
  'automationPrompt',
  automationPrompt,
  /snapshots\/2026-07-23-v4-accepted/,
  'V4 snapshot path'
);
forbidMatch(
  'automationPrompt',
  automationPrompt,
  /en-US-AnaNeural/,
  'former English longform voice'
);
forbidMatch(
  'automationPrompt',
  automationPrompt,
  /earlyRevealCount=0/,
  'former opening timing value'
);

const memoryActive = text.memory.split('\n## Formal automation state')[0] ?? '';
const memoryChecks = [
  /tiny-agent-longform-scheduled-6m18-2026-07-23/,
  /zh-CN-YunxiaNeural \+35%/,
  /en-US-ChristopherNeural \+30%/,
  /5-8 minutes/,
  /63` scenes, `7` chapters, and `15` recap scenes/,
  /Active bilingual opening readability override/,
  /first glyph is visible `120-180ms` before final VTT audible onset/,
  /full question is completely visible `650-850ms` before the first sentence ends/,
  /recap narration is separate from recapDisplayText/,
  /temporary generated art must have verified alpha/,
  /2caf583df2b91d7d7f6248796bae0c7ce885ccab` is explicitly excluded/,
];
for (const pattern of memoryChecks) {
  requireMatch('memoryActive', memoryActive, pattern);
}

requireMatch(
  'voiceReadme',
  text.voiceReadme,
  /当前活跃长视频 contract 固定为中文 `zh-CN-YunxiaNeural \+35%`、英文 `en-US-ChristopherNeural \+30%`/
);

for (const [relativePath, expected] of Object.entries(referenceArtifacts)) {
  requireEqual(
    `reference:${relativePath}:sha256`,
    sha256(readCommitted(relativePath)),
    expected
  );
}

const scenePlan = parseJson(
  'referenceScenePlan',
  readCommitted(
    'var/hyperframes-showcases/2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/scene-plan.json'
  ).toString('utf8')
);
const scenes = (scenePlan.chapters ?? []).flatMap(
  (chapter) => chapter.scenes ?? []
);
requireEqual('referenceScenePlan.sceneCount', scenes.length, 63);
requireEqual('referenceScenePlan.chapterCount', scenePlan.chapters?.length, 7);
requireEqual(
  'referenceScenePlan.recapCount',
  scenes.filter((scene) => scene.type === 'recap').length,
  15
);
requireEqual(
  'referenceScenePlan.temporaryGeneratedCount',
  scenes.filter((scene) => scene.temporaryGenerated === true).length,
  10
);

if (errors.length > 0) {
  console.error(
    `Tiny Agent active-rule validation failed with ${errors.length} error(s):`
  );
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

console.log(
  `Tiny Agent active-rule validation passed: ${profileId}; frozen evidence hashes and the sole current active contract are intact.`
);
