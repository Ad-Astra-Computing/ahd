import { describe, it, expect } from "vitest";
import { resolve } from "node:path";
import { listTokens, loadToken, validateAll } from "../src/load.js";
import { compile } from "../src/compile.js";

const TOKENS = resolve(__dirname, "..", "tokens");

describe("style token library", () => {
  it("ships at least five seed tokens", async () => {
    const ids = await listTokens(TOKENS);
    expect(ids.length).toBeGreaterThanOrEqual(5);
  });

  it("every seed token validates against the schema", async () => {
    const results = await validateAll(TOKENS);
    const failures = results.filter((r) => !r.ok);
    expect(failures, JSON.stringify(failures, null, 2)).toHaveLength(0);
  });

  it("every token forbids at least eight slop tells", async () => {
    for (const id of await listTokens(TOKENS)) {
      const token = await loadToken(TOKENS, id);
      expect(
        token.forbidden.length,
        `${id} forbids only ${token.forbidden.length} tells`,
      ).toBeGreaterThanOrEqual(8);
    }
  });

  it("every token declares required quirks", async () => {
    for (const id of await listTokens(TOKENS)) {
      const token = await loadToken(TOKENS, id);
      expect(token["required-quirks"].length).toBeGreaterThan(0);
    }
  });
});

describe("compile", () => {
  it("produces per-model prompts containing the forbidden list", async () => {
    const token = await loadToken(TOKENS, "swiss-editorial");
    const result = compile(
      {
        intent: "landing page for a developer tool",
        surfaces: ["web"],
        token: token.id,
      },
      token,
    );
    for (const model of ["claude", "gpt", "gemini", "generic"] as const) {
      expect(result.prompts[model]).toContain("FORBIDDEN");
      expect(result.prompts[model]).toContain("Swiss");
    }
  });

  it("merges brief.mustAvoid into the forbidden list", async () => {
    const token = await loadToken(TOKENS, "swiss-editorial");
    const result = compile(
      {
        intent: "x",
        surfaces: ["web"],
        token: token.id,
        mustAvoid: ["any reference to cryptocurrency"],
      },
      token,
    );
    expect(result.spec.forbidden).toContain("any reference to cryptocurrency");
  });
});
