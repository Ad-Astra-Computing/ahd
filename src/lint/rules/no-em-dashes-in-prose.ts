import type { Rule } from "../types.js";
import { parseHtml, proseText, violation } from "../util.js";

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
// Detects literal em-dash characters (U+2014) in prose element text,
// excluding text inside <code>, <pre>, <script>, <style> and their
// kin. Does not flag en-dash (U+2013), which is correct for ranges.
//
// 0.8.0: moved off regex to parse5 AST. The prior regex implementation
// used lazy tag matching with a unioned open/close set, which broke on
// prose elements that contained nested <em>/<strong>/<a>/<span>: the
// regex terminated at the first nested closer and missed everything
// after it in the outer element. The AST walker handles nesting
// correctly and excludes only the explicitly-non-prose tags.

function deduplicate(
  violations: ReturnType<Rule["check"]>,
): ReturnType<Rule["check"]> {
  // Prose elements can nest (a <li> and a <strong> inside it both
  // contain the same em-dash). Report once per unique (line, snippet)
  // pair; the outermost element wins since the walker visits parents
  // before descending.
  const seen = new Set<string>();
  const out: ReturnType<Rule["check"]> = [];
  for (const v of violations) {
    const key = `${v.line ?? -1}::${v.snippet?.slice(0, 80) ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(v);
  }
  return out;
}

export const rule: Rule = {
  id: "ahd/no-em-dashes-in-prose",
  severity: "warn",
  description:
    "Em-dashes in prose (U+2014). The single most recognizable AI-writing tell. Rewrite with commas, colons, periods, parentheses or middle dots as each sentence demands. En-dashes (–) are fine for ranges.",
  check: (input) => {
    const out: ReturnType<Rule["check"]> = [];
    const tree = parseHtml(input);
    for (const { text, sourceLine } of proseText(tree)) {
      const dashIdx = text.indexOf("—");
      if (dashIdx < 0) continue;
      const preview = text.slice(
        Math.max(0, dashIdx - 30),
        Math.min(text.length, dashIdx + 40),
      );
      out.push(
        violation(
          rule,
          input,
          `Em-dash (—) in prose. Rewrite with a comma, colon, period, parentheses, or middle dot. En-dashes (–) remain fine for numeric ranges.`,
          {
            line: sourceLine,
            snippet: preview.trim().slice(0, 140),
          },
        ),
      );
    }
    return deduplicate(out);
  },
};
