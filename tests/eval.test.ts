import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runEval, formatEvalReport } from "../src/eval/runner.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function fixture(file: string): Promise<string> {
  return readFile(resolve(__dirname, "fixtures", file), "utf8");
}

async function writeSampleTree(
  base: string,
  spec: Record<string, { raw: string[]; compiled: string[]; errors?: { raw?: number; compiled?: number } }>,
): Promise<void> {
  for (const [model, cells] of Object.entries(spec)) {
    for (const cond of ["raw", "compiled"] as const) {
      const dir = join(base, model, cond);
      await mkdir(dir, { recursive: true });
      const htmlSources = cells[cond];
      for (let i = 0; i < htmlSources.length; i++) {
        await writeFile(join(dir, `sample-${String(i + 1).padStart(3, "0")}.html`), htmlSources[i]);
      }
      const errorCount = cells.errors?.[cond] ?? 0;
      for (let i = 0; i < errorCount; i++) {
        await writeFile(join(dir, `error-${i + 1}.error.txt`), "429 rate limited");
      }
    }
  }
}

describe("eval runner · honest accounting", () => {
  it("reports attempted / errored / extractionFailed / scored separately", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      "modelA": {
        raw: [slop, slop, "<html></html>"],
        compiled: [clean, clean, clean],
        errors: { raw: 1, compiled: 2 },
      },
    });
    const report = await runEval("swiss-editorial", dir);
    const rawCell = report.cells.find((c) => c.condition === "raw")!;
    const compCell = report.cells.find((c) => c.condition === "compiled")!;
    expect(rawCell.counts.attempted).toBe(4);
    expect(rawCell.counts.errored).toBe(1);
    expect(rawCell.counts.extractionFailed).toBe(1);
    expect(rawCell.counts.scored).toBe(2);
    expect(compCell.counts.attempted).toBe(5);
    expect(compCell.counts.errored).toBe(2);
    expect(compCell.counts.scored).toBe(3);
  });

  it("handles empty cells without throwing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-empty-"));
    await writeSampleTree(dir, {
      "modelB": { raw: [], compiled: [] },
    });
    const report = await runEval("swiss-editorial", dir);
    expect(report.cells).toHaveLength(2);
    expect(report.deltas[0].rawMeanTells).toBe(0);
    expect(report.deltas[0].reductionPct).toBe(0);
  });

  it("surfaces negative deltas (compiled > raw) without inverting", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-neg-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      "modelC": {
        raw: [clean, clean],
        compiled: [slop, slop],
      },
    });
    const report = await runEval("swiss-editorial", dir);
    const d = report.deltas[0];
    expect(d.rawMeanTells).toBe(0);
    expect(d.compiledMeanTells).toBeGreaterThan(3);
    expect(d.delta).toBeLessThan(0);
    expect(d.reductionPct).toBe(0);
  });

  it("preserves canonical model ids via manifest.json", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-manifest-"));
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      "_cf_meta_llama-3.3-70b-instruct-fp8-fast": { raw: [clean], compiled: [clean] },
    });
    await writeFile(
      join(dir, "manifest.json"),
      JSON.stringify({
        token: "swiss-editorial",
        briefPath: "briefs/landing.yml",
        n: 1,
        maxTokens: 12000,
        runAt: "2026-04-21T00:00:00Z",
        models: [
          {
            spec: "cf:@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            canonicalId: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
            sanitizedId: "_cf_meta_llama-3.3-70b-instruct-fp8-fast",
            provider: "cloudflare-workers-ai",
          },
        ],
      }),
    );
    const report = await runEval("swiss-editorial", dir);
    expect(report.deltas[0].canonicalModelId).toBe(
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    );
  });

  it("formats a report with attempted / scored columns visible", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-format-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      "modelD": { raw: [slop], compiled: [clean] },
    });
    const text = formatEvalReport(await runEval("swiss-editorial", dir));
    expect(text).toContain("attempted");
    expect(text).toContain("scored");
    expect(text).toContain("Caveats");
  });
});
