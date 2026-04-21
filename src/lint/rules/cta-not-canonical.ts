import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/cta-not-canonical",
  severity: "info",
  description:
    "The canonical 44px gradient-fill + trailing arrow CTA is the template button.",
  check: (input) => {
    const out = [];
    const pattern =
      /<(a|button)[^>]*class\s*=\s*"[^"]*(?:bg-gradient-|from-\w+-\d+)[^"]*"[^>]*>[\s\S]{0,300}?(?:→|&rarr;|<svg[^>]*(?:arrow|chevron)[^>]*>)[\s\S]*?<\/\1>/gi;
    for (const m of findAll(input.html, pattern)) {
      out.push(
        violation(
          rule,
          input,
          `CTA matches the canonical gradient-fill + trailing-arrow pattern. Make the call to action visually specific to the brief.`,
          { line: lineOf(input.html, m.index), snippet: m[0].slice(0, 120) },
        ),
      );
    }
    return out;
  },
};
