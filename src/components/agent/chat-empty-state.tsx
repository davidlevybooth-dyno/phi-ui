"use client";

import type { AgentMode } from "@/hooks/use-chat-sessions";

export const MODE_EXAMPLES: Record<AgentMode, string[]> = {
  plan: [
    "Design binders against PDL1",
    "Optimize a nanobody scaffold for IL-7Ra binding",
    "Filter RFDiffusion3 binders for InsulinR",
  ],
  research: [
    "What are the best epitopes on EGFR for binder design?",
    "What metrics best predict experimental binding success?",
    "What is known about PD-L1 structural dynamics?",
  ],
  chat: [
    "Explain the difference between ipTM and ipSAE",
    "What pLDDT threshold should I use for filtering?",
    "How do I interpret RMSD values in my results?",
  ],
};

interface ChatEmptyStateProps {
  mode: AgentMode;
  onExample: (text: string) => void;
}

export function ChatEmptyState({ mode, onExample }: ChatEmptyStateProps) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {MODE_EXAMPLES[mode].map((ex) => (
        <button
          key={ex}
          onClick={() => onExample(ex)}
          className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors cursor-pointer"
        >
          {ex}
        </button>
      ))}
    </div>
  );
}
