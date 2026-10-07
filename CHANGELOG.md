# Changelog

## v0.12.0 · 2026-10-07

### Features

- feat(runners): replace gemini-cli with antigravity-cli ([2b036e1](https://github.com/Ad-Astra-Computing/ahd/commit/2b036e1))
- feat(eval): severity-split statistic with Welch interval and ledger ([461a654](https://github.com/Ad-Astra-Computing/ahd/commit/461a654))
- feat(eval): mark cells carried forward from a previous run (#44) ([c8095dc](https://github.com/Ad-Astra-Computing/ahd/commit/c8095dc))

### Fixes

- fix(ci): avoid backtick command substitution in tag-release.yml ([9b61bca](https://github.com/Ad-Astra-Computing/ahd/commit/9b61bca))
- fix(mcp): name the stdin cap by what it actually counts ([1709470](https://github.com/Ad-Astra-Computing/ahd/commit/1709470))
- fix(lint): bound the tag-attribute-scan [^>] run everywhere ([5401038](https://github.com/Ad-Astra-Computing/ahd/commit/5401038))
- fix(eval): exclude carried-forward cells from flags and replay ([c67f641](https://github.com/Ad-Astra-Computing/ahd/commit/c67f641))
- fix(mcp): cap stdin buffer; report the real version ([e0ea2fc](https://github.com/Ad-Astra-Computing/ahd/commit/e0ea2fc))
- fix(lint,load): cap input size on lintFile and loadToken ([9f7eebf](https://github.com/Ad-Astra-Computing/ahd/commit/9f7eebf))
- fix(lint): avoid recursion and O(n) rescans in rule helpers ([3d9b292](https://github.com/Ad-Astra-Computing/ahd/commit/3d9b292))
- fix(mobile-audit): timeout rule evaluation; sanitize snippets ([f9e32df](https://github.com/Ad-Astra-Computing/ahd/commit/f9e32df))
- fix(runners): isolate codex-cli auth; validate model id ([9d974f8](https://github.com/Ad-Astra-Computing/ahd/commit/9d974f8))
- fix(lint): bound unbounded regex runs against ReDoS ([e8948d5](https://github.com/Ad-Astra-Computing/ahd/commit/e8948d5))
- fix(runners): bump stale model defaults; retry CLI 429s ([c09a79d](https://github.com/Ad-Astra-Computing/ahd/commit/c09a79d))
- fix(build): clean dist before build ([de93ba5](https://github.com/Ad-Astra-Computing/ahd/commit/de93ba5))
- fix(packaging): lint plugins depend on the root via a semver range ([e183c43](https://github.com/Ad-Astra-Computing/ahd/commit/e183c43))
- fix(ci): keep flake-sync to one open pull request (#46) ([f241329](https://github.com/Ad-Astra-Computing/ahd/commit/f241329))
- fix(eval): replace a re-run model's stale samples (#45) ([209ea55](https://github.com/Ad-Astra-Computing/ahd/commit/209ea55))
- fix(eval): keep run samples out of the tracked corpora (#41) ([42d88c8](https://github.com/Ad-Astra-Computing/ahd/commit/42d88c8))
- fix(ci): flake-sync opens auto-merge PR (#19) ([7cd0c50](https://github.com/Ad-Astra-Computing/ahd/commit/7cd0c50))
- fix(cli): unwrap CritiqueResult in critique-url (#18) ([ac2c1e0](https://github.com/Ad-Astra-Computing/ahd/commit/ac2c1e0))
- fix(ci): repair flake-sync commit message YAML (#5) ([c9dd594](https://github.com/Ad-Astra-Computing/ahd/commit/c9dd594))
- fix(eval): stop eval CI hanging past the timeout ceiling (#4) ([b680995](https://github.com/Ad-Astra-Computing/ahd/commit/b680995))

### CI / tooling

- ci: finish moving tag-release.yml off ${{ }} in run: bodies ([033fc53](https://github.com/Ad-Astra-Computing/ahd/commit/033fc53))
- ci: harden release workflows; clean up npm package manifest ([8d75400](https://github.com/Ad-Astra-Computing/ahd/commit/8d75400))
- ci: pin actions by sha and add the guards job ([c65d122](https://github.com/Ad-Astra-Computing/ahd/commit/c65d122))
- ci(eval): fix monthly cron firing ~10x/month (#15) ([7755e9f](https://github.com/Ad-Astra-Computing/ahd/commit/7755e9f))
- ci(eval): persist reports via auto-merge PR, not direct push (#6) ([d641dce](https://github.com/Ad-Astra-Computing/ahd/commit/d641dce))

### Documentation

- docs: reword a changelog line flagged by the house-style guard ([17fe2f0](https://github.com/Ad-Astra-Computing/ahd/commit/17fe2f0))
- docs: changelog entries for the carried-forward and ReDoS follow-ups ([b3cdfab](https://github.com/Ad-Astra-Computing/ahd/commit/b3cdfab))
- docs: update CHANGELOG for this batch; refresh rules manifest ([286deb3](https://github.com/Ad-Astra-Computing/ahd/commit/286deb3))
- docs(cli): add verify-retained-run help text ([dd75de1](https://github.com/Ad-Astra-Computing/ahd/commit/dd75de1))
- docs: clear house-style violations in the readme ([d050e06](https://github.com/Ad-Astra-Computing/ahd/commit/d050e06))
- docs: plain prose pull request template ([ed845f8](https://github.com/Ad-Astra-Computing/ahd/commit/ed845f8))
- docs: adopt the Ad Astra standard ([101fdb0](https://github.com/Ad-Astra-Computing/ahd/commit/101fdb0))
- docs(evals): weekly run 2026-10-05 (#59) ([ec2e867](https://github.com/Ad-Astra-Computing/ahd/commit/ec2e867))
- docs(evals): monthly source + vision + image-gen run 2026-10-01 (#58) ([55d0cc9](https://github.com/Ad-Astra-Computing/ahd/commit/55d0cc9))
- docs(evals): weekly run 2026-09-28 (#56) ([515cc5e](https://github.com/Ad-Astra-Computing/ahd/commit/515cc5e))
- docs(evals): weekly run 2026-09-21 (#55) ([f5e670d](https://github.com/Ad-Astra-Computing/ahd/commit/f5e670d))
- docs(evals): weekly run 2026-09-14 (#54) ([459c4a0](https://github.com/Ad-Astra-Computing/ahd/commit/459c4a0))
- docs(evals): weekly run 2026-09-07 (#50) ([2ca087a](https://github.com/Ad-Astra-Computing/ahd/commit/2ca087a))
- docs(evals): monthly source + vision + image-gen run 2026-09-01 (#48) ([f71efb7](https://github.com/Ad-Astra-Computing/ahd/commit/f71efb7))
- docs(evals): weekly run 2026-08-31 (#47) ([f4b51a3](https://github.com/Ad-Astra-Computing/ahd/commit/f4b51a3))
- docs(evals): weekly run 2026-08-24 (#40) ([722fdae](https://github.com/Ad-Astra-Computing/ahd/commit/722fdae))
- docs(evals): weekly run 2026-08-17 (#39) ([88a32ee](https://github.com/Ad-Astra-Computing/ahd/commit/88a32ee))
- docs(evals): re-lint 24 April run, track samples (#38) ([d1a25ec](https://github.com/Ad-Astra-Computing/ahd/commit/d1a25ec))
- docs(evals): weekly run 2026-08-10 (#36) ([c8c1d56](https://github.com/Ad-Astra-Computing/ahd/commit/c8c1d56))
- docs(evals): weekly run 2026-08-03 (#33) ([f0ed567](https://github.com/Ad-Astra-Computing/ahd/commit/f0ed567))
- docs(evals): monthly source + vision + image-gen run 2026-08-01 (#32) ([905b740](https://github.com/Ad-Astra-Computing/ahd/commit/905b740))
- docs(evals): weekly run 2026-07-27 (#31) ([5d7243e](https://github.com/Ad-Astra-Computing/ahd/commit/5d7243e))
- docs(evals): monthly source + vision + image-gen run 2026-06-22 (#12) ([c03ce97](https://github.com/Ad-Astra-Computing/ahd/commit/c03ce97))
- docs(evals): monthly source + vision + image-gen run 2026-06-15 (#9) ([b1020af](https://github.com/Ad-Astra-Computing/ahd/commit/b1020af))
- docs(evals): weekly run 2026-07-20 (#22) ([096f804](https://github.com/Ad-Astra-Computing/ahd/commit/096f804))
- docs(evals): weekly run 2026-07-13 (#21) ([f868abb](https://github.com/Ad-Astra-Computing/ahd/commit/f868abb))
- docs: note weekly eval cadence in README (#17) ([d27de0b](https://github.com/Ad-Astra-Computing/ahd/commit/d27de0b))
- docs(evals): monthly source + vision + image-gen run 2026-07-07 (#14) ([033e645](https://github.com/Ad-Astra-Computing/ahd/commit/033e645))
- docs(evals): weekly run 2026-06-22 (#11) ([f610175](https://github.com/Ad-Astra-Computing/ahd/commit/f610175))
- docs(evals): weekly run 2026-06-15 (#8) ([2fd2918](https://github.com/Ad-Astra-Computing/ahd/commit/2fd2918))
- docs(evals): weekly run 2026-06-09 (#7) ([a772e36](https://github.com/Ad-Astra-Computing/ahd/commit/a772e36))

### Tests

- test(plugins): run stylelint-plugin-ahd under real stylelint ([5b90aac](https://github.com/Ad-Astra-Computing/ahd/commit/5b90aac))

### Chores

- chore(flake): sync version + npmDepsHash [skip-flake-sync] (#60) ([d7b4601](https://github.com/Ad-Astra-Computing/ahd/commit/d7b4601))
- chore: fix a Node version drift and two doc inconsistencies ([38126fa](https://github.com/Ad-Astra-Computing/ahd/commit/38126fa))
- chore: regenerate schema from the antigravity-cli rename ([de6c315](https://github.com/Ad-Astra-Computing/ahd/commit/de6c315))
- chore(eval): close the weekly series; move roster eval to monthly ([df81076](https://github.com/Ad-Astra-Computing/ahd/commit/df81076))
- chore: drop ci.yml steps for deleted skeleton guard scripts ([e1064b1](https://github.com/Ad-Astra-Computing/ahd/commit/e1064b1))
- chore(deps): pin playwright; bump postcss, yaml, source-map-js ([26f5c38](https://github.com/Ad-Astra-Computing/ahd/commit/26f5c38))
- chore(deps): widen stylelint-plugin-ahd peer range to 17 ([6e9c5c1](https://github.com/Ad-Astra-Computing/ahd/commit/6e9c5c1))
- chore: de-vendor the Ad Astra project skeleton ([6796aac](https://github.com/Ad-Astra-Computing/ahd/commit/6796aac))
- chore: sync the standard and guards from the skeleton ([dc39568](https://github.com/Ad-Astra-Computing/ahd/commit/dc39568))
- chore: sync the standard and guards from the skeleton ([d14113e](https://github.com/Ad-Astra-Computing/ahd/commit/d14113e))
- chore: sync the paraphrase fix from the skeleton ([7f2ac57](https://github.com/Ad-Astra-Computing/ahd/commit/7f2ac57))
- chore: add agent playbooks and adapters ([15093fc](https://github.com/Ad-Astra-Computing/ahd/commit/15093fc))
- chore: track the prose and secret guards ([f7dc30f](https://github.com/Ad-Astra-Computing/ahd/commit/f7dc30f))
- chore(flake): sync version + npmDepsHash [skip-flake-sync] (#43) ([c50b62f](https://github.com/Ad-Astra-Computing/ahd/commit/c50b62f))
- chore(deps): patch four transitive advisories (#42) ([ae14b02](https://github.com/Ad-Astra-Computing/ahd/commit/ae14b02))
- chore(flake): sync version + npmDepsHash [skip-flake-sync] (#29) ([c33e729](https://github.com/Ad-Astra-Computing/ahd/commit/c33e729))
- chore(deps): bump brace-expansion from 1.1.14 to 1.1.16 (#25) ([9dcb366](https://github.com/Ad-Astra-Computing/ahd/commit/9dcb366))
- chore(deps): bump postcss from 8.5.16 to 8.5.23 (#24) ([b533088](https://github.com/Ad-Astra-Computing/ahd/commit/b533088))
- chore(deps): bump js-yaml from 4.1.1 to 4.3.0 (#13) ([9120c81](https://github.com/Ad-Astra-Computing/ahd/commit/9120c81))
- chore(deps): bump vite from 8.0.9 to 8.1.3 (#16) ([97b2658](https://github.com/Ad-Astra-Computing/ahd/commit/97b2658))
- chore(deps): bump fast-uri from 3.1.2 to 3.1.4 (#23) ([59cb01d](https://github.com/Ad-Astra-Computing/ahd/commit/59cb01d))
- chore(flake): sync version + npmDepsHash [skip-flake-sync] (#20) ([4d09688](https://github.com/Ad-Astra-Computing/ahd/commit/4d09688))
- chore(deps): bump fast-uri from 3.1.0 to 3.1.2 (#3) ([47960f7](https://github.com/Ad-Astra-Computing/ahd/commit/47960f7))

**Full changelog:** https://github.com/Ad-Astra-Computing/ahd/compare/v0.11.0...HEAD

## Unreleased

### Features

- feat(eval): severity-split statistic with derived verdicts, a Welch interval and a per-rule ledger, replacing the blended reduction percentage (`docs/specs/0001-published-eval-statistic.md`)
- feat(eval): `ahd eval-live --retain` writes a run's generated pages and raw responses to a write-once directory; `ahd verify-retained-run` re-hashes them
- feat(eval): cross-model inspection flag for a rule induced in two or more models and removed in none
- feat(eval): per-model, per-severity interval provenance (`strata`) recorded in the replay sidecar on `eval-live` runs
- feat(runners): `gemini-cli` replaced with `antigravity-cli`, driving the `agy` binary; plain Gemini CLI access moved behind an enterprise entitlement
- feat(runners)!: the Gemini API runner (`gemini-*` specs, `GEMINI_API_KEY`/`GOOGLE_API_KEY`) is removed entirely alongside `gemini-cli`; Gemini access runs only through `antigravity-cli:` now

### Fixes

- fix(packaging)!: both lint plugins depended on the root package via `file:../..`, a monorepo-relative path with nothing to resolve to once published; broke `entities` resolution for any real consumer installing `ahd` alongside either plugin, crashing the CLI (`ERR_MODULE_NOT_FOUND`). Switched to a real semver range, synced automatically at tag time
- fix(eval): `ahd/tracking-per-size` is now selector-aware instead of block-local, removing a false-positive source
- fix(eval): the historical variance floor now applies only when the comonotone bound truly collapses to zero, not whenever it is merely smaller than the floor
- fix(eval): `assertSameEpoch` now checks the framework version and the full roster, not only sample size
- fix(runners): Claude and GPT default model ids bumped off a two-generation-stale default to `claude-opus-5-5` and `gpt-6-astra`; the three independent Claude hardcodes consolidated into one shared constant
- fix(runners): added a narrow retry with backoff for a 429 surfaced through the CLI-spawn-based Claude paths
- fix(runners): `codex-cli` default bumped from `gpt-5.4` to `gpt-6-codex`

### Security

- fix(lint)!: `ahd/no-three-equal-cards`' container regex paired two unbounded `[^"]*` runs, backtracking catastrophically on an unterminated class attribute; a single hostile sample could wedge `ahd lint` and the eval runner. Bounded every run at 500 chars
- fix(lint)!: the same chained-unbounded-run shape, found across the rest of the rule set by a dedicated security audit, fixed the same way in `ahd/pricing-not-three`, `ahd/cta-not-canonical`, `ahd/no-centered-hero`, `ahd/no-gradient-text`, `ahd/no-lucide-in-rounded-square`, `ahd/no-purple-blue-gradient` and `ahd/spa-shell-detected`
- fix(lint)!: a second, broader ReDoS shape survived the fix above: the `[^>]*` run that scans an opening tag's attributes, used in nearly every HTML rule's tag-matching regex, was itself unbounded. A document with many unclosed tags backtracks it the full remaining input at every tag start. Bounded across 12 rule files, `extractInline`, `detectActiveToken` and the SVG viewBox scanner; a sweep test now runs every HTML rule against the same adversarial input
- fix(runners)!: `codex-cli` copied the user's live Codex auth token into the same directory its sandboxed shell tool can read; a prompt-injected `cat` could exfiltrate it into the sample's saved raw response. Auth now lives under a separate `CODEX_HOME`, outside the model-reachable workdir
- fix(runners)!: `antigravity-cli` ran with `HOME` pointed at the real home directory; `--sandbox` does not scope filesystem reads (verified live), so a prompt-injected read could reach anything there, not only the antigravity token. `HOME` now points at a scratch dir holding only that one token
- fix(runners): `codex-cli`'s model id now validated against a safe charset before it rides into a TOML `--config` override; an unvalidated `"` could inject further config keys
- ci: `playwright` is now a pinned devDependency and both chromium-install steps use `npx --no-install`; a bare `npx playwright install` was fetching and executing whatever is latest on the registry inside the job that holds `id-token: write` for npm provenance signing
- ci: the monthly roster and vision eval report PRs no longer auto-merge; their content (reports, retained samples, raw responses, vision-critic rationale) is model-generated text about to land on `main`, and `ci.yml`'s gate has no opinion on whether it is safe to publish. A human reviews and merges
- fix(lint): `collectProseText` recursed once per nested element; several thousand levels of wrapper `<span>` blew the call stack, which the engine's catch turned into a silently skipped rule rather than a reported error. Walks an explicit stack now, no depth limit
- fix(lint): `lineOf` re-sliced and split the whole source from offset 0 on every call; a file with tens of thousands of violations took over a minute to report them. Newline offsets are computed once per source and looked up with a binary search
- fix(mobile-audit): `page.evaluate()` had no timeout; a fetched page that keeps its main thread busy after `load` held the Chromium process open indefinitely. Each rule now races a 10s budget
- fix(mobile-audit): rule snippets come from the fetched page's own DOM; a hostile page could embed ANSI/terminal control sequences in an attribute or text node and have them reach the operator's terminal verbatim. Stripped before any snippet or message is printed
- fix(lint,load): `lintFile` and `loadToken` had no input size cap; a mistaken or hostile multi-hundred-MB file ran the full regex-heavy rule set (or YAML parse) unbounded. Capped at 20MB and 2MB
- fix(mcp): the stdio server buffered input until a newline with no cap; a client that never sends one grew memory without bound. Capped at 10MB with a clear parse-error response and buffer reset
- fix(mcp): `initialize` reported a stale hardcoded `version: "0.5.0-beta.1"`; now reads the real package version
- ci: `tag-release.yml` and `flake-sync.yml` ran `nix run nixpkgs#prefetch-npm-deps` against whatever `nixos-unstable` currently resolves to, inside jobs holding `RELEASE_PAT`; both now pin it to this repo's own `flake.lock` rev with `--inputs-from .`
- ci: several workflows interpolated `${{ }}` expressions (step outputs, env values, a release tag) directly into `run:` script bodies, the same template-injection shape zizmor flags; moved to `env:` blocks read as `"$VAR"` in `flake-sync.yml`, `monthly-roster-eval.yml`, `monthly-vision-eval.yml`, `release.yml` and `tag-release.yml`
- docs: `ci.yml`'s header comment claimed Dependabot PRs auto-merge by default; no workflow enables that and AGENTS.md says Dependabot PRs are reviewed, never auto-merged. Corrected to describe what the gate actually does
- chore(packaging): removed `docs/artwork/README.md` from `package.json`'s `files` list (the file does not exist) and the dead `!.env.example` negation from `.npmignore` (unreachable: `package.json`'s `files` allow-list is authoritative for `npm pack` and already excludes it)
- fix(eval): a carried-forward cell's rule effects and samples could feed the cross-model inspection flag and the replay sidecar as though this run measured them; both are now filtered against the run manifest's `carriedForward` list before capture

### Dependencies

- chore(deps)!: `stylelint` 16.26 to 17.16, a major version bump; `packages/stylelint-plugin-ahd`'s peer range moves to `>=16 <18`, dropping stylelint 15 support for anyone consuming that package
- chore(deps): `vitest`/`@vitest/mocker` to 4.1.11, `colord`, `fast-uri`, `js-yaml`, `postcss-selector-parser`, `brace-expansion`, `source-map-js` pinned past known advisories
- The one remaining `npm audit` finding, a `braces` denial-of-service advisory reachable only through `stylelint`'s own file-globbing with no non-breaking upstream fix (forcing it downgrades `stylelint` to 7.7.0), is left unforced and tracked internally

### Chore

- chore: `STANDARD/`, `hooks/`, `shared/contract.json` and `CLAUDE.md` removed from the repo; the Ad Astra project skeleton is never vendored into a project, per the skeleton's own policy. Local git hooks reach the skeleton by path; CI runs only the repo's own guards
- chore(eval): the weekly eval series is closed at sixteen runs; the roster eval moves from quarterly to a monthly cadence (`monthly-roster-eval.yml`), with `qwen3.8-27b` added as an eighth Workers AI roster slot

## v0.11.0 · 2026-05-01

### Features

- feat(replay): capture provider request IDs in eval and critique runners ([e1e8427](https://github.com/Ad-Astra-Computing/ahd/commit/e1e8427))

### Fixes

- fix(audit,screenshot): use load instead of networkidle for navigation ([972a0e4](https://github.com/Ad-Astra-Computing/ahd/commit/972a0e4))
- fix(verify-replay): resolve token + brief paths via report's repo root ([36d6712](https://github.com/Ad-Astra-Computing/ahd/commit/36d6712))

### CI / tooling

- ci: extract release gate into composite action ([a67ea5e](https://github.com/Ad-Astra-Computing/ahd/commit/a67ea5e))

### Refactoring

- refactor(core): extract chromium executable resolution ([f1d370b](https://github.com/Ad-Astra-Computing/ahd/commit/f1d370b))

**Full changelog:** https://github.com/Ad-Astra-Computing/ahd/compare/v0.10.0...HEAD

## v0.10.0 · 2026-04-28

### Features

- feat(eval): backfill replay sidecars for pre-0.10 reports ([15b641a](https://github.com/Ad-Astra-Computing/ahd/commit/15b641a))
- feat(cli): ahd verify-replay subcommand + REPLAY hash contract ([8c5a127](https://github.com/Ad-Astra-Computing/ahd/commit/8c5a127))
- feat(eval): wire replay capture into eval-live, critique, eval-image ([2c85f54](https://github.com/Ad-Astra-Computing/ahd/commit/2c85f54))
- feat(eval): replay schema + captureReplay helper ([4e3e150](https://github.com/Ad-Astra-Computing/ahd/commit/4e3e150))
- feat(mobile): add ahd/mobile/list-mark-alignment rule ([68d196e](https://github.com/Ad-Astra-Computing/ahd/commit/68d196e))

### CI / tooling

- ci: bump checkout + setup-node to v6 (Node 24 internal) ([25b478a](https://github.com/Ad-Astra-Computing/ahd/commit/25b478a))
- ci(monthly-vision-eval): add smoke_mode input ([d8df8eb](https://github.com/Ad-Astra-Computing/ahd/commit/d8df8eb))
- ci(release): use RELEASE_PAT for tag-release pushes ([8532c14](https://github.com/Ad-Astra-Computing/ahd/commit/8532c14))

### Tests

- test(parity): doc-vs-code drift checks for rules + CLI help ([5f1d56c](https://github.com/Ad-Astra-Computing/ahd/commit/5f1d56c))

**Full changelog:** https://github.com/Ad-Astra-Computing/ahd/compare/v0.9.0...HEAD

## v0.9.0 · 2026-04-26

### Features

- feat(governance): rule manifest + lifecycle status field ([beda37a](https://github.com/Ad-Astra-Computing/ahd/commit/beda37a))
- feat(mobile-rule): scrollable-no-affordance ([57c58a1](https://github.com/Ad-Astra-Computing/ahd/commit/57c58a1))
- feat(contracts): close remaining input-validation gaps ([0bc0187](https://github.com/Ad-Astra-Computing/ahd/commit/0bc0187))
- feat(contracts): MCP input validation + LINTER_SPEC parity ([b89b4c1](https://github.com/Ad-Astra-Computing/ahd/commit/b89b4c1))
- feat(contracts): tighten correctness across docs, MCP, briefs, manifest ([b10148a](https://github.com/Ad-Astra-Computing/ahd/commit/b10148a))
- feat(lint): token-aware linting via lint-overrides + meta anchor ([7ac44e2](https://github.com/Ad-Astra-Computing/ahd/commit/7ac44e2))

### Fixes

- fix(packaging): drop prepare entirely; prepublishOnly handles publish ([305e912](https://github.com/Ad-Astra-Computing/ahd/commit/305e912))
- fix(packaging): use prepublishOnly for full build, prepare stays as tsc ([6b5a2ea](https://github.com/Ad-Astra-Computing/ahd/commit/6b5a2ea))
- fix(flake): skip install-time scripts so prepare does not break Nix build ([991c45c](https://github.com/Ad-Astra-Computing/ahd/commit/991c45c))
- fix(packaging): ship rules.manifest + schemas to npm; prepare runs build ([5c2efd7](https://github.com/Ad-Astra-Computing/ahd/commit/5c2efd7))
- fix(flake): copy packages/ in installPhase ([0afe1ee](https://github.com/Ad-Astra-Computing/ahd/commit/0afe1ee))

### Performance

- perf(execution): plugin lint-once cache + eval sample concurrency ([464ee8c](https://github.com/Ad-Astra-Computing/ahd/commit/464ee8c))

### CI / tooling

- ci: add explicit Build step before Test in ci + tag-release ([9c61021](https://github.com/Ad-Astra-Computing/ahd/commit/9c61021))
- ci(flake): auto-sync version + npmDepsHash ([f5dbefe](https://github.com/Ad-Astra-Computing/ahd/commit/f5dbefe))

### Documentation

- docs(roadmap): chronicle v0.7-0.9 + plan v0.10 ([f800081](https://github.com/Ad-Astra-Computing/ahd/commit/f800081))
- docs(readme): name vision and mobile rule counts ([9dc8696](https://github.com/Ad-Astra-Computing/ahd/commit/9dc8696))
- docs(linter-spec): mobile section + scrollable-no-affordance ([dc15e6a](https://github.com/Ad-Astra-Computing/ahd/commit/dc15e6a))
- docs: agent-targeted contribution contract ([4ac1dbc](https://github.com/Ad-Astra-Computing/ahd/commit/4ac1dbc))
- docs(evals): post-digital-green n=30 with gpt-5.5 cell ([a82a8f2](https://github.com/Ad-Astra-Computing/ahd/commit/a82a8f2))

### Tests

- test(mobile-rule): browser fixtures for scrollable-no-affordance ([6cf1949](https://github.com/Ad-Astra-Computing/ahd/commit/6cf1949))

**Full changelog:** https://github.com/Ad-Astra-Computing/ahd/compare/v0.8.3...HEAD
