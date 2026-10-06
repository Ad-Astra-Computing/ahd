import type { Rule } from "../types.js";
import { extractInline, violation } from "../util.js";

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssBlocks(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

// Split a block's selector list on top-level commas, ignoring commas
// inside parentheses or brackets (:not(a, b), [data-x="a,b"]), and
// normalise whitespace so "h1,  .display" and "h1, .display" compare
// equal.
function splitSelectors(selector: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of selector) {
    if (ch === "(" || ch === "[") depth++;
    else if (ch === ")" || ch === "]") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter((s) => s.length > 0);
}

// Resolves var(--x) against :root/html custom properties so a token
// stylesheet's `letter-spacing: var(--ahd-track-caps)` is not read as
// "no value" and false-fired. Shallow by design: no fallback chains,
// calc() or nested var chains.
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
    const combined = stripComments(
      input.css + "\n" + extractInline(input.html).style,
    );
    const blocks = cssBlocks(combined);
    const rootVars = collectRootVars(blocks);

    // A page can split tracking and size across two blocks that share
    // a selector, e.g. `h1, .display { letter-spacing: -0.02em }` and
    // `h1 { font-size: 140px }` separately. Collect selectors instead
    // of reading both properties out of one block body.
    const largeFontSelectors = new Set<string>();
    const negTrackingSelectors = new Set<string>();
    const allCapsSelectors = new Set<string>();
    const openedTrackingSelectors = new Set<string>();

    for (const { selector, body: rawBody } of blocks) {
      const body = resolveVars(rawBody, rootVars);
      const selectors = splitSelectors(selector);
      const sizeMatch = body.match(/font-size\s*:\s*(\d+(?:\.\d+)?)(px|rem|em)/i);
      const lsMatch = body.match(/letter-spacing\s*:\s*(-?[\d.]+)(em|rem|px)?/i);
      const upperMatch = /text-transform\s*:\s*uppercase/i.test(body);

      if (sizeMatch) {
        const n = parseFloat(sizeMatch[1]);
        const unit = sizeMatch[2];
        const px = unit === "px" ? n : n * 16;
        if (px >= 48) {
          for (const s of selectors) largeFontSelectors.add(s);
        }
      }
      if (lsMatch) {
        const v = parseFloat(lsMatch[1]);
        if (v < 0) for (const s of selectors) negTrackingSelectors.add(s);
        if (v > 0.01) for (const s of selectors) openedTrackingSelectors.add(s);
      }
      if (upperMatch) {
        for (const s of selectors) allCapsSelectors.add(s);
      }
    }

    const hasLargeFont = largeFontSelectors.size > 0;
    const largeHasNegTracking = [...largeFontSelectors].some((s) =>
      negTrackingSelectors.has(s),
    );
    const hasAllCaps = allCapsSelectors.size > 0;
    const allCapsHasOpened = [...allCapsSelectors].some((s) =>
      openedTrackingSelectors.has(s),
    );

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
