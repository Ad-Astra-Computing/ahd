import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/body-measure",
  severity: "warn",
  description:
    "Body text width must sit inside the readable 55–75ch band at the primary breakpoint.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const widths = findAll(
      combined,
      /(?:max-width|width)\s*:\s*(\d+)(ch|rem|em|px)/gi,
    );
    const out = [];
    for (const m of widths) {
      const n = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === "ch") {
        if (n < 45 || n > 85) {
          out.push(
            violation(
              rule,
              input,
              `Measure ${n}ch sits outside the readable 55–75ch band (tolerance 45–85). Body set for filling columns, not reading.`,
            ),
          );
          return out;
        }
      }
    }
    return [];
  },
};
