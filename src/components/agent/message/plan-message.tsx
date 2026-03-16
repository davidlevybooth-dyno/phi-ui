"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSessionStore } from "@/lib/stores/auth-store";
import { planWorkflow, planWorkflowPublic } from "@/lib/api/workflows";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, CheckCircle2, ChevronDown, ChevronUp, ChevronRight, Route, ClipboardList, XCircle, Workflow, Info,
} from "lucide-react";
import Link from "next/link";
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
  /** Called as soon as report generation starts (open panel in loading state) */
  onReportStarted?: () => void;
  /** Called once the research report has been generated */
  onReportReady?: (report: string) => void;
}

// ── Shared math + inline rendering ───────────────────────────────────────────

const LATEX_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
  xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", tau: "τ",
  upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ", psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  approx: "≈", sim: "~", simeq: "≃", neq: "≠",
  geq: "≥", ge: "≥", leq: "≤", le: "≤",
  pm: "±", times: "×", cdot: "·", ldots: "…",
  AA: "Å", circ: "°", infty: "∞", partial: "∂",
  rightarrow: "→", leftarrow: "←", to: "→",
};

function processLatexString(s: string): string {
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\([A-Za-z]+)/g, (m, name: string) => LATEX_SYMBOLS[name] ?? m);
  return s;
}

function renderMathContent(expr: string): React.ReactNode {
  const s = processLatexString(expr);
  const parts: React.ReactNode[] = [];
  const pattern = /\^\{([^}]+)\}|_\{([^}]+)\}|\^([^\s_^{}\n])|_([^\s_^{}\n])/g;
  let last = 0; let m: RegExpExecArray | null; let k = 0;
  while ((m = pattern.exec(s)) !== null) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    if (m[1] !== undefined) parts.push(<sup key={k++}>{m[1]}</sup>);
    else if (m[2] !== undefined) parts.push(<sub key={k++}>{m[2]}</sub>);
    else if (m[3] !== undefined) parts.push(<sup key={k++}>{m[3]}</sup>);
    else if (m[4] !== undefined) parts.push(<sub key={k++}>{m[4]}</sub>);
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.length === 0 ? "" : parts.length === 1 ? parts[0] : <>{parts}</>;
}

