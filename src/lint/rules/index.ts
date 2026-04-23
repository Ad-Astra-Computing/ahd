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
import { rule as noUniformRadius } from "./no-uniform-radius.js";
import { rule as noThreeEqualCards } from "./no-three-equal-cards.js";
import { rule as noLucideInRoundedSquare } from "./no-lucide-in-rounded-square.js";
import { rule as noIndiscriminateGlass } from "./no-indiscriminate-glass.js";
import { rule as singleShadowStyle } from "./single-shadow-style.js";
import { rule as noCenteredHero } from "./no-centered-hero.js";
import { rule as respectReducedMotion } from "./respect-reduced-motion.js";
import { rule as lineHeightPerSize } from "./line-height-per-size.js";
import { rule as bodyMeasure } from "./body-measure.js";
import { rule as requireNamedGrid } from "./require-named-grid.js";
import { rule as noDefaultSpline } from "./no-default-spline.js";
import { rule as pricingNotThree } from "./pricing-not-three.js";
import { rule as footerNotFourCol } from "./footer-not-four-col.js";
import { rule as motionHasIntent } from "./motion-has-intent.js";
import { rule as noFakeTrustBar } from "./no-fake-trust-bar.js";
import { rule as ctaNotCanonical } from "./cta-not-canonical.js";
import { rule as trackingPerSize } from "./tracking-per-size.js";
import { rule as radiusHierarchy } from "./radius-hierarchy.js";
import { rule as noInlineStyleAnimation } from "./no-inline-style-animation.js";
import { rule as noEmDashesInProse } from "./no-em-dashes-in-prose.js";
import { rule as a11yImgWithoutAlt } from "./a11y-img-without-alt.js";
import { rule as a11yButtonWithoutLabel } from "./a11y-button-without-label.js";
import { rule as a11yLinkWithoutText } from "./a11y-link-without-text.js";
import { rule as a11yHeadingSkip } from "./a11y-heading-skip.js";
import { rule as spaShellDetected } from "./spa-shell-detected.js";
import { svgRulesAsRules } from "../svg/rules.js";
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
  noUniformRadius,
  noThreeEqualCards,
  noLucideInRoundedSquare,
  noIndiscriminateGlass,
  singleShadowStyle,
  noCenteredHero,
  respectReducedMotion,
  lineHeightPerSize,
  bodyMeasure,
  requireNamedGrid,
  noDefaultSpline,
  pricingNotThree,
  footerNotFourCol,
  motionHasIntent,
  noFakeTrustBar,
  ctaNotCanonical,
  trackingPerSize,
  radiusHierarchy,
  noInlineStyleAnimation,
  noEmDashesInProse,
  a11yImgWithoutAlt,
  a11yButtonWithoutLabel,
  a11yLinkWithoutText,
  a11yHeadingSkip,
  spaShellDetected,
  ...svgRulesAsRules,
];

export function rulesById(): Record<string, Rule> {
  return Object.fromEntries(rules.map((r) => [r.id, r]));
}
