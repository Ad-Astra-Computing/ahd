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
