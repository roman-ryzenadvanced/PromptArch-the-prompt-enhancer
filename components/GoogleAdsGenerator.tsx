"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Megaphone, Copy, Loader2, CheckCircle2, Settings, Plus, X, ChevronDown, ChevronUp, Wand2, Target, TrendingUp, ShieldAlert, BarChart3, Users, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleAdsResult } from "@/types";
import { translations } from "@/lib/i18n/translations";

export default function GoogleAdsGenerator() {
    const {
        googleAdsResult,
        magicWandResult,
        selectedProvider,
        selectedModels,
        availableModels,
        apiKeys,
        isProcessing,
        error,
        language,
        setGoogleAdsResult,
        setMagicWandResult,
        setProcessing,
        setError,
        setAvailableModels,
        setSelectedModel,
        setSelectedProvider,
    } = useStore();

    const t = translations[language].googleAds;
    const common = translations[language].common;

    // Input states
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [products, setProducts] = useState<string[]>([""]);
    const [targetAudience, setTargetAudience] = useState("");
    const [budgetMin, setBudgetMin] = useState("500");
    const [budgetMax, setBudgetMax] = useState("2000");
    const [duration, setDuration] = useState("30 days");
    const [industry, setIndustry] = useState("");

    const [copied, setCopied] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(["keywords"]);

    const [isMagicThinking, setIsMagicThinking] = useState(false);
    const selectedModel = selectedModels[selectedProvider];
    const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

    const toggleSection = (section: string) => {
        setExpandedSections((prev) =>
            prev.includes(section) ? prev.filter((s) => s !== section) : [...prev, section]
        );
    };

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

    const addProduct = () => setProducts([...products, ""]);
    const removeProduct = (index: number) => {
        const newProducts = products.filter((_, i) => i !== index);
        setProducts(newProducts.length ? newProducts : [""]);
    };
    const updateProduct = (index: number, value: string) => {
        const newProducts = [...products];
        newProducts[index] = value;
        setProducts(newProducts);
    };

    const handleGenerate = async () => {
        if (!websiteUrl.trim()) {
            setError("Please enter a website URL");
            return;
        }
        const filteredProducts = products.filter(p => p.trim() !== "");
        if (filteredProducts.length === 0) {
            setError("Please add at least one product or service");
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
        setMagicWandResult(null);

        console.log("[GoogleAdsGenerator] Starting generation...", { selectedProvider, selectedModel });

        try {
            const result = await modelAdapter.generateGoogleAds(websiteUrl, {
                productsServices: filteredProducts,
                targetAudience,
                budgetRange: { min: parseInt(budgetMin), max: parseInt(budgetMax), currency: "USD" },
                campaignDuration: duration,
                industry,
                language: "English"
            }, selectedProvider, selectedModel);

            console.log("[GoogleAdsGenerator] Generation result:", result);

            if (result.success && result.data) {
                try {
                    // Robust JSON extraction
                    const extractJson = (text: string) => {
                        try {
                            return JSON.parse(text);
                        } catch (e) {
                            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) ||
                                text.match(/```\s*([\s\S]*?)\s*```/i);
                            if (jsonMatch && jsonMatch[1]) {
                                try {
                                    return JSON.parse(jsonMatch[1].trim());
                                } catch (e2) { /* ignore */ }
                            }
                            const braceMatch = text.match(/(\{[\s\S]*\})/);
                            if (braceMatch) {
                                try {
                                    return JSON.parse(braceMatch[0].trim());
                                } catch (e3) { /* ignore */ }
                            }
                            throw new Error("Could not parse JSON from response");
                        }
                    };

                    const rawData = typeof result.data === 'string' ? result.data : JSON.stringify(result.data);
                    const parsedData = extractJson(rawData);

                    const adsResult: GoogleAdsResult = {
                        ...parsedData,
                        id: Math.random().toString(36).substr(2, 9),
                        websiteUrl,
                        productsServices: filteredProducts,
                        generatedAt: new Date(),
                        rawContent: rawData
                    };
                    setGoogleAdsResult(adsResult);
                    setExpandedSections(["keywords"]);
                } catch (e) {
                    console.error("Failed to parse ads data:", e);
                    setError("Failed to parse the generated ads content. Please try again.");
                }
            } else {
                console.error("[GoogleAdsGenerator] Generation failed:", result.error);
                setError(result.error || "Failed to generate Google Ads campaign");
            }
        } catch (err) {
            console.error("[GoogleAdsGenerator] Generation error:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setProcessing(false);
        }
    };

    const handleMagicWand = async () => {
        if (!websiteUrl.trim()) {
            setError("Please enter a website URL");
            return;
        }
        const firstProduct = products.find(p => p.trim() !== "");
        if (!firstProduct) {
            setError("Please add at least one product to promote");
            return;
        }

        const apiKey = apiKeys[selectedProvider];
        const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

        if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
            setError(`Please configure your ${selectedProvider.toUpperCase()} API key in Settings`);
            return;
        }

        setIsMagicThinking(true);
        setError(null);
        setGoogleAdsResult(null);

        try {
            const result = await modelAdapter.generateMagicWand(
                websiteUrl,
                firstProduct,
                parseInt(budgetMax),
                selectedProvider,
                selectedModel
            );

            if (result.success && result.data) {
                const extractJson = (text: string) => {
                    try { return JSON.parse(text); }
                    catch (e) {
                        const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
                        if (jsonMatch) return JSON.parse(jsonMatch[1].trim());
                        const braceMatch = text.match(/(\{[\s\S]*\})/);
                        if (braceMatch) return JSON.parse(braceMatch[0].trim());
                        throw e;
                    }
                };

                const data = extractJson(result.data);
                setMagicWandResult({
                    ...data,
                    id: Math.random().toString(36).substr(2, 9),
                    websiteUrl,
                    product: firstProduct,
                    budget: parseInt(budgetMax),
                    generatedAt: new Date(),
                    rawContent: result.data
                });
                setExpandedSections(["market", "strategies"]);
            } else {
                setError(result.error || "Magic Wand failed to research the market");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An error occurred during Magic Wand research");
        } finally {
            setIsMagicThinking(false);
        }
    };

    const handleCopy = async () => {
        const content = googleAdsResult?.rawContent || magicWandResult?.rawContent;
        if (content) {
            await navigator.clipboard.writeText(content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const sections = [
        { id: "keywords", title: language === "ru" ? "Исследование ключевых слов" : language === "he" ? "מחקר מילות מפתח" : "Keywords Research" },
        { id: "adcopies", title: language === "ru" ? "Варианты объявлений" : language === "he" ? "גרסאות עותקי מודעות" : "Ad Copy Variations" },
        { id: "campaigns", title: language === "ru" ? "Структура кампании" : language === "he" ? "מבנה קמפיין" : "Campaign Structure" },
        { id: "implementation", title: language === "ru" ? "Руководство по внедрению" : language === "he" ? "מדריך יישום" : "Implementation Guide" },
    ];

    const renderSectionContent = (sectionId: string) => {
        if (!googleAdsResult) return null;

        switch (sectionId) {
            case "keywords":
                return (
                    <div className="space-y-3">
                        {googleAdsResult.keywords?.primary?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Primary Keywords</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {googleAdsResult.keywords.primary.map((k, i) => (
                                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-md">
                                            {k.keyword} {k.cpc && <span className="opacity-60">({k.cpc})</span>}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {googleAdsResult.keywords?.longTail?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Long-Tail Keywords</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {googleAdsResult.keywords.longTail.map((k, i) => (
                                        <span key={i} className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                                            {k.keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {googleAdsResult.keywords?.negative?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Negative Keywords</h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {googleAdsResult.keywords.negative.map((k, i) => (
                                        <span key={i} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-md line-through">
                                            {k.keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                );
            case "adcopies":
                return (
                    <div className="space-y-4">
                        {googleAdsResult.adCopies?.map((ad, i) => (
                            <div key={i} className="p-3 rounded-md border bg-muted/20">
                                <div className="text-[10px] uppercase text-muted-foreground mb-2">Ad Variation {i + 1}</div>
                                <div className="space-y-1 mb-2">
                                    {ad.headlines?.map((h, j) => (
                                        <div key={j} className="text-sm font-medium text-blue-600">{h}</div>
                                    ))}
                                </div>
                                <div className="space-y-1">
                                    {ad.descriptions?.map((d, j) => (
                                        <p key={j} className="text-xs text-muted-foreground">{d}</p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case "campaigns":
                return (
                    <div className="space-y-3">
                        {googleAdsResult.campaigns?.map((camp, i) => (
                            <div key={i} className="p-3 rounded-md border">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-medium text-sm">{camp.name}</div>
                                        <div className="text-[10px] text-muted-foreground uppercase">{camp.type}</div>
                                    </div>
                                    {camp.budget && (
                                        <div className="text-right text-xs">
                                            <div className="font-semibold">${camp.budget.monthly}/mo</div>
                                            <div className="text-muted-foreground">${camp.budget.daily}/day</div>
                                        </div>
                                    )}
                                </div>
                                {camp.adGroups?.length > 0 && (
                                    <div className="mt-2 pt-2 border-t">
                                        <div className="text-[10px] uppercase text-muted-foreground mb-1">Ad Groups</div>
                                        <div className="flex flex-wrap gap-1">
                                            {camp.adGroups.map((g, j) => (
                                                <span key={j} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">{g.name}</span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                );
            case "implementation":
                return (
                    <div className="space-y-3">
                        {googleAdsResult.implementation?.setupSteps?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Setup Steps</h4>
                                <ol className="list-decimal list-inside space-y-1 text-xs">
                                    {googleAdsResult.implementation.setupSteps.map((step, i) => (
                                        <li key={i}>{step}</li>
                                    ))}
                                </ol>
                            </div>
                        )}
                        {googleAdsResult.implementation?.qualityScoreTips?.length > 0 && (
                            <div>
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Quality Score Tips</h4>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    {googleAdsResult.implementation.qualityScoreTips.map((tip, i) => (
                                        <li key={i}>{tip}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            default:
                return <pre className="whitespace-pre-wrap text-xs">{googleAdsResult.rawContent}</pre>;
        }
    }
};

const renderMagicWandSectionContent = (sectionId: string) => {
    if (!magicWandResult) return null;

    switch (sectionId) {
        case "market":
            return (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 rounded-md bg-indigo-50/50 border border-indigo-100">
                            <div className="text-[10px] uppercase font-bold text-indigo-600 mb-1 flex items-center gap-1">
                                <BarChart3 className="h-3 w-3" /> Industry Size
                            </div>
                            <div className="text-sm font-semibold">{magicWandResult.marketAnalysis.industrySize}</div>
                        </div>
                        <div className="p-3 rounded-md bg-emerald-50/50 border border-emerald-100">
                            <div className="text-[10px] uppercase font-bold text-emerald-600 mb-1 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" /> Growth Rate
                            </div>
                            <div className="text-sm font-semibold">{magicWandResult.marketAnalysis.growthRate}</div>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <div>
                            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5" /> Market Leaders
                            </h4>
                            <div className="flex flex-wrap gap-2">
                                {magicWandResult.marketAnalysis.topCompetitors.map((c, i) => (
                                    <span key={i} className="text-xs px-2 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">{c}</span>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                                <Rocket className="h-3.5 w-3.5" /> Emerging Trends
                            </h4>
                            <ul className="space-y-1">
                                {magicWandResult.marketAnalysis.marketTrends.map((t, i) => (
                                    <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1 shrink-0" />
                                        {t}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            );
        case "competitors":
            return (
                <div className="space-y-4">
                    {magicWandResult.competitorInsights.map((comp, i) => (
                        <div key={i} className="p-4 rounded-xl border bg-white/50 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-slate-900">{comp.competitor}</h4>
                                <ShieldAlert className="h-4 w-4 text-amber-500" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase text-emerald-600">Strengths</div>
                                    <ul className="space-y-1">
                                        {comp.strengths.map((s, j) => (
                                            <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                                                <span className="text-emerald-500">✓</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="space-y-1.5">
                                    <div className="text-[10px] font-black uppercase text-rose-600">Weaknesses</div>
                                    <ul className="space-y-1">
                                        {comp.weaknesses.map((w, j) => (
                                            <li key={j} className="text-xs text-slate-600 flex gap-1.5">
                                                <span className="text-rose-500">✗</span> {w}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-slate-100 italic text-xs text-slate-500">
                                <span className="font-bold text-slate-700 not-italic uppercase text-[9px]">Spy Report:</span> {comp.adStrategy}
                            </div>
                        </div>
                    ))}
                </div>
            );
        case "strategies":
            return (
                <div className="space-y-6">
                    {magicWandResult.strategies.map((strat, i) => (
                        <div key={i} className="relative p-5 rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all group overflow-hidden">
                            <div className="absolute top-0 right-0 h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-500" />
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="text-lg font-black text-slate-900 tracking-tight">{strat.direction}</h4>
                                    <p className="text-sm text-indigo-600 font-bold">{strat.targetAudience}</p>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className={cn(
                                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                                        strat.riskLevel === 'low' ? "bg-emerald-100 text-emerald-700" :
                                            strat.riskLevel === 'medium' ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"
                                    )}>
                                        {strat.riskLevel} risk
                                    </span>
                                    <span className="text-[10px] text-slate-400 mt-1 font-bold italic">{strat.timeToResults} to results</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                    <span className="text-indigo-500 font-black uppercase text-[9px] block mb-0.5">The "Why":</span>
                                    {strat.rationale}
                                </p>

                                <div className="p-3 bg-slate-50 rounded-xl border border-dashed text-xs space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Target className="h-3.5 w-3.5 text-indigo-500" />
                                        <span className="font-bold text-slate-700">Edge: {strat.competitiveAdvantage}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {strat.keyMessages.map((msg, j) => (
                                            <span key={j} className="text-[10px] bg-white border px-1.5 py-0.5 rounded-md text-slate-500 shadow-sm">{msg}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 items-center">
                                    <div className="space-y-1">
                                        <div className="text-[9px] font-black text-slate-400 uppercase">Channel Mix</div>
                                        <div className="flex flex-wrap gap-1">
                                            {strat.recommendedChannels.map((c, j) => (
                                                <span key={j} className="text-[9px] font-bold text-slate-600">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[9px] font-black text-slate-400 uppercase text-right">Expected ROI</div>
                                        <div className="text-lg font-black text-emerald-600 tracking-tighter">{strat.expectedROI}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        default:
            return <pre className="whitespace-pre-wrap text-xs">{magicWandResult.rawContent}</pre>;
    }
};


return (
    <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card className="h-fit">
            <CardHeader className="p-4 lg:p-6 text-start">
                <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                    <Megaphone className="h-4 w-4 lg:h-5 lg:w-5" />
                    {t.title}
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                    {t.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 lg:space-y-4 p-4 lg:p-6 pt-0 lg:pt-0">
                <div className="space-y-2">
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

                <div className="space-y-2">
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

                <div className="space-y-2">
                    <label className="text-xs lg:text-sm font-medium">{t.websiteUrl}</label>
                    <Input
                        placeholder="e.g., www.your-business.com"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="text-sm"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-xs lg:text-sm font-medium">{t.products}</label>
                    <div className="space-y-2">
                        {products.map((product, index) => (
                            <div key={index} className="flex gap-2">
                                <Input
                                    placeholder={`${language === "ru" ? "Продукт" : language === "he" ? "מוצר" : "Product"} ${index + 1}`}
                                    value={product}
                                    onChange={(e) => updateProduct(index, e.target.value)}
                                    className="text-sm"
                                />
                                {products.length > 1 && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => removeProduct(index)}
                                        className="h-10 w-10 shrink-0"
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addProduct} className="w-full text-xs">
                            <Plus className="mr-1.5 h-3.5 w-3.5" />
                            {language === "ru" ? "Добавить продукт" : language === "he" ? "הוסף מוצר" : "Add Product"}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">{t.budget}</label>
                        <div className="flex items-center gap-1.5">
                            <Input
                                type="number"
                                placeholder="Min"
                                value={budgetMin}
                                onChange={(e) => setBudgetMin(e.target.value)}
                                className="text-sm"
                            />
                            <span className="text-muted-foreground text-xs font-bold text-center">-</span>
                            <Input
                                type="number"
                                placeholder="Max"
                                value={budgetMax}
                                onChange={(e) => setBudgetMax(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">{t.industry}</label>
                        <Input
                            placeholder="e.g., SaaS"
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                            className="text-sm"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-xs lg:text-sm font-medium">{t.targetAudience}</label>
                    <Textarea
                        placeholder="e.g., Small business owners in USA looking for productivity tools"
                        value={targetAudience}
                        onChange={(e) => setTargetAudience(e.target.value)}
                        className="min-h-[80px] lg:min-h-[100px] resize-y text-sm"
                    />
                </div>

                {error && (
                    <div className="rounded-md bg-destructive/10 p-2.5 lg:p-3 text-xs lg:text-sm text-destructive">
                        {error}
                        {!apiKeys[selectedProvider] && (
                            <div className="mt-1.5 lg:mt-2 flex items-center gap-2">
                                <Settings className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                <span className="text-[10px] lg:text-xs">{common.configApiKey}</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                    <Button
                        onClick={handleGenerate}
                        disabled={isProcessing || isMagicThinking || !websiteUrl.trim()}
                        className="h-9 lg:h-10 text-xs lg:text-sm bg-primary/90 hover:bg-primary shadow-sm"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-1.5 lg:mr-2 h-3.5 w-3.5 animate-spin" />
                                {common.generating}
                            </>
                        ) : (
                            <>
                                <Megaphone className="mr-1.5 lg:mr-2 h-3.5 w-3.5" />
                                {t.generateAds}
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleMagicWand}
                        disabled={isProcessing || isMagicThinking || !websiteUrl.trim()}
                        className="h-9 lg:h-10 text-xs lg:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-md transition-all active:scale-[0.98]"
                    >
                        {isMagicThinking ? (
                            <>
                                <Loader2 className="mr-1.5 lg:mr-2 h-3.5 w-3.5 animate-spin" />
                                {t.researching}
                            </>
                        ) : (
                            <>
                                <Wand2 className="mr-1.5 h-3.5 w-3.5" />
                                {t.magicWand}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>

        <Card className={cn(!googleAdsResult && "opacity-50")}>
            <CardHeader className="p-4 lg:p-6">
                <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                    <span className="flex items-center gap-2">
                        {magicWandResult ? (
                            <Wand2 className="h-4 w-4 lg:h-5 lg:w-5 text-indigo-500" />
                        ) : (
                            <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                        )}
                        {magicWandResult ? t.strategicDirections : t.generatedCampaign}
                    </span>
                    {(googleAdsResult || magicWandResult) && (
                        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 lg:h-9 lg:w-9">
                            {copied ? (
                                <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-500" />
                            ) : (
                                <Copy className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                            )}
                        </Button>
                    )}
                </CardTitle>
                <CardDescription className="text-xs lg:text-sm">
                    {magicWandResult
                        ? (language === "ru" ? "Глубокое исследование конкурентов и темы кампаний" : language === "he" ? "מחקר תחרותי מעמיק ונושאי קמפיין" : "Deep competitive research and campaign themes")
                        : (language === "ru" ? "Ключевые слова, объявления и структура кампании" : language === "he" ? "מילות מפתח, עותקי מודעות ומבנה קמפיין מוכנים" : "Keywords, ad copy, and campaign structure ready")
                    }
                </CardDescription>
            </CardHeader>
            <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
                {googleAdsResult || magicWandResult ? (
                    <div className="space-y-2 lg:space-y-3">
                        {(magicWandResult
                            ? [
                                { id: "market", title: t.marketIntelligence },
                                { id: "competitors", title: t.competitiveInsights },
                                { id: "strategies", title: t.campaignDirections }
                            ]
                            : sections
                        ).map((section) => (
                            <div key={section.id} className="rounded-md border bg-muted/30">
                                <button
                                    onClick={() => toggleSection(section.id)}
                                    className="flex w-full items-center justify-between px-3 lg:px-4 py-2.5 lg:py-3 text-left font-medium transition-colors hover:bg-muted/50 text-xs lg:text-sm"
                                >
                                    <span>{section.title}</span>
                                    {expandedSections.includes(section.id) ? (
                                        <ChevronUp className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    ) : (
                                        <ChevronDown className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    )}
                                </button>
                                {expandedSections.includes(section.id) && (
                                    <div className="border-t bg-background px-3 lg:px-4 py-2.5 lg:py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {magicWandResult
                                            ? renderMagicWandSectionContent(section.id)
                                            : renderSectionContent(section.id)
                                        }
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex h-[200px] lg:h-[300px] items-center justify-center text-center text-xs lg:text-sm text-muted-foreground">
                        {language === "ru" ? "Здесь появится созданная кампания" : language === "he" ? "קמפיין שחולל יופיע כאן" : "Generated campaign will appear here"}
                    </div>
                )}
            </CardContent>
        </Card>
    </div>
);
}
