import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const projectFlag = args.indexOf('--project');

if (projectFlag < 0 || !args[projectFlag + 1]) {
  console.error('Usage: node scripts/ai-video-pipeline/validate-tiny-agent-longform-output.mjs --project <PROJECT_DIR>');
  process.exit(2);
}

const project = path.resolve(root, args[projectFlag + 1]);
const errors = [];

function fail(message) {
  errors.push(message);
}

function readJson(relativePath) {
  const file = path.join(project, relativePath);
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    fail(`${relativePath}: ${error.message}`);
    return {};
  }
}

function required(value, label) {
  if (value === undefined || value === null || value === '') {
    fail(`${label}: missing`);
    return false;
  }
  return true;
}

function inRange(value, range, label) {
  if (!required(value, label)) return;
  if (typeof value !== 'number' || value < range.min || value > range.max) {
    fail(`${label}: expected ${range.min}-${range.max}, received ${JSON.stringify(value)}`);
  }
}

function isTrue(value, label) {
  if (value !== true) fail(`${label}: expected true, received ${JSON.stringify(value)}`);
}

function sceneList(scenePlan) {
  return (scenePlan.chapters ?? []).flatMap((chapter) => chapter.scenes ?? []);
}

function assetName(entry) {
  return path.basename(entry.file ?? entry.path ?? entry.asset ?? '');
}

const profile = JSON.parse(
  fs.readFileSync(
    path.join(root, 'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json'),
    'utf8'
  )
);
const overrides = profile.postSnapshotUserOverrides ?? {};
const opening = overrides.openingQuestionReadability ?? {};
const recapRule = overrides.chapterRecapNarration?.screenCopy ?? {};
const alphaRule = overrides.generatedArtTransparency ?? {};
const scenePlan = readJson('scene-plan.json');
const timingMap = readJson('timing-map.json');
const openingReport = readJson('qa/retention-opening-report.json');
const recapReport = readJson('qa/recap-visual-copy-report.json');
const alphaReport = readJson('qa/generated-art-alpha-report.json');
const scenes = sceneList(scenePlan);
const recaps = scenes.filter((scene) => scene.type === 'recap');
const generated = scenes.filter((scene) => scene.temporaryGenerated || scene.generatedArt);
const forbiddenRecapMarker = /本章小节|Chapter\s+recap|^(?:第?[一二三]|First|Second|Third)[，、.:：]|^\s*[123][.、]/i;

if (recapRule.displayField !== 'recapDisplayText') {
  fail('active profile: recap screen-copy display field is not recapDisplayText');
}
if (recaps.length === 0) fail('scene-plan.json: no recap scenes');
for (const scene of recaps) {
  if (!required(scene.recapDisplayText, `scene ${scene.id} recapDisplayText`)) continue;
  if (forbiddenRecapMarker.test(scene.recapDisplayText.trim())) {
    fail(`scene ${scene.id} recapDisplayText contains a spoken-only marker: ${scene.recapDisplayText}`);
  }
  if (scene.recapDisplayText === scene.narration) {
    fail(`scene ${scene.id} recapDisplayText must be separate from narration`);
  }
}

isTrue(recapReport.pass, 'qa/recap-visual-copy-report.json pass');
isTrue(recapReport.renderedMarkerScanPass, 'qa/recap-visual-copy-report.json renderedMarkerScanPass');
const recapEvidence = recapReport.recaps ?? recapReport.scenes ?? [];
for (const scene of recaps) {
  const evidence = recapEvidence.find((item) => item.sceneId === scene.id);
  if (!evidence) {
    fail(`qa/recap-visual-copy-report.json: missing evidence for ${scene.id}`);
    continue;
  }
  required(evidence.narration, `recap evidence ${scene.id} narration`);
  required(evidence.recapDisplayText, `recap evidence ${scene.id} recapDisplayText`);
  if (evidence.recapDisplayText !== scene.recapDisplayText) {
    fail(`recap evidence ${scene.id}: recapDisplayText does not match scene plan`);
  }
  if (evidence.forbiddenMarkerCount !== 0 || evidence.numberedBulletPresent !== false) {
    fail(`recap evidence ${scene.id}: rendered marker or numbered bullet detected`);
  }
}

