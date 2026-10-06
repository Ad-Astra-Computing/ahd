export type Severity = "error" | "warn" | "info";

export class HistoricalDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HistoricalDataError";
  }
}

// Two-sided z for a 99.5 percent confidence level. Fixed by the spec,
// not derived from the active rule count.
export const Z_995 = 2.807033768343811;

export interface Interval {
  lower: number;
  upper: number;
}

// Wilson score interval for a single proportion. Unlike a Wald
// interval it stays non-zero-width at x = 0 or x = n, which is where
// this data sits for many rules.
export function wilsonInterval(x: number, n: number, z: number): Interval {
  if (n <= 0) throw new HistoricalDataError(`wilsonInterval: n must be positive, got ${n}`);
  if (x < 0 || x > n) {
    throw new HistoricalDataError(`wilsonInterval: x=${x} out of range for n=${n}`);
  }
  const p = x / n;
  const z2 = z * z;
  const denom = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denom;
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
  return {
    lower: Math.max(0, center - margin),
    upper: Math.min(1, center + margin),
  };
}

export interface DiffResult extends Interval {
  estimate: number;
  // "score-fallback": the bootstrap resamples collapsed to zero
  // width, so a Newcombe interval was substituted. Absent when the
  // result is Newcombe-only already.
  method?: "bootstrap" | "score-fallback";
}

// Newcombe hybrid score interval (Newcombe 1998, method 10) for the
// difference of two independent proportions p2 - p1, built from the
// Wilson interval on each arm, no continuity correction. Chosen over
// Wald because many rules here sit at exactly 0 or 100 percent, where
// a Wald interval collapses to zero width.
export function newcombeDiff(x1: number, n1: number, x2: number, n2: number, z: number): DiffResult {
  const p1 = x1 / n1;
  const p2 = x2 / n2;
  const w1 = wilsonInterval(x1, n1, z);
  const w2 = wilsonInterval(x2, n2, z);
  const estimate = p2 - p1;
  const lower = estimate - Math.sqrt((p2 - w2.lower) ** 2 + (w1.upper - p1) ** 2);
  const upper = estimate + Math.sqrt((w2.upper - p2) ** 2 + (p1 - w1.lower) ** 2);
  return { estimate, lower, upper };
}

// Recovers the unique integer count k out of n behind a percentage
// that was rounded to the nearest whole percent, as every published
// per-tell frequency table does. Fails loudly if more than one k
// rounds to the same published percentage, since that would mean the
// count cannot be recovered from the published table alone.
export function recoverCount(pct: number, n: number): number {
  const candidates: number[] = [];
  for (let k = 0; k <= n; k++) {
    if (Math.round((k / n) * 100) === Math.round(pct)) candidates.push(k);
  }
  if (candidates.length === 0) {
    throw new HistoricalDataError(`recoverCount: no integer count out of n=${n} rounds to ${pct}%`);
  }
  if (candidates.length > 1) {
    throw new HistoricalDataError(
      `recoverCount: ${pct}% out of n=${n} is ambiguous (candidates ${candidates.join(", ")}); ` +
        `the published percentage alone cannot recover a unique count`,
    );
  }
  return candidates[0];
}

// Summing the recovered per-rule counts and dividing by n should
// reproduce the reported mean within a small rounding tolerance, since
// the per-tell frequency table is an exact additive decomposition of
// it. verifyDecomposition fails loudly rather than silently accepting
// a report where that does not hold.
export function verifyDecomposition(
  counts: number[],
  n: number,
  reportedMean: number,
  tolerance = 0.02,
): void {
  const sum = counts.reduce((a, b) => a + b, 0);
  const recomputedMean = sum / n;
  const err = Math.abs(recomputedMean - reportedMean);
  if (err > tolerance) {
    throw new HistoricalDataError(
      `verifyDecomposition: recovered counts sum to a mean of ${recomputedMean.toFixed(4)}, ` +
        `reported mean is ${reportedMean}, difference ${err.toFixed(4)} exceeds tolerance ${tolerance}`,
    );
  }
}

export interface RuleArmCounts {
  raw: number;
  cmp: number;
}

