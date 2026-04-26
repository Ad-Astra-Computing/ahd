import { lintSource } from "../lint/engine.js";
import { rules as ahdRules } from "../lint/rules/index.js";
import type { Violation } from "../lint/types.js";

interface Context {
  getSourceCode(): { text: string };
  report(descriptor: { message: string; loc?: { line: number; column: number } }): void;
  filename?: string;
}

// Per-program memoised lint cache. Without this the plugin would
// re-lint the entire file once per enabled rule (`Program` fires per
// rule's create()), turning a single ESLint pass into N full lint
// passes. The cache is keyed by source-code identity so distinct
// files get independent runs and a single file's lint output is
// shared across all rules in that pass.
//
// JSX/TSX is fed to lintSource as `html` only (not as both html and
// css), because feeding the same buffer in as both surfaces would
// cause CSS-only rules to attempt to parse JSX-with-style-strings as
// stylesheets and create false positives. CSS-in-JSX is the
// stylelint plugin's job.
type CachedReport = { ruleHits: Map<string, Violation[]> };
const cache = new WeakMap<object, CachedReport>();

function lintForContext(context: Context): CachedReport {
  const sc = context.getSourceCode();
  const key = sc as unknown as object;
  const hit = cache.get(key);
  if (hit) return hit;
  const text = sc.text;
  const report = lintSource({
    file: context.filename ?? "<eslint>",
    html: text,
    css: "",
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

export function createEslintPlugin() {
  const eslintRules: Record<string, unknown> = {};
  for (const rule of ahdRules) {
    const ruleKey = rule.id.replace(/^ahd\//, "");
    eslintRules[ruleKey] = {
      meta: {
        type: rule.severity === "info" ? "suggestion" : "problem",
        docs: {
          description: rule.description,
          recommended: rule.severity === "error",
        },
        schema: [],
        messages: { slop: "{{ message }}" },
      },
      create(context: Context) {
        return {
          Program() {
            const cached = lintForContext(context);
            const hits = cached.ruleHits.get(rule.id) ?? [];
            for (const v of hits) {
              context.report({
                message: v.message,
                loc: v.line ? { line: v.line, column: 0 } : undefined,
              });
            }
          },
        };
      },
    };
  }

  const recommendedConfig: Record<string, string> = {};
  for (const rule of ahdRules) {
    const ruleKey = rule.id.replace(/^ahd\//, "ahd/");
    recommendedConfig[ruleKey] =
      rule.severity === "error" ? "error" : rule.severity === "warn" ? "warn" : "off";
  }

  return {
    meta: { name: "eslint-plugin-ahd", version: "0.5.0-beta.1" },
    rules: eslintRules,
    configs: {
      recommended: {
        plugins: ["ahd"],
        rules: recommendedConfig,
      },
    },
  };
}

export default createEslintPlugin();
