"use client";

import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  FILTER_DEFS,
  FILTER_PRESETS,
  defaultSliderValue,
  detectPreset,
  sliderToThreshold,
} from "./constants";

export function FilterPanel({
  sliderValues,
  onChange,
  onPreset,
}: {
  sliderValues: Record<string, number>;
  onChange: (key: string, v: number) => void;
  onPreset: (preset: keyof typeof FILTER_PRESETS) => void;
}) {
  const activePreset = detectPreset(sliderValues);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-xs font-medium text-foreground">Thresholds</span>
        <div className="flex gap-1.5">
          {(["default", "relaxed"] as const).map((preset) => (
            <button
              key={preset}
              onClick={() => onPreset(preset)}
              className={cn(
                "flex-1 rounded px-2.5 py-1 text-xs border transition-colors",
                activePreset === preset
                  ? "bg-foreground text-background border-foreground"
                  : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
              )}
            >
              {preset.charAt(0).toUpperCase() + preset.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        {FILTER_DEFS.map((f) => {
          const sv = sliderValues[f.key] ?? defaultSliderValue(f);
          const threshold = sliderToThreshold(f, sv);
          const symbol = f.direction === "min" ? "≥" : "≤";
          const decimals = f.step < 1 ? 2 : 1;
          return (
            <div key={f.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{f.label}</span>
                <span className="text-xs font-mono text-foreground">
                  {symbol} {threshold.toFixed(decimals)}{f.unit}
                </span>
              </div>
              <Slider
                min={f.min}
                max={f.max}
                step={f.step}
                value={[sv]}
                onValueChange={([v]) => onChange(f.key, v ?? sv)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
