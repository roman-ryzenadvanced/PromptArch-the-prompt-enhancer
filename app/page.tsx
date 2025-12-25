"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import type { View } from "@/components/Sidebar";
import PromptEnhancer from "@/components/PromptEnhancer";
import PRDGenerator from "@/components/PRDGenerator";
import ActionPlanGenerator from "@/components/ActionPlanGenerator";
import UXDesignerPrompt from "@/components/UXDesignerPrompt";
import HistoryPanel from "@/components/HistoryPanel";
import SettingsPanel from "@/components/SettingsPanel";

export default function Home() {
  const [currentView, setCurrentView] = useState<View>("enhance");

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
