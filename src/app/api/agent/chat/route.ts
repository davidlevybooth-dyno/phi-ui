import { convertToModelMessages, streamText, createIdGenerator } from "ai";
import { anthropic } from "@ai-sdk/anthropic";

export const maxDuration = 60;

const SYSTEM_PROMPT = `You are a helpful protein design assistant for Dyno's Phi platform. You help computational scientists and biopharma researchers with:

- Protein binder design and evaluation
- Structure prediction and analysis
- Scoring and filtering design candidates
- Interpreting computational metrics (pLDDT, ipTM, RMSD, ipSAE, etc.)
- Understanding protein engineering workflows

Be concise, accurate, and practical. When discussing design results, reference specific metrics. When appropriate, suggest next steps or analyses using the Dyno Phi platform.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages array required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = streamText({
      model: anthropic("claude-haiku-4-5-20251001"),
      system: SYSTEM_PROMPT,
      messages: await convertToModelMessages(messages),
    });

    result.consumeStream();

    return result.toUIMessageStreamResponse({
      originalMessages: messages,
      generateMessageId: createIdGenerator({ prefix: "msg", size: 16 }),
    });
  } catch (error) {
    console.error("[agent/chat] error:", error);
    return new Response(JSON.stringify({ error: "Failed to process chat request" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
