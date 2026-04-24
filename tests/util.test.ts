import { describe, it, expect } from "vitest";
import {
  parseHtml,
  parseCss,
  proseText,
  collectRootVars,
  resolveVars,
} from "../src/lint/util.js";
import type { LintInput } from "../src/lint/types.js";

function input(html: string, css: string = ""): LintInput {
  return { file: "t.html", html, css };
}

describe("util · parseHtml + proseText", () => {
  it("yields the text content of a prose element", () => {
    const tree = parseHtml(input("<p>Hello world.</p>"));
    const entries = Array.from(proseText(tree));
    const texts = entries.map((e) => e.text);
    expect(texts).toContain("Hello world.");
  });

  it("skips <code> content when reporting prose text", () => {
    const tree = parseHtml(
      input(
        "<p>Use <code>node --flag</code> for options.</p>",
      ),
    );
    const pText = Array.from(proseText(tree)).find(
      (e) => e.element.tagName === "p",
    );
    expect(pText).toBeDefined();
    expect(pText!.text).toContain("Use");
    expect(pText!.text).toContain("for options.");
    expect(pText!.text).not.toContain("node --flag");
  });

  it("skips <script> and <style> content inside prose", () => {
    const tree = parseHtml(
      input(
        "<p>Before <script>alert('x')</script> and <style>.c{color:red}</style> after.</p>",
      ),
    );
    const pText = Array.from(proseText(tree)).find(
      (e) => e.element.tagName === "p",
    );
    expect(pText!.text).toContain("Before");
    expect(pText!.text).toContain("after.");
    expect(pText!.text).not.toContain("alert");
    expect(pText!.text).not.toContain(".c{color:red}");
  });

  it("does not yield a <pre> as a prose element", () => {
    const tree = parseHtml(
      input("<div><p>Before</p><pre>raw code</pre><p>after.</p></div>"),
    );
    const tags = Array.from(proseText(tree)).map((e) => e.element.tagName);
    expect(tags).not.toContain("pre");
    expect(tags.filter((t) => t === "p").length).toBe(2);
  });

  it("yields both the outer prose and its nested prose children", () => {
    const tree = parseHtml(
      input("<li><strong>Lead</strong> and more text here.</li>"),
    );
    const entries = Array.from(proseText(tree));
    const tags = entries.map((e) => e.element.tagName).sort();
    expect(tags).toContain("li");
    expect(tags).toContain("strong");
  });

  it("reports source-code location (startLine) on yielded elements", () => {
    const html = "<div>\n  <p>First</p>\n  <p>Second</p>\n</div>";
    const tree = parseHtml(input(html));
    const entries = Array.from(proseText(tree)).filter(
      (e) => e.element.tagName === "p",
    );
    expect(entries.length).toBe(2);
    expect(entries[0].sourceLine).toBe(2);
    expect(entries[1].sourceLine).toBe(3);
  });

  it("handles document-level input as well as fragments", () => {
    const doc = parseHtml(
      input("<!doctype html><html><body><p>Hi</p></body></html>"),
    );
    const frag = parseHtml(input("<p>Hi</p>"));
    const docText = Array.from(proseText(doc)).map((e) => e.text);
    const fragText = Array.from(proseText(frag)).map((e) => e.text);
    expect(docText).toContain("Hi");
    expect(fragText).toContain("Hi");
  });
});

describe("util · parseCss + var resolution", () => {
  it("parses inline <style> content alongside external css", () => {
    const root = parseCss(
      input(
        "<style>body { color: red; }</style>",
        "a { text-decoration: none; }",
      ),
    );
    const selectors: string[] = [];
    root.walkRules((r) => selectors.push(r.selector));
    expect(selectors).toContain("body");
    expect(selectors).toContain("a");
  });

  it("collects custom properties declared on :root", () => {
    const root = parseCss(
      input("", ":root { --ahd-space-4: 16px; --ahd-track-caps: 0.12em; }"),
    );
    const vars = collectRootVars(root);
    expect(vars.get("ahd-space-4")).toBe("16px");
    expect(vars.get("ahd-track-caps")).toBe("0.12em");
  });

  it("collects custom properties declared on html", () => {
    const root = parseCss(input("", "html { --token-ink: #111; }"));
    const vars = collectRootVars(root);
    expect(vars.get("token-ink")).toBe("#111");
  });

  it("resolves var(--name) references in a value", () => {
    const vars = new Map([["gap", "24px"]]);
    expect(resolveVars("var(--gap)", vars)).toBe("24px");
    expect(resolveVars("margin: var(--gap) 0", vars)).toBe("margin: 24px 0");
  });

  it("leaves unresolved var() references intact", () => {
    const vars = new Map([["known", "10px"]]);
    expect(resolveVars("var(--unknown)", vars)).toBe("var(--unknown)");
  });

  it("memoises parse results per LintInput", () => {
    const i = input("<p>x</p>", "a { color: red; }");
    const h1 = parseHtml(i);
    const h2 = parseHtml(i);
    const c1 = parseCss(i);
    const c2 = parseCss(i);
    expect(h1).toBe(h2);
    expect(c1).toBe(c2);
  });
});
