import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/no-uniform-radius",
  severity: "warn",
  description:
    "A page where every interactive surface shares one medium radius (rounded-xl / 2xl / 12–16px) reads as shadcn default.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const cssRadii = findAll(combined, /border-radius\s*:\s*([^;}]+)/gi).map(
      (m) => m[1].trim(),
    );
    const classContent = findAll(
      input.html,
      /class\s*=\s*"([^"]*)"/gi,
    )
      .map((m) => m[1])
      .join(" ");
    const twRadii = findAll(
      classContent,
      /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/gi,
    ).map((m) => m[0]);

    const all = [...cssRadii, ...twRadii];
    if (all.length < 3) return [];

    const counts = new Map<string, number>();
    for (const r of all) counts.set(r, (counts.get(r) ?? 0) + 1);
    const total = all.length;
    const distinct = counts.size;
    const [topVal, topCount] = [...counts.entries()].sort(
      (a, b) => b[1] - a[1],
    )[0];
    const dominantShare = topCount / total;

    const defaulty =
      /rounded-(xl|2xl|3xl)/.test(topVal) ||
      /^1[2-6]px$/.test(topVal) ||
      /^0?\.?(75|1|1\.5)rem$/.test(topVal);

    if (distinct <= 2 && dominantShare >= 0.7 && defaulty) {
      return [
        violation(
          rule,
          input,
          `Border-radius is uniform (${topVal} dominates ${Math.round(dominantShare * 100)}% of ${total} occurrences). A token with radius hierarchy mixes 0, sharp, and pill.`,
        ),
      ];
    }
    return [];
  },
};
