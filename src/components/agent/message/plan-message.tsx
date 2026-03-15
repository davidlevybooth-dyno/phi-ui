"use client";

import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Route, ClipboardList, XCircle,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { WorkflowGraph, type WorkflowSpec } from "@/components/agent/workflow-graph";
import { usePlanStream } from "@/hooks/use-plan-stream";
import { useModalResearch, type ResearchArtifact } from "@/hooks/use-modal-research";
import { ResearchRenderer } from "@/components/agent/message/research-message";
import { cn } from "@/lib/utils";

interface PlanMessageProps {
  query: string;
  /** When provided, renders a completed plan without streaming */
  initialPlanText?: string;
}

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

type LineKind = "h1" | "h2" | "checkbox" | "numbered-checkbox" | "text" | "empty";

interface ParsedLine {
  kind: LineKind;
  level?: number;
  checked?: boolean;
  index?: number;
  content: string;
}

function parseLine(line: string): ParsedLine {
  if (line.startsWith("# ")) return { kind: "h1", content: line.slice(2) };
  if (line.startsWith("## ")) return { kind: "h2", content: line.slice(3) };
  if (line.startsWith("### ")) return { kind: "h2", level: 3, content: line.slice(4) };
  if (line.trim() === "") return { kind: "empty", content: "" };
  const numberedCheckbox = line.match(/^(\d+)\.\s*\[( |x)\]\s*(.*)/);
  if (numberedCheckbox) {
    return { kind: "numbered-checkbox", checked: numberedCheckbox[2] === "x", index: parseInt(numberedCheckbox[1]), content: numberedCheckbox[3] };
  }
  const checkbox = line.match(/^[-*]\s*\[( |x)\]\s*(.*)/);
  if (checkbox) {
    return { kind: "checkbox", checked: checkbox[1] === "x", content: checkbox[2] };
  }
  return { kind: "text", content: line };
}

// ── Research question item — exact structure-design style ─────────────────────

interface ResearchQuestionItemProps {
  question: string;
  artifact?: ResearchArtifact;
  isResearching: boolean;
}

