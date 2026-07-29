#!/usr/bin/env node

import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), '../..');
const DEFAULT_RETENTION_HOURS = 120;
const BUNDLE_KIND = 'tiny-agent-english-icloud-bundle';
const MANAGED_BY = 'scripts/ai-video-pipeline/sync-tiny-agent-english-to-icloud.mjs';
const MANIFEST_NAME = '.tiny-agent-icloud-bundle.json';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function requireValue(value, label) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error(`${label} is required.`);
  }
  return value.trim();
}

function parseDate(value) {
  const date = requireValue(value, '--date');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('--date must use YYYY-MM-DD.');
  }
  return date;
}

function parseSlot(value) {
  const slot = Number(requireValue(value, '--slot'));
  if (!Number.isInteger(slot) || slot < 1 || slot > 99) {
    throw new Error('--slot must be an integer from 1 to 99.');
  }
  return slot;
}

function parseRetentionHours(value) {
  const retentionHours = Number(value ?? DEFAULT_RETENTION_HOURS);
  if (!Number.isFinite(retentionHours) || retentionHours < DEFAULT_RETENTION_HOURS) {
    throw new Error(`--retention-hours must be at least ${DEFAULT_RETENTION_HOURS}.`);
  }
  return retentionHours;
}

function safeSlug(value) {
  const slug = requireValue(value, 'project slug')
    .replace(/-longform-en-US$/, '')
    .replace(/-en-US$/, '')
    .replace(/^\d{4}-\d{2}-\d{2}-\d{2}-/, '')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (!slug) throw new Error('Could not derive a safe project slug.');
  return slug;
}

function isInside(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readJson(filePath, label) {
  let content;
  try {
    content = await fs.readFile(filePath, 'utf8');
  } catch (error) {
    throw new Error(`${label} is missing: ${error.message}`);
  }
  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`${label} is invalid JSON: ${error.message}`);
  }
}

