#!/usr/bin/env node
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const profilePath = path.join(
  repoRoot,
  'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json',
);
const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
const parity = profile.postSnapshotUserOverrides?.englishChineseProductionParity ?? {};
const coverSet = parity.coverSet ?? {};
const legacyCover = coverSet.legacy16x9ParityBeforeEffectiveRun ?? {};
const referenceAlignment = profile.postSnapshotUserOverrides?.coverReferenceAlignment ?? {};
const zhStrictGeometry = referenceAlignment.zhRatioStrictGeometry ?? {};
const enStrictGeometry = referenceAlignment.enRatioStrictGeometry ?? {};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    const key = argv[index].slice(2);
    if (key === 'self-test') {
      args[key] = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value).sort().map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function sameValue(left, right) {
  return JSON.stringify(stableValue(left)) === JSON.stringify(stableValue(right));
}

function readProject(projectDir, locale) {
  const readBuffer = (relativePath) => fs.readFileSync(path.join(projectDir, relativePath));
  const coverPrefix = locale === 'zh-CN' ? 'thumbnail.zh-CN' : 'thumbnail.en-US';
  const runKey = projectRunKey(projectDir);
  const currentCoverSet = runKey !== null
    && runKey.localeCompare(coverSet.effectiveFromRunKey ?? '9999-99-99-99') >= 0;
  const ratios = currentCoverSet ? (coverSet.sharedLocalizedRatios ?? []) : ['16x9'];
  const coverPaths = Object.fromEntries(ratios.map((ratio) => {
    const suffix = ratio === '16x9' ? '' : `.${ratio}`;
    return [ratio, {
      spec: `thumbnails/thumbnail-spec.${locale}.${ratio}.json`,
      svg: `thumbnails/${coverPrefix}${suffix}.svg`,
    }];
  }));
  const trackedPaths = [
    'bilingual-content-contract.json',
    'content-map.json',
    'scene-plan.json',
    'animation-plan.json',
    'episode.json',
    'summary.json',
    'qa/retention-opening-report.json',
    ...Object.values(coverPaths).flatMap(({ spec, svg }) => [spec, svg]),
  ];
  const buffers = Object.fromEntries(trackedPaths.map((relativePath) => [
    relativePath,
    readBuffer(relativePath),
  ]));
  return {
    projectDir,
    locale,
    contractBuffer: buffers['bilingual-content-contract.json'],
    contract: JSON.parse(buffers['bilingual-content-contract.json'].toString('utf8')),
    contentMap: JSON.parse(buffers['content-map.json'].toString('utf8')),
    scenePlan: JSON.parse(buffers['scene-plan.json'].toString('utf8')),
    animationPlan: JSON.parse(buffers['animation-plan.json'].toString('utf8')),
    episode: JSON.parse(buffers['episode.json'].toString('utf8')),
    summary: JSON.parse(buffers['summary.json'].toString('utf8')),
    openingReport: JSON.parse(buffers['qa/retention-opening-report.json'].toString('utf8')),
    currentCoverSet,
    covers: Object.fromEntries(Object.entries(coverPaths).map(([ratio, files]) => [
      ratio,
      {
        spec: JSON.parse(buffers[files.spec].toString('utf8')),
        svg: buffers[files.svg].toString('utf8'),
      },
    ])),
    artifactHashes: Object.fromEntries(
      Object.entries(buffers).map(([relativePath, buffer]) => [relativePath, sha256(buffer)]),
    ),
  };
}

function sceneList(scenePlan) {
  return (scenePlan.chapters ?? []).flatMap((chapter) => chapter.scenes ?? []);
}

function numberAttribute(fragment, name) {
  const match = fragment.match(new RegExp(`\\b${name}="([^"]+)"`));
  return match ? Number(match[1]) : Number.NaN;
}

function stringAttribute(fragment, name) {
  return fragment.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1] ?? null;
}

