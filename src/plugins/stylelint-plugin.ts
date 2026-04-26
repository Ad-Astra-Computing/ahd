import { lintSource } from "../lint/engine.js";
import { rules as ahdRules } from "../lint/rules/index.js";
import type { Violation } from "../lint/types.js";

const CSS_ONLY = new Set([
  "ahd/no-default-grotesque",
  "ahd/no-purple-blue-gradient",
  "ahd/weight-variety",
  "ahd/require-type-pairing",
  "ahd/no-flat-dark-mode",
  "ahd/no-uniform-radius",
  "ahd/no-indiscriminate-glass",
  "ahd/single-shadow-style",
  "ahd/respect-reduced-motion",
  "ahd/line-height-per-size",
  "ahd/body-measure",
  "ahd/tracking-per-size",
  "ahd/radius-hierarchy",
  "ahd/no-shimmer-decoration",
]);

interface StylelintResult {
  warn(message: string, options?: Record<string, unknown>): void;
}

type StylelintRule = (primaryOption: unknown) => (root: unknown, result: StylelintResult) => void;

// Per-stylesheet memoised lint cache. Without this, every enabled
// stylelint rule re-runs the full AHD linter over the entire stylesheet,
// turning one stylelint pass into N full lint passes. Cache is keyed
// by the postcss Root identity so distinct files get independent runs.
type CachedReport = { ruleHits: Map<string, Violation[]> };
const cache = new WeakMap<object, CachedReport>();

function lintForRoot(root: any): CachedReport {
  const key = root as object;
  const hit = cache.get(key);
  if (hit) return hit;
  const cssText: string = root?.source?.input?.css ?? root?.toString?.() ?? "";
  const report = lintSource({
    file: root?.source?.input?.file ?? "<stylelint>",
    html: "",
    css: cssText,
  });
  const ruleHits = new Map<string, Violation[]>();
  for (const v of report.violations) {
    const arr = ruleHits.get(v.ruleId) ?? [];
    arr.push(v);
    ruleHits.set(v.ruleId, arr);
  }
  const cached = { ruleHits };
  cache.set(key, cached);
  return cached;
}

// Map a violation onto a postcss node when possible. The AHD linter
// reports line numbers; this walks the postcss AST to find the
// nearest Declaration / Rule whose `source.start.line` matches and
// returns it for stylelint's editor-annotation surface. When no node
// matches (whole-file violations like weight-variety) the warning is
// emitted without a node anchor, matching prior behaviour.
function findNodeForLine(root: any, line: number | undefined): any {
  if (!line) return undefined;
  let match: any = undefined;
  // postcss Root has .walk() which iterates every node in source order.
  root.walk?.((node: any) => {
    const start = node.source?.start?.line;
    if (start === line) {
      match = node;
      return false; // stop walk
    }
    return undefined;
  });
  return match;
}

export function createStylelintPlugin() {
  const plugins: Array<{ ruleName: string; rule: StylelintRule }> = [];

  for (const rule of ahdRules) {
    if (!CSS_ONLY.has(rule.id)) continue;
    const ruleName = rule.id;

    const stylelintRule: StylelintRule = (primaryOption: unknown) => {
      return (root: any, result: StylelintResult) => {
        if (primaryOption === false || primaryOption === null) return;
        const cached = lintForRoot(root);
        const hits = cached.ruleHits.get(rule.id) ?? [];
        for (const v of hits) {
          const node = findNodeForLine(root, v.line);
          result.warn(v.message, {
            severity: rule.severity === "error" ? "error" : "warning",
            ...(node ? { node } : {}),
            ...(v.line ? { word: undefined, index: undefined } : {}),
          });
        }
      };
    };
    plugins.push({ ruleName, rule: stylelintRule });
  }

  return {
    meta: { name: "stylelint-plugin-ahd", version: "0.5.0-beta.1" },
    plugins,
    rules: Object.fromEntries(plugins.map((p) => [p.ruleName, p.rule])),
  };
}

export default createStylelintPlugin();
