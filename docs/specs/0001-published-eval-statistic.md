# Spec: the published eval statistic

- Status: Draft
- Author: Ad Astra Computing Inc
- Date: 21 September 2026
- Related ADRs: `../adr/0002-eval-epochs-and-published-statistic.md`

## Problem

The weekly eval publishes one number per model per run: the reduction in mean
tell count between the raw and the compiled prompt. Three things are wrong with
it.

It blends severities. The linter has 13 error rules, 38 warn and 8 info, and a
mean tell count weights them equally. Pooled over the closed series of
sixteen published runs, llama-4-scout and qwen3-30b read as close to zero,
which the site has been describing as pinned and unstable. Split by severity
they clear 85 and 100 percent of errors and regress on warnings by about 77
and 82. The published figure has the wrong sign on the thing that matters.

It carries no uncertainty. Every cell is a point estimate printed to one
decimal place, and the verdict column is hand written. A reader cannot tell
which differences the data supports.

It is computed with an unsound instrument. `ahd/tracking-per-size` reads
font-size and letter-spacing from the same CSS block, so a page that declares
them separately fires the rule while being correctly tracked. The rule can only
fire once a page has display type, and the compiled prompt is what produces
display type, so the defect lands on the compiled arm.

## Goals

- Publish a statistic that separates errors from warnings.
- Publish uncertainty with every figure, and derive the verdict from it.
- Make a published figure re-derivable offline from committed data.
- Keep the closed series of sixteen published reports untouched.

## Non-goals

- Restating the sixteen published reports. They stand as measured.
- Retro-fitting the `tracking-per-size` fix to historical runs. The pages were
  never kept, so which fires were false is unrecoverable.
- Trend claims. They need several comparable epochs, each a stable roster
  held for at least three scheduled runs, which is not available soon. The
  docs say so rather than implying a trend exists.

## Design

### The headline

The headline is lint violations reduced, not design quality improved. The
compiler teaches the conventions the linter rewards, so a fall in fires is
evidence of compliance with AHD and not by itself evidence of a better page.
The published wording says so. Establishing that the improvement exists
outside our own scoring system needs a blinded comparison of rendered pages,
which is a separate study and does not block publication.

The statistic is the severity-split absolute difference: raw mean tells minus
compiled mean tells, reported as two figures, errors and warnings, never
blended.

The unit is binary per page. `tellsFired` is deduplicated per sample, so mean
tells is the mean number of distinct rules that fired on a page, not a count
of violations. A rule that fires twice on one page counts once. The raw
violation count is recorded separately and is not part of this statistic.
Everything downstream, the additive decomposition included, depends on this
unit, so it is stated here rather than left to be inferred. Severity is fixed in the linter, so the split is not chosen after
seeing the data. The ratio is reported second. A stratum whose raw mean is
below 0.5 is reported as not estimable rather than as a ratio.

### Uncertainty

Cadence moves to monthly, so there are twelve runs a year and no
between-run interval worth having. Pooling is dropped. Each run carries
its own interval and runs are presented side by side rather than averaged.

The unit of independence is the page. Each arm is n independent pages, and a
stratum's value for a page is the number of distinct rules in that stratum
that fired on it. Counts are never converted into proportions with a rule or
page-rule trial count, because rules co-fire on a page and treating each
page-rule pair as a trial understates the variance.

The interval on the difference of per-page means is a Welch t interval, with
degrees of freedom by Welch-Satterthwaite. Each arm's variance is floored at
the largest value of `s(1 - s)` over the Wilson interval, at the same
confidence level, for the share `s` of pages in that arm with a count of at
least one. That is 0.25 when the interval contains one half, and otherwise
`s(1 - s)` at the endpoint nearest one half. The floor is symmetric: an arm in
which no page fired and an arm in which every page fired both carry the
uncertainty their share implies, where a floor built on the upper limit alone
gave the second none. The floor always binds when an arm's sample
variance sits below it, which is the common case at small n even for an
arm that does vary, not only the constant-arm case. No arbitrary epsilon
is added. Without the
floor an arm in which no page fired carries no uncertainty at all, and the
interval overclaims on exactly the cells where the compiler looks best: raw at
6 of 30 pages against compiled at 0 of 30 read as reduced under a percentile
bootstrap and as not resolved under a score interval. With the floor it reads
not resolved, which is conservative and intended.

