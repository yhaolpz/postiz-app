import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildYoutubeDescription,
  buildYoutubeTags,
  fixedYoutubeLongformPolicy,
  fixedTinyAgentLongformPromotion,
  resolveYoutubeLongformPolicy,
} from './youtube-longform-policy.mjs';

test('applies the fixed YouTube policy to platform-neutral metadata', () => {
  assert.deepEqual(
    resolveYoutubeLongformPolicy({ language: 'en-US' }),
    fixedYoutubeLongformPolicy
  );
});

test('accepts matching legacy YouTube metadata', () => {
  assert.deepEqual(
    resolveYoutubeLongformPolicy({
      youtube: {
        visibility: 'public',
        selfDeclaredMadeForKids: 'no',
        playlistId: 'PLJffvaWRvGC8',
        playlistTitle: 'AI Agents: From Chat to Done',
        playlistPrivacyStatus: 'public',
      },
    }),
    fixedYoutubeLongformPolicy
  );
});

test('rejects metadata that weakens or redirects the fixed policy', () => {
  assert.throws(
    () => resolveYoutubeLongformPolicy({ youtube: { visibility: 'private' } }),
    /conflicts with the fixed distribution policy/
  );
  assert.throws(
    () => resolveYoutubeLongformPolicy({ youtube: { playlistId: 'other' } }),
    /conflicts with the fixed distribution policy/
  );
});

test('removes source branding from the YouTube description without changing the bundle', () => {
  assert.equal(
    buildYoutubeDescription({
      source: {
        publisher: 'Microsoft Research',
        title: 'A Source Article',
      },
      description:
        "Drawing on Microsoft Research's distinction between two modes, this episode explains the practical difference. A Source Article is not linked.",
    }),
    'This episode explains the practical difference. the source article is not linked.'
  );
  assert.equal(
    buildYoutubeDescription({
      source: { publisher: 'Anthropic' },
      description:
        'This checklist is a practical synthesis, not an official Anthropic template.',
    }),
    'This checklist is a practical synthesis, not an official source template.'
  );
});

test('allows only the exact fixed tapto.top promotion in longform descriptions', () => {
  assert.equal(
    buildYoutubeDescription({
      description: `Three takeaways.\n\n${fixedTinyAgentLongformPromotion}\n\nFollow Tiny Agent.`,
    }),
    `Three takeaways.\n\n${fixedTinyAgentLongformPromotion}\n\nFollow Tiny Agent.`
  );
  assert.throws(
    () =>
      buildYoutubeDescription({
        description: fixedTinyAgentLongformPromotion.replace(
          'https://tapto.top',
          '[https://tapto.top](https://tapto.top)'
        ),
      }),
    /fixed tapto\.top promotion/
  );
  assert.throws(
    () =>
      buildYoutubeDescription({
        description: `${fixedTinyAgentLongformPromotion}\nhttps://example.com`,
      }),
    /fixed tapto\.top promotion/
  );
  assert.throws(
    () =>
      buildYoutubeDescription({
        description: fixedTinyAgentLongformPromotion.replace(
          'tapto.top',
          'TapTo.Top'
        ),
      }),
    /fixed tapto\.top promotion/
  );
});

test('normalizes legacy tags and platform-neutral keyword fields', () => {
  assert.deepEqual(
    buildYoutubeTags({ tags: ['AI Agent', 'Tiny Agent', 'AI Agent'] }),
    ['AI Agent', 'Tiny Agent']
  );
  assert.deepEqual(
    buildYoutubeTags({
      primaryKeyword: 'AI Agent cost',
      secondaryKeywords: ['model routing', 'accepted result'],
      hashtags: ['#AIAgents', '#TinyAgent'],
    }),
    [
      'AI Agent cost',
      'model routing',
      'accepted result',
      'AIAgents',
      'TinyAgent',
    ]
  );
});
