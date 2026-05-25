export type AiProviderId = "gemini" | "openai" | "groq";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type Citation = {
  title: string;
  url: string;
};

export type ChatResponse = {
  message: ChatMessage;
  citations: Citation[];
  contextFiles: string[];
  model: string;
  provider: AiProviderId;
  exhaustedProviders: AiProviderId[];
  searchStatus: "disabled" | "not_configured" | "enabled";
};

export type ProviderStatus = {
  model: string;
  provider: AiProviderId | "none";
  providers: ProviderOption[];
};

export type ProviderOption = {
  id: AiProviderId;
  configured: boolean;
  model: string;
};

export type ContextFile = {
  name: string;
  characters: number;
};

export class ChatApiError extends Error {
  constructor(
    message: string,
    readonly exhaustedProviders: AiProviderId[]
  ) {
    super(message);
  }
}

export async function sendChat(payload: {
  messages: ChatMessage[];
  personality: string;
  useWebSearch: boolean;
  providerOrder: AiProviderId[];
  disabledProviders: AiProviderId[];
}): Promise<ChatResponse> {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const detail = await response.text();
    const parsedDetail = parseChatError(detail);
    throw new ChatApiError(parsedDetail.message || `Chat request failed with ${response.status}`, parsedDetail.exhaustedProviders);
  }

  return response.json() as Promise<ChatResponse>;
}

export async function fetchProviderStatus(): Promise<ProviderStatus> {
  const response = await fetch("/api/health");

  if (!response.ok) {
    return { model: "unknown", provider: "none", providers: [] };
  }

  const payload = (await response.json()) as ProviderStatus;
  return payload;
}

export async function fetchContextFiles(): Promise<ContextFile[]> {
  const response = await fetch("/api/context");

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { files: ContextFile[] };
  return payload.files;
}

function parseChatError(detail: string): { message: string; exhaustedProviders: AiProviderId[] } {
  try {
    const payload = JSON.parse(detail) as { error?: string; exhaustedProviders?: AiProviderId[] };
    return {
      message: payload.error ?? detail,
      exhaustedProviders: Array.isArray(payload.exhaustedProviders) ? payload.exhaustedProviders : []
    };
  } catch {
    return { message: detail, exhaustedProviders: [] };
  }
}
