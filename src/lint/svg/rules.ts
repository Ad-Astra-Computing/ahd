import type { Violation, Rule, LintInput, Severity } from "../types.js";
import { findAll } from "../util.js";

interface SvgRule {
  id: string;
  severity: Severity;
  description: string;
  check: (svg: string, input: LintInput) => Violation[];
}

function vio(
  rule: SvgRule,
  input: LintInput,
  message: string,
  extra?: { snippet?: string },
): Violation {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    file: input.file,
    message,
    snippet: extra?.snippet,
  };
}

export const svgUniformStroke: SvgRule = {
  id: "ahd/svg/no-uniform-stroke",
  severity: "warn",
  description:
    "Monoline illustration (every stroke the same width) is a Feather/Lucide default tell.",
  check: (svg, input) => {
    const matches = findAll(svg, /stroke-width\s*=\s*["']?([\d.]+)["']?/gi).map(
      (m) => m[1],
    );
    const cssMatches = findAll(svg, /stroke-width\s*:\s*([\d.]+)/gi).map((m) => m[1]);
    const all = [...matches, ...cssMatches];
    if (all.length < 4) return [];
    const distinct = new Set(all);
    if (distinct.size === 1 && (all[0] === "1" || all[0] === "1.5" || all[0] === "2")) {
      return [
        vio(
          svgUniformStroke,
          input,
          `Every one of ${all.length} stroke-width declarations is ${all[0]}. Monoline uniformity is the illustration equivalent of Inter-on-everything.`,
        ),
      ];
    }
    return [];
  },
};

export const svgPaletteBounds: SvgRule = {
  id: "ahd/svg/palette-bounds",
  severity: "info",
  description:
    "Every colour used in the SVG should trace back to the token's declared palette.",
  check: (svg, input) => {
    const hexes = new Set(
      findAll(svg, /#([0-9a-f]{3}|[0-9a-f]{6})\b/gi).map((m) => m[0].toLowerCase()),
    );
    if (hexes.size === 0) return [];
    if (hexes.size > 6) {
      return [
        vio(
          svgPaletteBounds,
          input,
          `SVG uses ${hexes.size} distinct hex colours. Most single-illustration tokens declare 3–5; more than that usually means the generator drifted off-palette.`,
        ),
      ];
    }
    return [];
  },
};

export const svgHighSymmetry: SvgRule = {
  id: "ahd/svg/no-perfect-symmetry",
  severity: "info",
  description:
    "A perfectly mirrored composition is the stock-illustration / Alegria default. Tokens require at least one asymmetric element.",
  check: (svg, input) => {
    const root = svg.match(/<svg[^>]*viewBox\s*=\s*["']([^"']+)["']/);
    if (!root) return [];
    const [, vb] = root;
    const parts = vb.split(/\s+/).map(Number);
    if (parts.length < 4) return [];
    const [, , w] = parts;
    const mid = w / 2;
    const xs = findAll(svg, /(?:x|cx)\s*=\s*["']([-\d.]+)["']/gi)
      .map((m) => parseFloat(m[1]))
      .filter((v) => !Number.isNaN(v));
    if (xs.length < 6) return [];
    let leftCount = 0;
    let rightCount = 0;
    for (const x of xs) {
      if (x < mid) leftCount++;
      else if (x > mid) rightCount++;
    }
    const skew = Math.abs(leftCount - rightCount) / Math.max(1, xs.length);
    if (skew < 0.05) {
      return [
        vio(
          svgHighSymmetry,
          input,
          `SVG elements are almost perfectly mirrored across the vertical axis (${leftCount}/${rightCount} skew). Most AHD tokens demand one intentional asymmetric element.`,
        ),
      ];
    }
    return [];
  },
};

export const svgRules: SvgRule[] = [
  svgUniformStroke,
  svgPaletteBounds,
  svgHighSymmetry,
];

export const svgRulesAsRules: Rule[] = svgRules.map((r) => ({
  id: r.id,
  severity: r.severity,
  description: r.description,
  check: (input: LintInput) => {
    if (!input.html.includes("<svg")) return [];
    return r.check(input.html, input);
  },
}));
