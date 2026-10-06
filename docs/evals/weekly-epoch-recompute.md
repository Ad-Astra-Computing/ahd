# Recomputed historical eval series, weekly epoch

Derived from the 16 published weekly reports under `docs/evals/weekly/`, recomputed per `docs/specs/0001-published-eval-statistic.md`. The reports are not edited; this is a separate artefact, re-derivable offline from the committed markdown tables and replay sidecars, no network call and no provider credentials.

`ahd/tracking-per-size` is excluded from both arms of every run below. It is a confirmed defect: it reads font-size and letter-spacing from the same CSS block, so a correctly tracked page can fire it when the two declarations sit apart, and the defect falls on the compiled arm because the compiled prompt is what produces display type. The pages behind these 16 runs were never kept, so which fires were false is unrecoverable; the exclusion is by subtraction of the rule's recovered counts, exact because of the additive decomposition, and no false-positive rate is applied as a correction factor.

Runs are presented side by side, not pooled. Cadence moves to monthly, so there is no between-run interval worth having; each run carries its own figures.

A row the run's replay sidecar does not name as measured (a value carried forward from an earlier run's output directory into a later report) is excluded, not measured by that invocation.

## 2026-06-09

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.23 | 0.00 | 0.23 | [-0.08, 0.55], df 57.8 | not estimable | 1.0× | not resolved |
| warn | 2.43 | 0.97 | 1.47 | [0.95, 1.98], df 47.5 | 60.3% | 1.4× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.27), induced 0 (gross 0.00), net (compiled minus raw) -1.70.

Removed: `ahd/line-height-per-size` (warn, d=-0.87), `ahd/radius-hierarchy` (warn, d=-0.40)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.00 | 2.00 | -1.00 | [-1.31, -0.69], df 58.0 | -100.0% | independent variance is zero | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 2.00), induced 2 (gross 2.00), net (compiled minus raw) 0.00, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=1.00), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 9).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 0.77 | 1.77 | [1.16, 2.38], df 42.9 | 69.7% | 1.6× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.40), induced 0 (gross 0.00), net (compiled minus raw) -2.63.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.53), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.53 | 0.03 | 0.50 | [0.21, 0.79], df 36.4 | 93.8% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.63 | 0.80 | 1.83 | [1.08, 2.59], df 39.5 | 69.6% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.53), induced 0 (gross 0.00), net (compiled minus raw) -2.33.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.70), `ahd/require-named-grid` (warn, d=-0.30), `ahd/require-type-pairing` (error, d=-0.53)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.70 | 0.00 | 0.70 | [0.37, 1.03], df 56.9 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.23 | 2.00 | -0.77 | [-1.58, 0.05], df 57.9 | -62.2% | 2.1× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.70), induced 1 (gross 0.87), net (compiled minus raw) 0.07, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.70)

Induced: `ahd/weight-variety` (warn, d=0.87)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-06-15

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 28, compiled 25. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.21 | 0.00 | 0.21 | [-0.13, 0.56], df 50.1 | not estimable | 1.0× | not resolved |
| warn | 2.36 | 0.88 | 1.48 | [0.87, 2.08], df 50.5 | 62.7% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.34, 0.34], df 49.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.28), induced 0 (gross 0.00), net (compiled minus raw) -1.69.

Removed: `ahd/line-height-per-size` (warn, d=-0.82), `ahd/radius-hierarchy` (warn, d=-0.46)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.00 | 2.00 | -1.00 | [-1.31, -0.69], df 58.0 | -100.0% | independent variance is zero | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 2.00), induced 2 (gross 2.00), net (compiled minus raw) 0.00, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=1.00), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 9).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 0.83 | 1.70 | [1.05, 2.35], df 41.1 | 67.1% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.30), induced 0 (gross 0.00), net (compiled minus raw) -2.50.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.50), `ahd/require-type-pairing` (error, d=-0.80)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.53 | 0.00 | 0.53 | [0.19, 0.88], df 55.3 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.80 | 0.87 | 1.93 | [1.26, 2.61], df 37.0 | 69.0% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.73), induced 0 (gross 0.00), net (compiled minus raw) -2.47.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.87), `ahd/require-named-grid` (warn, d=-0.33), `ahd/require-type-pairing` (error, d=-0.53)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.70 | 0.00 | 0.70 | [0.37, 1.03], df 56.9 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.17 | 1.73 | -0.57 | [-1.59, 0.45], df 57.5 | -48.6% | 2.6× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.70), induced 1 (gross 0.70), net (compiled minus raw) -0.13, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.70)

