import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, readdir } from "node:fs/promises";
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

function ruleCell(
  model: string,
  condition: "raw" | "compiled",
  n: number,
  fired: number,
  rule: string,
): import("../src/eval/types.js").EvalCell {
  const samples = Array.from({ length: n }, (_, i) => ({
    sampleId: `${model}-${condition}-${i}`,
    tellsFired: i < fired ? [rule] : [],
    byteLength: 500,
    hash: `sha256:${"0".repeat(64)}`,
    scored: true,
  }));
  return {
    model,
    canonicalModelId: model,
    condition,
    n,
    meanTells: fired / n,
    perTellFrequency: { [rule]: fired / n },
    counts: { attempted: n, errored: 0, extractionFailed: 0, scored: n },
    samples,
  };
}

describe("run-level inspection flag · a rule induced in two or more models and removed in none", () => {
  it("flags a rule induced in two models of the same run", async () => {
    const { buildReport } = await import("../src/eval/runner.js");
    const rule = "ahd/respect-reduced-motion";
    const cells = [
      ruleCell("model-a", "raw", 30, 0, rule),
      ruleCell("model-a", "compiled", 30, 20, rule),
      ruleCell("model-b", "raw", 30, 0, rule),
      ruleCell("model-b", "compiled", 30, 18, rule),
    ];
    const report = buildReport("swiss-editorial", cells);
    expect(report.inspectionFlags).toHaveLength(1);
    expect(report.inspectionFlags[0].rule).toBe(rule);
    expect(report.inspectionFlags[0].qualifyingModels.sort()).toEqual(["model-a", "model-b"]);

    const text = formatEvalReport(report);
    expect(text).toContain("Flagged for inspection");
    expect(text).toContain(rule);
    expect(text).toContain("makes no causal claim");
  });

  it("does not flag a rule induced in only one model of the run", async () => {
    const { buildReport } = await import("../src/eval/runner.js");
    const rule = "ahd/respect-reduced-motion";
    const cells = [
      ruleCell("model-a", "raw", 30, 0, rule),
      ruleCell("model-a", "compiled", 30, 20, rule),
      ruleCell("model-b", "raw", 30, 4, rule),
      ruleCell("model-b", "compiled", 30, 5, rule),
    ];
    const report = buildReport("swiss-editorial", cells);
    expect(report.inspectionFlags).toHaveLength(0);
    expect(formatEvalReport(report)).toContain(
      "No rule in this run was induced in two or more models with none removing it.",
    );
  });

  it("does not flag a rule induced in two models but removed in a third", async () => {
    const { buildReport } = await import("../src/eval/runner.js");
    const rule = "ahd/respect-reduced-motion";
    const cells = [
      ruleCell("model-a", "raw", 30, 0, rule),
      ruleCell("model-a", "compiled", 30, 20, rule),
      ruleCell("model-b", "raw", 30, 0, rule),
      ruleCell("model-b", "compiled", 30, 18, rule),
      ruleCell("model-c", "raw", 30, 25, rule),
      ruleCell("model-c", "compiled", 30, 0, rule),
    ];
    const report = buildReport("swiss-editorial", cells);
    expect(report.inspectionFlags).toHaveLength(0);
  });
});

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

  it("keeps a per-sample record behind the published mean", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-samples-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      modelE: {
        raw: [slop, slop, "<html></html>"],
        compiled: [clean, clean, clean],
        errors: { raw: 1 },
      },
    });
    const report = await runEval("swiss-editorial", dir);
    const rawCell = report.cells.find((c) => c.condition === "raw")!;
    const compCell = report.cells.find((c) => c.condition === "compiled")!;
    // 3 raw samples: two lint, one fails extraction, so the record list
    // has exactly as many entries as scored samples, not attempted ones.
    expect(rawCell.samples).toHaveLength(rawCell.counts.scored);
    for (const s of rawCell.samples) {
      expect(s.sampleId).toMatch(/sample-\d+\.html$/);
      expect(Array.isArray(s.tellsFired)).toBe(true);
      expect(s.byteLength).toBe(Buffer.byteLength(slop, "utf8"));
      expect(s.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(s.scored).toBe(true);
    }
    const rawMeanFromRecords =
      rawCell.samples.reduce((a, b) => a + b.tellsFired.length, 0) /
      Math.max(1, rawCell.samples.length);
    expect(rawMeanFromRecords).toBeCloseTo(rawCell.meanTells);
    expect(compCell.samples).toHaveLength(compCell.counts.scored);
    const compMeanFromRecords =
      compCell.samples.reduce((a, b) => a + b.tellsFired.length, 0) /
      Math.max(1, compCell.samples.length);
    expect(compMeanFromRecords).toBeCloseTo(compCell.meanTells);
    // Distinct hashes for distinct byte content.
    expect(compCell.samples[0].hash).not.toBe(rawCell.samples[0].hash);
  });

  it("handles empty cells without throwing", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-empty-"));
    await writeSampleTree(dir, {
      "modelB": { raw: [], compiled: [] },
    });
    const report = await runEval("swiss-editorial", dir);
    expect(report.cells).toHaveLength(2);
    for (const s of report.modelStats[0].strata) {
      expect(s.rawMean).toBe(0);
      expect(s.notEstimable).toBe(true);
      expect(s.ratio).toBeNull();
      expect(s.verdict).toBe("not estimable");
    }
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
    const errorStratum = report.modelStats[0].strata.find((s) => s.severity === "error")!;
    // The clean fixture trips no error tells, so the raw mean sits
    // below 0.5 and this stratum reports not estimable, not a ratio.
    // What must not happen is a flipped sign that reads as a
    // reduction when the compiled arm is worse.
    expect(errorStratum.rawMean).toBe(0);
    expect(errorStratum.cmpMean).toBeGreaterThan(0);
    expect(errorStratum.diff).toBeLessThan(0);
    expect(errorStratum.notEstimable).toBe(true);
    expect(errorStratum.ratio).toBeNull();
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
    expect(report.modelStats[0].canonicalModelId).toBe(
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

describe("carried-forward cells", () => {
  // eval-live merges its manifest with whatever it finds in the output
  // directory, so one model can be run at a time and accumulated into a
  // run. That is deliberate. What is not acceptable is doing it
  // silently: the 17 and 24 August 2026 weekly reports listed ten cells
  // when five ran, and nothing in the report said so. A carried-forward
  // cell must be visible in the artifact that quotes its figures.
  it("marks cells that were not measured by the invocation", () => {
    const report = formatEvalReport({
      token: "swiss-editorial",
      cells: [],
      modelStats: [],
      caveats: [],
      runManifest: {
        carriedForward: ["claude-opus-4-7"],
        token: "swiss-editorial",
        briefPath: "briefs/landing.yml",
        n: 30,
        maxTokens: 12000,
        runAt: "2026-08-26T00:00:00.000Z",
        models: [
          {
            spec: "cf:@cf/openai/gpt-oss-120b",
            canonicalId: "@cf/openai/gpt-oss-120b",
            sanitizedId: "_cf_openai_gpt-oss-120b",
            provider: "cloudflare-workers-ai",
          },
          {
            spec: "claude-code:claude-opus-4-7",
            canonicalId: "claude-opus-4-7",
            sanitizedId: "claude-opus-4-7",
            provider: "claude-code-cli",
          },
        ],
      },
    } as never);

    expect(report).toContain("**not run in this invocation**");
    expect(report).toContain("carried forward from an earlier run");
    // The cell that did run must not be marked.
    const gptLine = report.split("\n").find((l) => l.includes("gpt-oss-120b"));
    expect(gptLine).not.toContain("not run in this invocation");
  });
});

describe("unmanifested sample directories", () => {
  // loadCells aggregates every directory under the samples root and
  // falls back to the directory name when there is no manifest entry.
  // A stray directory therefore reached the results table with no roster
  // entry, no marker and no warning: the same failure as a
  // carried-forward cell, and harder to spot. This exercises
  // runLiveEval, not the formatter, because the classification is what
  // broke.
  it("marks a model directory that has no manifest entry", async () => {
    const { runLiveEval } = await import("../src/eval/live.js");
    const dir = await mkdtemp(join(tmpdir(), "ahd-stray-"));
    const token = "swiss-editorial";
    for (const cond of ["raw", "compiled"]) {
      await mkdir(join(dir, token, "ghost-model", cond), { recursive: true });
      await writeFile(
        join(dir, token, "ghost-model", cond, "sample-001.html"),
        "<!doctype html><html><head><title>x</title></head><body><main><h1>S</h1><p>body</p></main></body></html>",
      );
    }

    const report = await runLiveEval({
      tokensDir: resolve(__dirname, "..", "tokens"),
      token,
      briefPath: "briefs/landing.yml",
      models: ["mock-swiss"],
      n: 1,
      outDir: dir,
    } as never);

    expect(report.runManifest.carriedForward).toContain("ghost-model");
    const roster = report.runManifest.models.map((m) => m.canonicalId);
    expect(roster).toContain("ghost-model");
    expect(formatEvalReport(report)).toContain("not run in this invocation");
  });
});

describe("stale samples from a previous run", () => {
  // Re-running a model replaces its samples. Without this, dropping --n
  // left the tail of a larger run in place, and a sample that errored
  // last time but succeeded now kept its .error.txt beside the new
  // .html, so one sample counted as both errored and scored. Models not
  // re-run are untouched, which is what makes one-model-at-a-time work.
  it("replaces samples for a model it re-runs and leaves others alone", async () => {
    const { runLiveEval } = await import("../src/eval/live.js");
    const dir = await mkdtemp(join(tmpdir(), "ahd-stale-"));
    const token = "swiss-editorial";
    const tokensDir = resolve(__dirname, "..", "tokens");
    const base = { tokensDir, token, briefPath: "briefs/landing.yml", outDir: dir };

    await runLiveEval({ ...base, models: ["mock-swiss"], n: 3 } as never);
    const rawDir = join(dir, token, "mock-swiss", "raw");
    expect((await readdir(rawDir)).filter((f) => f.endsWith(".html"))).toHaveLength(3);

    // A cell that is not re-run must survive the next invocation.
    await mkdir(join(dir, token, "kept-model", "raw"), { recursive: true });
    await writeFile(join(dir, token, "kept-model", "raw", "sample-001.html"), "<html></html>");
    // A stale error beside a sample that will now succeed.
    await writeFile(join(rawDir, "sample-001.error.txt"), "boom");
    // Something a person left in the directory. Only files the runner
    // writes may be removed, so this has to survive.
    await writeFile(join(rawDir, "notes.md"), "keep me");

    const report = await runLiveEval({ ...base, models: ["mock-swiss"], n: 1 } as never);

    const after = await readdir(rawDir);
    expect(after.filter((f) => f.endsWith(".html"))).toHaveLength(1);
    expect(after.filter((f) => f.endsWith(".error.txt"))).toHaveLength(0);
    expect(after).toContain("notes.md");
    expect(await readdir(join(dir, token, "kept-model", "raw"))).toContain("sample-001.html");

    // The counts the report publishes must reflect the replacement, not
    // the union of two invocations.
    const cell = report.cells.find(
      (c) => c.model === "mock-swiss" && c.condition === "raw",
    );
    expect(cell?.counts.attempted).toBe(1);
    expect(cell?.counts.scored).toBe(1);
    expect(cell?.counts.errored).toBe(0);
  });
});

describe("replay measurements and per-sample request provenance", () => {
  // The mock runner never returns a requestId, which is exactly the
  // "provider returned no id" case the 2026-08-17 weekly run hit for
  // gemma: 60 scored samples behind 51 recorded ids, nine unexplained.
  // This exercises runLiveEval end to end so a gap becomes a stated
  // record instead of a shorter array.
  it("records a null request id per sample rather than a shorter array", async () => {
    const { runLiveEval } = await import("../src/eval/live.js");
    const dir = await mkdtemp(join(tmpdir(), "ahd-replay-provenance-"));
    const token = "swiss-editorial";
    const report = await runLiveEval({
      tokensDir: resolve(__dirname, "..", "tokens"),
      token,
      briefPath: "briefs/landing.yml",
      models: ["mock-swiss"],
      n: 2,
      outDir: dir,
      replayContext: { invokedAt: new Date(), argv: ["ahd", "eval-live"] },
    } as never);

    const replay = report.replay!;
    const model = replay.models.find((m) => m.id === "mock-swiss")!;
    // Backward compatible: unchanged meaning, still empty for a runner
    // that never sets a provider id.
    expect(model.provider_request_ids).toEqual([]);
    // 2 samples x 2 conditions = 4 completed provider calls, every one
    // explicit about the missing id rather than silently absent.
    expect(model.sample_requests).toHaveLength(4);
    expect(
      model.sample_requests!.every((r) => r.request_id === null),
    ).toBe(true);
    expect(
      model.sample_requests!.filter((r) => r.condition === "raw"),
    ).toHaveLength(2);
    expect(
      model.sample_requests!.filter((r) => r.condition === "compiled"),
    ).toHaveLength(2);
    expect(model.sample_requests!.map((r) => r.sample).sort()).toEqual(
      [1, 1, 2, 2].sort(),
    );

    // measurements: one entry per model x condition cell, samples
    // matching the scored count for that cell.
    const rawMeasurement = replay.measurements!.find(
      (m) => m.model === "mock-swiss" && m.condition === "raw",
    )!;
    expect(rawMeasurement.samples).toHaveLength(2);
    for (const s of rawMeasurement.samples) {
      expect(s.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(s.scored).toBe(true);
      expect(s.byte_length).toBeGreaterThan(0);
    }
  });
});

describe("published eval statistic · severity split, interval, ledger, verdict", () => {
  it("splits errors from warnings and never blends them into one figure", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-severity-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      modelSeverity: {
        raw: new Array(25).fill(slop),
        compiled: new Array(25).fill(clean),
      },
    });
    const report = await runEval("swiss-editorial", dir);
    const stat = report.modelStats[0];
    const errorStratum = stat.strata.find((s) => s.severity === "error")!;
    const warnStratum = stat.strata.find((s) => s.severity === "warn")!;

    // slop-landing.html always trips the same fixed set of error
    // rules and never trips any in the compiled/clean arm,
    // deterministically: no variance in either arm, so both arms'
    // sample variance is zero and the interval comes entirely from
    // the Wilson floor and the fixed epsilon that keeps a Welch
    // interval from ever collapsing to zero width.
    expect(errorStratum.rawMean).toBeGreaterThan(0.5);
    expect(errorStratum.cmpMean).toBe(0);
    expect(errorStratum.diff).toBeCloseTo(errorStratum.rawMean, 10);
    expect(errorStratum.upper).toBeGreaterThan(errorStratum.lower);
    expect(errorStratum.estimator).toBe("welch-t");
    expect(errorStratum.notEstimable).toBe(false);
    expect(errorStratum.ratio).toBeCloseTo(1, 10);
    expect(errorStratum.verdict).toBe("reduced in this run");

    expect(warnStratum.rawMean).toBeGreaterThan(0);
    expect(warnStratum.cmpMean).toBe(0);
    expect(warnStratum.verdict).toBe("reduced in this run");

    // The two strata are reported separately; neither figure is the
    // sum or average of the other.
    expect(errorStratum.diff).not.toBeCloseTo(errorStratum.diff + warnStratum.diff, 5);
  });

  it("nets the ledger to exactly the difference of mean tell counts across every rule", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-ledger-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      modelLedger: {
        raw: new Array(20).fill(slop),
        compiled: new Array(20).fill(clean),
      },
    });
    const report = await runEval("swiss-editorial", dir);
    const stat = report.modelStats[0];
    const rawCell = report.cells.find((c) => c.model === "modelLedger" && c.condition === "raw")!;
    const compCell = report.cells.find(
      (c) => c.model === "modelLedger" && c.condition === "compiled",
    )!;
    expect(stat.ledger.net).toBeCloseTo(compCell.meanTells - rawCell.meanTells, 10);
    expect(stat.ledger.removed.length).toBeGreaterThan(0);
    expect(stat.ledger.induced).toHaveLength(0);
    expect(stat.ledger.offsetting).toBe(false);
  });

  it("marks a carried-forward cell not estimable regardless of what its figures would otherwise say", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-carried-stat-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      modelCarried: {
        raw: new Array(25).fill(slop),
        compiled: new Array(25).fill(clean),
      },
    });
    const evalCells = await runEval("swiss-editorial", dir);
    const { buildReport } = await import("../src/eval/runner.js");
    const report = buildReport("swiss-editorial", evalCells.cells, ["modelCarried"]);
    const stat = report.modelStats[0];
    for (const s of stat.strata) {
      expect(s.verdict).toBe("not estimable");
    }
  });

  it("never emits the retired verdict words in the rendered report", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-eval-retired-words-"));
    const slop = await fixture("slop-landing.html");
    const clean = await fixture("clean-swiss.html");
    await writeSampleTree(dir, {
      modelWords: {
        raw: new Array(20).fill(slop),
        compiled: new Array(20).fill(clean),
      },
    });
    const text = formatEvalReport(await runEval("swiss-editorial", dir));
    expect(text).not.toMatch(/\b(stable|noisy|unstable|pinned)\b/i);
    expect(text).not.toMatch(/no repeatable direction/i);
    expect(text).not.toMatch(/\btrade\b/i);
    expect(text).not.toMatch(/substitution/i);
    expect(text).toContain("99.5%");
    expect(text).toContain("Ledger:");
    expect(text).toContain("lint violations reduced");
  });
});
