import type { ChatRequest, ChatResponse, ContextDocument } from "../types.js";
import { buildContextBlock } from "../services/contextSource.js";

export type ChatProvider = {
  name: string;
  complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse>;
};

export class DevelopmentChatProvider implements ChatProvider {
  readonly name = "development";

  async complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse> {
    const latestUserMessage = [...request.messages].reverse().find((message) => message.role === "user");
    const contextList = contextDocuments.map((document) => document.name).join(", ") || "none";
    const personality = request.personality.trim() || "a helpful, clear assistant";

    return {
      message: {
        role: "assistant",
        content:
          `Development provider active.\n\n` +
          `Personality: ${personality}\n\n` +
          `Loaded context files: ${contextList}\n\n` +
          `You said: ${latestUserMessage?.content ?? ""}`
      },
      citations: [],
      contextFiles: contextDocuments.map((document) => document.name),
      provider: this.name,
      searchStatus: request.useWebSearch ? "not_configured" : "disabled"
    };
  }
}

export class OpenAiResponsesProvider implements ChatProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    private readonly model: string,
    private readonly enableHostedWebSearch: boolean
  ) {}

  async complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse> {
    const instructions = [
      "You are a configurable local-first chatbot.",
      "Prefer the provided local context when it is relevant.",
      "If the local context does not contain the answer, say so clearly.",
      `Personality: ${request.personality.trim() || "helpful, direct, and warm"}`,
      `Local context:\n${buildContextBlock(contextDocuments)}`
    ].join("\n\n");

    const body = {
      model: this.model,
      instructions,
      input: request.messages.map((message) => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content
      })),
      tools: request.useWebSearch && this.enableHostedWebSearch ? [{ type: "web_search_preview" }] : undefined
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`OpenAI request failed with ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as OpenAiResponsePayload;
    const text = extractOutputText(payload);
    const citations = extractCitations(payload);

    return {
      message: {
        role: "assistant",
        content: text || "I could not produce a response."
      },
      citations,
      contextFiles: contextDocuments.map((document) => document.name),
      provider: this.name,
      searchStatus: request.useWebSearch && this.enableHostedWebSearch ? "enabled" : request.useWebSearch ? "not_configured" : "disabled"
    };
  }
}

type OpenAiResponsePayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
      annotations?: Array<{
        type?: string;
        title?: string;
        url?: string;
      }>;
    }>;
  }>;
};

function extractOutputText(payload: OpenAiResponsePayload): string {
  if (payload.output_text) {
    return payload.output_text;
  }

  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter((text): text is string => Boolean(text))
      .join("\n") ?? ""
  );
}

function extractCitations(payload: OpenAiResponsePayload) {
  return (
    payload.output
      ?.flatMap((item) => item.content ?? [])
      .flatMap((content) => content.annotations ?? [])
      .filter((annotation) => annotation.type === "url_citation" && annotation.url)
      .map((annotation) => ({
        title: annotation.title ?? annotation.url ?? "Source",
        url: annotation.url ?? ""
      })) ?? []
  );
}