function findElement(svg, tag, predicate) {
  const elements = [...svg.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map((match) => match[0]);
  return elements.find(predicate) ?? null;
}

function coverGeometryContract(ratio, currentCoverSet) {
  if (!currentCoverSet) {
    return {
      ...legacyCover,
      titleBaselines: null,
    };
  }
  const ratioRule = zhStrictGeometry[ratio] ?? {};
  return {
    baseCanvas: ratioRule.canvas,
    paperGrid: zhStrictGeometry.shared?.paperGrid,
    blueRule: ratioRule.blueRule,
    yellowRule: ratioRule.yellowRule,
    heroBox: ratioRule.heroBox,
    titleBaselines: ratioRule.title?.baselineY,
  };
}

function inspectCover(svg, geometry) {
  const root = svg.match(/<svg\b[^>]*>/)?.[0] ?? '';
  const width = numberAttribute(root, 'width');
  const height = numberAttribute(root, 'height');
  const scaleX = width / geometry.baseCanvas.width;
  const scaleY = height / geometry.baseCanvas.height;
  const normalizeBox = (fragment) => ({
    x: numberAttribute(fragment, 'x') / scaleX,
    y: numberAttribute(fragment, 'y') / scaleY,
    width: numberAttribute(fragment, 'width') / scaleX,
    height: numberAttribute(fragment, 'height') / scaleY,
  });
  const pattern = findElement(svg, 'pattern', (fragment) => stringAttribute(fragment, 'id') === 'grid');
  const gridPath = findElement(svg, 'path', (fragment) => stringAttribute(fragment, 'stroke') === '#111413');
  const blueRule = findElement(svg, 'rect', (fragment) => stringAttribute(fragment, 'fill') === '#117ABD');
  const yellowRule = findElement(svg, 'rect', (fragment) => stringAttribute(fragment, 'fill') === '#F4C542');
  const hero = findElement(svg, 'image', () => true);
  const scopedTitleElements = [...svg.matchAll(/<text\b[^>]*data-cover-title-line="[^"]+"[^>]*>/g)]
    .map((match) => match[0]);
  const titleElements = scopedTitleElements.length > 0
    ? scopedTitleElements
    : [...svg.matchAll(/<text\b[^>]*>/g)].map((match) => match[0]);
  const titleBaselines = titleElements
    .map((fragment) => ({
      x: numberAttribute(fragment, 'x') / scaleX,
      y: numberAttribute(fragment, 'y') / scaleY,
    }))
    .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y));
  return {
    canvas: { width, height },
    paperGrid: {
      cellWidthPx: numberAttribute(pattern ?? '', 'width') / scaleX,
      cellHeightPx: numberAttribute(pattern ?? '', 'height') / scaleY,
      stroke: stringAttribute(gridPath ?? '', 'stroke'),
      strokeWidthPx: numberAttribute(gridPath ?? '', 'stroke-width'),
      opacity: numberAttribute(gridPath ?? '', 'stroke-opacity'),
    },
    blueRule: normalizeBox(blueRule ?? ''),
    yellowRule: normalizeBox(yellowRule ?? ''),
    heroBox: normalizeBox(hero ?? ''),
    titleBaselines,
  };
}

function exactNumber(actual, expected, tolerance = 0.001) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function exactBox(actual, expected) {
  return ['x', 'y', 'width', 'height'].every((key) => exactNumber(actual?.[key], expected?.[key]));
}

function coverMatchesProfile(cover, expected) {
  const titleMatches = Array.isArray(expected.titleBaselines)
    ? sameValue(
      cover.titleBaselines.map(({ y }) => y),
      expected.titleBaselines,
    )
      && cover.titleBaselines.every(({ x }) => exactNumber(x, expected.blueRule.x))
    : cover.titleBaselines.length >= expected.titleZone.lineCount.min
      && cover.titleBaselines.length <= expected.titleZone.lineCount.max
      && cover.titleBaselines.every((line) => (
        exactNumber(line.x, expected.titleZone.x)
        && line.y >= expected.titleZone.y
        && line.y <= expected.titleZone.y + expected.titleZone.height
      ));
  return exactNumber(cover.paperGrid.cellWidthPx, expected.paperGrid.cellWidthPx)
    && exactNumber(cover.paperGrid.cellHeightPx, expected.paperGrid.cellHeightPx)
    && cover.paperGrid.stroke === expected.paperGrid.stroke
    && exactNumber(cover.paperGrid.strokeWidthPx, expected.paperGrid.strokeWidthPx)
    && exactNumber(cover.paperGrid.opacity, expected.paperGrid.opacity)
    && exactBox(cover.blueRule, expected.blueRule)
    && exactBox(cover.yellowRule, expected.yellowRule)
    && exactBox(cover.heroBox, expected.heroBox)
    && titleMatches;
}

