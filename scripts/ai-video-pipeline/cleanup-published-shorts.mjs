#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const runsDir = path.join(rootDir, 'var/ai-video-pipeline/runs');
const defaultManifestDir = path.join(
  rootDir,
  'var/ai-video-pipeline/shorts/published'
);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    if (['apply', 'backfill'].includes(key)) {
      args[key] = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function relativeToRoot(filePath) {
  return path.relative(rootDir, path.resolve(filePath));
}

function assertSafeRunFile(filePath, expectedName) {
  const absolutePath = path.resolve(rootDir, filePath);
  const relativePath = relativeToRoot(absolutePath);
  const runsRelative = path.relative(runsDir, absolutePath);

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    runsRelative.startsWith('..') ||
    path.isAbsolute(runsRelative) ||
    path.basename(absolutePath) !== expectedName
  ) {
    throw new Error(`Refusing unsafe ${expectedName} path: ${filePath}`);
  }

  return { absolutePath, relativePath };
}

function flattenAttempts(platformAttempts = []) {
  return platformAttempts.flatMap((attempt) => {
    if (Array.isArray(attempt?.attempts) && attempt.attempts.length) {
      return attempt.attempts;
    }
    return attempt ? [attempt] : [];
  });
}

function getPublishedResults(attempt) {
  return (attempt.postResults || []).filter(
    (result) => result?.state === 'PUBLISHED' && result.releaseURL
  );
}

function getVerifiedPublications(summary) {
  return flattenAttempts(summary.platformAttempts)
    .filter((attempt) => attempt.status === 'PUBLISHED')
    .flatMap((attempt) => {
      const results = getPublishedResults(attempt);
      if (!results.length) return [];

      if (
        attempt.platform === 'youtube' &&
        !results.some((result) =>
          /^https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\//i.test(
            result.releaseURL
          )
        )
      ) {
        return [];
      }
      if (
        attempt.platform === 'tiktok' &&
        (attempt.tiktokMethod !== 'DIRECT_POST' ||
          attempt.tiktokPrivacy !== 'PUBLIC_TO_EVERYONE')
      ) {
        return [];
      }
      if (
        attempt.platform === 'facebook' &&
        attempt.facebookReelState !== 'PUBLISHED'
      ) {
        return [];
      }
      if (!['youtube', 'tiktok', 'facebook'].includes(attempt.platform)) {
        return [];
      }

      return [
        {
          platform: attempt.platform,
          status: attempt.status,
          releaseURLs: results.map((result) => result.releaseURL),
        },
      ];
    });
}

function formatShanghaiDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function parseDate(value, label) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`${label} must be a valid date.`);
  }
  return date;
}

function mergePublications(existing = [], incoming = []) {
  const merged = new Map();
  for (const publication of [...existing, ...incoming]) {
    const current = merged.get(publication.platform) || {
      platform: publication.platform,
      status: 'PUBLISHED',
      releaseURLs: [],
    };
    current.releaseURLs = [
      ...new Set([...current.releaseURLs, ...(publication.releaseURLs || [])]),
    ];
    merged.set(publication.platform, current);
  }
  return [...merged.values()];
}

async function findManifestForVideo(manifestDir, relativeVideoPath) {
  if (!fssync.existsSync(manifestDir)) return null;
  const entries = await fs.readdir(manifestDir, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const manifestPath = path.join(manifestDir, entry.name);
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    if (manifest.videoPath === relativeVideoPath) {
      return { manifest, manifestPath };
    }
  }
  return null;
}

async function registerSummary({
  summaryPath,
  manifestDir,
  publishedAt,
  date,
  source,
}) {
  const safeSummary = assertSafeRunFile(summaryPath, 'summary.json');
  const summary = JSON.parse(await fs.readFile(safeSummary.absolutePath, 'utf8'));
  const publications = getVerifiedPublications(summary);
  if (!publications.length) {
    return {
      status: 'skipped',
      summaryPath: safeSummary.relativePath,
      reason: 'No strict public publication evidence in platformAttempts.',
    };
  }

  const safeVideo = assertSafeRunFile(summary.videoPath, 'video.mp4');
  const publicationTime = parseDate(publishedAt, 'publishedAt');
  const publicationDate = date || formatShanghaiDate(publicationTime);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(publicationDate)) {
    throw new Error('date must use YYYY-MM-DD.');
  }

  await fs.mkdir(manifestDir, { recursive: true });
  const existing = await findManifestForVideo(manifestDir, safeVideo.relativePath);
  const earliestPublishedAt = existing
    ? new Date(
        Math.min(
          parseDate(existing.manifest.publishedAt, 'existing publishedAt').getTime(),
          publicationTime.getTime()
        )
      )
    : publicationTime;
  const retentionHours = Math.max(
    48,
    Number(existing?.manifest.cleanup?.retentionHours || 48)
  );
  const cleanupStatus = existing?.manifest.cleanup?.status || 'pending';
  const manifest = {
    version: 1,
    date: existing?.manifest.date || publicationDate,
    summaryPaths: [
      ...new Set([
        ...(existing?.manifest.summaryPaths || []),
        safeSummary.relativePath,
      ]),
    ],
    videoPath: safeVideo.relativePath,
    publishedAt: earliestPublishedAt.toISOString(),
    publications: mergePublications(
      existing?.manifest.publications,
      publications
    ),
    registrationSource: existing?.manifest.registrationSource || source,
    cleanup: {
      ...(existing?.manifest.cleanup || {}),
      retentionHours,
      status: cleanupStatus,
      eligibleAt: new Date(
        earliestPublishedAt.getTime() + retentionHours * 60 * 60 * 1000
      ).toISOString(),
    },
  };

  const digest = crypto
    .createHash('sha256')
    .update(safeVideo.relativePath)
    .digest('hex')
    .slice(0, 12);
  const manifestPath =
    existing?.manifestPath || path.join(manifestDir, `${publicationDate}-${digest}.json`);
  await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

  return {
    status: existing ? 'updated' : 'registered',
    manifestPath: relativeToRoot(manifestPath),
    videoPath: safeVideo.relativePath,
    publishedAt: manifest.publishedAt,
    eligibleAt: manifest.cleanup.eligibleAt,
    platforms: manifest.publications.map((item) => item.platform),
  };
}

