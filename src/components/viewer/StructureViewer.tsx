"use client";

/**
 * StructureViewer — Molstar 3D viewer for the model playground.
 *
 * This component is always dynamically imported with `ssr: false` from its
 * parent so that Molstar's browser-only APIs never run on the server.
 *
 * States:
 *   idle  (ran=false, running=false) — ProteinIcon placeholder
 *   running                          — spinner
 *   ran, loading                     — Molstar initialising / fetching CIF
 *   ran, loaded                      — Molstar canvas live
 *   ran, error                       — error message
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Loader2, FileDown } from "lucide-react";
import { MolstarWrapper } from "@/lib/viewer/MolstarWrapper";

// Real AF2 multimer prediction (GB1 + peptide, 56+20 residues).
// B-factor column contains per-residue pLDDT scores.
const DEFAULT_MOCK_URL = "/mock/af2-gb1.pdb";

interface Props {
  /** Local /mock/*.pdb or *.cif path to load when ran. */
  mockUrl?: string;
  /**
   * "chain"  — muted palette per chain (default)
   * "plddt"  — blue/orange uncertainty gradient matching AF2 confidence colours
   */
  colorMode?: "chain" | "plddt";
  /** Per-residue pLDDT scores — renders a confidence profile bar when provided. */
  plddt?: number[];
  /** Length of each chain in order — used to draw dividers on the profile. */
  chainLengths?: number[];
  running: boolean;
  ran: boolean;
  className?: string;
}

function ProteinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none">
      <ellipse cx="24" cy="24" rx="18" ry="8" stroke="currentColor" strokeWidth="2" />
      <ellipse cx="24" cy="24" rx="8" ry="18" stroke="currentColor" strokeWidth="2" />
      <circle cx="24" cy="24" r="3" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

// Matches the standard AF2 pLDDT confidence colour scale.
const PLDDT_SCALE = [
  { label: ">90", color: "#106dba" },  // very high — dark blue
  { label: "70–90", color: "#6eb1eb" },  // high — light blue
  { label: "50–70", color: "#f6c343" },  // low — yellow
  { label: "<50", color: "#e4723e" },   // very low — orange
] as const;

function PlddtLegend() {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="text-xs text-muted-foreground">pLDDT</span>
      {PLDDT_SCALE.map(({ label, color }) => (
        <span key={label} className="flex items-center gap-1">
          <span className="inline-block size-2.5 rounded-sm shrink-0" style={{ background: color }} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </span>
      ))}
    </div>
  );
}

// Per-residue pLDDT profile — inline SVG bar chart.
function PlddtProfile({
  plddt,
  chainLengths = [],
}: {
  plddt: number[];
  chainLengths?: number[];
}) {
  const W = 600; // viewBox width
  const H = 36;  // viewBox height
  const barH = 22;
  const n = plddt.length;
  const barW = W / n;

  // Divider positions (in residue index)
  const dividers: number[] = [];
  let acc = 0;
  for (let i = 0; i < chainLengths.length - 1; i++) {
    acc += chainLengths[i];
    dividers.push(acc);
  }

  function barColor(v: number): string {
    if (v >= 90) return "#106dba";
    if (v >= 70) return "#6eb1eb";
    if (v >= 50) return "#f6c343";
    return "#e4723e";
  }

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-muted-foreground">pLDDT per residue</span>
        {chainLengths.length > 1 && (
          <span className="text-xs text-muted-foreground">
            {chainLengths.map((l, i) => `Chain ${String.fromCharCode(65 + i)}: ${l} aa`).join("  ·  ")}
          </span>
        )}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height: 36 }}
        aria-label="Per-residue pLDDT confidence"
      >
        {/* Bars */}
        {plddt.map((v, i) => (
          <rect
            key={i}
            x={i * barW}
            y={H - barH - 6}
            width={Math.max(barW - 0.5, 0.5)}
            height={barH * (v / 100)}
            fill={barColor(v)}
            opacity={0.9}
          />
        ))}
        {/* Chain dividers */}
        {dividers.map((d) => (
          <line
            key={d}
            x1={d * barW}
            x2={d * barW}
            y1={H - barH - 8}
            y2={H - 4}
            stroke="currentColor"
            strokeWidth={1}
            strokeDasharray="2 2"
            className="text-muted-foreground/60"
          />
        ))}
        {/* Baseline */}
        <line x1={0} x2={W} y1={H - 6} y2={H - 6} stroke="currentColor" strokeWidth={0.5} className="text-border" />
      </svg>
    </div>
  );
}

