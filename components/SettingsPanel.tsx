"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Save, Key, Server, Eye, EyeOff } from "lucide-react";

export default function SettingsPanel() {
  const { 
    apiKeys, 
    setApiKey, 
    selectedProvider, 
    setSelectedProvider
  } = useStore();
  
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("promptarch-api-keys", JSON.stringify(apiKeys));
      alert("API keys saved successfully!");
    }
  };

  const handleLoad = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("promptarch-api-keys");
      if (saved) {
        try {
          const keys = JSON.parse(saved);
          if (keys.ollama) {
            setApiKey("ollama", keys.ollama);
            modelAdapter.updateOllamaApiKey(keys.ollama);
          }
          if (keys.zai) {
            setApiKey("zai", keys.zai);
            modelAdapter.updateZaiApiKey(keys.zai);
          }
        } catch (e) {
          console.error("Failed to load API keys:", e);
        }
      }
    }
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKey(provider as "ollama" | "zai", value);
    
    switch (provider) {
      case "ollama":
        modelAdapter.updateOllamaApiKey(value);
        break;
      case "zai":
        modelAdapter.updateZaiApiKey(value);
        break;
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            API Configuration
          </CardTitle>
          <CardDescription>
            Configure API keys for different AI providers
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4" />
              Ollama Cloud API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey.ollama ? "text" : "password"}
                placeholder="Enter your Ollama API key"
                value={apiKeys.ollama || ""}
                onChange={(e) => handleApiKeyChange("ollama", e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey((prev) => ({ ...prev, ollama: !prev.ollama }))}
              >
                {showApiKey.ollama ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get API key from{" "}
              <a
                href="https://ollama.com/cloud"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                ollama.com/cloud
              </a>
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium">
              <Server className="h-4 w-4" />
              Z.AI Plan API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey.zai ? "text" : "password"}
                placeholder="Enter your Z.AI API key"
                value={apiKeys.zai || ""}
                onChange={(e) => handleApiKeyChange("zai", e.target.value)}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setShowApiKey((prev) => ({ ...prev, zai: !prev.zai }))}
              >
                {showApiKey.zai ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get API key from{" "}
              <a
                href="https://docs.z.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                docs.z.ai
              </a>
            </p>
          </div>

          <Button onClick={handleSave} className="w-full">
            <Save className="mr-2 h-4 w-4" />
            Save API Keys
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Default Provider</CardTitle>
          <CardDescription>
            Select your preferred AI provider
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {(["ollama", "zai"] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={`flex items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted/50 ${
                  selectedProvider === provider
                    ? "border-primary bg-primary/5"
                    : "border-border"
                }`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                  <Server className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium capitalize">{provider}</h3>
                  <p className="text-sm text-muted-foreground">
                    {provider === "ollama" && "Ollama Cloud API"}
                    {provider === "zai" && "Z.AI Plan API"}
                  </p>
                </div>
                {selectedProvider === provider && (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Privacy</CardTitle>
          <CardDescription>
            Your data handling preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-sm">
              All API keys are stored locally in your browser. Your prompts are sent directly to selected AI provider and are not stored by PromptArch.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