export function excludeRule(
  counts: Map<string, RuleArmCounts>,
  ruleId: string,
): { remaining: Map<string, RuleArmCounts>; excluded: RuleArmCounts } {
  const remaining = new Map(counts);
  const excluded = remaining.get(ruleId) ?? { raw: 0, cmp: 0 };
  remaining.delete(ruleId);
  return { remaining, excluded };
}

export function severityOf(ruleId: string, manifest: Record<string, Severity>): Severity {
  const sev = manifest[ruleId];
  if (!sev) {
    throw new HistoricalDataError(`severityOf: ${ruleId} is not in the rules manifest`);
  }
  return sev;
}

export interface RuleEffect {
  rule: string;
  severity: Severity;
  kRaw: number;
  nRaw: number;
  kCmp: number;
  nCmp: number;
  pRaw: number;
  pCmp: number;
  d: number;
  lower: number;
  upper: number;
  classification: "removed" | "induced" | "none";
}

export interface RuleEffectInput {
  rule: string;
  severity: Severity;
  kRaw: number;
  nRaw: number;
  kCmp: number;
  nCmp: number;
  z?: number;
  threshold?: number;
}

// d = p_cmp - p_raw: negative means the compiled prompt removes the
// tell, positive means it induces it. A rule counts as removed when
// its interval's upper bound sits below zero and the effect is at
// least 0.20, induced when the lower bound sits above zero and the
// effect is at least 0.20.
export function computeRuleEffect(input: RuleEffectInput): RuleEffect {
  const z = input.z ?? Z_995;
  const threshold = input.threshold ?? 0.2;
  const { estimate, lower, upper } = newcombeDiff(input.kRaw, input.nRaw, input.kCmp, input.nCmp, z);
  let classification: RuleEffect["classification"] = "none";
  if (upper < 0 && Math.abs(estimate) >= threshold) classification = "removed";
  else if (lower > 0 && estimate >= threshold) classification = "induced";
  return {
    rule: input.rule,
    severity: input.severity,
    kRaw: input.kRaw,
    nRaw: input.nRaw,
    kCmp: input.kCmp,
    nCmp: input.nCmp,
    pRaw: input.kRaw / input.nRaw,
    pCmp: input.kCmp / input.nCmp,
    d: estimate,
    lower,
    upper,
    classification,
  };
}

export interface Ledger {
  removed: RuleEffect[];
  induced: RuleEffect[];
  grossRemoved: number;
  grossInduced: number;
  // Compiled minus raw, the opposite sign from the headline table's
  // diff (raw minus compiled). A negative net means the mean fell,
  // i.e. a reduction; print it labelled, never bare.
  net: number;
}

// The ledger exists because the mean hides offsetting movements. Net is the sum
// of d over every rule, not only the ones flagged removed or induced,
// so it equals the difference of mean tell counts exactly (given all
// rules share the same nRaw and the same nCmp, as they do within one
// model's run).
export function buildLedger(effects: RuleEffect[]): Ledger {
  const removed = effects.filter((e) => e.classification === "removed");
  const induced = effects.filter((e) => e.classification === "induced");
  const grossRemoved = removed.reduce((a, e) => a + Math.abs(e.d), 0);
  const grossInduced = induced.reduce((a, e) => a + e.d, 0);
  const net = effects.reduce((a, e) => a + e.d, 0);
  return { removed, induced, grossRemoved, grossInduced, net };
}

export interface InspectionFlagModelRow {
  model: string;
  classification: RuleEffect["classification"];
  kRaw: number;
  nRaw: number;
  kCmp: number;
  nCmp: number;
  pRaw: number;
  pCmp: number;
}

export interface InspectionFlag {
  rule: string;
  severity: Severity;
  // Models whose per-rule effect clears the induced classification
  // (RuleEffect.classification === "induced"), the same threshold
  // computeRuleEffect already applies; no second threshold is invented
  // here.
  qualifyingModels: string[];
  // One row per model that recorded an effect for this rule at all
  // (fired in at least one arm), in run order, carrying raw and
  // compiled incidence and this model's own classification.
  models: InspectionFlagModelRow[];
}