Induced: `ahd/weight-variety` (warn, d=0.70)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-06-22

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 28, compiled 26. `ahd/tracking-per-size` excluded (raw 0, compiled 4).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.18 | 0.00 | 0.18 | [-0.15, 0.50], df 50.8 | not estimable | 1.0× | not resolved |
| warn | 2.43 | 0.96 | 1.47 | [0.83, 2.11], df 51.2 | 60.4% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.33, 0.33], df 51.5 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.35), induced 0 (gross 0.00), net (compiled minus raw) -1.65.

Removed: `ahd/line-height-per-size` (warn, d=-0.86), `ahd/radius-hierarchy` (warn, d=-0.49)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.03 | 2.00 | -0.97 | [-1.28, -0.66], df 58.0 | -93.5% | 1.7× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.97), induced 2 (gross 1.93), net (compiled minus raw) -0.03, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.97), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=0.97), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 0.90 | 1.60 | [0.98, 2.22], df 46.3 | 64.0% | 1.6× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.23), induced 0 (gross 0.00), net (compiled minus raw) -2.40.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.43), `ahd/require-type-pairing` (error, d=-0.80)

### `@cf/openai/gpt-oss-120b`

Scored: raw 29, compiled 26. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.66 | 0.04 | 0.62 | [0.33, 0.91], df 37.8 | 94.1% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.59 | 0.85 | 1.74 | [0.95, 2.53], df 50.9 | 67.3% | 2.0× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.33, 0.33], df 52.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.37), induced 0 (gross 0.00), net (compiled minus raw) -2.36.

Removed: `ahd/line-height-per-size` (warn, d=-0.92), `ahd/radius-hierarchy` (warn, d=-0.79), `ahd/require-type-pairing` (error, d=-0.66)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.83 | 0.00 | 0.83 | [0.54, 1.13], df 57.7 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.07 | 2.03 | -0.97 | [-1.98, 0.05], df 57.9 | -90.6% | 2.7× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.83), induced 2 (gross 1.20), net (compiled minus raw) 0.13, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.83)

Induced: `ahd/radius-hierarchy` (warn, d=0.40), `ahd/weight-variety` (warn, d=0.80)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-07-13

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 27, compiled 24. `ahd/tracking-per-size` excluded (raw 0, compiled 11).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.07 | 0.00 | 0.07 | [-0.23, 0.38], df 37.5 | not estimable | 1.0× | not resolved |
| warn | 2.48 | 1.17 | 1.31 | [0.66, 1.97], df 38.1 | 53.0% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.35, 0.35], df 47.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.41), induced 0 (gross 0.00), net (compiled minus raw) -1.39.

Removed: `ahd/line-height-per-size` (warn, d=-0.74), `ahd/radius-hierarchy` (warn, d=-0.67)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.00 | 2.00 | -1.00 | [-1.31, -0.69], df 58.0 | -100.0% | independent variance is zero | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 2.00), induced 2 (gross 2.00), net (compiled minus raw) 0.00, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=1.00), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 7).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.77 | 0.00 | 0.77 | [0.45, 1.08], df 57.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.47 | 0.97 | 1.50 | [0.85, 2.15], df 44.4 | 60.8% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.17), induced 0 (gross 0.00), net (compiled minus raw) -2.27.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.40), `ahd/require-type-pairing` (error, d=-0.77)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 28. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.40 | 0.00 | 0.40 | [0.05, 0.75], df 55.3 | not estimable | 1.0× | resolved under the widest variance, reduced |
| warn | 2.77 | 0.82 | 1.95 | [1.37, 2.52], df 38.6 | 70.3% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 55.6 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.30), induced 0 (gross 0.00), net (compiled minus raw) -2.35.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.93), `ahd/require-type-pairing` (error, d=-0.40)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.07 | 1.60 | -0.53 | [-1.41, 0.35], df 57.3 | -50.0% | 2.3× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.87), induced 1 (gross 0.80), net (compiled minus raw) -0.33, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.87)

Induced: `ahd/weight-variety` (warn, d=0.80)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-07-20

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 29, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.34 | 0.00 | 0.34 | [0.00, 0.69], df 54.5 | not estimable | 1.0× | resolved under the widest variance, reduced |
| warn | 2.41 | 1.00 | 1.41 | [1.04, 1.79], df 37.8 | 58.6% | 1.2× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 1.76), induced 0 (gross 0.00), net (compiled minus raw) -1.76.

