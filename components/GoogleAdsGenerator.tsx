"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Megaphone, Copy, Loader2, CheckCircle2, Settings, Plus, X, ChevronDown, ChevronUp, Wand2, Target, TrendingUp, ShieldAlert, BarChart3, Users, Rocket, Download, FileSpreadsheet } from "lucide-react";
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
    const [products, setProducts] = useState<{ name: string; url: string }[]>([{ name: "", url: "" }]);
    const [targetAudience, setTargetAudience] = useState("");
    const [budgetMin, setBudgetMin] = useState("500");
    const [budgetMax, setBudgetMax] = useState("2000");
    const [duration, setDuration] = useState("30 days");
    const [industry, setIndustry] = useState("");
    const [specialInstructions, setSpecialInstructions] = useState("");

    const [copied, setCopied] = useState(false);
    const [expandedSections, setExpandedSections] = useState<string[]>(["keywords"]);

    const [isMagicThinking, setIsMagicThinking] = useState(false);
    const [progressMessage, setProgressMessage] = useState("");
    const [progressIndex, setProgressIndex] = useState(0);

    const selectedModel = selectedModels[selectedProvider];
    const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

    // Fun progress messages
    const progressMessages = t.progressMessages;

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

    // Cycle through progress messages while generating
    useEffect(() => {
        if (isProcessing || isMagicThinking) {
            setProgressMessage(progressMessages[0]);
            setProgressIndex(0);

            const interval = setInterval(() => {
                setProgressIndex(prev => {
                    const nextIndex = (prev + 1) % progressMessages.length;
                    setProgressMessage(progressMessages[nextIndex]);
                    return nextIndex;
                });
            }, 2500);

            return () => clearInterval(interval);
        } else {
            setProgressMessage("");
            setProgressIndex(0);
        }
    }, [isProcessing, isMagicThinking, language]);

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

    const addProduct = () => setProducts([...products, { name: "", url: "" }]);
    const removeProduct = (index: number) => {
        const newProducts = products.filter((_, i) => i !== index);
        setProducts(newProducts.length ? newProducts : [{ name: "", url: "" }]);
    };
    const updateProduct = (index: number, field: "name" | "url", value: string) => {
        const newProducts = [...products];
        newProducts[index] = { ...newProducts[index], [field]: value };
        setProducts(newProducts);
    };

    const handleGenerate = async () => {
        if (!websiteUrl.trim()) {
            setError(t.errorWebsite);
            return;
        }
        const filteredProducts = products.filter(p => p.name.trim() !== "");
        if (filteredProducts.length === 0) {
            setError(t.errorProducts);
            return;
        }

        const apiKey = apiKeys[selectedProvider];
        const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

        if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
            setError(`${common.error}: ${common.configApiKey}`);
            return;
        }

        setProcessing(true);
        setError(null);
        setMagicWandResult(null);

        console.log("[GoogleAdsGenerator] Starting generation...", { selectedProvider, selectedModel });

        try {
            // Convert products to strings with optional URLs for AI context
            const productStrings = filteredProducts.map(p =>
                p.url ? `${p.name} (URL: ${p.url})` : p.name
            );

            const result = await modelAdapter.generateGoogleAds(websiteUrl, {
                productsServices: productStrings,
                targetAudience,
                budgetRange: { min: parseInt(budgetMin), max: parseInt(budgetMax), currency: "USD" },
                campaignDuration: duration,
                industry,
                competitors: [],
                language: language === "ru" ? "Russian" : language === "he" ? "Hebrew" : "English",
                specialInstructions: specialInstructions,
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
                    setError(t.errorParse || "Failed to parse the generated ads content. Please try again.");
                }
            } else {
                console.error("[GoogleAdsGenerator] Generation failed:", result.error);
                setError(result.error || t.errorGenerate);
            }
        } catch (err) {
            console.error("[GoogleAdsGenerator] Generation error:", err);
            setError(err instanceof Error ? err.message : t.errorGenerate);
        } finally {
            setProcessing(false);
        }
    };

    const handleMagicWand = async () => {
        if (!websiteUrl.trim()) {
            setError(t.errorWebsite);
            return;
        }
        const firstProduct = products.find(p => p.name.trim() !== "");
        if (!firstProduct) {
            setError(t.errorProducts);
            return;
        }

        const apiKey = apiKeys[selectedProvider];
        const isQwenOAuth = selectedProvider === "qwen" && modelAdapter.hasQwenAuth();

        if (!isQwenOAuth && (!apiKey || !apiKey.trim())) {
            setError(`${common.error}: ${common.configApiKey}`);
            return;
        }

        setIsMagicThinking(true);
        setError(null);
        setGoogleAdsResult(null);

        try {
            // Pass product with URL for enhanced AI research
            const productString = firstProduct.url
                ? `${firstProduct.name} (Product URL for research: ${firstProduct.url})`
                : firstProduct.name;

            const result = await modelAdapter.generateMagicWand(
                websiteUrl,
                firstProduct.url ? `${firstProduct.name} (URL: ${firstProduct.url})` : firstProduct.name,
                Number(budgetMax),
                specialInstructions,
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
                setError(result.error || t.errorMagicWand);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : t.errorMagicWandGeneral);
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

    const exportCSV = () => {
        if (!googleAdsResult && !magicWandResult) return;

        let rows: string[][] = [];

        if (googleAdsResult) {
            // Keywords
            rows.push(["KEYWORDS RESEARCH"]);
            rows.push(["Type", "Keyword", "CPC"]);
            const addKw = (type: string, list?: any[]) => {
                if (list) list.forEach(k => rows.push([type, k.keyword, k.cpc || 'N/A']));
            };
            addKw("Primary", googleAdsResult.keywords?.primary);
            addKw("Long-tail", googleAdsResult.keywords?.longTail);
            addKw("Negative", googleAdsResult.keywords?.negative);
            rows.push([]);

            // Ad Copies
            rows.push(["AD COPIES"]);
            rows.push(["Headlines", "Descriptions", "CTA"]);
            googleAdsResult.adCopies?.forEach(ad => {
                rows.push([
                    ad.headlines?.join(' | ') || '',
                    ad.descriptions?.join(' | ') || '',
                    ad.callToAction || ''
                ]);
            });
            rows.push([]);

            // Campaigns
            rows.push(["CAMPAIGN STRUCTURE"]);
            rows.push(["Name", "Type", "Budget", "Locations", "Schedule"]);
            googleAdsResult.campaigns?.forEach(c => {
                rows.push([
                    c.name,
                    c.type,
                    `${c.budget?.daily || 0} ${c.budget?.currency}`,
                    c.targeting?.locations?.join('; ') || 'All',
                    c.targeting?.schedule?.join('; ') || 'All'
                ]);
            });
            rows.push([]);

            // Implementation
            rows.push(["IMPLEMENTATION GUIDE"]);
            const impl = googleAdsResult.implementation;
            if (impl) {
                rows.push(["Setup Steps", impl.setupSteps?.join('; ') || '']);
                rows.push(["Quality Score Tips", impl.qualityScoreTips?.join('; ') || '']);
                rows.push(["Optimization Tips", impl.optimizationTips?.join('; ') || '']);
            }
            rows.push([]);

            // Predictions
            if (googleAdsResult.predictions) {
                rows.push(["PERFORMANCE PREDICTIONS"]);
                const p = googleAdsResult.predictions;
                rows.push(["Metric", "Estimate"]);
                rows.push(["Clicks", p.estimatedClicks || "N/A"]);
                rows.push(["Impressions", p.estimatedImpressions || "N/A"]);
                rows.push(["CTR", p.estimatedCtr || "N/A"]);
                rows.push(["Conversions", p.estimatedConversions || "N/A"]);
                rows.push([]);
            }
        }

        if (magicWandResult) {
            rows.push(["MARKET ANALYSIS"]);
            const ma = magicWandResult.marketAnalysis;
            rows.push(["Growth Rate", ma?.growthRate || 'N/A']);
            rows.push(["Top Competitors", ma?.topCompetitors?.join('; ') || 'N/A']);
            rows.push(["Market Trends", ma?.marketTrends?.join('; ') || 'N/A']);
        }

        // CSV String Construction with proper escaping
        const csvContent = "data:text/csv;charset=utf-8," +
            rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `google-ads-report-${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportHTML = () => {
        if (!googleAdsResult && !magicWandResult) return;

        let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Google Ads Strategy Report</title>
    <style>
        :root { --bg: #0f172a; --card: #1e293b; --text: #e2e8f0; --accent: #6366f1; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); line-height: 1.6; padding: 40px; }
        .container { max-width: 1000px; margin: 0 auto; }
        h1 { font-size: 2.5rem; background: linear-gradient(to right, #818cf8, #c084fc); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem; }
        .section { background: var(--card); border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid rgba(255,255,255,0.1); }
        h2 { font-size: 1.25rem; color: #818cf8; margin-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; }
        h3 { font-size: 1rem; color: #94a3b8; margin: 1rem 0 0.5rem; text-transform: uppercase; letter-spacing: 0.05em; }
        .tag { display: inline-block; background: rgba(99,102,241,0.2); border: 1px solid rgba(99,102,241,0.3); color: #c3dafe; padding: 4px 12px; border-radius: 99px; font-size: 0.85rem; margin: 0 6px 6px 0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
        .card { background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); }
        .stat { font-size: 1.5rem; font-weight: 700; color: #4ade80; }
        ul { padding-left: 20px; color: #cbd5e1; }
        li { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.1); }
        th { color: #94a3b8; font-size: 0.85rem; text-transform: uppercase; }
        .footer { text-align: center; color: #64748b; margin-top: 4rem; font-size: 0.85rem; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Google Ads Strategy Report</h1>
        <p style="color:#94a3b8; margin-bottom: 2rem">Generated by PromptArch on ${new Date().toLocaleDateString()}</p>`;

        if (googleAdsResult) {
            // Keywords
            html += `<div class="section"><h2>🎯 Keyword Research</h2>`;
            const renderKw = (title: string, list?: any[]) => {
                if (!list?.length) return '';
                return `<h3>${title}</h3><div style="margin-bottom:1rem">
                    ${list.map(k => `<span class="tag">${k.keyword} <span style="opacity:0.6; font-size:0.8em">(${k.cpc || 'N/A'})</span></span>`).join('')}
                </div>`;
            };
            html += renderKw("Primary Keywords", googleAdsResult.keywords?.primary);
            html += renderKw("Long-tail Opportunities", googleAdsResult.keywords?.longTail);
            html += renderKw("Negative Keywords", googleAdsResult.keywords?.negative);
            html += `</div>`;

            // Ad Copies
            if (googleAdsResult.adCopies?.length) {
                html += `<div class="section"><h2>✍️ Ad Copy Variations</h2><div class="grid">`;
                googleAdsResult.adCopies.forEach((ad, i) => {
                    html += `<div class="card">
                        <div style="color:#818cf8; font-size:0.8rem; margin-bottom:0.5rem">Variation ${i + 1}</div>
                        ${ad.headlines.map(h => `<div style="font-weight:600; color:#f1f5f9">${h}</div>`).join('')}
                        <div style="margin: 12px 0; color:#cbd5e1; font-size:0.9rem">${ad.descriptions.join('<br>')}</div>
                        ${ad.callToAction ? `<div style="display:inline-block; background:#4f46e5; color:white; font-size:0.8rem; padding:4px 12px; border-radius:4px">${ad.callToAction}</div>` : ''}
                    </div>`;
                });
                html += `</div></div>`;
            }

            // Campaigns
            if (googleAdsResult.campaigns?.length) {
                html += `<div class="section"><h2>🏗️ Campaign Structure</h2>
                    <div class="grid">
                        ${googleAdsResult.campaigns.map(c => `
                            <div class="card">
                                <h3 style="color:#f8fafc; margin-top:0">${c.name}</h3>
                                <p style="font-size:0.9rem; color:#94a3b8">${c.type.toUpperCase()} • ${c.budget.daily} ${c.budget.currency}/day</p>
                                <div style="margin-top:1rem; font-size:0.9rem">
                                    <strong>Locations:</strong> ${c.targeting.locations?.join(', ') || 'Global'}<br>
                                    <strong>Ad Groups:</strong> ${c.adGroups.length}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>`;
            }

            // Implementation & Predictions
            html += `<div class="section"><h2>🚀 Implementation & Forecast</h2>
                <div class="grid">
                    <div>
                        <h3>Setup Steps</h3>
                        <ul>${googleAdsResult.implementation.setupSteps.map(s => `<li>${s}</li>`).join('')}</ul>
                    </div>
                    ${googleAdsResult.predictions ? `
                    <div class="card" style="background:rgba(16,185,129,0.1)">
                        <h3 style="color:#34d399; margin-top:0">Monthly Estimations</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px">
                            <div><div class="stat">${googleAdsResult.predictions.estimatedClicks || '-'}</div><div style="font-size:0.8rem; opacity:0.7">Clicks</div></div>
                            <div><div class="stat">${googleAdsResult.predictions.estimatedCtr || '-'}</div><div style="font-size:0.8rem; opacity:0.7">CTR</div></div>
                            <div><div class="stat">${googleAdsResult.predictions.estimatedConversions || '-'}</div><div style="font-size:0.8rem; opacity:0.7">Convs</div></div>
                        </div>
                    </div>` : ''}
                </div>
            </div>`;
        }

        if (magicWandResult) {
            html += `<div class="section"><h2>🧠 Market Intelligence</h2>
                <div class="grid">
                    <div class="card">
                        <h3>Strategy Rationale</h3>
                        <p style="font-size:0.9rem; color:#cbd5e1">${magicWandResult.rationale}</p>
                    </div>
                    <div>
                        <h3>Market Data</h3>
                        <p><strong>Growth Rate:</strong> ${magicWandResult.marketAnalysis?.growthRate || 'N/A'}</p>
                        <h3>Top Competitors</h3>
                        <ul>${magicWandResult.marketAnalysis?.topCompetitors?.map(c => `<li>${c}</li>`).join('') || '<li>None identified</li>'}</ul>
                    </div>
                </div>
            </div>`;
        }

        html += `<div class="footer">PromptArch • AI-Powered Marketing Tools</div></div></body></html>`;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `google-ads-report-${new Date().toISOString().split('T')[0]}.html`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const sections = [
        { id: "keywords", title: t.keywordsResearch },
        { id: "adcopies", title: t.adCopyVariations },
        { id: "campaigns", title: t.campaignStructure },
        { id: "implementation", title: t.implementationGuide },
    ];

    const renderSectionContent = (sectionId: string) => {
        if (!googleAdsResult) return null;

        switch (sectionId) {
            case "keywords":
                return (
                    <div className="space-y-6 p-1">
                        {googleAdsResult.keywords?.primary?.length > 0 && (
                            <div className="p-4 rounded-xl bg-indigo-50/30 border border-indigo-100/50 shadow-sm">
                                <h4 className="text-[10px] font-black tracking-widest text-indigo-600 uppercase mb-3 flex items-center gap-2">
                                    <Target className="h-3 w-3" /> {t.labels.primaryKeywords}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {googleAdsResult.keywords.primary.map((k, i) => (
                                        <div key={i} className="group flex items-center gap-2 bg-white border border-indigo-100 px-3 py-1.5 rounded-lg shadow-sm hover:border-indigo-500 transition-all cursor-default">
                                            <span className="text-xs font-black text-slate-800">{k.keyword}</span>
                                            {k.cpc && (
                                                <span className="text-[10px] font-bold bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded leading-none">
                                                    {k.cpc}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {googleAdsResult.keywords?.longTail?.length > 0 && (
                            <div className="p-4 rounded-xl bg-emerald-50/30 border border-emerald-100/50 shadow-sm">
                                <h4 className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-3 flex items-center gap-2">
                                    <TrendingUp className="h-3 w-3" /> {t.labels.longTail}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {googleAdsResult.keywords.longTail.map((k, i) => (
                                        <span key={i} className="text-xs font-bold bg-white border border-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg shadow-sm">
                                            {k.keyword}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                        {googleAdsResult.keywords?.negative?.length > 0 && (
                            <div className="p-4 rounded-xl bg-rose-50/30 border border-rose-100/50 shadow-sm">
                                <h4 className="text-[10px] font-black tracking-widest text-rose-600 uppercase mb-3 flex items-center gap-2">
                                    <ShieldAlert className="h-3 w-3" /> {t.labels.negative}
                                </h4>
                                <div className="flex flex-wrap gap-1.5">
                                    {googleAdsResult.keywords.negative.map((k, i) => (
                                        <span key={i} className="text-[10px] font-bold bg-white/50 text-rose-400 border border-rose-100 px-2 py-1 rounded-md line-through opacity-70">
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
                    <div className="space-y-6">
                        {googleAdsResult.adCopies?.map((ad, i) => (
                            <div key={i} className="relative group p-5 rounded-2xl border bg-white shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden">
                                <div className="absolute top-0 left-0 h-full w-1.5 bg-indigo-500 rounded-l-2xl" />
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-[10px] font-black uppercase tracking-tighter text-indigo-500">{t.labels.preview} • {t.labels.variation} {i + 1}</div>
                                    <div className="flex gap-1">
                                        <span className="h-2 w-2 rounded-full bg-slate-100 shadow-inner" />
                                        <span className="h-2 w-2 rounded-full bg-slate-100 shadow-inner" />
                                        <span className="h-2 w-2 rounded-full bg-slate-100 shadow-inner" />
                                    </div>
                                </div>
                                <div className="space-y-1.5 mb-4 border-b border-slate-50 pb-4">
                                    {ad.headlines?.map((h, j) => (
                                        <div key={j} className="text-base font-black text-indigo-600 hover:underline cursor-pointer tracking-tight underline-offset-2 leading-tight">
                                            {h}
                                        </div>
                                    ))}
                                </div>
                                <div className="space-y-2">
                                    {ad.descriptions?.map((d, j) => (
                                        <p key={j} className="text-xs font-medium text-slate-500 leading-relaxed italic border-l-2 border-indigo-100 pl-3">
                                            "{d}"
                                        </p>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            case "campaigns":
                return (
                    <div className="space-y-4">
                        {googleAdsResult.campaigns?.map((camp, i) => (
                            <div key={i} className="relative p-6 rounded-2xl border bg-slate-900 text-white shadow-xl group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                                    <Rocket className="h-24 w-24" />
                                </div>
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">{camp.type} {t.labels.strategy}</div>
                                        <h4 className="text-lg font-black tracking-tight">{camp.name}</h4>
                                    </div>
                                    {camp.budget && (
                                        <div className="text-right p-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/10">
                                            <div className="text-base lg:text-lg font-black text-indigo-400">${camp.budget.monthly}</div>
                                            <div className="text-[9px] font-black text-white/40 uppercase tracking-tighter">{t.adGuide.budgetMonth}</div>
                                        </div>
                                    )}
                                </div>
                                {camp.adGroups?.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-[10px] uppercase font-black text-white/30 tracking-widest flex items-center gap-2">
                                            <div className="h-px flex-1 bg-white/10" /> {t.adGuide.targetGroups} <div className="h-px flex-1 bg-white/10" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            {camp.adGroups.map((g, j) => (
                                                <div key={j} className="text-[10px] font-bold bg-white/5 border border-white/10 px-3 py-2 rounded-lg text-white group-hover:bg-white/10 transition-all">
                                                    {g.name}
                                                </div>
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
                    <div className="space-y-4">
                        {googleAdsResult.implementation?.setupSteps?.length > 0 && (
                            <div className="p-5 rounded-2xl border bg-indigo-50/20">
                                <h4 className="text-[10px] font-black tracking-widest text-indigo-600 uppercase mb-4 flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-[10px]">1</div>
                                    {t.labels.config}
                                </h4>
                                <ol className="space-y-3">
                                    {googleAdsResult.implementation.setupSteps.map((step, i) => (
                                        <li key={i} className="flex gap-4 items-start group">
                                            <span className="text-xs font-black text-indigo-300 pt-0.5 group-hover:text-indigo-500 transition-colors">
                                                {String(i + 1).padStart(2, '0')}
                                            </span>
                                            <p className="text-xs font-bold text-slate-700 leading-relaxed">{step}</p>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                        {googleAdsResult.implementation?.qualityScoreTips?.length > 0 && (
                            <div className="p-5 rounded-2xl border bg-emerald-50/20">
                                <h4 className="text-[10px] font-black tracking-widest text-emerald-600 uppercase mb-4 flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-black text-[10px]">2</div>
                                    {t.labels.quality}
                                </h4>
                                <ul className="space-y-3">
                                    {googleAdsResult.implementation.qualityScoreTips.map((tip, i) => (
                                        <li key={i} className="flex items-start gap-4 p-3 bg-white rounded-xl shadow-sm border border-emerald-100 hover:shadow-md transition-shadow">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                            <p className="text-xs font-bold text-slate-700">{tip}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                );
            default:
                return <pre className="whitespace-pre-wrap text-sm font-mono p-4 bg-slate-950 text-indigo-400 rounded-xl border border-indigo-500/30 overflow-x-auto shadow-2xl">{googleAdsResult.rawContent}</pre>;
        }
    };

    const renderMagicWandSectionContent = (sectionId: string) => {
        if (!magicWandResult) return null;

        switch (sectionId) {
            case "market":
                return (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="group relative p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 border border-indigo-100/50 hover:border-indigo-500/30 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <BarChart3 className="h-12 w-12" />
                                </div>
                                <div className="text-[10px] uppercase font-black text-indigo-600/70 mb-1.5 flex items-center gap-1.5 tracking-wider">
                                    <BarChart3 className="h-3 w-3" /> {t.metrics.industrySize}
                                </div>
                                <div className="text-base lg:text-lg font-black text-slate-800 tracking-tight leading-none">{magicWandResult.marketAnalysis.industrySize}</div>
                            </div>
                            <div className="group relative p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-teal-500/5 border border-emerald-100/50 hover:border-emerald-500/30 transition-all overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <TrendingUp className="h-12 w-12" />
                                </div>
                                <div className="text-[10px] uppercase font-black text-emerald-600/70 mb-1.5 flex items-center gap-1.5 tracking-wider">
                                    <TrendingUp className="h-3 w-3" /> {t.metrics.growthRate}
                                </div>
                                <div className="text-base lg:text-lg font-black text-slate-800 tracking-tight leading-none">{magicWandResult.marketAnalysis.growthRate}</div>
                            </div>
                        </div>
                        <div className="space-y-5">
                            <div className="p-4 rounded-xl border bg-slate-50/30">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Users className="h-4 w-4 text-indigo-500" /> {t.metrics.marketLeaders}
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {magicWandResult.marketAnalysis.topCompetitors.map((c, i) => (
                                        <span key={i} className="text-xs font-bold px-3 py-1.5 bg-white text-slate-700 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-default">
                                            {c}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl border bg-slate-50/30">
                                <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Rocket className="h-4 w-4 text-purple-500" /> {t.metrics.emergingTrends}
                                </h4>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    {magicWandResult.marketAnalysis.marketTrends.map((t, i) => (
                                        <li key={i} className="text-xs font-medium text-slate-600 flex items-start gap-3 p-2 bg-white/50 rounded-lg border border-slate-100">
                                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-[10px] font-bold text-indigo-500">
                                                {i + 1}
                                            </span>
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
                    <div className="space-y-6">
                        {magicWandResult.competitorInsights.map((comp, i) => (
                            <div key={i} className="group relative p-5 rounded-2xl border bg-white/40 backdrop-blur-sm shadow-sm hover:shadow-xl transition-all duration-300">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-sm">
                                            {comp.competitor.charAt(0)}
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 tracking-tight leading-none">{comp.competitor}</h4>
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{t.metrics.competitorIntel}</span>
                                        </div>
                                    </div>
                                    <ShieldAlert className="h-5 w-5 text-amber-500 group-hover:rotate-12 transition-transform" />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-1.5 mb-2">
                                            <span className="h-1 w-4 bg-emerald-500 rounded-full" /> {t.metrics.strengths}
                                        </div>
                                        <ul className="space-y-2">
                                            {comp.strengths.map((s, j) => (
                                                <li key={j} className="text-xs font-semibold text-slate-600 flex gap-2.5 items-start">
                                                    <div className="h-4 w-4 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] text-emerald-600">✓</span>
                                                    </div>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-rose-600 flex items-center gap-1.5 mb-2">
                                            <span className="h-1 w-4 bg-rose-500 rounded-full" /> {t.metrics.weaknesses}
                                        </div>
                                        <ul className="space-y-2">
                                            {comp.weaknesses.map((w, j) => (
                                                <li key={j} className="text-xs font-semibold text-slate-600 flex gap-2.5 items-start">
                                                    <div className="h-4 w-4 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] text-rose-600">!</span>
                                                    </div>
                                                    {w}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-slate-100">
                                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                                        <div className="h-7 w-7 rounded-lg bg-indigo-500 text-white flex items-center justify-center shrink-0 font-black text-[10px]">{t.spy}</div>
                                        <p className="text-[11px] font-medium text-slate-600 italic leading-relaxed">
                                            <span className="font-black text-indigo-600 not-italic mr-1.5 uppercase leading-none">{t.metrics.intelligence}:</span>
                                            "{comp.adStrategy}"
                                        </p>
                                    </div>
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
                                            {t.metrics.risk(strat.riskLevel)}
                                        </span>
                                        <span className="text-[10px] text-slate-400 mt-1 font-bold italic">{strat.timeToResults}</span>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                                        <span className="text-indigo-500 font-black uppercase text-[9px] block mb-0.5">THE "WHY":</span>
                                        {strat.rationale}
                                    </p>

                                    <div className="p-3 bg-slate-50 rounded-xl border border-dashed text-xs space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Target className="h-3.5 w-3.5 text-indigo-500" />
                                            <span className="font-bold text-slate-700">EDGE: {strat.competitiveAdvantage}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {strat.keyMessages.map((msg, j) => (
                                                <span key={j} className="text-[10px] bg-white border px-1.5 py-0.5 rounded-md text-slate-500 shadow-sm">{msg}</span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* BEGINNER-FRIENDLY AD MANAGER GUIDE */}
                                    {strat.adCopyGuide && (
                                        <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-lg space-y-4 border border-slate-700">
                                            <div className="flex items-center justify-between">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{t.adGuide.title}</div>
                                                <div className="flex gap-1">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                    <span className="text-[9px] text-emerald-400 font-bold uppercase">{t.adGuide.ready}</span>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded bg-indigo-500 text-white flex items-center justify-center font-black">1</span>
                                                        {t.adGuide.headlines}
                                                    </div>
                                                    <div className="space-y-1">
                                                        {strat.adCopyGuide.headlines.map((h, j) => (
                                                            <div key={j} className="text-xs font-bold text-indigo-300 flex justify-between group cursor-pointer" onClick={() => navigator.clipboard.writeText(h)}>
                                                                <span className="truncate">{h}</span>
                                                                <Copy className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded bg-indigo-500 text-white flex items-center justify-center font-black">2</span>
                                                        {t.adGuide.descriptions}
                                                    </div>
                                                    <div className="space-y-2">
                                                        {strat.adCopyGuide.descriptions.map((d, j) => (
                                                            <div key={j} className="text-[11px] font-medium text-slate-300 leading-tight italic border-l border-indigo-500/50 pl-2 py-1 group cursor-pointer" onClick={() => navigator.clipboard.writeText(d)}>
                                                                "{d}"
                                                                <Copy className="h-3 w-3 inline ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-white/5 border border-white/10 space-y-2">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase flex items-center gap-2">
                                                        <span className="h-4 w-4 rounded bg-indigo-500 text-white flex items-center justify-center font-black">3</span>
                                                        {t.adGuide.keywords}
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {strat.adCopyGuide.keywords.map((k, j) => (
                                                            <span key={j} className="text-[9px] font-bold bg-white/10 px-1.5 py-0.5 rounded text-slate-300 border border-white/5">
                                                                {k}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                                                    <div className="text-[9px] font-black text-indigo-300 uppercase mb-1 flex items-center gap-1.5">
                                                        <Rocket className="h-3 w-3" /> {t.adGuide.tip}
                                                    </div>
                                                    <p className="text-[10px] text-slate-300 font-medium leading-relaxed italic">
                                                        "{strat.adCopyGuide.setupGuide}"
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4 items-center">
                                        <div className="space-y-1">
                                            <div className="text-[9px] font-black text-slate-400 uppercase">{t.adGuide.channelMix}</div>
                                            <div className="flex flex-wrap gap-1">
                                                {strat.recommendedChannels.map((c, j) => (
                                                    <span key={j} className="text-[9px] font-bold text-slate-600">{c}</span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[9px] font-black text-slate-400 uppercase text-right">{t.metrics.roi}</div>
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
                            placeholder={t.websitePlaceholder}
                            value={websiteUrl}
                            onChange={(e) => setWebsiteUrl(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">{t.products}</label>
                        <div className="space-y-3">
                            {products.map((product, index) => (
                                <div key={index} className="space-y-1.5 p-2.5 rounded-lg border bg-muted/20">
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder={`${t.productName} ${index + 1}`}
                                            value={product.name}
                                            onChange={(e) => updateProduct(index, "name", e.target.value)}
                                            className="text-sm"
                                        />
                                        {products.length > 1 && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeProduct(index)}
                                                className="h-10 w-10 shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                    <Input
                                        placeholder={t.productUrlPlaceholder}
                                        value={product.url}
                                        onChange={(e) => updateProduct(index, "url", e.target.value)}
                                        className="text-xs text-muted-foreground"
                                    />
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addProduct} className="w-full text-xs">
                                <Plus className="mr-1.5 h-3.5 w-3.5" />
                                {t.addProduct}
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
                            placeholder={t.audiencePlaceholder}
                            value={targetAudience}
                            onChange={(e) => setTargetAudience(e.target.value)}
                            className="min-h-[80px] lg:min-h-[100px] resize-y text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs lg:text-sm font-medium">{t.specialInstructions}</label>
                        <Textarea
                            placeholder={t.specialInstructionsPlaceholder}
                            value={specialInstructions}
                            onChange={(e) => setSpecialInstructions(e.target.value)}
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

                    {/* Progress Messages */}
                    {(isProcessing || isMagicThinking) && progressMessage && (
                        <div className="mt-3 p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-200/50">
                            <div className="flex items-center gap-3">
                                <div className="flex space-x-1">
                                    <span className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                                    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                                    <span className="w-2 h-2 bg-pink-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                                </div>
                                <p className="text-xs lg:text-sm font-medium text-foreground/80 animate-pulse">
                                    {progressMessage}
                                </p>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                        style={{ width: `${((progressIndex + 1) / progressMessages.length) * 100}%` }}
                                    ></div>
                                </div>
                                <span className="text-[10px] text-muted-foreground font-mono">
                                    {progressIndex + 1}/{progressMessages.length}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className={cn(
                "transition-all duration-500 border-t-4",
                !(googleAdsResult || magicWandResult) ? "opacity-50 grayscale select-none pointer-events-none" : "opacity-100 shadow-2xl shadow-indigo-500/10 border-t-indigo-500 bg-card/80 backdrop-blur-md",
                magicWandResult ? "border-t-indigo-500" : "border-t-green-500"
            )}>
                <CardHeader className="p-4 lg:p-6 pb-2 lg:pb-3">
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
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={handleCopy} className="h-8 w-8 lg:h-9 lg:w-9" title="Copy to clipboard">
                                    {copied ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 lg:h-4 lg:w-4 text-green-500" />
                                    ) : (
                                        <Copy className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" onClick={exportCSV} className="h-8 w-8 lg:h-9 lg:w-9" title="Export as CSV">
                                    <FileSpreadsheet className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={exportHTML} className="h-8 w-8 lg:h-9 lg:w-9" title="Export as HTML">
                                    <Download className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                                </Button>
                            </div>
                        )}
                    </CardTitle>
                    <CardDescription className="text-xs lg:text-sm">
                        {magicWandResult
                            ? t.strategicDirections
                            : t.generatedCampaign
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
                            {common.emptyState}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
