"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import type { View } from "@/components/Sidebar";
import PromptEnhancer from "@/components/PromptEnhancer";
import PRDGenerator from "@/components/PRDGenerator";
import ActionPlanGenerator from "@/components/ActionPlanGenerator";
import HistoryPanel from "@/components/HistoryPanel";
import SettingsPanel from "@/components/SettingsPanel";
import useStore from "@/lib/store";
import modelAdapter from "@/lib/services/adapter-instance";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("enhance");
  const { setQwenTokens, setApiKey } = useStore();

  useEffect(() => {
    // Handle OAuth callback
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      
      if (code) {
        // In a real app, you would exchange the code for tokens here
        // Since we don't have a backend or real client secret, we'll simulate it
        console.log("OAuth code received:", code);
        
        // Mock token exchange
        const mockAccessToken = "mock_access_token_" + Math.random().toString(36).substr(2, 9);
        const tokens = {
          accessToken: mockAccessToken,
          expiresAt: Date.now() + 3600 * 1000, // 1 hour
        };
        
        setQwenTokens(tokens);
        modelAdapter.setQwenOAuthTokens(tokens.accessToken, undefined, 3600);
        
        // Save to localStorage
        localStorage.setItem("promptarch-qwen-tokens", JSON.stringify(tokens));
        
        // Clear the code from URL
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Switch to settings to show success (optional)
        setCurrentView("settings");
      }

      // Load tokens from localStorage on init
      const savedTokens = localStorage.getItem("promptarch-qwen-tokens");
      if (savedTokens) {
        try {
          const tokens = JSON.parse(savedTokens);
          if (tokens.expiresAt > Date.now()) {
            setQwenTokens(tokens);
            modelAdapter.setQwenOAuthTokens(tokens.accessToken, tokens.refreshToken, (tokens.expiresAt - Date.now()) / 1000);
          }
        } catch (e) {
          console.error("Failed to load Qwen tokens:", e);
        }
      }
    }
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "enhance":
        return <PromptEnhancer />;
      case "prd":
        return <PRDGenerator />;
      case "action":
        return <ActionPlanGenerator />;
      case "history":
        return <HistoryPanel />;
      case "settings":
        return <SettingsPanel />;
      default:
        return <PromptEnhancer />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-7xl">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
