import assert from "node:assert/strict";
import test from "node:test";
import { buildApp } from "../src/app.js";
import type { AppConfig } from "../src/config.js";

test("uses Gemini provider by default when both provider keys are configured", async () => {
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "gemini",
    geminiApiKey: "gemini-key",
    openAiApiKey: "openai-key"
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(response.statusCode, 200);
    const body = response.json();
    assert.equal(body.ok, true);
    assert.equal(body.model, "gemini-2.5-flash");
    assert.equal(body.provider, "gemini");
    assert.deepEqual(body.providers, [
      { id: "gemini", configured: true, model: "gemini-2.5-flash" },
      { id: "groq", configured: false, model: "llama-3.3-70b-versatile" },
      { id: "openai", configured: true, model: "gpt-test" }
    ]);
  } finally {
    await app.close();
  }
});

test("uses OpenAI first when explicitly selected", async () => {
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "openai",
    openAiApiKey: "openai-key"
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().model, "gpt-test");
    assert.equal(response.json().provider, "openai");
  } finally {
    await app.close();
  }
});

test("starts when the preferred provider is missing but another provider is configured", async () => {
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "gemini",
    geminiApiKey: undefined,
    openAiApiKey: "openai-key"
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().provider, "openai");
  } finally {
    await app.close();
  }
});

test("falls back from an exhausted provider to the next enabled provider", async () => {
  const previousFetch = globalThis.fetch;
  const attemptedUrls: string[] = [];
  const app = await buildApp({
    ...baseConfig,
    geminiApiKey: "gemini-key",
    groqApiKey: "groq-key"
  });

  globalThis.fetch = async (url) => {
    attemptedUrls.push(String(url));
    if (String(url).includes("generativelanguage.googleapis.com")) {
      return new Response(JSON.stringify({ error: { message: "Resource has been exhausted." } }), {
        status: 429
      });
    }

    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Groq answered." } }]
      }),
      { status: 200 }
    );
  };

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        personality: "Be direct.",
        useWebSearch: false,
        providerOrder: ["gemini", "groq"],
        disabledProviders: []
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().provider, "groq");
    assert.equal(response.json().message.content, "Groq answered.");
    assert.deepEqual(response.json().exhaustedProviders, ["gemini"]);
    assert.equal(attemptedUrls.length, 2);
  } finally {
    globalThis.fetch = previousFetch;
    await app.close();
  }
});

test("honors request provider order ahead of the configured startup preference", async () => {
  const previousFetch = globalThis.fetch;
  const attemptedUrls: string[] = [];
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "gemini",
    geminiApiKey: "gemini-key",
    groqApiKey: "groq-key"
  });

  globalThis.fetch = async (url) => {
    attemptedUrls.push(String(url));
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: "Groq first." } }]
      }),
      { status: 200 }
    );
  };

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        personality: "Be direct.",
        useWebSearch: false,
        providerOrder: ["groq", "gemini"],
        disabledProviders: []
      }
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().provider, "groq");
    assert.equal(attemptedUrls.length, 1);
    assert.match(attemptedUrls[0] ?? "", /api\.groq\.com/);
  } finally {
    globalThis.fetch = previousFetch;
    await app.close();
  }
});

test("returns a clear error when all providers are unavailable", async () => {
  const app = await buildApp(baseConfig);

  try {
    const response = await app.inject({
      method: "POST",
      url: "/api/chat",
      payload: {
        messages: [{ role: "user", content: "Hello" }],
        personality: "Be direct.",
        useWebSearch: false,
        providerOrder: ["gemini", "groq", "openai"],
        disabledProviders: ["gemini", "groq", "openai"]
      }
    });

    assert.equal(response.statusCode, 503);
    assert.match(response.json().error, /No enabled AI provider could answer/);
  } finally {
    await app.close();
  }
});

test("uses Groq first when explicitly selected", async () => {
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "groq",
    groqApiKey: "groq-key"
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(response.statusCode, 200);
    assert.equal(response.json().model, "llama-3.3-70b-versatile");
    assert.equal(response.json().provider, "groq");
  } finally {
    await app.close();
  }
});

test("requires at least one configured provider", async () => {
  await assert.rejects(
    () =>
      buildApp({
        ...baseConfig,
        geminiApiKey: undefined,
        groqApiKey: undefined,
        openAiApiKey: undefined
      }),
    /At least one AI provider API key is required/
  );
});

const baseConfig: AppConfig = {
  aiProvider: "gemini",
  clientOrigin: "http://127.0.0.1:5173",
  contextDir: "context",
  geminiApiKey: "gemini-key",
  geminiModel: "gemini-2.5-flash",
  groqApiKey: undefined,
  groqModel: "llama-3.3-70b-versatile",
  host: "127.0.0.1",
  openAiApiKey: undefined,
  openAiModel: "gpt-test",
  port: 5174,
  searchProvider: "none"
};
