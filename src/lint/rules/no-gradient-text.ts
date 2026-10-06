import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

const BAIT = /\b(AI|future|intelligence|tomorrow)\b/i;

export const rule: Rule = {
  id: "ahd/no-gradient-text",
  severity: "error",
  description:
    "Gradient text on bait words (AI, future, tomorrow) is the canonical overreach.",
  check: (input) => {
    const out = [];

    // Three `[^"]*` runs chained with required literals between them;
    // bounded for the same reason as ahd/no-three-equal-cards.
    const tailwindPattern =
      /<(h1|h2|span|div)[^>]{0,500}class\s*=\s*"[^"]{0,500}(?:bg-clip-text|text-transparent)[^"]{0,500}bg-gradient-[^"]{0,500}"[^>]{0,500}>([\s\S]*?)<\/\1>/gi;
    for (const m of findAll(input.html, tailwindPattern)) {
      if (BAIT.test(m[2])) {
        out.push(
          violation(
            rule,
            input,
            `Gradient text applied to bait copy: "${m[2].replace(/\s+/g, " ").trim().slice(0, 60)}".`,
            { line: lineOf(input.html, m.index), snippet: m[0].slice(0, 120) },
          ),
        );
      }
    }

    const css = input.css + "\n" + extractInline(input.html).style;
    const clipRules = [
      ...css.matchAll(
        /\.([\w-]+)\s*\{[^}]*(?:-webkit-)?background-clip\s*:\s*text[^}]*\}/gi,
      ),
    ];
    for (const cssMatch of clipRules) {
      const className = cssMatch[1];
      const elementPattern = new RegExp(
        `<(h1|h2|h3|span|div|p)[^>]{0,500}class\\s*=\\s*"[^"]{0,500}\\b${className}\\b[^"]{0,500}"[^>]{0,500}>([\\s\\S]*?)</\\1>`,
        "gi",
      );
      for (const m of findAll(input.html, elementPattern)) {
        if (BAIT.test(m[2])) {
          out.push(
            violation(
              rule,
              input,
              `Element with class "${className}" uses background-clip: text on bait copy: "${m[2].replace(/\s+/g, " ").trim().slice(0, 60)}".`,
              {
                line: lineOf(input.html, m.index),
                snippet: m[0].slice(0, 120),
              },
            ),
          );
        }
      }
    }

    return out;
  },
};
