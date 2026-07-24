#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

function usage() {
  return [
    'Usage: node scripts/ai-video-pipeline/cloud/run-tiny-agent-longform-cloud.mjs --project <project-directory>',
    '',
    'Runs Chinese/English Tiny Agent local production only: TTS, compile, QA, and MP4 render.',
    'It intentionally has no Postiz, YouTube, TikTok, or other publishing operation.'
  ].join('\n');
}

function argValue(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1] || null;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repoRoot,
    env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` },
    encoding: 'utf8',
    stdio: 'inherit'
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status}`);
}

const projectArg = argValue('--project');
if (!projectArg || process.argv.includes('--help')) {
  process.stdout.write(`${usage()}\n`);
  process.exit(projectArg ? 0 : 1);
}

if (process.env.TINY_AGENT_CLOUD_NETWORK_ENABLED !== '1') {
  throw new Error('Refusing to synthesize TTS without TINY_AGENT_CLOUD_NETWORK_ENABLED=1. Enable limited Cloud agent internet access for speech.platform.bing.com, then set this environment variable in Codex Cloud settings.');
}

const projectDir = path.resolve(repoRoot, projectArg);
const relativeProject = path.relative(repoRoot, projectDir);
if (relativeProject.startsWith('..') || path.isAbsolute(relativeProject)) {
  throw new Error('--project must stay inside this repository.');
}
for (const file of ['package.json', 'build.mjs', 'episode.json', 'SCRIPT.zh-CN.md']) {
  if (!existsSync(path.join(projectDir, file))) throw new Error(`Not a supported Tiny Agent project: missing ${path.join(relativeProject, file)}`);
}

const episode = JSON.parse(readFileSync(path.join(projectDir, 'episode.json'), 'utf8'));
if (!['zh-CN', 'en-US'].includes(episode.locale)) throw new Error(`Unsupported locale: ${episode.locale}`);

run('node', ['scripts/ai-video-pipeline/validate-tiny-agent-active-rules.mjs']);
run('pnpm', ['run', 'tts'], { cwd: projectDir });
run('pnpm', ['run', 'build'], { cwd: projectDir });
for (const script of ['check:transitions', 'check:semantics', 'check:balance', 'check:layout', 'check']) {
  run('pnpm', ['run', script], { cwd: projectDir });
}
run('pnpm', ['run', 'render'], { cwd: projectDir });

const summaryPath = path.join(projectDir, 'summary.json');
if (!existsSync(summaryPath)) throw new Error('Render completed without summary.json.');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
const rendered = path.resolve(projectDir, summary.output);
if (!existsSync(rendered)) throw new Error(`Render output is missing: ${summary.output}`);

const manifest = {
  schemaVersion: 1,
  runtime: 'codex-cloud',
  locale: episode.locale,
  project: relativeProject,
  output: path.relative(repoRoot, rendered),
  renderedAt: new Date().toISOString(),
  publication: 'blocked-by-design; local Postiz publishing remains a local-only step'
};
writeFileSync(path.join(projectDir, 'cloud-production-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest, null, 2)}\n`);
