import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve as resolvePath, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { Condition, Replay } from "./types.js";

// captureReplay produces the Replay block emitted alongside every eval
// report. Pure aside from the best-effort git shell-out and the package.json
// version read; entry points pre-resolve token + brief so the helper does
// not know which subcommand it is serving.

export interface CaptureReplayInput {
  kind: "eval-live" | "critique" | "eval-image";
  token: { path: string; resolved: unknown };
  // For structured briefs (parsed YAML / JSON), pass `resolved` (object).
  // For raw-bytes briefs (markdown body), pass `raw` (string). One or the
  // other; null if the entry point has no brief at all (some critic-only
  // flows).
  brief:
    | { path: string; resolved: unknown }
    | { path: string; raw: string }
    | null;
  sampling: {
    n: number;
    temperature: number | null;
    seed: number | null;
  };
  models: Array<{
    id: string;
    provider: string;
    provider_request_ids: string[];
    // Per-sample provenance: one entry per completed provider call for
    // this model, across both conditions. requestId is null when the
    // provider returned no id, so a shorter provider_request_ids array
    // becomes a stated count of misses instead of a silent gap.
    sampleRequests?: Array<{
      condition: Condition;
      sample: number;
      requestId: string | null;
    }>;
  }>;
  conditions: {
    requested: string[];
    effective: string[];
  };
  invokedAt: Date;
  argv: string[];
  // Per-cell sample measurements behind the published mean-tells
  // figures. Absent when the caller has no cells to report against
  // (critique, eval-image, mock-only runs that skip scoring).
  measurements?: Array<{
    model: string;
    condition: Condition;
    samples: Array<{
      sampleId: string;
      tellsFired: string[];
      byteLength: number;
      hash: string;
      scored: boolean;
    }>;
  }>;
  // Per-model, per-severity interval provenance: the Welch degrees
  // of freedom, the variance floor and the value actually used, and
  // the BCa bootstrap cross-check, so a reader can see what the
  // report's own interval was built from without recomputing it.
  strata?: Array<{
    model: string;
    severity: "error" | "warn" | "info";
    estimator?: "welch-t";
    df?: number;
    varianceFloor?: { raw: number; cmp: number };
    varianceUsed?: { raw: number; cmp: number };
    bootstrapCrossCheck?: {
      method: "bca";
      estimate: number;
      lower: number;
      upper: number;
      iterations: number;
      alpha: number;
      seed: number;
    };
  }>;
}

export function captureReplay(input: CaptureReplayInput): Replay {
  const tokenHash = hashJsonCanonical(input.token.resolved);
  const briefHash = (() => {
    if (!input.brief) return null;
    if ("raw" in input.brief) {
      return { path: input.brief.path, hash: hashBytes(input.brief.raw) };
    }
    return {
      path: input.brief.path,
      hash: hashJsonCanonical(input.brief.resolved),
    };
  })();

  const { commit, dirty } = readGitState();

  return {
    schema_version: 1,
    kind: input.kind,
    ahd_version: readAhdVersion(),
    ahd_commit: commit,
    git_dirty: dirty,
    node_version: process.version,
    platform: `${process.platform}-${process.arch}`,
    invoked_at: input.invokedAt.toISOString(),
    argv: [...input.argv],
    token: { path: input.token.path, hash: tokenHash },
    brief: briefHash,
    sampling: { ...input.sampling },
    models: input.models.map((m) => ({
      id: m.id,
      provider: m.provider,
      provider_request_ids: [...m.provider_request_ids],
      ...(m.sampleRequests
        ? {
            sample_requests: m.sampleRequests.map((r) => ({
              condition: r.condition,
              sample: r.sample,
              request_id: r.requestId,
            })),
          }
        : {}),
    })),
    conditions: {
      requested: [...input.conditions.requested],
      effective: [...input.conditions.effective],
    },
    ...(input.measurements
      ? {
          measurements: input.measurements.map((cell) => ({
            model: cell.model,
            condition: cell.condition,
            samples: cell.samples.map((s) => ({
              sample_id: s.sampleId,
              tells: s.tellsFired,
              byte_length: s.byteLength,
              hash: s.hash,
              scored: s.scored,
            })),
          })),
        }
      : {}),
    ...(input.strata
      ? {
          strata: input.strata.map((s) => ({
            model: s.model,
            severity: s.severity,
            ...(s.estimator ? { estimator: s.estimator } : {}),
            ...(s.df !== undefined ? { df: s.df } : {}),
            ...(s.varianceFloor ? { variance_floor: s.varianceFloor } : {}),
            ...(s.varianceUsed ? { variance_used: s.varianceUsed } : {}),
            ...(s.bootstrapCrossCheck
              ? { bootstrap_cross_check: s.bootstrapCrossCheck }
              : {}),
          })),
        }
      : {}),
  };
}

