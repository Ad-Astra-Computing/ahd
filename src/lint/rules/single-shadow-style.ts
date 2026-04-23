import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/single-shadow-style",
  severity: "info",
  description:
    "One shadow on every card is a token fingerprint, not a shadow system.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const cssShadows = findAll(combined, /box-shadow\s*:\s*([^;}]+)/gi).map(
      (m) => m[1].trim(),
    );
    const twShadows = findAll(
      input.html,
      /\bshadow(?:-(?:none|sm|md|lg|xl|2xl|inner|soft))?\b/gi,
    ).map((m) => m[0]);
    const all = [...cssShadows, ...twShadows];
    if (all.length < 3) return [];
    const distinct = new Set(all).size;
    if (distinct === 1) {
      return [
        violation(
          rule,
          input,
          `All ${all.length} shadowed surfaces use the same shadow token. A page with depth has a shadow system (ambient / lift / focus), not a brand stamp.`,
        ),
      ];
    }
    return [];
  },
};
