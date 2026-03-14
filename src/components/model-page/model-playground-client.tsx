"use client";

/**
 * Thin client boundary that lazy-loads ModelPlayground with ssr:false.
 *
 * ModelPlayground → StructureViewer → MolstarWrapper → Molstar.
 * Molstar's circular ESM graph breaks Turbopack's SSR runtime at build time.
 * Wrapping the dynamic() call in a "use client" file (required by Next.js 16)
 * and using ssr:false keeps the entire Molstar tree in one client-only chunk,
 * so all circularly-dependent modules are co-located and resolvable by the
 * Turbopack client runtime.
 */

import dynamic from "next/dynamic";
import type { ModelInfo } from "@/lib/models-data";

const ModelPlayground = dynamic(
  () => import("@/components/model-page/model-playground").then((m) => m.ModelPlayground),
  { ssr: false }
);

export function ModelPlaygroundClient({ model }: { model: ModelInfo }) {
  return <ModelPlayground model={model} />;
}
