import { readdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { lintSource } from "../lint/engine.js";
import type { AhdProjectConfig } from "../lint/config.js";
import { rules } from "../lint/rules/index.js";
import { VISION_RULES } from "../critique/critic.js";
import { renderReplayMarkdown, hashBytes } from "./replay.js";
import {
  computeRuleEffect,
  buildLedger,
  flagRulesForInspection,
  computeLiveStratum,
  deriveVerdict,
  severityOf,
  type RuleEffect,
  type Severity,
} from "./historical.js";
import type {
  CellCounts,
  Condition,
  EvalCell,
  EvalReport,
  EvalSample,
  ModelLedger,
  ModelStat,
  RunManifest,
  SampleMeasurement,
  ScoredSample,
  StratumReport,
} from "./types.js";

const SEVERITY_MAP: Record<string, Severity> = Object.fromEntries(
  rules.map((r) => [r.id, r.severity as Severity]),
);
const SEVERITIES: Severity[] = ["error", "warn", "info"];

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

export async function scoreCell(
  cell: CellFiles,
  config?: AhdProjectConfig,
): Promise<{
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
    const report = lintSource(
      {
        file: path,
        html,
        css: "",
      },
      undefined,
      config,
    );
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
  const samples: SampleMeasurement[] = scored.map((s) => ({
    sampleId: s.sample.sampleId,
    tellsFired: s.tellsFired,
    byteLength: Buffer.byteLength(s.sample.html, "utf8"),
    hash: hashBytes(s.sample.html),
    scored: true,
  }));
  return {
    model,
    canonicalModelId: canonicalId,
    condition,
    n,
    meanTells,
    perTellFrequency,
    counts,
    samples,
  };
}

// A rule's per-sample fire, taken directly from the exact per-sample
// tellsFired list recorded for the cell, not from a rounded
// percentage. Exact in both arms because the data is exact.
function firedCount(samples: EvalCell["samples"], rule: string): number {
  return samples.filter((s) => s.tellsFired.includes(rule)).length;
}

function severityWeightedCounts(samples: EvalCell["samples"], severity: Severity): number[] {
  return samples.map((s) => s.tellsFired.filter((t) => SEVERITY_MAP[t] === severity).length);
}

// Builds the statistic in docs/specs/0001-published-eval-statistic.md,
// sharing computeRuleEffect and buildLedger with the historical path
// so the two never diverge on the maths.
export function buildReport(
  token: string,
  cells: EvalCell[],
  carriedForward: string[] = [],
): EvalReport {
  const models = Array.from(new Set(cells.map((c) => c.model)));
  const carried = new Set(carriedForward);
  const modelEffects: Array<{ model: string; effects: RuleEffect[] }> = [];
  const modelStats: ModelStat[] = models.map((model) => {
    const raw = cells.find((c) => c.model === model && c.condition === "raw");
    const compiled = cells.find((c) => c.model === model && c.condition === "compiled");
    const canonicalModelId = raw?.canonicalModelId ?? compiled?.canonicalModelId ?? model;
    const rawScored = raw?.counts.scored ?? 0;
    const compiledScored = compiled?.counts.scored ?? 0;
    const rawSamples = raw?.samples ?? [];
    const cmpSamples = compiled?.samples ?? [];

    const firedRules = new Set<string>();
    for (const s of rawSamples) for (const t of s.tellsFired) firedRules.add(t);
    for (const s of cmpSamples) for (const t of s.tellsFired) firedRules.add(t);

    const effects = [...firedRules].map((rule) =>
      computeRuleEffect({
        rule,
        severity: severityOf(rule, SEVERITY_MAP),
        kRaw: firedCount(rawSamples, rule),
        nRaw: Math.max(1, rawScored),
        kCmp: firedCount(cmpSamples, rule),
        nCmp: Math.max(1, compiledScored),
      }),
    );

    modelEffects.push({ model: canonicalModelId, effects });

    const rawLedger = buildLedger(effects);
    const ledger: ModelLedger = {
      removed: rawLedger.removed.map((e) => ({
        rule: e.rule,
        severity: e.severity,
        d: e.d,
        lower: e.lower,
        upper: e.upper,
      })),
      induced: rawLedger.induced.map((e) => ({
        rule: e.rule,
        severity: e.severity,
        d: e.d,
        lower: e.lower,
        upper: e.upper,
      })),
      grossRemoved: rawLedger.grossRemoved,
      grossInduced: rawLedger.grossInduced,
      net: rawLedger.net,
      offsetting: rawLedger.removed.length > 0 && rawLedger.induced.length > 0,
    };

    // The scoring gate fails when either arm has no scored samples at
    // all, or this cell was carried forward from an earlier
    // invocation rather than measured now: a carried-forward figure
    // did not come from this run and cannot carry this run's verdict.
    const scoringGateFailed =
      carried.has(canonicalModelId) || !(rawScored > 0 && compiledScored > 0);
    const n = Math.min(rawScored, compiledScored);

    const strata: StratumReport[] = SEVERITIES.map((severity) => {
      if (rawSamples.length === 0 || cmpSamples.length === 0) {
        return {
          severity,
          rawMean: 0,
          cmpMean: 0,
          diff: 0,
          ratio: null,
          notEstimable: true,
          lower: 0,
          upper: 0,
          verdict: "not estimable",
        };
      }
      const s = computeLiveStratum(
        severity,
        severityWeightedCounts(rawSamples, severity),
        severityWeightedCounts(cmpSamples, severity),
      );
      const verdict = deriveVerdict({
        D: s.diff,
        lower: s.lower,
        upper: s.upper,
        n,
        scoringGateFailed,
      });
      return { ...s, verdict };
    });

    return { model, canonicalModelId, rawScored, compiledScored, strata, ledger };
  });

  return {
    token,
    runAt: new Date().toISOString(),
    cells,
    modelStats,
    inspectionFlags: flagRulesForInspection(modelEffects),
    caveats: [
      `The headline is lint violations reduced, not design quality improved. The compiler teaches the conventions the linter rewards, so a fall in fires is evidence of compliance with AHD, not by itself evidence of a better page.`,
      `Scoring runs the deterministic AHD linter (${rules.length} source-level rules) over every sample that passes a basic HTML sanity check.`,
      `Counts reported per cell: attempted (runs initiated) / errored (API / runtime errors) / extractionFailed (response contained no usable HTML) / scored (linted). A large gap between attempted and scored is a signal that the model is struggling with the instruction, not that it passed the taxonomy.`,
      `Raw condition: the brief is expanded as plain prose (intent + audience + surfaces + mustInclude + mustAvoid) with no AHD system prompt, no style token, no forbidden list. Compiled condition: same brief plus the AHD-compiled system prompt. The only thing that differs between conditions is the AHD intervention.`,
      `Vision-only tells (${VISION_RULES.length} rules in the critic) are not scored in this pipeline; run the critic on rendered screenshots for full taxonomy coverage.`,
      `Estimator: a Welch t interval on the difference of per-page mean counts, raw minus compiled, degrees of freedom by Welch-Satterthwaite, 99.5% two-sided. Each arm's variance is floored at the largest value of s(1 - s) over the Wilson interval at this level for the share of pages in the arm with a count of at least one, so an arm that never varies, whether at zero or at a constant nonzero count, does not carry zero uncertainty. A BCa bootstrap over the same per-sample counts is computed as a cross-check; it is never rendered where a verdict is read and never decides one. Whether this is persisted with the run depends on whether the run has a replay block; see the note above the per-model table.`,
      `A stratum whose raw mean sits below 0.5 tells per sample reports its ratio as not estimable rather than as a percentage; the verdict, which reads the absolute difference, is unaffected.`,
      `Model versions change. See the run manifest for the canonical model ids as reported by each provider.`,
    ],
  };
}

export async function runEval(
  token: string,
  samplesDir: string,
  options?: { config?: AhdProjectConfig },
): Promise<EvalReport> {
  let manifest: RunManifest | undefined;
  const manifestPath = join(samplesDir, "manifest.json");
  if (existsSync(manifestPath)) {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  }
  const cells = await loadCells(samplesDir, manifest);
  const evalCells: EvalCell[] = [];
  for (const c of cells) {
    const { counts, scored } = await scoreCell(c, options?.config);
    evalCells.push(
      aggregateCell(c.model, c.canonicalId, c.condition, scored, counts),
    );
  }
  const report = buildReport(token, evalCells, manifest?.carriedForward ?? []);
  report.runManifest = manifest;
  return report;
}

export function formatEvalReport(r: EvalReport): string {
  const lines: string[] = [];
  lines.push(`# ahd eval · ${r.token} · ${r.runAt}`);
  lines.push("");
  if (r.replay) {
    lines.push(renderReplayMarkdown(r.replay));
    lines.push("");
  }
  if (r.runManifest) {
    lines.push("## Run");
    lines.push("");
    lines.push(`- Brief: \`${r.runManifest.briefPath}\``);
    lines.push(`- Samples per cell: **${r.runManifest.n}**`);
    lines.push(`- Max tokens: ${r.runManifest.maxTokens}`);
    lines.push(`- Models:`);
    const carried = new Set(r.runManifest.carriedForward ?? []);
    for (const m of r.runManifest.models) {
      const mark = carried.has(m.canonicalId) ? " · **not run in this invocation**" : "";
      lines.push(`  - \`${m.canonicalId}\` (${m.provider}) · spec \`${m.spec}\`${mark}`);
    }
    if (carried.size > 0) {
      lines.push("");
      lines.push(
        `> ${carried.size} cell(s) above were carried forward from an earlier run in the ` +
          `output directory and were not measured by this invocation. Their figures come ` +
          `from whatever samples were already on disk. Check them against the replay block ` +
          `before citing them.`,
      );
    }
    lines.push("");
  }

  lines.push("## Per-model severity split: lint violations reduced");
  lines.push("");
  lines.push(
    "Raw mean tells minus compiled mean tells, per severity stratum, never blended. " +
      "This is a count of lint violations, not a judgment of design quality; the compiler " +
      "teaches the conventions the linter rewards, so a fall in fires is evidence of " +
      "compliance with AHD, not by itself evidence of a better page. The interval is a " +
      "99.5% Welch t interval on this run's per-page mean tell counts, degrees of freedom " +
      "by Welch-Satterthwaite, each arm's variance floored so a page count that never " +
      "varies does not carry zero uncertainty; a BCa bootstrap over the same counts is " +
      "computed as a cross-check and never decides the verdict. The verdict is derived " +
      "from the interval, not hand written." +
      (r.replay
        ? " The floor, the degrees of freedom and the bootstrap cross-check are recorded " +
          "with the run (see the replay block's `strata`, not shown in this table)."
        : " This run has no replay block (`ahd eval` re-lints committed samples with no " +
          "model call to record), so the floor and the bootstrap cross-check exist only " +
          "for this invocation and are not persisted anywhere; re-run this command to see " +
          "them again."),
  );
  lines.push("");
  for (const m of r.modelStats) {
    const rawCell = r.cells.find((c) => c.model === m.model && c.condition === "raw");
    const compCell = r.cells.find((c) => c.model === m.model && c.condition === "compiled");
    lines.push(`### \`${m.canonicalModelId}\``);
    lines.push("");
    lines.push(
      `Scored: raw ${rawCell?.counts.attempted ?? 0} → ${m.rawScored}, ` +
        `compiled ${compCell?.counts.attempted ?? 0} → ${m.compiledScored}.`,
    );
    lines.push("");
    lines.push(
      "| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | verdict |",
    );
    lines.push("|---|---:|---:|---:|---:|---:|---|");
    for (const s of m.strata) {
      const ratioCell = s.ratio === null ? "not estimable" : `${(s.ratio * 100).toFixed(1)}%`;
      const dfMark = s.df !== undefined ? `, df ${s.df.toFixed(1)}` : "";
      lines.push(
        `| ${s.severity} | ${s.rawMean.toFixed(2)} | ${s.cmpMean.toFixed(2)} | ${s.diff.toFixed(2)} | ` +
          `[${s.lower.toFixed(2)}, ${s.upper.toFixed(2)}]${dfMark} | ${ratioCell} | ${s.verdict} |`,
      );
    }
    lines.push("");
    lines.push(
      `Ledger: removed ${m.ledger.removed.length} (gross ${m.ledger.grossRemoved.toFixed(2)}), ` +
        `induced ${m.ledger.induced.length} (gross ${m.ledger.grossInduced.toFixed(2)}), ` +
        `net (compiled minus raw) ${m.ledger.net.toFixed(2)}${m.ledger.offsetting ? ", offsetting" : ""}.`,
    );
    if (m.ledger.removed.length) {
      lines.push("");
      lines.push(
        `Removed: ${m.ledger.removed.map((e) => `\`${e.rule}\` (${e.severity}, d=${e.d.toFixed(2)})`).join(", ")}`,
      );
    }
    if (m.ledger.induced.length) {
      lines.push("");
      lines.push(
        `Induced: ${m.ledger.induced.map((e) => `\`${e.rule}\` (${e.severity}, d=${e.d.toFixed(2)})`).join(", ")}`,
      );
    }
    lines.push("");
  }

  const inspectionFlags = r.inspectionFlags ?? [];
  lines.push("## Flagged for inspection");
  lines.push("");
  lines.push(
    "A rule induced in two or more models of this run and removed in none of " +
      "them, per the ledger's existing induced classification above; no second " +
      "threshold is applied here. This flags the rule for inspection as a " +
      "possible defect in our own tooling. It makes no causal claim about why " +
      "the models agree.",
  );
  lines.push("");
  if (inspectionFlags.length === 0) {
    lines.push("_No rule in this run was induced in two or more models with none removing it._");
  } else {
    for (const f of inspectionFlags) {
      lines.push(
        `### \`${f.rule}\` (${f.severity}), induced in ${f.qualifyingModels.length} model(s)`,
      );
      lines.push("");
      lines.push(`Qualifying: ${f.qualifyingModels.map((m) => `\`${m}\``).join(", ")}`);
      lines.push("");
      lines.push("| model | raw incidence | compiled incidence | classification |");
      lines.push("|---|---:|---:|---|");
      for (const m of f.models) {
        lines.push(
          `| \`${m.model}\` | ${(m.pRaw * 100).toFixed(0)}% | ${(m.pCmp * 100).toFixed(0)}% | ${m.classification} |`,
        );
      }
      lines.push("");
    }
  }

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
