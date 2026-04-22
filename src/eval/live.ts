import { mkdir, writeFile, readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { runnerFromSpec } from "./runners/index.js";
import { compile, briefAsProse } from "../compile.js";
import { loadToken } from "../load.js";
import { runEval } from "./runner.js";
import type { EvalReport, RunManifest } from "./types.js";

interface LiveEvalOptions {
  tokensDir: string;
  token: string;
  briefPath: string;
  models: string[];
  n: number;
  outDir: string;
  maxTokens?: number;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function runLiveEval(opts: LiveEvalOptions): Promise<EvalReport> {
  const token = await loadToken(opts.tokensDir, opts.token);
  const brief = parseYaml(await readFile(opts.briefPath, "utf8"));
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

      for (let i = 0; i < opts.n; i++) {
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
      }
    }
  }

  const runManifest: RunManifest = {
    token: opts.token,
    briefPath: opts.briefPath,
    n: opts.n,
    maxTokens,
    runAt: new Date().toISOString(),
    models: manifestModels,
  };
  await mkdir(samplesRoot, { recursive: true });
  await writeFile(
    join(samplesRoot, "manifest.json"),
    JSON.stringify(runManifest, null, 2),
  );

  const report = await runEval(opts.token, samplesRoot);
  report.runManifest = runManifest;
  return report;
}
