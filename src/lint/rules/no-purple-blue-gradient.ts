import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

const HUES = [
  "indigo",
  "purple",
  "violet",
  "fuchsia",
  "pink",
  "blue",
  "cyan",
];

export const rule: Rule = {
  id: "ahd/no-purple-blue-gradient",
  severity: "error",
  description:
    "Detect purple/blue/pink gradient triangles in raw CSS or Tailwind classes.",
  check: (input) => {
    const combined =
      input.css + "\n" + extractInline(input.html).style + "\n" + input.html;
    const out = [];
    const css = findAll(
      combined,
      /linear-gradient\s*\([^)]*\)|radial-gradient\s*\([^)]*\)/gi,
    );
    for (const m of css) {
      const hits = HUES.filter((h) => new RegExp(h, "i").test(m[0]));
      if (hits.length >= 2) {
        out.push(
          violation(
            rule,
            input,
            `Gradient contains at least two banned hues (${hits.join(", ")}). The purple→blue→pink family is the canonical AI-slop hero.`,
            { line: lineOf(combined, m.index), snippet: m[0].slice(0, 80) },
          ),
        );
      }
    }
    const tw = findAll(
      combined,
      /class\s*=\s*"[^"]*bg-gradient-to-[^"]*"/gi,
    );
    for (const m of tw) {
      const hues = HUES.filter((h) =>
        new RegExp(`(from|via|to)-${h}-`, "i").test(m[0]),
      );
      if (hues.length >= 2) {
        out.push(
          violation(
            rule,
            input,
            `Tailwind gradient class uses at least two banned hues (${hues.join(", ")}).`,
            { line: lineOf(combined, m.index), snippet: m[0].slice(0, 120) },
          ),
        );
      }
    }
    return out;
  },
};
