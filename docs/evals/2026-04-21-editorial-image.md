# ahd eval-image · editorial-illustration · 2026-04-21T22:16:54.016Z

- Brief: `briefs/editorial-illustration.yml`
- Samples per cell: **3**

## Per-model slop reduction (vision critic)

| model | raw attempted → critiqued | compiled attempted → critiqued | raw mean tells | compiled mean tells | Δ | reduction |
|---|---:|---:|---:|---:|---:|---:|
| `@cf/black-forest-labs/flux-1-schnell` | 3 → 3 | 3 → 3 | 1.33 | 0.67 | 0.67 | 50.0% |
| `@cf/bytedance/stable-diffusion-xl-lightning` | 3 → 3 | 3 → 3 | 1.33 | 1.33 | 0.00 | 0.0% |

## Per-tell frequency

| tell | @cf/black-forest-labs/flux-1-schnell/raw | @cf/black-forest-labs/flux-1-schnell/compiled | @cf/bytedance/stable-diffusion-xl-lightning/raw | @cf/bytedance/stable-diffusion-xl-lightning/compiled |
|---|---:|---:|---:|---:|
| ahd/no-corporate-memphis | 67% | 0% | 67% | 67% |
| ahd/require-asymmetry | 67% | 67% | 67% | 67% |

## Caveats
- Image samples are scored by the vision critic over the AHD vision ruleset (13 rules: 9 web/graphic + 4 image-specific).
- The critic is itself an LLM. Verdicts are not independent of model training; run with --critic mock for deterministic tests and report both.
- Per-cell counts are separate: attempted (runs initiated) / errored (API errors) / critiqued (scored). A large gap indicates rate-limit or generator failures, not that a run 'passed' the taxonomy.
- Raw condition: brief as prose with no AHD style direction or forbidden list. Compiled condition: token-driven positive + negative prompts.
- The compiled negative prompt includes image-specific slop patterns (corporate memphis, malformed anatomy, iridescent blobs, decorative cursive). The raw condition does not.