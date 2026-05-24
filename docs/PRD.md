# Product Requirements Document: Local Context Chatbot MVP

## Problem Statement

The user wants a personal chatbot that can answer using facts they provide in local files, while still feeling configurable and conversational. The chatbot should support a user-defined personality, browser-based voice output, browser-based speech input where available, and optional web search on prompt. The first version should stay local-first and single-user, while leaving a clear path toward uploaded context management, saved personalities, user accounts, persistent storage, higher-quality voice providers, and richer search integrations.

The user also wants the project to be approachable to develop. The selected stack should use TypeScript throughout, with a Vue + Vite frontend and a JavaScript-runtime backend that can grow into relational persistence and authentication later.

## Solution

Build a local-first chatbot MVP with a Vue 3 + Vite + TypeScript frontend and a Fastify + TypeScript backend.

The backend reads supported files from a local `context` folder and injects those facts into the chat provider request. The frontend provides a chat interface, editable personality instructions, a web search toggle, browser voice selection, browser speech synthesis, browser speech recognition when supported, and a visible active AI provider/model indicator. The backend uses Gemini by default, keeps an OpenAI-compatible provider as an explicitly selected option, and fails clearly at startup when the selected provider's API key is missing.

The MVP avoids a database and authentication. Personalities and voice preferences are stored in browser local storage for now. Future persistence should use Prisma with SQLite for local development and PostgreSQL for multi-user production. Future authentication should use cookie/session-based browser auth with HTTP-only cookies.

## User Stories

1. As a local chatbot user, I want the assistant to read facts from a local context folder, so that I can give it knowledge without building an upload system first.
2. As a local chatbot user, I want to add Markdown files to the context folder, so that I can document facts in a familiar format.
3. As a local chatbot user, I want to add plain text files to the context folder, so that simple notes can become chatbot knowledge.
4. As a local chatbot user, I want the assistant to ignore unsupported files, so that unrelated local files do not break chat behavior.
5. As a local chatbot user, I want the app to show which context files are loaded, so that I can verify the assistant has access to the expected facts.
6. As a local chatbot user, I want to send a message in a chat UI, so that I can interact with the assistant naturally.
7. As a local chatbot user, I want to see both my messages and assistant messages in a thread, so that the conversation is easy to follow.
8. As a local chatbot user, I want the assistant to prefer local context when relevant, so that answers reflect the facts I provided.
9. As a local chatbot user, I want the assistant to say when local context does not contain the answer, so that I understand the limits of its knowledge.
10. As a local chatbot user, I want to define the assistant personality in the UI, so that I can tune how it responds.
11. As a local chatbot user, I want personality settings to persist locally, so that I do not need to rewrite them each session.
12. As a local chatbot user, I want to reset the personality to a default, so that I can recover from an over-tuned prompt.
13. As a local chatbot user, I want a default helpful personality, so that the app works immediately on first launch.
14. As a local chatbot user, I want to toggle whether web search is requested, so that I can decide when external information is allowed.
15. As a local chatbot user, I want the app to show whether search is disabled, enabled, or not configured, so that search behavior is transparent.
16. As a local chatbot user, I want the app to clearly report missing AI configuration, so that I do not mistake a development echo response for a real AI answer.
17. As a local chatbot user, I want the app to use Gemini by default while keeping OpenAI available as an explicit option, so that the chatbot can produce real AI responses with the provider I have quota for.
18. As a local chatbot user, I want the settings panel to show which AI provider and model are active, so that I can confirm which service will answer my prompts.
19. As a local chatbot user, I want future search providers to be pluggable, so that I am not locked into one search API.
20. As a local chatbot user, I want assistant replies to include citations when the provider returns them, so that I can inspect web-backed answers.
21. As a local chatbot user, I want to choose a browser voice, so that spoken replies sound closer to my preference.
22. As a local chatbot user, I want the assistant to speak replies aloud, so that I can use the chatbot hands-free or more conversationally.
23. As a local chatbot user, I want to turn spoken replies off, so that I can use the app silently.
24. As a local chatbot user, I want to dictate a message using browser speech recognition when supported, so that I can talk to the assistant.
25. As a local chatbot user, I want speech controls to be disabled when unsupported, so that the UI does not promise unavailable browser features.
26. As a local chatbot user, I want to reset the conversation, so that I can start a fresh thread without changing app settings.
27. As a developer, I want the frontend and backend to be TypeScript, so that contracts are easier to reason about.
28. As a developer, I want a Fastify backend, so that the API remains lightweight while still supporting typed routes and plugin-based growth.
29. As a developer, I want provider interfaces for chat and search, so that vendor-specific behavior does not leak through the UI.
30. As a developer, I want context loading isolated behind a simple module, so that file ingestion can be tested and later replaced with indexing or database-backed retrieval.
31. As a developer, I want the MVP to avoid a database, so that the first version focuses on the chatbot loop rather than persistence setup.
32. As a developer, I want the future database direction documented, so that later work can add persistence without revisiting the same stack debate.
33. As a developer, I want the future auth direction documented, so that account work has a sensible starting architecture.
34. As a developer on Windows PowerShell, I want documented `npm.cmd` commands, so that running the app avoids PowerShell's `npm.ps1` shim.
35. As a developer using VS Code, I want a launch configuration, so that I can start the frontend and backend together.
36. As a developer, I want basic automated tests around context loading and config resolution, so that local context behavior does not regress.

