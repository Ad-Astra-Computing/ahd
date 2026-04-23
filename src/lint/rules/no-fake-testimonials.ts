import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

const STOCK_AVATAR_HOSTS = [
  "dicebear.com",
  "api.dicebear.com",
  "ui-faces.com",
  "uifaces.co",
  "randomuser.me",
  "i.pravatar.cc",
];

export const rule: Rule = {
  id: "ahd/no-fake-testimonials",
  severity: "warn",
  description:
    "Stock-avatar services betray fabricated testimonials.",
  check: (input) => {
    const out = [];
    for (const host of STOCK_AVATAR_HOSTS) {
      const hits = findAll(input.html, new RegExp(host.replace(/\./g, "\\."), "gi"));
      for (const h of hits) {
        out.push(
          violation(
            rule,
            input,
            `Avatar fetched from stock service (${host}). If the testimonials are real, host the real photos.`,
            { line: lineOf(input.html, h.index) },
          ),
        );
      }
    }
    return out;
  },
};
