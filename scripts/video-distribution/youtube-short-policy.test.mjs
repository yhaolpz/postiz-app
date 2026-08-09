import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildYoutubeShortTags,
  fixedYoutubeShortPolicy,
  resolveYoutubeShortPolicy,
} from './youtube-short-policy.mjs';

test('applies public non-kids YouTube Short policy', () => {
  assert.deepEqual(resolveYoutubeShortPolicy({ language: 'en-US' }), fixedYoutubeShortPolicy);
});

test('rejects private visibility and longform playlist leakage', () => {
  assert.throws(
    () => resolveYoutubeShortPolicy({ youtube: { visibility: 'private' } }),
    /conflicts with the fixed Short policy/,
  );
  assert.throws(
    () => resolveYoutubeShortPolicy({ youtube: { playlistId: 'longform' } }),
    /do not inherit.*longform playlist/,
  );
});

test('normalizes tags and always carries Shorts identity', () => {
  assert.deepEqual(
    buildYoutubeShortTags({ tags: ['#AI', '#TinyAgent', '#AI'] }),
    ['AI', 'TinyAgent', 'Shorts'],
  );
});
