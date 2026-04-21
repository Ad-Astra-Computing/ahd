import { rule as noDefaultGrotesque } from "./no-default-grotesque.js";
import { rule as noPurpleBlueGradient } from "./no-purple-blue-gradient.js";
import { rule as noEmojiBullets } from "./no-emoji-bullets.js";
import { rule as noGradientText } from "./no-gradient-text.js";
import { rule as noSlopCopy } from "./no-slop-copy.js";
import { rule as weightVariety } from "./weight-variety.js";
import { rule as requireTypePairing } from "./require-type-pairing.js";
import { rule as noFakeTestimonials } from "./no-fake-testimonials.js";
import { rule as noFlatDarkMode } from "./no-flat-dark-mode.js";
import { rule as noShimmerDecoration } from "./no-shimmer-decoration.js";
import type { Rule } from "../types.js";

export const rules: Rule[] = [
  noDefaultGrotesque,
  noPurpleBlueGradient,
  noEmojiBullets,
  noGradientText,
  noSlopCopy,
  weightVariety,
  requireTypePairing,
  noFakeTestimonials,
  noFlatDarkMode,
  noShimmerDecoration,
];

export function rulesById(): Record<string, Rule> {
  return Object.fromEntries(rules.map((r) => [r.id, r]));
}
