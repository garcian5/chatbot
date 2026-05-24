import cors from "@fastify/cors";
import Fastify from "fastify";
import type { AppConfig } from "./config.js";
import { DevelopmentChatProvider, OpenAiResponsesProvider, type ChatProvider } from "./providers/chatProvider.js";
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
  if (config.openAiApiKey) {
    return new OpenAiResponsesProvider(
      config.openAiApiKey,
      config.openAiModel,
      config.searchProvider === "openai"
    );
  }

  return new DevelopmentChatProvider();
}
