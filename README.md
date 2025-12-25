# PromptArch

Transform vague ideas into production-ready prompts and PRDs. An AI-powered platform for prompt engineering, PRD generation, and action planning with support for multiple AI providers.

## Features

- **Multi-Provider Support**: Qwen Code OAuth, Ollama Cloud, and Z.AI Plan API
- **Prompt Enhancement**: Improve prompts with 20+ patterns and 11 intents
- **PRD Generation**: Comprehensive product requirements documents
- **Action Planning**: Task breakdown with priorities, dependencies, and framework recommendations
- **Modern UI**: Clean, responsive interface with sidebar navigation
- **History Tracking**: Save and restore previous prompts
- **Provider Fallback**: Automatic fallback if a provider fails

## Quick Start

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Set up environment variables**:
   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

3. **Run the development server**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## AI Providers

### Qwen Code OAuth
- **2000 free requests/day** via OAuth
- OpenAI-compatible API
- Get credentials at [qwen.ai](https://qwen.ai)

### Ollama Cloud
- High-performance cloud models
- No GPU required
- Get API key at [ollama.com/cloud](https://ollama.com/cloud)

### Z.AI Plan API
- Specialized coding models (glm-4.7, glm-4.5)
- Dedicated coding endpoint
- Get API key at [docs.z.ai](https://docs.z.ai)

## Usage

### Prompt Enhancer
1. Enter your prompt in the input panel
2. Select an AI provider
3. Click "Enhance Prompt"
4. Copy the enhanced prompt for use with AI coding agents

### PRD Generator
1. Enter your idea or concept
2. Select an AI provider
3. Generate comprehensive PRD
4. Export or copy the structured requirements

### Action Plan Generator
1. Paste your PRD or requirements
2. Generate action plan with tasks
3. Review framework recommendations
4. Get architecture guidelines

## Project Structure

```
promptarch/
├── app/              # Next.js app directory
├── components/        # React components
│   ├── ui/           # shadcn/ui components
│   ├── PromptEnhancer.tsx
│   ├── PRDGenerator.tsx
│   ├── ActionPlanGenerator.tsx
│   ├── Sidebar.tsx
│   ├── HistoryPanel.tsx
│   └── SettingsPanel.tsx
├── lib/              # Utilities and services
│   ├── services/      # API integrations
│   │   ├── qwen-oauth.ts
│   │   ├── ollama-cloud.ts
│   │   ├── zai-plan.ts
│   │   └── model-adapter.ts
│   ├── store.ts      # Zustand state management
│   └── utils.ts      # Utility functions
├── types/            # TypeScript types
└── public/           # Static assets
```

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS
- **UI Components**: shadcn/ui + Radix UI
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Icons**: Lucide React

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
