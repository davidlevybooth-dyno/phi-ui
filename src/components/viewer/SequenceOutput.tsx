"use client";

import { type DesignedSequence } from "@/lib/models-data";

/**
 * SequenceOutput — renders designed sequences with amino-acid-type colouring.
 *
 * Colour scheme (standard biochemistry convention):
 *   Hydrophobic   A V I L M F W P  → amber
 *   Polar uncharged S T N Q Y C    → green
 *   Positive      K R H             → blue
 *   Negative      D E               → red
 *   Glycine       G                 → muted gray
 *   Other / gap   X - ?             → foreground (no colour)
 *
 * Display only — no hover, selection, or alignment.
 */

const RESIDUES_PER_LINE = 60;

type AaClass = "hydrophobic" | "polar" | "positive" | "negative" | "glycine" | "other";

const AA_CLASS: Record<string, AaClass> = {
  A: "hydrophobic",
  V: "hydrophobic",
  I: "hydrophobic",
  L: "hydrophobic",
  M: "hydrophobic",
  F: "hydrophobic",
  W: "hydrophobic",
  P: "hydrophobic",
  S: "polar",
  T: "polar",
  N: "polar",
  Q: "polar",
  Y: "polar",
  C: "polar",
  K: "positive",
  R: "positive",
  H: "positive",
  D: "negative",
  E: "negative",
  G: "glycine",
};

// Raw colour values per residue class — stored as plain values, not CSS declarations.
const CLASS_COLOR: Record<AaClass, string> = {
  hydrophobic: "oklch(0.65 0.10 75)",   // amber/warm
  polar:       "oklch(0.55 0.10 145)",  // sage green
  positive:    "oklch(0.50 0.10 240)",  // steel blue
  negative:    "oklch(0.55 0.12 20)",   // muted red-orange
  glycine:     "oklch(0.55 0.00 0)",    // neutral gray
  other:       "",
};

// Re-export canonical type so consumers import from one place.
export type { DesignedSequence as SequenceEntry } from "@/lib/models-data";

interface Props {
  sequences: DesignedSequence[];
}

function ColouredSequenceLine({ line }: { line: string }) {
  return (
    <>
      {line.split("").map((char, i) => {
        const color = CLASS_COLOR[AA_CLASS[char.toUpperCase()] ?? "other"];
        return (
          <span key={i} style={color ? { color } : undefined}>
            {char}
          </span>
        );
      })}
    </>
  );
}

function SequenceBlock({ entry }: { entry: DesignedSequence }) {
  const seq = entry.sequence;
  const lines: string[] = [];
  for (let i = 0; i < seq.length; i += RESIDUES_PER_LINE) {
    lines.push(seq.slice(i, i + RESIDUES_PER_LINE));
  }

  return (
    <div className="space-y-1.5">
      {/* Header row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium">{entry.label}</span>
        {entry.score !== undefined && (
          <span className="text-xs font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/30">
            score {entry.score.toFixed(2)}
          </span>
        )}
        {entry.recovery !== undefined && (
          <span className="text-xs font-mono text-muted-foreground border rounded px-1.5 py-0.5 bg-muted/30">
            recovery {(entry.recovery * 100).toFixed(0)}%
          </span>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{seq.length} aa</span>
      </div>

      {/* Sequence lines with position rulers */}
      <div className="font-mono text-xs leading-5 tracking-wide select-text">
        {lines.map((line, lineIdx) => {
          const startPos = lineIdx * RESIDUES_PER_LINE + 1;
          return (
            <div key={lineIdx} className="flex items-start gap-2">
              <span className="text-muted-foreground/50 w-8 shrink-0 text-right select-none tabular-nums">
                {startPos}
              </span>
              <span>
                <ColouredSequenceLine line={line} />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Colour legend
function Legend() {
  const items: { label: string; cls: AaClass }[] = [
    { label: "Hydrophobic", cls: "hydrophobic" },
    { label: "Polar",       cls: "polar" },
    { label: "Positive",    cls: "positive" },
    { label: "Negative",    cls: "negative" },
    { label: "Gly",         cls: "glycine" },
  ];
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {items.map(({ label, cls }) => (
        <span
          key={label}
          className="text-xs font-mono"
          style={{ color: CLASS_COLOR[cls] }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

export function SequenceOutput({ sequences }: Props) {
  if (sequences.length === 0) return null;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {sequences.length} designed sequence{sequences.length !== 1 ? "s" : ""} — mock result
        </p>
        <Legend />
      </div>

      <div className="space-y-5 overflow-x-auto">
        {sequences.map((entry, i) => (
          <SequenceBlock key={i} entry={entry} />
        ))}
      </div>
    </div>
  );
}
