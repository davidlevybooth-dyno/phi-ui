import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { PublicAgentShell } from "@/components/landing/public-agent-shell";

export const metadata = {
  title: "Agent — Dyno Phi",
  description:
    "Plan protein design workflows, run deep research, and chat with an AI assistant.",
};

export default async function PublicAgentPage() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard/agent");

  return <PublicAgentShell />;
}
