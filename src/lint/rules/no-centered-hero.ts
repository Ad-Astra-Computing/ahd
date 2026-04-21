import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-centered-hero",
  severity: "warn",
  description:
    "The centred pill + headline + subhead + two CTAs is the median landing page.",
  check: (input) => {
    const out = [];
    const pattern =
      /<(section|header|div|main)[^>]*class\s*=\s*"[^"]*(?:text-center|items-center[^"]*justify-center|mx-auto[^"]*max-w-)[^"]*"[^>]*>([\s\S]{0,2000}?)<h1\b[\s\S]{0,500}?<\/h1>/gi;
    for (const m of findAll(input.html, pattern)) {
      out.push(
        violation(
          rule,
          input,
          `Hero container centres its h1. Left-align, anchor to the grid, and let typography carry the weight.`,
          { line: lineOf(input.html, m.index), snippet: m[0].slice(0, 140) },
        ),
      );
    }
    return out;
  },
};
