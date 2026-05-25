import type { FastifyInstance } from "fastify";
import type { AppConfig } from "../config.js";
import { ChatProviderRequestError, type ChatProvider } from "../providers/chatProvider.js";
import { readContextDocuments } from "../services/contextSource.js";
import type { AiProviderId, ChatRequest, ChatResponse } from "../types.js";

const PROVIDER_ORDER: AiProviderId[] = ["gemini", "groq", "openai"];

export async function registerChatRoutes(
  app: FastifyInstance,
  config: AppConfig,
  chatProviders: ChatProvider[]
) {
  app.get("/api/health", async () => ({
    ok: true,
    model: chatProviders[0]?.model ?? "none",
    provider: chatProviders[0]?.name ?? "none",
    providers: PROVIDER_ORDER.map((provider) => ({
      id: provider,
      configured: chatProviders.some((chatProvider) => chatProvider.name === provider),
      model: getConfiguredModel(provider, config)
    }))
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
    const providerOrder = resolveProviderOrder(body.providerOrder, config.aiProvider);
    const disabledProviders = new Set((body.disabledProviders ?? []).filter(isAiProviderId));
    const providersById = new Map(chatProviders.map((provider) => [provider.name, provider]));
    const exhaustedProviders: AiProviderId[] = [];
    const failures: string[] = [];

    for (const providerId of providerOrder) {
      if (disabledProviders.has(providerId)) {
        failures.push(`${providerId}: disabled`);
        continue;
      }

      const provider = providersById.get(providerId);
      if (!provider) {
        failures.push(`${providerId}: not configured`);
        continue;
      }

      try {
        const response = await provider.complete(body, contextDocuments);
        return {
          ...response,
          exhaustedProviders
        } satisfies ChatResponse;
      } catch (error) {
        if (isProviderExhaustedError(error)) {
          exhaustedProviders.push(error.provider);
          failures.push(`${providerId}: exhausted`);
          continue;
        }

        failures.push(`${providerId}: ${error instanceof Error ? error.message : "request failed"}`);
      }
    }

    return reply.code(503).send({
      error: `No enabled AI provider could answer. ${failures.join("; ")}.`,
      exhaustedProviders
    });
  });
}

function resolveProviderOrder(requestedOrder: AiProviderId[] | undefined, preferredProvider: AiProviderId): AiProviderId[] {
  const requestOrder = requestedOrder && requestedOrder.length > 0 ? requestedOrder : [preferredProvider];
  const order = [...requestOrder, ...PROVIDER_ORDER].filter(isAiProviderId);
  return Array.from(new Set(order));
}

function isAiProviderId(value: unknown): value is AiProviderId {
  return value === "gemini" || value === "groq" || value === "openai";
}

function isProviderExhaustedError(error: unknown): error is ChatProviderRequestError {
  if (!(error instanceof ChatProviderRequestError)) {
    return false;
  }

  const detail = error.detail.toLowerCase();
  return (
    error.status === 429 ||
    detail.includes("quota") ||
    detail.includes("rate limit") ||
    detail.includes("rate_limit") ||
    detail.includes("resource_exhausted") ||
    detail.includes("exhausted")
  );
}

function getConfiguredModel(provider: AiProviderId, config: AppConfig): string {
  if (provider === "gemini") {
    return config.geminiModel;
  }

  if (provider === "groq") {
    return config.groqModel;
  }

  return config.openAiModel;
}
