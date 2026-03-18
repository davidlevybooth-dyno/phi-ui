"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-button";
import { DocsTab, OVERVIEW_COPY_TEXT } from "@/components/landing/docs-tab";
import { CliReference, CLI_COPY_TEXT } from "@/components/landing/cli-reference";
import { ModelGrid } from "@/components/landing/model-grid";

type DocsSubTab = "overview" | "models" | "cli";

const COPY_TEXT: Partial<Record<DocsSubTab, string>> = {
  overview: OVERVIEW_COPY_TEXT,
  cli: CLI_COPY_TEXT,
};

export function DocsSection() {
  const [tab, setTab] = useState<DocsSubTab>("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as DocsSubTab)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="cli">CLI Reference</TabsTrigger>
          </TabsList>
        </Tabs>
        {COPY_TEXT[tab] && <CopyButton text={COPY_TEXT[tab]!} />}
      </div>

      {tab === "overview" && <DocsTab />}
      {tab === "cli" && <CliReference />}
      {tab === "models" && <ModelGrid />}
    </div>
  );
}
