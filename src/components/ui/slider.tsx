"use client"

import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  fillFromRight = false,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  /**
   * When true, the filled track region appears to the RIGHT of the thumb
   * (visually indicates "≥" — passing values are above the threshold).
   * When false (default), fill is left of the thumb ("≤" / standard behavior).
   */
  fillFromRight?: boolean;
}) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  // Percentage position of the first thumb — used for the right-fill overlay.
  const pct = React.useMemo(() => {
    const v = _values[0] ?? min;
    const range = max - min;
    return range === 0 ? 0 : ((v - min) / range) * 100;
  }, [_values, min, max]);

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5"
      >
        {/* Default left-fill range — hidden when using right-fill mode */}
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            "absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full",
            fillFromRight && "hidden"
          )}
        />
        {/* Right-fill overlay: starts exactly at the thumb's percentage position */}
        {fillFromRight && (
          <div
            className="absolute inset-y-0 bg-primary"
            style={{ left: `${pct}%`, right: 0 }}
          />
        )}
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
