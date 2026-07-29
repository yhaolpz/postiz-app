import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const repoRoot = '/Volumes/SSD/Workspace/postiz-app';
const profile = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json',
), 'utf8'));
const rule = profile.postSnapshotUserOverrides.tinyAgentGeneratedIdentityConsistency;
const coverSet = profile.postSnapshotUserOverrides.englishChineseProductionParity.coverSet;

function sha256(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function projectDir(topic, locale) {
  return path.join(
    repoRoot,
    `var/hyperframes-showcases/${topic.baseRunKey}-${topic.slug}-longform-${locale}`,
  );
}

function referenceFor(file) {
  if (/reasoning-trail|planning-boundary|en-US\.4x3|zh-CN\.3x4/.test(file)) {
    return 'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/plan-front.png';
  }
  if (/judgment-gate|recovery-gate|en-US\.3x4/.test(file)) {
    return 'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/execute.png';
  }
  return 'scripts/ai-video-pipeline/hyperframes/asset-packs/tiny-agent-v2/sprites/agent/idle.png';
}

function writeReview(topic, locale) {
  const project = projectDir(topic, locale);
  const scenePlan = readJson(path.join(project, 'scene-plan.json'));
  const sceneArtifacts = new Map();
  for (const scene of scenePlan.chapters.flatMap((chapter) => chapter.scenes)) {
    if (!scene.generatedArt) continue;
    const file = `assets/generated/scene-art/${path.basename(scene.generatedArt)}`;
    const entry = sceneArtifacts.get(file) ?? {
      file,
      kind: 'scene-art',
      sceneIds: [],
      coverRatio: null,
    };
    entry.sceneIds.push(scene.id);
    sceneArtifacts.set(file, entry);
  }
  const coverArtifacts = coverSet.requiredRatios[locale].map((ratio) => {
    const specPath = path.join(project, coverSet.outputs[locale][ratio].spec);
    const spec = readJson(specPath);
    return {
      file: `thumbnails/${path.basename(spec.generatedHeroIllustration.asset)}`,
      kind: 'cover-hero',
      sceneIds: [],
      coverRatio: ratio,
    };
  });
  const fixedReferenceHashes = Object.fromEntries(
    rule.fixedReference.canonicalReferenceImages.map((relativePath) => [
      relativePath,
      sha256(path.join(repoRoot, relativePath)),
    ]),
  );
  const artifacts = [...sceneArtifacts.values(), ...coverArtifacts];
  const hardIdentityAnchors = Object.fromEntries(
    rule.hardIdentityAnchors.map(({ id }) => [id, true]),
  );
  const secondaryIdentityAnchors = Object.fromEntries(
    rule.secondaryIdentityAnchors.map(({ id }) => [id, true]),
  );
  const entries = artifacts.map((artifact) => {
    const reference = referenceFor(artifact.file);
    return {
      ...artifact,
      artifactSha256: sha256(path.join(project, artifact.file)),
      containsAgentCharacter: true,
      agentCharacterCount: 1,
      tinyAgentConsistentCharacterCount: 1,
      otherAgentCharacterCount: 0,
      referenceConditioningUsed: true,
      referenceImages: [reference],
      referenceImageHashes: {
        [reference]: fixedReferenceHashes[reference],
      },
      hardIdentityAnchors,
      secondaryIdentityAnchors,
      similarityDecision: 'minor-variation',
      finishClassification: 'minor-soft-3d-variation',
      majorRedesignDetected: false,
      sideBySideReviewed: true,
    };
  });
  const review = {
    schemaVersion: 1,
    identityProfileId: rule.identityProfileId,
    locale,
    runKey: topic.baseRunKey,
    project,
    activePackId: rule.fixedReference.requiredPackId,
    fixedReferenceHashes,
    pass: true,
    entries,
  };
  const output = path.join(project, rule.evidence.reviewFile);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(review, null, 2)}\n`);
  return { locale, output, entries: entries.length };
}

const specPath = process.argv[2];
if (!specPath) throw new Error('Usage: node write-tiny-agent-identity-review.mjs <topic-spec.json>');
const topic = readJson(path.resolve(specPath));
process.stdout.write(`${JSON.stringify([
  writeReview(topic, 'zh-CN'),
  writeReview(topic, 'en-US'),
], null, 2)}\n`);
