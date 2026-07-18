import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const tinyAgentAssetPacksRoot = path.join(moduleDir, 'asset-packs');
export const tinyAgentAssetRegistryPath = path.join(tinyAgentAssetPacksRoot, 'tiny-agent-active.json');

const kinds = ['human', 'agent', 'props'];
const directionalValues = new Set(['left', 'right', 'front']);

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, 'utf8'));
}

function assertWithinPack(packRoot, filePath) {
  const relativePath = path.relative(packRoot, filePath);
  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error(`Asset manifest path escapes pack root: ${filePath}`);
  }
}

export function readTinyAgentAssetRegistry(registryPath = tinyAgentAssetRegistryPath) {
  const registry = readJson(registryPath);
  if (!registry.active || !registry.fallback) {
    throw new Error(`Invalid Tiny Agent asset registry: ${registryPath}`);
  }
  return registry;
}

export function resolveActiveTinyAgentPackRoot({ registryPath = tinyAgentAssetRegistryPath } = {}) {
  const registry = readTinyAgentAssetRegistry(registryPath);
  const packRoot = path.join(path.dirname(registryPath), registry.active);
  if (!existsSync(packRoot)) throw new Error(`Active Tiny Agent asset pack is missing: ${packRoot}`);
  return { registry, packRoot };
}

export function loadTinyAgentAssetPack({ packRoot, requirePass = true } = {}) {
  const resolved = packRoot
    ? { registry: null, packRoot: path.resolve(packRoot) }
    : resolveActiveTinyAgentPackRoot();
  const indexPath = path.join(resolved.packRoot, 'manifests/asset-pack.json');
  const index = readJson(indexPath);

  if (requirePass && index.status !== 'pass') {
    throw new Error(`Tiny Agent asset pack ${index.id} has QA status ${index.status}`);
  }
  if (requirePass && index.activation && index.activation !== 'approved') {
    throw new Error(`Tiny Agent asset pack ${index.id} is not approved`);
  }

  const manifests = {};
  const maps = {};
  const ids = {};
  for (const kind of kinds) {
    const entry = index.manifests?.find((item) => item.id === kind);
    if (!entry) throw new Error(`Tiny Agent asset pack ${index.id} is missing ${kind} manifest`);
    const manifestPath = path.resolve(resolved.packRoot, entry.path);
    assertWithinPack(resolved.packRoot, manifestPath);
    const manifest = readJson(manifestPath);
    if (manifest.id !== kind || !Array.isArray(manifest.assets)) {
      throw new Error(`Invalid ${kind} manifest in Tiny Agent asset pack ${index.id}`);
    }
    manifests[kind] = manifest;
    maps[kind] = new Map(manifest.assets.map((asset) => [asset.id, asset]));
    ids[kind] = new Set(maps[kind].keys());
  }

  return {
    registry: resolved.registry,
    root: resolved.packRoot,
    index,
    manifests,
    maps,
    ids,
  };
}

export function tinyAgentAssetSrc(pack, kind, id, { baseUrl = 'assets/pack' } = {}) {
  if (!kinds.includes(kind)) throw new Error(`Unknown Tiny Agent asset kind: ${kind}`);
  const asset = pack.maps[kind].get(id);
  if (!asset) throw new Error(`Unknown Tiny Agent ${kind} asset: ${id}`);
  return `${baseUrl.replace(/\/$/, '')}/${asset.path}`;
}

export function selectTinyAgentPose(pack, { kind, action, direction = 'front', fallbackId = 'idle' }) {
  if (kind !== 'human' && kind !== 'agent') throw new Error(`Pose kind must be human or agent, got ${kind}`);
  if (!directionalValues.has(direction)) throw new Error(`Direction must be left, right, or front, got ${direction}`);
  const map = pack.maps[kind];
  const explicit = map.get(action);
  if (explicit && /-(left|right|front)$/.test(action) && explicit.direction !== direction) {
    throw new Error(`Explicit pose ${action} conflicts with requested ${direction} direction`);
  }

  const candidates = [];
  if (!/-(left|right|front)$/.test(action)) candidates.push(`${action}-${direction}`);
  candidates.push(action);
  if (direction !== 'front' && !/-(left|right|front)$/.test(action)) candidates.push(`${action}-front`);
  candidates.push(fallbackId);

  for (const id of [...new Set(candidates)]) {
    const asset = map.get(id);
    if (!asset) continue;
    if (id === fallbackId || asset.direction === direction || asset.direction === 'front') return asset;
  }
  throw new Error(`No ${kind} pose for action=${action}, direction=${direction}`);
}

function assertDirection(asset, expected, label) {
  if (expected == null) return;
  if (!directionalValues.has(expected)) throw new Error(`${label} direction must be left, right, or front`);
  if (asset.direction !== expected) {
    throw new Error(`${label} uses ${asset.id} (${asset.direction}) but scene requests ${expected}`);
  }
}

export function assertTinyAgentScenePlanAssets(scenePlan, pack, { requireDirectionMetadata = false } = {}) {
  const chapters = Array.isArray(scenePlan?.chapters) ? scenePlan.chapters : [];
  for (const [chapterIndex, chapter] of chapters.entries()) {
    for (const [sceneIndex, scene] of (chapter.scenes || []).entries()) {
      const label = `chapter ${chapterIndex + 1} scene ${sceneIndex + 1}`;
      const human = pack.maps.human.get(scene.human);
      const agent = pack.maps.agent.get(scene.agent);
      if (!human) throw new Error(`${label}: unknown human pose ${scene.human}`);
      if (!agent) throw new Error(`${label}: unknown agent pose ${scene.agent}`);

      if (requireDirectionMetadata && human.direction !== 'front' && !scene.humanDirection) {
        throw new Error(`${label}: directional human pose ${scene.human} requires humanDirection`);
      }
      if (requireDirectionMetadata && agent.direction !== 'front' && !scene.agentDirection) {
        throw new Error(`${label}: directional agent pose ${scene.agent} requires agentDirection`);
      }
      assertDirection(human, scene.humanDirection, `${label} human`);
      assertDirection(agent, scene.agentDirection, `${label} agent`);

      if (!Array.isArray(scene.props)) throw new Error(`${label}: props must be an array`);
      for (const prop of scene.props) {
        const id = typeof prop === 'string' ? prop : prop?.id;
        if (!pack.maps.props.has(id)) throw new Error(`${label}: unknown prop ${id}`);
      }
    }
  }
  return true;
}
