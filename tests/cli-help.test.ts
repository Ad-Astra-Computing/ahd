import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import {
  COMMAND_HELP,
  resolveCommandHelp,
  argsRequestHelp,
} from "../src/cli/help.js";

// Fast unit tests against the help map and resolver. These don't
// spawn node, so they run in milliseconds. One end-to-end spawn
// test at the bottom confirms bin/ahd.js wires the module correctly.

describe("COMMAND_HELP map", () => {
  it("has an entry for every documented CLI command", () => {
    const documented = [
      "list",
      "show",
      "validate-tokens",
      "compile",
      "lint",
      "lint-rules",
      "vision-rules",
      "eval",
      "eval-live",
      "eval-image",
      "mcp-serve",
      "try",
      "try-image",
      "critique",
      "critique-url",
      "audit-mobile",
      "help",
    ];
    for (const name of documented) {
      expect(COMMAND_HELP[name], `missing help for ${name}`).toBeDefined();
      expect(COMMAND_HELP[name]).toMatch(/^ahd .* ·/);
      expect(COMMAND_HELP[name]).toMatch(/usage:/);
    }
  });

  it("lint help documents the --allow-source-only-spa and --whole-site flags", () => {
    expect(COMMAND_HELP.lint).toMatch(/--allow-source-only-spa/);
    expect(COMMAND_HELP.lint).toMatch(/--whole-site/);
    // The help must describe what --whole-site actually does (walk),
    // not the older "lint explicit files" drift that was caught in review.
    expect(COMMAND_HELP.lint).toMatch(/walk/i);
  });

  it("compile help reflects the actual --out default and --mode flag", () => {
    expect(COMMAND_HELP.compile).toMatch(/default: \.\/out/);
    expect(COMMAND_HELP.compile).toMatch(/--mode/);
  });

  it("critique help lists all three critic specs", () => {
    expect(COMMAND_HELP.critique).toMatch(/claude-code \(default\)/);
    expect(COMMAND_HELP.critique).toMatch(/anthropic/);
    expect(COMMAND_HELP.critique).toMatch(/mock/);
  });
});

describe("resolveCommandHelp", () => {
  it("returns the help text for a known command", () => {
    const r = resolveCommandHelp("lint");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toMatch(/ahd lint ·/);
  });

  it("returns the help-for-help entry when the name is missing", () => {
    const r = resolveCommandHelp(undefined);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toMatch(/ahd help ·/);
  });

  it("returns an error with guidance for an unknown command", () => {
    const r = resolveCommandHelp("not-a-command");
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/unknown command: not-a-command/);
      expect(r.error).toMatch(/ahd --help/);
    }
  });
});

describe("argsRequestHelp", () => {
  it("matches --help anywhere in the argv", () => {
    expect(argsRequestHelp(["--help"])).toBe(true);
    expect(argsRequestHelp(["foo", "--help", "bar"])).toBe(true);
  });
  it("matches -h anywhere in the argv", () => {
    expect(argsRequestHelp(["-h"])).toBe(true);
    expect(argsRequestHelp(["foo", "-h"])).toBe(true);
  });
  it("returns false when neither flag is present", () => {
    expect(argsRequestHelp([])).toBe(false);
    expect(argsRequestHelp(["page.html"])).toBe(false);
  });
});

// End-to-end integration. One spawn confirms bin/ahd.js routes
// through the help module. We used to spawn for every command, but
// the per-command-help correctness is already covered by the unit
// tests above; this one exists to catch wiring regressions.
describe("bin/ahd.js help wiring", () => {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const BIN = resolve(__dirname, "..", "bin", "ahd.js");

  it("ahd help lint prints the same text as the map", () => {
    const r = spawnSync("node", [BIN, "help", "lint"], { encoding: "utf8" });
    expect(r.status).toBe(0);
    expect(r.stdout.trim()).toBe(COMMAND_HELP.lint);
  });
});
