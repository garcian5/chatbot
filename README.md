# Local Context Chatbot

A local-first chatbot MVP with a Vue 3 + Vite + TypeScript frontend and a Fastify + TypeScript backend.

The app reads facts from the `context/` folder, lets the user define a personality, supports browser speech recognition and speech synthesis where available, and keeps web search behind a provider adapter for future expansion.

## Stack

- Frontend: Vue 3, Vite, TypeScript
- Backend: Fastify, TypeScript, Node.js
- MVP storage: local `context/` files and browser `localStorage`
- Future storage: Prisma with SQLite for local development and PostgreSQL for multi-user production
- Future auth: cookie/session-based auth with HTTP-only cookies

## Product Docs

- Product requirements: `docs/PRD.md`
- Technical decisions: `docs/DECISIONS.md`
- Roadmap: `docs/ROADMAP.md`

## Setup

1. Install dependencies.

   On Windows PowerShell, use `npm.cmd` so PowerShell does not route through `npm.ps1`:

   ```bash
   npm.cmd install
   ```

2. Copy `.env.example` to `.env` and set `GEMINI_API_KEY`. Keep `AI_PROVIDER=gemini` to use Gemini.

3. Start the backend:

   ```bash
   npm.cmd run dev:server
   ```

4. Start the frontend in a second terminal:

   ```bash
   npm.cmd run dev:client
   ```

   On macOS, Linux, Git Bash, or another shell where `npm` resolves directly to the Node package manager, the equivalent `npm install` and `npm run ...` commands are fine.

5. Open the Vite URL, usually `http://127.0.0.1:5173`.

## VS Code Launch

Use the `Launch app` compound configuration in `.vscode/launch.json` to start both the Fastify backend and Vite frontend.

The individual launch targets are:

- `Backend: Fastify dev`
- `Frontend: Vite dev`

## Context Files

Put `.md`, `.txt`, or `.json` files in `context/`. The backend reads those files at request time and injects them into the chat provider prompt.

The MVP intentionally keeps context management file-based. A future version can add UI upload, editing, indexing, and retrieval.

## Provider Behavior

The backend uses Gemini by default through `AI_PROVIDER=gemini` and calls Gemini's `generateContent` API using `GEMINI_MODEL`. OpenAI remains available only when `AI_PROVIDER=openai` is set, in which case the backend calls OpenAI's Responses API using `OPENAI_MODEL`. If the selected provider's key is missing, the server stops at startup instead of falling back to another provider.

Web search is adapter-based. Set `SEARCH_PROVIDER=gemini` to use Gemini Google Search grounding, `SEARCH_PROVIDER=openai` to use OpenAI-hosted search with the OpenAI provider, or `SEARCH_PROVIDER=none` to disable hosted search.

## Speech

The frontend uses browser APIs:

- Speech input: `SpeechRecognition` / `webkitSpeechRecognition` when available
- Speech output: `speechSynthesis` and installed browser voices

API-based transcription and higher-quality TTS are documented as future work.
