import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  importReleaseBundle,
  validateImportedBundle,
  validateSourceBundle,
} from './import-release-bundle.mjs';

async function sha256(filePath) {
  return crypto.createHash('sha256').update(await fs.readFile(filePath)).digest('hex');
}

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'postiz-release-import-'));
  const source = path.join(root, 'source');
  const inbox = path.join(root, 'postiz', 'var/video-distribution/inbox');
  await fs.mkdir(source, { recursive: true });
  const definitions = [
    ['video', 'video.en-US.mp4', 'video/mp4'],
    ['cover-16x9', 'covers/thumbnail.en-US.png', 'image/png'],
    ['cover-4x3', 'covers/thumbnail.en-US.4x3.png', 'image/png'],
    ['cover-3x4', 'covers/thumbnail.en-US.3x4.png', 'image/png'],
    ['publishing-metadata', 'publish-metadata.en-US.json', 'application/json'],
    [
      'publishing-materials',
      'local-publishing-materials.en-US.json',
      'application/json',
    ],
    ['qa-summary', 'qa/qa-summary.json', 'application/json'],
  ];
  const artifacts = [];
  for (const [role, relativePath, contentType] of definitions) {
    const filePath = path.join(source, relativePath);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, `${role}\n`);
    const stat = await fs.stat(filePath);
    artifacts.push({
      role,
      file: relativePath,
      contentType,
      bytes: stat.size,
      sha256: await sha256(filePath),
    });
  }
  const manifest = {
    schemaVersion: 'seek.video-release.v1',
    bundleId: '2026-07-29-03-import-contract-en-US',
    producer: '@seek/video-production',
    createdAt: '2026-07-29T08:00:00.000Z',
    runKey: '2026-07-29-03',
    topic: { slug: 'import-contract', title: 'Import contract' },
    locale: 'en-US',
    source: {
      repository: 'seek',
      projectPath: 'var/hyperframes-showcases/import-contract-en-US',
      sourceAttribution: {},
    },
    technical: {
      width: 1920,
      height: 1080,
      fps: 30,
      videoCodec: 'h264',
      audioCodec: 'aac',
      durationSeconds: 300,
    },
    qa: { status: 'passed', summaryArtifact: 'qa/qa-summary.json' },
    ownership: {
      sourceRepository: 'seek',
      immutable: true,
      distributorMayDeleteSource: false,
    },
    artifacts,
  };
  await fs.writeFile(
    path.join(source, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`
  );
  return { root, source, inbox, manifest };
}

test('validates without writing when apply is false', async (t) => {
  const { root, source, inbox, manifest } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await importReleaseBundle({ bundle: source, inboxRoot: inbox });
  assert.equal(result.status, 'validated');
  assert.equal(result.manifest.bundleId, manifest.bundleId);
  await assert.rejects(fs.access(result.destinationDir));
});

test('imports a private copy and preserves source ownership', async (t) => {
  const { root, source, inbox, manifest } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await importReleaseBundle({
    bundle: source,
    apply: true,
    inboxRoot: inbox,
    importedAt: '2026-07-29T09:00:00.000Z',
  });
  assert.equal(result.status, 'imported');
  assert.equal(
    (await validateImportedBundle(result.destinationDir, inbox)).manifest.bundleId,
    manifest.bundleId
  );
  const ownership = JSON.parse(
    await fs.readFile(path.join(result.destinationDir, 'distribution-ownership.json'), 'utf8')
  );
  assert.equal(ownership.mayDeleteSource, false);
  assert.equal(ownership.mayDeleteImportedCopy, true);
  assert.equal((await validateSourceBundle(source)).manifest.bundleId, manifest.bundleId);
  assert.equal(
    (await importReleaseBundle({ bundle: source, apply: true, inboxRoot: inbox }))
      .status,
    'unchanged'
  );
});

test('rejects a source artifact changed after manifest creation', async (t) => {
  const { root, source } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.appendFile(path.join(source, 'video.en-US.mp4'), 'tampered');
  await assert.rejects(validateSourceBundle(source), /Artifact size mismatch/);
});

test('platform entry points require an imported inbox bundle', async (t) => {
  const { root, source, inbox } = await fixture();
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  await assert.rejects(
    validateImportedBundle(source, inbox),
    /only read an imported Postiz inbox bundle/
  );

  for (const filename of [
    'publish-longform-youtube.mjs',
    'update-youtube-description.mjs',
    'update-youtube-thumbnail.mjs',
  ]) {
    const sourceText = await fs.readFile(
      new URL(filename, import.meta.url),
      'utf8'
    );
    assert.match(sourceText, /validateImportedBundle\(args\.bundle\)/);
    assert.doesNotMatch(
      sourceText,
      /path\.resolve\(args\.(?:video|metadata|thumbnail)/
    );
  }
});
