"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useStore from "@/lib/store";
import { Sparkles, FileText, ListTodo, Palette, Presentation, History, Settings, Github, Menu, X, Megaphone, Languages, Search, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { translations } from "@/lib/i18n/translations";

export type View = "enhance" | "prd" | "action" | "uxdesigner" | "slides" | "googleads" | "market-research" | "ai-assist" | "history" | "settings";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const { language, setLanguage, history } = useStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = translations[language].sidebar;
  const common = translations[language].common;

  const menuItems = [
    { id: "enhance" as View, label: t.promptEnhancer, icon: Sparkles },
    { id: "prd" as View, label: t.prdGenerator, icon: FileText },
    { id: "action" as View, label: t.actionPlan, icon: ListTodo },
    { id: "uxdesigner" as View, label: t.uxDesigner, icon: Palette },
    { id: "slides" as View, label: t.slidesGen, icon: Presentation },
    { id: "googleads" as View, label: t.googleAds, icon: Megaphone },
    { id: "market-research" as View, label: t.marketResearch, icon: Search },
    { id: "ai-assist" as View, label: t.aiAssist, icon: MessageSquare },
    { id: "history" as View, label: t.history, icon: History, count: history.length },
    { id: "settings" as View, label: t.settings, icon: Settings },
  ];

  const handleViewChange = (view: View) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  const SidebarContent = () => (
    <>
      <div className="border-b p-4 lg:p-6">
        <a href="https://www.rommark.dev" className="mb-4 flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
          <Menu className="h-3 w-3" />
          <span>{t.backToRommark}</span>
        </a>
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="block">
          <h1 className="flex items-center gap-2 text-lg lg:text-xl font-bold hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-[#4285F4] text-primary-foreground text-sm lg:text-base">
              PA
            </div>
            {t.title}
          </h1>
        </a>
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="mt-2 lg:mt-3 flex items-center gap-1.5 rounded-md px-2 lg:px-3 py-1 lg:py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors">
          <Github className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
          <span>{t.viewOnGithub}</span>
        </a>
        <p className="mt-1 lg:mt-2 text-[10px] lg:text-xs text-muted-foreground">
          {t.forkedFrom} <a href="https://github.com/ClavixDev/Clavix" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clavix</a>
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-3 lg:p-4 overflow-y-auto">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-2 h-9 lg:h-10 text-sm",
              currentView === item.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => handleViewChange(item.id)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left truncate">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-medium text-primary">
                {item.count}
              </span>
            )}
          </Button>
        ))}

        <div className="mt-4 p-2 lg:p-3 border-t border-border/50">
          <div className="flex items-center gap-2 mb-2 text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase">
            <Languages className="h-3 w-3" /> {t.language}
          </div>
          <div className="flex flex-wrap gap-1">
            {(["en", "ru", "he"] as const).map((lang) => (
              <Button
                key={lang}
                variant={language === lang ? "default" : "outline"}
                size="sm"
                className="h-7 px-2 text-[10px] uppercase font-bold"
                onClick={() => setLanguage(lang)}
              >
                {lang}
              </Button>
            ))}
          </div>
        </div>
      </nav>

      <div className="border-t p-3 lg:p-4 hidden lg:block">
        <div className="rounded-md bg-muted/50 p-2 lg:p-3 text-[10px] lg:text-xs text-muted-foreground">
          <p className="font-medium text-foreground">{t.quickTips}</p>
          <ul className="mt-1.5 lg:mt-2 space-y-0.5 lg:space-y-1">
            <li>• {t.tip1}</li>
            <li>• {t.tip2}</li>
            <li>• {t.tip3}</li>
          </ul>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between border-b bg-card px-4 py-3">
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            PA
          </div>
          <span className="font-bold text-lg">{t.title}</span>
        </a>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-9 w-9"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Slide-out Menu */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 flex h-full w-72 max-w-[80vw] flex-col border-r bg-card transition-transform duration-300 ease-in-out",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex h-screen w-64 flex-col border-r bg-card flex-shrink-0">
        <SidebarContent />
      </aside>
    </>
  );
}
