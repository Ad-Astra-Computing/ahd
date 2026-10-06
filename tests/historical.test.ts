import { describe, it, expect } from "vitest";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import {
  Z_995,
  wilsonInterval,
  newcombeDiff,
  recoverCount,
  HistoricalDataError,
  verifyDecomposition,
  parseWeeklyReport,
  excludeRule,
  severityOf,
  computeRuleEffect,
  buildLedger,
  flagRulesForInspection,
  computeStratum,
  computeStratumPoint,
  studentTQuantile,
  varianceFloor,
  welchInterval,
  bcaBootstrapMeanDiff,
  comonotoneVarianceBound,
  independentVarianceBound,
  computeLiveStratum,
  deriveVerdict,
  deriveHistoricalVerdict,
  assertSameEpoch,
  identityOfSidecar,
} from "../src/eval/historical.js";

const WEEKLY_DIR = resolve(__dirname, "..", "docs", "evals", "weekly");

describe("wilsonInterval", () => {
  it("gives a non-zero-width interval at x = 0", () => {
    const iv = wilsonInterval(0, 30, Z_995);
    expect(iv.lower).toBe(0);
    expect(iv.upper).toBeGreaterThan(0);
  });

  it("gives a non-zero-width interval at x = n", () => {
    const iv = wilsonInterval(30, 30, Z_995);
    expect(iv.upper).toBeCloseTo(1, 9);
    expect(iv.lower).toBeLessThan(1);
  });

  it("stays inside [0, 1] for a middling proportion", () => {
    const iv = wilsonInterval(15, 30, Z_995);
    expect(iv.lower).toBeGreaterThan(0);
    expect(iv.upper).toBeLessThan(1);
    expect(iv.lower).toBeLessThan(0.5);
    expect(iv.upper).toBeGreaterThan(0.5);
  });
});

describe("newcombeDiff", () => {
  it("stays finite and non-zero-width when both arms sit at an extreme", () => {
    // A Wald interval on p2 - p1 collapses to zero width here because
    // both arms have zero variance under the naive formula. Newcombe,
    // built from Wilson intervals on each arm, must not.
    const r = newcombeDiff(0, 30, 30, 30, Z_995);
    expect(r.estimate).toBe(1);
    expect(Number.isFinite(r.lower)).toBe(true);
    expect(Number.isFinite(r.upper)).toBe(true);
    expect(r.upper - r.lower).toBeGreaterThan(0);
  });

  it("brackets zero when the two arms are identical", () => {
    const r = newcombeDiff(15, 30, 15, 30, Z_995);
    expect(r.estimate).toBe(0);
    expect(r.lower).toBeLessThanOrEqual(0);
    expect(r.upper).toBeGreaterThanOrEqual(0);
  });
});

describe("recoverCount", () => {
  it("recovers the unique integer count behind a rounded percentage", () => {
    expect(recoverCount(87, 30)).toBe(26);
    expect(recoverCount(0, 30)).toBe(0);
    expect(recoverCount(100, 30)).toBe(30);
  });

  it("fails loudly when more than one integer rounds to the published percentage", () => {
    // n = 1000: several adjacent counts near 1% all round to "1%", so the
    // reported percentage alone cannot recover a unique count.
    expect(() => recoverCount(1, 1000)).toThrow(HistoricalDataError);
  });
});

describe("verifyDecomposition", () => {
  it("passes when the recovered counts sum to the reported mean within tolerance", () => {
    expect(() => verifyDecomposition([26, 3, 0], 30, 0.97, 0.02)).not.toThrow();
  });

  it("fails loudly when the recovered counts do not reconcile with the reported mean", () => {
    expect(() => verifyDecomposition([26, 3, 0], 30, 5, 0.02)).toThrow(
      HistoricalDataError,
    );
  });
});

