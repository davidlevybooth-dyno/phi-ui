"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface ErrorBoundaryProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ScoresError({ error, reset }: ErrorBoundaryProps) {
  useEffect(() => {
    console.error("[Scores page error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[300px] gap-4 text-center p-8">
      <AlertTriangle className="size-8 text-destructive/70" />
      <div className="space-y-1">
        <p className="text-sm font-medium">Failed to load scores</p>
        <p className="text-xs text-muted-foreground max-w-xs">
          {error.message || "An unexpected error occurred loading this page."}
        </p>
      </div>
      <Button size="sm" variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  );
}