async function findSummaryPaths(directory) {
  if (!fssync.existsSync(directory)) return [];
  const results = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findSummaryPaths(entryPath)));
    } else if (entry.isFile() && entry.name === 'summary.json') {
      results.push(entryPath);
    }
  }
  return results.sort();
}

async function backfillSummaries(manifestDir) {
  const summaryPaths = await findSummaryPaths(runsDir);
  const report = [];
  for (const summaryPath of summaryPaths) {
    try {
      const stats = await fs.stat(summaryPath);
      report.push(
        await registerSummary({
          summaryPath,
          manifestDir,
          publishedAt: stats.mtime.toISOString(),
          date: formatShanghaiDate(stats.mtime),
          source: 'summary-mtime-backfill',
        })
      );
    } catch (error) {
      report.push({
        status: 'error',
        summaryPath: relativeToRoot(summaryPath),
        error: error.message,
      });
    }
  }
  return report;
}

async function readManifests(manifestDir) {
  if (!fssync.existsSync(manifestDir)) return [];
  const entries = await fs.readdir(manifestDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(manifestDir, entry.name))
    .sort();
}

async function cleanPublishedVideos({ manifestDir, retentionHours, apply }) {
  const manifests = await readManifests(manifestDir);
  const now = new Date();
  const report = {
    mode: apply ? 'apply' : 'dry-run',
    retentionHours,
    scanned: manifests.length,
    eligible: 0,
    cleaned: 0,
    skipped: 0,
    errors: [],
    items: [],
  };

  for (const manifestPath of manifests) {
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      if (manifest.cleanup?.status === 'deleted') {
        report.skipped += 1;
        continue;
      }

      const effectiveRetentionHours = Math.max(
        retentionHours,
        Number(manifest.cleanup?.retentionHours || retentionHours)
      );
      const publishedAt = parseDate(manifest.publishedAt, 'publishedAt');
      const eligibleAt = new Date(
        publishedAt.getTime() + effectiveRetentionHours * 60 * 60 * 1000
      );
      if (now < eligibleAt) {
        report.skipped += 1;
        continue;
      }
      report.eligible += 1;

      if (!manifest.publications?.length) {
        throw new Error('Manifest has no verified public publication evidence.');
      }
      const safeVideo = assertSafeRunFile(manifest.videoPath, 'video.mp4');
      const exists = fssync.existsSync(safeVideo.absolutePath);
      if (exists) {
        const stats = await fs.lstat(safeVideo.absolutePath);
        if (!stats.isFile() || stats.isSymbolicLink()) {
          throw new Error(`Refusing non-file or symlink: ${safeVideo.relativePath}`);
        }
      }

      if (apply) {
        if (exists) await fs.unlink(safeVideo.absolutePath);
        manifest.cleanup = {
          retentionHours: effectiveRetentionHours,
          status: 'deleted',
          eligibleAt: eligibleAt.toISOString(),
          deletedAt: now.toISOString(),
          deletedPaths: exists ? [safeVideo.relativePath] : [],
          missingPaths: exists ? [] : [safeVideo.relativePath],
        };
        await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
        report.cleaned += 1;
      }

      report.items.push({
        manifestPath: relativeToRoot(manifestPath),
        action: apply ? 'deleted' : 'would-delete',
        videoPath: safeVideo.relativePath,
        existed: exists,
        platforms: manifest.publications.map((item) => item.platform),
      });
    } catch (error) {
      report.errors.push({
        manifestPath: relativeToRoot(manifestPath),
        error: error.message,
      });
    }
  }

  return report;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const retentionHours = Number(args['retention-hours'] || 48);
  if (!Number.isFinite(retentionHours) || retentionHours < 48) {
    throw new Error('Retention must be at least 48 hours.');
  }

  const manifestDir = path.resolve(args['manifest-dir'] || defaultManifestDir);
  const registrationReport = [];

  if (args.backfill) {
    registrationReport.push(...(await backfillSummaries(manifestDir)));
  }
  if (args['register-summary']) {
    registrationReport.push(
      await registerSummary({
        summaryPath: args['register-summary'],
        manifestDir,
        publishedAt: args['published-at'] || new Date().toISOString(),
        date: args.date,
        source: 'verified-daily-run',
      })
    );
  }

  const cleanupReport = await cleanPublishedVideos({
    manifestDir,
    retentionHours,
    apply: Boolean(args.apply),
  });
  process.stdout.write(
    `${JSON.stringify({ registration: registrationReport, cleanup: cleanupReport }, null, 2)}\n`
  );
  if (
    cleanupReport.errors.length ||
    registrationReport.some((item) => item.status === 'error')
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
