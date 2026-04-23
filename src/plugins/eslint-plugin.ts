import { lintSource } from "../lint/engine.js";
import { rules as ahdRules } from "../lint/rules/index.js";

interface Context {
  getSourceCode(): { text: string };
  report(descriptor: { message: string; loc?: { line: number; column: number } }): void;
  filename?: string;
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
            const text = context.getSourceCode().text;
            const report = lintSource({
              file: context.filename ?? "<eslint>",
              html: text,
              css: text,
            });
            for (const v of report.violations.filter((x) => x.ruleId === rule.id)) {
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
