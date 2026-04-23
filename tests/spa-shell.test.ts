import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { rule as spaShell } from "../src/lint/rules/spa-shell-detected.js";
import { lintSource } from "../src/lint/engine.js";
import { rules } from "../src/lint/rules/index.js";

const FIXTURES = resolve(__dirname, "fixtures");

function loadHtml(name: string): string {
  return readFileSync(resolve(FIXTURES, name), "utf8");
}

describe("ahd/spa-shell-detected", () => {
  it("has the expected id, severity and message shape", () => {
    expect(spaShell.id).toBe("ahd/spa-shell-detected");
    expect(spaShell.severity).toBe("info");
    expect(spaShell.description.length).toBeGreaterThan(10);
  });

  it("fires on a minimal SPA shell with a bundled script", () => {
    const html = loadHtml("spa-shell.html");
    const vs = spaShell.check({ file: "spa-shell.html", html, css: "" });
    expect(vs).toHaveLength(1);
    expect(vs[0].ruleId).toBe("ahd/spa-shell-detected");
    expect(vs[0].severity).toBe("info");
    expect(vs[0].message).toContain("SPA shell detected");
    expect(vs[0].message).toContain("ahd critique");
    // no em-dashes in user-facing copy
    expect(vs[0].message.includes("—")).toBe(false);
  });

  it("does NOT fire on a real static page", () => {
    const html = loadHtml("not-spa-static.html");
    const vs = spaShell.check({ file: "not-spa-static.html", html, css: "" });
    expect(vs).toHaveLength(0);
  });

  it("does not fire on an empty shell-shaped body without a bundle script", () => {
    const html = `<!doctype html><html><body><div id="root"></div></body></html>`;
    const vs = spaShell.check({ file: "x", html, css: "" });
    expect(vs).toHaveLength(0);
  });

  it("does not fire when the root div has real content inside", () => {
    const html = `<!doctype html><html><body><div id="root"><h1>hello</h1><p>welcome</p></div><script src="/assets/app.js"></script></body></html>`;
    const vs = spaShell.check({ file: "x", html, css: "" });
    expect(vs).toHaveLength(0);
  });

  it("is registered in the default ruleset", () => {
    expect(rules.some((r) => r.id === "ahd/spa-shell-detected")).toBe(true);
  });

  it("appears in lintSource output on the SPA fixture", () => {
    const html = loadHtml("spa-shell.html");
    const report = lintSource({ file: "spa-shell.html", html, css: "" });
    expect(report.violations.some((v) => v.ruleId === "ahd/spa-shell-detected")).toBe(
      true,
    );
  });
});
