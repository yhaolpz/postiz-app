import { execFileSync } from 'node:child_process';
import { existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentAssets, humanAssets } from '../catalog.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(toolsDir, '..');
const chromaHelper = '/Users/bytedance/.codex/skills/.system/imagegen/scripts/remove_chroma_key.py';
const allowAvailableOnly = process.argv.includes('--available');
const requestedSets = new Set(process.argv.slice(2).filter((value) => value !== '--available'));

const sets = [
  {
    id: 'human',
    assets: humanAssets,
    canvas: { width: 512, height: 512 },
    registration: { x: 256, y: 472 },
    maxBounds: { width: 420, height: 420 }
  },
  {
    id: 'agent',
    assets: agentAssets,
    canvas: { width: 384, height: 512 },
    registration: { x: 192, y: 456 },
    maxBounds: { width: 330, height: 360 }
  }
];

function run(command, args) {
  return execFileSync(command, args, { encoding: 'utf8' }).trim();
}

for (const set of sets.filter((item) => requestedSets.size === 0 || requestedSets.has(item.id))) {
  for (const asset of set.assets.filter((item) => item.source === 'generated')) {
    const rawPath = join(rootDir, 'raw', set.id, `${asset.id}-chroma.png`);
    const alphaPath = join(rootDir, 'raw', set.id, `${asset.id}-alpha.png`);
    const trimPath = join(rootDir, 'raw', set.id, `${asset.id}-trim.png`);
    const outPath = join(rootDir, 'sprites', set.id, `${asset.id}.png`);

    if (!existsSync(rawPath)) {
      if (allowAvailableOnly) continue;
      throw new Error(`Missing generated source: ${rawPath}`);
    }

    run('python3', [
      chromaHelper,
      '--input', rawPath,
      '--out', alphaPath,
      '--auto-key', 'border',
      '--soft-matte',
      '--transparent-threshold', '12',
      '--opaque-threshold', '220',
      '--despill',
      '--force'
    ]);

    run('magick', [
      alphaPath,
      '-trim',
      '+repage',
      '-resize', `${set.maxBounds.width}x${set.maxBounds.height}>`,
      trimPath
    ]);

    const [width, height] = run('magick', [
      'identify', '-ping', '-format', '%w|%h', trimPath
    ]).split('|').map(Number);
    const x = Math.round(set.registration.x - width / 2);
    const y = Math.round(set.registration.y - height);

    run('magick', [
      '-size', `${set.canvas.width}x${set.canvas.height}`,
      'xc:none',
      trimPath,
      '-geometry', `+${x}+${y}`,
      '-composite',
      '-colorspace', 'sRGB',
      outPath
    ]);

    unlinkSync(trimPath);
    console.log(`normalized ${set.id}/${asset.id}.png`);
  }
}
