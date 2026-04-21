import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, resolve, dirname, basename, extname } from "node:path";
import {
  mockCritic,
  anthropicVisionCritic,
  type Critic,
  VISION_RULES,
} from "./critic.js";
import { fileToBase64, renderFileToPng } from "./screenshot.js";
import type { Violation } from "../lint/types.js";

export interface CritiqueRunOptions {
  samplesDir: string;
  token: string;
  critic: Critic;
  outDir: string;
  max?: number;
}

export interface CritiqueReport {
  token: string;
  critic: string;
  runAt: string;
  critiques: Array<{
    file: string;
    condition: "raw" | "compiled" | "unknown";
    model: string;
    violations: Violation[];
  }>;
  tellFrequency: Record<string, { raw: number; compiled: number }>;
  scored: { raw: number; compiled: number };
}

async function collectHtmlSamples(
  samplesDir: string,
): Promise<Array<{ path: string; model: string; condition: "raw" | "compiled" }>> {
  const out: Array<{ path: string; model: string; condition: "raw" | "compiled" }> = [];
  if (!existsSync(samplesDir)) return out;
  const models = await readdir(samplesDir, { withFileTypes: true });
  for (const m of models) {
    if (!m.isDirectory()) continue;
    for (const cond of ["raw", "compiled"] as const) {
      const dir = join(samplesDir, m.name, cond);
      if (!existsSync(dir)) continue;
      const files = await readdir(dir);
      for (const f of files) {
        if (extname(f).toLowerCase() !== ".html") continue;
        out.push({ path: join(dir, f), model: m.name, condition: cond });
      }
    }
  }
  return out;
}

export async function runCritiqueOnDir(opts: CritiqueRunOptions): Promise<CritiqueReport> {
  const samples = await collectHtmlSamples(opts.samplesDir);
  const limit = opts.max ?? samples.length;
  const subset = samples.slice(0, limit);
  const screenshotsDir = resolve(opts.outDir, "screenshots");
  await mkdir(screenshotsDir, { recursive: true });

  const critiques: CritiqueReport["critiques"] = [];
  const scored = { raw: 0, compiled: 0 };
  const tellFrequency: Record<string, { raw: number; compiled: number }> = {};

  for (const sample of subset) {
    const shotPath = join(
      screenshotsDir,
      `${sample.model}_${sample.condition}_${basename(sample.path, ".html")}.png`,
    );
    try {
      await renderFileToPng(sample.path, shotPath);
    } catch (err) {
      await writeFile(
        shotPath + ".error.txt",
        String(err instanceof Error ? err.message : err),
      );
      continue;
    }

    const imageBase64 = await fileToBase64(shotPath);
    let violations: Violation[] = [];
    try {
      violations = await opts.critic.critique({
        imageBase64,
        token: opts.token,
        url: shotPath,
        context: sample.model,
      });
    } catch (err) {
      await writeFile(
        shotPath + ".critique-error.txt",
        String(err instanceof Error ? err.message : err),
      );
      continue;
    }

    critiques.push({
      file: sample.path,
      model: sample.model,
      condition: sample.condition,
      violations,
    });
    scored[sample.condition]++;

    for (const v of violations) {
      tellFrequency[v.ruleId] ||= { raw: 0, compiled: 0 };
      tellFrequency[v.ruleId][sample.condition]++;
    }
  }

  return {
    token: opts.token,
    critic: opts.critic.id,
    runAt: new Date().toISOString(),
    critiques,
    tellFrequency,
    scored,
  };
}

export function formatCritiqueReport(r: CritiqueReport): string {
  const lines: string[] = [];
  lines.push(`# ahd critique · ${r.token} · ${r.runAt}`);
  lines.push(`critic: \`${r.critic}\``);
  lines.push("");
  lines.push("## Vision-only rules fired (critic vs. ruleset)");
  lines.push("");
  lines.push("| rule | raw (n=" + r.scored.raw + ") | compiled (n=" + r.scored.compiled + ") |");
  lines.push("|---|---:|---:|");
  const allRuleIds = new Set<string>([
    ...VISION_RULES.map((v) => v.id),
    ...Object.keys(r.tellFrequency),
  ]);
  for (const id of [...allRuleIds].sort()) {
    const freq = r.tellFrequency[id] ?? { raw: 0, compiled: 0 };
    const rawPct = r.scored.raw
      ? ((freq.raw / r.scored.raw) * 100).toFixed(0) + "%"
      : "—";
    const compPct = r.scored.compiled
      ? ((freq.compiled / r.scored.compiled) * 100).toFixed(0) + "%"
      : "—";
    lines.push(`| ${id} | ${rawPct} | ${compPct} |`);
  }
  lines.push("");
  lines.push("## Per-sample findings");
  lines.push("");
  for (const c of r.critiques) {
    const status =
      c.violations.length === 0
        ? "✓ no vision tells"
        : `${c.violations.length} tell${c.violations.length === 1 ? "" : "s"}`;
    lines.push(`- ${c.model}/${c.condition}/${basename(c.file)} — ${status}`);
    for (const v of c.violations) {
      lines.push(`    - \`${v.ruleId}\`: ${v.message}`);
    }
  }
  return lines.join("\n");
}
