"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocsTab } from "@/components/landing/docs-tab";
import { CliReference } from "@/components/landing/cli-reference";

type DocsTab = "overview" | "cli";

export function DocsSection() {
  const [tab, setTab] = useState<DocsTab>("overview");

  return (
    <div className="space-y-6">
      <Tabs value={tab} onValueChange={(v) => setTab(v as DocsTab)}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="cli">CLI Reference</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "overview" && <DocsTab />}
      {tab === "cli" && <CliReference />}
    </div>
  );
}
