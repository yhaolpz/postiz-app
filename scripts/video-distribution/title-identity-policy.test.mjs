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

const approvedH07Metadata = {
  source: {
    publisher: 'DeepSeek AI',
    title:
      'DeepSeek Harness dsh-v0.1.1-rc.2 Profile boot and configuration precedence documentation',
    releaseTag: 'dsh-v0.1.1-rc.2',
    sourceCommit: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  },
};

const approvedH08Metadata = {
  source: {
    publisher: 'DeepSeek AI',
    title:
      'DeepSeek Harness dsh-v0.1.1-rc.2 MCP client, CLI trust boundary, and process sandbox documentation',
    releaseTag: 'dsh-v0.1.1-rc.2',
    sourceCommit: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
  },
};

const approvedCX01Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX02Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX03Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    url: 'https://learn.chatgpt.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX04Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    url: 'https://learn.chatgpt.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX05Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX06Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform: build on the open agent harness',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX07Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex prompting: fix a bug with reproduction and verification',
    url: 'https://learn.chatgpt.com/docs/prompting',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX08Metadata = {
  source: {
    publisher: 'OpenAI',
    title:
      'Codex as a platform; Long-running work; Code review; Codex app-server',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
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

test('accepts only the exact approved DeepSeek Harness H07 title with immutable source evidence', () => {
  const title =
    'Worried a New DeepSeek Harness Plugin Will Break Your Setup? Test It in a Separate Profile.';
  assert.equal(hasYoutubeLongformIdentity(title, approvedH07Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedH07Metadata.source, releaseTag: 'wrong-tag' },
    }),
    false
  );
});

test('accepts only the exact approved DeepSeek Harness H08 title with immutable source evidence', () => {
  const title =
    'Is It Safe to Connect MCP to DeepSeek Harness? Beginners Should Check What It Will Run.';
  assert.equal(hasYoutubeLongformIdentity(title, approvedH08Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedH08Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
});

test('accepts only the exact approved Codex CX01 title with immutable source evidence', () => {
  const title = 'How Do You Keep Codex on the Right Files?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX01Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX01Metadata.source, releaseTag: 'wrong-tag' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Keep Codex on the Intended Files?',
      approvedCX01Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX02 title with immutable source evidence', () => {
  const title =
    'How Do You Give Codex One Request and Carry It All the Way to Acceptance?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX02Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX02Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Give Codex a Request and Carry It to Acceptance?',
      approvedCX02Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX03 title with immutable source evidence', () => {
  const title =
    'When Codex Runs Commands, How Do You Prevent Accidental Deletes and Secret Leaks?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX03Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX03Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX03Metadata.source, publicationDate: '2026-08-20' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Runs Commands, How Do You Prevent Deletes and Secret Leaks?',
      approvedCX03Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX04 title with immutable source evidence', () => {
  const title = 'How Do You Resume a Long Codex Task After an Interruption?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX04Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX04Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX04Metadata.source, publicationDate: '2026-08-20' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Resume Codex After an Interruption?',
      approvedCX04Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX05 title with immutable source evidence', () => {
  const title =
    'How Do You Stop Teaching Codex the Same Repetitive Task Every Time?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX05Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX05Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX05Metadata.source, publicationDate: '2026-08-20' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Stop Teaching Codex Repetitive Tasks Every Time?',
      approvedCX05Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX06 title with immutable source evidence', () => {
  const title =
    'How Do You Give Codex Multiple Tasks Without Missing Steps or Causing Rework?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX06Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX06Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX06Metadata.source, publicationDate: '2026-08-20' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Give Codex Multiple Tasks Without Missing Steps or Rework?',
      approvedCX06Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX07 title with immutable source evidence', () => {
  const title = 'How Do You Stop Codex From Fixing Only the Symptom of a Bug?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX07Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX07Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX07Metadata.source, url: 'https://example.com' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Stop Codex From Fixing the Symptom of a Bug?',
      approvedCX07Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX08 title with immutable source evidence', () => {
  const title = 'When Codex Drifts, How Do You Bring the Task Back on Track?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX08Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX08Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX08Metadata.source, title: 'Codex as a platform' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Drifts, Can You Bring the Task Back on Track?',
      approvedCX08Metadata
    ),
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
  assert.equal(
    hasYoutubeLongformIdentity(
      'Worried a DeepSeek Harness Plugin Will Break Your Setup? Test It in a Separate Profile.',
      approvedH07Metadata
    ),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'Is It Safe to Connect MCP to DeepSeek Harness? Check What It Will Run.',
      approvedH08Metadata
    ),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity('How Do You Keep Codex on the Right Files?', {
      source: { ...approvedCX01Metadata.source, publisher: 'Not OpenAI' },
    }),
    false
  );
});
