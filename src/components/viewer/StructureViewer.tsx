"use client";

/**
 * StructureViewer — Molstar 3D viewer for the model playground.
 *
 * This component is rendered inside a `"use client"` parent (ModelPlayground)
 * and guards all Molstar API calls inside useEffect, so they only run in the
 * browser. No next/dynamic wrapper is needed — and adding one causes
 * chunk-splitting that breaks Next.js 15's module runtime with Molstar's
 * circular ESM graph.
 *
 * States:
 *   idle  (ran=false, running=false) — empty space
 *   running                          — spinner
 *   ran, loading                     — Molstar initialising / fetching CIF
 *   ran, loaded                      — Molstar canvas live
 *   ran, error                       — error message
 */

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { Loader2, FileDown } from "lucide-react";
import { MolstarWrapper } from "@/lib/viewer/MolstarWrapper";

const DEFAULT_MOCK_URL = "/mock/af2-gb1.pdb";

interface Props {
  mockUrl?: string;
  colorMode?: "chain" | "plddt";
  plddt?: number[];
  chainLengths?: number[];
  running: boolean;
  ran: boolean;
  className?: string;
}

const PLDDT_SCALE = [
  { label: ">90",   color: "#106dba" },
  { label: "70–90", color: "#6eb1eb" },
  { label: "50–70", color: "#f6c343" },
  { label: "<50",   color: "#e4723e" },
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

function PlddtProfile({ plddt, chainLengths = [] }: { plddt: number[]; chainLengths?: number[] }) {
  const W = 600;
  const H = 36;
  const barH = 22;
  const n = plddt.length;
  const barW = W / n;

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
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 36 }} aria-label="Per-residue pLDDT confidence">
        {plddt.map((v, i) => (
          <rect key={i} x={i * barW} y={H - barH - 6} width={Math.max(barW - 0.5, 0.5)} height={barH * (v / 100)} fill={barColor(v)} opacity={0.9} />
        ))}
        {dividers.map((d) => (
          <line key={d} x1={d * barW} x2={d * barW} y1={H - barH - 8} y2={H - 4} stroke="currentColor" strokeWidth={1} strokeDasharray="2 2" className="text-muted-foreground/60" />
        ))}
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

  useEffect(() => {
    if (!ran) {
      setStructureReady(false);
      setStructureError(null);
    }
  }, [ran]);

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
          setStructureError(err instanceof Error ? err.message : "Failed to load structure");
      } finally {
        if (mounted) setStructureLoading(false);
      }
    };

    run();

    return () => {
      mounted = false;
      wrapper.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ran, mockUrl, colorMode]);

  if (!ran && !running) {
    return <div className="w-full" style={{ height: 340 }} aria-hidden />;
  }

  if (running) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center px-6">
        <Loader2 className="size-8 text-muted-foreground/40 mb-3 animate-spin" />
        <p className="text-sm text-muted-foreground">Predicting structure…</p>
      </div>
    );
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        ref={containerRef}
        className="w-full"
        style={{ height: 340, background: resolvedTheme === "dark" ? "#1a1814" : "#faf8f5" }}
      />

      {structureLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm gap-2">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading structure…</span>
        </div>
      )}

      {structureError && !structureLoading && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 gap-2 px-6 text-center">
          <p className="text-xs font-medium text-destructive">Failed to load structure</p>
          <p className="text-xs text-muted-foreground">{structureError}</p>
        </div>
      )}

      {structureReady && plddt && plddt.length > 0 && (
        <div className="border-t">
          <PlddtProfile plddt={plddt} chainLengths={chainLengths} />
        </div>
      )}

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
