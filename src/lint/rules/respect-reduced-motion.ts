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
          `Animation declared but no @media (prefers-reduced-motion: reduce) block in the same stylesheet or scoped style. People who disable motion deserve a still page. Note: a global reduced-motion guard does not propagate into scoped component styles — each chunk that declares animation needs its own guard.`,
        ),
      ];
    }
    return [];
  },
};
