import { cp, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import {
  loadTinyAgentAssetPack,
  resolveActiveTinyAgentPackRoot,
} from './tiny-agent-assets.mjs';

function parseProjectArg(argv) {
  const index = argv.indexOf('--project');
  if (index === -1 || !argv[index + 1]) {
    throw new Error('Usage: node prepare-tiny-agent-assets.mjs --project <project-directory>');
  }
  return path.resolve(argv[index + 1]);
}

async function readExistingPackId(targetRoot) {
  try {
    const index = JSON.parse(await readFile(path.join(targetRoot, 'manifests/asset-pack.json'), 'utf8'));
    return index.id;
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

const projectRoot = parseProjectArg(process.argv.slice(2));
const targetRoot = path.join(projectRoot, 'assets/pack');
const { packRoot } = resolveActiveTinyAgentPackRoot();
const pack = loadTinyAgentAssetPack({ packRoot });
const existingId = await readExistingPackId(targetRoot);

if (existingId && existingId !== pack.index.id) {
  throw new Error(`Refusing to overwrite existing asset pack ${existingId} at ${targetRoot}`);
}

await mkdir(targetRoot, { recursive: true });
await cp(path.join(packRoot, 'manifests'), path.join(targetRoot, 'manifests'), { recursive: true, force: true });
await cp(path.join(packRoot, 'sprites'), path.join(targetRoot, 'sprites'), { recursive: true, force: true });

const prepared = loadTinyAgentAssetPack({ packRoot: targetRoot });
console.log(JSON.stringify({
  project: projectRoot,
  pack: prepared.index.id,
  assets: prepared.index.assets,
  target: targetRoot,
  status: prepared.index.status,
}));
