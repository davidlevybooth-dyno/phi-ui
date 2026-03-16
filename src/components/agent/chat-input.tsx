"use client";

import React, { useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Square, Search, MessageSquare, ClipboardList, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentMode } from "@/hooks/use-chat-sessions";

interface ChatInputProps {
  mode: AgentMode;
  onModeChange: (mode: AgentMode) => void;
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
  /** When provided, shows remaining counts per mode and blocks if 0 */
  rateLimits?: Partial<Record<AgentMode, number>>;
  /** Suppress border-t and backdrop styling — use when rendering inline (centered empty state) */
  noBorder?: boolean;
  /** Initial visible rows for the textarea (default 1) */
  rows?: number;
}

const MODES: { value: AgentMode; label: string; icon: typeof MessageSquare }[] = [
  { value: "plan", label: "Plan", icon: ClipboardList },
  { value: "research", label: "Research", icon: Search },
  { value: "chat", label: "Chat", icon: MessageSquare },
];

const PLACEHOLDERS: Record<AgentMode, string> = {
  plan: "Describe a protein design task to plan…",
  research: "Ask a deep research question about protein design…",
  chat: "Ask anything about protein design, scoring, or the platform…",
};

export function ChatInput({
  mode,
  onModeChange,
  onSend,
  onStop,
  isStreaming,
  disabled = false,
  placeholder,
  rateLimits,
  noBorder = false,
  rows = 1,
}: ChatInputProps) {
  const [input, setInput] = React.useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const remaining = rateLimits?.[mode];
  const isRateLimited = remaining !== undefined && remaining <= 0;
  const canSend = !isStreaming && !disabled && !isRateLimited && input.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(input.trim());
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className={noBorder ? undefined : "border-t bg-background/95 backdrop-blur-sm"}>
      <div className="max-w-2xl mx-auto px-4 pt-4 pb-3 space-y-3">
        {/* Input row */}
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? PLACEHOLDERS[mode]}
            disabled={isStreaming || disabled || isRateLimited}
            className="min-h-[80px] max-h-[300px] resize-none text-sm leading-relaxed"
            rows={rows}
          />
          {isStreaming ? (
            <Button type="button" size="icon" variant="outline" onClick={onStop} className="shrink-0">
              <Square className="h-4 w-4" />
              <span className="sr-only">Stop</span>
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={!canSend}
              className="shrink-0"
            >
              {isRateLimited ? <Lock className="h-4 w-4" /> : <Send className="h-4 w-4" />}
              <span className="sr-only">Send</span>
            </Button>
          )}
        </div>

        {/* Mode toggle row */}
        <div className="flex items-center justify-between">
          <div className="inline-flex items-center rounded-full border bg-muted/50 p-0.5">
            {MODES.map(({ value, label, icon: Icon }) => {
              const modeRemaining = rateLimits?.[value];
              const limited = modeRemaining !== undefined && modeRemaining <= 0;
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onModeChange(value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                    mode === value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                    limited && "opacity-50"
                  )}
                >
                  <Icon className="h-3 w-3" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
          <span className="text-[11px] text-muted-foreground">
            Enter to send · Shift+Enter for newline
          </span>
        </div>

        {isRateLimited && (
          <div className="rounded-md bg-muted/50 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="h-3 w-3 shrink-0" />
            <span>
              You&apos;ve reached the limit for <strong>{mode}</strong> mode in this session.{" "}
              <a href="/waitlist" className="underline text-foreground hover:text-foreground/80">
                Sign in
              </a>{" "}
              for unlimited access.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
