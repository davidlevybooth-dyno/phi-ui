/**
 * Shared filter slider utilities.
 *
 * All sliders are oriented so dragging RIGHT = more permissive:
 * - "min" direction (higher is better, e.g. ipTM): inverted=true
 *   threshold = max - sliderValue, so right → lower threshold → passes more
 * - "max" direction (lower is better, e.g. iPAE): inverted=false
 *   threshold = sliderValue, so right → higher threshold → passes more
 */

export interface MetricFilterBase {
  key: string;
  direction: "min" | "max";
  inverted: boolean;
  defaultThreshold: number;
  min: number;
  max: number;
}

export function defaultSliderValue(f: MetricFilterBase): number {
  return f.inverted ? f.max - f.defaultThreshold : f.defaultThreshold;
}

export function sliderToThreshold(f: MetricFilterBase, sliderValue: number): number {
  return f.inverted ? f.max - sliderValue : sliderValue;
}

export function thresholdToSliderValue(f: MetricFilterBase, threshold: number): number {
  return f.inverted ? f.max - threshold : threshold;
}

/**
 * Convert a named preset (map of metric key → threshold value) to a map of
 * metric key → slider value, using the filter definitions to handle inversion.
 */
export function presetToSliderValues<TFilter extends MetricFilterBase>(
  presetThresholds: Record<string, number>,
  filters: TFilter[]
): Record<string, number> {
  return Object.fromEntries(
    filters.map((f) => [
      f.key,
      thresholdToSliderValue(f, presetThresholds[f.key] ?? f.defaultThreshold),
    ])
  );
}

/**
 * Return the key of the preset whose thresholds match the current slider values,
 * or null if no preset matches (custom state).
 */
export function detectActivePreset<TFilter extends MetricFilterBase>(
  sliderValues: Record<string, number>,
  presets: Record<string, Record<string, number>>,
  filters: TFilter[]
): string | null {
  for (const [name, thresholds] of Object.entries(presets)) {
    const matches = filters.every((f) => {
      const expected = thresholdToSliderValue(f, thresholds[f.key] ?? f.defaultThreshold);
      return Math.abs((sliderValues[f.key] ?? defaultSliderValue(f)) - expected) < 0.001;
    });
    if (matches) return name;
  }
  return null;
}