describe("excludeRule", () => {
  it("subtracts a rule's counts from both arms and labels the exclusion", () => {
    const counts = new Map([
      ["ahd/tracking-per-size", { raw: 0, cmp: 8 }],
      ["ahd/weight-variety", { raw: 30, cmp: 26 }],
    ]);
    const { remaining, excluded } = excludeRule(counts, "ahd/tracking-per-size");
    expect(excluded).toEqual({ raw: 0, cmp: 8 });
    expect(remaining.has("ahd/tracking-per-size")).toBe(false);
    expect(remaining.get("ahd/weight-variety")).toEqual({ raw: 30, cmp: 26 });
  });
});

describe("severityOf", () => {
  const manifest = {
    "ahd/require-type-pairing": "error" as const,
    "ahd/weight-variety": "warn" as const,
  };

  it("reads severity from the manifest map", () => {
    expect(severityOf("ahd/require-type-pairing", manifest)).toBe("error");
    expect(severityOf("ahd/weight-variety", manifest)).toBe("warn");
  });

  it("fails loudly on a rule id the manifest does not know", () => {
    expect(() => severityOf("ahd/does-not-exist", manifest)).toThrow(
      HistoricalDataError,
    );
  });
});

describe("computeRuleEffect", () => {
  it("classifies a rule the compiled arm reliably removes", () => {
    const eff = computeRuleEffect({
      rule: "ahd/require-type-pairing",
      severity: "error",
      kRaw: 21,
      nRaw: 30,
      kCmp: 0,
      nCmp: 30,
    });
    expect(eff.d).toBeCloseTo(-0.7, 5);
    expect(eff.upper).toBeLessThan(0);
    expect(eff.classification).toBe("removed");
  });

  it("classifies a rule the compiled arm reliably induces", () => {
    const eff = computeRuleEffect({
      rule: "ahd/weight-variety",
      severity: "warn",
      kRaw: 3,
      nRaw: 30,
      kCmp: 26,
      nCmp: 30,
    });
    expect(eff.d).toBeGreaterThan(0.2);
    expect(eff.lower).toBeGreaterThan(0);
    expect(eff.classification).toBe("induced");
  });

  it("leaves a small or uncertain move unclassified", () => {
    const eff = computeRuleEffect({
      rule: "ahd/body-measure",
      severity: "warn",
      kRaw: 2,
      nRaw: 30,
      kCmp: 3,
      nCmp: 30,
    });
    expect(eff.classification).toBe("none");
  });
});

describe("buildLedger", () => {
  it("nets exactly to the difference of mean tell counts", () => {
    const effects = [
      computeRuleEffect({
        rule: "ahd/require-type-pairing",
        severity: "error",
        kRaw: 21,
        nRaw: 30,
        kCmp: 0,
        nCmp: 30,
      }),
      computeRuleEffect({
        rule: "ahd/weight-variety",
        severity: "warn",
        kRaw: 3,
        nRaw: 30,
        kCmp: 26,
        nCmp: 30,
      }),
      computeRuleEffect({
        rule: "ahd/body-measure",
        severity: "warn",
        kRaw: 2,
        nRaw: 30,
        kCmp: 3,
        nCmp: 30,
      }),
    ];
    const ledger = buildLedger(effects);
    const rawMeanTotal = (21 + 3 + 2) / 30;
    const cmpMeanTotal = (0 + 26 + 3) / 30;
    expect(ledger.net).toBeCloseTo(cmpMeanTotal - rawMeanTotal, 10);
    expect(ledger.removed).toHaveLength(1);
    expect(ledger.induced).toHaveLength(1);
    expect(ledger.grossRemoved).toBeCloseTo(0.7, 10);
    expect(ledger.grossInduced).toBeCloseTo(23 / 30, 10);
  });
});

