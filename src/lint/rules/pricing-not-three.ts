import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/pricing-not-three",
  severity: "info",
  description:
    "Three pricing tiers with a 'Most Popular' middle is the SaaS cliché.",
  check: (input) => {
    const out = [];
    const pricingMarkers = findAll(
      input.html,
      /<(section|div)[^>]*(?:id|class)\s*=\s*"[^"]*pricing[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi,
    );
    for (const m of pricingMarkers) {
      const inner = m[2];
      const mostPopularHits = (
        inner.match(/most[\s-]?popular|recommended|best[\s-]?value/gi) ?? []
      ).length;
      const tierCount = (inner.match(/\btier\b|\bplan\b/gi) ?? []).length;
      if (mostPopularHits >= 1 && tierCount >= 3) {
        out.push(
          violation(
            rule,
            input,
            `Pricing section uses the three-tier / most-popular pattern. Fine if intentional; remove this info if the brief calls for it explicitly.`,
            { line: lineOf(input.html, m.index) },
          ),
        );
      }
    }
    return out;
  },
};
