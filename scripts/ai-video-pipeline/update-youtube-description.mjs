#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

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
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  loadDotEnv(path.join(repoRoot, '.env'));
  const args = parseArgs(process.argv.slice(2));
  assert(args['video-id'], '--video-id is required.');
  assert(args.metadata, '--metadata is required.');

  const metadataPath = path.resolve(args.metadata);
  const metadata = JSON.parse(await fsp.readFile(metadataPath, 'utf8'));
  const description = metadata.description?.trim();
  assert(description, 'Metadata description is empty.');
  assert(
    !/https?:\/\//i.test(description),
    'Description contains an external URL.'
  );
  assert(
    !/(^|\n)\s*(source|来源)\s*[:：]/im.test(description),
    'Description contains a source section.'
  );

  assert(
    process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET,
    'YouTube OAuth client configuration is missing.'
  );
  const prisma = new PrismaClient();
  try {
    const integration = await prisma.integration.findFirst({
      where: {
        providerIdentifier: 'youtube',
        deletedAt: null,
        disabled: false,
      },
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
    assert(
      integration && /indieseek/i.test(integration.name || ''),
      'Enabled IndieSeek YouTube integration was not found.'
    );
    assert(
      !integration.refreshNeeded,
      'YouTube integration requires manual reconnection.'
    );
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

    if (
      !integration.tokenExpiration ||
      integration.tokenExpiration.getTime() < Date.now() + 5 * 60 * 1000
    ) {
      const { credentials } = await auth.refreshAccessToken();
      assert(
        credentials.access_token,
        'YouTube token refresh returned no access token.'
      );
      const refreshToken =
        credentials.refresh_token || integration.refreshToken;
      auth.setCredentials({ ...credentials, refresh_token: refreshToken });
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

    const youtube = google.youtube({ version: 'v3', auth });
    const beforeResponse = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: [args['video-id']],
    });
    const before = beforeResponse.data.items?.[0];
    assert(before?.snippet, 'YouTube did not return the target video.');
    assert(
      before.status?.privacyStatus === 'public',
      'The target YouTube video is not public.'
    );

    await youtube.videos.update({
      part: ['snippet'],
      requestBody: {
        id: args['video-id'],
        snippet: {
          title: before.snippet.title,
          description,
          categoryId: before.snippet.categoryId,
          ...(before.snippet.tags?.length ? { tags: before.snippet.tags } : {}),
          ...(before.snippet.defaultLanguage
            ? { defaultLanguage: before.snippet.defaultLanguage }
            : {}),
          ...(before.snippet.defaultAudioLanguage
            ? { defaultAudioLanguage: before.snippet.defaultAudioLanguage }
            : {}),
        },
      },
    });

    const afterResponse = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: [args['video-id']],
    });
    const after = afterResponse.data.items?.[0];
    assert(
      after?.snippet?.description === description,
      'YouTube description verification did not match the requested text.'
    );
    assert(
      after.status?.privacyStatus === 'public',
      'The YouTube video is no longer public after the update.'
    );

    const result = {
      updatedAt: new Date().toISOString(),
      videoId: args['video-id'],
      url: `https://www.youtube.com/watch?v=${args['video-id']}`,
      privacyStatus: after.status.privacyStatus,
      title: after.snippet.title,
      descriptionLength: description.length,
      hasExternalUrl: /https?:\/\//i.test(description),
      hasSourceSection: /(^|\n)\s*(source|来源)\s*[:：]/im.test(description),
      fixedFollowSentencePresent: description.includes(
        'Follow Tiny Agent. Tiny Agent helps you get better at using AI.'
      ),
    };
    const outputPath = args.output
      ? path.resolve(args.output)
      : path.join(
          path.dirname(metadataPath),
          'youtube-description-update-result.json'
        );
    await fsp.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(
      `${JSON.stringify({ ok: true, outputPath, result }, null, 2)}\n`
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
