import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-centered-hero",
  severity: "warn",
  description:
    "The centred pill + headline + subhead + two CTAs is the median landing page.",
  check: (input) => {
    const out = [];
    // Every `[^"]*` run bounded: the alternation branches each chain
    // their own unbounded run with the outer ones, the same shape
    // fixed in ahd/no-three-equal-cards.
    const pattern =
      /<(section|header|div|main)[^>]{0,500}class\s*=\s*"[^"]{0,500}(?:text-center|items-center[^"]{0,500}justify-center|mx-auto[^"]{0,500}max-w-)[^"]{0,500}"[^>]{0,500}>([\s\S]{0,2000}?)<h1\b[\s\S]{0,500}?<\/h1>/gi;
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
