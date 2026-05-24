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
  provider: string;
  searchStatus: "disabled" | "not_configured" | "enabled";
};

export type ContextFile = {
  name: string;
  characters: number;
};

export async function sendChat(payload: {
  messages: ChatMessage[];
  personality: string;
  useWebSearch: boolean;
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
    throw new Error(detail || `Chat request failed with ${response.status}`);
  }

  return response.json() as Promise<ChatResponse>;
}

export async function fetchContextFiles(): Promise<ContextFile[]> {
  const response = await fetch("/api/context");

  if (!response.ok) {
    return [];
  }

  const payload = (await response.json()) as { files: ContextFile[] };
  return payload.files;
}
