import fs from 'node:fs';
import path from 'node:path';
import {
  assertTinyAgentScenePlanAssets,
  loadTinyAgentAssetPack,
} from '../../../../scripts/ai-video-pipeline/hyperframes/tiny-agent-assets.mjs';

const root = path.dirname(new URL(import.meta.url).pathname);
const projects = ['a-kinetic-type', 'b-continuous-action', 'c-workflow-ui'];
const results = [];

for (const project of projects) {
  const projectRoot = path.join(root, project);
  const pack = loadTinyAgentAssetPack({ packRoot: path.join(projectRoot, 'assets/pack') });
  const plan = JSON.parse(fs.readFileSync(path.join(projectRoot, 'scene-plan.json'), 'utf8'));
  assertTinyAgentScenePlanAssets(plan, pack, { requireDirectionMetadata: true });
  results.push({ project, pack: pack.index.id, status: pack.index.status, assets: pack.index.assets, scenePlan: 'pass' });
}

console.log(JSON.stringify(results, null, 2));
