"use client";

import React, { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useResearchStream } from "@/hooks/use-research-agents";
import { cn } from "@/lib/utils";

// ── LaTeX symbol map ──────────────────────────────────────────────────────────

const LATEX_SYMBOLS: Record<string, string> = {
  // Greek lowercase
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
  xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", varsigma: "ς",
  tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ",
  psi: "ψ", omega: "ω",
  // Greek uppercase
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  // Relations & operators
  approx: "≈", sim: "~", simeq: "≃", cong: "≅",
  neq: "≠", ne: "≠", geq: "≥", ge: "≥", leq: "≤", le: "≤",
  gg: "≫", ll: "≪", pm: "±", mp: "∓",
  times: "×", div: "÷", cdot: "·", cdots: "⋯", ldots: "…",
  // Special symbols
  AA: "Å", circ: "°", infty: "∞", partial: "∂", nabla: "∇",
  rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", to: "→",
  sqrt: "√", sum: "∑", prod: "∏", int: "∫",
  forall: "∀", exists: "∃",
};

/** Convert LaTeX commands to Unicode (string-only, no React) */
function processLatexString(s: string): string {
  // \text{content} → content (handles nested \AA etc.)
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  // Named symbols
  s = s.replace(/\\([A-Za-z]+)/g, (match, name: string) => LATEX_SYMBOLS[name] ?? match);
  return s;
}

/** Render a math expression as React nodes (handles sub/sup after unicode conversion) */
function renderMathContent(expr: string): React.ReactNode {
  const s = processLatexString(expr);
  const parts: React.ReactNode[] = [];
  // Match ^{group}, _{group}, ^single-char, _single-char
  const pattern = /\^\{([^}]+)\}|_\{([^}]+)\}|\^([^\s_^{}\n])|_([^\s_^{}\n])/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
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

// ── Inline renderer (bold, italic, code, $math$) ──────────────────────────────

function renderInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  // Order matters: links before **, ** before *, $ separate
  const pattern = /(\[[^\]\n]+\]\([^)\n]+\)|\*\*[^*\n]+\*\*|`[^`\n]+`|\*[^*\n]+\*|\$[^$\n]+\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) segments.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("[")) {
      const labelEnd = tok.indexOf("]");
      const label = tok.slice(1, labelEnd);
      const href = tok.slice(labelEnd + 2, -1);
      segments.push(
        <a
          key={k++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 underline underline-offset-2 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 break-all"
        >
          {label}
        </a>
      );
    } else if (tok.startsWith("**")) {
      segments.push(
        <strong key={k++} className="font-semibold text-foreground">
          {tok.slice(2, -2)}
        </strong>
      );
    } else if (tok.startsWith("`")) {
      segments.push(
        <code key={k++} className="rounded bg-muted px-1 py-0.5 text-[0.8em] font-mono">
          {tok.slice(1, -1)}
        </code>
      );
    } else if (tok.startsWith("*")) {
      segments.push(<em key={k++}>{tok.slice(1, -1)}</em>);
    } else if (tok.startsWith("$")) {
      segments.push(
        <span key={k++} className="italic">
          {renderMathContent(tok.slice(1, -1))}
        </span>
      );
    }
    last = m.index + tok.length;
  }
  if (last < text.length) segments.push(text.slice(last));
  return segments.length === 0 ? text : <>{segments}</>;
}

// ── Table rendering ───────────────────────────────────────────────────────────

function isSeparatorRow(row: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(row.trim());
}

function parseTableCells(row: string): string[] {
  return row.trim().slice(1, -1).split("|").map((c) => c.trim());
}

