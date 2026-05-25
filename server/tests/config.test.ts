import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { loadConfig } from "../src/config.js";

test("resolves configured context dir relative to the original launch directory", async () => {
  const previousInitCwd = process.env.INIT_CWD;
  const previousContextDir = process.env.CONTEXT_DIR;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatbot-launch-"));
  const contextDir = path.join(root, "context");

  await fs.mkdir(contextDir);

  process.env.INIT_CWD = root;
  process.env.CONTEXT_DIR = "./context";

  try {
    const config = loadConfig();
    assert.equal(config.contextDir, contextDir);
  } finally {
    restoreEnv("INIT_CWD", previousInitCwd);
    restoreEnv("CONTEXT_DIR", previousContextDir);
  }
});

test("falls back to the parent project folder for workspace-launched server scripts", async () => {
  const previousInitCwd = process.env.INIT_CWD;
  const previousContextDir = process.env.CONTEXT_DIR;
  const projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), "chatbot-project-"));
  const serverDir = path.join(projectRoot, "server");
  const contextDir = path.join(projectRoot, "context");
  const originalCwd = process.cwd();

  await fs.mkdir(serverDir);
  await fs.mkdir(contextDir);

  process.env.INIT_CWD = serverDir;
  process.env.CONTEXT_DIR = "./context";
  process.chdir(serverDir);

  try {
    const config = loadConfig();
    assert.equal(config.contextDir, contextDir);
  } finally {
    process.chdir(originalCwd);
    restoreEnv("INIT_CWD", previousInitCwd);
    restoreEnv("CONTEXT_DIR", previousContextDir);
  }
});

test("loads provider settings from a root env file for workspace-launched server scripts", async () => {
  const previousInitCwd = process.env.INIT_CWD;
  const previousAiProvider = process.env.AI_PROVIDER;
  const previousApiKey = process.env.OPENAI_API_KEY;
  const previousModel = process.env.OPENAI_MODEL;
  const previousGeminiApiKey = process.env.GEMINI_API_KEY;
  const previousGeminiModel = process.env.GEMINI_MODEL;
  const previousGroqApiKey = process.env.GROQ_API_KEY;
  const previousGroqModel = process.env.GROQ_MODEL;
  const previousSearchProvider = process.env.SEARCH_PROVIDER;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatbot-env-"));
  const serverDir = path.join(root, "server");
  const originalCwd = process.cwd();

  await fs.mkdir(serverDir);
  await fs.writeFile(
    path.join(root, ".env"),
    [
      "GEMINI_API_KEY=gemini-from-env-file",
      "GEMINI_MODEL=gemini-test-model",
      "AI_PROVIDER=gemini",
      "GROQ_API_KEY=groq-from-env-file",
      "GROQ_MODEL=groq-test-model",
      "OPENAI_API_KEY=from-env-file",
      "OPENAI_MODEL=test-model",
      "SEARCH_PROVIDER=gemini"
    ].join("\n")
  );

  process.env.INIT_CWD = root;
  delete process.env.AI_PROVIDER;
  delete process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_MODEL;
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
  delete process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_MODEL;
  delete process.env.SEARCH_PROVIDER;
  process.chdir(serverDir);

  try {
    const config = loadConfig();
    assert.equal(config.aiProvider, "gemini");
    assert.equal(config.geminiApiKey, "gemini-from-env-file");
    assert.equal(config.geminiModel, "gemini-test-model");
    assert.equal(config.groqApiKey, "groq-from-env-file");
    assert.equal(config.groqModel, "groq-test-model");
    assert.equal(config.openAiApiKey, "from-env-file");
    assert.equal(config.openAiModel, "test-model");
    assert.equal(config.searchProvider, "gemini");
  } finally {
    process.chdir(originalCwd);
    restoreEnv("INIT_CWD", previousInitCwd);
    restoreEnv("AI_PROVIDER", previousAiProvider);
    restoreEnv("GEMINI_API_KEY", previousGeminiApiKey);
    restoreEnv("GEMINI_MODEL", previousGeminiModel);
    restoreEnv("GROQ_API_KEY", previousGroqApiKey);
    restoreEnv("GROQ_MODEL", previousGroqModel);
    restoreEnv("OPENAI_API_KEY", previousApiKey);
    restoreEnv("OPENAI_MODEL", previousModel);
    restoreEnv("SEARCH_PROVIDER", previousSearchProvider);
  }
});

test("defaults to Gemini provider unless OpenAI or Groq is explicitly selected", () => {
  const previousAiProvider = process.env.AI_PROVIDER;

  delete process.env.AI_PROVIDER;
  try {
    assert.equal(loadConfig().aiProvider, "gemini");

    process.env.AI_PROVIDER = "openai";
    assert.equal(loadConfig().aiProvider, "openai");

    process.env.AI_PROVIDER = "groq";
    assert.equal(loadConfig().aiProvider, "groq");
  } finally {
    restoreEnv("AI_PROVIDER", previousAiProvider);
  }
});

test("keeps explicit environment variables ahead of env file values", async () => {
  const previousInitCwd = process.env.INIT_CWD;
  const previousApiKey = process.env.OPENAI_API_KEY;
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "chatbot-env-"));

  await fs.writeFile(path.join(root, ".env"), "OPENAI_API_KEY=from-env-file");

  process.env.INIT_CWD = root;
  process.env.OPENAI_API_KEY = "from-process-env";

  try {
    const config = loadConfig();
    assert.equal(config.openAiApiKey, "from-process-env");
  } finally {
    restoreEnv("INIT_CWD", previousInitCwd);
    restoreEnv("OPENAI_API_KEY", previousApiKey);
  }
});

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
