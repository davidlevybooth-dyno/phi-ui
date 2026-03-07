/**
 * Minimal Molstar wrapper for the Dyno Phi model playground.
 *
 * Scope: load a single structure from a URL, display it with cartoon
 * representation using the muted chain palette, hide all Molstar UI panels.
 * No per-residue colouring, hover callbacks, or selection logic needed.
 */

import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { createPluginUI } from "molstar/lib/mol-plugin-ui";
import { renderReact18 } from "molstar/lib/mol-plugin-ui/react18";
import { DefaultPluginUISpec } from "molstar/lib/mol-plugin-ui/spec";
import { PluginConfig } from "molstar/lib/mol-plugin/config";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { Asset } from "molstar/lib/mol-util/assets";
import { Color } from "molstar/lib/mol-util/color";
import type { ColorTheme } from "molstar/lib/mol-theme/color";
import type { ThemeDataContext } from "molstar/lib/mol-theme/theme";
import { ParamDefinition as PD } from "molstar/lib/mol-util/param-definition";
import { StructureElement, Unit } from "molstar/lib/mol-model/structure";

// ---------------------------------------------------------------------------
// Muted chain colour palette — ported from structure-design
// 12 colours alternating cool/warm for maximum adjacent-chain contrast.
// ---------------------------------------------------------------------------

const MUTED_PALETTE = [
  0x8fa5b8, // dusty blue
  0xd4a5b8, // dusty rose
  0x8fb5a5, // sage green
  0xb5a58f, // warm sand
  0xa58fb5, // muted purple
  0xb5a5a5, // warm grey-pink
  0x8fa5a5, // teal grey
  0xc4a890, // terra cotta
  0x90a8c4, // light slate blue
  0xc4a8a8, // dusty mauve
  0xa8c4a8, // mint grey
  0xc4b8a8, // warm taupe
] as const;

const THEME_NAME = "muted-chain" as const;
const ThemeParams = {};
type ThemeParams = typeof ThemeParams;

function getChainId(location: StructureElement.Location): string {
  if (!location.unit?.model) return "A";
  const { chains, chainAtomSegments } = location.unit.model.atomicHierarchy;
  return chains.label_asym_id.value(chainAtomSegments.index[location.element]);
}

function MutedChainColorTheme(
  ctx: ThemeDataContext,
  props: ThemeParams
): ColorTheme<ThemeParams> {
  if (!ctx.structure) {
    return {
      factory: MutedChainColorTheme,
      granularity: "uniform" as const,
      color: () => Color(0xcccccc),
      props,
      description: "Muted Chain Palette",
    };
  }

  const chains = new Map<string, number>();
  const loc = StructureElement.Location.create(ctx.structure);

  for (const unit of ctx.structure.units) {
    loc.unit = unit;
    const elements = unit.elements;
    const step = Math.max(1, Math.floor(elements.length / 500));
    for (let i = 0; i < elements.length; i += step) {
      loc.element = elements[i];
      const id = getChainId(loc);
      if (!chains.has(id)) chains.set(id, chains.size);
    }
  }

  const colors = Array.from({ length: chains.size }, (_, i) =>
    MUTED_PALETTE[i % MUTED_PALETTE.length]
  );

  return {
    factory: MutedChainColorTheme,
    granularity: "group" as const,
    color: ((location: StructureElement.Location) =>
      Color(colors[chains.get(getChainId(location)) ?? 0])) as ColorTheme<ThemeParams>["color"],
    props,
    description: "Muted palette by chain",
  };
}

const MutedChainThemeProvider: ColorTheme.Provider<ThemeParams, typeof THEME_NAME> = {
  name: THEME_NAME,
  label: "Muted Chain Palette",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  category: "Chain" as any,
  factory: MutedChainColorTheme,
  getParams: () => ThemeParams,
  defaultValues: PD.getDefaultValues(ThemeParams),
  isApplicable: (ctx: ThemeDataContext) => !!ctx.structure,
};

// ---------------------------------------------------------------------------
// pLDDT confidence colour theme
//
// AlphaFold2/ESMFold store pLDDT (0–100, higher = more confident) in the
// B-factor column. Molstar's built-in "uncertainty" theme maps high B-factors
// → red (treating them as high uncertainty), which inverts the AF2 convention.
// This theme correctly maps high B-factors → blue, matching the canonical
// ColabFold / PyMOL AF2 colour scale.
// ---------------------------------------------------------------------------

const PLDDT_THEME_NAME = "plddt-confidence" as const;
const PlddtThemeParams = {};
type PlddtThemeParams = typeof PlddtThemeParams;

function plddtToColor(v: number): Color {
  if (v >= 90) return Color(0x106dba); // very high — dark blue
  if (v >= 70) return Color(0x6eb1eb); // high      — light blue
  if (v >= 50) return Color(0xf6c343); // low       — yellow
  return Color(0xe4723e);              // very low  — orange
}