// A rule induced in two or more models and removed in none is flagged
// for inspection, per the ledger's own classification, no causal
// claim. One run's models at a time; never called across runs.
export function flagRulesForInspection(
  perModel: Array<{ model: string; effects: RuleEffect[] }>,
): InspectionFlag[] {
  const rules = new Set<string>();
  for (const { effects } of perModel) {
    for (const e of effects) rules.add(e.rule);
  }

  const flags: InspectionFlag[] = [];
  for (const rule of [...rules].sort()) {
    const rows: InspectionFlagModelRow[] = [];
    let severity: Severity | undefined;
    let inducedCount = 0;
    let removedCount = 0;
    for (const { model, effects } of perModel) {
      const e = effects.find((x) => x.rule === rule);
      if (!e) continue;
      severity = e.severity;
      if (e.classification === "induced") inducedCount++;
      if (e.classification === "removed") removedCount++;
      rows.push({
        model,
        classification: e.classification,
        kRaw: e.kRaw,
        nRaw: e.nRaw,
        kCmp: e.kCmp,
        nCmp: e.nCmp,
        pRaw: e.pRaw,
        pCmp: e.pCmp,
      });
    }
    if (severity && inducedCount >= 2 && removedCount === 0) {
      flags.push({
        rule,
        severity,
        qualifyingModels: rows.filter((r) => r.classification === "induced").map((r) => r.model),
        models: rows,
      });
    }
  }
  return flags;
}

export interface StratumPoint {
  severity: Severity;
  rawMean: number;
  cmpMean: number;
  diff: number; // rawMean - cmpMean; positive means the compiled arm has fewer tells
  ratio: number | null;
  notEstimable: boolean;
}

function stratumPointFromMeans(severity: Severity, rawMean: number, cmpMean: number): StratumPoint {
  const diff = rawMean - cmpMean;
  const notEstimable = rawMean < 0.5;
  const ratio = notEstimable ? null : diff / rawMean;
  return { severity, rawMean, cmpMean, diff, ratio, notEstimable };
}

// The point estimate: raw mean tells minus compiled mean tells for
// one severity stratum, never blended across severities. Exact in
// both the historical and live paths, since both start from an exact
// per-rule count; only the interval around this point differs
// between them. A stratum whose raw mean is below 0.5 reports not
// estimable rather than a ratio, per the spec.
export function computeStratumPoint(
  effects: RuleEffect[],
  severity: Severity,
  nRaw: number,
  nCmp: number,
): StratumPoint & { kRaw: number; kCmp: number } {
  const inStratum = effects.filter((e) => e.severity === severity);
  const kRaw = inStratum.reduce((a, e) => a + e.kRaw, 0);
  const kCmp = inStratum.reduce((a, e) => a + e.kCmp, 0);
  const point = stratumPointFromMeans(severity, kRaw / nRaw, kCmp / nCmp);
  return { ...point, kRaw, kCmp };
}

// Two-sided tail probability matching Z_995: Z_995 = qnorm(TAIL_P_995).
// The Welch interval needs the matching quantile of the t distribution
// rather than the normal one, at the same nominal level.
export const TAIL_P_995 = 0.9975;

// Log-gamma via the Lanczos approximation, the incomplete-beta
// continued fraction and the normal quantile rational approximation
// below exist for one purpose: inverting the Student t and standard
// normal CDFs so the Welch interval and the BCa cross-check need no
// external statistics library.

function logGamma(x: number): number {
  const cof = [
    76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155,
    0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) {
    y += 1;
    ser += cof[j] / y;
  }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX_ITER = 200;
  const EPS = 3e-12;
  const FPMIN = 1e-300;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAX_ITER; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c;
    if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );
  if (x < (a + 1) / (a + b + 2)) {
    return (bt * betaContinuedFraction(a, b, x)) / a;
  }
  return 1 - (bt * betaContinuedFraction(b, a, 1 - x)) / b;
}

function studentTCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  const ib = regularizedIncompleteBeta(df / 2, 0.5, x);
  return t > 0 ? 1 - ib / 2 : ib / 2;
}