Removed: `ahd/line-height-per-size` (warn, d=-0.93), `ahd/radius-hierarchy` (warn, d=-0.48), `ahd/require-type-pairing` (error, d=-0.34)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.10 | 2.00 | -0.90 | [-1.36, -0.44], df 44.3 | -81.8% | 1.7× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.87), induced 2 (gross 1.77), net (compiled minus raw) -0.10, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.87), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=0.87), `ahd/radius-hierarchy` (warn, d=0.90)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 0.97 | 1.53 | [0.80, 2.26], df 38.4 | 61.3% | 2.0× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.37), induced 0 (gross 0.00), net (compiled minus raw) -2.40.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.50), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 2).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.50 | 0.00 | 0.50 | [0.15, 0.85], df 55.3 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.77 | 0.77 | 2.00 | [1.29, 2.71], df 44.5 | 72.3% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.60), induced 0 (gross 0.00), net (compiled minus raw) -2.50.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.80), `ahd/require-named-grid` (warn, d=-0.33), `ahd/require-type-pairing` (error, d=-0.50)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 29, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.79 | 0.00 | 0.79 | [0.48, 1.10], df 56.9 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.86 | 1.80 | -0.94 | [-1.87, -0.00], df 56.9 | -108.8% | 2.4× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.79), induced 2 (gross 1.06), net (compiled minus raw) 0.14, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.79)

Induced: `ahd/radius-hierarchy` (warn, d=0.36), `ahd/weight-variety` (warn, d=0.69)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-07-27

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 29, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 7).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.17 | 0.00 | 0.17 | [-0.13, 0.48], df 55.8 | not estimable | 1.0× | not resolved |
| warn | 2.24 | 1.03 | 1.21 | [0.71, 1.70], df 36.4 | 53.8% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.21), induced 0 (gross 0.00), net (compiled minus raw) -1.38.

Removed: `ahd/line-height-per-size` (warn, d=-0.83), `ahd/radius-hierarchy` (warn, d=-0.38)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.00 | 1.00 | [0.69, 1.31], df 58.0 | 100.0% | independent variance is zero | resolved under the widest variance, reduced |
| warn | 1.10 | 2.00 | -0.90 | [-1.26, -0.54], df 53.5 | -81.8% | 1.9× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.97), induced 2 (gross 1.87), net (compiled minus raw) -0.10, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.97), `ahd/require-type-pairing` (error, d=-1.00)

Induced: `ahd/line-height-per-size` (warn, d=0.93), `ahd/radius-hierarchy` (warn, d=0.93)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 7).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 0.90 | 1.60 | [0.95, 2.25], df 44.5 | 64.0% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.23), induced 0 (gross 0.00), net (compiled minus raw) -2.40.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.43), `ahd/require-type-pairing` (error, d=-0.80)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.70 | 0.00 | 0.70 | [0.37, 1.03], df 56.9 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.80 | 0.87 | 1.93 | [1.30, 2.57], df 48.9 | 69.0% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.57), induced 0 (gross 0.00), net (compiled minus raw) -2.63.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.87), `ahd/require-type-pairing` (error, d=-0.70)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.90 | 0.00 | 0.90 | [0.63, 1.17], df 53.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.07 | 1.53 | -0.47 | [-1.40, 0.47], df 57.2 | -43.8% | 2.5× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.30), induced 1 (gross 0.67), net (compiled minus raw) -0.43, offsetting.

Removed: `ahd/line-height-per-size` (warn, d=-0.40), `ahd/require-type-pairing` (error, d=-0.90)

Induced: `ahd/weight-variety` (warn, d=0.67)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-08-03

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 6).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.10 | 0.00 | 0.10 | [-0.17, 0.37], df 53.8 | not estimable | 1.0× | not resolved |
| warn | 2.47 | 1.17 | 1.30 | [0.78, 1.82], df 52.8 | 52.7% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.40), induced 0 (gross 0.00), net (compiled minus raw) -1.40.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.43)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.13 | 0.87 | [0.58, 1.15], df 56.6 | 86.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.80 | -0.80 | [-1.11, -0.49], df 58.0 | -80.0% | 1.0× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.87), induced 2 (gross 1.80), net (compiled minus raw) -0.07, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.87)

Induced: `ahd/line-height-per-size` (warn, d=0.80), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 10).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 0.97 | 1.53 | [0.86, 2.20], df 40.3 | 61.3% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.33), induced 0 (gross 0.00), net (compiled minus raw) -2.40.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.47), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 29, compiled 27. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.69 | 0.00 | 0.69 | [0.31, 1.07], df 52.3 | 100.0% | 1.1× | resolved under the widest variance, reduced |
| warn | 2.90 | 0.74 | 2.16 | [1.31, 3.00], df 40.8 | 74.4% | 2.2× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 53.5 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.76), induced 0 (gross 0.00), net (compiled minus raw) -2.85.

