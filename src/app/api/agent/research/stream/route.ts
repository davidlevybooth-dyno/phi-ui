/**
 * Research Streaming API
 * POST /api/agent/research/stream
 *
 * Streams a grounded deep research response via SSE.
 * Uses Gemini 3 Flash Preview with Google Search grounding for real web research.
 *
 * Returns SSE events: status, thinking (search queries), content (text delta), complete, error
 */
import { NextRequest } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 300;

const RESEARCH_SYSTEM_PROMPT = `You are a deep research assistant specializing in computational biology, protein design, and structural biology.

When given a research question, search the web thoroughly and synthesize your findings into a comprehensive research report.

Structure your response with:

# [Research Title]

## Key Findings
[Bullet-point summary of the most important findings]

## Background
[Relevant biological and structural context]

## Detailed Analysis
[In-depth discussion of mechanisms, data, and experimental findings]

## Implications for Protein Design
[Specific insights relevant to computational protein design, binder design, or related applications]

Be specific: cite PDB IDs, UniProt accessions, numerical thresholds, and experimental data where available.`;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

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
            controller.enqueue(
              encoder.encode(`id: ${eventCounter}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
            );
          } catch {
            shouldStop = true;
          }
        };

        request.signal.addEventListener("abort", () => {
          shouldStop = true;
          try { controller.close(); } catch {}
        });

        try {
          send("status", { status: "researching" });

          const result = streamText({
            model: google("gemini-3-flash-preview"),
            system: RESEARCH_SYSTEM_PROMPT,
            prompt: query,
            tools: {
              googleSearch: google.tools.googleSearch({}),
            },
            abortSignal: request.signal,
          });

          let fullText = "";

          for await (const textPart of result.textStream) {
            if (shouldStop) break;
            if (!textPart) continue;

            fullText += textPart;
            send("content", { text: textPart, fullText });
          }

          if (!shouldStop) {
            send("complete", { status: "complete", finalText: fullText });
          }
        } catch (error) {
          if (!shouldStop) {
            console.error("[agent/research/stream] error:", error);
            send("error", { error: error instanceof Error ? error.message : "Unknown error" });
          }
        } finally {
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
    console.error("[agent/research/stream] top-level error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to start research stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
