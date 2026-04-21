import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-indiscriminate-glass",
  severity: "warn",
  description:
    "Glassmorphism on more than one distinct component type is decoration, not design.",
  check: (input) => {
    const combined =
      input.css + "\n" + extractInline(input.html).style + "\n" + input.html;
    const cssHits = findAll(combined, /backdrop-filter\s*:\s*blur\([^)]+\)/gi);
    const twHits = findAll(combined, /\bbackdrop-blur(?:-[a-z0-9]+)?\b/gi);
    const total = cssHits.length + twHits.length;
    if (total >= 2) {
      return [
        violation(
          rule,
          input,
          `backdrop-blur is used ${total} times. If glass is the point, pick one surface; if it isn't, remove it.`,
        ),
      ];
    }
    return [];
  },
};
