#!/usr/bin/env node
// Generate rules.manifest.json from the rule arrays declared in code.
// Single source of truth lives in code (lint/rules, lint/cross-rules,
// critique/critic, mobile/rules); this manifest is a build artefact
// that consumers (parity CI, release-notes generator, README, plugins'
// recommended config) read from one place rather than introspecting
// every rule module separately.
//
// Defaults applied for the pre-0.9 rule corpus that has not yet been
// individually annotated:
//   status        -> "stable"
//   introducedAt  -> "<= 0.8.x"
//
// New rules SHOULD declare both fields explicitly. The parity test in
// tests/rules-manifest.test.ts asserts the manifest reflects the code.

import { writeFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");
const distDir = resolve(root, "dist");

if (!existsSync(distDir)) {
  console.error(
    "build-rules-manifest: dist/ not found. Run tsc (npm run build) first.",
  );
  process.exit(2);
}

async function importDist(relPath) {
  const abs = resolve(distDir, relPath);
  return import(pathToFileURL(abs).href);
}

const sourceModule = await importDist("lint/rules/index.js");
const crossModule = await importDist("lint/cross-rules/index.js");
const visionModule = await importDist("critique/critic.js");
const mobileModule = await importDist("mobile/rules.js");

const sourceRules = sourceModule.rules ?? [];
const crossRules = crossModule.crossFileRules ?? [];
const visionRules = visionModule.VISION_RULES ?? [];
const mobileRules = mobileModule.MOBILE_RULES ?? [];

const DEFAULT_STATUS = "stable";
const DEFAULT_INTRODUCED_AT = "<= 0.8.x";

function buildEntry(rule, engine, surface) {
  const status = rule.status ?? DEFAULT_STATUS;
  const introducedAt = rule.introducedAt ?? DEFAULT_INTRODUCED_AT;
  // Vision rules don't carry severity in the type, so we ship them at
  // warn by convention. Source / cross / mobile rules have severity
  // declared on the rule.
  const severity = rule.severity ?? "warn";
  const entry = {
    id: rule.id,
    engine,
    severity,
    status,
    introducedAt,
    description: rule.description,
  };
  if (surface) entry.surface = surface;
  if (rule.deprecatedAt) entry.deprecatedAt = rule.deprecatedAt;
  if (rule.deprecationReason) entry.deprecationReason = rule.deprecationReason;
  return entry;
}

// Source rules surface inferred from id prefix where it carries one.
function inferSourceSurface(id) {
  if (id.startsWith("ahd/svg/")) return ["svg"];
  if (id.startsWith("ahd/a11y/")) return ["html", "jsx"];
  // Most core source rules touch CSS or HTML or JSX. We don't have
  // per-rule surface in code, so leave undefined for now; LINTER_SPEC
  // table is the canonical surface map until the metadata catches up.
  return undefined;
}

const entries = [
  ...sourceRules.map((r) => buildEntry(r, "source", inferSourceSurface(r.id))),
  ...crossRules.map((r) => buildEntry(r, "cross", undefined)),
  ...visionRules.map((r) => buildEntry(r, "vision", undefined)),
  ...mobileRules.map((r) => buildEntry(r, "mobile", undefined)),
];

// Deterministic sort: by engine then by id, so the manifest diff is
// readable on rule additions / status flips.
const ENGINE_ORDER = { source: 0, cross: 1, vision: 2, mobile: 3 };
entries.sort((a, b) => {
  const e = ENGINE_ORDER[a.engine] - ENGINE_ORDER[b.engine];
  if (e !== 0) return e;
  return a.id.localeCompare(b.id);
});

const counts = {
  total: entries.length,
  experimental: entries.filter((e) => e.status === "experimental").length,
  stable: entries.filter((e) => e.status === "stable").length,
  deprecated: entries.filter((e) => e.status === "deprecated").length,
  byEngine: entries.reduce((acc, e) => {
    acc[e.engine] = (acc[e.engine] ?? 0) + 1;
    return acc;
  }, {}),
};

const manifest = {
  version: "1",
  // Use a stable date string when AHD_BUILD_TIME is set so reproducible
  // builds do not introduce churn in the manifest. Fall back to the
  // current time during local builds.
  generatedAt:
    process.env.AHD_BUILD_TIME ?? new Date().toISOString(),
  counts,
  rules: entries,
};

const targetPath = resolve(root, "rules.manifest.json");
writeFileSync(targetPath, JSON.stringify(manifest, null, 2) + "\n");
console.error(
  `wrote ${targetPath} (${counts.total} rules: ${counts.stable} stable, ${counts.experimental} experimental, ${counts.deprecated} deprecated)`,
);
