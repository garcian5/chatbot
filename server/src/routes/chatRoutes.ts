import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import type { ChatProvider } from "../providers/chatProvider.js";
import { readContextDocuments } from "../services/contextSource.js";
import type { ChatRequest } from "../types.js";

export async function registerChatRoutes(
  app: FastifyInstance,
  config: AppConfig,
  chatProvider: ChatProvider
) {
  app.get("/api/health", async () => ({
    ok: true,
    provider: chatProvider.name
  }));

  app.get("/api/context", async () => {
    const documents = await readContextDocuments(config.contextDir);

    return {
      files: documents.map((document) => ({
        name: document.name,
        characters: document.content.length
      }))
    };
  });

  app.post<{ Body: ChatRequest }>("/api/chat", async (request, reply) => {
    const body = request.body;

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return reply.code(400).send({ error: "At least one message is required." });
    }

    const contextDocuments = await readContextDocuments(config.contextDir);
    return chatProvider.complete(body, contextDocuments);
  });
}
