import { describe, it, expect } from "vitest";
import { rule as pricingNotThree } from "../src/lint/rules/pricing-not-three.js";
import { rule as ctaNotCanonical } from "../src/lint/rules/cta-not-canonical.js";
import { rule as noCenteredHero } from "../src/lint/rules/no-centered-hero.js";
import { rule as noGradientText } from "../src/lint/rules/no-gradient-text.js";
import { rule as noLucideInRoundedSquare } from "../src/lint/rules/no-lucide-in-rounded-square.js";
import { rule as noPurpleBlueGradient } from "../src/lint/rules/no-purple-blue-gradient.js";
import { rule as spaShellDetected } from "../src/lint/rules/spa-shell-detected.js";
import type { Rule } from "../src/lint/types.js";

// Regression guards for the same chained-unbounded-run ReDoS shape
// fixed in ahd/no-three-equal-cards, found repeated across these
// rules by a dedicated security audit.

function check(rule: Rule, html: string, css = "") {
  return rule.check({ file: "t.html", html, css });
}

function expectFast(rule: Rule, html: string, css = "") {
  const start = Date.now();
  check(rule, html, css);
  expect(Date.now() - start).toBeLessThan(200);
}

describe("ReDoS guards", () => {
  it("ahd/pricing-not-three stays fast on an unterminated pricing class", () => {
    expectFast(pricingNotThree, `<div class="${"pricing".repeat(50_000)}`);
  });

  it("ahd/cta-not-canonical stays fast on an unterminated gradient class", () => {
    expectFast(ctaNotCanonical, `<a class="${"bg-gradient-".repeat(50_000)}`);
  });

  it("ahd/no-centered-hero stays fast on an unterminated items-center class", () => {
    expectFast(noCenteredHero, `<div class="${"items-center ".repeat(50_000)}`);
  });

  it("ahd/no-gradient-text stays fast on an unterminated clip-text class", () => {
    expectFast(noGradientText, `<div class="${"bg-clip-text ".repeat(50_000)}`);
  });

  it("ahd/no-lucide-in-rounded-square stays fast on an unterminated rounded class", () => {
    expectFast(
      noLucideInRoundedSquare,
      `<div class="${"rounded-lg ".repeat(50_000)}`,
    );
  });

  it("ahd/no-purple-blue-gradient stays fast on an unterminated gradient class", () => {
    expectFast(
      noPurpleBlueGradient,
      `<div class="${"bg-gradient-to-".repeat(50_000)}`,
    );
  });

  it("ahd/spa-shell-detected stays fast on an unterminated script src", () => {
    expectFast(
      spaShellDetected,
      `<body><script src="${"/assets/".repeat(50_000)}</body>`,
    );
  });
});
