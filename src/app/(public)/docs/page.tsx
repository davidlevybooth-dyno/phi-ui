"use client";

import Link from "next/link";
import { ArrowLeft, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocsTab } from "@/components/landing/docs-tab";

export default function DocsPage() {
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
          <h1 className="text-xl font-semibold tracking-tight">Documentation</h1>
          <Button asChild variant="outline" size="sm">
            <Link href="/cli">
              <Terminal className="mr-1.5 size-3.5" />
              CLI Reference
            </Link>
          </Button>
        </div>
        <DocsTab />
      </div>
    </div>
  );
}
