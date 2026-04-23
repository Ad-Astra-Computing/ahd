import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// A <button> must carry an accessible name: visible text content,
// aria-label, aria-labelledby, or a title attribute. Icon-only
// buttons without aria-label are one of the most common AI-
// generated a11y failures.
export const rule: Rule = {
  id: "ahd/a11y/button-without-label",
  severity: "error",
  description:
    "<button> with no accessible name. Add text content, aria-label or aria-labelledby so screen-reader users hear what the button does.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    const pattern = /<button\b([^>]*)>([\s\S]*?)<\/button>/gi;
    for (const m of findAll(input.html, pattern)) {
      const attrs = m[1];
      const inner = m[2];
      if (/\baria-label\s*=\s*["']\s*\S/i.test(attrs)) continue;
      if (/\baria-labelledby\s*=\s*["']\s*\S/i.test(attrs)) continue;
      if (/\btitle\s*=\s*["']\s*\S/i.test(attrs)) continue;
      // Strip HTML tags from inner and check for any non-whitespace
      // text. An <svg aria-label> inside counts; plain <svg> does
      // not.
      const svgLabel = /<svg[^>]*\baria-label\s*=\s*["']\s*\S/i.test(inner);
      const imgAlt = /<img[^>]*\balt\s*=\s*["']\s*\S/i.test(inner);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (text.length === 0 && !svgLabel && !imgAlt) {
        out.push(
          violation(
            rule,
            input,
            `<button> has no accessible name. Add visible text, aria-label, aria-labelledby, or an <svg>/<img> with its own label.`,
            {
              line: lineOf(input.html, m.index),
              snippet: m[0].slice(0, 140),
            },
          ),
        );
      }
    }
    return out;
  },
};
