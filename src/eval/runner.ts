import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { lintSource } from "../lint/engine.js";
import { rules } from "../lint/rules/index.js";
import type {
  CellCounts,
  Condition,
  EvalCell,
  EvalReport,
  EvalSample,
  RunManifest,
  ScoredSample,
} from "./types.js";

interface CellFiles {
  model: string;
  canonicalId: string;
  condition: Condition;
  htmlFiles: string[];
  errorFiles: string[];
}

export async function loadCells(
  dir: string,
  manifest?: RunManifest,
): Promise<CellFiles[]> {
  const out: CellFiles[] = [];
  const models = await readdir(dir, { withFileTypes: true }).catch(() => []);
  for (const m of models) {
    if (!m.isDirectory()) continue;
    for (const cond of ["raw", "compiled"] as Condition[]) {
      const cdir = join(dir, m.name, cond);
      const files = await readdir(cdir).catch(() => []);
      const htmlFiles: string[] = [];
      const errorFiles: string[] = [];
      for (const f of files) {
        const ext = extname(f).toLowerCase();
        if (ext === ".html") htmlFiles.push(join(cdir, f));
        else if (f.endsWith(".error.txt")) errorFiles.push(join(cdir, f));
      }
      const canonicalId =
        manifest?.models.find((x) => x.sanitizedId === m.name)?.canonicalId ??
        m.name;
      out.push({
        model: m.name,
        canonicalId,
        condition: cond,
        htmlFiles,
        errorFiles,
      });
    }
  }
  return out;
}

function looksLikeUsableHtml(html: string): boolean {
  if (!html || html.length < 200) return false;
  return /<(!doctype|html|head|body)\b/i.test(html);
}

export async function scoreCell(cell: CellFiles): Promise<{
  counts: CellCounts;
  scored: ScoredSample[];
}> {
  const counts: CellCounts = {
    attempted: cell.htmlFiles.length + cell.errorFiles.length,
    errored: cell.errorFiles.length,
    extractionFailed: 0,
    scored: 0,
  };
  const scored: ScoredSample[] = [];
  for (const path of cell.htmlFiles) {
    const html = await readFile(path, "utf8");
    if (!looksLikeUsableHtml(html)) {
      counts.extractionFailed++;
      continue;
    }
    const report = lintSource({
      file: path,
      html,
      css: "",
    });
    const tellsFired = Array.from(new Set(report.violations.map((v) => v.ruleId)));
    scored.push({
      sample: {
        model: cell.model,
        condition: cell.condition,
        sampleId: path,
        html,
      },
      tellsFired,
      violationCount: report.violations.length,
    });
    counts.scored++;
  }
  return { counts, scored };
}

export function aggregateCell(
  model: string,
  canonicalId: string,
  condition: Condition,
  scored: ScoredSample[],
  counts: CellCounts,
): EvalCell {
  const n = scored.length;
  const meanTells =
    scored.reduce((a, b) => a + b.tellsFired.length, 0) / Math.max(1, n);
  const perTellFrequency: Record<string, number> = {};
  for (const s of scored) {
    for (const t of s.tellsFired) {
      perTellFrequency[t] = (perTellFrequency[t] ?? 0) + 1;
    }
  }
  for (const k of Object.keys(perTellFrequency)) {
    perTellFrequency[k] = perTellFrequency[k] / Math.max(1, n);
  }
  return {
    model,
    canonicalModelId: canonicalId,
    condition,
    n,
    meanTells,
    perTellFrequency,
    counts,
  };
}

export function buildReport(token: string, cells: EvalCell[]): EvalReport {
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
      canonicalModelId: raw?.canonicalModelId ?? compiled?.canonicalModelId ?? model,
      rawMeanTells: rawMean,
      compiledMeanTells: compMean,
      delta,
      reductionPct,
      rawScored: raw?.counts.scored ?? 0,
      compiledScored: compiled?.counts.scored ?? 0,
    };
  });
  return {
    token,
    runAt: new Date().toISOString(),
    cells,
    deltas,
    caveats: [
      `Scoring runs the deterministic AHD linter (${rules.length} source-level rules) over every sample that passes a basic HTML sanity check.`,
      `Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.`,
      `Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.`,
      `Vision-only tells (9 rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.`,
      `Tells-per-page is a proxy metric: a thin page has little surface for rules to fire against. Read the Δ alongside the actual rendered HTML, not in isolation.`,
      `Model versions change. See the run manifest for exact canonical model ids.`,
    ],
  };
}

export async function runEval(
  token: string,
  samplesDir: string,
): Promise<EvalReport> {
  let manifest: RunManifest | undefined;
  const manifestPath = join(samplesDir, "manifest.json");
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  }
  const cells = await loadCells(samplesDir, manifest);
  const evalCells: EvalCell[] = [];
  for (const c of cells) {
    const { counts, scored } = await scoreCell(c);
    evalCells.push(
      aggregateCell(c.model, c.canonicalId, c.condition, scored, counts),
    );
  }
  const report = buildReport(token, evalCells);
  report.runManifest = manifest;
  return report;
}

export function formatEvalReport(r: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# ahd eval · ${r.token} · ${r.runAt}`);
  lines.push("");
  if (r.runManifest) {
    lines.push("## Run");
    lines.push("");
    lines.push(`- Brief: \`${r.runManifest.briefPath}\``);
    lines.push(`- Samples per cell: **${r.runManifest.n}**`);
    lines.push(`- Max tokens: ${r.runManifest.maxTokens}`);
    lines.push(`- Models:`);
    for (const m of r.runManifest.models) {
      lines.push(`  - \`${m.canonicalId}\` (${m.provider}) · spec \`${m.spec}\``);
    }
    lines.push("");
  }

  lines.push("## Per-model slop reduction");
  lines.push("");
  lines.push(
    "| model | raw attempted → scored | compiled attempted → scored | raw mean tells | compiled mean tells | Δ | reduction |",
  );
  lines.push(
    "|---|---:|---:|---:|---:|---:|---:|",
  );
  for (const d of r.deltas) {
    const rawCell = r.cells.find((c) => c.model === d.model && c.condition === "raw");
    const compCell = r.cells.find(
      (c) => c.model === d.model && c.condition === "compiled",
    );
    const rawCounts = rawCell?.counts;
    const compCounts = compCell?.counts;
    lines.push(
      `| \`${d.canonicalModelId}\` | ${rawCounts?.attempted ?? 0} → ${rawCounts?.scored ?? 0} | ${compCounts?.attempted ?? 0} → ${compCounts?.scored ?? 0} | ${d.rawMeanTells.toFixed(2)} | ${d.compiledMeanTells.toFixed(2)} | ${d.delta.toFixed(2)} | ${d.reductionPct.toFixed(1)}% |`,
    );
  }
  lines.push("");

  lines.push("## Per-tell frequency (scored samples only)");
  lines.push("");
  const tells = new Set<string>();
  for (const c of r.cells) for (const t of Object.keys(c.perTellFrequency)) tells.add(t);
  const tellList = [...tells].sort();
  if (tellList.length === 0) {
    lines.push("_No tells fired across all scored samples._");
  } else {
    lines.push(
      "| tell | " +
        r.cells.map((c) => `${c.canonicalModelId}/${c.condition}`).join(" | ") +
        " |",
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
  }
  lines.push("");
  lines.push("## Caveats");
  for (const c of r.caveats) lines.push(`- ${c}`);
  return lines.join("\n");
}
