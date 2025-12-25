"use client";

import { Button } from "@/components/ui/button";
import useStore from "@/lib/store";
import { Sparkles, FileText, ListTodo, Palette, History, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export type View = "enhance" | "prd" | "action" | "uxdesigner" | "history" | "settings";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function Sidebar({ currentView, onViewChange }: SidebarProps) {
  const history = useStore((state) => state.history);

  const menuItems = [
    { id: "enhance" as View, label: "Prompt Enhancer", icon: Sparkles },
    { id: "prd" as View, label: "PRD Generator", icon: FileText },
    { id: "action" as View, label: "Action Plan", icon: ListTodo },
    { id: "uxdesigner" as View, label: "UX Designer Prompt", icon: Palette },
    { id: "history" as View, label: "History", icon: History, count: history.length },
    { id: "settings" as View, label: "Settings", icon: Settings },
  ];

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="border-b p-6">
        <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="block">
          <h1 className="flex items-center gap-2 text-xl font-bold hover:opacity-80 transition-opacity">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              PA
            </div>
            PromptArch
          </h1>
        </a>
        <p className="mt-2 text-xs text-muted-foreground">
          Forked from <a href="https://github.com/ClavixDev/Clavix" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Clavix</a>
        </p>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {menuItems.map((item) => (
          <Button
            key={item.id}
            variant={currentView === item.id ? "default" : "ghost"}
            className={cn(
              "w-full justify-start gap-2",
              currentView === item.id && "bg-primary text-primary-foreground"
            )}
            onClick={() => onViewChange(item.id)}
          >
            <item.icon className="h-4 w-4" />
            <span className="flex-1 text-left">{item.label}</span>
            {item.count !== undefined && item.count > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-foreground text-xs font-medium">
                {item.count}
              </span>
            )}
          </Button>
        ))}

        <div className="mt-8 p-3 text-[10px] leading-relaxed text-muted-foreground border-t border-border/50 pt-4">
          <p className="font-semibold text-foreground mb-1">Developed by Roman | RyzenAdvanced</p>
          <div className="space-y-1">
            <p>
              GitHub: <a href="https://github.com/roman-ryzenadvanced/PromptArch-the-prompt-enhancer" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">roman-ryzenadvanced</a>
            </p>
            <p>
              Telegram: <a href="https://t.me/VibeCodePrompterSystem" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@VibeCodePrompterSystem</a>
            </p>
            <p className="mt-2 text-[9px] opacity-80">
              100% Developed using GLM 4.7 model on TRAE.AI IDE.
            </p>
            <p className="text-[9px] opacity-80">
              Model Info: <a href="https://z.ai/subscribe?ic=R0K78RJKNW" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Learn here</a>
            </p>
          </div>
        </div>
      </nav>

      <div className="border-t p-4">
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground">Quick Tips</p>
          <ul className="mt-2 space-y-1">
            <li>• Use different providers for best results</li>
            <li>• Copy enhanced prompts to your AI agent</li>
            <li>• PRDs generate better action plans</li>
            <li>• UX Designer Prompt for design tasks</li>
          </ul>
        </div>
      </div>
    </aside>
  );
}
