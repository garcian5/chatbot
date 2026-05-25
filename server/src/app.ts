import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import {
  GeminiGenerateContentProvider,
  GroqChatCompletionsProvider,
  OpenAiResponsesProvider,
  type ChatProvider
} from "./providers/chatProvider.js";
import { registerChatRoutes } from "./routes/chatRoutes.js";

export async function buildApp(config: AppConfig) {
  const app = Fastify({
    logger: true
  });

  await app.register(cors, {
    origin: config.clientOrigin
  });

  const chatProviders = createChatProviders(config);
  await registerChatRoutes(app, config, chatProviders);

  return app;
}

function createChatProviders(config: AppConfig): ChatProvider[] {
  const providers: ChatProvider[] = [];

  if (config.geminiApiKey) {
    providers.push(
      new GeminiGenerateContentProvider(
        config.geminiApiKey,
        config.geminiModel,
        config.searchProvider === "gemini"
      )
    );
  }

  if (config.groqApiKey) {
    providers.push(new GroqChatCompletionsProvider(config.groqApiKey, config.groqModel));
  }

  if (config.openAiApiKey) {
    providers.push(
      new OpenAiResponsesProvider(
        config.openAiApiKey,
        config.openAiModel,
        config.searchProvider === "openai"
      )
    );
  }

  if (providers.length === 0) {
    throw new Error("At least one AI provider API key is required.");
  }

  return providers.sort(
    (left, right) => providerRank(left.name, config.aiProvider) - providerRank(right.name, config.aiProvider)
  );
}

function providerRank(provider: ChatProvider["name"], preferredProvider: AppConfig["aiProvider"]): number {
  if (provider === preferredProvider) {
    return 0;
  }

  return ["gemini", "groq", "openai"].indexOf(provider) + 1;
}