function normalizedDurationShares(scenes) {
  const finalEnd = scenes.at(-1)?.end;
  if (!Number.isFinite(finalEnd) || finalEnd <= 0) return [];
  return scenes.map((scene) => ({
    id: scene.id,
    share: (scene.end - scene.start) / finalEnd,
  }));
}

function normalizedChapterShares(scenePlan) {
  const scenes = sceneList(scenePlan);
  const finalEnd = scenes.at(-1)?.end;
  if (!Number.isFinite(finalEnd) || finalEnd <= 0) return [];
  return (scenePlan.chapters ?? []).map((chapter) => {
    const chapterScenes = chapter.scenes ?? [];
    return {
      id: chapter.id,
      share: ((chapterScenes.at(-1)?.end ?? 0) - (chapterScenes[0]?.start ?? 0)) / finalEnd,
    };
  });
}

function maxShareDifference(left, right) {
  if (left.length !== right.length) return Number.POSITIVE_INFINITY;
  let maximum = 0;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index].id !== right[index].id) return Number.POSITIVE_INFINITY;
    maximum = Math.max(maximum, Math.abs(left[index].share - right[index].share));
  }
  return maximum;
}

function projectRunKey(projectDir) {
  return projectDir.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function buildReport(english, chinese) {
  const failures = [];
  const check = (name, pass, detail = null) => {
    if (!pass) failures.push({ name, detail });
    return pass;
  };
  const contractRule = parity.content ?? {};
  const englishScenes = sceneList(english.scenePlan);
  const chineseScenes = sceneList(chinese.scenePlan);
  const englishAnimationScenes = english.animationPlan.scenes ?? [];
  const chineseAnimationScenes = chinese.animationPlan.scenes ?? [];
  const runKey = projectRunKey(chinese.projectDir);
  const currentCoverSet = runKey !== null
    && runKey.localeCompare(coverSet.effectiveFromRunKey ?? '9999-99-99-99') >= 0;
  const sharedCoverRatios = currentCoverSet ? (coverSet.sharedLocalizedRatios ?? []) : ['16x9'];
  const coverEvidence = Object.fromEntries(sharedCoverRatios.map((ratio) => {
    const geometry = coverGeometryContract(ratio, currentCoverSet);
    return [ratio, {
      geometry,
      english: inspectCover(english.covers[ratio].svg, geometry),
      chinese: inspectCover(chinese.covers[ratio].svg, geometry),
    }];
  }));
  const contract = chinese.contract;
  const requiredContractFields = contractRule.requiredFields ?? [];
  const requiredReviewFlags = contractRule.requiredReviewFlags ?? [];
  const contractSceneIds = (contract.chapters ?? []).flatMap((chapter) => chapter.sceneIds ?? []);
  const englishSceneShares = normalizedDurationShares(englishScenes);
  const chineseSceneShares = normalizedDurationShares(chineseScenes);
  const englishChapterShares = normalizedChapterShares(english.scenePlan);
  const chineseChapterShares = normalizedChapterShares(chinese.scenePlan);
  const totalDurationRatio = (englishScenes.at(-1)?.end ?? 0) / (chineseScenes.at(-1)?.end ?? 1);
  const normalizedSceneShareDifference = maxShareDifference(englishSceneShares, chineseSceneShares);
  const normalizedChapterShareDifference = maxShareDifference(englishChapterShares, chineseChapterShares);
  const equalSceneFields = parity.sceneStructure?.equalFields ?? [];
  const animationEqualFields = parity.sceneStructure?.animationEqualFields ?? [];
  const sceneFieldFailures = [];
  if (englishScenes.length === chineseScenes.length) {
    for (let index = 0; index < englishScenes.length; index += 1) {
      for (const field of equalSceneFields) {
        if (!sameValue(englishScenes[index]?.[field], chineseScenes[index]?.[field])) {
          sceneFieldFailures.push({
            sceneId: chineseScenes[index]?.id ?? englishScenes[index]?.id ?? index,
            field,
          });
        }
      }
    }
  }
  const animationFieldFailures = [];
  if (englishAnimationScenes.length === chineseAnimationScenes.length) {
    for (let index = 0; index < englishAnimationScenes.length; index += 1) {
      for (const field of animationEqualFields) {
        if (!sameValue(englishAnimationScenes[index]?.[field], chineseAnimationScenes[index]?.[field])) {
          animationFieldFailures.push({
            sceneId: chineseAnimationScenes[index]?.id ?? englishAnimationScenes[index]?.id ?? index,
            field,
          });
        }
      }
    }
  }
  const englishTypography = english.openingReport.domMeasurement?.typography ?? {};
  const chineseTypography = chinese.openingReport.domMeasurement?.typography ?? {};
  const englishLineSizes = englishTypography.lineFontSizesPx ?? [];
  const chineseLineSizes = chineseTypography.lineFontSizesPx ?? [];
  const expectedEnglishAudio = profile.fixedBilingualGeneration?.['en-US'] ?? {};
  const expectedChineseAudio = profile.fixedBilingualGeneration?.['zh-CN'] ?? {};
  const expectedGeometryProfileId = currentCoverSet
    ? coverSet.coverSetProfileId
    : legacyCover.geometryProfileId;
  const coverSpecs = sharedCoverRatios.map((ratio) => ({
    ratio,
    english: english.covers[ratio].spec,
    chinese: chinese.covers[ratio].spec,
  }));

  const checks = {
    activeContract: check(
      'activeContract',
      parity.status === 'active'
        && parity.canonicalLocale === 'zh-CN'
        && parity.targetLocale === 'en-US',
    ),
    runKey: check(
      'runKey',
      projectRunKey(english.projectDir) !== null
        && projectRunKey(english.projectDir) === projectRunKey(chinese.projectDir),
      { english: projectRunKey(english.projectDir), chinese: projectRunKey(chinese.projectDir) },
    ),
    localesAndVoices: check(
      'localesAndVoices',
      english.episode.locale === 'en-US'
        && chinese.episode.locale === 'zh-CN'
        && english.episode.voice === expectedEnglishAudio.voice
        && english.episode.rate === expectedEnglishAudio.rate
        && chinese.episode.voice === expectedChineseAudio.voice
        && chinese.episode.rate === expectedChineseAudio.rate,
    ),
    identicalContentContract: check(
      'identicalContentContract',
      english.contractBuffer.equals(chinese.contractBuffer),
    ),
    contentContractShape: check(
      'contentContractShape',
      requiredContractFields.every((field) => contract[field] !== undefined)
        && contract.canonicalLocale === 'zh-CN'
        && requiredReviewFlags.every((flag) => contract.review?.[flag] === true)
        && Array.isArray(contract.chapters)
        && contract.chapters.length > 0
        && ['P0', 'P1', 'P2', 'P3'].every((priority) => (
          Array.isArray(contract.priorityIds?.[priority])
          && contract.priorityIds[priority].length > 0
        ))
        && contract.chapters.every((chapter) => (
          typeof chapter?.id === 'string'
          && chapter.id.length > 0
          && Array.isArray(chapter.sceneIds)
          && chapter.sceneIds.length > 0
          && Array.isArray(chapter.recapIds)
        )),
    ),
    contentContractBindings: check(
      'contentContractBindings',
      english.contentMap.bilingualContractId === contract.contractId
        && chinese.contentMap.bilingualContractId === contract.contractId
        && english.scenePlan.bilingualContractId === contract.contractId
        && chinese.scenePlan.bilingualContractId === contract.contractId
        && contract.sourceCanonicalUrl === english.contentMap.source?.url
        && contract.sourceCanonicalUrl === chinese.contentMap.source?.url
        && sameValue(contractSceneIds, chineseScenes.map((scene) => scene.id))
        && sameValue(contractSceneIds, englishScenes.map((scene) => scene.id)),
    ),
    priorityAndChapterShape: check(
      'priorityAndChapterShape',
      ['P0', 'P1', 'P2', 'P3'].every((priority) => (
        (english.contentMap.priorities?.[priority]?.length ?? -1)
          === (chinese.contentMap.priorities?.[priority]?.length ?? -2)
      ))
        && (english.contentMap.chapters?.length ?? -1) === (chinese.contentMap.chapters?.length ?? -2)
        && (english.contentMap.chapters ?? []).every((chapter, index) => (
          (chapter.recaps?.length ?? -1) === (chinese.contentMap.chapters?.[index]?.recaps?.length ?? -2)
        )),
    ),
    sceneCountAndOrder: check(
      'sceneCountAndOrder',
      englishScenes.length === chineseScenes.length
        && sameValue(englishScenes.map((scene) => scene.id), chineseScenes.map((scene) => scene.id)),
    ),
    sceneStructure: check(
      'sceneStructure',
      sceneFieldFailures.length === 0,
      sceneFieldFailures,
    ),
    animationStructure: check(
      'animationStructure',
      englishAnimationScenes.length === chineseAnimationScenes.length
        && animationFieldFailures.length === 0
        && sameValue(english.animationPlan.motionSummary, chinese.animationPlan.motionSummary)
        && sameValue(english.animationPlan.strategy, chinese.animationPlan.strategy)
        && sameValue(english.animationPlan.semanticChangeSeconds, chinese.animationPlan.semanticChangeSeconds),
      animationFieldFailures,
    ),
    totalDurationRatio: check(
      'totalDurationRatio',
      totalDurationRatio >= parity.pacing.totalDurationRatio.min
        && totalDurationRatio <= parity.pacing.totalDurationRatio.max,
      totalDurationRatio,
    ),
    normalizedChapterPacing: check(
      'normalizedChapterPacing',
      normalizedChapterShareDifference <= parity.pacing.maximumNormalizedChapterShareDifference,
      normalizedChapterShareDifference,
    ),
    normalizedScenePacing: check(
      'normalizedScenePacing',
      normalizedSceneShareDifference <= parity.pacing.maximumNormalizedSceneShareDifference,
      normalizedSceneShareDifference,
    ),
    openingTypography: check(
      'openingTypography',
      englishTypography.fontFamily === chineseTypography.fontFamily
        && englishTypography.fontFamily === 'Hiragino Sans GB'
        && englishTypography.fontWeight === chineseTypography.fontWeight
        && englishTypography.fontWeight === '700'
        && englishLineSizes.length > 0
        && chineseLineSizes.length > 0
        && new Set(englishLineSizes).size === 1
        && new Set(chineseLineSizes).size === 1
        && englishTypography.uniformFontSizePass === true
        && chineseTypography.uniformFontSizePass === true
        && englishTypography.accentTokenPass === true
        && chineseTypography.accentTokenPass === true,
    ),
    coverGeometryProfile: check(
      'coverGeometryProfile',
      coverSpecs.every(({ english: englishSpec, chinese: chineseSpec }) => (
        currentCoverSet
          ? englishSpec.coverSetProfileId === coverSet.coverSetProfileId
            && chineseSpec.coverSetProfileId === coverSet.coverSetProfileId
            && englishSpec.strictGeometryProfileId === enStrictGeometry.geometryProfileId
            && chineseSpec.strictGeometryProfileId === zhStrictGeometry.geometryProfileId
          : englishSpec.bilingualGeometryProfileId === legacyCover.geometryProfileId
            && chineseSpec.bilingualGeometryProfileId === legacyCover.geometryProfileId
      )),
    ),
    coverGeometry: check(
      'coverGeometry',
      Object.values(coverEvidence).every(({ geometry, english: englishCover, chinese: chineseCover }) => (
        coverMatchesProfile(englishCover, geometry)
        && coverMatchesProfile(chineseCover, geometry)
        && sameValue(englishCover.paperGrid, chineseCover.paperGrid)
        && sameValue(englishCover.blueRule, chineseCover.blueRule)
        && sameValue(englishCover.yellowRule, chineseCover.yellowRule)
        && sameValue(englishCover.heroBox, chineseCover.heroBox)
        && sameValue(englishCover.titleBaselines, chineseCover.titleBaselines)
      )),
      coverEvidence,
    ),
    coverSemanticAction: check(
      'coverSemanticAction',
      coverSpecs.every(({ english: englishSpec, chinese: chineseSpec }) => {
        const englishActionId = englishSpec.generatedHeroIllustration?.bilingualActionId;
        const chineseActionId = chineseSpec.generatedHeroIllustration?.bilingualActionId;
        return typeof englishActionId === 'string'
          && englishActionId.length > 0
          && englishActionId === chineseActionId
          && englishActionId === contract.coverActionId;
      }),
      Object.fromEntries(coverSpecs.map(({ ratio, english: englishSpec, chinese: chineseSpec }) => [
        ratio,
        {
          english: englishSpec.generatedHeroIllustration?.bilingualActionId,
          chinese: chineseSpec.generatedHeroIllustration?.bilingualActionId,
        },
      ])),
    ),
    coverTitleSystem: check(
      'coverTitleSystem',
      coverSpecs.every(({ english: englishSpec, chinese: chineseSpec }) => (
        englishSpec.titlePalette?.agentIdentity === '#117ABD'
        && chineseSpec.titlePalette?.agentIdentity === '#117ABD'
        && englishSpec.titlePalette?.remainingTitle === '#111413'
        && chineseSpec.titlePalette?.remainingTitle === '#111413'
        && englishSpec.titlePalette?.decorativeRule === '#F4C542'
        && chineseSpec.titlePalette?.decorativeRule === '#F4C542'
        && englishSpec.auxiliaryCoverCopy === false
        && chineseSpec.auxiliaryCoverCopy === false
      )),
    ),
  };

  return {
    version: 2,
    contractProfileId: profile.profileId,
    parityContract: {
      effectiveFromRunKey: parity.effectiveFromRunKey,
      canonicalLocale: parity.canonicalLocale,
      targetLocale: parity.targetLocale,
      geometryProfileId: expectedGeometryProfileId,
      coverSetProfileId: currentCoverSet ? coverSet.coverSetProfileId : null,
      coverSetEffectiveFromRunKey: coverSet.effectiveFromRunKey,
      sharedCoverRatios,
    },
    pair: {
      runKey: projectRunKey(chinese.projectDir),
      englishProject: english.projectDir,
      chineseProject: chinese.projectDir,
    },
    pass: failures.length === 0,
    checks,
    measurements: {
      totalDurationRatio,
      normalizedChapterShareDifference,
      normalizedSceneShareDifference,
      englishSceneCount: englishScenes.length,
      chineseSceneCount: chineseScenes.length,
      englishChapterCount: english.scenePlan.chapters?.length ?? 0,
      chineseChapterCount: chinese.scenePlan.chapters?.length ?? 0,
    },
    artifactHashes: {
      'en-US': english.artifactHashes,
      'zh-CN': chinese.artifactHashes,
    },
    failures,
  };
}

function writeReport(projectDir, reportText) {
  const qaDir = path.join(projectDir, 'qa');
  fs.mkdirSync(qaDir, { recursive: true });
  fs.writeFileSync(path.join(qaDir, 'bilingual-parity-report.json'), reportText);
}

function selfTestFixture() {
  const contract = {
    schemaVersion: 1,
    contractId: 'fixture-03-topic',
    canonicalLocale: 'zh-CN',
    sourceCanonicalUrl: 'https://example.com/source',
    centralThesisId: 'thesis',
    reusableArtifactId: 'artifact',
    coverActionId: 'topic-action',
    priorityIds: { P0: ['p0'], P1: ['p1'], P2: ['p2'], P3: ['p3'] },
    chapters: [{ id: 'chapter-1', sceneIds: ['c01-p01', 'c01-p02'], recapIds: [] }],
    review: Object.fromEntries((parity.content.requiredReviewFlags ?? []).map((flag) => [flag, true])),
  };
  const contractBuffer = Buffer.from(`${JSON.stringify(contract)}\n`);
  const makeSvg = (ratio) => {
    const geometry = zhStrictGeometry[ratio];
    const shared = zhStrictGeometry.shared;
    const titleLines = geometry.title.baselineY
      .map((y, index) => `<text data-cover-title-line="${index + 1}" x="${geometry.title.x}" y="${y}">Line ${index + 1}</text>`)
      .join('');
    return `<svg width="${geometry.canvas.width}" height="${geometry.canvas.height}"><defs><pattern id="grid" width="${shared.paperGrid.cellWidthPx}" height="${shared.paperGrid.cellHeightPx}"><path stroke="${shared.paperGrid.stroke}" stroke-opacity="${shared.paperGrid.opacity}" stroke-width="${shared.paperGrid.strokeWidthPx}"/></pattern></defs><rect x="${geometry.blueRule.x}" y="${geometry.blueRule.y}" width="${geometry.blueRule.width}" height="${geometry.blueRule.height}" rx="${geometry.blueRule.rx}" fill="#117ABD"/>${titleLines}<image href="hero.png" x="${geometry.heroBox.x}" y="${geometry.heroBox.y}" width="${geometry.heroBox.width}" height="${geometry.heroBox.height}"/><rect x="${geometry.yellowRule.x}" y="${geometry.yellowRule.y}" width="${geometry.yellowRule.width}" height="${geometry.yellowRule.height}" rx="${geometry.yellowRule.rx}" fill="#F4C542"/></svg>`;
  };
  const scenes = [
    { id: 'c01-p01', chapterNumber: 1, paragraphNumber: 1, type: 'hook', layout: 'agent-prop', temporaryGenerated: false, generatedArtSide: null, highlightSide: null, motionType: null, human: 'idle', humanDirection: 'front', agent: 'plan-front', agentDirection: 'front', props: [{ id: 'workflow' }], renderHuman: false, renderAgent: true, coreObjectCount: 1, start: 0, end: 4 },
    { id: 'c01-p02', chapterNumber: 1, paragraphNumber: 2, type: 'outro', layout: 'outro', temporaryGenerated: false, generatedArtSide: null, highlightSide: null, motionType: null, human: 'idle', humanDirection: 'front', agent: 'success', agentDirection: 'front', props: [], renderHuman: false, renderAgent: true, coreObjectCount: 1, start: 4, end: 320 },
  ];
  const make = (locale) => ({
    projectDir: `/tmp/${coverSet.effectiveFromRunKey}-fixture-${locale}`,
    locale,
    contract,
    contractBuffer,
    contentMap: {
      bilingualContractId: contract.contractId,
      source: { url: contract.sourceCanonicalUrl },
      priorities: { P0: ['a'], P1: ['b'], P2: ['c'], P3: ['d'] },
      chapters: [{ recaps: [] }],
    },
    scenePlan: {
      bilingualContractId: contract.contractId,
      chapters: [{ id: 'chapter-1', scenes: structuredClone(scenes) }],
    },
    animationPlan: {
      scenes: scenes.map((scene) => ({ id: scene.id, layout: scene.layout, generatedArt: null, entrance: 'hard-cut', motionType: scene.motionType })),
      motionSummary: { types: ['hard-cut'], count: 1 },
      strategy: ['hard-cut'],
      semanticChangeSeconds: [4, 7],
    },
    episode: {
      locale,
      voice: profile.fixedBilingualGeneration[locale].voice,
      rate: profile.fixedBilingualGeneration[locale].rate,
    },
    summary: { locale, duration: 320 },
    openingReport: {
      domMeasurement: {
        typography: {
          fontFamily: 'Hiragino Sans GB',
          fontWeight: '700',
          lineFontSizesPx: [200, 200],
          uniformFontSizePass: true,
          accentTokenPass: true,
        },
      },
    },
    currentCoverSet: true,
    covers: Object.fromEntries((coverSet.sharedLocalizedRatios ?? []).map((ratio) => [
      ratio,
      {
        spec: {
          coverSetProfileId: coverSet.coverSetProfileId,
          strictGeometryProfileId: locale === 'en-US'
            ? enStrictGeometry.geometryProfileId
            : zhStrictGeometry.geometryProfileId,
          titlePalette: { agentIdentity: '#117ABD', remainingTitle: '#111413', decorativeRule: '#F4C542' },
          auxiliaryCoverCopy: false,
          generatedHeroIllustration: { bilingualActionId: 'topic-action' },
        },
        svg: makeSvg(ratio),
      },
    ])),
    artifactHashes: { fixture: sha256(locale) },
  });
  return { english: make('en-US'), chinese: make('zh-CN') };
}

function runSelfTest() {
  const fixture = selfTestFixture();
  const positive = buildReport(fixture.english, fixture.chinese);
  if (!positive.pass) throw new Error(`positive parity fixture failed: ${JSON.stringify(positive.failures)}`);

  const layoutMismatch = structuredClone(fixture);
  layoutMismatch.english.contractBuffer = fixture.english.contractBuffer;
  layoutMismatch.chinese.contractBuffer = fixture.chinese.contractBuffer;
  layoutMismatch.english.scenePlan.chapters[0].scenes[0].layout = 'different-layout';
  if (buildReport(layoutMismatch.english, layoutMismatch.chinese).pass) {
    throw new Error('layout mismatch fixture unexpectedly passed');
  }

  const timingMismatch = structuredClone(fixture);
  timingMismatch.english.contractBuffer = fixture.english.contractBuffer;
  timingMismatch.chinese.contractBuffer = fixture.chinese.contractBuffer;
  timingMismatch.english.scenePlan.chapters[0].scenes[0].end = 120;
  timingMismatch.english.scenePlan.chapters[0].scenes[1].start = 120;
  if (buildReport(timingMismatch.english, timingMismatch.chinese).pass) {
    throw new Error('timing mismatch fixture unexpectedly passed');
  }

  const coverMismatch = structuredClone(fixture);
  coverMismatch.english.contractBuffer = fixture.english.contractBuffer;
  coverMismatch.chinese.contractBuffer = fixture.chinese.contractBuffer;
  coverMismatch.english.covers['4x3'].svg = coverMismatch.english.covers['4x3'].svg
    .replace('x="640"', 'x="600"');
  if (buildReport(coverMismatch.english, coverMismatch.chinese).pass) {
    throw new Error('cover mismatch fixture unexpectedly passed');
  }

  const contractMismatch = structuredClone(fixture);
  contractMismatch.english.contractBuffer = Buffer.from('different contract');
  contractMismatch.chinese.contractBuffer = fixture.chinese.contractBuffer;
  if (buildReport(contractMismatch.english, contractMismatch.chinese).pass) {
    throw new Error('contract mismatch fixture unexpectedly passed');
  }
  process.stdout.write('Tiny Agent bilingual parity self-test passed: positive fixture and four fail-closed mutations.\n');
}

const args = parseArgs(process.argv.slice(2));
if (args['self-test']) {
  runSelfTest();
} else {
  if (!args['english-project'] || !args['chinese-project']) {
    console.error('Usage: node scripts/ai-video-pipeline/validate-tiny-agent-bilingual-parity.mjs --english-project <EN_PROJECT_DIR> --chinese-project <ZH_PROJECT_DIR>');
    process.exit(2);
  }
  const englishProject = path.resolve(repoRoot, args['english-project']);
  const chineseProject = path.resolve(repoRoot, args['chinese-project']);
  let report;
  try {
    report = buildReport(
      readProject(englishProject, 'en-US'),
      readProject(chineseProject, 'zh-CN'),
    );
  } catch (error) {
    console.error(`Tiny Agent bilingual parity validation could not load the project pair: ${error.message}`);
    process.exit(1);
  }
  const reportText = `${JSON.stringify(report, null, 2)}\n`;
  writeReport(englishProject, reportText);
  writeReport(chineseProject, reportText);
  process.stdout.write(reportText);
  if (!report.pass) process.exitCode = 1;
}
