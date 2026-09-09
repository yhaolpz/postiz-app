const fixedYoutubeShortPolicy = Object.freeze({
  visibility: 'public',
  selfDeclaredMadeForKids: 'no',
});

const legacyTinyAgentShortDescription =
  'Building something? Take a 60-sec game break. Score to rank your product or profile on https://tapto.top and get more exposure📈 —free, no signup.';
const tinyAgentShortDescriptionFromRunKey = '2026-08-28-04';
const fixedTinyAgentShortDescription =
  'Building something? Turn your product page into a show people want to watch with https://promofast.show/ —hosted, embeddable, and ready to export.';
const promoFastShortDescriptionFromRunKey = '2026-09-09-04';

export function resolveYoutubeShortPolicy(metadata = {}) {
  const requested = metadata.youtube;
  if (requested != null) {
    for (const [key, expected] of Object.entries(fixedYoutubeShortPolicy)) {
      if (requested[key] != null && requested[key] !== expected) {
        throw new Error(
          `YouTube metadata ${key} conflicts with the fixed Short policy.`
        );
      }
    }
    if (requested.playlistId != null) {
      throw new Error(
        'YouTube Shorts do not inherit the Tiny Agent longform playlist policy.'
      );
    }
  }
  return { ...fixedYoutubeShortPolicy };
}

export function buildYoutubeShortTags(metadata = {}) {
  const candidates = Array.isArray(metadata.tags) ? metadata.tags : [];
  const seen = new Set();
  const tags = candidates
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
    });
  for (const required of ['Shorts', 'TinyAgent']) {
    if (!seen.has(required.toLowerCase())) {
      tags.push(required);
      seen.add(required.toLowerCase());
    }
  }
  return tags.slice(0, 10);
}

export function buildYoutubeShortDescription(metadata = {}, runKey = '') {
  const description = String(metadata.description ?? '').trim();
  const expectedDescription =
    String(runKey) >= promoFastShortDescriptionFromRunKey
      ? fixedTinyAgentShortDescription
      : legacyTinyAgentShortDescription;
  if (String(runKey) >= tinyAgentShortDescriptionFromRunKey) {
    if (description !== expectedDescription) {
      throw new Error(
        'YouTube Short description does not match the fixed promotion for this run key.'
      );
    }
  } else if (description) {
    throw new Error('Historical YouTube Short descriptions must remain empty.');
  }
  return description;
}

export {
  fixedTinyAgentShortDescription,
  fixedYoutubeShortPolicy,
  legacyTinyAgentShortDescription,
  promoFastShortDescriptionFromRunKey,
  tinyAgentShortDescriptionFromRunKey,
};
