"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import useStore from "@/lib/store";
import { Sparkles, FileText, ListTodo, Palette, Presentation, History, Settings, Github, Menu, X, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "enhance" | "prd" | "action" | "uxdesigner" | "slides" | "googleads" | "history" | "settings";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const history = useStore((state) => state.history);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const menuItems = [
    { id: "enhance" as View, label: "Prompt Enhancer", icon: Sparkles },
    { id: "prd" as View, label: "PRD Generator", icon: FileText },
    { id: "action" as View, label: "Action Plan", icon: ListTodo },
    { id: "uxdesigner" as View, label: "UX Designer", icon: Palette },
    { id: "slides" as View, label: "Slides Generator", icon: Presentation },
    { id: "googleads" as View, label: "Google Ads Gen", icon: Megaphone },
    { id: "history" as View, label: "History", icon: History, count: history.length },
    { id: "settings" as View, label: "Settings", icon: Settings },
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
          Back to rommark.dev
        </a>
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="block">
          <h1 className="flex items-center gap-2 text-lg lg:text-xl font-bold hover:opacity-80 transition-opacity">
            <div className="flex h-7 w-7 lg:h-8 lg:w-8 items-center justify-center rounded-lg bg-[#4285F4] text-primary-foreground text-sm lg:text-base">
              PA
            </div>
            PromptArch
          </h1>
        </a>
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="mt-2 lg:mt-3 flex items-center gap-1.5 rounded-md px-2 lg:px-3 py-1 lg:py-1.5 text-xs text-primary hover:bg-primary/10 transition-colors">
          <Github className="h-3 w-3 lg:h-3.5 lg:w-3.5" />
          <span>View on GitHub</span>
        </a>
        <p className="mt-1 lg:mt-2 text-[10px] lg:text-xs text-muted-foreground">
          Forked from <a href="https://github.com/ClavixDev/Clavix" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clavix</a>
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

        <div className="mt-6 lg:mt-8 p-2 lg:p-3 text-[9px] lg:text-[10px] leading-relaxed text-muted-foreground border-t border-border/50 pt-3 lg:pt-4">
          <p className="font-semibold text-foreground mb-1">Developed by Roman | RyzenAdvanced</p>
          <div className="space-y-0.5 lg:space-y-1">
            <p>
              GitHub: <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">roman-ryzenadvanced</a>
            </p>
            <p>
              Telegram: <a href="https://t.me/VibeCodePrompterSystem" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@VibeCodePrompterSystem</a>
            </p>
            <p className="mt-1 lg:mt-2 text-[8px] lg:text-[9px] opacity-80">
              100% Developed using GLM 4.7 model on TRAE.AI IDE.
            </p>
            <p className="text-[8px] lg:text-[9px] opacity-80">
              Model Info: <a href="https://z.ai/subscribe?ic=R0K78RJKNW" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Learn here</a>
            </p>
          </div>
        </div>
      </nav>

      <div className="border-t p-3 lg:p-4 hidden lg:block">
        <div className="rounded-md bg-muted/50 p-2 lg:p-3 text-[10px] lg:text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Quick Tips</p>
          <ul className="mt-1.5 lg:mt-2 space-y-0.5 lg:space-y-1">
            <li>• Use different providers for best results</li>
            <li>• Copy enhanced prompts to your AI agent</li>
            <li>• PRDs generate better action plans</li>
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
          <span className="font-bold text-lg">PromptArch</span>
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
