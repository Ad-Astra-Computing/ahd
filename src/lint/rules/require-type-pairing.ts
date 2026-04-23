import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

function primaryFamily(stack: string): string {
  const first = stack.split(",")[0]?.trim().replace(/['"]/g, "") ?? "";
  return first.toLowerCase();
}

export const rule: Rule = {
  id: "ahd/require-type-pairing",
  severity: "error",
  description: "A page needs at least two distinct font families.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const families = new Set(
      findAll(combined, /font-family\s*:\s*([^;}]+)/gi).map((m) =>
        primaryFamily(m[1]),
      ),
    );
    families.delete("");
    families.delete("inherit");
    families.delete("serif");
    families.delete("sans-serif");
    families.delete("monospace");
    families.delete("system-ui");
    if (families.size === 0) return [];
    if (families.size < 2) {
      return [
        violation(
          rule,
          input,
          `Only one font family declared (${[...families].join(", ")}). Pair a display face with a text face.`,
        ),
      ];
    }
    return [];
  },
};
