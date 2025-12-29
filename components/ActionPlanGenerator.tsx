"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { ListTodo, Copy, Loader2, CheckCircle2, Clock, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n/translations";

export default function ActionPlanGenerator() {
  const {
    language,
    currentPrompt,
    actionPlan,
    selectedProvider,
    selectedModels,
    availableModels,
    apiKeys,
    isProcessing,
    error,
    setCurrentPrompt,
    setSelectedProvider,
    setActionPlan,
    setProcessing,
    setError,
    setAvailableModels,
    setSelectedModel,
  } = useStore();

  const t = translations[language].actionPlan;
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

  const handleGenerate = async () => {
    if (!currentPrompt.trim()) {
      setError(t.enterPrdError);
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

    console.log("[ActionPlanGenerator] Starting action plan generation...", { selectedProvider, selectedModel, hasQwenAuth: modelAdapter.hasQwenAuth() });

    try {
      const result = await modelAdapter.generateActionPlan(currentPrompt, selectedProvider, selectedModel);

      console.log("[ActionPlanGenerator] Generation result:", result);

      if (result.success && result.data) {
        const newPlan = {
          id: Math.random().toString(36).substr(2, 9),
          prdId: "",
          tasks: [],
          frameworks: [],
          architecture: {
            pattern: "",
            structure: "",
            technologies: [],
            bestPractices: [],
          },
          estimatedDuration: "",
          createdAt: new Date(),
          rawContent: result.data,
        };
        setActionPlan(newPlan);
      } else {
        console.error("[ActionPlanGenerator] Generation failed:", result.error);
        setError(result.error || t.errorGenerate);
      }
    } catch (err) {
      console.error("[ActionPlanGenerator] Generation error:", err);
      setError(err instanceof Error ? err.message : t.errorGenerate);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (actionPlan?.rawContent) {
      await navigator.clipboard.writeText(actionPlan.rawContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-4 lg:gap-6 grid-cols-1 lg:grid-cols-2 text-start">
      <Card className="h-fit">
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <ListTodo className="h-4 w-4 lg:h-5 lg:w-5" />
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
                  className="capitalize text-xs lg:text-sm h-8 lg:h-9 px-2.5 lg:px-3"
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

          <div className="space-y-2">
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

          <Button onClick={handleGenerate} disabled={isProcessing || !currentPrompt.trim()} className="w-full h-9 lg:h-10 text-xs lg:text-sm">
            {isProcessing ? (
              <>
                <Loader2 className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4 animate-spin" />
                {common.generating}
              </>
            ) : (
              <>
                <ListTodo className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
                {t.generateButton}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className={cn("flex flex-col", !actionPlan && "opacity-50")}>
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="flex items-center justify-between text-base lg:text-lg">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 lg:h-5 lg:w-5 text-green-500" />
              {t.generatedTitle}
            </span>
            {actionPlan && (
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
            {t.generatedDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
          {actionPlan ? (
            <div className="space-y-3 lg:space-y-4">
              <div className="rounded-md border bg-primary/5 p-3 lg:p-4 text-start">
                <h4 className="mb-1.5 lg:mb-2 flex items-center gap-2 font-semibold text-xs lg:text-sm">
                  <Clock className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {t.roadmap}
                </h4>
                <pre className="whitespace-pre-wrap text-xs lg:text-sm leading-relaxed">{actionPlan.rawContent}</pre>
              </div>

              <div className="rounded-md border bg-muted/30 p-3 lg:p-4 text-start">
                <h4 className="mb-1.5 lg:mb-2 flex items-center gap-2 font-semibold text-xs lg:text-sm">
                  <AlertTriangle className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                  {t.quickNotes}
                </h4>
                <ul className="list-inside list-disc space-y-0.5 lg:space-y-1 text-[10px] lg:text-xs text-muted-foreground">
                  {t.notes.map((note: string, i: number) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex h-[200px] lg:h-[300px] items-center justify-center text-center text-xs lg:text-sm text-muted-foreground italic">
              {t.emptyState}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
