import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { parse as parseYaml } from "yaml";
import { ReplaySchema, type Replay } from "./types.js";
import { hashJsonCanonical, hashBytes } from "./replay.js";

// `ahd verify-replay <report>` checks that the inputs named in a
// report's Replay block (token + brief paths) currently hash to the
// recorded values at HEAD. A passing check means the report's claimed
// inputs are the inputs that exist on disk right now; a failing check
// means the inputs have changed since the run, so the recorded numbers
// no longer correspond to a state of the repo you can re-run.
//
// This is *not* a re-run check: we don't call providers, we don't
// regenerate samples. It's a hash-vs-hash audit, the cheap part of the
// reproducibility contract.

export interface VerifyReplayResult {
  ok: boolean;
  reportPath: string;
  sidecarPath: string;
  replay: Replay;
  checks: VerifyCheck[];
}

export interface VerifyCheck {
  field: "token" | "brief";
  expected: string;
  actual: string | null;
  ok: boolean;
  reason?: string;
}

export function loadReplaySidecar(reportPath: string): {
  sidecarPath: string;
  replay: Replay;
} {
  // Two acceptable input forms: pass the report markdown path
  // (`*.md`) or the sidecar JSON path directly. Either one resolves
  // to the same sidecar.
  const sidecarPath = reportPath.endsWith(".replay.json")
    ? reportPath
    : reportPath.replace(/(\.md)?$/, ".replay.json");
  if (!existsSync(sidecarPath)) {
    throw new Error(
      `No replay sidecar found at ${sidecarPath}. Re-run the report-producing command at v0.10+, which emits the sidecar alongside the markdown, or pass the sidecar path directly.`,
    );
  }
  const raw = JSON.parse(readFileSync(sidecarPath, "utf8")) as unknown;
  const parsed = ReplaySchema.safeParse(raw);
  if (!parsed.success) {
    throw new Error(
      `Replay sidecar at ${sidecarPath} does not validate against ReplaySchema:\n${parsed.error.toString()}`,
    );
  }
  return { sidecarPath, replay: parsed.data };
}

export function verifyReplayInputs(
  replay: Replay,
  // Resolve paths relative to this dir. Defaults to cwd; tests pass
  // a fixture root so they can verify deterministically.
  rootDir: string = process.cwd(),
): VerifyCheck[] {
  const checks: VerifyCheck[] = [];

  // Token: load from the path on disk, parse as YAML, canonical-JSON
  // hash, compare. If the path doesn't resolve, that's a fail with
  // a "file missing" reason rather than a "hash mismatch".
  const tokenAbs = resolve(rootDir, replay.token.path);
  if (!existsSync(tokenAbs)) {
    checks.push({
      field: "token",
      expected: replay.token.hash,
      actual: null,
      ok: false,
      reason: `token file not found at ${tokenAbs}`,
    });
  } else {
    try {
      const text = readFileSync(tokenAbs, "utf8");
      const resolved = parseYaml(text);
      const actual = hashJsonCanonical(resolved);
      checks.push({
        field: "token",
        expected: replay.token.hash,
        actual,
        ok: actual === replay.token.hash,
        reason: actual === replay.token.hash
          ? undefined
          : "token contents have changed since the run; re-hash differs",
      });
    } catch (err) {
      checks.push({
        field: "token",
        expected: replay.token.hash,
        actual: null,
        ok: false,
        reason: `failed to parse token at ${tokenAbs}: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  // Brief: same drill, but the brief may be raw bytes or YAML. Try
  // both: hash the raw bytes first, fall back to canonical-JSON if it
  // doesn't match. This mirrors the helper's two-path hashing.
  if (replay.brief) {
    const briefAbs = resolve(rootDir, replay.brief.path);
    if (!existsSync(briefAbs)) {
      checks.push({
        field: "brief",
        expected: replay.brief.hash,
        actual: null,
        ok: false,
        reason: `brief file not found at ${briefAbs}`,
      });
    } else {
      try {
        const bytes = readFileSync(briefAbs, "utf8");
        const rawHash = hashBytes(bytes);
        if (rawHash === replay.brief.hash) {
          checks.push({
            field: "brief",
            expected: replay.brief.hash,
            actual: rawHash,
            ok: true,
          });
        } else {
          // Fall through to YAML.
          let actual: string | null = null;
          let reason: string | undefined =
            "brief contents have changed since the run (neither raw-bytes nor canonical-YAML hash matches)";
          try {
            const resolved = parseYaml(bytes);
            actual = hashJsonCanonical(resolved);
          } catch (err) {
            reason = `brief is not valid YAML and the raw-bytes hash does not match: ${err instanceof Error ? err.message : String(err)}`;
          }
          checks.push({
            field: "brief",
            expected: replay.brief.hash,
            actual,
            ok: actual === replay.brief.hash,
            reason: actual === replay.brief.hash ? undefined : reason,
          });
        }
      } catch (err) {
        checks.push({
          field: "brief",
          expected: replay.brief.hash,
          actual: null,
          ok: false,
          reason: `failed to read brief at ${briefAbs}: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }
  }

  return checks;
}

export function verifyReplay(
  reportPath: string,
  rootDir?: string,
): VerifyReplayResult {
  const { sidecarPath, replay } = loadReplaySidecar(reportPath);
  const checks = verifyReplayInputs(replay, rootDir);
  return {
    ok: checks.every((c) => c.ok),
    reportPath,
    sidecarPath,
    replay,
    checks,
  };
}

export function formatVerifyReport(r: VerifyReplayResult): string {
  const lines: string[] = [];
  lines.push(`ahd verify-replay · ${r.reportPath}`);
  lines.push(`replay: ${r.sidecarPath}`);
  lines.push(`  kind: ${r.replay.kind}`);
  lines.push(`  ahd_version: ${r.replay.ahd_version}`);
  if (r.replay.ahd_commit) {
    lines.push(
      `  ahd_commit: ${r.replay.ahd_commit}${r.replay.git_dirty ? " (dirty)" : ""}`,
    );
  }
  lines.push(`  invoked_at: ${r.replay.invoked_at}`);
  lines.push("");
  for (const c of r.checks) {
    if (c.ok) {
      lines.push(`  ok    ${c.field} hash matches`);
    } else {
      lines.push(`  FAIL  ${c.field}: ${c.reason ?? "hash mismatch"}`);
      lines.push(`        expected ${c.expected}`);
      lines.push(`        actual   ${c.actual ?? "<none>"}`);
    }
  }
  lines.push("");
  lines.push(r.ok ? "verdict: replay inputs intact" : "verdict: drift detected");
  return lines.join("\n");
}
