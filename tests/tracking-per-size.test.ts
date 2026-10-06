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

  it("does not fire when tracking and size sit in split blocks under a shared selector (sample-013 shape)", () => {
    const html = `
      <style>
        h1, .display {
          letter-spacing: -0.02em;
        }
        h1 {
          font-size: 140px;
        }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(false);
  });

  it("does not fire the all-caps branch when opened tracking and uppercase sit in split blocks under a shared selector", () => {
    const html = `
      <style>
        .label, .allcaps {
          letter-spacing: 0.08em;
        }
        .allcaps {
          text-transform: uppercase;
        }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /All-caps/.test(v.message))).toBe(false);
  });

  it("still fires when the split-block tracking belongs to an unrelated selector", () => {
    const html = `
      <style>
        h1 { font-size: 96px; }
        .other { letter-spacing: -0.02em; }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(true);
  });

  it("strips CSS comments before splitting blocks so a comment does not merge into the selector", () => {
    const html = `
      <style>
        /* rule: display tracking */
        h1, .display {
          letter-spacing: -0.02em;
        }
        /* rule: display size */
        h1 {
          font-size: 140px; /* rule: >= 120px */
        }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(false);
  });

  it("still fires when a page genuinely lacks tracking anywhere, split blocks or not", () => {
    const html = `
      <style>
        h1 { font-size: 96px; }
        h2 { font-size: 60px; }
      </style>
    `;
    const violations = check(html);
    expect(violations.some((v) => /Display-size/.test(v.message))).toBe(true);
  });
});
