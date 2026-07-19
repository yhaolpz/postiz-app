import test from 'node:test';
import assert from 'node:assert/strict';

import {
  assertRealtimeCaptionTrack,
  buildRealtimeCaptionTrack,
  parseVttCues,
} from './realtime-captions.mjs';

test('parses edge-tts VTT cues and normalizes overlapping cue boundaries', () => {
  const cues = parseVttCues(`WEBVTT

00:00:00.100 --> 00:00:02.100
An agent takes steps and checks the result.

00:00:02,050 --> 00:00:04,500
Follow Tiny Agent.
`);
  const track = buildRealtimeCaptionTrack(cues);

  assert.equal(cues.length, 2);
  assert.equal(track[0].endSeconds, 2.05);
  assert.equal(track.at(-1).spokenText, 'Follow Tiny Agent.');
  assert.doesNotThrow(() => assertRealtimeCaptionTrack(track, 4.6));
});

test('splits long narration cues into short two-line display cues', () => {
  const track = buildRealtimeCaptionTrack([
    {
      startSeconds: 0,
      endSeconds: 6,
      text: 'Parallelization works best when tasks are independent and the result can be combined safely.',
    },
  ]);

  assert.ok(track.length > 1);
  assert.ok(track.every((cue) => cue.spokenText.split(/\s+/).length <= 9));
  assert.ok(track.every((cue) => cue.text.split('\n').length <= 2));
  assert.equal(track.at(-1).endSeconds, 6);
});

test('rebalances a trailing word so captions do not flash an orphan', () => {
  const track = buildRealtimeCaptionTrack([
    {
      startSeconds: 0.1,
      endSeconds: 3.211,
      text: 'What can several model calls improve besides speed?',
    },
  ]);

  assert.ok(track.every((cue) => cue.spokenText.split(/\s+/).length >= 3));
  assert.doesNotThrow(() => assertRealtimeCaptionTrack(track, 3.3));
});

test('splits a phrase when no word boundary can fit it into two lines', () => {
  const track = buildRealtimeCaptionTrack([
    {
      startSeconds: 0,
      endSeconds: 4,
      text: 'Sectioning splits independent subtasks, runs them at the same time.',
    },
  ]);

  assert.ok(track.length > 1);
  assert.doesNotThrow(() => assertRealtimeCaptionTrack(track, 4.1));
});
