# 2. Eval epochs, and what the eval publishes

Date: 21 September 2026

## Status

Proposed

## Context

Three changes to the eval are due at once, and each on its own would break the
comparability of the published series.

`ahd/tracking-per-size` is a confirmed defect in our linter. It reads font-size
and letter-spacing from the same CSS block, so a correctly tracked page fires
it when the two declarations sit apart. The rule can only fire once a page has
display type, and the compiled prompt is what produces display type, so the
defect falls on the compiled arm and understates the compiler. Fixing it
changes published figures for four of five models.

The model roster is ageing. The Workers AI catalogue now carries glm-5.3,
deepseek-v4, kimi-k2.6 and qwen3.8-27b, while we still run gemma-4,
llama-4-scout, mistral-small-3.1, gpt-oss-120b and qwen3-30b. None of the five
are deprecated, so nothing is forced out, but qwen3.8-27b supersedes the qwen
we run and the roster no longer reflects what people use.

The cadence is moving from weekly to monthly, because keeping a weekly
series current costs more than it returns, while a quarterly or
six-monthly cadence (the first target considered) spaces runs out too
far to catch a serving-side drift before it has sat unnoticed for months.

Each of those breaks comparability. Taken separately they would break it three
times.

## Decision

The eval is versioned in epochs. An epoch is a fixed linter version, a fixed
roster and a fixed sample size. Nothing is pooled or compared across an epoch
boundary, and the tool refuses to do so rather than leaving it to a reader.

The three changes land together at one boundary, so the series breaks once. A
roster, once set, is held for at least three scheduled runs before it is
reconsidered, and one or two anchor models are carried across each roster
change so consecutive generations can be bridged.

The first epoch runs seven Workers AI models at n=200: gpt-oss-120b and
qwen3-30b-a3b-fp8 as the anchors, gemma-4-26b-a4b-it kept as a third
continuity point, and glm-5.3, kimi-k2.6, deepseek-v4-flash and nemotron-3
added. llama-4-scout and mistral-small-3.1 are dropped, the first because its
line has no successor here and the second because gemma-4 and qwen3 already
cover its size class. Coder-specialised models, the tiny models and the flash
variants stay out, because the brief generates landing pages and one
representative per family is enough. glm-5.3 runs at its full tier and
deepseek-v4 at its flash tier; that pairing was picked for per-family cost,
not yet justified in writing against a measured price or latency gap between
the two families' tiers.

qwen3.8-27b, named above as the model that supersedes qwen3-30b-a3b-fp8 but
never added to the running roster, is added now as an eighth slot alongside
the seven. It does not replace the qwen3-30b-a3b-fp8 anchor; the anchor's
job is longitudinal continuity across epochs, and swapping it would break
the bridge this ADR exists to keep intact. Workers AI also hosts
apertus-v1.5-8b, eurollm-9b-it and granite-4.0-h-micro; all three were
considered and excluded under the tiny-models exclusion above, stated here
because that exclusion was previously silent rather than argued.

Frontier models run through the CLI runners, which we hold to be more
ecologically valid for them than an API. They are reported in a companion
table at n=100, never merged into the Workers AI table, because a different
harness with no per-token price and a different rate profile invites a
comparison the numbers do not support.

This ADR is still Proposed and no n=100 companion-table run has published
under it yet, so there is no existing frontier figure here to supersede.
The `claude-opus-4-7` CLI default the frontier runners held at the time this
ADR was drafted is superseded by a later Claude and GPT default bump. The
first companion-table run under this epoch is a
separate, not-yet-done task that should run against the current defaults
rather than the ones in place when this ADR was written.

The published statistic changes at the same boundary, as specified in
`../specs/0001-published-eval-statistic.md`: severity split, intervals on every
figure, derived verdicts and a per-rule ledger.

The closed series of sixteen published weekly reports is not edited. They
stand as measured; the last four ran after this ADR was first drafted,
because the workflow rename that was meant to stop the series had not yet
reached GitHub. A
derived artefact recomputes them with `ahd/tracking-per-size` excluded from
both arms, which the additive decomposition makes exact, and labels the
exclusion. The fixed rule applies only from the new epoch forward, because the
pages behind the published runs were never kept and which fires were false is
unrecoverable.

Sample size rises from 30 per cell to between 100 and 200. With pooling gone,
within-run precision is the only precision there is, and at twelve runs a
year the cost amortises where at fifty-two it would not: n=200 at twelve
runs a year is close to the sample volume the old n=30 weekly series ran
(roughly 130 samples per model per month against 200), not a large increase.

## Consequences

Published figures for four of five models visibly change, and the correction
has to be explained rather than slipped in.

The weekly series ends. Sixteen runs of five models under one linter version
become a closed epoch, still readable, no longer extended.

Trend claims are not available soon. A trend needs several comparable
epochs, each a stable roster held for at least three scheduled runs, so
even at twelve runs a year the documentation says there is no trend yet
rather than implying one exists.

Reports become larger, because each one now carries per-sample rule ids,
hashes, byte lengths and scored status. That is the cost of a figure anyone can
re-derive offline.

The instrument is still unsound in the general case. Every rule that assumes
two declarations share a CSS block has the same defect as `tracking-per-size`.
This decision fixes the instance and pins the epoch; moving rules onto rendered
computed styles is the fix for the class and is not decided here.
