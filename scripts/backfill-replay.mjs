#!/usr/bin/env node
// Best-effort replay backfill for reports that predate the replay
// system (anything in docs/evals/ before 2026-04-27).
//
// What it does:
//   - Walks docs/evals/**/*.md, skipping reports that already have a
//     <report>.replay.json sidecar.
//   - Parses the report markdown for token, runAt, brief, n, models.
//   - Finds the most recent git commit that touched the report.
//   - Reads the token + brief contents AT that commit (`git show
//     <sha>:<path>`) and hashes them with the same canonical-JSON /
//     raw-bytes discipline the runtime uses.
//   - Reads package.json AT that commit to get ahd_version.
//   - Emits <report>.replay.json with backfilled: true.
//
// What it does NOT do:
//   - Recover provider request ids (lost; not in the markdown).
//   - Recover argv / temperature / seed (not stored).
//   - Touch reports that already carry a sidecar.
//
// Run: node scripts/backfill-replay.mjs [--dry-run] [--root <dir>]

import { readdirSync, readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const rootIdx = argv.indexOf("--root");
const SCAN_ROOT = rootIdx >= 0 ? resolve(argv[rootIdx + 1]) : resolve(ROOT, "docs/evals");

const { hashJsonCanonical, hashBytes } = await import(
  resolve(ROOT, "dist/eval/replay.js")
).then((m) => m).catch((err) => {
  console.error(
    `backfill-replay: dist/eval/replay.js not loadable. Run 'npm run build' first. Cause: ${err.message}`,
  );
  process.exit(2);
});

const { parse: parseYaml } = await import("yaml");
const { ReplaySchema } = await import(resolve(ROOT, "dist/eval/types.js"));

function walkMarkdown(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walkMarkdown(full));
    else if (entry.endsWith(".md")) out.push(full);
  }
  return out;
}

