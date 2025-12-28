import type { ModelProvider, APIResponse, ChatMessage, AIAssistMessage } from "@/types";
import OllamaCloudService from "./ollama-cloud";
import ZaiPlanService from "./zai-plan";
import qwenOAuthService, { QwenOAuthConfig, QwenOAuthToken } from "./qwen-oauth";

export interface ModelAdapterConfig {
  qwen?: QwenOAuthConfig;
  ollama?: {
    apiKey?: string;
    endpoint?: string;
  };
  zai?: {
    apiKey?: string;
    generalEndpoint?: string;
    codingEndpoint?: string;
  };
}

export class ModelAdapter {
  private ollamaService: OllamaCloudService;
  private zaiService: ZaiPlanService;
  private qwenService = qwenOAuthService;
  private preferredProvider: ModelProvider;

  constructor(config: ModelAdapterConfig = {}, preferredProvider: ModelProvider = "ollama") {
    this.ollamaService = new OllamaCloudService(config.ollama);
    this.zaiService = new ZaiPlanService(config.zai);
    this.preferredProvider = preferredProvider;

    if (config.qwen) {
      if (config.qwen.apiKey) {
        this.qwenService.setApiKey(config.qwen.apiKey);
      }
      if (config.qwen.accessToken) {
        this.qwenService.setOAuthTokens({
          accessToken: config.qwen.accessToken,
          refreshToken: config.qwen.refreshToken,
          expiresAt: config.qwen.expiresAt,
          resourceUrl: config.qwen.resourceUrl,
        });
      }
    }
  }

  setPreferredProvider(provider: ModelProvider): void {
    this.preferredProvider = provider;
  }

  updateOllamaApiKey(apiKey: string): void {
    this.ollamaService = new OllamaCloudService({ apiKey });
  }

  updateZaiApiKey(apiKey: string): void {
    this.zaiService = new ZaiPlanService({ apiKey });
  }

  updateQwenApiKey(apiKey: string): void {
    this.qwenService.setApiKey(apiKey);
  }

  updateQwenTokens(tokens?: QwenOAuthToken): void {
    this.qwenService.setOAuthTokens(tokens);
  }

  async startQwenOAuth(): Promise<QwenOAuthToken> {
    return await this.qwenService.signIn();
  }

  getQwenTokenInfo(): QwenOAuthToken | null {
    return this.qwenService.getTokenInfo();
  }

  hasQwenAuth(): boolean {
    return this.qwenService.hasOAuthToken();
  }

  private isProviderAuthenticated(provider: ModelProvider): boolean {
    switch (provider) {
      case "qwen":
        return this.hasQwenAuth() || this.qwenService.hasApiKey();
      case "ollama":
        return this.ollamaService.hasAuth();
      case "zai":
        return this.zaiService.hasAuth();
      default:
        return false;
    }
  }

  private buildFallbackProviders(...providers: ModelProvider[]): ModelProvider[] {
    const seen = new Set<ModelProvider>();
    return providers.filter((provider) => {
      if (seen.has(provider)) {
        return false;
      }
      seen.add(provider);
      return true;
    });
  }

  private getService(provider: ModelProvider): any {
    switch (provider) {
      case "qwen":
        return this.qwenService;
      case "ollama":
        return this.ollamaService;
      case "zai":
        return this.zaiService;
      default:
        return null;
    }
  }

