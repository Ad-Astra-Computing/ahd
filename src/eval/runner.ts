import { readdir, readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { lintSource } from "../lint/engine.js";
import type {
  Condition,
  EvalCell,
  EvalReport,
  EvalSample,
  ScoredSample,
} from "./types.js";

export async function loadSamples(dir: string): Promise<EvalSample[]> {
  const samples: EvalSample[] = [];
  const models = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const m of models) {
    if (!m.isDirectory()) continue;
    for (const cond of ["raw", "compiled"] as Condition[]) {
      const cdir = join(dir, m.name, cond);
      const files = await readdir(cdir).catch(() => []);
      for (const f of files) {
        if (extname(f).toLowerCase() !== ".html") continue;
        const html = await readFile(join(cdir, f), "utf8");
        samples.push({
          model: m.name,
          condition: cond,
          sampleId: f.replace(/\.html$/i, ""),
          html,
        });
      }
    }
  }
  return samples;
}

export function score(samples: EvalSample[]): ScoredSample[] {
  return samples.map((s) => {
    const report = lintSource({ file: s.sampleId, html: s.html, css: "" });
    const tellsFired = Array.from(new Set(report.violations.map((v) => v.ruleId)));
    return { sample: s, tellsFired, violationCount: report.violations.length };
  });
}

export function aggregate(scored: ScoredSample[]): EvalCell[] {
  const groups = new Map<string, ScoredSample[]>();
  for (const s of scored) {
    const key = `${s.sample.model}::${s.sample.condition}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  const cells: EvalCell[] = [];
  for (const [key, items] of groups) {
    const [model, condition] = key.split("::") as [string, Condition];
    const n = items.length;
    const meanTells =
      items.reduce((a, b) => a + b.tellsFired.length, 0) / Math.max(1, n);
    const perTellFrequency: Record<string, number> = {};
    for (const s of items) {
      for (const t of s.tellsFired) {
        perTellFrequency[t] = (perTellFrequency[t] ?? 0) + 1;
      }
    }
    for (const k of Object.keys(perTellFrequency)) {
      perTellFrequency[k] = perTellFrequency[k] / Math.max(1, n);
    }
    cells.push({ model, condition, n, meanTells, perTellFrequency });
  }
  return cells;
}

export function report(token: string, cells: EvalCell[]): EvalReport {
  const models = Array.from(new Set(cells.map((c) => c.model)));
  const deltas = models.map((model) => {
    const raw = cells.find((c) => c.model === model && c.condition === "raw");
    const compiled = cells.find(
      (c) => c.model === model && c.condition === "compiled",
    );
    const rawMean = raw?.meanTells ?? 0;
    const compMean = compiled?.meanTells ?? 0;
    const delta = rawMean - compMean;
    const reductionPct = rawMean > 0 ? (delta / rawMean) * 100 : 0;
    return {
      model,
      rawMeanTells: rawMean,
      compiledMeanTells: compMean,
      delta,
      reductionPct,
    };
  });
  return {
    token,
    runAt: new Date().toISOString(),
    cells,
    deltas,
    caveats: [
      "Scoring is deterministic against the current linter ruleset only.",
      "Linter covers ten of the thirty-eight slop tells in v0.2; vision-only tells are not scored until the critic pass ships.",
      "Model versions change. Record model ids explicitly in sample filenames.",
      "No live-model calling in v0.2 — this runner scores pre-generated samples placed in <evalsDir>/<model>/<condition>/*.html.",
    ],
  };
}

export async function runEval(
  token: string,
  samplesDir: string,
): Promise<EvalReport> {
  const samples = await loadSamples(samplesDir);
  const scored = score(samples);
  const cells = aggregate(scored);
  return report(token, cells);
}

export function formatEvalReport(r: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# ahd eval · ${r.token} · ${r.runAt}`);
  lines.push("");
  lines.push("## Per-model slop reduction (mean tells per sample)");
  lines.push("");
  lines.push("| model | raw | compiled | Δ | reduction |");
  lines.push("|---|---:|---:|---:|---:|");
  for (const d of r.deltas) {
    lines.push(
      `| ${d.model} | ${d.rawMeanTells.toFixed(2)} | ${d.compiledMeanTells.toFixed(2)} | ${d.delta.toFixed(2)} | ${d.reductionPct.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## Per-tell frequency");
  lines.push("");
  const tells = new Set<string>();
  for (const c of r.cells) for (const t of Object.keys(c.perTellFrequency)) tells.add(t);
  const tellList = [...tells].sort();
  lines.push(
    "| tell | " + r.cells.map((c) => `${c.model}/${c.condition}`).join(" | ") + " |",
  );
  lines.push("|---|" + r.cells.map(() => "---:").join("|") + "|");
  for (const t of tellList) {
    lines.push(
      `| ${t} | ` +
        r.cells
          .map((c) => `${((c.perTellFrequency[t] ?? 0) * 100).toFixed(0)}%`)
          .join(" | ") +
        " |",
    );
  }
  lines.push("");
  lines.push("## Caveats");
  for (const c of r.caveats) lines.push(`- ${c}`);
  return lines.join("\n");
}
