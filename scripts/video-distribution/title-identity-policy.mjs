const approvedDeepSeekHarnessH03 = Object.freeze({
  title:
    'What Is DeepSeek Harness For? It Brings AI Directly Into Your Workspace.',
  publisher: 'DeepSeek AI',
  sourceTitle: 'DeepSeek Harness dsh-v0.1.0-rc.7',
  releaseTag: 'dsh-v0.1.0-rc.7',
  sourceCommit: '99f6f02fecdb7dff40c3fbc9470f5907c29f74ca',
});

const approvedDeepSeekHarnessH07 = Object.freeze({
  title:
    'Worried a New DeepSeek Harness Plugin Will Break Your Setup? Test It in a Separate Profile.',
  publisher: 'DeepSeek AI',
  sourceTitle:
    'DeepSeek Harness dsh-v0.1.1-rc.2 Profile boot and configuration precedence documentation',
  releaseTag: 'dsh-v0.1.1-rc.2',
  sourceCommit: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
});

const approvedDeepSeekHarnessH08 = Object.freeze({
  title:
    'Is It Safe to Connect MCP to DeepSeek Harness? Beginners Should Check What It Will Run.',
  publisher: 'DeepSeek AI',
  sourceTitle:
    'DeepSeek Harness dsh-v0.1.1-rc.2 MCP client, CLI trust boundary, and process sandbox documentation',
  releaseTag: 'dsh-v0.1.1-rc.2',
  sourceCommit: 'b150a551b8d465e31e418e1b2eaf5e79bbb7d28e',
});

const approvedCodexCX01 = Object.freeze({
  title: 'How Do You Keep Codex on the Right Files?',
  publisher: 'OpenAI',
  sourceTitle: 'Codex as a platform: build on the open agent harness',
  releaseTag: 'rust-v0.150.1',
  sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
});

const approvedCodexCX02 = Object.freeze({
  title:
    'How Do You Give Codex One Request and Carry It All the Way to Acceptance?',
  publisher: 'OpenAI',
  sourceTitle: 'Codex as a platform: build on the open agent harness',
  releaseTag: 'rust-v0.150.1',
  sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
});

const approvedCodexCX03 = Object.freeze({
  title:
    'When Codex Runs Commands, How Do You Prevent Accidental Deletes and Secret Leaks?',
  publisher: 'OpenAI',
  sourceTitle: 'Codex as a platform: build on the open agent harness',
  sourceUrl: 'https://learn.chatgpt.com/blog/codex-as-a-platform',
  publicationDate: '2026-08-19',
  releaseTag: 'rust-v0.150.1',
  sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
});

const approvedCodexCX04 = Object.freeze({
  title: 'How Do You Resume a Long Codex Task After an Interruption?',
  publisher: 'OpenAI',
  sourceTitle: 'Codex as a platform: build on the open agent harness',
  sourceUrl: 'https://learn.chatgpt.com/blog/codex-as-a-platform',
  publicationDate: '2026-08-19',
  releaseTag: 'rust-v0.150.1',
  sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
});

const approvedCodexCX05 = Object.freeze({
  title: 'How Do You Stop Teaching Codex the Same Repetitive Task Every Time?',
  publisher: 'OpenAI',
  sourceTitle: 'Codex as a platform: build on the open agent harness',
  sourceUrl: 'https://developers.openai.com/blog/codex-as-a-platform',
  publicationDate: '2026-08-19',
  releaseTag: 'rust-v0.150.1',
  sourceCommit: '90854393966b21e9ebfd21b122334eb09a20c93d',
});

function isApprovedDeepSeekHarnessH03(text, metadata) {
  return (
    String(text || '') === approvedDeepSeekHarnessH03.title &&
    metadata?.source?.publisher === approvedDeepSeekHarnessH03.publisher &&
    metadata?.source?.title === approvedDeepSeekHarnessH03.sourceTitle &&
    metadata?.source?.releaseTag === approvedDeepSeekHarnessH03.releaseTag &&
    metadata?.source?.sourceCommit === approvedDeepSeekHarnessH03.sourceCommit
  );
}

