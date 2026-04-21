import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/line-height-per-size",
  severity: "warn",
  description:
    "A single line-height across display, body and caption reads as untuned type.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const lhs = new Set(
      findAll(combined, /line-height\s*:\s*([^;}]+)/gi).map((m) =>
        m[1].trim().toLowerCase(),
      ),
    );
    if (lhs.size === 0) return [];
    if (lhs.size < 2) {
      return [
        violation(
          rule,
          input,
          `Only one line-height value (${[...lhs][0]}) declared. Display needs ~1.05; body ~1.5–1.6; captions ~1.3.`,
        ),
      ];
    }
    return [];
  },
};