  private async callWithFallback<T>(
    operation: (service: any) => Promise<APIResponse<T>>,
    providers: ModelProvider[]
  ): Promise<APIResponse<T>> {
    console.log("[ModelAdapter] Attempting providers in order:", providers);
    let lastError: string | null = null;

    for (const provider of providers) {
      try {
        console.log(`[ModelAdapter] Checking authentication for ${provider}...`);

        if (!this.isProviderAuthenticated(provider)) {
          console.log(`[ModelAdapter] Provider ${provider} is not authenticated, skipping`);
          continue;
        }

        let service: any;

        console.log(`[ModelAdapter] Trying provider: ${provider}`);

        switch (provider) {
          case "qwen":
            service = this.qwenService;
            console.log("[ModelAdapter] Qwen service:", {
              hasApiKey: !!this.qwenService["apiKey"],
              hasToken: !!this.qwenService.getTokenInfo()?.accessToken
            });
            break;
          case "ollama":
            service = this.ollamaService;
            break;
          case "zai":
            service = this.zaiService;
            break;
        }

        const result = await operation(service);
        console.log(`[ModelAdapter] Provider ${provider} result:`, result);

        if (result.success) {
          console.log(`[ModelAdapter] Success with provider: ${provider}`);
          return result;
        }

        if (result.error) {
          lastError = result.error;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[ModelAdapter] Error with ${provider}:`, errorMessage);
        lastError = errorMessage || lastError;
      }
    }

    const finalError = lastError
      ? `All providers failed: ${lastError}`
      : "All providers failed. Please configure API key in Settings";
    console.error(`[ModelAdapter] ${finalError}`);
    return {
      success: false,
      error: finalError,
    };
  }

  async enhancePrompt(prompt: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.enhancePrompt(prompt, model), providers);
  }

  async generatePRD(idea: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generatePRD(idea, model), providers);
  }

  async generateActionPlan(prd: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateActionPlan(prd, model), providers);
  }

  async generateUXDesignerPrompt(appDescription: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateUXDesignerPrompt(appDescription, model), providers);
  }

  async generateSlides(
    topic: string,
    options: {
      language?: string;
      theme?: string;
      slideCount?: number;
      audience?: string;
      organization?: string;
      animationStyle?: string;
      audienceStyle?: string;
      themeColors?: string[];
      brandColors?: string[];
    } = {},
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateSlides(topic, options, model), providers);
  }

  async generateGoogleAds(
    websiteUrl: string,
    options: {
      productsServices: string[];
      targetAudience?: string;
      budgetRange?: { min: number; max: number; currency: string };
      campaignDuration?: string;
      industry?: string;
      competitors?: string[];
      language?: string;
      specialInstructions?: string;
    } = { productsServices: [] },
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateGoogleAds(websiteUrl, options, model), providers);
  }

  async generateMagicWand(
    websiteUrl: string,
    product: string,
    budget: number,
    specialInstructions?: string,
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateMagicWand(websiteUrl, product, budget, specialInstructions, model), providers);
  }

  async generateMarketResearch(
    options: {
      websiteUrl: string;
      additionalUrls?: string[];
      competitors: string[];
      productMapping: string;
      specialInstructions?: string;
    },
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateMarketResearch(options, model), providers);
  }

  async generateAIAssist(
    options: {
      messages: AIAssistMessage[];
      currentAgent: string;
    },
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<string>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;
    return this.callWithFallback((service) => service.generateAIAssist(options, model), providers);
  }

  async generateAIAssistStream(
    options: {
      messages: AIAssistMessage[];
      currentAgent: string;
      onChunk: (chunk: string) => void;
      signal?: AbortSignal;
    },
    provider?: ModelProvider,
    model?: string
  ): Promise<APIResponse<void>> {
    const fallback = this.buildFallbackProviders(this.preferredProvider, "qwen", "ollama", "zai");
    const providers: ModelProvider[] = provider ? [provider] : fallback;

    const activeProvider = providers.find((candidate) => {
      const service = this.getService(candidate);
      return this.isProviderAuthenticated(candidate) && !!service?.generateAIAssistStream;
    });
    if (!activeProvider) {
      return { success: false, error: "No authenticated providers available for streaming" };
    }

    const service = this.getService(activeProvider);

    if (!service || !service.generateAIAssistStream) {
      return { success: false, error: "Streaming not supported for this provider" };
    }

    return await service.generateAIAssistStream(options, model);
  }


  async chatCompletion(
    messages: ChatMessage[],
    model: string,
    provider: ModelProvider = this.preferredProvider
  ): Promise<APIResponse<string>> {
    try {
      let service: any;

      switch (provider) {
        case "qwen":
          service = this.qwenService;
          break;
        case "ollama":
          service = this.ollamaService;
          break;
        case "zai":
          service = this.zaiService;
          break;
      }

      return await service.chatCompletion(messages, model);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Chat completion failed",
      };
    }
  }

  async listModels(provider?: ModelProvider): Promise<APIResponse<Record<ModelProvider, string[]>>> {
    const fallbackModels: Record<ModelProvider, string[]> = {
      qwen: this.qwenService.getAvailableModels(),
      ollama: ["gpt-oss:120b", "llama3.1", "gemma3", "deepseek-r1", "qwen3"],
      zai: ["glm-4.7", "glm-4.5", "glm-4.5-air", "glm-4-flash", "glm-4-flashx"],
    };
    const models: Record<ModelProvider, string[]> = { ...fallbackModels };

    if (provider === "ollama" || !provider) {
      try {
        const ollamaModels = await this.ollamaService.listModels();
        if (ollamaModels.success && ollamaModels.data && ollamaModels.data.length > 0) {
          models.ollama = ollamaModels.data;
        }
      } catch (error) {
        console.error("[ModelAdapter] Failed to load Ollama models, using fallback:", error);
      }
    }
    if (provider === "zai" || !provider) {
      try {
        const zaiModels = await this.zaiService.listModels();
        if (zaiModels.success && zaiModels.data && zaiModels.data.length > 0) {
          models.zai = zaiModels.data;
        }
      } catch (error) {
        console.error("[ModelAdapter] Failed to load Z.AI models, using fallback:", error);
      }
    }

    return { success: true, data: models };
  }

  getAvailableModels(provider: ModelProvider): string[] {
    switch (provider) {
      case "qwen":
        return this.qwenService.getAvailableModels();
      case "ollama":
        return this.ollamaService.getAvailableModels();
      case "zai":
        return this.zaiService.getAvailableModels();
      default:
        return [];
    }
  }
}

export default ModelAdapter;
