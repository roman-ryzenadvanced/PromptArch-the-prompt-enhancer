"use client";

import useStore from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Trash2, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function HistoryPanel() {
  const { history, setCurrentPrompt, clearHistory } = useStore();

  const handleRestore = (prompt: string) => {
    setCurrentPrompt(prompt);
  };

  const handleClear = () => {
    if (confirm("Are you sure you want to clear all history?")) {
      clearHistory();
    }
  };

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-[400px] items-center justify-center">
          <div className="text-center">
            <Clock className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-muted-foreground">No history yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start enhancing prompts to see them here
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>History</CardTitle>
          <CardDescription>{history.length} items</CardDescription>
        </div>
        <Button variant="outline" size="icon" onClick={handleClear}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {history.map((item) => (
          <div
            key={item.id}
            className="rounded-md border bg-muted/30 p-4 transition-colors hover:bg-muted/50"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {new Date(item.timestamp).toLocaleString()}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleRestore(item.prompt)}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            </div>
            <p className="line-clamp-3 text-sm">{item.prompt}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
