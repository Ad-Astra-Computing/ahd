import { describe, it, expect } from "vitest";
import { lintSources } from "../src/lint/engine.js";

describe("cross-file · ahd/no-broken-internal-links", () => {
  it("fires when an href points at a page that is not in the file set", () => {
    const inputs = [
      { file: "/index.html", html: `<a href="/pricing">Pricing</a>`, css: "" },
    ];
    const report = lintSources(inputs);
    const fired = report.violations
      .filter((v) => v.ruleId === "ahd/no-broken-internal-links")
      .map((v) => v.file);
    expect(fired).toContain("/index.html");
  });

  it("does not fire when the target exists", () => {
    const inputs = [
      { file: "/index.html", html: `<a href="/pricing">Pricing</a>`, css: "" },
      { file: "/pricing/index.html", html: `<h1>Pricing</h1>`, css: "" },
    ];
    const report = lintSources(inputs);
    const fired = report.violations.filter(
      (v) => v.ruleId === "ahd/no-broken-internal-links",
    );
    expect(fired).toHaveLength(0);
  });

  it("does not fire on external or asset links", () => {
    const inputs = [
      {
        file: "/index.html",
        html: `
          <a href="https://example.com">ext</a>
          <a href="/_astro/foo.css">asset</a>
          <a href="#anchor">anchor</a>
          <a href="mailto:x@y.z">mail</a>
        `,
        css: "",
      },
    ];
    const report = lintSources(inputs);
    const fired = report.violations.filter(
      (v) => v.ruleId === "ahd/no-broken-internal-links",
    );
    expect(fired).toHaveLength(0);
  });

  it("catches single-quoted hrefs too", () => {
    const inputs = [
      { file: "/index.html", html: `<a href='/pricing'>single</a>`, css: "" },
    ];
    const report = lintSources(inputs);
    const fired = report.violations.filter(
      (v) => v.ruleId === "ahd/no-broken-internal-links",
    );
    expect(fired).toHaveLength(1);
  });

  it("honours trailing-slash equivalence", () => {
    const inputs = [
      { file: "/index.html", html: `<a href="/pricing/">with slash</a>`, css: "" },
      { file: "/pricing/index.html", html: ``, css: "" },
    ];
    const report = lintSources(inputs);
    const fired = report.violations.filter(
      (v) => v.ruleId === "ahd/no-broken-internal-links",
    );
    expect(fired).toHaveLength(0);
  });
});
