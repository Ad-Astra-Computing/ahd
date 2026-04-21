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
  maxTokens?: number;
}

export async function runLiveEval(opts: LiveEvalOptions): Promise<EvalReport> {
  const token = await loadToken(opts.tokensDir, opts.token);
  const brief = parseYaml(await readFile(opts.briefPath, "utf8"));
  const compiled = compile(brief, token);

  const samplesRoot = resolve(opts.outDir, opts.token);
  const maxTokens = opts.maxTokens ?? 12000;

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
            ? [
                `Follow the brief above exactly. Return a single, self-contained, valid HTML5 document only — nothing before it, nothing after it, no prose commentary, no reasoning, no fenced code blocks. Start the response with <!doctype html> and end it with </html>.`,
                ``,
                `Brief intent: ${brief.intent}`,
              ].join("\n")
            : [
                `Design a web page for the following intent.`,
                ``,
                brief.intent,
                ``,
                `Return a single, self-contained, valid HTML5 document only — nothing before it, nothing after it, no prose commentary, no reasoning, no fenced code blocks. Start with <!doctype html> and end with </html>.`,
              ].join("\n");
        try {
          const out = await runner.run({
            systemPrompt,
            userPrompt,
            seed: i + 1,
            maxTokens,
          });
          await writeFile(
            join(condDir, `sample-${String(i + 1).padStart(3, "0")}.html`),
            out.html,
          );
          await writeFile(
            join(condDir, `sample-${String(i + 1).padStart(3, "0")}.raw.txt`),
            out.rawResponse,
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
