"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  DesignRow,
  FILTER_DEF_BY_KEY,
  HIST_METRICS,
  defaultSliderValue,
  designPasses,
  sliderFingerprint,
  sliderToThreshold,
} from "./constants";

export function MetricHistogram({
  designs,
  metricKey,
  sliderValues,
}: {
  designs: DesignRow[];
  metricKey: keyof DesignRow;
  sliderValues: Record<string, number>;
}) {
  const meta = HIST_METRICS.find((m) => m.key === metricKey);
  const filterDef = FILTER_DEF_BY_KEY[metricKey as string];

  const threshold = filterDef
    ? sliderToThreshold(filterDef, sliderValues[filterDef.key] ?? defaultSliderValue(filterDef))
    : null;

  // Recomputes when designs, the displayed metric, or any slider value changes.
  // sliderFingerprint produces a stable string dep instead of JSON.stringify.
  const fingerprint = sliderFingerprint(sliderValues);
  const histData = useMemo(() => {
    const pairs = designs
      .map((d) => ({ val: d[metricKey] as number | undefined, passesAll: designPasses(d, sliderValues) }))
      .filter((p) => p.val !== undefined && p.val !== null) as { val: number; passesAll: boolean }[];

    if (pairs.length === 0) return [];
    const lo = Math.min(...pairs.map((p) => p.val));
    const hi = Math.max(...pairs.map((p) => p.val));
    if (lo === hi) {
      const n = pairs.length;
      const pass = pairs.filter((p) => p.passesAll).length;
      return [{ x: lo, passes: pass, filtered: n - pass }];
    }
    const N_BINS = 30;
    const step = (hi - lo) / N_BINS;
    const bins = Array.from({ length: N_BINS }, (_, i) => ({
      x: Math.round((lo + i * step) * 100) / 100,
      passes: 0,
      filtered: 0,
    }));
    for (const { val, passesAll } of pairs) {
      const idx = Math.min(Math.floor((val - lo) / step), N_BINS - 1);
      if (passesAll) bins[idx]!.passes += 1;
      else           bins[idx]!.filtered += 1;
    }
    return bins;
  // fingerprint is a stable string derived from all slider values
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, metricKey, fingerprint]);

  if (histData.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={histData} barCategoryGap="5%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => String(v)}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        <Tooltip
          formatter={(value, name) => [value, name === "passes" ? "Passing all filters" : "Filtered out"]}
          labelFormatter={(v) => `${meta?.label ?? String(metricKey)} = ${v}${meta?.unit ?? ""}`}
          contentStyle={{
            fontSize: 11,
            border: "1px solid hsl(var(--border))",
            borderRadius: 6,
            background: "hsl(var(--background))",
          }}
        />
        {threshold !== null && (
          <ReferenceLine
            x={threshold}
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{
              value: `${meta?.direction === "min" ? "≥" : "≤"}${threshold.toFixed(2)}${meta?.unit ?? ""}`,
              position: "top",
              fontSize: 10,
              fill: "hsl(var(--foreground))",
            }}
          />
        )}
        <Bar dataKey="passes"   stackId="a" fill="#22c55e" fillOpacity={0.85} radius={[0, 0, 0, 0]} />
        <Bar dataKey="filtered" stackId="a" fill="hsl(var(--muted-foreground))" fillOpacity={0.25} radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
