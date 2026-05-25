# Project Decisions

## MVP Product Scope

- Build a single-user, local-first chatbot.
- Load facts from files in a `context/` folder.
- Defer UI-based context upload and management to a future version.
- Let users define the assistant personality in the UI.
- Persist personalities and preferences in browser `localStorage` for the MVP.
- Use browser speech APIs for transcription and text-to-speech in the MVP.
- Keep API-based transcription and higher-quality TTS as future enhancements.
- Add web search through a provider adapter so the search provider can change later.

## Frontend Decision

Use Vue 3, Vite, and TypeScript.

Rationale:

- Vue + Vite is lightweight and fast for an interactive local app.
- TypeScript keeps contracts explicit between UI and backend.
- Browser speech recognition and speech synthesis can be integrated directly in the UI.

## Backend Decision

Use Fastify with TypeScript.

Rationale:

- Keeps the whole project in TypeScript.
- Fastify has strong TypeScript support, route schemas, and a plugin model.
- It integrates cleanly with future relational persistence and authentication.
- It is less heavyweight than ASP.NET Core while still being more structured than a minimal Express app.

## Database Direction

Do not add a database for the MVP.

Future recommendation:

- Use Prisma as the ORM.
- Use SQLite for local development and early persistence.
- Use PostgreSQL for production or multi-user deployment.

Rationale:

- Users, personalities, chat sessions, messages, uploaded context documents, preferences, and search logs are naturally relational.
- PostgreSQL also leaves room for JSON columns and future vector search through `pgvector`.
- MongoDB remains viable for document-heavy storage, but the durable app data is expected to be more relational than document-first.

## Authentication Direction

Do not add authentication for the MVP.

Future recommendation:

- Use cookie/session-based authentication for the browser app.
- Store session identifiers in HTTP-only cookies.
- Hash passwords with a modern password hashing library such as Argon2.
- Add CSRF protection for cookie-authenticated mutating routes.

Rationale:

- The MVP is single-user/local.
- Future accounts are expected, and cookie/session auth fits a browser-first app better than browser-stored JWTs.

## Provider Direction

Use provider adapters rather than hardwiring a single model vendor through the UI.

MVP behavior:

- Use Gemini for chat completions by default with `AI_PROVIDER=gemini`.
- Support Groq as a configured fallback provider through its OpenAI-compatible chat completions endpoint.
- Keep an OpenAI-compatible Responses API provider available when `OPENAI_API_KEY` is configured.
- Require at least one real AI provider key for chatbot responses.
- Let the browser persist provider order and disabled provider choices in local storage.
- Automatically try the next enabled provider when a provider returns a quota or rate-limit exhaustion error.

Future options:

- Add dedicated search providers such as Tavily, Brave Search, SerpAPI, or Exa.
- Add local model providers if offline/private inference becomes important.
- Add API-based transcription and text-to-speech providers.
