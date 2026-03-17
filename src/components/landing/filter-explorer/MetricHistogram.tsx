"use client";

import { useMemo } from "react";
import { MetricHistogram as SharedMetricHistogram } from "@/components/shared/MetricHistogram";
import type { MetricHistogramDataPoint } from "@/components/shared/MetricHistogram";
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

  const fingerprint = sliderFingerprint(sliderValues);

  const data = useMemo((): MetricHistogramDataPoint[] => {
    return designs.map((d) => ({
      value: d[metricKey] as number | undefined,
      passes: designPasses(d, sliderValues),
    }));
  // fingerprint is a stable string derived from all slider values
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designs, metricKey, fingerprint]);

  return (
    <SharedMetricHistogram
      data={data}
      threshold={threshold}
      direction={filterDef?.direction ?? "min"}
      label={meta?.label ?? String(metricKey)}
      unit={meta?.unit ?? ""}
      height={140}
    />
  );
}
