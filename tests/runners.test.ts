import { describe, it, expect } from "vitest";
import { mockRunner, slopResponder, swissResponder, runnerFromSpec } from "../src/eval/runners/index.js";
import { lintSource } from "../src/lint/engine.js";
import { extractHtmlBlock } from "../src/eval/runners/types.js";

describe("model runners · mock", () => {
  it("mock runner returns deterministic HTML", async () => {
    const r = mockRunner("mock-slop", slopResponder);
    const out = await r.run({ userPrompt: "make a landing page" });
    expect(out.html).toContain("<html>");
    expect(out.model).toBe("mock-slop");
  });

  it("slop responder produces HTML that lints dirty", async () => {
    const r = mockRunner("mock-slop", slopResponder);
    const out = await r.run({ userPrompt: "x" });
    const report = lintSource({ file: "mock", html: out.html, css: "" });
    expect(report.violations.length).toBeGreaterThan(3);
  });

  it("swiss responder produces HTML that lints clean", async () => {
    const r = mockRunner("mock-swiss", swissResponder);
    const out = await r.run({ userPrompt: "x" });
    const report = lintSource({ file: "mock", html: out.html, css: "" });
    expect(report.violations.filter((v) => v.severity === "error")).toHaveLength(0);
  });
});

describe("runnerFromSpec", () => {
  it("resolves mock specs without network", () => {
    expect(runnerFromSpec("mock-slop").provider).toBe("mock");
    expect(runnerFromSpec("mock-swiss").provider).toBe("mock");
  });

  it("throws for provider-prefixed specs without API key env", () => {
    const prevA = process.env.ANTHROPIC_API_KEY;
    const prevO = process.env.OPENAI_API_KEY;
    const prevG = process.env.GEMINI_API_KEY;
    const prevCF = process.env.CF_API_TOKEN;
    const prevCFA = process.env.CF_ACCOUNT_ID;
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.CF_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CF_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    try {
      expect(() => runnerFromSpec("claude-opus-4-7")).toThrow();
      expect(() => runnerFromSpec("gpt-5")).toThrow();
      expect(() => runnerFromSpec("gemini-3-pro")).toThrow();
      expect(() => runnerFromSpec("cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast")).toThrow();
    } finally {
      if (prevA) process.env.ANTHROPIC_API_KEY = prevA;
      if (prevO) process.env.OPENAI_API_KEY = prevO;
      if (prevG) process.env.GEMINI_API_KEY = prevG;
      if (prevCF) process.env.CF_API_TOKEN = prevCF;
      if (prevCFA) process.env.CF_ACCOUNT_ID = prevCFA;
    }
  });

  it("cf: spec constructs a runner when env is present", () => {
    process.env.CF_API_TOKEN = "test-token";
    process.env.CF_ACCOUNT_ID = "test-account";
    try {
      const runner = runnerFromSpec("cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast");
      expect(runner.provider).toBe("cloudflare-workers-ai");
      expect(runner.id).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    } finally {
      delete process.env.CF_API_TOKEN;
      delete process.env.CF_ACCOUNT_ID;
    }
  });

  it("rejects unknown spec", () => {
    expect(() => runnerFromSpec("weird-provider-x")).toThrow(/Unknown/);
  });
});

describe("extractHtmlBlock", () => {
  it("pulls out a fenced html block", () => {
    expect(
      extractHtmlBlock("Here:\n```html\n<!doctype html><html></html>\n```\ndone"),
    ).toContain("<!doctype html>");
  });

  it("pulls out a raw <html> block", () => {
    expect(extractHtmlBlock("prose <html><body></body></html> postfix")).toBe(
      "<html><body></body></html>",
    );
  });
});
