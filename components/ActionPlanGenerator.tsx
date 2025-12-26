"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { ListTodo, Copy, Loader2, CheckCircle2, Clock, AlertTriangle, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ActionPlanGenerator() {
  const {
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
      setError("Please enter PRD or project requirements");
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
        setError(result.error || "Failed to generate action plan");
      }
    } catch (err) {
      console.error("[ActionPlanGenerator] Generation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
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
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Action Plan Generator
          </CardTitle>
          <CardDescription>
            Convert PRD into actionable implementation plan
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Provider</label>
            <div className="flex gap-2">
              {(["qwen", "ollama", "zai"] as const).map((provider) => (
                <Button
                  key={provider}
                  variant={selectedProvider === provider ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProvider(provider)}
                  className="capitalize"
                >
                  {provider === "qwen" ? "Qwen" : provider === "ollama" ? "Ollama" : "Z.AI"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(selectedProvider, e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {models.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">PRD / Requirements</label>
            <Textarea
              placeholder="Paste your PRD or project requirements here..."
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="min-h-[200px] resize-y"
            />
          </div>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
              {!apiKeys[selectedProvider] && (
                <div className="mt-2 flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  <span className="text-xs">Configure API key in Settings</span>
                </div>
              )}
            </div>
          )}

          <Button onClick={handleGenerate} disabled={isProcessing || !currentPrompt.trim()} className="w-full">
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Action Plan...
              </>
            ) : (
              <>
                <ListTodo className="mr-2 h-4 w-4" />
                Generate Action Plan
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(!actionPlan && "opacity-50")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Action Plan
            </span>
            {actionPlan && (
              <Button variant="ghost" size="icon" onClick={handleCopy}>
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            )}
          </CardTitle>
          <CardDescription>
            Task breakdown, frameworks, and architecture recommendations
          </CardDescription>
        </CardHeader>
        <CardContent>
          {actionPlan ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-primary/5 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <Clock className="h-4 w-4" />
                  Implementation Roadmap
                </h4>
                <pre className="whitespace-pre-wrap text-sm">{actionPlan.rawContent}</pre>
              </div>

              <div className="rounded-md border bg-muted/30 p-4">
                <h4 className="mb-2 flex items-center gap-2 font-semibold">
                  <AlertTriangle className="h-4 w-4" />
                  Quick Notes
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                  <li>Review all task dependencies before starting</li>
                  <li>Set up recommended framework architecture</li>
                  <li>Follow best practices for security and performance</li>
                  <li>Use specified deployment strategy</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
              Action plan will appear here
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
