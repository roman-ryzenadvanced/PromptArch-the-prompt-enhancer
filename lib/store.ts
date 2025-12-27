import { create } from "zustand";
import type { ModelProvider, PromptEnhancement, PRD, ActionPlan, SlidesPresentation, GoogleAdsResult, MagicWandResult } from "@/types";

interface AppState {
  currentPrompt: string;
  enhancedPrompt: string | null;
  prd: PRD | null;
  actionPlan: ActionPlan | null;
  slidesPresentation: SlidesPresentation | null;
  googleAdsResult: GoogleAdsResult | null;
  magicWandResult: MagicWandResult | null;
  language: "en" | "ru" | "he";
  selectedProvider: ModelProvider;
  selectedModels: Record<ModelProvider, string>;
  availableModels: Record<ModelProvider, string[]>;
  apiKeys: Record<ModelProvider, string>;
  qwenTokens?: {
    accessToken: string;
    refreshToken?: string;
    expiresAt?: number;
  } | null;
  isProcessing: boolean;
  error: string | null;
  history: {
    id: string;
    prompt: string;
    timestamp: Date;
  }[];

  setCurrentPrompt: (prompt: string) => void;
  setEnhancedPrompt: (enhanced: string | null) => void;
  setPRD: (prd: PRD) => void;
  setActionPlan: (plan: ActionPlan) => void;
  setSlidesPresentation: (slides: SlidesPresentation | null) => void;
  setGoogleAdsResult: (result: GoogleAdsResult | null) => void;
  setMagicWandResult: (result: MagicWandResult | null) => void;
  setLanguage: (lang: "en" | "ru" | "he") => void;
  setSelectedProvider: (provider: ModelProvider) => void;
  setSelectedModel: (provider: ModelProvider, model: string) => void;
  setAvailableModels: (provider: ModelProvider, models: string[]) => void;
  setApiKey: (provider: ModelProvider, key: string) => void;
  setQwenTokens: (tokens?: { accessToken: string; refreshToken?: string; expiresAt?: number } | null) => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
  addToHistory: (prompt: string) => void;
  clearHistory: () => void;
  reset: () => void;
}

const useStore = create<AppState>((set) => ({
  currentPrompt: "",
  enhancedPrompt: null,
  prd: null,
  actionPlan: null,
  slidesPresentation: null,
  googleAdsResult: null,
  magicWandResult: null,
  language: "en",
  selectedProvider: "qwen",
  selectedModels: {
    qwen: "coder-model",
    ollama: "gpt-oss:120b",
    zai: "glm-4.7",
  },
  availableModels: {
    qwen: ["coder-model"],
    ollama: ["gpt-oss:120b", "llama3.1", "gemma3", "deepseek-r1", "qwen3"],
    zai: ["glm-4.7", "glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4-flash", "glm-4-flashx"],
  },
  apiKeys: {
    qwen: "",
    ollama: "",
    zai: "",
  },
  isProcessing: false,
  error: null,
  history: [],

  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  setEnhancedPrompt: (enhanced) => set({ enhancedPrompt: enhanced }),
  setPRD: (prd) => set({ prd }),
  setActionPlan: (plan) => set({ actionPlan: plan }),
  setSlidesPresentation: (slides) => set({ slidesPresentation: slides }),
  setGoogleAdsResult: (result) => set({ googleAdsResult: result }),
  setMagicWandResult: (result) => set({ magicWandResult: result }),
  setLanguage: (lang) => set({ language: lang }),
  setSelectedProvider: (provider) => set({ selectedProvider: provider }),
  setSelectedModel: (provider, model) =>
    set((state) => ({
      selectedModels: { ...state.selectedModels, [provider]: model },
    })),
  setAvailableModels: (provider, models) =>
    set((state) => ({
      availableModels: { ...state.availableModels, [provider]: models },
    })),
  setApiKey: (provider, key) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
    })),
  setQwenTokens: (tokens) => set({ qwenTokens: tokens }),
  setProcessing: (processing) => set({ isProcessing: processing }),
  setError: (error) => set({ error }),
  addToHistory: (prompt) =>
    set((state) => ({
      history: [
        ...state.history,
        {
          id: Math.random().toString(36).substr(2, 9),
          prompt,
          timestamp: new Date(),
        },
      ],
    })),
  clearHistory: () => set({ history: [] }),
  reset: () =>
    set({
      currentPrompt: "",
      enhancedPrompt: null,
      prd: null,
      actionPlan: null,
      slidesPresentation: null,
      googleAdsResult: null,
      magicWandResult: null,
      error: null,
    }),
}));

export default useStore;
