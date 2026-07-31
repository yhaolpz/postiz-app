const fixedYoutubeLongformPolicy = Object.freeze({
  visibility: 'public',
  selfDeclaredMadeForKids: 'no',
  playlistId: 'PLJffvaWRvGC8',
  playlistTitle: 'AI Agents: From Chat to Done',
  playlistPrivacyStatus: 'public',
});

export function resolveYoutubeLongformPolicy(metadata = {}) {
  const requested = metadata.youtube;
  if (requested != null) {
    for (const [key, expected] of Object.entries(fixedYoutubeLongformPolicy)) {
      if (requested[key] != null && requested[key] !== expected) {
        throw new Error(
          `YouTube metadata ${key} conflicts with the fixed distribution policy.`
        );
      }
    }
  }
  return { ...fixedYoutubeLongformPolicy };
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildYoutubeDescription(metadata = {}) {
  let description = String(metadata.description || '').trim();
  const publisher = String(metadata.source?.publisher || '').trim();
  const sourceTitle = String(metadata.source?.title || '').trim();
  if (publisher) {
    const publisherPattern = escapeRegExp(publisher);
    description = description
      .replace(
        new RegExp(
          `Drawing on\\s+${publisherPattern}(?:['’]s)?[^.]*?,\\s*this episode`,
          'gi'
        ),
        'This episode'
      )
      .replace(
        new RegExp(`official\\s+${publisherPattern}\\s+template`, 'gi'),
        'official source template'
      )
      .replace(
        new RegExp(`${publisherPattern}(?:['’]s)?`, 'gi'),
        'the source'
      );
  }
  if (sourceTitle) {
    description = description.replace(
      new RegExp(escapeRegExp(sourceTitle), 'gi'),
      'the source article'
    );
  }
  return description
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export function buildYoutubeTags(metadata = {}) {
  const candidates = Array.isArray(metadata.tags)
    ? metadata.tags
    : [
        metadata.primaryKeyword,
        ...(metadata.secondaryKeywords || []),
        ...(metadata.hashtags || []),
      ];
  const seen = new Set();
  return candidates
    .map((item) =>
      typeof item === 'string' ? item : item?.label || item?.value || ''
    )
    .map((item) => item.trim().replace(/^#+/, ''))
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 10);
}

export { fixedYoutubeLongformPolicy };
