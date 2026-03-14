"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocsTab } from "@/components/landing/docs-tab";
import { CliReference } from "@/components/landing/cli-reference";

export default function DocsPage() {
  const [tab, setTab] = useState<"overview" | "cli">("overview");

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Documentation</h1>
            <p className="text-muted-foreground text-sm">
              {tab === "overview"
                ? "Scoring pipeline, metric definitions, and common questions."
                : "Complete reference for all phi CLI commands."}
            </p>
          </div>
          <Tabs value={tab} onValueChange={(v) => setTab(v as "overview" | "cli")}>
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="cli">CLI Reference</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {tab === "overview" && <DocsTab />}
        {tab === "cli" && <CliReference />}
      </div>
    </div>
  );
}