function parseReportHeader(md) {
  // Header lines we recognise:
  //   # ahd eval · <token> · <runAt>
  //   # ahd eval-image · <token> · <runAt>
  //   # ahd critique · <token> · <runAt>
  //   - Brief: `<path>`
  //   - Samples per cell: **<n>**
  //   - Models:
  //     - `<id>` (<provider>) · spec `<spec>`
  const out = {
    kind: null,
    token: null,
    runAt: null,
    briefPath: null,
    n: null,
    models: [],
  };
  const h1 = md.match(/^# ahd (eval|eval-image|critique)(?: ·|\s)\s*([^·\n]+?)\s*·\s*([^\s]+)/m);
  if (h1) {
    out.kind = h1[1] === "eval" ? "eval-live" : h1[1];
    out.token = h1[2].trim();
    out.runAt = h1[3].trim();
  }
  const brief = md.match(/^-\s+Brief:\s+`([^`]+)`/m);
  if (brief) out.briefPath = brief[1];
  const n = md.match(/^-\s+Samples per cell:\s+\*\*(\d+)\*\*/m);
  if (n) out.n = parseInt(n[1], 10);
  // Critique reports don't carry "Samples per cell"; they embed
  // counts in the table header (`raw (n=10) | compiled (n=11)`).
  // Sum those when the eval-style line is absent.
  if (out.n == null) {
    const ns = [...md.matchAll(/\(n=(\d+)\)/g)].map((m) => parseInt(m[1], 10));
    if (ns.length) out.n = ns.reduce((a, b) => a + b, 0);
  }
  const modelLines = md.match(/^\s+-\s+`([^`]+)`\s+\(([^)]+)\)\s+·\s+spec\s+`([^`]+)`/gm) || [];
  for (const line of modelLines) {
    const m = line.match(/`([^`]+)`\s+\(([^)]+)\)\s+·\s+spec\s+`([^`]+)`/);
    if (m) out.models.push({ id: m[3], provider: m[2] });
  }
  // Critique reports use a single `critic: \`<id>\`` line in place
  // of a Models block. Treat the critic as the sole model so the
  // replay block has at least one entry to point at.
  if (out.kind === "critique" && out.models.length === 0) {
    const critic = md.match(/^critic:\s+`([^`]+)`/m);
    if (critic) {
      out.models.push({ id: critic[1], provider: "critic" });
    }
  }
  return out;
}

function gitLastCommitForFile(absPath) {
  try {
    const rel = relative(ROOT, absPath);
    const sha = execFileSync(
      "git",
      ["log", "-1", "--format=%H", "--", rel],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], cwd: ROOT },
    ).trim();
    return sha.length === 40 ? sha : null;
  } catch {
    return null;
  }
}

function gitShow(commit, relPath) {
  try {
    return execFileSync(
      "git",
      ["show", `${commit}:${relPath}`],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], cwd: ROOT, maxBuffer: 32 * 1024 * 1024 },
    );
  } catch {
    return null;
  }
}

function ahdVersionAtCommit(commit) {
  const pkgRaw = gitShow(commit, "package.json");
  if (!pkgRaw) return "unknown";
  try {
    return JSON.parse(pkgRaw).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

function buildReplay(reportPath, parsed) {
  if (!parsed.kind || !parsed.token || !parsed.runAt) {
    return { ok: false, reason: "header did not match the expected pattern (need # ahd <kind> · <token> · <runAt>)" };
  }
  const commit = gitLastCommitForFile(reportPath);
  if (!commit) {
    return { ok: false, reason: "no git commit found for the report; needs to be tracked first" };
  }
  const version = ahdVersionAtCommit(commit);

  // Token: tokens/<id>.yml, hashed at the report's commit.
  const tokenPath = `tokens/${parsed.token}.yml`;
  const tokenBytes = gitShow(commit, tokenPath);
  if (!tokenBytes) {
    return { ok: false, reason: `token file ${tokenPath} not present at commit ${commit.slice(0, 12)}` };
  }
  let tokenResolved;
  try {
    tokenResolved = parseYaml(tokenBytes);
  } catch (err) {
    return { ok: false, reason: `token at ${commit.slice(0, 12)}:${tokenPath} did not parse as YAML: ${err.message}` };
  }
  const tokenHash = hashJsonCanonical(tokenResolved);

  // Brief: optional. Critique reports have null brief.
  let brief = null;
  if (parsed.briefPath && parsed.kind !== "critique") {
    const briefBytes = gitShow(commit, parsed.briefPath);
    if (briefBytes) {
      // Try YAML first (the helper's path for structured briefs);
      // fall back to raw bytes for markdown briefs.
      let hash;
      try {
        const resolved = parseYaml(briefBytes);
        hash = hashJsonCanonical(resolved);
      } catch {
        hash = hashBytes(briefBytes);
      }
      brief = { path: parsed.briefPath, hash };
    }
  }

  const replay = {
    schema_version: 1,
    kind: parsed.kind,
    ahd_version: version,
    ahd_commit: commit,
    git_dirty: false,
    node_version: "unknown",
    platform: "unknown",
    invoked_at: parsed.runAt,
    argv: [],
    token: { path: tokenPath, hash: tokenHash },
    brief,
    sampling: { n: parsed.n ?? 0, temperature: null, seed: null },
    models: parsed.models.map((m) => ({
      id: m.id,
      provider: m.provider,
      provider_request_ids: [],
    })),
    conditions: {
      requested: parsed.kind === "critique" ? [] : ["raw", "compiled"],
      effective: parsed.kind === "critique" ? [] : ["raw", "compiled"],
    },
    backfilled: true,
  };

  // Validate before declaring success — the schema's required fields
  // include node_version / platform, so we use "unknown" rather than
  // null. Those fields are not load-bearing for verify-replay.
  const parsedReplay = ReplaySchema.safeParse(replay);
  if (!parsedReplay.success) {
    return {
      ok: false,
      reason: `built replay does not validate: ${parsedReplay.error.toString()}`,
    };
  }
  return { ok: true, replay: parsedReplay.data };
}

let scanned = 0;
let written = 0;
let skipped = 0;
let failed = 0;
const failures = [];

for (const reportPath of walkMarkdown(SCAN_ROOT)) {
  scanned++;
  const sidecarPath = reportPath.replace(/\.md$/, ".replay.json");
  if (existsSync(sidecarPath)) {
    skipped++;
    continue;
  }
  const md = readFileSync(reportPath, "utf8");
  const parsed = parseReportHeader(md);
  const result = buildReplay(reportPath, parsed);
  if (!result.ok) {
    failed++;
    failures.push(`${relative(ROOT, reportPath)}: ${result.reason}`);
    continue;
  }
  if (DRY_RUN) {
    console.log(`would write ${relative(ROOT, sidecarPath)}`);
  } else {
    writeFileSync(sidecarPath, JSON.stringify(result.replay, null, 2) + "\n");
    console.log(`wrote ${relative(ROOT, sidecarPath)}`);
  }
  written++;
}

console.log("");
console.log(`backfill-replay: scanned=${scanned} written=${written} skipped=${skipped} failed=${failed}`);
if (failures.length) {
  console.log("failures:");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(failed > 0 && !DRY_RUN ? 1 : 0);
