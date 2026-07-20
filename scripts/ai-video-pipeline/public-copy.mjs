export function sanitizeTinyAgentPublicDescription(value, max = 360) {
  return String(value || '')
    .replace(/\[([^\]]+)]\(https?:\/\/[^)]+\)/gi, '$1')
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/[ \t]+([,.;:!?])/g, '$1')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}
