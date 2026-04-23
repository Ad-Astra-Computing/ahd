import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

const FLAT_BG = /#(0a0a0a|000000|0f0f0f|111111|0f172a|09090b)\b/i;

export const rule: Rule = {
  id: "ahd/no-flat-dark-mode",
  severity: "warn",
  description:
    "Pure-black background plus a single high-chroma accent is the stock dark-mode slop.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const bgs = findAll(combined, /background(?:-color)?\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})/gi);
    for (const m of bgs) {
      if (FLAT_BG.test(m[1])) {
        return [
          violation(
            rule,
            input,
            `Background uses a flat near-black (${m[1]}). Warm blacks, OKLCH ramps or paper-and-ink hierarchies read better than #0a0a0a + neon.`,
            { line: lineOf(combined, m.index), snippet: m[0] },
          ),
        ];
      }
    }
    return [];
  },
};
