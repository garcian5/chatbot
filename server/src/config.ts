import fs from "node:fs";
import path from "node:path";

export type AppConfig = {
  aiProvider: "gemini" | "openai" | "groq";
  host: string;
  port: number;
  clientOrigin: string;
  contextDir: string;
  geminiApiKey?: string;
  geminiModel: string;
  openAiApiKey?: string;
  openAiModel: string;
  groqApiKey?: string;
  groqModel: string;
  searchProvider: "none" | "openai" | "gemini";
};

export function loadConfig(): AppConfig {
  loadEnvFile();

  const port = Number.parseInt(process.env.PORT ?? "5174", 10);
  const aiProvider = resolveAiProvider(process.env.AI_PROVIDER);

  return {
    aiProvider,
    host: process.env.HOST ?? "127.0.0.1",
    port: Number.isFinite(port) ? port : 5174,
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://127.0.0.1:5173",
    contextDir: resolveContextDir(process.env.CONTEXT_DIR),
    geminiApiKey: process.env.GEMINI_API_KEY || undefined,
    geminiModel: process.env.GEMINI_MODEL ?? "gemini-2.5-flash",
    openAiApiKey: process.env.OPENAI_API_KEY || undefined,
    openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.4-mini",
    groqApiKey: process.env.GROQ_API_KEY || undefined,
    groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
    searchProvider: process.env.SEARCH_PROVIDER === "openai" || process.env.SEARCH_PROVIDER === "gemini" ? process.env.SEARCH_PROVIDER : "none"
  };
}

function resolveAiProvider(value?: string): AppConfig["aiProvider"] {
  if (value === "openai" || value === "groq") {
    return value;
  }

  return "gemini";
}

function loadEnvFile() {
  const envPath = findEnvFile();
  if (!envPath) {
    return;
  }

  const entries = parseEnvFile(fs.readFileSync(envPath, "utf8"));
  for (const [key, value] of Object.entries(entries)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function findEnvFile(): string | undefined {
  const launchDir = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : process.cwd();
  const candidates = [
    path.resolve(launchDir, ".env"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "..", ".env")
  ];

  return candidates.find((candidate) => fs.existsSync(candidate));
}

function parseEnvFile(content: string): Record<string, string> {
  const entries: Record<string, string> = {};

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      continue;
    }

    entries[key] = stripOptionalQuotes(rawValue);
  }

  return entries;
}

function stripOptionalQuotes(value: string): string {
  const quote = value[0];
  if ((quote === '"' || quote === "'") && value.endsWith(quote)) {
    return value.slice(1, -1);
  }

  return value;
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
