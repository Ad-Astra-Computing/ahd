import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import {
  RulesManifestSchema,
  RulesManifestEntrySchema,
} from "../src/eval/types.js";
import { rules as sourceRules } from "../src/lint/rules/index.js";
import { crossFileRules } from "../src/lint/cross-rules/index.js";
import { VISION_RULES } from "../src/critique/critic.js";
import { MOBILE_RULES } from "../src/mobile/rules.js";

// Layer 1 of rule governance: rules.manifest.json is the canonical
// machine-readable surface for every shipped rule. The file is
// generated from code by scripts/build-rules-manifest.mjs at build
// time. These tests assert:
//   1. The shipped manifest validates against the Zod schema.
//   2. Every rule in code maps to a manifest entry and vice versa.
//   3. The recorded counts match the actual entry distribution.
//   4. New rules carry status + introducedAt; pre-0.9 rules use the
//      documented defaults.

const ROOT = resolve(__dirname, "..");
const MANIFEST_PATH = resolve(ROOT, "rules.manifest.json");

describe("rules.manifest.json (Layer 1 governance)", () => {
  if (!existsSync(MANIFEST_PATH)) {
    it.skip("manifest is missing (run npm run build first)", () => {});
    return;
  }

  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));

  it("validates against the Zod schema", () => {
    const r = RulesManifestSchema.safeParse(manifest);
    if (!r.success) {
      throw new Error(
        `Manifest schema mismatch: ${r.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; ")}`,
      );
    }
    expect(r.success).toBe(true);
  });

  it("every rule in code has a manifest entry", () => {
    const codeIds = new Set([
      ...sourceRules.map((r) => r.id),
      ...crossFileRules.map((r) => r.id),
      ...VISION_RULES.map((r) => r.id),
      ...MOBILE_RULES.map((r) => r.id),
    ]);
    const manifestIds = new Set<string>(
      manifest.rules.map((r: { id: string }) => r.id),
    );
    const missing = [...codeIds].filter((id) => !manifestIds.has(id));
    if (missing.length > 0) {
      throw new Error(
        `Rules in code but missing from manifest: ${missing.join(", ")}. Re-run npm run build.`,
      );
    }
    expect(missing.length).toBe(0);
  });

  it("every manifest entry maps to a rule in code", () => {
    const codeIds = new Set([
      ...sourceRules.map((r) => r.id),
      ...crossFileRules.map((r) => r.id),
      ...VISION_RULES.map((r) => r.id),
      ...MOBILE_RULES.map((r) => r.id),
    ]);
    const orphaned = manifest.rules
      .map((r: { id: string }) => r.id)
      .filter((id: string) => !codeIds.has(id));
    if (orphaned.length > 0) {
      throw new Error(
        `Manifest entries with no rule in code: ${orphaned.join(", ")}. Re-run npm run build.`,
      );
    }
    expect(orphaned.length).toBe(0);
  });

  it("recorded counts match the actual entry distribution", () => {
    const total = manifest.rules.length;
    const experimental = manifest.rules.filter(
      (r: { status: string }) => r.status === "experimental",
    ).length;
    const stable = manifest.rules.filter(
      (r: { status: string }) => r.status === "stable",
    ).length;
    const deprecated = manifest.rules.filter(
      (r: { status: string }) => r.status === "deprecated",
    ).length;
    expect(manifest.counts.total).toBe(total);
    expect(manifest.counts.experimental).toBe(experimental);
    expect(manifest.counts.stable).toBe(stable);
    expect(manifest.counts.deprecated).toBe(deprecated);
  });

  it("byEngine counts add up to the total", () => {
    const sum = Object.values(manifest.counts.byEngine).reduce(
      (a: number, b: unknown) => a + (b as number),
      0,
    );
    expect(sum).toBe(manifest.counts.total);
  });

  it("every entry validates individually", () => {
    for (const entry of manifest.rules) {
      const r = RulesManifestEntrySchema.safeParse(entry);
      if (!r.success) {
        throw new Error(
          `Entry ${entry.id} invalid: ${r.error.issues
            .map((i) => `${i.path.join(".")}: ${i.message}`)
            .join("; ")}`,
        );
      }
    }
  });

  it("the new mobile rule scrollable-no-affordance ships as experimental at 0.9.0", () => {
    const entry = manifest.rules.find(
      (r: { id: string }) => r.id === "ahd/mobile/scrollable-no-affordance",
    );
    expect(entry).toBeDefined();
    expect(entry.status).toBe("experimental");
    expect(entry.introducedAt).toBe("0.9.0");
    expect(entry.engine).toBe("mobile");
    expect(entry.severity).toBe("warn");
  });

  it("re-running the manifest builder produces the same content (parity)", () => {
    // Capture the on-disk manifest, regenerate, compare. Same approach
    // the JSON Schema parity test uses for schema/*.schema.json.
    const before = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    // Use a fixed AHD_BUILD_TIME so the regenerated generatedAt does
    // not differ from the on-disk one purely on timestamp.
    const env = { ...process.env, AHD_BUILD_TIME: before.generatedAt };
    execFileSync("node", ["scripts/build-rules-manifest.mjs"], {
      cwd: ROOT,
      env,
      stdio: "ignore",
    });
    const after = JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
    expect(after).toEqual(before);
  });
});

describe("recommended plugin config (Layer 3 governance)", () => {
  it("eslint recommended config excludes experimental rules", async () => {
    const eslintMod = await import("../src/plugins/eslint-plugin.js");
    const plugin = eslintMod.default ?? eslintMod.createEslintPlugin();
    const recommended = plugin.configs?.recommended ?? null;
    expect(recommended).toBeDefined();
    const recommendedRules = recommended.rules ?? {};
    // Every experimental rule's eslint key (prefixed with `ahd/`) must
    // be either absent or set to "off" in the recommended config.
    for (const r of sourceRules) {
      if (r.status !== "experimental") continue;
      const key = r.id; // already ahd/<rest>
      const setting = recommendedRules[key];
      if (setting && setting !== "off") {
        throw new Error(
          `Recommended config includes experimental rule ${key} at ${setting}. Should be 'off' or omitted.`,
        );
      }
    }
  });
});
