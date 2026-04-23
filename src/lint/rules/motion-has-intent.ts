import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/motion-has-intent",
  severity: "warn",
  description:
    "Fade-up on everything with no stagger reason is decoration.",
  check: (input) => {
    const combined =
      input.css + "\n" + extractInline(input.html).style + "\n" + input.html;
    const motionHits = findAll(
      combined,
      /\b(animate-(?:fade|slide)-up|data-aos|motion-(?:fade|slide)-up|framer-motion|initial=\{|animate=\{)\b/gi,
    ).length;
    const intentHits = findAll(
      combined,
      /data-motion|data-aos-delay|stagger-children|delayChildren|stagger-/gi,
    ).length;
    if (motionHits >= 4 && intentHits === 0) {
      return [
        violation(
          rule,
          input,
          `${motionHits} motion applications with no declared intent (no data-motion, no stagger). Motion without reason is decoration.`,
        ),
      ];
    }
    return [];
  },
};
