"use client";

import { X, Download, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ResearchRenderer } from "@/components/agent/message/research-message";

interface ReportPanelProps {
  /** Empty string = panel open in loading state; non-empty string = ready. */
  report: string;
  onClose: () => void;
  loadingMessage?: string;
}

export function ReportPanel({
  report,
  onClose,
  loadingMessage = "Synthesizing research findings…",
}: ReportPanelProps) {
  const isGenerating = report === "";

  const download = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-report-${new Date().toISOString().split("T")[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full animate-in slide-in-from-right duration-300">
      {/* Sticky header */}
      <div className="flex items-center justify-between px-5 py-3 border-b shrink-0">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Research Report</span>
          {isGenerating && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Writing…
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {!isGenerating && (
            <Button variant="ghost" size="sm" onClick={download} className="h-7 px-2 text-xs gap-1">
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Body */}
      {isGenerating ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm">{loadingMessage}</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="px-10 py-8 max-w-2xl mx-auto">
            <ResearchRenderer text={report} />
          </div>
        </div>
      )}
    </div>
  );
}
