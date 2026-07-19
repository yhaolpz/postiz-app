const DEFAULT_MAX_WORDS = 9;
const DEFAULT_MAX_CHARS = 54;
const DEFAULT_LINE_CHARS = 28;
const MIN_DISPLAY_SECONDS = 0.55;

function parseTimestamp(value) {
  const match = String(value)
    .trim()
    .match(/^(?:(\d+):)?(\d{2}):(\d{2})[,.](\d{3})$/);
  if (!match) {
    throw new Error(`Invalid VTT timestamp: ${value}`);
  }

  return (
    Number(match[1] || 0) * 3600 +
    Number(match[2]) * 60 +
    Number(match[3]) +
    Number(match[4]) / 1000
  );
}

function stripVttMarkup(value) {
  return String(value)
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseVttCues(vttText) {
  const cues = [];
  const blocks = String(vttText)
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/);

  for (const block of blocks) {
    const lines = block
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes('-->'));
    if (timingIndex === -1) continue;

    const timing = lines[timingIndex].match(
      /((?:\d+:)?\d{2}:\d{2}[,.]\d{3})\s+-->\s+((?:\d+:)?\d{2}:\d{2}[,.]\d{3})/
    );
    if (!timing) continue;

    const text = stripVttMarkup(lines.slice(timingIndex + 1).join(' '));
    if (!text) continue;

    cues.push({
      startSeconds: parseTimestamp(timing[1]),
      endSeconds: parseTimestamp(timing[2]),
      text,
    });
  }

  return cues.sort((left, right) => left.startSeconds - right.startSeconds);
}

function splitCaptionText(text, maxWords, maxChars) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const chunks = [];
  let current = [];

  for (const word of words) {
    const candidate = [...current, word].join(' ');
    if (
      current.length &&
      (candidate.length > maxChars || current.length >= maxWords)
    ) {
      chunks.push(current.join(' '));
      current = [word];
    } else {
      current.push(word);
    }
  }

  if (current.length) chunks.push(current.join(' '));

  for (let index = chunks.length - 1; index > 0; index -= 1) {
    const currentWords = chunks[index].split(/\s+/);
    const previousWords = chunks[index - 1].split(/\s+/);
    while (currentWords.length < 3 && previousWords.length > 3) {
      currentWords.unshift(previousWords.pop());
    }
    chunks[index - 1] = previousWords.join(' ');
    chunks[index] = currentWords.join(' ');
  }

  return chunks;
}

function wrapCaptionText(text, maxChars = DEFAULT_LINE_CHARS) {
  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const singleLine = words.join(' ');
  if (singleLine.length <= maxChars) return singleLine;

  const candidates = [];
  for (let index = 1; index < words.length; index += 1) {
    const firstLine = words.slice(0, index).join(' ');
    const secondLine = words.slice(index).join(' ');
    if (firstLine.length <= maxChars && secondLine.length <= maxChars) {
      candidates.push({
        firstLine,
        secondLine,
        imbalance: Math.abs(firstLine.length - secondLine.length),
      });
    }
  }

  candidates.sort((left, right) => left.imbalance - right.imbalance);
  if (candidates.length) {
    return `${candidates[0].firstLine}\n${candidates[0].secondLine}`;
  }

  return singleLine;
}

function splitUnwrappableCaption(text, lineChars) {
  const wrapped = wrapCaptionText(text, lineChars);
  if (
    wrapped.split('\n').length <= 2 &&
    wrapped.split('\n').every((line) => line.length <= lineChars)
  ) {
    return [text];
  }

  const words = String(text).trim().split(/\s+/).filter(Boolean);
  const candidates = [];
  for (let index = 1; index < words.length; index += 1) {
    const firstChunk = words.slice(0, index).join(' ');
    const secondChunk = words.slice(index).join(' ');
    candidates.push({
      firstChunk,
      secondChunk,
      imbalance: Math.abs(firstChunk.length - secondChunk.length),
    });
  }
  candidates.sort((left, right) => left.imbalance - right.imbalance);
  if (!candidates.length) return [text];

  return [candidates[0].firstChunk, candidates[0].secondChunk];
}

