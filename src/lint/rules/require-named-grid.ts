import type { Rule } from "../types.js";
import { extractInline, findAll, violation } from "../util.js";

export const rule: Rule = {
  id: "ahd/require-named-grid",
  severity: "warn",
  description:
    "A page with no CSS grid or explicit column structure usually means flex-stacked slop.",
  check: (input) => {
    const combined =
      input.css + "\n" + extractInline(input.html).style + "\n" + input.html;
    const hasCssGrid = /display\s*:\s*grid/i.test(combined);
    const hasGridTemplate = /grid-template(-columns)?\s*:/i.test(combined);
    const hasTwGrid = /\bgrid-cols-\d+\b/.test(combined);
    if (!hasCssGrid && !hasGridTemplate && !hasTwGrid) {
      const hasLayout = /class\s*=\s*"[^"]*(?:flex|container|section)/i.test(
        input.html,
      );
      if (hasLayout) {
        return [
          violation(
            rule,
            input,
            `No grid structure declared (no display:grid, no grid-template-columns, no grid-cols-*). Flex-stacked columns without a shared grid is the todo-list layout.`,
          ),
        ];
      }
    }
    return [];
  },
};
