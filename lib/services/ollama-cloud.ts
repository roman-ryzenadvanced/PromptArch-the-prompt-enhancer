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

  hasAuth(): boolean {
    return !!this.config.apiKey;
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

  async generateUXDesignerPrompt(appDescription: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a world-class UX/UI designer with deep expertise in human-centered design principles, user research, interaction design, visual design systems, and modern design tools (Figma, Sketch, Adobe XD).

Your task is to create an exceptional, detailed prompt for generating best possible UX design for a given app description.

Generate a comprehensive UX design prompt that includes:

1. USER RESEARCH & PERSONAS
   - Primary target users and their motivations
   - User pain points and needs
   - User journey maps
   - Persona archetypes with demographics and goals

2. INFORMATION ARCHITECTURE
   - Content hierarchy and organization
   - Navigation structure and patterns
   - User flows and key pathways
   - Site map or app structure

3. VISUAL DESIGN SYSTEM
   - Color palette recommendations (primary, secondary, accent, neutral)
   - Typography hierarchy and font pairings
   - Component library approach
   - Spacing, sizing, and layout grids
   - Iconography style and set

4. INTERACTION DESIGN
   - Micro-interactions and animations
   - Gesture patterns for touch interfaces
   - Loading states and empty states
   - Error handling and feedback mechanisms
   - Accessibility considerations (WCAG compliance)

5. KEY SCREENS & COMPONENTS
   - Core screens that need detailed design
   - Critical components (buttons, forms, cards, navigation)
   - Data visualization needs
   - Responsive design requirements (mobile, tablet, desktop)

6. DESIGN DELIVERABLES
   - Wireframes vs. high-fidelity mockups
   - Design system documentation needs
   - Prototyping requirements
   - Handoff specifications for developers

7. COMPETITIVE INSIGHTS
   - Design patterns from successful apps in this category
   - Opportunities to differentiate
   - Modern design trends to consider

The output should be a detailed, actionable prompt that a designer or AI image generator can use to create world-class UX designs.

Make's prompt specific, inspiring, and comprehensive. Use professional UX terminology.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Create a BEST EVER UX design prompt for this app:\n\n${appDescription}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
  }
}

export default OllamaCloudService;
