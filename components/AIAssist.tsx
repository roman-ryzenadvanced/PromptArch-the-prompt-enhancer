"use client";

import React, { useState, useEffect, useRef, memo } from "react";
import {
    MessageSquare, Send, Code2, Palette, Search,
    Trash2, Copy, Monitor, StopCircle, X, Zap, Ghost,
    Wand2, LayoutPanelLeft, Play, Orbit
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
const LiveCanvas = memo(({ data, type, isStreaming }: { data: string, type: string, isStreaming: boolean }) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);

    useEffect(() => {
        if (!iframeRef.current) return;

        const isHtml = data.includes("<") && data.includes(">");
        const isEncodedHtml = data.includes("&lt;") && data.includes("&gt;");
        const shouldRender = isHtml || isEncodedHtml || ["web", "app", "design", "html", "ui"].includes(type);
        const normalized = isEncodedHtml
            ? data
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .replace(/&amp;/g, "&")
                .replace(/&quot;/g, "\"")
                .replace(/&#39;/g, "'")
            : data;
        if (shouldRender) {
            const doc = `
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
                        background: #0b1414; 
                        color: #ecfdf3;
                        min-height: 100vh;
                      }
                    </style>
                  </head>
                  <body class="bg-[#0b1414] text-emerald-50">
                    ${normalized}
                  </body>
                </html>
            `;
            iframeRef.current.srcdoc = doc;
        }
    }, [data, type]);

    return (
        <div className="w-full h-full relative group">
            <iframe
                ref={iframeRef}
                title="Canvas Preview"
                className="w-full h-full border-none rounded-b-2xl bg-[#0b1414] shadow-inner"
                sandbox="allow-scripts"
            />
            {isStreaming && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-emerald-500/20 overflow-hidden">
                    <div className="h-full bg-emerald-500 animate-[loading_1.5s_infinite]" />
                </div>
            )}
            <style jsx>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(200%); }
                }
            `}</style>
        </div>
    );
});

LiveCanvas.displayName = "LiveCanvas";

// --- Helper Functions ---

function parseStreamingContent(text: string) {
    let agent = "general";
    let preview: PreviewData | null = null;
    let chatDisplay = text.trim();
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

    const jsonCandidate = text.trim();
    if (jsonCandidate.startsWith("{") && jsonCandidate.endsWith("}")) {
        try {
            const parsed = JSON.parse(jsonCandidate);
            if (parsed?.agent) agent = parsed.agent;
            if (parsed?.preview?.data) {
                preview = {
                    type: parsed.preview.type || "web",
                    language: parsed.preview.language || "text",
                    data: parsed.preview.data,
                    isStreaming: !text.includes("[/PREVIEW]")
                };
            }
            if (typeof parsed?.content === "string") {
                chatDisplay = parsed.content.trim();
            }
        } catch {
            // Ignore malformed JSON during stream
        }
    }

    const agentMatch = text.match(/\[AGENT:([\w-]+)\]/);
    if (agentMatch) agent = agentMatch[1];

    const previewMatch = text.match(/\[PREVIEW:([\w-]+):?([\w-]+)?\]([\s\S]*?)(?:\[\/PREVIEW\]|$)/);
    if (previewMatch) {
        preview = {
            type: previewMatch[1],
            language: previewMatch[2] || "text",
            data: previewMatch[3].trim(),
            isStreaming: !text.includes("[/PREVIEW]")
        };
    }

    if (/\[AGENT:|\[PREVIEW:/.test(text)) {
        chatDisplay = text
            .replace(/\[AGENT:[\w-]+\]/g, "")
            .replace(/\[PREVIEW:[\w-]+:?[\w-]+?\][\s\S]*?(?:\[\/PREVIEW\]|$)/g, "")
            .trim();
    }

    if (!preview) {
        const fenced = text.match(/```(html|css|javascript|tsx|jsx|md|markdown)\s*([\s\S]*?)```/i);
        if (fenced) {
            const language = fenced[1].toLowerCase();
            preview = {
                type: language === "html" ? "web" : "code",
                language,
                data: fenced[2].trim(),
                isStreaming: false
            };
        }
    }

    if (preview) {
        const isHtmlLike = ["web", "app", "design", "html", "ui"].includes(preview.type) || preview.language === "html";
        if (isHtmlLike) {
            preview.data = decodeHtml(stripFences(preview.data));
        }
    }

    if (!chatDisplay && preview) {
        chatDisplay = `Rendering live artifact...`;
    }

    return { chatDisplay, preview, agent };
}

// --- Main Component ---

export default function AIAssist() {
    const {
        language,
        aiAssistHistory,
        setAIAssistHistory,
        selectedProvider,
        selectedModels,
        setSelectedModel
    } = useStore();
    const t = translations[language].aiAssist;

    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentAgent, setCurrentAgent] = useState("general");
    const [previewData, setPreviewData] = useState<PreviewData | null>(null);
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [showCanvas, setShowCanvas] = useState(false);
    const [viewMode, setViewMode] = useState<"preview" | "code">("preview");
    const [abortController, setAbortController] = useState<AbortController | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const canRenderPreview = previewData
        ? ["web", "app", "design", "html", "ui"].includes(previewData.type)
        || previewData.data.includes("<")
        || previewData.language === "html"
        || (previewData.data.includes("&lt;") && previewData.data.includes("&gt;"))
        : false;

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
            setViewMode(canRenderPreview ? "preview" : "code");
        }
    }, [previewData?.data, canRenderPreview]);

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

    const handleSendMessage = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!input.trim() || isProcessing) return;

        const controller = new AbortController();
        setAbortController(controller);

        const userMsg: AIAssistMessage = {
            role: "user",
            content: input,
            timestamp: new Date(),
        };

        const newHistory = [...aiAssistHistory, userMsg];
        setAIAssistHistory(newHistory);
        setInput("");
        setIsProcessing(true);

        const assistantMsg: AIAssistMessage = {
            role: "assistant",
            content: "",
            agent: currentAgent,
            timestamp: new Date()
        };
        setAIAssistHistory([...newHistory, assistantMsg]);

        try {
            let accumulated = "";
            let lastParsedPreview: PreviewData | null = null;

            const response = await modelAdapter.generateAIAssistStream(
                {
                    messages: newHistory,
                    currentAgent,
                    onChunk: (chunk) => {
                        accumulated += chunk;
                        const { chatDisplay, preview, agent } = parseStreamingContent(accumulated);

                        // Only update preview state if it actually changed to avoid iframe jitters
                        if (preview && JSON.stringify(preview) !== JSON.stringify(lastParsedPreview)) {
                            setPreviewData(preview);
                            lastParsedPreview = preview;
                            setShowCanvas(true);
                        }

                        if (agent !== currentAgent) setCurrentAgent(agent);

                        setAIAssistHistory(prev => {
                            const last = prev[prev.length - 1];
                            if (last && last.role === "assistant") {
                                return [...prev.slice(0, -1), {
                                    ...last,
                                    content: chatDisplay || accumulated,
                                    agent,
                                    preview: preview ? { type: preview.type, data: preview.data, language: preview.language } : undefined
                                } as AIAssistMessage];
                            }
                            return prev;
                        });
                    },
                    signal: controller.signal
                },
                selectedProvider,
                selectedModels[selectedProvider]
            );
            if (!response.success) {
                throw new Error(response.error || "Streaming failed");
            }
        } catch (error) {
            console.error("Assist error:", error);
            setAIAssistHistory(prev => {
                const last = prev[prev.length - 1];
                const message = error instanceof Error ? error.message : "AI Assist failed";
                if (last && last.role === "assistant") {
                    return [...prev.slice(0, -1), { ...last, content: message }];
                }
                return [...prev, { role: "assistant", content: message, timestamp: new Date() }];
            });
        } finally {
            setIsProcessing(false);
            setAbortController(null);
        }
    };

    const stopGeneration = () => {
        if (abortController) {
            abortController.abort();
            setAbortController(null);
            setIsProcessing(false);
        }
    };

    const clearHistory = () => {
        setAIAssistHistory([]);
        setPreviewData(null);
        setShowCanvas(false);
    };

    return (
        <div className="ai-assist h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 lg:gap-8 overflow-hidden animate-in fade-in duration-700">
            {/* --- Chat Panel --- */}
            <div className={cn(
                "flex flex-col h-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                showCanvas ? "w-full lg:w-2/5 lg:min-w-[400px]" : "w-full max-w-4xl mx-auto"
            )}>
                <Card className="flex-1 flex flex-col border border-emerald-100/60 dark:border-emerald-950/60 shadow-[0_18px_50px_rgba(15,23,42,0.15)] bg-[#f8f5ef]/80 dark:bg-[#0b1414]/80 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-emerald-100/60 dark:border-emerald-950/40 flex items-center justify-between shrink-0 bg-white/60 dark:bg-[#0b1414]/60 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="p-2.5 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-2xl text-white shadow-lg shadow-emerald-500/20">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-amber-400 border-2 border-white dark:border-[#0b1414] animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-emerald-50 tracking-tight">{t.title}</h2>
                                <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-emerald-700/70 dark:text-emerald-200/70">
                                    Agent {currentAgent}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedModels[selectedProvider]}
                                onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                                className="text-[11px] font-black h-9 px-3 rounded-xl border-emerald-100 dark:border-emerald-900 bg-white/80 dark:bg-[#0b1414]/80 focus:ring-2 focus:ring-emerald-400/40 transition-all outline-none"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowCanvas((prev) => !prev)}
                                className="h-9 w-9 text-emerald-700 hover:text-emerald-950 hover:bg-emerald-100 dark:text-emerald-200 dark:hover:text-white dark:hover:bg-emerald-900/40 rounded-xl transition-colors"
                                disabled={!previewData}
                            >
                                <LayoutPanelLeft className="h-4 w-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={clearHistory}
                                className="h-9 w-9 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-colors"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="px-6 pt-6">
                        <div className="flex flex-wrap gap-2 pb-4">
                            {[
                                { label: "General", agent: "general", icon: <Orbit className="h-3.5 w-3.5" /> },
                                { label: "Code", agent: "code", icon: <Code2 className="h-3.5 w-3.5" /> },
                                { label: "Design", agent: "design", icon: <Palette className="h-3.5 w-3.5" /> },
                                { label: "SEO", agent: "seo", icon: <Search className="h-3.5 w-3.5" /> },
                                { label: "Web", agent: "web", icon: <LayoutPanelLeft className="h-3.5 w-3.5" /> },
                                { label: "App", agent: "app", icon: <Play className="h-3.5 w-3.5" /> },
                            ].map(({ label, agent, icon }) => (
                                <button
                                    key={agent}
                                    onClick={() => setCurrentAgent(agent)}
                                    className={cn(
                                        "flex items-center gap-2 px-3 py-2 rounded-full text-[11px] font-black uppercase tracking-widest border transition-all",
                                        currentAgent === agent
                                            ? "bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/30"
                                            : "bg-white/70 text-emerald-700 border-emerald-100 hover:border-emerald-300 dark:bg-[#0f1a1a] dark:text-emerald-200 dark:border-emerald-900"
                                    )}
                                >
                                    {icon}
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-6 space-y-8 scrollbar-thin scrollbar-thumb-emerald-200/60 dark:scrollbar-thumb-emerald-900">
                        {aiAssistHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in zoom-in-95 duration-500">
                                <div className="p-8 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full mb-8 relative">
                                    <Ghost className="h-20 w-20 text-emerald-400/40 animate-bounce duration-[3s]" />
                                    <div className="absolute inset-0 bg-emerald-500/10 blur-3xl rounded-full" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-emerald-50 mb-3 tracking-tighter">Studio-grade AI Assist</h3>
                                <p className="max-w-xs text-sm font-medium text-slate-600 dark:text-emerald-100/70 leading-relaxed">
                                    Switch agents, stream answers, and light up the canvas with live artifacts.
                                </p>
                                <div className="mt-10 flex flex-wrap justify-center gap-3">
                                    {[
                                        { label: "Build a landing UI", agent: "web" },
                                        { label: "SEO diagnostic", agent: "seo" },
                                        { label: "Mobile onboarding", agent: "app" },
                                    ].map((chip) => (
                                        <Badge
                                            key={chip.label}
                                            variant="secondary"
                                            className="px-4 py-2 rounded-full cursor-pointer hover:bg-emerald-600 hover:text-white transition-all text-[11px] font-black border-transparent shadow-sm"
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
                                        ? "bg-gradient-to-br from-emerald-600 to-teal-600 text-white rounded-tr-none shadow-[0_10px_24px_rgba(16,185,129,0.25)]"
                                        : "bg-white dark:bg-[#0f1a1a]/80 border border-emerald-100/70 dark:border-emerald-900/50 text-slate-700 dark:text-emerald-50 rounded-tl-none shadow-sm backdrop-blur-xl"
                                )}>
                                    <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => navigator.clipboard.writeText(msg.content)} className="text-inherit opacity-40 hover:opacity-100">
                                            <Copy className="h-3 w-3" />
                                        </button>
                                    </div>

                                    <div className="prose prose-sm dark:prose-invert max-w-none leading-relaxed font-medium">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                                            {msg.content || (msg.role === "assistant" ? "..." : "")}
                                        </ReactMarkdown>
                                    </div>

                                    {msg.role === "assistant" && msg.preview && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="mt-5 w-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200/60 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200 font-black uppercase tracking-[0.1em] text-[10px] rounded-2xl h-11 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            onClick={() => {
                                                const nextPreview = { ...msg.preview!, isStreaming: false };
                                                setPreviewData(nextPreview);
                                                const nextCanRender = ["web", "app", "design", "html", "ui"].includes(nextPreview.type)
                                                    || nextPreview.data.includes("<")
                                                    || nextPreview.language === "html"
                                                    || (nextPreview.data.includes("&lt;") && nextPreview.data.includes("&gt;"));
                                                setViewMode(nextCanRender ? "preview" : "code");
                                                setShowCanvas(true);
                                            }}
                                        >
                                            <Zap className="h-3.5 w-3.5 mr-2" /> Activate Artifact
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {msg.role === "assistant" ? `Agent ${msg.agent || 'core'}` : 'Explorer'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-white/70 dark:bg-[#0b1414]/60 border-t border-emerald-100/60 dark:border-emerald-950/40 shrink-0">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute inset-0 bg-emerald-500/5 rounded-[1.5rem] blur-xl group-focus-within:bg-emerald-500/10 transition-all" />
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t.placeholder}
                                disabled={isProcessing}
                                className="relative pr-24 py-7 rounded-[1.5rem] bg-white/90 dark:bg-[#0f1a1a]/70 border-emerald-200/80 dark:border-emerald-900/80 shadow-lg shadow-emerald-500/5 focus:ring-4 focus:ring-emerald-500/10 transition-all font-medium text-base h-16 outline-none"
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
                                        className="h-11 w-11 rounded-2xl bg-emerald-600 shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </form>
                        <div className="flex items-center justify-between mt-4 text-[11px] font-semibold text-emerald-700/70 dark:text-emerald-100/70">
                            <span className="flex items-center gap-2">
                                <Wand2 className="h-3.5 w-3.5" />
                                Ask for a design, code, or research artifact.
                            </span>
                            <span className="flex items-center gap-2">
                                <LayoutPanelLeft className="h-3.5 w-3.5" />
                                Canvas {previewData ? "ready" : "idle"}
                            </span>
                        </div>
                    </div>
                </Card>
            </div>

            {/* --- Canvas Panel --- */}
            {showCanvas && (
                <div className="flex-1 h-full min-w-0 animate-in slide-in-from-right-12 duration-700 cubic-bezier(0,0,0.2,1)">
                    <Card className="h-full flex flex-col bg-[#081010] rounded-[2.5rem] overflow-hidden border border-emerald-900/60 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                        <div className="px-6 py-5 border-b border-emerald-900/60 bg-[#0b1414]/70 backdrop-blur-2xl flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                                    {viewMode === "preview" ? <Monitor className="h-5 w-5 text-emerald-400" /> : <Code2 className="h-5 w-5 text-amber-300" />}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-emerald-50 uppercase tracking-[0.2em]">{previewData?.type || "Live"} Canvas</h3>
                                    <div className="flex bg-emerald-900/60 rounded-xl p-1 mt-2">
                                        <button
                                            onClick={() => setViewMode("preview")}
                                            className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "preview" ? "bg-emerald-500 text-white shadow-lg" : "text-emerald-300/60 hover:text-emerald-100")}
                                        >
                                            Live Render
                                        </button>
                                        <button
                                            onClick={() => setViewMode("code")}
                                            className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "code" ? "bg-emerald-500 text-white shadow-lg" : "text-emerald-300/60 hover:text-emerald-100")}
                                        >
                                            Inspect Code
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-emerald-200/70 hover:text-white hover:bg-emerald-900 rounded-2xl"
                                    onClick={() => navigator.clipboard.writeText(previewData?.data || "")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-emerald-200/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl"
                                    onClick={() => setShowCanvas(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {viewMode === "preview" && previewData && canRenderPreview ? (
                                <LiveCanvas
                                    data={previewData.data}
                                    type={previewData.type}
                                    isStreaming={!!previewData.isStreaming}
                                />
                            ) : (
                                <div className="h-full bg-[#050505] p-8 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-emerald-900">
                                    <pre className="text-emerald-300/90 leading-relaxed selection:bg-emerald-500/20 whitespace-pre-wrap">
                                        <code>{previewData?.data}</code>
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-emerald-900/40 bg-[#0b1414]/70 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", previewData?.isStreaming ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                                <span className="text-[10px] text-emerald-200/60 font-bold uppercase tracking-widest leading-none">
                                    {previewData?.isStreaming ? "Neural Link Active" : "Sync Complete"}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[9px] border-emerald-900 text-emerald-200/50 font-black">
                                {previewData?.language?.toUpperCase()} UTF-8
                            </Badge>
                        </div>
                    </Card>
                </div>
            )}
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap');
                .ai-assist {
                    font-family: "Space Grotesk", "IBM Plex Sans", system-ui, sans-serif;
                }
                .ai-assist .prose :where(code):not(:where([class~="not-prose"] *)) {
                    color: inherit;
                }
            `}</style>
        </div>
    );
}

