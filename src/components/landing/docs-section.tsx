"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyButton } from "@/components/ui/copy-button";
import { DocsTab, OVERVIEW_COPY_TEXT } from "@/components/landing/docs-tab";
import { CliReference, CLI_COPY_TEXT } from "@/components/landing/cli-reference";

type DocsTab = "overview" | "cli";

const COPY_TEXT: Record<DocsTab, string> = {
  overview: OVERVIEW_COPY_TEXT,
  cli: CLI_COPY_TEXT,
};

export function DocsSection() {
  const [tab, setTab] = useState<DocsTab>("overview");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as DocsTab)}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="cli">CLI Reference</TabsTrigger>
          </TabsList>
        </Tabs>
        <CopyButton text={COPY_TEXT[tab]} />
      </div>

      {tab === "overview" && <DocsTab />}
      {tab === "cli" && <CliReference />}
    </div>
  );
}
