import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async (file) => JSON.parse(await readFile(path.join(projectRoot, file), 'utf8'));

const [utteranceReport, timingMap, scenePlan, titleIdentity, summary, indexHtml] = await Promise.all([
  readJson('qa/utterance-timing-report.json'),
  readJson('timing-map.json'),
  readJson('scene-plan.json'),
  readJson('qa/title-identity-report.json'),
  readJson('summary.json'),
  readFile(path.join(projectRoot, 'index.html'), 'utf8'),
]);

const opening = utteranceReport.chapters[0].utterances;
const findUtterance = (...needles) => opening.find((item) => needles.some((needle) => item.text.includes(needle)));
const firstSentence = opening[0];
const authority = findUtterance('Anthropic');
const promise = findUtterance('You will learn', '接下来你会学会');
const artifact = findUtterance('six-part high-signal context pack', '六部分高信号上下文包');
const bodyScenes = scenePlan.chapters.flatMap((chapter) => chapter.scenes).filter((scene) => !scene.recap);
const maximumProps = Math.max(...bodyScenes.map((scene) => scene.props.length));
const maximumGap = Number(utteranceReport.maximumInterUtteranceGap);
const cta = timingMap.fixedCta;

const checks = {
  openingCoverStartsAtFrameZero: /id="opening-cover"/.test(indexHtml) && /opacity: 1 \}, 0\)/.test(indexHtml),
  openingCoverHardCutsAtPointEightSeconds: /opacity: 0 \}, 0\.8\)/.test(indexHtml),
  firstSentenceEndsByFiveSeconds: firstSentence?.spokenEnd <= 5,
  authorityStartsByTwelveSeconds: authority?.spokenStart <= 12,
  benefitPromiseStartsByTwentySeconds: promise?.spokenStart <= 20,
  reusableArtifactStartsBeforeThirtySeconds: artifact?.spokenStart < 30,
  maximumInterUtteranceGapAtMostPointFourFive: maximumGap <= 0.45,
  maximumTwoCorePropsPerBodyScene: maximumProps <= 2,
  oneActiveCharacterPolicy: scenePlan.retentionPolicy?.activeCharactersPerBodyScene === 1,
  agentFrameHeightAtLeastFiveHundred: scenePlan.retentionPolicy?.minimumAgentFrameHeight >= 500,
  captionFontAtLeastFortySix: /\.caption \{[^}]*font-size:46px/.test(indexHtml),
  titleIdentityPasses: titleIdentity.pass === true,
  fixedCtaFrameAligned: cta.frameErrorSeconds <= 1 / 30,
  tailBetweenPointOneFiveAndPointThreeFive: cta.tailSeconds >= 0.15 && cta.tailSeconds <= 0.35,
  longformDimensionsAndFrameRate: summary.composition.width === 1920 && summary.composition.height === 1080 && summary.composition.fps === 30,
  durationWithinFiveToTwelveMinutes: summary.composition.durationSeconds >= 300 && summary.composition.durationSeconds <= 720,
};

const failed = Object.entries(checks).filter(([, pass]) => !pass).map(([name]) => name);
const report = {
  generatedAt: new Date().toISOString(),
  policy: 'retention-v2-local-regeneration',
  pass: failed.length === 0,
  checkpoints: {
    firstSentenceEnd: firstSentence?.spokenEnd,
    authorityStart: authority?.spokenStart,
    benefitPromiseStart: promise?.spokenStart,
    reusableArtifactStart: artifact?.spokenStart,
    maximumInterUtteranceGap: maximumGap,
    maximumPropsPerBodyScene: maximumProps,
    fixedCtaStart: cta.start,
    tailSeconds: cta.tailSeconds,
  },
  checks,
  failed,
};

await writeFile(path.join(projectRoot, 'qa/retention-v2-report.json'), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
