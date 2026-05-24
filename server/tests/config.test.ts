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

function restoreEnv(key: string, value: string | undefined) {
  if (value === undefined) {
    delete process.env[key];
    return;
  }

  process.env[key] = value;
}
