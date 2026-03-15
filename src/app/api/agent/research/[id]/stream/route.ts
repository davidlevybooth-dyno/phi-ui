/**
 * Research Stream API
 * GET /api/agent/research/[id]/stream
 *
 * Streams research progress via SSE for a given Google GenAI interaction ID.
 * Events: start, content (text delta), thinking (thought summary), complete, error
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: interactionId } = await params;
  const lastEventId = request.nextUrl.searchParams.get("lastEventId") ?? undefined;

  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({ apiKey });

    const encoder = new TextEncoder();
    let eventIdCounter = lastEventId ? parseInt(lastEventId) : 0;

    type ResearchChunk = {
      event_type?: string;
      interaction?: { id: string };
      delta?: {
        type?: string;
        text?: string;
        content?: { text?: string };
      };
      error?: { message?: string };
    };

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          eventIdCounter++;
          controller.enqueue(
            encoder.encode(`id: ${eventIdCounter}\nevent: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const researchStream = await (client as unknown as {
            interactions: {
              get: (id: string, opts?: Record<string, unknown>) => Promise<AsyncIterable<ResearchChunk>>;
            };
          }).interactions.get(interactionId, {
            stream: true,
            last_event_id: lastEventId,
          });

          let fullText = "";
          const thinkingSteps: Array<{ summary: string; timestamp: number }> = [];

          for await (const chunk of researchStream) {
            if (chunk.event_type === "interaction.start") {
              send("start", { interactionId: chunk.interaction?.id });
            } else if (chunk.event_type === "content.delta" && chunk.delta) {
              if (chunk.delta.type === "text" && chunk.delta.text) {
                fullText += chunk.delta.text;
                send("content", { text: chunk.delta.text, fullText });
              } else if (chunk.delta.type === "thought_summary" && chunk.delta.content?.text) {
                const step = { summary: chunk.delta.content.text, timestamp: Date.now() };
                thinkingSteps.push(step);
                send("thinking", {
                  summary: step.summary,
                  timestamp: step.timestamp,
                  stepCount: thinkingSteps.length,
                });
              }
            } else if (chunk.event_type === "interaction.complete") {
              send("complete", {
                status: "completed",
                finalText: fullText,
                thinkingSteps,
              });
            } else if (
              chunk.event_type === "error" ||
              chunk.event_type === "interaction.failed"
            ) {
              send("error", { error: chunk.error?.message ?? "Research failed" });
            }
          }

          controller.close();
        } catch (error) {
          console.error("[agent/research/stream] error:", error);
          const message = error instanceof Error ? error.message : "Unknown error";
          controller.enqueue(
            encoder.encode(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("[agent/research/stream] top-level error:", error);
    return NextResponse.json(
      { error: "Failed to start research stream" },
      { status: 500 }
    );
  }
}