// Bisection rather than a closed form: the regularized incomplete
// beta function above has no simple inverse, and bisection on the
// monotone CDF is accurate to well past the precision a published
// interval needs.
export function studentTQuantile(p: number, df: number): number {
  if (p <= 0.5) return -studentTQuantile(1 - p, df);
  let lo = 0;
  let hi = 1;
  while (studentTCDF(hi, df) < p) hi *= 2;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (studentTCDF(mid, df) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const t = 1 / (1 + p * ax);
  const y = 1 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-ax * ax);
  return sign * y;
}

function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

// Acklam's rational approximation to the standard normal quantile.
function normalQuantile(p: number): number {
  const plow = 0.02425;
  const phigh = 1 - plow;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
  if (p <= 0 || p >= 1) {
    throw new HistoricalDataError(`normalQuantile: p=${p} must lie strictly between 0 and 1`);
  }
  if (p < plow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= phigh) {
    const q = p - 0.5;
    const r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

// Largest s(1 - s) over the Wilson interval on the "at least one" share,
// symmetric so a 0% and a 100% arm both get the uncertainty their share
// implies. See docs/specs/0001-published-eval-statistic.md.
export function varianceFloor(atLeastOneCount: number, n: number, z: number): number {
  const { lower, upper } = wilsonInterval(atLeastOneCount, n, z);
  if (lower <= 0.5 && upper >= 0.5) return 0.25;
  const nearest = Math.abs(lower - 0.5) < Math.abs(upper - 0.5) ? lower : upper;
  return nearest * (1 - nearest);
}

function sampleVariance(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const m = mean(values);
  const ss = values.reduce((a, v) => a + (v - m) ** 2, 0);
  return ss / (n - 1);
}

export interface WelchResult {
  estimate: number;
  lower: number;
  upper: number;
  df: number;
}

// Welch t interval on the difference of two independent means, with
// degrees of freedom by Welch-Satterthwaite, two-sided at TAIL_P_995.
// Shared by the live and historical paths; only how each side arrives
// at varA and varB differs.
export function welchInterval(
  meanA: number,
  varA: number,
  nA: number,
  meanB: number,
  varB: number,
  nB: number,
): WelchResult {
  if (nA < 1 || nB < 1) {
    throw new HistoricalDataError(
      `welchInterval: both arms need at least 1 unit, got nA=${nA}, nB=${nB}`,
    );
  }
  const termA = varA / nA;
  const termB = varB / nB;
  const se = Math.sqrt(termA + termB);
  // A single-page arm has no Welch-Satterthwaite denominator of its
  // own (nA - 1 = 0); such a run sits well below the verdict's
  // minimum sample count regardless, so the denominator is clamped to
  // 1 rather than left to divide by zero.
  const df =
    (termA + termB) ** 2 / (termA ** 2 / Math.max(1, nA - 1) + termB ** 2 / Math.max(1, nB - 1));
  const t = studentTQuantile(TAIL_P_995, df);
  const estimate = meanA - meanB;
  const margin = t * se;
  return { estimate, lower: estimate - margin, upper: estimate + margin, df };
}

export const BOOTSTRAP_ALPHA = 0.005;
export const BOOTSTRAP_ITERATIONS = 10000;
// Arbitrary but fixed, so the same per-sample input always resamples
// to the same interval offline, with no external entropy source.
export const BOOTSTRAP_SEED = 995;

// Small deterministic PRNG (mulberry32). Math.random is not used
// because a published figure has to be re-derivable byte-for-byte
// from the committed sidecar; an unseeded generator would make the
// interval a different number on every recomputation.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function mean(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function resampleMean(values: number[], rng: () => number): number {
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[Math.floor(rng() * values.length)];
  }
  return sum / values.length;
}

export interface BootstrapOptions {
  iterations?: number;
  alpha?: number;
  seed?: number;
}

export interface BcaCrossCheck {
  method: "bca";
  estimate: number;
  lower: number;
  upper: number;
  iterations: number;
  alpha: number;
  seed: number;
}

function bcaAdjustedPercentile(z0: number, accel: number, z: number): number {
  const denom = 1 - accel * (z0 + z);
  if (!Number.isFinite(denom) || denom === 0) return normalCDF(z0 + z);
  const adjusted = z0 + (z0 + z) / denom;
  return Number.isFinite(adjusted) ? normalCDF(adjusted) : normalCDF(z0 + z);
}

