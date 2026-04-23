import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { lintSource } from "../src/lint/engine.js";
import { rules } from "../src/lint/rules/index.js";

const SLOP = resolve(__dirname, "fixtures", "slop-landing.html");
const CLEAN = resolve(__dirname, "fixtures", "clean-swiss.html");

async function lint(path: string) {
  const html = await readFile(path, "utf8");
  return lintSource({ file: path, html, css: "" });
}

describe("lint · slop fixture", () => {
  it("fires the expected rules", async () => {
    const report = await lint(SLOP);
    const fired = new Set(report.violations.map((v) => v.ruleId));
    const mustFire = [
      "ahd/no-default-grotesque",
      "ahd/no-purple-blue-gradient",
      "ahd/no-emoji-bullets",
      "ahd/no-gradient-text",
      "ahd/no-slop-copy",
      "ahd/require-type-pairing",
      "ahd/no-fake-testimonials",
      "ahd/no-flat-dark-mode",
      "ahd/no-shimmer-decoration",
      "ahd/weight-variety",
    ];
    for (const id of mustFire) {
      expect(fired, `expected ${id} to fire on slop fixture`).toContain(id);
    }
  });

  it("every rule that should fire is present in the ruleset", () => {
    const ids = new Set(rules.map((r) => r.id));
    expect(ids.size).toBe(rules.length);
  });
});

describe("lint · no-inline-style-animation", () => {
  it("fires on inline style=\"animation:...\" attributes", () => {
    const html = `<!doctype html><html><body>
      <svg style="animation:dispatch-bob 2.8s ease-in-out infinite;opacity:0.42"></svg>
    </body></html>`;
    const report = lintSource({ file: "inline.html", html, css: "" });
    const fired = report.violations
      .filter((v) => v.ruleId === "ahd/no-inline-style-animation")
      .map((v) => v.severity);
    expect(fired).toContain("error");
  });

  it("fires on inline style=\"transition:...\" attributes too", () => {
    const html = `<div style="transition: opacity 300ms"></div>`;
    const report = lintSource({ file: "t.html", html, css: "" });
    const ids = report.violations.map((v) => v.ruleId);
    expect(ids).toContain("ahd/no-inline-style-animation");
  });

  it("does not fire when animation lives in a <style> block instead", () => {
    const html = `<div class="x"></div>`;
    const css = `.x { animation: spin 2s; } @media (prefers-reduced-motion: reduce) { .x { animation: none; } }`;
    const report = lintSource({ file: "style.html", html, css });
    const ids = report.violations.map((v) => v.ruleId);
    expect(ids).not.toContain("ahd/no-inline-style-animation");
  });
});

describe("lint · clean fixture", () => {
  it("produces zero violations on a swiss-editorial-style page", async () => {
    const report = await lint(CLEAN);
    expect(
      report.violations,
      JSON.stringify(report.violations, null, 2),
    ).toHaveLength(0);
  });
});

describe("lint · individual rules", () => {
  it("no-purple-blue-gradient fires on tailwind hero gradient class", () => {
    const html = `<div class="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">x</div>`;
    const r = lintSource({ file: "t", html, css: "" });
    expect(r.violations.find((v) => v.ruleId === "ahd/no-purple-blue-gradient")).toBeDefined();
  });

  it("no-emoji-bullets does not fire on plain lists", () => {
    const html = `<ul><li>First</li><li>Second</li></ul>`;
    const r = lintSource({ file: "t", html, css: "" });
    expect(r.violations.filter((v) => v.ruleId === "ahd/no-emoji-bullets")).toHaveLength(0);
  });

  it("no-slop-copy hits multiple banned phrases in the same page", () => {
    const html = `<p>Ship faster. Build the future of design. Seamless and cutting-edge.</p>`;
    const r = lintSource({ file: "t", html, css: "" });
    const hits = r.violations.filter((v) => v.ruleId === "ahd/no-slop-copy");
    expect(hits.length).toBeGreaterThanOrEqual(4);
  });
});
