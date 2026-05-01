import { describe, it, expect, vi, afterEach } from "vitest";
import { mockRunner, slopResponder, swissResponder, runnerFromSpec } from "../src/eval/runners/index.js";
import { lintSource } from "../src/lint/engine.js";
import {
  extractHtmlBlock,
  extractProviderRequestId,
} from "../src/eval/runners/types.js";
import { anthropicRunner } from "../src/eval/runners/anthropic.js";
import { openaiRunner } from "../src/eval/runners/openai.js";
import { geminiRunner } from "../src/eval/runners/gemini.js";

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
  it("resolves mock specs without network", async () => {
    expect((await runnerFromSpec("mock-slop")).provider).toBe("mock");
    expect((await runnerFromSpec("mock-swiss")).provider).toBe("mock");
  });

  it("throws for provider-prefixed specs without API key env", async () => {
    const prev = {
      A: process.env.ANTHROPIC_API_KEY,
      O: process.env.OPENAI_API_KEY,
      G: process.env.GEMINI_API_KEY,
      CF: process.env.CF_API_TOKEN,
      CFA: process.env.CF_ACCOUNT_ID,
      HF: process.env.HF_TOKEN,
      HFH: process.env.HUGGINGFACE_API_TOKEN,
      HFH2: process.env.HUGGING_FACE_HUB_TOKEN,
    };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_API_KEY;
    delete process.env.CF_API_TOKEN;
    delete process.env.CLOUDFLARE_API_TOKEN;
    delete process.env.CF_ACCOUNT_ID;
    delete process.env.CLOUDFLARE_ACCOUNT_ID;
    delete process.env.HF_TOKEN;
    delete process.env.HUGGINGFACE_API_TOKEN;
    delete process.env.HUGGING_FACE_HUB_TOKEN;
    try {
      await expect(runnerFromSpec("claude-opus-4-7")).rejects.toThrow();
      await expect(runnerFromSpec("gpt-5")).rejects.toThrow();
      await expect(runnerFromSpec("gemini-3-pro")).rejects.toThrow();
      await expect(
        runnerFromSpec("cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      ).rejects.toThrow();
    } finally {
      if (prev.A) process.env.ANTHROPIC_API_KEY = prev.A;
      if (prev.O) process.env.OPENAI_API_KEY = prev.O;
      if (prev.G) process.env.GEMINI_API_KEY = prev.G;
      if (prev.CF) process.env.CF_API_TOKEN = prev.CF;
      if (prev.CFA) process.env.CF_ACCOUNT_ID = prev.CFA;
      if (prev.HF) process.env.HF_TOKEN = prev.HF;
      if (prev.HFH) process.env.HUGGINGFACE_API_TOKEN = prev.HFH;
      if (prev.HFH2) process.env.HUGGING_FACE_HUB_TOKEN = prev.HFH2;
    }
  });

  it("cf: spec constructs a runner when env is present", async () => {
    process.env.CF_API_TOKEN = "test-token";
    process.env.CF_ACCOUNT_ID = "test-account";
    try {
      const runner = await runnerFromSpec("cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast");
      expect(runner.provider).toBe("cloudflare-workers-ai");
      expect(runner.id).toBe("@cf/meta/llama-3.3-70b-instruct-fp8-fast");
    } finally {
      delete process.env.CF_API_TOKEN;
      delete process.env.CF_ACCOUNT_ID;
    }
  });

  it("hf: spec constructs a runner when HF_TOKEN is set", async () => {
    process.env.HF_TOKEN = "hf_test_token_xyz";
    try {
      const runner = await runnerFromSpec("hf:microsoft/Phi-3.5-mini-instruct");
      expect(runner.provider).toBe("huggingface");
      expect(runner.id).toBe("microsoft/Phi-3.5-mini-instruct");
    } finally {
      delete process.env.HF_TOKEN;
    }
  });

  it("ollama: spec does not collide with openai o-series match", async () => {
    const runner = await runnerFromSpec("ollama:mistral:7b-instruct-v0.2-q4_0");
    expect(runner.provider).toBe("ollama");
    expect(runner.id).toBe("mistral:7b-instruct-v0.2-q4_0");
  });

  it("rejects unknown spec", async () => {
    await expect(runnerFromSpec("weird-provider-x")).rejects.toThrow(/Unknown/);
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

  it("strips <think> reasoning blocks before extraction", () => {
    const raw =
      "<think>let me plan the page</think><!doctype html><html><body>hi</body></html>";
    expect(extractHtmlBlock(raw)).toBe("<!doctype html><html><body>hi</body></html>");
  });

  it("returns an empty string when the response is only reasoning", () => {
    const raw = "<think>I would design a minimalist page with...</think>";
    expect(extractHtmlBlock(raw)).toBe("");
  });

  it("returns an empty string when the response is pure prose with no HTML", () => {
    expect(extractHtmlBlock("I recommend a restrained Swiss layout.")).toBe("");
  });
});

// Provider request-id capture. The replay sidecar records these as
// models[].provider_request_ids; an empty array means the runner did
// not surface an id (CLI-spawned runners are the only legitimate
// empty case once these tests pass).
describe("provider request-id capture", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("extractProviderRequestId picks header order: request-id > x-request-id > cf-ray > x-goog-request-id", () => {
    const h1 = new Headers({ "request-id": "anth", "x-request-id": "openai" });
    expect(extractProviderRequestId(h1)).toBe("anth");
    const h2 = new Headers({ "x-request-id": "openai", "cf-ray": "abc" });
    expect(extractProviderRequestId(h2)).toBe("openai");
    const h3 = new Headers({ "cf-ray": "ray-12345", "x-goog-request-id": "goog" });
    expect(extractProviderRequestId(h3)).toBe("ray-12345");
    expect(extractProviderRequestId(new Headers())).toBeUndefined();
  });

  it("anthropic runner surfaces request-id from response headers", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          content: [{ type: "text", text: "<!doctype html><html></html>" }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "request-id": "req_anth_test_123",
          },
        },
      );
    }) as any;
    const r = anthropicRunner({ apiKey: "k", model: "claude-test" });
    const out = await r.run({ userPrompt: "x" });
    expect(out.requestId).toBe("req_anth_test_123");
  });

  it("openai runner surfaces x-request-id from response headers", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "<!doctype html><html></html>" } }],
          usage: { prompt_tokens: 5, completion_tokens: 5 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": "req_oai_test_456",
          },
        },
      );
    }) as any;
    const r = openaiRunner({ apiKey: "k", model: "gpt-test" });
    const out = await r.run({ userPrompt: "x" });
    expect(out.requestId).toBe("req_oai_test_456");
  });

  it("gemini runner surfaces x-goog-request-id from response headers", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: { parts: [{ text: "<!doctype html><html></html>" }] },
            },
          ],
          usageMetadata: { promptTokenCount: 5, candidatesTokenCount: 5 },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-goog-request-id": "goog_test_789",
          },
        },
      );
    }) as any;
    const r = geminiRunner({ apiKey: "k", model: "gemini-test" });
    const out = await r.run({ userPrompt: "x" });
    expect(out.requestId).toBe("goog_test_789");
  });

  it("runner output requestId is undefined when no header is present", async () => {
    globalThis.fetch = vi.fn(async () => {
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "<!doctype html><html></html>" } }],
          usage: { prompt_tokens: 0, completion_tokens: 0 },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }) as any;
    const r = openaiRunner({ apiKey: "k", model: "gpt-test" });
    const out = await r.run({ userPrompt: "x" });
    expect(out.requestId).toBeUndefined();
  });
});
