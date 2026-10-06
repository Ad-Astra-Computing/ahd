import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

// Published-number drift guard.
//
// docs/evals/2026-04-24-post-digital-green-n30-relint.md is not a record of
// a model run. It is a record of what the *current* ruleset says about a
// set of samples committed to this repository. That makes it the one
// published report a rule change can silently falsify: nobody has to call a
// model to move its numbers, they only have to add, remove or widen a lint
// rule.
//
// Re-linting costs about 1.5 seconds, cheap enough to pay on every push.
//
// Checks the per-model, per-severity diff (raw mean minus compiled mean)
// against the severity-split statistic, not the ratio or verdict, which
// can move for reasons unrelated to a ruleset change. Does not guard the
// mean-tell columns, attempted/scored counts or the per-tell table.
//
// If this fails, the ruleset changed and one of two things is true:
//   1. The change is correct, and both the report and the site's 24 April
//      addendum need regenerating. Run:
//        ahd eval post-digital-green --samples evals
//   2. The change is a regression in a rule, in which case fix the rule.
// Either way the fix is deliberate. Do not simply update the expected
// numbers without deciding which case you are in.

const ROOT = resolve(__dirname, "..");
const REPORT = resolve(ROOT, "docs/evals/2026-04-24-post-digital-green-n30-relint.md");
const SAMPLES_ROOT = resolve(ROOT, "evals");
const SAMPLES_DIR = resolve(SAMPLES_ROOT, "post-digital-green");
const CLI = resolve(ROOT, "bin/ahd.js");
const EXPECTED_CELLS = 33; // 11 models x 3 severities

const MODEL_HEADING = /^### `([^`]+)`$/;
// | severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval | ratio | verdict |
const SEVERITY_ROW = /^\|\s*(error|warn|info)\s*\|\s*(-?\d+\.\d+)\s*\|\s*(-?\d+\.\d+)\s*\|\s*(-?\d+\.\d+)\s*\|/;

/**
 * Pull the per-model, per-severity diff out of an `ahd eval` markdown
 * report's "Per-model severity split" section. Throws on a duplicate
 * (model, severity) row so a mangled table cannot quietly shadow one cell
 * with another.
 */
function severityDiffsFrom(markdown: string, source: string): Map<string, number> {
  const out = new Map<string, number>();
  let model: string | null = null;
  for (const line of markdown.split("\n")) {
    const heading = line.match(MODEL_HEADING);
    if (heading) {
      model = heading[1];
      continue;
    }
    const row = line.match(SEVERITY_ROW);
    if (!row || !model) continue;
    const [, severity, , , diff] = row;
    const key = `${model}|${severity}`;
    if (out.has(key)) {
      throw new Error(`${source}: duplicate row for ${key}`);
    }
    const n = Number(diff);
    if (!Number.isFinite(n)) {
      throw new Error(`${source}: unparseable diff for ${key}: ${diff}`);
    }
    out.set(key, n);
  }
  return out;
}

describe("published token-aware re-lint has not drifted", () => {
  // No skip fallbacks. A missing report or a missing sample tree is exactly
  // the state this guard exists to reject; skipping would let the required
  // check pass green while the thing it protects was deleted.
  it("the protected inputs are present", () => {
    expect(existsSync(REPORT), `missing ${REPORT}`).toBe(true);
    expect(existsSync(SAMPLES_DIR), `missing ${SAMPLES_DIR}`).toBe(true);
  });

  it("the report records a severity-split diff for every cell in the run", () => {
    const published = severityDiffsFrom(readFileSync(REPORT, "utf8"), "report");
    expect(published.size).toBe(EXPECTED_CELLS);
  });

  it("re-linting the committed samples reproduces every published figure", () => {
    const published = severityDiffsFrom(readFileSync(REPORT, "utf8"), "report");
    const stdout = execFileSync(
      process.execPath,
      [CLI, "eval", "post-digital-green", "--samples", SAMPLES_ROOT],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    const fresh = severityDiffsFrom(stdout, "fresh re-lint");

    // Compare the key sets both ways. A one-way loop over the published
    // rows would ignore a cell that appeared in a fresh run but was never
    // written down.
    expect([...fresh.keys()].sort()).toEqual([...published.keys()].sort());

    const drifted: string[] = [];
    for (const [key, expectedValue] of published) {
      const actual = fresh.get(key)!;
      // Both sides render to two decimal places, so two visibly different
      // figures differ by at least 0.01. The 0.005 threshold sits inside
      // that gap and absorbs "-0.00" against "0.00".
      if (Math.abs(expectedValue - actual) > 0.005) {
        drifted.push(`${key}: published ${expectedValue}, re-lint ${actual}`);
      }
    }

    if (drifted.length > 0) {
      throw new Error(
        `The current ruleset no longer reproduces the published re-lint:\n  - ${drifted.join(
          "\n  - ",
        )}\nSee the header comment in this test before changing anything.`,
      );
    }
  }, 60_000);
});
