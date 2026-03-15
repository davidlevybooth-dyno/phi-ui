"use client";

import React, { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Brain, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useResearchStream } from "@/hooks/use-research-agents";
import { cn } from "@/lib/utils";

/** Render inline markdown: **bold**, *italic*, `code` */
function renderInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) segments.push(text.slice(lastIndex, match.index));
    const token = match[0];
    if (token.startsWith("**")) {
      segments.push(<strong key={key++} className="font-semibold text-foreground">{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      segments.push(<code key={key++} className="rounded bg-muted px-1 py-0.5 text-xs font-mono">{token.slice(1, -1)}</code>);
    } else {
      segments.push(<em key={key++}>{token.slice(1, -1)}</em>);
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) segments.push(text.slice(lastIndex));
  return segments.length === 0 ? text : <>{segments}</>;
}

export function ResearchRenderer({ text, compact }: { text: string; compact?: boolean }) {
  return (
    <div className={cn("space-y-1", compact ? "text-xs" : "text-sm")}>
      {text.split("\n").map((line, i) => {
        if (line.startsWith("# ")) return <h2 key={i} className={cn("font-semibold mt-3 mb-1 first:mt-0", compact ? "text-xs font-medium" : "text-base")}>{renderInline(line.slice(2))}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className={cn("font-medium mt-3 mb-1 first:mt-0", compact ? "text-xs" : "text-sm")}>{renderInline(line.slice(3))}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className={cn("font-medium text-muted-foreground mt-2 mb-0.5", compact ? "text-xs" : "text-sm")}>{renderInline(line.slice(4))}</h4>;
        if (line.trim() === "") return <div key={i} className={compact ? "h-1" : "h-2"} />;
        if (line.match(/^[-*]\s/)) return <div key={i} className="flex items-start gap-2 py-0.5"><span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground/50" /><span className="leading-relaxed text-muted-foreground">{renderInline(line.replace(/^[-*]\s/, ""))}</span></div>;
        return <p key={i} className="leading-relaxed text-muted-foreground">{renderInline(line)}</p>;
      })}
    </div>
  );
}

interface ResearchMessageProps {
  query: string;
  /** When provided, renders completed research without streaming */
  initialOutput?: string;
  initialThinkingSteps?: Array<{ summary: string; timestamp: number }>;
}

export function ResearchMessage({ query, initialOutput, initialThinkingSteps }: ResearchMessageProps) {
  const [thinkingOpen, setThinkingOpen] = React.useState(false);
  const { status, output, thinkingSteps, startResearch, stop } = useResearchStream();
  const startedRef = useRef(false);

  useEffect(() => {
    if (initialOutput || startedRef.current) return;
    startedRef.current = true;
    startResearch(query);
    return () => {
      // Reset so the real mount (after Strict Mode cleanup) can start the stream
      startedRef.current = false;
      stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finalOutput = initialOutput ?? output;
  const finalSteps = initialThinkingSteps ?? thinkingSteps;
  // Treat idle as loading too — the effect fires async so there's a brief idle flash
  const isRunning = !initialOutput && (status === "running" || status === "idle");

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Deep Research</span>
        {isRunning && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Researching
          </Badge>
        )}
        {(status === "complete" || initialOutput) && (
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Complete
          </Badge>
        )}
        {status === "error" && <Badge variant="destructive" className="text-xs">Error</Badge>}
      </div>

      {/* Thinking steps */}
      {finalSteps.length > 0 && (
        <Collapsible open={thinkingOpen} onOpenChange={setThinkingOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
            <span>{finalSteps.length} thinking steps</span>
            {thinkingOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1.5 rounded-md border bg-muted/10 p-3">
              {finalSteps.map((step, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{step.summary}</span>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Output */}
      {isRunning && !finalOutput && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Conducting research on: {query}</span>
        </div>
      )}

      {finalOutput && (
        <div className={cn("rounded-md border bg-muted/30 p-4", isRunning && "opacity-80")}>
          <ResearchRenderer text={finalOutput} />
          {isRunning && (
            <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      )}
    </div>
  );
}
