import { describe, it, expect } from "vitest";
import { mkdtemp, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { runTry } from "../src/try.js";

const TOKENS = resolve(__dirname, "..", "tokens");
const BRIEF = resolve(__dirname, "..", "briefs", "landing.yml");

describe("ahd try (offline)", () => {
  it("generates one HTML artifact via mock-swiss and lints it", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "ahd-try-"));
    const { outPath, violations } = await runTry({
      tokensDir: TOKENS,
      briefPath: BRIEF,
      modelSpec: "mock-swiss",
      outDir,
      skipLint: false,
    });
    const files = await readdir(outDir);
    expect(files).toHaveLength(1);
    const html = await readFile(outPath, "utf8");
    expect(html).toContain("<!doctype html>");
    expect(html).toContain("ahd try");
    expect(html).toContain("Token:  swiss-editorial");
    expect(html).toContain("Model:  mock-swiss");
    expect(violations).toBe(0);
  });

  it("stamps the demo-artifact header into the output so nobody ships it by accident", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "ahd-try-header-"));
    const { outPath } = await runTry({
      tokensDir: TOKENS,
      briefPath: BRIEF,
      modelSpec: "mock-swiss",
      outDir,
    });
    const html = await readFile(outPath, "utf8");
    expect(html).toMatch(/Demo artifact, not production output\./);
    expect(html).toMatch(/Lint:\s+ahd lint/);
  });

  it("honours --token override when the brief does not name one", async () => {
    const outDir = await mkdtemp(join(tmpdir(), "ahd-try-tokenoverride-"));
    const result = await runTry({
      tokensDir: TOKENS,
      briefPath: BRIEF,
      tokenOverride: "monochrome-editorial",
      modelSpec: "mock-swiss",
      outDir,
    });
    const html = await readFile(result.outPath, "utf8");
    expect(html).toContain("Token:  monochrome-editorial");
  });
});
