import type { ChatMessage, APIResponse } from "@/types";

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
}

export default ZaiPlanService;