## Implementation Decisions

- Use Vue 3, Vite, and TypeScript for the frontend.
- Use Fastify and TypeScript for the backend.
- Use a monorepo-style workspace with separate client and server packages.
- Use browser `localStorage` for MVP personality, voice, speech, and search preferences.
- Use the browser `SpeechRecognition` or `webkitSpeechRecognition` API for MVP speech input when available.
- Use browser `speechSynthesis` for MVP text-to-speech.
- Use installed browser voices as the MVP voice selection source.
- Read local context from a root-level `context` folder.
- Support Markdown, plain text, and JSON context files for the MVP.
- Enforce size limits while reading context files to avoid accidentally loading oversized local files.
- Keep context ingestion as derive-on-read for MVP because local context is expected to be small and file-based.
- Add a `ChatProvider` abstraction with Gemini and OpenAI-compatible providers.
- Add a `SearchProvider` abstraction even though the MVP search behavior is provider-gated and minimal.
- Use Gemini by default with `AI_PROVIDER=gemini`.
- Use an OpenAI-compatible Responses API provider only when `AI_PROVIDER=openai`.
- Keep web search behind configuration and request metadata so future providers can be added without reshaping the UI.
- Use environment variables for server port, host, client origin, context directory, AI provider, Gemini API key, Gemini model, OpenAI API key, OpenAI model, and search provider.
- Do not add authentication in the MVP.
- Do not add database persistence in the MVP.
- Recommend Prisma for future persistence.
- Recommend SQLite for local future persistence and PostgreSQL for production or multi-user future persistence.
- Prefer relational storage for future durable data because users, personalities, sessions, messages, documents, preferences, and search logs are structured entities.
- Keep MongoDB as a possible future option for document-heavy storage, but not the primary recommendation.
- Recommend cookie/session-based future auth with HTTP-only cookies.
- Avoid browser-stored JWTs as the default future auth plan.
- Add VS Code launch targets for backend, frontend, and a compound app launch.
- Document Windows PowerShell commands using `npm.cmd`.
- Keep UI context upload and management out of MVP.
- Keep API-based transcription and higher-quality TTS out of MVP.
- Keep user accounts and multi-user access out of MVP.

## Testing Decisions

- Tests should focus on external behavior and stable contracts, not implementation details.
- Context-loading tests should verify that supported files are read and unsupported files are ignored.
- Context formatting tests should verify the readable context block used by provider prompts.
- Config tests should verify context directory resolution when the server is launched through workspace scripts.
- Build and typecheck should be part of the verification loop because the app crosses frontend, backend, and shared TypeScript contracts.
- Backend endpoint smoke tests should verify health, context listing, and chat response behavior.
- Frontend verification should confirm that the Vite app serves successfully and can reach the backend API.
- Future tests should cover provider adapter behavior with mocked provider responses.
- Future tests should cover persistence once Prisma and saved personalities or chat history are added.
- Future browser tests should cover the main chat flow once an end-to-end harness is added.
- Speech behavior should be manually verified in supported browsers for the MVP because browser speech APIs vary by browser and OS.

## Out of Scope

- User accounts and authentication.
- Database persistence.
- Saved named personality libraries beyond local browser settings.
- Persistent chat history.
- UI upload, editing, or management of context files.
- Context indexing or vector search.
- Multi-user deployments.
- Role-based access control.
- API-based speech-to-text.
- API-based text-to-speech.
- Dedicated search-provider integrations such as Tavily, Brave Search, SerpAPI, or Exa.
- Production deployment packaging.
- Mobile-specific UI.
- Offline local model inference.

## Further Notes

- The MVP is intentionally local-first and single-user.
- The first development experience should make missing AI provider configuration obvious instead of returning canned chatbot responses.
- Web search should remain explicit and user-controlled.
- The provider adapter design is important because the user is still evaluating long-term AI and search providers.
- The database and auth decisions are documented as future direction, not immediate requirements.
- The project should continue favoring TypeScript throughout.
- Future persistence work should likely start with saved personalities and chat history before user accounts.
- Future context work should likely add upload and management before semantic retrieval.
- Future voice work should compare browser speech APIs against API-based transcription and TTS quality.
