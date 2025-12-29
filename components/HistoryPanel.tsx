"use client";

import useStore from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trash2, RotateCcw } from "lucide-react";
import { translations } from "@/lib/i18n/translations";

export default function HistoryPanel() {
  const { language, history, setCurrentPrompt, clearHistory } = useStore();
  const t = translations[language].history;
  const common = translations[language].common;

  const handleRestore = (prompt: string) => {
    setCurrentPrompt(prompt);
  };

  const handleClear = () => {
    if (confirm(t.confirmClear)) {
      clearHistory();
    }
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[300px] lg:h-[400px] items-center justify-center p-4 lg:p-6 text-center">
          <div>
            <Clock className="mx-auto h-10 w-10 lg:h-12 lg:w-12 text-muted-foreground/50" />
            <p className="mt-3 lg:mt-4 text-sm lg:text-base text-muted-foreground font-medium">{t.empty}</p>
            <p className="mt-1.5 lg:mt-2 text-xs lg:text-sm text-muted-foreground">
              {t.emptyDesc}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between p-4 lg:p-6 text-start">
        <div>
          <CardTitle className="text-base lg:text-lg">{t.title}</CardTitle>
          <CardDescription className="text-xs lg:text-sm">
            {history.length} {t.items}
          </CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={handleClear} className="h-8 w-8 lg:h-9 lg:w-9" title={t.clear}>
          <Trash2 className="h-3.5 w-3.5 lg:h-4 lg:w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-2 lg:space-y-3 p-4 lg:p-6 pt-0 lg:pt-0">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-md border bg-muted/30 p-3 lg:p-4 transition-colors hover:bg-muted/50"
          >
            <div className="mb-1.5 lg:mb-2 flex items-center justify-between gap-2">
              <span className="text-[10px] lg:text-xs text-muted-foreground truncate">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 flex-shrink-0"
                onClick={() => handleRestore(item.prompt)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <p className="line-clamp-3 text-xs lg:text-sm">{item.prompt}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
