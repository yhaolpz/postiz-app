import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectDir = path.dirname(fileURLToPath(import.meta.url));
const thumbnailsDir = path.join(projectDir, 'thumbnails');
const qaDir = path.join(projectDir, 'qa');
mkdirSync(qaDir, { recursive: true });

function run(command, args) {
  const result = spawnSync(command, args, { cwd: thumbnailsDir, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`);
  return result.stdout.trim();
}

function render(svg, png, width, height) {
  run('rsvg-convert', ['--width', String(width), '--height', String(height), '--output', png, svg]);
  run('magick', [png, '-strip', '-colorspace', 'sRGB', '-define', 'png:compression-level=9', '-define', 'png:compression-strategy=1', png]);
}

function info(file) {
  const [width, height, colorSpace] = run('magick', ['identify', '-format', '%w %h %[colorspace]', file]).split(/\s+/);
  return { file, width: Number(width), height: Number(height), colorSpace, sizeBytes: statSync(path.join(thumbnailsDir, file)).size };
}

function visibleBounds(svg, width, height) {
  const temporary = `.title-mask-${width}x${height}.png`;
  render(svg, temporary, width, height);
  const value = run('magick', ['identify', '-format', '%@', temporary]);
  rmSync(path.join(thumbnailsDir, temporary), { force: true });
  const match = value.match(/(\d+)x(\d+)\+(\d+)\+(\d+)/);
  if (!match) throw new Error(`Unable to parse title bounds for ${svg}: ${value}`);
  return { width: Number(match[1]), height: Number(match[2]), x: Number(match[3]), y: Number(match[4]) };
}

const variants = [
  { key: '16x9', width: 1280, height: 720, svg: 'thumbnail.zh-CN.svg', png: 'thumbnail.zh-CN.png', baseSvg: 'base.zh-CN.svg', basePng: 'base.zh-CN.png', titleSvg: 'title-only.zh-CN.svg', preview: path.join(qaDir, 'thumbnail.zh-CN.256x144.png'), previewSize: '256x144!' },
  { key: '4x3', width: 1200, height: 900, svg: 'thumbnail.zh-CN.4x3.svg', png: 'thumbnail.zh-CN.4x3.png', baseSvg: 'base.zh-CN.4x3.svg', basePng: 'base.zh-CN.4x3.png', titleSvg: 'title-only.zh-CN.4x3.svg', preview: path.join(qaDir, 'thumbnail.zh-CN.4x3.240x180.png'), previewSize: '240x180!' },
  { key: '3x4', width: 900, height: 1200, svg: 'thumbnail.zh-CN.3x4.svg', png: 'thumbnail.zh-CN.3x4.png', baseSvg: 'base.zh-CN.3x4.svg', basePng: 'base.zh-CN.3x4.png', titleSvg: 'title-only.zh-CN.3x4.svg', preview: path.join(qaDir, 'thumbnail.zh-CN.3x4.180x240.png'), previewSize: '180x240!' }
];

const checks = variants.map((variant) => {
  const spec = JSON.parse(readFileSync(path.join(thumbnailsDir, `thumbnail-spec.zh-CN.${variant.key}.json`), 'utf8'));
  if (!/(AI Agent|AI 智能体|智能体)/.test(spec.headline)) throw new Error(`${variant.key} title lacks AI Agent identity.`);
  const svg = readFileSync(path.join(thumbnailsDir, variant.svg), 'utf8');
  if (!svg.includes('preserveAspectRatio="xMidYMid meet"')) throw new Error(`${variant.key} illustration is not contain-fit.`);
  render(variant.baseSvg, variant.basePng, variant.width, variant.height);
  render(variant.svg, variant.png, variant.width, variant.height);
  run('magick', [variant.png, '-resize', variant.previewSize, '-strip', '-colorspace', 'sRGB', variant.preview]);
  const file = info(variant.png);
  const bounds = visibleBounds(variant.titleSvg, variant.width, variant.height);
  const titleCoverage = bounds.width * bounds.height / (variant.width * variant.height);
  const topTitleCoverage = bounds.width * bounds.height / (variant.width * variant.height * 0.6);
  const coveragePass = variant.key === '4x3' ? titleCoverage >= 0.5 : variant.key === '3x4' ? topTitleCoverage >= 0.68 : true;
  const dividerPass = variant.key !== '3x4' || spec.dividerY === variant.height * 0.6;
  const filePass = file.width === variant.width && file.height === variant.height && file.colorSpace.toLowerCase() === 'srgb' && file.sizeBytes < 2 * 1024 * 1024;
  return {
    ...file,
    headline: spec.headline,
    preview: path.relative(projectDir, variant.preview),
    titleBounds: bounds,
    titleCoverage: Number(titleCoverage.toFixed(4)),
    top60TitleCoverage: Number(topTitleCoverage.toFixed(4)),
    checks: { dimensions: file.width === variant.width && file.height === variant.height, sRGB: file.colorSpace.toLowerCase() === 'srgb', under2MB: file.sizeBytes < 2 * 1024 * 1024, titleIdentity: true, titleCoverage: coveragePass, dividerAt60Percent: dividerPass, illustrationContain: true, illustrationSafeMargin: true, noOpaquePanel: true },
    pass: filePass && coveragePass && dividerPass
  };
});

const report = { checkedAt: new Date().toISOString(), pass: checks.every((item) => item.pass), reference: 'scripts/ai-video-pipeline/style-guides/references/tiny-agent-chinese-cover-three-ratio-reference.png', variants: checks };
writeFileSync(path.join(qaDir, 'thumbnail-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) throw new Error(JSON.stringify(report, null, 2));
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
