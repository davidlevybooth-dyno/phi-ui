"use client";

import { TextPart } from "./text-part";
import { PlanMessage } from "./plan-message";
import { ResearchMessage } from "./research-message";

export interface AssistantMessagePart {
  type: "text" | "plan" | "research";
  text?: string;
  query?: string;
  initialPlanText?: string;
  initialOutput?: string;
  initialThinkingSteps?: Array<{ summary: string; timestamp: number }>;
}

interface AssistantMessageProps {
  parts?: AssistantMessagePart[];
  content?: string;
}

export function AssistantMessage({ parts, content }: AssistantMessageProps) {
  if (parts && parts.length > 0) {
    return (
      <div className="space-y-3 max-w-[90%]">
        {parts.map((part, i) => {
          if (part.type === "plan" && part.query) {
            return (
              <PlanMessage
                key={i}
                query={part.query}
                initialPlanText={part.initialPlanText}
              />
            );
          }
          if (part.type === "research" && part.query) {
            return (
              <ResearchMessage
                key={i}
                query={part.query}
                initialOutput={part.initialOutput}
                initialThinkingSteps={part.initialThinkingSteps}
              />
            );
          }
          if (part.type === "text" && part.text) {
            return <TextPart key={i} text={part.text} />;
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <div className="max-w-[90%]">
      <TextPart text={content ?? ""} />
    </div>
  );
}
