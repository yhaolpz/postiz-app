#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const defaultInboxRoot = path.join(repoRoot, 'var/video-distribution/inbox');
const schemaVersion = 'seek.video-release.v1';

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === '--') continue;
    if (!value.startsWith('--')) continue;
    const key = value.slice(2);
    if (key === 'apply') {
      args.apply = true;
      continue;
    }
    args[key] = argv[index + 1];
    index += 1;
  }
  return args;
}

function inside(parent, target) {
  const relative = path.relative(parent, target);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

function assertSafeRelative(value, label) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\/]/).includes('..')
  ) {
    throw new Error(`${label} must be a safe relative path: ${value}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function sha256(filePath) {
  return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

export async function validateSourceBundle(bundleInput) {
  const bundleDir = path.resolve(bundleInput);
  const manifestPath = path.join(bundleDir, 'manifest.json');
  const manifest = await readJson(manifestPath);
  if (manifest.schemaVersion !== schemaVersion) {
    throw new Error(`Unsupported release schema: ${manifest.schemaVersion}`);
  }
  if (manifest.producer !== '@seek/video-production') {
    throw new Error(`Unexpected release producer: ${manifest.producer}`);
  }
  if (
    manifest.ownership?.sourceRepository !== 'seek' ||
    manifest.ownership?.immutable !== true ||
    manifest.ownership?.distributorMayDeleteSource !== false
  ) {
    throw new Error('Release ownership does not protect the Seek source.');
  }
  if (manifest.qa?.status !== 'passed') {
    throw new Error('Release bundle is not QA-approved.');
  }

  const roles = new Set();
  for (const artifact of manifest.artifacts || []) {
    assertSafeRelative(artifact.file, `${artifact.role} file`);
    if (roles.has(artifact.role)) {
      throw new Error(`Duplicate artifact role: ${artifact.role}`);
    }
    roles.add(artifact.role);
    const filePath = path.resolve(bundleDir, artifact.file);
    if (!inside(bundleDir, filePath)) {
      throw new Error(`Artifact escapes release bundle: ${artifact.file}`);
    }
    const stat = await fs.lstat(filePath);
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(`Artifact must be a regular file: ${artifact.file}`);
    }
    if (stat.size !== artifact.bytes) {
      throw new Error(`Artifact size mismatch: ${artifact.file}`);
    }
    if ((await sha256(filePath)) !== artifact.sha256) {
      throw new Error(`Artifact checksum mismatch: ${artifact.file}`);
    }
  }

  for (const role of [
    'video',
    'cover-4x3',
    'cover-3x4',
    'publishing-metadata',
    'publishing-materials',
    'qa-summary',
  ]) {
    if (!roles.has(role)) throw new Error(`Missing required artifact role: ${role}`);
  }
  const videoKind = manifest.videoKind || 'longform';
  if (!['longform', 'short'].includes(videoKind)) {
    throw new Error(`Unsupported video kind: ${videoKind}`);
  }
  if (videoKind === 'longform' && manifest.locale === 'en-US' && !roles.has('cover-16x9')) {
    throw new Error('English release bundle requires a 16:9 cover.');
  }
  if (manifest.locale === 'zh-CN' && roles.has('cover-16x9')) {
    throw new Error('Chinese release bundle must not contain a 16:9 cover.');
  }

  return {
    bundleDir,
    manifestPath,
    manifest,
    manifestSha256: await sha256(manifestPath),
  };
}

async function validateImportedCopy(destinationDir, expected) {
  const imported = await validateSourceBundle(destinationDir);
  if (imported.manifest.bundleId !== expected.manifest.bundleId) {
    throw new Error(`Imported bundle ID mismatch: ${imported.manifest.bundleId}`);
  }
  if (imported.manifestSha256 !== expected.manifestSha256) {
    throw new Error('Imported manifest does not match the source bundle.');
  }
  const ownership = await readJson(path.join(destinationDir, 'distribution-ownership.json'));
  if (
    ownership.sourceManifestSha256 !== expected.manifestSha256 ||
    ownership.mayDeleteSource !== false ||
    ownership.mayDeleteImportedCopy !== true
  ) {
    throw new Error('Imported-copy ownership manifest is invalid.');
  }
  return imported;
}

export async function validateImportedBundle(
  bundleInput,
  inboxRoot = defaultInboxRoot
) {
  const resolvedInboxRoot = path.resolve(inboxRoot);
  const bundleDir = path.resolve(bundleInput);
  if (!inside(resolvedInboxRoot, bundleDir)) {
    throw new Error(
      'Distribution commands may only read an imported Postiz inbox bundle.'
    );
  }
  const imported = await validateSourceBundle(bundleDir);
  const ownership = await readJson(
    path.join(bundleDir, 'distribution-ownership.json')
  );
  if (
    ownership.bundleId !== imported.manifest.bundleId ||
    ownership.sourceManifestSha256 !== imported.manifestSha256 ||
    ownership.mayDeleteSource !== false ||
    ownership.mayDeleteImportedCopy !== true
  ) {
    throw new Error('Imported-copy ownership manifest is invalid.');
  }
  return imported;
}

export async function importReleaseBundle({
  bundle,
  apply = false,
  inboxRoot = defaultInboxRoot,
  importedAt = new Date().toISOString(),
}) {
  const source = await validateSourceBundle(bundle);
  const resolvedInboxRoot = path.resolve(inboxRoot);
  const destinationDir = path.resolve(resolvedInboxRoot, source.manifest.bundleId);
  if (!inside(resolvedInboxRoot, destinationDir)) {
    throw new Error('Imported bundle must stay inside the distribution inbox.');
  }
  if (
    path.resolve(inboxRoot) === path.resolve(defaultInboxRoot) &&
    !inside(repoRoot, destinationDir)
  ) {
    throw new Error('Default distribution inbox must stay inside the Postiz repository.');
  }
  if (!apply) {
    return {
      status: 'validated',
      sourceBundle: source.bundleDir,
      destinationDir,
      manifest: source.manifest,
    };
  }

  try {
    const imported = await validateImportedCopy(destinationDir, source);
    return {
      status: 'unchanged',
      sourceBundle: source.bundleDir,
      destinationDir,
      manifest: imported.manifest,
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  await fs.mkdir(path.dirname(destinationDir), { recursive: true });
  const temporaryDir = await fs.mkdtemp(
    path.join(path.dirname(destinationDir), `.${source.manifest.bundleId}.tmp-`)
  );
  try {
    for (const relativePath of [
      'manifest.json',
      ...source.manifest.artifacts.map((artifact) => artifact.file),
    ]) {
      assertSafeRelative(relativePath, 'copy file');
      const sourcePath = path.join(source.bundleDir, relativePath);
      const destinationPath = path.join(temporaryDir, relativePath);
      await fs.mkdir(path.dirname(destinationPath), { recursive: true });
      await fs.copyFile(sourcePath, destinationPath);
    }
    await fs.writeFile(
      path.join(temporaryDir, 'distribution-ownership.json'),
      `${JSON.stringify(
        {
          schemaVersion: 1,
          bundleId: source.manifest.bundleId,
          importedAt,
          sourceBundle: source.bundleDir,
          sourceManifestSha256: source.manifestSha256,
          mayDeleteSource: false,
          mayDeleteImportedCopy: true,
        },
        null,
        2
      )}\n`
    );
    await validateImportedCopy(temporaryDir, source);
    await fs.rename(temporaryDir, destinationDir);
    return {
      status: 'imported',
      sourceBundle: source.bundleDir,
      destinationDir,
      manifest: source.manifest,
    };
  } catch (error) {
    await fs.rm(temporaryDir, { recursive: true, force: true });
    throw error;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.bundle) {
    throw new Error(
      'Usage: node scripts/video-distribution/import-release-bundle.mjs --bundle <directory> [--apply]'
    );
  }
  const result = await importReleaseBundle({
    bundle: args.bundle,
    apply: args.apply === true,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        status: result.status,
        bundleId: result.manifest.bundleId,
        sourceBundle: result.sourceBundle,
        destinationDir: result.destinationDir,
        artifactCount: result.manifest.artifacts.length,
      },
      null,
      2
    )}\n`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
