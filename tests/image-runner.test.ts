import { describe, it, expect } from "vitest";
import { imageRunnerFromSpec } from "../src/eval/runners/image-index.js";
import { compileImagePrompt } from "../src/compile.js";
import { loadToken } from "../src/load.js";
import { resolve } from "node:path";

const TOKENS = resolve(__dirname, "..", "tokens");

describe("imageRunnerFromSpec", () => {
  it("constructs a CF Workers AI image runner with env", () => {
    process.env.CF_API_TOKEN = "test-token";
    process.env.CF_ACCOUNT_ID = "test-acc";
    try {
      const r = imageRunnerFromSpec("cfimg:@cf/black-forest-labs/flux-1-schnell");
      expect(r.kind).toBe("image");
      expect(r.provider).toBe("cloudflare-workers-ai-image");
      expect(r.id).toBe("@cf/black-forest-labs/flux-1-schnell");
    } finally {
      delete process.env.CF_API_TOKEN;
      delete process.env.CF_ACCOUNT_ID;
    }
  });

  it("throws when CF env is missing", () => {
    delete process.env.CF_API_TOKEN;
    delete process.env.CF_ACCOUNT_ID;
    expect(() => imageRunnerFromSpec("cfimg:@cf/meta/flux-1-schnell")).toThrow();
  });

  it("rejects unknown image spec prefix", () => {
    expect(() => imageRunnerFromSpec("dalle:3")).toThrow(/Unknown image model spec/);
  });
});

describe("compileImagePrompt", () => {
  it("emits a positive + negative prompt pair with image-specific bans", async () => {
    const token = await loadToken(TOKENS, "editorial-illustration");
    const { prompt, negativePrompt } = compileImagePrompt(
      {
        intent: "an editorial illustration about compound interest",
        surfaces: ["illustration"],
        token: token.id,
      },
      token,
    );
    expect(prompt).toContain("editorial illustration");
    expect(prompt).toContain("Niemann");
    expect(negativePrompt).toContain("corporate memphis");
    expect(negativePrompt).toContain("six-finger hands");
    expect(negativePrompt).toContain("midjourney face symmetry");
  });
});
