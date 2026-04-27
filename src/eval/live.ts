import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { runnerFromSpec } from "./runners/index.js";
import { compile, briefAsProse } from "../compile.js";
import { loadToken, loadBrief } from "../load.js";
import { runEval } from "./runner.js";
import type { EvalReport, RunManifest } from "./types.js";
import { captureReplay } from "./replay.js";

interface LiveEvalOptions {
  tokensDir: string;
  token: string;
  briefPath: string;
  models: string[];
  n: number;
  outDir: string;
  maxTokens?: number;
  // Cap on in-flight sample requests per (cell, condition).
  // Default 1 (serial) preserves current behaviour and avoids
  // subscription-CLI auth races. Bump to 3+ for CF-only runs to cut
  // wall time without tripping rate limits. Models and conditions
  // remain serial regardless (different providers, different rate
  // budgets).
  sampleConcurrency?: number;
  // When supplied, the runner builds a Replay block and attaches it
  // to the returned report. The bin layer is the natural place to
  // capture invokedAt + argv (the runner has no idea what the user
  // typed), so the runner accepts these from the caller.
  replayContext?: { invokedAt: Date; argv: string[] };
}

// Run an array of producer functions with a concurrency cap.
// Returns settled results in the same order as the input. Used so
// one slow request doesn't head-of-line-block faster ones at the
// same concurrency slot.
async function withConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  cap: number,
): Promise<Array<{ ok: true; value: T } | { ok: false; error: unknown }>> {
  const results: Array<
    { ok: true; value: T } | { ok: false; error: unknown }
  > = new Array(tasks.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= tasks.length) return;
      try {
        results[i] = { ok: true, value: await tasks[i]() };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  }
  const workers = Array.from({ length: Math.max(1, cap) }, worker);
  await Promise.all(workers);
  return results;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function runLiveEval(opts: LiveEvalOptions): Promise<EvalReport> {
  const token = await loadToken(opts.tokensDir, opts.token);
  const brief = await loadBrief(opts.briefPath);
  const compiled = compile(brief, token, "final");

  const samplesRoot = resolve(opts.outDir, opts.token);
  const maxTokens = opts.maxTokens ?? 12000;

  const briefProse = briefAsProse(brief);

  const manifestModels: RunManifest["models"] = [];

  for (const spec of opts.models) {
    const runner = await runnerFromSpec(spec);
    const canonicalId = runner.id;
    const safeId = sanitizeId(canonicalId);
    manifestModels.push({
      spec,
      canonicalId,
      sanitizedId: safeId,
      provider: runner.provider,
    });

    const modelDir = join(samplesRoot, safeId);

    for (const condition of ["raw", "compiled"] as const) {
      const condDir = join(modelDir, condition);
      await mkdir(condDir, { recursive: true });

      const systemPrompt =
        condition === "compiled" ? compiled.prompts.generic : undefined;
      const userPrompt = [
        condition === "compiled"
          ? `Follow the brief and style direction above exactly.`
          : `Design a web page for the following brief.`,
        ``,
        briefProse,
        ``,
        `Return a single, self-contained, valid HTML5 document only — nothing before it, nothing after it, no prose commentary, no reasoning, no fenced code blocks. Start with <!doctype html> and end with </html>.`,
      ].join("\n");

      const tasks = Array.from({ length: opts.n }, (_, i) => async () => {
        const sampleBase = `sample-${String(i + 1).padStart(3, "0")}`;
        try {
          const out = await runner.run({
            systemPrompt,
            userPrompt,
            seed: i + 1,
            maxTokens,
          });
          await writeFile(join(condDir, `${sampleBase}.html`), out.html);
          await writeFile(join(condDir, `${sampleBase}.raw.txt`), out.rawResponse);
        } catch (err) {
          await writeFile(
            join(condDir, `${sampleBase}.error.txt`),
            String(err),
          );
        }
      });
      await withConcurrency(tasks, opts.sampleConcurrency ?? 1);
    }
  }

  // Merge with an existing manifest rather than overwrite it — partial
  // re-runs (e.g. one model at a time) should preserve manifest entries
  // for models not re-run in this invocation.
  let previous: RunManifest | undefined;
  const existingManifestPath = join(samplesRoot, "manifest.json");
  if (existsSync(existingManifestPath)) {
    try {
      previous = JSON.parse(await readFile(existingManifestPath, "utf8"));
    } catch {
      previous = undefined;
    }
  }
  const keepFromPrevious = (previous?.models ?? []).filter(
    (p) => !manifestModels.some((m) => m.sanitizedId === p.sanitizedId),
  );
  const mergedModels = [...keepFromPrevious, ...manifestModels];

  const runManifest: RunManifest = {
    token: opts.token,
    briefPath: opts.briefPath,
    n: opts.n,
    maxTokens,
    runAt: new Date().toISOString(),
    models: mergedModels,
  };
  await mkdir(samplesRoot, { recursive: true });
  await writeFile(
    join(samplesRoot, "manifest.json"),
    JSON.stringify(runManifest, null, 2),
  );

  const report = await runEval(opts.token, samplesRoot);
  report.runManifest = runManifest;

  if (opts.replayContext) {
    report.replay = captureReplay({
      kind: "eval-live",
      token: { path: `${opts.tokensDir}/${opts.token}.yml`, resolved: token },
      brief: { path: opts.briefPath, resolved: brief },
      sampling: { n: opts.n, temperature: null, seed: null },
      models: manifestModels.map((m) => ({
        id: m.canonicalId,
        provider: m.provider,
        provider_request_ids: [],
      })),
      conditions: {
        requested: ["raw", "compiled"],
        effective: ["raw", "compiled"],
      },
      invokedAt: opts.replayContext.invokedAt,
      argv: opts.replayContext.argv,
    });
  }

  return report;
}
