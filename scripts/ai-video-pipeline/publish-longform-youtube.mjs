#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const { PrismaClient } = require('@prisma/client');
const { google } = require('googleapis');
const {
  Connection,
  WorkflowClient,
  WorkflowIdConflictPolicy,
} = require('@temporalio/client');
const {
  TypedSearchAttributes,
  defineSearchAttributeKey,
  SearchAttributeType,
} = require('@temporalio/common');

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function loadDotEnv(filePath) {
  if (!fssync.existsSync(filePath)) return;
  for (const line of fssync.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [rawKey, ...rest] = trimmed.split('=');
    const key = rawKey.trim();
    if (process.env[key]) continue;
    let value = rest.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    if (['preflight', 'wait'].includes(key)) {
      args[key] = true;
    } else {
      args[key] = argv[index + 1];
      index += 1;
    }
  }
  return args;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function hasAiAgentIdentity(title) {
  return /\bAI[\s-]+Agents?\b/i.test(String(title || ''));
}

function getPostizBaseUrl() {
  return (process.env.POSTIZ_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000').replace(/\/$/, '');
}

async function postizFetch(pathname, options = {}) {
  const url = `${getPostizBaseUrl()}${pathname}`;
  const response = await fetch(url, options);
  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    body = text;
  }
  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`);
  }
  return body;
}

async function getLocalOrganization() {
  assert(process.env.DATABASE_URL, 'DATABASE_URL is required for local Postiz publishing.');
  const prisma = new PrismaClient();
  try {
    return await prisma.organization.findFirst({
      orderBy: { createdAt: 'desc' },
      select: { id: true, apiKey: true },
    });
  } finally {
    await prisma.$disconnect();
  }
}

function probeVideo(videoPath) {
  const result = JSON.parse(execFileSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration:stream=index,codec_name,codec_type,width,height,r_frame_rate',
    '-of', 'json',
    videoPath,
  ], { encoding: 'utf8' }));
  const video = result.streams.find((stream) => stream.codec_type === 'video');
  const audio = result.streams.find((stream) => stream.codec_type === 'audio');
  const [fpsNumerator, fpsDenominator] = String(video?.r_frame_rate || '').split('/').map(Number);
  const fps = fpsDenominator ? fpsNumerator / fpsDenominator : 0;
  return {
    durationSeconds: Number(result.format?.duration),
    width: video?.width,
    height: video?.height,
    fps,
    videoCodec: video?.codec_name,
    audioCodec: audio?.codec_name,
  };
}

function validateThumbnail(thumbnailPath) {
  assert(thumbnailPath && fssync.existsSync(thumbnailPath), 'English thumbnail is required.');
  assert(path.extname(thumbnailPath).toLowerCase() === '.png', 'English thumbnail must use PNG.');
  const output = execFileSync('magick', [
    'identify',
    '-format',
    '%w %h %[colorspace]',
    thumbnailPath,
  ], { encoding: 'utf8' }).trim();
  const [width, height, colorSpace] = output.split(/\s+/);
  const sizeBytes = fssync.statSync(thumbnailPath).size;
  assert(Number(width) === 3840 && Number(height) === 2160, `Expected a 3840x2160 thumbnail, got ${width}x${height}.`);
  assert(String(colorSpace).toLowerCase() === 'srgb', `Expected an sRGB thumbnail, got ${colorSpace}.`);
  assert(sizeBytes <= 2 * 1024 * 1024, `Thumbnail exceeds 2 MB: ${sizeBytes} bytes.`);
  return { path: thumbnailPath, width: Number(width), height: Number(height), colorSpace, sizeBytes };
}

function validateInputs(videoPath, metadata) {
  assert(metadata.language === 'en-US', 'Only en-US long-form metadata may be published.');
  assert(metadata.youtube?.visibility === 'public', 'YouTube visibility must be public.');
  assert(metadata.youtube?.selfDeclaredMadeForKids === 'no', 'selfDeclaredMadeForKids must be no.');
  assert(metadata.youtube?.playlistId === 'PLJffvaWRvGC8', 'Unexpected YouTube playlist ID.');
  assert(metadata.youtube?.playlistTitle === 'AI Agents: From Chat to Done', 'Unexpected YouTube playlist title.');
  assert(metadata.youtube?.playlistPrivacyStatus === 'public', 'Playlist privacy must be public.');
  assert(Array.isArray(metadata.titleCandidates) && metadata.titleCandidates.length === 3, 'Exactly three title candidates are required.');
  assert(hasAiAgentIdentity(metadata.title), 'Final YouTube title must naturally contain AI Agent or AI Agents.');
  metadata.titleCandidates.forEach((title, index) => {
    assert(hasAiAgentIdentity(title), `YouTube title candidate ${index + 1} must naturally contain AI Agent or AI Agents.`);
  });
  assert(hasAiAgentIdentity(metadata.thumbnailText), 'English thumbnail text must naturally contain AI Agent or AI Agents.');
  assert(metadata.title.length <= 100, 'YouTube title exceeds 100 characters.');
  assert(!/https?:\/\//i.test(metadata.description), 'YouTube description must not contain external URLs.');
  assert(
    !metadata.source?.publisher || !metadata.description.toLowerCase().includes(metadata.source.publisher.toLowerCase()),
    'YouTube description must not contain the source publisher.',
  );
  assert(
    !metadata.source?.title || !metadata.description.toLowerCase().includes(metadata.source.title.toLowerCase()),
    'YouTube description must not contain the source title.',
  );

  const probe = probeVideo(videoPath);
  assert(probe.width === 1920 && probe.height === 1080, `Expected 1920x1080, got ${probe.width}x${probe.height}.`);
  assert(Math.abs(probe.fps - 30) < 0.01, `Expected 30fps, got ${probe.fps}.`);
  assert(probe.videoCodec === 'h264', `Expected H.264, got ${probe.videoCodec}.`);
  assert(probe.audioCodec === 'aac', `Expected AAC, got ${probe.audioCodec}.`);
  assert(probe.durationSeconds >= 300 && probe.durationSeconds <= 720, `Duration ${probe.durationSeconds}s is outside 5-12 minutes.`);
  return probe;
}

function shouldRefreshToken(expiration) {
  return !expiration || new Date(expiration).getTime() < Date.now() + 5 * 60 * 1000;
}

async function refreshYoutubeIntegration(integrationId) {
  const prisma = new PrismaClient();
  try {
    const integration = await prisma.integration.findUnique({
      where: { id: integrationId },
      select: {
        id: true,
        tokenExpiration: true,
        token: true,
        refreshToken: true,
        refreshNeeded: true,
        disabled: true,
      },
    });
    assert(integration, 'YouTube integration was not found in the local database.');
    assert(!integration.disabled, 'YouTube integration is disabled.');
    assert(!integration.refreshNeeded, 'YouTube integration requires manual reconnection.');
    if (!shouldRefreshToken(integration.tokenExpiration)) return integration.token;

    assert(integration.refreshToken, 'YouTube refresh token is missing; reconnect the channel.');
    assert(process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET, 'YouTube OAuth client configuration is missing.');
    const client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/integrations/social/youtube`,
    );
    client.setCredentials({ refresh_token: integration.refreshToken });
    const { credentials } = await client.refreshAccessToken();
    assert(credentials.access_token && credentials.expiry_date, 'YouTube refresh returned no usable access token.');
    await prisma.integration.update({
      where: { id: integrationId },
      data: {
        token: credentials.access_token,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiration: new Date(credentials.expiry_date),
        refreshNeeded: false,
        disabled: false,
      },
    });
    return credentials.access_token;
  } finally {
    await prisma.$disconnect();
  }
}

