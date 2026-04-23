import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-shimmer-decoration",
  severity: "warn",
  description:
    "The silver diagonal sweep used on any non-loading surface is the AI shimmer tell.",
  check: (input) => {
    const combined =
      input.css + "\n" + extractInline(input.html).style + "\n" + input.html;
    const out = [];
    const shimmer = findAll(
      combined,
      /\b(shimmer|animate-shimmer|ai-shimmer|shine|sparkle-sweep)\b/gi,
    );
    for (const m of shimmer) {
      out.push(
        violation(
          rule,
          input,
          `Shimmer class or keyframe referenced ("${m[0]}"). If this isn't a loading state, remove it.`,
          { line: lineOf(combined, m.index), snippet: m[0] },
        ),
      );
    }
    return out;
  },
};
