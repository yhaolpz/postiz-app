const fixedYoutubeShortPolicy = Object.freeze({
  visibility: 'public',
  selfDeclaredMadeForKids: 'no',
});

export function resolveYoutubeShortPolicy(metadata = {}) {
  const requested = metadata.youtube;
  if (requested != null) {
    for (const [key, expected] of Object.entries(fixedYoutubeShortPolicy)) {
      if (requested[key] != null && requested[key] !== expected) {
        throw new Error(`YouTube metadata ${key} conflicts with the fixed Short policy.`);
      }
    }
    if (requested.playlistId != null) {
      throw new Error('YouTube Shorts do not inherit the Tiny Agent longform playlist policy.');
    }
  }
  return { ...fixedYoutubeShortPolicy };
}

export function buildYoutubeShortTags(metadata = {}) {
  const candidates = Array.isArray(metadata.tags) ? metadata.tags : [];
  const seen = new Set();
  const tags = candidates
    .map((item) => typeof item === 'string' ? item : item?.label || item?.value || '')
    .map((item) => item.trim().replace(/^#+/, ''))
    .filter((item) => {
      if (!item) return false;
      const key = item.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  for (const required of ['Shorts', 'TinyAgent']) {
    if (!seen.has(required.toLowerCase())) {
      tags.push(required);
      seen.add(required.toLowerCase());
    }
  }
  return tags.slice(0, 10);
}

export { fixedYoutubeShortPolicy };
