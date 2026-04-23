import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

const BANNED = [
  "build the future of",
  "ship faster",
  "AI-native",
  "cutting-edge",
  "seamless",
  "best-in-class",
  "unleash",
  "empower your",
  "revolutionize",
  "game-changing",
  "next-generation",
];

export const rule: Rule = {
  id: "ahd/no-slop-copy",
  severity: "warn",
  description: "Banned marketing phrases that signal median SaaS copy.",
  check: (input) => {
    const text = extractInline(input.html).text;
    const out = [];
    for (const phrase of BANNED) {
      const hits = findAll(text, new RegExp(phrase, "gi"));
      for (const h of hits) {
        out.push(
          violation(
            rule,
            input,
            `Copy contains banned phrase: "${phrase}".`,
            {
              line: lineOf(input.html, h.index),
              snippet: text.slice(Math.max(0, h.index - 20), h.index + 40),
            },
          ),
        );
      }
    }
    return out;
  },
};
