import type { ChatMessage, APIResponse, AIAssistMessage } from "@/types";

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
    model?: string
  ): Promise<APIResponse<string>> {
    const {
      language = "English",
      theme = "executive-dark",
      slideCount = 10,
      audience = "Executives & C-Suite",
      organization = "",
      animationStyle = "Professional",
      audienceStyle = "Sophisticated, data-driven, strategic focus",
      themeColors = ["#09090b", "#6366f1", "#a855f7", "#fafafa"],
      brandColors = []
    } = options;

    const [bgColor, primaryColor, secondaryColor, textColor] = themeColors;
    const brandColorStr = brandColors.length > 0
      ? `\nBRAND COLORS TO USE: ${brandColors.join(", ")}`
      : "";

    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a WORLD-CLASS presentation designer who creates STUNNING, AWARD-WINNING slide decks that rival McKinsey, Apple, and TED presentations.

Your slides must be VISUALLY SPECTACULAR with:
- Modern CSS3 animations (fade-in, slide-in, scale, parallax effects)
- Sophisticated gradient backgrounds with depth
- SVG charts and data visualizations inline
- Glassmorphism and neumorphism effects
- Professional typography with Inter/SF Pro fonts
- Strategic use of whitespace
- Micro-animations on hover/focus states
- Progress indicators and visual hierarchy

OUTPUT FORMAT - Return ONLY valid JSON:
\`\`\`json
{
  "title": "Presentation Title",
  "subtitle": "Compelling Subtitle",
  "theme": "${theme}",
  "language": "${language}",
  "slides": [
    {
      "id": "slide-1",
      "title": "Slide Title",
      "content": "Plain text content summary",
      "htmlContent": "<div>FULL HTML with inline CSS and animations</div>",
      "notes": "Speaker notes",
      "layout": "title|content|two-column|chart|statistics|timeline|quote|comparison",
      "order": 1
    }
  ]
}
\`\`\`

DESIGN SYSTEM:
- Primary: ${brandColors[0] || primaryColor}
- Secondary: ${brandColors[1] || secondaryColor}
- Background: ${bgColor}
- Text: ${textColor}${brandColorStr}

ANIMATION STYLE: ${animationStyle}
- Professional: Subtle 0.3-0.5s ease transitions, fade and slide
- Dynamic: 0.5-0.8s spring animations, emphasis effects, stagger delays
- Impressive: Bold 0.8-1.2s animations, parallax, morphing, particle effects

CSS ANIMATIONS TO INCLUDE:
\`\`\`css
@keyframes fadeInUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideInLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
@keyframes scaleIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
\`\`\`

SLIDE TYPES TO CREATE:
1. TITLE SLIDE: Hero-style with animated gradient background, large typography
2. AGENDA/OVERVIEW: Icon grid with staggered fade-in animations
3. DATA/CHARTS: Inline SVG bar/line/pie charts with animated drawing effects
4. KEY METRICS: Large animated numbers with KPI cards
5. TIMELINE: Horizontal/vertical timeline with sequential reveal animations
6. COMPARISON: Side-by-side cards with hover lift effects
7. QUOTE: Large typography with decorative quote marks
8. CALL-TO-ACTION: Bold CTA with pulsing button effect

TARGET AUDIENCE: ${audience}
AUDIENCE STYLE: ${audienceStyle}
${organization ? `ORGANIZATION BRANDING: ${organization}` : ""}

REQUIREMENTS:
- Create EXACTLY ${slideCount} slides
- ALL content in ${language}
- Each slide MUST have complete htmlContent with inline <style> tags
- Use animation-delay for staggered reveal effects
- Include decorative background elements (gradients, shapes)
- Ensure text contrast meets WCAG AA standards
- Add subtle shadow/glow effects for depth`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Create a STUNNING, ANIMATED presentation about:

${topic}

SPECIFICATIONS:
- Language: ${language}
- Theme: ${theme}
- Slides: ${slideCount}
- Audience: ${audience} (${audienceStyle})
- Animation Style: ${animationStyle}
${organization ? `- Organization: ${organization}` : ""}
${brandColors.length > 0 ? `- Brand Colors: ${brandColors.join(", ")}` : ""}

Generate SPECTACULAR slides with CSS3 animations, SVG charts, modern gradients, and corporate-ready design!`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
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
    model?: string
  ): Promise<APIResponse<string>> {
    const {
      productsServices = [],
      targetAudience = "General consumers",
      budgetRange,
      campaignDuration,
      industry = "General",
      competitors = [],
      language = "English",
      specialInstructions = ""
    } = options;

    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an EXPERT Google Ads strategist. Create HIGH-CONVERTING campaigns with comprehensive keyword research, compelling ad copy, and optimized campaign structures.

OUTPUT FORMAT - Return ONLY valid JSON with this structure:
\`\`\`json
{
  "keywords": {
    "primary": [{"keyword": "term", "type": "primary", "searchVolume": 12000, "competition": "medium", "cpc": "$2.50"}],
    "longTail": [{"keyword": "specific term", "type": "long-tail", "searchVolume": 1200, "competition": "low", "cpc": "$1.25"}],
    "negative": [{"keyword": "exclude term", "type": "negative", "competition": "low"}]
  },
  "adCopies": [{
    "id": "ad-1",
    "campaignType": "search",
    "headlines": ["Headline 1 (30 chars)", "Headline 2", "Headline 3"],
    "descriptions": ["Description 1 (90 chars)", "Description 2"],
    "callToAction": "Get Started",
    "mobileOptimized": true
  }],
  "campaigns": [{
    "id": "campaign-1",
    "name": "Campaign Name",
    "type": "search",
    "budget": {"daily": 50, "monthly": 1500, "currency": "USD"},
    "targeting": {"locations": [], "demographics": [], "devices": []},
    "adGroups": [{"id": "adgroup-1", "name": "Group", "theme": "Theme", "keywords": [], "biddingStrategy": "Maximize conversions"}]
  }],
  "implementation": {
    "setupSteps": [],
    "qualityScoreTips": [],
    "trackingSetup": [],
    "optimizationTips": []
  },
  "predictions": {
    "estimatedClicks": "500-800/month",
    "estimatedImpressions": "15,000-25,000/month",
    "estimatedCtr": "3.2%-4.5%",
    "estimatedConversions": "25-50/month"
  }
}
\`\`\`

Requirements:
- 10-15 primary keywords, 15-20 long-tail, 5-10 negative
- Headlines max 30 chars, descriptions max 90 chars
- 3-5 ad variations per campaign
- Include budget and targeting recommendations`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Create a Google Ads campaign for:

WEBSITE: ${websiteUrl}
PRODUCTS/SERVICES: ${productsServices.join(", ")}
TARGET AUDIENCE: ${targetAudience}
INDUSTRY: ${industry}
LANGUAGE: ${language}
${budgetRange ? `BUDGET: ${budgetRange.min}-${budgetRange.max} ${budgetRange.currency}/month` : ""}
${campaignDuration ? `DURATION: ${campaignDuration}` : ""}
${competitors.length > 0 ? `COMPETITORS: ${competitors.join(", ")}` : ""}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}