async function sha256(filePath) {
  return createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

async function describeFile(filePath, destinationName, sourceProject) {
  const stat = await fs.stat(filePath);
  if (!stat.isFile() || stat.size <= 0) {
    throw new Error(`Source artifact is not a non-empty file: ${filePath}`);
  }
  return {
    sourcePath: path.relative(sourceProject, filePath),
    destinationName,
    bytes: stat.size,
    sha256: await sha256(filePath),
  };
}

async function findEnglishVideo(projectDir) {
  const rendersDir = path.join(projectDir, 'renders');
  const entries = await fs.readdir(rendersDir, { withFileTypes: true });
  const matches = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.en-US.mp4'))
    .map((entry) => path.join(rendersDir, entry.name));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one direct renders/*.en-US.mp4 master, found ${matches.length}.`,
    );
  }
  return matches[0];
}

function metadataKeywords(metadata) {
  return [
    metadata.primaryKeyword,
    ...(Array.isArray(metadata.secondaryKeywords) ? metadata.secondaryKeywords : []),
  ].filter((value) => typeof value === 'string' && value.trim());
}

function buildPublishText(metadata, material) {
  const hashtags = Array.isArray(material.hashtags)
    ? material.hashtags
    : (Array.isArray(metadata.hashtags) ? metadata.hashtags : []);
  const keywords = Array.isArray(material.keywords)
    ? material.keywords
    : metadataKeywords(metadata);
  const suggestions = Array.isArray(material.interactionSuggestions)
    ? material.interactionSuggestions
    : [];
  const lines = ['TITLE', material.title || metadata.title];
  if (metadata.thumbnailText) {
    lines.push('', 'COVER TITLE', metadata.thumbnailText);
  }
  lines.push(
    '',
    'DESCRIPTION',
    material.description || metadata.description,
    '',
    'HASHTAGS',
    hashtags.join(' '),
    '',
    'KEYWORDS',
    keywords.join(', '),
  );
  if (suggestions.length) {
    lines.push(
      '',
      'INTERACTION SUGGESTIONS',
      ...suggestions.map((entry, index) => `${index + 1}. ${entry.text}`),
    );
  }
  return `${lines.join('\n').trim()}\n`;
}

async function collectArtifacts(projectDir, date) {
  if (!projectDir.endsWith('-en-US')) {
    throw new Error('--english-project must point to an en-US project directory.');
  }
  const metadataPath = path.join(projectDir, 'publish-metadata.en-US.json');
  const materialPath = path.join(projectDir, 'local-publishing-materials.en-US.json');
  const metadata = await readJson(metadataPath, 'English publish metadata');
  const material = await readJson(materialPath, 'English local publishing materials');
  if (metadata.locale !== 'en-US' || material.locale !== 'en-US') {
    throw new Error('Only en-US metadata and publishing materials may be synced.');
  }
  if (!metadata.title || !material.title || metadata.title !== material.title) {
    throw new Error('English metadata and publishing-material titles must match.');
  }

  const sources = [
    {
      path: await findEnglishVideo(projectDir),
      destinationName: 'video.en-US.mp4',
    },
    {
      path: path.join(projectDir, 'thumbnails/thumbnail.en-US.png'),
      destinationName: 'cover-16x9.en-US.png',
    },
    {
      path: metadataPath,
      destinationName: 'publish-metadata.en-US.json',
    },
    {
      path: materialPath,
      destinationName: 'local-publishing-materials.en-US.json',
    },
  ];
  if (date.localeCompare('2026-07-29') >= 0) {
    sources.splice(
      2,
      0,
      {
        path: path.join(projectDir, 'thumbnails/thumbnail.en-US.4x3.png'),
        destinationName: 'cover-4x3.en-US.png',
      },
      {
        path: path.join(projectDir, 'thumbnails/thumbnail.en-US.3x4.png'),
        destinationName: 'cover-3x4.en-US.png',
      },
    );
  }
  for (const source of sources) {
    if (!(await fileExists(source.path))) {
      throw new Error(`Required English delivery artifact is missing: ${source.path}`);
    }
  }
  return { metadata, material, sources };
}

async function sameBundle(existingManifestPath, desiredFiles) {
  if (!(await fileExists(existingManifestPath))) return false;
  try {
    const manifest = await readJson(existingManifestPath, 'Existing iCloud bundle manifest');
    if (manifest.kind !== BUNDLE_KIND || manifest.managedBy !== MANAGED_BY) return false;
    const existing = new Map(
      (manifest.files ?? []).map((entry) => [entry.destinationName, entry.sha256]),
    );
    return existing.size === desiredFiles.length && desiredFiles.every(
      (entry) => existing.get(entry.destinationName) === entry.sha256,
    );
  } catch {
    return false;
  }
}

async function replaceDirectoryAtomically(tempDir, destinationDir) {
  const backupDir = `${destinationDir}.backup-${process.pid}-${Date.now()}`;
  const destinationExists = await fileExists(destinationDir);
  if (destinationExists) await fs.rename(destinationDir, backupDir);
  try {
    await fs.rename(tempDir, destinationDir);
    if (destinationExists) await fs.rm(backupDir, { recursive: true });
  } catch (error) {
    if (!(await fileExists(destinationDir)) && await fileExists(backupDir)) {
      await fs.rename(backupDir, destinationDir);
    }
    throw error;
  }
}

export async function syncEnglishBundle({
  englishProject,
  date,
  slot,
  icloudRoot,
  retentionHours = DEFAULT_RETENTION_HOURS,
  now = new Date(),
}) {
  const projectDir = path.resolve(englishProject);
  const parsedDate = parseDate(date);
  const parsedSlot = parseSlot(String(slot));
  const parsedRetentionHours = parseRetentionHours(retentionHours);
  const resolvedIcloudRoot = path.resolve(icloudRoot);
  if (!(await fileExists(resolvedIcloudRoot))) {
    throw new Error(`iCloud Drive root does not exist: ${resolvedIcloudRoot}`);
  }
  const deliveryRoot = path.join(resolvedIcloudRoot, 'Tiny Agent TikTok');
  const dateDir = path.join(deliveryRoot, parsedDate);
  const slug = safeSlug(path.basename(projectDir));
  const bundleName = `${String(parsedSlot).padStart(2, '0')}-${slug}`;
  const destinationDir = path.join(dateDir, bundleName);
  if (!isInside(deliveryRoot, destinationDir)) {
    throw new Error('Resolved iCloud destination escaped the managed delivery root.');
  }

  const { metadata, material, sources } = await collectArtifacts(projectDir, parsedDate);
  const describedFiles = [];
  for (const source of sources) {
    describedFiles.push(
      await describeFile(source.path, source.destinationName, projectDir),
    );
  }
  const publishText = buildPublishText(metadata, material);
  const publishTextSha = createHash('sha256').update(publishText).digest('hex');
  describedFiles.push({
    sourcePath: null,
    destinationName: 'publish.txt',
    bytes: Buffer.byteLength(publishText),
    sha256: publishTextSha,
  });

  await fs.mkdir(dateDir, { recursive: true });
  const manifestPath = path.join(destinationDir, MANIFEST_NAME);
  if (await sameBundle(manifestPath, describedFiles)) {
    return {
      status: 'unchanged',
      destinationDir,
      manifestPath,
      fileCount: describedFiles.length,
    };
  }

  const tempDir = `${destinationDir}.tmp-${process.pid}-${Date.now()}`;
  await fs.mkdir(tempDir);
  try {
    for (const source of sources) {
      await fs.copyFile(source.path, path.join(tempDir, source.destinationName));
    }
    await fs.writeFile(path.join(tempDir, 'publish.txt'), publishText);
    const syncedAt = now.toISOString();
    const eligibleAt = new Date(
      now.getTime() + parsedRetentionHours * 60 * 60 * 1000,
    ).toISOString();
    const manifest = {
      schemaVersion: 1,
      kind: BUNDLE_KIND,
      managedBy: MANAGED_BY,
      date: parsedDate,
      slot: parsedSlot,
      slug,
      bundleName,
      syncedAt,
      eligibleAt,
      retentionHours: parsedRetentionHours,
      sourceProject: path.basename(projectDir),
      locale: 'en-US',
      title: material.title,
      files: describedFiles,
    };
    await fs.writeFile(
      path.join(tempDir, MANIFEST_NAME),
      `${JSON.stringify(manifest, null, 2)}\n`,
    );
    await replaceDirectoryAtomically(tempDir, destinationDir);
    return {
      status: 'synced',
      destinationDir,
      manifestPath,
      fileCount: describedFiles.length,
      eligibleAt,
    };
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true });
    throw error;
  }
}

export async function cleanupExpiredBundles({
  icloudRoot,
  now = new Date(),
}) {
  const resolvedIcloudRoot = path.resolve(icloudRoot);
  const deliveryRoot = path.join(resolvedIcloudRoot, 'Tiny Agent TikTok');
  if (!(await fileExists(deliveryRoot))) {
    return { scanned: 0, deleted: [], skipped: [] };
  }
  const result = { scanned: 0, deleted: [], skipped: [] };
  const dateEntries = await fs.readdir(deliveryRoot, { withFileTypes: true });
  for (const dateEntry of dateEntries) {
    if (!dateEntry.isDirectory() || !/^\d{4}-\d{2}-\d{2}$/.test(dateEntry.name)) {
      continue;
    }
    const dateDir = path.join(deliveryRoot, dateEntry.name);
    const bundleEntries = await fs.readdir(dateDir, { withFileTypes: true });
    for (const bundleEntry of bundleEntries) {
      if (!bundleEntry.isDirectory() || bundleEntry.name.includes('.tmp-')) continue;
      const bundleDir = path.join(dateDir, bundleEntry.name);
      const manifestPath = path.join(bundleDir, MANIFEST_NAME);
      result.scanned += 1;
      if (!(await fileExists(manifestPath))) {
        result.skipped.push({ bundle: bundleDir, reason: 'manifest_missing' });
        continue;
      }
      let manifest;
      try {
        manifest = await readJson(manifestPath, 'iCloud bundle manifest');
      } catch (error) {
        result.skipped.push({ bundle: bundleDir, reason: error.message });
        continue;
      }
      const owned = manifest.kind === BUNDLE_KIND
        && manifest.managedBy === MANAGED_BY
        && manifest.bundleName === bundleEntry.name
        && manifest.date === dateEntry.name
        && Number(manifest.retentionHours) >= DEFAULT_RETENTION_HOURS;
      if (!owned) {
        result.skipped.push({ bundle: bundleDir, reason: 'ownership_check_failed' });
        continue;
      }
      const syncedAt = new Date(manifest.syncedAt);
      const declaredEligibleAt = new Date(manifest.eligibleAt);
      const retentionHours = Number(manifest.retentionHours);
      const computedEligibleAt = new Date(
        syncedAt.getTime() + retentionHours * 60 * 60 * 1000,
      );
      if (
        Number.isNaN(syncedAt.getTime())
        || Number.isNaN(declaredEligibleAt.getTime())
        || declaredEligibleAt.getTime() !== computedEligibleAt.getTime()
        || now < computedEligibleAt
      ) {
        result.skipped.push({ bundle: bundleDir, reason: 'not_expired' });
        continue;
      }
      if (!isInside(deliveryRoot, bundleDir)) {
        result.skipped.push({ bundle: bundleDir, reason: 'unsafe_path' });
        continue;
      }
      await fs.rm(bundleDir, { recursive: true });
      result.deleted.push(bundleDir);
    }
    if ((await fs.readdir(dateDir)).length === 0) {
      await fs.rmdir(dateDir);
    }
  }
  return result;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const icloudRoot = path.resolve(
    args['icloud-root']
      || path.join(os.homedir(), 'Library/Mobile Documents/com~apple~CloudDocs'),
  );
  const retentionHours = parseRetentionHours(args['retention-hours']);
  const now = args.now ? new Date(args.now) : new Date();
  if (Number.isNaN(now.getTime())) throw new Error('--now must be a valid ISO date.');

  const cleanup = await cleanupExpiredBundles({ icloudRoot, now });
  const sync = await syncEnglishBundle({
    englishProject: path.resolve(repoRoot, requireValue(args['english-project'], '--english-project')),
    date: args.date,
    slot: args.slot,
    icloudRoot,
    retentionHours,
    now,
  });
  process.stdout.write(`${JSON.stringify({ sync, cleanup }, null, 2)}\n`);
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`Tiny Agent iCloud sync failed: ${error.message}\n`);
    process.exitCode = 1;
  });
}
