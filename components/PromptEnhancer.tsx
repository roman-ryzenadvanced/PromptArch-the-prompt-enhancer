"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Sparkles, Copy, RefreshCw, Loader2, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PromptEnhancer() {
  const {
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
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Input Prompt
          </CardTitle>
          <CardDescription>
            Enter your prompt and we'll enhance it for AI coding agents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Provider</label>
            <div className="flex flex-wrap gap-2">
              {(["qwen", "ollama", "zai"] as const).map((provider) => (
                <Button
                  key={provider}
                  variant={selectedProvider === provider ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedProvider(provider)}
                  className={cn(
                    "capitalize",
                    selectedProvider === provider && "bg-primary text-primary-foreground"
                  )}
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
            <label className="text-sm font-medium">Your Prompt</label>
            <Textarea
              placeholder="e.g., Create a user authentication system with JWT tokens"
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

          <div className="flex gap-2">
            <Button onClick={handleEnhance} disabled={isProcessing || !currentPrompt.trim()} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enhancing...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Enhance Prompt
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isProcessing}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(!enhancedPrompt && "opacity-50")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Enhanced Prompt
            </span>
            {enhancedPrompt && (
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
            Professional prompt ready for coding agents
          </CardDescription>
        </CardHeader>
        <CardContent>
          {enhancedPrompt ? (
            <div className="rounded-md border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap text-sm">{enhancedPrompt}</pre>
            </div>
          ) : (
            <div className="flex h-[200px] items-center justify-center text-center text-sm text-muted-foreground">
              Enhanced prompt will appear here
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
