import fs from "node:fs";
import path from "node:path";

export type AppConfig = {
  host: string;
  port: number;
  clientOrigin: string;
  contextDir: string;
  openAiApiKey?: string;
  openAiModel: string;
  searchProvider: "none" | "openai";
};

export function loadConfig(): AppConfig {
  const port = Number.parseInt(process.env.PORT ?? "5174", 10);

  return {
    host: process.env.HOST ?? "127.0.0.1",
    port: Number.isFinite(port) ? port : 5174,
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173",
    contextDir: resolveContextDir(process.env.CONTEXT_DIR),
    openAiApiKey: process.env.OPENAI_API_KEY || undefined,
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    searchProvider: process.env.SEARCH_PROVIDER === "openai" ? "openai" : "none"
  };
}

function resolveContextDir(configuredPath?: string): string {
  const launchDir = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();

  if (configuredPath) {
    if (path.isAbsolute(configuredPath)) {
      return configuredPath;
    }

    const candidates = [
      path.resolve(launchDir, configuredPath),
      path.resolve(process.cwd(), configuredPath),
      path.resolve(process.cwd(), "..", configuredPath)
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? candidates[0];
  }

  if (path.basename(process.cwd()) === "server") {
    return path.resolve(process.cwd(), "..", "context");
  }

  return path.resolve(launchDir, "context");
}
