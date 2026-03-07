import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsTab } from "@/components/landing/docs-tab";

export const metadata = {
  title: "Docs — Dyno Phi",
  description: "Default scoring pipeline, metrics reference, and FAQ for Dyno Phi.",
};

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-6 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight mb-1">Documentation</h1>
        <p className="text-muted-foreground text-sm mb-8">
          Default scoring pipeline, metric definitions, and common questions.
        </p>
        <DocsTab />
      </div>
    </div>
  );
}
