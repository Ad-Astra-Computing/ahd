import type { Rule } from "../types.js";
import { findAll, lineOf, violation } from "../util.js";

const EMOJI = /[\u{2600}-\u{27BF}\u{1F300}-\u{1FAFF}\u{1F900}-\u{1F9FF}]/u;

export const rule: Rule = {
  id: "ahd/no-emoji-bullets",
  severity: "error",
  description:
    "A <li> or list paragraph that opens with an emoji is a slop tell.",
  check: (input) => {
    const out = [];
    const matches = findAll(
      input.html,
      /<li[^>]*>\s*([\s\S]{0,20}?)(?=<|$)/gi,
    );
    for (const m of matches) {
      const firstChars = m[1].trim();
      if (EMOJI.test(firstChars.slice(0, 2))) {
        out.push(
          violation(
            rule,
            input,
            `List item opens with an emoji (${firstChars.slice(0, 4)}). Emoji bullets are a consistent AI-slop tell.`,
            { line: lineOf(input.html, m.index), snippet: m[0].slice(0, 80) },
          ),
        );
      }
    }
    return out;
  },
};
