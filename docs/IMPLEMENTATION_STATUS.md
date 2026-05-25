# PRD Implementation Status

This document compares `docs/PRD.md` against the current codebase.

Status legend:

- Implemented: the behavior or decision exists in code or project docs.
- Partial: the behavior exists only in a limited form, depends on provider/browser support, or lacks the full verification implied by the PRD.
- Not implemented: the behavior or verification item was not found in the current codebase.

## User Stories

| Story | Status | Evidence / Gap |
| --- | --- | --- |
| 1. Read facts from a local context folder. | Implemented | `server/src/services/contextSource.ts` reads from the configured context directory; `/api/chat` injects loaded documents into the provider. |
| 2. Add Markdown files to context. | Implemented | `.md` is included in the supported extension set. |
| 3. Add plain text files to context. | Implemented | `.txt` is included in the supported extension set. |
| 4. Ignore unsupported files. | Implemented | Unsupported extensions are skipped, and a test covers ignoring `ignore.png`. |
| 5. Show which context files are loaded. | Implemented | `/api/context` returns file names; the Vue UI renders the context list. |
| 6. Send a message in a chat UI. | Implemented | The Vue composer posts messages to `/api/chat`. |
| 7. See user and assistant messages in a thread. | Implemented | `messages` stores and renders both user and assistant messages. |
| 8. Assistant prefers local context when relevant. | Implemented | Gemini and OpenAI providers include local context in provider instructions and tell the model to prefer it when relevant. |
| 9. Assistant says when local context lacks the answer. | Implemented | Gemini and OpenAI provider instructions ask the model to clearly say when local context does not contain the answer. |
| 10. Define assistant personality in the UI. | Implemented | The settings panel edits `settings.personality` and sends it with chat requests. |
| 11. Persist personality settings locally. | Implemented | `client/src/storage.ts` loads and saves settings with `localStorage`. |
| 12. Reset personality to default. | Implemented | `resetPersonality()` restores `defaultSettings.personality`. |
| 13. Provide a default helpful personality. | Implemented | `defaultSettings.personality` defines the initial assistant behavior. |
| 14. Toggle whether web search is requested. | Implemented | `settings.useWebSearch` is persisted and sent to the backend. |
| 15. Show search disabled, enabled, or not configured. | Implemented | `searchStatus` supports and displays `disabled`, `not_configured`, and `enabled`. |
| 16. Clearly report missing AI configuration. | Implemented | Server startup throws when the selected provider's required key is absent, avoiding canned development responses. |
| 17. Use Gemini by default while keeping OpenAI available as an explicit option. | Implemented | `AI_PROVIDER` defaults to `gemini`; OpenAI is used only when `AI_PROVIDER=openai`. |
| 18. Show the active AI provider and model in the settings panel. | Implemented | `/api/health` exposes provider/model and the Vue settings panel renders them. |
| 19. Make future search providers pluggable. | Partial | A `SearchProvider` interface and no-op provider exist, but hosted search currently routes through the configured chat provider rather than a standalone search provider. |
| 20. Include citations when the provider returns them. | Implemented | Gemini and OpenAI providers extract URL citations and the UI renders citation links. |
| 21. Choose a browser voice. | Implemented | The UI loads installed voices and stores `selectedVoiceName`. |
| 22. Speak assistant replies aloud. | Implemented | `speak()` uses `speechSynthesis` after assistant responses when enabled. |
| 23. Turn spoken replies off. | Implemented | `settings.speakResponses` controls whether assistant responses are spoken. |
| 24. Dictate a message using browser speech recognition when supported. | Implemented | `startListening()` uses `SpeechRecognition` or `webkitSpeechRecognition` and appends the transcript to the draft. |
| 25. Disable speech controls when unsupported. | Implemented | The mic button and voice selector are disabled based on browser speech API support. |
| 26. Reset the conversation without changing settings. | Implemented | `resetConversation()` clears the thread and leaves settings unchanged. |
| 27. Use TypeScript for frontend and backend. | Implemented | Both `client` and `server` are TypeScript packages. |
| 28. Use a Fastify backend. | Implemented | `server/src/app.ts` builds a Fastify app. |
| 29. Use provider interfaces for chat and search. | Partial | `ChatProvider` and `SearchProvider` interfaces exist. Chat provider is wired; search provider is not yet wired into runtime behavior. |
| 30. Isolate context loading behind a module. | Implemented | Context ingestion lives in `server/src/services/contextSource.ts`. |
| 31. Avoid a database in the MVP. | Implemented | No database dependency, schema, ORM, or persistence layer exists. |
| 32. Document future database direction. | Implemented | `docs/PRD.md`, `docs/DECISIONS.md`, and `README.md` document Prisma, SQLite, and PostgreSQL direction. |
| 33. Document future auth direction. | Implemented | `docs/PRD.md`, `docs/DECISIONS.md`, and `README.md` document cookie/session auth direction. |
| 34. Document Windows PowerShell `npm.cmd` commands. | Implemented | `README.md` and `.vscode/launch.json` use `npm.cmd`. |
| 35. Add VS Code launch configuration. | Implemented | `.vscode/launch.json` defines backend, frontend, and compound launch targets. |
| 36. Add basic automated tests around context loading and config resolution. | Implemented | `server/tests/contextSource.test.ts` and `server/tests/config.test.ts` cover those areas. |

## Implementation Decisions

