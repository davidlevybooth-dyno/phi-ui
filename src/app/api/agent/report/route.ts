/**
 * Research Report Generation API
 * POST /api/agent/report
 *
 * Takes completed research artifacts and a plan context, synthesizes a
 * comprehensive research report using Gemini, and returns it as markdown.
 *
 * No database — stateless generation only.
 */
import { NextRequest, NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 120;

interface ArtifactInput {
  question: string;
  answer: string;
  toolCalls?: string[];
  turnCount?: number;
}

export async function POST(request: NextRequest) {
  try {
    let rawArtifacts: unknown;
    let planText: string | undefined;
    try {
      const body = await request.json() as { artifacts?: unknown; planText?: unknown };
      rawArtifacts = body.artifacts;
      planText = typeof body.planText === "string" ? body.planText : undefined;
    } catch {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!Array.isArray(rawArtifacts) || rawArtifacts.length === 0) {
      return NextResponse.json({ error: "artifacts are required" }, { status: 400 });
    }

    // Cap to 20 artifacts and 2 000 chars per answer to bound prompt size.
    const artifacts: ArtifactInput[] = (rawArtifacts as ArtifactInput[])
      .slice(0, 20)
      .map((a) => ({
        question: String(a.question ?? "").slice(0, 500),
        answer: String(a.answer ?? "").slice(0, 2000),
        toolCalls: Array.isArray(a.toolCalls) ? a.toolCalls.map(String) : [],
        turnCount: typeof a.turnCount === "number" ? a.turnCount : 0,
      }));

    const artifactsContext = artifacts
      .map(
        (a, i) => `## Research Question ${i + 1}
**Question**: ${a.question}
**Answer**: ${a.answer || "No answer provided"}
**Tools Used**: ${a.toolCalls?.join(", ") || "None"}
**Turns**: ${a.turnCount ?? 0}`
      )
      .join("\n\n");

    const planSnippet = planText
      ? `\n\n## Plan Context (for reference)\n${planText.slice(0, 1500)}`
      : "";

    const prompt = `You are a scientific research analyst. Generate a comprehensive research report from the findings below.${planSnippet}

---

${artifactsContext}

---

Write a cohesive markdown research report with these sections:

# [Descriptive Report Title]

## Executive Summary
2–3 sentence overview of the most important findings and their implications.

## Key Discoveries
Bullet-point highlights of the most significant insights from all research questions.

## Synthesis
Combine and connect findings across questions. Identify themes, confirm or challenge initial assumptions, and note any surprising results.

## Implications for Design
Specific, concrete insights relevant to the protein design task described in the plan. Reference specific PDB IDs, UniProt accessions, numerical thresholds, or experimental parameters where available.

## Recommended Next Steps
Prioritized, actionable recommendations for moving forward with the computational workflow.

FORMATTING: Use proper markdown headers, bullet points for lists, and **bold** for key terms. Keep paragraphs concise (3–5 sentences). Be specific — cite numbers and identifiers from the research.`;

    const result = streamText({
      model: google("gemini-3-flash-preview"),
      prompt,
      abortSignal: request.signal,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      return NextResponse.json({ error: "Request aborted" }, { status: 499 });
    }
    console.error("[agent/report] error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
