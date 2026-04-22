import { describe, it, expect } from "vitest";
import { lintSource } from "../src/lint/engine.js";

function firedRules(html: string): string[] {
  const report = lintSource({ file: "t.html", html, css: "" });
  return report.violations.map((v) => v.ruleId);
}

describe("a11y · img-without-alt", () => {
  it("fires on <img src> with no alt", () => {
    expect(firedRules(`<img src="x.png">`)).toContain("ahd/a11y/img-without-alt");
  });
  it("accepts empty alt=\"\" (decorative)", () => {
    expect(firedRules(`<img src="x.png" alt="">`)).not.toContain(
      "ahd/a11y/img-without-alt",
    );
  });
  it("accepts described alt", () => {
    expect(firedRules(`<img src="x.png" alt="A cat">`)).not.toContain(
      "ahd/a11y/img-without-alt",
    );
  });
});

describe("a11y · button-without-label", () => {
  it("fires on <button></button> with no text", () => {
    expect(firedRules(`<button></button>`)).toContain(
      "ahd/a11y/button-without-label",
    );
  });
  it("fires on icon-only <button><svg/></button>", () => {
    expect(firedRules(`<button><svg></svg></button>`)).toContain(
      "ahd/a11y/button-without-label",
    );
  });
  it("accepts aria-label", () => {
    expect(firedRules(`<button aria-label="Close"></button>`)).not.toContain(
      "ahd/a11y/button-without-label",
    );
  });
  it("accepts labelled svg child", () => {
    expect(
      firedRules(`<button><svg aria-label="Close"></svg></button>`),
    ).not.toContain("ahd/a11y/button-without-label");
  });
  it("accepts visible text", () => {
    expect(firedRules(`<button>Save</button>`)).not.toContain(
      "ahd/a11y/button-without-label",
    );
  });
});

describe("a11y · link-without-text", () => {
  it("fires on <a href> with no text", () => {
    expect(firedRules(`<a href="/x"></a>`)).toContain(
      "ahd/a11y/link-without-text",
    );
  });
  it("fires on icon-only link", () => {
    expect(firedRules(`<a href="/x"><svg></svg></a>`)).toContain(
      "ahd/a11y/link-without-text",
    );
  });
  it("accepts aria-label", () => {
    expect(firedRules(`<a href="/x" aria-label="GitHub"><svg/></a>`)).not.toContain(
      "ahd/a11y/link-without-text",
    );
  });
  it("does not fire on anchors without href (page anchors)", () => {
    expect(firedRules(`<a id="top"></a>`)).not.toContain(
      "ahd/a11y/link-without-text",
    );
  });
});

describe("a11y · heading-skip", () => {
  it("fires on h1 followed by h3", () => {
    expect(firedRules(`<h1>A</h1><h3>B</h3>`)).toContain(
      "ahd/a11y/heading-skip",
    );
  });
  it("does not fire on h1 → h2 → h3", () => {
    expect(firedRules(`<h1>A</h1><h2>B</h2><h3>C</h3>`)).not.toContain(
      "ahd/a11y/heading-skip",
    );
  });
  it("does not fire when headings demote smoothly", () => {
    expect(firedRules(`<h1>A</h1><h2>B</h2><h2>C</h2>`)).not.toContain(
      "ahd/a11y/heading-skip",
    );
  });
});
