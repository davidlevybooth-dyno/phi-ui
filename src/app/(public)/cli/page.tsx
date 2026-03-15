"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CliReference } from "@/components/landing/cli-reference";

export default function CliPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 text-muted-foreground">
          <Link href="/">
            <ArrowLeft className="mr-1.5 size-3.5" />
            Back
          </Link>
        </Button>
        <h1 className="text-xl font-semibold tracking-tight mb-6">CLI Reference</h1>
        <CliReference />
      </div>
    </div>
  );
}
