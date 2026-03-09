import { readFile } from "fs/promises";
import { join } from "path";
import { NextResponse } from "next/server";

/**
 * Serves the canonical phi CLI skill file (skills/dyno-phi/SKILL.md)
 * for download from the Skills tab. Single source of truth for the skill content.
 */
export async function GET() {
  try {
    const path = join(process.cwd(), "skills", "dyno-phi", "SKILL.md");
    const content = await readFile(path, "utf-8");
    return new NextResponse(content, {
      status: 200,
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
        "Content-Disposition": 'attachment; filename="phi-skill.md"',
      },
    });
  } catch (err) {
    console.error("Failed to read phi skill file:", err);
    return NextResponse.json(
      { error: "Skill file unavailable" },
      { status: 500 }
    );
  }
}
