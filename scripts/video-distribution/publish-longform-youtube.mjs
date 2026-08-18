#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { validateImportedBundle } from './import-release-bundle.mjs';
import {
  buildYoutubeDescription,
  buildYoutubeTags,
  resolveYoutubeLongformPolicy,
} from './youtube-longform-policy.mjs';
import {
  buildYoutubeShortTags,
  resolveYoutubeShortPolicy,
} from './youtube-short-policy.mjs';

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

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

function loadDotEnv(filePath) {
  if (!fssync.existsSync(filePath)) return;
  for (const line of fssync.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const [rawKey, ...rest] = trimmed.split('=');
    const key = rawKey.trim();
    if (process.env[key]) continue;
    let value = rest.join('=').trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index];
    if (item === '--') continue;
    if (!item.startsWith('--')) continue;
    const key = item.slice(2);
    if (
      ['preflight', 'wait', 'recover-existing-without-thumbnail'].includes(key)
    ) {
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
  return (
    process.env.POSTIZ_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
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
    throw new Error(
      `${options.method || 'GET'} ${url} failed: ${
        response.status
      } ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function getLocalOrganization() {
  assert(
    process.env.DATABASE_URL,
    'DATABASE_URL is required for local Postiz publishing.'
  );
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
  const result = JSON.parse(
    execFileSync(
      'ffprobe',
      [
        '-v',
        'error',
        '-show_entries',
        'format=duration:stream=index,codec_name,codec_type,width,height,r_frame_rate',
        '-of',
        'json',
        videoPath,
      ],
      { encoding: 'utf8' }
    )
  );
  const video = result.streams.find((stream) => stream.codec_type === 'video');
  const audio = result.streams.find((stream) => stream.codec_type === 'audio');
  const [fpsNumerator, fpsDenominator] = String(video?.r_frame_rate || '')
    .split('/')
    .map(Number);
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
  assert(
    thumbnailPath && fssync.existsSync(thumbnailPath),
    'English thumbnail is required.'
  );
  assert(
    path.extname(thumbnailPath).toLowerCase() === '.png',
    'English thumbnail must use PNG.'
  );
  const output = execFileSync(
    'magick',
    ['identify', '-format', '%w %h %[colorspace]', thumbnailPath],
    { encoding: 'utf8' }
  ).trim();
  const [width, height, colorSpace] = output.split(/\s+/);
  const sizeBytes = fssync.statSync(thumbnailPath).size;
  assert(
    Number(width) === 3840 && Number(height) === 2160,
    `Expected a 3840x2160 thumbnail, got ${width}x${height}.`
  );
  assert(
    String(colorSpace).toLowerCase() === 'srgb',
    `Expected an sRGB thumbnail, got ${colorSpace}.`
  );
  assert(
    sizeBytes <= 2 * 1024 * 1024,
    `Thumbnail exceeds 2 MB: ${sizeBytes} bytes.`
  );
  return {
    path: thumbnailPath,
    width: Number(width),
    height: Number(height),
    colorSpace,
    sizeBytes,
  };
}

function validateInputs(videoPath, metadata, youtubePolicy, videoKind) {
  assert(
    (metadata.language || metadata.locale) === 'en-US',
    'Only en-US metadata may be published.'
  );
  assert(
    youtubePolicy.visibility === 'public',
    'YouTube visibility must be public.'
  );
  assert(
    youtubePolicy.selfDeclaredMadeForKids === 'no',
    'selfDeclaredMadeForKids must be no.'
  );
  if (videoKind === 'longform') {
    assert(
      youtubePolicy.playlistId === 'PLJffvaWRvGC8',
      'Unexpected YouTube playlist ID.'
    );
    assert(
      youtubePolicy.playlistTitle === 'AI Agents: From Chat to Done',
      'Unexpected YouTube playlist title.'
    );
    assert(
      youtubePolicy.playlistPrivacyStatus === 'public',
      'Playlist privacy must be public.'
    );
    assert(
      Array.isArray(metadata.titleCandidates) &&
        metadata.titleCandidates.length >= 1,
      'At least one title candidate is required.'
    );
    assert(
      metadata.titleCandidates.includes(metadata.title),
      'Title candidates must include the final YouTube title.'
    );
    assert(
      hasAiAgentIdentity(metadata.title),
      'Final YouTube title must naturally contain AI Agent or AI Agents.'
    );
    metadata.titleCandidates.forEach((title, index) => {
      assert(
        hasAiAgentIdentity(title),
        `YouTube title candidate ${
          index + 1
        } must naturally contain AI Agent or AI Agents.`
      );
    });
    assert(
      hasAiAgentIdentity(metadata.thumbnailText),
      'English thumbnail text must naturally contain AI Agent or AI Agents.'
    );
  } else {
    assert(
      videoKind === 'short',
      `Unsupported YouTube video kind: ${videoKind}`
    );
    assert(
      /^Understand .+ in One Minute$/.test(metadata.title),
      'English Short title must use Understand {concept} in One Minute.'
    );
    assert(
      metadata.tags.includes('Shorts'),
      'English Short metadata must include the Shorts tag.'
    );
    assert(
      metadata.tags.includes('TinyAgent'),
      'English Short metadata must include the TinyAgent tag.'
    );
  }
  assert(metadata.title.length <= 100, 'YouTube title exceeds 100 characters.');
  assert(
    !/https?:\/\//i.test(metadata.description),
    'YouTube description must not contain external URLs.'
  );
  assert(
    !metadata.source?.publisher ||
      !metadata.description
        .toLowerCase()
        .includes(metadata.source.publisher.toLowerCase()),
    'YouTube description must not contain the source publisher.'
  );
  assert(
    !metadata.source?.title ||
      !metadata.description
        .toLowerCase()
        .includes(metadata.source.title.toLowerCase()),
    'YouTube description must not contain the source title.'
  );

  const probe = probeVideo(videoPath);
  const expectedSize = videoKind === 'short' ? [1080, 1920] : [1920, 1080];
  assert(
    probe.width === expectedSize[0] && probe.height === expectedSize[1],
    `Expected ${expectedSize.join('x')}, got ${probe.width}x${probe.height}.`
  );
  assert(Math.abs(probe.fps - 30) < 0.01, `Expected 30fps, got ${probe.fps}.`);
  assert(
    probe.videoCodec === 'h264',
    `Expected H.264, got ${probe.videoCodec}.`
  );
  assert(probe.audioCodec === 'aac', `Expected AAC, got ${probe.audioCodec}.`);
  if (videoKind === 'short') {
    assert(
      probe.durationSeconds >= 50 && probe.durationSeconds <= 65,
      `Duration ${probe.durationSeconds}s is outside 50-65 seconds.`
    );
  } else {
    assert(
      probe.durationSeconds >= 300 && probe.durationSeconds <= 480,
      `Duration ${probe.durationSeconds}s is outside 5-8 minutes.`
    );
  }
  return probe;
}

function shouldRefreshToken(expiration) {
  return (
    !expiration || new Date(expiration).getTime() < Date.now() + 5 * 60 * 1000
  );
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
    assert(
      integration,
      'YouTube integration was not found in the local database.'
    );
    assert(!integration.disabled, 'YouTube integration is disabled.');
    assert(
      !integration.refreshNeeded,
      'YouTube integration requires manual reconnection.'
    );
    if (!shouldRefreshToken(integration.tokenExpiration))
      return integration.token;

    assert(
      integration.refreshToken,
      'YouTube refresh token is missing; reconnect the channel.'
    );
    assert(
      process.env.YOUTUBE_CLIENT_ID && process.env.YOUTUBE_CLIENT_SECRET,
      'YouTube OAuth client configuration is missing.'
    );
    const client = new google.auth.OAuth2(
      process.env.YOUTUBE_CLIENT_ID,
      process.env.YOUTUBE_CLIENT_SECRET,
      `${process.env.FRONTEND_URL}/integrations/social/youtube`
    );
    client.setCredentials({ refresh_token: integration.refreshToken });
    const { credentials } = await client.refreshAccessToken();
    assert(
      credentials.access_token && credentials.expiry_date,
      'YouTube refresh returned no usable access token.'
    );
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
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });
  try {
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    const { customAttributes } =
      await connection.operatorService.listSearchAttributes({ namespace });
    const missing = ['organizationId', 'postId'].filter(
      (name) => !customAttributes[name]
    );
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
  formData.append(
    'file',
    new Blob([buffer], { type: mimeType }),
    path.basename(filePath)
  );
  return postizFetch('/public/v1/upload', {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: formData,
  });
}

async function createPost(
  apiKey,
  integrationId,
  media,
  thumbnail,
  metadata,
  youtubePolicy
) {
  const mediaDto = { id: media.id, path: media.path };
  const thumbnailDto = thumbnail
    ? { id: thumbnail.id, path: thumbnail.path }
    : undefined;
  const settings = {
    title: metadata.title,
    type: youtubePolicy.visibility,
    selfDeclaredMadeForKids: youtubePolicy.selfDeclaredMadeForKids,
    tags: metadata.tags.slice(0, 10).map((tag) => ({ value: tag, label: tag })),
  };
  if (thumbnailDto) settings.thumbnail = thumbnailDto;
  if (youtubePolicy.playlistId) {
    settings.playlistId = youtubePolicy.playlistId;
    settings.playlistTitle = youtubePolicy.playlistTitle;
    settings.playlistPrivacyStatus = youtubePolicy.playlistPrivacyStatus;
  }
  const body = {
    type: 'now',
    date: new Date(Date.now() + 15_000).toISOString(),
    shortLink: false,
    tags: [],
    creationMethod: 'API',
    posts: [
      {
        integration: { id: integrationId },
        settings,
        value: [{ content: metadata.description, image: [mediaDto] }],
      },
    ],
  };
  return postizFetch('/public/v1/posts', {
    method: 'POST',
    headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function startWorkflow(postId, organizationId) {
  const connection = await Connection.connect({
    address: process.env.TEMPORAL_ADDRESS || 'localhost:7233',
  });
  try {
    const namespace = process.env.TEMPORAL_NAMESPACE || 'default';
    const client = new WorkflowClient({ connection, namespace });
    const postIdKey = defineSearchAttributeKey(
      'postId',
      SearchAttributeType.TEXT
    );
    const organizationIdKey = defineSearchAttributeKey(
      'organizationId',
      SearchAttributeType.TEXT
    );
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
  if (parsed.hostname === 'youtu.be')
    return parsed.pathname.split('/').filter(Boolean)[0];
  if (parsed.pathname === '/watch') return parsed.searchParams.get('v');
  const parts = parsed.pathname.split('/').filter(Boolean);
  if (['shorts', 'live', 'embed'].includes(parts[0])) return parts[1];
  return undefined;
}

async function verifyYoutube(
  accessToken,
  releaseURL,
  metadata,
  youtubePolicy,
  videoKind
) {
  const videoId = youtubeVideoId(releaseURL);
  assert(videoId, `Unable to parse a YouTube video ID from ${releaseURL}.`);
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const youtube = google.youtube({ version: 'v3', auth });
  const publicUrl =
    videoKind === 'short'
      ? `https://www.youtube.com/shorts/${videoId}`
      : releaseURL;
  const startedAt = Date.now();
  let video;
  do {
    const videoResponse = await youtube.videos.list({
      part: ['snippet', 'status', 'processingDetails'],
      id: [videoId],
    });
    video = videoResponse.data.items?.[0];
    assert(video, 'YouTube API did not return the published video.');
    if (
      ['failed', 'rejected', 'deleted'].includes(video.status?.uploadStatus)
    ) {
      throw new Error(
        `YouTube upload entered terminal state ${video.status.uploadStatus}.`
      );
    }
    if (
      video.status?.privacyStatus === 'public' &&
      video.status?.uploadStatus === 'processed'
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (Date.now() - startedAt < 10 * 60 * 1000);
  assert(video, 'YouTube API did not return the published video.');
  assert(
    video.status?.privacyStatus === 'public',
    `YouTube privacy is ${
      video.status?.privacyStatus || 'unknown'
    }, not public.`
  );
  assert(
    video.status?.uploadStatus === 'processed',
    `YouTube upload is ${
      video.status?.uploadStatus || 'unknown'
    }, not processed.`
  );
  assert(
    video.status?.selfDeclaredMadeForKids !== true,
    'YouTube video is unexpectedly declared made for kids.'
  );
  const pageResponse = await fetch(publicUrl, { redirect: 'follow' });
  assert(
    pageResponse.ok,
    `Public release URL returned HTTP ${pageResponse.status}.`
  );
  const verified = {
    verifiedAt: new Date().toISOString(),
    publishedAt: video.snippet?.publishedAt,
    videoId,
    url: publicUrl,
    title: video.snippet?.title,
    privacyStatus: video.status?.privacyStatus,
    uploadStatus: video.status?.uploadStatus,
    processingStatus: video.processingDetails?.processingStatus,
    selfDeclaredMadeForKids: video.status?.selfDeclaredMadeForKids ?? false,
    releaseUrlHttpStatus: pageResponse.status,
  };
  if (videoKind === 'longform') {
    const [playlistItemResponse, playlistResponse] = await Promise.all([
      youtube.playlistItems.list({
        part: ['snippet'],
        playlistId: youtubePolicy.playlistId,
        videoId,
        maxResults: 1,
      }),
      youtube.playlists.list({
        part: ['snippet', 'status'],
        id: [youtubePolicy.playlistId],
      }),
    ]);
    const playlist = playlistResponse.data.items?.[0];
    assert(
      playlistItemResponse.data.items?.length > 0,
      'The video is not in the required playlist.'
    );
    assert(playlist, 'The required playlist was not found.');
    assert(
      playlist.snippet?.title === youtubePolicy.playlistTitle,
      `Playlist title is ${playlist.snippet?.title || 'unknown'}.`
    );
    assert(
      playlist.status?.privacyStatus === 'public',
      `Playlist privacy is ${playlist.status?.privacyStatus || 'unknown'}.`
    );
    Object.assign(verified, {
      playlistId: youtubePolicy.playlistId,
      playlistTitle: playlist.snippet?.title,
      playlistPrivacyStatus: playlist.status?.privacyStatus,
      inPlaylist: true,
    });
  }
  return verified;
}

async function findExistingYoutubeVideo(
  accessToken,
  metadata,
  youtubePolicy,
  thumbnailPath,
  videoKind,
  { skipThumbnail = false } = {}
) {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const youtube = google.youtube({ version: 'v3', auth });
  if (videoKind === 'longform') {
    const targetPlaylist = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: youtubePolicy.playlistId,
      maxResults: 50,
    });
    const targetMatch = targetPlaylist.data.items?.find(
      (item) => item.snippet?.title === metadata.title
    );
    const targetVideoId = targetMatch?.snippet?.resourceId?.videoId;
    if (targetVideoId) {
      return verifyYoutube(
        accessToken,
        `https://www.youtube.com/watch?v=${targetVideoId}`,
        metadata,
        youtubePolicy,
        videoKind
      );
    }
  }

  const channels = await youtube.channels.list({
    part: ['contentDetails'],
    mine: true,
  });
  const uploadsPlaylistId =
    channels.data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
  assert(
    uploadsPlaylistId,
    'YouTube uploads playlist could not be identified.'
  );
  const matches = [];
  let pageToken;
  do {
    const response = await youtube.playlistItems.list({
      part: ['snippet'],
      playlistId: uploadsPlaylistId,
      maxResults: 50,
      pageToken,
    });
    for (const item of response.data.items || []) {
      if (item.snippet?.title === metadata.title) {
        matches.push(item.snippet?.resourceId?.videoId);
      }
    }
    pageToken = response.data.nextPageToken;
  } while (pageToken);
  const videoIds = matches.filter(Boolean);
  if (videoIds.length === 0) return undefined;
  const videos = await youtube.videos.list({
    part: ['status'],
    id: videoIds,
  });
  const publicIds = (videos.data.items || [])
    .filter((video) => video.status?.privacyStatus === 'public')
    .map((video) => video.id)
    .filter(Boolean);
  assert(
    publicIds.length <= 1,
    `Multiple public YouTube videos already use this exact title: ${publicIds.join(
      ', '
    )}`
  );
  if (publicIds.length === 0) return undefined;
  const [videoId] = publicIds;
  if (videoKind === 'longform' && !skipThumbnail) {
    await youtube.thumbnails.set({
      videoId,
      media: { body: fssync.createReadStream(thumbnailPath) },
    });
  }
  if (videoKind === 'longform') {
    await youtube.playlistItems.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          playlistId: youtubePolicy.playlistId,
          resourceId: {
            kind: 'youtube#video',
            videoId,
          },
        },
      },
    });
  }
  return verifyYoutube(
    accessToken,
    videoKind === 'short'
      ? `https://www.youtube.com/shorts/${videoId}`
      : `https://www.youtube.com/watch?v=${videoId}`,
    metadata,
    youtubePolicy,
    videoKind
  );
}

