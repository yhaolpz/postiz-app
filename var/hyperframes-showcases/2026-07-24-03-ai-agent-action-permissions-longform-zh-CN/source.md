# Source

- Publisher: OpenAI
- Title: Designing AI agents to resist prompt injection
- Published: 2026-03-11
- Canonical URL: https://openai.com/index/designing-agents-to-resist-prompt-injection/
- Verified: 2026-07-24 03:04 Asia/Shanghai

## Confirmed source claims

- Prompt injection places instructions in external content to make an agent do something the user did not request.
- Effective real-world attacks increasingly resemble social engineering, so defenses cannot depend only on classifying malicious strings.
- A robust design constrains the impact of manipulation even when some attacks succeed.
- OpenAI frames the risk as a source-and-sink problem: untrusted external content is the source; transmitting information, following a link, or using a consequential tool is the sink.
- Potentially dangerous actions and transmissions of sensitive information should not happen silently or without safeguards.
- OpenAI describes controls that show the user what would be transmitted and ask for confirmation, or block the action and direct the agent to find another path.
- Deterministic limits, such as refund caps and phishing flags, reduce downside even when an individual human or AI agent is misled.
- The article recommends asking what controls a human agent should have in the same situation and implementing comparable controls for an AI agent.

## Editorial synthesis

The three-tier action permission matrix is a Tiny Agent teaching tool derived from the article's source-sink model, confirmation/block behavior, and deterministic capability limits. It is not presented as an OpenAI-named framework.

## Familiar story used in the video

A person asks an AI agent whether they should bring an umbrella when going out. While reading public forecasts, maps, and an allowed calendar window, the agent encounters a weather plugin that claims it must upload the precise home address and daily schedule to a public “verification” endpoint. The story distinguishes harmless forecast research and local route comparison from consequential precise-location sharing, calendar changes, ride booking, payment, and sensitive-data transmission.
