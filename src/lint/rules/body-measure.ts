import type { Rule } from "../types.js";
import { extractInline, violation } from "../util.js";

const BODY_LIKE_SELECTOR =
  /(?:^|[\s,])(?:html|body|main|article|\.(?:content|prose|article|body|main|lede|copy|text|rich-text|post)|\[data-content\])\b/i;

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
  id: "ahd/body-measure",
  severity: "warn",
  description:
    "Body-level text width must sit inside the readable 55–75ch band (tolerance 45–85) at the primary breakpoint. Only fires on body/main/article/content selectors.",
  check: (input) => {
    const combined = input.css + "\n" + extractInline(input.html).style;
    const blocks = cssBlocks(combined);
    const out = [];
    for (const { selector, body } of blocks) {
      if (!BODY_LIKE_SELECTOR.test(selector)) continue;
      const widthMatch = body.match(/(?:max-width|width)\s*:\s*(\d+(?:\.\d+)?)(ch|rem|em|px)/i);
      if (!widthMatch) continue;
      const n = parseFloat(widthMatch[1]);
      const unit = widthMatch[2];
      if (unit !== "ch") continue;
      if (n >= 45 && n <= 85) continue;
      out.push(
        violation(
          rule,
          input,
          `Body-level measure ${n}ch sits outside the readable 55–75ch band (tolerance 45–85), selector: ${selector}.`,
        ),
      );
      return out;
    }
    return [];
  },
};
