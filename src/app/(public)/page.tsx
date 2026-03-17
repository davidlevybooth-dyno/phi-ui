"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Cpu, FlaskConical, SlidersHorizontal, Wand2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Show, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DynoLogo } from "@/components/shared/dyno-logo";
import { FEATURES } from "@/lib/config/features";
import { ModelGrid } from "@/components/landing/model-grid";
import { SkillsTab } from "@/components/landing/skills-tab";
import { FilterExplorer } from "@/components/landing/filter-explorer";
import { DocsSection } from "@/components/landing/docs-section";

const WORKFLOW_STEPS = [
  {
    icon: Wand2,
    number: "01",
    title: "Design",
    description: "Upload generative binder candidates via the agent, the web app, or the REST API.",
  },
  {
    icon: Cpu,
    number: "02",
    title: "Score",
    description: "Run scoring models on Dyno cloud GPUs to evaluate each design.",
  },
  {
    icon: SlidersHorizontal,
    number: "03",
    title: "Filter",
    description: "Shortlist and rank candidates against experimentally calibrated filters.",
  },
  {
    icon: FlaskConical,
    number: "04",
    title: "Advance",
    description: "Move shortlisted designs to synthesis, hand off to the wet lab, or share with collaborators.",
  },
];

const TABS = ["skills", "docs", "models", "filters"] as const;
type TabId = (typeof TABS)[number];

function hashToTab(hash: string): TabId {
  const slug = hash.replace(/^#/, "");
  return (TABS as readonly string[]).includes(slug) ? (slug as TabId) : "skills";
}

const fadeUp = (delay: number) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.55, ease: "easeOut" as const, delay },
});

export default function LandingPage() {
  // Start with "skills" to match the server render — hash is read client-side in useEffect.
  const [activeTab, setActiveTab] = useState<TabId>("skills");
  const tabSectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Set initial tab from URL hash on first client render.
    const initial = hashToTab(window.location.hash);
    if (initial !== "skills") setActiveTab(initial);

    function onHashChange() {
      setActiveTab(hashToTab(window.location.hash));
      // Scroll the tab section into view when navigating via a direct hash link.
      tabSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  function handleTabChange(tab: string) {
    setActiveTab(tab as TabId);
    window.history.pushState(null, "", "#" + tab);
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <DynoLogo className="size-8" />
            <span className="font-semibold text-sm">Dyno Phi</span>
          </Link>
          <div className="flex items-center gap-2">
            <Show when="signed-out">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
            </Show>
            <Show when="signed-in">
              <Button asChild variant="ghost" size="sm">
                <Link href="/dashboard">Dashboard</Link>
              </Button>
              <UserButton />
            </Show>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl w-full px-6 pt-16 pb-10 text-center">
        <motion.h1
          {...fadeUp(0)}
          className="text-4xl font-semibold tracking-tight sm:text-5xl leading-tight mb-4"
        >
          Filter and rank
          <br />
          your protein designs.
        </motion.h1>

        <motion.p
          {...fadeUp(0.12)}
          className="max-w-lg mx-auto text-muted-foreground text-base leading-relaxed mb-8"
        >
          Agentic skills for calibration and advancement of AI-generated protein designs, without managing infrastructure.
        </motion.p>

        <motion.div
          {...fadeUp(0.24)}
          className="flex items-center justify-center gap-3"
        >
          <Show when="signed-out">
            <Button asChild className="rounded-full px-6">
              <Link href="/login?mode=register">
                Get started
                <ArrowRight className="ml-1.5 size-3.5" />
              </Link>
            </Button>
            {FEATURES.dashboardAgent && (
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/agent">Agent</Link>
              </Button>
            )}
          </Show>
          <Show when="signed-in">
            <Button asChild className="rounded-full px-6">
              <Link href="/dashboard">Dashboard</Link>
            </Button>
            {FEATURES.dashboardAgent && (
              <Button asChild variant="outline" className="rounded-full px-6">
                <Link href="/agent">Agent</Link>
              </Button>
            )}
          </Show>
        </motion.div>
      </section>

      {/* Workflow strip */}
      <motion.section
        {...fadeUp(0.36)}
        className="mx-auto max-w-6xl w-full px-6 pb-12"
      >
        <div className="border-t border-b py-8 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {WORKFLOW_STEPS.map(({ icon: Icon, number, title, description }) => (
            <div key={number} className="flex flex-col gap-2.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground/60">{number}</span>
                <Icon className="size-3.5 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Tabbed section */}
      <motion.section
        ref={tabSectionRef}
        id="explore"
        {...fadeUp(0.48)}
        className="mx-auto max-w-6xl w-full px-6 pb-16 scroll-mt-16"
      >
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-8 mx-auto flex w-full max-w-md">
            <TabsTrigger value="skills" className="flex-1">Skills</TabsTrigger>
            <TabsTrigger value="docs" className="flex-1">Docs</TabsTrigger>
            <TabsTrigger value="models" className="flex-1">Models</TabsTrigger>
            <TabsTrigger value="filters" className="flex-1">Filters</TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2, ease: "easeOut" as const }}
          >
            {activeTab === "skills" && <SkillsTab />}
            {activeTab === "docs" && <DocsSection />}
            {activeTab === "models" && <ModelGrid />}
            {activeTab === "filters" && <FilterExplorer />}
          </motion.div>
        </AnimatePresence>
      </motion.section>
    </div>
  );
}