A BCa bootstrap is computed as a cross-check and recorded with the run. It is
never shown where a verdict is read and never decides one. Taking the more
conservative of two procedures is rejected, because it has no stated coverage
and invites tuning.

The per-sample matrix makes the point estimate exactly reproducible. No
interval here is exact. The estimator, the floor, the degrees of freedom and
the bootstrap settings are recorded with the run. An earlier draft of this
spec said paired, which was wrong. A
seed is sent to the provider, but the two arms run deliberately different
system prompts, so a shared seed creates no correspondence between sample `i`
in one arm and sample `i` in the other, and the CLI runners never receive the
seed at all. More to the point, the eval runs a single brief, so there is no
item dimension to pair on. Each arm is n independent draws from one prompt.

Running several briefs would make pairing real, take the difference within
brief and move between-brief variance out of the error term. That is likely a
better way to buy precision than raising n against one brief, and it is not
decided here.

### Per-rule detail

For each model, rule and run, let `p_raw = k_raw/n_raw` and
`p_cmp = k_cmp/n_cmp` over scored samples, and `d = p_cmp - p_raw`, where
negative means the compiled prompt removes the tell. The interval on `d` is the
Newcombe hybrid score interval without continuity correction, built from the
Wilson interval on each arm. Newcombe is chosen because many rules sit at
exactly 0 or 100 percent, where a Wald interval collapses to zero width.

The confidence level is fixed at 99.5 percent in this spec and does not float
with the number of active rules.

The comparison family is written down rather than left implicit. The headline
family is models times severity strata, about ten intervals per run, held at a
flat 99.5 percent. The per-rule bands are descriptive only: they carry no
verdict word and make no directional claim, so they need no adjustment. Verdict
words appear on the headline cells alone. Rules that never fire in either arm across a
run are dropped as never fired, in one line.

### The ledger

Mean tells compiled minus raw equals the sum of `d` over rules exactly, so each
model gets a ledger: rules removed, rules induced, gross removed, gross induced
and net. A rule counts as removed when its interval upper bound is below zero
and the effect is at least 0.20, and induced when the lower bound is above zero
and the effect is at least 0.20.

The ledger exists because the mean hides offsetting movements. In all sixteen
published runs qwen's `require-type-pairing`, an error, falls while
`weight-variety`, a warning, rises. llama's `require-named-grid` falls while
`radius-hierarchy` rises. This is reported as a co-occurring reduction
and increase, never as a trade or a substitution. Two aggregate movements in
opposite directions do not establish that clearing one rule caused the other
to fire, and the arms are independent samples, so page-level substitution is
not observable here. Demonstrating substitution needs an ablation of the token
clusters in the compiled prompt, which this spec does not do.

A rule induced in two or more models and removed in none is flagged for
inspection as a possible defect in our own tooling. That flag makes no causal
claim either.

### Verdicts

Verdicts are derived, not written. Per cell and stratum, with `D` the estimate
and `[L,U]` its interval:

1. not estimable, when either arm has fewer than about 20 scored samples after
   carried-forward exclusion, or the scoring gate fails.

A raw mean below 0.5 makes the ratio not estimable, because a ratio with a
near-zero denominator is unstable. It does not affect the verdict, which reads
the absolute difference and has no such problem.
2. reduced in this run, when `L > 0`.
3. increased in this run, when `U < 0`.
4. not resolved in this run, otherwise.

The wording is per run on purpose. One run cannot support a claim about
repetition. Repeatability is reported across runs as a plain tally, such as
reduced in three of three runs, and runs are never averaged.

A verdict is suffixed small when the whole interval lies inside plus or minus
0.25, and offsetting when one rule falls and another rises, each at 0.20 or
more. The words stable, noisy, unstable and pinned are retired.

### History

