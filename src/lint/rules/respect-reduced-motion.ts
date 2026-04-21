import type { Rule } from "../types.js";
import { extractInline, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/respect-reduced-motion",
  severity: "error",
  description:
    "Animations declared without a prefers-reduced-motion escape hatch.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const hasAnimation =
      /@keyframes\s+/i.test(combined) ||
      /\banimation\s*:/i.test(combined) ||
      /\btransition\s*:[^;}]*(?:1?\d{2,})ms/i.test(combined);
    const hasReducedMotionBlock = /@media\s*\([^)]*prefers-reduced-motion[^)]*\)/i.test(
      combined,
    );
    if (hasAnimation && !hasReducedMotionBlock) {
      return [
        violation(
          rule,
          input,
          `Animation declared but no @media (prefers-reduced-motion: reduce) block. People who disable motion deserve a still page.`,
        ),
      ];
    }
    return [];
  },
};
