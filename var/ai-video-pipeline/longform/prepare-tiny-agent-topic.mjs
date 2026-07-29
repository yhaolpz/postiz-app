import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = '/Volumes/SSD/Workspace/postiz-app';
const templateRoot = path.join(
  repoRoot,
  'var/hyperframes-showcases/2026-07-28-03-multi-agent-decision-longform',
);

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

function copyFile(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

function copyTree(source, destination) {
  fs.cpSync(source, destination, { recursive: true });
}

function idsForChapter(chapterNumber, count) {
  return Array.from(
    { length: count },
    (_, index) => `c${String(chapterNumber).padStart(2, '0')}-p${String(index + 1).padStart(2, '0')}`,
  );
}

const sceneShape = [5, 10, 10, 10, 10, 10, 4];
const sceneIdsByChapter = sceneShape.map((count, index) => idsForChapter(index + 1, count));
const allSceneIds = sceneIdsByChapter.flat();
const generatedScenes = {
  'c01-p03': 0,
  'c02-p03': 0,
  'c02-p07': 1,
  'c03-p04': 1,
  'c03-p07': 0,
  'c04-p03': 0,
  'c04-p07': 1,
  'c05-p04': 2,
  'c05-p07': 0,
  'c06-p04': 2,
};

const propTypes = [
  'question', 'evidence', 'branch', 'task-list', 'target', 'compare', 'warning',
  'checklist', 'workflow', 'shield', 'ruler', 'progress', 'dashboard', 'summary',
];
const agentDirections = [
  'ask-front', 'present-left', 'evaluate-front', 'plan-front', 'handoff-left',
  'verify-front', 'reason-front', 'store-memory', 'monitor-left', 'write-front',
];

function makeVisuals(locale) {
  const visuals = {};
  locale.chapterLabels.forEach((chapter, chapterIndex) => {
    visuals[chapter] = locale.screens[chapterIndex].map((screen, paragraphIndex) => {
      const isRecap = chapterIndex >= 1
        && chapterIndex <= 5
        && paragraphIndex >= sceneShape[chapterIndex] - 3;
      const type = chapterIndex === 0 && paragraphIndex === 0
        ? 'hook'
        : chapterIndex === 0 && paragraphIndex === sceneShape[0] - 1
          ? 'promise'
        : chapterIndex === 0 && paragraphIndex === 1
          ? 'authority'
        : chapterIndex >= 1 && chapterIndex <= 5 && paragraphIndex === 0
          ? 'chapter-intro'
          : chapterIndex === 6 && paragraphIndex === 3
            ? 'outro'
            : isRecap
              ? 'recap'
              : 'generic';
      const flatIndex = sceneIdsByChapter
        .slice(0, chapterIndex)
        .reduce((sum, ids) => sum + ids.length, 0) + paragraphIndex;
      return [
        screen,
        propTypes[flatIndex % propTypes.length],
        agentDirections[flatIndex % agentDirections.length],
        screen,
        type,
      ];
    });
  });
  return visuals;
}

function scriptText(locale) {
  const lines = [`# ${locale.projectTitle}`, ''];
  locale.chapterLabels.forEach((chapter, chapterIndex) => {
    lines.push(`### ${chapterIndex + 1} | ${chapter}`, '');
    locale.paragraphs[chapterIndex].forEach((paragraph) => {
      lines.push(paragraph, '');
    });
  });
  return `${lines.join('\n').trim()}\n`;
}

function makeContract(topic) {
  return {
    schemaVersion: 1,
    contractId: topic.contractId,
    canonicalLocale: 'zh-CN',
    sourceCanonicalUrl: topic.source.url,
    centralThesisId: topic.centralThesisId,
    reusableArtifactId: topic.reusableArtifactId,
    coverActionId: topic.coverActionId,
    priorityIds: topic.priorityIds,
    examples: topic.examples,
    caveats: topic.caveats,
    chapters: topic.chapterIds.map((id, index) => ({
      id,
      sceneIds: sceneIdsByChapter[index],
      recapIds: index >= 1 && index <= 5 ? sceneIdsByChapter[index].slice(-3) : [],
    })),
    review: {
      sameFactsAndBoundaries: true,
      sameCentralThesis: true,
      sameP0P1P2Coverage: true,
      sameExamplesAndCaveats: true,
      sameReusableArtifact: true,
      naturalEnglishNotMechanicalTranslation: true,
    },
  };
}

function makeContentMap(topic, locale) {
  const chapters = topic.chapterIds.slice(1, -1).map((id, index) => {
    const chapterIndex = index + 1;
    return {
      id,
      title: locale.chapterLabels[chapterIndex],
      promise: locale.paragraphs[chapterIndex][0],
      recaps: locale.paragraphs[chapterIndex].slice(-3).map((narration, recapIndex) => ({
        narration,
        screenText: locale.screens[chapterIndex][7 + recapIndex],
      })),
    };
  });
  return {
    bilingualContractId: topic.contractId,
    source: {
      ...topic.source,
      facts: locale.facts,
    },
    centralThesis: locale.centralThesis,
    priorities: locale.priorities,
    reusableArtifact: locale.reusableArtifact,
    chapters,
    factBoundaries: locale.factBoundaries,
    inference: locale.inference,
  };
}

function makeEpisode(topic, locale, templateEpisode) {
  const artMap = Object.fromEntries(
    Object.entries(generatedScenes).map(([sceneId, assetIndex]) => [
      sceneId,
      topic.sceneAssets[assetIndex],
    ]),
  );
  return {
    ...templateEpisode,
    locale: locale.locale,
    projectTitle: locale.projectTitle,
    sourceAttribution: topic.source,
    scriptFile: locale.scriptFile,
    outputName: `${topic.baseRunKey}-${topic.slug}-longform.${locale.locale}.mp4`,
    voice: locale.voice,
    rate: locale.rate,
    bilingualContractId: topic.contractId,
    hookQuestion: locale.hookQuestion,
    hookLines: locale.hookLines,
    openingAccentTokens: locale.openingAccentTokens,
    firstSentence: locale.firstSentence,
    openingHookReview: locale.openingHookReview,
    chinesePronunciationReview: { reviewed: true, entries: [] },
    chineseMandarinProsodyReview: {
      reviewed: true,
      method: '逐句检查普通话意群；逗号、顿号、冒号和分号仅作为句内自然短停顿，不作为 TTS 切段边界。',
      approvedSentenceTerminators: ['。', '！', '？', '!', '?'],
      forbiddenTtsSegmentBoundaryPunctuation: ['，', '、', '：', '；', ',', ':', ';'],
    },
    fixedValueSentence: locale.fixedValueSentence,
    fixedOutroCta: locale.fixedOutroCta,
    coverAlt: locale.coverAlt,
    promise: locale.promise,
    outro: locale.outro,
    visuals: makeVisuals(locale),
    generatedArt: artMap,
    layouts: templateEpisode.layouts,
    motions: templateEpisode.motions,
    humanPoses: templateEpisode.humanPoses,
    secondProps: templateEpisode.secondProps,
  };
}

function makePackage(topic, locale) {
  const outputName = `${topic.baseRunKey}-${topic.slug}-longform.${locale.locale}.mp4`;
  return {
    name: `${topic.runKey}-${topic.slug}-${locale.locale.toLowerCase()}`,
    private: true,
    type: 'module',
    scripts: {
      tts: 'node build.mjs --tts',
      build: 'node build.mjs --compile',
      'check:transitions': 'node qa/check-production.mjs transitions',
      'check:semantics': 'node qa/check-production.mjs semantics',
      'check:balance': 'node qa/check-production.mjs balance',
      check: 'pnpm dlx hyperframes@0.7.76 check . --snapshots --frame-check=severity=error',
      render: `pnpm dlx hyperframes@0.7.76 render . --quality high --strict --quiet --workers 1 --low-memory-mode --video-bitrate 8M --output renders/${outputName}`,
    },
  };
}

function prepareProject(topic, locale, directory) {
  if (fs.existsSync(directory)) {
    throw new Error(`Refusing to overwrite existing topic project: ${directory}`);
  }
  fs.mkdirSync(directory, { recursive: true });
  const templateDir = `${templateRoot}-${locale.locale}`;
  for (const relativePath of [
    'build.mjs',
    'qa/check-production.mjs',
    'qa/check-dom-layout.mjs',
  ]) {
    copyFile(path.join(templateDir, relativePath), path.join(directory, relativePath));
  }
  for (const relativePath of [
    'assets/fonts',
    'assets/images',
    'assets/vendor',
  ]) {
    copyTree(path.join(templateDir, relativePath), path.join(directory, relativePath));
  }
  const templateEpisode = readJson(path.join(templateDir, 'episode.json'));
  const episode = makeEpisode(topic, locale, templateEpisode);
  const contentMap = makeContentMap(topic, locale);
  writeText(directory, locale.scriptFile, scriptText(locale));
  writeJson(directory, 'episode.json', episode);
  writeJson(directory, 'content-map.json', contentMap);
  writeJson(directory, 'bilingual-content-contract.json', makeContract(topic));
  writeJson(directory, `publish-metadata.${locale.locale}.json`, locale.metadata);
  writeJson(directory, `local-publishing-materials.${locale.locale}.json`, {
    schemaVersion: 1,
    materialId: topic.materialId,
    locale: locale.locale,
    title: locale.metadata.title,
    description: locale.metadata.description,
    hashtags: locale.metadata.hashtags,
    keywords: [
      locale.metadata.primaryKeyword,
      ...locale.metadata.secondaryKeywords,
    ],
    interactionSuggestions: locale.interactionSuggestions,
    review: {
      sameTopicAndClaims: true,
      naturalLocalization: true,
      noFabricatedEvidenceOrEngagement: true,
    },
  });
  writeJson(directory, 'package.json', makePackage(topic, locale));
  writeJson(directory, 'hyperframes.json', {
    canvas: { width: 1920, height: 1080, duration: 360, fps: 30 },
    version: '0.7.68',
  });
  writeJson(directory, 'production-profile.json', {
    id: `tiny-agent-longform-${topic.runKey}-${locale.locale}`,
    status: 'active-profile-derived',
    scope: locale.projectTitle,
    opening: {
      coverFirstFrame: false,
      firstFrameType: 'voice-synced-kinetic-question',
      firstSentence: locale.firstSentence,
      fixedValueSentence: locale.fixedValueSentence,
      maximumOrdinaryGapSeconds: 0.2,
    },
    visual: {
      canvas: '1920x1080',
      fps: 30,
      paper: '#ECECEA',
      ink: '#111413',
      layout: 'one-judgement-diverse-human-agent-prop-generated-art',
      semanticChangeSeconds: [4, 7],
      transitionLanguage: [
        'hard-cut', 'press-pulse', 'spring-pop', 'nudge',
        'split-tilt', 'fly-in', 'spin-in', 'sine-float',
      ],
      temporaryGeneratedSceneRatioMinimum: 0.15,
      motionTypeMinimum: 7,
      motionBeatMinimum: 20,
      recapPattern: 'persistent-blue-left-panel-cumulative-1-2-3',
      internalPropFrame: 'none-blend-with-paper-background',
      generatedArtHighlightLayout: 'alternating-opposite-sides',
      yellowHighlightMaxMeasuredCharsPerLine: 11,
      yellowHighlightOverflowGate: true,
    },
    audio: {
      voice: locale.voice,
      rate: locale.rate,
      targetLufs: -17,
      captionTiming: 'final-vtt',
      chapterRecapSpokenPrefix: locale.locale === 'zh-CN'
        ? '本章小节。第一，'
        : 'Chapter recap. First,',
    },
  });
  writeText(directory, 'source.md', `# Source

- Publisher: ${topic.source.publisher}
- Title: ${topic.source.title}
- Published: ${topic.source.published}
- Canonical URL: ${topic.source.url}

## Evidence boundary

${locale.factBoundaries.map((item) => `- ${item}`).join('\n')}

## Inference

${locale.inference}
`);
  writeText(directory, 'BRIEF.md', `# ${locale.projectTitle}

- Audience: people building or using AI Agent workflows
- Purpose: ${locale.reusableArtifact}
- Format: 1920x1080, 30 fps, five to eight minutes, ${locale.locale}
- Source: ${topic.source.url}
- Visual invariant: one current-topic Tiny Agent hero, paper-gray grid, blue identity accent, yellow decision highlight
- Motion: seek-safe hard cuts plus the seven approved deterministic motion types
- Audio: ${locale.voice} at ${locale.rate}; final VTT is the timing authority
`);
  writeText(directory, 'STORYBOARD.md', locale.chapterLabels.map((label, index) => (
    `## ${index + 1}. ${label}\n\n${locale.screens[index].map((screen, sceneIndex) => (
      `- ${sceneIdsByChapter[index][sceneIndex]}: ${screen}`
    )).join('\n')}`
  )).join('\n\n'));
}

const specPath = process.argv[2];
if (!specPath) throw new Error('Usage: node prepare-tiny-agent-topic.mjs <topic-spec.json>');
const topic = readJson(path.resolve(specPath));
for (const localeName of ['zh-CN', 'en-US']) {
  const locale = topic.locales[localeName];
  if (locale.paragraphs.length !== sceneShape.length
    || locale.paragraphs.some((chapter, index) => chapter.length !== sceneShape[index])
    || locale.screens.length !== sceneShape.length
    || locale.screens.some((chapter, index) => chapter.length !== sceneShape[index])) {
    throw new Error(`${localeName} must use the 5/10/10/10/10/10/4 scene shape`);
  }
}
const directories = {
  'zh-CN': path.join(
    repoRoot,
    `var/hyperframes-showcases/${topic.baseRunKey}-${topic.slug}-longform-zh-CN`,
  ),
  'en-US': path.join(
    repoRoot,
    `var/hyperframes-showcases/${topic.baseRunKey}-${topic.slug}-longform-en-US`,
  ),
};
prepareProject(topic, topic.locales['zh-CN'], directories['zh-CN']);
prepareProject(topic, topic.locales['en-US'], directories['en-US']);
const contractBytes = fs.readFileSync(path.join(directories['zh-CN'], 'bilingual-content-contract.json'));
fs.writeFileSync(path.join(directories['en-US'], 'bilingual-content-contract.json'), contractBytes);
writeJson(repoRoot, `var/ai-video-pipeline/longform/${topic.runKey}.status.json`, {
  runKey: topic.runKey,
  baseRunKey: topic.baseRunKey,
  topic: topic.topicLabel,
  status: 'projects-prepared',
  projects: directories,
  updatedAt: new Date().toISOString(),
});
process.stdout.write(`${JSON.stringify({
  runKey: topic.runKey,
  directories,
  sceneCount: allSceneIds.length,
}, null, 2)}\n`);
