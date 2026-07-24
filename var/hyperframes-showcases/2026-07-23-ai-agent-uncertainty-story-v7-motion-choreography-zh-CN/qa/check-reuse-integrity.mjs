import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const sourceProjectDir = path.resolve(projectDir, '../2026-07-23-ai-agent-uncertainty-story-v6-semantic-motion-zh-CN');

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function filesUnder(root, relative = '') {
  const dir = path.join(root, relative);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const child = path.join(relative, name);
      return statSync(path.join(root, child)).isDirectory() ? filesUnder(root, child) : [child];
    });
}

function compareFile(relative) {
  const source = path.join(sourceProjectDir, relative);
  const current = path.join(projectDir, relative);
  const sourceExists = existsSync(source);
  const currentExists = existsSync(current);
  const sourceSha256 = sourceExists ? sha256(source) : null;
  const currentSha256 = currentExists ? sha256(current) : null;
  return {
    relative,
    sourceExists,
    currentExists,
    sourceSha256,
    currentSha256,
    identical: sourceExists && currentExists && sourceSha256 === currentSha256
  };
}

function compareTree(relative) {
  const sourceFiles = filesUnder(sourceProjectDir, relative);
  const currentFiles = filesUnder(projectDir, relative);
  const allFiles = [...new Set([...sourceFiles, ...currentFiles])].sort();
  const files = allFiles.map(compareFile);
  return {
    relative,
    sourceFileCount: sourceFiles.length,
    currentFileCount: currentFiles.length,
    mismatchCount: files.filter((file) => !file.identical).length,
    identical: sourceFiles.length === currentFiles.length && files.every((file) => file.identical),
    files
  };
}

function sceneTiming(project) {
  const plan = JSON.parse(readFileSync(path.join(project, 'scene-plan.json'), 'utf8'));
  return plan.chapters.flatMap((chapter) => chapter.scenes).map(({ id, start, end }) => ({ id, start, end }));
}

const files = [
  'SCRIPT.zh-CN.md',
  'source.md',
  'content-map.json',
  'timing-map.json',
  'audio/narration.mp3',
  'audio/narration.zh-CN.mp3',
  'captions/cues.json',
  'captions/narration.vtt'
].map(compareFile);
const trees = [
  'audio/segments',
  'captions/segments',
  'assets/generated/scene-art'
].map(compareTree);
const sourceSceneTiming = sceneTiming(sourceProjectDir);
const currentSceneTiming = sceneTiming(projectDir);
const sceneTimingIdentical = JSON.stringify(sourceSceneTiming) === JSON.stringify(currentSceneTiming);
const pass = files.every((file) => file.identical)
  && trees.every((tree) => tree.identical)
  && sceneTimingIdentical;

const report = {
  pass,
  comparisonPurpose: 'V7 changes only scene transitions and motion choreography.',
  sourceProject: path.relative(projectDir, sourceProjectDir),
  currentProject: path.basename(projectDir),
  files,
  trees,
  sceneTiming: {
    identical: sceneTimingIdentical,
    sourceSceneCount: sourceSceneTiming.length,
    currentSceneCount: currentSceneTiming.length
  }
};

writeFileSync(path.join(qaDir, 'reuse-integrity-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!pass) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`reuse-integrity: pass (${files.length} files, ${trees.reduce((sum, tree) => sum + tree.currentFileCount, 0)} reused tree assets, ${currentSceneTiming.length} scene timings)\n`);
