"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";
import { Save, Key, Server, Eye, EyeOff } from "lucide-react";
import { translations } from "@/lib/i18n/translations";

export default function SettingsPanel() {
  const { language, apiKeys, setApiKey, selectedProvider, setSelectedProvider, qwenTokens, setQwenTokens } = useStore();
  const t = translations[language].settings;
  const common = translations[language].common;
  const [showApiKey, setShowApiKey] = useState<Record<string, boolean>>({});
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const handleSave = () => {
    if (typeof window !== "undefined") {
      localStorage.setItem("promptarch-api-keys", JSON.stringify(apiKeys));
      alert(t.keysSaved);
    }
  };

  const handleLoad = () => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("promptarch-api-keys");
      if (saved) {
        try {
          const keys = JSON.parse(saved);
          if (keys.qwen) {
            setApiKey("qwen", keys.qwen);
            modelAdapter.updateQwenApiKey(keys.qwen);
          }
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
      const storedTokens = modelAdapter.getQwenTokenInfo();
      if (storedTokens) {
        setQwenTokens(storedTokens);
      }
    }
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKey(provider as "qwen" | "ollama" | "zai", value);

    switch (provider) {
      case "qwen":
        modelAdapter.updateQwenApiKey(value);
        break;
      case "ollama":
        modelAdapter.updateOllamaApiKey(value);
        break;
      case "zai":
        modelAdapter.updateZaiApiKey(value);
        break;
    }
  };

  const handleQwenAuth = async () => {
    if (qwenTokens) {
      setQwenTokens(null);
      modelAdapter.updateQwenTokens();
      modelAdapter.updateQwenApiKey(apiKeys.qwen || "");
      return;
    }

    setIsAuthLoading(true);
    try {
      const token = await modelAdapter.startQwenOAuth();
      setQwenTokens(token);
      modelAdapter.updateQwenTokens(token);
    } catch (error) {
      console.error("Qwen OAuth failed", error);
      window.alert(
        error instanceof Error ? error.message : t.qwenAuth + " failed"
      );
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    handleLoad();
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-4 lg:space-y-6">
      <Card>
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <Key className="h-4 w-4 lg:h-5 lg:w-5" />
            {t.apiKeys}
          </CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            {language === "ru" ? "Настройте ключи API для различных провайдеров ИИ" : language === "he" ? "הגדר מפתחות API עבור ספקי בינה מלאכותית שונים" : "Configure API keys for different AI providers"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 lg:space-y-6 p-4 lg:p-6 pt-0 lg:pt-0">
          <div className="space-y-2 text-start">
            <label className="flex items-center gap-2 text-xs lg:text-sm font-medium">
              <Server className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              Qwen Code API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey.qwen ? "text" : "password"}
                placeholder={t.enterKey("Qwen")}
                value={apiKeys.qwen || ""}
                onChange={(e) => handleApiKeyChange("qwen", e.target.value)}
                className="font-mono text-xs lg:text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-9 lg:w-10"
                onClick={() => setShowApiKey((prev) => ({ ...prev, qwen: !prev.qwen }))}
              >
                {showApiKey.qwen ? (
                  <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                ) : (
                  <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                )}
              </Button>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 lg:gap-4">
              <p className="text-[10px] lg:text-xs text-muted-foreground flex-1">
                {t.getApiKey}{" "}
                <a
                  href="https://help.aliyun.com/zh/dashscope/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Alibaba DashScope
                </a>
              </p>
              <Button
                variant={qwenTokens ? "secondary" : "outline"}
                size="sm"
                className="h-7 lg:h-8 text-[10px] lg:text-xs w-full sm:w-auto"
                onClick={handleQwenAuth}
                disabled={isAuthLoading}
              >
                {isAuthLoading
                  ? (language === "ru" ? "Вход..." : language === "he" ? "מתחבר..." : "Signing in...")
                  : qwenTokens
                    ? t.logoutQwen
                    : t.loginQwen}
              </Button>
            </div>
            {qwenTokens && (
              <p className="text-[9px] lg:text-[10px] text-green-600 dark:text-green-400 font-medium">
                ✓ {t.authenticated} ({t.expires}: {new Date(qwenTokens.expiresAt || 0).toLocaleString()})
              </p>
            )}
          </div>

          <div className="space-y-2 text-start">
            <label className="flex items-center gap-2 text-xs lg:text-sm font-medium">
              <Server className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              Ollama Cloud API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey.ollama ? "text" : "password"}
                placeholder={t.enterKey("Ollama")}
                value={apiKeys.ollama || ""}
                onChange={(e) => handleApiKeyChange("ollama", e.target.value)}
                className="font-mono text-xs lg:text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-9 lg:w-10"
                onClick={() => setShowApiKey((prev) => ({ ...prev, ollama: !prev.ollama }))}
              >
                {showApiKey.ollama ? (
                  <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                ) : (
                  <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] lg:text-xs text-muted-foreground">
              {t.getApiKey}{" "}
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

          <div className="space-y-2 text-start">
            <label className="flex items-center gap-2 text-xs lg:text-sm font-medium">
              <Server className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
              Z.AI Plan API Key
            </label>
            <div className="relative">
              <Input
                type={showApiKey.zai ? "text" : "password"}
                placeholder={t.enterKey("Z.AI")}
                value={apiKeys.zai || ""}
                onChange={(e) => handleApiKeyChange("zai", e.target.value)}
                className="font-mono text-xs lg:text-sm pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full w-9 lg:w-10"
                onClick={() => setShowApiKey((prev) => ({ ...prev, zai: !prev.zai }))}
              >
                {showApiKey.zai ? (
                  <EyeOff className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                ) : (
                  <Eye className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
                )}
              </Button>
            </div>
            <p className="text-[10px] lg:text-xs text-muted-foreground">
              {t.getApiKey}{" "}
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

          <Button onClick={handleSave} className="w-full h-9 lg:h-10 text-xs lg:text-sm">
            <Save className="mr-1.5 lg:mr-2 h-3.5 w-3.5 lg:h-4 lg:w-4" />
            {t.saveKeys}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="text-base lg:text-lg">{t.defaultProvider}</CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            {t.defaultProviderDesc}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 lg:space-y-4 p-4 lg:p-6 pt-0 lg:pt-0">
          <div className="grid gap-2 lg:gap-3">
            {(["qwen", "ollama", "zai"] as const).map((provider) => (
              <button
                key={provider}
                onClick={() => setSelectedProvider(provider)}
                className={`flex items-center gap-2 lg:gap-3 rounded-lg border p-3 lg:p-4 text-left transition-colors hover:bg-muted/50 ${selectedProvider === provider
                  ? "border-primary bg-primary/5"
                  : "border-border"
                  }`}
              >
                <div className="flex h-8 w-8 lg:h-10 lg:w-10 items-center justify-center rounded-md bg-primary/10">
                  <Server className="h-4 w-4 lg:h-5 lg:w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium capitalize text-sm lg:text-base">{provider}</h3>
                  <p className="text-[10px] lg:text-sm text-muted-foreground truncate">
                    {provider === "qwen" && t.qwenDesc}
                    {provider === "ollama" && t.ollamaDesc}
                    {provider === "zai" && t.zaiDesc}
                  </p>
                </div>
                {selectedProvider === provider && (
                  <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="p-4 lg:p-6 text-start">
          <CardTitle className="text-base lg:text-lg">{t.dataPrivacy}</CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            {language === "ru" ? "Ваши настройки обработки данных" : language === "he" ? "העדפות הטיפול בנתונים שלך" : "Your data handling preferences"}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 lg:p-6 pt-0 lg:pt-0">
          <div className="rounded-md border bg-muted/30 p-3 lg:p-4 text-start">
            <p className="text-xs lg:text-sm">
              {t.dataPrivacyDesc}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
