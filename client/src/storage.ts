export type SavedSettings = {
  personality: string;
  speakResponses: boolean;
  selectedVoiceName: string;
  useWebSearch: boolean;
};

const SETTINGS_KEY = "local-context-chatbot:settings";

export const defaultSettings: SavedSettings = {
  personality: "Warm, curious, concise, and honest. Prefer facts from the local context folder.",
  speakResponses: true,
  selectedVoiceName: "",
  useWebSearch: false
};

export function loadSettings(): SavedSettings {
  const raw = window.localStorage.getItem(SETTINGS_KEY);
  if (!raw) {
    return defaultSettings;
  }

  try {
    return { ...defaultSettings, ...(JSON.parse(raw) as Partial<SavedSettings>) };
  } catch {
    return defaultSettings;
  }
}

export function saveSettings(settings: SavedSettings) {
  window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
