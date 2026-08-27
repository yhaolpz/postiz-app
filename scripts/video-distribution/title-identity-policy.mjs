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

export function hasYoutubeLongformIdentity(text, metadata = {}) {
  return (
    /\bAI[\s-]+Agents?\b/i.test(String(text || '')) ||
    isApprovedDeepSeekHarnessH03(text, metadata) ||
    isApprovedDeepSeekHarnessH07(text, metadata) ||
    isApprovedDeepSeekHarnessH08(text, metadata)
  );
}