function roundSeconds(value) {
  return Number(value.toFixed(3));
}

export function buildRealtimeCaptionTrack(
  sourceCues,
  {
    maxWords = DEFAULT_MAX_WORDS,
    maxChars = DEFAULT_MAX_CHARS,
    lineChars = DEFAULT_LINE_CHARS,
  } = {}
) {
  const normalizedCues = sourceCues
    .filter(
      (cue) =>
        Number.isFinite(cue.startSeconds) &&
        Number.isFinite(cue.endSeconds) &&
        cue.endSeconds > cue.startSeconds &&
        String(cue.text || '').trim()
    )
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .map((cue, index, cues) => ({
      ...cue,
      endSeconds:
        index < cues.length - 1
          ? Math.min(cue.endSeconds, cues[index + 1].startSeconds)
          : cue.endSeconds,
    }))
    .filter((cue) => cue.endSeconds > cue.startSeconds);

  const track = [];
  for (const cue of normalizedCues) {
    const chunks = splitCaptionText(cue.text, maxWords, maxChars).flatMap(
      (chunk) => splitUnwrappableCaption(chunk, lineChars)
    );
    const weights = chunks.map((chunk) =>
      Math.max(1, chunk.replace(/\s/g, '').length)
    );
    const totalWeight = weights.reduce((total, weight) => total + weight, 0);
    const duration = cue.endSeconds - cue.startSeconds;
    let cursor = cue.startSeconds;

    chunks.forEach((chunk, index) => {
      const endSeconds =
        index === chunks.length - 1
          ? cue.endSeconds
          : cursor + duration * (weights[index] / totalWeight);
      track.push({
        startSeconds: roundSeconds(cursor),
        endSeconds: roundSeconds(endSeconds),
        text: wrapCaptionText(chunk, lineChars),
        spokenText: chunk,
      });
      cursor = endSeconds;
    });
  }

  return track;
}

export function assertRealtimeCaptionTrack(track, audioDuration) {
  if (!Array.isArray(track) || track.length === 0) {
    throw new Error(
      'Realtime caption QA failed: the VTT produced no display cues.'
    );
  }

  for (let index = 0; index < track.length; index += 1) {
    const cue = track[index];
    if (cue.endSeconds <= cue.startSeconds) {
      throw new Error(
        `Realtime caption QA failed: cue ${index + 1} has no duration.`
      );
    }
    if (cue.endSeconds - cue.startSeconds < MIN_DISPLAY_SECONDS) {
      throw new Error(
        `Realtime caption QA failed: cue ${
          index + 1
        } is visible for less than ${MIN_DISPLAY_SECONDS}s.`
      );
    }
    if (index > 0 && cue.startSeconds < track[index - 1].endSeconds - 0.002) {
      throw new Error(
        `Realtime caption QA failed: cue ${
          index + 1
        } overlaps the previous cue.`
      );
    }
    const lines = String(cue.text).split('\n');
    if (
      lines.length > 2 ||
      lines.some((line) => line.length > DEFAULT_LINE_CHARS)
    ) {
      throw new Error(
        `Realtime caption QA failed: cue ${
          index + 1
        } exceeds the two-line safe box.`
      );
    }
  }

  const lastCue = track.at(-1);
  if (
    Number.isFinite(audioDuration) &&
    lastCue.endSeconds > audioDuration + 0.35
  ) {
    throw new Error(
      `Realtime caption QA failed: captions end at ${lastCue.endSeconds}s after audio ends at ${audioDuration}s.`
    );
  }
  if (
    Number.isFinite(audioDuration) &&
    audioDuration - lastCue.endSeconds > 0.75
  ) {
    throw new Error(
      `Realtime caption QA failed: audio continues to ${audioDuration}s after captions end at ${lastCue.endSeconds}s.`
    );
  }
}
