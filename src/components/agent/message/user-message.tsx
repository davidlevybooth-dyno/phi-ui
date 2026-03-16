"use client";

interface UserMessageProps {
  content: string;
}

export function UserMessage({ content }: UserMessageProps) {
  return (
    <div className="flex justify-end mb-2">
      <div className="max-w-[85%] bg-accent/10 rounded-2xl px-4 py-3">
        <div className="text-xs text-muted-foreground mb-1.5">You</div>
        <p className="text-sm leading-relaxed">{content}</p>
      </div>
    </div>
  );
}