/** Render inline markdown + LaTeX math: **bold**, *italic*, `code`, $math$ */
function renderInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  const pattern = /(\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|\$[^$\n]+\$)/g;
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
    } else if (token.startsWith("*")) {
      segments.push(<em key={key++}>{token.slice(1, -1)}</em>);
    } else if (token.startsWith("$")) {
      segments.push(<span key={key++} className="italic">{renderMathContent(token.slice(1, -1))}</span>);
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
                {/* "Starting remote agent…" — shown only before any data arrives */}
                {artifact && (status === "pending" || status === "streaming") &&
                  artifact.toolCalls.length === 0 && artifact.turnCount === 0 && (
                  <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-1 text-muted-foreground animate-pulse">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                    Starting remote agent…
                  </Badge>
                )}
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

function extractComputationalPrimitives(planText: string): string {
  const match = planText.match(/## Computational Primitives([\s\S]*?)(?=\n## |\n# |$)/);
  return match ? match[0].trim() : planText.slice(0, 2000);
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

export function PlanMessage({ query, initialPlanText, onReportStarted, onReportReady }: PlanMessageProps) {
  const [workflowOpen, setWorkflowOpen] = useState(true);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [workflowGenerating, setWorkflowGenerating] = useState(false);
  const [apiWorkflowSpec, setApiWorkflowSpec] = useState<WorkflowSpec | null>(null);
  const [researchComplete, setResearchComplete] = useState(false);

  const onReportReadyRef = useRef(onReportReady);
  onReportReadyRef.current = onReportReady;
  const onReportStartedRef = useRef(onReportStarted);
  onReportStartedRef.current = onReportStarted;
  // Prevents onAllComplete from firing report/workflow generation more than once
  // per PlanMessage instance (guards against Strict Mode double-invocation).
  const postResearchFiredRef = useRef(false);

  // Workflow is only available for authenticated users (dashboard).
  // On the public agent page apiKey is null — we skip gracefully.
  const apiKey = useSessionStore((s) => s.apiKey);

  const { status, text, startPlan, stop } = usePlanStream();

  // Always holds the latest plan text — safe to close over in async callbacks
  const planTextRef = useRef(initialPlanText ?? text);
  planTextRef.current = initialPlanText ?? text;

  // ── Shared workflow generation logic (used by auto-trigger + manual button) ─
  // Authenticated users hit /plan (saves to DB); public users hit /plan/public.
  const triggerWorkflow = useCallback(async () => {
    setWorkflowGenerating(true);
    try {
      const primitives = extractComputationalPrimitives(planTextRef.current);
      const body = {
        prompt: primitives,
        disable_auto_recommendations: false,
        auto_publish: false,
        execute_immediately: false,
      };
      const isAuthenticated = Boolean(useSessionStore.getState().apiKey);
      const raw = isAuthenticated
        ? await planWorkflow(body)
        : await planWorkflowPublic(body);
      const spec = raw.spec as WorkflowSpec | undefined;
      if (spec && Array.isArray(spec.nodes) && spec.nodes.length > 0) {
        setApiWorkflowSpec(spec);
      } else {
        console.warn("[PlanMessage] workflow returned no usable spec:", raw);
      }
    } catch (err) {
      console.error("[PlanMessage] workflow generation failed:", err);
    } finally {
      setWorkflowGenerating(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep a stable ref so onAllComplete can always call the latest version
  const triggerWorkflowRef = useRef(triggerWorkflow);
  triggerWorkflowRef.current = triggerWorkflow;

  const { artifacts, isResearching, startResearch: startModalResearch } = useModalResearch({
    onAllComplete: (completedArtifacts) => {
      // Always mark research as complete so the manual button can appear,
      // even if Strict Mode fires this callback more than once.
      setResearchComplete(true);

      if (postResearchFiredRef.current) return;
      postResearchFiredRef.current = true;

      const withAnswers = completedArtifacts.filter((a) => a.answer && a.status === "completed");

      // ── Report: stream text progressively into the panel ────────────
      if (withAnswers.length > 0) {
        onReportStartedRef.current?.();
        ;(async () => {
          setReportGenerating(true);
          try {
            const res = await fetch("/api/agent/report", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                artifacts: withAnswers.map((a) => ({
                  question: a.question,
                  answer: a.answer,
                  toolCalls: a.toolCalls,
                  turnCount: a.turnCount,
                })),
                planText: planTextRef.current,
              }),
            });
            if (!res.ok || !res.body) throw new Error("Report generation failed");
            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += decoder.decode(value, { stream: true });
              onReportReadyRef.current?.(accumulated);
            }
          } catch (err) {
            console.error("[PlanMessage] report generation failed:", err);
          } finally {
            setReportGenerating(false);
          }
        })();
      }

      // ── Workflow: auto-trigger via stable ref ────────────────────────
      void triggerWorkflowRef.current();
    },
  });
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
  // Prefer the live API spec; fall back to any JSON block embedded in the plan text
  const workflowSpec = apiWorkflowSpec ?? extractWorkflowSpec(planText);

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
        {reportGenerating && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating report…
          </Badge>
        )}
        {workflowGenerating && (
          <Badge variant="secondary" className="gap-1 text-xs">
            <Loader2 className="h-3 w-3 animate-spin" />
            Generating workflow…
          </Badge>
        )}
        {!isStreaming && !isResearching && !reportGenerating && !workflowGenerating && (status === "complete" || initialPlanText) && (
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

      {/* Generate workflow button — available for all users after research completes */}
      {researchComplete && !workflowSpec && !workflowGenerating && (
        <button
          onClick={() => void triggerWorkflow()}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-dashed border-muted-foreground/30 rounded px-2.5 py-1 hover:border-muted-foreground/60"
        >
          <Workflow className="h-3 w-3" />
          Generate workflow
        </button>
      )}

      {/* Workflow graph */}
      {workflowSpec && workflowSpec.nodes.length > 0 && (
        <>
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
          {/* Nudge unauthenticated users to sign in to run/save */}
          {!apiKey && (
            <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs dark:border-blue-800 dark:bg-blue-950/20">
              <Info className="size-3 shrink-0 text-blue-400" />
              <span className="text-blue-700 dark:text-blue-200">
                <Link href="/login" className="font-medium underline underline-offset-2 hover:no-underline">Sign in</Link>
                {" "}to run and save this workflow.
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
