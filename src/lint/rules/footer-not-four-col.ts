import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

const CANONICAL = ["Product", "Company", "Resources", "Legal"];

export const rule: Rule = {
  id: "ahd/footer-not-four-col",
  severity: "info",
  description: "The Product / Company / Resources / Legal footer is reflexive.",
  check: (input) => {
    const out = [];
    const footers = findAll(
      input.html,
      /<footer\b[\s\S]*?<\/footer>/gi,
    );
    for (const m of footers) {
      const inner = m[0];
      const hits = CANONICAL.filter((c) => new RegExp(`\\b${c}\\b`, "i").test(inner));
      if (hits.length >= 3) {
        out.push(
          violation(
            rule,
            input,
            `Footer uses the canonical 4-column taxonomy (${hits.join(", ")}). If this is intentional, disable the rule in config with a reason.`,
            { line: lineOf(input.html, m.index) },
          ),
        );
      }
    }
    return out;
  },
};