function ResearchQuestionItem({ question, artifact, isResearching }: ResearchQuestionItemProps) {
  const [open, setOpen] = useState(false);
  const status = artifact?.status ?? "pending";
  const hasAnswer = (artifact?.answer?.length ?? 0) > 0;

  const icon =
    status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0 mt-0.5" /> :
    status === "failed"    ? <XCircle className="h-3.5 w-3.5 text-red-600 shrink-0 mt-0.5" /> :
    status === "streaming" ? <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin shrink-0 mt-0.5" /> :
    isResearching          ? <Loader2 className="h-3.5 w-3.5 text-muted-foreground/40 animate-spin shrink-0 mt-0.5" /> :
                             <div className="h-3.5 w-3.5 shrink-0 mt-0.5 rounded-full border border-muted-foreground/30" />;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className="group">
        <CollapsibleTrigger className="w-full text-left">
          <div className="flex items-start gap-2 py-1.5 hover:bg-muted/30 rounded px-2 -mx-2 transition-colors">
            {icon}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm">{renderInline(question)}</span>
                {artifact && artifact.toolCalls.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {artifact.toolCalls.length} tools
                  </Badge>
                )}
                {artifact && artifact.turnCount > 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1">
                    {artifact.turnCount} turns
                  </Badge>
                )}
              </div>
            </div>
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 shrink-0 transition-transform text-muted-foreground mt-0.5",
                open && "rotate-90"
              )}
            />
          </div>
        </CollapsibleTrigger>

        {hasAnswer && (
          <CollapsibleContent>
            <div className="ml-6 mt-2 mb-2 text-xs text-muted-foreground space-y-2 border-l-2 border-muted pl-3">
              <ResearchRenderer text={artifact!.answer} compact />
              {artifact!.status === "streaming" && (
                <span className="inline-block w-1.5 h-3 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
              )}
              {artifact!.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {artifact!.toolCalls.map((tool, i) => (
                    <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1">
                      {tool}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        )}

        {/* Streaming but no text yet */}
        {!hasAnswer && status === "streaming" && (
          <div className="ml-6 mt-1 mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Researching…</span>
          </div>
        )}
      </div>
    </Collapsible>
  );
}

// ── Plan renderer ─────────────────────────────────────────────────────────────

interface PlanRendererProps {
  text: string;
  artifacts?: ResearchArtifact[];
  isResearching?: boolean;
}

function PlanRenderer({ text, artifacts = [], isResearching = false }: PlanRendererProps) {
  const lines = text.split("\n");
  // These are mutated during the map — intentional linear scan
  let inResearchSection = false;
  let researchIdx = 0;

  return (
    <div className="space-y-0.5 text-sm">
      {lines.map((line, i) => {
        const parsed = parseLine(line);

        // Track section transitions
        if (parsed.kind === "h2") {
          inResearchSection = parsed.content.trim() === "Research Questions";
          if (inResearchSection) researchIdx = 0;
        }

        if (parsed.kind === "h1") {
          return (
            <h2 key={i} className="font-semibold text-base mt-2 mb-1 first:mt-0">
              {renderInline(parsed.content)}
            </h2>
          );
        }
        if (parsed.kind === "h2") {
          return (
            <h3 key={i} className={cn("font-medium mt-4 mb-1.5 first:mt-0", parsed.level === 3 ? "text-sm text-muted-foreground" : "text-sm")}>
              {renderInline(parsed.content)}
            </h3>
          );
        }

        // Research questions rendered inline with live artifact data
        if (parsed.kind === "checkbox" && inResearchSection) {
          const artifact = artifacts[researchIdx];
          researchIdx++;
          const question = parsed.content.replace(/\*\*/g, "").replace(/`/g, "").replace(/\*/g, "").trim();
          return (
            <ResearchQuestionItem
              key={i}
              question={question}
              artifact={artifact}
              isResearching={isResearching}
            />
          );
        }

        // All other checkboxes (Computational Primitives etc.)
        if (parsed.kind === "checkbox" || parsed.kind === "numbered-checkbox") {
          return (
            <div key={i} className="flex items-start gap-2 py-0.5">
              <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border">
                {parsed.checked && <CheckCircle2 className="h-3 w-3 text-primary" />}
              </div>
              <span className={cn("leading-relaxed", parsed.checked && "line-through text-muted-foreground")}>
                {parsed.kind === "numbered-checkbox" && (
                  <span className="text-muted-foreground mr-1">{parsed.index}.</span>
                )}
                {renderInline(parsed.content)}
              </span>
            </div>
          );
        }

        if (parsed.kind === "empty") return <div key={i} className="h-2" />;

        return (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {renderInline(parsed.content)}
          </p>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseResearchQuestions(text: string): string[] {
  const questions: string[] = [];
  let inSection = false;
  for (const line of text.split("\n")) {
    if (line.startsWith("## Research Questions")) { inSection = true; continue; }
    if (line.startsWith("## ") && inSection) break;
    if (!inSection) continue;
    const match = line.match(/^[-*]\s*\[[ x]\]\s*(.*)/);
    if (match) {
      const clean = match[1].trim().replace(/\*\*/g, "").replace(/`/g, "").replace(/\*/g, "");
      if (clean) questions.push(clean);
    }
  }
  return questions;
}

function extractWorkflowSpec(text: string): WorkflowSpec | null {
  const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?"nodes"\s*:[\s\S]*?"edges"\s*:[\s\S]*?\})\s*```/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[1]);
    if (parsed && typeof parsed.name === "string" && Array.isArray(parsed.nodes) && Array.isArray(parsed.edges)) {
      return parsed as WorkflowSpec;
    }
  } catch {}
  return null;
}

// ── PlanMessage ───────────────────────────────────────────────────────────────

export function PlanMessage({ query, initialPlanText }: PlanMessageProps) {
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const { status, text, startPlan, stop } = usePlanStream();
  const { artifacts, isResearching, startResearch: startModalResearch } = useModalResearch();
  const startedRef = useRef(false);
  const researchStartedRef = useRef(false);

  useEffect(() => {
    if (initialPlanText || startedRef.current) return;
    startedRef.current = true;
    startPlan(query);
    return () => {
      startedRef.current = false;
      stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planText = initialPlanText ?? text;
  const isStreaming = !initialPlanText && (status === "planning" || status === "idle");
  const isError = status === "error";
  const workflowSpec = extractWorkflowSpec(planText);

  // Auto-start Modal research when plan generation completes
  useEffect(() => {
    if (status !== "complete" || researchStartedRef.current || initialPlanText) return;
    const questions = parseResearchQuestions(planText);
    if (questions.length === 0) return;
    researchStartedRef.current = true;
    startModalResearch(questions, planText);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Plan</span>
        {isStreaming && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Planning
          </Badge>
        )}
        {isResearching && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Researching
          </Badge>
        )}
        {!isStreaming && !isResearching && (status === "complete" || initialPlanText) && (
          <Badge variant="outline" className="text-xs gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            Complete
          </Badge>
        )}
        {isError && <Badge variant="destructive" className="text-xs">Error</Badge>}
      </div>

      {/* Plan text — research questions rendered inline */}
      {planText && (
        <div className="rounded-md border bg-muted/30 p-4">
          <PlanRenderer text={planText} artifacts={artifacts} isResearching={isResearching} />
          {isStreaming && (
            <span className="inline-block w-1.5 h-4 bg-foreground/70 animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
      )}

      {/* Workflow graph */}
      {workflowSpec && workflowSpec.nodes.length > 0 && (
        <Collapsible open={workflowOpen} onOpenChange={setWorkflowOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-sm font-medium hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-2">
              <Route className="h-3.5 w-3.5" />
              <span>Workflow graph</span>
              <Badge variant="outline" className="text-xs">{workflowSpec.nodes.length} steps</Badge>
            </div>
            {workflowOpen
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            }
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1">
              <WorkflowGraph spec={workflowSpec} height={420} />
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
