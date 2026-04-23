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

export const rule: Rule = {
  id: "ahd/tracking-per-size",
  severity: "warn",
  description:
    "No negative tracking on display type, no opened tracking on all-caps labels.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const blocks = cssBlocks(combined);

    let hasLargeFont = false;
    let largeHasNegTracking = false;
    let hasAllCaps = false;
    let allCapsHasOpened = false;

    for (const { body } of blocks) {
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