Removed: `ahd/line-height-per-size` (warn, d=-0.96), `ahd/radius-hierarchy` (warn, d=-0.72), `ahd/require-named-grid` (warn, d=-0.41), `ahd/require-type-pairing` (error, d=-0.66)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 28, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.86 | 0.00 | 0.86 | [0.56, 1.15], df 55.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.04 | 1.77 | -0.73 | [-1.59, 0.13], df 55.9 | -70.6% | 2.2× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 55.6 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.86), induced 2 (gross 1.15), net (compiled minus raw) -0.13, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.86)

Induced: `ahd/radius-hierarchy` (warn, d=0.46), `ahd/weight-variety` (warn, d=0.69)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-08-10

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 10).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.17 | 0.00 | 0.17 | [-0.13, 0.46], df 57.7 | not estimable | 1.0× | not resolved |
| warn | 2.33 | 1.17 | 1.17 | [0.57, 1.77], df 58.0 | 50.0% | 1.6× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.83), induced 0 (gross 0.00), net (compiled minus raw) -1.33.

Removed: `ahd/line-height-per-size` (warn, d=-0.83)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.30 | 0.70 | [0.37, 1.03], df 56.9 | 70.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.60 | -0.60 | [-0.97, -0.23], df 52.7 | -60.0% | 1.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.70), induced 2 (gross 1.60), net (compiled minus raw) -0.10, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.70)

Induced: `ahd/line-height-per-size` (warn, d=0.63), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 7).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 0.77 | 1.77 | [1.16, 2.38], df 42.9 | 69.7% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.77), induced 0 (gross 0.00), net (compiled minus raw) -2.63.

