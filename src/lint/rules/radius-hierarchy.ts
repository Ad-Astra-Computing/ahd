import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/radius-hierarchy",
  severity: "warn",
  description:
    "Buttons, cards and media sharing one radius flattens hierarchy.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const cssRadii = new Set(
      findAll(combined, /border-radius\s*:\s*([^;}]+)/gi).map((m) =>
        m[1].trim(),
      ),
    );
    const classContent = findAll(
      input.html,
      /class\s*=\s*"([^"]*)"/gi,
    )
      .map((m) => m[1])
      .join(" ");
    const twRadii = new Set(
      findAll(
        classContent,
        /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/gi,
      ).map((m) => m[0]),
    );
    const all = new Set([...cssRadii, ...twRadii]);
    if (all.size === 0) return [];
    if (all.size < 2) {
      return [
        violation(
          rule,
          input,
          `Only one radius value (${[...all][0]}) declared across the page. Make buttons sharper or softer than cards, and media different from both.`,
        ),
      ];
    }
    return [];
  },
};
