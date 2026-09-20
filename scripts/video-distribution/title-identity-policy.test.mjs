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

const approvedCX09Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Model guidance; Long-running work; Codex exec event protocol',
    url: 'https://developers.openai.com/api/docs/guides/latest-model?model=gpt-5.5',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX10Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Refactor your codebase; Codex as a platform',
    url: 'https://learn.chatgpt.com/use-cases/refactor-your-codebase',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX11Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform; Code review; Model optimization',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX12Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform; Troubleshooting ChatGPT for Work',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX13Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform; Introducing upgrades to Codex; Codex Security',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX14Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform; Add evals to your AI app',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX15Metadata = {
  source: {
    publisher: 'OpenAI',
    title:
      'Codex as a platform; How OpenAI uses Codex; Running Codex safely at OpenAI',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCX16Metadata = {
  source: {
    publisher: 'OpenAI',
    title: 'Codex as a platform; Introducing upgrades to Codex',
    url: 'https://developers.openai.com/blog/codex-as-a-platform',
    publicationDate: '2026-08-19',
    releaseTag: 'rust-v0.150.1',
    sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
  },
};

const approvedCV01Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title: 'Codex AGENTS.md and Claude Code memory documentation',
    url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md',
    claudeCodeUrl: 'https://code.claude.com/docs/en/memory',
    publicationDate: '2026-09-02',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
  },
};

const approvedCV02Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title: 'Codex Plan mode and Claude Code permission mode documentation',
    url: 'https://github.com/openai/codex/blob/main/codex-rs/collaboration-mode-templates/templates/plan.md',
    claudeCodeUrl: 'https://code.claude.com/docs/en/permission-modes',
    publicationDate: '2026-09-02',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
  },
};

const approvedCV03Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title: 'Codex apply_patch and Claude Code file-editing documentation',
    url: 'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/prompts/templates/apply_patch_tool_instructions.md',
    claudeCodeUrl: 'https://code.claude.com/docs/en/tools-reference',
    claudeDesktopUrl: 'https://code.claude.com/docs/en/desktop',
    claudeCheckpointUrl: 'https://code.claude.com/docs/en/agent-sdk/file-checkpointing',
    publicationDate: '2026-09-02',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
  },
};

const approvedCV04Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title:
      'Codex approvals and sandboxing plus Claude Code permissions, sandboxing, and hooks documentation',
    url: 'https://learn.chatgpt.com/docs/agent-approvals-security',
    codexPolicyUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/core/src/exec_policy.rs',
    codexSandboxUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/core/src/tools/sandboxing.rs',
    claudePermissionsUrl: 'https://code.claude.com/docs/en/permissions',
    claudeSandboxUrl: 'https://code.claude.com/docs/en/sandboxing',
    claudeHooksUrl: 'https://code.claude.com/docs/en/hooks',
    publicationDate: '2026-09-02',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
  },
};

const approvedCV05Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title: 'Codex Model Context Protocol documentation and Claude Code MCP documentation',
    url: 'https://learn.chatgpt.com/docs/extend/mcp?surface=cli',
    codexMcpConfigUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/config/src/mcp_types.rs',
    codexMcpRuntimeUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/codex-mcp/src/server.rs',
    claudeMcpUrl: 'https://code.claude.com/docs/en/mcp',
    publicationDate: '2026-09-19',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
  },
};

const approvedCV06Metadata = {
  source: {
    publisher: 'OpenAI and Anthropic',
    title: 'Codex as a platform, pinned Codex turn and diff source, and Claude Code workflows and hooks',
    url: 'https://learn.chatgpt.com/blog/codex-as-a-platform',
    codexTurnUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/core/src/session/turn.rs',
    codexDiffUrl:
      'https://github.com/openai/codex/blob/rust-v0.150.1/codex-rs/core/src/turn_diff_tracker.rs',
    claudeWorkflowUrl: 'https://code.claude.com/docs/en/common-workflows',
    claudeHooksUrl: 'https://code.claude.com/docs/en/hooks',
    publicationDate: '2026-09-20',
    codexReleaseTag: 'rust-v0.150.1',
    codexSourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
    claudeCodeReleaseTag: 'v2.1.259',
    claudeCodeReleaseCommit: 'f173a69',
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

test('accepts only the exact approved Codex CX09 title with immutable source evidence', () => {
  const title =
    'When Codex Says Tests Pass, How Do You Check It Did Not Miss a Critical Path?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX09Metadata), true);
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX09Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Says Tests Pass, Did It Miss a Critical Path?',
      approvedCX09Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX10 title with immutable source evidence', () => {
  const title = 'How Do You Refactor With Codex Without Changing Behavior?';
  assert.equal(hasYoutubeLongformIdentity(title, approvedCX10Metadata), true);
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Can Codex Refactor Code Without Changing Behavior?',
      approvedCX10Metadata
    ),
    true
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'Use Codex to Refactor Safely With Behavior Invariants',
      approvedCX10Metadata
    ),
    true
  );
  assert.equal(hasYoutubeLongformIdentity(title), false);
  assert.equal(
    hasYoutubeLongformIdentity(title, {
      source: { ...approvedCX10Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Can You Refactor With Codex Without Changing Behavior?',
      approvedCX10Metadata
    ),
    false
  );
});

test('accepts only the approved Codex CX11 titles with immutable source evidence', () => {
  const titles = [
    'When Codex Offers Multiple Solutions, How Do You Choose the One With the Least Rework?',
    'Codex Gave You Three Solutions. Which One Minimizes Rework?',
    'Use a Rework Scorecard to Choose Among Codex Solutions',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX11Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX11Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Offers Multiple Solutions, Which One Has the Least Rework?',
      approvedCX11Metadata
    ),
    false
  );
});