function isApprovedDeepSeekHarnessH07(text, metadata) {
  return (
    String(text || '') === approvedDeepSeekHarnessH07.title &&
    metadata?.source?.publisher === approvedDeepSeekHarnessH07.publisher &&
    metadata?.source?.title === approvedDeepSeekHarnessH07.sourceTitle &&
    metadata?.source?.releaseTag === approvedDeepSeekHarnessH07.releaseTag &&
    metadata?.source?.sourceCommit === approvedDeepSeekHarnessH07.sourceCommit
  );
}

function isApprovedDeepSeekHarnessH08(text, metadata) {
  return (
    String(text || '') === approvedDeepSeekHarnessH08.title &&
    metadata?.source?.publisher === approvedDeepSeekHarnessH08.publisher &&
    metadata?.source?.title === approvedDeepSeekHarnessH08.sourceTitle &&
    metadata?.source?.releaseTag === approvedDeepSeekHarnessH08.releaseTag &&
    metadata?.source?.sourceCommit === approvedDeepSeekHarnessH08.sourceCommit
  );
}

function isApprovedCodexCX01(text, metadata) {
  return (
    String(text || '') === approvedCodexCX01.title &&
    metadata?.source?.publisher === approvedCodexCX01.publisher &&
    metadata?.source?.title === approvedCodexCX01.sourceTitle &&
    metadata?.source?.releaseTag === approvedCodexCX01.releaseTag &&
    metadata?.source?.sourceCommit === approvedCodexCX01.sourceCommit
  );
}

function isApprovedCodexCX02(text, metadata) {
  return (
    String(text || '') === approvedCodexCX02.title &&
    metadata?.source?.publisher === approvedCodexCX02.publisher &&
    metadata?.source?.title === approvedCodexCX02.sourceTitle &&
    metadata?.source?.releaseTag === approvedCodexCX02.releaseTag &&
    metadata?.source?.sourceCommit === approvedCodexCX02.sourceCommit
  );
}

function isApprovedCodexCX03(text, metadata) {
  return (
    String(text || '') === approvedCodexCX03.title &&
    metadata?.source?.publisher === approvedCodexCX03.publisher &&
    metadata?.source?.title === approvedCodexCX03.sourceTitle &&
    metadata?.source?.url === approvedCodexCX03.sourceUrl &&
    metadata?.source?.publicationDate === approvedCodexCX03.publicationDate &&
    metadata?.source?.releaseTag === approvedCodexCX03.releaseTag &&
    metadata?.source?.sourceCommit === approvedCodexCX03.sourceCommit
  );
}

function isApprovedCodexCX04(text, metadata) {
  return (
    String(text || '') === approvedCodexCX04.title &&
    metadata?.source?.publisher === approvedCodexCX04.publisher &&
    metadata?.source?.title === approvedCodexCX04.sourceTitle &&
    metadata?.source?.url === approvedCodexCX04.sourceUrl &&
    metadata?.source?.publicationDate === approvedCodexCX04.publicationDate &&
    metadata?.source?.releaseTag === approvedCodexCX04.releaseTag &&
    metadata?.source?.sourceCommit === approvedCodexCX04.sourceCommit
  );
}

function isApprovedCodexCX05(text, metadata) {
  return (
    String(text || '') === approvedCodexCX05.title &&
    metadata?.source?.publisher === approvedCodexCX05.publisher &&
    metadata?.source?.title === approvedCodexCX05.sourceTitle &&
    metadata?.source?.url === approvedCodexCX05.sourceUrl &&
    metadata?.source?.publicationDate === approvedCodexCX05.publicationDate &&
    metadata?.source?.releaseTag === approvedCodexCX05.releaseTag &&
    metadata?.source?.sourceCommit === approvedCodexCX05.sourceCommit
  );
}

export function hasYoutubeLongformIdentity(text, metadata = {}) {
  return (
    /\bAI[\s-]+Agents?\b/i.test(String(text || '')) ||
    isApprovedDeepSeekHarnessH03(text, metadata) ||
    isApprovedDeepSeekHarnessH07(text, metadata) ||
    isApprovedDeepSeekHarnessH08(text, metadata) ||
    isApprovedCodexCX01(text, metadata) ||
    isApprovedCodexCX02(text, metadata) ||
    isApprovedCodexCX03(text, metadata) ||
    isApprovedCodexCX04(text, metadata) ||
    isApprovedCodexCX05(text, metadata)
  );
}