// Live-only: a BCa bootstrap over the exact per-sample
// severity-weighted tell counts, kept as a cross-check recorded with
// the run. It never decides a verdict; the Welch interval in
// computeLiveStratum does that. Bias correction (z0) comes from the
// share of resamples below the observed estimate; acceleration comes
// from a delete-one jackknife across both arms.
export function bcaBootstrapMeanDiff(
  rawValues: number[],
  cmpValues: number[],
  opts?: BootstrapOptions,
): BcaCrossCheck {
  if (rawValues.length === 0 || cmpValues.length === 0) {
    throw new HistoricalDataError("bcaBootstrapMeanDiff: both arms need at least one sample");
  }
  const iterations = opts?.iterations ?? BOOTSTRAP_ITERATIONS;
  const alpha = opts?.alpha ?? BOOTSTRAP_ALPHA;
  const seed = opts?.seed ?? BOOTSTRAP_SEED;
  const rng = mulberry32(seed);
  const estimate = mean(rawValues) - mean(cmpValues);

  const diffs = new Array<number>(iterations);
  for (let i = 0; i < iterations; i++) {
    diffs[i] = resampleMean(rawValues, rng) - resampleMean(cmpValues, rng);
  }
  const sorted = [...diffs].sort((a, b) => a - b);

  const proportionLess = diffs.filter((d) => d < estimate).length / iterations;
  const clamped = Math.min(
    Math.max(proportionLess, 1 / (iterations + 1)),
    iterations / (iterations + 1),
  );
  const z0 = normalQuantile(clamped);

  const jack: number[] = [];
  for (let i = 0; i < rawValues.length; i++) {
    jack.push(mean(rawValues.filter((_, j) => j !== i)) - mean(cmpValues));
  }
  for (let i = 0; i < cmpValues.length; i++) {
    jack.push(mean(rawValues) - mean(cmpValues.filter((_, j) => j !== i)));
  }
  const jackMean = mean(jack);
  const num = jack.reduce((a, v) => a + (jackMean - v) ** 3, 0);
  const den = 6 * Math.pow(jack.reduce((a, v) => a + (jackMean - v) ** 2, 0), 1.5);
  const accel = den === 0 ? 0 : num / den;

  const adjLo = bcaAdjustedPercentile(z0, accel, normalQuantile(alpha / 2));
  const adjHi = bcaAdjustedPercentile(z0, accel, normalQuantile(1 - alpha / 2));
  const idxLo = Math.min(iterations - 1, Math.max(0, Math.round(adjLo * (iterations - 1))));
  const idxHi = Math.min(iterations - 1, Math.max(0, Math.round(adjHi * (iterations - 1))));
  const lo = Math.min(idxLo, idxHi);
  const hi = Math.max(idxLo, idxHi);
  let lower = sorted[lo];
  let upper = sorted[hi];
  if (!(upper > lower)) {
    lower = sorted[0];
    upper = sorted[iterations - 1];
  }

  return { method: "bca", estimate, lower, upper, iterations, alpha, seed };
}

export interface LiveStratumResult extends StratumPoint {
  lower: number;
  upper: number;
  estimator: "welch-t";
  df: number;
  varianceFloor: { raw: number; cmp: number };
  varianceUsed: { raw: number; cmp: number };
  bootstrapCrossCheck: BcaCrossCheck;
}

