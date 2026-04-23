import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { runnerFromSpec } from "./runners/index.js";
import { compile } from "../compile.js";
import { loadToken } from "../load.js";
import { runEval } from "./runner.js";
import type { EvalReport } from "./types.js";

interface LiveEvalOptions {
  tokensDir: string;
  token: string;
  briefPath: string;
  models: string[];
  n: number;
  outDir: string;
}

export async function runLiveEval(opts: LiveEvalOptions): Promise<EvalReport> {
  const token = await loadToken(opts.tokensDir, opts.token);
  const brief = parseYaml(await readFile(opts.briefPath, "utf8"));
  const compiled = compile(brief, token);

  const samplesRoot = resolve(opts.outDir, opts.token);

  for (const spec of opts.models) {
    const runner = runnerFromSpec(spec);
    const safeId = runner.id.replace(/[^a-zA-Z0-9._-]/g, "_");
    const modelDir = join(samplesRoot, safeId);

    for (const condition of ["raw", "compiled"] as const) {
      const condDir = join(modelDir, condition);
      await mkdir(condDir, { recursive: true });
      for (let i = 0; i < opts.n; i++) {
        const systemPrompt =
          condition === "compiled" ? compiled.prompts.generic : undefined;
        const userPrompt =
          condition === "compiled"
            ? `Follow the brief above. Return a full, self-contained HTML document only.`
            : `${brief.intent}\n\nReturn a full, self-contained HTML document only.`;
        try {
          const out = await runner.run({
            systemPrompt,
            userPrompt,
            seed: i + 1,
          });
          await writeFile(
            join(condDir, `sample-${String(i + 1).padStart(3, "0")}.html`),
            out.html,
          );
        } catch (err) {
          await writeFile(
            join(condDir, `sample-${String(i + 1).padStart(3, "0")}.error.txt`),
            String(err),
          );
        }
      }
    }
  }

  return runEval(opts.token, samplesRoot);
}
