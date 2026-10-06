#!/usr/bin/env node
// Recomputes the published weekly reports into a derived artefact per
// docs/specs/0001-published-eval-statistic.md, without editing the
// reports. Run `node tools/recompute-historical-epoch.mjs` from a
// built tree (`npm run build` first); entirely offline.

import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Z_995,
  parseWeeklyReport,
  excludeRule,
  severityOf,
  computeRuleEffect,
  buildLedger,
  flagRulesForInspection,
  computeStratum,
  deriveHistoricalVerdict,
  identityOfSidecar,
  assertSameEpoch,
} from "../dist/eval/historical.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const WEEKLY_DIR = resolve(root, "docs", "evals", "weekly");
const OUT_MD = resolve(root, "docs", "evals", "weekly-epoch-recompute.md");
const OUT_JSON = resolve(root, "docs", "evals", "weekly-epoch-recompute.json");
const EXCLUDED_RULE = "ahd/tracking-per-size";
const SEVERITIES = ["error", "warn", "info"];

const manifest = JSON.parse(await readFile(resolve(root, "rules.manifest.json"), "utf8"));
const severityMap = Object.fromEntries(manifest.rules.map((r) => [r.id, r.severity]));

const files = (await readdir(WEEKLY_DIR)).filter((f) => /^\d{4}-\d{2}-\d{2}\.md$/.test(f)).sort();
if (files.length === 0) {
  console.error("recompute-historical-epoch: no weekly reports found");
  process.exit(1);
}

const runs = [];
for (const f of files) {
  const date = f.replace(/\.md$/, "");
  const md = await readFile(join(WEEKLY_DIR, f), "utf8");
  const replay = JSON.parse(await readFile(join(WEEKLY_DIR, f.replace(/\.md$/, ".replay.json")), "utf8"));
  runs.push({ date, md, replay });
}

// Refuses to pool across an epoch boundary. The runs are expected to
// share one linter version, roster and sample size; if they do not,
// this is not one series and the tool stops rather than blending
// them.
assertSameEpoch(runs.map((r) => identityOfSidecar(r.replay)));

const RUN_COUNT = runs.length;
const RUN_WORD = { 11: "eleven", 12: "twelve", 13: "thirteen", 14: "fourteen", 15: "fifteen" }[RUN_COUNT] ?? String(RUN_COUNT);

const output = { runs: [] };
const mdLines = [];

mdLines.push("# Recomputed historical eval series, weekly epoch");
mdLines.push("");
mdLines.push(
  `Derived from the ${RUN_WORD} published weekly reports under \`docs/evals/weekly/\`, ` +
    "recomputed per `docs/specs/0001-published-eval-statistic.md`. The reports " +
    "are not edited; this is a separate artefact, re-derivable offline " +
    "from the committed markdown tables and replay sidecars, no network call " +
    "and no provider credentials.",
);
mdLines.push("");
mdLines.push(
  `\`${EXCLUDED_RULE}\` is excluded from both arms of every run below. It is a ` +
    "confirmed defect: it reads font-size and letter-spacing from the same CSS " +
    "block, so a correctly tracked page can fire it when the two declarations " +
    "sit apart, and the defect falls on the compiled arm because the compiled " +
    `prompt is what produces display type. The pages behind these ${RUN_WORD} runs ` +
    "were never kept, so which fires were false is unrecoverable; the exclusion " +
    "is by subtraction of the rule's recovered counts, exact because of the " +
    "additive decomposition, and no false-positive rate is applied as a " +
    "correction factor.",
);
mdLines.push("");
mdLines.push(
  "Runs are presented side by side, not pooled. Cadence moves to monthly, so " +
    "there is no between-run interval worth having; each run carries its own " +
    "figures.",
);
mdLines.push("");
mdLines.push(
  "A row the run's replay sidecar does not name as measured (a value carried " +
    "forward from an earlier run's output directory into a later report) is " +
    "excluded, not measured by that invocation.",
);
mdLines.push("");

