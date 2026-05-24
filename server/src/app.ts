import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import { GeminiGenerateContentProvider, OpenAiResponsesProvider, type ChatProvider } from "./providers/chatProvider.js";
import { registerChatRoutes } from "./routes/chatRoutes.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: config.clientOrigin
  });

  const chatProvider = createChatProvider(config);
  await registerChatRoutes(app, config, chatProvider);

  return app;
}

function createChatProvider(config: AppConfig): ChatProvider {
  if (config.aiProvider === "gemini") {
    if (!config.geminiApiKey) {
      throw new Error("GEMINI_API_KEY is required when AI_PROVIDER is gemini.");
    }

    return new GeminiGenerateContentProvider(
      config.geminiApiKey,
      config.geminiModel,
      config.searchProvider === "gemini"
    );
  }

  if (!config.openAiApiKey) {
    throw new Error("OPENAI_API_KEY is required when AI_PROVIDER is openai.");
  }

  return new OpenAiResponsesProvider(
    config.openAiApiKey,
    config.openAiModel,
    config.searchProvider === "openai"
  );
}
