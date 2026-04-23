import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// Rule seeded by a dogfood pass on the AHD site itself: 51 em-dashes
// across the prose surfaces. Em-dash overuse is the single most
// recognizable AI-writing tell in 2026, the punctuation equivalent of
// Corporate Memphis. Models default to "—" because training data is
// full of editorial writing that uses them sparingly; models emit them
// constantly, which cumulatively produces copy that reads "LLM".
//
// Maps to taxonomy #24 ("The house style of SaaS copy"); enforced at
// rule level because em-dash specifically is the most diagnostic of
// the tells in that entry.
//
// Detects literal em-dash characters (U+2014) inside prose elements:
// <p>, <h1>-<h6>, <li>, <figcaption>, <blockquote>, <dd>, <summary>,
// and text nodes of <main>. Ignores:
//   - <code>, <pre> (code often contains arrows or ASCII art)
//   - <title> attribute values where "—" might be a tooltip glyph
//   - CSS `content:` values
// Does not flag en-dash (U+2013), which is correct for ranges.

const PROSE_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "figcaption", "blockquote", "dd", "summary", "em", "strong"];

// Build a pattern that finds an opening prose tag and the text until
// its closer, then scans that slice for em-dashes. Kept simple — we
// accept the false-positive of matching em-dashes inside nested
// <code> within a <p>; the rule doesn't try to parse HTML properly.
// For the AHD site's slop-detection purposes, false positives on
// "— in a code snippet inside prose" are rare enough to accept.
const TAG_UNION = PROSE_TAGS.join("|");
const PATTERN = new RegExp(
  `<(?:${TAG_UNION})\\b[^>]*>([\\s\\S]*?)</(?:${TAG_UNION})>`,
  "gi",
);

// Strip things that look like code / inline markup so we only scan
// actual prose text for the em-dash.
function stripCode(s: string): string {
  return s
    .replace(/<code[^>]*>[\s\S]*?<\/code>/gi, "")
    .replace(/<pre[^>]*>[\s\S]*?<\/pre>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
}

export const rule: Rule = {
  id: "ahd/no-em-dashes-in-prose",
  severity: "warn",
  description:
    "Em-dashes in prose (U+2014). The single most recognizable AI-writing tell. Rewrite with commas, colons, periods, parentheses or middle dots as each sentence demands. En-dashes (–) are fine for ranges.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    for (const m of findAll(input.html, PATTERN)) {
      const inner = stripCode(m[1]);
      if (!inner.includes("—")) continue;
      // Report once per prose block, pointed at the block's start line.
      out.push(
        violation(
          rule,
          input,
          `Em-dash (—) in prose. Rewrite with a comma, colon, period, parentheses, or middle dot. En-dashes (–) remain fine for numeric ranges.`,
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
