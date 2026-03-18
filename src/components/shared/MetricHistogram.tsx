"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export interface MetricHistogramDataPoint {
  value: number | undefined;
  passes: boolean;
}

interface MetricHistogramProps {
  data: MetricHistogramDataPoint[];
  /** Active filter threshold to draw as a reference line. */
  threshold: number | null;
  /** "min" = higher is better (threshold is a lower bound); "max" = lower is better (upper bound). */
  direction: "min" | "max";
  label: string;
  unit?: string;
  height?: number;
  nBins?: number;
}

export function MetricHistogram({
  data,
  threshold,
  direction,
  label,
  unit = "",
  height = 140,
  nBins = 30,
}: MetricHistogramProps) {
  const histData = useMemo(() => {
    const valid = data.filter(
      (p): p is { value: number; passes: boolean } =>
        p.value !== undefined && p.value !== null && !Number.isNaN(p.value)
    );
    if (valid.length === 0) return [];

    const lo = Math.min(...valid.map((p) => p.value));
    const hi = Math.max(...valid.map((p) => p.value));

    if (lo === hi) {
      const pass = valid.filter((p) => p.passes).length;
      return [{ x: lo, passes: pass, filtered: valid.length - pass }];
    }

    const step = (hi - lo) / nBins;
    const bins = Array.from({ length: nBins }, (_, i) => ({
      x: Math.round((lo + i * step) * 1000) / 1000,
      passes: 0,
      filtered: 0,
    }));
    for (const { value, passes } of valid) {
      const idx = Math.min(Math.floor((value - lo) / step), nBins - 1);
      if (passes) bins[idx]!.passes += 1;
      else bins[idx]!.filtered += 1;
    }
    return bins;
  }, [data, nBins]);

  if (histData.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ height }}
      >
        No data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={histData} barCategoryGap="5%">
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--border))"
          vertical={false}
        />
        <XAxis
          dataKey="x"
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => String(v)}
          interval="preserveStartEnd"
        />
        <YAxis hide />
        {threshold !== null && (
          <ReferenceLine
            x={threshold}
            stroke="hsl(var(--foreground))"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            label={{
              value: `${direction === "min" ? "≥" : "≤"}${threshold}${unit}`,
              position: "top",
              fontSize: 10,
              fill: "hsl(var(--foreground))",
            }}
          />
        )}
        <Bar
          dataKey="passes"
          stackId="a"
          fill="#22c55e"
          fillOpacity={0.85}
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="filtered"
          stackId="a"
          fill="hsl(var(--muted-foreground))"
          fillOpacity={0.25}
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
