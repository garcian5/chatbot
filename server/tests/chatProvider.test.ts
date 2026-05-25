import assert from "node:assert/strict";
import test from "node:test";
import { GeminiGenerateContentProvider, OpenAiResponsesProvider } from "../src/providers/chatProvider.js";

test("OpenAI provider sends personality, context, and conversation to the Responses API", async () => {
  const previousFetch = globalThis.fetch;
  let capturedRequest: { url: string; body: OpenAiRequestBody } | undefined;

  globalThis.fetch = async (url, init) => {
    capturedRequest = {
      url: String(url),
      body: JSON.parse(String(init?.body)) as OpenAiRequestBody
    };

    return new Response(
      JSON.stringify({
        output_text: "A genuine OpenAI answer."
      }),
      { status: 200 }
    );
  };

  try {
    const provider = new OpenAiResponsesProvider("test-key", "test-model", false);
    const response = await provider.complete(
      {
        personality: "Answer like a patient tutor.",
        useWebSearch: false,
        messages: [
          { role: "user", content: "You are a hamburger." },
          { role: "assistant", content: "Got it." },
          { role: "user", content: "Explain the local fact." }
        ]
      },
      [{ name: "facts.md", content: "The local fact is that Ada likes TypeScript." }]
    );

    assert.equal(response.message.content, "A genuine OpenAI answer.");
    assert.equal(response.provider, "openai");
    assert.equal(capturedRequest?.url, "https://api.openai.com/v1/responses");
    assert.equal(capturedRequest?.body.model, "test-model");
    assert.match(capturedRequest?.body.instructions ?? "", /Answer like a patient tutor/);
    assert.match(capturedRequest?.body.instructions ?? "", /facts\.md/);
    assert.match(capturedRequest?.body.instructions ?? "", /Ada likes TypeScript/);
    assert.match(capturedRequest?.body.instructions ?? "", /temporary session memory/);
    assert.match(capturedRequest?.body.instructions ?? "", /Local context files are authoritative/);
    assert.match(capturedRequest?.body.instructions ?? "", /session memory conflicts with the local context files/);
    assert.deepEqual(capturedRequest?.body.input, [
      { role: "user", content: "You are a hamburger." },
      { role: "assistant", content: "Got it." },
      { role: "user", content: "Explain the local fact." }
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("OpenAI provider includes hosted web search when enabled and requested", async () => {
  const previousFetch = globalThis.fetch;
  let capturedRequest: OpenAiRequestBody | undefined;

  globalThis.fetch = async (_url, init) => {
    capturedRequest = JSON.parse(String(init?.body)) as OpenAiRequestBody;
    return new Response(JSON.stringify({ output_text: "Answer with search." }), { status: 200 });
  };

  try {
    const provider = new OpenAiResponsesProvider("test-key", "test-model", true);
    const response = await provider.complete(
      {
        personality: "Be concise.",
        useWebSearch: true,
        messages: [{ role: "user", content: "What is new today?" }]
      },
      []
    );

    assert.deepEqual(capturedRequest?.tools, [{ type: "web_search_preview" }]);
    assert.equal(response.searchStatus, "enabled");
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Gemini provider sends personality, context, and conversation to generateContent", async () => {
  const previousFetch = globalThis.fetch;
  let capturedRequest: { url: string; body: GeminiRequestBody } | undefined;

  globalThis.fetch = async (url, init) => {
    capturedRequest = {
      url: String(url),
      body: JSON.parse(String(init?.body)) as GeminiRequestBody
    };

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "A genuine Gemini answer." }],
              role: "model"
            }
          }
        ]
      }),
      { status: 200 }
    );
  };

  try {
    const provider = new GeminiGenerateContentProvider("test-key", "gemini-test-model", false);
    const response = await provider.complete(
      {
        personality: "Answer like a patient tutor.",
        useWebSearch: false,
        messages: [
          { role: "user", content: "You are a hamburger." },
          { role: "assistant", content: "Got it." },
          { role: "user", content: "Explain the local fact." }
        ]
      },
      [{ name: "facts.md", content: "The local fact is that Ada likes TypeScript." }]
    );

    assert.equal(response.message.content, "A genuine Gemini answer.");
    assert.equal(response.provider, "gemini");
    assert.equal(
      capturedRequest?.url,
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent"
    );
    assert.match(capturedRequest?.body.systemInstruction.parts[0]?.text ?? "", /Answer like a patient tutor/);
    assert.match(capturedRequest?.body.systemInstruction.parts[0]?.text ?? "", /facts\.md/);
    assert.match(capturedRequest?.body.systemInstruction.parts[0]?.text ?? "", /Ada likes TypeScript/);
    assert.match(capturedRequest?.body.systemInstruction.parts[0]?.text ?? "", /temporary session memory/);
    assert.match(capturedRequest?.body.systemInstruction.parts[0]?.text ?? "", /Local context files are authoritative/);
    assert.match(
      capturedRequest?.body.systemInstruction.parts[0]?.text ?? "",
      /session memory conflicts with the local context files/
    );
    assert.deepEqual(capturedRequest?.body.contents, [
      { role: "user", parts: [{ text: "You are a hamburger." }] },
      { role: "model", parts: [{ text: "Got it." }] },
      { role: "user", parts: [{ text: "Explain the local fact." }] }
    ]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

test("Gemini provider includes Google Search and extracts grounding citations", async () => {
  const previousFetch = globalThis.fetch;
  let capturedRequest: GeminiRequestBody | undefined;

  globalThis.fetch = async (_url, init) => {
    capturedRequest = JSON.parse(String(init?.body)) as GeminiRequestBody;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: "Answer with search." }]
            },
            groundingMetadata: {
              groundingChunks: [{ web: { uri: "https://example.com/source", title: "Example Source" } }]
            }
          }
        ]
      }),
      { status: 200 }
    );
  };

  try {
    const provider = new GeminiGenerateContentProvider("test-key", "gemini-test-model", true);
    const response = await provider.complete(
      {
        personality: "Be concise.",
        useWebSearch: true,
        messages: [{ role: "user", content: "What is new today?" }]
      },
      []
    );

    assert.deepEqual(capturedRequest?.tools, [{ google_search: {} }]);
    assert.equal(response.searchStatus, "enabled");
    assert.deepEqual(response.citations, [{ title: "Example Source", url: "https://example.com/source" }]);
  } finally {
    globalThis.fetch = previousFetch;
  }
});

type OpenAiRequestBody = {
  model: string;
  instructions: string;
  input: Array<{
    role: string;
    content: string;
  }>;
  tools?: Array<{
    type: string;
  }>;
};

type GeminiRequestBody = {
  systemInstruction: {
    parts: Array<{
      text: string;
    }>;
  };
  contents: Array<{
    role: string;
    parts: Array<{
      text: string;
    }>;
  }>;
  tools?: Array<{
    google_search: Record<string, never>;
  }>;
};
