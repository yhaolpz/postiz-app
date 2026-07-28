#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const activeProfile = JSON.parse(fs.readFileSync(path.join(
  repoRoot,
  'scripts/ai-video-pipeline/style-guides/tiny-agent-longform-active-profile.zh-CN.json',
), 'utf8'));
const rule = activeProfile.postSnapshotUserOverrides
  ?.tinyAgentGeneratedIdentityConsistency ?? {};
const coverSet = activeProfile.postSnapshotUserOverrides
  ?.englishChineseProductionParity
  ?.coverSet ?? {};

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    if (key === 'self-test') {
      args[key] = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function projectRunKey(projectDir) {
  return projectDir.match(/\b(\d{4}-\d{2}-\d{2}-03)\b/)?.[1] ?? null;
}

function appliesToRun(runKey) {
  return typeof runKey === 'string'
    && runKey.localeCompare(rule.effectiveFromRunKey ?? '9999-99-99-99') >= 0;
}

function sceneList(scenePlan) {
  return (scenePlan.chapters ?? []).flatMap((chapter) => chapter.scenes ?? []);
}

function normalizedRelativePath(value) {
  return String(value ?? '').replaceAll('\\', '/').replace(/^\.\/+/, '');
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function expectedArtifacts(projectDir, locale) {
  const scenePlan = readJson(path.join(projectDir, 'scene-plan.json'));
  const sceneAssets = new Map();
  for (const scene of sceneList(scenePlan)) {
    if (!(scene.temporaryGenerated || scene.generatedArt) || !scene.generatedArt) continue;
    const file = `assets/generated/scene-art/${path.basename(scene.generatedArt)}`;
    const existing = sceneAssets.get(file) ?? {
      file,
      kind: 'scene-art',
      sceneIds: [],
      coverRatio: null,
      mustContainAgent: false,
    };
    existing.sceneIds.push(scene.id);
    sceneAssets.set(file, existing);
  }

  const coverArtifacts = [];
  for (const ratio of coverSet.requiredRatios?.[locale] ?? []) {
    const specRelativePath = coverSet.outputs?.[locale]?.[ratio]?.spec;
    if (!specRelativePath) {
      throw new Error(`active cover set does not declare ${locale}/${ratio} spec`);
    }
    const spec = readJson(path.join(projectDir, specRelativePath));
    const heroAsset = spec.generatedHeroIllustration?.asset;
    if (typeof heroAsset !== 'string' || !heroAsset.trim()) {
      throw new Error(`${specRelativePath} does not declare generatedHeroIllustration.asset`);
    }
    coverArtifacts.push({
      file: `thumbnails/${path.basename(heroAsset)}`,
      kind: 'cover-hero',
      sceneIds: [],
      coverRatio: ratio,
      mustContainAgent: true,
      specFile: specRelativePath,
    });
  }

  return [...sceneAssets.values(), ...coverArtifacts].map((artifact) => {
    const absolutePath = path.join(projectDir, artifact.file);
    const buffer = fs.readFileSync(absolutePath);
    return {
      ...artifact,
      sceneIds: [...new Set(artifact.sceneIds)],
      sha256: sha256(buffer),
      sizeBytes: buffer.length,
    };
  });
}

function referenceHashes() {
  const entries = {};
  for (const relativePath of rule.fixedReference?.canonicalReferenceImages ?? []) {
    entries[relativePath] = sha256(fs.readFileSync(path.join(repoRoot, relativePath)));
  }
  return entries;
}

function evaluateReview({
  review,
  expected,
  fixedReferenceHashes,
  locale,
  projectDir,
  runKey,
}) {
  const failures = [];
  const check = (name, pass, detail = null) => {
    if (!pass) failures.push({ name, detail });
    return pass;
  };
  const reviewEntries = Array.isArray(review.entries) ? review.entries : [];
  const expectedFiles = expected.map(({ file }) => file).sort();
  const reviewedFiles = reviewEntries
    .map(({ file }) => normalizedRelativePath(file))
    .sort();
  const hardAnchorIds = (rule.hardIdentityAnchors ?? []).map(({ id }) => id);
  const secondaryAnchorIds = (rule.secondaryIdentityAnchors ?? []).map(({ id }) => id);
  const allowedSimilarity = new Set(rule.evidence?.requiredSimilarityDecisions ?? []);
  const allowedFinishes = new Set(rule.evidence?.allowedFinishClassifications ?? []);
  const allowedReferencePaths = new Set(Object.keys(fixedReferenceHashes));
  const entryResults = [];

  check('reviewContract', review.schemaVersion === 1
    && review.identityProfileId === rule.identityProfileId
    && review.locale === locale
    && review.runKey === runKey
    && path.resolve(review.project ?? '') === projectDir
    && review.pass === true);
  check('activePackIdentity', review.activePackId === rule.fixedReference?.requiredPackId);
  check(
    'fixedReferenceHashes',
    Object.entries(fixedReferenceHashes).every(([file, hash]) => (
      review.fixedReferenceHashes?.[file] === hash
    )),
  );
  check(
    'artifactCoverage',
    JSON.stringify(reviewedFiles) === JSON.stringify(expectedFiles),
    { expectedFiles, reviewedFiles },
  );

  for (const artifact of expected) {
    const matching = reviewEntries.filter((entry) => (
      normalizedRelativePath(entry.file) === artifact.file
    ));
    const entry = matching[0] ?? {};
    const containsAgent = entry.containsAgentCharacter === true;
    const referenceImages = Array.isArray(entry.referenceImages)
      ? entry.referenceImages.map(normalizedRelativePath)
      : [];
    const referenceImageHashesMatch = referenceImages.length > 0
      && referenceImages.every((referencePath) => (
        allowedReferencePaths.has(referencePath)
        && entry.referenceImageHashes?.[referencePath] === fixedReferenceHashes[referencePath]
      ));
    const hardAnchorsPass = hardAnchorIds.length > 0
      && hardAnchorIds.every((id) => entry.hardIdentityAnchors?.[id] === true);
    const secondaryMatchCount = secondaryAnchorIds.filter(
      (id) => entry.secondaryIdentityAnchors?.[id] === true,
    ).length;
    const agentCountsPass = Number.isInteger(entry.agentCharacterCount)
      && entry.agentCharacterCount >= 1
      && entry.tinyAgentConsistentCharacterCount === entry.agentCharacterCount
      && entry.otherAgentCharacterCount === 0;
    const noAgentCountsPass = entry.agentCharacterCount === 0
      && entry.tinyAgentConsistentCharacterCount === 0
      && entry.otherAgentCharacterCount === 0;
    const checks = {
      exactlyOneReviewEntry: matching.length === 1,
      artifactHash: entry.artifactSha256 === artifact.sha256,
      kindAndBinding: entry.kind === artifact.kind
        && (artifact.kind !== 'cover-hero' || entry.coverRatio === artifact.coverRatio)
        && (artifact.kind !== 'scene-art'
          || JSON.stringify([...(entry.sceneIds ?? [])].sort())
            === JSON.stringify([...artifact.sceneIds].sort())),
      containsRequiredAgent: !artifact.mustContainAgent || containsAgent,
      noAgentDeclaration: containsAgent || noAgentCountsPass,
      referenceConditioning: !containsAgent || (
        entry.referenceConditioningUsed === true
        && referenceImageHashesMatch
      ),
      allAgentsUseTinyAgentIdentity: !containsAgent || agentCountsPass,
      hardIdentityAnchors: !containsAgent || hardAnchorsPass,
      secondaryIdentityAnchors: !containsAgent
        || secondaryMatchCount >= rule.minimumSecondaryAnchorMatches,
      approvedSimilarity: !containsAgent || allowedSimilarity.has(entry.similarityDecision),
      approvedFinish: !containsAgent || allowedFinishes.has(entry.finishClassification),
      noMajorRedesign: !containsAgent || entry.majorRedesignDetected === false,
      sideBySideReview: !containsAgent || entry.sideBySideReviewed === true,
    };
    const pass = Object.values(checks).every(Boolean);
    if (!pass) failures.push({
      name: `asset:${artifact.file}`,
      detail: checks,
    });
    entryResults.push({
      file: artifact.file,
      kind: artifact.kind,
      coverRatio: artifact.coverRatio,
      sceneIds: artifact.sceneIds,
      pass,
      checks,
      evidence: {
        containsAgentCharacter: entry.containsAgentCharacter ?? null,
        agentCharacterCount: entry.agentCharacterCount ?? null,
        tinyAgentConsistentCharacterCount:
          entry.tinyAgentConsistentCharacterCount ?? null,
        otherAgentCharacterCount: entry.otherAgentCharacterCount ?? null,
        referenceImages,
        similarityDecision: entry.similarityDecision ?? null,
        finishClassification: entry.finishClassification ?? null,
        secondaryAnchorMatchCount: secondaryMatchCount,
      },
    });
  }

  return {
    version: 1,
    contractProfileId: activeProfile.profileId,
    identityProfileId: rule.identityProfileId,
    effectiveFromRunKey: rule.effectiveFromRunKey,
    applicable: true,
    project: projectDir,
    runKey,
    locale,
    activePackId: rule.fixedReference?.requiredPackId,
    pass: failures.length === 0,
    fixedReferenceHashes,
    artifactHashes: Object.fromEntries(expected.map(({ file, sha256: hash }) => [file, hash])),
    entries: entryResults,
    failures,
  };
}

function writeReport(projectDir, report) {
  const relativePath = rule.evidence?.reportFile
    ?? 'qa/tiny-agent-identity-consistency-report.json';
  const reportPath = path.join(projectDir, relativePath);
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
}

function selfTestFixture() {
  const refs = Object.fromEntries(
    (rule.fixedReference?.canonicalReferenceImages ?? []).map(
      (file, index) => [file, sha256(`reference-${index}`)],
    ),
  );
  const expected = [
    {
      file: 'assets/generated/scene-art/example.png',
      kind: 'scene-art',
      sceneIds: ['c01-p01'],
      coverRatio: null,
      mustContainAgent: false,
      sha256: sha256('scene'),
      sizeBytes: 100,
    },
    {
      file: 'thumbnails/generated-hero.en-US.png',
      kind: 'cover-hero',
      sceneIds: [],
      coverRatio: '16x9',
      mustContainAgent: true,
      sha256: sha256('cover'),
      sizeBytes: 100,
    },
  ];
  const makeEntry = (artifact) => ({
    file: artifact.file,
    kind: artifact.kind,
    sceneIds: artifact.sceneIds,
    coverRatio: artifact.coverRatio,
    artifactSha256: artifact.sha256,
    containsAgentCharacter: true,
    agentCharacterCount: 1,
    tinyAgentConsistentCharacterCount: 1,
    otherAgentCharacterCount: 0,
    referenceConditioningUsed: true,
    referenceImages: [Object.keys(refs)[0]],
    referenceImageHashes: {
      [Object.keys(refs)[0]]: Object.values(refs)[0],
    },
    hardIdentityAnchors: Object.fromEntries(
      (rule.hardIdentityAnchors ?? []).map(({ id }) => [id, true]),
    ),
    secondaryIdentityAnchors: Object.fromEntries(
      (rule.secondaryIdentityAnchors ?? []).map(({ id }) => [id, true]),
    ),
    similarityDecision: 'minor-variation',
    finishClassification: 'minor-soft-3d-variation',
    majorRedesignDetected: false,
    sideBySideReviewed: true,
  });
  const projectDir = '/tmp/2026-07-29-03-generated-identity-fixture-en-US';
  return {
    refs,
    expected,
    locale: 'en-US',
    projectDir,
    runKey: '2026-07-29-03',
    review: {
      schemaVersion: 1,
      identityProfileId: rule.identityProfileId,
      locale: 'en-US',
      runKey: '2026-07-29-03',
      project: projectDir,
      activePackId: rule.fixedReference?.requiredPackId,
      fixedReferenceHashes: refs,
      pass: true,
      entries: expected.map(makeEntry),
    },
  };
}

function runSelfTest() {
  const fixture = selfTestFixture();
  const evaluate = (value) => evaluateReview({
    review: value.review,
    expected: value.expected,
    fixedReferenceHashes: value.refs,
    locale: value.locale,
    projectDir: value.projectDir,
    runKey: value.runKey,
  });
  if (!evaluate(fixture).pass) {
    throw new Error('positive generated-identity fixture failed');
  }
  const mutations = [
    (value) => {
      value.review.entries[0].referenceConditioningUsed = false;
    },
    (value) => {
      const hardId = rule.hardIdentityAnchors[0].id;
      value.review.entries[0].hardIdentityAnchors[hardId] = false;
    },
    (value) => {
      value.review.entries[0].majorRedesignDetected = true;
    },
    (value) => {
      value.review.entries[0].otherAgentCharacterCount = 1;
    },
  ];
  for (const mutate of mutations) {
    const value = structuredClone(fixture);
    mutate(value);
    if (evaluate(value).pass) {
      throw new Error('generated-identity fail-closed mutation unexpectedly passed');
    }
  }
  process.stdout.write(
    'Tiny Agent generated-identity self-test passed: exact/minor variation fixture and four fail-closed mutations.\n',
  );
}

const args = parseArgs(process.argv.slice(2));
if (args['self-test']) {
  runSelfTest();
} else {
  if (!args.project) {
    console.error(
      'Usage: node scripts/ai-video-pipeline/validate-tiny-agent-generated-identity.mjs --project <PROJECT_DIR>',
    );
    process.exit(2);
  }
  const projectDir = path.resolve(repoRoot, args.project);
  const runKey = projectRunKey(projectDir);
  const locale = readJson(path.join(projectDir, 'episode.json')).locale;
  if (!appliesToRun(runKey)) {
    const report = {
      version: 1,
      contractProfileId: activeProfile.profileId,
      identityProfileId: rule.identityProfileId,
      effectiveFromRunKey: rule.effectiveFromRunKey,
      applicable: false,
      project: projectDir,
      runKey,
      locale,
      pass: true,
      failures: [],
    };
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  } else {
    let report;
    try {
      const reviewRelativePath = rule.evidence?.reviewFile
        ?? 'qa/tiny-agent-identity-review.json';
      report = evaluateReview({
        review: readJson(path.join(projectDir, reviewRelativePath)),
        expected: expectedArtifacts(projectDir, locale),
        fixedReferenceHashes: referenceHashes(),
        locale,
        projectDir,
        runKey,
      });
    } catch (error) {
      console.error(`Tiny Agent generated-identity validation could not load project evidence: ${error.message}`);
      process.exit(1);
    }
    writeReport(projectDir, report);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    if (!report.pass) process.exitCode = 1;
  }
}
