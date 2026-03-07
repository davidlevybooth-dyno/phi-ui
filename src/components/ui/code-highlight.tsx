"use client";

import { useEffect, useRef, useState } from "react";
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
  const [html, setHtml] = useState<string | null>(null);
  const codeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    // "text" has no syntax rules — render as plain preformatted
    if (lang === "text") {
      setHtml(null);
      return;
    }
    getHighlighter().then((hl) => {
      if (cancelled) return;
      const rendered = hl.codeToHtml(code, {
        lang,
        themes: {
          light: "github-light",
          dark: "github-dark",
        },
      });
      setHtml(rendered);
    });
    return () => {
      cancelled = true;
    };
  }, [code, lang]);

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
      // shiki outputs inline background; override to transparent so our bg shows
      style={{ colorScheme: "light dark" }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
