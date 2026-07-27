#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const expected = {
  spec: 'thumbnail-spec.en-US.16x9.json',
  svg: 'thumbnail.en-US.svg',
  png: 'thumbnail.en-US.1280x720.png',
  width: 1280,
  height: 720,
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

function sameMembers(actual, expectedValues) {
  if (!Array.isArray(actual) || !Array.isArray(expectedValues)) return false;
  const actualSet = new Set(actual.map((value) => String(value).toLocaleLowerCase()));
  const expectedSet = new Set(expectedValues.map((value) => String(value).toLocaleLowerCase()));
  return actual.length === actualSet.size
    && expectedValues.length === expectedSet.size
    && actualSet.size === expectedSet.size
    && [...actualSet].every((value) => expectedSet.has(value));
}

function includesCaseInsensitive(value, target) {
  return String(value || '').toLocaleLowerCase().includes(String(target || '').toLocaleLowerCase());
}

async function validate(projectDir) {
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
  const [metadataRaw, specRaw, svg, png] = await Promise.all([
    fs.readFile(path.join(projectDir, 'publish-metadata.en-US.json'), 'utf8'),
    fs.readFile(path.join(thumbnailsDir, expected.spec), 'utf8'),
    fs.readFile(path.join(thumbnailsDir, expected.svg), 'utf8'),
    fs.readFile(path.join(thumbnailsDir, expected.png)),
  ]);
  const metadata = JSON.parse(metadataRaw);
  const spec = JSON.parse(specRaw);
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
      && coreCoverKeywords.some((keyword) => keyword.toLocaleLowerCase() === group.coverKeyword.toLocaleLowerCase())
      && Array.isArray(group.titleTerms)
      && group.titleTerms.length > 0
      && group.titleTerms.every((term) => typeof term === 'string' && term.trim())
    ))
    && new Set(metadataKeywordGroups.map((group) => group.coverKeyword.toLocaleLowerCase())).size === coreCoverKeywords.length;
  const publishingTitleEchoesCoreKeywords = validKeywordGroups
    && metadataKeywordGroups.every((group) => (
      group.titleTerms.some((term) => includesCaseInsensitive(metadata.title, term))
    ));
  const validTopicAction = typeof coverTitleContract.topicAction === 'string'
    && coverTitleContract.topicAction.trim().length > 0;
  const coverReferenceContractExempt = typeof spec.coverReferenceContractExempt === 'string'
    && spec.coverReferenceContractExempt.trim().length > 0;
  const generatedHero = spec.generatedHeroIllustration || null;
  const usesGeneratedHero = Boolean(generatedHero?.asset);
  const generatedHeroPath = usesGeneratedHero
    ? path.join(thumbnailsDir, generatedHero.asset)
    : null;
  const generatedHeroInspection = usesGeneratedHero
    ? inspectPng(generatedHeroPath)
    : null;
  const generatedHeroReferences = usesGeneratedHero
    ? countMatches(svg, new RegExp(escapeRegExp(generatedHero.asset), 'g'))
    : 0;
  const image = inspectPng(path.join(thumbnailsDir, expected.png));
  const checks = {
    metadataLanguage: metadata.language === 'en-US',
    validCoreKeywords,
    validKeywordGroups,
    publishingTitleEchoesCoreKeywords,
    validTopicAction,
    coverTitleKeywords: coverReferenceContractExempt || (
      sameMembers(spec.requiredCoverKeywords, coreCoverKeywords)
      && coreCoverKeywords.every((keyword) => includesCaseInsensitive(spec.headline, keyword))
    ),
    temporaryGeneratedHero: coverReferenceContractExempt || (
      usesGeneratedHero
      && typeof generatedHero.source === 'string'
      && generatedHero.source.trim().length > 0
      && !/archive|2026-07-23/i.test(generatedHero.source)
      && generatedHeroReferences === 1
      && generatedHero.characterCount === 1
      && generatedHero.tinyAgentCharacterCount === 1
      && generatedHero.humanCharacterCount === 0
      && generatedHero.secondaryAgentCharacterCount === 0
      && generatedHero.delivery === 'chroma-key alpha removal'
      && generatedHeroInspection.channels.toLowerCase().includes('a')
      && hasTransparentTopLeftCorner(generatedHeroPath)
      && generatedHero.identityAnchors?.includes('white rounded body')
      && generatedHero.identityAnchors?.includes('black face screen')
      && generatedHero.identityAnchors?.includes('blue eyes and antenna')
      && generatedHero.identityAnchors?.includes('brown tool belt')
      && generatedHero.identityAnchors?.includes('hand-drawn outline')
      && generatedHero.integratedTopicAction === coverTitleContract.topicAction
      && generatedHero.generatedIllustrationText === false
    ),
    referenceTitleHero: /text-left .*right/.test(spec.composition || ''),
    blueBlackTitleOnly: spec.titlePalette?.agentIdentity === '#117ABD'
      && spec.titlePalette?.remainingTitle === '#111413'
      && spec.titlePalette?.decorativeRule === '#F4C542'
      && /<tspan fill="#117ABD">AI Agent<\/tspan>/.test(svg)
      && !/#8A6500|#C7362F/.test(svg),
    noAuxiliaryCopy: spec.auxiliaryCoverCopy === false,
    noGeneratedText: spec.generatedIllustrationText === false,
    outputDimensions: image.width === expected.width
      && image.height === expected.height
      && image.colorspace.toLowerCase() === 'srgb'
      && png.length > 0,
  };
  const report = {
    version: 1,
    locale: 'en-US',
    pass: Object.values(checks).every(Boolean),
    coverTitleContract: {
      coreCoverKeywords,
      metadataKeywordGroups,
      topicAction: coverTitleContract.topicAction || null,
    },
    exemption: coverReferenceContractExempt || null,
    checks,
    output: { path: expected.png, ...image, sizeBytes: png.length, sha256: sha256(png) },
  };
  await fs.mkdir(path.join(thumbnailsDir, 'qa'), { recursive: true });
  await fs.writeFile(
    path.join(thumbnailsDir, 'qa', 'english-reference-alignment-qa.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  return report;
}

const args = parseArgs(process.argv.slice(2));
if (!args.project) throw new Error('Usage: validate-tiny-agent-en-cover-reference.mjs --project <EN_PROJECT_DIR>');
const report = await validate(path.resolve(args.project));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) process.exitCode = 1;
