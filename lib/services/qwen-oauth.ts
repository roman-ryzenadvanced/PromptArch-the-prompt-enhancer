import type { ChatMessage, APIResponse } from "@/types";

const DEFAULT_QWEN_ENDPOINT = "https://dashscope-intl.aliyuncs.com/compatible-mode/v1";
const TOKEN_STORAGE_KEY = "promptarch-qwen-tokens";

function getOAuthBaseUrl(): string {
  const basePath = '/tools/promptarch';
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    return `${origin}${basePath}/api/qwen`;
  }
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
    if (siteUrl.endsWith(basePath)) {
      return `${siteUrl}/api/qwen`;
    }
    return `${siteUrl}${basePath}/api/qwen`;
  }
  return `${basePath}/api/qwen`;
}

export interface QwenOAuthConfig {
  apiKey?: string;
  endpoint?: string;
  oauthBaseUrl?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  resourceUrl?: string;
}

export interface QwenOAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
  resourceUrl?: string;
}

export interface QwenDeviceAuthorization {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval?: number;
}

export class QwenOAuthService {
  private endpoint: string;
  private oauthBaseUrl: string;
  private apiKey?: string;
  private token: QwenOAuthToken | null = null;
  private storageHydrated = false;

  constructor(config: QwenOAuthConfig = {}) {
    this.endpoint = config.endpoint || DEFAULT_QWEN_ENDPOINT;
    this.oauthBaseUrl = config.oauthBaseUrl || getOAuthBaseUrl();
    this.apiKey = config.apiKey || process.env.QWEN_API_KEY || undefined;

    if (config.accessToken) {
      this.setOAuthTokens({
        accessToken: config.accessToken,
        refreshToken: config.refreshToken,
        expiresAt: config.expiresAt,
        resourceUrl: config.resourceUrl,
      });
    }
  }

  /**
   * Update the API key used for non-OAuth calls.
   */
  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  hasApiKey(): boolean {
    return !!this.apiKey;
  }

  hasOAuthToken(): boolean {
    return !!this.getTokenInfo()?.accessToken;
  }

  /**
   * Build default headers for Qwen completions (includes OAuth token refresh).
   */
  private async getRequestHeaders(): Promise<Record<string, string>> {
    console.log("[QwenOAuth] Getting request headers...");

    const token = await this.getValidToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (token?.accessToken) {
      headers["Authorization"] = `Bearer ${token.accessToken}`;
      console.log("[QwenOAuth] Using OAuth token for authorization");
      return headers;
    }

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
      console.log("[QwenOAuth] Using API key for authorization");
      return headers;
    }