for (const run of runs) {
  const parsed = parseWeeklyReport(run.md, run.replay);
  const runOut = { date: run.date, carried: parsed.carried, models: [] };
  const runEffects = [];

  mdLines.push(`## ${run.date}`);
  mdLines.push("");
  if (parsed.carried.length) {
    mdLines.push(`Carried forward, excluded: ${parsed.carried.join(", ")}`);
    mdLines.push("");
  }

  for (const model of parsed.models) {
    const { remaining, excluded } = excludeRule(model.ruleCounts, EXCLUDED_RULE);

    const effects = [...remaining.entries()].map(([rule, counts]) =>
      computeRuleEffect({
        rule,
        severity: severityOf(rule, severityMap),
        kRaw: counts.raw,
        nRaw: model.rawScored,
        kCmp: counts.cmp,
        nCmp: model.cmpScored,
      }),
    );

    runEffects.push({ model: model.model, effects });

    const ledger = buildLedger(effects);
    // The excluded rule's own contribution must not appear in net,
    // gross or any stratum: net is the sum of d over the remaining
    // rules only, which is why exclusion happens before ledger and
    // stratum computation rather than after.

    const strata = SEVERITIES.map((severity) => {
      const s = computeStratum(effects, severity, model.rawScored, model.cmpScored);
      const n = Math.min(model.rawScored, model.cmpScored);
      const verdict = deriveHistoricalVerdict({
        lower: s.lower,
        upper: s.upper,
        n,
      });
      return { severity, ...s, verdict };
    });

    const offsetting = ledger.removed.length > 0 && ledger.induced.length > 0;

    runOut.models.push({
      model: model.model,
      rawScored: model.rawScored,
      cmpScored: model.cmpScored,
      excludedRule: { rule: EXCLUDED_RULE, raw: excluded.raw, cmp: excluded.cmp },
      strata,
      ledger: {
        removed: ledger.removed.map((e) => ({ rule: e.rule, severity: e.severity, d: e.d, lower: e.lower, upper: e.upper })),
        induced: ledger.induced.map((e) => ({ rule: e.rule, severity: e.severity, d: e.d, lower: e.lower, upper: e.upper })),
        grossRemoved: ledger.grossRemoved,
        grossInduced: ledger.grossInduced,
        net: ledger.net,
        offsetting,
      },
      effects: effects.map((e) => ({
        rule: e.rule,
        severity: e.severity,
        d: e.d,
        lower: e.lower,
        upper: e.upper,
        classification: e.classification,
      })),
    });

    mdLines.push(`### \`${model.model}\``);
    mdLines.push("");
    mdLines.push(`Scored: raw ${model.rawScored}, compiled ${model.cmpScored}. \`${EXCLUDED_RULE}\` excluded (raw ${excluded.raw}, compiled ${excluded.cmp}).`);
    mdLines.push("");
    mdLines.push("| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |");
    mdLines.push("|---|---:|---:|---:|---:|---:|---|---|");
    for (const s of strata) {
      const ratioCell = s.ratio === null ? "not estimable" : `${(s.ratio * 100).toFixed(1)}%`;
      const varianceRatioCell =
        s.varianceRatio === null
          ? (s.varianceRatioNote ?? "n/a")
          : `${s.varianceRatio.toFixed(1)}×${s.varianceRatioNote ? ` (${s.varianceRatioNote})` : ""}`;
      mdLines.push(
        `| ${s.severity} | ${s.rawMean.toFixed(2)} | ${s.cmpMean.toFixed(2)} | ${s.diff.toFixed(2)} | ` +
          `[${s.lower.toFixed(2)}, ${s.upper.toFixed(2)}], df ${s.df.toFixed(1)} | ${ratioCell} | ${varianceRatioCell} | ${s.verdict} |`,
      );
    }
    mdLines.push("");
    mdLines.push(
      `Ledger: removed ${ledger.removed.length} (gross ${ledger.grossRemoved.toFixed(2)}), ` +
        `induced ${ledger.induced.length} (gross ${ledger.grossInduced.toFixed(2)}), ` +
        `net (compiled minus raw) ${ledger.net.toFixed(2)}${offsetting ? ", offsetting" : ""}.`,
    );
    if (ledger.removed.length) {
      mdLines.push("");
      mdLines.push(
        `Removed: ${ledger.removed.map((e) => `\`${e.rule}\` (${e.severity}, d=${e.d.toFixed(2)})`).join(", ")}`,
      );
    }
    if (ledger.induced.length) {
      mdLines.push("");
      mdLines.push(
        `Induced: ${ledger.induced.map((e) => `\`${e.rule}\` (${e.severity}, d=${e.d.toFixed(2)})`).join(", ")}`,
      );
    }
    mdLines.push("");
  }

  const inspectionFlags = flagRulesForInspection(runEffects);
  runOut.inspectionFlags = inspectionFlags.map((f) => ({
    rule: f.rule,
    severity: f.severity,
    qualifyingModels: f.qualifyingModels,
    models: f.models,
  }));

  mdLines.push("### Flagged for inspection");
  mdLines.push("");
  mdLines.push(
    "A rule induced in two or more models of this run and removed in none of " +
      "them, per the induced classification above; no second threshold is " +
      "applied here. This flags the rule for inspection as a possible defect " +
      "in our own tooling. It makes no causal claim about why the models " +
      "agree.",
  );
  mdLines.push("");
  if (inspectionFlags.length === 0) {
    mdLines.push("_No rule in this run was induced in two or more models with none removing it._");
    mdLines.push("");
  } else {
    for (const f of inspectionFlags) {
      mdLines.push(`\`${f.rule}\` (${f.severity}), induced in ${f.qualifyingModels.length} model(s).`);
      mdLines.push("");
      mdLines.push(`Qualifying: ${f.qualifyingModels.map((m) => `\`${m}\``).join(", ")}`);
      mdLines.push("");
      mdLines.push("| model | raw incidence | compiled incidence | classification |");
      mdLines.push("|---|---:|---:|---|");
      for (const m of f.models) {
        mdLines.push(
          `| \`${m.model}\` | ${(m.pRaw * 100).toFixed(0)}% | ${(m.pCmp * 100).toFixed(0)}% | ${m.classification} |`,
        );
      }
      mdLines.push("");
    }
  }

  output.runs.push(runOut);
}

