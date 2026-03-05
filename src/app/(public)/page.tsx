import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynoLogo } from "@/components/shared/dyno-logo";
import { ApiTab } from "@/components/landing/api-tab";
import { DocsTab } from "@/components/landing/docs-tab";
import { SkillsTab } from "@/components/landing/skills-tab";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <DynoLogo className="size-8" />
            <div className="flex items-baseline gap-1.5">
              <span className="font-semibold text-sm">Dyno</span>
              <span className="text-sm text-muted-foreground">Psi-Phi</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/login?mode=register">
                Get started
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 py-16 text-center">
        <p className="text-xs font-medium tracking-widest uppercase text-muted-foreground mb-4">
          Dyno Psi-Phi · Launching with NVIDIA GTC
        </p>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl leading-tight mb-4">
          Protein binder scoring
          <br />
          grounded by experiment
        </h1>
        <p className="max-w-xl mx-auto text-muted-foreground text-base leading-relaxed mb-8">
          REST APIs and an agentic interface for scoring, filtering, and ranking
          AI-generated protein binder designs — calibrated against real-world
          binding data.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button asChild>
            <Link href="/login?mode=register">
              Start free
              <ArrowRight className="ml-1.5 size-3.5" />
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/dashboard/agent">Try the agent</Link>
          </Button>
        </div>
      </section>

      {/* Main tabs */}
      <section className="mx-auto w-full max-w-6xl px-6 pb-16 flex-1">
        <Tabs defaultValue="api" className="w-full">
          <TabsList className="mb-8 grid w-fit grid-cols-3 mx-auto">
            <TabsTrigger value="api">API Reference</TabsTrigger>
            <TabsTrigger value="docs">Docs</TabsTrigger>
            <TabsTrigger value="skills">Claude Skills</TabsTrigger>
          </TabsList>
          <TabsContent value="api">
            <ApiTab />
          </TabsContent>
          <TabsContent value="docs">
            <DocsTab />
          </TabsContent>
          <TabsContent value="skills">
            <SkillsTab />
          </TabsContent>
        </Tabs>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="mx-auto max-w-6xl px-6 flex items-center justify-between text-xs text-muted-foreground">
          <p>© 2026 Dyno Therapeutics. All rights reserved.</p>
          <p>design.dynotx.com</p>
        </div>
      </footer>
    </div>
  );
}