function PlddtColorTheme(
  ctx: ThemeDataContext,
  props: PlddtThemeParams
): ColorTheme<PlddtThemeParams> {
  const fallback: ColorTheme<PlddtThemeParams> = {
    factory: PlddtColorTheme,
    granularity: "uniform" as const,
    color: () => Color(0xaaaaaa),
    props,
    description: "pLDDT Confidence",
  };
  if (!ctx.structure) return fallback;

  return {
    factory: PlddtColorTheme,
    // "group" granularity — one colour per residue group (all atoms of a
    // residue share the same representative atom index via Location).
    granularity: "group" as const,
    color: ((location: StructureElement.Location) => {
      if (!Unit.isAtomic(location.unit)) return Color(0xaaaaaa);
      const biso = location.unit.model.atomicConformation.B_iso_or_equiv;
      if (!biso.isDefined) return Color(0xaaaaaa);
      // location.element is the model-level atom index — direct column lookup.
      return plddtToColor(biso.value(location.element));
    }) as ColorTheme<PlddtThemeParams>["color"],
    props,
    description: "pLDDT confidence from B-factor (AF2/ESMFold)",
  };
}

const PlddtThemeProvider: ColorTheme.Provider<PlddtThemeParams, typeof PLDDT_THEME_NAME> = {
  name: PLDDT_THEME_NAME,
  label: "pLDDT Confidence",
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  category: "Atom" as any,
  factory: PlddtColorTheme,
  getParams: () => PlddtThemeParams,
  defaultValues: PD.getDefaultValues(PlddtThemeParams),
  isApplicable: (ctx: ThemeDataContext) => !!ctx.structure,
};

// ---------------------------------------------------------------------------
// MolstarWrapper
// ---------------------------------------------------------------------------

export class MolstarWrapper {
  private plugin: PluginUIContext | null = null;
  private childEl: HTMLDivElement | null = null;

  async init(container: HTMLElement, theme: "light" | "dark" = "light"): Promise<void> {
    // Create a fresh child div to avoid React root conflicts
    this.childEl = document.createElement("div");
    this.childEl.style.cssText = "width:100%;height:100%;position:relative;";
    container.appendChild(this.childEl);

    const spec = DefaultPluginUISpec();
    spec.config = [
      [PluginConfig.Viewport.ShowControls, false],
      [PluginConfig.Viewport.ShowSettings, false],
      [PluginConfig.Viewport.ShowSelectionMode, false],
      [PluginConfig.Viewport.ShowAnimation, false],
      [PluginConfig.Viewport.ShowExpand, false],
    ];
    spec.layout = {
      initial: {
        showControls: false,
        regionState: {
          left: "hidden",
          right: "hidden",
          top: "hidden",
          bottom: "hidden",
        },
      },
    };

    this.plugin = await createPluginUI({
      target: this.childEl,
      spec,
      render: renderReact18,
    });

    // Theme-aware background: warm cream for light, dark brown for dark
    const bg = theme === "light" ? 0xfaf8f5 : 0x1a1814;
    this.plugin.canvas3d?.setProps({
      renderer: { backgroundColor: Color(bg) as unknown as Color },
      camera: { helper: { axes: { name: "off", params: {} } } },
    });

    // Register custom colour themes
    this.plugin.representation.structure.themes.colorThemeRegistry.add(
      MutedChainThemeProvider
    );
    this.plugin.representation.structure.themes.colorThemeRegistry.add(
      PlddtThemeProvider
    );
  }

  /** Infer mmcif or pdb from the file extension. Defaults to mmcif. */
  private static inferFormat(url: string): "mmcif" | "pdb" {
    const ext = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ext === "pdb" || ext === "ent" ? "pdb" : "mmcif";
  }

  /**
   * Load a structure from a URL.
   *
   * format defaults to auto-detected from the URL extension.
   * colorMode:
   *   "chain"  — muted chain palette (default, good for multimer binders)
   *   "plddt"  — uncertainty/B-factor gradient (blue=high, orange=low)
   *              AlphaFold stores pLDDT in the B-factor column, so this
   *              gives the canonical confidence colouring for AF2/ESMFold.
   */
  async load(
    url: string,
    format?: "mmcif" | "pdb",
    colorMode: "chain" | "plddt" = "chain"
  ): Promise<void> {
    const resolvedFormat = format ?? MolstarWrapper.inferFormat(url);
    if (!this.plugin) throw new Error("Viewer not initialised");

    await this.plugin.clear();

    const data = await this.plugin.builders.data.download(
      { url: Asset.Url(url), isBinary: false },
      { state: { isGhost: true } }
    );

    const trajectory = await this.plugin.builders.structure.parseTrajectory(
      data,
      resolvedFormat === "pdb" ? "pdb" : "mmcif"
    );

    const model = await this.plugin.builders.structure.createModel(trajectory);
    const structure = await this.plugin.builders.structure.createStructure(model, {
      name: "model",
      params: {},
    });
    const component = await this.plugin.builders.structure.tryCreateComponentStatic(
      structure,
      "polymer"
    );

    if (component) {
      // Use the custom PlddtColorTheme for AF2/ESMFold: high B-factor → blue.
      // Molstar's built-in "uncertainty" inverts this (high B → red), so we
      // register and use our own theme instead.
      const color =
        colorMode === "plddt"
          ? (PLDDT_THEME_NAME as unknown as "chain-id")
          : (THEME_NAME as unknown as "chain-id");

      await this.plugin.builders.structure.representation.addRepresentation(
        component,
        { type: "cartoon", color }
      );
    }

    PluginCommands.Camera.Reset(this.plugin, {});
  }

  dispose(): void {
    if (this.plugin) {
      this.plugin.dispose();
      this.plugin = null;
    }
    if (this.childEl) {
      this.childEl.remove();
      this.childEl = null;
    }
  }
}
