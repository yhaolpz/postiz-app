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
  bilingualParityValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-bilingual-parity.mjs'
  ),
  zhCoverValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-zh-cover-reference.mjs'
  ),
  enCoverValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-en-cover-reference.mjs'
  ),
  publishingMaterialsValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-bilingual-publishing-materials.mjs'
  ),
  generatedIdentityValidator: path.join(
    root,
    'scripts/ai-video-pipeline/validate-tiny-agent-generated-identity.mjs'
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
  bilingualParityValidator: readText(
    'bilingualParityValidator',
    files.bilingualParityValidator
  ),
  zhCoverValidator: readText('zhCoverValidator', files.zhCoverValidator),
  enCoverValidator: readText('enCoverValidator', files.enCoverValidator),
  publishingMaterialsValidator: readText(
    'publishingMaterialsValidator',
    files.publishingMaterialsValidator
  ),
  generatedIdentityValidator: readText(
    'generatedIdentityValidator',
    files.generatedIdentityValidator
  ),
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
const bilingualParity = profile.postSnapshotUserOverrides?.englishChineseProductionParity;
requireEqual(
  'activeProfile.englishChineseProductionParity.status',
  bilingualParity?.status,
  'active'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.effectiveFromRunKey',
  bilingualParity?.effectiveFromRunKey,
  '2026-07-28-03'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.canonicalLocale',
  bilingualParity?.canonicalLocale,
  'zh-CN'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.targetLocale',
  bilingualParity?.targetLocale,
  'en-US'
);
requireMatch(
  'activeProfile.englishChineseProductionParity.approvedChineseReferenceProject',
  bilingualParity?.approvedChineseReferenceProject ?? '',
  /2026-07-27-03-ai-agent-skills-longform-zh-CN/
);
requireMatch(
  'activeProfile.englishChineseProductionParity.rule',
  bilingualParity?.rule ?? '',
  /Chinese is the canonical production grammar[\s\S]*English may not introduce a different hook concept/
);
requireEqual(
  'activeProfile.englishChineseProductionParity.content.sharedContractFile',
  bilingualParity?.content?.sharedContractFile,
  'bilingual-content-contract.json'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.content.identicalContractBytes',
  bilingualParity?.content?.identicalContractBytes,
  true
);
requireEqual(
  'activeProfile.englishChineseProductionParity.content.requiredFields',
  JSON.stringify(bilingualParity?.content?.requiredFields),
  JSON.stringify([
    'schemaVersion',
    'contractId',
    'canonicalLocale',
    'sourceCanonicalUrl',
    'centralThesisId',
    'reusableArtifactId',
    'coverActionId',
    'priorityIds',
    'chapters',
    'review',
  ])
);
requireEqual(
  'activeProfile.englishChineseProductionParity.content.requiredReviewFlags',
  JSON.stringify(bilingualParity?.content?.requiredReviewFlags),
  JSON.stringify([
    'sameFactsAndBoundaries',
    'sameCentralThesis',
    'sameP0P1P2Coverage',
    'sameExamplesAndCaveats',
    'sameReusableArtifact',
    'naturalEnglishNotMechanicalTranslation',
  ])
);
requireEqual(
  'activeProfile.englishChineseProductionParity.sceneStructure.requireIdenticalSceneIdsAndOrder',
  bilingualParity?.sceneStructure?.requireIdenticalSceneIdsAndOrder,
  true
);
requireEqual(
  'activeProfile.englishChineseProductionParity.pacing.totalDurationRatio',
  JSON.stringify(bilingualParity?.pacing?.totalDurationRatio),
  JSON.stringify({ min: 0.85, max: 1.15 })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.pacing.maximumNormalizedChapterShareDifference',
  bilingualParity?.pacing?.maximumNormalizedChapterShareDifference,
  0.025
);
requireEqual(
  'activeProfile.englishChineseProductionParity.pacing.maximumNormalizedSceneShareDifference',
  bilingualParity?.pacing?.maximumNormalizedSceneShareDifference,
  0.025
);
const bilingualCoverSet = bilingualParity?.coverSet;
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.status',
  bilingualCoverSet?.status,
  'active'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.coverSetProfileId',
  bilingualCoverSet?.coverSetProfileId,
  'tiny-agent-bilingual-cover-set-2026-07-29'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.effectiveFromRunKey',
  bilingualCoverSet?.effectiveFromRunKey,
  '2026-07-29-03'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.requiredRatios',
  JSON.stringify(bilingualCoverSet?.requiredRatios),
  JSON.stringify({
    'en-US': ['16x9', '4x3', '3x4'],
    'zh-CN': ['4x3', '3x4'],
  })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.forbiddenRatios',
  JSON.stringify(bilingualCoverSet?.forbiddenRatios),
  JSON.stringify({ 'zh-CN': ['16x9'] })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.sharedLocalizedRatios',
  JSON.stringify(bilingualCoverSet?.sharedLocalizedRatios),
  JSON.stringify(['4x3', '3x4'])
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.legacy16x9ParityBeforeEffectiveRun.geometryProfileId',
  bilingualCoverSet?.legacy16x9ParityBeforeEffectiveRun?.geometryProfileId,
  'tiny-agent-bilingual-cover-16x9-parity-2026-07-27'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.outputs.en-US.16x9',
  JSON.stringify(bilingualCoverSet?.outputs?.['en-US']?.['16x9']),
  JSON.stringify({
    png: 'thumbnails/thumbnail.en-US.png',
    svg: 'thumbnails/thumbnail.en-US.svg',
    spec: 'thumbnails/thumbnail-spec.en-US.16x9.json',
    width: 3840,
    height: 2160,
    qaPreviews: [
      'thumbnails/thumbnail.en-US.1280x720.png',
      'thumbnails/thumbnail.en-US.256x144.png',
    ],
  })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.outputs.en-US.4x3',
  JSON.stringify(bilingualCoverSet?.outputs?.['en-US']?.['4x3']),
  JSON.stringify({
    png: 'thumbnails/thumbnail.en-US.4x3.png',
    svg: 'thumbnails/thumbnail.en-US.4x3.svg',
    spec: 'thumbnails/thumbnail-spec.en-US.4x3.json',
    width: 1200,
    height: 900,
    qaPreview: 'thumbnails/thumbnail.en-US.4x3.240x180.png',
  })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.outputs.en-US.3x4',
  JSON.stringify(bilingualCoverSet?.outputs?.['en-US']?.['3x4']),
  JSON.stringify({
    png: 'thumbnails/thumbnail.en-US.3x4.png',
    svg: 'thumbnails/thumbnail.en-US.3x4.svg',
    spec: 'thumbnails/thumbnail-spec.en-US.3x4.json',
    width: 900,
    height: 1200,
    qaPreview: 'thumbnails/thumbnail.en-US.3x4.180x240.png',
  })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.outputs.zh-CN',
  JSON.stringify(bilingualCoverSet?.outputs?.['zh-CN']),
  JSON.stringify({
    '4x3': {
      png: 'thumbnails/thumbnail.zh-CN.4x3.png',
      svg: 'thumbnails/thumbnail.zh-CN.4x3.svg',
      spec: 'thumbnails/thumbnail-spec.zh-CN.4x3.json',
      width: 1200,
      height: 900,
      qaPreview: 'thumbnails/thumbnail.zh-CN.4x3.240x180.png',
    },
    '3x4': {
      png: 'thumbnails/thumbnail.zh-CN.3x4.png',
      svg: 'thumbnails/thumbnail.zh-CN.3x4.svg',
      spec: 'thumbnails/thumbnail-spec.zh-CN.3x4.json',
      width: 900,
      height: 1200,
      qaPreview: 'thumbnails/thumbnail.zh-CN.3x4.180x240.png',
    },
  })
);
requireEqual(
  'activeProfile.englishChineseProductionParity.coverSet.englishPublication',
  JSON.stringify(bilingualCoverSet?.englishPublication),
  JSON.stringify({
    ratio: '16x9',
    file: 'thumbnails/thumbnail.en-US.png',
    postizOnlyThisCover: true,
  })
);
requireMatch(
  'activeProfile.englishChineseProductionParity.coverSet.rule',
  bilingualCoverSet?.rule ?? '',
  /generate five delivered covers[\s\S]*Do not generate or restore a Chinese 16:9 cover/
);
requireMatch(
  'activeProfile.englishChineseProductionParity.coverSet.qa',
  bilingualCoverSet?.qa ?? '',
  /compares the final English and Chinese 4:3\/3:4 SVG geometry/
);
requireEqual(
  'activeProfile.englishChineseProductionParity.qa.validator',
  bilingualParity?.qa?.validator,
  'scripts/ai-video-pipeline/validate-tiny-agent-bilingual-parity.mjs'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.qa.report',
  bilingualParity?.qa?.report,
  'qa/bilingual-parity-report.json'
);
requireEqual(
  'activeProfile.englishChineseProductionParity.qa.failClosed',
  bilingualParity?.qa?.failClosed,
  true
);
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
  JSON.stringify(['zh-CN', 'en-US'])
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
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.effectiveFromRunKey',
  openingOverride?.uniformAdaptiveTypography?.effectiveFromRunKey,
  '2026-07-28-03'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentTokenContract.source',
  openingOverride?.uniformAdaptiveTypography?.accentTokenContract?.source,
  'episode.openingAccentTokens'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentTokenContract.requiredTones',
  JSON.stringify(openingOverride?.uniformAdaptiveTypography?.accentTokenContract?.requiredTones),
  JSON.stringify(['identity', 'topic', 'risk'])
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentTokenContract.identityToken',
  openingOverride?.uniformAdaptiveTypography?.accentTokenContract?.identityToken,
  'AI Agent'
);
requireEqual(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.accentColors',
  JSON.stringify(openingOverride?.uniformAdaptiveTypography?.accentColors),
  JSON.stringify({ identity: '#117ABD', topic: '#117ABD', risk: '#D84B3E' })
);
requireMatch(
  'activeProfile.openingQuestionReadability.uniformAdaptiveTypography.qa',
  openingOverride?.uniformAdaptiveTypography?.qa ?? '',
  /uniformFontSizePass[\s\S]*English and Chinese openings use different typography systems/
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
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.requireDirectEpisodeTopic',
  openingOverride?.hookQuestionQuality?.requireDirectEpisodeTopic,
  true
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.requireViewerValueOrCuriosity',
  openingOverride?.hookQuestionQuality?.requireViewerValueOrCuriosity,
  true
);
requireEqual(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.forbidTangentialScenarioSetup',
  openingOverride?.hookQuestionQuality?.forbidTangentialScenarioSetup,
  true
);
requireMatch(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.authoring',
  openingOverride?.hookQuestionQuality?.authoring ?? '',
  /what the episode actually teaches/
);
requireMatch(
  'activeProfile.openingQuestionReadability.hookQuestionQuality.forbiddenQuestionForms',
  JSON.stringify(openingOverride?.hookQuestionQuality?.forbiddenQuestionForms ?? []),
  /tangential scenario or pain point/
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
  'activeProfile.fixedBilingualGeneration.canonicalVisualLocale',
  profile.fixedBilingualGeneration?.canonicalVisualLocale,
  'zh-CN'
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
const generatedIdentity = profile.postSnapshotUserOverrides
  ?.tinyAgentGeneratedIdentityConsistency;
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.status',
  generatedIdentity?.status,
  'active'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.effectiveFromRunKey',
  generatedIdentity?.effectiveFromRunKey,
  '2026-07-29-03'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.identityProfileId',
  generatedIdentity?.identityProfileId,
  'tiny-agent-generated-identity-near-match-2026-07-29'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.fixedReference.requiredPackId',
  generatedIdentity?.fixedReference?.requiredPackId,
  'tiny-agent-v2'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.fixedReference.referenceImageConditioningRequired',
  generatedIdentity?.fixedReference?.referenceImageConditioningRequired,
  true
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.fixedReference.canonicalReferenceImages',
  JSON.stringify(generatedIdentity?.fixedReference?.canonicalReferenceImages),
  JSON.stringify([
    'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/idle.png',
    'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/plan-front.png',
    'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/execute.png',
  ])
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.hardIdentityAnchors',
  JSON.stringify((generatedIdentity?.hardIdentityAnchors ?? []).map(({ id }) => id)),
  JSON.stringify([
    'rounded-white-compact-silhouette',
    'rounded-black-face-screen',
    'two-cyan-blue-eyes',
    'single-round-tip-antenna',
    'white-black-blue-palette',
    'friendly-cute-proportions',
  ])
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.secondaryIdentityAnchors',
  JSON.stringify((generatedIdentity?.secondaryIdentityAnchors ?? []).map(({ id }) => id)),
  JSON.stringify([
    'round-side-ear-modules',
    'utility-belt-or-waist-tool-motif',
    'rounded-white-hands-and-boots',
    'approved-finish-without-mecha-detail',
  ])
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.minimumSecondaryAnchorMatches',
  generatedIdentity?.minimumSecondaryAnchorMatches,
  2
);
requireMatch(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.purpose',
  generatedIdentity?.purpose ?? '',
  /Exact reuse is allowed[\s\S]*2026-07-28 episode is allowed[\s\S]*character redesign is not/
);
requireMatch(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.allowedVariation',
  JSON.stringify(generatedIdentity?.allowedVariation),
  /minor-soft-3D|restrained soft-3D finish comparable to the 2026-07-28/
);
requireMatch(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.forbiddenVariation',
  JSON.stringify(generatedIdentity?.forbiddenVariation),
  /tall human-like[\s\S]*armored mecha[\s\S]*animal[\s\S]*realistic humanoid/
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.evidence.reportFile',
  generatedIdentity?.evidence?.reportFile,
  'qa/tiny-agent-identity-consistency-report.json'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.qa.validator',
  generatedIdentity?.qa?.validator,
  'scripts/ai-video-pipeline/validate-tiny-agent-generated-identity.mjs'
);
requireEqual(
  'activeProfile.tinyAgentGeneratedIdentityConsistency.qa.failClosed',
  generatedIdentity?.qa?.failClosed,
  true
);
for (const [label, pattern] of [
  ['bilingual parity report', /bilingual-parity-report\.json/],
  ['bilingual parity artifact hashes', /artifactHashes/],
  ['bilingual parity byte equality', /byte-identical/],
  ['bilingual publishing-materials report', /bilingual-publishing-materials-report\.json/],
  ['bilingual publishing-materials contract', /publishingMaterialsRule/],
  ['bilingual publishing-materials hash binding', /expectedLocaleArtifacts/],
  ['recap display field', /recapDisplayText/],
  ['recap rendered scan', /renderedMarkerScanPass/],
  ['opening early reveal', /earlyRevealCount/],
  ['opening UI absence', /voiceLabelPresent/],
  ['Chinese pronunciation report', /chinese-pronunciation-report\.json/],
  ['Chinese Mandarin prosody report', /chinese-mandarin-prosody-report\.json/],
  ['on-screen text completeness report', /on-screen-text-completeness-report\.json/],
  ['generated alpha report', /generated-art-alpha-report\.json/],
  ['source alpha inspection', /sips/],
  ['generated identity contract', /generatedIdentityRule/],
  ['generated identity report', /tiny-agent-identity-consistency-report\.json/],
  ['generated identity artifact hashes', /artifactHashes/],
  ['generated identity fixed-reference hashes', /fixedReferenceHashes/],
]) {
  requireMatch(`outputValidator.${label}`, text.outputValidator, pattern);
}
for (const [label, pattern] of [
  ['fixed pack reference', /requiredPackId/],
  ['reference image conditioning', /referenceConditioningUsed/],
  ['all Agent characters use Tiny Agent identity', /allAgentsUseTinyAgentIdentity/],
  ['hard identity anchors', /hardIdentityAnchors/],
  ['secondary identity anchors', /secondaryIdentityAnchors/],
  ['exact or minor variation decision', /approvedSimilarity/],
  ['approved 2D or soft-3D finish', /approvedFinish/],
  ['major redesign rejection', /noMajorRedesign/],
  ['hash-bound artifacts', /artifactHashes/],
  ['four fail-closed mutations', /four fail-closed mutations/],
]) {
  requireMatch(
    `generatedIdentityValidator.${label}`,
    text.generatedIdentityValidator,
    pattern
  );
}
for (const [label, pattern] of [
  ['shared contract', /bilingual-content-contract\.json/],
  ['content contract bindings', /contentContractBindings/],
  ['scene structure', /sceneStructure/],
  ['animation structure', /animationStructure/],
  ['normalized chapter pacing', /normalizedChapterPacing/],
  ['normalized scene pacing', /normalizedScenePacing/],
  ['shared opening typography', /openingTypography/],
  ['shared cover geometry', /coverGeometry/],
  ['shared cover action', /coverSemanticAction/],
  ['shared localized cover ratios', /sharedCoverRatios/],
  ['current cover-set identity', /coverSetProfileId/],
  ['hash-bound report', /artifactHashes/],
  ['fail-closed self-test', /four fail-closed mutations/],
]) {
  requireMatch(`bilingualParityValidator.${label}`, text.bilingualParityValidator, pattern);
}
for (const [label, pattern] of [
  ['paired material files', /local-publishing-materials/],
  ['metadata binding', /metadataBinding/],
  ['exact interaction count', /interactionCount/],
  ['stable interaction angles', /pairedInteractionIdsAndAngles/],
  ['natural English counterpart', /naturalEnglishCounterpart/],
  ['hash-bound report', /artifactHashes/],
  ['fail-closed self-test', /four fail-closed mutations/],
]) {
  requireMatch(
    `publishingMaterialsValidator.${label}`,
    text.publishingMaterialsValidator,
    pattern
  );
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
const zhCoverTitleDensity = profile.postSnapshotUserOverrides?.coverTitleTopicAlignment?.zhRatioTitleInformationDensity;
requireEqual(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.status',
  zhCoverTitleDensity?.status,
  'active'
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.scope',
  JSON.stringify(zhCoverTitleDensity?.scope),
  JSON.stringify(['zh-CN/4x3', 'zh-CN/3x4'])
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.minimumInformationUnitsBeyondIdentity',
  zhCoverTitleDensity?.minimumInformationUnitsBeyondIdentity,
  6
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.titleLineCount',
  JSON.stringify(zhCoverTitleDensity?.titleLineCount),
  JSON.stringify({ min: 3, max: 4 })
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.minimumTitleBlockHeightPercent',
  JSON.stringify(zhCoverTitleDensity?.minimumTitleBlockHeightPercent),
  JSON.stringify({ '4x3': 60, '3x4': 45 })
);
requireMatch(
  'activeProfile.coverTitleTopicAlignment.zhRatioTitleInformationDensity.qa',
  zhCoverTitleDensity?.qa ?? '',
  /information units beyond the AI Agent identity/
);
for (const [label, pattern] of [
  ['information-unit measurement', /countInformationUnitsBeyondIdentity/],
  ['title-block measurement', /measureSvgTitleBlock/],
  ['information-density gate', /titleInformationDensity/],
  ['line-density gate', /titleLineDensity/],
  ['title-block-height gate', /titleBlockHeightDensity/],
  ['title-intent gate', /titleQuestionActionOrBenefit/],
  ['generated-identity effective gate', /generatedIdentityApplied/],
  ['generated-identity declaration gate', /generatedIdentityDeclarationPass/],
  ['fixed-reference conditioning', /referenceConditioningUsed/],
  ['canonical fixed-reference paths', /canonicalReferenceImages/],
  ['exact-or-minor similarity', /requiredSimilarityDecisions/],
  ['approved finish classification', /allowedFinishClassifications/],
  ['major redesign rejection', /majorRedesignDetected/],
]) {
  requireMatch(`zhCoverValidator.${label}`, text.zhCoverValidator, pattern);
}
const enCoverTitleDensity = profile.postSnapshotUserOverrides
  ?.coverTitleTopicAlignment
  ?.enRatioTitleInformationDensity;
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.status',
  enCoverTitleDensity?.status,
  'active'
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.effectiveFromRunKey',
  enCoverTitleDensity?.effectiveFromRunKey,
  '2026-07-29-03'
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.scope',
  JSON.stringify(enCoverTitleDensity?.scope),
  JSON.stringify(['en-US/4x3', 'en-US/3x4'])
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.minimumInformationUnitsBeyondIdentity',
  enCoverTitleDensity?.minimumInformationUnitsBeyondIdentity,
  4
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.titleLineCount',
  JSON.stringify(enCoverTitleDensity?.titleLineCount),
  JSON.stringify({ min: 3, max: 4 })
);
requireEqual(
  'activeProfile.coverTitleTopicAlignment.enRatioTitleInformationDensity.minimumTitleBlockHeightPercent',
  JSON.stringify(enCoverTitleDensity?.minimumTitleBlockHeightPercent),
  JSON.stringify({ '4x3': 55, '3x4': 42 })
);
for (const [label, pattern] of [
  ['information-unit measurement', /countInformationUnitsBeyondIdentity/],
  ['title-block measurement', /measureTitleBlock/],
  ['information-density gate', /titleInformationDensity/],
  ['line-density gate', /titleLineDensity/],
  ['title-block-height gate', /titleBlockHeightDensity/],
  ['title-intent gate', /titleQuestionActionOrBenefit/],
  ['generated-identity effective gate', /generatedIdentityApplied/],
  ['generated-identity declaration gate', /generatedIdentityDeclarationPass/],
  ['fixed-reference conditioning', /referenceConditioningUsed/],
  ['canonical fixed-reference paths', /canonicalReferenceImages/],
  ['exact-or-minor similarity', /requiredSimilarityDecisions/],
  ['approved finish classification', /allowedFinishClassifications/],
  ['major redesign rejection', /majorRedesignDetected/],
]) {
  requireMatch(`enCoverValidator.${label}`, text.enCoverValidator, pattern);
}
requireEqual(
  'activeProfile.coverReferenceAlignment.status',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.status,
  'active'
);
requireMatch(
  'activeProfile.coverReferenceAlignment.reference',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.reference ?? '',
  /approved 2026-07-23 title-hero system[\s\S]*2026-07-26 4:3\/3:4 strict geometry/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.titleColors',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.titleColors ?? '',
  /exactly two title colors/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.character',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.character ?? '',
  /Chinese episode, the delivered 4:3 right-side hero and 3:4 lower hero must each be newly generated[\s\S]*English episode, the delivered 16:9, 4:3, and 3:4 heroes must each be newly generated/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.character.generatedIdentityRule',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.character ?? '',
  /tinyAgentGeneratedIdentityConsistency[\s\S]*actual fixed-pack reference image[\s\S]*Exact fixed-asset styling[\s\S]*minor 2D variation[\s\S]*restrained soft-3D variation[\s\S]*missing belt or hand-drawn outline alone is not a redesign[\s\S]*major character redesign/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.qa.generatedIdentityEvidence',
  profile.postSnapshotUserOverrides?.coverReferenceAlignment?.qa ?? '',
  /identityProfileId[\s\S]*referenceConditioningUsed=true[\s\S]*exact\/minor similarity decision[\s\S]*majorRedesignDetected=false[\s\S]*identity-consistency report/
);
const zhCoverStrictGeometry = profile.postSnapshotUserOverrides
  ?.coverReferenceAlignment
  ?.zhRatioStrictGeometry;
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.status',
  zhCoverStrictGeometry?.status,
  'active'
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.scope',
  JSON.stringify(zhCoverStrictGeometry?.scope),
  JSON.stringify(['zh-CN/4x3', 'zh-CN/3x4'])
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.geometryProfileId',
  zhCoverStrictGeometry?.geometryProfileId,
  'tiny-agent-zh-cover-approved-geometry-2026-07-26'
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.shared.paperGrid',
  JSON.stringify(zhCoverStrictGeometry?.shared?.paperGrid),
  JSON.stringify({
    cellWidthPx: 48,
    cellHeightPx: 48,
    stroke: '#111413',
    strokeWidthPx: 1,
    opacity: 0.035,
  })
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.shared.titleGroup',
  JSON.stringify(zhCoverStrictGeometry?.shared?.titleGroup),
  JSON.stringify({
    fontFamilyTokens: ['Hiragino Sans GB', 'PingFang SC', 'sans-serif'],
    fontWeight: 900,
    fill: '#111413',
    stroke: '#ECECEA',
    strokeWidthPx: 9,
    strokeLineJoin: 'round',
    paintOrder: 'stroke',
    letterSpacingPx: -4,
    minimumBodyFontSizePx: 112,
    maximumFontSizePx: 212,
    minimumDominantBodyLineFontSizePx: 145,
    minimumDominantBodyLineCount: 2,
  })
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.shared.titleLineCount',
  zhCoverStrictGeometry?.shared?.titleLineCount,
  4
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.shared.geometryTolerancePx',
  zhCoverStrictGeometry?.shared?.geometryTolerancePx,
  0
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.4x3',
  JSON.stringify(zhCoverStrictGeometry?.['4x3']),
  JSON.stringify({
    canvas: { width: 1200, height: 900 },
    blueRule: { x: 38, y: 28, width: 176, height: 14, rx: 7 },
    yellowRule: { x: 38, y: 882, width: 624, height: 18, rx: 9 },
    title: { x: 38, baselineY: [166, 348, 550, 786], identityFontSizePx: { min: 130, max: 184 } },
    heroBox: { x: 640, y: 230, width: 550, height: 640 },
  })
);
requireEqual(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.3x4',
  JSON.stringify(zhCoverStrictGeometry?.['3x4']),
  JSON.stringify({
    canvas: { width: 900, height: 1200 },
    blueRule: { x: 36, y: 30, width: 160, height: 14, rx: 7 },
    yellowRule: { x: 36, y: 711, width: 828, height: 18, rx: 9 },
    title: { x: 36, baselineY: [148, 316, 500, 684], identityFontSizePx: { min: 125, max: 168 } },
    heroBox: { x: 75, y: 729, width: 750, height: 480 },
  })
);
requireMatch(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.rule',
  zhCoverStrictGeometry?.rule ?? '',
  /approved deterministic SVG geometry/
);
requireMatch(
  'activeProfile.coverReferenceAlignment.zhRatioStrictGeometry.qa',
  zhCoverStrictGeometry?.qa ?? '',
  /zero pixel tolerance/
);
for (const [label, pattern] of [
  ['strict profile id gate', /strictGeometryProfileId/],
  ['strict SVG parser', /parseSvgElementAttributes/],
  ['strict geometry evaluator', /evaluateStrictGeometry/],
  ['strict title baseline gate', /titleBaselineGeometry/],
  ['strict rounded-rule gate', /roundedRuleGeometry/],
  ['strict hero box gate', /heroBoxGeometry/],
  ['strict preview gate', /previewDimensions/],
  ['strict evidence report', /strictGeometryEvidence/],
]) {
  requireMatch(`zhCoverValidator.${label}`, text.zhCoverValidator, pattern);
}
const enCoverStrictGeometry = profile.postSnapshotUserOverrides
  ?.coverReferenceAlignment
  ?.enRatioStrictGeometry;
