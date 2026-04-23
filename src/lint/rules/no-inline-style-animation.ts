import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

// Rule seeded by a finding on withdispatch.dev built by Opus 4.7: the model
// emitted <svg style="animation:dispatch-bob 2.8s ease-in-out infinite;">
// and friends. Inline style="animation:..." attributes are a specific LLM
// shortcut for "I want motion in this one element and I do not want to
// round-trip to a stylesheet." They bypass prefers-reduced-motion guards,
// bypass the design token system, and concentrate motion policy inside a
// single HTML attribute where linters and humans both miss it.
export const rule: Rule = {
  id: "ahd/no-inline-style-animation",
  severity: "error",
  description:
    "Inline style=\"animation:...\" or style=\"transition:...\" attributes on elements. Motion belongs in stylesheets where reduced-motion can be respected.",
  check: (input) => {
    const out = [];
    const pattern = /\bstyle\s*=\s*"[^"]*\b(animation|transition)\s*:[^"]*"/gi;
    for (const m of findAll(input.html, pattern)) {
      out.push(
        violation(
          rule,
          input,
          `Inline style attribute declares ${m[1]}. Move this to a stylesheet so prefers-reduced-motion and the rest of the design system can reach it.`,
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
