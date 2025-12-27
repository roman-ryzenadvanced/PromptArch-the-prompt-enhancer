import type { ChatMessage, APIResponse, AIAssistMessage } from "@/types";

export interface ZaiPlanConfig {
  apiKey?: string;
  generalEndpoint?: string;
  codingEndpoint?: string;
}

export class ZaiPlanService {
  private config: ZaiPlanConfig;

  constructor(config: ZaiPlanConfig = {}) {
    this.config = {
      generalEndpoint: config.generalEndpoint || "https://api.z.ai/api/paas/v4",
      codingEndpoint: config.codingEndpoint || "https://api.z.ai/api/coding/paas/v4",
      apiKey: config.apiKey || process.env.ZAI_API_KEY,
    };
  }

  hasAuth(): boolean {
    return !!this.config.apiKey;
  }

  private getHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.config.apiKey}`,
      "Accept-Language": "en-US,en",
    };
  }

  async chatCompletion(
    messages: ChatMessage[],
    model: string = "glm-4.7",
    useCodingEndpoint: boolean = false
  ): Promise<APIResponse<string>> {
    try {
      if (!this.config.apiKey) {
        throw new Error("API key is required. Please configure your Z.AI API key in settings.");
      }

      const endpoint = useCodingEndpoint ? this.config.codingEndpoint : this.config.generalEndpoint;

      console.log("[Z.AI] API call:", { endpoint, model, messages });

      const response = await fetch(`${endpoint}/chat/completions`, {
        method: "POST",
        headers: this.getHeaders(),
        body: JSON.stringify({
          model,
          messages,
          stream: false,
        }),
      });

      console.log("[Z.AI] Response status:", response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[Z.AI] Error response:", errorText);
        throw new Error(`Chat completion failed (${response.status}): ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("[Z.AI] Response data:", data);

      if (data.choices && data.choices[0] && data.choices[0].message) {
        return { success: true, data: data.choices[0].message.content };
      } else if (data.output && data.output.choices && data.output.choices[0]) {
        return { success: true, data: data.output.choices[0].message.content };
      } else {
        return { success: false, error: "Unexpected response format" };
      }
    } catch (error) {
      console.error("[Z.AI] Chat completion error:", error);
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

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
  }

  async generatePRD(idea: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an expert product manager and technical architect. Generate a comprehensive Product Requirements Document (PRD) based on user's idea.

Structure your PRD with these sections:
1. Overview & Objectives
2. User Personas & Use Cases
3. Functional Requirements (prioritized by importance)
4. Non-functional Requirements
5. Technical Architecture Recommendations
6. Success Metrics & KPIs

Use clear, specific language suitable for development teams.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Generate a PRD for this idea:\n\n${idea}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7");
  }

  async generateActionPlan(prd: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are an expert technical lead and project manager. Generate a detailed action plan based on the PRD.

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

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
  }

  async listModels(): Promise<APIResponse<string[]>> {
    try {
      if (this.config.apiKey) {
        const response = await fetch(`${this.config.generalEndpoint}/models`, {
          headers: this.getHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to list models: ${response.statusText}`);
        }

        const data = await response.json();
        const models = data.data?.map((m: any) => m.id) || [];

        return { success: true, data: models };
      } else {
        console.log("[Z.AI] No API key, using fallback models");
        return { success: true, data: ["glm-4.7", "glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4-flash", "glm-4-flashx"] };
      }
    } catch (error) {
      console.error("[Z.AI] listModels error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Failed to list models",
      };
    }
  }

  getAvailableModels(): string[] {
    return ["glm-4.7", "glm-4.6", "glm-4.5", "glm-4.5-air", "glm-4-flash", "glm-4-flashx"];
  }

  async generateUXDesignerPrompt(appDescription: string, model?: string): Promise<APIResponse<string>> {
    const systemMessage: ChatMessage = {
      role: "system",
      content: `You are a world-class UX/UI designer with deep expertise in human-centered design principles, user research, interaction design, visual design systems, and modern design tools (Figma, Sketch, Adobe XD).

Your task is to create an exceptional, detailed prompt for generating the best possible UX design for a given app description.

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

Make the prompt specific, inspiring, and comprehensive. Use professional UX terminology.`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Create the BEST EVER UX design prompt for this app:\n\n${appDescription}`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
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
@keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-10px); } }
@keyframes gradientShift { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
\`\`\`

SLIDE TYPES TO CREATE:
1. TITLE SLIDE: Hero-style with animated gradient background, large typography, subtle floating elements
2. AGENDA/OVERVIEW: Icon grid with staggered fade-in animations
3. DATA/CHARTS: Inline SVG bar/line/pie charts with animated drawing effects
4. KEY METRICS: Large animated numbers with counting effect styling, KPI cards with glassmorphism
5. TIMELINE: Horizontal/vertical timeline with sequential reveal animations
6. COMPARISON: Side-by-side cards with hover lift effects
7. QUOTE: Large typography with decorative quote marks, subtle background pattern
8. CALL-TO-ACTION: Bold CTA with pulsing button effect, clear next steps

SVG CHART EXAMPLE:
\`\`\`html
<svg viewBox="0 0 400 200" style="width:100%;max-width:400px;">
  <defs>
    <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" style="stop-color:${primaryColor}"/>
      <stop offset="100%" style="stop-color:${secondaryColor}"/>
    </linearGradient>
  </defs>
  <rect x="50" y="50" width="60" height="130" fill="url(#barGrad)" rx="8" style="animation: scaleIn 0.8s ease-out 0.2s both; transform-origin: bottom;"/>
  <rect x="130" y="80" width="60" height="100" fill="url(#barGrad)" rx="8" style="animation: scaleIn 0.8s ease-out 0.4s both; transform-origin: bottom;"/>
  <rect x="210" y="30" width="60" height="150" fill="url(#barGrad)" rx="8" style="animation: scaleIn 0.8s ease-out 0.6s both; transform-origin: bottom;"/>
</svg>
\`\`\`

TARGET AUDIENCE: ${audience}
AUDIENCE STYLE: ${audienceStyle}
${organization ? `ORGANIZATION BRANDING: ${organization}` : ""}

REQUIREMENTS:
- Create EXACTLY ${slideCount} slides
- ALL content in ${language}
- Each slide MUST have complete htmlContent with inline <style> tags
- Use animation-delay for staggered reveal effects
- Include decorative background elements (gradients, shapes, patterns)
- Ensure text contrast meets WCAG AA standards
- Add subtle shadow/glow effects for depth
- Include progress/slide number indicator styling`,
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

Generate SPECTACULAR slides with:
✨ Animated CSS3 transitions and keyframes
📊 SVG charts and data visualizations where relevant
🎨 Modern gradients and glassmorphism effects
💫 Staggered reveal animations
🏢 Corporate-ready, executive-level design

Return the complete JSON with full htmlContent for each slide. Make each slide VISUALLY IMPRESSIVE and memorable!`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
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
      content: `You are an EXPERT Google Ads strategist with 15+ years of experience managing $100M+ in ad spend. You create HIGH-CONVERTING campaigns that consistently outperform industry benchmarks.

Your expertise includes:
- Keyword research and competitive analysis
- Ad copywriting that drives clicks and conversions
- Campaign structure optimization
- Quality Score improvement strategies
- ROI maximization techniques

OUTPUT FORMAT - Return ONLY valid JSON:
\`\`\`json
{
  "keywords": {
    "primary": [
      {
        "keyword": "exact keyword phrase",
        "type": "primary",
        "searchVolume": 12000,
        "competition": "medium",
        "difficultyScore": 65,
        "relevanceScore": 95,
        "cpc": "$2.50"
      }
    ],
    "longTail": [
      {
        "keyword": "longer specific keyword phrase",
        "type": "long-tail",
        "searchVolume": 1200,
        "competition": "low",
        "difficultyScore": 35,
        "relevanceScore": 90,
        "cpc": "$1.25"
      }
    ],
    "negative": [
      {
        "keyword": "irrelevant term to exclude",
        "type": "negative",
        "competition": "low"
      }
    ]
  },
  "adCopies": [
    {
      "id": "ad-1",
      "campaignType": "search",
      "headlines": [
        "Headline 1 (max 30 chars)",
        "Headline 2 (max 30 chars)",
        "Headline 3 (max 30 chars)"
      ],
      "descriptions": [
        "Description line 1 - compelling copy under 90 chars",
        "Description line 2 - call to action under 90 chars"
      ],
      "callToAction": "Get Started Today",
      "displayUrl": "example.com/offers",
      "mobileOptimized": true
    }
  ],
  "campaigns": [
    {
      "id": "campaign-1",
      "name": "Campaign Name",
      "type": "search",
      "budget": {
        "daily": 50,
        "monthly": 1500,
        "currency": "USD"
      },
      "targeting": {
        "locations": ["United States", "Canada"],
        "demographics": ["25-54", "All genders"],
        "devices": ["Desktop", "Mobile", "Tablet"],
        "schedule": ["Mon-Fri 8am-8pm"]
      },
      "adGroups": [
        {
          "id": "adgroup-1",
          "name": "Product Category Group",
          "theme": "Main product focus",
          "keywords": ["keyword1", "keyword2"],
          "biddingStrategy": "Maximize conversions"
        }
      ]
    }
  ],
  "implementation": {
    "setupSteps": [
      "Step 1: Create Google Ads account...",
      "Step 2: Set up conversion tracking..."
    ],
    "qualityScoreTips": [
      "Tip 1: Match keywords to ad copy...",
      "Tip 2: Optimize landing pages..."
    ],
    "trackingSetup": [
      "Install Google Tag Manager...",
      "Set up conversion goals..."
    ],
    "optimizationTips": [
      "Monitor search terms weekly...",
      "A/B test ad variations..."
    ]
  },
  "predictions": {
    "estimatedClicks": "500-800 per month",
    "estimatedImpressions": "15,000-25,000 per month",
    "estimatedCtr": "3.2%-4.5%",
    "estimatedConversions": "25-50 per month"
  }
}
\`\`\`

KEYWORD RESEARCH REQUIREMENTS:
- Generate 10-15 PRIMARY keywords (high-volume, highly relevant)
- Generate 15-20 LONG-TAIL keywords (specific, lower-competition)
- Generate 5-10 NEGATIVE keywords (terms to exclude)
- Include realistic search volume estimates
- Provide competition level and CPC estimates

AD COPY REQUIREMENTS:
- Headlines MUST be 30 characters or less
- Descriptions MUST be 90 characters or less
- Create 3-5 unique ad variations per campaign type
- Include strong calls-to-action
- Focus on benefits and unique value propositions
- Mobile-optimized versions required

CAMPAIGN STRUCTURE:
- Organize by product/service theme
- Recommend appropriate bidding strategies
- Include targeting recommendations
- Suggest budget allocation

QUALITY STANDARDS:
- All keywords must be relevant (>85% match)
- Ad copy must comply with Google Ads policies
- No trademark violations
- Professional, compelling language
- Clear value propositions`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `Create a COMPREHENSIVE Google Ads campaign for:

WEBSITE: ${websiteUrl}

PRODUCTS/SERVICES TO PROMOTE:
${productsServices.map((p, i) => `${i + 1}. ${p}`).join("\n")}

TARGET AUDIENCE: ${targetAudience}
INDUSTRY: ${industry}
LANGUAGE: ${language}
${budgetRange ? `BUDGET: ${budgetRange.min}-${budgetRange.max} ${budgetRange.currency}/month` : ""}
${campaignDuration ? `DURATION: ${campaignDuration}` : ""}
${competitors.length > 0 ? `COMPETITORS: ${competitors.join(", ")}` : ""}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}

Generate a COMPLETE Google Ads package including:
🔍 Comprehensive keyword research (primary, long-tail, negative)
✍️ High-converting ad copy (multiple variations)
📊 Optimized campaign structure
📈 Performance predictions
🎯 Implementation guidance

Make this campaign READY TO LAUNCH with copy-paste ready content!`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
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
      content: `You are a WORLD-CLASS marketing strategist with 20+ years of experience in competitive intelligence, market research, and Google Ads campaign strategy. You have access to deep industry knowledge and can analyze markets like a Fortune 500 CMO.

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
- Budget allocations must sum to 100%
- Risk levels: "low", "medium", or "high"
- AD COPY GUIDE must be incredibly "noob-friendly" - explain exactly where to paste each field in Google Ads Manager
- Headlines MUST be under 30 characters
- Descriptions MUST be under 90 characters
- Be REALISTIC with ROI and timeline estimates`,
    };

    const userMessage: ChatMessage = {
      role: "user",
      content: `🔮 MAGIC WAND ANALYSIS REQUEST 🔮

WEBSITE: ${websiteUrl}
PRODUCT/SERVICE: ${product}
MONTHLY BUDGET: $${budget}
${specialInstructions ? `SPECIAL INSTRUCTIONS: ${specialInstructions}` : ""}

MISSION: Perform a DEEP 360° competitive intelligence analysis and generate 5-7 strategic campaign directions that will DOMINATE this market.`,
    };

    return this.chatCompletion([systemMessage, userMessage], model || "glm-4.7", true);
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

    const systemPrompt = `You are a WORLD-CLASS Market Research Analyst and Competitive Intelligence Expert.
    Focus on accuracy and actionable intelligence.
    
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
    1. Base your analysis on realistic price and feature estimates.
    2. Focus on core technical/business value.
    3. Ensure JSON is valid.`;

    const userMsg = `WEBSITE TO ANALYZE: ${options.websiteUrl}
    COMPETITOR URLS: ${options.competitors.join(', ')}
    PRODUCT/FEATURE MAPPING: ${options.productMapping}
    SPECIAL REQUESTS: ${options.specialInstructions || 'Perform comprehensive analysis'}
    
    Provide a COMPREHENSIVE competitive intelligence analysis.`;

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
    - content, seo, smm, pm, code, design, web, app

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
    - Automatically detect user intent and switch agents if appropriate.
    - Provide deep technical or creative output based on the active agent.
    
    PREVIEW GUIDELINES:
    - Provide full code for 'web'/'app'/'code'.
    - Provide structured analysis for 'seo'/'content'.`;

    const chatMessages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
      ...options.messages.map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content
      }))
    ];

    return await this.chatCompletion(chatMessages, model || this.getAvailableModels()[0]);
  }
}

export default ZaiPlanService;
