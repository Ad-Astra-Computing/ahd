import { describe, it, expect } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadConfig, applyConfig } from "../src/lint/config.js";
import { rules as defaultRules } from "../src/lint/rules/index.js";

async function writeConfig(body: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ahd-config-"));
  const path = join(dir, ".ahd.json");
  await writeFile(path, JSON.stringify(body));
  return path;
}

describe("AHD project config", () => {
  it("loads a valid config with overrides", async () => {
    const path = await writeConfig({
      project: "dispatch",
      overrides: [
        {
          ruleId: "ahd/require-type-pairing",
          severity: "warn",
          reason: "Dispatch uses a deliberate single-family aesthetic across subpages.",
        },
      ],
    });
    const cfg = await loadConfig(path);
    expect(cfg.project).toBe("dispatch");
    expect(cfg.overrides).toHaveLength(1);
    expect(cfg.overrides[0].severity).toBe("warn");
  });

  it("rejects an override without a reason", async () => {
    const path = await writeConfig({
      overrides: [
        { ruleId: "ahd/require-type-pairing", severity: "warn" },
      ],
    });
    await expect(loadConfig(path)).rejects.toThrow(/reason/);
  });

  it("rejects an override with a reason shorter than 10 chars", async () => {
    const path = await writeConfig({
      overrides: [
        { ruleId: "ahd/require-type-pairing", severity: "warn", reason: "nope" },
      ],
    });
    await expect(loadConfig(path)).rejects.toThrow(/ten characters/);
  });

  it("rejects a bad ruleId", async () => {
    const path = await writeConfig({
      overrides: [
        { ruleId: "not-ahd/foo", severity: "warn", reason: "this is a reason" },
      ],
    });
    await expect(loadConfig(path)).rejects.toThrow(/ahd\/\*/);
  });

  it("rejects an invalid severity", async () => {
    const path = await writeConfig({
      overrides: [
        { ruleId: "ahd/no-slop-copy", severity: "debug", reason: "this is a reason" },
      ],
    });
    await expect(loadConfig(path)).rejects.toThrow(/severity/);
  });

  it("applyConfig downgrades severity per override", () => {
    const config = {
      overrides: [
        {
          ruleId: "ahd/require-type-pairing",
          severity: "warn" as const,
          reason: "Dispatch single-family aesthetic.",
        },
      ],
    };
    const result = applyConfig(defaultRules, config);
    const rule = result.rules.find((r) => r.id === "ahd/require-type-pairing");
    expect(rule?.severity).toBe("warn");
    expect(result.applied).toHaveLength(1);
  });

  it("applyConfig removes rules set to 'off'", () => {
    const config = {
      overrides: [
        {
          ruleId: "ahd/require-type-pairing",
          severity: "off" as const,
          reason: "Disabled because of aesthetic decision.",
        },
      ],
    };
    const result = applyConfig(defaultRules, config);
    const rule = result.rules.find((r) => r.id === "ahd/require-type-pairing");
    expect(rule).toBeUndefined();
    expect(result.applied).toHaveLength(1);
  });

  it("applyConfig leaves untouched rules alone", () => {
    const before = defaultRules.length;
    const result = applyConfig(defaultRules, { overrides: [] });
    expect(result.rules).toHaveLength(before);
    expect(result.applied).toHaveLength(0);
  });
});
