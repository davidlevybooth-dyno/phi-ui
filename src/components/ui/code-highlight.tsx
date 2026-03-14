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
    return (
      <pre
        className={`overflow-x-auto rounded-md bg-muted p-4 text-xs leading-relaxed font-mono ${className ?? ""}`}
      >
        <code>{code}</code>
      </pre>
    );
  }

  return (
    <div
      ref={codeRef}
      className={`overflow-x-auto rounded-md text-xs leading-relaxed [&>pre]:p-4 [&>pre]:rounded-md [&>pre]:overflow-x-auto ${className ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
