import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/weight-variety",
  severity: "warn",
  description:
    "A page with only two font-weights (typically 400 and 600) lacks typographic voice.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const css = new Set(
      findAll(combined, /font-weight\s*:\s*(\d{3}|bold|normal|semibold|medium|thin|black|light|extrabold)/gi).map(
        (m) => m[1].toLowerCase(),
      ),
    );
    const tw = new Set(
      findAll(
        input.html,
        /\b(?:font-)(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/gi,
      ).map((m) => m[1].toLowerCase()),
    );
    const all = new Set([...css, ...tw]);
    if (all.size === 0) return [];
    if (all.size < 3) {
      return [
        violation(
          rule,
          input,
          `Only ${all.size} distinct font-weight value(s) used (${[...all].join(", ") || "none detected"}). The token declares multiple weights; use them.`,
        ),
      ];
    }
    return [];
  },
};