// The live counterpart of computeStratum: a Welch t interval on
// per-page means, each arm floored by varianceFloor. The BCa bootstrap
// alongside is a recorded cross-check, never the verdict.
export function computeLiveStratum(
  severity: Severity,
  rawSeverityCounts: number[],
  cmpSeverityCounts: number[],
  opts?: BootstrapOptions,
  z: number = Z_995,
): LiveStratumResult {
  const point = stratumPointFromMeans(severity, mean(rawSeverityCounts), mean(cmpSeverityCounts));
  const nRaw = rawSeverityCounts.length;
  const nCmp = cmpSeverityCounts.length;

  const floorRaw = varianceFloor(rawSeverityCounts.filter((v) => v >= 1).length, nRaw, z);
  const floorCmp = varianceFloor(cmpSeverityCounts.filter((v) => v >= 1).length, nCmp, z);
  const varRaw = Math.max(sampleVariance(rawSeverityCounts), floorRaw);
  const varCmp = Math.max(sampleVariance(cmpSeverityCounts), floorCmp);

  const welch = welchInterval(point.rawMean, varRaw, nRaw, point.cmpMean, varCmp, nCmp);
  const bootstrapCrossCheck = bcaBootstrapMeanDiff(rawSeverityCounts, cmpSeverityCounts, opts);

  return {
    ...point,
    lower: welch.lower,
    upper: welch.upper,
    estimator: "welch-t",
    df: welch.df,
    varianceFloor: { raw: floorRaw, cmp: floorCmp },
    varianceUsed: { raw: varRaw, cmp: varCmp },
    bootstrapCrossCheck,
  };
}

// Comonotone upper bound on a stratum's variance: sum over rule pairs
// r, s of min(p_r, p_s) - p_r p_s, assuming maximal positive
// correlation, scaled by n / (n - 1). The widest variance consistent
// with the published marginals, since history has no per-page record
// of which rules co-fired.
export function comonotoneVarianceBound(proportions: number[], n: number): number {
  if (n <= 1) return 0;
  let sum = 0;
  for (const pr of proportions) {
    for (const ps of proportions) {
      sum += Math.min(pr, ps) - pr * ps;
    }
  }
  return sum * (n / (n - 1));
}

// The variance a stratum count would have if its rules fired
// independently: the diagonal of the same sum, sum of p_r(1 - p_r),
// scaled the same way. The denominator against which the comonotone
// bound's ratio is read.
export function independentVarianceBound(proportions: number[], n: number): number {
  if (n <= 1) return 0;
  const sum = proportions.reduce((a, p) => a + p * (1 - p), 0);
  return sum * (n / (n - 1));
}

export interface StratumResult extends StratumPoint {
  lower: number;
  upper: number;
  estimator: "welch-t";
  df: number;
  varianceFloor: { raw: number; cmp: number };
  varianceUsed: { raw: number; cmp: number };
  comonotoneBound: { raw: number; cmp: number };
  // Ratio of the comonotone-bound contribution to the interval's
  // squared standard error against what an independent-firing
  // assumption would have contributed. Null when the independent
  // variance is zero, which the note then states rather than
  // reporting a division by zero.
  varianceRatio: number | null;
  varianceRatioNote: string | null;
}

const STRONG_EFFECT_NOTE = "can resolve only under a strong effect";
const ZERO_INDEPENDENT_NOTE = "independent variance is zero";

// The historical stratum interval: each arm's variance is bounded by
// comonotoneVarianceBound, not measured, since history has only
// per-rule marginals. Floored the same way the live path floors a
// constant arm, then the same Welch interval follows.
export function computeStratum(
  effects: RuleEffect[],
  severity: Severity,
  nRaw: number,
  nCmp: number,
  z: number = Z_995,
): StratumResult {
  const point = computeStratumPoint(effects, severity, nRaw, nCmp);
  const inStratum = effects.filter((e) => e.severity === severity);
  const pRaw = inStratum.map((e) => e.kRaw / nRaw);
  const pCmp = inStratum.map((e) => e.kCmp / nCmp);

  const boundRaw = comonotoneVarianceBound(pRaw, nRaw);
  const boundCmp = comonotoneVarianceBound(pCmp, nCmp);
  // The floor applies only in the collapse case the spec names: every
  // rule in the stratum at zero, where the bound itself is exactly
  // zero and the true "at least one" count is known to be zero. A
  // nonzero bound is already a non-degenerate variance and stands on
  // its own; flooring it too would silently substitute the zero-case
  // floor for a bound the ratio below claims to be reporting on.
  const floorRaw = varianceFloor(0, nRaw, z);
  const floorCmp = varianceFloor(0, nCmp, z);
  const varRaw = boundRaw === 0 ? floorRaw : boundRaw;
  const varCmp = boundCmp === 0 ? floorCmp : boundCmp;

  const welch = welchInterval(point.rawMean, varRaw, nRaw, point.cmpMean, varCmp, nCmp);

  const indepRaw = independentVarianceBound(pRaw, nRaw);
  const indepCmp = independentVarianceBound(pCmp, nCmp);
  const totalBound = boundRaw / nRaw + boundCmp / nCmp;
  const totalIndependent = indepRaw / nRaw + indepCmp / nCmp;
  let varianceRatio: number | null = null;
  let varianceRatioNote: string | null = null;
  if (totalIndependent === 0) {
    varianceRatioNote = ZERO_INDEPENDENT_NOTE;
  } else {
    varianceRatio = totalBound / totalIndependent;
    if (varianceRatio > 3) varianceRatioNote = STRONG_EFFECT_NOTE;
  }

  return {
    ...point,
    lower: welch.lower,
    upper: welch.upper,
    estimator: "welch-t",
    df: welch.df,
    varianceFloor: { raw: floorRaw, cmp: floorCmp },
    varianceUsed: { raw: varRaw, cmp: varCmp },
    comonotoneBound: { raw: boundRaw, cmp: boundCmp },
    varianceRatio,
    varianceRatioNote,
  };
}

