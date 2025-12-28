import { create } from "zustand";
import type { ModelProvider, PromptEnhancement, PRD, ActionPlan, SlidesPresentation, GoogleAdsResult, MagicWandResult, MarketResearchResult, AppView, AIAssistMessage } from "@/types";

interface AIAssistTab {
  id: string;
  title: string;
  history: AIAssistMessage[];
  currentAgent: string;
  previewData?: any | null;
  showCanvas?: boolean;
}

interface AppState {
  currentPrompt: string;
  enhancedPrompt: string | null;
  prd: PRD | null;
  actionPlan: ActionPlan | null;
  slidesPresentation: SlidesPresentation | null;
  googleAdsResult: GoogleAdsResult | null;
  magicWandResult: MagicWandResult | null;
  marketResearchResult: MarketResearchResult | null;

  // AI Assist Tabs
  aiAssistTabs: AIAssistTab[];
  activeTabId: string | null;

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
  setMarketResearchResult: (result: MarketResearchResult | null) => void;

  // Tab Management
  setAIAssistTabs: (tabs: AIAssistTab[]) => void;
  setActiveTabId: (id: string | null) => void;
  addAIAssistTab: (agent?: string) => void;
  removeAIAssistTab: (id: string) => void;
  updateActiveTab: (updates: Partial<AIAssistTab>) => void;
  updateTabById: (tabId: string, updates: Partial<AIAssistTab>) => void;

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
  marketResearchResult: null,

  aiAssistTabs: [{
    id: "default",
    title: "New Chat",
    history: [],
    currentAgent: "general"
  }],
  activeTabId: "default",

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
  setMarketResearchResult: (result) => set({ marketResearchResult: result }),

  setAIAssistTabs: (tabs) => set({ aiAssistTabs: tabs }),
  setActiveTabId: (id) => set({ activeTabId: id }),
  addAIAssistTab: (agent = "general") => set((state) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newTab = {
      id: newId,
      title: `Chat ${state.aiAssistTabs.length + 1}`,
      history: [],
      currentAgent: agent
    };
    return {
      aiAssistTabs: [...state.aiAssistTabs, newTab],
      activeTabId: newId
    };
  }),
  removeAIAssistTab: (id) => set((state) => {
    const newTabs = state.aiAssistTabs.filter(t => t.id !== id);
    let nextActiveId = state.activeTabId;
    if (state.activeTabId === id) {
      nextActiveId = newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null;
    }
    return {
      aiAssistTabs: newTabs,
      activeTabId: nextActiveId
    };
  }),
  updateActiveTab: (updates) => set((state) => ({
    aiAssistTabs: state.aiAssistTabs.map(t =>
      t.id === state.activeTabId ? { ...t, ...updates } : t
    )
  })),
  updateTabById: (tabId, updates) => set((state) => ({
    aiAssistTabs: state.aiAssistTabs.map(t =>
      t.id === tabId ? { ...t, ...updates } : t
    )
  })),

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
      marketResearchResult: null,
      aiAssistTabs: [{
        id: "default",
        title: "New Chat",
        history: [],
        currentAgent: "general"
      }],
      activeTabId: "default",
      error: null,
    }),
}));

export default useStore;