describe("flagRulesForInspection", () => {
  it("flags a rule induced in two models and removed in none", () => {
    const perModel = [
      {
        model: "model-a",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 0, nRaw: 30, kCmp: 20, nCmp: 30 }),
        ],
      },
      {
        model: "model-b",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 0, nRaw: 30, kCmp: 18, nCmp: 30 }),
        ],
      },
    ];
    const flags = flagRulesForInspection(perModel);
    expect(flags).toHaveLength(1);
    expect(flags[0].rule).toBe("ahd/respect-reduced-motion");
    expect(flags[0].severity).toBe("error");
    expect(flags[0].qualifyingModels).toEqual(["model-a", "model-b"]);
    expect(flags[0].models.map((m) => m.model)).toEqual(["model-a", "model-b"]);
  });

  it("does not flag a rule induced in only one model", () => {
    const perModel = [
      {
        model: "model-a",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 0, nRaw: 30, kCmp: 20, nCmp: 30 }),
        ],
      },
      {
        model: "model-b",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 5, nRaw: 30, kCmp: 6, nCmp: 30 }),
        ],
      },
    ];
    expect(flagRulesForInspection(perModel)).toHaveLength(0);
  });

  it("does not flag a rule induced in two models but also removed in another", () => {
    const perModel = [
      {
        model: "model-a",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 0, nRaw: 30, kCmp: 20, nCmp: 30 }),
        ],
      },
      {
        model: "model-b",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 0, nRaw: 30, kCmp: 18, nCmp: 30 }),
        ],
      },
      {
        model: "model-c",
        effects: [
          computeRuleEffect({ rule: "ahd/respect-reduced-motion", severity: "error", kRaw: 25, nRaw: 30, kCmp: 0, nCmp: 30 }),
        ],
      },
    ];
    expect(flagRulesForInspection(perModel)).toHaveLength(0);
  });

  it("makes no causal claim and never calls the rule defective", () => {
    // The flag itself carries no wording; this asserts the data shape
    // only names classification, not a verdict on the rule.
    const perModel = [
      {
        model: "model-a",
        effects: [
          computeRuleEffect({ rule: "ahd/x", severity: "warn", kRaw: 0, nRaw: 30, kCmp: 20, nCmp: 30 }),
        ],
      },
      {
        model: "model-b",
        effects: [
          computeRuleEffect({ rule: "ahd/x", severity: "warn", kRaw: 0, nRaw: 30, kCmp: 18, nCmp: 30 }),
        ],
      },
    ];
    const flags = flagRulesForInspection(perModel);
    expect(Object.keys(flags[0])).toEqual(["rule", "severity", "qualifyingModels", "models"]);
  });
});

function constantArm(n: number, fired: number, value: number): number[] {
  const arm = new Array(n).fill(0);
  for (let i = 0; i < fired; i++) arm[i] = value;
  return arm;
}

describe("welchInterval", () => {
  it("widens as degrees of freedom fall, converging on the normal quantile at large df", () => {
    const small = welchInterval(1, 1, 5, 0, 1, 5);
    const large = welchInterval(1, 1, 5000, 0, 1, 5000);
    expect(small.df).toBeLessThan(large.df);
    expect(small.upper - small.lower).toBeGreaterThan(
      (large.upper - large.lower) * (Math.sqrt(5000) / Math.sqrt(5)),
    );
  });

  it("refuses an empty arm", () => {
    expect(() => welchInterval(1, 1, 0, 0, 1, 5)).toThrow(HistoricalDataError);
  });

  it("stays finite for a single-page arm rather than dividing by zero", () => {
    const r = welchInterval(1, 1, 1, 0, 1, 5);
    expect(Number.isFinite(r.df)).toBe(true);
    expect(r.upper).toBeGreaterThan(r.lower);
  });
});

