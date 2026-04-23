import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-three-equal-cards",
  severity: "warn",
  description:
    "A row of exactly three similar cards is the canonical feature-section slop.",
  check: (input) => {
    const out = [];
    const containerPattern =
      /<(section|div|ul)[^>]*class\s*=\s*"[^"]*(?:grid-cols-3|grid\s+cols-3|flex[^"]*(?:gap|space)-[^"]*)[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi;
    for (const m of findAll(input.html, containerPattern)) {
      const inner = m[2];
      const childTagMatches = [
        ...inner.matchAll(/<(div|article|li|section)(\s[^>]*)?>/gi),
      ];
      const topLevelChildren = childTagMatches.filter((c) => {
        const tag = c[1].toLowerCase();
        return tag;
      });
      const tagCounts = new Map<string, number>();
      for (const c of topLevelChildren) {
        const tag = c[1].toLowerCase();
        tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
      }
      for (const [, count] of tagCounts) {
        if (count === 3) {
          out.push(
            violation(
              rule,
              input,
              `Container renders exactly three children of the same tag. Break symmetry: give one a different size, span or treatment.`,
              {
                line: lineOf(input.html, m.index),
                snippet: m[0].slice(0, 120),
              },
            ),
          );
          break;
        }
      }
    }
    return out;
  },
};
