export type AiProviderId = "gemini" | "openai" | "groq";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  personality: string;
  useWebSearch: boolean;
  providerOrder?: AiProviderId[];
  disabledProviders?: AiProviderId[];
};

export type ContextDocument = {
  name: string;
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

export type SearchResult = {
  title: string;
  url: string;
  snippet: string;
};
