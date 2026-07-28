#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '../..');
const ratioFiles = {
  '16x9': {
    spec: 'thumbnail-spec.en-US.16x9.json',
    svg: 'thumbnail.en-US.svg',
    png: 'thumbnail.en-US.png',
    width: 3840,
    height: 2160,
    previews: [
      { file: 'thumbnail.en-US.1280x720.png', width: 1280, height: 720 },
      { file: 'thumbnail.en-US.256x144.png', width: 256, height: 144 },
    ],
  },
  '4x3': {
    spec: 'thumbnail-spec.en-US.4x3.json',
    svg: 'thumbnail.en-US.4x3.svg',
    png: 'thumbnail.en-US.4x3.png',
    width: 1200,
    height: 900,
    previews: [
      { file: 'thumbnail.en-US.4x3.240x180.png', width: 240, height: 180 },
    ],
  },
  '3x4': {
    spec: 'thumbnail-spec.en-US.3x4.json',
    svg: 'thumbnail.en-US.3x4.svg',
    png: 'thumbnail.en-US.3x4.png',
    width: 900,
    height: 1200,
    previews: [
      { file: 'thumbnail.en-US.3x4.180x240.png', width: 180, height: 240 },
    ],
  },
};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    args[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function projectRunKey(projectDir) {
  return projectDir.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function inspectPng(filePath) {
  const [width, height, colorspace, channels] = execFileSync(
    'magick',
    ['identify', '-format', '%w %h %[colorspace] %[channels]', filePath],
    { encoding: 'utf8' },
  ).trim().split(/\s+/);
  return { width: Number(width), height: Number(height), colorspace, channels };
}

function hasTransparentTopLeftCorner(filePath) {
  const pixel = execFileSync(
    'magick',
    [filePath, '-format', '%[pixel:p{0,0}]', 'info:'],
    { encoding: 'utf8' },
  ).trim();
  return /,0(?:\.0+)?\)$/.test(pixel);
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sameMembersCaseInsensitive(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  const left = new Set(actual.map((value) => String(value).toLocaleLowerCase()));
  const right = new Set(expected.map((value) => String(value).toLocaleLowerCase()));
  return actual.length === left.size
    && expected.length === right.size
    && left.size === right.size
    && [...left].every((value) => right.has(value));
}

function includesCaseInsensitive(value, target) {
  return String(value || '').toLocaleLowerCase().includes(String(target || '').toLocaleLowerCase());
}

function countInformationUnitsBeyondIdentity(headline) {
  return (
    String(headline || '')
      .replace(/\bAI[\s-]+Agents?\b/gi, ' ')
      .match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) || []
  ).length;
}

function attributes(fragment) {
  return Object.fromEntries(
    [...String(fragment).matchAll(/([:\w-]+)="([^"]*)"/g)].map((match) => [match[1], match[2]]),
  );
}

function findElement(svg, tag, predicate) {
  return [...svg.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))]
    .map((match) => match[0])
    .find(predicate) ?? null;
}

function exactNumber(actual, expected, tolerance = 0.001) {
  return Number.isFinite(actual) && Math.abs(actual - expected) <= tolerance;
}

function exactBox(actual, expected) {
  return ['x', 'y', 'width', 'height'].every((key) => exactNumber(actual?.[key], expected?.[key]));
}

