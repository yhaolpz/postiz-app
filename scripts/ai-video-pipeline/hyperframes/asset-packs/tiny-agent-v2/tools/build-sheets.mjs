import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentAssets, humanAssets, propAssets } from '../catalog.mjs';

const toolsDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(toolsDir, '..');
const requestedSets = new Set(process.argv.slice(2));
const sets = [
  { id: 'human', assets: humanAssets, width: 512, height: 512, columns: 5, rows: 6, preview: 260 },
  { id: 'agent', assets: agentAssets, width: 384, height: 512, columns: 5, rows: 8, preview: 240 },
  { id: 'props', assets: propAssets, width: 320, height: 320, columns: 10, rows: 8, preview: 210 }
];

for (const set of sets.filter((item) => requestedSets.size === 0 || requestedSets.has(item.id))) {
  const files = set.assets.map((asset) => join(rootDir, 'sprites', set.id, `${asset.id}.png`));
  execFileSync('magick', [
    'montage',
    '-font', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '+label',
    ...files,
    '-tile', `${set.columns}x${set.rows}`,
    '-geometry', `${set.width}x${set.height}+0+0`,
    '-background', 'none',
    join(rootDir, 'sprites', `${set.id}-sprite.png`)
  ], { encoding: 'utf8' });

  const labeledInputs = [];
  for (let index = 0; index < files.length; index += 1) {
    labeledInputs.push('-label', `${set.assets[index].id}\n${set.assets[index].zhName}`, files[index]);
  }
  execFileSync('magick', [
    'montage',
    '-font', '/System/Library/Fonts/Supplemental/Arial Unicode.ttf',
    '-pointsize', '18',
    '-fill', '#28333a',
    ...labeledInputs,
    '-tile', `${set.columns}x${set.rows}`,
    '-thumbnail', `${set.preview}x${set.preview}`,
    '-geometry', `${set.preview}x${set.preview}+18+42`,
    '-background', '#f6f8fb',
    join(rootDir, 'qa', `${set.id}-contact-sheet.png`)
  ], { encoding: 'utf8' });
  console.log(`built ${set.id} sprite and contact sheets`);
}