export interface VerdictInput {
  D: number;
  lower: number;
  upper: number;
  n: number;
  scoringGateFailed?: boolean;
}

const MIN_N = 20;
const SMALL_BAND = 0.25;

// Verdict order and wording: docs/specs/0001-published-eval-statistic.md.
// The 0.5 ratio gate lives in stratumPointFromMeans, not here.
export function deriveVerdict(input: VerdictInput): string {
  if (input.n < MIN_N || input.scoringGateFailed) {
    return "not estimable";
  }
  let base: string;
  if (input.lower > 0) base = "reduced in this run";
  else if (input.upper < 0) base = "increased in this run";
  else base = "not resolved in this run";

  const small = Math.abs(input.lower) <= SMALL_BAND && Math.abs(input.upper) <= SMALL_BAND;
  return small ? `${base}, small` : base;
}

export interface HistoricalVerdictInput {
  lower: number;
  upper: number;
  n: number;
}

// A bound is not a measurement, so a historical cell never carries a
// per-run verdict word. It reads resolved under the widest variance,
// with its direction, or not resolved, and nothing else; not
// estimable applies the same sample-count gate deriveVerdict uses. The
// raw-mean gate lives on the ratio alone, not here.
export function deriveHistoricalVerdict(input: HistoricalVerdictInput): string {
  if (input.n < MIN_N) {
    return "not estimable";
  }
  if (input.lower > 0) return "resolved under the widest variance, reduced";
  if (input.upper < 0) return "resolved under the widest variance, increased";
  return "not resolved";
}

export interface EpochIdentity {
  schemaVersion: number;
  samplingN: number;
  tokenHash: string | undefined;
  briefHash: string | undefined;
  ahdVersion: string | undefined;
  modelIds: string[];
}

export function identityOfSidecar(replay: {
  schema_version: number;
  ahd_version?: string;
  sampling?: { n?: number };
  token?: { hash?: string };
  brief?: { hash?: string };
  models?: { id: string }[];
}): EpochIdentity {
  return {
    schemaVersion: replay.schema_version,
    samplingN: replay.sampling?.n ?? -1,
    tokenHash: replay.token?.hash,
    briefHash: replay.brief?.hash,
    ahdVersion: replay.ahd_version,
    modelIds: (replay.models ?? []).map((m) => m.id).sort(),
  };
}

// Refuses to let historical recomputation quietly pool runs from
// different epochs: the ADR defines an epoch as a fixed linter
// version, roster and sample size. ahd_version stands in for linter
// version (both are built from the same release); modelIds, sorted so
// listing order never matters, stands in for the roster.
export function assertSameEpoch(identities: EpochIdentity[]): void {
  if (identities.length === 0) return;
  const baseline = identities[0];
  for (const id of identities.slice(1)) {
    if (
      id.schemaVersion !== baseline.schemaVersion ||
      id.samplingN !== baseline.samplingN ||
      id.tokenHash !== baseline.tokenHash ||
      id.briefHash !== baseline.briefHash ||
      id.ahdVersion !== baseline.ahdVersion ||
      [...id.modelIds].sort().join(",") !== [...baseline.modelIds].sort().join(",")
    ) {
      throw new HistoricalDataError(
        `assertSameEpoch: run identity ${JSON.stringify(id)} does not match the epoch baseline ${JSON.stringify(baseline)}`,
      );
    }
  }
}