    console.error("[QwenOAuth] No OAuth token or API key available");
    throw new Error("Please configure a Qwen API key or authenticate via OAuth.");
  }

  /**
   * Determine the effective API endpoint (uses token-specific resource_url if available).
   */
  private getEffectiveEndpoint(): string {
    const resourceUrl = this.token?.resourceUrl;
    if (resourceUrl) {
      const normalized = this.normalizeResourceUrl(resourceUrl);
      console.log("[Qwen] Using resource URL:", normalized);
      return normalized;
    }
    console.log("[Qwen] Using default endpoint:", this.endpoint);
    return this.endpoint;
  }

  private normalizeResourceUrl(raw: string): string {
    const trimmed = raw.trim();
    if (!trimmed) {
      return this.endpoint;
    }

    const withProtocol = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    const cleaned = withProtocol.replace(/\/$/, "");

    if (cleaned.endsWith("/v1") || cleaned.endsWith("/compatible-mode/v1")) {
      return cleaned;
    }

    return `${cleaned}/v1`;
  }

  private hydrateTokens() {
    if (this.storageHydrated || typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }

    try {
      const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      if (stored) {
        this.token = JSON.parse(stored);
      }
    } catch (error) {
      console.warn("[QwenOAuth] Failed to read tokens from localStorage:", error);
      this.token = null;
    } finally {
      this.storageHydrated = true;
    }
  }

  private getStoredToken(): QwenOAuthToken | null {
    this.hydrateTokens();
    console.log("[QwenOAuth] Retrieved stored token:", this.token ? { hasAccessToken: !!this.token.accessToken, expiresAt: this.token.expiresAt } : null);
    return this.token;
  }

  private persistToken(token: QwenOAuthToken | null) {
    if (typeof window === "undefined" || typeof window.localStorage === "undefined") {
      return;
    }

    try {
      if (token) {
        window.localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(token));
      } else {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.warn("[QwenOAuth] Failed to persist tokens to localStorage:", error);
    }
  }

  private isTokenExpired(token: QwenOAuthToken): boolean {
    if (!token.expiresAt) {
      return false;
    }
    return Date.now() >= token.expiresAt - 60_000;
  }

  /**
   * Refreshes the OAuth token using the stored refresh token.
   */
  private async refreshToken(refreshToken: string): Promise<QwenOAuthToken> {
    const response = await fetch(`${this.oauthBaseUrl}/oauth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to refresh Qwen token");
    }

    const data = await response.json();
    return this.parseTokenResponse(data);
  }

  /**
   * Returns a valid token, refreshing if necessary.
   */
  private async getValidToken(): Promise<QwenOAuthToken | null> {
    const token = this.getStoredToken();
    if (!token) {
      return null;
    }

    if (this.isTokenExpired(token)) {
      if (token.refreshToken) {
        try {
          const refreshed = await this.refreshToken(token.refreshToken);
          this.setOAuthTokens(refreshed);
          return refreshed;
        } catch (error) {
          console.error("Qwen token refresh failed", error);
          this.setOAuthTokens(undefined);
          return null;
        }
      }
      this.setOAuthTokens(undefined);
      return null;
    }

    return token;
  }

  /**
   * Sign out the OAuth session.
   */
  signOut(): void {
    this.setOAuthTokens(undefined);
  }

  /**
   * Stores OAuth tokens locally.
   */
  setOAuthTokens(tokens?: QwenOAuthToken | null) {
    if (!tokens) {
      this.token = null;
      this.persistToken(null);
      this.storageHydrated = true;
      return;
    }
    this.token = tokens;
    this.persistToken(tokens);
    this.storageHydrated = true;
  }

  /**
   * Initialize the service and hydrate tokens from storage.
   */
  initialize(): void {
    console.log("[QwenOAuth] Initializing service...");
    this.hydrateTokens();
  }

  getTokenInfo(): QwenOAuthToken | null {
    this.hydrateTokens();
    console.log("[QwenOAuth] getTokenInfo called, returning:", this.token ? { hasAccessToken: !!this.token.accessToken, expiresAt: this.token.expiresAt } : null);
    return this.token;
  }

  /**
   * Perform the OAuth device flow to obtain tokens.
   */
  async signIn(): Promise<QwenOAuthToken> {
    if (typeof window === "undefined") {
      throw new Error("Qwen OAuth is only supported in the browser");
    }

    const popup = window.open(
      "",
      "qwen-oauth",
      "width=500,height=600,scrollbars=yes,resizable=yes"
    );

    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);
    const deviceAuth = await this.requestDeviceAuthorization(codeChallenge);

    if (popup) {
      try {
        popup.location.href = deviceAuth.verification_uri_complete;
      } catch {
        // ignore cross-origin restrictions
      }
    } else {
      window.alert(
        `Open this URL to authenticate:\n${deviceAuth.verification_uri_complete}\n\nUser code: ${deviceAuth.user_code}`
      );
    }

    const expiresAt = Date.now() + deviceAuth.expires_in * 1000;
    let pollInterval = 2000;

    while (Date.now() < expiresAt) {
      const tokenData = await this.pollDeviceToken(deviceAuth.device_code, codeVerifier);

      if (tokenData?.access_token) {
        const token = this.parseTokenResponse(tokenData);
        this.setOAuthTokens(token);
        popup?.close();
        return token;
      }

      if (tokenData?.error === "authorization_pending") {
        await this.delay(pollInterval);
        continue;
      }

      if (tokenData?.error === "slow_down") {
        pollInterval = Math.min(Math.ceil(pollInterval * 1.5), 10000);
        await this.delay(pollInterval);
        continue;
      }

      throw new Error(tokenData?.error_description || tokenData?.error || "OAuth failed");
    }

    throw new Error("Qwen OAuth timed out");
  }

  async fetchUserInfo(): Promise<unknown> {
    const token = await this.getValidToken();
    if (!token?.accessToken) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(`${this.oauthBaseUrl}/user`, {
      headers: {
        Authorization: `Bearer ${token.accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Failed to fetch user info");
    }

    return await response.json();
  }

  private async requestDeviceAuthorization(codeChallenge: string): Promise<QwenDeviceAuthorization> {
    const response = await fetch(`${this.oauthBaseUrl}/oauth/device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "Device authorization failed");
    }

    return await response.json();
  }

  private async pollDeviceToken(deviceCode: string, codeVerifier: string): Promise<any> {
    const response = await fetch(`${this.oauthBaseUrl}/oauth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_code: deviceCode,
        code_verifier: codeVerifier,
      }),
    });

    return await response.json();
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private parseTokenResponse(data: any): QwenOAuthToken {
    console.log("[QwenOAuth] Token response received:", data);

    const token: QwenOAuthToken = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: data.expires_in ? Date.now() + data.expires_in * 1000 : undefined,
    };

    if (data.resource_url) {
      token.resourceUrl = data.resource_url;
      console.log("[QwenOAuth] Using resource_url from response:", data.resource_url);
    } else if (data.endpoint) {
      token.resourceUrl = data.endpoint;
      console.log("[QwenOAuth] Using endpoint from response:", data.endpoint);
    } else if (data.resource_server) {
      token.resourceUrl = `https://${data.resource_server}/compatible-mode/v1`;
      console.log("[QwenOAuth] Using resource_server from response:", data.resource_server);
    } else {
      console.log("[QwenOAuth] No resource_url/endpoint in response, will use default Qwen endpoint");
      console.log("[QwenOAuth] Available fields in response:", Object.keys(data));
    }

    console.log("[QwenOAuth] Parsed token:", { hasAccessToken: !!token.accessToken, hasRefreshToken: !!token.refreshToken, hasResourceUrl: !!token.resourceUrl, expiresAt: token.expiresAt });
    return token;
  }

  /**
   * Generate a PKCE code verifier.
   */
  private generateCodeVerifier(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return this.toBase64Url(array);
  }

  /**
   * Generate a PKCE code challenge.
   */
  private async generateCodeChallenge(verifier: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(verifier);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return this.toBase64Url(new Uint8Array(digest));
  }

  private toBase64Url(bytes: Uint8Array): string {
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = "coder-model",
    stream: boolean = false
  ): Promise<APIResponse<string>> {
    try {
      const headers = await this.getRequestHeaders();
      const baseUrl = this.getEffectiveEndpoint();
      const url = `${this.oauthBaseUrl}/chat`;

      console.log("[Qwen] Chat completion request:", { url, model, hasAuth: !!headers.Authorization });

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: headers.Authorization || "",
        },
        body: JSON.stringify({
          endpoint: baseUrl,
          model,
          messages,
          stream,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Qwen] Chat completion failed:", response.status, response.statusText, errorText);
        throw new Error(`Chat completion failed (${response.status}): ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      if (data.choices?.[0]?.message) {
        return { success: true, data: data.choices[0].message.content };
      }

      return { success: false, error: "Unexpected response format" };
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

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
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

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
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

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
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

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
  }

  async listModels(): Promise<APIResponse<string[]>> {
    const models = [
      "coder-model",
    ];
    return { success: true, data: models };
  }

  getAvailableModels(): string[] {
    return [
      "coder-model",
    ];
  }
}

const qwenOAuthService = new QwenOAuthService();
export default qwenOAuthService;
export { qwenOAuthService };
