"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import {
    MessageSquare, Send, Code2, Palette, Search,
    Trash2, Copy, Monitor, StopCircle, X, Zap, Ghost,
    Wand2, LayoutPanelLeft, Play, Orbit, Plus, Key
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";
import { AIAssistMessage } from "@/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import useStore from "@/lib/store";
import { translations } from "@/lib/i18n/translations";
import modelAdapter from "@/lib/services/adapter-instance";

// --- Types ---

interface PreviewData {
    type: string;
    data: string;
    language?: string;
    isStreaming?: boolean;
}

// --- Specialized Components ---

/**
 * A ultra-stable iframe wrapper that avoids hydration issues
 * and provides a WOW visual experience.
 */

// Error Boundary for Canvas crashes
class CanvasErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: string | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="h-full flex flex-col items-center justify-center bg-[#0b1414] p-8 text-center rounded-b-2xl">
                    <StopCircle className="h-10 w-10 text-red-500/40 mb-4" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-red-400 mb-2">Canvas Crashed</h4>
                    <p className="text-[10px] font-mono text-slate-500 max-w-xs">{this.state.error}</p>
                    <button
                        onClick={() => this.setState({ hasError: false, error: null })}
                        className="mt-4 px-3 py-1.5 text-[9px] font-black uppercase tracking-widest text-blue-400 border border-blue-500/30 rounded-xl hover:bg-blue-500/10 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