requireEqual(
  'activeProfile.coverReferenceAlignment.enRatioStrictGeometry.status',
  enCoverStrictGeometry?.status,
  'active'
);
requireEqual(
  'activeProfile.coverReferenceAlignment.enRatioStrictGeometry.effectiveFromRunKey',
  enCoverStrictGeometry?.effectiveFromRunKey,
  '2026-07-29-03'
);
requireEqual(
  'activeProfile.coverReferenceAlignment.enRatioStrictGeometry.scope',
  JSON.stringify(enCoverStrictGeometry?.scope),
  JSON.stringify(['en-US/4x3', 'en-US/3x4'])
);
requireEqual(
  'activeProfile.coverReferenceAlignment.enRatioStrictGeometry.geometryProfileId',
  enCoverStrictGeometry?.geometryProfileId,
  'tiny-agent-en-cover-approved-geometry-2026-07-29'
);
requireEqual(
  'activeProfile.coverReferenceAlignment.enRatioStrictGeometry.inheritsGeometryFrom',
  enCoverStrictGeometry?.inheritsGeometryFrom,
  'postSnapshotUserOverrides.coverReferenceAlignment.zhRatioStrictGeometry'
);
for (const [label, pattern] of [
  ['current ratio selection', /selectedRatios/],
  ['strict geometry evaluator', /inspectStrictGeometry/],
  ['strict profile id gate', /strictGeometryProfileId/],
  ['cover-set profile id gate', /coverSetProfileId/],
  ['strict title baseline gate', /titleBaselineGeometry/],
  ['strict rounded-rule gate', /roundedRuleGeometry/],
  ['strict hero box gate', /heroBoxGeometry/],
  ['strict preview gate', /previewDimensions/],
  ['strict evidence report', /strictGeometryEvidence/],
]) {
  requireMatch(`enCoverValidator.${label}`, text.enCoverValidator, pattern);
}
for (const [label, pattern] of [
  ['current ratio selection', /currentCoverSetApplied/],
  ['forbidden Chinese 16:9 artifacts', /forbidden16x9Artifacts/],
  ['cover-set profile id gate', /coverSetProfileId/],
]) {
  requireMatch(`zhCoverValidator.${label}`, text.zhCoverValidator, pattern);
}
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
requireEqual(
  'activeProfile.publishingMetadata.titleSemanticAgency.status',
  profile.postSnapshotUserOverrides?.publishingMetadata?.titleSemanticAgency?.status,
  'active'
);
requireEqual(
  'activeProfile.publishingMetadata.titleSemanticAgency.scope',
  JSON.stringify(profile.postSnapshotUserOverrides?.publishingMetadata?.titleSemanticAgency?.scope),
  JSON.stringify(['zh-CN', 'en-US'])
);
requireMatch(
  'activeProfile.publishingMetadata.titleSemanticAgency.rule',
  profile.postSnapshotUserOverrides?.publishingMetadata?.titleSemanticAgency?.rule ?? '',
  /actual actor|semantic agency/
);
requireMatch(
  'activeProfile.publishingMetadata.titleSemanticAgency.qa',
  profile.postSnapshotUserOverrides?.publishingMetadata?.titleSemanticAgency?.qa ?? '',
  /hasAccurateAgency/
);
const bilingualPublishingMaterials = profile.postSnapshotUserOverrides
  ?.bilingualPublishingMaterials;
