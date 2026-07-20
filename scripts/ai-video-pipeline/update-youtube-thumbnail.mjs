#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith('--')) continue;
    args[value.slice(2)] = argv[index + 1];
    index += 1;
  }
  return args;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    let value = match[2].trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validateThumbnail(thumbnailPath) {
  assert(fs.existsSync(thumbnailPath), `Missing thumbnail: ${thumbnailPath}`);
  const output = execFileSync('magick', ['identify', '-format', '%w %h %[colorspace]', thumbnailPath], {
    encoding: 'utf8',
  }).trim();
  const [width, height, colorSpace] = output.split(/\s+/);
  const sizeBytes = fs.statSync(thumbnailPath).size;
  assert(path.extname(thumbnailPath).toLowerCase() === '.png', 'Thumbnail must use PNG.');
  assert(Number(width) === 3840 && Number(height) === 2160, `Thumbnail is ${width}x${height}, expected 3840x2160.`);
  assert(colorSpace.toLowerCase() === 'srgb', `Thumbnail color space is ${colorSpace}, expected sRGB.`);
  assert(sizeBytes <= 2 * 1024 * 1024, `Thumbnail exceeds 2 MB: ${sizeBytes} bytes.`);
  return { width: Number(width), height: Number(height), colorSpace, sizeBytes };
}

async function main() {
  loadDotEnv(path.join(repoRoot, '.env'));
  const args = parseArgs(process.argv.slice(2));
  assert(args['video-id'], '--video-id is required.');
  assert(args.thumbnail, '--thumbnail is required.');
  const thumbnailPath = path.resolve(args.thumbnail);
  const thumbnail = validateThumbnail(thumbnailPath);

  assert(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET, 'YouTube OAuth client configuration is missing.');
  const prisma = new PrismaClient();
  try {
    const integration = await prisma.integration.findFirst({
      where: { providerIdentifier: 'youtube', deletedAt: null, disabled: false },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        token: true,
        refreshToken: true,
        tokenExpiration: true,
        refreshNeeded: true,
      },
    });
    assert(integration && /indieseek/i.test(integration.name || ''), 'Enabled IndieSeek YouTube integration was not found.');
    assert(!integration.refreshNeeded, 'YouTube integration requires manual reconnection.');
    assert(integration.refreshToken, 'YouTube refresh token is missing.');

    const auth = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/integrations/social/youtube`
    );
    auth.setCredentials({
      access_token: integration.token,
      refresh_token: integration.refreshToken,
      expiry_date: integration.tokenExpiration?.getTime(),
    });
    if (!integration.tokenExpiration || integration.tokenExpiration.getTime() < Date.now() + 5 * 60 * 1000) {
      const { credentials } = await auth.refreshAccessToken();
      assert(credentials.access_token, 'YouTube token refresh returned no access token.');
      const refreshToken = credentials.refresh_token || integration.refreshToken;
      auth.setCredentials({ ...credentials, refresh_token: refreshToken });
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          token: credentials.access_token,
          refreshToken,
          tokenExpiration: credentials.expiry_date ? new Date(credentials.expiry_date) : integration.tokenExpiration,
          refreshNeeded: false,
          disabled: false,
        },
      });
    }

    const youtube = google.youtube({ version: 'v3', auth });
    const setResponse = await youtube.thumbnails.set({
      videoId: args['video-id'],
      media: { body: fs.createReadStream(thumbnailPath) },
    });
    assert(setResponse.data.items?.length, 'YouTube did not confirm the custom thumbnail update.');
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: [args['video-id']],
    });
    const video = videoResponse.data.items?.[0];
    assert(video, 'YouTube did not return the video after the thumbnail update.');
    assert(video.status?.privacyStatus === 'public', 'The YouTube video is no longer public.');

    const result = {
      updatedAt: new Date().toISOString(),
      videoId: args['video-id'],
      url: `https://www.youtube.com/watch?v=${args['video-id']}`,
      privacyStatus: video.status.privacyStatus,
      thumbnail: {
        path: path.relative(repoRoot, thumbnailPath),
        ...thumbnail,
        sha256: crypto.createHash('sha256').update(await fsp.readFile(thumbnailPath)).digest('hex'),
        youtubeConfirmedSizes: Object.keys(setResponse.data.items[0] || {}),
      },
    };
    const resultPath = args.output
      ? path.resolve(args.output)
      : path.join(path.dirname(thumbnailPath), 'youtube-thumbnail-result.json');
    await fsp.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(`${JSON.stringify({ ok: true, resultPath, result }, null, 2)}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