function measureTitleBlock(svg, canvasHeight) {
  const lines = [...svg.matchAll(/<text\b[^>]*data-cover-title-line="[^"]+"[^>]*>/g)]
    .map(([tag]) => {
      const values = attributes(tag);
      return { y: Number(values.y), fontSize: Number(values['font-size']) };
    })
    .filter(({ y, fontSize }) => Number.isFinite(y) && Number.isFinite(fontSize));
  if (!lines.length) return { lineCount: 0, heightPx: 0, heightPercent: 0, baselines: [] };
  const top = Math.min(...lines.map(({ y, fontSize }) => y - fontSize * 0.9));
  const bottom = Math.max(...lines.map(({ y, fontSize }) => y + fontSize * 0.2));
  const heightPx = Math.max(0, bottom - top);
  return {
    lineCount: lines.length,
    heightPx,
    heightPercent: (heightPx / canvasHeight) * 100,
    baselines: lines.map(({ y }) => y),
  };
}

function inspectStrictGeometry(svg, ratio, strictRule, generatedHeroAsset) {
  if (!['4x3', '3x4'].includes(ratio)) return { scoped: false, pass: true, checks: {} };
  const expected = strictRule[ratio];
  const shared = strictRule.shared;
  const root = attributes(svg.match(/<svg\b[^>]*>/)?.[0] ?? '');
  const patternTag = findElement(svg, 'pattern', (tag) => attributes(tag).id === 'grid');
  const gridPathTag = findElement(svg, 'path', (tag) => attributes(tag).stroke === '#111413');
  const blueTag = findElement(svg, 'rect', (tag) => attributes(tag).fill === '#117ABD');
  const yellowTag = findElement(svg, 'rect', (tag) => attributes(tag).fill === '#F4C542');
  const heroTag = findElement(svg, 'image', (tag) => (
    !generatedHeroAsset || attributes(tag).href === generatedHeroAsset
  ));
  const pattern = attributes(patternTag ?? '');
  const gridPath = attributes(gridPathTag ?? '');
  const blue = attributes(blueTag ?? '');
  const yellow = attributes(yellowTag ?? '');
  const hero = attributes(heroTag ?? '');
  const title = measureTitleBlock(svg, expected.canvas.height);
  const box = (value) => ({
    x: Number(value.x),
    y: Number(value.y),
    width: Number(value.width),
    height: Number(value.height),
  });
  const checks = {
    strictGeometryProfileIdPresent: true,
    canvasGeometry: Number(root.width) === expected.canvas.width
      && Number(root.height) === expected.canvas.height,
    paperGridGeometry: Number(pattern.width) === shared.paperGrid.cellWidthPx
      && Number(pattern.height) === shared.paperGrid.cellHeightPx
      && gridPath.stroke === shared.paperGrid.stroke
      && Number(gridPath['stroke-width']) === shared.paperGrid.strokeWidthPx
      && Number(gridPath['stroke-opacity']) === shared.paperGrid.opacity,
    roundedRuleGeometry: exactBox(box(blue), expected.blueRule)
      && Number(blue.rx) === expected.blueRule.rx
      && exactBox(box(yellow), expected.yellowRule)
      && Number(yellow.rx) === expected.yellowRule.rx,
    titleBaselineGeometry: title.lineCount === shared.titleLineCount
      && title.baselines.every((baseline, index) => baseline === expected.title.baselineY[index]),
    heroBoxGeometry: exactBox(box(hero), expected.heroBox),
  };
  return {
    scoped: true,
    pass: Object.values(checks).every(Boolean),
    checks,
    evidence: { pattern, gridPath, blue, yellow, hero, title },
  };
}

async function validate(projectDir) {
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
  const activeProfile = JSON.parse(await fs.readFile(
    path.join(
      repoRoot,
      'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json',
    ),
    'utf8',
  ));
  const coverSetRule = activeProfile.postSnapshotUserOverrides
    ?.englishChineseProductionParity
    ?.coverSet ?? {};
  const referenceRule = activeProfile.postSnapshotUserOverrides?.coverReferenceAlignment ?? {};
  const strictRule = referenceRule.zhRatioStrictGeometry ?? {};
  const enStrictRule = referenceRule.enRatioStrictGeometry ?? {};
  const densityRule = activeProfile.postSnapshotUserOverrides
    ?.coverTitleTopicAlignment
    ?.enRatioTitleInformationDensity ?? {};
  const generatedIdentityRule = activeProfile.postSnapshotUserOverrides
    ?.tinyAgentGeneratedIdentityConsistency ?? {};
  const runKey = projectRunKey(projectDir);
  const currentCoverSetApplied = runKey !== null
    && runKey.localeCompare(coverSetRule.effectiveFromRunKey ?? '9999-99-99-99') >= 0;
  const generatedIdentityApplied = runKey !== null
    && runKey.localeCompare(
      generatedIdentityRule.effectiveFromRunKey ?? '9999-99-99-99',
    ) >= 0;
  const selectedRatios = currentCoverSetApplied ? ['16x9', '4x3', '3x4'] : ['16x9'];
  const metadata = JSON.parse(await fs.readFile(
    path.join(projectDir, 'publish-metadata.en-US.json'),
    'utf8',
  ));
  const contract = metadata.coverTitleContract ?? {};
  const coreCoverKeywords = Array.isArray(contract.coreCoverKeywords)
    ? contract.coreCoverKeywords
    : [];
  const keywordGroups = Array.isArray(contract.metadataKeywordGroups)
    ? contract.metadataKeywordGroups
    : [];
  const validCoreKeywords = coreCoverKeywords.length > 0
    && coreCoverKeywords.every((keyword) => typeof keyword === 'string' && keyword.trim());
  const validKeywordGroups = validCoreKeywords
    && keywordGroups.length === coreCoverKeywords.length
    && keywordGroups.every((group) => (
      typeof group?.coverKeyword === 'string'
      && coreCoverKeywords.some((keyword) => (
        keyword.toLocaleLowerCase() === group.coverKeyword.toLocaleLowerCase()
      ))
      && Array.isArray(group.titleTerms)
      && group.titleTerms.length > 0
      && group.titleTerms.every((term) => typeof term === 'string' && term.trim())
    ));
  const metadataCheck = {
    scope: 'publish metadata coverTitleContract',
    validCoreKeywords,
    validKeywordGroups,
    publishingTitleEchoesCoreKeywords: validKeywordGroups && keywordGroups.every((group) => (
      group.titleTerms.some((term) => includesCaseInsensitive(metadata.title, term))
    )),
    validTopicAction: typeof contract.topicAction === 'string' && contract.topicAction.trim().length > 0,
  };
  metadataCheck.pass = Object.values(metadataCheck)
    .filter((value) => typeof value === 'boolean')
    .every(Boolean);
  const checks = [metadataCheck];
  const outputs = [];

  for (const ratio of selectedRatios) {
    const expected = ratioFiles[ratio];
    const [specRaw, svg, png, previewPngs] = await Promise.all([
      fs.readFile(path.join(thumbnailsDir, expected.spec), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.svg), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.png)),
      Promise.all(expected.previews.map((preview) => (
        fs.readFile(path.join(thumbnailsDir, preview.file))
      ))),
    ]);
    const spec = JSON.parse(specRaw);
    const image = inspectPng(path.join(thumbnailsDir, expected.png));
    const previews = expected.previews.map((preview, index) => ({
      ...preview,
      ...inspectPng(path.join(thumbnailsDir, preview.file)),
      sizeBytes: previewPngs[index].length,
      sha256: sha256(previewPngs[index]),
    }));
    const generatedHero = spec.generatedHeroIllustration ?? null;
    const usesGeneratedHero = Boolean(generatedHero?.asset);
    const generatedHeroPath = usesGeneratedHero
      ? path.join(thumbnailsDir, generatedHero.asset)
      : null;
    const heroInspection = usesGeneratedHero ? inspectPng(generatedHeroPath) : null;
    const heroReferences = usesGeneratedHero
      ? countMatches(svg, new RegExp(escapeRegExp(generatedHero.asset), 'g'))
      : 0;
    const titleBlock = measureTitleBlock(svg, ratio === '16x9' ? 720 : expected.height);
    const strictGeometry = inspectStrictGeometry(
      svg,
      ratio,
      strictRule,
      generatedHero?.asset ?? null,
    );
    const densityScoped = currentCoverSetApplied && ['4x3', '3x4'].includes(ratio);
    const minimumHeight = densityRule.minimumTitleBlockHeightPercent?.[ratio];
    const informationUnits = countInformationUnitsBeyondIdentity(spec.headline);
    const validIntent = ['question', 'action', 'benefit'].includes(spec.headlineIntent)
      && typeof spec.headlineIntentRationale === 'string'
      && spec.headlineIntentRationale.trim().length >= 12
      && (spec.headlineIntent !== 'question' || /[?]/.test(String(spec.headline || '')));
    const generatedIdentityDeclarationPass = !usesGeneratedHero
      ? true
      : !generatedIdentityApplied
        ? generatedHero.identityAnchors?.includes('white rounded body')
          && generatedHero.identityAnchors?.includes('black face screen')
          && generatedHero.identityAnchors?.includes('blue eyes and antenna')
          && generatedHero.identityAnchors?.includes('brown tool belt')
          && generatedHero.identityAnchors?.includes('hand-drawn outline')
        : generatedHero.identityProfileId === generatedIdentityRule.identityProfileId
          && generatedHero.referenceConditioningUsed === true
          && Array.isArray(generatedHero.referenceImages)
          && generatedHero.referenceImages.length > 0
          && generatedHero.referenceImages.every((referenceImage) => (
            generatedIdentityRule.fixedReference?.canonicalReferenceImages
              ?.includes(referenceImage)
          ))
          && generatedIdentityRule.evidence?.requiredSimilarityDecisions
            ?.includes(generatedHero.similarityDecision)
          && generatedIdentityRule.evidence?.allowedFinishClassifications
            ?.includes(generatedHero.finishClassification)
          && generatedHero.majorRedesignDetected === false;
    const ratioChecks = {
      metadataLanguage: metadata.language === 'en-US' || metadata.locale === 'en-US',
      deterministicPrimaryTitle: typeof spec.headline === 'string'
        && /\bAI[\s-]+Agents?\b/i.test(spec.headline),
      coverTitleKeywords: sameMembersCaseInsensitive(
        spec.requiredCoverKeywords,
        coreCoverKeywords,
      ) && coreCoverKeywords.every((keyword) => (
        includesCaseInsensitive(spec.headline, keyword)
      )),
      temporaryGeneratedHero: usesGeneratedHero
        && typeof generatedHero.source === 'string'
        && generatedHero.source.trim().length > 0
        && !/archive|2026-07-23/i.test(generatedHero.source)
        && heroReferences === 1
        && generatedHero.characterCount === 1
        && generatedHero.tinyAgentCharacterCount === 1
        && generatedHero.humanCharacterCount === 0
        && generatedHero.secondaryAgentCharacterCount === 0
        && /alpha removal/i.test(generatedHero.delivery)
        && heroInspection.channels.toLocaleLowerCase().includes('a')
        && hasTransparentTopLeftCorner(generatedHeroPath)
        && generatedIdentityDeclarationPass
        && generatedHero.integratedTopicAction === contract.topicAction
        && generatedHero.generatedIllustrationText === false,
      referenceTitleHero: ratio === '3x4'
        ? /top-60-percent-title; bottom-40-percent-contained/.test(spec.composition || '')
        : /text-left .*right/.test(spec.composition || ''),
      blueBlackTitleOnly: spec.titlePalette?.agentIdentity === '#117ABD'
        && spec.titlePalette?.remainingTitle === '#111413'
        && spec.titlePalette?.decorativeRule === '#F4C542'
        && /<tspan fill="#117ABD">AI Agent(?:s)?<\/tspan>/i.test(svg)
        && !/#8A6500|#C7362F/.test(svg),
      noAuxiliaryCopy: spec.auxiliaryCoverCopy === false,
      noGeneratedText: spec.generatedIllustrationText === false,
      outputDimensions: image.width === expected.width
        && image.height === expected.height
        && image.colorspace.toLocaleLowerCase() === 'srgb'
        && png.length > 0
        && png.length < 2 * 1024 * 1024,
      previewDimensions: previews.every((preview) => (
        preview.width === ratioFiles[ratio].previews.find(({ file }) => file === preview.file).width
        && preview.height === ratioFiles[ratio].previews.find(({ file }) => file === preview.file).height
        && preview.colorspace.toLocaleLowerCase() === 'srgb'
      )),
      titleInformationDensity: !densityScoped
        || informationUnits >= densityRule.minimumInformationUnitsBeyondIdentity,
      titleLineDensity: !densityScoped
        || (titleBlock.lineCount >= densityRule.titleLineCount.min
          && titleBlock.lineCount <= densityRule.titleLineCount.max),
      titleBlockHeightDensity: !densityScoped
        || (Number.isFinite(minimumHeight) && titleBlock.heightPercent >= minimumHeight),
      titleQuestionActionOrBenefit: !densityScoped || validIntent,
      coverSetProfile: !currentCoverSetApplied
        || spec.coverSetProfileId === coverSetRule.coverSetProfileId,
      strictGeometryProfile: !densityScoped
        || spec.strictGeometryProfileId === enStrictRule.geometryProfileId,
      ...strictGeometry.checks,
    };
    const pass = Object.values(ratioChecks).every(Boolean);
    checks.push({
      ratio,
      pass,
      ...ratioChecks,
      titleDensityEvidence: {
        scoped: densityScoped,
        informationUnitsBeyondIdentity: informationUnits,
        minimumInformationUnitsBeyondIdentity:
          densityRule.minimumInformationUnitsBeyondIdentity ?? null,
        lineCount: titleBlock.lineCount,
        requiredLineCount: densityRule.titleLineCount ?? null,
        titleBlockHeightPercent: titleBlock.heightPercent,
        minimumTitleBlockHeightPercent: minimumHeight ?? null,
      },
      strictGeometryEvidence: {
        scoped: strictGeometry.scoped,
        profileId: enStrictRule.geometryProfileId ?? null,
        geometry: strictGeometry.evidence ?? null,
      },
    });
    outputs.push({
      ratio,
      path: expected.png,
      ...image,
      sizeBytes: png.length,
      sha256: sha256(png),
      previews,
    });
  }

  const report = {
    version: 2,
    locale: 'en-US',
    runKey,
    coverSetProfileId: currentCoverSetApplied ? coverSetRule.coverSetProfileId : null,
    currentCoverSetApplied,
    pass: checks.every((check) => check.pass),
    coverTitleContract: {
      coreCoverKeywords,
      metadataKeywordGroups: keywordGroups,
      topicAction: contract.topicAction ?? null,
    },
    checks,
    outputs,
  };
  await fs.mkdir(path.join(thumbnailsDir, 'qa'), { recursive: true });
  await fs.writeFile(
    path.join(thumbnailsDir, 'qa', 'english-reference-alignment-qa.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

const args = parseArgs(process.argv.slice(2));
if (!args.project) {
  throw new Error('Usage: validate-tiny-agent-en-cover-reference.mjs --project <EN_PROJECT_DIR>');
}
const report = await validate(path.resolve(args.project));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) process.exitCode = 1;
