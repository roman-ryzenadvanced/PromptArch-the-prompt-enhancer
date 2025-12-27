"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useStore from "@/lib/store";
import { translations } from "@/lib/i18n/translations";
import modelAdapter from "@/lib/services/adapter-instance";
import {
    MessageSquare, Send, Sparkles, Brain, Cpu, Code2, Palette, FileText, Search,
    BarChart, Rocket, Terminal, Eye, History, Trash2, Loader2, Bot, User,
    Settings, Layers, AppWindow, Smartphone, Monitor, X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AIAssistMessage } from "@/types";

const AGENTS = [
    { id: "general", label: "General Intel", icon: Bot, color: "slate" },
    { id: "content", label: "Content Optimization", icon: FileText, color: "amber" },
    { id: "seo", label: "SEO Analyst", icon: Search, color: "emerald" },
    { id: "smm", label: "SMM Strategy", icon: BarChart, color: "pink" },
    { id: "pm", label: "Project Manager", icon: Rocket, color: "indigo" },
    { id: "code", label: "Code Architect", icon: Terminal, color: "violet" },
    { id: "design", label: "UI/UX Designer", icon: Palette, color: "orange" },
    { id: "web", label: "Web Dev Preview", icon: Monitor, color: "blue" },
    { id: "app", label: "App Dev Preview", icon: Smartphone, color: "cyan" }
];

