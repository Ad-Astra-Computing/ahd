import { mkdir, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { imageRunnerFromSpec } from "./runners/image-index.js";
import { compileImagePrompt, briefAsProse } from "../compile.js";
import { loadToken } from "../load.js";
import { anthropicVisionCritic, mockCritic, type Critic } from "../critique/critic.js";

function resolveDefaultCritic(): Critic {
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) {
    return anthropicVisionCritic({
      apiKey: key,
      model: process.env.AHD_VISION_MODEL ?? "claude-haiku-4-5-20251001",
    });
  }
  return mockCritic({});
}
import type { Violation } from "../lint/types.js";

interface LiveImageEvalOptions {
  tokensDir: string;
  token: string;
  briefPath: string;
  imageModels: string[];
  n: number;
  outDir: string;
  critic?: Critic;
  width?: number;
  height?: number;
}

function sanitizeId(id: string): string {
  return id.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export interface ImageEvalCell {
  model: string;
  canonicalModelId: string;
  condition: "raw" | "compiled";
  attempted: number;
  errored: number;
  critiqued: number;
  meanTells: number;
  perTellFrequency: Record<string, number>;
}

export interface ImageEvalReport {
  token: string;
  runAt: string;
  brief: string;
  n: number;
  cells: ImageEvalCell[];
  deltas: Array<{
    model: string;
    canonicalModelId: string;
    rawMeanTells: number;
    compiledMeanTells: number;
    delta: number;
    reductionPct: number;
    rawCritiqued: number;
    compiledCritiqued: number;
  }>;
  caveats: string[];
}

export async function runLiveImageEval(
  opts: LiveImageEvalOptions,
): Promise<ImageEvalReport> {
  const token = await loadToken(opts.tokensDir, opts.token);
  const brief = parseYaml(await readFile(opts.briefPath, "utf8"));
  const { prompt: compiledPrompt, negativePrompt } = compileImagePrompt(brief, token);
  const rawPrompt = briefAsProse(brief);

  const samplesRoot = resolve(opts.outDir, opts.token, "images");
  await mkdir(samplesRoot, { recursive: true });

  const critic = opts.critic ?? resolveDefaultCritic();

  const cells: ImageEvalCell[] = [];

  for (const spec of opts.imageModels) {
    const runner = imageRunnerFromSpec(spec);
    const canonicalId = runner.id;
    const safeId = sanitizeId(canonicalId);

    for (const condition of ["raw", "compiled"] as const) {
      const condDir = join(samplesRoot, safeId, condition);
      await mkdir(condDir, { recursive: true });

      const prompt = condition === "compiled" ? compiledPrompt : rawPrompt;
      const negPrompt = condition === "compiled" ? negativePrompt : undefined;

      let attempted = 0;
      let errored = 0;
      let critiqued = 0;
      const tellCounts: Record<string, number> = {};
      let totalTells = 0;

      for (let i = 0; i < opts.n; i++) {
        attempted++;
        const base = `sample-${String(i + 1).padStart(3, "0")}`;
        try {
          const out = await runner.run({
            prompt,
            negativePrompt: negPrompt,
            seed: i + 1,
            width: opts.width ?? 1024,
            height: opts.height ?? 1024,
          });
          const pngPath = join(condDir, `${base}.png`);
          await writeFile(pngPath, Buffer.from(out.pngBase64, "base64"));
          await writeFile(
            join(condDir, `${base}.prompt.txt`),
            `prompt:\n${prompt}\n\nnegative:\n${negPrompt ?? ""}`,
          );

          try {
            const violations: Violation[] = await critic.critique({
              imageBase64: out.pngBase64,
              token: opts.token,
              url: pngPath,
              context: `${safeId}/${condition}/${base}`,
            });
            critiqued++;
            for (const v of violations) {
              tellCounts[v.ruleId] = (tellCounts[v.ruleId] ?? 0) + 1;
              totalTells++;
            }
            await writeFile(
              join(condDir, `${base}.critique.json`),
              JSON.stringify(violations, null, 2),
            );
          } catch (critErr) {
            await writeFile(
              join(condDir, `${base}.critique-error.txt`),
              String(critErr instanceof Error ? critErr.message : critErr),
            );
          }
        } catch (err) {
          errored++;
          await writeFile(
            join(condDir, `${base}.error.txt`),
            String(err instanceof Error ? err.message : err),
          );
        }
      }

      const perTellFrequency: Record<string, number> = {};
      for (const [k, v] of Object.entries(tellCounts)) {
        perTellFrequency[k] = critiqued > 0 ? v / critiqued : 0;
      }
      cells.push({
        model: safeId,
        canonicalModelId: canonicalId,
        condition,
        attempted,
        errored,
        critiqued,
        meanTells: critiqued > 0 ? totalTells / critiqued : 0,
        perTellFrequency,
      });
    }
  }

  const models = Array.from(new Set(cells.map((c) => c.canonicalModelId)));
  const deltas = models.map((canonicalId) => {
    const raw = cells.find(
      (c) => c.canonicalModelId === canonicalId && c.condition === "raw",
    );
    const compiled = cells.find(
      (c) => c.canonicalModelId === canonicalId && c.condition === "compiled",
    );
    const rawMean = raw?.meanTells ?? 0;
    const compMean = compiled?.meanTells ?? 0;
    const delta = rawMean - compMean;
    return {
      model: raw?.model ?? compiled?.model ?? canonicalId,
      canonicalModelId: canonicalId,
      rawMeanTells: rawMean,
      compiledMeanTells: compMean,
      delta,
      reductionPct: rawMean > 0 ? (delta / rawMean) * 100 : 0,
      rawCritiqued: raw?.critiqued ?? 0,
      compiledCritiqued: compiled?.critiqued ?? 0,
    };
  });

  return {
    token: opts.token,
    runAt: new Date().toISOString(),
    brief: opts.briefPath,
    n: opts.n,
    cells,
    deltas,
    caveats: [
      "Image samples are scored by the vision critic over the AHD vision ruleset (13 rules: 9 web/graphic + 4 image-specific).",
      "The critic is itself an LLM. Verdicts are not independent of model training; run with --critic mock for deterministic tests and report both.",
      "Per-cell counts are separate: attempted (runs initiated) / errored (API errors) / critiqued (scored). A large gap indicates rate-limit or generator failures, not that a run 'passed' the taxonomy.",
      "Raw condition: brief as prose with no AHD style direction or forbidden list. Compiled condition: token-driven positive + negative prompts.",
      "The compiled negative prompt includes image-specific slop patterns (corporate memphis, malformed anatomy, iridescent blobs, decorative cursive). The raw condition does not.",
    ],
  };
}

export function formatImageEvalReport(r: ImageEvalReport): string {
  const lines: string[] = [];
  lines.push(`# ahd eval-image · ${r.token} · ${r.runAt}`);
  lines.push("");
  lines.push(`- Brief: \`${r.brief}\``);
  lines.push(`- Samples per cell: **${r.n}**`);
  lines.push("");
  lines.push("## Per-model slop reduction (vision critic)");
  lines.push("");
  lines.push(
    "| model | raw attempted → critiqued | compiled attempted → critiqued | raw mean tells | compiled mean tells | Δ | reduction |",
  );
  lines.push("|---|---:|---:|---:|---:|---:|---:|");
  for (const d of r.deltas) {
    const rawCell = r.cells.find(
      (c) => c.canonicalModelId === d.canonicalModelId && c.condition === "raw",
    );
    const compCell = r.cells.find(
      (c) => c.canonicalModelId === d.canonicalModelId && c.condition === "compiled",
    );
    lines.push(
      `| \`${d.canonicalModelId}\` | ${rawCell?.attempted ?? 0} → ${rawCell?.critiqued ?? 0} | ${compCell?.attempted ?? 0} → ${compCell?.critiqued ?? 0} | ${d.rawMeanTells.toFixed(2)} | ${d.compiledMeanTells.toFixed(2)} | ${d.delta.toFixed(2)} | ${d.reductionPct.toFixed(1)}% |`,
    );
  }
  lines.push("");
  lines.push("## Per-tell frequency");
  lines.push("");
  const tells = new Set<string>();
  for (const c of r.cells) for (const t of Object.keys(c.perTellFrequency)) tells.add(t);
  const tellList = [...tells].sort();
  if (tellList.length === 0) {
    lines.push("_No vision tells fired across any scored image._");
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
