"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Sparkles, Copy, RefreshCw, Loader2, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n/translations";

export default function PromptEnhancer() {
  const {
    language,
    currentPrompt,
    enhancedPrompt,
    selectedProvider,
    selectedModels,
    availableModels,
    apiKeys,
    isProcessing,
    error,
    setSelectedProvider,
    setCurrentPrompt,
    setEnhancedPrompt,
    setProcessing,
    setError,
    setAvailableModels,
    setSelectedModel,
  } = useStore();

  const t = translations[language].promptEnhancer;
  const common = translations[language].common;

  const [copied, setCopied] = useState(false);

  const selectedModel = selectedModels[selectedProvider];
  const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

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

  const handleEnhance = async () => {
    if (!currentPrompt.trim()) {
      setError("Please enter a prompt to enhance");
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

    console.log("[PromptEnhancer] Starting enhancement...", { selectedProvider, selectedModel, hasQwenAuth: modelAdapter.hasQwenAuth() });

    try {
      const result = await modelAdapter.enhancePrompt(currentPrompt, selectedProvider, selectedModel);

      console.log("[PromptEnhancer] Enhancement result:", result);

      if (result.success && result.data) {
        setEnhancedPrompt(result.data);
      } else {
        console.error("[PromptEnhancer] Enhancement failed:", result.error);
        setError(result.error || "Failed to enhance prompt");
      }
    } catch (err) {
      console.error("[PromptEnhancer] Enhancement error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (enhancedPrompt) {
      await navigator.clipboard.writeText(enhancedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setCurrentPrompt("");
    setEnhancedPrompt(null);
    setError(null);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2 text-start">
      <Card className="h-fit">
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Sparkles className="h-4 w-4 lg:h-5 lg:w-5" />
            {t.title}
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            {t.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4 p-4 lg:p-6 pt-0 lg:pt-0">
          <div className="space-y-2 text-start">
            <label className="text-xs lg:text-sm font-medium">{common.aiProvider}</label>
            <div className="flex flex-wrap gap-1.5 lg:gap-2">
              {(["qwen", "ollama", "zai"] as const).map((provider) => (
                <Button
                  key={provider}
                  variant={selectedProvider === provider ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProvider(provider)}
                  className={cn(
                    "capitalize text-xs lg:text-sm h-8 lg:h-9 px-2.5 lg:px-3",
                    selectedProvider === provider && "bg-primary text-primary-foreground"
                  )}
                >
                  {provider === "qwen" ? "Qwen" : provider === "ollama" ? "Ollama" : "Z.AI"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2 text-start">
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

          <div className="space-y-2 text-start">
            <label className="text-xs lg:text-sm font-medium">{t.inputLabel}</label>
            <Textarea
              placeholder={t.placeholder}
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="min-h-[150px] lg:min-h-[200px] resize-y text-sm lg:text-base p-3 lg:p-4"
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

          <div className="flex gap-2">
            <Button onClick={handleEnhance} disabled={isProcessing || !currentPrompt.trim()} className="flex-1 h-9 lg:h-10 text-xs lg:text-sm">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" />
                  {common.generating}
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {t.title}
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isProcessing} className="h-9 lg:h-10 text-xs lg:text-sm px-3">
              <RefreshCw className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
              <span className="hidden sm:inline">{language === "ru" ? "Очистить" : language === "he" ? "נקה" : "Clear"}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cn("flex flex-col", !enhancedPrompt && "opacity-50")}>
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="flex items-center justify-between text-base lg:text-lg">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
              {t.enhancedTitle}
            </span>
            {enhancedPrompt && (
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
            {language === "ru" ? "Профессиональный промпт, готовый для кодинг-агентов" : language === "he" ? "פרומפט מקצועי מוכן לסוכני קידוד" : "Professional prompt ready for coding agents"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
          {enhancedPrompt ? (
            <div className="rounded-md border bg-muted/50 p-3 lg:p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <pre className="whitespace-pre-wrap text-xs lg:text-sm leading-relaxed">{enhancedPrompt}</pre>
            </div>
          ) : (
            <div className="flex h-[150px] lg:h-[200px] items-center justify-center text-center text-xs lg:text-sm text-muted-foreground italic">
              {language === "ru" ? "Улучшенный промпт появится здесь" : language === "he" ? "פרומפט משופר יופיע כאן" : "Enhanced prompt will appear here"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
