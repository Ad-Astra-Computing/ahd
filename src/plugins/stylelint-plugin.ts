import { lintSource } from "../lint/engine.js";
import { rules as ahdRules } from "../lint/rules/index.js";

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

export function createStylelintPlugin() {
  const plugins: Array<{ ruleName: string; rule: StylelintRule }> = [];

  for (const rule of ahdRules) {
    if (!CSS_ONLY.has(rule.id)) continue;
    const ruleName = rule.id;

    const stylelintRule: StylelintRule = (primaryOption: unknown) => {
      return (root: any, result: StylelintResult) => {
        if (primaryOption === false || primaryOption === null) return;
        const cssText: string = root?.source?.input?.css ?? root?.toString?.() ?? "";
        const report = lintSource({
          file: root?.source?.input?.file ?? "<stylelint>",
          html: "",
          css: cssText,
        });
        for (const v of report.violations.filter((x) => x.ruleId === rule.id)) {
          result.warn(v.message, {
            severity: rule.severity === "error" ? "error" : "warning",
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
