import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  tosAccepted: z.boolean(),
  contactOptIn: z.boolean(),
});

/**
 * POST /api/user/preferences
 *
 * Persists sign-up preferences to Clerk privateMetadata on first sign-in.
 * Called by AuthProvider once per session after the user authenticates.
 *
 * Stored fields (privateMetadata):
 *   tosAccepted      — boolean, whether the user accepted the ToS
 *   tosAcceptedAt    — ISO timestamp of acceptance
 *   contactOptIn     — boolean, whether the user opted in to be contacted
 *   contactOptInAt   — ISO timestamp of that preference
 *
 * To view: Clerk Dashboard → Users → select user → Metadata tab → Private.
 * To query programmatically: Clerk Backend API GET /v1/users/{userId} → privateMetadata.
 */
export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const { tosAccepted, contactOptIn } = parsed.data;

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    privateMetadata: {
      tosAccepted,
      tosAcceptedAt: now,
      contactOptIn,
      contactOptInAt: now,
    },
  });

  return NextResponse.json({ ok: true });
}