| Decision | Status | Evidence / Gap |
| --- | --- | --- |
| Vue 3, Vite, TypeScript frontend. | Implemented | `client/package.json` uses Vue, Vite, TypeScript, and `vue-tsc`. |
| Fastify and TypeScript backend. | Implemented | `server/package.json` uses Fastify, TypeScript, and `tsx`; server code is `.ts`. |
| Monorepo workspace with separate client and server packages. | Implemented | Root `package.json` declares `client` and `server` workspaces. |
| Browser `localStorage` for personality, voice, speech, and search preferences. | Implemented | `client/src/storage.ts` persists all four settings. |
| Browser speech recognition for MVP speech input. | Implemented | The UI uses `SpeechRecognition` or `webkitSpeechRecognition`. |
| Browser `speechSynthesis` for text-to-speech. | Implemented | The UI uses `window.speechSynthesis`. |
| Installed browser voices as voice selection source. | Implemented | `loadVoices()` reads `window.speechSynthesis.getVoices()`. |
| Read local context from root-level `context` folder. | Implemented | `CONTEXT_DIR` defaults to `./context`, with workspace-launch fallback handling. |
| Support Markdown, plain text, and JSON context files. | Implemented | `.md`, `.txt`, and `.json` are supported. |
| Enforce file size limits for context. | Implemented | Per-file and total byte limits are enforced before reading file contents. |
| Derive context on read. | Implemented | Context is read on `/api/context` and each `/api/chat` request. |
| Add `ChatProvider` abstraction with Gemini and OpenAI-compatible providers. | Implemented | `ChatProvider`, `GeminiGenerateContentProvider`, and `OpenAiResponsesProvider` exist. |
| Add `SearchProvider` abstraction. | Partial | Interface and no-op implementation exist, but are not integrated into the app runtime. |
| Require at least one AI provider key for chat responses. | Implemented | Provider selection throws when both `geminiApiKey` and `openAiApiKey` are missing. |
| Use Gemini provider by default. | Implemented | `AI_PROVIDER` defaults to `gemini`; provider selection creates `GeminiGenerateContentProvider` for that mode. |
| Use OpenAI-compatible Responses API provider only when explicitly selected. | Implemented | The OpenAI provider posts to `/v1/responses` when `AI_PROVIDER=openai`. |
| Keep web search behind configuration and request metadata. | Implemented | `SEARCH_PROVIDER` and request `useWebSearch` determine Gemini Google Search grounding or OpenAI hosted search usage. |
| Use env vars for port, host, client origin, context dir, AI provider, Gemini key/model, OpenAI key/model, and search provider. | Implemented | `server/src/config.ts` reads all listed variables, and `.env.example` documents them. |
| Do not add authentication in MVP. | Implemented | No auth routes, middleware, or user model exists. |
| Do not add database persistence in MVP. | Implemented | No database or ORM is present. |
| Recommend Prisma for future persistence. | Implemented | Documented in product and decision docs. |
| Recommend SQLite locally and PostgreSQL for production/multi-user. | Implemented | Documented in product and decision docs. |
| Prefer relational storage for future durable data. | Implemented | Documented in `docs/DECISIONS.md`. |
| Keep MongoDB as possible future option, not primary recommendation. | Implemented | Documented in `docs/DECISIONS.md`. |
| Recommend cookie/session auth with HTTP-only cookies. | Implemented | Documented in `docs/DECISIONS.md`. |
| Avoid browser-stored JWTs as default future auth plan. | Implemented | Documented in `docs/PRD.md`. |
| Add VS Code launch targets for backend, frontend, and compound app launch. | Implemented | `.vscode/launch.json` includes all three. |
| Document Windows PowerShell commands using `npm.cmd`. | Implemented | `README.md` documents `npm.cmd` setup and run commands. |
| Keep UI context upload and management out of MVP. | Implemented | No upload or management UI exists; context remains file-based. |
| Keep API-based transcription and higher-quality TTS out of MVP. | Implemented | Speech uses browser APIs only. |
| Keep user accounts and multi-user access out of MVP. | Implemented | No account or multi-user functionality exists. |

## Testing Decisions

| Testing item | Status | Evidence / Gap |
| --- | --- | --- |
| Tests focus on external behavior and stable contracts. | Partial | Existing tests cover behavior at the service/config level; there are no route or browser tests yet. |
| Context-loading tests verify supported files and unsupported files. | Implemented | `contextSource.test.ts` verifies `.md` and `.txt` are read and `.png` is ignored. |
| Context formatting tests verify readable provider prompt block. | Implemented | `contextSource.test.ts` verifies `buildContextBlock()`. |
| Config tests verify context directory resolution for workspace scripts. | Implemented | `config.test.ts` covers `INIT_CWD`, configured paths, and workspace-launched scripts. |
| Build and typecheck are part of verification. | Implemented | Root scripts include `build` and `typecheck`. |
| Backend endpoint smoke tests for health, context listing, and chat response. | Partial | Health route tests exist; context listing and chat response route tests are still missing. |
| Frontend verification that Vite serves and reaches backend API. | Not implemented | No frontend smoke or e2e test harness was found. |
| Future provider adapter tests with mocked responses. | Implemented | Gemini and OpenAI provider tests mock provider responses, search tool flags, and citation extraction. |
| Future persistence tests after Prisma and saved data. | Not applicable yet | Persistence is out of scope and not implemented. |
| Future browser tests for the main chat flow. | Not implemented | No browser/e2e harness was found. |
| Manual speech verification in supported browsers. | Not documented | Browser speech UI exists, but no manual verification record was found. |

## Items Still To Implement

- Wire the `SearchProvider` abstraction into runtime behavior, or document that hosted search through `ChatProvider` is the MVP's concrete search path.
- Add remaining backend endpoint smoke tests for `/api/context` and `/api/chat`.
- Add frontend smoke or e2e verification that the Vite app loads and can reach the backend.
- Add broader provider adapter tests for error handling and unusual Gemini/OpenAI payloads.
- Add a manual verification note or checklist for browser speech recognition and speech synthesis.
- Confirm the app displays a friendly setup error if the backend is started without the selected provider's API key.