Removed: `ahd/line-height-per-size` (warn, d=-0.40), `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.50), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.60 | 0.03 | 0.57 | [0.28, 0.86], df 36.6 | 94.4% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.70 | 0.83 | 1.87 | [1.27, 2.46], df 36.8 | 69.1% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.50), induced 0 (gross 0.00), net (compiled minus raw) -2.43.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.93), `ahd/require-type-pairing` (error, d=-0.60)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.73 | 1.60 | -0.87 | [-1.68, -0.05], df 55.1 | -118.2% | 2.1× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.80), induced 2 (gross 1.03), net (compiled minus raw) 0.07, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.80)

Induced: `ahd/radius-hierarchy` (warn, d=0.37), `ahd/weight-variety` (warn, d=0.67)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-08-17

Carried forward, excluded: @cf/meta/llama-3.3-70b-instruct-fp8-fast, @cf/moonshotai/kimi-k2.6, claude-opus-4-7, gemini-3.1-pro-preview, gpt-5.4

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 10).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.30 | 0.00 | 0.30 | [-0.03, 0.63], df 56.9 | not estimable | 1.0× | not resolved |
| warn | 2.53 | 0.93 | 1.60 | [1.01, 2.19], df 48.5 | 63.2% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 1.67), induced 0 (gross 0.00), net (compiled minus raw) -1.90.

Removed: `ahd/line-height-per-size` (warn, d=-0.83), `ahd/radius-hierarchy` (warn, d=-0.53), `ahd/require-type-pairing` (error, d=-0.30)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.33 | 0.67 | [0.33, 1.00], df 56.5 | 66.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.63 | -0.63 | [-1.00, -0.27], df 53.1 | -63.3% | 1.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.67), induced 2 (gross 1.63), net (compiled minus raw) -0.03, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.67)

Induced: `ahd/line-height-per-size` (warn, d=0.67), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 8).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 1.03 | 1.47 | [0.86, 2.07], df 43.1 | 58.7% | 1.6× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.07), induced 0 (gross 0.00), net (compiled minus raw) -2.27.

Removed: `ahd/radius-hierarchy` (warn, d=-0.97), `ahd/require-named-grid` (warn, d=-0.30), `ahd/require-type-pairing` (error, d=-0.80)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.50 | 0.00 | 0.50 | [0.15, 0.85], df 55.3 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.70 | 0.87 | 1.83 | [1.28, 2.38], df 41.4 | 67.9% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.40), induced 0 (gross 0.00), net (compiled minus raw) -2.33.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.90), `ahd/require-type-pairing` (error, d=-0.50)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.93 | 0.00 | 0.93 | [0.68, 1.19], df 48.7 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.97 | 1.80 | -0.83 | [-1.74, 0.07], df 57.2 | -86.2% | 2.3× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.93), induced 1 (gross 0.77), net (compiled minus raw) -0.10, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.93)

Induced: `ahd/weight-variety` (warn, d=0.77)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-08-24

Carried forward, excluded: @cf/meta/llama-3.3-70b-instruct-fp8-fast, @cf/moonshotai/kimi-k2.6, claude-opus-4-7, gemini-3.1-pro-preview, gpt-5.4

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 15).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.10 | 0.00 | 0.10 | [-0.17, 0.37], df 53.8 | not estimable | 1.0× | not resolved |
| warn | 2.37 | 1.03 | 1.33 | [0.85, 1.82], df 57.6 | 56.3% | 1.3× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.33), induced 0 (gross 0.00), net (compiled minus raw) -1.43.

Removed: `ahd/line-height-per-size` (warn, d=-0.90), `ahd/radius-hierarchy` (warn, d=-0.43)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.30 | 0.70 | [0.37, 1.03], df 56.9 | 70.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.67 | -0.67 | [-1.03, -0.30], df 53.5 | -66.7% | 1.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.70), induced 2 (gross 1.67), net (compiled minus raw) -0.03, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.70)

Induced: `ahd/line-height-per-size` (warn, d=0.70), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 9).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.90 | 0.00 | 0.90 | [0.63, 1.17], df 53.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 0.93 | 1.60 | [1.06, 2.14], df 46.7 | 63.2% | 1.4× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.23), induced 0 (gross 0.00), net (compiled minus raw) -2.50.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.33), `ahd/require-type-pairing` (error, d=-0.90)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.60 | 0.03 | 0.57 | [0.28, 0.86], df 37.1 | 94.3% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.63 | 0.83 | 1.81 | [1.10, 2.52], df 40.7 | 68.6% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.33), induced 0 (gross 0.00), net (compiled minus raw) -2.37.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.76), `ahd/require-type-pairing` (error, d=-0.60)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.83 | 1.80 | -0.97 | [-1.80, -0.13], df 57.0 | -116.0% | 2.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.87), induced 1 (gross 0.90), net (compiled minus raw) 0.10, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.87)

Induced: `ahd/weight-variety` (warn, d=0.90)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-08-31

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 21, compiled 28. `ahd/tracking-per-size` excluded (raw 0, compiled 11).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.19 | 0.04 | 0.15 | [-0.14, 0.44], df 26.6 | not estimable | 1.0× | not resolved |
| warn | 2.57 | 1.00 | 1.57 | [1.05, 2.09], df 33.9 | 61.1% | 1.4× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.37, 0.37], df 41.4 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.49), induced 0 (gross 0.00), net (compiled minus raw) -1.73.

Removed: `ahd/line-height-per-size` (warn, d=-0.95), `ahd/radius-hierarchy` (warn, d=-0.54)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.33 | 0.67 | [0.33, 1.00], df 56.5 | 66.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.63 | -0.63 | [-1.00, -0.27], df 53.1 | -63.3% | 1.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.67), induced 2 (gross 1.63), net (compiled minus raw) -0.03, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.67)

Induced: `ahd/line-height-per-size` (warn, d=0.67), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 6).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.47 | 1.00 | 1.47 | [0.82, 2.11], df 41.2 | 59.5% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.10), induced 0 (gross 0.00), net (compiled minus raw) -2.27.

Removed: `ahd/radius-hierarchy` (warn, d=-0.93), `ahd/require-named-grid` (warn, d=-0.37), `ahd/require-type-pairing` (error, d=-0.80)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 2).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.53 | 0.03 | 0.50 | [0.21, 0.79], df 36.4 | 93.8% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.57 | 0.77 | 1.80 | [1.06, 2.54], df 43.2 | 70.1% | 2.0× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.20), induced 0 (gross 0.00), net (compiled minus raw) -2.30.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.70), `ahd/require-type-pairing` (error, d=-0.53)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.63 | 1.60 | -0.97 | [-1.73, -0.20], df 57.4 | -152.6% | 2.1× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.80), induced 1 (gross 0.80), net (compiled minus raw) 0.17, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.80)

Induced: `ahd/weight-variety` (warn, d=0.80)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-09-07

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 28. `ahd/tracking-per-size` excluded (raw 0, compiled 14).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.37 | 0.00 | 0.37 | [0.02, 0.71], df 55.5 | not estimable | 1.0× | resolved under the widest variance, reduced |
| warn | 2.40 | 0.93 | 1.47 | [1.05, 1.89], df 46.2 | 61.3% | 1.2× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 55.6 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 1.73), induced 0 (gross 0.00), net (compiled minus raw) -1.84.

Removed: `ahd/line-height-per-size` (warn, d=-0.90), `ahd/radius-hierarchy` (warn, d=-0.46), `ahd/require-type-pairing` (error, d=-0.37)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.23 | 0.77 | [0.45, 1.08], df 57.8 | 76.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.03 | 1.73 | -0.70 | [-0.96, -0.44], df 38.3 | -67.7% | 1.0× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.77), induced 2 (gross 1.70), net (compiled minus raw) -0.07, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.77)

Induced: `ahd/line-height-per-size` (warn, d=0.70), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 6).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.03 | 0.83 | [0.62, 1.04], df 44.0 | 96.2% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 1.03 | 1.50 | [0.88, 2.12], df 42.2 | 59.2% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.20), induced 0 (gross 0.00), net (compiled minus raw) -2.33.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.33), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.60 | 0.03 | 0.57 | [0.28, 0.86], df 36.6 | 94.4% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.77 | 0.87 | 1.90 | [1.18, 2.62], df 41.6 | 68.7% | 2.0× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.63), induced 0 (gross 0.00), net (compiled minus raw) -2.47.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.73), `ahd/require-named-grid` (warn, d=-0.30), `ahd/require-type-pairing` (error, d=-0.60)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.77 | 0.00 | 0.77 | [0.45, 1.08], df 57.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.97 | 1.90 | -0.93 | [-1.86, -0.01], df 55.7 | -96.6% | 2.3× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.77), induced 2 (gross 1.07), net (compiled minus raw) 0.17, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.77)

Induced: `ahd/radius-hierarchy` (warn, d=0.50), `ahd/weight-variety` (warn, d=0.57)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-09-14

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 27. `ahd/tracking-per-size` excluded (raw 0, compiled 9).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.23 | 0.00 | 0.23 | [-0.10, 0.56], df 54.7 | not estimable | 1.0× | not resolved |
| warn | 2.40 | 1.00 | 1.40 | [0.74, 2.06], df 53.5 | 58.3% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 54.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.23), induced 0 (gross 0.00), net (compiled minus raw) -1.63.

Removed: `ahd/line-height-per-size` (warn, d=-0.80), `ahd/radius-hierarchy` (warn, d=-0.43)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.17 | 0.83 | [0.54, 1.13], df 57.7 | 83.3% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.07 | 1.77 | -0.70 | [-1.06, -0.34], df 57.3 | -65.6% | 1.4× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.80), induced 2 (gross 1.67), net (compiled minus raw) -0.13, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.97), `ahd/require-type-pairing` (error, d=-0.83)

Induced: `ahd/line-height-per-size` (warn, d=0.73), `ahd/radius-hierarchy` (warn, d=0.93)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 11).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.90 | 0.00 | 0.90 | [0.63, 1.17], df 53.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.43 | 0.90 | 1.53 | [0.97, 2.10], df 44.9 | 63.0% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.27), induced 0 (gross 0.00), net (compiled minus raw) -2.43.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.37), `ahd/require-type-pairing` (error, d=-0.90)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 3).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.67 | 0.00 | 0.67 | [0.33, 1.00], df 56.5 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.60 | 0.93 | 1.67 | [1.02, 2.31], df 38.4 | 64.1% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.33), induced 0 (gross 0.00), net (compiled minus raw) -2.33.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.67), `ahd/require-type-pairing` (error, d=-0.67)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.73 | 0.00 | 0.73 | [0.41, 1.06], df 57.4 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 0.77 | 1.83 | -1.07 | [-1.95, -0.18], df 55.5 | -139.1% | 2.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.73), induced 1 (gross 0.77), net (compiled minus raw) 0.33, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.73)

Induced: `ahd/weight-variety` (warn, d=0.77)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-09-21

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 29, compiled 28. `ahd/tracking-per-size` excluded (raw 0, compiled 15).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.14 | 0.04 | 0.10 | [-0.12, 0.32], df 43.3 | not estimable | 1.0× | not resolved |
| warn | 2.52 | 1.18 | 1.34 | [0.68, 1.99], df 49.4 | 53.2% | 2.0× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 54.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.38), induced 0 (gross 0.00), net (compiled minus raw) -1.44.

Removed: `ahd/line-height-per-size` (warn, d=-0.79), `ahd/radius-hierarchy` (warn, d=-0.58)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.27 | 0.73 | [0.41, 1.06], df 57.4 | 73.3% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.03 | 1.70 | -0.67 | [-1.00, -0.33], df 57.2 | -64.5% | 1.2× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.70), induced 2 (gross 1.63), net (compiled minus raw) -0.07, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.97), `ahd/require-type-pairing` (error, d=-0.73)

Induced: `ahd/line-height-per-size` (warn, d=0.67), `ahd/radius-hierarchy` (warn, d=0.97)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 10).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.83 | 0.00 | 0.83 | [0.54, 1.13], df 57.7 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.53 | 0.87 | 1.67 | [1.07, 2.26], df 43.7 | 65.8% | 1.5× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.30), induced 0 (gross 0.00), net (compiled minus raw) -2.50.

Removed: `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.47), `ahd/require-type-pairing` (error, d=-0.83)

