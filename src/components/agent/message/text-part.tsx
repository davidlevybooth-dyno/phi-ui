"use client";

interface TextPartProps {
  text: string;
}

export function TextPart({ text }: TextPartProps) {
  return (
    <div className="prose prose-sm max-w-none dark:prose-invert text-sm leading-relaxed whitespace-pre-wrap">
      {text}
    </div>
  );
}
