import type { ModelProvider, APIResponse, ChatMessage } from "@/types";
import QwenOAuthService from "./qwen-oauth";
import OllamaCloudService from "./ollama-cloud";
import ZaiPlanService from "./zai-plan";

export interface ModelAdapterConfig {
  qwen?: {
    apiKey?: string;
    endpoint?: string;
  };
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
  private qwenService: QwenOAuthService;
  private ollamaService: OllamaCloudService;
  private zaiService: ZaiPlanService;
  private preferredProvider: ModelProvider;

  constructor(config: ModelAdapterConfig = {}, preferredProvider: ModelProvider = "qwen") {
    this.qwenService = new QwenOAuthService(config.qwen);
    this.ollamaService = new OllamaCloudService(config.ollama);
    this.zaiService = new ZaiPlanService(config.zai);
    this.preferredProvider = preferredProvider;
  }

  setPreferredProvider(provider: ModelProvider): void {
    this.preferredProvider = provider;
  }

  updateQwenApiKey(apiKey: string): void {
    this.qwenService = new QwenOAuthService({ apiKey });
  }

  setQwenOAuthTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    this.qwenService.setOAuthTokens(accessToken, refreshToken, expiresIn);
  }

  getQwenAuthUrl(): string {
    return this.qwenService.getAuthorizationUrl();
  }

  updateOllamaApiKey(apiKey: string): void {
    this.ollamaService = new OllamaCloudService({ apiKey });
  }

  updateZaiApiKey(apiKey: string): void {
    this.zaiService = new ZaiPlanService({ apiKey });
  }

  private async callWithFallback<T>(
    operation: (service: any) => Promise<APIResponse<T>>,
    providers: ModelProvider[]
  ): Promise<APIResponse<T>> {
    for (const provider of providers) {
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

        const result = await operation(service);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.error(`Error with ${provider}:`, error);
      }
    }

    return {
      success: false,
      error: "All providers failed",
    };
  }

  async enhancePrompt(prompt: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const providers: ModelProvider[] = provider ? [provider] : [this.preferredProvider, "ollama", "zai"];
    return this.callWithFallback((service) => service.enhancePrompt(prompt, model), providers);
  }

  async generatePRD(idea: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const providers: ModelProvider[] = provider ? [provider] : ["ollama", "zai", this.preferredProvider];
    return this.callWithFallback((service) => service.generatePRD(idea, model), providers);
  }

  async generateActionPlan(prd: string, provider?: ModelProvider, model?: string): Promise<APIResponse<string>> {
    const providers: ModelProvider[] = provider ? [provider] : ["zai", "ollama", this.preferredProvider];
    return this.callWithFallback((service) => service.generateActionPlan(prd, model), providers);
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
      qwen: ["qwen-coder-plus", "qwen-coder-turbo", "qwen-coder-lite"],
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
    if (provider === "qwen" || !provider) {
      try {
        const qwenModels = await this.qwenService.listModels();
        if (qwenModels.success && qwenModels.data && qwenModels.data.length > 0) {
          models.qwen = qwenModels.data;
        }
      } catch (error) {
        console.error("[ModelAdapter] Failed to load Qwen models, using fallback:", error);
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
