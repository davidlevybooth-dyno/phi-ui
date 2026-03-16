/**
 * Research Start API
 * POST /api/agent/research/start
 *
 * Creates a deep research interaction in background mode and returns the
 * interaction ID. The client then connects to GET /api/agent/research/[id]/stream
 * to stream thinking steps and the final report.
 *
 * Non-streaming create resolves in ~800ms. The stream endpoint replays all
 * events (including thinking steps) from the beginning when no lastEventId
 * is provided, so no thinking steps are missed.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

type InteractionsClient = {
  interactions: {
    create: (opts: Record<string, unknown>) => Promise<{ id: string }>;
  };
};

export async function POST(request: NextRequest) {
  try {
    let query: string;
    try {
      const body = await request.json() as { query?: unknown };
      query = typeof body.query === "string" ? body.query : "";
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!query) {
      return NextResponse.json({ error: "query is required" }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const client = new GoogleGenAI({ apiKey });
    const interactions = (client as unknown as InteractionsClient).interactions;

    const interaction = await interactions.create({
      input: query,
      agent: "deep-research-pro-preview-12-2025",
      background: true,
      agent_config: {
        type: "deep-research",
        thinking_summaries: "auto",
      },
    });

    return NextResponse.json({ interactionId: interaction.id });
  } catch (error) {
    console.error("[agent/research/start] error:", error);
    return NextResponse.json(
      {
        error: "Failed to start research",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
