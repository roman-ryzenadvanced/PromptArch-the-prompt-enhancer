"use client";

import { useState, useEffect, useRef } from "react";
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
    RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    { id: "corporate", name: "Corporate", colors: ["#1e3a5f", "#2563eb", "#ffffff"], icon: "🏢" },
    { id: "modern", name: "Modern", colors: ["#0f172a", "#6366f1", "#f8fafc"], icon: "✨" },
    { id: "minimal", name: "Minimal", colors: ["#ffffff", "#374151", "#f3f4f6"], icon: "◻️" },
    { id: "dark", name: "Dark Mode", colors: ["#0a0a0a", "#a855f7", "#fafafa"], icon: "🌙" },
    { id: "vibrant", name: "Vibrant", colors: ["#7c3aed", "#ec4899", "#fef3c7"], icon: "🎨" },
    { id: "gradient", name: "Gradient", colors: ["#667eea", "#764ba2", "#ffffff"], icon: "🌈" },
];

const AUDIENCES = [
    { id: "executives", name: "Executives & C-Suite", icon: "👔" },
    { id: "investors", name: "Investors & Stakeholders", icon: "💼" },
    { id: "technical", name: "Technical Team", icon: "💻" },
    { id: "marketing", name: "Marketing & Sales", icon: "📈" },
    { id: "general", name: "General Audience", icon: "👥" },
    { id: "students", name: "Students & Educators", icon: "🎓" },
    { id: "customers", name: "Customers & Clients", icon: "🤝" },
];

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
    } = useStore();

    const [topic, setTopic] = useState("");
    const [language, setLanguage] = useState("en");
    const [theme, setTheme] = useState("modern");
    const [audience, setAudience] = useState("general");
    const [organization, setOrganization] = useState("");
    const [slideCount, setSlideCount] = useState(8);
    const [copied, setCopied] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const slideContainerRef = useRef<HTMLDivElement>(null);
    const autoPlayRef = useRef<NodeJS.Timeout | null>(null);

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

    const parseSlides = (content: string): SlidesPresentation | null => {
        try {
            // Try to extract JSON from markdown code blocks
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
                        htmlContent: slide.htmlContent || generateDefaultHtml(slide, index),
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

    const generateDefaultHtml = (slide: any, index: number): string => {
        const themeConfig = THEMES.find(t => t.id === theme) || THEMES[1];
        const [bg, accent, text] = themeConfig.colors;

        return `
      <div style="
        min-height: 100%;
        padding: 3rem;
        background: linear-gradient(135deg, ${bg} 0%, ${accent}22 100%);
        color: ${theme === 'minimal' ? '#1f2937' : text};
        font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
        display: flex;
        flex-direction: column;
        justify-content: center;
      ">
        <h2 style="
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 1.5rem;
          background: linear-gradient(90deg, ${accent}, ${accent}cc);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        ">${slide.title || `Slide ${index + 1}`}</h2>
        <div style="font-size: 1.25rem; line-height: 1.8; opacity: 0.9;">
          ${slide.content || "Content goes here..."}
        </div>
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

        console.log("[SlidesGenerator] Starting slides generation...", {
            selectedProvider,
            selectedModel,
            topic,
            language,
            theme
        });

        try {
            const languageName = LANGUAGES.find(l => l.code === language)?.name || "English";
            const audienceName = AUDIENCES.find(a => a.id === audience)?.name || "General Audience";

            const result = await modelAdapter.generateSlides(
                topic,
                {
                    language: languageName,
                    theme,
                    slideCount,
                    audience: audienceName,
                    organization,
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
                    // Fallback: create a simple presentation with the raw content
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
                <div style="padding: 2rem; font-family: system-ui;">
                  <pre style="white-space: pre-wrap; font-size: 0.875rem;">${result.data}</pre>
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

    const handleDownloadHtml = () => {
        if (!slidesPresentation) return;

        const themeConfig = THEMES.find(t => t.id === slidesPresentation.theme) || THEMES[1];
        const [bg, accent, text] = themeConfig.colors;

        const html = `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${slidesPresentation.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', system-ui, sans-serif; background: ${bg}; color: ${text}; }
    .slides-container { width: 100vw; height: 100vh; overflow: hidden; position: relative; }
    .slide { width: 100%; height: 100%; display: none; animation: fadeIn 0.5s ease; }
    .slide.active { display: block; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .controls { position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%); 
      display: flex; gap: 1rem; background: rgba(0,0,0,0.8); padding: 0.75rem 1.5rem; border-radius: 2rem; }
    .controls button { background: ${accent}; color: white; border: none; padding: 0.5rem 1rem; 
      border-radius: 0.5rem; cursor: pointer; font-weight: 500; transition: all 0.2s; }
    .controls button:hover { transform: scale(1.05); }
    .slide-counter { position: fixed; bottom: 2rem; right: 2rem; background: rgba(0,0,0,0.6); 
      padding: 0.5rem 1rem; border-radius: 1rem; font-size: 0.875rem; }
  </style>
</head>
<body>
  <div class="slides-container">
    ${slidesPresentation.slides.map((slide, i) => `
      <div class="slide${i === 0 ? ' active' : ''}" data-slide="${i}">
        ${slide.htmlContent}
      </div>
    `).join('')}
  </div>
  <div class="controls">
    <button onclick="prevSlide()">← Previous</button>
    <button onclick="nextSlide()">Next →</button>
  </div>
  <div class="slide-counter"><span id="current">1</span> / ${slidesPresentation.slides.length}</div>
  <script>
    let current = 0;
    const slides = document.querySelectorAll('.slide');
    const counter = document.getElementById('current');
    
    function showSlide(n) {
      slides.forEach(s => s.classList.remove('active'));
      current = (n + slides.length) % slides.length;
      slides[current].classList.add('active');
      counter.textContent = current + 1;
    }
    
    function nextSlide() { showSlide(current + 1); }
    function prevSlide() { showSlide(current - 1); }
    
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight' || e.key === ' ') nextSlide();
      if (e.key === 'ArrowLeft') prevSlide();
    });
  </script>
</body>
</html>`;

        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${slidesPresentation.title.replace(/[^a-z0-9]/gi, '_')}_presentation.html`;
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

    return (
        <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 xl:grid-cols-2">
            {/* Input Panel */}
            <Card className="h-fit">
                <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                            <Presentation className="h-4 w-4" />
                        </div>
                        Slides Generator
                    </CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                        Generate stunning HTML5 presentation slides with multi-language support
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 lg:space-y-5 p-4 lg:p-6 pt-0 lg:pt-0">
                    {/* AI Provider Selection */}
                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">AI Provider</label>
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
                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">Model</label>
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
                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">Presentation Topic</label>
                        <Textarea
                            placeholder="e.g., Q4 2024 Company Performance Review, AI in Healthcare: Transforming Patient Care, Product Launch Strategy for Global Markets..."
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="min-h-[100px] lg:min-h-[120px] resize-y text-sm"
                        />
                    </div>

                    {/* Language & Theme Row */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs lg:text-sm font-medium flex items-center gap-1.5">
                                <Globe className="h-3.5 w-3.5 text-blue-500" />
                                Language
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

                    {/* Advanced Options Toggle */}
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <Settings className="h-3.5 w-3.5" />
                        {showAdvanced ? "Hide" : "Show"} Advanced Options
                    </button>

                    {/* Advanced Options */}
                    {showAdvanced && (
                        <div className="space-y-3 p-3 rounded-lg bg-muted/30 border">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium flex items-center gap-1.5">
                                        <Users className="h-3.5 w-3.5 text-green-500" />
                                        Target Audience
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
                                        {[5, 8, 10, 12, 15, 20].map((n) => (
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
                        className="w-full h-10 lg:h-11 text-sm lg:text-base font-medium bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Generating Slides...
                            </>
                        ) : (
                            <>
                                <Presentation className="mr-2 h-4 w-4" />
                                Generate Presentation
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
                            Slide Preview
                        </span>
                        {slidesPresentation && (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => setIsAutoPlaying(!isAutoPlaying)} className="h-8 w-8">
                                    {isAutoPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={toggleFullscreen} className="h-8 w-8">
                                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={handleDownloadHtml} className="h-8 w-8">
                                    <Download className="h-3.5 w-3.5" />
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
                                <div
                                    className="absolute inset-0"
                                    dangerouslySetInnerHTML={{
                                        __html: slidesPresentation.slides[currentSlide]?.htmlContent || ""
                                    }}
                                />

                                {/* Navigation Arrows */}
                                <button
                                    onClick={() => goToSlide(currentSlide - 1)}
                                    disabled={currentSlide === 0}
                                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => goToSlide(currentSlide + 1)}
                                    disabled={currentSlide >= slidesPresentation.slides.length - 1}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 text-white hover:bg-black/70 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>

                                {/* Slide Counter */}
                                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium">
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
                                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-[8px] text-white/70 font-medium">
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
                        <div className="flex h-[300px] lg:h-[400px] items-center justify-center text-center">
                            <div className="space-y-3">
                                <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
                                    <Presentation className="h-8 w-8 text-violet-500/50" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground">No presentation yet</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        Enter a topic and generate your slides
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
