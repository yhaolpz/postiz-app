import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const qaDir = path.dirname(fileURLToPath(import.meta.url));
const projectDir = path.dirname(qaDir);
const scenePlan = JSON.parse(readFileSync(path.join(projectDir, 'scene-plan.json'), 'utf8'));
const animationPlan = JSON.parse(readFileSync(path.join(projectDir, 'animation-plan.json'), 'utf8'));
const scenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes).slice(0, -1);
const motionByScene = new Map(animationPlan.scenes.map((scene) => [scene.id, scene]));
const snapshotDir = path.join(projectDir, 'snapshots/transitions');
mkdirSync(snapshotDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(projectDir, 'index.html')).href, { waitUntil: 'load', timeout: 30000 });
let timelineReady = false;
for (let attempt = 0; attempt < 50; attempt += 1) {
  timelineReady = await page.evaluate(() => Boolean(window.__timelines && window.__timelines.main));
  if (timelineReady) break;
  await page.waitForTimeout(100);
}
if (!timelineReady) throw new Error('HyperFrames timeline did not register.');
await page.evaluate(async () => {
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 3000))]);
});

const sampleStates = async (times, previousId, incomingId) => page.evaluate(({ times: seekTimes, previousId: oldId, incomingId: newId }) => {
  const viewport = { left: 0, top: 0, right: 1920, bottom: 1080 };
  const describe = (id) => {
    const element = document.getElementById(`scene-${id}`);
    const content = element?.querySelector('.scene-content');
    const style = element ? getComputedStyle(element) : null;
    const contentStyle = content ? getComputedStyle(content) : null;
    const box = element?.getBoundingClientRect();
    const rect = box ? { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height } : null;
    const opacity = style ? Number(style.opacity) : 0;
    const contentOpacity = contentStyle ? Number(contentStyle.opacity) : 0;
    const visible = Boolean(style && style.visibility !== 'hidden' && opacity > 0.01 && rect && rect.right > viewport.left && rect.left < viewport.right && rect.bottom > viewport.top && rect.top < viewport.bottom);
    return {
      id,
      visible,
      opacity,
      contentVisible: visible && contentStyle?.visibility !== 'hidden' && contentOpacity > 0.05,
      contentOpacity,
      zIndex: style ? Number.parseInt(style.zIndex, 10) || 0 : 0,
      backgroundColor: style?.backgroundColor || null,
      clipPath: style?.clipPath || null,
      rect
    };
  };
  return seekTimes.map((seekTime) => {
    window.__timelines.main.seek(seekTime, false).pause();
    return {
      time: seekTime,
      previous: describe(oldId),
      incoming: describe(newId)
    };
  });
}, { times, previousId, incomingId });

const intersectionArea = (a, b) => {
  if (!a || !b) return 0;
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
    * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
};

const boundaryReports = [];
const capturedTypes = new Set();
for (let index = 1; index < scenes.length; index += 1) {
  const previous = scenes[index - 1];
  const incoming = scenes[index];
  const metadata = motionByScene.get(incoming.id);
  if (!metadata) throw new Error(`Missing transition metadata for ${incoming.id}.`);
  const start = incoming.start;
  const duration = metadata.transition.duration;
  const end = start + duration;
  const times = [...new Set([
    Math.max(0, start - 1 / 30),
    start,
    duration ? start + duration / 2 : start + 1 / 60,
    end,
    end + 1 / 30
  ].map((value) => Number(value.toFixed(4))))];
  const samples = await sampleStates(times, previous.id, incoming.id);

  let contentOverlapCount = 0;
  let staleSceneVisibleCount = 0;
  let blankFrameCount = 0;
  let zIndexFailureCount = 0;
  let prematureEntranceCount = 0;
  for (const sample of samples) {
    const activeTransition = sample.time >= start && sample.time < end - 1 / 60;
    if (sample.time > end + 1 / 60 && sample.previous.visible) staleSceneVisibleCount += 1;
    if (!sample.previous.contentVisible && !sample.incoming.contentVisible) blankFrameCount += 1;
    if (activeTransition && sample.previous.visible && sample.incoming.visible && sample.incoming.zIndex <= sample.previous.zIndex) zIndexFailureCount += 1;
    if (sample.time < metadata.entranceAt - 1 / 60 && sample.incoming.contentVisible) prematureEntranceCount += 1;
    if (activeTransition && ['horizontal-push', 'chapter-vertical-push'].includes(metadata.transition.type)) {
      const overlapArea = intersectionArea(sample.previous.rect, sample.incoming.rect);
      if (overlapArea > 4) contentOverlapCount += 1;
    }
    if (activeTransition && metadata.transition.type === 'paper-mask') {
      const opaquePaper = sample.incoming.backgroundColor === 'rgb(236, 236, 234)';
      const clipped = sample.incoming.clipPath && sample.incoming.clipPath !== 'none';
      if (!opaquePaper || !clipped) contentOverlapCount += 1;
    }
  }

  if (duration && !capturedTypes.has(metadata.transition.type)) {
    capturedTypes.add(metadata.transition.type);
  }

  boundaryReports.push({
    fromSceneId: previous.id,
    toSceneId: incoming.id,
    start,
    end: Number(end.toFixed(3)),
    transition: metadata.transition,
    entranceType: metadata.entranceType,
    entranceAt: metadata.entranceAt,
    contentOverlapCount,
    staleSceneVisibleCount,
    blankFrameCount,
    zIndexFailureCount,
    prematureEntranceCount,
    samples
  });
}

await browser.close();

const sum = (field) => boundaryReports.reduce((total, boundary) => total + boundary[field], 0);
const report = {
  pass: boundaryReports.every((boundary) => [
    boundary.contentOverlapCount,
    boundary.staleSceneVisibleCount,
    boundary.blankFrameCount,
    boundary.zIndexFailureCount,
    boundary.prematureEntranceCount
  ].every((value) => value === 0)),
  checkedAt: new Date().toISOString(),
  transitionCount: boundaryReports.length,
  sampledFrameCount: boundaryReports.reduce((total, boundary) => total + boundary.samples.length, 0),
  contentOverlapCount: sum('contentOverlapCount'),
  staleSceneVisibleCount: sum('staleSceneVisibleCount'),
  blankFrameCount: sum('blankFrameCount'),
  zIndexFailureCount: sum('zIndexFailureCount'),
  prematureEntranceCount: sum('prematureEntranceCount'),
  capturedTransitionTypes: [...capturedTypes],
  boundaries: boundaryReports
};

writeFileSync(path.join(qaDir, 'transitions-report.json'), `${JSON.stringify(report, null, 2)}\n`);
if (!report.pass) {
  process.stderr.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
}
process.stdout.write(`transitions: pass (${report.transitionCount} boundaries, ${report.sampledFrameCount} sampled frames)\n`);
