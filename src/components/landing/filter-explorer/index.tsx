"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  DesignRow,
  FILTER_DEF_BY_KEY,
  FILTER_DEFS,
  FILTER_PRESETS,
  HIST_METRICS,
  MODEL_COLORS,
  MODEL_IDS,
  MODEL_LABELS,
  TARGET_LABELS,
  TARGET_ORDER,
  defaultSliderValue,
  designPasses,
  presetToSliderValues,
  scaledCount,
  sliderToThreshold,
} from "./constants";
import { FilterPanel } from "./FilterPanel";
import { MetricHistogram } from "./MetricHistogram";
import { PassRateChart } from "./PassRateChart";

function MetricTd({
  value,
  filterKey,
  sliderValues,
}: {
  value: number | undefined;
  filterKey: string;
  sliderValues: Record<string, number>;
}) {
  if (value === undefined || value === null) {
    return <td className="px-3 py-1.5 text-right text-muted-foreground">—</td>;
  }
  const def = FILTER_DEF_BY_KEY[filterKey];
  if (!def) return <td className="px-3 py-1.5 text-right font-mono tabular-nums">{value.toFixed(2)}</td>;
  const threshold = sliderToThreshold(def, sliderValues[filterKey] ?? defaultSliderValue(def));
  const passes = def.direction === "min" ? value >= threshold : value <= threshold;
  return (
    <td
      className={cn(
        "px-3 py-1.5 text-right font-mono tabular-nums",
        passes ? "text-green-700 dark:text-green-400" : "text-red-600 dark:text-red-400"
      )}
    >
      {value.toFixed(2)}
    </td>
  );
}

const METRIC_DESCRIPTIONS: Record<string, string> = {
  iptm: "Interface predicted TM-score. Measures how well the predicted binder-target interface geometry matches the template. Values above 0.5 indicate confident interface prediction.",
  plddt: "AF2 per-residue confidence score. Reflects AlphaFold2's per-residue confidence averaged over the binder. Values above 0.80 indicate a well-folded, confident prediction.",
  ptm: "Predicted TM-score for the full complex. A global measure of structural confidence across the entire binder-target complex.",
  ipae_ang: "Interface Predicted Aligned Error in Ångströms. Lower values indicate higher confidence in the relative orientation of binder and target. Values below 10 Å indicate a well-defined interface.",
  ipsae: "Interface Score from Aligned Errors. A composite metric derived from AF2/AF3 error estimates, calibrated to better rank experimental binding success than ipTM alone.",
  binder_rmsd: "Root-mean-square deviation of the binder backbone after superimposition. Measures how closely the designed binder matches a reference or self-consistency fold. Values below 3.5 Å indicate a stable, well-designed scaffold.",
};

