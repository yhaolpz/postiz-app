import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  cleanupExpiredBundles,
  syncEnglishBundle,
} from './sync-tiny-agent-english-to-icloud.mjs';

async function writeJson(filePath, value) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function createEnglishFixture(root, slug = 'first-topic') {
  const project = path.join(root, `2026-07-29-03-${slug}-longform-en-US`);
  await mkdir(path.join(project, 'renders'), { recursive: true });
  await mkdir(path.join(project, 'thumbnails'), { recursive: true });
  await writeFile(
    path.join(project, 'renders', `2026-07-29-03-${slug}-longform.en-US.mp4`),
    'english-video',
  );
  await writeFile(path.join(project, 'thumbnails/thumbnail.en-US.png'), 'cover-16x9');
  await writeFile(path.join(project, 'thumbnails/thumbnail.en-US.4x3.png'), 'cover-4x3');
  await writeFile(path.join(project, 'thumbnails/thumbnail.en-US.3x4.png'), 'cover-3x4');
  const metadata = {
    locale: 'en-US',
    title: 'How AI Agents Choose Work',
    thumbnailText: 'MAKE AI AGENTS CHOOSE BETTER',
    description: 'A practical method.',
    hashtags: ['#AIAgents', '#TinyAgent'],
    primaryKeyword: 'AI Agent tasks',
    secondaryKeywords: ['agent workflow'],
  };
  const material = {
    schemaVersion: 1,
    materialId: `material-${slug}`,
    locale: 'en-US',
    title: metadata.title,
    description: metadata.description,
    hashtags: metadata.hashtags,
    keywords: ['AI Agent tasks', 'agent workflow'],
    interactionSuggestions: [
      { id: 'open-question', text: 'Which task would you delegate first?' },
      { id: 'practical-tradeoff', text: 'Where would you require approval?' },
      { id: 'viewpoint-experience', text: 'What changed your view of agents?' },
    ],
  };
  await writeJson(path.join(project, 'publish-metadata.en-US.json'), metadata);
  await writeJson(path.join(project, 'local-publishing-materials.en-US.json'), material);
  return project;
}

test('syncs only the English master, covers, and copy-ready publishing materials', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'tiny-agent-icloud-sync-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const icloudRoot = path.join(tempRoot, 'iCloud');
  await mkdir(icloudRoot);
  const project = await createEnglishFixture(tempRoot);
  const now = new Date('2026-07-29T03:00:00.000Z');
  const first = await syncEnglishBundle({
    englishProject: project,
    date: '2026-07-29',
    slot: 1,
    icloudRoot,
    retentionHours: 120,
    now,
  });
  assert.equal(first.status, 'synced');
  assert.deepEqual(
    (await readdir(first.destinationDir)).sort(),
    [
      '.tiny-agent-icloud-bundle.json',
      'cover-16x9.en-US.png',
      'cover-3x4.en-US.png',
      'cover-4x3.en-US.png',
      'local-publishing-materials.en-US.json',
      'publish-metadata.en-US.json',
      'publish.txt',
      'video.en-US.mp4',
    ],
  );
  const publishText = await readFile(path.join(first.destinationDir, 'publish.txt'), 'utf8');
  assert.match(publishText, /How AI Agents Choose Work/);
  assert.match(publishText, /COVER TITLE\nMAKE AI AGENTS CHOOSE BETTER/);
  assert.match(publishText, /#AIAgents #TinyAgent/);
  assert.match(publishText, /Which task would you delegate first/);
  assert.doesNotMatch(publishText, /zh-CN|中文/);

  const second = await syncEnglishBundle({
    englishProject: project,
    date: '2026-07-29',
    slot: 1,
    icloudRoot,
    retentionHours: 120,
    now: new Date('2026-07-29T04:00:00.000Z'),
  });
  assert.equal(second.status, 'unchanged');
});

test('cleanup removes only expired, manifest-owned bundles', async (t) => {
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'tiny-agent-icloud-cleanup-'));
  t.after(() => rm(tempRoot, { recursive: true, force: true }));
  const icloudRoot = path.join(tempRoot, 'iCloud');
  await mkdir(icloudRoot);
  const expiredProject = await createEnglishFixture(tempRoot, 'expired-topic');
  const recentProject = await createEnglishFixture(tempRoot, 'recent-topic');
  const expired = await syncEnglishBundle({
    englishProject: expiredProject,
    date: '2026-07-29',
    slot: 1,
    icloudRoot,
    retentionHours: 120,
    now: new Date('2026-07-20T00:00:00.000Z'),
  });
  const recent = await syncEnglishBundle({
    englishProject: recentProject,
    date: '2026-07-29',
    slot: 2,
    icloudRoot,
    retentionHours: 120,
    now: new Date('2026-07-28T00:00:00.000Z'),
  });
  const unmanaged = path.join(
    icloudRoot,
    'Tiny Agent TikTok',
    '2026-07-29',
    'manual-folder',
  );
  await mkdir(unmanaged);
  await writeFile(path.join(unmanaged, 'keep.txt'), 'keep');

  const result = await cleanupExpiredBundles({
    icloudRoot,
    now: new Date('2026-07-29T01:00:00.000Z'),
  });
  assert.deepEqual(result.deleted, [expired.destinationDir]);
  await assert.rejects(readFile(path.join(expired.destinationDir, 'publish.txt')));
  assert.match(
    await readFile(path.join(recent.destinationDir, 'publish.txt'), 'utf8'),
    /How AI Agents Choose Work/,
  );
  assert.equal(await readFile(path.join(unmanaged, 'keep.txt'), 'utf8'), 'keep');
  assert.ok(result.skipped.some((entry) => entry.reason === 'not_expired'));
  assert.ok(result.skipped.some((entry) => entry.reason === 'manifest_missing'));
});
