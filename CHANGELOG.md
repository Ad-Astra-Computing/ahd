# Changelog

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
