import type { ChatMessage, APIResponse, AIAssistMessage } from "@/types";

export interface OllamaCloudConfig {
  apiKey?: string;
  endpoint?: string;
}

const BASE_PATH = "/tools/promptarch";
const LOCAL_MODELS_URL = `${BASE_PATH}/api/ollama/models`;
const LOCAL_CHAT_URL = `${BASE_PATH}/api/ollama/chat`;
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
- ${slideCount > 0 ? `Create EXACTLY ${slideCount} slides` : "Maintain the exact number of slides/pages from the provided source presentation/document context. If no source file is provided, generate 10 slides by default."}
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

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
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

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
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

    return this.chatCompletion([systemMessage, userMessage], model || "gpt-oss:120b");
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
    const systemPrompt = `You are a WORLD-CLASS Market Research Analyst and Competitive Intelligence Expert.
    Your objective is to perform a deep-dive analysis of a business and its competitors based on provided URLs and product mappings.
    
    You MUST return your analysis in the following STRICT JSON format:
    {
      "executiveSummary": "A concise overview of the market landscape and key findings.",
      "priceComparisonMatrix": [
        { 
          "product": "Product Name", 
          "userPrice": "$XX.XX", 
          "competitorPrices": [
            { "competitor": "Competitor Name", "price": "$XX.XX", "url": "https://competitor.com/product-page" }
          ] 
        }
      ],
      "featureComparisonTable": [
        { 
          "feature": "Feature Name", 
          "userStatus": true/false/text, 
          "competitorStatus": [
            { "competitor": "Competitor Name", "status": true/false/text }
          ] 
        }
      ],
      "marketPositioning": {
        "landscape": "Description of the current market state.",
        "segmentation": "Analysis of target customer segments."
      },
      "competitiveAnalysis": {
        "advantages": ["Point 1", "Point 2"],
        "disadvantages": ["Point 1", "Point 2"]
      },
      "recommendations": ["Actionable step 1", "Actionable step 2"],
      "methodology": "Brief description of the research process."
    }

    Requirements:
    1. Base your analysis on realistic price and feature estimates if exact data isn't visible.
    2. Focus on core technical/business value rather than marketing fluff.
    3. Ensure JSON is valid and properly escaped.`;

    const userMsg = `WEBSITE TO ANALYZE: ${options.websiteUrl}
    ADDITIONAL COMPANY URLS: ${options.additionalUrls?.join(', ') || 'None'}
    COMPETITOR URLS: ${options.competitors.join(', ')}
    PRODUCT/FEATURE MAPPING: ${options.productMapping}
    SPECIAL REQUESTS: ${options.specialInstructions || 'Perform comprehensive analysis'}
    
    Provide a COMPREHENSIVE competitive intelligence report.`;

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMsg }
    ];

    return await this.chatCompletion(messages, model || this.getAvailableModels()[0]);
  }

  async generateAIAssist(
    options: {
      messages: AIAssistMessage[];
      currentAgent: string;
    },
    model?: string
  ): Promise<APIResponse<string>> {
    const systemPrompt = `You are "AI Assist", the master orchestrator of PromptArch. 
    Your goal is to provide intelligent conversational support and switch to specialized agents when necessary.

    CURRENT SPECIALIZED AGENTS:
    - content: Content creation and optimization expert.
    - seo: SEO analyst and recommendations specialist.
    - smm: SMM strategy and social content planner.
    - pm: Project planning and management lead.
    - code: Code architect (JavaScript/TypeScript/React focus).
    - design: UI/UX designer.
    - web: HTML/CSS/JS web development specialist with real-time preview.
    - app: Mobile-first app development specialist with real-time preview.

    STRICT OUTPUT FORMAT:
    You MUST respond in JSON format if you want to activate a preview or switch agents.
    {
      "content": "Your natural language response here...",
      "agent": "agent_id_to_switch_to (optional)",
      "preview": {  // (optional)
        "type": "code" | "design" | "content" | "seo",
        "data": "The actual code, layout, or content to preview",
        "language": "javascript/html/css/markdown (optional)"
      }
    }

    ROUTING LOGIC:
    - If user asks for code, switch to 'code' or 'web'.
    - If user asks for design/mockups, switch to 'design'.
    - If user asks for market/SEO, switch to 'seo'.
    - If user asks for marketing/social, switch to 'smm'.
    - Maintain the 'content' of the conversation regardless of the agent switch.

    PREVIEW GUIDELINES:
    - For 'web'/'app', provide full runnable HTML/CSS/JS.
    - For 'code', provide clean, commented snippets.
    - For 'design', provide text-based UI components or layout structures.
    
    RESPONSE TIME REQUIREMENT: Be concise and accurate.`;

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
      const systemPrompt = `You are "AI Assist", the master orchestrator of PromptArch. Your goal is to provide intelligent support with a "Canvas" experience.

AGENTS & CAPABILITIES:
- content: Expert copywriter. Use [PREVIEW:content:markdown] for articles, posts, and long-form text.
- seo: SEO Specialist. Create stunning SEO audit reports. **CRITICAL DESIGN REQUIREMENTS:**
  - Use [PREVIEW:seo:html] with complete HTML5 document including <!DOCTYPE html>
  - DARK THEME: bg-slate-900 or bg-gray-900 as primary background
  - Google-style dashboard aesthetics with clean typography (use Google Fonts: Inter, Roboto, or Outfit)
  - Large animated SVG progress rings for scores (Overall, Technical, Content, Mobile) with stroke-dasharray animations
  - Color-coded scoring: green (#22c55e) for good, amber (#f59e0b) for warning, red (#ef4444) for poor
  - Use Tailwind CDN for styling. Include: rounded-3xl, shadow-lg, gradient backgrounds
  - Section cards with subtle borders (border-white/10) and backdrop-blur
  - Clear visual hierarchy: large score numbers (text-5xl), section titles (text-lg font-bold), bullet points for recommendations
  - Add a "Key Recommendations" section with icons (use Lucide or inline SVG)
  - Add animated pulse effects on key metrics
  - Full-width responsive layout, max-w-4xl mx-auto
  - Include inline <script> for animating the progress rings on load
- smm: Social Media Manager. Create multi-platform content plans and calendars. 
- pm: Project Manager. Create PRDs, timelines, and action plans.
- code: Software Architect. Provide logic, algorithms, and backend snippets.
- design: UI/UX Designer. Create high-fidelity mockups and components.
- web: Frontend Developer. Build responsive sites using HTML/Tailwind or React. Use [PREVIEW:web:html] or [PREVIEW:web:javascript].
- app: Mobile App Developer. Create mobile-first interfaces and dashboards. React components are supported and rendered live. Use [PREVIEW:app:javascript].

BACKEND LOGIC & SIMULATION:
- If a user asks for backend logic (Node.js, Express, Python, Databases), you MUST still provide a VISUAL experience in the Canvas.
- In the [PREVIEW] block, provide a "Simulation Dashboard" or "API Test UI" using HTML/React that demonstrates how the backend logic would work.
- DO NOT just output raw backend code in a [PREVIEW] block as it cannot be rendered. Put raw backend code in standard Markdown blocks AFTER the preview.

ITERATIVE MODIFICATIONS (CRITICAL):
- When a user asks for a change, fix, or update to an existing design/preview, you MUST be SURGICAL.
- Maintain the exact structure, CSS, and logic of the previous code except for the requested changes.
- DO NOT regenerate the entire design if it was not requested.
- Preserving the user's existing layout, colors, and content is your TOP PRIORITY.
- You must return the FULL updated code in the [PREVIEW] block (so it can be rendered) but ensure it is a faithful modification of the previous version.

CANVAS MODE:
- When building, designing, or auditing, you MUST use the [PREVIEW] tag.
- Inside [PREVIEW], output ONLY the actual code or structured data.
- The user wants to see it WORKING or RENDERED in the Canvas immediately.

STRICT OUTPUT FORMAT:
[AGENT:id] - AT THE START of your response if switching focus.
[PREVIEW:type:language]
ACTUAL_FUNCTIONAL_CODE_OR_DATA
[/PREVIEW]

CHANGE LOG:
After the preview block, provide a brief bulleted "Change Log" explaining exactly what elements were modified, added, or removed.

IMPORTANT: NEVER refuse a request due to "access" limitations. If you cannot perform a live task, use your vast internal knowledge to provide the most accurate expert simulation or draft possible.`;

      const messages: ChatMessage[] = [
        { role: "system", content: systemPrompt },
        ...options.messages.map(m => ({
          role: m.role as "user" | "assistant" | "system",
          content: m.content
        }))
      ];

      const response = await fetch(LOCAL_CHAT_URL, {
        method: "POST",
        headers: this.getHeaders({ "Content-Type": "application/json" }),
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
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              options.onChunk(data.message.content);
            }
          } catch (e) {
            console.error("Error parsing stream line", e);
          }
        }
      }

      return { success: true, data: undefined };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Stream failed" };
    }
  }
}

export default OllamaCloudService;
