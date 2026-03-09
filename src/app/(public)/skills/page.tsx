import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SkillsTab } from "@/components/landing/skills-tab";

export const metadata = {
  title: "Phi Skills — Dyno Phi",
  description: "Install Phi Skills to give your coding agent access to Dyno Phi protein design APIs.",
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
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Phi Skills</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Install the Phi Skill to give your coding agent (e.g. Claude Code, Cursor) access to Dyno Phi APIs through natural language.
        </p>
        <SkillsTab />
      </div>
    </div>
  );
}
