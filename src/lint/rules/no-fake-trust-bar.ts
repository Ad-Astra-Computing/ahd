import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-fake-trust-bar",
  severity: "info",
  description:
    "A 'Trusted by' strip whose logos are not declared customers reads as theatre.",
  check: (input) => {
    const out = [];
    const bars = findAll(
      input.html,
      /(?:trusted by|backed by|as seen in|featured in)[\s\S]{0,400}/gi,
    );
    for (const m of bars) {
      const logoCount = (m[0].match(/<img\b|<svg\b/gi) ?? []).length;
      if (logoCount >= 3) {
        out.push(
          violation(
            rule,
            input,
            `"Trusted by" strip with ${logoCount} logos. If these are real customers, declare them in had.config; otherwise remove the bar.`,
            { line: lineOf(input.html, m.index) },
          ),
        );
      }
    }
    return out;
  },
};
