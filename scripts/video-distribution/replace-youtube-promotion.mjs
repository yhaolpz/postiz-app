#!/usr/bin/env node

import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const previousPromotionLines = new Set([
  'Building something? Take a 60-sec game break. Score to rank your product or profile on https://tapto.top and get more exposure📈 —free, no signup.',
  'Building something? Take a 60-sec game break. Score to rank your product or profile on https://tapto.top/ and get more exposure📈 —free, no signup.',
]);
const replacementPromotionLine =
  'Building something? Turn your product page into a show people want to watch with https://promofast.show/ —hosted, embeddable, and ready to export.';

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

function descriptionDigest(value) {
  return createHash('sha256').update(value).digest('hex');
}

function migrateDescription(description) {
  const lines = String(description || '').split(/\r?\n/);
  const taptoLines = lines.filter((line) => line.includes('tapto.top'));
  const unrecognizedTaptoLines = taptoLines.filter(
    (line) => !previousPromotionLines.has(line.trim())
  );
  const previousLineCount = taptoLines.length - unrecognizedTaptoLines.length;
  if (unrecognizedTaptoLines.length || previousLineCount !== 1) {
    return {
      eligible: false,
      previousLineCount,
      unrecognizedTaptoLines,
      description,
    };
  }
  return {
    eligible: true,
    previousLineCount,
    unrecognizedTaptoLines,
    description: lines
      .map((line) =>
        previousPromotionLines.has(line.trim())
          ? replacementPromotionLine
          : line
      )
      .join('\n'),
  };
}

async function listAllUploadVideoIds(youtube, uploadsPlaylistId) {
  const videoIds = [];
  let pageToken;
  do {
    const response = await youtube.playlistItems.list({
      part: ['contentDetails'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      ...(pageToken ? { pageToken } : {}),
    });
    for (const item of response.data.items || []) {
      if (item.contentDetails?.videoId)
        videoIds.push(item.contentDetails.videoId);
    }
    pageToken = response.data.nextPageToken || undefined;
  } while (pageToken);
  return videoIds;
}

async function listVideos(youtube, videoIds) {
  const videos = [];
  for (let offset = 0; offset < videoIds.length; offset += 50) {
    const response = await youtube.videos.list({
      part: ['snippet', 'status'],
      id: videoIds.slice(offset, offset + 50),
      maxResults: 50,
    });
    videos.push(...(response.data.items || []));
  }
  return videos;
}

async function main() {
  loadDotEnv(path.join(repoRoot, '.env'));
  const apply = process.argv.includes('--apply');
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
      String(process.env.FRONTEND_URL) + '/integrations/social/youtube'
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
    const channelResponse = await youtube.channels.list({
      part: ['contentDetails', 'snippet'],
      mine: true,
      maxResults: 1,
    });
    const channel = channelResponse.data.items?.[0];
    const uploadsPlaylistId =
      channel?.contentDetails?.relatedPlaylists?.uploads;
    assert(
      channel?.id && uploadsPlaylistId,
      'Authorized YouTube channel uploads were not found.'
    );

    const videoIds = await listAllUploadVideoIds(youtube, uploadsPlaylistId);
    const videos = await listVideos(youtube, videoIds);
    const candidates = [];
    const blocked = [];
    const alreadyReplaced = [];

    for (const video of videos) {
      const description = video.snippet?.description || '';
      if (description.includes('promofast.show')) {
        alreadyReplaced.push({
          videoId: video.id,
          title: video.snippet?.title,
          privacyStatus: video.status?.privacyStatus,
        });
      }
      if (!description.includes('tapto.top')) continue;
      const migration = migrateDescription(description);
      const record = {
        videoId: video.id,
        title: video.snippet?.title,
        privacyStatus: video.status?.privacyStatus,
        previousDescriptionSha256: descriptionDigest(description),
        previousLineCount: migration.previousLineCount,
        unrecognizedTaptoLineCount: migration.unrecognizedTaptoLines.length,
      };
      if (video.status?.privacyStatus !== 'public' || !migration.eligible) {
        blocked.push(record);
        continue;
      }
      candidates.push({
        ...record,
        description: migration.description,
        snippet: video.snippet,
      });
    }

    assert(
      blocked.length === 0,
      'Refusing partial migration because ' +
        blocked.length +
        ' TapTo description(s) were not recognized public promotion blocks: ' +
        JSON.stringify(blocked)
    );

    const updated = [];
    if (apply) {
      for (const candidate of candidates) {
        await youtube.videos.update({
          part: ['snippet'],
          requestBody: {
            id: candidate.videoId,
            snippet: {
              title: candidate.snippet.title,
              description: candidate.description,
              categoryId: candidate.snippet.categoryId,
              ...(candidate.snippet.tags?.length
                ? { tags: candidate.snippet.tags }
                : {}),
              ...(candidate.snippet.defaultLanguage
                ? { defaultLanguage: candidate.snippet.defaultLanguage }
                : {}),
              ...(candidate.snippet.defaultAudioLanguage
                ? {
                    defaultAudioLanguage:
                      candidate.snippet.defaultAudioLanguage,
                  }
                : {}),
            },
          },
        });
        updated.push({
          videoId: candidate.videoId,
          url: 'https://www.youtube.com/watch?v=' + candidate.videoId,
          title: candidate.title,
          privacyStatus: candidate.privacyStatus,
          previousDescriptionSha256: candidate.previousDescriptionSha256,
          updatedDescriptionSha256: descriptionDigest(candidate.description),
        });
      }
    }

    let verification = null;
    if (apply) {
      const refreshed = await listVideos(
        youtube,
        candidates.map((candidate) => candidate.videoId)
      );
      const failures = refreshed
        .filter((video) => {
          const description = video.snippet?.description || '';
          return (
            video.status?.privacyStatus !== 'public' ||
            description.includes('tapto.top') ||
            !description.includes(replacementPromotionLine)
          );
        })
        .map((video) => ({
          videoId: video.id,
          privacyStatus: video.status?.privacyStatus,
          hasTapto: video.snippet?.description?.includes('tapto.top') || false,
          hasPromoFast:
            video.snippet?.description?.includes(replacementPromotionLine) ||
            false,
        }));
      assert(
        failures.length === 0,
        'YouTube readback verification failed: ' + JSON.stringify(failures)
      );
      verification = {
        checked: refreshed.length,
        passed: refreshed.length,
        failed: 0,
      };
    }

    const result = {
      ok: true,
      mode: apply ? 'apply' : 'inspect',
      runAt: new Date().toISOString(),
      integrationName: integration.name,
      channelId: channel.id,
      channelTitle: channel.snippet?.title,
      uploadsScanned: videos.length,
      candidates: candidates.map(
        ({ snippet, description, ...candidate }) => candidate
      ),
      blocked,
      alreadyReplaced,
      updated,
      verification,
      replacementPromotionLine,
    };

    if (apply) {
      const receiptPath = path.join(
        repoRoot,
        'var/ai-video-pipeline/maintenance',
        'youtube-promotion-replacement-' +
          new Date().toISOString().slice(0, 10) +
          '.json'
      );
      await fsp.mkdir(path.dirname(receiptPath), { recursive: true });
      await fsp.writeFile(receiptPath, JSON.stringify(result, null, 2) + '\n');
      result.receiptPath = receiptPath;
    }
    process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