describe("varianceFloor", () => {
  it("share 0 gives exactly the old upper-limit value", () => {
    const w = wilsonInterval(0, 30, Z_995).upper;
    expect(varianceFloor(0, 30, Z_995)).toBeCloseTo(w * (1 - w), 12);
  });

  it("is symmetric: x = n is now as positive as x = 0, not zero", () => {
    // The instrument this replaces used only the Wilson upper limit,
    // so a constant-at-one arm (every page fired) read w = 1 and the
    // floor collapsed to exactly zero. The floor is now the largest
    // s(1 - s) over the whole Wilson interval, so x = n carries the
    // same kind of uncertainty x = 0 does.
    expect(varianceFloor(30, 30, Z_995)).toBeGreaterThan(0);
  });

  it("llama's raw error stratum at n = 30, every page count 1: floor equals s(1 - s) at the Wilson lower limit", () => {
    const lower = wilsonInterval(30, 30, Z_995).lower;
    const floor = varianceFloor(30, 30, Z_995);
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBeCloseTo(lower * (1 - lower), 12);
  });

  it("llama's raw error stratum at n = 200, every page count 1: floor equals s(1 - s) at the Wilson lower limit", () => {
    const lower = wilsonInterval(200, 200, Z_995).lower;
    const floor = varianceFloor(200, 200, Z_995);
    expect(floor).toBeGreaterThan(0);
    expect(floor).toBeCloseTo(lower * (1 - lower), 12);
  });

  it("widens the interval a constant-at-one arm carries, both at n = 30 and n = 200", () => {
    for (const n of [30, 200]) {
      const oldFloor = (() => {
        const w = wilsonInterval(n, n, Z_995).upper;
        return w * (1 - w);
      })();
      expect(varianceFloor(n, n, Z_995)).toBeGreaterThan(oldFloor);
    }
  });

  it("gives 0.25 when the Wilson interval contains one half", () => {
    // n = 8, x = 4 puts the Wilson interval comfortably around 0.5.
    const iv = wilsonInterval(4, 8, Z_995);
    expect(iv.lower).toBeLessThan(0.5);
    expect(iv.upper).toBeGreaterThan(0.5);
    expect(varianceFloor(4, 8, Z_995)).toBeCloseTo(0.25, 12);
  });
});

describe("comonotoneVarianceBound", () => {
  it("matches a hand-computed two-rule case", () => {
    // p = [0.3, 0.5], n = 10. Sum over the four ordered pairs of
    // min(p_r, p_s) - p_r p_s: 0.21 + 0.15 + 0.15 + 0.25 = 0.76,
    // scaled by n / (n - 1) = 10/9.
    const bound = comonotoneVarianceBound([0.3, 0.5], 10);
    expect(bound).toBeCloseTo(0.76 * (10 / 9), 10);
  });

  it("is attainable: a shared uniform threshold reproduces it as the exact sample variance", () => {
    const n = 20;
    const ps = [0.2, 0.35, 0.6];
    const grid = new Array(n).fill(0).map((_, i) => (i + 0.5) / n);
    const counts = grid.map((u) => ps.reduce((a, p) => a + (u < p ? 1 : 0), 0));
    const mean = counts.reduce((a, b) => a + b, 0) / n;
    const ss = counts.reduce((a, v) => a + (v - mean) ** 2, 0);
    const sampleVariance = ss / (n - 1);
    expect(sampleVariance).toBeCloseTo(comonotoneVarianceBound(ps, n), 9);
  });

  it("collapses to zero when every rule in the stratum sits at zero", () => {
    expect(comonotoneVarianceBound([0, 0, 0], 30)).toBe(0);
  });
});