requireEqual(
  'activeProfile.bilingualPublishingMaterials.status',
  bilingualPublishingMaterials?.status,
  'active'
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.effectiveFromRunKey',
  bilingualPublishingMaterials?.effectiveFromRunKey,
  '2026-07-29-03'
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.files',
  JSON.stringify(bilingualPublishingMaterials?.files),
  JSON.stringify({
    'zh-CN': 'local-publishing-materials.zh-CN.json',
    'en-US': 'local-publishing-materials.en-US.json',
    report: 'qa/bilingual-publishing-materials-report.json',
  })
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.interactionSuggestions.exactCount',
  bilingualPublishingMaterials?.interactionSuggestions?.exactCount,
  3
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.interactionSuggestions.stableIdsAndAngles',
  JSON.stringify(
    bilingualPublishingMaterials?.interactionSuggestions?.stableIdsAndAngles
  ),
  JSON.stringify([
    { id: 'open-question', angle: 'open-question' },
    { id: 'practical-tradeoff', angle: 'practical-tradeoff' },
    { id: 'viewpoint-experience', angle: 'viewpoint-experience' },
  ])
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.localization.canonicalLocale',
  bilingualPublishingMaterials?.localization?.canonicalLocale,
  'zh-CN'
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.localization.targetLocale',
  bilingualPublishingMaterials?.localization?.targetLocale,
  'en-US'
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.localization.naturalEnglishNotMechanicalTranslation',
  bilingualPublishingMaterials?.localization?.naturalEnglishNotMechanicalTranslation,
  true
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.qa.validator',
  bilingualPublishingMaterials?.qa?.validator,
  'scripts/ai-video-pipeline/validate-tiny-agent-bilingual-publishing-materials.mjs'
);
requireEqual(
  'activeProfile.bilingualPublishingMaterials.qa.failClosed',
  bilingualPublishingMaterials?.qa?.failClosed,
  true
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
  /中文是内容呈现、场景、画面、动作、节奏和封面格式的主版本/,
  /englishChineseProductionParity/,
  /en-US-ChristopherNeural`，固定语速 `\+30%`/,
  /zh-CN-YunxiaNeural`，固定语速 `\+35%`/,
  /中英文长视频均为 `5-8` 分钟/,
  /每期固定五张/,
  /英文 `thumbnail\.en-US\.png` 4K `16:9` 发布母版/,
  /中文只生成 `thumbnail\.zh-CN\.4x3\.png`/,
  /不再生成中文 `16:9` 封面/,
  /local-publishing-materials\.zh-CN\.json/,
  /各三条互动建议/,
  /临时图角色身份/,
  /tiny-agent-v2/,
  /与 `2026-07-28` 临时图相当的轻微/,
  /显著身体\/脸部重设计直接阻塞生产/,
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
  /englishChineseProductionParity/,
  /中文是制作语法的主版本，英文只做自然英语本地化和成人英语旁白替换/,
  /bilingual-content-contract\.json/,
  /validate-tiny-agent-bilingual-parity\.mjs/,
  /qa\/bilingual-parity-report\.json/,
  /englishChineseProductionParity\.coverSet/,
  /英文固定生成 `16:9` 4K 发布母版、`4:3`、`3:4` 三张封面/,
  /中文只生成 `4:3`、`3:4` 两张封面，不再生成或恢复中文 `16:9`/,
  /validate-tiny-agent-bilingual-publishing-materials\.mjs/,
  /qa\/bilingual-publishing-materials-report\.json/,
  /local-publishing-materials\.zh-CN\.json/,
  /各含恰好三条具名互动建议/,
  /只读取 active profile 的 `fixedBilingualGeneration` 与具名覆盖项/,
  /章节开场、正文和可朗读的三点编号小结/,
  /openingQuestionReadability/,
  /hookQuestionQuality/,
  /chapterRecapNarration\.screenCopy/,
  /generatedArtTransparency/,
  /tinyAgentGeneratedIdentityConsistency/,
  /实际传入 `tiny-agent-v2` 固定角色 PNG 作为图片参考/,
  /与 `2026-07-28` 当期临时图相当的轻微/,
  /validate-tiny-agent-generated-identity\.mjs/,
  /qa\/tiny-agent-identity-consistency-report\.json/,
  /majorRedesignDetected=false/,
  /coverTitleTopicAlignment\.zhRatioTitleInformationDensity/,
  /enRatioTitleInformationDensity/,
  /coverReferenceAlignment\.zhRatioStrictGeometry/,
  /enRatioStrictGeometry/,
  /titleSemanticAgency/,
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
  /2026-07-29-03/,
  /英文固定生成 `16:9`、`4:3`、`3:4`/,
  /中文只生成 `4:3`、`3:4`/,
  /不得生成或恢复中文 `16:9`/,
  /local-publishing-materials\.zh-CN\.json/,
  /local-publishing-materials\.en-US\.json/,
  /各三条互动建议/,
  /validate-tiny-agent-bilingual-publishing-materials\.mjs/,
  /tinyAgentGeneratedIdentityConsistency/,
  /validate-tiny-agent-generated-identity\.mjs/,
  /固定角色 PNG 作为图片参考/,
  /允许完全一致/,
  /轻微姿态、表情、配件、线稿或克制软 3D 变化/,
  /不得改变圆润白色紧凑轮廓、黑色脸屏、两只蓝眼、单根圆头天线、白黑蓝主配色和友好比例/,
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
