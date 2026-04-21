import { describe, it, expect } from "vitest";
import { aggregate, report, score } from "../src/eval/runner.js";
import type { EvalSample } from "../src/eval/types.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

async function sample(file: string, model: string, condition: "raw" | "compiled"): Promise<EvalSample> {
  const html = await readFile(resolve(__dirname, "fixtures", file), "utf8");
  return { model, condition, sampleId: `${model}-${condition}-${file}`, html };
}

describe("eval runner", () => {
  it("scores samples and produces a per-cell aggregate", async () => {
    const samples: EvalSample[] = [
      await sample("slop-landing.html", "claude-4.7", "raw"),
      await sample("clean-swiss.html", "claude-4.7", "compiled"),
      await sample("slop-landing.html", "gpt-5", "raw"),
      await sample("clean-swiss.html", "gpt-5", "compiled"),
    ];
    const scored = score(samples);
    const cells = aggregate(scored);
    expect(cells).toHaveLength(4);
    const rawCells = cells.filter((c) => c.condition === "raw");
    const compiledCells = cells.filter((c) => c.condition === "compiled");
    for (const r of rawCells) {
      expect(r.meanTells, `raw cell for ${r.model} should have many tells`).toBeGreaterThan(5);
    }
    for (const c of compiledCells) {
      expect(c.meanTells, `compiled cell for ${c.model} should be zero tells`).toBe(0);
    }
  });

  it("report shows a positive reduction for every model", async () => {
    const samples: EvalSample[] = [
      await sample("slop-landing.html", "claude-4.7", "raw"),
      await sample("clean-swiss.html", "claude-4.7", "compiled"),
      await sample("slop-landing.html", "gemini-3", "raw"),
      await sample("clean-swiss.html", "gemini-3", "compiled"),
    ];
    const r = report("swiss-editorial", aggregate(score(samples)));
    for (const d of r.deltas) {
      expect(d.delta, `model ${d.model} should show positive slop reduction`).toBeGreaterThan(0);
      expect(d.reductionPct).toBeGreaterThan(0);
    }
  });
});