test('accepts only the approved Codex CX12 titles with immutable source evidence', () => {
  const titles = [
    'When Codex Gets Stuck, How Do You Find What It Is Waiting For?',
    'Codex Went Quiet. Which State Should You Check First?',
    'How to Diagnose What Codex Is Waiting For Before You Interrupt It',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX12Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX12Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Gets Stuck, What Is It Waiting For?',
      approvedCX12Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX13 title with immutable source evidence', () => {
  const titles = [
    'How Do You Get Codex to Find Real Risks in Code Review?',
    'How Can Codex Prioritize High-Impact Risks in a Code Diff?',
    'Codex Code Review: Trace Impact Before You Trust a Finding',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX13Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX13Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Do You Get Codex to Find Risks in Code Review?',
      approvedCX13Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX14 title with immutable source evidence', () => {
  const titles = [
    'After Codex Builds a Feature, How Do You Make It Search for Counterexamples?',
    'How Can Codex Turn Hidden Assumptions Into Counterexamples?',
    'Codex Edge Cases: Reproduce Failure Before Repair',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX14Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX14Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'After Codex Builds a Feature, How Do You Make It Search for Edge Cases?',
      approvedCX14Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX15 title with immutable source evidence', () => {
  const titles = [
    'After Codex Changes the Code, How Do You Decide It Is Ready to Ship?',
    'The Codex Code Is Done. Is the Release Evidence Ready?',
    'Six Gates Before You Ship a Codex Change',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX15Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX15Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'After Codex Changes the Code, How Do You Know It Is Ready to Ship?',
      approvedCX15Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex CX16 title with immutable source evidence', () => {
  const titles = [
    'When Codex Fixes a UI From a Screenshot, How Do You Avoid Close Enough?',
    'Codex Matched the Screenshot. Does the Interface Actually Work?',
    'Six Checks Before You Accept a Codex Screenshot-Driven UI',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCX16Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCX16Metadata.source, sourceCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'When Codex Fixes a UI From a Screenshot, Is It Close Enough?',
      approvedCX16Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV01 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on Project Context?',
    'The Same Repository Can Give Codex and Claude Code Different Rules',
    'Map Project Context Before Comparing Codex and Claude Code',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV01Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV01Metadata.source, claudeCodeReleaseCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on Project Context?',
      approvedCV01Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV02 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on Task Planning?',
    'Why Codex and Claude Code Exit Task Planning Differently',
    'How Codex and Claude Code Move Plans Into Execution',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV02Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV02Metadata.source, claudeCodeReleaseCommit: 'wrong-commit' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on Task Planning?',
      approvedCV02Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV03 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on File Editing?',
    'Why Codex and Claude Code File Edits Still Need Review',
    'How Codex and Claude Code Use Patch, Write, and Diff',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV03Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV03Metadata.source, claudeCheckpointUrl: 'wrong-url' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on File Editing?',
      approvedCV03Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV04 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on Command Permissions?',
    'Why Codex and Claude Code Command Approval Is Not a Safety Proof',
    'How Codex and Claude Code Set Different Permission Boundaries',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV04Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV04Metadata.source, claudeHooksUrl: 'wrong-url' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on Command Permissions?',
      approvedCV04Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV05 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on MCP Tools?',
    'Why MCP Can Look Connected but Fail in Codex and Claude Code',
    'How Codex and Claude Code Set Different MCP Trust Boundaries',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV05Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV05Metadata.source, claudeMcpUrl: 'wrong-url' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on MCP Tools?',
      approvedCV05Metadata
    ),
    false
  );
});

test('accepts only the exact approved Codex and Claude Code CV06 titles with dual-source evidence', () => {
  const titles = [
    'How Do Codex and Claude Code Differ on Task Acceptance?',
    'How Do Codex and Claude Code Verify Completion Evidence?',
    'What Do Codex and Claude Code Show Before Task Acceptance?',
  ];
  for (const title of titles) {
    assert.equal(hasYoutubeLongformIdentity(title, approvedCV06Metadata), true);
    assert.equal(hasYoutubeLongformIdentity(title), false);
  }
  assert.equal(
    hasYoutubeLongformIdentity(titles[0], {
      source: { ...approvedCV06Metadata.source, claudeHooksUrl: 'wrong-url' },
    }),
    false
  );
  assert.equal(
    hasYoutubeLongformIdentity(
      'How Are Codex and Claude Code Different on Task Acceptance?',
      approvedCV06Metadata
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