const hookTiming = timingMap.hookTiming ?? {};
if (hookTiming.earlyRevealCount !== opening.earlyRevealCount) {
  fail(`timing-map.json hookTiming.earlyRevealCount: expected ${opening.earlyRevealCount}, received ${JSON.stringify(hookTiming.earlyRevealCount)}`);
}
isTrue(openingReport.pass, 'qa/retention-opening-report.json pass');
if (openingReport.earlyRevealCount !== opening.earlyRevealCount) {
  fail(`opening report earlyRevealCount: expected ${opening.earlyRevealCount}, received ${JSON.stringify(openingReport.earlyRevealCount)}`);
}
inRange(openingReport.firstGlyphLeadMilliseconds, opening.firstGlyphLeadMilliseconds ?? {}, 'opening report firstGlyphLeadMilliseconds');
if (typeof openingReport.maximumPerGlyphLeadMilliseconds !== 'number' || openingReport.maximumPerGlyphLeadMilliseconds > opening.maximumPerGlyphLeadMilliseconds) {
  fail(`opening report maximumPerGlyphLeadMilliseconds: expected <= ${opening.maximumPerGlyphLeadMilliseconds}, received ${JSON.stringify(openingReport.maximumPerGlyphLeadMilliseconds)}`);
}
inRange(openingReport.fullQuestionReadLeadMilliseconds, opening.fullQuestionReadLeadMilliseconds ?? {}, 'opening report fullQuestionReadLeadMilliseconds');
inRange(openingReport.canvasGlyphCoveragePercent?.width, opening.canvasGlyphCoveragePercent?.width ?? {}, 'opening report canvasGlyphCoveragePercent.width');
inRange(openingReport.canvasGlyphCoveragePercent?.height, opening.canvasGlyphCoveragePercent?.height ?? {}, 'opening report canvasGlyphCoveragePercent.height');
isTrue(openingReport.agentFirstFrame?.visible, 'opening report agentFirstFrame.visible');
if (openingReport.agentFirstFrame?.position !== opening.agentReservation?.position) {
  fail(`opening report agentFirstFrame.position: expected ${opening.agentReservation?.position}, received ${JSON.stringify(openingReport.agentFirstFrame?.position)}`);
}
if ((openingReport.agentFirstFrame?.visibleHeightPx ?? 0) < (opening.agentReservation?.minimumVisibleHeightPx ?? 0)) {
  fail(`opening report agentFirstFrame.visibleHeightPx: expected >= ${opening.agentReservation?.minimumVisibleHeightPx}, received ${JSON.stringify(openingReport.agentFirstFrame?.visibleHeightPx)}`);
}
for (const [key, expected] of Object.entries({ progressRailPresent: false, leftBlueCirclePresent: false, voiceLabelPresent: false })) {
  if (openingReport.openingUi?.[key] !== expected) {
    fail(`opening report openingUi.${key}: expected ${expected}, received ${JSON.stringify(openingReport.openingUi?.[key])}`);
  }
}
try {
  const html = fs.readFileSync(path.join(project, 'index.html'), 'utf8');
  if (html.includes('id="hook-voice"')) fail('index.html: forbidden opening voice/progress UI remains in the DOM');
} catch (error) {
  fail(`index.html: ${error.message}`);
}

isTrue(alphaReport.pass, 'qa/generated-art-alpha-report.json pass');
isTrue(alphaReport.sharedGridComposition, 'qa/generated-art-alpha-report.json sharedGridComposition');
const alphaAssets = alphaReport.assets ?? [];
for (const scene of generated) {
  const name = path.basename(scene.generatedArt ?? '');
  const file = path.join(project, 'assets/generated/scene-art', name);
  if (!fs.existsSync(file)) {
    fail(`generated art ${scene.id}: missing ${name}`);
    continue;
  }
  const evidence = alphaAssets.find((item) => assetName(item) === name);
  if (!evidence) {
    fail(`qa/generated-art-alpha-report.json: missing evidence for ${name}`);
    continue;
  }
  isTrue(evidence.hasAlpha, `generated art ${name} hasAlpha`);
  for (const corner of ['topLeft', 'topRight', 'bottomLeft', 'bottomRight']) {
    if (evidence.cornerAlpha?.[corner] !== 0) {
      fail(`generated art ${name} ${corner} alpha: expected 0, received ${JSON.stringify(evidence.cornerAlpha?.[corner])}`);
    }
  }
  if (evidence.canvasEdgeBackgroundDetected !== false) {
    fail(`generated art ${name}: canvas-edge background was detected`);
  }
  if (!Array.isArray(evidence.sceneIds) || !evidence.sceneIds.includes(scene.id)) {
    fail(`generated art ${name}: evidence does not name scene ${scene.id}`);
  }
  try {
    const sips = execFileSync('sips', ['-g', 'hasAlpha', file], { encoding: 'utf8' });
    if (!/hasAlpha:\s+yes/.test(sips)) fail(`generated art ${name}: source file has no alpha channel`);
  } catch (error) {
    fail(`generated art ${name}: cannot inspect alpha channel (${error.message})`);
  }
}

if (errors.length > 0) {
  console.error(`Tiny Agent longform output validation failed for ${project}:`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Tiny Agent longform output validation passed: ${project}`);
