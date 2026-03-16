import type { UIMessage } from "ai";

type MessagePart = UIMessage["parts"][number];

/** Extract plain text from AI SDK UIMessage parts. */
export function getTextFromParts(parts: MessagePart[] | undefined): string {
  if (!parts) return "";
  return parts
    .filter((p): p is Extract<MessagePart, { type: "text" }> => p.type === "text")
    .map((p) => p.text)
    .join("");
}
