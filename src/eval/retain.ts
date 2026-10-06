import { mkdir, readFile, readdir, writeFile, copyFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, relative } from "node:path";
import { hashBytes } from "./replay.js";
import type { Condition, RunManifest } from "./types.js";

// Retains a run's generated pages, not just digests, per
// docs/specs/0001-published-eval-statistic.md ("Recording").
//
// Write-once, unlike eval-live's merging output directory, so a
// carried-forward cell can never be copied in as if that run produced it.

export class RetainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetainError";
  }
}

export interface RetainedPage {
  page_id: string;
  model: string;
  arm: Condition;
  sample_id: string;
  path: string;
  hash: string;
  raw_hash: string | null;
  byte_length: number;
  generated_at: string;
  epoch: string;
  run_id: string;
  harness_commit: string | null;
}

export interface RetainedRunSidecar {
  schema_version: 1;
  run_id: string;
  epoch: string;
  harness_commit: string | null;
  token: string;
  run_at: string;
  pages: RetainedPage[];
}

export interface RetainOptions {
  samplesRoot: string;
  runDir: string;
  manifest: RunManifest;
  epoch: string;
  harnessCommit: string | null;
}

const SAMPLE_RE = /^(sample-\d+)\.html$/;

// Copies this invocation's pages (never a carried-forward cell) into a
// fresh directory and writes a sidecar naming each one. Refuses
// outright when runDir already exists.
export async function retainRunPages(opts: RetainOptions): Promise<RetainedRunSidecar> {
  if (existsSync(opts.runDir)) {
    throw new RetainError(
      `retainRunPages: ${opts.runDir} already exists. A retained run directory is write-once; ` +
        `point at a fresh directory instead of writing into a prior run's retained copy.`,
    );
  }

  const carried = new Set(opts.manifest.carriedForward ?? []);
  const runId = `${opts.manifest.token}@${opts.manifest.runAt}`;
  const generatedAt = opts.manifest.runAt;
  const pages: RetainedPage[] = [];

  for (const m of opts.manifest.models) {
    if (carried.has(m.canonicalId)) continue; // only this invocation's own pages
    for (const arm of ["raw", "compiled"] as Condition[]) {
      const srcDir = join(opts.samplesRoot, m.sanitizedId, arm);
      const files = await readdir(srcDir).catch(() => []);
      for (const f of files) {
        const match = SAMPLE_RE.exec(f);
        if (!match) continue;
        const sampleId = match[1];
        const htmlSrc = join(srcDir, f);
        const rawSrc = join(srcDir, `${sampleId}.raw.txt`);
        const destDir = join(opts.runDir, m.sanitizedId, arm);
        await mkdir(destDir, { recursive: true });

        const htmlBytes = await readFile(htmlSrc);
        await copyFile(htmlSrc, join(destDir, f));

        let rawHash: string | null = null;
        if (existsSync(rawSrc)) {
          const rawBytes = await readFile(rawSrc);
          await copyFile(rawSrc, join(destDir, `${sampleId}.raw.txt`));
          rawHash = hashBytes(rawBytes);
        }

        pages.push({
          page_id: `${m.canonicalId}/${arm}/${sampleId}`,
          model: m.canonicalId,
          arm,
          sample_id: sampleId,
          path: relative(opts.runDir, join(destDir, f)),
          hash: hashBytes(htmlBytes),
          raw_hash: rawHash,
          byte_length: Buffer.byteLength(htmlBytes),
          generated_at: generatedAt,
          epoch: opts.epoch,
          run_id: runId,
          harness_commit: opts.harnessCommit,
        });
      }
    }
  }

  const sidecar: RetainedRunSidecar = {
    schema_version: 1,
    run_id: runId,
    epoch: opts.epoch,
    harness_commit: opts.harnessCommit,
    token: opts.manifest.token,
    run_at: opts.manifest.runAt,
    pages,
  };
  await mkdir(opts.runDir, { recursive: true });
  await writeFile(
    join(opts.runDir, "pages.sidecar.json"),
    JSON.stringify(sidecar, null, 2) + "\n",
  );
  return sidecar;
}

export interface VerifyRetainedRunResult {
  ok: boolean;
  problems: string[];
  pagesChecked: number;
}

// Re-hashes every page named in a retained run's sidecar and fails on
// any mismatch or missing file. Runs entirely offline against the
// committed copy; no network call, no provider credentials.
export async function verifyRetainedRun(runDir: string): Promise<VerifyRetainedRunResult> {
  const sidecarPath = join(runDir, "pages.sidecar.json");
  if (!existsSync(sidecarPath)) {
    return { ok: false, problems: [`no pages.sidecar.json found under ${runDir}`], pagesChecked: 0 };
  }
  const sidecar = JSON.parse(await readFile(sidecarPath, "utf8")) as RetainedRunSidecar;
  const problems: string[] = [];
  let checked = 0;
  for (const page of sidecar.pages) {
    const filePath = join(runDir, page.path);
    if (!existsSync(filePath)) {
      problems.push(`missing page: ${page.path} (${page.page_id})`);
      continue;
    }
    const bytes = await readFile(filePath);
    const actual = hashBytes(bytes);
    checked++;
    if (actual !== page.hash) {
      problems.push(
        `hash mismatch: ${page.path} (${page.page_id}): sidecar says ${page.hash}, file hashes to ${actual}`,
      );
    }
    if (page.raw_hash) {
      const rawFilePath = filePath.replace(/\.html$/, ".raw.txt");
      if (!existsSync(rawFilePath)) {
        problems.push(`missing raw response: ${relative(runDir, rawFilePath)} (${page.page_id})`);
        continue;
      }
      const rawBytes = await readFile(rawFilePath);
      const actualRaw = hashBytes(rawBytes);
      if (actualRaw !== page.raw_hash) {
        problems.push(
          `raw response hash mismatch: ${relative(runDir, rawFilePath)} (${page.page_id})`,
        );
      }
    }
  }
  return { ok: problems.length === 0, problems, pagesChecked: checked };
}
