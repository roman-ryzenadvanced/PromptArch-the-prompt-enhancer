"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import type { Slide, SlidesPresentation } from "@/types";
import {
    Presentation,
    Copy,
    Loader2,
    CheckCircle2,
    ChevronLeft,
    ChevronRight,
    Download,
    Maximize2,
    Minimize2,
    Settings,
    Globe,
    Palette,
    Users,
    Building2,
    Hash,
    Play,
    Pause,
    Upload,
    X,
    FileText,
    Image as ImageIcon,
    File,
    Sparkles,
    BarChart3,
    TrendingUp,
    Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n/translations";

const LANGUAGES = [
    { code: "en", name: "English", nativeName: "English" },
    { code: "zh", name: "Chinese", nativeName: "中文" },
    { code: "es", name: "Spanish", nativeName: "Español" },
    { code: "fr", name: "French", nativeName: "Français" },
    { code: "de", name: "German", nativeName: "Deutsch" },
    { code: "ja", name: "Japanese", nativeName: "日本語" },
    { code: "ko", name: "Korean", nativeName: "한국어" },
    { code: "ru", name: "Russian", nativeName: "Русский" },
    { code: "ar", name: "Arabic", nativeName: "العربية" },
    { code: "pt", name: "Portuguese", nativeName: "Português" },
    { code: "it", name: "Italian", nativeName: "Italiano" },
    { code: "hi", name: "Hindi", nativeName: "हिन्दी" },
    { code: "tr", name: "Turkish", nativeName: "Türkçe" },
    { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt" },
    { code: "th", name: "Thai", nativeName: "ไทย" },
    { code: "nl", name: "Dutch", nativeName: "Nederlands" },
    { code: "pl", name: "Polish", nativeName: "Polski" },
    { code: "uk", name: "Ukrainian", nativeName: "Українська" },
];

const THEMES = [
    { id: "corporate-blue", name: "Corporate Blue", colors: ["#0f172a", "#3b82f6", "#60a5fa", "#ffffff"], icon: "🏢", gradient: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #1e40af 100%)" },
    { id: "executive-dark", name: "Executive Dark", colors: ["#09090b", "#6366f1", "#a855f7", "#fafafa"], icon: "👔", gradient: "linear-gradient(135deg, #09090b 0%, #18181b 50%, #27272a 100%)" },
    { id: "modern-gradient", name: "Modern Gradient", colors: ["#0c0a09", "#f97316", "#eab308", "#fafaf9"], icon: "✨", gradient: "linear-gradient(135deg, #0c0a09 0%, #1c1917 50%, #292524 100%)" },
    { id: "tech-neon", name: "Tech Neon", colors: ["#020617", "#22d3ee", "#a3e635", "#f8fafc"], icon: "⚡", gradient: "linear-gradient(135deg, #020617 0%, #0c1929 50%, #172554 100%)" },
    { id: "minimal-light", name: "Minimal Light", colors: ["#ffffff", "#18181b", "#71717a", "#f4f4f5"], icon: "◻️", gradient: "linear-gradient(135deg, #ffffff 0%, #f4f4f5 50%, #e4e4e7 100%)" },
    { id: "premium-gold", name: "Premium Gold", colors: ["#1a1a2e", "#d4af37", "#ffd700", "#f5f5dc"], icon: "👑", gradient: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)" },
    { id: "nature-green", name: "Nature Green", colors: ["#14532d", "#22c55e", "#86efac", "#f0fdf4"], icon: "🌿", gradient: "linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%)" },
    { id: "sunset-warm", name: "Sunset Warm", colors: ["#1f1f1f", "#f43f5e", "#fb923c", "#fef2f2"], icon: "🌅", gradient: "linear-gradient(135deg, #1f1f1f 0%, #2d1b1b 50%, #3d2424 100%)" },
];

const AUDIENCES = [
    { id: "executives", name: "Executives & C-Suite", icon: "👔", style: "Sophisticated, data-driven, strategic focus" },
    { id: "investors", name: "Investors & Board", icon: "💼", style: "ROI-focused, metrics-heavy, growth narrative" },
    { id: "technical", name: "Technical Team", icon: "💻", style: "Detailed, architecture diagrams, code snippets" },
    { id: "marketing", name: "Marketing & Sales", icon: "📈", style: "Persuasive, visual storytelling, emotional appeal" },
    { id: "general", name: "General Audience", icon: "👥", style: "Clear, engaging, accessible language" },
    { id: "stakeholders", name: "Stakeholders", icon: "🤝", style: "Project updates, milestones, risk mitigation" },
    { id: "clients", name: "Clients & Customers", icon: "⭐", style: "Benefits-focused, testimonials, case studies" },
];

const ANIMATION_STYLES = [
    { id: "professional", name: "Professional", description: "Subtle fade & slide transitions" },
    { id: "dynamic", name: "Dynamic", description: "Engaging animations with emphasis effects" },
    { id: "minimal", name: "Minimal", description: "Clean, simple transitions only" },
    { id: "impressive", name: "Impressive", description: "Bold animations, parallax, morphing effects" },
];

interface AttachedFile {
    id: string;
    name: string;
    type: string;
    size: number;
    content?: string;
    preview?: string;
    colors?: string[];
}

const ACCEPTED_FILE_TYPES = {
    documents: [".pdf", ".doc", ".docx", ".txt", ".rtf", ".md"],
    presentations: [".pptx", ".ppt", ".key", ".odp"],
    images: [".png", ".jpg", ".jpeg", ".svg", ".webp", ".gif"],
    data: [".json", ".csv", ".xlsx", ".xls"],
    design: [".ase", ".aco", ".gpl", ".css"], // Color palette formats
};

const ALL_ACCEPTED = Object.values(ACCEPTED_FILE_TYPES).flat().join(",");

export default function SlidesGenerator() {
    const {
        selectedProvider,
        selectedModels,
        availableModels,
        apiKeys,
        isProcessing,
        error,
        slidesPresentation,
        setSelectedProvider,
        setSlidesPresentation,
        setProcessing,
        setError,
        setAvailableModels,
        setSelectedModel,
        language: uiLanguage,
    } = useStore();

    const t = translations[uiLanguage].slidesGen;
    const common = translations[uiLanguage].common;

    const [topic, setTopic] = useState("");
    const [language, setLanguage] = useState("en");
    const [theme, setTheme] = useState("executive-dark");
    const [audience, setAudience] = useState("executives");
    const [organization, setOrganization] = useState("");
    const [slideCount, setSlideCount] = useState(10);
    const [animationStyle, setAnimationStyle] = useState("professional");
    const [copied, setCopied] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<AttachedFile[]>([]);
    const [isDragOver, setIsDragOver] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<string | null>(null);
    const slideContainerRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const slideFrameRef = useRef<HTMLIFrameElement>(null);

    const selectedModel = selectedModels[selectedProvider];
    const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

    useEffect(() => {
        if (typeof window !== "undefined") {
            loadAvailableModels();
            const saved = localStorage.getItem("promptarch-api-keys");
            if (saved) {
                try {
                    const keys = JSON.parse(saved);
                    if (keys.qwen) modelAdapter.updateQwenApiKey(keys.qwen);
                    if (keys.ollama) modelAdapter.updateOllamaApiKey(keys.ollama);
                    if (keys.zai) modelAdapter.updateZaiApiKey(keys.zai);
                } catch (e) {
                    console.error("Failed to load API keys:", e);
                }
            }
        }
    }, [selectedProvider]);

    useEffect(() => {
        if (isAutoPlaying && slidesPresentation?.slides) {
            autoPlayRef.current = setInterval(() => {
                setCurrentSlide((prev) =>
                    prev >= (slidesPresentation.slides.length - 1) ? 0 : prev + 1
                );
            }, 5000);
        }
        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
            }
        };
    }, [isAutoPlaying, slidesPresentation?.slides?.length]);

    const loadAvailableModels = async () => {
        const fallbackModels = modelAdapter.getAvailableModels(selectedProvider);
        setAvailableModels(selectedProvider, fallbackModels);

        try {
            const result = await modelAdapter.listModels(selectedProvider);
            if (result.success && result.data) {
                setAvailableModels(selectedProvider, result.data[selectedProvider] || fallbackModels);
            }
        } catch (error) {
            console.error("Failed to load models:", error);
        }
    };

    // Extract colors from image
    const extractColorsFromImage = (file: File): Promise<string[]> => {
        return new Promise((resolve) => {
            const img = document.createElement("img");
            const canvas = document.createElement("canvas");
            const ctx = canvas.getContext("2d");

            img.onload = () => {
                canvas.width = 50;
                canvas.height = 50;
                ctx?.drawImage(img, 0, 0, 50, 50);

                const imageData = ctx?.getImageData(0, 0, 50, 50);
                if (!imageData) {
                    resolve([]);
                    return;
                }

                const colorCounts: Record<string, number> = {};
                for (let i = 0; i < imageData.data.length; i += 4) {
                    const r = Math.round(imageData.data[i] / 32) * 32;
                    const g = Math.round(imageData.data[i + 1] / 32) * 32;
                    const b = Math.round(imageData.data[i + 2] / 32) * 32;
                    const hex = `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
                    colorCounts[hex] = (colorCounts[hex] || 0) + 1;
                }

                const sortedColors = Object.entries(colorCounts)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([color]) => color);

                resolve(sortedColors);
                URL.revokeObjectURL(img.src);
            };

            img.src = URL.createObjectURL(file);
        });
    };

    // Process uploaded file
    const processFile = async (file: File): Promise<AttachedFile | null> => {
        const id = Math.random().toString(36).substr(2, 9);
        const ext = file.name.split(".").pop()?.toLowerCase() || "";

        const attachedFile: AttachedFile = {
            id,
            name: file.name,
            type: file.type || ext,
            size: file.size,
        };

        try {
            // Handle text-based files
            if ([...ACCEPTED_FILE_TYPES.documents, ".json", ".csv", ".css", ".md"].some(e => file.name.endsWith(e))) {
                const text = await file.text();
                attachedFile.content = text.slice(0, 50000); // Limit to 50KB of text

                // Extract colors from CSS files
                if (file.name.endsWith(".css")) {
                    const colorMatches = text.match(/#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|hsl\([^)]+\)/g);
                    if (colorMatches) {
                        attachedFile.colors = [...new Set(colorMatches)].slice(0, 10);
                    }
                }

                // Parse JSON color palettes
                if (file.name.endsWith(".json")) {
                    try {
                        const json = JSON.parse(text);
                        if (json.colors || json.palette) {
                            attachedFile.colors = (json.colors || json.palette).slice(0, 10);
                        }
                    } catch { }
                }
            }

            // Handle images
            if (ACCEPTED_FILE_TYPES.images.some(e => file.name.toLowerCase().endsWith(e))) {
                attachedFile.preview = URL.createObjectURL(file);
                attachedFile.colors = await extractColorsFromImage(file);
            }

            // Handle presentations (extract text content if possible)
            if (ACCEPTED_FILE_TYPES.presentations.some(e => file.name.toLowerCase().endsWith(e))) {
                attachedFile.content = `[Presentation file: ${file.name}] - Analyze structure and content for redesign.`;
            }

            return attachedFile;
        } catch (err) {
            console.error("Error processing file:", err);
            return attachedFile;
        }
    };

    const handleFileDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        await handleFileUpload(files);
    }, []);

    const handleFileUpload = async (files: File[]) => {
        setUploadProgress("Processing files...");

        const newFiles: AttachedFile[] = [];
        for (const file of files) {
            setUploadProgress(`Processing ${file.name}...`);
            const processed = await processFile(file);
            if (processed) {
                newFiles.push(processed);
            }
        }

        setAttachedFiles(prev => [...prev, ...newFiles]);
        setUploadProgress(null);
    };

    const removeFile = (id: string) => {
        setAttachedFiles(prev => {
            const file = prev.find(f => f.id === id);
            if (file?.preview) {
                URL.revokeObjectURL(file.preview);
            }
            return prev.filter(f => f.id !== id);
        });
    };

    const getFileIcon = (type: string, name: string) => {
        if (name.match(/\.(png|jpg|jpeg|svg|webp|gif)$/i)) return <ImageIcon className="h-4 w-4" />;
        if (name.match(/\.(pdf|doc|docx|txt|md)$/i)) return <FileText className="h-4 w-4" />;
        if (name.match(/\.(pptx|ppt|key)$/i)) return <Presentation className="h-4 w-4" />;
        return <File className="h-4 w-4" />;
    };

    const buildFileContext = (): string => {
        if (attachedFiles.length === 0) return "";

        let context = "\n\n## ATTACHED FILES CONTEXT:\n";

        for (const file of attachedFiles) {
            context += `\n### File: ${file.name}\n`;

            if (file.colors && file.colors.length > 0) {
                context += `Brand Colors Extracted: ${file.colors.join(", ")}\n`;
                context += "USE THESE EXACT COLORS in the presentation design.\n";
            }

            if (file.content) {
                context += `Content:\n\`\`\`\n${file.content.slice(0, 10000)}\n\`\`\`\n`;
            }

            if (file.name.match(/\.(pptx|ppt|key)$/i)) {
                context += "This is an existing presentation - analyze its structure and REDESIGN with modern aesthetics while preserving the content flow.\n";
            }
        }

        return context;
    };

    const parseSlides = (content: string): SlidesPresentation | null => {
        try {
            const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
            const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
            const parsed = JSON.parse(jsonStr);

            if (parsed.slides && Array.isArray(parsed.slides)) {
                return {
                    id: Math.random().toString(36).substr(2, 9),
                    title: parsed.title || "Untitled Presentation",
                    subtitle: parsed.subtitle || "",
                    author: parsed.author || "",
                    organization: organization,
                    theme: parsed.theme || theme,
                    language: parsed.language || LANGUAGES.find(l => l.code === language)?.name || "English",
                    slides: parsed.slides.map((slide: any, index: number) => ({
                        id: slide.id || `slide-${index + 1}`,
                        title: slide.title || `Slide ${index + 1}`,
                        content: slide.content || "",
                        htmlContent: slide.htmlContent || generateAnimatedHtml(slide, index),
                        notes: slide.notes || "",
                        layout: slide.layout || "content",
                        order: slide.order || index + 1,
                    })),
                    rawContent: content,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };
            }
        } catch (e) {
            console.error("Failed to parse slides:", e);
        }
        return null;
    };

    const buildSlideDoc = (html: string): string => {
        const normalized = (html || "").trim();
        if (!normalized) return "";
        const isFullDoc = /^<!DOCTYPE/i.test(normalized) || /^<html/i.test(normalized);
        if (isFullDoc) {
            return normalized;
        }
        return `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                  html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
                  body { background: transparent; }
                </style>
              </head>
              <body>
                ${normalized}
              </body>
            </html>
        `;
    };

    const generateAnimatedHtml = (slide: any, index: number): string => {
        const themeConfig = THEMES.find(t => t.id === theme) || THEMES[1];
        const [bg, accent, secondary, text] = themeConfig.colors;
        const gradient = themeConfig.gradient;

        // Get brand colors from attached files if available
        const brandColors = attachedFiles.flatMap(f => f.colors || []).slice(0, 3);
        const primaryColor = brandColors[0] || accent;
        const secondaryColor = brandColors[1] || secondary;

        return `
      <div class="slide-container" style="
        min-height: 100%;
        padding: 4rem;
        background: ${gradient};
        color: ${text};
        font-family: 'Inter', 'SF Pro Display', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        overflow: hidden;
      ">
        <!-- Animated Background Elements -->
        <div style="
          position: absolute;
          top: -50%;
          right: -20%;
          width: 80%;
          height: 150%;
          background: radial-gradient(ellipse at center, ${primaryColor}15 0%, transparent 70%);
          animation: pulse 8s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute;
          bottom: -30%;
          left: -10%;
          width: 60%;
          height: 100%;
          background: radial-gradient(ellipse at center, ${secondaryColor}10 0%, transparent 70%);
          animation: pulse 10s ease-in-out infinite reverse;
        "></div>
        
        <!-- Content -->
        <div style="position: relative; z-index: 2;">
          <h2 style="
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: 2rem;
            line-height: 1.1;
            background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            animation: slideIn 0.8s ease-out;
          ">${slide.title || `Slide ${index + 1}`}</h2>
          
          <div style="
            font-size: 1.35rem;
            line-height: 1.9;
            opacity: 0.95;
            max-width: 90%;
            animation: fadeIn 1s ease-out 0.3s both;
          ">
            ${slide.content || "Content goes here..."}
          </div>
        </div>

        <!-- Decorative Elements -->
        <div style="
          position: absolute;
          bottom: 3rem;
          right: 4rem;
          display: flex;
          gap: 0.5rem;
        ">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${primaryColor}; opacity: 0.6;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${secondaryColor}; opacity: 0.4;"></div>
          <div style="width: 8px; height: 8px; border-radius: 50%; background: ${text}; opacity: 0.2;"></div>
        </div>

        <style>
          @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.7; transform: scale(1.05); }
          }
          @keyframes slideIn {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 0.95; transform: translateY(0); }
          }
        </style>
      </div>
    `;
    };

    const handleGenerate = async () => {
        if (!topic.trim()) {
            setError("Please enter a topic for your presentation");
            return;
        }

        const apiKey = apiKeys[selectedProvider];
        const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

        if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
            setError(`Please configure your ${selectedProvider.toUpperCase()} API key in Settings`);
            return;
        }

        setProcessing(true);
        setError(null);
        setCurrentSlide(0);

        console.log("[SlidesGenerator] Starting animated slides generation...", {
            selectedProvider,
            selectedModel,
            topic,
            language,
            theme,
            animationStyle,
            attachedFilesCount: attachedFiles.length
        });

        try {
            const languageName = LANGUAGES.find(l => l.code === language)?.name || "English";
            const audienceConfig = AUDIENCES.find(a => a.id === audience);
            const animConfig = ANIMATION_STYLES.find(a => a.id === animationStyle);
            const themeConfig = THEMES.find(t => t.id === theme);
            const fileContext = buildFileContext();

            // Build enhanced topic with file context
            const enhancedTopic = `${topic}${fileContext}`;

            const result = await modelAdapter.generateSlides(
                enhancedTopic,
                {
                    language: languageName,
                    theme,
                    slideCount,
                    audience: audienceConfig?.name || "General Audience",
                    organization,
                    animationStyle: animConfig?.name,
                    audienceStyle: audienceConfig?.style,
                    themeColors: themeConfig?.colors,
                    brandColors: attachedFiles.flatMap(f => f.colors || []).slice(0, 5),
                },
                selectedProvider,
                selectedModel
            );

            console.log("[SlidesGenerator] Generation result:", result);

            if (result.success && result.data) {
                const presentation = parseSlides(result.data);
                if (presentation) {
                    setSlidesPresentation(presentation);
                } else {
                    setSlidesPresentation({
                        id: Math.random().toString(36).substr(2, 9),
                        title: topic.slice(0, 50),
                        subtitle: "",
                        organization,
                        theme: theme as any,
                        language: languageName,
                        slides: [{
                            id: "slide-1",
                            title: "Generated Content",
                            content: result.data,
                            htmlContent: `
                <div style="padding: 2rem; font-family: system-ui; background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); min-height: 100%; color: #f8fafc;">
                  <pre style="white-space: pre-wrap; font-size: 0.875rem; opacity: 0.9;">${result.data}</pre>
                </div>
              `,
                            layout: "content",
                            order: 1,
                        }],
                        rawContent: result.data,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                    });
                }
            } else {
                console.error("[SlidesGenerator] Generation failed:", result.error);
                setError(result.error || "Failed to generate slides");
            }
        } catch (err) {
            console.error("[SlidesGenerator] Generation error:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setProcessing(false);
        }
    };

    const handleCopy = async () => {
        if (slidesPresentation?.rawContent) {
            await navigator.clipboard.writeText(slidesPresentation.rawContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownloadMarkdown = () => {
        if (!slidesPresentation) return;

        // Reveal.js format
        const markdown = slidesPresentation.slides.map(s => {
            // Strip HTML but keep structure
            const cleanContent = s.content.replace(/<[^>]*>/g, '').trim();
            return `## ${s.title}\n\n${cleanContent}`;
        }).join('\n\n---\n\n');

        const blob = new Blob([markdown], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slidesPresentation.title.replace(/\s+/g, '_')}_slides.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleDownloadHtml = () => {
        if (!slidesPresentation) return;

        const themeConfig = THEMES.find(t => t.id === slidesPresentation.theme) || THEMES[1];
        const [bg, accent, secondary, text] = themeConfig.colors;
        const brandColors = attachedFiles.flatMap(f => f.colors || []);
        const primaryColor = brandColors[0] || accent;
        const secondaryColor = brandColors[1] || secondary;

        const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slidesPresentation.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Inter', system-ui, sans-serif; 
      background: ${bg}; 
      color: ${text};
      overflow: hidden;
    }
    .slides-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; }
    .slide { 
      width: 100%; 
      height: 100%; 
      display: none; 
      position: absolute;
      top: 0;
      left: 0;
    }
    .slide.active { 
      display: block; 
      animation: slideEnter 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .slide.exit {
      animation: slideExit 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    }
    @keyframes slideEnter {
      from { opacity: 0; transform: translateX(40px); }
      to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideExit {
      from { opacity: 1; transform: translateX(0); }
      to { opacity: 0; transform: translateX(-40px); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.05); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    .controls { 
      position: fixed; 
      bottom: 2rem; 
      left: 50%; 
      transform: translateX(-50%);
      display: flex; 
      gap: 1rem; 
      background: rgba(0,0,0,0.85); 
      backdrop-filter: blur(20px);
      padding: 0.875rem 1.75rem; 
      border-radius: 2rem;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
      z-index: 100;
    }
    .controls button { 
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: white; 
      border: none; 
      padding: 0.625rem 1.25rem;
      border-radius: 0.625rem; 
      cursor: pointer; 
      font-weight: 600;
      font-size: 0.875rem;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 4px 15px ${primaryColor}40;
    }
    .controls button:hover { 
      transform: translateY(-2px) scale(1.02);
      box-shadow: 0 8px 25px ${primaryColor}50;
    }
    .controls button:active {
      transform: translateY(0) scale(0.98);
    }
    .progress-bar {
      position: fixed;
      top: 0;
      left: 0;
      height: 3px;
      background: linear-gradient(90deg, ${primaryColor}, ${secondaryColor});
      transition: width 0.3s ease;
      z-index: 100;
    }
    .slide-counter { 
      position: fixed; 
      bottom: 2rem; 
      right: 2rem; 
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(10px);
      padding: 0.625rem 1.25rem; 
      border-radius: 1rem; 
      font-size: 0.875rem;
      font-weight: 500;
      border: 1px solid rgba(255,255,255,0.1);
      z-index: 100;
    }
    ${organization ? `
    .org-logo {
      position: fixed;
      top: 2rem;
      left: 2rem;
      font-weight: 700;
      font-size: 0.875rem;
      opacity: 0.6;
      z-index: 100;
    }` : ''}
  </style>
</head>
<body>
  <div class="progress-bar" id="progress"></div>
  ${organization ? `<div class="org-logo">${organization}</div>` : ''}
  <div class="slides-container">
    ${slidesPresentation.slides.map((slide, i) => `
      <div class="slide${i === 0 ? ' active' : ''}" data-slide="${i}">
        ${slide.htmlContent}
      </div>
    `).join('')}
  </div>
  <div class="controls">
    <button onclick="prevSlide()">← Prev</button>
    <button onclick="toggleAutoplay()" id="autoplayBtn">▶ Auto</button>
    <button onclick="nextSlide()">Next →</button>
  </div>
  <div class="slide-counter"><span id="current">1</span> / ${slidesPresentation.slides.length}</div>
  <script>
    let current = 0;
    let autoplay = null;
    const slides = document.querySelectorAll('.slide');
    const counter = document.getElementById('current');
    const progress = document.getElementById('progress');
    const autoplayBtn = document.getElementById('autoplayBtn');
    const total = slides.length;
    
    function updateProgress() {
      progress.style.width = ((current + 1) / total * 100) + '%';
    }
    
    function showSlide(n, direction = 1) {
      const prev = current;
      slides[prev].classList.add('exit');
      slides[prev].classList.remove('active');
      
      current = (n + total) % total;
      
      setTimeout(() => {
        slides[prev].classList.remove('exit');
        slides[current].classList.add('active');
      }, 400);
      
      counter.textContent = current + 1;
      updateProgress();
    }
    
    function nextSlide() { showSlide(current + 1, 1); }
    function prevSlide() { showSlide(current - 1, -1); }
    
    function toggleAutoplay() {
      if (autoplay) {
        clearInterval(autoplay);
        autoplay = null;
        autoplayBtn.textContent = '▶ Auto';
      } else {
        autoplay = setInterval(nextSlide, 5000);
        autoplayBtn.textContent = '⏸ Stop';
      }
    }
    
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextSlide(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevSlide(); }
      if (e.key === 'f' || e.key === 'F') document.documentElement.requestFullscreen?.();
      if (e.key === 'Escape' && document.fullscreenElement) document.exitFullscreen?.();
    });
    
    updateProgress();
  </script>
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slidesPresentation.title.replace(/[^a-z0-9]/gi, '_')}_animated_presentation.html`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const toggleFullscreen = () => {
        if (!slideContainerRef.current) return;

        if (!document.fullscreenElement) {
            slideContainerRef.current.requestFullscreen().catch(console.error);
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    };

    const goToSlide = (index: number) => {
        if (slidesPresentation?.slides) {
            setCurrentSlide(Math.max(0, Math.min(index, slidesPresentation.slides.length - 1)));
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    return (
        <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2 text-start">
            {/* Input Panel */}
            <Card className="h-fit">
                <CardHeader className="p-4 lg:p-6 text-start">
                    <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/25">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <span>{t.title}</span>
                        <span className="ml-auto text-[10px] font-normal px-2 py-0.5 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 text-amber-600 border border-amber-200/50">
                            PRO
                        </span>
                    </CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                        {t.description}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 lg:space-y-5 p-4 lg:p-6 pt-0 lg:pt-0">
                    {/* AI Provider Selection */}
                    <div className="space-y-2 text-start">
                        <label className="text-xs lg:text-sm font-medium">{common.aiProvider}</label>
                        <div className="flex flex-wrap gap-1.5 lg:gap-2">
                            {(["qwen", "ollama", "zai"] as const).map((provider) => (
                                <Button
                                    key={provider}
                                    variant={selectedProvider === provider ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedProvider(provider)}
                                    className="capitalize text-xs lg:text-sm h-8 lg:h-9 px-2.5 lg:px-3"
                                >
                                    {provider === "qwen" ? "Qwen" : provider === "ollama" ? "Ollama" : "Z.AI"}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Model Selection */}
                    <div className="space-y-2 text-start">
                        <label className="text-xs lg:text-sm font-medium">{common.model}</label>
                        <select
                            value={selectedModel}
                            onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs lg:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            {models.map((model) => (
                                <option key={model} value={model}>
                                    {model}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Topic Input */}
                    <div className="space-y-2 text-start">
                        <label className="text-xs lg:text-sm font-medium">{uiLanguage === "ru" ? "Тема презентации" : uiLanguage === "he" ? "נושא המצגת" : "Presentation Topic"}</label>
                        <Textarea
                            placeholder={t.placeholder}
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="min-h-[100px] lg:min-h-[120px] resize-y text-sm"
                        />
                    </div>

                    {/* File Upload Zone */}
                    <div className="space-y-2 text-start">
                        <label className="text-xs lg:text-sm font-medium flex items-center gap-1.5">
                            <Upload className="h-3.5 w-3.5 text-blue-500" />
                            {t.attachFiles}
                            <span className="text-[10px] text-muted-foreground font-normal">({uiLanguage === "ru" ? "необязательно" : uiLanguage === "he" ? "אופציונלי" : "Optional"})</span>
                        </label>
                        <div
                            className={cn(
                                "relative border-2 border-dashed rounded-lg p-4 transition-all text-center",
                                isDragOver
                                    ? "border-violet-500 bg-violet-500/5"
                                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                            )}
                            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                            onDragLeave={() => setIsDragOver(false)}
                            onDrop={handleFileDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept={ALL_ACCEPTED}
                                className="hidden"
                                onChange={(e) => e.target.files && handleFileUpload(Array.from(e.target.files))}
                            />
                            <div className="flex flex-col items-center gap-2 cursor-pointer">
                                <div className="p-3 rounded-full bg-muted/50">
                                    <Upload className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-xs font-medium">
                                        {isDragOver ? "Drop files here" : "Drag & drop or click to upload"}
                                    </p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                        PowerPoint, PDFs, Docs, Images, Color Palettes
                                    </p>
                                </div>
                            </div>
                        </div>

                        {uploadProgress && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                {uploadProgress}
                            </div>
                        )}

                        {/* Attached Files List */}
                        {attachedFiles.length > 0 && (
                            <div className="space-y-1.5 mt-2">
                                {attachedFiles.map((file) => (
                                    <div
                                        key={file.id}
                                        className="flex items-center gap-2 p-2 rounded-md bg-muted/30 border text-xs group"
                                    >
                                        {file.preview ? (
                                            <img src={file.preview} alt="" className="w-8 h-8 rounded object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                                                {getFileIcon(file.type, file.name)}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{file.name}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                                {formatFileSize(file.size)}
                                                {file.colors && file.colors.length > 0 && (
                                                    <span className="ml-2">
                                                        • {file.colors.length} colors extracted
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        {file.colors && file.colors.length > 0 && (
                                            <div className="flex gap-0.5">
                                                {file.colors.slice(0, 4).map((color, i) => (
                                                    <div
                                                        key={i}
                                                        className="w-4 h-4 rounded-sm border border-white/20"
                                                        style={{ backgroundColor: color }}
                                                        title={color}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                        <button
                                            onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                            className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Language & Theme Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2 text-start">
                            <label className="text-xs lg:text-sm font-medium flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-blue-500" />
                                {t.language}
                            </label>
                            <select
                                value={language}
                                onChange={(e) => setLanguage(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs lg:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {LANGUAGES.map((lang) => (
                                    <option key={lang.code} value={lang.code}>
                                        {lang.nativeName} ({lang.name})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs lg:text-sm font-medium flex items-center gap-1.5">
                                <Palette className="h-3.5 w-3.5 text-purple-500" />
                                Theme
                            </label>
                            <select
                                value={theme}
                                onChange={(e) => setTheme(e.target.value)}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs lg:text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                                {THEMES.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        {t.icon} {t.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Animation Style */}
                    <div className="space-y-2 text-start">
                        <label className="text-xs lg:text-sm font-medium flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" />
                            {t.animations}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {ANIMATION_STYLES.map((style) => (
                                <button
                                    key={style.id}
                                    onClick={() => setAnimationStyle(style.id)}
                                    className={cn(
                                        "p-2.5 rounded-lg border text-left transition-all",
                                        animationStyle === style.id
                                            ? "border-violet-500 bg-violet-500/10"
                                            : "border-muted hover:border-violet-300"
                                    )}
                                >
                                    <p className="text-xs font-medium">{style.name}</p>
                                    <p className="text-[10px] text-muted-foreground">{style.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Advanced Options Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        {showAdvanced ? (uiLanguage === "ru" ? "Скрыть" : uiLanguage === "he" ? "הסתר" : "Hide") : (uiLanguage === "ru" ? "Показать" : uiLanguage === "he" ? "הצג" : "Show")} {uiLanguage === "ru" ? "Раширенные настройки" : uiLanguage === "he" ? "אפשרויות מתקדמות" : "Advanced Options"}
                    </button>

                    {/* Advanced Options */}
                    {showAdvanced && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border text-start">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2 text-start">
                                    <label className="text-xs font-medium flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-green-500" />
                                        {t.audience}
                                    </label>
                                    <select
                                        value={audience}
                                        onChange={(e) => setAudience(e.target.value)}
                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {AUDIENCES.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.icon} {a.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-medium flex items-center gap-1.5">
                                        <Hash className="h-3.5 w-3.5 text-orange-500" />
                                        Number of Slides
                                    </label>
                                    <select
                                        value={slideCount}
                                        onChange={(e) => setSlideCount(parseInt(e.target.value))}
                                        className="w-full rounded-md border border-input bg-background px-2.5 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                        {[5, 8, 10, 12, 15, 20, 25, 30].map((n) => (
                                            <option key={n} value={n}>{n} slides</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-medium flex items-center gap-1.5">
                                    <Building2 className="h-3.5 w-3.5 text-cyan-500" />
                                    Organization Name (Optional)
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g., Acme Corporation"
                                    value={organization}
                                    onChange={(e) => setOrganization(e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                />
                            </div>

                            {/* Feature badges */}
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-200/50 flex items-center gap-1">
                                    <BarChart3 className="h-2.5 w-2.5" /> SVG Charts
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-200/50 flex items-center gap-1">
                                    <Sparkles className="h-2.5 w-2.5" /> Animations
                                </span>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-600 border border-green-200/50 flex items-center gap-1">
                                    <TrendingUp className="h-2.5 w-2.5" /> Data Viz
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-2.5 lg:p-3 text-xs lg:text-sm text-destructive">
                            {error}
                            {!apiKeys[selectedProvider] && (
                                <div className="mt-1.5 lg:mt-2 flex items-center gap-2">
                                    <Settings className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    <span className="text-[10px] lg:text-xs">Configure API key in Settings</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={isProcessing || !topic.trim()}
                        className="w-full h-10 lg:h-11 text-sm lg:text-base font-medium bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 shadow-lg shadow-violet-500/25"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t.generating}
                            </>
                        ) : (
                            <>
                                <Sparkles className="mr-2 h-4 w-4" />
                                {t.generate}
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Preview Panel */}
            <Card className={cn("overflow-hidden", !slidesPresentation && "opacity-60")}>
                <CardHeader className="p-4 lg:p-6 pb-3">
                    <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className={cn("h-4 w-4 lg:h-5 lg:w-5", slidesPresentation ? "text-green-500" : "text-muted-foreground")} />
                            {uiLanguage === "ru" ? "Предпросмотр слайдов" : uiLanguage === "he" ? "תצוגה מקדימה של השקופיות" : "Slide Preview"}
                        </span>
                        {slidesPresentation && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setIsAutoPlaying(!isAutoPlaying)} className="h-8 w-8">
                                    {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8">
                                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDownloadHtml} title="Download HTML Presentation" className="h-8 w-8">
                                    <Download className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDownloadMarkdown} title="Export Reveal.js Markdown" className="h-8 w-8 text-blue-500">
                                    <FileText className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8">
                                    {copied ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                                </Button>
                            </div>
                        )}
                    </CardTitle>
                    {slidesPresentation && (
                        <CardDescription className="text-xs lg:text-sm">
                            {slidesPresentation.title} • {slidesPresentation.slides.length} slides • {slidesPresentation.language}
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="p-4 lg:p-6 pt-0">
                    {slidesPresentation ? (
                        <div className="space-y-4">
                            {/* Slide Display */}
                            <div
                                ref={slideContainerRef}
                                className="relative aspect-video rounded-lg overflow-hidden border bg-slate-900 shadow-2xl"
                            >
                                <iframe
                                    ref={slideFrameRef}
                                    title="Slide Preview"
                                    className="absolute inset-0 w-full h-full border-none"
                                    sandbox="allow-scripts"
                                    srcDoc={buildSlideDoc(slidesPresentation.slides[currentSlide]?.htmlContent || "")}
                                />

                                {/* Navigation Arrows */}
                                <button
                                    onClick={() => goToSlide(currentSlide - 1)}
                                    disabled={currentSlide === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => goToSlide(currentSlide + 1)}
                                    disabled={currentSlide >= slidesPresentation.slides.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>

                                {/* Progress Bar */}
                                <div className="absolute top-0 left-0 right-0 h-1 bg-black/30">
                                    <div
                                        className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300"
                                        style={{ width: `${((currentSlide + 1) / slidesPresentation.slides.length) * 100}%` }}
                                    />
                                </div>

                                {/* Slide Counter */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-sm">
                                    {currentSlide + 1} / {slidesPresentation.slides.length}
                                </div>
                            </div>

                            {/* Slide Thumbnails */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {slidesPresentation.slides.map((slide, index) => (
                                    <button
                                        key={slide.id}
                                        onClick={() => setCurrentSlide(index)}
                                        className={cn(
                                            "flex-shrink-0 w-20 h-12 rounded border-2 overflow-hidden transition-all",
                                            currentSlide === index
                                                ? "border-violet-500 ring-2 ring-violet-500/30"
                                                : "border-muted hover:border-violet-300"
                                        )}
                                    >
                                        <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-[8px] text-white/70 font-medium">
                                            {index + 1}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Current Slide Info */}
                            <div className="p-3 rounded-lg bg-muted/30 border">
                                <h4 className="font-medium text-sm mb-1">
                                    {slidesPresentation.slides[currentSlide]?.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                    {slidesPresentation.slides[currentSlide]?.content}
                                </p>
                                {slidesPresentation.slides[currentSlide]?.notes && (
                                    <p className="text-xs text-blue-500 mt-2 italic">
                                        Notes: {slidesPresentation.slides[currentSlide]?.notes}
                                    </p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex h-[300px] lg:h-[400px] items-center justify-center text-center italic">
                            <div className="space-y-3">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center">
                                    <Sparkles className="h-8 w-8 text-violet-500/50" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">{t.emptyState}</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        {uiLanguage === "ru" ? "Введите тему и создайте анимированные слайды" : uiLanguage === "he" ? "הזן נושא וחולל שקופיות אקטיביות" : "Enter a topic and generate your animated slides"}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
