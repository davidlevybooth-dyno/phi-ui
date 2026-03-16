"use client";

import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentTab } from "@/components/landing/agent-tab";

export function PublicAgentShell() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <Button asChild variant="ghost" size="sm" className="-ml-2">
              <Link href="/">
                <ArrowLeft className="mr-1 size-3.5" />
                Home
              </Link>
            </Button>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium">Agent</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-md px-1 h-7 text-xs text-muted-foreground cursor-default select-none">
              phi-lite
              <ChevronDown className="h-3 w-3 opacity-50" />
            </span>
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm" className="rounded-full px-4">
              <Link href="/login?mode=register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden">
        <AgentTab />
      </div>
    </div>
  );
}