async function main() {
  loadDotEnv(path.join(repoRoot, '.env'));
  const args = parseArgs(process.argv.slice(2));
  assert(
    args.bundle,
    '--bundle must point to an imported Postiz inbox bundle.'
  );
  const imported = await validateImportedBundle(args.bundle);
  const videoKind = args.kind || 'longform';
  assert(
    ['longform', 'short'].includes(videoKind),
    '--kind must be longform or short.'
  );
  assert(
    (imported.manifest.videoKind || 'longform') === videoKind,
    `Imported bundle is not a ${videoKind} bundle.`
  );
  if (videoKind === 'short') {
    assert(
      imported.manifest.runKey >= '2026-08-08-04',
      'Tiny Agent English Short publication is not retroactive before 2026-08-08-04.'
    );
  }
  assert(
    imported.manifest.locale === 'en-US',
    'YouTube distribution requires an English bundle.'
  );
  const artifactPath = (role) => {
    const artifact = imported.manifest.artifacts.find(
      (item) => item.role === role
    );
    assert(artifact, `Imported bundle is missing ${role}.`);
    return path.join(imported.bundleDir, artifact.file);
  };
  const metadataPath = artifactPath('publishing-metadata');
  const videoPath = artifactPath('video');
  const metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
  const youtubeMetadata =
    videoKind === 'short'
      ? { ...metadata, description: '', tags: buildYoutubeShortTags(metadata) }
      : {
          ...metadata,
          description: buildYoutubeDescription(metadata),
          tags: buildYoutubeTags(metadata),
        };
  const youtubePolicy =
    videoKind === 'short'
      ? resolveYoutubeShortPolicy(youtubeMetadata)
      : resolveYoutubeLongformPolicy(youtubeMetadata);
  const thumbnailPath =
    videoKind === 'longform' ? artifactPath('cover-16x9') : undefined;
  const organization = await getLocalOrganization();
  assert(
    organization?.apiKey && organization?.id,
    'No local Postiz organization/API key was found.'
  );

  const integrations = await postizFetch('/public/v1/integrations', {
    headers: { Authorization: organization.apiKey },
  });
  const enabledYoutube = integrations.filter(
    (item) => item.identifier === 'youtube' && !item.disabled
  );
  const integration =
    enabledYoutube.find((item) => /indieseek/i.test(item.name || '')) ||
    (enabledYoutube.length === 1 ? enabledYoutube[0] : undefined);
  assert(
    integration,
    'An enabled IndieSeek YouTube integration could not be identified.'
  );

  if (args.preflight) {
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          postizUrl: getPostizBaseUrl(),
          organizationId: organization.id,
          integration: {
            id: integration.id,
            name: integration.name,
            identifier: integration.identifier,
          },
          youtubePolicy,
          videoKind,
          descriptionSanitized:
            youtubeMetadata.description !== metadata.description,
          thumbnailPath,
        },
        null,
        2
      )}\n`
    );
    return;
  }

  assert(fssync.existsSync(videoPath), 'Imported bundle video is missing.');
  const probe = validateInputs(
    videoPath,
    youtubeMetadata,
    youtubePolicy,
    videoKind
  );
  const thumbnailProbe =
    videoKind === 'longform' ? validateThumbnail(thumbnailPath) : undefined;
  const accessToken = await refreshYoutubeIntegration(integration.id);
  const resultPath = path.join(
    imported.bundleDir,
    videoKind === 'short'
      ? 'youtube-short-publish-result.json'
      : 'youtube-publish-result.json'
  );
  try {
    const previous = JSON.parse(await fs.readFile(resultPath, 'utf8'));
    const verified = await verifyYoutube(
      accessToken,
      previous.youtube?.url,
      youtubeMetadata,
      youtubePolicy,
      videoKind
    );
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          status: 'already-published',
          resultPath,
          youtube: verified,
        },
        null,
        2
      )}\n`
    );
    return;
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw new Error(
        `Existing publish receipt could not be verified; refusing a duplicate upload: ${error.message}`
      );
    }
  }
  const existingYoutube = await findExistingYoutubeVideo(
    accessToken,
    youtubeMetadata,
    youtubePolicy,
    thumbnailPath,
    videoKind,
    { skipThumbnail: Boolean(args['recover-existing-without-thumbnail']) }
  );
  if (existingYoutube) {
    const result = {
      publishedVia: 'existing-youtube-playlist-entry',
      createdAt: new Date().toISOString(),
      bundleId: imported.manifest.bundleId,
      postiz: null,
      video: { path: videoPath, ...probe },
      thumbnail: thumbnailProbe
        ? {
            ...thumbnailProbe,
            submittedWithPostizVideo: false,
            skippedDuringExistingVideoRecovery: Boolean(
              args['recover-existing-without-thumbnail']
            ),
          }
        : null,
      youtube: existingYoutube,
    };
    await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
    process.stdout.write(
      `${JSON.stringify(
        {
          ok: true,
          status: 'already-published',
          resultPath,
          youtube: existingYoutube,
        },
        null,
        2
      )}\n`
    );
    return;
  }
  assert(
    !args['recover-existing-without-thumbnail'],
    'Recovery mode found no existing public video; refusing a duplicate upload.'
  );
  await ensureTemporalSearchAttributes();
  const media = await uploadMedia(organization.apiKey, videoPath, 'video/mp4');
  assert(
    media?.id && media?.path,
    'Postiz upload did not return a media id/path.'
  );
  const thumbnail = thumbnailPath
    ? await uploadMedia(organization.apiKey, thumbnailPath, 'image/png')
    : undefined;
  if (thumbnailPath)
    assert(
      thumbnail?.id && thumbnail?.path,
      'Postiz thumbnail upload did not return a media id/path.'
    );
  const postResponse = await createPost(
    organization.apiKey,
    integration.id,
    media,
    thumbnail,
    youtubeMetadata,
    youtubePolicy
  );
  const postId = postResponse?.[0]?.postId;
  assert(postId, 'Postiz did not return a post ID.');
  await startWorkflow(postId, organization.id);
  const post = await waitForPost(postId, Number(args.timeout || 1200));
  assert(
    post.state === 'PUBLISHED',
    `Postiz publishing failed: ${post.error || post.state}`
  );
  assert(post.releaseURL, 'Postiz published without a release URL.');
  const youtube = await verifyYoutube(
    accessToken,
    post.releaseURL,
    youtubeMetadata,
    youtubePolicy,
    videoKind
  );
  const result = {
    publishedVia: 'local-postiz',
    createdAt: new Date().toISOString(),
    bundleId: imported.manifest.bundleId,
    postiz: {
      postId,
      state: post.state,
      integrationId: integration.id,
      integrationName: integration.name,
      mediaId: media.id,
      thumbnailMediaId: thumbnail?.id ?? null,
    },
    video: { path: videoPath, ...probe },
    thumbnail: thumbnailProbe
      ? { ...thumbnailProbe, submittedWithPostizVideo: true }
      : null,
    youtube,
  };
  await fs.writeFile(resultPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(
    `${JSON.stringify(
      { ok: true, status: 'PUBLISHED', resultPath, youtube },
      null,
      2
    )}\n`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
