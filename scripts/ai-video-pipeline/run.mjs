#!/usr/bin/env node
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const require = createRequire(import.meta.url);
const { createCanvas } = require('canvas');
const OpenAI = require('openai');
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

const execFile = promisify(execFileCallback);
const rootDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);
const defaultOutputRoot = path.join(rootDir, 'var/ai-video-pipeline/runs');

function loadDotEnv(filePath) {
  if (!fssync.existsSync(filePath)) return;

  const lines = fssync.readFileSync(filePath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

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
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;

    const key = arg.slice(2);
    if (
      [
        'post',
        'wait',
        'no-llm',
        'dry-run',
        'micro',
        'skip-token-refresh',
        'skip-temporal-init',
        'skip-workflow-kick',
      ].includes(key)
    ) {
      args[key] = true;
      continue;
    }

    args[key] = argv[i + 1];
    i += 1;
  }
  return args;
}

function slugify(value) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64) || 'ai-video'
  );
}

function makeId(length = 8) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(
    { length },
    () => alphabet[Math.floor(Math.random() * alphabet.length)]
  ).join('');
}

function cleanForCaption(value, max = 2000) {
  return value
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function splitWords(text) {
  return String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function wrapLines(ctx, text, maxWidth, maxLines = 6) {
  const words = splitWords(text);
  const lines = [];
  let line = '';
  let truncated = false;

  for (let i = 0; i < words.length; i += 1) {
    const word = words[i];
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }

    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) {
      truncated = i < words.length - 1;
      break;
    }
  }

  if (line && lines.length < maxLines) lines.push(line);
  if (truncated && lines.length === maxLines) {
    const last = lines[lines.length - 1];
    if (ctx.measureText(`${last}...`).width <= maxWidth) {
      lines[lines.length - 1] = `${last}...`;
    }
  }
  return lines;
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawTextBlock(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
  color = '#eef4ff'
) {
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  ctx.fillStyle = color;
  lines.forEach((line, index) => {
    ctx.fillText(line, x, y + index * lineHeight);
  });
  return y + lines.length * lineHeight;
}

function drawCard(ctx, x, y, width, height, title, body, accent = '#40d9a6') {
  ctx.save();
  ctx.fillStyle = '#111827';
  ctx.strokeStyle = '#2b3954';
  ctx.lineWidth = 3;
  roundRect(ctx, x, y, width, height, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, x + 24, y + 24, 12, height - 48, 6);
  ctx.fill();

  ctx.font = '700 40px Arial';
  drawTextBlock(ctx, title, x + 56, y + 58, width - 88, 46, 2, '#ffffff');
  ctx.font = '400 31px Arial';
  drawTextBlock(ctx, body, x + 56, y + 138, width - 88, 39, 4, '#cbd5e1');
  ctx.restore();
}

function drawArrow(ctx, fromX, fromY, toX, toY, color = '#f59e0b') {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  const angle = Math.atan2(toY - fromY, toX - fromX);
  const size = 28;
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - size * Math.cos(angle - Math.PI / 6),
    toY - size * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - size * Math.cos(angle + Math.PI / 6),
    toY - size * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawPill(ctx, x, y, text, color = '#60a5fa') {
  ctx.save();
  ctx.font = '700 34px Arial';
  const width = Math.max(180, ctx.measureText(text).width + 56);
  roundRect(ctx, x, y, width, 70, 35);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.fillStyle = '#07111f';
  ctx.fillText(text, x + 28, y + 46);
  ctx.restore();
}

function isHumanDebugStyle(content) {
  return content.style === 'human-debug';
}

function drawComicText(
  ctx,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
  color = '#111827',
  align = 'left'
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  const lines = wrapLines(ctx, text, maxWidth, maxLines);
  const drawX = align === 'center' ? x + maxWidth / 2 : x;
  lines.forEach((line, index) => {
    ctx.fillText(line, drawX, y + index * lineHeight);
  });
  ctx.restore();
  return y + lines.length * lineHeight;
}

function drawComicPopup(
  ctx,
  x,
  y,
  width,
  height,
  title,
  body,
  accent = '#ef4444',
  buttonLabel = 'JOIN'
) {
  ctx.save();
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x, y, width, height, 18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  roundRect(ctx, x, y, width, 46, 18);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 22px Arial';
  ctx.fillText(title, x + 22, y + 31);

  ctx.fillStyle = '#111827';
  ctx.font = '700 28px Arial';
  ctx.fillText(body, x + 22, y + 91);

  if (buttonLabel) {
    ctx.fillStyle = '#14b8a6';
    roundRect(ctx, x + 22, y + height - 54, 96, 34, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = '800 16px Arial';
    ctx.fillText(buttonLabel, x + 50, y + height - 31);
  }
  ctx.restore();
}

function drawDebugTool(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.rotate(-0.35);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#14b8a6';
  roundRect(ctx, -40, -150, 80, 145, 24);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111827';
  roundRect(ctx, -18, -16, 36, 95, 16);
  ctx.fill();
  ctx.strokeStyle = '#e5fffb';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, -92, 24, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-32, -92);
  ctx.lineTo(32, -92);
  ctx.moveTo(0, -124);
  ctx.lineTo(0, -60);
  ctx.stroke();
  ctx.font = '800 14px Arial';
  ctx.fillStyle = '#e5fffb';
  ctx.rotate(Math.PI / 2);
  ctx.fillText('DEBUG', -132, 6);
  ctx.restore();
}

function drawCalendarEgg(ctx, x, y, scale = 1, cracked = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineWidth = 5;
  ctx.strokeStyle = '#111827';
  ctx.fillStyle = '#fff7ed';
  ctx.beginPath();
  ctx.ellipse(0, 0, 38, 50, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  if (cracked) {
    ctx.strokeStyle = '#111827';
    ctx.beginPath();
    ctx.moveTo(-22, -8);
    ctx.lineTo(-4, 8);
    ctx.lineTo(10, -4);
    ctx.lineTo(24, 12);
    ctx.stroke();
  }

  ctx.fillStyle = '#ef4444';
  roundRect(ctx, -20, -18, 40, 34, 4);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, -20, -6, 40, 24, 3);
  ctx.fill();
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-12, 2);
  ctx.lineTo(12, 2);
  ctx.moveTo(-12, 10);
  ctx.lineTo(12, 10);
  ctx.moveTo(-5, -3);
  ctx.lineTo(-5, 16);
  ctx.moveTo(6, -3);
  ctx.lineTo(6, 16);
  ctx.stroke();
  ctx.restore();
}

function drawMeetingBug(ctx, x, y, scale = 1, mood = 'happy') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 9;
  for (const [sx, sy, ex, ey] of [
    [-116, 4, -166, -30],
    [-120, 46, -180, 58],
    [-94, 88, -142, 128],
    [116, 4, 166, -30],
    [120, 46, 180, 58],
    [94, 88, 142, 128],
  ]) {
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(ex, ey);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.moveTo(-48, -120);
  ctx.quadraticCurveTo(-64, -170, -92, -174);
  ctx.moveTo(48, -120);
  ctx.quadraticCurveTo(64, -170, 92, -174);
  ctx.stroke();

  ctx.fillStyle = '#a7f3d0';
  ctx.beginPath();
  ctx.ellipse(0, 8, 122, 132, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(-42, -30, 28, 36, 0, 0, Math.PI * 2);
  ctx.ellipse(42, -30, 28, 36, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.arc(-36, -22, mood === 'panic' ? 6 : 10, 0, Math.PI * 2);
  ctx.arc(36, -22, mood === 'panic' ? 6 : 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 7;
  ctx.beginPath();
  if (mood === 'panic') {
    ctx.moveTo(-30, 42);
    ctx.quadraticCurveTo(0, 20, 30, 42);
  } else {
    ctx.moveTo(-34, 36);
    ctx.quadraticCurveTo(0, 70, 34, 36);
  }
  ctx.stroke();

  ctx.font = '800 30px Arial';
  ctx.fillStyle = '#111827';
  ctx.textAlign = 'center';
  ctx.fillText('Meeting.exe', 0, 92);
  ctx.restore();
}

function drawEngineer(ctx, x, y, scale = 1, mood = 'tired') {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 8;
  ctx.fillStyle = '#f5c7a9';
  ctx.beginPath();
  ctx.ellipse(0, -190, 72, 82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#111827';
  ctx.beginPath();
  ctx.moveTo(-74, -230);
  ctx.quadraticCurveTo(-46, -290, 12, -270);
  ctx.quadraticCurveTo(72, -266, 78, -204);
  ctx.quadraticCurveTo(32, -226, -8, -214);
  ctx.quadraticCurveTo(-34, -242, -74, -230);
  ctx.fill();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (mood === 'panic') {
    ctx.arc(-26, -188, 10, 0, Math.PI * 2);
    ctx.arc(26, -188, 10, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-44, -190);
    ctx.quadraticCurveTo(-24, -180, -6, -190);
    ctx.moveTo(8, -190);
    ctx.quadraticCurveTo(28, -180, 46, -190);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(-24, -146);
  ctx.quadraticCurveTo(0, mood === 'panic' ? -132 : -138, 24, -146);
  ctx.stroke();

  ctx.fillStyle = '#1f2937';
  roundRect(ctx, -86, -98, 172, 220, 48);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-28, -62);
  ctx.lineTo(-42, 8);
  ctx.moveTo(28, -62);
  ctx.lineTo(42, 8);
  ctx.stroke();

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(-68, -36);
  ctx.lineTo(-140, 36);
  ctx.moveTo(68, -36);
  ctx.lineTo(144, 14);
  ctx.stroke();

  ctx.fillStyle = '#111827';
  roundRect(ctx, -70, 115, 48, 128, 18);
  roundRect(ctx, 22, 115, 48, 128, 18);
  ctx.fill();
  ctx.restore();
}

function drawHumanDebugScene(ctx, scene, index, content) {
  const width = 1080;
  const height = 1920;
  ctx.fillStyle = '#fbfbf7';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(80, 405);
  ctx.lineTo(260, 405);
  ctx.lineTo(260, 540);
  ctx.moveTo(820, 440);
  ctx.lineTo(980, 440);
  ctx.moveTo(860, 482);
  ctx.lineTo(980, 482);
  ctx.stroke();

  ctx.font = '900 62px Arial';
  drawComicText(
    ctx,
    content.seriesTitle || 'HUMAN DEBUG LOG #001',
    110,
    145,
    860,
    70,
    2,
    '#111827',
    'center'
  );
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.moveTo(250, 240);
  ctx.quadraticCurveTo(540, 270, 830, 240);
  ctx.stroke();

  ctx.fillStyle = '#14b8a6';
  for (const [x, y, rotation] of [
    [144, 150, -0.6],
    [930, 150, 0.6],
    [122, 1605, 0.8],
    [955, 1615, -0.8],
  ]) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);
    roundRect(ctx, -8, -34, 16, 68, 8);
    ctx.fill();
    ctx.restore();
  }

  if (index === 0) {
    drawEngineer(ctx, 300, 980, 1.6, 'tired');
    drawDebugTool(ctx, 410, 930, 1.15);
    drawMeetingBug(ctx, 760, 930, 1.55, 'happy');
    drawCalendarEgg(ctx, 615, 1175, 1.25);
    drawCalendarEgg(ctx, 720, 1190, 1.25);
    drawCalendarEgg(ctx, 825, 1175, 1.25);
    drawComicPopup(ctx, 572, 1335, 220, 130, 'MEETING', '10:00');
    drawComicPopup(ctx, 812, 1335, 220, 130, 'MEETING', '10:30');
  } else if (index === 1) {
    drawEngineer(ctx, 270, 1008, 1.5, 'panic');
    drawMeetingBug(ctx, 755, 930, 1.38, 'happy');
    drawComicPopup(ctx, 88, 465, 260, 142, 'QUICK SYNC', '10:00');
    drawComicPopup(ctx, 410, 385, 260, 142, 'FOLLOW-UP', '10:30');
    drawComicPopup(ctx, 718, 510, 260, 142, 'PRE-SYNC', '9:45');
    drawComicPopup(ctx, 520, 1278, 305, 142, 'MEETING', 'about meeting');
    drawCalendarEgg(ctx, 690, 1198, 1.2, true);
    ctx.fillStyle = '#111827';
    ctx.font = '900 96px Arial';
    ctx.fillText('x3', 784, 760);
  } else if (index === 2) {
    drawEngineer(ctx, 300, 1038, 1.5, 'tired');
    drawDebugTool(ctx, 430, 955, 1.08);
    drawMeetingBug(ctx, 765, 955, 1.44, 'happy');
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 6;
    roundRect(ctx, 130, 445, 820, 220, 42);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.font = '900 56px Arial';
    drawComicText(ctx, 'I closed my laptop.', 185, 525, 720, 68, 2, '#111827', 'center');
    ctx.font = '700 28px Arial';
    drawComicText(ctx, 'The calendar kept going.', 185, 604, 720, 36, 1, '#ef4444', 'center');
    drawComicPopup(ctx, 610, 1290, 310, 142, 'CALENDAR', 'won', '#14b8a6', null);
  } else {
    drawEngineer(ctx, 298, 1018, 1.5, 'tired');
    drawDebugTool(ctx, 430, 935, 1.08);
    drawMeetingBug(ctx, 772, 955, 1.44, 'happy');
    drawComicPopup(ctx, 105, 455, 345, 145, 'PATCH', 'Decline', '#ef4444', null);
    drawComicPopup(ctx, 630, 455, 345, 145, 'STATUS', 'Multiplying', '#ef4444', null);
    for (const [x, y, s] of [
      [595, 1190, 1.05],
      [700, 1218, 1.0],
      [812, 1190, 1.05],
      [907, 1222, 0.9],
    ]) {
      drawCalendarEgg(ctx, x, y, s, true);
    }
  }

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 7;
  roundRect(ctx, 110, 1585, 860, 190, 36);
  ctx.fill();
  ctx.stroke();
  ctx.font = '900 52px Arial';
  drawComicText(
    ctx,
    scene.footer || scene.headline || content.title,
    155,
    1665,
    770,
    62,
    2,
    '#111827',
    'center'
  );
}

function drawDiagram(ctx, scene, index) {
  const visual =
    scene.visual || ['flow', 'beforeAfter', 'hub', 'example', 'warning'][index % 5];
  const body = scene.body || '';
  const labels =
    Array.isArray(scene.labels) && scene.labels.length
      ? scene.labels
      : ['User', 'Agent', 'Tool'];

  if (visual === 'beforeAfter') {
    drawCard(
      ctx,
      86,
      740,
      408,
      420,
      'Before',
      scene.before || 'Every app needs a custom connector.',
      '#fb7185'
    );
    drawCard(
      ctx,
      586,
      740,
      408,
      420,
      'After',
      scene.after || 'One shared protocol connects tools.',
      '#40d9a6'
    );
    drawArrow(ctx, 510, 950, 570, 950);
    return;
  }

  if (visual === 'hub') {
    drawCard(
      ctx,
      320,
      775,
      440,
      250,
      labels[0] || 'AI Agent',
      body || 'Plans the task and chooses a tool.',
      '#38bdf8'
    );
    drawCard(
      ctx,
      74,
      1110,
      280,
      210,
      labels[1] || 'Files',
      scene.left || 'Read context.',
      '#a78bfa'
    );
    drawCard(
      ctx,
      400,
      1210,
      280,
      210,
      labels[2] || 'API',
      scene.center || 'Take action.',
      '#f59e0b'
    );
    drawCard(
      ctx,
      726,
      1110,
      280,
      210,
      labels[3] || 'Database',
      scene.right || 'Check facts.',
      '#40d9a6'
    );
    drawArrow(ctx, 420, 1030, 245, 1110, '#38bdf8');
    drawArrow(ctx, 540, 1030, 540, 1210, '#38bdf8');
    drawArrow(ctx, 660, 1030, 835, 1110, '#38bdf8');
    return;
  }

  if (visual === 'example') {
    drawPill(ctx, 90, 770, labels[0] || 'Request', '#93c5fd');
    drawArrow(ctx, 320, 805, 470, 805, '#93c5fd');
    drawPill(ctx, 490, 770, labels[1] || 'Agent', '#40d9a6');
    drawArrow(ctx, 700, 805, 840, 805, '#40d9a6');
    drawPill(ctx, 855, 770, labels[2] || 'Result', '#fbbf24');
    drawCard(
      ctx,
      112,
      935,
      856,
      420,
      scene.exampleTitle || 'Simple example',
      scene.example || body,
      '#fbbf24'
    );
    return;
  }

  if (visual === 'warning') {
    drawCard(
      ctx,
      112,
      760,
      856,
      230,
      'Use it when',
      scene.useWhen || 'The task needs multiple steps and outside tools.',
      '#40d9a6'
    );
    drawCard(
      ctx,
      112,
      1040,
      856,
      230,
      'Do not use it when',
      scene.avoidWhen || 'A normal function or workflow is enough.',
      '#fb7185'
    );
    drawCard(
      ctx,
      112,
      1320,
      856,
      200,
      'Rule of thumb',
      scene.rule || body,
      '#f59e0b'
    );
    return;
  }

  const steps = labels.slice(0, 4);
  const positions = [
    { x: 92, y: 770 },
    { x: 588, y: 770 },
    { x: 92, y: 1085 },
    { x: 588, y: 1085 },
  ];
  const defaultStepBodies = [
    body || 'Name the outcome.',
    'Add the facts the model needs.',
    'Call one controlled external tool.',
    'Return an answer you can inspect.',
  ];
  steps.forEach((label, stepIndex) => {
    const { x, y } = positions[stepIndex];
    drawCard(
      ctx,
      x,
      y,
      400,
      240,
      `${stepIndex + 1}. ${label}`,
      scene.stepBodies?.[stepIndex] || defaultStepBodies[stepIndex],
      ['#38bdf8', '#40d9a6', '#f59e0b', '#a78bfa'][stepIndex]
    );
  });
  drawArrow(ctx, 492, 890, 570, 890);
  drawArrow(ctx, 790, 1010, 790, 1060);
  drawArrow(ctx, 588, 1205, 510, 1205);
}

async function renderFrames(content, outputDir) {
  const framesDir = path.join(outputDir, 'frames');
  await fs.mkdir(framesDir, { recursive: true });

  const width = 1080;
  const height = 1920;
  const frames = [];

  for (let i = 0; i < content.scenes.length; i += 1) {
    const scene = content.scenes[i];
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    if (isHumanDebugStyle(content)) {
      drawHumanDebugScene(ctx, scene, i, content);
    } else {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#07111f');
    gradient.addColorStop(0.55, '#0f172a');
    gradient.addColorStop(1, '#18181b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(148,163,184,0.09)';
    ctx.lineWidth = 2;
    for (let x = 80; x < width; x += 120) {
      ctx.beginPath();
      ctx.moveTo(x, 140);
      ctx.lineTo(x - 360, height - 120);
      ctx.stroke();
    }

    ctx.font = '700 34px Arial';
    ctx.fillStyle = '#40d9a6';
    ctx.fillText('AGENT SCHOOL', 72, 96);
    ctx.fillStyle = '#64748b';
    ctx.fillText(`SCENE ${String(i + 1).padStart(2, '0')}`, 790, 96);

    ctx.font = '800 76px Arial';
    drawTextBlock(ctx, scene.headline || content.title, 72, 220, 936, 86, 4, '#ffffff');

    ctx.font = '400 40px Arial';
    drawTextBlock(ctx, scene.subhead || scene.body || '', 76, 530, 920, 52, 3, '#cbd5e1');

    drawDiagram(ctx, scene, i);

    ctx.font = '700 42px Arial';
    if (scene.footer) {
      drawTextBlock(ctx, scene.footer, 72, 1730, 936, 52, 2, '#e5e7eb');
    }
    }

    const framePath = path.join(
      framesDir,
      `scene-${String(i + 1).padStart(2, '0')}.png`
    );
    await fs.writeFile(framePath, canvas.toBuffer('image/png'));
    frames.push({ path: framePath, duration: Number(scene.duration || 7) });
  }

  return frames;
}

function fallbackContent(topic, args = {}) {
  const isHumanDebug =
    args.style === 'human-debug' ||
    process.env.AI_VIDEO_STYLE === 'human-debug';
  const isMicro =
    args.micro ||
    args.style === 'micro' ||
    process.env.AI_VIDEO_STYLE === 'micro';

  if (isHumanDebug) {
    return {
      style: 'human-debug',
      seriesTitle: 'HUMAN DEBUG LOG #001',
      title: 'Human Debug Log #001: Meetings reproduce when ignored',
      description:
        'A short office comedy story about ignoring one meeting invite and losing to the calendar.',
      hashtags: ['WorkTok', 'OfficeHumor', 'CorporateLife', 'ProgrammerHumor', 'TikTokComedy'],
      narration: [
        'I ignored one meeting invite.',
        'Big mistake.',
        'Five minutes later, it came back with friends.',
        'One was called quick sync.',
        'One was called pre-sync.',
        'And one was a meeting about the meeting.',
        'I closed my laptop.',
        'The calendar won.',
      ].join(' '),
      scenes: [
        {
          duration: 6,
          headline: 'I ignored one meeting invite.',
          footer: 'I ignored one meeting invite.',
        },
        {
          duration: 8,
          headline: 'It came back with friends.',
          footer: 'It came back with friends.',
        },
        {
          duration: 7,
          headline: 'The calendar won.',
          footer: 'The calendar won.',
        },
      ],
    };
  }

  if (isMicro) {
    return {
      title: 'AI can sound confident and still be wrong #Shorts',
      description:
        'A 25-second AI tip: confidence is not the same as truth. Check important answers.',
      hashtags: ['AI', 'ChatGPT', 'TechTips', 'Shorts'],
      narration: [
        'Quick AI tip.',
        'If an AI answer sounds confident, that does not mean it is true.',
        'AI is very good at choosing likely words.',
        'It is not automatically checking reality.',
        'So use it for drafts and ideas.',
        'For facts that matter, ask where the answer came from, then verify one source.',
      ].join(' '),
      scenes: [
        {
          duration: 5,
          visual: 'beforeAfter',
          headline: 'Confident does not mean true',
          subhead: 'AI can be smooth and still be wrong.',
          before: 'Sounds right.',
          after: 'Needs checking.',
          footer: 'One tiny AI rule.',
        },
        {
          duration: 7,
          visual: 'example',
          headline: 'What AI is doing',
          subhead: 'It chooses likely words.',
          labels: ['Question', 'AI', 'Answer'],
          example: 'Likely answer is not the same as verified answer.',
          footer: 'Good draft. Not proof.',
        },
        {
          duration: 7,
          visual: 'flow',
          headline: 'Use it like this',
          subhead: 'Draft first. Verify important facts.',
          labels: ['Ask', 'Draft', 'Source', 'Check'],
          stepBodies: [
            'Ask simply.',
            'Get a draft.',
            'Request sources.',
            'Verify one.',
          ],
          footer: 'The check is the skill.',
        },
        {
          duration: 5,
          visual: 'warning',
          headline: 'The rule',
          subhead: 'Trust the workflow, not the tone.',
          useWhen: 'Use AI for speed.',
          avoidWhen: 'Do not trust confidence alone.',
          rule: 'Important answer? Verify it.',
          footer: 'Follow for tiny AI lessons.',
        },
      ],
    };
  }

  const isMcp = /mcp|model context protocol/i.test(topic);
  const title = isMcp ? 'MCP explained in 60 seconds' : `${topic} explained simply`;
  const narration = isMcp
    ? [
        'Everyone says MCP is USB-C for AI apps. Here is what that actually means.',
        'An AI agent can think, but it still needs a clean way to use tools.',
        'Before MCP, every app needed a custom connector. Files, Slack, databases, and APIs all had different instructions.',
        'With MCP, tools expose one standard interface. The agent can discover what a tool does, send a request, and read the result.',
        'Simple example. You ask an agent to prepare a launch update. It reads the project notes, checks analytics, drafts the summary, and sends it to the right place.',
        'MCP does not make agents magically safe. You still need permissions, logging, and human review for risky actions.',
      ].join(' ')
    : [
        `${topic} sounds complicated, but the idea is simple.`,
        'Instead of asking an AI for one answer, you give it a goal, the right context, and a small set of tools.',
        'The system breaks the goal into steps, checks what it knows, calls tools when needed, and returns a result you can inspect.',
        'A simple example is an agent that reads a bug report, finds the related logs, drafts a fix plan, and asks a human before changing production.',
        'The trick is not adding more agents. The trick is making each step observable, testable, and easy to stop.',
      ].join(' ');

  return {
    title,
    description:
      'A simple visual explanation of an AI agent concept, with one concrete example and one practical caution.',
    hashtags: ['AI', 'AIAgents', 'TechExplained', 'MCP'],
    narration,
    scenes: [
      {
        duration: 7,
        visual: 'flow',
        headline: isMcp ? 'MCP is not magic' : `${topic} in one minute`,
        subhead: 'It is a simple way to connect an AI system to useful tools.',
        body: 'One concept. One example.',
        labels: ['Goal', 'Context', 'Tool', 'Result'],
        stepBodies: [
          'What the user wants.',
          'What the model needs.',
          'What the agent can call.',
          'What comes back.',
        ],
        footer: 'Simple first. Accurate second. Useful always.',
      },
      {
        duration: 8,
        visual: 'beforeAfter',
        headline: isMcp ? 'Before MCP vs after MCP' : 'Before vs after',
        subhead: 'The real problem is integration mess.',
        before: 'Every tool needs a custom connector and custom instructions.',
        after: 'Tools expose a shared interface the agent can understand.',
        footer: 'Less custom glue, more reusable tool access.',
      },
      {
        duration: 8,
        visual: 'hub',
        headline: 'The agent still needs tools',
        subhead: 'The model decides. The tools do the work.',
        body: 'Plan, choose, call, inspect.',
        labels: ['Agent', 'Docs', 'API', 'Database'],
        footer: 'A useful agent is a model plus controlled tool access.',
      },
      {
        duration: 10,
        visual: 'example',
        headline: 'One simple example',
        subhead: 'Prepare a launch update without copying data by hand.',
        labels: ['Launch notes', 'Agent', 'Draft update'],
        example:
          'The agent reads project notes, checks metrics, drafts a short update, and asks for review before publishing.',
        footer: 'The example matters more than the buzzword.',
      },
      {
        duration: 8,
        visual: 'warning',
        headline: 'Where people get it wrong',
        subhead: 'A protocol does not remove judgment.',
        useWhen: 'Use it for repeatable tool access across files, apps, and APIs.',
        avoidWhen: 'Do not use an agent when a normal script is more predictable.',
        rule: 'Add permissions, logs, evals, and human review for risky actions.',
        footer: 'Good agents are designed systems, not loose prompts.',
      },
      {
        duration: 7,
        visual: 'flow',
        headline: 'The takeaway',
        subhead: isMcp
          ? 'MCP standardizes how agents connect to tools.'
          : 'Agents are useful when the task needs decisions plus actions.',
        body: 'Keep the tool surface small and observable.',
        labels: ['Small scope', 'Clear tools', 'Logs', 'Review'],
        stepBodies: [
          'Solve one job.',
          'Expose only needed actions.',
          'Record every call.',
          'Approve risky steps.',
        ],
        footer: 'Follow for simple AI agent explainers.',
      },
    ],
  };
}

async function generateContent(topic, args) {
  if (args['no-llm'] || !process.env.OPENAI_API_KEY) {
    return fallbackContent(topic, args);
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const model = args.model || process.env.AI_VIDEO_LLM_MODEL || 'gpt-4.1';
  const isMicro =
    args.micro ||
    args.style === 'micro' ||
    process.env.AI_VIDEO_STYLE === 'micro';
  const duration = args.duration || process.env.AI_VIDEO_DURATION || (isMicro ? '20-30' : '45-60');
  const sceneCount = isMicro ? '3-4' : '5-7';
  const narrationLimit = isMicro ? '85' : '950';
  const prompt = `Create a ${duration} second vertical video script for an AI concept explainer.

Topic: ${topic}

Audience: broad general audience, including people who only casually use AI.
Style: simple, precise, visual, no hype, no emoji, no fake news.
Content rule: explain only one tiny point. No jargon unless the topic itself requires it.
Retention rule: start with a sharp everyday problem, not a definition.
Format: return only valid JSON with:
{
  "title": string under 90 chars,
  "description": string under 500 chars,
  "hashtags": string[],
  "narration": string under ${narrationLimit} words,
  "scenes": Array of ${sceneCount} objects with:
    "duration": number,
    "visual": "flow" | "beforeAfter" | "hub" | "example" | "warning",
    "headline": string,
    "subhead": string,
    "body": string,
    "labels": string[],
    "before": optional string,
    "after": optional string,
    "example": optional string,
    "useWhen": optional string,
    "avoidWhen": optional string,
    "rule": optional string,
    "footer": string
}

Do not mention sources unless they were provided. Make the explanation evergreen and safe to publish.`;

  try {
    const result = await client.chat.completions.create({
      model,
      temperature: 0.6,
      messages: [
        {
          role: 'system',
          content:
            'You write accurate short-form AI education scripts. Return strict JSON only.',
        },
        { role: 'user', content: prompt },
      ],
    });

    const text = result.choices[0]?.message?.content?.trim() || '';
    const jsonText = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const parsed = JSON.parse(jsonText);

    if (!parsed.title || !parsed.narration || !Array.isArray(parsed.scenes)) {
      throw new Error('missing required fields');
    }

    return {
      ...fallbackContent(topic, args),
      ...parsed,
      scenes: parsed.scenes.slice(0, 7),
    };
  } catch (error) {
    console.warn(`LLM generation failed, using fallback content: ${error.message}`);
    return fallbackContent(topic, args);
  }
}

async function generateSpeech(content, outputDir, args) {
  const provider = args.tts || process.env.AI_VIDEO_TTS_PROVIDER || 'say';
  const narrationPath = path.join(outputDir, 'narration.txt');
  await fs.writeFile(narrationPath, content.narration, 'utf8');

  if (provider === 'openai' && process.env.OPENAI_API_KEY) {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const speech = await client.audio.speech.create({
      model: process.env.AI_VIDEO_OPENAI_TTS_MODEL || 'tts-1',
      voice: process.env.AI_VIDEO_OPENAI_TTS_VOICE || 'alloy',
      input: content.narration,
      response_format: 'mp3',
    });
    const audioPath = path.join(outputDir, 'narration.mp3');
    await fs.writeFile(audioPath, Buffer.from(await speech.arrayBuffer()));
    return audioPath;
  }

  if (provider === 'edge-tts') {
    const audioPath = path.join(outputDir, 'narration.mp3');
    const subtitlesPath = path.join(outputDir, 'narration.vtt');
    const voice = args.voice || process.env.AI_VIDEO_TTS_VOICE || 'en-US-BrianNeural';
    const rate = String(args.rate || process.env.AI_VIDEO_TTS_RATE || '+8%');
    await execFile(
      process.env.AI_VIDEO_EDGE_TTS_COMMAND || 'uvx',
      [
        'edge-tts',
        '-f',
        narrationPath,
        '-v',
        voice,
        '--rate',
        rate,
        '--write-media',
        audioPath,
        '--write-subtitles',
        subtitlesPath,
      ],
      { cwd: rootDir }
    );
    return audioPath;
  }

  const audioPath = path.join(outputDir, 'narration.aiff');
  const voice = args.voice || process.env.AI_VIDEO_TTS_VOICE || 'Samantha';
  const rate = String(args.rate || process.env.AI_VIDEO_TTS_RATE || '188');
  await execFile('say', ['-v', voice, '-r', rate, '-f', narrationPath, '-o', audioPath], {
    cwd: rootDir,
  });
  return audioPath;
}

async function getDuration(filePath) {
  const { stdout } = await execFile('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    filePath,
  ]);
  return Number(stdout.trim());
}

function concatEscape(filePath) {
  return filePath.replace(/'/g, "'\\''");
}

async function renderVideo(frames, audioPath, outputDir) {
  const audioDuration = await getDuration(audioPath);
  const baseDuration = frames.reduce((total, frame) => total + frame.duration, 0);
  const targetDuration = Math.max(audioDuration + 1.0, baseDuration);
  const scale = targetDuration / baseDuration;
  const concatPath = path.join(outputDir, 'frames.txt');
  const lines = [];

  for (const frame of frames) {
    lines.push(`file '${concatEscape(frame.path)}'`);
    lines.push(`duration ${(frame.duration * scale).toFixed(3)}`);
  }
  lines.push(`file '${concatEscape(frames[frames.length - 1].path)}'`);
  await fs.writeFile(concatPath, `${lines.join('\n')}\n`, 'utf8');

  const videoPath = path.join(outputDir, 'video.mp4');
  await execFile('ffmpeg', [
    '-y',
    '-hide_banner',
    '-loglevel',
    'error',
    '-f',
    'concat',
    '-safe',
    '0',
    '-i',
    concatPath,
    '-i',
    audioPath,
    '-vf',
    'fps=30,format=yuv420p',
    '-af',
    'loudnorm=I=-16:TP=-1.5:LRA=11,apad',
    '-c:v',
    'libx264',
    '-preset',
    'veryfast',
    '-c:a',
    'aac',
    '-b:a',
    '160k',
    '-t',
    targetDuration.toFixed(3),
    '-movflags',
    '+faststart',
    videoPath,
  ]);
  return videoPath;
}

async function getLocalOrganization() {
  if (!process.env.DATABASE_URL) return undefined;
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

function getPostizBaseUrl() {
  return (
    process.env.POSTIZ_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function isLocalPostizUrl() {
  try {
    const url = new URL(getPostizBaseUrl());
    return ['localhost', '127.0.0.1', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function shouldUseLocalTemporal(args) {
  return (
    isLocalPostizUrl() &&
    process.env.TEMPORAL_TLS !== 'true' &&
    process.env.AI_VIDEO_SKIP_TEMPORAL_INIT !== 'true' &&
    !args['skip-temporal-init']
  );
}

async function withTemporalConnection(args, callback) {
  const connection = await Connection.connect({
    address:
      args['temporal-address'] ||
      process.env.TEMPORAL_ADDRESS ||
      'localhost:7233',
  });

  try {
    return await callback(connection);
  } finally {
    if (typeof connection.close === 'function') {
      await connection.close();
    }
  }
}

async function ensureTemporalSearchAttributes(args) {
  if (!shouldUseLocalTemporal(args)) return false;

  try {
    return await withTemporalConnection(args, async (connection) => {
      const namespace =
        args['temporal-namespace'] || process.env.TEMPORAL_NAMESPACE || 'default';
      const { customAttributes } =
        await connection.operatorService.listSearchAttributes({ namespace });
      const missingAttributes = ['organizationId', 'postId'].filter(
        (attribute) => !customAttributes[attribute]
      );

      if (missingAttributes.length) {
        await connection.operatorService.addSearchAttributes({
          namespace,
          searchAttributes: Object.fromEntries(
            missingAttributes.map((attribute) => [attribute, 1])
          ),
        });
      }

      return true;
    });
  } catch (error) {
    throw new Error(
      `Local Temporal preflight failed. Start Temporal first, then retry. Cause: ${error.message}`
    );
  }
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
      `${options.method || 'GET'} ${url} failed: ${response.status} ${JSON.stringify(body)}`
    );
  }
  return body;
}

async function resolvePublishingConfig(args) {
  const platforms = getPlatforms(args);
  const localOrganization = await getLocalOrganization();
  const apiKey = process.env.POSTIZ_API_KEY || localOrganization?.apiKey;
  if (!apiKey) {
    throw new Error(
      'POSTIZ_API_KEY is missing and no local DATABASE_URL organization apiKey was found.'
    );
  }

  const integrations = await postizFetch('/public/v1/integrations', {
    headers: { Authorization: apiKey },
  });

  const youtubeId =
    args.youtubeIntegration ||
    process.env.POSTIZ_YOUTUBE_INTEGRATION_ID ||
    integrations.find(
      (integration) => integration.identifier === 'youtube' && !integration.disabled
    )?.id;

  const tiktokId =
    args.tiktokIntegration ||
    process.env.POSTIZ_TIKTOK_INTEGRATION_ID ||
    integrations.find(
      (integration) => integration.identifier === 'tiktok' && !integration.disabled
    )?.id;

  if (platforms.includes('youtube') && !youtubeId) {
    throw new Error('An enabled YouTube integration is required.');
  }

  if (platforms.includes('tiktok') && !tiktokId) {
    throw new Error('An enabled TikTok integration is required.');
  }

  return {
    apiKey,
    youtubeId,
    tiktokId,
    organizationId: process.env.POSTIZ_ORGANIZATION_ID || localOrganization?.id,
  };
}

function shouldRefreshToken(tokenExpiration) {
  if (!tokenExpiration) return true;
  return new Date(tokenExpiration).getTime() < Date.now() + 5 * 60 * 1000;
}

async function refreshYoutubeIntegration(prisma, integration) {
  if (!integration.refreshToken) {
    throw new Error('YouTube refresh token is missing; reconnect the channel.');
  }

  if (!process.env.YOUTUBE_CLIENT_ID || !process.env.YOUTUBE_CLIENT_SECRET) {
    throw new Error('YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET are required.');
  }

  const client = new google.auth.OAuth2(
    process.env.YOUTUBE_CLIENT_ID,
    process.env.YOUTUBE_CLIENT_SECRET,
    `${process.env.FRONTEND_URL}/integrations/social/youtube`
  );
  client.setCredentials({ refresh_token: integration.refreshToken });
  const { credentials } = await client.refreshAccessToken();

  if (!credentials.access_token || !credentials.expiry_date) {
    throw new Error('YouTube refresh did not return a usable access token.');
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      token: credentials.access_token,
      refreshToken: credentials.refresh_token || integration.refreshToken,
      tokenExpiration: new Date(credentials.expiry_date),
      refreshNeeded: false,
      disabled: false,
    },
  });
}

async function refreshTiktokIntegration(prisma, integration) {
  if (!integration.refreshToken) {
    throw new Error('TikTok refresh token is missing; reconnect the channel.');
  }

  if (!process.env.TIKTOK_CLIENT_ID || !process.env.TIKTOK_CLIENT_SECRET) {
    throw new Error('TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET are required.');
  }

  const response = await fetch('https://open.tiktokapis.com/v2/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: process.env.TIKTOK_CLIENT_ID,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: integration.refreshToken,
    }).toString(),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(
      `TikTok refresh failed: ${JSON.stringify(body?.error || body)}`
    );
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      token: body.access_token,
      refreshToken: body.refresh_token || integration.refreshToken,
      tokenExpiration: new Date(Date.now() + Number(body.expires_in || 82800) * 1000),
      refreshNeeded: false,
      disabled: false,
    },
  });
}

async function refreshLocalIntegrationTokens(publishing, args) {
  if (
    args['skip-token-refresh'] ||
    process.env.AI_VIDEO_SKIP_TOKEN_REFRESH === 'true' ||
    !process.env.DATABASE_URL
  ) {
    return;
  }

  const platforms = getPlatforms(args);
  const ids = [
    platforms.includes('youtube') ? publishing.youtubeId : undefined,
    platforms.includes('tiktok') ? publishing.tiktokId : undefined,
  ].filter(Boolean);

  if (!ids.length) return;

  const prisma = new PrismaClient();
  try {
    const integrations = await prisma.integration.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        providerIdentifier: true,
        tokenExpiration: true,
        refreshToken: true,
      },
    });

    for (const integration of integrations) {
      if (!shouldRefreshToken(integration.tokenExpiration)) continue;

      if (integration.providerIdentifier === 'youtube') {
        await refreshYoutubeIntegration(prisma, integration);
      }

      if (integration.providerIdentifier === 'tiktok') {
        await refreshTiktokIntegration(prisma, integration);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

function getPlatforms(args) {
  const raw = args.platform || args.platforms || process.env.AI_VIDEO_PLATFORM || 'both';
  if (raw === 'both') return ['youtube', 'tiktok'];
  return raw
    .split(',')
    .map((platform) => platform.trim().toLowerCase())
    .filter((platform) => ['youtube', 'tiktok'].includes(platform));
}

function startStaticServer(filePath, preferredPort) {
  const filename = path.basename(filePath);
  const mime = 'video/mp4';
  const server = http.createServer((req, res) => {
    const reqPath = decodeURIComponent(
      new URL(req.url || '/', 'http://127.0.0.1').pathname
    );
    if (reqPath !== `/${filename}`) {
      res.writeHead(404);
      res.end('not found');
      return;
    }

    const stat = fssync.statSync(filePath);
    const range = req.headers.range;
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', mime);

    if (req.method === 'HEAD') {
      res.setHeader('Content-Length', stat.size);
      res.writeHead(200);
      res.end();
      return;
    }

    if (range) {
      const match = /bytes=(\d+)-(\d*)/.exec(range);
      const start = match ? Number(match[1]) : 0;
      const end = match?.[2] ? Number(match[2]) : stat.size - 1;
      res.writeHead(206, {
        'Content-Length': end - start + 1,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      });
      fssync.createReadStream(filePath, { start, end }).pipe(res);
      return;
    }

    res.setHeader('Content-Length', stat.size);
    res.writeHead(200);
    fssync.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(Number(preferredPort || 0), '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}/${filename}`,
        close: () => new Promise((done) => server.close(done)),
      });
    });
  });
}

async function uploadMedia(apiKey, videoPath) {
  const formData = new FormData();
  const buffer = await fs.readFile(videoPath);
  formData.append('file', new Blob([buffer], { type: 'video/mp4' }), path.basename(videoPath));

  return postizFetch('/public/v1/upload', {
    method: 'POST',
    headers: { Authorization: apiKey },
    body: formData,
  });
}

function makeCaption(content) {
  const tags = (content.hashtags || ['AI', 'AIAgents', 'TechExplained'])
    .map((tag) => `#${String(tag).replace(/^#/, '').replace(/[^a-zA-Z0-9_]/g, '')}`)
    .filter((tag) => tag.length > 1)
    .slice(0, 6)
    .join(' ');
  return cleanForCaption(`${content.description}\n\n${tags}`, 1200);
}

async function createPost({ apiKey, youtubeId, tiktokId, media, content, args }) {
  const platforms = getPlatforms(args);
  const visibility = args.visibility || process.env.AI_VIDEO_VISIBILITY || 'private';
  const youtubePrivacy =
    visibility === 'public' ? 'public' : visibility === 'unlisted' ? 'unlisted' : 'private';
  const tiktokPrivacy =
    args.tiktokPrivacy ||
    process.env.AI_VIDEO_TIKTOK_PRIVACY ||
    (visibility === 'public' ? 'PUBLIC_TO_EVERYONE' : 'SELF_ONLY');

  const caption = makeCaption(content);
  const nowIso = new Date(Date.now() + 15_000).toISOString();
  const mediaDto = { id: media.id || `generated-${makeId()}`, path: media.path };
  const postType = args['post-type'] || process.env.AI_VIDEO_POST_TYPE || 'now';
  const posts = [];

  if (platforms.includes('youtube')) {
    posts.push({
        integration: { id: youtubeId },
        settings: {
          title: content.title.slice(0, 100),
          type: youtubePrivacy,
          selfDeclaredMadeForKids: 'no',
          tags: (content.hashtags || []).slice(0, 10).map((tag) => ({
            value: tag,
            label: tag,
          })),
        },
        value: [
          {
            content: caption,
            image: [mediaDto],
          },
        ],
      });
  }

  if (platforms.includes('tiktok')) {
    posts.push({
        integration: { id: tiktokId },
        settings: {
          title: content.title.slice(0, 90),
          privacy_level: tiktokPrivacy,
          duet: false,
          stitch: false,
          comment: true,
          autoAddMusic: 'no',
          brand_content_toggle: false,
          video_made_with_ai: true,
          brand_organic_toggle: false,
          content_posting_method:
            args['tiktok-method'] ||
            process.env.AI_VIDEO_TIKTOK_METHOD ||
            'DIRECT_POST',
        },
        value: [
          {
            content: cleanForCaption(`${content.title}\n\n${caption}`, 600),
            image: [mediaDto],
          },
        ],
      });
  }

  const body = {
    type: postType,
    date: nowIso,
    shortLink: false,
    tags: [],
    posts,
    creationMethod: 'API',
  };

  return postizFetch('/public/v1/posts', {
    method: 'POST',
    headers: {
      Authorization: apiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
}

async function startLocalPostWorkflows(postResponse, publishing, args) {
  if (
    !shouldUseLocalTemporal(args) ||
    args['skip-workflow-kick'] ||
    process.env.AI_VIDEO_SKIP_WORKFLOW_KICK === 'true'
  ) {
    return;
  }

  if (!publishing.organizationId) {
    console.warn('Local organization id is missing; skipping workflow kick.');
    return;
  }

  const integrationTaskQueues = new Map(
    [
      [publishing.youtubeId, 'youtube'],
      [publishing.tiktokId, 'tiktok'],
    ].filter(([id]) => Boolean(id))
  );

  await withTemporalConnection(args, async (connection) => {
    const namespace =
      args['temporal-namespace'] || process.env.TEMPORAL_NAMESPACE || 'default';
    const client = new WorkflowClient({ connection, namespace });
    const postIdKey = defineSearchAttributeKey('postId', SearchAttributeType.TEXT);
    const organizationIdKey = defineSearchAttributeKey(
      'organizationId',
      SearchAttributeType.TEXT
    );

    for (const post of postResponse || []) {
      const taskQueue = integrationTaskQueues.get(post.integration);
      if (!post.postId || !taskQueue) continue;

      await client.start('postWorkflowV105', {
        workflowId: `post_${post.postId}`,
        taskQueue: 'main',
        workflowIdConflictPolicy: WorkflowIdConflictPolicy.TERMINATE_EXISTING,
        args: [
          {
            taskQueue,
            postId: post.postId,
            organizationId: publishing.organizationId,
          },
        ],
        typedSearchAttributes: new TypedSearchAttributes([
          { key: postIdKey, value: post.postId },
          { key: organizationIdKey, value: publishing.organizationId },
        ]),
      });
    }
  });
}

async function waitForPosts(postIds, timeoutMs = 600_000) {
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL is missing; skipping local post state polling.');
    return [];
  }

  const prisma = new PrismaClient();
  const start = Date.now();
  try {
    while (Date.now() - start < timeoutMs) {
      const posts = await prisma.post.findMany({
        where: { id: { in: postIds } },
        select: {
          id: true,
          state: true,
          error: true,
          releaseURL: true,
          integration: { select: { providerIdentifier: true, name: true } },
        },
      });

      const done = posts.every((post) => ['PUBLISHED', 'ERROR'].includes(post.state));
      const status = posts
        .map((post) => `${post.integration.providerIdentifier}:${post.state}`)
        .join(' ');
      process.stdout.write(`\r${status.padEnd(80)}`);

      if (done) {
        process.stdout.write('\n');
        return posts;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    process.stdout.write('\n');
    throw new Error('Timed out waiting for Postiz workflows to finish.');
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  loadDotEnv(path.join(rootDir, '.env'));
  const args = parseArgs(process.argv.slice(2));
  const topic = args.topic || process.env.AI_VIDEO_TOPIC || 'What is MCP in AI agents?';
  const runId = `${new Date().toISOString().replace(/[:.]/g, '-')}-${slugify(topic)}`;
  const outputDir = path.resolve(args['output-dir'] || path.join(defaultOutputRoot, runId));
  await fs.mkdir(outputDir, { recursive: true });

  const content = await generateContent(topic, args);
  await fs.writeFile(path.join(outputDir, 'content.json'), JSON.stringify(content, null, 2));

  const frames = await renderFrames(content, outputDir);
  const audioPath = await generateSpeech(content, outputDir, args);
  const videoPath = await renderVideo(frames, audioPath, outputDir);

  const summary = {
    topic,
    title: content.title,
    outputDir,
    videoPath,
    posted: false,
    postResponse: null,
    postResults: [],
  };

  let server;
  try {
    if (args.post && !args['dry-run']) {
      const publishing = await resolvePublishingConfig(args);
      await refreshLocalIntegrationTokens(publishing, args);
      await ensureTemporalSearchAttributes(args);
      const mediaMode = args['media-mode'] || process.env.AI_VIDEO_MEDIA_MODE || 'serve';
      let media;

      if (mediaMode === 'upload') {
        media = await uploadMedia(publishing.apiKey, videoPath);
      } else {
        server = await startStaticServer(videoPath, args.port || process.env.AI_VIDEO_STATIC_PORT);
        media = { id: `generated-${makeId()}`, path: server.url };
      }

      const postResponse = await createPost({ ...publishing, media, content, args });
      const postIds = (postResponse || []).map((post) => post.postId).filter(Boolean);
      summary.posted = true;
      summary.postResponse = postResponse;

      if (args.wait && postIds.length) {
        await startLocalPostWorkflows(postResponse, publishing, args);
        summary.postResults = await waitForPosts(
          postIds,
          Number(args.timeout || 600) * 1000
        );
      }
    }
  } finally {
    if (server) await server.close();
  }

  await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
