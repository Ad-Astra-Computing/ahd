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
      const pattern = new RegExp(
        `<(div|span)[^>]*class\\s*=\\s*"[^"]*\\brounded-(?:md|lg|xl|2xl|full)\\b[^"]*(?:bg-gradient|bg-indigo-|bg-violet-|bg-purple-|bg-blue-)[^"]*"[^>]*>[\\s\\S]{0,200}?<${name}\\b`,
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
