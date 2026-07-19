#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

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

const args = parseArgs(process.argv.slice(2));
if (!args.base || !args.spec || !args.output) {
  throw new Error('Usage: node create-tiny-agent-longform-thumbnail.mjs --base <png> --spec <json> --output <png>');
}

const base = path.resolve(args.base);
const specPath = path.resolve(args.spec);
const output = path.resolve(args.output);
const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
const width = Number(spec.width || 1280);
const height = Number(spec.height || 720);

if (!fs.existsSync(base)) throw new Error(`Missing base illustration: ${base}`);
if (!Array.isArray(spec.titleLines) || spec.titleLines.length < 2 || spec.titleLines.length > 3) {
  throw new Error('titleLines must contain two or three lines.');
}
if (path.extname(output).toLowerCase() !== '.png') {
  throw new Error('Tiny Agent long-form thumbnails must use PNG.');
}
if (![[1280, 720], [1200, 900], [900, 1200]].some(([allowedWidth, allowedHeight]) => width === allowedWidth && height === allowedHeight)) {
  throw new Error(`Unsupported thumbnail canvas: ${width}x${height}.`);
}

fs.mkdirSync(path.dirname(output), { recursive: true });

const escapeXml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');

const fontFamily = escapeXml(spec.fontFamily || 'Hiragino Sans GB');
const titlePointSize = Number(spec.titlePointSize || 88);
const titleStartY = Number(spec.titleStartY || 250);
const titleLineHeight = Number(spec.titleLineHeight || Math.round(titlePointSize * 0.96));
const accentWidth = Number(spec.accentWidth || 330);
const panelX = Number(spec.panelX ?? 32);
const panelY = Number(spec.panelY ?? 32);
const panelWidth = Number(spec.panelWidth || 720);
const panelHeight = Number(spec.panelHeight || (height - 64));
const panelFillOpacity = Number(spec.panelFillOpacity ?? 0.92);
const brandX = Number(spec.brandX ?? 64);
const brandY = Number(spec.brandY ?? 58);
const brandWidth = Number(spec.brandWidth || 212);
const brandHeight = Number(spec.brandHeight || 54);
const titleX = Number(spec.titleX ?? 98);
const ruleX = Number(spec.ruleX ?? 64);
const ruleY = Number(spec.ruleY ?? 151);
const ruleHeight = Number(spec.ruleHeight || 371);
const accentX = Number(spec.accentX ?? 64);
const accentY = Number(spec.accentY ?? (height - 126));
const accentHeight = Number(spec.accentHeight || 56);
const titleSvg = spec.titleLines
  .map(
    (line, index) =>
      `<text x="${titleX}" y="${titleStartY + index * titleLineHeight}" class="title">${escapeXml(line)}</text>`
  )
  .join('\n');

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <style>
    .brand, .title, .accent { font-family: "${fontFamily}", sans-serif; font-weight: 700; }
    .brand { font-size: 27px; fill: #ffffff; }
    .title { font-size: ${titlePointSize}px; fill: #101820; }
    .accent { font-size: ${Number(spec.accentPointSize || 29)}px; fill: #101820; }
  </style>
  <image x="0" y="0" width="${width}" height="${height}" preserveAspectRatio="xMidYMid slice" xlink:href="${escapeXml(pathToFileURL(base).href)}" />
  <rect x="${panelX}" y="${panelY}" width="${panelWidth}" height="${panelHeight}" rx="30" fill="#ECECEA" fill-opacity="${panelFillOpacity}" stroke="#0b8bcb" stroke-opacity="0.18" stroke-width="2" />
  <rect x="${brandX}" y="${brandY}" width="${brandWidth}" height="${brandHeight}" rx="27" fill="#0b8bcb" />
  <text x="${brandX + brandWidth / 2}" y="${brandY + 38}" text-anchor="middle" class="brand">${escapeXml(spec.eyebrow || 'TINY AGENT')}</text>
  <rect x="${ruleX}" y="${ruleY}" width="12" height="${ruleHeight}" rx="6" fill="#0b8bcb" />
  ${titleSvg}
  <rect x="${accentX}" y="${accentY}" width="${accentWidth}" height="${accentHeight}" rx="28" fill="#ffd447" />
  <text x="${accentX + accentWidth / 2}" y="${accentY + 38}" text-anchor="middle" class="accent">${escapeXml(spec.accent)}</text>
</svg>`;

const temporarySvg = `${output}.tmp.svg`;
fs.writeFileSync(temporarySvg, svg);
const render = spawnSync(
  'rsvg-convert',
  ['--width', String(width), '--height', String(height), '--output', output, temporarySvg],
  { encoding: 'utf8' }
);
fs.rmSync(temporarySvg, { force: true });
if (render.status !== 0) {
  throw new Error(render.stderr || render.stdout || 'SVG thumbnail render failed.');
}

const identify = spawnSync('magick', ['identify', '-format', '%w %h %[colorspace]', output], {
  encoding: 'utf8',
});
if (identify.status !== 0 || identify.stdout.trim() !== `${width} ${height} sRGB`) {
  throw new Error(`Unexpected thumbnail output: ${identify.stdout.trim()}`);
}

process.stdout.write(`${output}\n`);
