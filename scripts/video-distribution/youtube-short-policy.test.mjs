import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildYoutubeShortDescription,
  buildYoutubeShortTags,
  fixedTinyAgentShortDescription,
  fixedYoutubeShortPolicy,
  legacyTinyAgentShortDescription,
  resolveYoutubeShortPolicy,
} from './youtube-short-policy.mjs';

test('applies public non-kids YouTube Short policy', () => {
  assert.deepEqual(
    resolveYoutubeShortPolicy({ language: 'en-US' }),
    fixedYoutubeShortPolicy
  );
});

test('rejects private visibility and longform playlist leakage', () => {
  assert.throws(
    () => resolveYoutubeShortPolicy({ youtube: { visibility: 'private' } }),
    /conflicts with the fixed Short policy/
  );
  assert.throws(
    () => resolveYoutubeShortPolicy({ youtube: { playlistId: 'longform' } }),
    /do not inherit.*longform playlist/
  );
});

test('normalizes tags and always carries Shorts identity', () => {
  assert.deepEqual(
    buildYoutubeShortTags({ tags: ['#AI', '#TinyAgent', '#AI'] }),
    ['AI', 'TinyAgent', 'Shorts']
  );
});

test('preserves the immutable Short description from the imported bundle', () => {
  assert.equal(
    buildYoutubeShortDescription(
      { description: fixedTinyAgentShortDescription },
      '2026-09-09-04'
    ),
    fixedTinyAgentShortDescription
  );
  assert.equal(
    buildYoutubeShortDescription(
      { description: legacyTinyAgentShortDescription },
      '2026-09-08-04'
    ),
    legacyTinyAgentShortDescription
  );
  assert.equal(
    buildYoutubeShortDescription({ description: '' }, '2026-08-27-04'),
    ''
  );
  assert.throws(
    () => buildYoutubeShortDescription({ description: '' }, '2026-08-28-04'),
    /fixed promotion for this run key/
  );
  assert.throws(
    () =>
      buildYoutubeShortDescription(
        { description: legacyTinyAgentShortDescription },
        '2026-08-27-04'
      ),
    /Historical.*must remain empty/
  );
  assert.throws(
    () =>
      buildYoutubeShortDescription(
        {
          description: fixedTinyAgentShortDescription.replace(
            'https://promofast.show/',
            '[https://promofast.show/](https://promofast.show/)'
          ),
        },
        '2026-09-09-04'
      ),
    /fixed promotion for this run key/
  );
});
