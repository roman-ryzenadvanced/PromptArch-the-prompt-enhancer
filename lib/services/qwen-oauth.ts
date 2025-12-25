import type { ChatMessage, APIResponse } from "@/types";

export interface QwenOAuthConfig {
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  endpoint?: string;
  clientId?: string;
  redirectUri?: string;
}

export class QwenOAuthService {
  private config: QwenOAuthConfig;

  constructor(config: QwenOAuthConfig = {}) {
    this.config = {
      endpoint: config.endpoint || "https://dashscope-intl.aliyuncs.com/compatible-mode/v1",
      apiKey: config.apiKey || process.env.QWEN_API_KEY,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      expiresAt: config.expiresAt,
      clientId: config.clientId || process.env.NEXT_PUBLIC_QWEN_CLIENT_ID,
      redirectUri: config.redirectUri || (typeof window !== "undefined" ? window.location.origin : ""),
    };
  }

  private getHeaders(): Record<string, string> {
    const authHeader = this.config.accessToken 
      ? `Bearer ${this.config.accessToken}` 
      : `Bearer ${this.config.apiKey}`;

    return {
      "Content-Type": "application/json",
      "Authorization": authHeader,
    };
  }

  isAuthenticated(): boolean {
    return !!(this.config.apiKey || (this.config.accessToken && (!this.config.expiresAt || this.config.expiresAt > Date.now())));
  }

  getAccessToken(): string | null {
    return this.config.accessToken || this.config.apiKey || null;
  }

  async authenticate(apiKey: string): Promise<APIResponse<string>> {
    try {
      this.config.apiKey = apiKey;
      this.config.accessToken = undefined; // Clear OAuth token if API key is provided
      return { success: true, data: "Authenticated successfully" };
    } catch (error) {
      console.error("Qwen authentication error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  setOAuthTokens(accessToken: string, refreshToken?: string, expiresIn?: number): void {
    this.config.accessToken = accessToken;
    if (refreshToken) this.config.refreshToken = refreshToken;
    if (expiresIn) this.config.expiresAt = Date.now() + expiresIn * 1000;
  }

  getAuthorizationUrl(): string {
    const baseUrl = "https://dashscope.console.aliyun.com/oauth/authorize"; // Placeholder URL
    const params = new URLSearchParams({
      client_id: this.config.clientId || "",
      redirect_uri: this.config.redirectUri || "",
      response_type: "code",
      scope: "dashscope:chat",
    });
    return `${baseUrl}?${params.toString()}`;
  }

  async logout(): Promise<void> {
    this.config.apiKey = undefined;
    this.config.accessToken = undefined;
    this.config.refreshToken = undefined;
    this.config.expiresAt = undefined;
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = "qwen-coder-plus",
    stream: boolean = false
  ): Promise<APIResponse<string>> {
    try {
      if (!this.config.apiKey) {
        throw new Error("API key is required. Please configure your Qwen API key in settings.");
      }

      console.log("[Qwen] API call:", { endpoint: this.config.endpoint, model, messages });

      const response = await fetch(`${this.config.endpoint}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream,
        }),
      });

      console.log("[Qwen] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Qwen] Error response:", errorText);
        throw new Error(`Chat completion failed (${response.status}): ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("[Qwen] Response data:", data);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return { success: true, data: data.choices[0].message.content };
      } else {
        return { success: false, error: "Unexpected response format" };
      }
    } catch (error) {
      console.error("[Qwen] Chat completion error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Chat completion failed",
      };
    }
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

Return ONLY the enhanced prompt, no explanations or extra text.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Enhance this prompt for an AI coding agent:\n\n${prompt}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "qwen-coder-plus");
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

    return this.chatCompletion([systemMessage, userMessage], model || "qwen-coder-plus");
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

    return this.chatCompletion([systemMessage, userMessage], model || "qwen-coder-plus");
  }

  async listModels(): Promise<APIResponse<string[]>> {
    const models = ["qwen-coder-plus", "qwen-coder-turbo", "qwen-coder-lite", "qwen-plus", "qwen-turbo", "qwen-max"];
    return { success: true, data: models };
  }

  getAvailableModels(): string[] {
    return ["qwen-coder-plus", "qwen-coder-turbo", "qwen-coder-lite", "qwen-plus", "qwen-turbo", "qwen-max"];
  }
}

export default QwenOAuthService;
