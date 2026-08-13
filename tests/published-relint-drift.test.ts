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
// The same figures are published on ahd.adastra.computer's 24 April page,
// so drift here is drift on a public claim. Re-linting costs about 1.5
// seconds, cheap enough to pay on every push rather than discovering the
// divergence at the next release.
//
// Scope: this guards the eleven per-model reduction percentages, which are
// the figures the site republishes. It does not guard the mean-tell
// columns, the attempted/scored counts or the per-tell frequency table. A
// change that moved those without moving any reduction would pass here.
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
const EXPECTED_CELLS = 11;

// A reduction cell as the report renders it: optional sign, digits, exactly
// one decimal place. Deliberately strict. A loose `-?[\d.]+` accepts "." and
// "1..2", which Number() turns into NaN, and every NaN comparison is false,
// so corrupt figures would pass as matching.
const ROW = /^\|\s*`([^`]+)`\s*\|.*\|\s*(-?\d+\.\d)%\s*\|\s*$/;

/**
 * Pull the per-model reduction column out of an `ahd eval` markdown report.
 * Rows look like:
 *   | `model-id` | 30 → 30 | 30 → 30 | 1.40 | 0.73 | 0.67 | 47.6% |
 * Throws on a duplicate model row so a mangled table cannot quietly
 * shadow one cell with another.
 */
function reductionsFrom(markdown: string, source: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of markdown.split("\n")) {
    const m = line.match(ROW);
    if (!m) continue;
    const [, model, value] = m;
    if (out.has(model)) {
      throw new Error(`${source}: duplicate row for ${model}`);
    }
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new Error(`${source}: unparseable reduction for ${model}: ${value}`);
    }
    out.set(model, n);
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

  it("the report records a reduction for every cell in the run", () => {
    const published = reductionsFrom(readFileSync(REPORT, "utf8"), "report");
    expect(published.size).toBe(EXPECTED_CELLS);
  });

  it("re-linting the committed samples reproduces every published figure", () => {
    const published = reductionsFrom(readFileSync(REPORT, "utf8"), "report");
    const stdout = execFileSync(
      process.execPath,
      [CLI, "eval", "post-digital-green", "--samples", SAMPLES_ROOT],
      { cwd: ROOT, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
    );
    const fresh = reductionsFrom(stdout, "fresh re-lint");

    // Compare the key sets both ways. A one-way loop over the published
    // rows would ignore a cell that appeared in a fresh run but was never
    // written down.
    expect([...fresh.keys()].sort()).toEqual([...published.keys()].sort());

    const drifted: string[] = [];
    for (const [model, expectedValue] of published) {
      const actual = fresh.get(model)!;
      // Both sides render to one decimal place, so two visibly different
      // figures differ by at least 0.1. The 0.05 threshold sits inside that
      // gap and absorbs "-0.0" against "0.0".
      if (Math.abs(expectedValue - actual) > 0.05) {
        drifted.push(`${model}: published ${expectedValue}%, re-lint ${actual}%`);
      }
    }

    if (drifted.length > 0) {
      throw new Error(
        `The current ruleset no longer reproduces the published re-lint:\n  - ${drifted.join(
          "\n  - ",
        )}\nSee the header comment in this test before changing anything.`,
      );
    }
  });
});
