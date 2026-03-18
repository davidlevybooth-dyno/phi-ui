"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { createHighlighter, type Highlighter } from "shiki";

export type Lang = "bash" | "python" | "json" | "text";

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ["github-light", "github-dark"],
      langs: ["bash", "python", "json"],
    });
  }
  return highlighterPromise;
}

interface CodeHighlightProps {
  code: string;
  lang: Lang;
  className?: string;
}

export function CodeHighlight({ code, lang, className }: CodeHighlightProps) {
  const { resolvedTheme } = useTheme();
  const [html, setHtml] = useState<string | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  // Re-highlight whenever code, lang, or resolved theme changes so dark/light
  // mode switches are reflected immediately without a remount.
  useEffect(() => {
    let cancelled = false;
    if (lang === "text") {
      setHtml(null);
      return;
    }
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const theme = resolvedTheme === "dark" ? "github-dark" : "github-light";
      const rendered = hl.codeToHtml(code, { lang, theme });
      setHtml(rendered);
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang, resolvedTheme]);

  if (!html) {
    // Outer element is the scroll container; inner code expands to content width.
    return (
      <div className={`overflow-x-auto rounded-md bg-muted ${className ?? ""}`}>
        <pre className="p-4 text-xs leading-relaxed font-mono w-max min-w-full">
          <code>{code}</code>
        </pre>
      </div>
    );
  }

  // Outer div is the scroll container. The injected Shiki <pre> can expand as
  // wide as it needs to; the outer div clips and scrolls it on mobile.
  return (
    <div
      className={`overflow-x-auto rounded-md text-xs leading-relaxed ${className ?? ""}`}
    >
      <div
        ref={codeRef}
        className="w-max min-w-full [&>pre]:p-4 [&>pre]:rounded-md"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
