import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsTab } from "@/components/landing/skills-tab";

export const metadata = {
  title: "Claude Skills — Dyno Phi",
  description: "Install Dyno Phi skills in Claude Code to run protein binder scoring from natural language.",
};

export default function SkillsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Claude Code Skills</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Install these skills in your Claude Code environment to access Dyno Phi APIs through natural language.
        </p>
        <SkillsTab />
      </div>
    </div>
  );
}
