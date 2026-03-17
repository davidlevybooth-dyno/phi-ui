"use client";

import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const PIPELINE_STAGES = [
  {
    step: "1",
    name: "Sequence Design",
    tool: "ProteinMPNN",
    metric: "mpnn_score, seq_recovery",
    description: "Generate diverse sequences for candidate backbones.",
  },
  {
    step: "2",
    name: "Fast Screening",
    tool: "ESMFold",
    metric: "binder_plddt ≥ 80",
    description: "Rapid pLDDT filter to reduce pool before expensive validation.",
  },
  {
    step: "3",
    name: "Complex Validation",
    tool: "AlphaFold2",
    metric: "complex_iptm, i_psae",
    description: "High-accuracy multimer prediction to validate binder–target interface.",
  },
  {
    step: "4",
    name: "Ranking",
    tool: "AF2Rank",
    metric: "composite_score",
    description: "Rank designs by predicted experimental success probability.",
  },
];

const METRIC_CATEGORIES = [
  {
    category: "Confidence",
    metrics: [
      { name: "pLDDT", interpretation: "Higher is better (0–100). Per-residue structure confidence." },
      { name: "pTM", interpretation: "Higher is better (0–1). Full chain TM-score." },
      { name: "ipTM", interpretation: "Higher is better (0–1). Interface TM-score. Key binder metric." },
    ],
  },
  {
    category: "Interface Quality",
    metrics: [
      { name: "i_pae", interpretation: "Lower is better. Mean interface predicted aligned error." },
      { name: "i_psae", interpretation: "Lower is better. Interface score from aligned errors." },
      { name: "ΔSASA", interpretation: "Higher is better. Buried solvent-accessible surface area." },
    ],
  },
  {
    category: "Structural Comparison",
    metrics: [
      { name: "RMSD", interpretation: "Lower is better. Root mean square deviation from reference." },
      { name: "TM-score", interpretation: "Higher is better (0–1). Topological similarity." },
    ],
  },
  {
    category: "Sequence Quality",
    metrics: [
      { name: "Perplexity", interpretation: "Lower is better. ESM-2 sequence plausibility." },
      { name: "Recovery", interpretation: "Higher is better. Fraction of native sequence recovered by MPNN." },
    ],
  },
];

const THRESHOLDS = [
  { metric: "complex_iptm", recommended: "≥ 0.70", high: "≥ 0.75" },
  { metric: "complex_plddt", recommended: "≥ 80.0", high: "≥ 85.0" },
  { metric: "complex_i_psae_mean", recommended: "≤ 6.0", high: "≤ 5.0" },
  { metric: "binder_plddt", recommended: "≥ 85.0", high: "≥ 87.0" },
  { metric: "mpnn_score", recommended: "≥ 0.4", high: "≥ 0.5" },
  { metric: "binder_RMSD", recommended: "≤ 2.5", high: "≤ 2.0" },
  { metric: "tm_score", recommended: "≥ 0.5", high: "≥ 0.6" },
];

const FAQ = [
  {
    q: "What is confidence calibration and why does it matter?",
    a: "Confidence calibration means understanding how well computational scores predict real-world binding affinity and specificity. Without calibration, developers don't know which AI-generated designs are worth testing. Dyno Phi uses experimentally grounded thresholds derived from internal benchmarking to provide this confidence.",
  },
  {
    q: "What do the filter presets mean?",
    a: "The default preset applies thresholds derived from Dyno's internal benchmarking: ESMFold pLDDT ≥ 0.80, AF2 pTM ≥ 0.55, AF2 ipTM ≥ 0.50, iPAE ≤ 10.85 Å, and backbone RMSD ≤ 3.5 Å. The relaxed preset loosens pTM and iPAE/RMSD bounds for novel de novo designs that lack natural homologs. You can override any individual threshold alongside a preset.",
  },
];

// ---------------------------------------------------------------------------
// Copyable plain-text version — for pasting into AI agents as context
// ---------------------------------------------------------------------------

export const OVERVIEW_COPY_TEXT = [
  "# Dyno Phi — Filtering Pipeline & Metric Reference",
  "",
  "## Filtering Pipeline",
  "",
  ...PIPELINE_STAGES.map(
    (s) => `### ${s.step}. ${s.name}\nTool: ${s.tool}\nMetrics: ${s.metric}\n${s.description}`
  ).join("\n\n").split("\n"),
  "",
  "## Metric Reference",
  "",
  ...METRIC_CATEGORIES.flatMap((cat) => [
    `### ${cat.category}`,
    ...cat.metrics.map((m) => `- ${m.name}: ${m.interpretation}`),
    "",
  ]),
  "## Recommended Filter Thresholds",
  "",
  ...THRESHOLDS.map(
    (t) => `- ${t.metric}: recommended ${t.recommended}, high quality ${t.high}`
  ),
  "",
  "## FAQ",
  "",
  ...FAQ.flatMap((item) => [`Q: ${item.q}`, `A: ${item.a}`, ""]),
].join("\n");

export function DocsTab() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="space-y-8"
    >
      {/* Pipeline */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Filtering Pipeline</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {PIPELINE_STAGES.map((stage) => (
            <Card key={stage.step} className="p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-foreground text-background text-xs font-semibold">
                  {stage.step}
                </span>
                <span className="text-sm font-medium">{stage.name}</span>
              </div>
              <Badge variant="secondary" className="text-xs font-normal">
                {stage.tool}
              </Badge>
              <p className="text-xs text-muted-foreground">{stage.description}</p>
              <code className="text-xs text-muted-foreground block">{stage.metric}</code>
            </Card>
          ))}
        </div>
      </div>

      {/* Metrics reference */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Metric Reference</h2>
        <div className="space-y-4">
          {METRIC_CATEGORIES.map((cat) => (
            <Card key={cat.category} className="p-4">
              <h3 className="text-sm font-medium mb-3">{cat.category}</h3>
              <div className="space-y-2">
                {cat.metrics.map((m) => (
                  <div key={m.name} className="flex items-start gap-3 text-sm">
                    <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                      {m.name}
                    </code>
                    <span className="text-muted-foreground">{m.interpretation}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Thresholds */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Recommended Filter Thresholds</h2>
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Metric</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">Recommended</th>
                <th className="px-4 py-2.5 text-left font-medium text-muted-foreground">High Quality</th>
              </tr>
            </thead>
            <tbody>
              {THRESHOLDS.map((t, i) => (
                <tr key={t.metric} className={i % 2 === 0 ? "" : "bg-muted/20"}>
                  <td className="px-4 py-2.5 font-mono text-xs">{t.metric}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.recommended}</td>
                  <td className="px-4 py-2.5 text-muted-foreground">{t.high}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="text-lg font-semibold mb-4">FAQ</h2>
        <Card className="px-4">
          <Accordion type="single" collapsible>
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-sm text-left">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </div>
    </motion.div>
  );
}
