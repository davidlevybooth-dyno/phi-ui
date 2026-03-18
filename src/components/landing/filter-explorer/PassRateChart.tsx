"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import {
  DesignRow,
  MODEL_COLORS,
  MODEL_IDS,
  MODEL_LABELS,
  TARGET_LABELS,
  TARGET_ORDER,
  designPasses,
} from "./constants";

export function PassRateChart({
  designs,
  sliderValues,
}: {
  designs: DesignRow[];
  sliderValues: Record<string, number>;
}) {
  const data = TARGET_ORDER.map((target) => {
    const entry: Record<string, string | number> = { target: TARGET_LABELS[target] ?? target };
    for (const model of MODEL_IDS) {
      const subset = designs.filter((d) => d.t === target && d.m === model);
      if (subset.length === 0) continue;
      const passing = subset.filter((d) => designPasses(d, sliderValues)).length;
      entry[model] = Math.round((passing / subset.length) * 100);
    }
    return entry;
  });

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} barGap={2} barCategoryGap="25%">
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
        <XAxis
          dataKey="target"
          tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(v) => `${v}%`}
          tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
          width={32}
        />
        {MODEL_IDS.map((model) => (
          <Bar
            key={model}
            dataKey={model}
            fill={MODEL_COLORS[model]}
            radius={[2, 2, 0, 0]}
            maxBarSize={18}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}
