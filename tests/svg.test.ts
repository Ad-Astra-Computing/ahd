import { describe, it, expect } from "vitest";
import { svgRulesAsRules } from "../src/lint/svg/rules.js";
import { lintSource } from "../src/lint/engine.js";

describe("svg linter · uniform stroke", () => {
  it("fires on monoline-uniform illustration", () => {
    const svg = `<svg viewBox="0 0 100 100"><path stroke-width="1.5" d="M0 0"/><path stroke-width="1.5" d="M10 10"/><path stroke-width="1.5" d="M20 20"/><path stroke-width="1.5" d="M30 30"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.find((v) => v.ruleId === "ahd/svg/no-uniform-stroke")).toBeDefined();
  });

  it("does not fire with varied stroke widths", () => {
    const svg = `<svg viewBox="0 0 100 100"><path stroke-width="1"/><path stroke-width="2"/><path stroke-width="3"/><path stroke-width="4"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.filter((v) => v.ruleId === "ahd/svg/no-uniform-stroke")).toHaveLength(0);
  });
});

describe("svg linter · palette bounds", () => {
  it("fires when the SVG uses more than 6 distinct hex colours", () => {
    const svg = `<svg><rect fill="#111"/><rect fill="#222"/><rect fill="#333"/><rect fill="#444"/><rect fill="#555"/><rect fill="#666"/><rect fill="#777"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.find((v) => v.ruleId === "ahd/svg/palette-bounds")).toBeDefined();
  });

  it("does not fire for a constrained palette", () => {
    const svg = `<svg><rect fill="#111"/><rect fill="#c53a1a"/><rect fill="#f8f5ee"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.filter((v) => v.ruleId === "ahd/svg/palette-bounds")).toHaveLength(0);
  });
});

describe("svg linter · perfect symmetry", () => {
  it("fires on a perfectly mirrored composition", () => {
    const svg = `<svg viewBox="0 0 200 100"><circle cx="50"/><circle cx="150"/><circle cx="25"/><circle cx="175"/><rect x="30"/><rect x="170"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.find((v) => v.ruleId === "ahd/svg/no-perfect-symmetry")).toBeDefined();
  });

  it("does not fire on an asymmetric composition", () => {
    const svg = `<svg viewBox="0 0 200 100"><circle cx="20"/><circle cx="40"/><circle cx="60"/><circle cx="80"/><rect x="30"/><rect x="50"/></svg>`;
    const report = lintSource({ file: "t.svg", html: svg, css: "" });
    expect(report.violations.filter((v) => v.ruleId === "ahd/svg/no-perfect-symmetry")).toHaveLength(0);
  });
});