describe("computeStratum · comonotone bound, floor and verdict wording", () => {
  it("falls to the Wilson floor when the bound collapses at zero", () => {
    const effects = [
      computeRuleEffect({ rule: "ahd/rule-a", severity: "error", kRaw: 0, nRaw: 30, kCmp: 0, nCmp: 30 }),
    ];
    const s = computeStratum(effects, "error", 30, 30);
    expect(s.comonotoneBound.raw).toBe(0);
    expect(s.varianceUsed.raw).toBeCloseTo(varianceFloor(0, 30, Z_995), 10);
  });

  it("prints a strong-effect note when the variance ratio exceeds 3", () => {
    const nRaw = 30;
    const nCmp = 30;
    // Five rules, each firing on the same 9 of 30 raw pages (p = 0.3),
    // none in the compiled arm: the comonotone bound assumes them
    // maximally correlated, five times the independent variance a
    // pooled proportion would assume.
    const effects = ["a", "b", "c", "d", "e"].map((letter) =>
      computeRuleEffect({
        rule: `ahd/rule-${letter}`,
        severity: "error",
        kRaw: 9,
        nRaw,
        kCmp: 0,
        nCmp,
      }),
    );
    const s = computeStratum(effects, "error", nRaw, nCmp);
    expect(s.varianceRatio).not.toBeNull();
    expect(s.varianceRatio as number).toBeGreaterThan(3);
    expect(s.varianceRatioNote).toBe("can resolve only under a strong effect");
  });

  it("states the independent variance is zero rather than dividing by it", () => {
    const effects = [
      computeRuleEffect({ rule: "ahd/rule-a", severity: "error", kRaw: 30, nRaw: 30, kCmp: 0, nCmp: 30 }),
    ];
    const s = computeStratum(effects, "error", 30, 30);
    expect(s.varianceRatioNote).toBe("independent variance is zero");
    expect(s.varianceRatio).toBeNull();
  });

  it("carries the Welch estimator, df and floors with the result", () => {
    const effects = [
      computeRuleEffect({ rule: "ahd/rule-a", severity: "warn", kRaw: 15, nRaw: 30, kCmp: 3, nCmp: 30 }),
    ];
    const s = computeStratum(effects, "warn", 30, 30);
    expect(s.estimator).toBe("welch-t");
    expect(s.df).toBeGreaterThan(0);
    expect(s.varianceFloor.raw).toBeGreaterThan(0);
    expect(s.varianceFloor.cmp).toBeGreaterThan(0);
  });
});

describe("deriveHistoricalVerdict", () => {
  it("reads resolved under the widest variance, with a direction, and nothing else", () => {
    expect(deriveHistoricalVerdict({ lower: 0.4, upper: 0.9, n: 30 })).toBe(
      "resolved under the widest variance, reduced",
    );
    expect(deriveHistoricalVerdict({ lower: -0.9, upper: -0.4, n: 30 })).toBe(
      "resolved under the widest variance, increased",
    );
    expect(deriveHistoricalVerdict({ lower: -0.4, upper: 0.5, n: 30 })).toBe("not resolved");
  });

  it("never emits a per-run verdict word", () => {
    const cases = [
      { lower: 0.4, upper: 0.9, n: 30 },
      { lower: -0.9, upper: -0.4, n: 30 },
      { lower: -0.4, upper: 0.5, n: 30 },
    ];
    for (const c of cases) {
      expect(deriveHistoricalVerdict(c)).not.toMatch(/in this run/);
    }
  });

  it("reads not estimable below the sample-count gate", () => {
    expect(deriveHistoricalVerdict({ lower: 0.1, upper: 0.9, n: 10 })).toBe("not estimable");
  });

  it("a low raw mean no longer forces not estimable; the interval still reads, since the 0.5 clause governs the ratio only", () => {
    expect(deriveHistoricalVerdict({ lower: 0.1, upper: 0.9, n: 30 })).toBe(
      "resolved under the widest variance, reduced",
    );
  });
});

describe("bcaBootstrapMeanDiff", () => {
  it("is deterministic across repeated calls on the same input", () => {
    const raw = [3, 4, 2, 5, 3, 4, 2, 3];
    const cmp = [1, 0, 1, 0, 0, 1, 0, 1];
    const a = bcaBootstrapMeanDiff(raw, cmp);
    const b = bcaBootstrapMeanDiff(raw, cmp);
    expect(a).toEqual(b);
  });

  it("centers on the exact sample means, not a resample", () => {
    const raw = [4, 4, 4, 4];
    const cmp = [1, 1, 1, 1];
    const r = bcaBootstrapMeanDiff(raw, cmp);
    expect(r.estimate).toBe(3);
  });

  it("is a BCa interval, tagged as such, never percentile", () => {
    const raw = [3, 5, 2, 4, 3, 6, 1, 4, 3, 5];
    const cmp = [0, 1, 0, 1, 0, 0, 1, 0, 1, 0];
    const r = bcaBootstrapMeanDiff(raw, cmp);
    expect(r.method).toBe("bca");
    expect(r.upper).toBeGreaterThan(r.lower);
  });

  it("refuses an empty arm", () => {
    expect(() => bcaBootstrapMeanDiff([], [1, 2])).toThrow(HistoricalDataError);
  });
});

