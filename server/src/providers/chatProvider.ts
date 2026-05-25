import type { ChatRequest, ChatResponse, ContextDocument } from "../types.js";
import { buildContextBlock } from "../services/contextSource.js";

export type ChatProvider = {
  name: string;
  model: string;
  complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse>;
};

function buildChatInstructions(request: ChatRequest, contextDocuments: ContextDocument[]): string {
  return [
    "You are a configurable local-first chatbot.",
    "Local context files are authoritative when they are relevant.",
    "Use the current conversation as temporary session memory for facts, preferences, and role assignments the user provides during this chat.",
    "If current session memory conflicts with the local context files, follow the local context files and do not adopt the conflicting session memory.",
    "If neither the local context files nor current session memory contain the answer, say so clearly.",
    `Personality: ${request.personality.trim() || "helpful, direct, and warm"}`,
    `Local context:\n${buildContextBlock(contextDocuments)}`
  ].join("\n\n");
}

export class OpenAiResponsesProvider implements ChatProvider {
  readonly name = "openai";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly enableHostedWebSearch: boolean
  ) {}

  async complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse> {
    const instructions = buildChatInstructions(request, contextDocuments);

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
      model: this.model,
      provider: this.name,
      searchStatus: request.useWebSearch && this.enableHostedWebSearch ? "enabled" : request.useWebSearch ? "not_configured" : "disabled"
    };
  }
}

export class GeminiGenerateContentProvider implements ChatProvider {
  readonly name = "gemini";

  constructor(
    private readonly apiKey: string,
    readonly model: string,
    private readonly enableGoogleSearch: boolean
  ) {}

  async complete(request: ChatRequest, contextDocuments: ContextDocument[]): Promise<ChatResponse> {
    const instructions = buildChatInstructions(request, contextDocuments);

    const body = {
      systemInstruction: {
        parts: [{ text: instructions }]
      },
      contents: request.messages.map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }]
      })),
      tools: request.useWebSearch && this.enableGoogleSearch ? [{ google_search: {} }] : undefined
    };

    const modelName = this.model.startsWith("models/") ? this.model.slice("models/".length) : this.model;
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelName)}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": this.apiKey
        },
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Gemini request failed with ${response.status}: ${detail}`);
    }

    const payload = (await response.json()) as GeminiResponsePayload;
    const text = extractGeminiText(payload);
    const citations = extractGeminiCitations(payload);

    return {
      message: {
        role: "assistant",
        content: text || "I could not produce a response."
      },
      citations,
      contextFiles: contextDocuments.map((document) => document.name),
      model: this.model,
      provider: this.name,
      searchStatus: request.useWebSearch && this.enableGoogleSearch ? "enabled" : request.useWebSearch ? "not_configured" : "disabled"
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

type GeminiResponsePayload = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: {
          uri?: string;
          title?: string;
        };
      }>;
    };
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

function extractGeminiText(payload: GeminiResponsePayload): string {
  return (
    payload.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter((text): text is string => Boolean(text))
      .join("\n") ?? ""
  );
}

function extractGeminiCitations(payload: GeminiResponsePayload) {
  return (
    payload.candidates
      ?.flatMap((candidate) => candidate.groundingMetadata?.groundingChunks ?? [])
      .map((chunk) => chunk.web)
      .filter((web): web is { uri: string; title?: string } => Boolean(web?.uri))
      .map((web) => ({
        title: web.title ?? web.uri,
        url: web.uri
      })) ?? []
  );
}