### `@cf/openai/gpt-oss-120b`

Scored: raw 30, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.57 | 0.03 | 0.53 | [0.24, 0.83], df 37.0 | 93.9% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.67 | 0.93 | 1.74 | [1.07, 2.40], df 35.1 | 65.1% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.30), induced 0 (gross 0.00), net (compiled minus raw) -2.27.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.77), `ahd/require-type-pairing` (error, d=-0.57)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.77 | 0.00 | 0.77 | [0.45, 1.08], df 57.8 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.13 | 1.83 | -0.70 | [-1.64, 0.24], df 58.0 | -61.8% | 2.3× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.77), induced 1 (gross 0.70), net (compiled minus raw) -0.07, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.77)

Induced: `ahd/weight-variety` (warn, d=0.70)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-09-28

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 28, compiled 11. `ahd/tracking-per-size` excluded (raw 0, compiled 6).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.25 | 0.00 | 0.25 | [-0.30, 0.80], df 16.7 | not estimable | 1.0× | not estimable |
| warn | 2.25 | 0.91 | 1.34 | [0.48, 2.20], df 25.3 | 59.6% | 1.5× | not estimable |
| info | 0.00 | 0.00 | 0.00 | [-0.55, 0.55], df 15.9 | not estimable | independent variance is zero | not estimable |