const BuildingArtifact = ({ type }: { type: string }) => {
    const [progress, setProgress] = useState(0);
    const steps = [
        "Initializing neural links...",
        "Scaffolding architecture...",
        "Writing logic blocks...",
        "Injecting dynamic modules...",
        "Finalizing interactive layers..."
    ];
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress(p => (p < 95 ? p + (100 - p) * 0.1 : p));
            setCurrentStep(s => (s < steps.length - 1 ? s + 1 : s));
        }, 2000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0b1414] text-white p-8 animate-in fade-in duration-500 rounded-b-2xl">
            <div className="relative w-24 h-24 mb-10">
                <div className="absolute inset-0 border-4 border-blue-500/10 rounded-full" />
                <div className="absolute inset-0 border-4 border-blue-500 rounded-full animate-spin border-t-transparent" />
                <Orbit className="absolute inset-0 m-auto h-12 w-12 text-blue-400 animate-pulse" />
            </div>

            <h3 className="text-2xl font-black uppercase tracking-[0.3em] mb-4 text-white drop-shadow-lg">
                Building <span className="text-blue-500">{type}</span>
            </h3>

            <div className="w-full max-w-sm h-1.5 bg-slate-800/50 rounded-full overflow-hidden mb-10 backdrop-blur-sm border border-white/5">
                <div className="h-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
            </div>

            <div className="space-y-4 w-full max-w-xs">
                {steps.map((step, idx) => (
                    <div key={idx} className={`flex items-center gap-4 transition-all duration-500 ${idx <= currentStep ? 'opacity-100' : 'opacity-20'}`}>
                        <div className={`h-2 w-2 rounded-full ${idx <= currentStep ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300">
                            {step}
                        </span>
                        {idx < currentStep && <Zap className="h-3.5 w-3.5 text-blue-400 animate-pulse ml-auto" />}
                    </div>
                ))}
            </div>
        </div>
    );
};
const LiveCanvas = memo(({ data, type, isStreaming }: { data: string, type: string, isStreaming: boolean }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [renderError, setRenderError] = useState<string | null>(null);

    useEffect(() => {
        if (!iframeRef.current || !data || isStreaming) return;
        setRenderError(null);

        // Decode HTML entities if present
        const isEncodedHtml = data.includes("&lt;") && data.includes("&gt;");
        const normalized = isEncodedHtml
            ? data
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, "\"")
                .replace(/&#39;/g, "'")
            : data;

        // Check if the content is a full HTML document or a fragment
        const trimmed = normalized.trim();
        const isFullDocument = /^<!DOCTYPE/i.test(trimmed) || /^<html/i.test(trimmed);
        const hasHeadTag = /<head[\s>]/i.test(normalized);
        const isReactLike = normalized.includes("import React") || normalized.includes("useState") || normalized.includes("useEffect") || /<[A-Z][\s\S]*>/.test(normalized);

        let doc: string;
        try {
            if (isFullDocument) {
                // If it's a full document, inject Tailwind CSS but keep the structure
                const reactScripts = isReactLike ? `
                    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                ` : "";

                if (hasHeadTag) {
                    doc = normalized.replace(/<head>/i, `<head>
                        ${reactScripts}
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap">
                    `);
                } else {
                    doc = normalized.replace(/<html[^>]*>/i, (match) => `${match}
                        <head>
                            ${reactScripts}
                            <script src="https://cdn.tailwindcss.com"></script>
                            <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap">
                        </head>
                    `);
                }
            } else if (isReactLike) {
                // Specialized React Runner for fragments/components
                const cleanedCode = normalized
                    .replace(/import\s+(?:React\s*,\s*)?{?([\s\S]*?)}?\s+from\s+['"]react['"];?/g, "const { $1 } = React;")
                    .replace(/import\s+React\s+from\s+['"]react['"];?/g, "/* React already global */")
                    .replace(/import\s+[\s\S]*?from\s+['"]lucide-react['"];?/g, "const { ...lucide } = window.lucide || {};")
                    .replace(/export\s+default\s+/g, "const MainComponent = ");

                // Try to find the component name to render
                const componentMatch = cleanedCode.match(/const\s+([A-Z]\w+)\s*=\s*\(\)\s*=>/);
                const mainComponent = componentMatch ? componentMatch[1] : (cleanedCode.includes("MainComponent") ? "MainComponent" : null);

                doc = `
                    <!DOCTYPE html>
                    <html class="dark">
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <script src="https://cdn.tailwindcss.com"></script>
                        <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
                        <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
                        <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
                        <script src="https://unpkg.com/lucide@latest"></script>
                        <style>
                           body { margin: 0; padding: 20px; font-family: sans-serif; background: #0b1414; color: white; }
                           #root { min-height: 100vh; }
                        </style>
                      </head>
                      <body>
                        <div id="root"></div>
                        <script type="text/babel">
                            ${cleanedCode}
                            
                            ${mainComponent ? `
                            const root = ReactDOM.createRoot(document.getElementById('root'));
                            root.render(React.createElement(${mainComponent}));
                            ` : `
                            // No clear component found to mount, executing raw code
                            `}
                        </script>
                      </body>
                    </html>
                `;
            } else {
                // Wrap fragments in a styled container
                doc = `
                    <!DOCTYPE html>
                    <html class="dark">
                      <head>
                        <meta charset="utf-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1">
                        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap">
                        <script src="https://cdn.tailwindcss.com"></script>
                        <script>
                          tailwind.config = {
                            darkMode: 'class',
                            theme: {
                              extend: {
                                colors: {
                                  primary: { 50: '#ecfdf3', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' }
                                }
                              }
                            }
                          }
                        </script>
                        <style>
                          ::-webkit-scrollbar { width: 8px; }
                          ::-webkit-scrollbar-track { background: transparent; }
                          ::-webkit-scrollbar-thumb { background: #115e59; border-radius: 4px; }
                          ::-webkit-scrollbar-thumb:hover { background: #0f766e; }
                          body {
                            margin: 0; 
                            padding: 24px; 
                            font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
                            background: #f8fafc; 
                            color: #1e293b;
                            min-height: 100vh;
                          }
                        </style>
                      </head>
                      <body>
                        ${normalized}
                      </body>
                    </html>
                `;
            }

            if (iframeRef.current) {
                iframeRef.current.srcdoc = doc;
            }
        } catch (e) {
            console.error("Canvas Render Error:", e);
            setRenderError(e instanceof Error ? e.message : "Internal rendering failure");
        }
    }, [data, type, isStreaming]);

    return (
        <div className="w-full h-full relative group bg-[#0b1414] overflow-hidden rounded-b-2xl">
            {isStreaming && <BuildingArtifact type={type} />}

            {renderError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center animate-in zoom-in-95 duration-300">
                    <StopCircle className="h-10 w-10 text-red-500/40 mb-5" />
                    <h4 className="text-xs font-black uppercase tracking-[0.2em] text-red-400 mb-3">Runtime Execution Error</h4>
                    <p className="text-[9px] font-mono text-slate-500 max-w-sm border border-red-500/10 bg-red-500/5 p-4 rounded-xl leading-relaxed">
                        {renderError}
                    </p>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-6 text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-white"
                        onClick={() => window.location.reload()}
                    >
                        Try Refreshing Page
                    </Button>
                </div>
            ) : (
                <iframe
                    ref={iframeRef}
                    title="Canvas Preview"
                    className={`w-full h-full border-none bg-[#0b1414] shadow-inner transition-all duration-1000 ${isStreaming ? 'opacity-0 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}
                    sandbox="allow-scripts"
                />
            )}

            {isStreaming && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500/20 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_1.5s_infinite]" />
                </div>
            )}
        </div>
    );
});

LiveCanvas.displayName = "LiveCanvas";

const ThinkingIndicator = () => (
    <div className="flex items-center gap-1.5 px-4 py-3 bg-white dark:bg-[#0f1a1a]/80 border border-blue-100/70 dark:border-blue-900/50 rounded-2xl rounded-tl-none shadow-sm backdrop-blur-xl animate-in fade-in duration-300">
        <div className="flex gap-1">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.3s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce [animation-delay:-0.15s]" />
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" />
        </div>
        <span className="text-[10px] font-black text-blue-700/60 dark:text-blue-200/60 uppercase tracking-widest ml-2">Neural Link Thinking...</span>
    </div>
);

// --- Helper Functions ---

function parseStreamingContent(text: string, currentAgent: string) {
    let agent = currentAgent;
    let preview: PreviewData | null = null;
    let chatDisplay = text.trim();
    let status: string | null = null;

    const decodeHtml = (value: string) => value
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;/g, "'");
    const stripFences = (value: string) => {
        const fenced = value.match(/```(?:html|css|javascript|tsx|jsx|md|markdown)?\s*([\s\S]*?)```/i);
        return fenced ? fenced[1].trim() : value.trim();
    };

    // 1. Detect Agent (be flexible with brackets and keywords like APP/WEB/SEO)
    const agentMatch = text.match(/\[+(?:AGENT|content|seo|smm|pm|code|design|web|app):([\w-]+)\]+/i);
    if (agentMatch) agent = agentMatch[1].toLowerCase();

    // 2. Detect Preview (flexible brackets)
    const previewMatch = text.match(/\[+PREVIEW:([\w-]+):?([\w-]+)?\]+([\s\S]*?)(?:\[\/(?:PREVIEW|APP|WEB|SEO|CODE|DESIGN|SMM|PM|CONTENT)\]+|$)/i);
    if (previewMatch) {
        preview = {
            type: previewMatch[1],
            language: previewMatch[2] || "text",
            data: previewMatch[3].trim(),
            isStreaming: !/\[\/(?:PREVIEW|APP|WEB|SEO|CODE|DESIGN|SMM|PM|CONTENT)\]+/i.test(text)
        };
        if (preview.isStreaming) {
            const isUpdate = text.toLowerCase().includes("update") || text.toLowerCase().includes("fix") || text.toLowerCase().includes("change");
            status = isUpdate ? `Applying surgical edits to ${preview.type}...` : `Generating ${preview.type} artifact...`;
        }
    }

    // 3. Clean display text - hide all tag-like sequences and their partials
    chatDisplay = text
        // Hide complete tags (flexible brackets)
        .replace(/\[+(?:AGENT|content|seo|smm|pm|code|design|web|app|PREVIEW|APP|WEB|SEO|CODE|DESIGN|SMM|PM|CONTENT|PREV):?[\w-]*:?[\w-]*\]+/gi, "")
        // Hide content inside preview block (cleanly)
        .replace(/\[+PREVIEW:[\w-]+:?[\w-]+?\]+[\s\S]*?(?:\[\/(?:PREVIEW|APP|WEB|SEO|CODE|DESIGN|SMM|PM|CONTENT)\]+|$)/gi, "")
        // Hide closing tags
        .replace(/\[\/(?:PREVIEW|APP|WEB|SEO|CODE|DESIGN|SMM|PM|CONTENT)\]+/gi, "")
        // Hide ANY partial tag sequence at the very end (greedy)
        .replace(/\[+[^\]]*$/g, "")
        .trim();

    if (!preview) {
        const fenced = text.match(/```(html|css|javascript|typescript|tsx|jsx|md|markdown)\s*([\s\S]*?)```/i);
        if (fenced) {
            const language = fenced[1].toLowerCase();
            const data = fenced[2].trim();
            const isReactLike = data.includes("import React") || data.includes("useState") || /<[A-Z][\s\S]*>/.test(data);

            preview = {
                type: (language === "html" || isReactLike) ? "app" : "code",
                language,
                data,
                isStreaming: false
            };
        }
    }

    if (preview) {
        const htmlSignal = preview.data.toLowerCase().includes("<!doctype") || preview.data.toLowerCase().includes("<html");
        const isHtmlLike = ["web", "app", "design", "html", "ui"].includes(preview.type) || preview.language === "html" || htmlSignal;
        if (htmlSignal && preview.type === "code") {
            preview.type = "web";
        }
        if (isHtmlLike) {
            preview.data = decodeHtml(stripFences(preview.data));
        }

        // CRITICAL: Strip any change log that leaked into preview data
        // The change log should be in chat, not rendered in canvas
        preview.data = preview.data
            // Strip closing tags followed by change logs
            .replace(/\[\/[a-z]+:[a-z]+\]\s*\*?\*?Change\s*Log:?\*?\*?[\s\S]*$/i, '')
            // Strip change log sections at end (various formats)
            .replace(/\n\s*\*?\*?\s*Change\s*Log\s*:?\s*\*?\*?\s*\n[\s\S]*$/i, '')
            .replace(/\n\s*##+\s*Change\s*Log[\s\S]*$/i, '')
            .replace(/\n\s*---+\s*\n\s*\*?\*?Change\s*Log[\s\S]*$/i, '')
            // Strip "Changes Made:" or similar sections
            .replace(/\n\s*\*?\*?\s*Changes\s*(Made|Applied|Implemented)\s*:?\s*\*?\*?\s*\n[\s\S]*$/i, '')
            // Strip update/modification logs
            .replace(/\n\s*\*?\*?\s*Updates?\s*:?\s*\*?\*?\s*\n\s*[-*]\s+[\s\S]*$/i, '')
            // Final catch - any markdown list at the very end that looks like changes
            .replace(/\*?\*?Change\s*Log:?\*?\*?[\s\S]*$/i, function (match) {
                // Only strip if it's at the end and looks like a change log section
                if (match.length > 500) return match; // Probably part of the app, not a log
                return '';
            })
            .trim();
    }

    if (!preview && !text.includes("[PREVIEW")) {
        const htmlDoc = text.match(/<!doctype\s+html[\s\S]*$/i) || text.match(/<html[\s\S]*$/i);
        if (htmlDoc) {
            preview = {
                type: "web",
                language: "html",
                data: decodeHtml(stripFences(htmlDoc[0])),
                isStreaming: false
            };
        }
    }

    if (!chatDisplay && preview && preview.isStreaming) {
        chatDisplay = "Rendering live artifact...";
    }

    return { chatDisplay, preview, agent, status };
}

// --- Main Component ---

export default function AIAssist() {
    const {
        language,
        aiAssistTabs,
        activeTabId,
        setActiveTabId,
        addAIAssistTab,
        removeAIAssistTab,
        updateActiveTab,
        updateTabById,
        selectedProvider,
        selectedModels,
        setSelectedModel,
        setSelectedProvider
    } = useStore();
    const t = translations[language].aiAssist;
    const common = translations[language].common;

    const activeTab = aiAssistTabs?.find(tab => tab.id === activeTabId) || aiAssistTabs?.[0] || {
        id: 'default',
        title: t.newChat,
        history: [],
        currentAgent: 'general',
        previewData: null,
        showCanvas: false
    };
    const aiAssistHistory = activeTab?.history || [];

    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentAgent, setCurrentAgent] = useState(activeTab?.currentAgent || "general");
    const [previewData, setPreviewData] = useState<PreviewData | null>(activeTab?.previewData || null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [showCanvas, setShowCanvas] = useState(activeTab?.showCanvas === true);
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    // Agentic States
    const [assistStep, setAssistStep] = useState<"idle" | "plan" | "generating" | "preview">("idle");
    const [aiPlan, setAiPlan] = useState<any>(null);
    const [isAuthenticatingQwen, setIsAuthenticatingQwen] = useState(false);
    const [qwenAuthError, setQwenAuthError] = useState<string | null>(null);

    // Check if Qwen is authenticated
    const isQwenAuthed = modelAdapter.hasQwenAuth();

    // Sync local state when tab changes - FULL ISOLATION
    useEffect(() => {
        // Explicitly reset ALL canvas-related state based on the tab's data
        const tabPreview = activeTab?.previewData || null;
        const tabShowCanvas = activeTab?.showCanvas === true; // Strict check

        setCurrentAgent(activeTab?.currentAgent || "general");
        setPreviewData(tabPreview);
        setShowCanvas(tabShowCanvas);
        setViewMode("preview");
        setAssistStep("idle");
        setAiPlan(null);
        setInput("");
        setIsProcessing(false);
    }, [activeTabId]);

    // CRITICAL: Use local previewData during streaming, sync from tab otherwise
    // This ensures live updates during streaming AND proper isolation when switching tabs
    const currentPreviewData = isProcessing ? previewData : (activeTab?.previewData || previewData);
    const currentShowCanvas = isProcessing ? showCanvas : (activeTab?.showCanvas === true || showCanvas);

    const [status, setStatus] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isPreviewRenderable = (preview?: PreviewData | null) => {
        if (!preview) return false;

        // Detect and block backend code from rendering in iframe
        const lowerData = preview.data.toLowerCase();
        const isBackend =
            lowerData.includes("require('express')") ||
            lowerData.includes("import express") ||
            lowerData.includes("app.listen(") ||
            lowerData.includes("mongoose.connect") ||
            lowerData.includes("process.env.") ||
            /module\.exports/i.test(preview.data);

        // Client-side detection
        const isUI = ["web", "app", "design", "html", "ui"].includes(preview.type);
        const hasTags = /<[a-z][\s\S]*>/i.test(preview.data);

        return (isUI || hasTags || preview.language === "html") && !isBackend;
    };
    const canRenderPreview = isPreviewRenderable(previewData);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [aiAssistHistory, isProcessing]);

    useEffect(() => {
        if (previewData?.data) {
            // Always default to preview mode - the LiveCanvas will render any content
            setViewMode("preview");
        }
    }, [previewData?.data]);

    // Load available models
    useEffect(() => {
        const loadModels = async () => {
            const response = await modelAdapter.listModels(selectedProvider);
            if (response.success && response.data) {
                const models = response.data[selectedProvider] || [];
                setAvailableModels(models);
                if (models.length > 0 && !selectedModels[selectedProvider]) {
                    setSelectedModel(selectedProvider, models[0]);
                }
            }
        };
        loadModels();
    }, [selectedProvider, selectedModels, setSelectedModel]);

    const handleSendMessage = async (e?: React.FormEvent, forcedPrompt?: string) => {
        if (e) e.preventDefault();
        const finalInput = forcedPrompt || input;
        if (!finalInput.trim() || isProcessing) return;

        // CRITICAL: Capture the tab ID at the start of this request
        const requestTabId = activeTabId;
        if (!requestTabId) return;

        const controller = new AbortController();
        setAbortController(controller);

        // UI Update for user message
        if (!forcedPrompt) {
            const userMsg: AIAssistMessage = {
                role: "user",
                content: finalInput,
                timestamp: new Date(),
            };
            const newHistory = [...aiAssistHistory, userMsg];
            updateTabById(requestTabId, { history: newHistory });
            setInput("");
        }

        setIsProcessing(true);
        if (assistStep === "idle") setAssistStep("plan");

        const assistantMsg: AIAssistMessage = {
            role: "assistant",
            content: "",
            agent: currentAgent,
            timestamp: new Date()
        };

        // Update history in the REQUEST's tab (not current active tab)
        const startingHistory = [...aiAssistHistory, { role: "user" as const, content: finalInput, timestamp: new Date() }];
        const updatedHistory = [...startingHistory, assistantMsg];
        updateTabById(requestTabId, { history: updatedHistory });

        try {
            let accumulated = "";
            let lastParsedPreview: PreviewData | null = null;

            // Format history for context
            const formattedHistory = aiAssistHistory.map(m => {
                if (m.role === "assistant") {
                    const { chatDisplay, preview } = parseStreamingContent(m.content, m.agent || "general");
                    let contextContent = chatDisplay;
                    if (preview && preview.data) {
                        contextContent += `\n\n--- CURRENT ARTIFACT (Surgical Context) ---\nType: ${preview.type}\nLanguage: ${preview.language}\n\`\`\`${preview.language || preview.type}\n${preview.data}\n\`\`\``;
                    }
                    return { ...m, content: contextContent };
                }
                return m;
            });

            const response = await modelAdapter.generateAIAssistStream(
                {
                    messages: [...formattedHistory, { role: "user" as const, content: finalInput, timestamp: new Date() }],
                    currentAgent,
                    onChunk: (chunk) => {
                        accumulated += chunk;
                        const { chatDisplay, preview, agent, status: streamStatus } = parseStreamingContent(accumulated, currentAgent);

                        if (streamStatus) setStatus(streamStatus);

                        // Only update local state if we're still on the same tab
                        if (activeTabId === requestTabId) {
                            if (preview && JSON.stringify(preview) !== JSON.stringify(lastParsedPreview)) {
                                setPreviewData(preview);
                                lastParsedPreview = preview;
                                setShowCanvas(true);
                                if (isPreviewRenderable(preview)) setViewMode("preview");
                            }

                            if (agent !== currentAgent) {
                                setCurrentAgent(agent);
                            }
                        }

                        // Always update the REQUEST's tab (by ID), not the active tab
                        const lastMsg = {
                            role: "assistant" as const,
                            content: accumulated,
                            agent,
                            preview: preview ? { type: preview.type, data: preview.data, language: preview.language } : undefined,
                            timestamp: new Date()
                        };

                        updateTabById(requestTabId, {
                            history: [...updatedHistory.slice(0, -1), lastMsg],
                            previewData: preview || undefined,
                            currentAgent: agent,
                            showCanvas: !!preview
                        });
                    },
                    signal: controller.signal
                },
                selectedProvider,
                selectedModels[selectedProvider]
            );

            if (!response.success) throw new Error(response.error);

            if (assistStep === "plan" || assistStep === "idle") {
                setAssistStep("plan");
            } else {
                setAssistStep("preview");
            }

        } catch (error) {
            console.error("Assist error:", error);
            const message = error instanceof Error ? error.message : "AI Assist failed";
            const errorMsg: AIAssistMessage = { role: "assistant", content: message, timestamp: new Date() };
            updateTabById(requestTabId, { history: [...aiAssistHistory, errorMsg] });
        } finally {
            setIsProcessing(false);
            setAbortController(null);
            setStatus(null);
        }
    };

    const approveAndGenerate = () => {
        setAssistStep("generating");
        handleSendMessage(undefined, "Approved. Please generate the code according to the plan.");
    };

    const stopGeneration = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsProcessing(false);
        }
    };

    const clearHistory = () => {
        updateActiveTab({
            history: [],
            previewData: null,
            currentAgent: "general",
            showCanvas: false
        });
        setPreviewData(null);
        setShowCanvas(false);
        setAssistStep("idle");
        setAiPlan(null);
    };

    const handleQwenAuth = async () => {
        setIsAuthenticatingQwen(true);
        setQwenAuthError(null);
        try {
            await modelAdapter.startQwenOAuth();
            // Force re-render to update auth state
            window.location.reload();
        } catch (err) {
            setQwenAuthError(err instanceof Error ? err.message : "Failed to authenticate with Qwen");
        } finally {
            setIsAuthenticatingQwen(false);
        }
    };

    return (
        <div className="ai-assist h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 lg:gap-8 overflow-hidden animate-in fade-in duration-700">
            {/* --- Chat Panel --- */}
            <div className={cn(
                "flex flex-col h-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                (currentShowCanvas && currentPreviewData) ? "w-full lg:w-2/5 lg:min-w-[400px]" : "w-full max-w-4xl mx-auto"
            )}>
                <Card className="flex-1 flex flex-col border border-blue-100/60 dark:border-blue-950/60 shadow-[0_18px_50px_rgba(15,23,42,0.15)] bg-[#f8f5ef]/80 dark:bg-[#0b1414]/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-blue-100/60 dark:border-blue-950/40 flex items-center justify-between shrink-0 bg-white/60 dark:bg-[#0b1414]/60 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="p-2.5 bg-gradient-to-tr from-blue-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-[#0b1414] animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-blue-50 tracking-tight">{t.title}</h2>
                                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-blue-700/70 dark:text-blue-200/70">
                                    {t.agentLabel} {t.agents[currentAgent as keyof typeof t.agents] || currentAgent}
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-1.5 p-1 bg-blue-50/50 dark:bg-blue-900/20 rounded-xl border border-blue-100/50 dark:border-blue-900/50">
                                {(["qwen", "ollama", "zai"] as const).map((provider) => (
                                    <button
                                        key={provider}
                                        onClick={() => setSelectedProvider(provider)}
                                        className={cn(
                                            "px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all",
                                            selectedProvider === provider
                                                ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                                                : "text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:text-blue-200/40 dark:hover:text-blue-200"
                                        )}
                                    >
                                        {(provider === "qwen" ? "Qwen" : provider === "ollama" ? "Ollama" : "Z.AI")}
                                    </button>
                                ))}
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400/70">{common.model}:</span>
                                <select
                                    value={selectedModels[selectedProvider]}
                                    onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                                    className="text-[10px] font-bold h-8 px-2 rounded-lg border border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-[#0b1414]/80 focus:ring-2 focus:ring-blue-400/30 transition-all outline-none min-w-[120px]"
                                >
                                    {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <div className="flex items-center gap-1 ml-1 border-l border-blue-100 dark:border-blue-900 pl-2">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setShowCanvas((prev) => !prev)}
                                        className="h-8 w-8 text-blue-700 hover:text-blue-950 hover:bg-blue-100 dark:text-blue-200 dark:hover:text-white dark:hover:bg-blue-900/40 rounded-lg transition-colors"
                                        disabled={!previewData}
                                    >
                                        <LayoutPanelLeft className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={clearHistory}
                                        className="h-8 w-8 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tab Bar */}
                    <div className="flex items-center gap-1 px-4 py-2 bg-slate-800/20 border-b border-white/5 backdrop-blur-md overflow-x-auto no-scrollbar">
                        {aiAssistTabs.map(tab => (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-1.5 rounded-xl cursor-pointer transition-all duration-300 whitespace-nowrap group",
                                    activeTabId === tab.id
                                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                        : "hover:bg-white/5 text-slate-500 opacity-70 hover:opacity-100"
                                )}
                            >
                                <MessageSquare className="h-3 w-3" />
                                <span className="text-[10px] font-black uppercase tracking-wider">
                                    {tab.title === "New Chat"
                                        ? t.chatTitle
                                        : tab.title.startsWith("Chat ")
                                            ? `${t.chatPrefix} ${tab.title.split(" ")[1]}`
                                            : tab.title}
                                </span>
                                {aiAssistTabs.length > 1 && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeAIAssistTab(tab.id);
                                        }}
                                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                                    >
                                        <X className="h-2.5 w-2.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => addAIAssistTab()}
                            className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition-all ml-1"
                            title={t.newChat}
                        >
                            <Plus className="h-3 w-3" />
                        </button>
                    </div>


                    {/* Agent Selector */}
                    <div className="px-6 pt-6">
                        <div className="flex flex-wrap gap-2 pb-4">
                            {[
                                { label: t.agents.general, agent: "general", icon: <Orbit className="h-3.5 w-3.5" /> },
                                { label: t.agents.code, agent: "code", icon: <Code2 className="h-3.5 w-3.5" /> },
                                { label: t.agents.design, agent: "design", icon: <Palette className="h-3.5 w-3.5" /> },
                                { label: t.agents.seo, agent: "seo", icon: <Search className="h-3.5 w-3.5" /> },
                                { label: t.agents.web, agent: "web", icon: <LayoutPanelLeft className="h-3.5 w-3.5" /> },
                                { label: t.agents.app, agent: "app", icon: <Play className="h-3.5 w-3.5" /> },
                            ].map(({ label, agent, icon }) => (
                                <button
                                    key={agent}
                                    onClick={() => {
                                        setCurrentAgent(agent);
                                        updateActiveTab({ currentAgent: agent });
                                    }}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                                        currentAgent === agent
                                            ? "bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30"
                                            : "bg-white/70 text-blue-700 border-blue-100 hover:border-blue-300 dark:bg-[#0f1a1a] dark:text-blue-200 dark:border-blue-900"
                                    )}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin scrollbar-thumb-blue-200/60 dark:scrollbar-thumb-blue-900">
                        {/* Qwen Auth Banner */}
                        {selectedProvider === "qwen" && !isQwenAuthed && (
                            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 mb-4 animate-in slide-in-from-top-2 duration-300">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-amber-500/20 rounded-xl">
                                        <Key className="h-5 w-5 text-amber-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-black text-amber-600 dark:text-amber-400">Qwen Authentication Required</h4>
                                        <p className="text-xs text-amber-700/70 dark:text-amber-300/70 mt-0.5">Sign in with Qwen to use AI Assist with this provider</p>
                                        {qwenAuthError && (
                                            <p className="text-xs text-red-500 mt-1">{qwenAuthError}</p>
                                        )}
                                    </div>
                                    <Button
                                        onClick={handleQwenAuth}
                                        disabled={isAuthenticatingQwen}
                                        className="bg-amber-500 hover:bg-amber-600 text-white font-black text-xs uppercase tracking-wider px-4 py-2 rounded-xl shadow-lg shadow-amber-500/20"
                                    >
                                        {isAuthenticatingQwen ? "Authenticating..." : "Sign in with Qwen"}
                                    </Button>
                                </div>
                            </div>
                        )}

                        {aiAssistHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in zoom-in-95 duration-500">
                                <div className="p-8 bg-blue-500/5 dark:bg-blue-500/10 rounded-full mb-8 relative">
                                    <Ghost className="h-20 w-20 text-blue-400/40 animate-bounce duration-[3s]" />
                                    <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-blue-50 mb-3 tracking-tighter">{t.studioTitle}</h3>
                                <p className="max-w-xs text-sm font-medium text-slate-600 dark:text-blue-100/70 leading-relaxed">
                                    {t.studioDesc}
                                </p>
                                <div className="mt-10 flex flex-wrap justify-center gap-3">
                                    {t.suggestions.map((chip: any) => (
                                        <Badge
                                            key={chip.label}
                                            variant="secondary"
                                            className="px-4 py-2 rounded-full cursor-pointer hover:bg-blue-600 hover:text-white transition-all text-[11px] font-black border-transparent shadow-sm"
                                            onClick={() => {
                                                setCurrentAgent(chip.agent);
                                                setInput(chip.label);
                                            }}
                                        >
                                            {chip.label}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {aiAssistHistory.map((msg, i) => (
                            <div key={i} className={cn(
                                "flex flex-col gap-3 group animate-in slide-in-from-bottom-4 duration-500",
                                msg.role === "user" ? "items-end" : "items-start"
                            )}>
                                <div className={cn(
                                    "max-w-[90%] p-5 rounded-3xl relative transition-all duration-300",
                                    msg.role === "user"
                                        ? "bg-gradient-to-br from-blue-600 to-teal-600 text-white rounded-tr-none shadow-[0_10px_24px_rgba(16,185,129,0.25)]"
                                        : "bg-white dark:bg-[#0f1a1a]/80 border border-blue-100/70 dark:border-blue-900/50 text-slate-700 dark:text-blue-50 rounded-tl-none shadow-sm backdrop-blur-xl"
                                )}>
                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-inherit opacity-40 hover:opacity-100">
                                            <Copy className="h-3 w-3" />
                                        </button>
                                    </div>

                                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed font-medium">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                            {parseStreamingContent(msg.content, msg.agent || "general").chatDisplay || (msg.role === "assistant" ? "..." : "")}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Agentic Plan Review Card */}
                                    {msg.role === "assistant" && aiPlan && i === aiAssistHistory.length - 1 && assistStep === "plan" && (
                                        <div className="mt-6 p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 backdrop-blur-sm animate-in zoom-in-95 duration-300">
                                            <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <LayoutPanelLeft className="h-4 w-4" /> {t.proposedPlan}
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">{t.architecture}</p>
                                                    <p className="text-xs text-slate-400">{aiPlan.architecture}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">{t.techStack}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {aiPlan.techStack?.map((t_stack: string) => (
                                                                <Badge key={t_stack} variant="outline" className="text-[9px] border-blue-500/30 text-blue-300 px-1.5 py-0">{t_stack}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">{t.files}</p>
                                                        <p className="text-[10px] text-slate-400">{t.filesPlanned(aiPlan.files?.length || 0)}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={approveAndGenerate}
                                                    disabled={isProcessing}
                                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-xl shadow-lg shadow-blue-500/20"
                                                >
                                                    {isProcessing ? t.startingEngine : t.approveGenerate}
                                                </Button>
                                            </div>
                                        </div>
                                    )}

                                    {msg.role === "assistant" && msg.preview && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="mt-5 w-full bg-blue-50 dark:bg-blue-900/30 border border-blue-200/60 dark:border-blue-800 text-blue-700 dark:text-blue-200 font-black uppercase tracking-[0.1em] text-[10px] rounded-2xl h-11 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            onClick={() => {
                                                const nextPreview = { ...msg.preview!, isStreaming: false };
                                                setPreviewData(nextPreview);
                                                setViewMode(isPreviewRenderable(nextPreview) ? "preview" : "code");
                                                setShowCanvas(true);
                                            }}
                                        >
                                            <Zap className="h-3.5 w-3.5 mr-2" /> {t.activateArtifact}
                                        </Button>
                                    )}
                                </div>

                                {msg.role === "assistant" && isProcessing && i === aiAssistHistory.length - 1 && status && (
                                    <div className="flex items-center gap-3 px-4 py-2 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-2xl animate-in slide-in-from-left-2 duration-300">
                                        <div className="relative h-2 w-2">
                                            <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping" />
                                            <div className="absolute inset-0 bg-blue-500 rounded-full" />
                                        </div>
                                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.15em]">
                                            {status}
                                        </span>
                                    </div>
                                )}

                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {msg.role === "assistant" ? `${t.agentLabel} ${t.agents[msg.agent as keyof typeof t.agents] || msg.agent || t.coreAgent}` : t.userLabel}
                                    </span>
                                </div>
                            </div>
                        ))}

                        {isProcessing && aiAssistHistory[aiAssistHistory.length - 1]?.role === "user" && (
                            <div className="flex flex-col items-start gap-3 animate-in fade-in duration-300">
                                <ThinkingIndicator />
                            </div>
                        )}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white/70 dark:bg-[#0b1414]/60 border-t border-blue-100/60 dark:border-blue-950/40 shrink-0">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute inset-0 bg-blue-500/5 rounded-[1.5rem] blur-xl group-focus-within:bg-blue-500/10 transition-all" />
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t.placeholder}
                                disabled={isProcessing}
                                className="relative pr-24 py-7 rounded-[1.5rem] bg-white/90 dark:bg-[#0f1a1a]/70 border-blue-200/80 dark:border-blue-900/80 shadow-lg shadow-blue-500/5 focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-base h-16 outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {isProcessing ? (
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={stopGeneration}
                                        className="h-10 w-10 p-0 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white animate-in zoom-in-75 transition-all"
                                    >
                                        <StopCircle className="h-5 w-5" />
                                    </Button>
                                ) : (
                                    <Button
                                        type="submit"
                                        disabled={!input.trim()}
                                        className="h-11 w-11 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </form>
                        <div className="flex items-center justify-between mt-4 text-[11px] font-semibold text-blue-700/70 dark:text-blue-100/70">
                            <span className="flex items-center gap-2">
                                <Wand2 className="h-3.5 w-3.5" />
                                {t.askArtifact}
                            </span>
                            <span className="flex items-center gap-2">
                                <LayoutPanelLeft className="h-3.5 w-3.5" />
                                {t.canvasLabel} {previewData ? t.canvasReady : t.canvasIdle}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- Canvas Panel --- */}
            {
                (currentShowCanvas && currentPreviewData) && (
                    <div className="flex-1 h-full min-w-0 animate-in slide-in-from-right-12 duration-700 cubic-bezier(0,0,0.2,1)">
                        <Card className="h-full flex flex-col bg-[#081010] rounded-[2.5rem] overflow-hidden border border-blue-900/60 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                            <div className="px-6 py-5 border-b border-blue-900/60 bg-[#0b1414]/70 backdrop-blur-2xl flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        {viewMode === "preview" ? <Monitor className="h-5 w-5 text-blue-400" /> : <Code2 className="h-5 w-5 text-amber-300" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-blue-50 uppercase tracking-[0.2em]">{t.canvasTitle(currentPreviewData?.type || t.live)}</h3>
                                        <div className="flex bg-blue-900/60 rounded-xl p-1 mt-2">
                                            <button
                                                onClick={() => setViewMode("preview")}
                                                className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "preview" ? "bg-blue-500 text-white shadow-lg" : "text-blue-300/60 hover:text-blue-100")}
                                            >
                                                {t.liveRender}
                                            </button>
                                            <button
                                                onClick={() => setViewMode("code")}
                                                className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "code" ? "bg-blue-500 text-white shadow-lg" : "text-blue-300/60 hover:text-blue-100")}
                                            >
                                                {t.inspectCode}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-blue-200/70 hover:text-white hover:bg-blue-900 rounded-2xl"
                                        onClick={() => navigator.clipboard.writeText(previewData?.data || "")}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-blue-200/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl"
                                        onClick={() => {
                                            setShowCanvas(false);
                                            updateActiveTab({ showCanvas: false });
                                        }}
                                    >
                                        <X className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-hidden relative">
                                {viewMode === "preview" && currentPreviewData ? (
                                    <CanvasErrorBoundary>
                                        <LiveCanvas
                                            data={currentPreviewData.data || ""}
                                            type={currentPreviewData.type || "preview"}
                                            isStreaming={!!currentPreviewData.isStreaming}
                                        />
                                    </CanvasErrorBoundary>
                                ) : (
                                    <div className="h-full bg-[#050505] p-8 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-blue-900">
                                        <pre className="text-blue-300/90 leading-relaxed selection:bg-blue-500/20 whitespace-pre-wrap">
                                            <code>{currentPreviewData?.data}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-3 border-t border-blue-900/40 bg-[#0b1414]/70 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", currentPreviewData?.isStreaming ? "bg-amber-500 animate-pulse" : "bg-blue-500")} />
                                    <span className="text-[10px] text-blue-200/60 font-bold uppercase tracking-widest leading-none">
                                        {currentPreviewData?.isStreaming ? t.neuralLinkActive : t.syncComplete}
                                    </span>
                                </div>
                                <Badge variant="outline" className="text-[9px] border-blue-900 text-blue-200/50 font-black">
                                    {currentPreviewData?.language?.toUpperCase()} UTF-8
                                </Badge>
                            </div>
                        </Card>
                    </div>
                )
            }
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap');
                .ai-assist {
                    font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
                }
                .ai-assist .prose :where(code):not(:where([class~="not-prose"] *)) {
                    color: inherit;
                }
            `}</style>
        </div >
    );
}


