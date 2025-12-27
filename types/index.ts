export type ModelProvider = "qwen" | "ollama" | "zai";

export interface ModelConfig {
  provider: ModelProvider;
  model: string;
  apiKey?: string;
  endpoint?: string;
}

export interface PromptEnhancement {
  original: string;
  enhanced: string;
  quality: number;
  intent: string;
  patterns: string[];
}

export interface PRD {
  id: string;
  title: string;
  overview: string;
  objectives: string[];
  userPersonas: UserPersona[];
  functionalRequirements: Requirement[];
  nonFunctionalRequirements: Requirement[];
  technicalArchitecture: string;
  successMetrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPersona {
  name: string;
  description: string;
  goals: string[];
  painPoints: string[];
}

export interface Requirement {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  dependencies?: string[];
}

export interface ActionPlan {
  id: string;
  prdId: string;
  tasks: Task[];
  frameworks: FrameworkRecommendation[];
  architecture: ArchitectureGuideline;
  estimatedDuration: string;
  createdAt: Date;
  rawContent?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  estimatedHours: number;
  dependencies: string[];
  status: "pending" | "in-progress" | "completed";
  assignee?: string;
}

export interface FrameworkRecommendation {
  category: string;
  recommendation: string;
  rationale: string;
  alternatives: string[];
}

export interface ArchitectureGuideline {
  pattern: string;
  structure: string;
  technologies: string[];
  bestPractices: string[];
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface Slide {
  id: string;
  title: string;
  content: string;
  htmlContent: string;
  notes?: string;
  layout: "title" | "content" | "two-column" | "image-left" | "image-right" | "quote" | "statistics" | "timeline" | "comparison";
  order: number;
}

export interface SlidesPresentation {
  id: string;
  title: string;
  subtitle?: string;
  author?: string;
  organization?: string;
  theme: "corporate" | "modern" | "minimal" | "dark" | "vibrant" | "gradient";
  language: string;
  slides: Slide[];
  rawContent: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoogleAdsKeyword {
  keyword: string;
  type: "primary" | "long-tail" | "negative";
  searchVolume?: number;
  competition: "low" | "medium" | "high";
  difficultyScore?: number;
  relevanceScore?: number;
  cpc?: string;
}

export interface GoogleAdCopy {
  id: string;
  campaignType: "search" | "display" | "shopping" | "video" | "performance-max";
  headlines: string[];
  descriptions: string[];
  callToAction: string;
  displayUrl?: string;
  finalUrl?: string;
  mobileOptimized: boolean;
}

export interface GoogleAdGroup {
  id: string;
  name: string;
  theme: string;
  keywords: string[];
  ads: GoogleAdCopy[];
  biddingStrategy?: string;
}

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  type: "search" | "display" | "shopping" | "video" | "performance-max";
  budget: {
    daily?: number;
    monthly?: number;
    currency: string;
  };
  targeting: {
    locations?: string[];
    demographics?: string[];
    devices?: string[];
    schedule?: string[];
  };
  adGroups: GoogleAdGroup[];
}

export interface GoogleAdsResult {
  id: string;
  websiteUrl: string;
  productsServices: string[];
  generatedAt: Date;

  // Keyword Research Package
  keywords: {
    primary: GoogleAdsKeyword[];
    longTail: GoogleAdsKeyword[];
    negative: GoogleAdsKeyword[];
  };

  // Ad Copy Suite
  adCopies: GoogleAdCopy[];

  // Campaign Structure
  campaigns: GoogleAdsCampaign[];

  // Implementation Guidance
  implementation: {
    setupSteps: string[];
    qualityScoreTips: string[];
    trackingSetup: string[];
    optimizationTips: string[];
  };

  // Performance Predictions
  predictions?: {
    estimatedClicks?: string;
    estimatedImpressions?: string;
    estimatedCtr?: string;
    estimatedConversions?: string;
  };

  rawContent: string;
}

export interface MagicWandStrategy {
  id: string;
  direction: string;
  rationale: string;
  targetAudience: string;
  competitiveAdvantage: string;
  keyMessages: string[];
  adCopyGuide: {
    headlines: string[];
    descriptions: string[];
    keywords: string[];
    setupGuide: string;
  };
  recommendedChannels: string[];
  estimatedBudgetAllocation: {
    search?: number;
    display?: number;
    video?: number;
    social?: number;
  };
  expectedROI: string;
  riskLevel: "low" | "medium" | "high";
  timeToResults: string;
}

export interface MagicWandResult {
  id: string;
  websiteUrl: string;
  product: string;
  budget: number;
  generatedAt: Date;

  // Market Intelligence
  marketAnalysis: {
    industrySize: string;
    growthRate: string;
    topCompetitors: string[];
    marketTrends: string[];
  };

  // Competitive Intelligence
  competitorInsights: {
    competitor: string;
    strengths: string[];
    weaknesses: string[];
    adStrategy: string;
  }[];

  // Strategic Directions
  strategies: MagicWandStrategy[];

  rawContent: string;
}

export interface MarketResearchResult {
  id: string;
  websiteUrl: string;
  additionalUrls: string[];
  competitors: string[];
  productMapping: {
    productName: string;
    features: string[];
    pricePoint?: string;
  }[];
  generatedAt: Date;

  executiveSummary: string;
  priceComparisonMatrix: {
    product: string;
    userPrice: string;
    competitorPrices: { competitor: string; price: string }[];
  }[];
  featureComparisonTable: {
    feature: string;
    userStatus: boolean | string;
    competitorStatus: { competitor: string; status: boolean | string }[];
  }[];
  marketPositioning: {
    landscape: string;
    segmentation: string;
  };
  competitiveAnalysis: {
    advantages: string[];
    disadvantages: string[];
  };
  recommendations: string[];
  methodology: string;
  rawContent: string;
}

export type AppView = "prompt-enhancer" | "prd-generator" | "action-plan" | "slides-gen" | "google-ads" | "ux-designer" | "market-research" | "settings" | "history";
