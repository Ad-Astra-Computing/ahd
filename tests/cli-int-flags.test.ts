import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const BIN = resolve(__dirname, "..", "bin", "ahd.js");

// The CLI's numeric-flag helper must reject NaN, negative, and
// non-integer inputs at the boundary. parseInt("foo") would silently
// produce NaN; parseInt("-5") would produce -5 and degrade into
// confusing downstream behaviour. Cover the failure modes here.

function run(args: string[]) {
  return spawnSync("node", [BIN, ...args], { encoding: "utf8" });
}

describe("CLI: numeric flag validation", () => {
  it("--n rejects a non-integer", () => {
    const r = run([
      "eval-live",
      "swiss-editorial",
      "--brief",
      "briefs/landing.yml",
      "--models",
      "mock-swiss",
      "--n",
      "abc",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--n: expected an integer/);
  });

  it("--n rejects zero (must be >= 1)", () => {
    const r = run([
      "eval-live",
      "swiss-editorial",
      "--brief",
      "briefs/landing.yml",
      "--models",
      "mock-swiss",
      "--n",
      "0",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--n: must be >= 1/);
  });

  it("--n rejects a negative integer", () => {
    const r = run([
      "eval-live",
      "swiss-editorial",
      "--brief",
      "briefs/landing.yml",
      "--models",
      "mock-swiss",
      "--n",
      "-3",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--n: must be >= 1/);
  });

  it("--n rejects a decimal", () => {
    const r = run([
      "eval-live",
      "swiss-editorial",
      "--brief",
      "briefs/landing.yml",
      "--models",
      "mock-swiss",
      "--n",
      "1.5",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--n: expected an integer/);
  });

  it("--sample-concurrency rejects a value above the cap", () => {
    const r = run([
      "eval-live",
      "swiss-editorial",
      "--brief",
      "briefs/landing.yml",
      "--models",
      "mock-swiss",
      "--sample-concurrency",
      "999",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--sample-concurrency: must be <= 32/);
  });

  // critique without --samples or with --critic=claude-code defaults
  // can spawn long-running subprocesses (Claude Code CLI, real
  // critic), which is the wrong shape for a fast unit test. The
  // negative path with -1 fails at intFlag before any of that runs,
  // so we test that one branch and trust the helper for the positive
  // case. Pass --critic mock anyway as defence in depth in case the
  // intFlag check ever moves later in argv parsing.
  it("--max rejects a negative", () => {
    const r = run([
      "critique",
      "post-digital-green",
      "--critic",
      "mock",
      "--max",
      "-1",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--max: must be >= 0/);
  });

  it("--width rejects a viewport below 320", () => {
    const r = run([
      "audit-mobile",
      "https://example.com",
      "--width",
      "100",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--width: must be >= 320/);
  });

  it("--width rejects a viewport above 3840", () => {
    const r = run([
      "audit-mobile",
      "https://example.com",
      "--width",
      "9999",
    ]);
    expect(r.status).not.toBe(0);
    expect(r.stderr + r.stdout).toMatch(/--width: must be <= 3840/);
  });
});
