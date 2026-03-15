/**
 * Plan Streaming API
 * POST /api/agent/plan/stream
 *
 * Streams a structured computational biology plan via SSE.
 * Uses Google Gemini to generate the plan with research questions,
 * computational primitives, and additional context.
 *
 * Returns SSE events: ready, status, text, section, complete, error, ping
 */
import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

const PLAN_SYSTEM_PROMPT = `You are a computational biology planning agent specializing in protein design, structural biology, and computational workflows.

Your role is to help users plan computational biology experiments by creating structured plans with:
1. Research Questions - what background information is needed
2. Computational Primitives - discrete actionable steps describing WHAT needs to be done (not which tools to use)
3. Additional Context - biological context, constraints, considerations

IMPORTANT: Do NOT specify exact tools, software, or methods in the Computational Primitives. Describe the computational intent only (e.g., "Generate binder backbone scaffolds" not "Run RFdiffusion").

## Output Format

Structure your plan as:

# [Descriptive Plan Title]

## Research Questions
- [ ] Question 1 (why this matters for the design)
- [ ] Question 2 (what information is needed)

## Computational Primitives
1. [ ] Step 1: [Computational action — describe WHAT, not HOW]
2. [ ] Step 2: [Computational action — describe WHAT, not HOW]
3. [ ] Step 3: [Computational action — describe WHAT, not HOW]

## Additional Context
[Relevant biological context, constraints, quality thresholds, and considerations]

Be specific: use exact PDB IDs, UniProt IDs, numerical thresholds, and quality criteria where known.`;

export async function POST(request: NextRequest) {
  try {
    let query: string;
    let autoResearch: boolean;
    try {
      const body = await request.json();
      query = body.query;
      autoResearch = body.autoResearch ?? false;
    } catch {
      // Aborted requests (e.g. React Strict Mode cleanup) arrive with an empty body
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!query) {
      return new Response(JSON.stringify({ error: "query is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    let eventCounter = 0;
    let shouldStop = false;

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          if (shouldStop) return;
          try {
            eventCounter++;
            const payload = `id: ${eventCounter}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(payload));
          } catch {
            shouldStop = true;
          }
        };

        send("ready", { status: "connected" });

        const pingInterval = setInterval(() => {
          if (!shouldStop) send("ping", { timestamp: Date.now() });
        }, 15000);

        request.signal.addEventListener("abort", () => {
          shouldStop = true;
          clearInterval(pingInterval);
          try { controller.close(); } catch {}
        });

        try {
          send("status", { status: "planning" });

          const promptSuffix = autoResearch
            ? `\n\nIMPORTANT: Generate ONLY the plan title and research questions. Do NOT generate computational primitives — they will be generated after research is complete.\n\nOutput format:\n# [Plan Title]\n\n## Research Questions\n- [ ] Question 1\n- [ ] Question 2\n`
            : "";

          const fullPrompt = `${PLAN_SYSTEM_PROMPT}${promptSuffix}\n\n## User Request\n\n${query}\n\nAnalyze the user's request and generate a detailed computational biology experiment plan.`;

          const result = streamText({
            model: google("gemini-3-flash-preview"),
            prompt: fullPrompt,
            abortSignal: request.signal,
          });

          let fullText = "";
          let currentSection = "";

          for await (const textPart of result.textStream) {
            if (shouldStop) break;
            if (!textPart) continue;

            fullText += textPart;
            send("text", { text: textPart, currentSection });

            if (textPart.includes("## Research Questions")) {
              currentSection = "research_questions";
              send("section", { section: "research_questions" });
            } else if (textPart.includes("## Computational Primitives")) {
              currentSection = "primitives";
              send("section", { section: "primitives" });
            } else if (textPart.includes("## Additional Context")) {
              currentSection = "context";
              send("section", { section: "context" });
            }
          }

          if (!shouldStop) {
            send("complete", { status: "complete", fullText });
          }
        } catch (error) {
          if (!shouldStop) {
            console.error("[agent/plan/stream] error:", error);
            send("error", { error: error instanceof Error ? error.message : "Unknown error" });
          }
        } finally {
          clearInterval(pingInterval);
          shouldStop = true;
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[agent/plan/stream] top-level error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start plan stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
