import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

const TELLS = [
  /spline\.design\/[^"']+default/i,
  /prod\.spline\.design\/\w+\/scene\.splinecode/i,
  /iridescent-?blob/i,
  /orb\.splinecode/i,
];

export const rule: Rule = {
  id: "ahd/no-default-spline",
  severity: "warn",
  description:
    "Stock 3D hero blobs and default Spline scenes are visual fillers.",
  check: (input) => {
    const out = [];
    for (const pat of TELLS) {
      for (const m of findAll(input.html, pat)) {
        out.push(
          violation(
            rule,
            input,
            `Default 3D/Spline asset referenced. Hero art should be specific to the brief; generic blobs mean nothing specific got decided.`,
            { line: lineOf(input.html, m.index), snippet: m[0].slice(0, 80) },
          ),
        );
      }
    }
    return out;
  },
};
