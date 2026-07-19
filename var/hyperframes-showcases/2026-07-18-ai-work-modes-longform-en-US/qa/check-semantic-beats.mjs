import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const timingMap = JSON.parse(await readFile(path.join(projectRoot, 'timing-map.json'), 'utf8'));
const semanticReport = JSON.parse(await readFile(path.join(projectRoot, 'qa/semantic-beat-report.json'), 'utf8'));
const titleReport = JSON.parse(await readFile(path.join(projectRoot, 'qa/title-content-report.json'), 'utf8'));

const failures = [];
if (semanticReport.fallbackBeats !== 0) failures.push('semantic fallback beats must be zero');
if (titleReport.failedScenes !== 0) failures.push(`${titleReport.failedScenes} scenes enter the title lane`);

for (const scene of timingMap.scenes.filter((item) => item.semanticBeats.length > 0)) {
  const assignedProps = scene.semanticBeats.flatMap((beat) => beat.props);
  if (new Set(assignedProps).size !== assignedProps.length) {
    failures.push(`${scene.id} assigns a prop more than once`);
  }
  for (const beat of scene.semanticBeats) {
    if (beat.time < scene.start || beat.time >= scene.end) failures.push(`${scene.id} has a beat outside its scene`);
    if (scene.end - beat.time < 1) failures.push(`${scene.id} beat "${beat.trigger}" has less than one second hold time`);
  }
}

console.log(`Semantic beats: ${semanticReport.props} props in ${semanticReport.beats} narrated beats across ${semanticReport.scenes} scenes`);
console.log(`Fallback beats: ${semanticReport.fallbackBeats}`);
console.log(`Title lane: ${titleReport.scenes - titleReport.failedScenes}/${titleReport.scenes} scenes passed`);
if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL ${failure}`));
  process.exitCode = 1;
} else {
  console.log('Semantic timing and title separation passed');
}
