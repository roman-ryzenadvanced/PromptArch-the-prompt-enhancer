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
        if (!iframeRef.current || !data) return;

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

        let doc: string;
        if (isFullDocument) {
            // If it's a full document, inject Tailwind CSS but keep the structure
            if (hasHeadTag) {
                doc = normalized.replace(/<head>/i, `<head>
                    <script src="https://cdn.tailwindcss.com"></script>
                    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap">
                `);
            } else {
                doc = normalized.replace(/<html[^>]*>/i, (match) => `${match}
                    <head>
                        <script src="https://cdn.tailwindcss.com"></script>
                        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;600;700;800&display=swap">
                    </head>
                `);
            }
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

        iframeRef.current.srcdoc = doc;
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
                <div className="absolute inset-x-0 bottom-0 h-1 bg-blue-500/20 overflow-hidden">
                    <div className="h-full bg-blue-500 animate-[loading_1.5s_infinite]" />
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
        if (preview.isStreaming) {
            const isUpdate = text.toLowerCase().includes("update") || text.toLowerCase().includes("fix") || text.toLowerCase().includes("change");
            status = isUpdate ? `Applying surgical edits to ${preview.type}...` : `Generating ${preview.type} artifact...`;
        }
    }

    // Hide tags and partial tags from display
    chatDisplay = text
        .replace(/\[AGENT:[\w-]+\]/g, "")
        .replace(/\[PREVIEW:[\w-]+:?[\w-]+?\][\s\S]*?(?:\[\/PREVIEW\]|$)/g, "")
        .replace(/\[(AGENT|PREVIEW)?(?::[\w-]*)?$/g, "") // Hide partial tags at the end
        .trim();

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
        const htmlSignal = preview.data.toLowerCase().includes("<!doctype") || preview.data.toLowerCase().includes("<html");
        const isHtmlLike = ["web", "app", "design", "html", "ui"].includes(preview.type) || preview.language === "html" || htmlSignal;
        if (htmlSignal && preview.type === "code") {
            preview.type = "web";
        }
        if (isHtmlLike) {
            preview.data = decodeHtml(stripFences(preview.data));
        }
    }

    if (!preview) {
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
        chatDisplay = `Rendering live artifact...`;
    }

    return { chatDisplay, preview, agent, status };
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

    // Agentic States
    const [assistStep, setAssistStep] = useState<"idle" | "plan" | "generating" | "preview">("idle");
    const [aiPlan, setAiPlan] = useState<any>(null);

    const [status, setStatus] = useState<string | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);
    const isPreviewRenderable = (preview?: PreviewData | null) => {
        if (!preview) return false;
        return ["web", "app", "design", "html", "ui"].includes(preview.type)
            || preview.language === "html"
            || preview.data.includes("<")
            || (preview.data.includes("&lt;") && preview.data.includes("&gt;"));
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
            setAIAssistHistory(newHistory);
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
        setAIAssistHistory(prev => [...prev, assistantMsg]);

        try {
            let accumulated = "";
            let lastParsedPreview: PreviewData | null = null;

            const response = await modelAdapter.generateAIAssistStream(
                {
                    messages: [...aiAssistHistory, { role: "user" as const, content: finalInput, timestamp: new Date() }],
                    currentAgent,
                    onChunk: (chunk) => {
                        accumulated += chunk;
                        const { chatDisplay, preview, agent, status: streamStatus } = parseStreamingContent(accumulated, currentAgent);

                        if (streamStatus) setStatus(streamStatus);

                        // If we're in planning mode and see JSON, try to parse the plan
                        if (assistStep === "plan" || assistStep === "idle") {
                            const jsonMatch = accumulated.match(/\{[\s\S]*\}/);
                            if (jsonMatch) {
                                try {
                                    const parsed = JSON.parse(jsonMatch[0]);
                                    if (parsed.summary && parsed.files) setAiPlan(parsed);
                                } catch (e) { }
                            }
                        }

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
                                    content: accumulated, // Keep raw for AI context
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

            if (!response.success) throw new Error(response.error);

            if (assistStep === "plan" || assistStep === "idle") {
                setAssistStep("plan");
            } else {
                setAssistStep("preview");
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
        setAIAssistHistory([]);
        setPreviewData(null);
        setShowCanvas(false);
        setAssistStep("idle");
        setAiPlan(null);
    };

    return (
        <div className="ai-assist h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 lg:gap-8 overflow-hidden animate-in fade-in duration-700">
            {/* --- Chat Panel --- */}
            <div className={cn(
                "flex flex-col h-full transition-all duration-700 cubic-bezier(0.4, 0, 0.2, 1)",
                showCanvas ? "w-full lg:w-2/5 lg:min-w-[400px]" : "w-full max-w-4xl mx-auto"
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
                                    Agent {currentAgent}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <select
                                value={selectedModels[selectedProvider]}
                                onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                                className="text-[11px] font-black h-9 px-3 rounded-xl border-blue-100 dark:border-blue-900 bg-white/80 dark:bg-[#0b1414]/80 focus:ring-2 focus:ring-blue-400/40 transition-all outline-none"
                            >
                                {availableModels.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowCanvas((prev) => !prev)}
                                className="h-9 w-9 text-blue-700 hover:text-blue-950 hover:bg-blue-100 dark:text-blue-200 dark:hover:text-white dark:hover:bg-blue-900/40 rounded-xl transition-colors"
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
                        {aiAssistHistory.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center text-center py-20 animate-in zoom-in-95 duration-500">
                                <div className="p-8 bg-blue-500/5 dark:bg-blue-500/10 rounded-full mb-8 relative">
                                    <Ghost className="h-20 w-20 text-blue-400/40 animate-bounce duration-[3s]" />
                                    <div className="absolute inset-0 bg-blue-500/10 blur-3xl rounded-full" />
                                </div>
                                <h3 className="text-3xl font-black text-slate-900 dark:text-blue-50 mb-3 tracking-tighter">Studio-grade AI Assist</h3>
                                <p className="max-w-xs text-sm font-medium text-slate-600 dark:text-blue-100/70 leading-relaxed">
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
                                                <LayoutPanelLeft className="h-4 w-4" /> Proposed Solution Plan
                                            </h3>
                                            <div className="space-y-4">
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Architecture</p>
                                                    <p className="text-xs text-slate-400">{aiPlan.architecture}</p>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Tech Stack</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {aiPlan.techStack?.map((t: string) => (
                                                                <Badge key={t} variant="outline" className="text-[9px] border-blue-500/30 text-blue-300 px-1.5 py-0">{t}</Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">Files</p>
                                                        <p className="text-[10px] text-slate-400">{aiPlan.files?.length} modules planned</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={approveAndGenerate}
                                                    disabled={isProcessing}
                                                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-widest py-5 rounded-xl shadow-lg shadow-blue-500/20"
                                                >
                                                    {isProcessing ? "Starting Engine..." : "Approve & Generate Development"}
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
                                            <Zap className="h-3.5 w-3.5 mr-2" /> Activate Artifact
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
                                        {msg.role === "assistant" ? `Agent ${msg.agent || 'core'}` : 'Explorer'}
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
            {
                showCanvas && (
                    <div className="flex-1 h-full min-w-0 animate-in slide-in-from-right-12 duration-700 cubic-bezier(0,0,0.2,1)">
                        <Card className="h-full flex flex-col bg-[#081010] rounded-[2.5rem] overflow-hidden border border-blue-900/60 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                            <div className="px-6 py-5 border-b border-blue-900/60 bg-[#0b1414]/70 backdrop-blur-2xl flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-blue-500/10 rounded-2xl border border-blue-500/20">
                                        {viewMode === "preview" ? <Monitor className="h-5 w-5 text-blue-400" /> : <Code2 className="h-5 w-5 text-amber-300" />}
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-black text-blue-50 uppercase tracking-[0.2em]">{previewData?.type || "Live"} Canvas</h3>
                                        <div className="flex bg-blue-900/60 rounded-xl p-1 mt-2">
                                            <button
                                                onClick={() => setViewMode("preview")}
                                                className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "preview" ? "bg-blue-500 text-white shadow-lg" : "text-blue-300/60 hover:text-blue-100")}
                                            >
                                                Live Render
                                            </button>
                                            <button
                                                onClick={() => setViewMode("code")}
                                                className={cn("px-4 py-1.5 text-[10px] uppercase font-black rounded-lg transition-all", viewMode === "code" ? "bg-blue-500 text-white shadow-lg" : "text-blue-300/60 hover:text-blue-100")}
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
                                        className="h-10 w-10 text-blue-200/70 hover:text-white hover:bg-blue-900 rounded-2xl"
                                        onClick={() => navigator.clipboard.writeText(previewData?.data || "")}
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-10 w-10 text-blue-200/70 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl"
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
                                    <div className="h-full bg-[#050505] p-8 font-mono text-sm overflow-auto scrollbar-thin scrollbar-thumb-blue-900">
                                        <pre className="text-blue-300/90 leading-relaxed selection:bg-blue-500/20 whitespace-pre-wrap">
                                            <code>{previewData?.data}</code>
                                        </pre>
                                    </div>
                                )}
                            </div>

                            <div className="px-6 py-3 border-t border-blue-900/40 bg-[#0b1414]/70 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", previewData?.isStreaming ? "bg-amber-500 animate-pulse" : "bg-blue-500")} />
                                    <span className="text-[10px] text-blue-200/60 font-bold uppercase tracking-widest leading-none">
                                        {previewData?.isStreaming ? "Neural Link Active" : "Sync Complete"}
                                    </span>
                                </div>
                                <Badge variant="outline" className="text-[9px] border-blue-900 text-blue-200/50 font-black">
                                    {previewData?.language?.toUpperCase()} UTF-8
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


