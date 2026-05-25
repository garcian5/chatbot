<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { fetchContextFiles, fetchProviderStatus, sendChat, type ChatMessage, type Citation, type ContextFile } from "./api";
import { defaultSettings, loadSettings, saveSettings } from "./storage";

type UiMessage = ChatMessage & {
  id: string;
  citations?: Citation[];
};

const settings = ref(loadSettings());
const messages = ref<UiMessage[]>([
  {
    id: crypto.randomUUID(),
    role: "assistant",
    content: "I am ready. Add facts to the context folder, define my personality, then ask away."
  }
]);
const draft = ref("");
const contextFiles = ref<ContextFile[]>([]);
const voices = ref<SpeechSynthesisVoice[]>([]);
const isSending = ref(false);
const isListening = ref(false);
const errorMessage = ref("");
const providerLabel = ref("unknown");
const modelLabel = ref("unknown");
const searchStatus = ref<"disabled" | "not_configured" | "enabled">("disabled");

const speechRecognitionSupported = computed(() => Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
const speechSynthesisSupported = computed(() => "speechSynthesis" in window);
const SPEECH_SILENCE_TIMEOUT_MS = 1500;

let activeRecognition: SpeechRecognition | null = null;
let silenceTimer: number | undefined;
let stopRequested = false;

watch(
  settings,
  (value) => {
    saveSettings(value);
  },
  { deep: true }
);

onMounted(async () => {
  contextFiles.value = await fetchContextFiles();
  const providerStatus = await fetchProviderStatus();
  providerLabel.value = providerStatus.provider;
  modelLabel.value = providerStatus.model;
  loadVoices();

  if (speechSynthesisSupported.value) {
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
  }
});

onBeforeUnmount(() => {
  stopRequested = true;
  clearSilenceTimer();
  activeRecognition?.stop();
  activeRecognition = null;
});

async function submitMessage() {
  const content = draft.value.trim();
  if (!content || isSending.value) {
    return;
  }

  errorMessage.value = "";
  isSending.value = true;
  draft.value = "";

  const userMessage: UiMessage = {
    id: crypto.randomUUID(),
    role: "user",
    content
  };

  messages.value.push(userMessage);

  try {
    const response = await sendChat({
      messages: messages.value.map(({ role, content }) => ({ role, content })),
      personality: settings.value.personality,
      useWebSearch: settings.value.useWebSearch
    });
    const assistantMessage: UiMessage = {
      id: crypto.randomUUID(),
      ...response.message,
      citations: response.citations
    };

    messages.value.push(assistantMessage);
    providerLabel.value = response.provider;
    modelLabel.value = response.model;
    searchStatus.value = response.searchStatus;
    contextFiles.value = response.contextFiles.map((name) => ({ name, characters: 0 }));

    if (settings.value.speakResponses) {
      speak(assistantMessage.content);
    }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : "The chat request failed.";
  } finally {
    isSending.value = false;
  }
}

function resetConversation() {
  messages.value = [
    {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "Conversation reset. I still have access to the local context folder."
    }
  ];
  errorMessage.value = "";
}

function resetPersonality() {
  settings.value.personality = defaultSettings.personality;
}

function loadVoices() {
  if (!speechSynthesisSupported.value) {
    return;
  }

  voices.value = window.speechSynthesis.getVoices().sort((left, right) => left.name.localeCompare(right.name));

  if (!settings.value.selectedVoiceName && voices.value[0]) {
    settings.value.selectedVoiceName = voices.value[0].name;
  }
}

function speak(text: string) {
  if (!speechSynthesisSupported.value) {
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const selectedVoice = voices.value.find((voice) => voice.name === settings.value.selectedVoiceName);
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }
  window.speechSynthesis.speak(utterance);
}

function startListening() {
  const Recognition = window.SpeechRecognition ?? window.webkitSpeechRecognition;
  if (!Recognition || isListening.value) {
    return;
  }

  const recognition = new Recognition();
  let baseDraft = draft.value.trim();
  let currentRecognitionTranscript = "";

  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";
  activeRecognition = recognition;
  stopRequested = false;
  isListening.value = true;

  recognition.onresult = (event) => {
    currentRecognitionTranscript = Array.from(event.results)
      .map((result) => result[0]?.transcript)
      .filter(Boolean)
      .join(" ");
    draft.value = [baseDraft, currentRecognitionTranscript].filter(Boolean).join(" ").trim();

    if (hasFinalSpeechResult(event)) {
      scheduleSilenceStop(recognition);
    } else {
      clearSilenceTimer();
    }
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech") {
      stopRequested = true;
      return;
    }

    if (event.error === "aborted" && stopRequested) {
      return;
    }

    stopRequested = true;
    errorMessage.value = `Speech recognition failed: ${event.error}`;
  };

  recognition.onsoundstart = () => {
    clearSilenceTimer();
  };

  recognition.onspeechstart = () => {
    clearSilenceTimer();
  };

  recognition.onspeechend = () => {
    scheduleSilenceStop(recognition);
  };

  recognition.onsoundend = () => {
    scheduleSilenceStop(recognition);
  };

  recognition.onend = () => {
    if (activeRecognition !== recognition) {
      return;
    }

    if (!stopRequested) {
      try {
        baseDraft = draft.value.trim();
        currentRecognitionTranscript = "";
        recognition.start();
        return;
      } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : "Speech recognition failed to restart.";
      }
    }

    clearSilenceTimer();
    activeRecognition = null;
    isListening.value = false;
  };

  try {
    recognition.start();
  } catch (error) {
    clearSilenceTimer();
    activeRecognition = null;
    isListening.value = false;
    errorMessage.value = error instanceof Error ? error.message : "Speech recognition failed to start.";
  }
}

