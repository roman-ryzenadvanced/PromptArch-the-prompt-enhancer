"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import {
    Search,
    Target,
    DollarSign,
    Globe,
    Calendar,
    Zap,
    BarChart3,
    Layers,
    ShieldCheck,
    Loader2,
    Copy,
    Download,
    ExternalLink,
    MousePointer2,
    CheckCircle2,
    AlertCircle,
    Megaphone,
    Briefcase,
    TrendingUp,
    X,
    Plus
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleAdsResult, GoogleAdsKeyword, GoogleAdCopy, GoogleAdsCampaign } from "@/types";

export default function GoogleAdsGenerator() {
    const {
        googleAdsResult,
        selectedProvider,
        selectedModels,
        availableModels,
        apiKeys,
        isProcessing,
        error,
        setGoogleAdsResult,
        setProcessing,
        setError,
        setAvailableModels,
        setSelectedModel,
        setSelectedProvider,
    } = useStore();

    // Input states
    const [websiteUrl, setWebsiteUrl] = useState("");
    const [products, setProducts] = useState<string[]>([""]);
    const [targetAudience, setTargetAudience] = useState("");
    const [budgetMin, setBudgetMin] = useState("500");
    const [budgetMax, setBudgetMax] = useState("2000");
    const [currency, setCurrency] = useState("USD");
    const [duration, setDuration] = useState("30 days");
    const [industry, setIndustry] = useState("");

    const [activeTab, setActiveTab] = useState("input");
    const [copied, setCopied] = useState<string | null>(null);

    const selectedModel = selectedModels[selectedProvider];
    const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

    useEffect(() => {
        if (typeof window !== "undefined") {
            loadAvailableModels();
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

    const validateUrl = (url: string) => {
        try {
            new URL(url.startsWith("http") ? url : `https://${url}`);
            return true;
        } catch (e) {
            return false;
        }
    };

    const handleGenerate = async () => {
        if (!websiteUrl.trim()) {
            setError("Please enter a website URL");
            return;
        }
        if (!validateUrl(websiteUrl)) {
            setError("Please enter a valid URL");
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
        setActiveTab("input");

        try {
            const result = await modelAdapter.generateGoogleAds(websiteUrl, {
                productsServices: filteredProducts,
                targetAudience,
                budgetRange: { min: parseInt(budgetMin), max: parseInt(budgetMax), currency },
                campaignDuration: duration,
                industry,
                language: "English"
            }, selectedProvider, selectedModel);

            if (result.success && result.data) {
                try {
                    // Optimized parsing helper
                    const extractJson = (text: string) => {
                        try {
                            // 1. Direct parse
                            return JSON.parse(text);
                        } catch (e) {
                            // 2. Extract from markdown code blocks
                            const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) ||
                                text.match(/```\s*([\s\S]*?)\s*```/i);

                            if (jsonMatch && jsonMatch[1]) {
                                try {
                                    return JSON.parse(jsonMatch[1].trim());
                                } catch (e2) {
                                    console.error("Failed to parse extracted JSON block", e2);
                                }
                            }

                            // 3. Last resort: extract anything between the first { and last }
                            const braceMatch = text.match(/(\{[\s\S]*\})/);
                            if (braceMatch) {
                                try {
                                    return JSON.parse(braceMatch[0].trim());
                                } catch (e3) {
                                    console.error("Failed to parse content between braces", e3);
                                }
                            }

                            throw new Error("Invalid format: AI response did not contain valid JSON");
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
                    setActiveTab("keywords");
                } catch (e) {
                    console.error("Failed to parse ads data:", e);
                    setError("Failed to parse the generated ads content. Please try again or switch AI providers.");
                }
            } else {
                setError(result.error || "Failed to generate Google Ads campaign");
            }
        } catch (err) {
            console.error("Ads Generation error:", err);
            setError(err instanceof Error ? err.message : "An error occurred");
        } finally {
            setProcessing(false);
        }
    };

    const handleCopy = async (text: string, id: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(id);
        setTimeout(() => setCopied(null), 2000);
    };

    const exportToCsv = () => {
        if (!googleAdsResult) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Type,Category,Headline/Keyword,Description/Value,Details\n";

        // Keywords
        googleAdsResult.keywords.primary.forEach(k => {
            csvContent += `Keyword,Primary,"${k.keyword}","${k.searchVolume || ''}","${k.competition || ''}"\n`;
        });
        googleAdsResult.keywords.longTail.forEach(k => {
            csvContent += `Keyword,Long-Tail,"${k.keyword}","${k.searchVolume || ''}","${k.competition || ''}"\n`;
        });
        googleAdsResult.keywords.negative.forEach(k => {
            csvContent += `Keyword,Negative,"${k.keyword}","",""\n`;
        });

        // Ads
        googleAdsResult.adCopies.forEach((ad, i) => {
            ad.headlines.forEach((h, j) => {
                csvContent += `Ad Copy,Headline ${j + 1},"${h}","",""\n`;
            });
            ad.descriptions.forEach((d, j) => {
                csvContent += `Ad Copy,Description ${j + 1},"${d}","",""\n`;
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `google_ads_${googleAdsResult.id}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mx-auto max-w-7xl animate-in fade-in duration-700">
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-br from-blue-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent flex items-center gap-4">
                        <Megaphone className="h-10 w-10 text-blue-600" />
                        Google Ads Strategist
                        <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 font-bold text-xs uppercase tracking-widest">Premium AI</Badge>
                    </h1>
                    <p className="text-muted-foreground mt-2 text-lg">
                        Convert concepts into high-ROI Google Ads campaigns with precision-engineered keywords and copy.
                    </p>
                </div>

                {googleAdsResult && (
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={exportToCsv} className="gap-2">
                            <Download className="h-4 w-4" />
                            Export CSV
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setGoogleAdsResult(null)} className="gap-2">
                            <X className="h-4 w-4" />
                            New Campaign
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
                {/* Input Panel */}
                <div className={cn("lg:col-span-4 space-y-6", activeTab !== "input" && googleAdsResult && "hidden lg:block")}>
                    <Card className="border-blue-100/50 shadow-xl shadow-blue-500/5 bg-white/70 backdrop-blur-md overflow-hidden transition-all hover:shadow-blue-500/10 active:scale-[0.995]">
                        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-600" />
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl flex items-center gap-3 text-slate-800">
                                <Target className="h-6 w-6 text-blue-600" />
                                Campaign Inputs
                            </CardTitle>
                            <CardDescription className="text-slate-500 font-medium">
                                Configure your primary triggers and constraints.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                    <Globe className="h-4 w-4" />
                                    Website URL
                                </label>
                                <Input
                                    placeholder="e.g. www.startup-x.io"
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    className="bg-white/50 border-blue-100 focus:border-blue-500 focus-visible:ring-blue-500 h-11 text-base shadow-sm"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold flex items-center gap-2 text-foreground/80">
                                    <Briefcase className="h-4 w-4" />
                                    Products or Services
                                </label>
                                <div className="space-y-2">
                                    {products.map((product, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder={`Service/Product ${index + 1}`}
                                                value={product}
                                                onChange={(e) => updateProduct(index, e.target.value)}
                                                className="bg-muted/30 focus-visible:ring-blue-500"
                                            />
                                            {products.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeProduct(index)}
                                                    className="text-muted-foreground hover:text-destructive h-10 w-10"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={addProduct}
                                        className="w-full border-dashed border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Another
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-100/50 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                                            <DollarSign className="h-4 w-4" />
                                            Monthly Budget
                                        </label>
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">$</span>
                                            <Input
                                                type="number"
                                                value={budgetMin}
                                                onChange={(e) => setBudgetMin(e.target.value)}
                                                className="pl-7 bg-white h-9 text-sm"
                                            />
                                        </div>
                                        <span className="text-muted-foreground">to</span>
                                        <div className="relative flex-1">
                                            <span className="absolute left-3 top-2.5 text-muted-foreground text-xs">$</span>
                                            <Input
                                                type="number"
                                                value={budgetMax}
                                                onChange={(e) => setBudgetMax(e.target.value)}
                                                className="pl-7 bg-white h-9 text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Industry
                                    </label>
                                    <Input
                                        placeholder="e.g. SaaS"
                                        value={industry}
                                        onChange={(e) => setIndustry(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Duration
                                    </label>
                                    <Input
                                        placeholder="e.g. 30 days"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Target Audience
                                </label>
                                <Input
                                    placeholder="e.g. Small business owners in US"
                                    value={targetAudience}
                                    onChange={(e) => setTargetAudience(e.target.value)}
                                    className="h-9 text-sm"
                                />
                            </div>

                            <div className="pt-4 border-t border-muted">
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {(["qwen", "ollama", "zai"] as const).map((provider) => (
                                        <Button
                                            key={provider}
                                            variant={selectedProvider === provider ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setSelectedProvider(provider)}
                                            className={cn(
                                                "capitalize h-8 px-3 text-xs",
                                                selectedProvider === provider ? "bg-blue-600 hover:bg-blue-700" : ""
                                            )}
                                        >
                                            {provider === "qwen" ? "Qwen" : provider === "ollama" ? "Ollama" : "Z.AI"}
                                        </Button>
                                    ))}
                                </div>

                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
                                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs mb-4"
                                >
                                    {models.map((model) => (
                                        <option key={model} value={model}>
                                            {model}
                                        </option>
                                    ))}
                                </select>

                                {error && (
                                    <div className="rounded-md bg-destructive/10 p-3 text-xs text-destructive flex items-start gap-2 mb-4 animate-in slide-in-from-top-1 duration-300">
                                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                        <span>{error}</span>
                                    </div>
                                )}

                                <Button
                                    onClick={handleGenerate}
                                    disabled={isProcessing || !websiteUrl}
                                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 font-semibold shadow-md shadow-blue-200 text-sm group"
                                >
                                    {isProcessing ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Analyzing Website...
                                        </>
                                    ) : (
                                        <>
                                            <Zap className="mr-2 h-4 w-4 group-hover:fill-current transition-all" />
                                            Generate Google Ads Campaign
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-blue-50 p-5 border-blue-100 shadow-sm">
                        <h4 className="font-bold text-blue-900 flex items-center gap-2 mb-3">
                            <ShieldCheck className="h-5 w-5 text-indigo-600" />
                            Quality Assurance
                        </h4>
                        <ul className="space-y-2.5">
                            {[
                                "Character limit enforcement",
                                "Keyword relevance matching >85%",
                                "Google Ads policy compliance",
                                "Mobile optimization focus"
                            ].map((item, i) => (
                                <li key={i} className="flex items-center gap-2 text-sm text-blue-800/80">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-8 flex flex-col h-full min-h-[600px]">
                    {!googleAdsResult && !isProcessing && (
                        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-3xl bg-muted/20 p-12 text-center">
                            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-6">
                                <Megaphone className="h-10 w-10 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">Ready to Launch?</h3>
                            <p className="text-muted-foreground max-w-sm mt-2 mb-6 text-sm">
                                Enter your website URL and products on the left to generate keyword research, ad copy, and a full campaign structure.
                            </p>
                            <div className="flex gap-3">
                                <Badge variant="outline" className="px-3 py-1 bg-white">15+ Years Domain Knowledge</Badge>
                                <Badge variant="outline" className="px-3 py-1 bg-white">Quality Score Optimization</Badge>
                            </div>
                        </div>
                    )}

                    {isProcessing && (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-12 text-center bg-white/30 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl animate-in zoom-in-95 duration-500 relative overflow-hidden">
                            {/* Decorative background blur */}
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 blur-[100px] rounded-full -z-10" />

                            <div className="relative mb-10">
                                <div className="w-32 h-32 border-[6px] border-blue-100 rounded-full animate-[spin_3s_linear_infinite]" style={{ borderTopColor: 'rgb(37 99 235)' }} />
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg shadow-blue-500/40">
                                        <Search className="h-8 w-8 text-white animate-pulse" />
                                    </div>
                                </div>
                            </div>

                            <h3 className="text-3xl font-black text-slate-800 mb-3 tracking-tight">Strategizing Your Campaign...</h3>
                            <p className="text-slate-500 font-medium mb-8 max-w-md mx-auto">
                                Scouring <span className="text-blue-600 font-bold">{websiteUrl}</span> for conversion triggers and competitive edges.
                            </p>

                            <div className="max-w-md w-full bg-slate-200/50 rounded-full h-3 mb-10 overflow-hidden border border-white/20">
                                <div className="bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-600 h-full animate-progress-indeterminate shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-12 w-full max-w-2xl px-4">
                                {[
                                    { label: "Keywords", delay: "0s" },
                                    { label: "Ad Copy", delay: "0.2s" },
                                    { label: "Targeting", delay: "0.4s" },
                                    { label: "ROI Modeling", delay: "0.6s" }
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-700" style={{ animationDelay: item.delay }}>
                                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                                            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                                        </div>
                                        <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {googleAdsResult && (
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="bg-muted/50 p-1.5 rounded-xl border mb-6 flex items-center justify-between">
                                <TabsList className="bg-transparent border-0 gap-1">
                                    <TabsTrigger value="keywords" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 gap-2 text-sm h-9">
                                        <Search className="h-4 w-4 text-blue-600" />
                                        Keywords
                                    </TabsTrigger>
                                    <TabsTrigger value="creative" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 gap-2 text-sm h-9">
                                        <Megaphone className="h-4 w-4 text-pink-600" />
                                        Ad Templates
                                    </TabsTrigger>
                                    <TabsTrigger value="structure" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 gap-2 text-sm h-9">
                                        <Layers className="h-4 w-4 text-indigo-600" />
                                        Campaigns
                                    </TabsTrigger>
                                    <TabsTrigger value="implementation" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg px-4 gap-2 text-sm h-9">
                                        <Zap className="h-4 w-4 text-yellow-600" />
                                        Launch Guide
                                    </TabsTrigger>
                                </TabsList>

                                {googleAdsResult.predictions && (
                                    <div className="hidden md:flex items-center gap-4 px-4 text-xs font-medium text-muted-foreground border-l border-muted-foreground/20">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase">Est. CTR</span>
                                            <span className="text-blue-600">{googleAdsResult.predictions.estimatedCtr}</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] uppercase">Conversions</span>
                                            <span className="text-blue-600">{googleAdsResult.predictions.estimatedConversions}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 overflow-auto pr-1">
                                <TabsContent value="keywords" className="m-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <Card className="border-green-100 shadow-sm hover:shadow-md transition-shadow">
                                            <CardHeader className="bg-green-50/50 py-4 border-b border-green-50">
                                                <CardTitle className="text-base flex items-center justify-between">
                                                    <span className="flex items-center gap-2">
                                                        <TrendingUp className="h-5 w-5 text-green-600" />
                                                        Primary Keywords
                                                    </span>
                                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(googleAdsResult.keywords.primary.map(k => k.keyword).join('\n'), 'primary-keys')} className="h-7 px-2">
                                                        {copied === 'primary-keys' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="divide-y text-sm">
                                                    {googleAdsResult.keywords.primary.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors group">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-foreground">{item.keyword}</span>
                                                                <div className="flex gap-2 text-[10px] mt-0.5">
                                                                    <span className="text-muted-foreground">Vol: {item.searchVolume}</span>
                                                                    <span className="text-blue-600">CPC: {item.cpc}</span>
                                                                </div>
                                                            </div>
                                                            <Badge variant="secondary" className={cn(
                                                                "text-[10px] capitalize",
                                                                item.competition === 'low' ? "bg-green-100 text-green-700" :
                                                                    item.competition === 'medium' ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                                                            )}>
                                                                {item.competition}
                                                            </Badge>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <Card className="border-blue-100 shadow-sm hover:shadow-md transition-shadow">
                                            <CardHeader className="bg-blue-50/50 py-4 border-b border-blue-50">
                                                <CardTitle className="text-base flex items-center justify-between">
                                                    <span className="flex items-center gap-2">
                                                        <MousePointer2 className="h-5 w-5 text-blue-600" />
                                                        Long-Tail Opportunities
                                                    </span>
                                                    <Button variant="ghost" size="sm" onClick={() => handleCopy(googleAdsResult.keywords.longTail.map(k => k.keyword).join('\n'), 'long-keys')} className="h-7 px-2">
                                                        {copied === 'long-keys' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                                                    </Button>
                                                </CardTitle>
                                            </CardHeader>
                                            <CardContent className="p-0">
                                                <div className="divide-y text-sm">
                                                    {googleAdsResult.keywords.longTail.map((item, i) => (
                                                        <div key={i} className="flex items-center justify-between p-3 hover:bg-muted/30 transition-colors">
                                                            <div className="flex flex-col">
                                                                <span className="font-semibold text-foreground">{item.keyword}</span>
                                                                <span className="text-[10px] text-muted-foreground mt-0.5">High Performance Match: {item.difficultyScore}%</span>
                                                            </div>
                                                            <span className="text-[10px] font-bold text-blue-600">{item.cpc}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </div>

                                    <Card className="border-red-100 shadow-sm border-l-4 border-l-red-500">
                                        <CardHeader className="py-4">
                                            <CardTitle className="text-base flex items-center justify-between">
                                                <span className="flex items-center gap-2 text-red-700">
                                                    <AlertCircle className="h-5 w-5" />
                                                    Negative Keyword List (Add these to Campaigns)
                                                </span>
                                                <Button variant="ghost" size="sm" onClick={() => handleCopy(googleAdsResult.keywords.negative.map(k => k.keyword).join('\n'), 'neg-keys')} className="h-7 px-2 hover:bg-red-50">
                                                    {copied === 'neg-keys' ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4 text-red-600" />}
                                                </Button>
                                            </CardTitle>
                                            <CardDescription>Exclude these terms to prevent wasted spend on irrelevant clicks.</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex flex-wrap gap-2">
                                                {googleAdsResult.keywords.negative.map((item, i) => (
                                                    <Badge key={i} variant="outline" className="bg-red-50 text-red-700 border-red-100 hover:bg-red-100 hover:text-red-800 transition-colors">
                                                        {item.keyword}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="creative" className="m-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {googleAdsResult.adCopies.map((ad, i) => (
                                            <Card key={i} className="border border-muted-foreground/10 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300">
                                                <div className="bg-muted px-4 py-2 border-b flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ad Variation {i + 1} • {ad.campaignType}</span>
                                                    </div>
                                                    {ad.mobileOptimized && (
                                                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none text-[9px] h-4">Mobile Ready</Badge>
                                                    )}
                                                </div>
                                                <div className="p-5 space-y-4 bg-white">
                                                    <div className="space-y-1">
                                                        {ad.headlines.map((h, j) => (
                                                            <div key={j} className="flex items-center justify-between group">
                                                                <span className="text-blue-700 font-semibold text-base line-clamp-1">{h}</span>
                                                                <Badge variant="outline" className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">{h.length}/30</Badge>
                                                            </div>
                                                        ))}
                                                    </div>
                                                    <div className="text-xs text-green-800 font-medium flex items-center gap-1">
                                                        Ads • <span className="underline cursor-pointer">{ad.displayUrl}</span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {ad.descriptions.map((d, j) => (
                                                            <div key={j} className="flex items-start justify-between group">
                                                                <p className="text-sm text-foreground/80 leading-relaxed pr-4">{d}</p>
                                                                <Badge variant="outline" className="text-[9px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-1">{d.length}/90</Badge>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <div className="pt-4 flex items-center justify-between border-t border-muted">
                                                        <Button size="sm" variant="outline" className="h-8 text-xs bg-indigo-50 text-indigo-700 border-indigo-100 hover:bg-indigo-100">
                                                            {ad.callToAction}
                                                        </Button>
                                                        <Button variant="ghost" size="sm" onClick={() => handleCopy(`${ad.headlines.join('\n')}\n\n${ad.descriptions.join('\n')}`, `ad-${i}`)} className="h-8 px-2 gap-2 text-xs">
                                                            {copied === `ad-${i}` ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
                                                            Copy Copy
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>

                                    <div className="rounded-2xl p-6 bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-lg overflow-hidden relative">
                                        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                            <div className="space-y-2">
                                                <h4 className="text-xl font-bold flex items-center gap-2">
                                                    <Zap className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                                                    A/B Testing Recommendation
                                                </h4>
                                                <p className="text-blue-50 text-sm max-w-xl">
                                                    Use dynamic keyword insertion for "Variation 1" and focus on emotion-based headlines for "Variation 2" to compare user engagement and CTR.
                                                </p>
                                            </div>
                                            <Button variant="secondary" className="bg-white text-blue-700 hover:bg-blue-50 font-bold whitespace-nowrap" onClick={() => setActiveTab("implementation")}>
                                                View Optimization Guide
                                            </Button>
                                        </div>
                                        <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                                            <Target className="w-48 h-48" />
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="structure" className="m-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    {googleAdsResult.campaigns.map((camp, i) => (
                                        <Card key={i} className="border-indigo-100 shadow-sm overflow-hidden">
                                            <CardHeader className="bg-indigo-50/50 flex flex-row items-center justify-between py-4 border-b border-indigo-50">
                                                <div className="space-y-1">
                                                    <CardTitle className="text-lg text-indigo-900">{camp.name}</CardTitle>
                                                    <CardDescription className="flex items-center gap-2">
                                                        <Badge className="bg-indigo-600 hover:bg-indigo-600">{camp.type.toUpperCase()}</Badge>
                                                        <span>Targeting: {camp.targeting.locations?.join(', ') || 'Global'}</span>
                                                    </CardDescription>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs font-semibold text-muted-foreground uppercase">Monthly Budget</div>
                                                    <div className="text-xl font-bold text-indigo-700">{camp.budget.currency} {camp.budget.monthly}</div>
                                                    <div className="text-[10px] text-muted-foreground italic">Approx. {camp.budget.currency}{camp.budget.daily}/day</div>
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-6">
                                                <h4 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">Ad Group Organization</h4>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {camp.adGroups.map((group, j) => (
                                                        <div key={j} className="p-4 rounded-xl border border-indigo-50 bg-white hover:border-indigo-200 transition-colors">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <h5 className="font-bold text-indigo-900">{group.name}</h5>
                                                                <Badge variant="outline" className="text-[9px] border-indigo-200 text-indigo-600 uppercase">{group.biddingStrategy}</Badge>
                                                            </div>
                                                            <p className="text-xs text-muted-foreground mb-3">{group.theme}</p>
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {group.keywords.map((kw, k) => (
                                                                    <span key={k} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-foreground/70">{kw}</span>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-muted/30">
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Target Locations</div>
                                                        <div className="text-xs font-medium">{camp.targeting.locations?.join(', ') || 'All'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Devices</div>
                                                        <div className="text-xs font-medium">{camp.targeting.devices?.join(', ') || 'All Devices'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Demographics</div>
                                                        <div className="text-xs font-medium">{camp.targeting.demographics?.join(', ') || 'All Ages'}</div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-[10px] font-bold text-muted-foreground uppercase">Schedule</div>
                                                        <div className="text-xs font-medium">{camp.targeting.schedule?.join(', ') || '24/7'}</div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border border-yellow-100 bg-yellow-50/30">
                                            <h5 className="text-xs font-bold text-yellow-800 uppercase mb-2">Bidding Strategy</h5>
                                            <p className="text-xs text-yellow-900/70 leading-relaxed">
                                                We recommend <strong>Maximize Conversions</strong> with a target CPA to balance volume and ROI given your industry competition.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/30">
                                            <h5 className="text-xs font-bold text-blue-800 uppercase mb-2">Network Selection</h5>
                                            <p className="text-xs text-blue-900/70 leading-relaxed">
                                                Include <strong>Search Partners</strong> but disable Display Network for this campaign to ensure high search intent traffic.
                                            </p>
                                        </div>
                                        <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50/30">
                                            <h5 className="text-xs font-bold text-indigo-800 uppercase mb-2">Ad Assets</h5>
                                            <p className="text-xs text-indigo-900/70 leading-relaxed">
                                                Add <strong>Sitelinks, Callouts, and Image assets</strong> to improve your Ad Rank and Quality Score.
                                            </p>
                                        </div>
                                    </div>
                                </TabsContent>

                                <TabsContent value="implementation" className="m-0 space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <h3 className="text-lg font-bold flex items-center gap-2">
                                                <span className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-sm">1</span>
                                                Launch Steps
                                            </h3>
                                            <div className="space-y-3">
                                                {googleAdsResult.implementation.setupSteps.map((step, i) => (
                                                    <div key={i} className="flex gap-4 p-4 rounded-xl border bg-white shadow-sm group hover:border-blue-200 transition-all">
                                                        <div className="text-2xl font-black text-muted-foreground/20 group-hover:text-blue-200 transition-colors uppercase italic">{i + 1}</div>
                                                        <p className="text-sm font-medium pt-1 text-foreground/80">{step}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="space-y-8">
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm">2</span>
                                                    Quality Score Hacks
                                                </h3>
                                                <div className="grid gap-3">
                                                    {googleAdsResult.implementation.qualityScoreTips.map((tip, i) => (
                                                        <div key={i} className="p-3 bg-green-50 text-green-800 text-xs rounded-lg border border-green-100/50 font-medium">
                                                            {tip}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <h3 className="text-lg font-bold flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm">3</span>
                                                    Tracking & Analytics
                                                </h3>
                                                <div className="p-5 rounded-xl border border-indigo-100 bg-white">
                                                    <ul className="space-y-3">
                                                        {googleAdsResult.implementation.trackingSetup.map((item, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                                                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                    <Button className="w-full mt-6 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100 gap-2" variant="outline">
                                                        <ExternalLink className="h-4 w-4" />
                                                        Google Tag Manager Setup
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <Card className="bg-gradient-to-br from-indigo-900 to-indigo-950 border-0 shadow-2xl">
                                        <CardContent className="p-10 flex flex-col md:flex-row items-center gap-10">
                                            <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-white/10 shrink-0">
                                                <TrendingUp className="h-12 w-12 text-blue-400" />
                                            </div>
                                            <div className="space-y-4 flex-1">
                                                <h4 className="text-2xl font-bold text-white">Scale Your Success</h4>
                                                <p className="text-blue-100 text-sm leading-relaxed max-w-2xl">
                                                    Success in Google Ads is about iterative optimization. Use these initial settings to gather data for 14 days, then begin aggressive A/B testing on headlines and landing page consistency.
                                                </p>
                                                <div className="flex flex-wrap gap-4 pt-4">
                                                    {googleAdsResult.implementation.optimizationTips.slice(0, 3).map((tip, i) => (
                                                        <Badge key={i} variant="secondary" className="bg-white/10 text-blue-100 hover:bg-white/20 border-white/5 px-3 py-1 text-[10px] font-medium uppercase tracking-wider">
                                                            {tip}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </div>
                        </Tabs>
                    )}
                </div>
            </div>
        </div>
    );
}
