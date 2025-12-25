export type ModelProvider = "ollama" | "zai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PromptEnhancement {
  id: string;
  originalPrompt: string;
  enhancedPrompt: string;
  provider: ModelProvider;
  model: string;
  timestamp: Date;
}

export interface PRD {
  id: string;
  title: string;
  overview: string;
  objectives: string[];
  userPersonas: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  technicalArchitecture: string;
  successMetrics: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ActionPlan {
  id: string;
  prdId: string;
  tasks: {
    id: string;
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    dependencies: string[];
    estimatedEffort: string;
  }[];
  frameworks: {
    name: string;
    reason: string;
  }[];
  architecture: {
    pattern: string;
    structure: string;
    technologies: string[];
    bestPractices: string[];
  };
  estimatedDuration: string;
  createdAt: Date;
  rawContent?: string;
}