async function ensureTemporalSearchAttributes() {
  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
  try {
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    const { customAttributes } = await connection.operatorService.listSearchAttributes({ namespace });
    const missing = ['organizationId', 'postId'].filter((name) => !customAttributes[name]);
    if (missing.length) {
      await connection.operatorService.addSearchAttributes({
        namespace,
        searchAttributes: Object.fromEntries(missing.map((name) => [name, 1])),
      });
    }
  } finally {
    await connection.close();
  }
}

async function uploadMedia(apiKey, filePath, mimeType) {
  const formData = new FormData();
  const buffer = await fs.readFile(filePath);
  formData.append('file', new Blob([buffer], { type: mimeType }), path.basename(filePath));
  return postizFetch('/public/v1/upload', {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: formData,
  });
}

async function createPost(apiKey, integrationId, media, thumbnail, metadata) {
  const mediaDto = { id: media.id, path: media.path };
  const thumbnailDto = { id: thumbnail.id, path: thumbnail.path };
  const body = {
    type: 'now',
    date: new Date(Date.now() + 15_000).toISOString(),
    shortLink: false,
    tags: [],
    creationMethod: 'API',
    posts: [{
      integration: { id: integrationId },
      settings: {
        title: metadata.title,
        type: 'public',
        selfDeclaredMadeForKids: 'no',
        tags: metadata.tags.slice(0, 10).map((tag) => ({ value: tag, label: tag })),
        playlistId: metadata.youtube.playlistId,
        playlistTitle: metadata.youtube.playlistTitle,
        playlistPrivacyStatus: metadata.youtube.playlistPrivacyStatus,
        thumbnail: thumbnailDto,
      },
      value: [{ content: metadata.description, image: [mediaDto] }],
    }],
  };
  return postizFetch('/public/v1/posts', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function startWorkflow(postId, organizationId) {
  const connection = await Connection.connect({ address: process.env.TEMPORAL_ADDRESS || 'localhost:7233' });
  try {
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    const client = new WorkflowClient({ connection, namespace });
    const postIdKey = defineSearchAttributeKey('postId', SearchAttributeType.TEXT);
    const organizationIdKey = defineSearchAttributeKey('organizationId', SearchAttributeType.TEXT);
    await client.start('postWorkflowV105', {
      workflowId: `post_${postId}`,
      taskQueue: 'main',
      workflowIdConflictPolicy: WorkflowIdConflictPolicy.TERMINATE_EXISTING,
      args: [{ taskQueue: 'youtube', postId, organizationId }],
      typedSearchAttributes: new TypedSearchAttributes([
        { key: postIdKey, value: postId },
        { key: organizationIdKey, value: organizationId },
      ]),
    });
  } finally {
    await connection.close();
  }
}

async function waitForPost(postId, timeoutSeconds) {
  const prisma = new PrismaClient();
  const startedAt = Date.now();
  try {
    while (Date.now() - startedAt < timeoutSeconds * 1000) {
      const post = await prisma.post.findUnique({
        where: { id: postId },
        select: {
          id: true,
          state: true,
          error: true,
          releaseURL: true,
          integration: { select: { providerIdentifier: true, name: true } },
        },
      });
      process.stdout.write(`\ryoutube:${post?.state || 'MISSING'}`.padEnd(80));
      if (post && ['PUBLISHED', 'ERROR'].includes(post.state)) {
        process.stdout.write('\n');
        return post;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    process.stdout.write('\n');
    throw new Error(`Timed out after ${timeoutSeconds}s waiting for Postiz.`);
  } finally {
    await prisma.$disconnect();
  }
}

function youtubeVideoId(url) {
  const parsed = new URL(url);
  if (parsed.hostname === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0];
  if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (['shorts', 'live', 'embed'].includes(parts[0])) return parts[1];
  return undefined;
}

async function verifyYoutube(accessToken, releaseURL, metadata) {
  const videoId = youtubeVideoId(releaseURL);
  assert(videoId, `Unable to parse a YouTube video ID from ${releaseURL}.`);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const youtube = google.youtube({ version: 'v3', auth });

  const [videoResponse, playlistItemResponse, playlistResponse, pageResponse] = await Promise.all([
    youtube.videos.list({ part: ['snippet', 'status'], id: [videoId] }),
    youtube.playlistItems.list({ part: ['snippet'], playlistId: metadata.youtube.playlistId, videoId, maxResults: 1 }),
    youtube.playlists.list({ part: ['snippet', 'status'], id: [metadata.youtube.playlistId] }),
    fetch(releaseURL, { redirect: 'follow' }),
  ]);
  const video = videoResponse.data.items?.[0];
  const playlist = playlistResponse.data.items?.[0];
  assert(video, 'YouTube API did not return the published video.');
  assert(video.status?.privacyStatus === 'public', `YouTube privacy is ${video.status?.privacyStatus || 'unknown'}, not public.`);
  assert(playlistItemResponse.data.items?.length > 0, 'The video is not in the required playlist.');
  assert(playlist, 'The required playlist was not found.');
  assert(playlist.snippet?.title === metadata.youtube.playlistTitle, `Playlist title is ${playlist.snippet?.title || 'unknown'}.`);
  assert(playlist.status?.privacyStatus === 'public', `Playlist privacy is ${playlist.status?.privacyStatus || 'unknown'}.`);
  assert(pageResponse.ok, `Public release URL returned HTTP ${pageResponse.status}.`);

  return {
    verifiedAt: new Date().toISOString(),
    publishedAt: video.snippet?.publishedAt,
    videoId,
    url: releaseURL,
    title: video.snippet?.title,
    privacyStatus: video.status?.privacyStatus,
    selfDeclaredMadeForKids: video.status?.selfDeclaredMadeForKids ?? false,
    releaseUrlHttpStatus: pageResponse.status,
    playlistId: metadata.youtube.playlistId,
    playlistTitle: playlist.snippet?.title,
    playlistPrivacyStatus: playlist.status?.privacyStatus,
    inPlaylist: true,
  };
}

async function main() {
  loadDotEnv(path.join(repoRoot, '.env'));
  const args = parseArgs(process.argv.slice(2));
  const metadataPath = path.resolve(args.metadata || 'publish-metadata.en-US.json');
  const videoPath = args.video ? path.resolve(args.video) : undefined;
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const thumbnailPath = args.thumbnail
    ? path.resolve(args.thumbnail)
    : metadata.thumbnailFile
      ? path.resolve(path.dirname(metadataPath), metadata.thumbnailFile)
      : undefined;
  const organization = await getLocalOrganization();
  assert(organization?.apiKey && organization?.id, 'No local Postiz organization/API key was found.');

  const integrations = await postizFetch('/public/v1/integrations', {
    headers: { Authorization: organization.apiKey },
  });
  const enabledYoutube = integrations.filter((item) => item.identifier === 'youtube' && !item.disabled);
  const integration = enabledYoutube.find((item) => /indieseek/i.test(item.name || ''))
    || (enabledYoutube.length === 1 ? enabledYoutube[0] : undefined);
  assert(integration, 'An enabled IndieSeek YouTube integration could not be identified.');

  if (args.preflight) {
    process.stdout.write(`${JSON.stringify({
      ok: true,
      postizUrl: getPostizBaseUrl(),
      organizationId: organization.id,
      integration: { id: integration.id, name: integration.name, identifier: integration.identifier },
      playlistId: metadata.youtube?.playlistId,
      thumbnailPath,
    }, null, 2)}\n`);
    return;
  }

  assert(videoPath && fssync.existsSync(videoPath), '--video must point to the rendered English MP4.');
  const probe = validateInputs(videoPath, metadata);
  const thumbnailProbe = validateThumbnail(thumbnailPath);
  const accessToken = await refreshYoutubeIntegration(integration.id);
  await ensureTemporalSearchAttributes();
  const media = await uploadMedia(organization.apiKey, videoPath, 'video/mp4');
  assert(media?.id && media?.path, 'Postiz upload did not return a media id/path.');
  const thumbnail = await uploadMedia(organization.apiKey, thumbnailPath, 'image/png');
  assert(thumbnail?.id && thumbnail?.path, 'Postiz thumbnail upload did not return a media id/path.');
  const postResponse = await createPost(organization.apiKey, integration.id, media, thumbnail, metadata);
  const postId = postResponse?.[0]?.postId;
  assert(postId, 'Postiz did not return a post ID.');
  await startWorkflow(postId, organization.id);
  const post = await waitForPost(postId, Number(args.timeout || 1200));
  assert(post.state === 'PUBLISHED', `Postiz publishing failed: ${post.error || post.state}`);
  assert(post.releaseURL, 'Postiz published without a release URL.');
  const youtube = await verifyYoutube(accessToken, post.releaseURL, metadata);
  const result = {
    publishedVia: 'local-postiz',
    createdAt: new Date().toISOString(),
    postiz: {
      postId,
      state: post.state,
      integrationId: integration.id,
      integrationName: integration.name,
      mediaId: media.id,
      thumbnailMediaId: thumbnail.id,
    },
    video: { path: videoPath, ...probe },
    thumbnail: { ...thumbnailProbe, submittedWithPostizVideo: true },
    youtube,
  };
  const resultPath = path.join(path.dirname(metadataPath), 'youtube-publish-result.json');
  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ ok: true, resultPath, youtube }, null, 2)}\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
