import type { ChatMessage, APIResponse } from "@/types";

export interface OllamaCloudConfig {
  apiKey?: string;
  endpoint?: string;
}

export interface OllamaModel {
  name: string;
  size?: number;
  digest?: string;
}

export class OllamaCloudService {
  private config: OllamaCloudConfig;
  private availableModels: string[] = [];

  constructor(config: OllamaCloudConfig = {}) {
    this.config = {
      endpoint: config.endpoint || "https://ollama.com/api",
      apiKey: config.apiKey || process.env.OLLAMA_API_KEY,
    };
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    return headers;
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = "gpt-oss:120b",
    stream: boolean = false
  ): Promise<APIResponse<string>> {
    try {
      if (!this.config.apiKey) {
        throw new Error("API key is required. Please configure your Ollama API key in settings.");
      }

      console.log("[Ollama] API call:", { endpoint: this.config.endpoint, model, messages });

      const response = await fetch(`${this.config.endpoint}/chat`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream,
        }),
      });

      console.log("[Ollama] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Ollama] Error response:", errorText);
        throw new Error(`Chat completion failed (${response.status}): ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("[Ollama] Response data:", data);
      
      if (data.message && data.message.content) {
        return { success: true, data: data.message.content };
      } else if (data.choices && data.choices[0]) {
        return { success: true, data: data.choices[0].message.content };
      } else {
        return { success: false, error: "Unexpected response format" };
      }
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
      if (this.config.apiKey) {
        console.log("[Ollama] Listing models from:", `${this.config.endpoint}/tags`);

        const response = await fetch(`${this.config.endpoint}/tags`, {
          headers: this.getHeaders(),
        });

        console.log("[Ollama] List models response status:", response.status, response.statusText);

        if (!response.ok) {
          throw new Error(`Failed to list models: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[Ollama] Models data:", data);
        const models = data.models?.map((m: OllamaModel) => m.name) || [];
        
        this.availableModels = models;
        
        return { success: true, data: models };
      } else {
        console.log("[Ollama] No API key, using fallback models");
        return { success: true, data: ["gpt-oss:120b", "llama3.1", "gemma3", "deepseek-r1", "qwen3"] };
      }
    } catch (error) {
      console.error("[Ollama] listModels error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list models",
      };
    }
  }

  getAvailableModels(): string[] {
    return this.availableModels.length > 0 
      ? this.availableModels 
      : ["gpt-oss:120b", "llama3.1", "gemma3", "deepseek-r1", "qwen3"];
  }

  async enhancePrompt(prompt: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an expert prompt engineer. Your task is to enhance user prompts to make them more precise, actionable, and effective for AI coding agents.

Apply these principles:
1. Add specific context about project and requirements
2. Clarify constraints and preferences
3. Define expected output format clearly
4. Include edge cases and error handling requirements
5. Specify testing and validation criteria

Return ONLY the enhanced prompt, no explanations.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Enhance this prompt for an AI coding agent:\n\n${prompt}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
  }

  async generatePRD(idea: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an expert product manager and technical architect. Generate a comprehensive Product Requirements Document (PRD) based on user's idea.

Structure your PRD with these sections:
1. Overview & Objectives
2. User Personas & Use Cases
3. Functional Requirements (prioritized)
4. Non-functional Requirements
5. Technical Architecture Recommendations
6. Success Metrics & KPIs

Use clear, specific language suitable for development teams.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Generate a PRD for this idea:\n\n${idea}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
  }

  async generateActionPlan(prd: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an expert technical lead and project manager. Generate a detailed action plan based on PRD.

Structure of action plan with:
1. Task breakdown with priorities (High/Medium/Low)
2. Dependencies between tasks
3. Estimated effort for each task
4. Recommended frameworks and technologies
5. Architecture guidelines and best practices

Include specific recommendations for:
- Frontend frameworks
- Backend architecture
- Database choices
- Authentication/authorization
- Deployment strategy`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Generate an action plan based on this PRD:\n\n${prd}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
  }
}

export default OllamaCloudService;
