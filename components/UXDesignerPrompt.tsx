"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Palette, Copy, Loader2, CheckCircle2, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function UXDesignerPrompt() {
  const {
    currentPrompt,
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
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);

  const selectedModel = selectedModels[selectedProvider];
  const models = availableModels[selectedProvider] || modelAdapter.getAvailableModels(selectedProvider);

  useEffect(() => {
    if (typeof window !== "undefined") {
      loadAvailableModels();
      const saved = localStorage.getItem("promptarch-api-keys");
      if (saved) {
        try {
          const keys = JSON.parse(saved);
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
      setError("Please enter an app description");
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
    setGeneratedPrompt(null);

    console.log("[UXDesignerPrompt] Starting generation...", { selectedProvider, selectedModel, hasQwenAuth: modelAdapter.hasQwenAuth() });

    try {
      const result = await modelAdapter.generateUXDesignerPrompt(currentPrompt, selectedProvider, selectedModel);

      console.log("[UXDesignerPrompt] Generation result:", result);

      if (result.success && result.data) {
        setGeneratedPrompt(result.data);
        setEnhancedPrompt(result.data);
      } else {
        console.error("[UXDesignerPrompt] Generation failed:", result.error);
        setError(result.error || "Failed to generate UX designer prompt");
      }
    } catch (err) {
      console.error("[UXDesignerPrompt] Generation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (generatedPrompt) {
      await navigator.clipboard.writeText(generatedPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClear = () => {
    setCurrentPrompt("");
    setGeneratedPrompt(null);
    setEnhancedPrompt(null);
    setError(null);
  };

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            UX Designer Prompt
          </CardTitle>
          <CardDescription>
            Describe your app idea and get the BEST EVER prompt for UX design
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">AI Provider</label>
            <div className="flex flex-wrap gap-2">
              {(["ollama", "zai"] as const).map((provider) => (
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
                  {provider === "ollama" ? "Ollama" : "Z.AI"}
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
            <label className="text-sm font-medium">App Description</label>
            <Textarea
              placeholder="e.g., A fitness tracking app with workout plans, nutrition tracking, and social features for sharing progress with friends"
              value={currentPrompt}
              onChange={(e) => setCurrentPrompt(e.target.value)}
              className="min-h-[200px] resize-y"
            />
            <p className="text-xs text-muted-foreground">
              Describe what kind of app you want, target users, key features, and any specific design preferences.
            </p>
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
            <Button onClick={handleGenerate} disabled={isProcessing || !currentPrompt.trim()} className="flex-1">
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Palette className="mr-2 h-4 w-4" />
                  Generate UX Prompt
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClear} disabled={isProcessing}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={cn(!generatedPrompt && "opacity-50")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Best Ever UX Prompt
            </span>
            {generatedPrompt && (
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
            Comprehensive UX design prompt ready for designers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {generatedPrompt ? (
            <div className="rounded-md border bg-muted/50 p-4">
              <pre className="whitespace-pre-wrap text-sm">{generatedPrompt}</pre>
            </div>
          ) : (
            <div className="flex h-[400px] items-center justify-center text-center text-sm text-muted-foreground">
              Your comprehensive UX designer prompt will appear here
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
