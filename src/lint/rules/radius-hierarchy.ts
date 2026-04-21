import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

const PILL_OR_SHARP = /^(?:0|0px|rounded-none|rounded-full|999px|9999px|50%)$/i;

function isPillOrSharp(value: string): boolean {
  return PILL_OR_SHARP.test(value.trim());
}

export const rule: Rule = {
  id: "ahd/radius-hierarchy",
  severity: "warn",
  description:
    "Buttons, cards and media sharing one medium radius flattens hierarchy. Sharp-only or sharp + pill are deliberate decisions and don't fire.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const cssRadii = new Set(
      findAll(combined, /border-radius\s*:\s*([^;}]+)/gi).map((m) =>
        m[1].trim(),
      ),
    );
    const classContent = findAll(input.html, /class\s*=\s*"([^"]*)"/gi)
      .map((m) => m[1])
      .join(" ");
    const twRadii = new Set(
      findAll(
        classContent,
        /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/gi,
      ).map((m) => m[0]),
    );
    const all = [...cssRadii, ...twRadii];
    if (all.length === 0) return [];
    const allDecisions = new Set(all);
    if (allDecisions.size >= 2) return [];

    const only = [...allDecisions][0];
    if (isPillOrSharp(only)) return [];

    return [
      violation(
        rule,
        input,
        `Only one radius value ("${only}") declared across the page. Make buttons sharper or softer than cards, and media different from both. (Sharp-only or sharp+pill compositions don't fire this rule.)`,
      ),
    ];
  },
};
