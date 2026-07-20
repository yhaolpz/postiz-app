#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    args[value.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function imageInfo(filePath) {
  const [width, height, colorSpace] = run('magick', [
    'identify',
    '-format',
    '%w %h %[colorspace]',
    filePath,
  ]).split(/\s+/);
  return {
    path: filePath,
    width: Number(width),
    height: Number(height),
    colorSpace,
    sizeBytes: fs.statSync(filePath).size,
    sha256: crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'),
  };
}

function assertNoOpaquePanel(svg) {
  const rects = [...svg.matchAll(/<rect\b([^>]*)>/g)].map((match) => match[1]);
  for (const attributes of rects) {
    const width = Number(attributes.match(/\bwidth="([\d.]+)"/)?.[1]);
    const height = Number(attributes.match(/\bheight="([\d.]+)"/)?.[1]);
    const isCanvasBackground = width === 1280 && height === 720;
    if (!isCanvasBackground && width >= 600 && height >= 300) {
      throw new Error(`Large rectangle is not allowed in the title-hero SVG: <rect${attributes}>`);
    }
  }
}

function archiveIfPresent(filePath, archiveDirectory) {
  if (!fs.existsSync(filePath)) return;
  fs.mkdirSync(archiveDirectory, { recursive: true });
  const archivePath = path.join(archiveDirectory, path.basename(filePath));
  if (!fs.existsSync(archivePath)) fs.copyFileSync(filePath, archivePath);
}

const args = parseArgs(process.argv.slice(2));
assert(args.svg, '--svg is required.');
assert(args.output, '--output is required.');

const svgPath = path.resolve(args.svg);
const outputPath = path.resolve(args.output);
const outputDirectory = path.dirname(outputPath);
const preview1280Path = path.resolve(args['preview-1280'] || path.join(outputDirectory, 'thumbnail.en-US.1280x720.png'));
const preview256Path = path.resolve(args['preview-256'] || path.join(outputDirectory, 'thumbnail.en-US.256x144.png'));
const qaPath = args.qa ? path.resolve(args.qa) : null;
const archiveDirectory = path.resolve(args.archive || path.join(outputDirectory, 'archive', 'pre-4k-2026-07-19'));
const temporaryPath = `${outputPath}.rendering.png`;

assert(fs.existsSync(svgPath), `Missing SVG: ${svgPath}`);
assert(path.extname(outputPath).toLowerCase() === '.png', 'YouTube thumbnail output must use PNG.');
const svg = fs.readFileSync(svgPath, 'utf8');
assert(/viewBox="0 0 1280 720"/.test(svg), 'SVG must use the canonical 1280x720 layout coordinate system.');
assert(/<image\b/.test(svg), 'SVG must contain one complete topic illustration.');
assert(/preserveAspectRatio="xMidYMid meet"/.test(svg), 'Illustration must use contain-style xMidYMid meet sizing.');
assertNoOpaquePanel(svg);

fs.mkdirSync(outputDirectory, { recursive: true });
archiveIfPresent(outputPath, archiveDirectory);
archiveIfPresent(preview1280Path, archiveDirectory);
archiveIfPresent(preview256Path, archiveDirectory);

run('rsvg-convert', ['--width', '3840', '--height', '2160', '--output', temporaryPath, svgPath]);
run('magick', [
  temporaryPath,
  '-strip',
  '-colorspace',
  'sRGB',
  '-define',
  'png:compression-level=9',
  '-define',
  'png:compression-strategy=1',
  outputPath,
]);
fs.rmSync(temporaryPath, { force: true });
run('magick', [outputPath, '-resize', '1280x720!', '-strip', '-colorspace', 'sRGB', preview1280Path]);
run('magick', [outputPath, '-resize', '256x144!', '-strip', '-colorspace', 'sRGB', preview256Path]);

const master = imageInfo(outputPath);
const preview1280 = imageInfo(preview1280Path);
const preview256 = imageInfo(preview256Path);
assert(master.width === 3840 && master.height === 2160, `Expected 3840x2160, got ${master.width}x${master.height}.`);
assert(master.colorSpace.toLowerCase() === 'srgb', `Expected sRGB, got ${master.colorSpace}.`);
assert(master.sizeBytes <= 2 * 1024 * 1024, `4K PNG exceeds the YouTube API 2 MB limit: ${master.sizeBytes} bytes.`);
assert(preview1280.width === 1280 && preview1280.height === 720, '1280x720 QA preview is invalid.');
assert(preview256.width === 256 && preview256.height === 144, '256x144 QA preview is invalid.');

const result = {
  checkedAt: new Date().toISOString(),
  status: 'pass',
  version: '4k-title-hero-no-panel-v1',
  files: {
    master: { ...master, path: path.basename(master.path) },
    preview1280: { ...preview1280, path: path.basename(preview1280.path) },
    preview256: { ...preview256, path: path.basename(preview256.path) },
  },
  checks: {
    exact3840x2160: true,
    sRGB: true,
    under2MB: true,
    opaquePanel: false,
    containIllustration: true,
    originalSizeReview: 'pending-visual-review',
    preview1280Review: 'pending-visual-review',
    preview256Review: 'pending-visual-review',
  },
};

if (qaPath) fs.writeFileSync(qaPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