export function StructureViewer({
  mockUrl = DEFAULT_MOCK_URL,
  colorMode = "chain",
  plddt,
  chainLengths,
  running,
  ran,
  className,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [structureError, setStructureError] = useState<string | null>(null);
  const [structureReady, setStructureReady] = useState(false);
  const { resolvedTheme } = useTheme();

  // Reset viewer state when the user resets the playground (ran → false)
  useEffect(() => {
    if (!ran) {
      setStructureReady(false);
      setStructureError(null);
    }
  }, [ran]);

  // Initialise and load when ran becomes true
  useEffect(() => {
    if (!ran || !containerRef.current) return;

    let mounted = true;
    const wrapper = new MolstarWrapper();

    const run = async () => {
      setStructureLoading(true);
      setStructureError(null);
      try {
        const theme = resolvedTheme === "dark" ? "dark" : "light";
        await wrapper.init(containerRef.current!, theme);
        if (!mounted) return;
        await wrapper.load(mockUrl, undefined, colorMode);
        if (mounted) setStructureReady(true);
      } catch (err) {
        if (mounted)
          setStructureError(
            err instanceof Error ? err.message : "Failed to load structure"
          );
      } finally {
        if (mounted) setStructureLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
      wrapper.dispose();
    };
    // Re-run if the URL, colorMode, or the ran flag changes (not on every theme change)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran, mockUrl, colorMode]);

  // ── Idle ────────────────────────────────────────────────────────────────
  if (!ran && !running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <div className="size-16 rounded-lg bg-muted flex items-center justify-center mb-4">
          <ProteinIcon className="size-8 text-muted-foreground/30" />
        </div>
        <p className="text-sm text-muted-foreground">Run the model to see the predicted structure.</p>
      </div>
    );
  }

  // ── Running (mock delay) ────────────────────────────────────────────────
  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Loader2 className="size-8 text-muted-foreground/40 mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Predicting structure…</p>
      </div>
    );
  }

  // ── Ran — show Molstar container (with loading / error overlay) ─────────
  return (
    <div className={`relative ${className ?? ""}`}>
      {/* Molstar mount point — always rendered once ran=true */}
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: 340, background: resolvedTheme === "dark" ? "#1a1814" : "#faf8f5" }}
      />

      {/* Loading overlay */}
      {structureLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading structure…</span>
        </div>
      )}

      {/* Error overlay */}
      {structureError && !structureLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-2 px-6 text-center">
          <p className="text-xs font-medium text-destructive">Failed to load structure</p>
          <p className="text-xs text-muted-foreground">{structureError}</p>
        </div>
      )}

      {/* Per-residue pLDDT profile */}
      {structureReady && plddt && plddt.length > 0 && (
        <div className="border-t">
          <PlddtProfile plddt={plddt} chainLengths={chainLengths} />
        </div>
      )}

      {/* Footer bar — pLDDT legend or chain label + download link */}
      {structureReady && (
        <div className="px-4 py-2 border-t flex items-center justify-between gap-3 flex-wrap">
          {colorMode === "plddt" ? (
            <PlddtLegend />
          ) : (
            <span className="text-xs text-muted-foreground">Mock result — cached prediction</span>
          )}
          <a
            href={mockUrl}
            download
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium bg-background hover:bg-muted transition-colors"
          >
            <FileDown className="size-3.5" />
            {`Download ${mockUrl.split(".").pop()?.toUpperCase() ?? "file"}`}
          </a>
        </div>
      )}
    </div>
  );
}
