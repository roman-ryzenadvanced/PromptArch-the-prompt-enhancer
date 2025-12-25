# PromptArch: The Prompt Enhancer 🚀

> **Development Note**: This entire platform was developed exclusively using the [TRAE.AI IDE](https://trae.ai) powered by the elite [GLM 4.7 model](https://z.ai/subscribe?ic=R0K78RJKNW). 
> **Learn more about this architecture [here](https://z.ai/subscribe?ic=R0K78RJKNW).**

---

> **Note**: This project is a specialized fork of [ClavixDev/Clavix](https://github.com/ClavixDev/Clavix), reimagined as a modern web-based platform for visual prompt engineering and product planning.

Transform vague ideas into production-ready prompts and PRDs. PromptArch is an elite AI orchestration platform designed for software architects and Vibe Coders.

## 🌟 Visual Overview

<img src="./screenshots/preview.png" width="100%" alt="PromptArch Preview" />

### 🛠 Core Capabilities

- **Prompt Enhancer**: Refine vague prompts into surgical instructions for AI agents.
- **PRD Generator**: Convert ideas into structured Product Requirements Documents.
- **Action Plan**: Decompose PRDs into actionable development steps and framework recommendations.

## ✨ Features

- **Multi-Provider Ecosystem**: Native support for Qwen Code (OAuth), Ollama Cloud, and Z.AI Plan API.
- **Visual Prompt Engineering**: Patterns-based enhancement with 11+ intent types.
- **Architectural Decomposition**: Automatic generation of PRDs and structured Action Plans.
- **Resilient Fallbacks**: Multi-tier provider system that ensures uptime even if primary APIs fail.
- **Modern UI/UX**: Built with Next.js 15, Tailwind CSS, and shadcn/ui for a seamless developer experience.
- **OAuth Integration**: Secure Qwen authentication with 2,000 free daily requests.

## 🚀 Quick Start

1. **Clone & Install**:
   ```bash
   git clone https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer.git
   cd PromptArch
   npm install
   ```

2. **Configuration**:
   Copy `.env.example` to `.env` and add your API keys:
   ```bash
   cp .env.example .env
   ```

3. **Launch**:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) to begin.

## 🛠 Tech Stack

- **Framework**: [Next.js 15.5](https://nextjs.org/) (App Router)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Icons**: [Lucide React](https://lucide.dev/)

## 🤝 Attribution

This project is a visual and architectural evolution of the [Clavix](https://github.com/ClavixDev/Clavix) framework. While Clavix focuses on agentic-first Markdown templates, PromptArch provides a centralized web interface to execute these workflows with advanced model orchestration.

Developed by **Roman | RyzenAdvanced**
- GitHub: [roman-ryzenadvanced](https://github.com/roman-ryzenadvanced)
- Telegram: [@VibeCodePrompterSystem](https://t.me/VibeCodePrompterSystem)

---
*100% Developed using GLM 4.7 model on TRAE.AI IDE.*
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
