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
  const [width, height, colorspace] = execFileSync(
    'magick',
    ['identify', '-format', '%w %h %[colorspace]', filePath],
    { encoding: 'utf8' },
  ).trim().split(/\s+/);
  return { width: Number(width), height: Number(height), colorspace };
}

function imagePixelHash(filePath, trim = false) {
  const args = [filePath];
  if (trim) args.push('-trim');
  args.push('-colorspace', 'sRGB', '-alpha', 'on', '-depth', '8', 'rgba:-');
  return sha256(execFileSync('magick', args));
}

async function validate(projectDir) {
  const thumbnailsDir = path.join(projectDir, 'thumbnails');
  const checks = [];
  const outputs = [];
  for (const [ratio, expected] of Object.entries(ratios)) {
    const [specRaw, svg, png] = await Promise.all([
      fs.readFile(path.join(thumbnailsDir, `thumbnail-spec.zh-CN.${ratio}.json`), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.svg), 'utf8'),
      fs.readFile(path.join(thumbnailsDir, expected.png)),
    ]);
    const spec = JSON.parse(specRaw);
    const image = inspectPng(path.join(thumbnailsDir, expected.png));
    const [agentAsset, agentSource, topicAsset, topicSource] = await Promise.all([
      fs.readFile(path.join(thumbnailsDir, spec.stableAgentAsset || '')),
      fs.readFile(path.resolve(thumbnailsDir, spec.stableAgentSource || '')),
      fs.readFile(path.join(thumbnailsDir, spec.topicObjectAsset || '')),
      fs.readFile(path.resolve(thumbnailsDir, spec.topicObjectSource || '')),
    ]);
    const ratioChecks = {
      referenceLayout: spec.referenceLayout === '2026-07-23-approved-title-hero',
      referenceSvg: /2026-07-23-03-ai-agent-uncertainty-longform-zh-CN/.test(spec.referenceSvg || ''),
      deterministicPrimaryTitle: spec.headline === 'AI Agent 记忆怎么才有用？',
      blueBlackTitleOnly: spec.titlePalette?.agentIdentity === '#117ABD' && spec.titlePalette?.remainingTitle === '#111413',
      decorativeYellowRule: spec.titlePalette?.decorativeRule === '#F4C542',
      noAuxiliaryCopy: spec.auxiliaryCoverCopy === false,
      noGeneratedText: spec.generatedIllustrationText === false,
      titleHeroComposition: expected.portrait
        ? /top-60-percent-title; bottom-40-percent-contained/.test(spec.composition || '')
        : /text-left complete-approved-agent-right/.test(spec.composition || ''),
      oneApprovedAgent: countMatches(svg, /stable-agent\.[^"']+\.png/g) === 1,
      agentAssetIntegrity: spec.stableAgentTransform === 'alpha-trim only'
        && imagePixelHash(path.join(thumbnailsDir, spec.stableAgentAsset || ''))
          === imagePixelHash(path.resolve(thumbnailsDir, spec.stableAgentSource || ''), true),
      oneTopicObject: countMatches(svg, /topic-object\.[^"']+\.png/g) === 1,
      topicObjectIntegrity: sha256(topicAsset) === sha256(topicSource),
      noGeneratedOrReplacementAgent: !/cover-illustration|assets\/generated|illustration\.subject-transparent|generated-agent/i.test(svg),
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
    version: 1,
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