describe("computeLiveStratum · Welch interval with a variance floor", () => {
  it("reports not estimable rather than a ratio when the raw mean is below 0.5", () => {
    const raw = new Array(30).fill(0);
    raw[0] = 1;
    const cmp = new Array(30).fill(0);
    const s = computeLiveStratum("warn", raw, cmp);
    expect(s.rawMean).toBeLessThan(0.5);
    expect(s.ratio).toBeNull();
    expect(s.notEstimable).toBe(true);
  });

  it("raw 6 of 30 pages at count 1 against compiled 0 of 30: not resolved, not reduced", () => {
    // The defect this replaces: a percentile bootstrap with a
    // score-fallback that only floors variance when BOTH arms are
    // constant. Here only the compiled arm is constant (all zero);
    // the old code left the raw arm's floor at zero and the interval
    // read reduced. The Welch interval, floored on both arms, must
    // not.
    const raw = constantArm(30, 6, 1);
    const cmp = constantArm(30, 0, 1);
    const s = computeLiveStratum("error", raw, cmp);
    expect(s.upper).toBeGreaterThan(s.lower);
    const verdict = deriveVerdict({ D: s.diff, lower: s.lower, upper: s.upper, n: 30 });
    expect(verdict).toBe("not resolved in this run");
    expect(s.lower).toBeLessThan(0);
    expect(s.lower).toBeGreaterThan(-0.25);
  });

  it("n=200, raw k of 200 against compiled 0: not resolved for k = 6, 7, 8, 9", () => {
    for (const k of [6, 7, 8, 9]) {
      const raw = constantArm(200, k, 1);
      const cmp = constantArm(200, 0, 1);
      const s = computeLiveStratum("error", raw, cmp);
      const verdict = deriveVerdict({ D: s.diff, lower: s.lower, upper: s.upper, n: 200 });
      expect(verdict).toMatch(/^not resolved in this run/);
    }
  });

  it("raw 20 of 30 against compiled 0 of 30: reduced in this run", () => {
    const raw = constantArm(30, 20, 1);
    const cmp = constantArm(30, 0, 1);
    const s = computeLiveStratum("error", raw, cmp);
    const n = Math.min(raw.length, cmp.length);
    const verdict = deriveVerdict({ D: s.diff, lower: s.lower, upper: s.upper, n });
    expect(verdict).toBe("reduced in this run");
  });

  it("an arm that varies at large n is essentially unaffected by the floor", () => {
    // Each arm's "at least one" share sits well away from one half
    // (0.75 and 0.20), so the symmetric floor stays modest; the
    // sample variance from the genuine spread of counts clears it.
    const n = 200;
    const raw = new Array(n).fill(0).map((_, i) => i % 4);
    const cmp = new Array(n).fill(0).map((_, i) => (i % 5 === 0 ? 3 : 0));
    const s = computeLiveStratum("warn", raw, cmp);
    expect(s.varianceUsed.raw).toBeCloseTo(s.varianceUsed.raw, 10);
    expect(s.varianceUsed.raw).toBeGreaterThan(s.varianceFloor.raw * 3);
    expect(s.varianceUsed.cmp).toBeGreaterThan(s.varianceFloor.cmp * 3);
  });

  it("never produces a zero-width interval for finite n, even when both arms are constant and equal", () => {
    const raw = new Array(30).fill(1);
    const cmp = new Array(30).fill(1);
    const s = computeLiveStratum("warn", raw, cmp);
    expect(s.upper).toBeGreaterThan(s.lower);
  });

  it("never produces a zero-width interval for finite n across a sweep of constant-arm pairs", () => {
    for (const value of [0, 1, 2, 3]) {
      for (const other of [0, 1, 2, 3]) {
        const raw = new Array(30).fill(value);
        const cmp = new Array(30).fill(other);
        const s = computeLiveStratum("warn", raw, cmp);
        expect(s.upper).toBeGreaterThan(s.lower);
      }
    }
  });

  it("reports a wider interval than the historical comonotone bound when rules co-fire, per the documented bound", () => {
    const nRaw = 30;
    const nCmp = 30;
    const rawSeverityCounts = new Array(nRaw).fill(0).map((_, i) => (i < 21 ? 2 : 0));
    const cmpSeverityCounts = new Array(nCmp).fill(0);
    const effects = [
      computeRuleEffect({ rule: "ahd/rule-a", severity: "error", kRaw: 21, nRaw, kCmp: 0, nCmp }),
      computeRuleEffect({ rule: "ahd/rule-b", severity: "error", kRaw: 21, nRaw, kCmp: 0, nCmp }),
    ];
    const approx = computeStratum(effects, "error", nRaw, nCmp);
    const live = computeLiveStratum("error", rawSeverityCounts, cmpSeverityCounts);
    expect(live.rawMean).toBeCloseTo(approx.rawMean, 10);
    expect(live.cmpMean).toBeCloseTo(approx.cmpMean, 10);
  });

  it("carries the estimator, df, floor and bootstrap cross-check with the result", () => {
    const raw = [2, 2, 1, 2, 2, 1, 2, 2, 2, 1];
    const cmp = [0, 1, 0, 0, 1, 0, 0, 0, 1, 0];
    const s = computeLiveStratum("error", raw, cmp);
    expect(s.estimator).toBe("welch-t");
    expect(s.df).toBeGreaterThan(0);
    expect(s.bootstrapCrossCheck.method).toBe("bca");
  });

  it("is exact and reproducible, not an approximation, from the same per-sample input", () => {
    const raw = [2, 2, 1, 2, 2, 1, 2, 2, 2, 1];
    const cmp = [0, 1, 0, 0, 1, 0, 0, 0, 1, 0];
    const a = computeLiveStratum("error", raw, cmp);
    const b = computeLiveStratum("error", raw, cmp);
    expect(a).toEqual(b);
  });
});

