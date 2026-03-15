/**
 * Research Job Start API
 * POST /api/agent/research/start
 *
 * Starts a Google GenAI deep research interaction.
 * Returns an interactionId that the client uses to stream results.
 */
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json();

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

    const interaction = await (client as unknown as {
      interactions: {
        create: (opts: Record<string, unknown>) => Promise<{ id: string }>;
      };
    }).interactions.create({
      input: query,
      agent: "deep-research-pro-preview-12-2025",
      background: true,
      agent_config: {
        type: "deep-research",
        thinking_summaries: "auto",
      },
    });

    return NextResponse.json({
      interactionId: interaction.id,
      status: "running",
    });
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
