# Testing strategy

The hard question about a framework like AHD is whether it actually moves an LLM off its median. That question is empirical, expensive to answer honestly, and not answerable with unit tests. The easy question is whether the framework itself is internally consistent. That one is cheap.

AHD's test strategy separates those two questions across three tiers. Tier 1 is live. Tier 2 ships with the linter. Tier 3 is the eval harness and is what the v0.2 roadmap exists to build.

## Tier 1 — library invariants (live)

Unit tests over the repo itself. Fast, deterministic, no network, no LLM. Their job is to keep the substrate honest.

What they assert today:

- the token library ships at least five seed tokens
- every token parses against the Zod schema
- every token forbids at least eight slop tells
- every token declares at least one required quirk
- `compile()` produces one prompt per target model
- the brief-level `mustAvoid` field is merged into the compiled spec's forbidden list
- every compiled prompt contains the FORBIDDEN section and the token name

What they do not assert: anything about what an LLM does with the output.

Run: `npm test`. Today: 6 tests, all green.

## Tier 2 — compiled-output structure (with v0.3 linter)

Fixture-based tests over HTML, CSS, JSX and SVG, using the linter (`eslint-plugin-ahd`, `stylelint-plugin-ahd`, `ahd critique`) as the oracle. Still deterministic, still cheap, still no LLM at runtime.

Two corpora live under `tests/fixtures/`:

- `slop/` — known-bad landing pages curated from public sources. Expected to trip a documented set of rules per fixture.
- `clean/` — canonical-good pages (a Müller-Brockmann-flavoured landing, a Gumroad-era page, a post-digital terminal page). Expected to pass with zero violations.

Each fixture ships with a sibling `.expected.json` listing the rule ids it must hit. Tests fail if the linter over-reports (false positives on `clean/`) or under-reports (false negatives on `slop/`). This is how the 39-tell taxonomy graduates from a document into a test oracle.

## Tier 3 — empirical eval (v0.2 roadmap)

The only tier that answers *does AHD actually move LLMs off the median*. Not a unit test. A proper ML eval.

Shape:

```
ahd eval <token> --models claude,gpt,gemini,llama --n 30
```

For each model, two conditions: **raw** (the unadorned user brief) and **compiled** (the same brief run through `ahd compile`). N samples per cell. Each sample scored against the 39-tell taxonomy using the Tier-2 linter for source-level rules and a vision-critic LLM call for rules that can only be judged from the rendered output.

Metrics reported:

- per-tell frequency, raw vs compiled, per model
- aggregate tells-per-page, raw vs compiled, per model
- the headline claim of the README as a single number: mean reduction in slop-tell count per page when the brief is compiled

Results land in `docs/evals/<date>-<token>.md`, with raw samples preserved so runs can be replayed and re-scored. The `slop-distribution.svg` figure in the README gets replaced with measured numbers.

Caveats baked in from day one:

- **Non-determinism.** Tests are probabilistic. Confidence intervals published alongside every number. No `assert.equal` in an eval.
- **Cost.** API spend is real. Runs are triggered on a schedule (weekly) and on token-level PRs, not on every commit.
- **Drift.** Model versions change. Every eval row records the exact model id and date. Old numbers are not overwritten, they are superseded.
- **Scorer bias.** A vision-critic LLM scoring an LLM's output is not independent. We mitigate by triangulating source-level deterministic rules against the critic, and by occasional human spot-checks published in `docs/evals/`.

## What is not tested

- Visual aesthetics beyond the 39 tells. "Does it look nice" is a human call. AHD narrows the answer; it does not deliver it.
- Brand alignment. Every token is a design direction, not a specific brand. Brand fit remains a human review gate.
- Copy quality beyond banned phrases. The framework can forbid "build the future of"; it cannot write a good headline.

## Why this order

Tier 1 first because without a valid substrate Tier 2 and Tier 3 test noise. Tier 2 before Tier 3 because the linter is the scorer, and you cannot run an eval without a scorer. Tier 3 last because until the first two exist, any empirical claim is expensive and fragile, and the README shouldn't make claims the repo can't back.

Until Tier 3 lands, the public claim is "aimed at" rather than "does". That is the honest version.