Ledger: removed 1 (gross 0.75), induced 0 (gross 0.00), net (compiled minus raw) -1.59.

Removed: `ahd/line-height-per-size` (warn, d=-0.75)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.23 | 0.77 | [0.45, 1.08], df 57.8 | 76.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.03 | 1.73 | -0.70 | [-1.06, -0.34], df 55.2 | -67.7% | 1.4× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.73), induced 2 (gross 1.67), net (compiled minus raw) -0.07, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-0.97), `ahd/require-type-pairing` (error, d=-0.77)

Induced: `ahd/line-height-per-size` (warn, d=0.73), `ahd/radius-hierarchy` (warn, d=0.93)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 12).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.60 | 0.87 | 1.73 | [1.09, 2.37], df 40.9 | 66.7% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.73), induced 0 (gross 0.00), net (compiled minus raw) -2.60.

Removed: `ahd/line-height-per-size` (warn, d=-0.40), `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.47), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 28, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.50 | 0.03 | 0.47 | [0.16, 0.77], df 33.8 | 93.1% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.50 | 0.69 | 1.81 | [1.12, 2.51], df 35.7 | 72.4% | 1.9× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.32, 0.32], df 54.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.21), induced 0 (gross 0.00), net (compiled minus raw) -2.28.

Removed: `ahd/line-height-per-size` (warn, d=-1.00), `ahd/radius-hierarchy` (warn, d=-0.71), `ahd/require-type-pairing` (error, d=-0.50)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.07 | 1.80 | -0.73 | [-1.67, 0.20], df 57.6 | -68.8% | 2.3× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 1 (gross 0.87), induced 1 (gross 0.80), net (compiled minus raw) -0.13, offsetting.

Removed: `ahd/require-type-pairing` (error, d=-0.87)

Induced: `ahd/weight-variety` (warn, d=0.80)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## 2026-10-05

### `@cf/google/gemma-4-26b-a4b-it`

Scored: raw 30, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 5).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.07 | 0.00 | 0.07 | [-0.20, 0.33], df 46.4 | not estimable | 1.0× | not resolved |
| warn | 2.53 | 0.79 | 1.74 | [1.34, 2.15], df 50.2 | 68.7% | 1.2× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.9 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.53), induced 0 (gross 0.00), net (compiled minus raw) -1.81.

Removed: `ahd/line-height-per-size` (warn, d=-0.93), `ahd/radius-hierarchy` (warn, d=-0.60)

### `@cf/meta/llama-4-scout-17b-16e-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 1.00 | 0.23 | 0.77 | [0.45, 1.08], df 57.8 | 76.7% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.00 | 1.63 | -0.63 | [-0.97, -0.29], df 56.1 | -63.3% | 1.0× | resolved under the widest variance, increased |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.77), induced 2 (gross 1.63), net (compiled minus raw) -0.13, offsetting.

Removed: `ahd/require-named-grid` (warn, d=-1.00), `ahd/require-type-pairing` (error, d=-0.77)

Induced: `ahd/line-height-per-size` (warn, d=0.63), `ahd/radius-hierarchy` (warn, d=1.00)

### `@cf/mistralai/mistral-small-3.1-24b-instruct`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 9).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.87 | 0.00 | 0.87 | [0.58, 1.15], df 56.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.57 | 0.93 | 1.63 | [1.01, 2.26], df 45.6 | 63.6% | 1.7× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 4 (gross 2.60), induced 0 (gross 0.00), net (compiled minus raw) -2.50.

