/**
 * Shared inline markdown + LaTeX rendering utilities.
 * Used by plan-message.tsx and research-message.tsx.
 */
import React from "react";

export const LATEX_SYMBOLS: Record<string, string> = {
  alpha: "α", beta: "β", gamma: "γ", delta: "δ", epsilon: "ε",
  varepsilon: "ε", zeta: "ζ", eta: "η", theta: "θ", vartheta: "ϑ",
  iota: "ι", kappa: "κ", lambda: "λ", mu: "μ", nu: "ν",
  xi: "ξ", pi: "π", rho: "ρ", sigma: "σ", varsigma: "ς",
  tau: "τ", upsilon: "υ", phi: "φ", varphi: "φ", chi: "χ",
  psi: "ψ", omega: "ω",
  Gamma: "Γ", Delta: "Δ", Theta: "Θ", Lambda: "Λ", Xi: "Ξ",
  Pi: "Π", Sigma: "Σ", Upsilon: "Υ", Phi: "Φ", Psi: "Ψ", Omega: "Ω",
  approx: "≈", sim: "~", simeq: "≃", cong: "≅",
  neq: "≠", ne: "≠", geq: "≥", ge: "≥", leq: "≤", le: "≤",
  gg: "≫", ll: "≪", pm: "±", mp: "∓",
  times: "×", div: "÷", cdot: "·", cdots: "⋯", ldots: "…",
  AA: "Å", circ: "°", infty: "∞", partial: "∂", nabla: "∇",
  rightarrow: "→", leftarrow: "←", Rightarrow: "⇒", to: "→",
  sqrt: "√", sum: "∑", prod: "∏", int: "∫",
  forall: "∀", exists: "∃",
};

/** Convert LaTeX commands to Unicode (no React output). */
export function processLatexString(s: string): string {
  s = s.replace(/\\text\{([^}]*)\}/g, "$1");
  s = s.replace(/\\([A-Za-z]+)/g, (match, name: string) => LATEX_SYMBOLS[name] ?? match);
  return s;
}

/** Render a LaTeX math expression as React nodes with super/subscript support. */
export function renderMathContent(expr: string): React.ReactNode {
  const s = processLatexString(expr);
  const parts: React.ReactNode[] = [];
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

/** Render inline markdown: **bold**, *italic*, `code`, $math$, [link](url). */
export function renderInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
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

// ── Plan line parser ───────────────────────────────────────────────────────────

export type LineKind = "h1" | "h2" | "checkbox" | "numbered-checkbox" | "text" | "empty";

export interface ParsedLine {
  kind: LineKind;
  level?: number;
  checked?: boolean;
  index?: number;
  content: string;
}

export function parseLine(line: string): ParsedLine {
  if (line.startsWith("# ")) return { kind: "h1", content: line.slice(2) };
  if (line.startsWith("## ")) return { kind: "h2", content: line.slice(3) };
  if (line.startsWith("### ")) return { kind: "h2", level: 3, content: line.slice(4) };
  if (line.trim() === "") return { kind: "empty", content: "" };
  const numberedCheckbox = line.match(/^(\d+)\.\s*\[( |x)\]\s*(.*)/);
  if (numberedCheckbox) {
    return {
      kind: "numbered-checkbox",
      checked: numberedCheckbox[2] === "x",
      index: parseInt(numberedCheckbox[1]),
      content: numberedCheckbox[3],
    };
  }
  const checkbox = line.match(/^[-*]\s*\[( |x)\]\s*(.*)/);
  if (checkbox) {
    return { kind: "checkbox", checked: checkbox[1] === "x", content: checkbox[2] };
  }
  return { kind: "text", content: line };
}
