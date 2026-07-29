#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceProject = path.join(
  repoRoot,
  'var/hyperframes-showcases/2026-07-29-03-agent-expertise-responsibility-longform-zh-CN',
);
const validator = path.join(
  repoRoot,
  'scripts/ai-video-pipeline/validate-tiny-agent-zh-cover-reference.mjs',
);
const fixtureRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), '2026-07-30-03-zh-cover-content-fit-'),
);
const fixtureProject = path.join(
  fixtureRoot,
  '2026-07-30-03-agent-expertise-responsibility-longform-zh-CN',
);
const fixtureThumbnails = path.join(fixtureProject, 'thumbnails');

function runValidator() {
  return spawnSync(
    process.execPath,
    [validator, '--project', fixtureProject],
    { cwd: repoRoot, encoding: 'utf8' },
  );
}

function readReport() {
  return JSON.parse(fs.readFileSync(
    path.join(fixtureThumbnails, 'qa/reference-alignment-qa.json'),
    'utf8',
  ));
}

function ratioCheck(report, ratio) {
  return report.checks.find((check) => check.ratio === ratio);
}

try {
  fs.mkdirSync(fixtureThumbnails, { recursive: true });
  fs.copyFileSync(
    path.join(sourceProject, 'publish-metadata.zh-CN.json'),
    path.join(fixtureProject, 'publish-metadata.zh-CN.json'),
  );
  for (const entry of fs.readdirSync(path.join(sourceProject, 'thumbnails'), {
    withFileTypes: true,
  })) {
    if (!entry.isFile()) continue;
    fs.copyFileSync(
      path.join(sourceProject, 'thumbnails', entry.name),
      path.join(fixtureThumbnails, entry.name),
    );
  }

  const positive = runValidator();
  if (positive.status !== 0 || !readReport().pass) {
    throw new Error(`expected positive content-fit fixture to pass\n${positive.stderr || positive.stdout}`);
  }

  const svg4x3 = path.join(fixtureThumbnails, 'thumbnail.zh-CN.4x3.svg');
  const originalSvg4x3 = fs.readFileSync(svg4x3, 'utf8');
  fs.writeFileSync(
    svg4x3,
    originalSvg4x3.replace(
      'data-cover-title-line="2" x="38" y="348" font-size="118"',
      'data-cover-title-line="2" x="38" y="348" font-size="190"',
    ),
  );
  const overlap = runValidator();
  const overlapCheck = ratioCheck(readReport(), '4x3');
  if (overlap.status === 0 || overlapCheck?.titleHeroClearance !== false) {
    throw new Error('expected 4x3 titleHeroClearance to reject title/hero overlap');
  }
  fs.writeFileSync(svg4x3, originalSvg4x3);

  const hero3x4 = path.join(fixtureThumbnails, 'generated-hero.zh-CN.3x4.png');
  const paddedHero = `${hero3x4}.padded.png`;
  execFileSync('magick', [
    hero3x4,
    '-bordercolor',
    'none',
    '-border',
    '320x320',
    paddedHero,
  ]);
  fs.renameSync(paddedHero, hero3x4);
  const padded = runValidator();
  const paddedCheck = ratioCheck(readReport(), '3x4');
  if (
    padded.status === 0
    || paddedCheck?.heroAlphaPadding !== false
    || paddedCheck?.visibleHeroHeight !== false
    || paddedCheck?.visibleHeroArea !== false
  ) {
    throw new Error(
      'expected 3x4 heroAlphaPadding, visibleHeroHeight, and visibleHeroArea to reject a padded small hero',
    );
  }

  process.stdout.write(`${JSON.stringify({
    pass: true,
    checks: {
      positiveFixture: true,
      rejects4x3TitleHeroOverlap: true,
      rejects3x4PaddedSmallHero: true,
    },
  }, null, 2)}\n`);
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
}
