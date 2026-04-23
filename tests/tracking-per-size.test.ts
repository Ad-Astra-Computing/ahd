import { describe, it, expect } from "vitest";
import { rule } from "../src/lint/rules/tracking-per-size.js";

function check(html: string, css = "") {
  return rule.check({ file: "test.html", html, css });
}

describe("ahd/tracking-per-size", () => {
  it("fires when all-caps is set without letter-spacing", () => {
    const html = `<style>.allcaps { text-transform: uppercase; }</style>`;
    const violations = check(html);
    expect(violations.some((v) => /All-caps text.*no opened letter-spacing/.test(v.message))).toBe(true);
  });

  it("does not fire when all-caps and letter-spacing share a block", () => {
    const html = `<style>.allcaps { text-transform: uppercase; letter-spacing: 0.08em; }</style>`;
    const violations = check(html);
    expect(violations.some((v) => /All-caps/.test(v.message))).toBe(false);
  });

  it("resolves :root custom properties used in letter-spacing (regression)", () => {
    // Token-driven stylesheets are the canonical swiss-editorial
    // pattern. Before the var()-resolver lived in the rule, this
    // fired a false positive on every AHD-token-driven site that
    // set letter-spacing through a custom property.
    const html = `
      <style>
        :root { --ahd-track-caps: 0.12em; }
        .allcaps { font-size: 11px; letter-spacing: var(--ahd-track-caps); text-transform: uppercase; }
      </style>
    `;
    const violations = check(html);
    expect(violations).toHaveLength(0);
  });

  it("still fires when the var() references an undefined custom property", () => {
    const html = `
      <style>
        .allcaps { text-transform: uppercase; letter-spacing: var(--does-not-exist); }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /All-caps/.test(v.message))).toBe(true);
  });

  it("resolves vars in html block too (html selector variant)", () => {
    const html = `
      <style>
        html { --track-caps: 0.08em; }
        .caps { text-transform: uppercase; letter-spacing: var(--track-caps); }
      </style>
    `;
    const violations = check(html);
    expect(violations).toHaveLength(0);
  });

  it("fires when display-size type is set without negative tracking", () => {
    const html = `<style>h1 { font-size: 96px; }</style>`;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(true);
  });

  it("does not fire when display-size has negative tracking via var()", () => {
    const html = `
      <style>
        :root { --display-tracking: -0.035em; }
        h1 { font-size: 120px; letter-spacing: var(--display-tracking); }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(false);
  });
});