const AIAssist = () => {
    const { language, selectedProvider, selectedModels, apiKeys, aiAssistHistory, setAIAssistHistory } = useStore();
    const t = translations[language].aiAssist;
    const common = translations[language].common;

    const [input, setInput] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentAgent, setCurrentAgent] = useState("general");
    const [activeTab, setActiveTab] = useState("chat");
    const [previewData, setPreviewData] = useState<{ type: string; data: string; language?: string } | null>(null);

    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [aiAssistHistory]);

    const handleSendMessage = async () => {
        if (!input.trim() || isProcessing) return;

        const userMessage: AIAssistMessage = {
            role: "user",
            content: input,
            timestamp: new Date()
        };

        setAIAssistHistory(prev => [...prev, userMessage]);
        setInput("");
        setIsProcessing(true);

        try {
            const apiKey = apiKeys[selectedProvider];
            const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

            if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
                throw new Error(`Please configure your ${selectedProvider.toUpperCase()} API key in Settings`);
            }

            // Call model adapter for AI Assist
            // Note: We'll implement generateAIAssist in model-adapter.ts next
            const result = await modelAdapter.generateAIAssist({
                messages: aiAssistHistory.concat(userMessage),
                currentAgent
            }, selectedProvider, selectedModels[selectedProvider]);

            if (result.success && result.data) {
                try {
                    // Expecting a structured response with possible agent switch and preview
                    const cleanJson = result.data.replace(/```json\s*([\s\S]*?)\s*```/i, '$1').trim();
                    const parsed = JSON.parse(cleanJson);

                    const assistantMessage: AIAssistMessage = {
                        role: "assistant",
                        content: parsed.content,
                        agent: parsed.agent || currentAgent,
                        preview: parsed.preview,
                        timestamp: new Date()
                    };

                    if (parsed.agent && parsed.agent !== currentAgent) {
                        setCurrentAgent(parsed.agent);
                    }

                    if (parsed.preview) {
                        setPreviewData(parsed.preview);
                        setActiveTab("preview");
                    }

                    setAIAssistHistory(prev => [...prev, assistantMessage]);
                } catch (e) {
                    // Fallback to plain text if JSON parsing fails
                    const assistantMessage: AIAssistMessage = {
                        role: "assistant",
                        content: result.data,
                        agent: currentAgent,
                        timestamp: new Date()
                    };
                    setAIAssistHistory(prev => [...prev, assistantMessage]);
                }
            } else {
                throw new Error(result.error || "Failed to get response");
            }
        } catch (err) {
            const errorMessage: AIAssistMessage = {
                role: "system",
                content: err instanceof Error ? err.message : "An unexpected error occurred",
                timestamp: new Date()
            };
            setAIAssistHistory(prev => [...prev, errorMessage]);
        } finally {
            setIsProcessing(false);
        }
    };

    const clearHistory = () => {
        setAIAssistHistory([]);
        setPreviewData(null);
        setActiveTab("chat");
        setCurrentAgent("general");
    };

    const renderPreview = () => {
        if (!previewData) return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Eye className="h-12 w-12 opacity-20" />
                <p className="text-sm font-medium italic">No active preview to display</p>
            </div>
        );

        switch (previewData.type) {
            case "code":
            case "web":
            case "app":
                return (
                    <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <Terminal className="h-3.5 w-3.5 text-indigo-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Live Execution Sandbox</span>
                            </div>
                            <Badge variant="outline" className="text-[8px] border-slate-700 text-slate-400 uppercase">Secure Booted</Badge>
                        </div>
                        <div className="flex-1 bg-slate-950 rounded-b-xl overflow-hidden p-6 font-mono text-sm relative group">
                            <pre className="text-emerald-400 whitespace-pre-wrap">{previewData.data}</pre>
                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <Button size="sm" className="bg-white text-slate-900 hover:bg-slate-100 font-black uppercase tracking-widest text-[10px]">Execute Preview</Button>
                            </div>
                        </div>
                    </div>
                );
            case "design":
                return (
                    <div className="h-full flex flex-col gap-4">
                        <div className="flex items-center justify-between px-4 py-2 bg-slate-900 text-white rounded-t-xl">
                            <div className="flex items-center gap-2">
                                <Palette className="h-3.5 w-3.5 text-orange-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest">UI Layout Preview</span>
                            </div>
                        </div>
                        <div className="flex-1 bg-slate-50 border-2 border-dashed border-slate-200 rounded-b-xl flex items-center justify-center p-8">
                            <div className="max-w-md w-full p-6 bg-white rounded-2xl shadow-xl border border-slate-100 animate-in zoom-in-95 duration-500">
                                {previewData.data}
                            </div>
                        </div>
                    </div>
                );
            default:
                return (
                    <div className="h-full overflow-y-auto p-6 bg-white rounded-xl border border-slate-200 prose prose-slate max-w-none">
                        <div className="whitespace-pre-wrap font-medium text-slate-700 leading-relaxed">
                            {previewData.data}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2 shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
                            <MessageSquare className="h-6 w-6" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black tracking-tight text-slate-900">{t.title}</h2>
                            <p className="text-slate-500 font-medium text-xs">{t.description}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={clearHistory} className="rounded-xl border-slate-200 text-slate-500 hover:text-rose-500 hover:border-rose-200">
                            <Trash2 className="h-4 w-4 mr-2" /> Clear Chat
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 min-h-0">
                {/* Chat Panel */}
                <Card className={cn(
                    "xl:col-span-12 flex flex-col border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden bg-white/80 backdrop-blur-md transition-all duration-500",
                    activeTab === "preview" ? "xl:col-span-5" : "xl:col-span-12"
                )}>
                    <CardHeader className="bg-slate-50/50 border-b p-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Bot className="h-4 w-4 text-indigo-600" />
                                <span className="text-xs font-black uppercase tracking-widest text-slate-500">Conversation Thread</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {AGENTS.map((agent) => (
                                    <button
                                        key={agent.id}
                                        onClick={() => setCurrentAgent(agent.id)}
                                        className={cn(
                                            "p-1.5 rounded-lg transition-all",
                                            currentAgent === agent.id
                                                ? `bg-${agent.color}-100 text-${agent.color}-600 ring-2 ring-${agent.color}-400/30 scale-110`
                                                : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                                        )}
                                        title={agent.label}
                                    >
                                        <agent.icon className="h-3.5 w-3.5" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="flex-1 flex flex-col p-0 min-h-0 relative">
                        <div
                            ref={scrollRef}
                            className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
                        >
                            {aiAssistHistory.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                                    <div className="p-6 rounded-3xl bg-indigo-50 border border-indigo-100 mb-6 animate-bounce duration-[3000ms]">
                                        <Sparkles className="h-12 w-12 text-indigo-500" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-800 mb-2">{t.chatStart}</h3>
                                    <p className="text-sm text-slate-400 max-w-sm">Start a conversation to activate specialized AI agents for code, design, SEO, and more.</p>
                                </div>
                            ) : (
                                aiAssistHistory.map((msg, i) => (
                                    <div key={i} className={cn(
                                        "flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500",
                                        msg.role === "user" ? "flex-row-reverse" : "flex-row"
                                    )}>
                                        <div className={cn(
                                            "h-9 w-9 shrink-0 rounded-2xl flex items-center justify-center border shadow-sm transition-transform hover:scale-110",
                                            msg.role === "user"
                                                ? "bg-slate-900 border-slate-800 text-white"
                                                : "bg-white border-slate-100 text-indigo-600"
                                        )}>
                                            {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div className={cn(
                                            "max-w-[80%] space-y-2",
                                            msg.role === "user" ? "items-end text-right" : "items-start text-left"
                                        )}>
                                            {msg.agent && (
                                                <Badge variant="outline" className="text-[9px] font-black uppercase tracking-widest px-1.5 py-0 border-indigo-200 text-indigo-500 bg-indigo-50/50">
                                                    {AGENTS.find(a => a.id === msg.agent)?.label || msg.agent}
                                                </Badge>
                                            )}
                                            <div className={cn(
                                                "p-4 rounded-3xl text-sm font-medium leading-relaxed shadow-sm",
                                                msg.role === "user"
                                                    ? "bg-indigo-600 text-white rounded-tr-none"
                                                    : msg.role === "system"
                                                        ? "bg-rose-50 text-rose-600 border border-rose-100 rounded-tl-none"
                                                        : "bg-white border border-slate-100 text-slate-700 rounded-tl-none"
                                            )}>
                                                {msg.content}
                                            </div>
                                            <span className="text-[10px] text-slate-400 font-bold px-1">
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                            {isProcessing && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="h-9 w-9 rounded-2xl bg-slate-100 border border-slate-50 flex items-center justify-center">
                                        <Loader2 className="h-4 w-4 animate-spin text-indigo-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-10 w-32 bg-slate-50 border border-slate-100 rounded-3xl rounded-tl-none flex items-center px-4">
                                            <div className="flex gap-1">
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                                <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 bg-white border-t border-slate-100">
                            <div className="relative group">
                                <div className="absolute inset-x-0 -top-12 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                                <div className="flex gap-3 items-end">
                                    <div className="flex-1 relative">
                                        <Input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                            placeholder={t.placeholder}
                                            className="h-14 pl-12 pr-4 bg-slate-50 border-slate-200 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all rounded-2xl font-medium"
                                        />
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2">
                                            <Sparkles className="h-5 w-5 text-indigo-400" />
                                        </div>
                                    </div>
                                    <Button
                                        onClick={handleSendMessage}
                                        disabled={isProcessing || !input.trim()}
                                        className="h-14 w-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-100 shrink-0 transition-transform active:scale-90"
                                    >
                                        <Send className="h-6 w-6" />
                                    </Button>
                                </div>
                                <div className="mt-3 flex items-center justify-between px-2">
                                    <div className="flex gap-4">
                                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5">
                                            <Layers className="h-3 w-3" /> Layout Design
                                        </button>
                                        <button className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 transition-colors flex items-center gap-1.5">
                                            <Code2 className="h-3 w-3" /> Code Snippet
                                        </button>
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-300 italic">
                                        Powered by {selectedProvider.toUpperCase()} / {selectedModels[selectedProvider]}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Preview Panel (Conditional) */}
                {activeTab === "preview" && (
                    <Card className="xl:col-span-7 flex flex-col border-slate-200/60 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white animate-in slide-in-from-right-8 duration-500">
                        <CardHeader className="bg-slate-900 text-white p-4 shrink-0 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Monitor className="h-4 w-4 text-indigo-400" />
                                <span className="text-xs font-black uppercase tracking-widest">{t.preview}</span>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setActiveTab("chat")}
                                className="h-8 w-8 text-slate-400 hover:text-white"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 overflow-hidden bg-slate-50/50">
                            {renderPreview()}
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};

export default AIAssist;
