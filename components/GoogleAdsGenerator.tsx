"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Megaphone, Copy, Loader2, CheckCircle2, Settings, Plus, X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleAdsResult } from "@/types";

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
    const [duration, setDuration] = useState("30 days");
    const [industry, setIndustry] = useState("");

    const [copied, setCopied] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(["keywords"]);

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

    const handleCopy = async () => {
        if (googleAdsResult?.rawContent) {
            await navigator.clipboard.writeText(googleAdsResult.rawContent);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const sections = [
        { id: "keywords", title: "Keywords Research" },
        { id: "adcopies", title: "Ad Copy Variations" },
        { id: "campaigns", title: "Campaign Structure" },
        { id: "implementation", title: "Implementation Guide" },
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
    };

    return (
        <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="h-fit">
                <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
                        <Megaphone className="h-4 w-4 lg:h-5 lg:w-5" />
                        Google Ads Generator
                    </CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                        Generate keywords, ad copy, and campaign structure for Google Ads
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 lg:space-y-4 p-4 lg:p-6 pt-0 lg:pt-0">
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

                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">Website URL</label>
                        <Input
                            placeholder="e.g., www.your-business.com"
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">Products / Services</label>
                        <div className="space-y-2">
                            {products.map((product, index) => (
                                <div key={index} className="flex gap-2">
                                    <Input
                                        placeholder={`Product ${index + 1}`}
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
                                Add Product
                            </Button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                            <label className="text-xs lg:text-sm font-medium">Budget (USD/mo)</label>
                            <div className="flex items-center gap-1.5">
                                <Input
                                    type="number"
                                    placeholder="Min"
                                    value={budgetMin}
                                    onChange={(e) => setBudgetMin(e.target.value)}
                                    className="text-sm"
                                />
                                <span className="text-muted-foreground text-xs">-</span>
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
                            <label className="text-xs lg:text-sm font-medium">Industry</label>
                            <Input
                                placeholder="e.g., SaaS"
                                value={industry}
                                onChange={(e) => setIndustry(e.target.value)}
                                className="text-sm"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">Target Audience</label>
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
                                    <span className="text-[10px] lg:text-xs">Configure API key in Settings</span>
                                </div>
                            )}
                        </div>
                    )}

                    <Button onClick={handleGenerate} disabled={isProcessing || !websiteUrl.trim()} className="w-full h-9 lg:h-10 text-xs lg:text-sm">
                        {isProcessing ? (
                            <>
                                <Loader2 className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" />
                                Generating Ads...
                            </>
                        ) : (
                            <>
                                <Megaphone className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                Generate Google Ads
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Card className={cn(!googleAdsResult && "opacity-50")}>
                <CardHeader className="p-4 lg:p-6">
                    <CardTitle className="flex items-center justify-between text-base lg:text-lg">
                        <span className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
                            Generated Campaign
                        </span>
                        {googleAdsResult && (
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
                        Keywords, ad copy, and campaign structure ready for Google Ads
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
                    {googleAdsResult ? (
                        <div className="space-y-2 lg:space-y-3">
                            {sections.map((section) => (
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
                                        <div className="border-t bg-background px-3 lg:px-4 py-2.5 lg:py-3">
                                            {renderSectionContent(section.id)}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex h-[200px] lg:h-[300px] items-center justify-center text-center text-xs lg:text-sm text-muted-foreground">
                            Generated campaign will appear here
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