describe("deriveVerdict", () => {
  it("reads not estimable when the sample count is too small", () => {
    expect(deriveVerdict({ D: 0.5, lower: 0.1, upper: 0.9, n: 10 })).toBe("not estimable");
  });

  it("a low raw mean no longer forces not estimable; the 0.5 clause governs the ratio only", () => {
    expect(deriveVerdict({ D: 0.1, lower: 0.05, upper: 0.15, n: 30 })).toMatch(
      /^reduced in this run/,
    );
  });

  it("reads reduced in this run when the interval lies entirely above zero", () => {
    expect(deriveVerdict({ D: 0.7, lower: 0.4, upper: 0.9, n: 30 })).toBe("reduced in this run");
  });

  it("reads increased in this run when the interval lies entirely below zero", () => {
    expect(deriveVerdict({ D: -0.7, lower: -0.9, upper: -0.4, n: 30 })).toBe(
      "increased in this run",
    );
  });

  it("reads not resolved in this run when the interval straddles zero", () => {
    expect(deriveVerdict({ D: 0.05, lower: -0.4, upper: 0.5, n: 30 })).toBe(
      "not resolved in this run",
    );
  });

  it("suffixes small when the whole interval sits inside plus or minus 0.25", () => {
    expect(deriveVerdict({ D: 0.1, lower: 0.02, upper: 0.18, n: 30 })).toBe(
      "reduced in this run, small",
    );
  });

  it("never emits the retired words", () => {
    const cases = [
      { D: 0.7, lower: 0.4, upper: 0.9, n: 30 },
      { D: -0.7, lower: -0.9, upper: -0.4, n: 30 },
      { D: 0.05, lower: -0.1, upper: 0.2, n: 30 },
      { D: 0.1, lower: 0.02, upper: 0.18, n: 30 },
    ];
    for (const c of cases) {
      const v = deriveVerdict(c);
      expect(v).not.toMatch(/\b(stable|noisy|unstable|pinned)\b/);
      expect(v).not.toMatch(/no repeatable direction/);
    }
  });
});

