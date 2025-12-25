import type { ChatMessage, APIResponse } from "@/types";

export interface OllamaCloudConfig {
  apiKey?: string;
  endpoint?: string;
}

const LOCAL_MODELS_URL = "/api/ollama/models";
const LOCAL_CHAT_URL = "/api/ollama/chat";
const DEFAULT_MODELS = [
  "gpt-oss:120b",
  "llama3.1:latest",
  "llama3.1:70b",
  "llama3.1:8b",
  "llama3.1:instruct",
  "gemma3:12b",
  "gemma3:27b",
  "gemma3:4b",
  "gemma3:7b",
  "deepseek-r1:70b",
  "deepseek-r1:32b",
  "deepseek-r1:14b",
  "deepseek-r1:8b",
  "deepseek-r1:1.5b",
  "qwen3:72b",
  "qwen3:32b",
  "qwen3:14b",
  "qwen3:7b",
  "qwen3:4b",
  "mistral:7b",
  "mistral:instruct",
  "codellama:34b",
  "codellama:13b",
  "codellama:7b",
  "codellama:instruct",
  "phi3:14b",
  "phi3:3.8b",
  "phi3:mini",
  "gemma2:27b",
  "gemma2:9b",
  "yi:34b",
  "yi:9b",
];

export class OllamaCloudService {
  private config: OllamaCloudConfig;
  private availableModels: string[] = [];

  constructor(config: OllamaCloudConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.OLLAMA_API_KEY,
      endpoint: config.endpoint,
    };
  }

  private ensureApiKey(): string {
    if (this.config.apiKey) {
      return this.config.apiKey;
    }
    throw new Error("API key is required. Please configure your Ollama API key in settings.");
  }

  private getHeaders(additional: Record<string, string> = {}) {
    const headers: Record<string, string> = {
      ...additional,
      "x-ollama-api-key": this.ensureApiKey(),
    };

    if (this.config.endpoint) {
      headers["x-ollama-endpoint"] = this.config.endpoint;
    }

    return headers;
  }

  private async parseJsonResponse(response: Response): Promise<any> {
    const text = await response.text();
    if (!text) return null;
    return JSON.parse(text);
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = "gpt-oss:120b",
    stream: boolean = false
  ): Promise<APIResponse<string>> {
    try {
      const response = await fetch(LOCAL_CHAT_URL, {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          model,
          messages,
          stream,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Chat completion failed (${response.status}): ${response.statusText} - ${errorBody}`
        );
      }

      const data = await this.parseJsonResponse(response);
      if (data?.message?.content) {
        return { success: true, data: data.message.content };
      }

      if (data?.choices?.[0]?.message?.content) {
        return { success: true, data: data.choices[0].message.content };
      }

      return { success: false, error: "Unexpected response format" };
    } catch (error) {
      console.error("[Ollama] Chat completion error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Chat completion failed",
      };
    }
  }

  async listModels(): Promise<APIResponse<string[]>> {
    try {
      const response = await fetch(LOCAL_MODELS_URL, {
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`List models failed: ${response.statusText} - ${errorBody}`);
      }

      const data = await this.parseJsonResponse(response);
      const models: string[] = Array.isArray(data?.models) ? data.models : [];

      if (models.length === 0) {
        this.availableModels = DEFAULT_MODELS;
        return { success: true, data: DEFAULT_MODELS };
      }

      this.availableModels = models;
      return { success: true, data: models };
    } catch (error) {
      console.error("[Ollama] listModels error:", error);
      if (DEFAULT_MODELS.length > 0) {
        this.availableModels = DEFAULT_MODELS;
        return { success: true, data: DEFAULT_MODELS };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list models",
      };
    }
  }

  getAvailableModels(): string[] {
    return this.availableModels.length > 0 ? this.availableModels : DEFAULT_MODELS;
  }
}

export default OllamaCloudService;
