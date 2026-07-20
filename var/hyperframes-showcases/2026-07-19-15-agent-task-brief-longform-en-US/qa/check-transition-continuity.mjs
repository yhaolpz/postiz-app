import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const story = await readFile(path.join(projectRoot, 'compositions/story.html'), 'utf8');
const timingMap = JSON.parse(await readFile(path.join(projectRoot, 'timing-map.json'), 'utf8'));
const reportPath = path.join(projectRoot, 'qa/transition-continuity-report.json');
const lines = story.split('\n');
const results = [];

function timelineTime(line) {
  const match = line.match(/,\s*([0-9.]+)\);\s*$/);
  if (!match) throw new Error(`Unable to read timeline time: ${line.trim()}`);
  return Number(match[1]);
}

function findLine(fragment) {
  return lines.find((line) => line.includes(fragment));
}

for (const scene of timingMap.scenes.filter((item) => item.transition)) {
  const sceneResult = { id: scene.id, contentRevealAt: scene.transition.contentRevealAt, actors: [] };
  for (const actor of ['human', 'agent']) {
    const selector = `#v2-phase-${scene.id} .${actor}-actor`;
    const setLine = findLine(`tl.set("${selector}"`);
    const toLine = findLine(`tl.to("${selector}"`);
    const fromToLine = findLine(`tl.fromTo("${selector}"`);
    if (!setLine || !toLine) throw new Error(`Missing primed transition for ${selector}`);
    if (fromToLine) throw new Error(`Delayed fromTo can expose the final actor state before entrance: ${selector}`);

    const setAt = timelineTime(setLine);
    const moveAt = timelineTime(toLine);
    const expectedMoveAt = actor === 'human' ? scene.transition.humanAt : scene.transition.agentAt;
    const lead = scene.transition.contentRevealAt - setAt;
    const moveDelay = moveAt - scene.transition.contentRevealAt;
    const pass = setAt <= scene.transition.contentRevealAt + 0.001
      && lead >= -0.001
      && lead <= 0.021
      && Math.abs(moveAt - expectedMoveAt) <= 0.001
      && moveDelay >= -0.001
      && moveDelay <= 0.21
      && setLine.includes('opacity: 0')
      && toLine.includes('opacity: 1')
      && !setLine.includes('scale:')
      && !toLine.includes('scale:');

    sceneResult.actors.push({ actor, setAt, moveAt, lead, moveDelay, pass });
    if (!pass) throw new Error(`Transition continuity failed for ${selector}`);
  }
  results.push(sceneResult);
}

const report = {
  policy: 'prime-before-reveal-v1',
  scenes: results.length,
  actors: results.length * 2,
  delayedActorFromTo: 0,
  failedActors: results.flatMap((scene) => scene.actors).filter((actor) => !actor.pass).length,
  sceneResults: results,
};

await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Transition continuity: ${report.actors}/${report.actors} actor entrances primed before reveal\n`);
process.stdout.write('Delayed actor fromTo: 0\n');