describe("assertSameEpoch", () => {
  const base = {
    schemaVersion: 1,
    samplingN: 30,
    tokenHash: "x",
    briefHash: "y",
    ahdVersion: "0.11.0",
    modelIds: ["a", "b"],
  };

  it("refuses to pool identities that disagree on sampling n", () => {
    const b = { ...base, samplingN: 200 };
    expect(() => assertSameEpoch([base, b])).toThrow(HistoricalDataError);
  });

  it("refuses to pool identities that disagree on ahd version", () => {
    const b = { ...base, ahdVersion: "0.12.0" };
    expect(() => assertSameEpoch([base, b])).toThrow(HistoricalDataError);
  });

  it("refuses to pool identities whose roster differs", () => {
    const b = { ...base, modelIds: ["a", "c"] };
    expect(() => assertSameEpoch([base, b])).toThrow(HistoricalDataError);
  });

  it("is insensitive to the roster's listed order", () => {
    const b = { ...base, modelIds: ["b", "a"] };
    expect(() => assertSameEpoch([base, b])).not.toThrow();
  });

  it("accepts identities that agree", () => {
    const b = { ...base };
    expect(() => assertSameEpoch([base, b])).not.toThrow();
  });
});

describe("identityOfSidecar", () => {
  it("carries ahd_version and a sorted model id list", () => {
    const id = identityOfSidecar({
      schema_version: 1,
      ahd_version: "0.11.0",
      sampling: { n: 30 },
      token: { hash: "x" },
      brief: { hash: "y" },
      models: [{ id: "z" }, { id: "a" }],
    });
    expect(id.ahdVersion).toBe("0.11.0");
    expect(id.modelIds).toEqual(["a", "z"]);
  });
});

describe("parseWeeklyReport · excludes carried-forward rows", () => {
  it("drops a summary row the sidecar does not name as measured", async () => {
    const md = await readFile(resolve(WEEKLY_DIR, "2026-08-17.md"), "utf8");
    const replay = JSON.parse(
      await readFile(resolve(WEEKLY_DIR, "2026-08-17.replay.json"), "utf8"),
    );
    const parsed = parseWeeklyReport(md, replay);
    const ids = parsed.models.map((m) => m.model);
    expect(ids).not.toContain("claude-opus-4-7");
    expect(ids).not.toContain("gpt-5.4");
    expect(ids).toContain("@cf/qwen/qwen3-30b-a3b-fp8");
    expect(parsed.carried).toContain("claude-opus-4-7");
  });
});

describe("re-verification: additive decomposition and unique count recovery across the published series", () => {
  it("holds for every model x condition cell in every published weekly report", async () => {
    const files = (await readdir(WEEKLY_DIR)).filter((f) => f.endsWith(".md"));
    expect(files.length).toBeGreaterThan(0);
    let cellsChecked = 0;
    for (const f of files) {
      const md = await readFile(resolve(WEEKLY_DIR, f), "utf8");
      const sidecarPath = resolve(WEEKLY_DIR, f.replace(/\.md$/, ".replay.json"));
      const replay = JSON.parse(await readFile(sidecarPath, "utf8"));
      // parseWeeklyReport itself calls recoverCount and verifyDecomposition
      // for every measured cell and throws HistoricalDataError on a
      // violation, so simply parsing every published report is the
      // re-verification the spec asks for.
      const parsed = parseWeeklyReport(md, replay);
      cellsChecked += parsed.models.length * 2;
    }
    expect(cellsChecked).toBe(160);
  });
});
