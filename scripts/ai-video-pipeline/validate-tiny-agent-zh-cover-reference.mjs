#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ratios = {
  '16x9': {
    svg: 'thumbnail.zh-CN.svg',
    png: 'thumbnail.zh-CN.png',
    preview: 'thumbnail.zh-CN.256x144.png',
    width: 1280,
    height: 720,
    previewWidth: 256,
    previewHeight: 144,
    portrait: false,
  },
  '4x3': {
    svg: 'thumbnail.zh-CN.4x3.svg',
    png: 'thumbnail.zh-CN.4x3.png',
    preview: 'thumbnail.zh-CN.4x3.240x180.png',
    width: 1200,
    height: 900,
    previewWidth: 240,
    previewHeight: 180,
    portrait: false,
  },
  '3x4': {
    svg: 'thumbnail.zh-CN.3x4.svg',
    png: 'thumbnail.zh-CN.3x4.png',
    preview: 'thumbnail.zh-CN.3x4.180x240.png',
    width: 900,
    height: 1200,
    previewWidth: 180,
    previewHeight: 240,
    portrait: true,
  },
};
const repoRoot = path.resolve(import.meta.dirname, '../..');

function projectRunKey(projectDir) {
  return projectDir.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (!argv[index].startsWith('--')) continue;
    args[argv[index].slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
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

function imagePixelHash(filePath, trim = false) {
  const args = [filePath];
  if (trim) args.push('-trim');
  args.push('-colorspace', 'sRGB', '-alpha', 'on', '-depth', '8', 'rgba:-');
  return sha256(execFileSync('magick', args));
}

function hasTransparentTopLeftCorner(filePath) {
  const pixel = execFileSync(
    'magick',
    [filePath, '-format', '%[pixel:p{0,0}]', 'info:'],
    { encoding: 'utf8' },
  ).trim();
  return /,0(?:\.0+)?\)$/.test(pixel);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sameMembers(actual, expected) {
  if (!Array.isArray(actual) || !Array.isArray(expected)) return false;
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  return actual.length === actualSet.size
    && expected.length === expectedSet.size
    && actualSet.size === expectedSet.size
    && [...actualSet].every((item) => expectedSet.has(item));
}

function countInformationUnitsBeyondIdentity(headline) {
  const withoutIdentity = String(headline || '')
    .replace(/AI[\s-]*Agents?/gi, ' ')
    .replace(/智能体/g, ' ');
  const hanGlyphs = withoutIdentity.match(/\p{Script=Han}/gu) || [];
  const alphanumericWords = withoutIdentity.match(/[A-Za-z0-9]+/g) || [];
  return hanGlyphs.length + alphanumericWords.length;
}

function measureSvgTitleBlock(svg, canvasHeight) {
  const lines = [...svg.matchAll(/<text\b[^>]*data-cover-title-line="[^"]+"[^>]*>/g)]
    .map(([tag]) => {
      const y = Number(tag.match(/\by="([\d.]+)"/)?.[1]);
      const fontSize = Number(tag.match(/\bfont-size="([\d.]+)"/)?.[1]);
      return { y, fontSize };
    })
    .filter(({ y, fontSize }) => Number.isFinite(y) && Number.isFinite(fontSize));
  if (!lines.length) return { lineCount: 0, heightPx: 0, heightPercent: 0 };
  const top = Math.min(...lines.map(({ y, fontSize }) => y - fontSize * 0.9));
  const bottom = Math.max(...lines.map(({ y, fontSize }) => y + fontSize * 0.2));
  const heightPx = Math.max(0, bottom - top);
  return {
    lineCount: lines.length,
    heightPx: Number(heightPx.toFixed(2)),
    heightPercent: Number(((heightPx / canvasHeight) * 100).toFixed(2)),
  };
}

function parseSvgElementAttributes(tag) {
  const attributes = {};
  for (const match of String(tag || '').matchAll(/([A-Za-z_:][\w:.-]*)="([^"]*)"/g)) {
    attributes[match[1]] = match[2];
  }
  return attributes;
}

function numericAttribute(attributes, name) {
  const value = Number(attributes?.[name]);
  return Number.isFinite(value) ? value : null;
}

function sameNumericGeometry(actual, expected, keys) {
  return keys.every((key) => numericAttribute(actual, key) === expected?.[key]);
}

function normalizeVisibleTitle(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replace(/\s+/g, '');
}

function evaluateStrictGeometry({ ratio, svg, spec, generatedHeroAsset, strictGeometryRule }) {
  const scoped = strictGeometryRule?.status === 'active'
    && Array.isArray(strictGeometryRule.scope)
    && strictGeometryRule.scope.includes(`zh-CN/${ratio}`);
  if (!scoped) {
    return {
      scoped: false,
      checks: {
        strictGeometryProfileId: true,
        paperGridGeometry: true,
        roundedRuleGeometry: true,
        titleGroupGeometry: true,
        titleBaselineGeometry: true,
        titleFontScale: true,
        heroBoxGeometry: true,
        strictPrimaryTitleOnly: true,
        strictTitleTextMatchesSpec: true,
      },
      evidence: null,
    };
  }

  const expected = strictGeometryRule[ratio] || {};
  const shared = strictGeometryRule.shared || {};
  const patternTags = [...svg.matchAll(/<pattern\b[^>]*>/g)].map(([tag]) => ({
    tag,
    attributes: parseSvgElementAttributes(tag),
  }));
  const gridPattern = patternTags.find(({ attributes }) => attributes.id === 'paper-grid');
  const pathTags = [...svg.matchAll(/<path\b[^>]*>/g)].map(([tag]) => ({
    tag,
    attributes: parseSvgElementAttributes(tag),
  }));
  const gridPath = pathTags.find(({ attributes }) => attributes.stroke === shared.paperGrid?.stroke);
  const rectTags = [...svg.matchAll(/<rect\b[^>]*>/g)].map(([tag]) => ({
    tag,
    attributes: parseSvgElementAttributes(tag),
  }));
  const blueRules = rectTags.filter(({ attributes }) => attributes.fill === '#117ABD');
  const yellowRules = rectTags.filter(({ attributes }) => attributes.fill === '#F4C542');
  const blueRule = blueRules[0]?.attributes || {};
  const yellowRule = yellowRules[0]?.attributes || {};
  const groupTags = [...svg.matchAll(/<g\b[^>]*>/g)].map(([tag]) => ({
    tag,
    attributes: parseSvgElementAttributes(tag),
  }));
  const titleGroup = groupTags.find(({ attributes }) => attributes['font-family'])?.attributes || {};
  const titleLineFragments = [...svg.matchAll(/<text\b[^>]*data-cover-title-line="[^"]+"[^>]*>[\s\S]*?<\/text>/g)]
    .map(([fragment]) => {
      const tag = fragment.match(/<text\b[^>]*>/)?.[0] || '';
      const attributes = parseSvgElementAttributes(tag);
      return {
        fragment,
        attributes,
        index: numericAttribute(attributes, 'data-cover-title-line'),
        x: numericAttribute(attributes, 'x'),
        y: numericAttribute(attributes, 'y'),
        fontSize: numericAttribute(attributes, 'font-size'),
        visibleText: normalizeVisibleTitle(fragment),
      };
    })
    .sort((left, right) => left.index - right.index);
  const imageTags = [...svg.matchAll(/<image\b[^>]*>/g)].map(([tag]) => ({
    tag,
    attributes: parseSvgElementAttributes(tag),
  }));
  const heroImage = imageTags.find(({ attributes }) => (
    attributes.href === generatedHeroAsset || attributes['xlink:href'] === generatedHeroAsset
  ))?.attributes || {};
  const fontFamily = String(titleGroup['font-family'] || '');
  const bodyFontSizes = titleLineFragments.slice(1).map(({ fontSize }) => fontSize);
  const titleTextFromSvg = titleLineFragments.map(({ visibleText }) => visibleText).join('');
  const expectedTitleText = Array.isArray(spec.titleLines)
    ? spec.titleLines.join('')
    : spec.headline;
  const strictTitleTextMatchesSpec = titleTextFromSvg === normalizeVisibleTitle(expectedTitleText)
    && titleTextFromSvg === normalizeVisibleTitle(spec.headline);
  const titleBaselineGeometry = titleLineFragments.length === shared.titleLineCount
    && titleLineFragments.every((line, index) => (
      line.index === index + 1
      && line.x === expected.title?.x
      && line.y === expected.title?.baselineY?.[index]
    ));
  const titleFontScale = titleLineFragments.length === shared.titleLineCount
    && titleLineFragments.every(({ fontSize }) => (
      Number.isFinite(fontSize)
      && fontSize >= shared.titleGroup?.minimumBodyFontSizePx
      && fontSize <= shared.titleGroup?.maximumFontSizePx
    ))
    && titleLineFragments[0].fontSize >= expected.title?.identityFontSizePx?.min
    && titleLineFragments[0].fontSize <= expected.title?.identityFontSizePx?.max
    && bodyFontSizes.filter((fontSize) => (
      fontSize >= shared.titleGroup?.minimumDominantBodyLineFontSizePx
    )).length >= shared.titleGroup?.minimumDominantBodyLineCount;
  const titleGroupGeometry = shared.titleGroup?.fontFamilyTokens?.every((token) => fontFamily.includes(token))
    && numericAttribute(titleGroup, 'font-weight') === shared.titleGroup?.fontWeight
    && titleGroup.fill === shared.titleGroup?.fill
    && titleGroup.stroke === shared.titleGroup?.stroke
    && numericAttribute(titleGroup, 'stroke-width') === shared.titleGroup?.strokeWidthPx
    && titleGroup['stroke-linejoin'] === shared.titleGroup?.strokeLineJoin
    && titleGroup['paint-order'] === shared.titleGroup?.paintOrder
    && numericAttribute(titleGroup, 'letter-spacing') === shared.titleGroup?.letterSpacingPx;
  const paperGridGeometry = sameNumericGeometry(
    gridPattern?.attributes || {},
    { width: shared.paperGrid?.cellWidthPx, height: shared.paperGrid?.cellHeightPx },
    ['width', 'height'],
  )
    && gridPath?.attributes?.stroke === shared.paperGrid?.stroke
    && numericAttribute(gridPath?.attributes, 'stroke-width') === shared.paperGrid?.strokeWidthPx
    && numericAttribute(gridPath?.attributes, 'opacity') === shared.paperGrid?.opacity;
  const roundedRuleGeometry = blueRules.length === 1
    && yellowRules.length === 1
    && sameNumericGeometry(blueRule, expected.blueRule, ['x', 'y', 'width', 'height', 'rx'])
    && sameNumericGeometry(yellowRule, expected.yellowRule, ['x', 'y', 'width', 'height', 'rx']);
  const heroBoxGeometry = imageTags.length === 1
    && sameNumericGeometry(heroImage, expected.heroBox, ['x', 'y', 'width', 'height'])
    && heroImage.preserveAspectRatio === 'xMidYMid meet';
  const strictPrimaryTitleOnly = countMatches(svg, /<text\b/g) === shared.titleLineCount
    && titleLineFragments.length === shared.titleLineCount
    && /<tspan fill="#117ABD">AI Agent<\/tspan>/.test(titleLineFragments[0]?.fragment || '')
    && titleLineFragments.slice(1).every(({ fragment }) => !/#117ABD/.test(fragment));
  const checks = {
    strictGeometryProfileId: spec.strictGeometryProfileId === strictGeometryRule.geometryProfileId,
    paperGridGeometry,
    roundedRuleGeometry,
    titleGroupGeometry,
    titleBaselineGeometry,
    titleFontScale,
    heroBoxGeometry,
    strictPrimaryTitleOnly,
    strictTitleTextMatchesSpec,
  };
  return {
    scoped: true,
    checks,
    evidence: {
      geometryProfileId: spec.strictGeometryProfileId || null,
      expectedGeometryProfileId: strictGeometryRule.geometryProfileId,
      gridPattern: gridPattern?.attributes || null,
      gridPath: gridPath?.attributes || null,
      blueRule,
      yellowRule,
      titleGroup,
      titleLines: titleLineFragments.map(({ index, x, y, fontSize, visibleText }) => ({
        index,
        x,
        y,
        fontSize,
        visibleText,
      })),
      heroBox: heroImage,
      expected,
    },
  };
}

async function validate(projectDir) {
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
  const activeProfile = JSON.parse(await fs.readFile(
    path.join(repoRoot, 'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'),
    'utf8',
  ));
  const titleDensityRule = activeProfile.postSnapshotUserOverrides
    ?.coverTitleTopicAlignment
    ?.zhRatioTitleInformationDensity || {};
  const strictGeometryRule = activeProfile.postSnapshotUserOverrides
    ?.coverReferenceAlignment
    ?.zhRatioStrictGeometry || {};
  const coverSetRule = activeProfile.postSnapshotUserOverrides
    ?.englishChineseProductionParity
    ?.coverSet || {};
  const generatedIdentityRule = activeProfile.postSnapshotUserOverrides
    ?.tinyAgentGeneratedIdentityConsistency || {};
  const runKey = projectRunKey(projectDir);
  const usesCurrentCoverSet = runKey !== null
    && runKey.localeCompare(coverSetRule.effectiveFromRunKey || '9999-99-99-99') >= 0;
  const generatedIdentityApplied = runKey !== null
    && runKey.localeCompare(
      generatedIdentityRule.effectiveFromRunKey || '9999-99-99-99',
    ) >= 0;
  const selectedRatios = usesCurrentCoverSet
    ? Object.fromEntries(Object.entries(ratios).filter(([ratio]) => ratio !== '16x9'))
    : ratios;
  const metadata = JSON.parse(await fs.readFile(path.join(projectDir, 'publish-metadata.zh-CN.json'), 'utf8'));
  const coverTitleContract = metadata.coverTitleContract || {};
  const coreCoverKeywords = Array.isArray(coverTitleContract.coreCoverKeywords)
    ? coverTitleContract.coreCoverKeywords
    : [];
  const metadataKeywordGroups = Array.isArray(coverTitleContract.metadataKeywordGroups)
    ? coverTitleContract.metadataKeywordGroups
    : [];
  const validCoreKeywords = coreCoverKeywords.length > 0
    && coreCoverKeywords.every((keyword) => typeof keyword === 'string' && keyword.trim());
  const validKeywordGroups = validCoreKeywords
    && metadataKeywordGroups.length === coreCoverKeywords.length
    && metadataKeywordGroups.every((group) => (
      typeof group?.coverKeyword === 'string'
      && coreCoverKeywords.includes(group.coverKeyword)
      && Array.isArray(group.titleTerms)
      && group.titleTerms.length > 0
      && group.titleTerms.every((term) => typeof term === 'string' && term.trim())
    ))
    && new Set(metadataKeywordGroups.map((group) => group.coverKeyword)).size === coreCoverKeywords.length;
  const publishingTitleEchoesCoreKeywords = validKeywordGroups
    && metadataKeywordGroups.every((group) => (
      group.titleTerms.some((term) => String(metadata.title || '').includes(term))
    ));
  const validTopicAction = typeof coverTitleContract.topicAction === 'string'
    && coverTitleContract.topicAction.trim().length > 0;
  const metadataTitleTopicAlignment = {
    scope: 'publish metadata coverTitleContract',
    coreCoverKeywords,
    metadataKeywordGroups,
    topicAction: coverTitleContract.topicAction || null,
    validCoreKeywords,
    validKeywordGroups,
    publishingTitleEchoesCoreKeywords,
    validTopicAction,
    pass: validCoreKeywords && validKeywordGroups && publishingTitleEchoesCoreKeywords && validTopicAction,
  };
  const checks = [metadataTitleTopicAlignment];
  const outputs = [];
  for (const [ratio, expected] of Object.entries(selectedRatios)) {
    const [specRaw, svg, png, previewPng] = await Promise.all([
      fs.readFile(path.join(thumbnailsDir, `thumbnail-spec.zh-CN.${ratio}.json`), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.svg), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.png)),
      fs.readFile(path.join(thumbnailsDir, expected.preview)),
    ]);
    const spec = JSON.parse(specRaw);
    const image = inspectPng(path.join(thumbnailsDir, expected.png));
    const preview = inspectPng(path.join(thumbnailsDir, expected.preview));
    const generatedHero = spec.generatedHeroIllustration || null;
    const usesGeneratedHero = Boolean(generatedHero?.asset);
    const generatedHeroPath = usesGeneratedHero
      ? path.join(thumbnailsDir, generatedHero.asset)
      : null;
    const generatedHeroInspection = usesGeneratedHero
      ? inspectPng(generatedHeroPath)
      : null;
    const [agentAsset, agentSource, topicAsset, topicSource] = usesGeneratedHero
      ? [null, null, null, null]
      : await Promise.all([
        fs.readFile(path.join(thumbnailsDir, spec.stableAgentAsset || '')),
        fs.readFile(path.resolve(thumbnailsDir, spec.stableAgentSource || '')),
        fs.readFile(path.join(thumbnailsDir, spec.topicObjectAsset || '')),
        fs.readFile(path.resolve(thumbnailsDir, spec.topicObjectSource || '')),
      ]);
    const generatedHeroReferences = usesGeneratedHero
      ? countMatches(svg, new RegExp(escapeRegExp(generatedHero.asset), 'g'))
      : 0;
    const requiresTemporaryGeneratedHero = ratio === '4x3' || ratio === '3x4';
    const titleKeywordRevisionExempt = typeof spec.titleKeywordRevisionExempt === 'string'
      && spec.titleKeywordRevisionExempt.trim().length > 0;
    const permittedKeywordRevisionExempt = ratio === '16x9' && titleKeywordRevisionExempt;
    const headlineContainsRequiredKeywords = coreCoverKeywords.every((keyword) => (
      String(spec.headline || '').includes(keyword)
    ));
    const titleDensityScoped = ratio === '4x3' || ratio === '3x4';
    const titleBlock = measureSvgTitleBlock(svg, expected.height);
    const informationUnitsBeyondIdentity = countInformationUnitsBeyondIdentity(spec.headline);
    const titleLineRange = titleDensityRule.titleLineCount || {};
    const minimumTitleBlockHeightPercent = titleDensityRule.minimumTitleBlockHeightPercent?.[ratio];
    const headlineIntent = spec.headlineIntent;
    const validHeadlineIntent = ['question', 'action', 'benefit'].includes(headlineIntent)
      && typeof spec.headlineIntentRationale === 'string'
      && spec.headlineIntentRationale.trim().length >= 12
      && (headlineIntent !== 'question' || /[？?]/.test(String(spec.headline || '')));
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
    const strictGeometry = evaluateStrictGeometry({
      ratio,
      svg,
      spec,
      generatedHeroAsset: generatedHero?.asset || null,
      strictGeometryRule,
    });
    const previewDimensions = !strictGeometry.scoped || (
      preview.width === expected.previewWidth
      && preview.height === expected.previewHeight
      && preview.colorspace.toLowerCase() === 'srgb'
    );
    const ratioChecks = {
      coverSetProfile: !usesCurrentCoverSet
        || spec.coverSetProfileId === coverSetRule.coverSetProfileId,
      referenceLayout: spec.referenceLayout === '2026-07-23-approved-title-hero',
      referenceSvg: /2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/.test(spec.referenceSvg || ''),
      deterministicPrimaryTitle: typeof spec.headline === 'string'
        && /AI\s*Agent|智能体/.test(spec.headline),
      blueBlackTitleOnly: spec.titlePalette?.agentIdentity === '#117ABD' && spec.titlePalette?.remainingTitle === '#111413',
      decorativeYellowRule: spec.titlePalette?.decorativeRule === '#F4C542',
      noAuxiliaryCopy: spec.auxiliaryCoverCopy === false,
      noGeneratedText: spec.generatedIllustrationText === false,
      coverTitleKeywords: permittedKeywordRevisionExempt || (
        sameMembers(spec.requiredCoverKeywords, coreCoverKeywords) && headlineContainsRequiredKeywords
      ),
      keywordRevisionExemptionScope: !titleKeywordRevisionExempt || permittedKeywordRevisionExempt,
      titleInformationDensity: !titleDensityScoped || (
        titleDensityRule.status === 'active'
        && informationUnitsBeyondIdentity >= titleDensityRule.minimumInformationUnitsBeyondIdentity
      ),
      titleLineDensity: !titleDensityScoped || (
        titleBlock.lineCount >= titleLineRange.min
        && titleBlock.lineCount <= titleLineRange.max
      ),
      titleBlockHeightDensity: !titleDensityScoped || (
        Number.isFinite(minimumTitleBlockHeightPercent)
        && titleBlock.heightPercent >= minimumTitleBlockHeightPercent
      ),
      titleQuestionActionOrBenefit: !titleDensityScoped || validHeadlineIntent,
      titleHeroComposition: expected.portrait
        ? /top-60-percent-title; bottom-40-percent-contained/.test(spec.composition || '')
        : /text-left .*right/.test(spec.composition || ''),
      temporaryGeneratedHeroRequired: !requiresTemporaryGeneratedHero || (
        usesGeneratedHero
        && typeof generatedHero.source === 'string'
        && generatedHero.source.trim().length > 0
        && !/archive|2026-07-23/i.test(generatedHero.source)
      ),
      oneApprovedAgent: usesGeneratedHero
        ? generatedHeroReferences === 1 && generatedHero.characterCount === 1
          && generatedHero.tinyAgentCharacterCount === 1 && generatedHero.humanCharacterCount === 0
          && generatedHero.secondaryAgentCharacterCount === 0
        : countMatches(svg, /stable-agent\.[^"']+\.png/g) === 1,
      agentAssetIntegrity: usesGeneratedHero
        ? generatedHero.delivery === 'chroma-key alpha removal'
          && generatedHeroInspection.channels.toLowerCase().includes('a')
          && hasTransparentTopLeftCorner(generatedHeroPath)
          && generatedIdentityDeclarationPass
        : spec.stableAgentTransform === 'alpha-trim only'
        && imagePixelHash(path.join(thumbnailsDir, spec.stableAgentAsset || ''))
          === imagePixelHash(path.resolve(thumbnailsDir, spec.stableAgentSource || ''), true),
      oneTopicObject: usesGeneratedHero
        ? generatedHero.integratedTopicAction === coverTitleContract.topicAction
        : countMatches(svg, /topic-object\.[^"']+\.png/g) === 1,
      topicObjectIntegrity: usesGeneratedHero
        ? generatedHero.generatedIllustrationText === false && generatedHeroReferences === 1
        : sha256(topicAsset) === sha256(topicSource),
      noGeneratedOrReplacementAgent: usesGeneratedHero
        ? !/stable-agent\.|topic-object\.|assets\/generated|cover-illustration/i.test(svg)
        : !/cover-illustration|assets\/generated|illustration\.subject-transparent|generated-agent/i.test(svg),
      shortBlueTopRule: /<rect x="(?:44|38|36)" y="(?:42|28|30)"[^>]*fill="#117ABD"/.test(svg),
      yellowRuleNotTitleUnderline: /<rect x="(?:44|38|36)" y="(?:652|882|711)"[^>]*fill="#F4C542"/.test(svg),
      blueAgentIdentity: /<tspan fill="#117ABD">AI Agent<\/tspan>/.test(svg),
      noForbiddenTitleColors: !/#8A6500|#C7362F/.test(svg),
      expectedBinaryPresent: png.length > 0,
      expectedDimensions: image.width === expected.width && image.height === expected.height && image.colorspace.toLowerCase() === 'srgb',
      expectedFileSize: png.length < 2 * 1024 * 1024,
      ...strictGeometry.checks,
      previewDimensions,
    };
    const pass = Object.values(ratioChecks).every(Boolean);
    checks.push({
      ratio,
      pass,
      ...ratioChecks,
      titleDensityEvidence: {
        scoped: titleDensityScoped,
        headline: spec.headline || null,
        informationUnitsBeyondIdentity,
        minimumInformationUnitsBeyondIdentity: titleDensityRule.minimumInformationUnitsBeyondIdentity ?? null,
        lineCount: titleBlock.lineCount,
        requiredLineCount: titleLineRange,
        titleBlockHeightPx: titleBlock.heightPx,
        titleBlockHeightPercent: titleBlock.heightPercent,
        minimumTitleBlockHeightPercent: minimumTitleBlockHeightPercent ?? null,
        headlineIntent: headlineIntent || null,
        headlineIntentRationale: spec.headlineIntentRationale || null,
      },
      strictGeometryEvidence: {
        scoped: strictGeometry.scoped,
        preview: {
          path: expected.preview,
          width: preview.width,
          height: preview.height,
          colorspace: preview.colorspace,
          sizeBytes: previewPng.length,
        },
        geometry: strictGeometry.evidence,
      },
    });
    outputs.push({
      ratio,
      path: expected.png,
      ...image,
      sizeBytes: png.length,
      sha256: sha256(png),
      preview: {
        path: expected.preview,
        ...preview,
        sizeBytes: previewPng.length,
        sha256: sha256(previewPng),
      },
    });
  }
  const forbidden16x9Artifacts = [
    'thumbnail.zh-CN.png',
    'thumbnail.zh-CN.svg',
    'thumbnail.zh-CN.16x9.png',
    'thumbnail.zh-CN.16x9.svg',
    'thumbnail.zh-CN.256x144.png',
    'thumbnail-spec.zh-CN.16x9.json',
    'generated-hero.zh-CN.16x9.png',
  ];
  const presentForbidden16x9Artifacts = usesCurrentCoverSet
    ? (await Promise.all(forbidden16x9Artifacts.map(async (file) => {
      try {
        await fs.access(path.join(thumbnailsDir, file));
        return file;
      } catch {
        return null;
      }
    }))).filter(Boolean)
    : [];
  let aliases = null;
  if (!usesCurrentCoverSet) {
    const png16x9 = await fs.readFile(path.join(thumbnailsDir, 'thumbnail.zh-CN.png'));
    const expected16x9 = await fs.readFile(path.join(thumbnailsDir, 'thumbnail.zh-CN.16x9.png'));
    aliases = { primary16x9Matches: sha256(png16x9) === sha256(expected16x9) };
  } else {
    checks.push({
      scope: 'forbidden Chinese 16:9 artifacts',
      forbidden16x9ArtifactCount: presentForbidden16x9Artifacts.length,
      presentForbidden16x9Artifacts,
      pass: presentForbidden16x9Artifacts.length === 0,
    });
  }
  const report = {
    version: 5,
    reference: '2026-07-23-approved-title-hero',
    runKey,
    coverSetProfileId: usesCurrentCoverSet ? coverSetRule.coverSetProfileId : null,
    currentCoverSetApplied: usesCurrentCoverSet,
    pass: checks.every((check) => check.pass),
    checks,
    outputs,
    aliases,
    forbidden16x9Artifacts: {
      checked: usesCurrentCoverSet,
      present: presentForbidden16x9Artifacts,
    },
  };
  await fs.mkdir(path.join(thumbnailsDir, 'qa'), { recursive: true });
  await fs.writeFile(path.join(thumbnailsDir, 'qa/reference-alignment-qa.json'), `${JSON.stringify(report, null, 2)}\n`);
  return report;
}

const args = parseArgs(process.argv.slice(2));
if (!args.project) throw new Error('Usage: validate-tiny-agent-zh-cover-reference.mjs --project <ZH_PROJECT_DIR>');
const report = await validate(path.resolve(args.project));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) process.exitCode = 1;