Generate complete Google Ads package with keywords, ad copy, campaigns, and implementation guidance.`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
  }

  async generateMagicWand(
    websiteUrl: string,
    product: string,
    budget: number,
    specialInstructions?: string,
    model?: string
  ): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a WORLD-CLASS marketing strategist with 20+ years of experience in competitive intelligence, market research, and Google Ads campaign strategy. 

OUTPUT FORMAT - Return ONLY valid JSON with this EXACT structure:
\`\`\`json
{
  "marketAnalysis": {
    "industrySize": "Estimated market size",
    "growthRate": "Annual growth percentage",
    "topCompetitors": ["Competitor 1", "Competitor 2", "Competitor 3"],
    "marketTrends": ["Trend 1", "Trend 2", "Trend 3"]
  },
  "competitorInsights": [
    {
      "competitor": "Competitor Name",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"],
      "adStrategy": "Their current advertising approach"
    }
  ],
  "strategies": [
    {
      "id": "strategy-1",
      "direction": "Strategic Direction Name",
      "rationale": "Why this strategy works for this product/market",
      "targetAudience": "Specific audience segment",
      "competitiveAdvantage": "How this beats competitors",
      "keyMessages": ["Message 1", "Message 2", "Message 3"],
      "adCopyGuide": {
        "headlines": ["Headline 1 (max 30 symbols)", "Headline 2", "Headline 3"],
        "descriptions": ["Description 1 (max 90 symbols)", "Description 2"],
        "keywords": ["keyword 1", "keyword 2", "keyword 3"],
        "setupGuide": "Friendly step-by-step for a beginner on where exactly to paste these in Google Ads Manager"
      },
      "recommendedChannels": ["Google Search", "Display", "YouTube"],
      "estimatedBudgetAllocation": { "search": 40, "display": 30, "video": 20, "social": 10 },
      "expectedROI": "150-200%",
      "riskLevel": "low",
      "timeToResults": "2-3 months"
    }
  ]
}
\`\`\`

CRITICAL REQUIREMENTS:
- Provide 5-7 DISTINCT strategic directions
- Each strategy must be ACTIONABLE and SPECIFIC
- Include REAL competitive insights based on industry knowledge
- Risk levels: "low", "medium", or "high"
- AD COPY GUIDE must be incredibly "noob-friendly" - explain exactly where to paste each field in Google Ads Manager
- Headlines MUST be under 30 characters
- Descriptions MUST be under 90 characters`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `🔮 MAGIC WAND ANALYSIS REQUEST 🔮

WEBSITE: ${websiteUrl}
PRODUCT/SERVICE: ${product}
MONTHLY BUDGET: $${budget}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}

Perform a DEEP 360° competitive intelligence analysis and generate 5-7 strategic campaign directions.`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
  }

  async generateMarketResearch(
    options: {
      websiteUrl: string;
      additionalUrls?: string[];
      competitors: string[];
      productMapping: string;
      specialInstructions?: string;
    },
    model?: string
  ): Promise<APIResponse<string>> {
    const { websiteUrl, additionalUrls = [], competitors = [], productMapping, specialInstructions = "" } = options;

    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a WORLD-CLASS Market Research Analyst. Perform a deep-dive automated market analysis.

OUTPUT FORMAT - JSON:
{
  "executiveSummary": "findings",
  "priceComparisonMatrix": [
    { "product": "P", "userPrice": "$", "competitorPrices": [{ "competitor": "C", "price": "$", "url": "link" }] }
  ],
  "featureComparisonTable": [
    { "feature": "F", "userStatus": "status", "competitorStatus": [{ "competitor": "C", "status": "status" }] }
  ],
  "marketPositioning": { "landscape": "LS", "segmentation": "SG" },
  "competitiveAnalysis": { "advantages": [], "disadvantages": [] },
  "recommendations": [],
  "methodology": "method"
}

REQUIREMENTS: Use provided URLs. Be realistic.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `🔬 MARKET RESEARCH REQUEST 🔬
WEBSITE: ${websiteUrl}
PAGES: ${additionalUrls.join(", ")}
COMPETITORS: ${competitors.join(", ")}
MAPPING: ${productMapping}
${specialInstructions ? `CUSTOM: ${specialInstructions}` : ""}

Perform analysis based on provided instructions.`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "coder-model");
  }

  async generateAIAssist(
    options: {
      messages: AIAssistMessage[];
      currentAgent: string;
    },
    model?: string
  ): Promise<APIResponse<string>> {
    const systemPrompt = `You are "AI Assist". Help conversationally.
    Switch agents if needed (content, seo, smm, pm, code, design, web, app).
    Output JSON for previews or agent switches:
    { "content": "text", "agent": "id", "preview": { "type": "code|design|content|seo", "data": "...", "language": "..." } }`;

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...options.messages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ];

    return await this.chatCompletion(chatMessages, model || this.getAvailableModels()[0]);
  }

  async generateAIAssistStream(
    options: {
      messages: AIAssistMessage[];
      currentAgent: string;
      onChunk: (chunk: string) => void;
      signal?: AbortSignal;
    },
    model?: string
  ): Promise<APIResponse<void>> {
    try {
      // ... existing prompt logic ...
      const systemPrompt = `You are "AI Assist". 
      Your goal is to provide intelligent support with a "Canvas" experience.
      
      CANVAS MODE (CRITICAL):
      When building or designing, you MUST use the [PREVIEW] tag.
      Inside [PREVIEW], output ONLY the actual code (HTML/Tailwind etc).
      The user wants to see it WORKING in the Canvas immediately.

      STRICT OUTPUT FORMAT:
      [AGENT:id] - Optional: content, seo, smm, pm, code, design, web, app.
      [PREVIEW:type:language]
      ACTUAL_FUNCTIONAL_CODE
      [/PREVIEW]
      Optional brief text.`;

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...options.messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];

      const endpoint = "/tools/promptarch/api/qwen/chat";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const tokenInfo = this.getTokenInfo();
      if (tokenInfo?.accessToken) {
        headers["Authorization"] = `Bearer ${tokenInfo.accessToken}`;
      } else if (this.apiKey) {
        headers["Authorization"] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        signal: options.signal,
        body: JSON.stringify({
          model: model || this.getAvailableModels()[0],
          messages,
          stream: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Stream request failed");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith("data:")) continue;

          const dataStr = trimmedLine.replace(/^data:\s*/, "");
          if (dataStr === "[DONE]") break;

          try {
            const data = JSON.parse(dataStr);
            if (data.choices?.[0]?.delta?.content) {
              options.onChunk(data.choices[0].delta.content);
            }
          } catch (e) {
            // Ignore parse errors for incomplete lines
          }
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Stream failed" };
    }
  }

  async listModels(): Promise<APIResponse<string[]>> {
    const models = [
      "coder-model",
    ];
    return { success: true, data: models };
  }

  getAvailableModels(): string[] {
    return [
      "qwen-coder-plus",
      "qwen-plus",
      "qwen-turbo",
      "qwen-max",
      "qwen-coder-turbo",
    ];
  }
}

const qwenOAuthService = new QwenOAuthService();
export default qwenOAuthService;


