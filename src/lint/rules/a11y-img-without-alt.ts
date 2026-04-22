import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// <img> must carry an `alt` attribute. Empty alt="" is explicitly
// OK (WAI convention for decorative images), but missing the
// attribute altogether leaves screen readers narrating the src URL.
// AI generators often skip alt because training data does; catches
// the default-of-the-default.
export const rule: Rule = {
  id: "ahd/a11y/img-without-alt",
  severity: "error",
  description:
    "<img> element without an alt attribute. Screen readers will narrate the filename. Use alt=\"\" for decorative images, otherwise describe the image.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    // Match <img ...> where the attrs do not contain alt=...
    // (word-boundary alt followed by = to avoid matching "alternate")
    const pattern = /<img\b([^>]*)>/gi;
    for (const m of findAll(input.html, pattern)) {
      const attrs = m[1];
      if (/\balt\s*=/i.test(attrs)) continue;
      out.push(
        violation(
          rule,
          input,
          `<img> has no alt attribute. Add alt="description" for content images or alt="" for decorative ones.`,
          {
            line: lineOf(input.html, m.index),
            snippet: m[0].slice(0, 140),
          },
        ),
      );
    }
    return out;
  },
};