The closed series of sixteen published runs is recomputed into a derived artefact, not edited in
place. `ahd/tracking-per-size` is excluded from both arms, which the additive
decomposition makes exact by subtraction, and the exclusion is labelled. The
measured false-positive rate on the committed corpus is not applied as a
correction factor.

History has no per-page data, only per-rule marginals, so co-firing is
unrecoverable and the per-page variance of a stratum count is unknown. Each
arm's variance is bounded instead by the widest variance consistent with the
published marginals, the comonotone bound, the sum over rule pairs of
`min(p_r, p_s) - p_r p_s`, computed with `p = k/n` and multiplied by
`n / (n - 1)` so it bounds the sample variance. The Wilson floor applies where
the bound collapses, which is when every rule in the stratum sits at zero. The
same Welch interval then follows. The comonotone bound is the widest variance
consistent with the marginals, not necessarily close to it: on a stratum
where every rule's marginal is small but nonzero, the bound can sit well
below the Wilson floor the live path would apply to the same counts if it
had the per-page counts to compute the share of pages that fired, so a
historical interval can read narrower than a live interval on the same
underlying numbers would.

A bound is not a measurement, so historical cells carry none of the per-run
verdict words. A historical cell can read resolved under the widest variance,
or not resolved, and nothing more. Beside each cell the artefact prints the
ratio of the bound to the variance rules would have if they fired
independently. Where that ratio exceeds about three, the cell can resolve only
under a strong effect, and the artefact says so next to it.

### Recording

A hash cannot be re-linted. The `tracking-per-size` defect was only repairable
because two sample corpora happened to be committed; the sixteen weekly runs
were not, so that defect can never be corrected in them. Runs therefore retain
the generated pages themselves, along with the prompts, the compiler and
linter versions, the model settings and the failures, not merely digests of
them. Digests prove a page was not altered. They do not let a future reader
find out that the evaluator was wrong.

Each cell records, per scored sample, the rule ids that fired, the output hash,
the byte length and the scored status. Byte length is recorded because page
length confounds a tell count and has never been measured. This makes a
published figure re-derivable with no network and no credentials.

## Acceptance criteria

- [ ] A published figure is re-derivable offline from the committed sidecar.
- [ ] Error and warning strata are reported separately and never summed.
- [ ] Every published figure carries an interval.
- [ ] Every verdict is derived from its interval, and no verdict is hand written.
- [ ] A rule at 0 or 100 percent in an arm yields a non-zero-width interval.
- [ ] The ledger's net equals the difference of mean tell counts, exactly.
- [ ] Historical figures exclude `tracking-per-size` from both arms and say so.
- [ ] The tool refuses to pool across an epoch boundary.
- [ ] A stratum with a raw mean below 0.5 reports not estimable, not a ratio.
- [ ] A run retains its generated pages, prompts, versions and settings, not
      only digests of them.
- [ ] Verdict words appear on headline cells only, never on a per-rule band.
- [ ] No output claims a trade, a substitution or a repeatable direction from a
      single run.

## What the numbers do not establish

The measured false-positive rate for `ahd/tracking-per-size` is zero on the
corpora we checked. That is a regression-test result on those pages, not a
proof of soundness. Selector intersection still does not resolve the cascade,
specificity, inheritance, media queries or shorthand expansion, and other
rules that read source have not been audited against rendered computed styles.

## Risks and open questions

The `tracking-per-size` fix changes published figures for four of five models.
That is the point, but it is a visible correction and needs the decisions log
entry to land with it.

Raising n from 30 to between 100 and 200 has not been separately costed
against the Workers AI bill. At the old weekly cadence it would have been
prohibitive. At the new monthly cadence, twelve runs a year at n=200 comes
to close to the sample volume the old weekly series already ran (ADR 0002,
"Consequences"), so it should not be, but no one has run the actual invoice
side by side with the estimate.

Every rule that assumes two declarations sit in the same CSS block shares
`tracking-per-size`'s defect. This spec fixes the instance. The class is
addressed by moving rules to rendered computed styles, which is out of scope
here and belongs in its own spec.
