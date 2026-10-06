import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rule as pricingNotThree } from "../src/lint/rules/pricing-not-three.js";
import { rule as ctaNotCanonical } from "../src/lint/rules/cta-not-canonical.js";
import { rule as noCenteredHero } from "../src/lint/rules/no-centered-hero.js";
import { rule as noGradientText } from "../src/lint/rules/no-gradient-text.js";
import { rule as noLucideInRoundedSquare } from "../src/lint/rules/no-lucide-in-rounded-square.js";
import { rule as noPurpleBlueGradient } from "../src/lint/rules/no-purple-blue-gradient.js";
import { rule as spaShellDetected } from "../src/lint/rules/spa-shell-detected.js";
import { extractInline } from "../src/lint/util.js";
import { detectActiveToken } from "../src/lint/config.js";
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

  // A different shape than the chained-unbounded-run one above: a
  // single unbounded `[^>]` run, scanned from every "<tag" occurrence
  // in a document with no closing `>` anywhere, backtracks the full
  // remaining input at each one. Found across the tag-attribute
  // scanner nearly every HTML rule shares, not only the rules with a
  // class-attribute regex.
  const manyUnclosedTags = `<div `.repeat(20_000);

  it("extractInline stays fast on many unclosed tags", () => {
    const start = Date.now();
    extractInline(manyUnclosedTags);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("detectActiveToken stays fast on many unclosed meta tags", () => {
    const start = Date.now();
    detectActiveToken(`<meta `.repeat(20_000));
    expect(Date.now() - start).toBeLessThan(500);
  });

  it("every HTML lint rule stays fast on many unclosed tags", async () => {
    const rulesDir = resolve(dirname(fileURLToPath(import.meta.url)), "..", "src", "lint", "rules");
    const files = readdirSync(rulesDir).filter((f) => f.endsWith(".ts"));
    for (const file of files) {
      const mod = await import(
        /* @vite-ignore */ `../src/lint/rules/${file.replace(/\.ts$/, ".js")}`
      );
      const rule: Rule | undefined = mod.rule;
      if (!rule || typeof rule.check !== "function") continue;
      const start = Date.now();
      try {
        rule.check({ file: "t.html", html: manyUnclosedTags, css: "" });
      } catch {
        // A rule throwing on this input is not this guard's concern.
      }
      expect(
        Date.now() - start,
        `${rule.id} took too long on many unclosed tags`,
      ).toBeLessThan(1000);
    }
  });
});
