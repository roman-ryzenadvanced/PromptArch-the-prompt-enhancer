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
