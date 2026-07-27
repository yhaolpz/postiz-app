#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const ratios = {
  '16x9': { svg: 'thumbnail.zh-CN.svg', png: 'thumbnail.zh-CN.png', width: 1280, height: 720, portrait: false },
  '4x3': { svg: 'thumbnail.zh-CN.4x3.svg', png: 'thumbnail.zh-CN.4x3.png', width: 1200, height: 900, portrait: false },
  '3x4': { svg: 'thumbnail.zh-CN.3x4.svg', png: 'thumbnail.zh-CN.3x4.png', width: 900, height: 1200, portrait: true },
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

async function validate(projectDir) {
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
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
  for (const [ratio, expected] of Object.entries(ratios)) {
    const [specRaw, svg, png] = await Promise.all([
      fs.readFile(path.join(thumbnailsDir, `thumbnail-spec.zh-CN.${ratio}.json`), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.svg), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.png)),
    ]);
    const spec = JSON.parse(specRaw);
    const image = inspectPng(path.join(thumbnailsDir, expected.png));
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
    const ratioChecks = {
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
          && generatedHero.identityAnchors?.includes('white rounded body')
          && generatedHero.identityAnchors?.includes('black face screen')
          && generatedHero.identityAnchors?.includes('blue eyes and antenna')
          && generatedHero.identityAnchors?.includes('brown tool belt')
          && generatedHero.identityAnchors?.includes('hand-drawn outline')
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
    };
    const pass = Object.values(ratioChecks).every(Boolean);
    checks.push({ ratio, pass, ...ratioChecks });
    outputs.push({ ratio, path: expected.png, ...image, sizeBytes: png.length, sha256: sha256(png) });
  }
  const png16x9 = await fs.readFile(path.join(thumbnailsDir, 'thumbnail.zh-CN.png'));
  const expected16x9 = await fs.readFile(path.join(thumbnailsDir, 'thumbnail.zh-CN.16x9.png'));
  const report = {
    version: 3,
    reference: '2026-07-23-approved-title-hero',
    pass: checks.every((check) => check.pass),
    checks,
    outputs,
    aliases: { primary16x9Matches: sha256(png16x9) === sha256(expected16x9) },
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
