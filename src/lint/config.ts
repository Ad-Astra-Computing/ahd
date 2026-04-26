// Per-project AHD lint configuration. Consuming projects ship a
// `.ahd.json` (or pass --config <path> to `ahd lint`) declaring
// per-rule severity overrides with mandatory reason strings.
//
// Pattern rules about overrides:
//   - Every override MUST carry a `reason`. Silent disables are rejected.
//   - Override severities are "error", "warn", "info", or "off".
//   - The report surface records every active override so readers can
//     see what the project chose not to enforce and why.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type { Rule, Severity } from "./types.js";
import type { StyleToken } from "../types.js";

export interface RuleOverride {
  ruleId: string;
  severity: Severity | "off";
  reason: string;
}

export interface AhdProjectConfig {
  project?: string;
  overrides: RuleOverride[];
}

export async function loadConfig(path: string): Promise<AhdProjectConfig> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new Error(`AHD config at ${path} is not a JSON object`);
  }
  const overrides: RuleOverride[] = Array.isArray(parsed.overrides)
    ? parsed.overrides.map((o: any, i: number) => {
        if (!o || typeof o !== "object") {
          throw new Error(`AHD config ${path}: overrides[${i}] is not an object`);
        }
        if (typeof o.ruleId !== "string" || !o.ruleId.startsWith("ahd/")) {
          throw new Error(
            `AHD config ${path}: overrides[${i}].ruleId must be an 'ahd/*' string`,
          );
        }
        if (!["error", "warn", "info", "off"].includes(o.severity)) {
          throw new Error(
            `AHD config ${path}: overrides[${i}].severity must be one of 'error' | 'warn' | 'info' | 'off' (got ${JSON.stringify(o.severity)})`,
          );
        }
        if (typeof o.reason !== "string" || o.reason.trim().length < 10) {
          throw new Error(
            `AHD config ${path}: overrides[${i}] must include a 'reason' string of at least ten characters. Silent overrides are rejected; every disable carries a declared why.`,
          );
        }
        return {
          ruleId: o.ruleId,
          severity: o.severity,
          reason: o.reason,
        };
      })
    : [];
  return {
    project: typeof parsed.project === "string" ? parsed.project : undefined,
    overrides,
  };
}

export async function findProjectConfig(
  startDir: string,
): Promise<string | undefined> {
  for (const name of [".ahd.json", "ahd.config.json"]) {
    const candidate = resolve(startDir, name);
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Translate a style token's `lint-overrides` block into an AhdProjectConfig
 * shape so the existing override pipeline can apply it. Tokens declare
 * which rules they intentionally do not satisfy (single-monospace tokens
 * suppress require-type-pairing, etc.); without this translation the
 * linter scores token-correct output against rules the token explicitly
 * rejects.
 */
export function tokenToLintConfig(
  token: StyleToken,
): AhdProjectConfig | undefined {
  const lintOverrides = token["lint-overrides"];
  if (!lintOverrides) return undefined;
  const overrides: RuleOverride[] = [];
  if (lintOverrides.disable) {
    for (const d of lintOverrides.disable) {
      overrides.push({ ruleId: d.id, severity: "off", reason: d.reason });
    }
  }
  if (lintOverrides["enable-strict"]) {
    for (const id of lintOverrides["enable-strict"]) {
      overrides.push({
        ruleId: id,
        severity: "error",
        reason: `Token ${token.id} marks ${id} enable-strict.`,
      });
    }
  }
  return overrides.length > 0
    ? { project: `token:${token.id}`, overrides }
    : undefined;
}

/**
 * Merge a project config with a token-derived config. Project config
 * always wins on rule-id collisions: a hand-authored .ahd.json represents
 * an explicit choice that should override token defaults.
 */
export function mergeConfigs(
  primary: AhdProjectConfig | undefined,
  fallback: AhdProjectConfig | undefined,
): AhdProjectConfig | undefined {
  if (!primary) return fallback;
  if (!fallback) return primary;
  const seen = new Set(primary.overrides.map((o) => o.ruleId));
  const merged = [
    ...primary.overrides,
    ...fallback.overrides.filter((o) => !seen.has(o.ruleId)),
  ];
  return { project: primary.project ?? fallback.project, overrides: merged };
}

/**
 * Detect an active AHD token reference in HTML. Looks for, in order:
 *   <meta name="ahd-token" content="<id>">
 *   <!-- ahd:token=<id> -->
 * Returns the token id when found, undefined otherwise.
 */
export function detectActiveToken(html: string): string | undefined {
  if (!html) return undefined;
  const meta = html.match(
    /<meta[^>]+name=["']ahd-token["'][^>]+content=["']([a-z0-9-]+)["']/i,
  );
  if (meta) return meta[1];
  const reverseMeta = html.match(
    /<meta[^>]+content=["']([a-z0-9-]+)["'][^>]+name=["']ahd-token["']/i,
  );
  if (reverseMeta) return reverseMeta[1];
  const comment = html.match(/<!--\s*ahd:token=([a-z0-9-]+)\s*-->/i);
  if (comment) return comment[1];
  return undefined;
}

/**
 * Apply a config to a ruleset. Returns both the possibly-modified rules
 * array (with adjusted severities or with "off" rules filtered out) and
 * a list of applied overrides for reporting.
 */
export function applyConfig(
  rules: Rule[],
  config: AhdProjectConfig | undefined,
): { rules: Rule[]; applied: RuleOverride[] } {
  if (!config || config.overrides.length === 0) {
    return { rules, applied: [] };
  }
  const overrideById = new Map(config.overrides.map((o) => [o.ruleId, o]));
  const applied: RuleOverride[] = [];
  const adjusted: Rule[] = [];
  for (const rule of rules) {
    const override = overrideById.get(rule.id);
    if (!override) {
      adjusted.push(rule);
      continue;
    }
    applied.push(override);
    if (override.severity === "off") continue;
    adjusted.push({ ...rule, severity: override.severity });
  }
  return { rules: adjusted, applied };
}
