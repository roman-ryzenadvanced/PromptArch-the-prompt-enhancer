"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { FileText, Copy, Loader2, CheckCircle2, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PRDGenerator() {
  const {
    currentPrompt,
    prd,
    selectedProvider,
    selectedModels,
    availableModels,
    apiKeys,
    isProcessing,
    error,
    setCurrentPrompt,
    setSelectedProvider,
    setPRD,
    setProcessing,
    setError,
    setAvailableModels,
    setSelectedModel,
  } = useStore();

  const [copied, setCopied] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

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

  const handleGenerate = async () => {
    if (!currentPrompt.trim()) {
      setError("Please enter an idea to generate PRD");
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

    console.log("[PRDGenerator] Starting PRD generation...", { selectedProvider, selectedModel, hasQwenAuth: modelAdapter.hasQwenAuth() });

    try {
      const result = await modelAdapter.generatePRD(currentPrompt, selectedProvider, selectedModel);

      console.log("[PRDGenerator] Generation result:", result);

      if (result.success && result.data) {
        const newPRD = {
          id: Math.random().toString(36).substr(2, 9),
          title: currentPrompt.slice(0, 50) + "...",
          overview: result.data,
          objectives: [],
          userPersonas: [],
          functionalRequirements: [],
          nonFunctionalRequirements: [],
          technicalArchitecture: "",
          successMetrics: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        setPRD(newPRD);
      } else {
        console.error("[PRDGenerator] Generation failed:", result.error);
        setError(result.error || "Failed to generate PRD");
      }
    } catch (err) {
      console.error("[PRDGenerator] Generation error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = async () => {
    if (prd?.overview) {
      await navigator.clipboard.writeText(prd.overview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sections = [
    { id: "overview", title: "Overview & Objectives" },
    { id: "personas", title: "User Personas & Use Cases" },
    { id: "functional", title: "Functional Requirements" },
    { id: "nonfunctional", title: "Non-functional Requirements" },
    { id: "architecture", title: "Technical Architecture" },
    { id: "metrics", title: "Success Metrics" },
  ];

  return (
    <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            PRD Generator
          </CardTitle>
          <CardDescription>
            Generate comprehensive Product Requirements Document from your idea
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
            <label className="text-sm font-medium">Your Idea</label>
            <Textarea
              placeholder="e.g., A task management app with real-time collaboration features"
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
                Generating PRD...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate PRD
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className={cn(!prd && "opacity-50")}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Generated PRD
            </span>
            {prd && (
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
            Structured requirements document ready for development
          </CardDescription>
        </CardHeader>
        <CardContent>
          {prd ? (
            <div className="space-y-3">
              {sections.map((section) => (
                <div key={section.id} className="rounded-md border bg-muted/30">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between px-4 py-3 text-left font-medium transition-colors hover:bg-muted/50"
                  >
                    <span>{section.title}</span>
                    {expandedSections.includes(section.id) ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                  {expandedSections.includes(section.id) && (
                    <div className="border-t bg-background px-4 py-3">
                      <pre className="whitespace-pre-wrap text-sm">{prd.overview}</pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center text-center text-sm text-muted-foreground">
              PRD will appear here
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
