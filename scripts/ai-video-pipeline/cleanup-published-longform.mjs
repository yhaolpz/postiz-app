#!/usr/bin/env node

import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const defaultManifestDir = path.join(
  rootDir,
  'var/ai-video-pipeline/longform/published'
);

function loadDotEnv(filePath) {
  if (!fssync.existsSync(filePath)) return;
  for (const line of fssync.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
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

function isEligible(publishedAt, retentionHours, now) {
  const publishedTime = new Date(publishedAt).getTime();
  if (!Number.isFinite(publishedTime)) return false;
  return now.getTime() >= publishedTime + retentionHours * 60 * 60 * 1000;
}

function assertSafeVideoPath(videoPath, manifestDate) {
  const absolutePath = path.resolve(rootDir, videoPath);
  const relativePath = path.relative(rootDir, absolutePath);
  const allowedPrefixes = [
    `var/hyperframes-showcases/${manifestDate}-`,
    `var/ai-video-pipeline/longform/${manifestDate}-`,
    `var/ai-video-pipeline/longform/runs/${manifestDate}-`,
  ];

  if (
    relativePath.startsWith('..') ||
    path.isAbsolute(relativePath) ||
    path.extname(absolutePath).toLowerCase() !== '.mp4' ||
    !allowedPrefixes.some((prefix) => relativePath.startsWith(prefix))
  ) {
    throw new Error(`Refusing unsafe cleanup path: ${videoPath}`);
  }

  return { absolutePath, relativePath };
}

async function getYoutubeClient(prisma) {
  const integration = await prisma.integration.findFirst({
    where: {
      providerIdentifier: 'youtube',
      deletedAt: null,
      disabled: false,
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (!integration) throw new Error('No enabled YouTube integration found.');
  if (!integration.refreshToken) throw new Error('YouTube refresh token is missing.');
  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('YouTube OAuth client configuration is missing.');
  }

  const oauth = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/integrations/social/youtube`
  );
  oauth.setCredentials({
    access_token: integration.token,
    refresh_token: integration.refreshToken,
    expiry_date: integration.tokenExpiration?.getTime(),
  });

  if (
    !integration.tokenExpiration ||
    integration.tokenExpiration.getTime() < Date.now() + 5 * 60 * 1000
  ) {
    const { credentials } = await oauth.refreshAccessToken();
    if (!credentials.access_token) {
      throw new Error('YouTube token refresh returned no access token.');
    }
    const refreshToken = credentials.refresh_token || integration.refreshToken;
    oauth.setCredentials({ ...credentials, refresh_token: refreshToken });
    await prisma.integration.update({
      where: { id: integration.id },
      data: {
        token: credentials.access_token,
        refreshToken,
        tokenExpiration: credentials.expiry_date
          ? new Date(credentials.expiry_date)
          : integration.tokenExpiration,
        refreshNeeded: false,
        disabled: false,
      },
    });
  }

  return google.youtube({ version: 'v3', auth: oauth });
}

async function verifyYoutubePublication(youtube, manifest) {
  const videoId = manifest.youtube?.videoId;
  const playlistId = manifest.youtube?.playlistId;
  if (!videoId || !playlistId) {
    throw new Error('Manifest is missing YouTube videoId or playlistId.');
  }

  const videoResponse = await youtube.videos.list({
    part: ['id', 'status'],
    id: [videoId],
  });
  const video = videoResponse.data.items?.[0];
  if (!video || video.status?.privacyStatus !== 'public') {
    throw new Error(`YouTube video ${videoId} is not public.`);
  }

  const playlistResponse = await youtube.playlistItems.list({
    part: ['id'],
    playlistId,
    videoId,
    maxResults: 1,
  });
  if (!playlistResponse.data.items?.length) {
    throw new Error(`YouTube video ${videoId} is not in playlist ${playlistId}.`);
  }
}

async function readManifests(manifestDir) {
  if (!fssync.existsSync(manifestDir)) return [];
  const entries = await fs.readdir(manifestDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .map((entry) => path.join(manifestDir, entry.name))
    .sort();
}

async function main() {
  loadDotEnv(path.join(rootDir, '.env'));
  const args = parseArgs(process.argv.slice(2));
  const apply = Boolean(args.apply);
  const retentionHours = Number(args['retention-hours'] || 48);
  if (!Number.isFinite(retentionHours) || retentionHours < 48) {
    throw new Error('Retention must be at least 48 hours.');
  }

  const manifestDir = path.resolve(args['manifest-dir'] || defaultManifestDir);
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

  let prisma;
  let youtube;
  try {
    for (const manifestPath of manifests) {
      const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
      if (manifest.cleanup?.status === 'deleted') {
        report.skipped += 1;
        continue;
      }
      const manifestRetentionHours = Number(
        manifest.cleanup?.retentionHours || retentionHours
      );
      const effectiveRetentionHours = Math.max(
        retentionHours,
        Number.isFinite(manifestRetentionHours) ? manifestRetentionHours : retentionHours
      );
      if (!isEligible(manifest.publishedAt, effectiveRetentionHours, now)) {
        report.skipped += 1;
        continue;
      }

      report.eligible += 1;
      try {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(manifest.date || '')) {
          throw new Error('Manifest date must use YYYY-MM-DD.');
        }
        const paths = [...new Set(manifest.videoPaths || [])];
        if (paths.length < 2) {
          throw new Error('Bilingual cleanup manifest must contain both MP4 paths.');
        }
        const safePaths = paths.map((item) => assertSafeVideoPath(item, manifest.date));

        if (!youtube) {
          prisma = new PrismaClient();
          youtube = await getYoutubeClient(prisma);
        }
        await verifyYoutubePublication(youtube, manifest);

        const existing = [];
        const missing = [];
        for (const item of safePaths) {
          if (!fssync.existsSync(item.absolutePath)) {
            missing.push(item.relativePath);
            continue;
          }
          const stats = await fs.lstat(item.absolutePath);
          if (!stats.isFile() || stats.isSymbolicLink()) {
            throw new Error(`Refusing non-file or symlink: ${item.relativePath}`);
          }
          existing.push(item);
        }

        if (apply) {
          for (const item of existing) await fs.unlink(item.absolutePath);
          manifest.cleanup = {
            retentionHours: effectiveRetentionHours,
            status: 'deleted',
            eligibleAt: new Date(
              new Date(manifest.publishedAt).getTime() +
                effectiveRetentionHours * 60 * 60 * 1000
            ).toISOString(),
            deletedAt: now.toISOString(),
            deletedPaths: existing.map((item) => item.relativePath),
            missingPaths: missing,
          };
          await fs.writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
          report.cleaned += 1;
        }

        report.items.push({
          manifest: path.relative(rootDir, manifestPath),
          videoId: manifest.youtube.videoId,
          action: apply ? 'deleted' : 'would-delete',
          paths: existing.map((item) => item.relativePath),
          missing,
        });
      } catch (error) {
        report.errors.push({
          manifest: path.relative(rootDir, manifestPath),
          error: error.message,
        });
      }
    }
  } finally {
    if (prisma) await prisma.$disconnect();
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.errors.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