function scheduleSilenceStop(recognition: SpeechRecognition) {
  clearSilenceTimer();
  silenceTimer = window.setTimeout(() => {
    if (activeRecognition !== recognition) {
      return;
    }

    stopRequested = true;
    recognition.stop();
  }, SPEECH_SILENCE_TIMEOUT_MS);
}

function hasFinalSpeechResult(event: SpeechRecognitionEvent): boolean {
  return Array.from(event.results).some((result) => result.isFinal);
}

function clearSilenceTimer() {
  if (silenceTimer === undefined) {
    return;
  }

  window.clearTimeout(silenceTimer);
  silenceTimer = undefined;
}
</script>

<template>
  <main class="app-shell">
    <section class="chat-panel" aria-label="Chat">
      <header class="top-bar">
        <div>
          <h1>Local Context Chatbot</h1>
          <p>{{ contextFiles.length }} context file{{ contextFiles.length === 1 ? "" : "s" }} loaded | {{ providerLabel }} | {{ modelLabel }}</p>
        </div>
        <button class="icon-button" type="button" title="Reset conversation" aria-label="Reset conversation" @click="resetConversation">
          Reset
        </button>
      </header>

      <div class="message-list" aria-live="polite">
        <article v-for="message in messages" :key="message.id" class="message" :class="message.role">
          <span class="message-role">{{ message.role }}</span>
          <p>{{ message.content }}</p>
          <div v-if="message.citations?.length" class="citations">
            <a v-for="citation in message.citations" :key="citation.url" :href="citation.url" target="_blank" rel="noreferrer">
              {{ citation.title }}
            </a>
          </div>
        </article>
      </div>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <form class="composer" @submit.prevent="submitMessage">
        <textarea v-model="draft" rows="3" placeholder="Ask about your local context..." />
        <div class="composer-actions">
          <button
            class="icon-button"
            type="button"
            :disabled="!speechRecognitionSupported || isListening"
            :title="speechRecognitionSupported ? 'Dictate message' : 'Speech recognition is not supported in this browser'"
            aria-label="Dictate message"
            @click="startListening"
          >
            Mic
          </button>
          <button class="primary-button" type="submit" :disabled="isSending || !draft.trim()">
            {{ isSending ? "Sending" : "Send" }}
          </button>
        </div>
      </form>
    </section>

    <aside class="settings-panel" aria-label="Chat settings">
      <section>
        <h2>AI Model</h2>
        <p class="status">Provider: {{ providerLabel }}</p>
        <p class="status">Model: {{ modelLabel }}</p>
      </section>

      <section>
        <div class="section-heading">
          <h2>Personality</h2>
          <button type="button" @click="resetPersonality">Reset</button>
        </div>
        <textarea v-model="settings.personality" rows="7" />
      </section>

      <section>
        <h2>Voice</h2>
        <label>
          Browser voice
          <select v-model="settings.selectedVoiceName" :disabled="!speechSynthesisSupported">
            <option v-for="voice in voices" :key="voice.name" :value="voice.name">
              {{ voice.name }} | {{ voice.lang }}
            </option>
          </select>
        </label>
        <label class="toggle-row">
          <input v-model="settings.speakResponses" type="checkbox" />
          Speak assistant replies
        </label>
      </section>

      <section>
        <h2>Search</h2>
        <label class="toggle-row">
          <input v-model="settings.useWebSearch" type="checkbox" />
          Request web search
        </label>
        <p class="status">Status: {{ searchStatus }}</p>
      </section>

      <section>
        <h2>Context</h2>
        <ul class="context-list">
          <li v-for="file in contextFiles" :key="file.name">{{ file.name }}</li>
          <li v-if="contextFiles.length === 0">No context files found.</li>
        </ul>
      </section>
    </aside>
  </main>
</template>
