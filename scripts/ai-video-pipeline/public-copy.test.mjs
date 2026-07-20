import test from 'node:test';
import assert from 'node:assert/strict';

import { sanitizeTinyAgentPublicDescription } from './public-copy.mjs';

test('removes the retired IndieSeek tracking URL', () => {
  assert.equal(
    sanitizeTinyAgentPublicDescription(
      'A workflow follows a fixed path. https://indieseek.co/?utm_source=youtube&utm_campaign=tiny_agent'
    ),
    'A workflow follows a fixed path.'
  );
});

test('keeps plain source attribution while removing source links', () => {
  assert.equal(
    sanitizeTinyAgentPublicDescription(
      'The model controls an agent path. Source: Anthropic, Building effective agents. https://www.anthropic.com/engineering/building-effective-agents'
    ),
    'The model controls an agent path. Source: Anthropic, Building effective agents.'
  );
});

test('converts Markdown links to plain readable text', () => {
  assert.equal(
    sanitizeTinyAgentPublicDescription(
      'Source: [Anthropic](https://www.anthropic.com/engineering/building-effective-agents).'
    ),
    'Source: Anthropic.'
  );
});
