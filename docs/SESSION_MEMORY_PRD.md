# Product Requirements Document: Current Chat Session Memory

## Problem Statement

The user wants the chatbot to feel conversationally aware within the current chat session. Today, the chatbot can use local context files and receives the conversation history, but its behavior is framed around the local context as the only trusted knowledge source. That makes the assistant less autonomous when the user gives it temporary session-specific instructions or facts that are not already defined in the context files.

The user wants the assistant to remember temporary information from the active conversation, such as "you are a hamburger," and answer later questions like "what are you?" using that session context. At the same time, the local context files must remain authoritative. If the context files define a conflicting fact, such as "I am a salad," then the assistant must answer from the context files instead of adopting the user's conflicting session statement.

## Solution

Add current-chat session memory behavior to the chatbot by treating the active conversation history as temporary memory for facts, preferences, and role assignments that are not already defined by local context files.

For the MVP, session memory resets when the page is refreshed or the conversation is reset. No database, browser storage, or server-side session store should be added. The existing chat loop should continue sending the current conversation to the AI provider, and the provider instructions should clearly define the precedence order:

1. Local context files are authoritative.
2. Non-conflicting current-session memory can be used.
3. If neither local context nor current-session memory answers the question, the assistant should say so clearly.

## User Stories

1. As a chatbot user, I want the assistant to remember facts I provide during the active chat, so that follow-up questions can use the current conversation.
2. As a chatbot user, I want the assistant to remember temporary role assignments during the active chat, so that playful or task-specific interactions work naturally.
3. As a chatbot user, I want to tell the assistant "you are a hamburger" and later ask "what are you?", so that it can answer "I am a hamburger" when no local context conflicts.
4. As a chatbot user, I want local context files to override session memory, so that durable context remains the source of truth.
5. As a chatbot user, I want the assistant to ignore a session statement that conflicts with local context, so that a temporary chat message cannot accidentally override configured facts.
6. As a chatbot user, I want the assistant to keep using local context when it is relevant, so that the new memory behavior does not weaken the core local-first behavior.
7. As a chatbot user, I want the assistant to use session memory only for the current chat, so that temporary statements do not leak into future conversations.
8. As a chatbot user, I want session memory to reset when I refresh the page, so that the MVP remains simple and predictable.
9. As a chatbot user, I want session memory to reset when I reset the conversation, so that I can intentionally start fresh.
10. As a chatbot user, I want the assistant to say when neither local context nor session memory contains an answer, so that uncertainty remains transparent.
11. As a chatbot user, I want the assistant to preserve its configured personality while using session memory, so that remembering facts does not flatten its style.
12. As a chatbot user, I want web search behavior to remain explicit and separate from session memory, so that temporary memory does not imply external lookup.
13. As a developer, I want session memory to avoid persistence for the MVP, so that the feature does not introduce database or storage complexity.
14. As a developer, I want provider behavior to be consistent across supported AI providers, so that OpenAI and Gemini follow the same memory rules.
15. As a developer, I want the memory precedence rule to be covered by tests, so that future prompt changes do not accidentally let session memory override local context.
16. As a developer, I want the feature to reuse the existing chat request contract where possible, so that the client and server API remain stable.
17. As a developer, I want the feature to be implemented as a provider instruction contract rather than a custom fact extractor for the MVP, so that the first version stays small and aligned with current architecture.
18. As a future product owner, I want this MVP to leave room for durable chat history later, so that persistence can be added intentionally when needed.

## Implementation Decisions

- Current chat session memory is derived from the active conversation history.
- The MVP does not persist session memory in a database.
- The MVP does not persist session memory in browser storage.
- The MVP does not create a server-side session store.
- Refreshing the page resets session memory because the active conversation is initialized fresh.
- Resetting the conversation resets session memory because the prior messages are removed from the active chat.
- Local context files are the highest-priority knowledge source.
- Session memory can be used only when it does not conflict with local context files.
- Provider instructions should explicitly describe the precedence order between local context, current-session memory, and absence of knowledge.
- The supported AI providers should receive equivalent session-memory instructions.
- The existing chat request shape should remain unchanged for the MVP.
- The existing client behavior of sending the visible conversation history should be reused.
- No context-file writeback should happen as part of this feature.
- No automatic extraction of durable facts should happen as part of this feature.
- No conflict-resolution UI should be added for the MVP.
- No upload, edit, or management surface for local context files should be added by this feature.
- A small shared provider-instruction helper is acceptable if it reduces duplicate prompt text across providers.
- Future durable memory should be designed separately from this MVP and should explicitly define storage, retention, editing, deletion, and conflict handling.

## Testing Decisions

- Tests should verify external provider request behavior, not private prompt-construction implementation details.
- Provider adapter tests should assert that session-memory instructions are sent to each supported provider.
- Provider adapter tests should assert that local context is described as authoritative over current-session memory.
- Provider adapter tests should assert that conversation history is still included in provider requests.
- Existing context-loading tests remain the prior art for verifying local context behavior.
- Existing provider tests remain the prior art for mocking AI provider HTTP calls and inspecting outbound request bodies.
- No end-to-end browser test is required for the MVP because the client already sends the full current conversation and no UI behavior changes are planned.
- Manual verification should include a non-conflicting memory example, such as "you are a hamburger" followed by "what are you?"
- Manual verification should include a conflicting memory example where a local context file defines the answer and the user attempts to override it in chat.
- Future durable memory work should add tests around persistence, reset behavior, retention, and user-visible management.

## Out of Scope

- Persistent chat history.
- Durable assistant memory across refreshes.
- Durable assistant memory across server restarts.
- Database schema changes.
- Browser local storage for chat memory.
- Server-side session IDs or session stores.
- Automatic writing to local context files.
- Automatic extraction of long-term facts from the conversation.
- A UI for viewing, editing, approving, or deleting remembered facts.
- Conflict-resolution prompts or confirmation dialogs.
- Multi-user memory isolation.
- Authentication or authorization changes.
- Vector search, semantic memory, or indexing.
- Web search changes.
- Voice, speech recognition, or text-to-speech changes.

## Further Notes

- The feature is intentionally an MVP behavior contract, not a durable memory system.
- The existing chat architecture already sends the active conversation history, so the main gap is the provider instruction contract.
- This PRD preserves the local-first promise: context files remain the source of truth.
- Later durable memory should be treated as a separate feature because it raises product questions around retention, privacy, editing, deletion, and conflict precedence.