// canonicalizeJson recursively sorts object keys so two equivalent objects
// hash identically regardless of key insertion order. JSON arrays are NOT
// sorted (their order is semantic). Primitives pass through. Replaces
// `undefined` with omission to match standard JSON behaviour.
export function canonicalizeJson(value: unknown): unknown {
  if (value === null) return null;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalizeJson);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj).sort()) {
    if (obj[k] === undefined) continue;
    out[k] = canonicalizeJson(obj[k]);
  }
  return out;
}

export function hashJsonCanonical(value: unknown): string {
  const canon = JSON.stringify(canonicalizeJson(value));
  return hashBytes(canon);
}

export function hashBytes(bytes: string | Uint8Array): string {
  const h = createHash("sha256").update(bytes).digest("hex");
  return `sha256:${h}`;
}

function readGitState(): { commit: string | null; dirty: boolean | null } {
  try {
    const commit = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (!/^[a-f0-9]{40}$/i.test(commit)) {
      return { commit: null, dirty: null };
    }
    const status = execFileSync("git", ["status", "--porcelain"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return { commit, dirty: status.trim().length > 0 };
  } catch {
    return { commit: null, dirty: null };
  }
}

let cachedAhdVersion: string | null = null;
export function readAhdVersion(): string {
  const env = process.env.AHD_VERSION;
  if (env && env.length > 0) return env;
  if (cachedAhdVersion) return cachedAhdVersion;
  // Walk up from this module's directory until package.json is found.
  // Works whether the helper is loaded from src/ during tests or from
  // dist/ in a published install.
  let dir: string;
  try {
    dir = dirname(fileURLToPath(import.meta.url));
  } catch {
    dir = process.cwd();
  }
  for (let i = 0; i < 6; i++) {
    try {
      const pkg = JSON.parse(
        readFileSync(resolvePath(dir, "package.json"), "utf8"),
      ) as { name?: string; version?: string };
      if (pkg.name === "@adastracomputing/ahd" && pkg.version) {
        cachedAhdVersion = pkg.version;
        return pkg.version;
      }
    } catch {
      // keep walking
    }
    const parent = resolvePath(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  return "unknown";
}

// renderReplayMarkdown produces the human-friendly fenced YAML block that
// goes at the top of every report. Authoritative form is the JSON sidecar;
// markdown is a derived view, and `provider_request_ids` are redacted to a
// count to avoid surfacing potentially-sensitive identifiers in public
// reports until we've confirmed they're safe to publish.
export function renderReplayMarkdown(replay: Replay): string {
  const lines: string[] = [];
  lines.push("```yaml ahd-replay");
  lines.push(`schema_version: ${replay.schema_version}`);
  lines.push(`kind: ${replay.kind}`);
  lines.push(`ahd_version: ${replay.ahd_version}`);
  lines.push(`ahd_commit: ${replay.ahd_commit ?? "null"}`);
  if (replay.git_dirty === true) lines.push("git_dirty: true");
  lines.push(`node_version: ${replay.node_version}`);
  lines.push(`platform: ${replay.platform}`);
  lines.push(`invoked_at: ${replay.invoked_at}`);
  lines.push(`token:`);
  lines.push(`  path: ${replay.token.path}`);
  lines.push(`  hash: ${shortenHash(replay.token.hash)}`);
  if (replay.brief) {
    lines.push(`brief:`);
    lines.push(`  path: ${replay.brief.path}`);
    lines.push(`  hash: ${shortenHash(replay.brief.hash)}`);
  }
  lines.push(`sampling:`);
  lines.push(`  n: ${replay.sampling.n}`);
  lines.push(`  temperature: ${replay.sampling.temperature ?? "null"}`);
  lines.push(`  seed: ${replay.sampling.seed ?? "null"}`);
  lines.push(`models:`);
  for (const m of replay.models) {
    lines.push(`  - id: ${m.id}`);
    lines.push(`    provider: ${m.provider}`);
    lines.push(
      `    provider_request_ids: ${m.provider_request_ids.length} captured`,
    );
  }
  lines.push(`conditions:`);
  lines.push(`  requested: [${replay.conditions.requested.join(", ")}]`);
  lines.push(`  effective: [${replay.conditions.effective.join(", ")}]`);
  lines.push("```");
  lines.push("");
  lines.push("Replay this run:");
  lines.push("");
  lines.push("```sh");
  if (replay.ahd_commit) {
    lines.push(`git checkout ${replay.ahd_commit.slice(0, 12)}`);
    lines.push("npm ci && npm run build");
  } else {
    lines.push(`# install ahd@${replay.ahd_version}`);
  }
  lines.push(shellQuote(replay.argv));
  lines.push("```");
  return lines.join("\n");
}

function shortenHash(h: string): string {
  // sha256:<full> -> sha256:<first12>
  const idx = h.indexOf(":");
  if (idx === -1) return h.slice(0, 12);
  return `${h.slice(0, idx + 1)}${h.slice(idx + 1, idx + 1 + 12)}`;
}

function shellQuote(argv: string[]): string {
  return argv
    .map((a) => {
      if (a === "") return "''";
      if (/^[A-Za-z0-9_./:@=,+-]+$/.test(a)) return a;
      return `'${a.replace(/'/g, "'\\''")}'`;
    })
    .join(" ");
}
