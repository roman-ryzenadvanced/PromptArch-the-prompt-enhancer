"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import useStore from "@/lib/store";
import { translations } from "@/lib/i18n/translations";
import modelAdapter from "@/lib/services/adapter-instance";
import { Search, Globe, Plus, Trash2, ShieldAlert, BarChart3, TrendingUp, Target, Rocket, Lightbulb, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const MarketResearcher = () => {
    const { language, selectedProvider, selectedModels, apiKeys, setMarketResearchResult, marketResearchResult } = useStore();
    const t = translations[language].marketResearch;
    const common = translations[language].common;

    const [websiteUrl, setWebsiteUrl] = useState("");
    const [additionalUrls, setAdditionalUrls] = useState<string[]>([""]);
    const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", "", ""]);
    const [productMapping, setProductMapping] = useState("");
    const [specialInstructions, setSpecialInstructions] = useState("");

    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [thoughtIndex, setThoughtIndex] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const selectedModel = selectedModels[selectedProvider];

    const handleAddUrl = () => setAdditionalUrls([...additionalUrls, ""]);
    const handleRemoveUrl = (index: number) => {
        const newUrls = [...additionalUrls];
        newUrls.splice(index, 1);
        setAdditionalUrls(newUrls);
    };

    const handleAddCompetitor = () => {
        if (competitorUrls.length < 10) {
            setCompetitorUrls([...competitorUrls, ""]);
        }
    };
    const handleRemoveCompetitor = (index: number) => {
        const newUrls = [...competitorUrls];
        newUrls.splice(index, 1);
        setCompetitorUrls(newUrls);
    };

    const validateUrls = () => {
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!websiteUrl || !urlRegex.test(websiteUrl)) return "Invalid primary website URL";

        const validCompetitors = competitorUrls.filter(url => url.trim().length > 0);
        if (validCompetitors.length < 2) return "At least 2 competitor websites are required";

        for (const url of validCompetitors) {
            if (!urlRegex.test(url)) return `Invalid competitor URL: ${url}`;
        }

        return null;
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isProcessing) {
            setProgress(0);
            setThoughtIndex(0);
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 95) return prev;
                    return prev + (prev < 30 ? 2 : prev < 70 ? 1 : 0.5);
                });
            }, 300);

            const thoughtInterval = setInterval(() => {
                setThoughtIndex(prev => (prev < (t.thoughts?.length || 0) - 1 ? prev + 1 : prev));
            }, 4000);

            return () => {
                clearInterval(interval);
                clearInterval(thoughtInterval);
            };
        } else {
            setProgress(0);
        }
    }, [isProcessing, t.thoughts]);

    const handleStartResearch = async () => {
        const validationError = validateUrls();
        if (validationError) {
            setError(validationError);
            return;
        }

        const apiKey = apiKeys[selectedProvider];
        const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

        if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
            setError(`Please configure your ${selectedProvider.toUpperCase()} API key in Settings`);
            return;
        }

        setIsProcessing(true);
        setError(null);
        setMarketResearchResult(null);

        try {
            const filteredCompetitors = competitorUrls.filter(u => u.trim() !== "");
            const filteredAddUrls = additionalUrls.filter(u => u.trim() !== "");

            const result = await modelAdapter.generateMarketResearch({
                websiteUrl,
                additionalUrls: filteredAddUrls,
                competitors: filteredCompetitors,
                productMapping,
                specialInstructions
            }, selectedProvider, selectedModel);

            if (result.success && result.data) {
                setProgress(100);
                try {
                    const cleanJson = result.data.replace(/```json\s*([\s\S]*?)\s*```/i, '$1').trim();
                    const parsed = JSON.parse(cleanJson);
                    setMarketResearchResult({
                        ...parsed,
                        id: Math.random().toString(36).substr(2, 9),
                        websiteUrl,
                        additionalUrls: filteredAddUrls,
                        competitors: filteredCompetitors,
                        productMapping: [{ productName: productMapping || "Main Product", features: [] }],
                        generatedAt: new Date(),
                        rawContent: result.data
                    });
                } catch (e) {
                    console.error("Failed to parse market research JSON:", e);
                    setError("Failed to parse the AI response. Please try again.");
                }
            } else {
                setError(result.error || "Research failed");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setIsProcessing(false);
        }
    };

    const renderPriceMatrix = () => {
        if (!marketResearchResult?.priceComparisonMatrix) return null;
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b bg-slate-50/50">
                            <th className="px-4 py-3 font-black text-slate-900 uppercase tracking-wider text-[10px]">Product</th>
                            <th className="px-4 py-3 font-black text-indigo-600 uppercase tracking-wider text-[10px]">Your Price</th>
                            {marketResearchResult.competitors.map((comp, i) => (
                                <th key={i} className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-[10px]">{comp}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {marketResearchResult.priceComparisonMatrix.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-4 font-bold text-slate-900">{item.product}</td>
                                <td className="px-4 py-4 font-black text-indigo-600">{item.userPrice}</td>
                                {marketResearchResult.competitors.map((comp) => {
                                    const compPrice = item.competitorPrices.find(cp => cp.competitor === comp || comp.includes(cp.competitor));
                                    return (
                                        <td key={comp} className="px-4 py-4 font-medium text-slate-600">
                                            {compPrice ? compPrice.price : "N/A"}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderFeatureTable = () => {
        if (!marketResearchResult?.featureComparisonTable) return null;
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead>
                        <tr className="border-b bg-slate-50/50">
                            <th className="px-4 py-3 font-black text-slate-900 uppercase tracking-wider text-[10px]">Feature</th>
                            <th className="px-4 py-3 font-black text-indigo-600 uppercase tracking-wider text-[10px]">You</th>
                            {marketResearchResult.competitors.map((comp, i) => (
                                <th key={i} className="px-4 py-3 font-black text-slate-500 uppercase tracking-wider text-[10px]">{comp}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {marketResearchResult.featureComparisonTable.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                <td className="px-4 py-4 font-bold text-slate-900">{item.feature}</td>
                                <td className="px-4 py-4">
                                    {typeof item.userStatus === 'boolean' ? (
                                        item.userStatus ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300" />
                                    ) : <span className="text-xs font-semibold">{item.userStatus}</span>}
                                </td>
                                {marketResearchResult.competitors.map((comp) => {
                                    const compStatus = item.competitorStatus.find(cs => cs.competitor === comp || comp.includes(cs.competitor));
                                    return (
                                        <td key={comp} className="px-4 py-4">
                                            {compStatus ? (
                                                typeof compStatus.status === 'boolean' ? (
                                                    compStatus.status ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <X className="h-4 w-4 text-slate-300" />
                                                ) : <span className="text-xs font-medium text-slate-600">{compStatus.status}</span>
                                            ) : "N/A"}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-200">
                        <Search className="h-6 w-6" />
                    </div>
                    <h2 className="text-3xl font-black tracking-tight text-slate-900">{t.title}</h2>
                </div>
                <p className="text-slate-500 font-medium ml-1.5">{t.description}</p>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                {/* Configuration Panel */}
                <div className="xl:col-span-5 space-y-6">
                    <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="bg-slate-50/50 border-b p-5">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <Globe className="h-4 w-4" /> Company Profile
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-600">{t.websiteUrl}</label>
                                <Input
                                    placeholder={t.websitePlaceholder}
                                    value={websiteUrl}
                                    onChange={(e) => setWebsiteUrl(e.target.value)}
                                    className="bg-slate-50 border-slate-200 focus:bg-white transition-all font-medium"
                                />
                            </div>

                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-600 flex justify-between items-center">
                                    {t.additionalUrls}
                                    <Button variant="ghost" size="sm" onClick={handleAddUrl} className="h-6 px-2 hover:bg-slate-100 text-[10px] font-black uppercase">
                                        <Plus className="h-3 w-3 mr-1" /> Add URL
                                    </Button>
                                </label>
                                <div className="space-y-2">
                                    {additionalUrls.map((url, i) => (
                                        <div key={i} className="flex gap-2 group">
                                            <Input
                                                placeholder="Sub-page URL (e.g., pricing, features)"
                                                value={url}
                                                onChange={(e) => {
                                                    const newUrls = [...additionalUrls];
                                                    newUrls[i] = e.target.value;
                                                    setAdditionalUrls(newUrls);
                                                }}
                                                className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-xs"
                                            />
                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveUrl(i)} className="h-9 w-9 shrink-0 text-slate-400 hover:text-rose-500">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden bg-white/80 backdrop-blur-md">
                        <CardHeader className="bg-slate-50/50 border-b p-5">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" /> Competitive Intel
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="space-y-3">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-600 flex justify-between items-center">
                                    {t.competitors}
                                    <Button variant="ghost" size="sm" onClick={handleAddCompetitor} disabled={competitorUrls.length >= 10} className="h-6 px-2 hover:bg-slate-100 text-[10px] font-black uppercase">
                                        <Plus className="h-3 w-3 mr-1" /> Add Competitor
                                    </Button>
                                </label>
                                <div className="space-y-2">
                                    {competitorUrls.map((url, i) => (
                                        <div key={i} className="flex gap-2">
                                            <Input
                                                placeholder={t.competitorPlaceholder}
                                                value={url}
                                                onChange={(e) => {
                                                    const newUrls = [...competitorUrls];
                                                    newUrls[i] = e.target.value;
                                                    setCompetitorUrls(newUrls);
                                                }}
                                                className="bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-xs"
                                            />
                                            {competitorUrls.length > 2 && (
                                                <Button variant="ghost" size="icon" onClick={() => handleRemoveCompetitor(i)} className="h-9 w-9 shrink-0 text-slate-400 hover:text-rose-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-600">{t.productMapping}</label>
                                <Textarea
                                    placeholder={t.mappingPlaceholder}
                                    value={productMapping}
                                    onChange={(e) => setProductMapping(e.target.value)}
                                    className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm"
                                />
                                <p className="text-[10px] text-slate-400 font-medium italic">Describe which products/features to compare across all sites.</p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-slate-600">Research Parameters</label>
                                <Textarea
                                    placeholder="Any specific depth or focus? (e.g., 'Focus on enterprise features', 'Analyze pricing tiers')"
                                    value={specialInstructions}
                                    onChange={(e) => setSpecialInstructions(e.target.value)}
                                    className="min-h-[80px] bg-slate-50/50 border-slate-200 focus:bg-white transition-all text-sm"
                                />
                            </div>

                            {isProcessing && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-indigo-600 flex items-center gap-1.5">
                                                <Loader2 className="h-3 w-3 animate-spin" /> {language === "ru" ? "Идет анализ" : language === "he" ? "מנתח..." : "Analysis in progress"}
                                            </span>
                                            <span className="text-slate-400">{Math.round(progress)}%</span>
                                        </div>
                                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50">
                                            <div
                                                className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 transition-all duration-300 ease-out"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-xl bg-slate-900 text-white shadow-lg relative overflow-hidden group">
                                        <div className="absolute top-0 right-0 p-2 opacity-20">
                                            <Rocket className="h-4 w-4 text-indigo-400 group-hover:block hidden" />
                                        </div>
                                        <h4 className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 mb-2 flex items-center gap-1.5">
                                            <span className="h-1 w-1 bg-indigo-400 rounded-full animate-pulse" /> AI Thoughts & Actions
                                        </h4>
                                        <p className="text-xs font-bold leading-relaxed italic animate-in fade-in slide-in-from-left-2 duration-700">
                                            "{t.thoughts?.[thoughtIndex] || t.researching}"
                                        </p>
                                    </div>
                                </div>
                            )}

                            {error && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
                                    <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
                                    <p className="text-xs font-bold text-rose-600">{error}</p>
                                </div>
                            )}

                            <Button
                                onClick={handleStartResearch}
                                disabled={isProcessing}
                                className="w-full h-12 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all active:scale-95 disabled:opacity-70"
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        {t.researching}
                                    </>
                                ) : (
                                    <>
                                        <Search className="mr-2 h-5 w-5" />
                                        {t.generate}
                                    </>
                                )}
                            </Button>
                        </CardContent>
                    </Card>
                </div>

                {/* Results Panel */}
                <div className="xl:col-span-7">
                    {marketResearchResult ? (
                        <Card className="border-slate-200/60 shadow-2xl shadow-slate-200/50 overflow-hidden bg-white group min-h-[600px]">
                            <CardHeader className="bg-slate-900 text-white p-6 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-32 -mt-32" />
                                <div className="relative z-10 flex justify-between items-start">
                                    <div>
                                        <Badge variant="outline" className="mb-2 border-indigo-400/50 text-indigo-300 font-black uppercase tracking-widest text-[10px]">Market Intel Report</Badge>
                                        <CardTitle className="text-2xl font-black tracking-tight">{marketResearchResult.websiteUrl}</CardTitle>
                                        <CardDescription className="text-indigo-200 font-medium">Generated on {marketResearchResult.generatedAt.toLocaleDateString()}</CardDescription>
                                    </div>
                                    <div className="p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20">
                                        <BarChart3 className="h-6 w-6 text-indigo-300" />
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Tabs defaultValue="summary" className="w-full">
                                    <TabsList className="w-full h-14 bg-slate-50 border-b rounded-none px-6 justify-start gap-4">
                                        <TabsTrigger value="summary" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-full font-black uppercase tracking-widest text-[10px] px-0">Summary</TabsTrigger>
                                        <TabsTrigger value="pricing" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-full font-black uppercase tracking-widest text-[10px] px-0">Price Matrix</TabsTrigger>
                                        <TabsTrigger value="features" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-full font-black uppercase tracking-widest text-[10px] px-0">Feature Table</TabsTrigger>
                                        <TabsTrigger value="positioning" className="data-[state=active]:bg-transparent data-[state=active]:text-indigo-600 data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none h-full font-black uppercase tracking-widest text-[10px] px-0">Positioning</TabsTrigger>
                                    </TabsList>

                                    <div className="p-6">
                                        <TabsContent value="summary" className="m-0 focus-visible:ring-0">
                                            <div className="space-y-6">
                                                <div className="p-5 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                    <h3 className="text-sm font-black text-indigo-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                                        <TrendingUp className="h-4 w-4" /> Executive Summary
                                                    </h3>
                                                    <p className="text-sm text-indigo-900/80 leading-relaxed font-medium">
                                                        {marketResearchResult.executiveSummary}
                                                    </p>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div className="p-5 rounded-2xl border bg-emerald-50/30 border-emerald-100">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-3 flex items-center gap-2">
                                                            <CheckCircle2 className="h-4 w-4" /> Strategic Advantages
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {marketResearchResult.competitiveAnalysis.advantages.map((adv, i) => (
                                                                <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">
                                                                    <span className="text-emerald-500">•</span> {adv}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    <div className="p-5 rounded-2xl border bg-rose-50/30 border-rose-100">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-3 flex items-center gap-2">
                                                            <AlertCircle className="h-4 w-4" /> Identified Gaps
                                                        </h4>
                                                        <ul className="space-y-2">
                                                            {marketResearchResult.competitiveAnalysis.disadvantages.map((dis, i) => (
                                                                <li key={i} className="text-xs font-bold text-slate-700 flex gap-2">
                                                                    <span className="text-rose-500">•</span> {dis}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="p-5 rounded-2xl border bg-amber-50/30 border-amber-100">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                                                        <Lightbulb className="h-4 w-4" /> Key Recommendations
                                                    </h4>
                                                    <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                        {marketResearchResult.recommendations.map((rec, i) => (
                                                            <li key={i} className="text-xs font-bold text-slate-700 p-3 bg-white border border-amber-100 rounded-xl shadow-sm flex items-center gap-3">
                                                                <span className="h-6 w-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-[10px] shrink-0">{i + 1}</span>
                                                                {rec}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="pricing" className="m-0 focus-visible:ring-0">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Price Comparison Matrix</h3>
                                                    <Badge className="bg-slate-900 text-[10px] font-black uppercase">Live Market Data</Badge>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                                    {renderPriceMatrix()}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="features" className="m-0 focus-visible:ring-0">
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Feature Benchmarking</h3>
                                                    <Badge className="bg-indigo-600 text-[10px] font-black uppercase">Functional Audit</Badge>
                                                </div>
                                                <div className="rounded-xl border border-slate-200 overflow-hidden">
                                                    {renderFeatureTable()}
                                                </div>
                                            </div>
                                        </TabsContent>

                                        <TabsContent value="positioning" className="m-0 focus-visible:ring-0">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-4">
                                                    <div className="p-5 rounded-2xl bg-slate-900 text-white shadow-xl">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3 flex items-center gap-2">
                                                            <Target className="h-4 w-4" /> Market Landscape
                                                        </h4>
                                                        <p className="text-xs font-medium leading-relaxed opacity-90">
                                                            {marketResearchResult.marketPositioning.landscape}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="p-5 rounded-2xl bg-indigo-600 text-white shadow-xl">
                                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-200 mb-3 flex items-center gap-2">
                                                            <Rocket className="h-4 w-4" /> Segmentation Strategy
                                                        </h4>
                                                        <p className="text-xs font-medium leading-relaxed font-bold">
                                                            {marketResearchResult.marketPositioning.segmentation}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="md:col-span-2 p-5 rounded-2xl border bg-slate-50 italic">
                                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Research Methodology</h4>
                                                    <p className="text-[10px] font-medium text-slate-400">
                                                        {marketResearchResult.methodology}
                                                    </p>
                                                </div>
                                            </div>
                                        </TabsContent>
                                    </div>
                                </Tabs>
                            </CardContent>
                        </Card>
                    ) : (
                        <Card className="border-dashed border-2 border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center p-12 min-h-[600px] text-center group">
                            <div className="h-20 w-20 rounded-3xl bg-white border border-slate-100 flex items-center justify-center mb-6 shadow-sm group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                                <BarChart3 className="h-10 w-10 text-slate-300 group-hover:text-indigo-500 transition-colors" />
                            </div>
                            <h3 className="text-xl font-black text-slate-400 tracking-tight group-hover:text-slate-600 transition-colors">Awaiting Analysis Parameters</h3>
                            <p className="text-sm text-slate-400 font-medium max-w-[280px] mt-2 group-hover:text-slate-500 transition-colors">
                                {t.emptyState}
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MarketResearcher;
