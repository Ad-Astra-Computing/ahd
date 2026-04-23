import type { Rule } from "../types.js";
import { extractInline, violation } from "../util.js";

function cssBlocks(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

// Collect all custom-property definitions from :root / html blocks
// so later rule logic can substitute their values when a declaration
// uses var(). Token-driven stylesheets routinely define things like
// `--ahd-track-caps: 0.12em` and consume them via `letter-spacing:
// var(--ahd-track-caps)`; treating the declaration as "no value"
// causes false-positive rule fires. This resolver is intentionally
// shallow (no fallback chains, no calc(), no nested var chains).
// It handles the common case that matters in practice.
function collectRootVars(
  blocks: { selector: string; body: string }[],
): Map<string, string> {
  const vars = new Map<string, string>();
  for (const { selector, body } of blocks) {
    // :root or html — the conventional locations for custom props.
    // Match even when combined with pseudo / other selectors.
    if (!/(^|[\s,])(:root|html)(?=$|[\s,:{])/.test(selector)) continue;
    const propRe = /--([\w-]+)\s*:\s*([^;]+);/g;
    let pm;
    while ((pm = propRe.exec(body)) !== null) {
      vars.set(pm[1], pm[2].trim());
    }
  }
  return vars;
}

// Substitute var(--name) with the declared value so downstream regex
// matching sees the numeric form. Returns the resolved body; leaves
// unresolved vars in place (so the rule still treats them as "no
// match", same as a missing custom property would).
function resolveVars(body: string, vars: Map<string, string>): string {
  return body.replace(/var\(\s*--([\w-]+)\s*(?:,\s*[^)]*)?\)/g, (_, name) => {
    return vars.has(name) ? vars.get(name)! : `var(--${name})`;
  });
}

export const rule: Rule = {
  id: "ahd/tracking-per-size",
  severity: "warn",
  description:
    "No negative tracking on display type, no opened tracking on all-caps labels.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const blocks = cssBlocks(combined);
    const rootVars = collectRootVars(blocks);

    let hasLargeFont = false;
    let largeHasNegTracking = false;
    let hasAllCaps = false;
    let allCapsHasOpened = false;

    for (const { body: rawBody } of blocks) {
      const body = resolveVars(rawBody, rootVars);
      const sizeMatch = body.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const lsMatch = body.match(/letter-spacing\s*:\s*(-?[\d.]+)(em|rem|px)?/i);
      const upperMatch = /text-transform\s*:\s*uppercase/i.test(body);

      if (sizeMatch) {
        const n = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        const px = unit === "px" ? n : n * 16;
        if (px >= 48) {
          hasLargeFont = true;
          if (lsMatch && parseFloat(lsMatch[1]) < 0) largeHasNegTracking = true;
        }
      }
      if (upperMatch) {
        hasAllCaps = true;
        if (lsMatch && parseFloat(lsMatch[1]) > 0.01) allCapsHasOpened = true;
      }
    }

    const out = [];
    if (hasLargeFont && !largeHasNegTracking) {
      out.push(
        violation(
          rule,
          input,
          `Display-size type (>=48px) is set without negative letter-spacing. Tighten by -0.02em or more above 48px.`,
        ),
      );
    }
    if (hasAllCaps && !allCapsHasOpened) {
      out.push(
        violation(
          rule,
          input,
          `All-caps text used with no opened letter-spacing. Open by 0.04–0.12em so the word reads as a word, not a block.`,
        ),
      );
    }
    return out;
  },
};
