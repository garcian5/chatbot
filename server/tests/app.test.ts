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
    assert.deepEqual(response.json(), {
      ok: true,
      model: "gemini-2.5-flash",
      provider: "gemini"
    });
  } finally {
    await app.close();
  }
});

test("uses OpenAI only when explicitly selected", async () => {
  const app = await buildApp({
    ...baseConfig,
    aiProvider: "openai",
    openAiApiKey: "openai-key"
  });

  try {
    const response = await app.inject({ method: "GET", url: "/api/health" });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), {
      ok: true,
      model: "gpt-test",
      provider: "openai"
    });
  } finally {
    await app.close();
  }
});

test("does not fall back to OpenAI when Gemini is selected without a Gemini key", async () => {
  await assert.rejects(
    () =>
      buildApp({
        ...baseConfig,
        aiProvider: "gemini",
        geminiApiKey: undefined,
        openAiApiKey: "openai-key"
      }),
    /GEMINI_API_KEY is required/
  );
});

const baseConfig: AppConfig = {
  aiProvider: "gemini",
  clientOrigin: "http://127.0.0.1:5173",
  contextDir: "context",
  geminiApiKey: "gemini-key",
  geminiModel: "gemini-2.5-flash",
  host: "127.0.0.1",
  openAiApiKey: undefined,
  openAiModel: "gpt-test",
  port: 5174,
  searchProvider: "none"
};