export interface ParsedModelSummary {
  model: string;
  rawAttempted: number;
  rawScored: number;
  cmpAttempted: number;
  cmpScored: number;
  rawMean: number;
  cmpMean: number;
  ruleCounts: Map<string, RuleArmCounts>;
}

export interface ParsedReport {
  models: ParsedModelSummary[];
  carried: string[];
}

const SUMMARY_ROW_RE =
  /^\|\s*`([^`]+)`\s*\|\s*(\d+)\s*→\s*(\d+)\s*\|\s*(\d+)\s*→\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([\d.]+)\s*\|\s*-?[\d.]+\s*\|\s*-?[\d.]+%/gm;

// Parses one published weekly report's summary table and per-tell
// frequency table, recovering integer counts, verifying the additive
// decomposition holds and excluding any row the run's replay sidecar
// does not name as measured (a carried-forward cell). Throws
// HistoricalDataError on any violation of the decomposition or
// unique-recovery properties this whole exercise depends on.
export function parseWeeklyReport(
  markdown: string,
  replay: { models?: Array<{ id: string }> },
): ParsedReport {
  const measured = new Set((replay.models ?? []).map((m) => m.id));

  const summaries = new Map<string, ParsedModelSummary>();
  const carried: string[] = [];
  for (const m of markdown.matchAll(SUMMARY_ROW_RE)) {
    const [, model, ra, rs, ca, cs, rawMean, cmpMean] = m;
    if (!measured.has(model)) {
      carried.push(model);
      continue;
    }
    summaries.set(model, {
      model,
      rawAttempted: Number(ra),
      rawScored: Number(rs),
      cmpAttempted: Number(ca),
      cmpScored: Number(cs),
      rawMean: Number(rawMean),
      cmpMean: Number(cmpMean),
      ruleCounts: new Map(),
    });
  }

  const lines = markdown.split("\n");
  const headerIdx = lines.findIndex((l) => l.startsWith("| tell |"));
  if (headerIdx === -1) {
    if (summaries.size > 0) {
      throw new HistoricalDataError("parseWeeklyReport: no per-tell frequency table found");
    }
    return { models: [], carried };
  }
  const columns = lines[headerIdx]
    .split("|")
    .slice(1, -1)
    .map((c) => c.trim())
    .slice(1); // drop the "tell" column itself

  let i = headerIdx + 2;
  while (i < lines.length && lines[i].startsWith("|")) {
    const cells = lines[i]
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    const rule = cells[0];
    for (let c = 0; c < columns.length; c++) {
      const colName = columns[c];
      const slash = colName.lastIndexOf("/");
      const model = colName.slice(0, slash);
      const condition = colName.slice(slash + 1);
      const summary = summaries.get(model);
      if (!summary) continue; // carried-forward or unrecognised column; excluded above
      const n = condition === "raw" ? summary.rawScored : summary.cmpScored;
      const pct = Number(cells[c + 1].replace("%", ""));
      const k = n === 0 ? 0 : recoverCount(pct, n);
      const existing = summary.ruleCounts.get(rule) ?? { raw: 0, cmp: 0 };
      if (condition === "raw") existing.raw = k;
      else existing.cmp = k;
      summary.ruleCounts.set(rule, existing);
    }
    i++;
  }

  for (const summary of summaries.values()) {
    const rawCounts = [...summary.ruleCounts.values()].map((c) => c.raw);
    const cmpCounts = [...summary.ruleCounts.values()].map((c) => c.cmp);
    if (summary.rawScored > 0) {
      verifyDecomposition(rawCounts, summary.rawScored, summary.rawMean);
    }
    if (summary.cmpScored > 0) {
      verifyDecomposition(cmpCounts, summary.cmpScored, summary.cmpMean);
    }
  }

  return { models: [...summaries.values()], carried };
}
