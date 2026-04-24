import type { Rule } from "../types.js";
import { parseHtml, proseText, violation } from "../util.js";

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

// 0.8.0: moved off regex to parse5 AST. The prior implementation
// scanned the full text-content of the HTML (via a blunt "strip all
// tags" replace), which fired on phrases that appeared inside <code>
// or <pre> on documentation pages that legitimately cited the banned
// phrases. The AST walker skips code and pre, so documentation about
// slop copy no longer gets flagged as slop copy.
export const rule: Rule = {
  id: "ahd/no-slop-copy",
  severity: "warn",
  description: "Banned marketing phrases that signal median SaaS copy.",
  check: (input) => {
    const tree = parseHtml(input);
    const out: ReturnType<Rule["check"]> = [];
    const seen = new Set<string>();
    for (const { text, sourceLine } of proseText(tree)) {
      for (const phrase of BANNED) {
        const idx = text.toLowerCase().indexOf(phrase.toLowerCase());
        if (idx < 0) continue;
        const key = `${sourceLine ?? -1}::${phrase}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(
          violation(
            rule,
            input,
            `Copy contains banned phrase: "${phrase}".`,
            {
              line: sourceLine,
              snippet: text
                .slice(Math.max(0, idx - 20), idx + 60)
                .trim()
                .slice(0, 140),
            },
          ),
        );
      }
    }
    return out;
  },
};
