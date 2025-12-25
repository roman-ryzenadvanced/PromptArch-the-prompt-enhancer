# PromptArch Implementation Plan

## Phase 1: Project Setup & Foundation

* Initialize Next.js 14+ with TypeScript, TailwindCSS, shadcn/ui

* Set up project structure: `/app`, `/components`, `/lib`, `/services`

* Configure environment variables for all API keys

* Set up state management (Zustand or Context API)

* Configure ESLint, Prettier, TypeScript strict mode

## Phase 2: API Integration Layer

### 2.1 Qwen Code OAuth Integration

* Create `/lib/services/qwen-oauth.ts`

* Implement OAuth flow (browser-based authentication)

* Create proxy service wrapper for OpenAI-compatible API

* Handle credential management (\~/.qwen/oauth\_creds.json parsing)

* Implement token refresh logic (2000 daily requests tracking)

### 2.2 Ollama Cloud API Integration

* Create `/lib/services/ollama-cloud.ts`

* Implement client with OLLAMA\_API\_KEY authentication

* Support chat completions and generate endpoints

* Model listing and selection interface

* Stream response handling

### 2.3 Z.AI Plan API Integration

* Create `/lib/services/zai-plan.ts`

* Implement both general and coding endpoints

* Bearer token authentication

* Model selection (glm-4.7, glm-4.5, glm-4.5-air)

* Request/response handling with error management

### 2.4 Unified Model Interface

* Create `/lib/services/model-adapter.ts`

* Abstract interface for all providers

* Standardize request/response format

* Provider selection and fallback logic

* Usage tracking and quota management

## Phase 3: Core PromptArch Features

### 3.1 Prompt Engineering Workflow

* **Input Panel:** Textarea for raw human prompt

* **Enhancement Engine:** Transform prompts using:

  * Clavix's 20 patterns and 11 intents

  * Professional prompt structure (Context, Task, Constraints, Output Format)

  * Code-specific templates for coding agents

* **Output Display:** Show enhanced prompt with diff comparison

### 3.2 PRD Generation Module

* Guided Socratic questioning UI

* 15 specialized patterns (RequirementPrioritizer, UserPersonaEnricher, etc.)

* Structured PRD template with sections:

  * Overview & Objectives

  * User Personas & Use Cases

  * Functional Requirements

  * Non-functional Requirements

  * Technical Architecture

  * Success Metrics

### 3.3 Action Plan Generator

* Convert PRD to actionable implementation plan

* Task breakdown with priorities (High/Medium/Low)

* Dependency graph visualization

* Framework and technology recommendations

* Coding architecture guidelines

### 3.4 Framework & Architecture Recommendations

* Analyze project requirements and suggest:

  * Frontend framework (React/Next.js/Astro/etc.)

  * Backend architecture (REST/GraphQL/Serverless)

  * Database choices based on scale

  * Authentication patterns

  * Deployment strategy

## Phase 4: Modern UI/UX Design

### 4.1 Layout & Navigation

* Sidebar with workflow stages (Prompt → PRD → Plan → Output)

* Top bar with model selector and settings

* Responsive design for desktop and tablet

* Dark/light mode toggle

### 4.2 Interactive Components

* **Prompt Input Panel:** Real-time analysis indicators

* **Split View:** Original vs Enhanced prompt comparison

* **Progressive Disclosure:** Collapsible PRD sections

* **Drag-and-Drop:** Reorder tasks in action plan

* **Copy/Export:** One-click copy outputs

### 4.3 Workflow Visualizations

* Pipeline diagram showing current stage

* Dependency graph for tasks

* Progress tracking with checkmarks

* Status badges (Draft/In Progress/Complete)

### 4.4 Settings & Configuration

* API key management interface

* Model selection per stage

* Provider fallback configuration

* Usage statistics dashboard

* Theme customization

## Phase 5: Advanced Features

### 5.1 Multi-Model Support

* Select different models for different stages:

  * Qwen Code for prompt enhancement

  * Ollama Cloud for PRD generation

  * Z.AI Plan for action planning

* Model comparison side-by-side

* Cost estimation per model

### 5.2 Template Library

* Pre-built prompt templates for common scenarios:

  * Web Development

  * Mobile App Development

  * API Development

  * Data Science/ML

  * DevOps/Infrastructure

* Custom template creation

### 5.3 History & Persistence

* Save all generated outputs to local storage

* Version history of prompts and PRDs

* Search and filter past projects

* Export to Markdown, JSON, or PDF

### 5.4 Collaboration Features

* Share outputs via URL

* Export prompts for Claude Code, Cursor, Windsurf

* Integration with slash command format

* Copy-ready templates for AI agents

## Phase 6: Testing & Quality Assurance

* Unit tests for API integration layer

* Integration tests with mock providers

* E2E tests for complete workflows

* Accessibility testing (WCAG AA)

* Performance optimization

## Technical Stack

```
Frontend: Next.js 14 (App Router) + TypeScript
UI Library: shadcn/ui + Radix UI + TailwindCSS
State: Zustand
Forms: React Hook Form + Zod
HTTP: Fetch API + Axios (fallback)
Icons: Lucide React
Charts: Recharts (for visualizations)
Markdown: react-markdown + remark/rehype
```

## Directory Structure

```
promptarch/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── prompt-enhance/
│   ├── prd-generator/
│   ├── action-plan/
│   └── settings/
├── components/
│   ├── ui/ (shadcn components)
│   ├── workflow/
│   ├── panels/
│   └── visualizations/
├── lib/
│   ├── services/
│   │   ├── qwen-oauth.ts
│   │   ├── ollama-cloud.ts
│   │   ├── zai-plan.ts
│   │   └── model-adapter.ts
│   ├── store.ts
│   ├── utils.ts
│   └── patterns/
├── types/
│   └── index.ts
└── public/
```

## Key Differentiators

1. **Unified Multi-Model Workflow:** Seamlessly switch between Qwen, Ollama, and Z.AI
2. **Professional Prompt Engineering:** 20 patterns + 11 intents from Clavix, enhanced
3. **Complete Development Lifecycle:** From vague idea to verified implementation
4. **Modern Web UI:** Not just CLI - full interactive experience
5. **Coding Agent Ready:** Outputs optimized for Claude Code, Cursor, Windsurf, etc.