export function FilterExplorer() {
  const [designs, setDesigns] = useState<DesignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sliderValues, setSliderValues] = useState<Record<string, number>>(
    Object.fromEntries(FILTER_DEFS.map((f) => [f.key, defaultSliderValue(f)]))
  );
  const [selectedTarget, setSelectedTarget] = useState<string>("all");
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [histMetric, setHistMetric] = useState<keyof DesignRow>("iptm");
  const [showFilteredOut, setShowFilteredOut] = useState(false);

  useEffect(() => {
    fetch("/data/benchmark/designs.json")
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load benchmark data (HTTP ${r.status})`);
        return r.json();
      })
      .then((data: DesignRow[]) => {
        setDesigns(data);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load benchmark data.");
        setLoading(false);
      });
  }, []);

  const filtered = useMemo(
    () =>
      designs.filter((d) => {
        if (selectedTarget !== "all" && d.t !== selectedTarget) return false;
        if (selectedModel !== "all" && d.m !== selectedModel) return false;
        return true;
      }),
    [designs, selectedTarget, selectedModel]
  );

  const withPass = useMemo(
    () => filtered.map((d) => ({ row: d, passes: designPasses(d, sliderValues) })),
    [filtered, sliderValues]
  );

  const passing = useMemo(() => withPass.filter((d) => d.passes), [withPass]);
  const displayed = showFilteredOut ? withPass : passing;

  const scaledTotal   = useMemo(() => scaledCount(filtered.map((d) => d)), [filtered]);
  const scaledPassing = useMemo(() => scaledCount(passing.map((d) => d.row)), [passing]);

  const topDesigns = useMemo(() => {
    const histMeta = HIST_METRICS.find((m) => m.key === histMetric);
    return [...displayed]
      .sort((a, b) => {
        const av = (a.row[histMetric] as number | undefined) ?? 0;
        const bv = (b.row[histMetric] as number | undefined) ?? 0;
        return histMeta?.direction === "max" ? av - bv : bv - av;
      })
      .slice(0, 30);
  }, [displayed, histMetric]);

  const handleSliderChange = (key: string, v: number) =>
    setSliderValues((prev) => ({ ...prev, [key]: v }));

  const handlePreset = (preset: keyof typeof FILTER_PRESETS) =>
    setSliderValues(presetToSliderValues(preset));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-sm text-muted-foreground">
        Loading benchmark data…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-center">
        <AlertCircle className="size-8 text-destructive/60" />
        <p className="text-sm font-medium text-destructive">Could not load benchmark data</p>
        <p className="text-xs text-muted-foreground max-w-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Filter explorer</h2>
        <p className="text-sm text-muted-foreground mt-0.5">
          Benchmarking data from {(60010 * MODEL_IDS.length).toLocaleString()} designs across 5 targets and 3 models.
          Adjust thresholds to see how pass rates change.
        </p>
      </div>

      {/* Target + model selectors */}
      <div className="flex flex-wrap gap-4">
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Target protein</p>
          <div className="flex flex-wrap gap-1">
            {[{ id: "all", label: "All" }, ...TARGET_ORDER.map((id) => ({ id, label: TARGET_LABELS[id] ?? id }))].map(
              ({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedTarget(id)}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs border transition-colors",
                    selectedTarget === id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground">Model</p>
          <div className="flex flex-wrap gap-1">
            {[{ id: "all", label: "All" }, ...MODEL_IDS.map((id) => ({ id, label: MODEL_LABELS[id] ?? id }))].map(
              ({ id, label }) => (
                <button
                  key={id}
                  onClick={() => setSelectedModel(id)}
                  className={cn(
                    "rounded-full px-3 py-0.5 text-xs border transition-colors",
                    selectedModel === id
                      ? "bg-foreground text-background border-foreground"
                      : "bg-transparent text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Main layout: filter panel + charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
        {/* Filter panel */}
        <div className="rounded-lg border p-4 space-y-4 self-start">
          <FilterPanel
            sliderValues={sliderValues}
            onChange={handleSliderChange}
            onPreset={handlePreset}
          />
          <Separator />
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Passing</span>
              <span className="font-semibold tabular-nums">
                {scaledPassing.toLocaleString()} / {scaledTotal.toLocaleString()}
              </span>
            </div>
            {scaledTotal > 0 && (
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all duration-300"
                  style={{ width: `${(scaledPassing / scaledTotal) * 100}%` }}
                />
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {scaledTotal > 0
                ? `${Math.round((scaledPassing / scaledTotal) * 100)}% pass rate`
                : ""}
            </p>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showFilteredOut}
              onChange={(e) => setShowFilteredOut(e.target.checked)}
              className="rounded border-border"
            />
            Show filtered out
          </label>
        </div>

        {/* Charts */}
        <div className="space-y-5">
          {/* Pass rate bar chart */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Pass rate by target</p>
              <div className="flex items-center gap-3">
                {MODEL_IDS.map((m) => (
                  <span key={m} className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="inline-block size-2 rounded-sm" style={{ background: MODEL_COLORS[m] }} />
                    {MODEL_LABELS[m]}
                  </span>
                ))}
              </div>
            </div>
            <PassRateChart designs={designs} sliderValues={sliderValues} />
          </div>

          {/* Metric distribution histogram */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Metric distribution</p>
              <select
                value={String(histMetric)}
                onChange={(e) => setHistMetric(e.target.value as keyof DesignRow)}
                className="text-xs border rounded px-2 py-1 bg-background text-foreground"
              >
                {HIST_METRICS.map((m) => (
                  <option key={String(m.key)} value={String(m.key)}>
                    {m.label}{m.unit ? ` (${m.unit})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-green-500/85" />
                Passing threshold
              </span>
              <span className="flex items-center gap-1">
                <span className="inline-block h-2 w-3 rounded-sm bg-muted-foreground/25" />
                Filtered out
              </span>
            </div>
            <MetricHistogram
              designs={filtered}
              metricKey={histMetric}
              sliderValues={sliderValues}
            />
          </div>
        </div>
      </div>

      {/* Designs table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium">
            {showFilteredOut ? "All designs" : "Passing designs"}
            <span className="text-muted-foreground ml-1.5">
              (top {Math.min(topDesigns.length, 30)} by{" "}
              {HIST_METRICS.find((m) => m.key === histMetric)?.label ?? String(histMetric)})
            </span>
          </p>
        </div>
        <div className="rounded-lg border overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-24">Target</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground w-28">Model</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">ipTM</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">pLDDT</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">pTM</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">iPAE (Å)</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">ipSAE</th>
                <th className="text-right px-3 py-2 font-medium text-muted-foreground">RMSD (Å)</th>
                <th className="text-center px-3 py-2 font-medium text-muted-foreground w-16">Status</th>
              </tr>
            </thead>
            <tbody>
              {topDesigns.map(({ row, passes }, i) => (
                <tr
                  key={`${row.t}-${row.m}-${row.d}-${i}`}
                  className={cn("border-b last:border-0 transition-opacity", !passes && "opacity-40")}
                >
                  <td className="px-3 py-1.5 text-muted-foreground">{TARGET_LABELS[row.t] ?? row.t}</td>
                  <td className="px-3 py-1.5">
                    <span className="flex items-center gap-1.5">
                      <span
                        className="inline-block size-1.5 rounded-full"
                        style={{ background: MODEL_COLORS[row.m] }}
                      />
                      {MODEL_LABELS[row.m] ?? row.m}
                    </span>
                  </td>
                  <MetricTd value={row.iptm}        filterKey="iptm"        sliderValues={sliderValues} />
                  <MetricTd value={row.plddt}       filterKey="plddt"       sliderValues={sliderValues} />
                  <MetricTd value={row.ptm}         filterKey="ptm"         sliderValues={sliderValues} />
                  <MetricTd value={row.ipae_ang}    filterKey="ipae_ang"    sliderValues={sliderValues} />
                  <MetricTd value={row.ipsae}       filterKey="ipsae"       sliderValues={sliderValues} />
                  <MetricTd value={row.binder_rmsd} filterKey="binder_rmsd" sliderValues={sliderValues} />
                  <td className="px-3 py-1.5 text-center">
                    {passes ? (
                      <span className="text-green-600 dark:text-green-400 font-medium">Pass</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {topDesigns.length === 0 && (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No designs pass the current filters.
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Filter metric documentation */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold">Metric reference</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {FILTER_DEFS.map((f) => (
            <div key={f.key} className="rounded-md border bg-muted/20 px-3 py-2.5 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <code className="text-xs font-mono font-semibold">{f.label}</code>
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                  {f.direction === "min" ? "higher is better" : "lower is better"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {METRIC_DESCRIPTIONS[f.key] ?? f.label}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Thresholds are calibrated from Dyno&apos;s internal benchmark of 60,010 designs per model
          across 5 diverse protein targets. Default preset reflects typical experimental success
          rates; Relaxed preset increases candidate yield at the cost of predicted quality.
        </p>
      </div>
    </div>
  );
}
