import assert from 'node:assert/strict';
import test from 'node:test';
import { hasYoutubeLongformIdentity } from './title-identity-policy.mjs';

const approvedH03Metadata = {
  source: {
    publisher: 'DeepSeek AI',
    title: 'DeepSeek Harness dsh-v0.1.0-rc.7',
    releaseTag: 'dsh-v0.1.0-rc.7',
    sourceCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
  },
};

test('accepts the ordinary AI Agent identity contract', () => {
  assert.equal(
    hasYoutubeLongformIdentity('An AI Agent Can Verify This Result.'),
    true
  );
  assert.equal(
    hasYoutubeLongformIdentity('AI Agents Need Clear Boundaries.'),
    true
  );
});

test('accepts only the exact approved DeepSeek Harness H03 title with immutable source evidence', () => {
  const title =
    'What Is DeepSeek Harness For? It Brings AI Directly Into Your Workspace.';
  assert.equal(hasYoutubeLongformIdentity(title, approvedH03Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedH03Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
});

test('does not broaden the named exception to arbitrary AI or altered Harness titles', () => {
  assert.equal(
    hasYoutubeLongformIdentity(
      'AI Can Enter Your Workspace.',
      approvedH03Metadata
    ),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'What Is DeepSeek Harness For? It Brings AI Into Your Workspace.',
      approvedH03Metadata
    ),
    false
  );
});
