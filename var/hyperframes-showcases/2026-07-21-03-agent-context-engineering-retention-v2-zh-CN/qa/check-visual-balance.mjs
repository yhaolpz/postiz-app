import { execFileSync } from 'node:child_process';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const snapshotDir = path.join(projectRoot, 'snapshots/visual-balance-all');
const reportPath = path.join(projectRoot, 'qa/visual-balance-report.json');
const timingMap = JSON.parse(await readFile(path.join(projectRoot, 'timing-map.json'), 'utf8'));

const safeArea = { left: 56, top: 120, right: 1864, bottom: 820 };
const target = { x: 960, y: 450 };
const limits = { offsetX: 150, offsetY: 100 };
const board = { r: 236, g: 236, b: 234 };

const bodyScenes = timingMap.scenes.filter((scene) => scene.propBeatTimes.length > 0);

function sampleTime(scene) {
  const lastPropBeat = Math.max(scene.start, ...scene.propBeatTimes);
  return Math.min(
    scene.end - 0.45,
    Math.max(scene.start + 0.9, lastPropBeat + 0.75),
  );
}

async function captureSnapshots(samples) {
  await rm(snapshotDir, { recursive: true, force: true });
  await mkdir(snapshotDir, { recursive: true });
  execFileSync('pnpm', [
    'dlx',
    'hyperframes@0.7.65',
    'snapshot',
    '.',
    '--at',
    samples.map((sample) => sample.time.toFixed(3)).join(','),
    '--no-end',
    '--output',
    snapshotDir,
    '--timeout',
    '120000',
  ], {
    cwd: projectRoot,
    env: {
      ...process.env,
      HYPERFRAMES_BROWSER_PATH: process.env.HYPERFRAMES_BROWSER_PATH
        || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    },
    stdio: 'inherit',
  });
}

function frameNumber(file) {
  return Number(file.match(/^frame-(\d+)-/)?.[1] ?? Number.MAX_SAFE_INTEGER);
}

async function analyzeSnapshot(file, scene, time) {
  const image = sharp(file);
  const metadata = await image.metadata();
  if (metadata.width !== 1920 || metadata.height !== 1080) {
    throw new Error(`Unexpected snapshot size for ${scene.id}: ${metadata.width}x${metadata.height}`);
  }

  const width = safeArea.right - safeArea.left;
  const height = safeArea.bottom - safeArea.top;
  const { data, info } = await image
    .extract({ left: safeArea.left, top: safeArea.top, width, height })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let totalWeight = 0;
  let weightedX = 0;
  let weightedY = 0;
  let activePixels = 0;

  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const offset = (y * info.width + x) * info.channels;
      const r = data[offset];
      const g = data[offset + 1];
      const b = data[offset + 2];
      const difference = Math.max(
        Math.abs(board.r - r),
        Math.abs(board.g - g),
        Math.abs(board.b - b),
      );
      if (difference < 28) continue;

      const saturation = Math.max(r, g, b) - Math.min(r, g, b);
      const weight = ((difference - 24) ** 1.35) * (1 + saturation / 1020);
      totalWeight += weight;
      weightedX += (x + safeArea.left) * weight;
      weightedY += (y + safeArea.top) * weight;
      activePixels += 1;
    }
  }

  if (totalWeight === 0) throw new Error(`No visible content found in ${scene.id}`);
  const centroid = { x: weightedX / totalWeight, y: weightedY / totalWeight };
  const offset = { x: centroid.x - target.x, y: centroid.y - target.y };
  return {
    sceneId: scene.id,
    chapter: scene.chapter,
    time,
    file: path.relative(projectRoot, file),
    centroid: { x: Number(centroid.x.toFixed(2)), y: Number(centroid.y.toFixed(2)) },
    offset: { x: Number(offset.x.toFixed(2)), y: Number(offset.y.toFixed(2)) },
    activePixels,
    pass: Math.abs(offset.x) <= limits.offsetX && Math.abs(offset.y) <= limits.offsetY,
  };
}

const samples = bodyScenes.map((scene) => ({ scene, time: sampleTime(scene) }));
await captureSnapshots(samples);

const files = (await readdir(snapshotDir))
  .filter((file) => /^frame-\d+-at-.*\.png$/.test(file))
  .sort((first, second) => frameNumber(first) - frameNumber(second));
if (files.length !== samples.length) {
  throw new Error(`Expected ${samples.length} snapshots, found ${files.length}`);
}

const results = [];
for (let index = 0; index < samples.length; index += 1) {
  const sample = samples[index];
  results.push(await analyzeSnapshot(
    path.join(snapshotDir, files[index]),
    sample.scene,
    sample.time,
  ));
}

const failures = results.filter((result) => !result.pass);
const report = {
  generatedAt: new Date().toISOString(),
  method: 'safe-area saliency-weighted pixel centroid',
  safeArea,
  target,
  limits,
  sampledScenes: results.length,
  passedScenes: results.length - failures.length,
  failedScenes: failures.length,
  results,
};
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);

for (const result of results) {
  console.log(`${result.pass ? 'PASS' : 'FAIL'} ${result.sceneId} @ ${result.time.toFixed(3)}s offset=(${result.offset.x}, ${result.offset.y})`);
}
console.log(`Visual balance: ${report.passedScenes}/${report.sampledScenes} scenes passed`);
console.log(`Report: ${reportPath}`);

if (failures.length > 0) {
  process.exitCode = 1;
}
