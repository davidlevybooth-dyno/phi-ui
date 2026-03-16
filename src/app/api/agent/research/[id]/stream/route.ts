/**
 * Research Reconnect API
 * GET /api/agent/research/[id]/stream?lastEventId=GOOGLE_EVENT_ID
 *
 * Reconnects to an existing deep research interaction from a specific event ID.
 * Used when the initial /start stream is interrupted mid-research.
 *
 * lastEventId must be Google's actual event_id (from the SSE id: field of the
 * initial stream). Google resumes the stream from after that event, so the
 * client receives only new events — no deduplication needed.
 *
 * Omit lastEventId to replay the entire stream from the beginning.
 *
 * SSE events emitted: start, thinking, content, complete, error
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 300;

type ResearchChunk = {
  event_type?: string;
  event_id?: string;
  interaction?: { id: string };
  delta?: {
    type?: string;
    text?: string;
    content?: { text?: string };
  };
  error?: { message?: string };
};

type InteractionsClient = {
  interactions: {
    get: (id: string, opts?: Record<string, unknown>) => Promise<AsyncIterable<ResearchChunk>>;
  };
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interactionId } = await params;
  // lastEventId is Google's actual event_id from the prior stream — not an internal counter.
  const lastEventId = request.nextUrl.searchParams.get("lastEventId") ?? undefined;

  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // 10-minute timeout covers the longest expected deep research runs.
    // Do NOT use 0 here — the SDK passes timeout/1000 as a request header,
    // so 0 means "timeout in 0 seconds" (immediate failure).
    const client = new GoogleGenAI({ apiKey, httpOptions: { timeout: 600_000 } });
    const interactions = (client as unknown as InteractionsClient).interactions;

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let closed = false;

        const send = (event: string, data: unknown, googleEventId?: string) => {
          if (closed) return;
          try {
            let msg = "";
            if (googleEventId) msg += `id: ${googleEventId}\n`;
            msg += `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
            controller.enqueue(encoder.encode(msg));
          } catch {
            closed = true;
          }
        };

        request.signal.addEventListener("abort", () => {
          closed = true;
          try { controller.close(); } catch {}
        });

        try {
          const researchStream = await interactions.get(interactionId, {
            stream: true,
            last_event_id: lastEventId,
          });

          let fullText = "";
          const thinkingSteps: Array<{ summary: string; timestamp: number }> = [];

          for await (const chunk of researchStream) {
            if (closed) break;

            const googleEventId = chunk.event_id;

            if (chunk.event_type === "interaction.start") {
              send("start", { interactionId: chunk.interaction?.id }, googleEventId);
            } else if (chunk.event_type === "content.delta" && chunk.delta) {
              if (chunk.delta.type === "text" && chunk.delta.text) {
                fullText += chunk.delta.text;
                send("content", { text: chunk.delta.text, fullText }, googleEventId);
              } else if (
                chunk.delta.type === "thought_summary" &&
                chunk.delta.content?.text
              ) {
                const step = { summary: chunk.delta.content.text, timestamp: Date.now() };
                thinkingSteps.push(step);
                send("thinking", {
                  summary: step.summary,
                  timestamp: step.timestamp,
                  stepCount: thinkingSteps.length,
                }, googleEventId);
              }
            } else if (chunk.event_type === "interaction.complete") {
              send("complete", {
                status: "completed",
                finalText: fullText,
                thinkingSteps,
              }, googleEventId);
            } else if (
              chunk.event_type === "error" ||
              chunk.event_type === "interaction.failed"
            ) {
              send("error", { error: chunk.error?.message ?? "Research failed" }, googleEventId);
            }
          }
        } catch (error) {
          if (!closed) {
            console.error("[agent/research/[id]/stream] reconnect error:", error);
            const message = error instanceof Error ? error.message : "Unknown error";
            send("error", { error: message });
          }
        } finally {
          closed = true;
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[agent/research/[id]/stream] top-level error:", error);
    return NextResponse.json(
      { error: "Failed to reconnect to research stream" },
      { status: 500 }
    );
  }
}
