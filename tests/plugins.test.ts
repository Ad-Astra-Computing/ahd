import { describe, it, expect } from "vitest";
import { createEslintPlugin } from "../src/plugins/eslint-plugin.js";
import { createStylelintPlugin } from "../src/plugins/stylelint-plugin.js";
import { rules as ahdRules } from "../src/lint/rules/index.js";

describe("eslint-plugin-ahd", () => {
  const plugin = createEslintPlugin();

  it("exports one rule per AHD source-level rule", () => {
    for (const rule of ahdRules) {
      const key = rule.id.replace(/^ahd\//, "");
      expect(plugin.rules[key], `missing eslint rule for ${rule.id}`).toBeDefined();
    }
  });

  it("ships a recommended config that covers every rule", () => {
    const configuredKeys = Object.keys(plugin.configs.recommended.rules);
    expect(configuredKeys.length).toBe(ahdRules.length);
  });

  it("error-severity AHD rules graduate to error in recommended", () => {
    const config = plugin.configs.recommended.rules;
    const errorRule = ahdRules.find((r) => r.severity === "error");
    if (!errorRule) return;
    expect(config[errorRule.id]).toBe("error");
  });
});

describe("stylelint-plugin-ahd", () => {
  const plugin = createStylelintPlugin();

  it("exports a stylelint rule for every CSS-only AHD rule", () => {
    expect(plugin.plugins.length).toBeGreaterThanOrEqual(10);
    for (const p of plugin.plugins) {
      expect(p.ruleName.startsWith("ahd/")).toBe(true);
    }
  });

  it("rules map covers every registered plugin", () => {
    for (const p of plugin.plugins) {
      expect(plugin.rules[p.ruleName]).toBe(p.rule);
    }
  });
});
