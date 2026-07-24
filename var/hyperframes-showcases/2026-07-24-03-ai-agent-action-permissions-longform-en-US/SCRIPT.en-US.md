# Which AI Agent Actions Need Human Approval?

### 1 | Introduction

If an AI Agent reads a malicious page, should it still act for you?

OpenAI warns that prompt injection now looks less like an obvious command and more like social engineering designed to mislead an agent in context.

Picture a dinner-planning agent that almost sends your home address to a fake verification site while trying to reserve a table for your family.

By the end, you will have a three-tier AI agent action permission matrix: what can run automatically, what needs informed confirmation, and what must be blocked.

The key question is not only, “Can the agent spot the bad sentence?” It is, “What could this sentence make the agent do if the agent is fooled?”

This video is packed with practical, high-value insights to help you get better at using AI. It's a longer one, so follow Tiny Agent and save it so you don't lose it.

### 2 | How the risk path forms

Start with a familiar task. You ask an AI agent to find a restaurant for a family birthday, compare menus, and help reserve a table for Saturday night.

To help, the agent reads restaurant pages, reviews, maps, confirmation policies, and perhaps an email from a relative. Most of that information is useful, but none of it is automatically trustworthy.

A prompt injection hides an instruction inside that outside material. Instead of merely describing a restaurant, a page may tell the agent to ignore the user and follow a new procedure.

OpenAI describes a 2025 email attack reported by external researchers. In one specific test prompt, the realistic social-engineering content succeeded half of the time. That is not a universal failure rate; it is evidence that a plausible story can sometimes defeat a simple filter.

This is why a detector that searches for suspicious phrases is not enough. A fully developed attack may look like a normal policy, a request from a colleague, or a helpful verification step. Deciding whether it is a lie requires context the detector may not have.

OpenAI uses a useful security model called source and sink. In plain language, the source is where an attacker can influence the agent. The sink is a capability that becomes dangerous in the wrong context.

For our dinner agent, restaurant pages and email are sources. Sending a message, following a link, sharing contact details, paying a deposit, or confirming a reservation are sinks because they change something outside the agent's private workspace.

Now the fake restaurant page claims that a public “compliance” endpoint needs your home address and profile before showing available tables. The wording sounds official, and it promises to help complete the task.

The damage does not come from the sentence simply existing on the page. The damage becomes possible when that sentence can reach private data and a send tool without an independent control in between.

Human organizations already use deterministic limits for the same reason. A customer-service employee may issue small refunds, while larger refunds require another approval. Phishing filters help, but spending limits still matter when a message gets through.

So the first lesson is simple: do not design safety around perfect detection. Constrain the path from untrusted information to consequential capability. But once that path is visible, how do we decide which actions can proceed?

### 3 | Classify the consequence

Return to the birthday dinner. The agent can read public menus, compare travel time, draft a shortlist, send your address, place a reservation, pay a deposit, or disclose a private profile. These actions do not deserve one shared permission.

Before granting a tool, ask five questions. Does the action create an external side effect? Does it touch sensitive data? Is the destination new or unverified? Can the result be reversed? Does it clearly match the user's stated goal?

The first tier is Automatic. Let the agent read public information, summarize it, calculate travel time, and draft options locally when the work is low consequence, reversible, inside the requested scope, and does not transmit sensitive information.

Automatic does not mean unlimited. The agent should still use narrow read scopes, bounded search, local drafts, and temporary files. The point is to remove needless friction without giving outside text a direct route to high-impact tools.

The second tier is Confirm. Require informed approval when the action changes an external system, spends money, sends sensitive or identifying information, reaches a new recipient, or creates a commitment that the user will have to honor.

For the dinner, confirmation may be appropriate before sending the disclosed phone number to the chosen restaurant, booking a specific time, accepting a cancellation policy, or paying a deposit. The purpose is legitimate, but the effect is real.

OpenAI describes a related safeguard for sensitive transmission: show the user the information that would be sent and ask for confirmation, or block the transfer and make the agent find another path. The user should see the actual payload and destination.

A generic “Allow?” button is weak consent. Good confirmation states what will leave the system, where it will go, why the action is needed, what will change, and what safer alternative exists. The user is approving a concrete consequence, not a vague category.

The third tier is Block or Escalate. Stop when an action conflicts with the user's goal, lacks a legitimate reason, exposes secrets to an unrelated destination, cannot be made sufficiently reversible, or carries harm too large for an ordinary confirmation.

In our story, searching and drafting are automatic. Booking the selected table and sharing the minimum contact detail require confirmation. Sending a home address or hidden profile to an unrelated public endpoint is blocked. The categories are clear; now they must be enforced by the system.

### 4 | Enforce the permission matrix

Build the matrix by capability, not by prompt wording. List every action the agent can take, the data it can touch, the destination it can reach, the external effect it creates, and the response tier that controls it.

Separate reading from sending. A tool that can inspect a calendar should not automatically be able to invite guests. A tool that can draft an email should not automatically transmit it. A browser that can read a page should not automatically upload private files.

Protect data before the model makes a decision. Hide secrets the task does not need, expose only minimum fields, allowlist known destinations, and run untrusted applications in a sandbox that can detect unexpected communication.

Limit consequences with deterministic controls. Use spending caps, refund limits, narrow OAuth scopes, one-time credentials, dry runs, reversible staging, rate limits, and a second approval for actions whose impact crosses a defined threshold.

Design confirmation as a decision surface. Show the exact restaurant, time, deposit, cancellation rule, contact details, and destination. Put risky changes in plain language. Let the user edit the payload, choose a safer scope, or cancel without losing the rest of the work.

Define block conditions before the agent runs. Secret exfiltration, a new public endpoint with no task need, destructive action without recovery, and high-impact behavior that contradicts the user's instruction should stop immediately with a clear explanation.

Log the path, not only the final result. Record which external content influenced the decision, which tool was requested, what data was selected, which control allowed or denied it, and what the user confirmed. This makes incidents explainable and policies improvable.

Test the controls with three kinds of material: normal content, ambiguous content, and deliberately malicious content. Check both the final environment state and the process trace. A safe-looking answer is not enough if the agent attempted a forbidden transmission.

Use the human-agent analogy from OpenAI. Ask what a careful customer-service employee could do alone, what a supervisor would review, and what no employee should do at all. Then translate those boundaries into tools, scopes, limits, and confirmation rules.

Your reusable matrix has five columns: action or tool, data touched, destination, external effect and reversibility, and response tier. Fill it before connecting a new tool, then update it whenever the tool gains a new capability.

Now solve the birthday dinner again. The agent automatically researches and drafts. It asks before booking and before sending the minimum contact detail to the chosen restaurant. It blocks the fake verification endpoint, explains why, and continues with a safer route.

### 5 | Summary

The malicious sentence was only the source. Risk appeared when it could reach private data and a consequential sink. The safest system assumes some manipulation will get through and limits what can happen next.

Use Automatic for low-consequence, reversible work inside the user's intent with no sensitive external transmission. Keep the scopes narrow even when no confirmation is needed.

Use Confirm for legitimate external changes, payments, commitments, new recipients, or sensitive transfers. Show the exact payload, destination, purpose, consequence, and safer alternative.

Use Block for actions that conflict with the goal, lack a legitimate need, expose secrets to an unrelated destination, or create irreversible harm beyond the permitted boundary. Build these rules into the tools, not into hope.

Follow Tiny Agent. Tiny Agent helps you get better at using AI.