Removed: `ahd/line-height-per-size` (warn, d=-0.37), `ahd/radius-hierarchy` (warn, d=-1.00), `ahd/require-named-grid` (warn, d=-0.37), `ahd/require-type-pairing` (error, d=-0.87)

### `@cf/openai/gpt-oss-120b`

Scored: raw 29, compiled 29. `ahd/tracking-per-size` excluded (raw 0, compiled 1).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.52 | 0.00 | 0.52 | [0.16, 0.87], df 53.6 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 2.55 | 0.90 | 1.66 | [1.02, 2.29], df 43.3 | 64.9% | 1.8× | resolved under the widest variance, reduced |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 56.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 3 (gross 2.31), induced 0 (gross 0.00), net (compiled minus raw) -2.17.

Removed: `ahd/line-height-per-size` (warn, d=-0.97), `ahd/radius-hierarchy` (warn, d=-0.83), `ahd/require-type-pairing` (error, d=-0.52)

### `@cf/qwen/qwen3-30b-a3b-fp8`

Scored: raw 30, compiled 30. `ahd/tracking-per-size` excluded (raw 0, compiled 0).

| severity | raw mean | compiled mean | diff (raw − compiled) | 99.5% interval (Welch, df) | ratio | variance ratio | verdict |
|---|---:|---:|---:|---:|---:|---|---|
| error | 0.80 | 0.00 | 0.80 | [0.49, 1.11], df 58.0 | 100.0% | 1.0× | resolved under the widest variance, reduced |
| warn | 1.17 | 1.53 | -0.37 | [-1.33, 0.59], df 56.6 | -31.4% | 2.4× | not resolved |
| info | 0.00 | 0.00 | 0.00 | [-0.31, 0.31], df 58.0 | not estimable | independent variance is zero | not resolved |

Ledger: removed 2 (gross 1.17), induced 1 (gross 0.63), net (compiled minus raw) -0.43, offsetting.

Removed: `ahd/line-height-per-size` (warn, d=-0.37), `ahd/require-type-pairing` (error, d=-0.80)

Induced: `ahd/weight-variety` (warn, d=0.63)

### Flagged for inspection

A rule induced in two or more models of this run and removed in none of them, per the induced classification above; no second threshold is applied here. This flags the rule for inspection as a possible defect in our own tooling. It makes no causal claim about why the models agree.

_No rule in this run was induced in two or more models with none removing it._

## Repeatability across runs

A plain tally of the historical verdict across the 16 runs, never an average. A bound is not a measurement, so this tally counts resolved under the widest variance and not resolved, the same wording the cells above use, never the per-run verdict words.

| model | severity | resolved, reduced | resolved, increased | not resolved | not estimable | of |
|---|---|---:|---:|---:|---:|---:|
| `@cf/google/gemma-4-26b-a4b-it` | error | 2 | 0 | 13 | 1 | 16 |
| `@cf/google/gemma-4-26b-a4b-it` | warn | 15 | 0 | 0 | 1 | 16 |
| `@cf/google/gemma-4-26b-a4b-it` | info | 0 | 0 | 15 | 1 | 16 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | error | 16 | 0 | 0 | 0 | 16 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | warn | 0 | 16 | 0 | 0 | 16 |
| `@cf/meta/llama-4-scout-17b-16e-instruct` | info | 0 | 0 | 16 | 0 | 16 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | error | 16 | 0 | 0 | 0 | 16 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | warn | 16 | 0 | 0 | 0 | 16 |
| `@cf/mistralai/mistral-small-3.1-24b-instruct` | info | 0 | 0 | 16 | 0 | 16 |
| `@cf/openai/gpt-oss-120b` | error | 16 | 0 | 0 | 0 | 16 |
| `@cf/openai/gpt-oss-120b` | warn | 16 | 0 | 0 | 0 | 16 |
| `@cf/openai/gpt-oss-120b` | info | 0 | 0 | 16 | 0 | 16 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | error | 16 | 0 | 0 | 0 | 16 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | warn | 0 | 6 | 10 | 0 | 16 |
| `@cf/qwen/qwen3-30b-a3b-fp8` | info | 0 | 0 | 16 | 0 | 16 |

## Caveats

- Trend claims are not supported. 16 runs of one linter version and roster are a closed epoch, not a series to extrapolate from.
- History has only per-rule marginals, not per-page records of which rules co-fired, so the per-page variance of a stratum count is unknown. Each arm's variance is bounded instead by the widest variance consistent with the published marginals, the comonotone bound: rule pairs are assumed maximally positively correlated, which cannot be confirmed or ruled out from the committed data. A bound is not a measurement, which is why these cells carry none of the per-run verdict words.
- Figures below are re-derived entirely from the markdown percentage tables and the run manifests already committed under `docs/evals/weekly/`. No network call, no provider credentials.