function renderTable(rows: string[], key: string | number): React.ReactNode {
  const dataRows = rows.filter((r) => !isSeparatorRow(r));
  if (dataRows.length < 2) return null;
  const [headerRow, ...bodyRows] = dataRows;
  const headers = parseTableCells(headerRow);
  return (
    <div key={key} className="overflow-x-auto my-4 rounded border border-border/50">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="bg-muted/60 border-b border-border/50">
            {headers.map((h, i) => (
              <th key={i} className="px-3 py-2 text-left font-semibold text-foreground">
                {renderInline(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, ri) => (
            <tr key={ri} className={cn("border-b border-border/30 last:border-0", ri % 2 === 1 && "bg-muted/20")}>
              {parseTableCells(row).map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-muted-foreground">
                  {renderInline(cell)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── ResearchRenderer ──────────────────────────────────────────────────────────

export function ResearchRenderer({ text, compact }: { text: string; compact?: boolean }) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;
  let k = 0;
  const key = () => k++;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Table block — consume multiple lines ────────────────────────────────
    if (trimmed.startsWith("|")) {
      const tableRows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        tableRows.push(lines[i]);
        i++;
      }
      if (!compact) {
        const tbl = renderTable(tableRows, `tbl-${key()}`);
        if (tbl) elements.push(tbl);
      }
      continue;
    }

    i++; // advance past current line for all non-table cases

    // ── Headings ────────────────────────────────────────────────────────────
    if (trimmed.startsWith("# ")) {
      elements.push(
        compact ? (
          <div key={key()} className="font-semibold text-xs mt-2 mb-0.5 text-foreground">
            {renderInline(trimmed.slice(2))}
          </div>
        ) : (
          <h2 key={key()} className="text-xl font-bold mt-8 mb-4 first:mt-0 text-foreground tracking-tight">
            {renderInline(trimmed.slice(2))}
          </h2>
        )
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      elements.push(
        compact ? (
          <div key={key()} className="font-medium text-xs mt-1.5 mb-0.5 text-muted-foreground">
            {renderInline(trimmed.slice(3))}
          </div>
        ) : (
          <h3 key={key()} className="text-sm font-semibold mt-6 mb-2 pt-3 border-t border-border/40 text-foreground uppercase tracking-wider">
            {renderInline(trimmed.slice(3))}
          </h3>
        )
      );
      continue;
    }

    if (trimmed.startsWith("### ")) {
      elements.push(
        compact ? (
          <div key={key()} className="font-medium text-[10px] mt-1 mb-0.5 text-muted-foreground">
            {renderInline(trimmed.slice(4))}
          </div>
        ) : (
          <h4 key={key()} className="text-sm font-semibold mt-4 mb-1.5 text-foreground">
            {renderInline(trimmed.slice(4))}
          </h4>
        )
      );
      continue;
    }

    // ── Horizontal rule ──────────────────────────────────────────────────────
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      elements.push(<hr key={key()} className="my-5 border-border/40" />);
      continue;
    }

    // ── Numbered list ────────────────────────────────────────────────────────
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      elements.push(
        <div key={key()} className={cn("flex items-start gap-2", compact ? "py-0.5" : "py-1")}>
          <span className={cn(
            "shrink-0 font-medium tabular-nums text-muted-foreground",
            compact ? "text-[10px] min-w-[1rem]" : "text-xs min-w-[1.25rem]"
          )}>
            {numMatch[1]}.
          </span>
          <span className={cn("leading-relaxed text-muted-foreground", compact ? "text-[10px]" : "text-sm")}>
            {renderInline(numMatch[2])}
          </span>
        </div>
      );
      continue;
    }

    // ── Bullet list ──────────────────────────────────────────────────────────
    const bulletMatch = trimmed.match(/^[-*]\s+(.*)/);
    if (bulletMatch) {
      elements.push(
        <div key={key()} className={cn("flex items-start gap-2", compact ? "py-0.5" : "py-1")}>
          <span className={cn(
            "shrink-0 rounded-full bg-muted-foreground/40",
            compact ? "mt-[0.3rem] h-1 w-1" : "mt-[0.4rem] h-1.5 w-1.5"
          )} />
          <span className={cn("leading-relaxed text-muted-foreground", compact ? "text-[10px]" : "text-sm")}>
            {renderInline(bulletMatch[1])}
          </span>
        </div>
      );
      continue;
    }

    // ── Empty line ───────────────────────────────────────────────────────────
    if (trimmed === "") {
      elements.push(<div key={key()} className={compact ? "h-1" : "h-3"} />);
      continue;
    }

    // ── Paragraph ────────────────────────────────────────────────────────────
    elements.push(
      <p key={key()} className={cn(
        "leading-relaxed text-muted-foreground",
        compact ? "text-[10px]" : "text-sm"
      )}>
        {renderInline(trimmed)}
      </p>
    );
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// ── ResearchMessage component ─────────────────────────────────────────────────

interface ResearchMessageProps {
  query: string;
  /** When provided, renders completed research without streaming */
  initialOutput?: string;
  initialThinkingSteps?: Array<{ summary: string; timestamp: number }>;
  /**
   * Called when the first content chunk arrives (after thinking steps).
   * Use this to open the report panel — it will open with content already visible.
   */
  onReportStarted?: () => void;
  /**
   * Called with the full accumulated output on every content update.
   * When provided, output is streamed to the panel instead of rendered inline.
   */
  onReportReady?: (report: string) => void;
}

export function ResearchMessage({
  query,
  initialOutput,
  initialThinkingSteps,
  onReportStarted,
  onReportReady,
}: ResearchMessageProps) {
  const [thinkingOpen, setThinkingOpen] = React.useState(true);
  const { status, output, thinkingSteps, startResearch, stop } = useResearchStream();
  const startedRef = useRef(false);
  const reportOpenedRef = useRef(false);

  useEffect(() => {
    if (initialOutput || startedRef.current) return;
    startedRef.current = true;
    startResearch(query);
    return () => {
      startedRef.current = false;
      stop();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open the report panel only when the first content chunk arrives, so the
  // user sees thinking steps accumulating inline before the panel appears.
  // Both callbacks are invoked in the same effect tick so React batches the
  // state updates — the panel opens with content already visible, never empty.
  useEffect(() => {
    if (!output || !onReportReady) return;
    if (!reportOpenedRef.current) {
      reportOpenedRef.current = true;
      onReportStarted?.();
    }
    onReportReady(output);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [output]);

  const finalOutput = initialOutput ?? output;
  const finalSteps = initialThinkingSteps ?? thinkingSteps;
  const isRunning = !initialOutput && (status === "running" || status === "idle");
  // When a report panel is active, keep output out of the inline message.
  const showInlineOutput = !onReportReady;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 text-muted-foreground" />
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

      {/* Thinking steps — always shown inline; auto-expand while research is running */}
      {finalSteps.length > 0 && (
        <Collapsible open={thinkingOpen || isRunning} onOpenChange={setThinkingOpen}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground hover:bg-muted/50 transition-colors">
            <span>{finalSteps.length} thinking {finalSteps.length === 1 ? "step" : "steps"}</span>
            {thinkingOpen || isRunning ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-1 space-y-1.5 rounded-md border bg-muted/10 p-3">
              {finalSteps.map((step, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-300"
                  style={{
                    animationDelay: `${Math.min(idx * 60, 900)}ms`,
                    animationFillMode: "backwards",
                  }}
                >
                  <span className="font-mono text-[10px] text-muted-foreground/60 shrink-0 mt-0.5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="leading-relaxed">{renderInline(step.summary)}</span>
                </div>
              ))}
              {isRunning && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pl-6">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Researching…</span>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      {/* Loading state — shown when no thinking steps yet */}
      {isRunning && finalSteps.length === 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Conducting research on: {query}</span>
        </div>
      )}

      {/* Inline output — only rendered when not using a split panel */}
      {showInlineOutput && finalOutput && (
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
