import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// Anchor element with no accessible name. Same failure mode as
// button-without-label but for <a>. AI-generated sites ship
// icon-only social-media rows and "card link" wrappers constantly;
// the anchor has no text and no aria-label, and screen-reader
// users hear "link link link" with no destination context.
export const rule: Rule = {
  id: "ahd/a11y/link-without-text",
  severity: "error",
  description:
    "<a> with no accessible name. Icon-only or empty anchors need aria-label, visible text, or a labelled child image/svg.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    const pattern = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    for (const m of findAll(input.html, pattern)) {
      const attrs = m[1];
      const inner = m[2];
      // Must have href — pure anchor nodes <a id=..> are page
      // anchors, not navigation.
      if (!/\bhref\s*=/i.test(attrs)) continue;
      if (/\baria-label\s*=\s*["']\s*\S/i.test(attrs)) continue;
      if (/\baria-labelledby\s*=\s*["']\s*\S/i.test(attrs)) continue;
      if (/\btitle\s*=\s*["']\s*\S/i.test(attrs)) continue;
      const svgLabel = /<svg[^>]*\baria-label\s*=\s*["']\s*\S/i.test(inner);
      const imgAlt = /<img[^>]*\balt\s*=\s*["']\s*\S/i.test(inner);
      const text = inner.replace(/<[^>]+>/g, "").trim();
      if (text.length === 0 && !svgLabel && !imgAlt) {
        out.push(
          violation(
            rule,
            input,
            `<a> has no accessible name. Add aria-label, visible text content, or an <svg>/<img> inside with its own label.`,
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
