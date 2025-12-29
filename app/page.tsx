"use client";

import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import type { View } from "@/components/Sidebar";
import dynamic from 'next/dynamic';
import modelAdapter from "@/lib/services/adapter-instance";

// Dynamic imports to prevent hydration mismatches
// ensuring hydration match
const PromptEnhancer = dynamic(() => import("@/components/PromptEnhancer"), { ssr: false });
const PRDGenerator = dynamic(() => import("@/components/PRDGenerator"), { ssr: false });
const ActionPlanGenerator = dynamic(() => import("@/components/ActionPlanGenerator"), { ssr: false });
const UXDesignerPrompt = dynamic(() => import("@/components/UXDesignerPrompt"), { ssr: false });
const SlidesGenerator = dynamic(() => import("@/components/SlidesGenerator"), { ssr: false });
const GoogleAdsGenerator = dynamic(() => import("@/components/GoogleAdsGenerator"), { ssr: false });
const MarketResearcher = dynamic(() => import("@/components/MarketResearcher"), { ssr: false });
const AIAssist = dynamic(() => import("@/components/AIAssist"), { ssr: false });
const HistoryPanel = dynamic(() => import("@/components/HistoryPanel"), { ssr: false });
const SettingsPanel = dynamic(() => import("@/components/SettingsPanel"), { ssr: false });

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("enhance");

  useEffect(() => {
    console.log("[Home] Initializing Qwen OAuth service on client...");
    modelAdapter["qwenService"]["initialize"]?.();
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case "enhance":
        return <PromptEnhancer />;
      case "prd":
        return <PRDGenerator />;
      case "action":
        return <ActionPlanGenerator />;
      case "uxdesigner":
        return <UXDesignerPrompt />;
      case "slides":
        return <SlidesGenerator />;
      case "googleads":
        return <GoogleAdsGenerator />;
      case "market-research":
        return <MarketResearcher />;
      case "ai-assist":
        return <AIAssist />;
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
      <main className="flex-1 overflow-auto pt-16 lg:pt-0 px-4 py-4 lg:p-8">
        <div className="mx-auto max-w-7xl">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