// Repeatability across runs is a plain tally, never an average, and
// only legitimate where more than one run of the same epoch exists.
// The weekly runs are that place; a single live run has nothing to
// tally against.
const tally = new Map();
for (const runOut of output.runs) {
  for (const m of runOut.models) {
    for (const s of m.strata) {
      const key = `${m.model}::${s.severity}`;
      const t = tally.get(key) ?? {
        model: m.model,
        severity: s.severity,
        resolvedReduced: 0,
        resolvedIncreased: 0,
        notResolved: 0,
        notEstimable: 0,
        total: 0,
      };
      t.total++;
      if (s.verdict === "resolved under the widest variance, reduced") t.resolvedReduced++;
      else if (s.verdict === "resolved under the widest variance, increased") t.resolvedIncreased++;
      else if (s.verdict === "not resolved") t.notResolved++;
      else t.notEstimable++;
      tally.set(key, t);
    }
  }
}
output.repeatability = [...tally.values()];

mdLines.push("## Repeatability across runs");
mdLines.push("");
mdLines.push(
  `A plain tally of the historical verdict across the ${RUN_WORD} runs, never an ` +
    "average. A bound is not a measurement, so this tally counts resolved " +
    "under the widest variance and not resolved, the same wording the cells " +
    "above use, never the per-run verdict words.",
);
mdLines.push("");
mdLines.push("| model | severity | resolved, reduced | resolved, increased | not resolved | not estimable | of |");
mdLines.push("|---|---|---:|---:|---:|---:|---:|");
for (const t of output.repeatability) {
  mdLines.push(
    `| \`${t.model}\` | ${t.severity} | ${t.resolvedReduced} | ${t.resolvedIncreased} | ` +
      `${t.notResolved} | ${t.notEstimable} | ${t.total} |`,
  );
}
mdLines.push("");

mdLines.push("## Caveats");
mdLines.push("");
mdLines.push(
  `- Trend claims are not supported. ${RUN_WORD[0].toUpperCase()}${RUN_WORD.slice(1)} runs of one linter version and ` +
    "roster are a closed epoch, not a series to extrapolate from.",
);
mdLines.push(
  "- History has only per-rule marginals, not per-page records of which " +
    "rules co-fired, so the per-page variance of a stratum count is unknown. " +
    "Each arm's variance is bounded instead by the widest variance " +
    "consistent with the published marginals, the comonotone bound: rule " +
    "pairs are assumed maximally positively correlated, which cannot be " +
    "confirmed or ruled out from the committed data. A bound is not a " +
    "measurement, which is why these cells carry none of the per-run " +
    "verdict words.",
);
mdLines.push(
  "- Figures below are re-derived entirely from the markdown percentage " +
    "tables and the run manifests already committed under " +
    "`docs/evals/weekly/`. No network call, no provider credentials.",
);
mdLines.push("");

await writeFile(OUT_MD, mdLines.join("\n") + "\n");
await writeFile(OUT_JSON, JSON.stringify(output, null, 2) + "\n");

console.log(`recompute-historical-epoch: wrote ${OUT_MD}`);
console.log(`recompute-historical-epoch: wrote ${OUT_JSON}`);
