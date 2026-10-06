import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

const LUCIDE = [
  "Zap",
  "Shield",
  "Sparkles",
  "Rocket",
  "Lock",
  "Gauge",
  "Brain",
  "Wand",
  "Wand2",
  "BookOpen",
  "Cpu",
];

export const rule: Rule = {
  id: "ahd/no-lucide-in-rounded-square",
  severity: "warn",
  description:
    "Lucide icon in a rounded-square gradient tile is the feature-card canonical.",
  check: (input) => {
    const out = [];
    for (const name of LUCIDE) {
      // Three `[^"]*` runs chained with required literals between them;
      // bounded for the same reason as ahd/no-three-equal-cards.
      const pattern = new RegExp(
        `<(div|span)[^>]{0,500}class\\s*=\\s*"[^"]{0,500}\\brounded-(?:md|lg|xl|2xl|full)\\b[^"]{0,500}(?:bg-gradient|bg-indigo-|bg-violet-|bg-purple-|bg-blue-)[^"]{0,500}"[^>]{0,500}>[\\s\\S]{0,200}?<${name}\\b`,
        "gi",
      );
      for (const m of findAll(input.html, pattern)) {
        out.push(
          violation(
            rule,
            input,
            `Lucide <${name}/> inside a rounded gradient tile — the feature-card cliché. Drop the tile or use a non-Lucide mark.`,
            {
              line: lineOf(input.html, m.index),
              snippet: m[0].slice(0, 120),
            },
          ),
        );
      }
    }
    return out;
  },
};
