"use client";

import React, { useState, useEffect, useRef, useCallback, memo } from "react";
import {
    MessageSquare, Send, Sparkles, Brain, Cpu, Code2, Palette, Search,
    Terminal, Eye, Trash2, Loader2, Bot, User, X, RotateCcw,
    CheckCircle2, Copy, Monitor, StopCircle, Maximize2, Minimize2,
    ChevronRight, Layout, Zap, Ghost
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

        const isHtml = data.includes("<div") || data.includes("<section") || data.includes("class=");
        if (isHtml || type === "web" || type === "app" || type === "design") {
            const doc = `
                <!DOCTYPE html>
                <html class="dark">
                  <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <script>
                      tailwind.config = {
                        darkMode: 'class',
                        theme: {
                          extend: {
                            colors: {
                              primary: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' }
                            }
                          }
                        }
                      }
                    </script>
                    <style>
                      ::-webkit-scrollbar { width: 8px; }
                      ::-webkit-scrollbar-track { background: transparent; }
                      ::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
                      ::-webkit-scrollbar-thumb:hover { background: #475569; }
                      body { 
                        margin: 0; 
                        padding: 24px; 
                        font-family: 'Inter', system-ui, sans-serif; 
                        background: #0f172a; 
                        color: #f1f5f9;
                        min-height: 100vh;
                      }
                    </style>
                  </head>
                  <body class="bg-slate-950 text-slate-100">
                    ${data}
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
                className="w-full h-full border-none rounded-b-2xl bg-slate-950 shadow-inner"
                sandbox="allow-scripts"
            />
            {isStreaming && (
                <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/20 overflow-hidden">
                    <div className="h-full bg-indigo-500 animate-[loading_1.5s_infinite]" />
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
    const agentMatch = text.match(/\[AGENT:(\w+)\]/);
    if (agentMatch) agent = agentMatch[1];

    let preview: PreviewData | null = null;
    const previewMatch = text.match(/\[PREVIEW:(\w+):?(\w+)?\]([\s\S]*?)(?:\[\/PREVIEW\]|$)/);
    if (previewMatch) {
        preview = {
            type: previewMatch[1],
            language: previewMatch[2] || "text",
            data: previewMatch[3].trim(),
            isStreaming: !text.includes("[/PREVIEW]")
        };
    }

    let chatDisplay = text
        .replace(/\[AGENT:\w+\]/g, "")
        .replace(/\[PREVIEW:\w+:?\w+?\][\s\S]*?(?:\[\/PREVIEW\]|$)/g, "")
        .trim();

    if (!chatDisplay && preview) {
        chatDisplay = `Building visual artifact...`;
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

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [aiAssistHistory, isProcessing]);

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

            await modelAdapter.generateAIAssistStream(
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
                    }
                },
                selectedProvider,
                selectedModels[selectedProvider]
            );
        } catch (error) {
            console.error("Assist error:", error);
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

    const getAgentIcon = (agent: string) => {
        switch (agent.toLowerCase()) {
            case 'code': return <Code2 className="h-4 w-4" />;
            case 'design': return <Palette className="h-4 w-4" />;
            case 'seo': return <TargetIcon className="h-4 w-4" />;
            case 'research': return <Search className="h-4 w-4" />;
            default: return <Sparkles className="h-4 w-4" />;
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex gap-4 lg:gap-8 overflow-hidden animate-in fade-in duration-700">
            {/* --- Chat Panel --- */}
            <div className={cn(
                "flex flex-col h-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                showCanvas ? "w-2/5 min-w-[400px]" : "w-full max-w-4xl mx-auto"
            )}>
                <Card className="flex-1 flex flex-col border border-slate-200/40 dark:border-slate-800/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] bg-white/70 dark:bg-slate-900/40 backdrop-blur-2xl rounded-[2rem] overflow-hidden">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-200/60 dark:border-slate-800/40 flex items-center justify-between shrink-0 bg-slate-50/30 dark:bg-slate-900/20 backdrop-blur-md">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="p-2.5 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl text-white shadow-lg shadow-indigo-500/20">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">{t.title}</h2>
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest animate-in slide-in-from-left-4">
                                        Active: {currentAgent}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedModels[selectedProvider]}
                                onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                                className="text-[11px] font-black h-9 px-3 rounded-xl border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40 focus:ring-2 focus:ring-indigo-500/40 transition-all outline-none"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
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
                    <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8 space-y-8 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
                        {aiAssistHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in zoom-in-95 duration-500">
                                <div className="p-8 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full mb-8 relative">
                                    <Ghost className="h-20 w-20 text-indigo-400/40 animate-bounce duration-[3s]" />
                                    <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 mb-3 tracking-tighter">Your AI Workspace</h3>
                                <p className="max-w-xs text-sm font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                                    I switch agents and render visual artifacts automatically. How can I help today?
                                </p>
                                <div className="mt-10 flex flex-wrap justify-center gap-3">
                                    {['Build a UI', 'SEO Audit', 'App Design'].map(chip => (
                                        <Badge key={chip} variant="secondary" className="px-4 py-2 rounded-full cursor-pointer hover:bg-indigo-500 hover:text-white transition-all text-[11px] font-black border-transparent shadow-sm">
                                            {chip}
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
                                        ? "bg-gradient-to-br from-indigo-600 to-violet-700 text-white rounded-tr-none shadow-[0_8px_20px_rgba(99,102,241,0.25)]"
                                        : "bg-white dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm backdrop-blur-xl"
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
                                            className="mt-5 w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-white/5 text-indigo-500 dark:text-indigo-400 font-black uppercase tracking-[0.1em] text-[10px] rounded-2xl h-11 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            onClick={() => {
                                                setPreviewData({ ...msg.preview!, isStreaming: false });
                                                setShowCanvas(true);
                                            }}
                                        >
                                            <Zap className="h-3.5 w-3.5 mr-2" /> Activate Artifact
                                        </Button>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 px-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                                        {msg.role === "assistant" ? `Neural • ${msg.agent || 'core'}` : 'Explorer'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Input Area */}
                    <div className="p-6 bg-slate-50/40 dark:bg-slate-900/20 border-t border-slate-200/60 dark:border-slate-800/40 shrink-0">
                        <form onSubmit={handleSendMessage} className="relative group">
                            <div className="absolute inset-0 bg-indigo-500/5 rounded-[1.5rem] blur-xl group-focus-within:bg-indigo-500/10 transition-all" />
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={t.placeholder}
                                disabled={isProcessing}
                                className="relative pr-24 py-7 rounded-[1.5rem] bg-white/80 dark:bg-slate-950/60 border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-indigo-500/5 focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium text-base h-16 outline-none"
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
                                        className="h-11 w-11 rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95 transition-all p-0"
                                    >
                                        <Send className="h-5 w-5" />
                                    </Button>
                                )}
                            </div>
                        </form>
                    </div>
                </Card>
            </div>

            {/* --- Canvas Panel --- */}
            {showCanvas && (
                <div className="flex-1 h-full min-w-0 animate-in slide-in-from-right-12 duration-700 cubic-bezier(0,0,0.2,1)">
                    <Card className="h-full flex flex-col bg-slate-950 rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                        <div className="px-6 py-5 border-b border-slate-800/60 bg-slate-900/50 backdrop-blur-2xl flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="p-2.5 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                    {viewMode === "preview" ? <Monitor className="h-5 w-5 text-indigo-400" /> : <Code2 className="h-5 w-5 text-emerald-400" />}
                                </div>
                                <div>
                                    <h3 className="text-xs font-black text-white uppercase tracking-[0.2em]">{previewData?.type} Canvas</h3>
                                    <div className="flex bg-slate-800/60 rounded-xl p-1 mt-2">
                                        <button
                                            onClick={() => setViewMode("preview")}
                                            className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "preview" ? "bg-indigo-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
                                        >
                                            Live Render
                                        </button>
                                        <button
                                            onClick={() => setViewMode("code")}
                                            className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "code" ? "bg-indigo-500 text-white shadow-lg" : "text-slate-500 hover:text-slate-300")}
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
                                    className="h-10 w-10 text-slate-400 hover:text-white hover:bg-slate-800 rounded-2xl"
                                    onClick={() => navigator.clipboard.writeText(previewData?.data || "")}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-10 w-10 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl"
                                    onClick={() => setShowCanvas(false)}
                                >
                                    <X className="h-5 w-5" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {viewMode === "preview" && previewData ? (
                                <LiveCanvas
                                    data={previewData.data}
                                    type={previewData.type}
                                    isStreaming={!!previewData.isStreaming}
                                />
                            ) : (
                                <div className="h-full bg-[#050505] p-8 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-slate-800">
                                    <pre className="text-emerald-400/90 leading-relaxed selection:bg-emerald-500/20 whitespace-pre-wrap">
                                        <code>{previewData?.data}</code>
                                    </pre>
                                </div>
                            )}
                        </div>

                        <div className="px-6 py-3 border-t border-slate-800/40 bg-slate-900/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className={cn("w-2 h-2 rounded-full", previewData?.isStreaming ? "bg-amber-500 animate-pulse" : "bg-emerald-500")} />
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">
                                    {previewData?.isStreaming ? "Neural Link Active" : "Sync Complete"}
                                </span>
                            </div>
                            <Badge variant="outline" className="text-[9px] border-slate-800 text-slate-500 font-black">
                                {previewData?.language?.toUpperCase()} • UTF-8
                            </Badge>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

// Custom simple icon for Target/SEO
function TargetIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
        </svg>
    );
}
