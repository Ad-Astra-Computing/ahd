import type { Rule } from "../types.js";
import { extractInline, findAll, lineOf, violation } from "../util.js";

const BANNED = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Poppins",
  "Lato",
  "Nunito",
  "Manrope",
  "Plus Jakarta Sans",
];

export const rule: Rule = {
  id: "ahd/no-default-grotesque",
  severity: "error",
  description:
    "Ban the ten most-defaulted-to grotesques as the only font on the page.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const families = findAll(combined, /font-family\s*:\s*([^;}]+)/gi).map(
      (m) => ({ stack: m[1], idx: m.index }),
    );
    if (families.length === 0) return [];
    const bannedAsOnly = families.every((f) =>
      BANNED.some((b) => new RegExp(`\\b${b}\\b`, "i").test(f.stack)),
    );
    if (!bannedAsOnly) return [];
    return [
      violation(
        rule,
        input,
        `Every font-family declaration uses one of the banned defaults (${BANNED.join(
          ", ",
        )}). Pair a distinctive display face with a text face that is not in that list.`,
        {
          line: lineOf(combined, families[0].idx),
          snippet: families[0].stack.trim().slice(0, 80),
        },
      ),
    ];
  },
};
