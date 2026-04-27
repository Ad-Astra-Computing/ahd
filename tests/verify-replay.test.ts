import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyReplay,
  verifyReplayInputs,
  loadReplaySidecar,
  formatVerifyReport,
} from "../src/eval/verify-replay.js";
import { captureReplay, hashJsonCanonical } from "../src/eval/replay.js";

// verify-replay re-hashes token + brief on disk and compares to the
// recorded hashes in <report>.replay.json. These tests use a tmp
// fixture directory so they exercise real file IO without depending
// on the host repo's tokens.

describe("verify-replay", () => {
  let tmp: string;

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), "ahd-verify-replay-"));
  });

  afterEach(() => {
    rmSync(tmp, { recursive: true, force: true });
  });

  function writeFixture(opts: {
    tokenContent: string;
    briefContent: string;
    tokenPath?: string;
    briefPath?: string;
    edit?: { token?: string; brief?: string };
  }): { reportPath: string; sidecarPath: string } {
    const tokenPath = opts.tokenPath ?? "tokens/swiss-editorial.yml";
    const briefPath = opts.briefPath ?? "briefs/landing.yml";
    mkdirSync(join(tmp, "tokens"), { recursive: true });
    mkdirSync(join(tmp, "briefs"), { recursive: true });
    mkdirSync(join(tmp, "docs"), { recursive: true });
    writeFileSync(join(tmp, tokenPath), opts.tokenContent);
    writeFileSync(join(tmp, briefPath), opts.briefContent);

    // Capture against the original content (this fixes the hashes).
    // Then optionally rewrite the file to introduce drift.
    const replay = captureReplay({
      kind: "eval-live",
      token: { path: tokenPath, resolved: parseYaml(opts.tokenContent) },
      brief: { path: briefPath, resolved: parseYaml(opts.briefContent) },
      sampling: { n: 1, temperature: null, seed: null },
      models: [],
      conditions: { requested: [], effective: [] },
      invokedAt: new Date(),
      argv: [],
    });

    if (opts.edit?.token) writeFileSync(join(tmp, tokenPath), opts.edit.token);
    if (opts.edit?.brief) writeFileSync(join(tmp, briefPath), opts.edit.brief);

    const reportPath = join(tmp, "docs", "report.md");
    const sidecarPath = `${reportPath.replace(/\.md$/, "")}.replay.json`;
    writeFileSync(reportPath, "# eval report\n");
    writeFileSync(sidecarPath, JSON.stringify(replay, null, 2));

    return { reportPath, sidecarPath };
  }

  it("passes when token + brief on disk hash to the recorded values", () => {
    const { reportPath } = writeFixture({
      tokenContent: "id: swiss\npalette: [black, white]\n",
      briefContent: "title: Hello\nbody: world\n",
    });
    const result = verifyReplay(reportPath, tmp);
    expect(result.ok).toBe(true);
    expect(result.checks.every((c) => c.ok)).toBe(true);
  });

  it("fails when the token has been edited since the run", () => {
    const { reportPath } = writeFixture({
      tokenContent: "id: swiss\npalette: [black, white]\n",
      briefContent: "title: Hello\nbody: world\n",
      edit: { token: "id: swiss\npalette: [black, white, gold]\n" },
    });
    const result = verifyReplay(reportPath, tmp);
    expect(result.ok).toBe(false);
    const tokenCheck = result.checks.find((c) => c.field === "token");
    expect(tokenCheck?.ok).toBe(false);
    expect(tokenCheck?.reason).toMatch(/changed since the run/i);
  });

  it("fails when the token file is missing", () => {
    const { reportPath } = writeFixture({
      tokenContent: "id: swiss\n",
      briefContent: "title: x\n",
    });
    rmSync(join(tmp, "tokens/swiss-editorial.yml"));
    const result = verifyReplay(reportPath, tmp);
    expect(result.ok).toBe(false);
    expect(
      result.checks.find((c) => c.field === "token")?.reason,
    ).toMatch(/not found/i);
  });

  it("formats a useful report with PASS/FAIL lines", () => {
    const { reportPath } = writeFixture({
      tokenContent: "id: swiss\n",
      briefContent: "title: x\n",
      edit: { brief: "title: x-changed\n" },
    });
    const result = verifyReplay(reportPath, tmp);
    const out = formatVerifyReport(result);
    expect(out).toMatch(/ok\s+token/i);
    expect(out).toMatch(/FAIL\s+brief/i);
    expect(out).toMatch(/drift detected/i);
  });

  it("loadReplaySidecar accepts both .md and .replay.json paths", () => {
    const { reportPath, sidecarPath } = writeFixture({
      tokenContent: "id: x\n",
      briefContent: "y: 1\n",
    });
    const a = loadReplaySidecar(reportPath);
    const b = loadReplaySidecar(sidecarPath);
    expect(a.replay.token.hash).toBe(b.replay.token.hash);
  });

  it("rejects a sidecar that does not match ReplaySchema", () => {
    const reportPath = join(tmp, "docs", "broken.md");
    mkdirSync(join(tmp, "docs"), { recursive: true });
    writeFileSync(reportPath, "");
    writeFileSync(
      `${reportPath.replace(/\.md$/, "")}.replay.json`,
      JSON.stringify({ schema_version: 9, surplus: "no" }),
    );
    expect(() => loadReplaySidecar(reportPath)).toThrowError(
      /does not validate/i,
    );
  });

  it("throws a useful error when no sidecar is present", () => {
    const reportPath = join(tmp, "docs", "no-sidecar.md");
    mkdirSync(join(tmp, "docs"), { recursive: true });
    writeFileSync(reportPath, "");
    expect(() => verifyReplay(reportPath, tmp)).toThrowError(
      /no replay sidecar/i,
    );
  });

  it("verifyReplayInputs canonicalises so reordered token keys still pass", () => {
    // The hash captured at run time is over canonical-JSON of the
    // resolved object. If the user reorders YAML keys (semantically
    // identical), the resolved object is identical and the hash
    // matches. This test guards that property end-to-end.
    const original = "id: swiss\npalette: [black, white]\nfont: Berkeley\n";
    const reordered = "font: Berkeley\nid: swiss\npalette: [black, white]\n";
    const { reportPath } = writeFixture({
      tokenContent: original,
      briefContent: "x: 1\n",
      edit: { token: reordered },
    });
    const result = verifyReplay(reportPath, tmp);
    expect(result.checks.find((c) => c.field === "token")?.ok).toBe(true);
  });
});

// Local YAML parser so the test fixture mirrors what the helper does
// when the user stores resolved-YAML tokens. We use the same `yaml`
// dependency the runtime uses (verify-replay.ts imports it as well)
// so the hash-and-rehash path is end-to-end identical.
import { parse as parseYaml } from "yaml";

describe("hashJsonCanonical sanity for the verify path", () => {
  it("produces identical hashes for reordered objects", () => {
    expect(
      hashJsonCanonical({ font: "Berkeley", id: "swiss" }),
    ).toBe(hashJsonCanonical({ id: "swiss", font: "Berkeley" }));
  });
});
