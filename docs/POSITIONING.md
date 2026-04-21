# Positioning

## What AHD is

AHD is a **guardrail and evaluation layer for AI-generated design** — web UI, graphic design, illustration, image generation. It is not a generator itself; it sits beside any generator and measures whether the output exhibits the specific, repeated failure modes that mark AI-generated design as AI-generated.

Four pieces, one purpose:

1. **A named taxonomy of AI design slop.** Thirty-eight concrete tells across web, graphic and typographic surfaces. 28 decidable from source (HTML / CSS / SVG), 9 decidable only from rendered pixels. The taxonomy is the product's spine; every rule and every token traces back to it.
2. **Style tokens as promptable design direction.** Eight curated bundles (Swiss-Editorial, Neubrutalist-Gumroad, Post-Digital-Green, Manual-SF, Memphis-Clash, Heisei-Retro, Monochrome-Editorial, Bauhaus-Revival) that span web, editorial, identity and illustration. Each declares grid, type, palette, forbidden list, required quirks, reference lineage and per-model prompt fragments.
3. **A brief compiler.** Turns a structured intent into constrained model instructions for any surface (`surfaces: [web, print, identity, illustration]`), with a `final` mode for single-shot output and a `draft` mode for human-in-the-loop exploration.
4. **An empirical eval loop.** A controlled raw-vs-compiled comparison across any set of text or image generators, scored against the taxonomy, with attempted vs scored counts, canonical model ids, per-model deltas and per-tell frequency. Vision critique on rendered pixels via a multimodal critic.

## What's shipped today

- **Web UI, end-to-end.** Brief compiler → compiled prompts → text-to-HTML runners (Claude, GPT, Gemini, Cloudflare Workers AI OSS models, Ollama) → Playwright screenshots → source linter (28 rules) + vision critic (9 rules) → per-cell reports. Measured run: [docs/evals/2026-04-21-swiss.md](docs/evals/2026-04-21-swiss.md).
- **Graphic-direction tokens.** Memphis Clash, Bauhaus Revival, Heisei Retro, Monochrome Editorial exist and validate; their prompt fragments anchor illustration and identity work, not only web.
- **Illustration tells in the taxonomy.** Corporate Memphis, AI illustration with subsurface-scatter glow, iridescent 3D blobs, stock team-at-laptop photography, monoline default icon sets — five of the 38 rules are graphic / illustration tells, checked by the vision critic.
- **Image-agnostic vision critic.** Accepts any rendered PNG, so it already works on generated illustration or ad creative — not only on rendered HTML.

## What's on the roadmap as its own vertical

Image generation end-to-end. The taxonomy and vision critic already span it; the runner and eval pipeline do not yet.

- **Image-generation runners.** Adapters for FLUX, Stable Diffusion XL, Imagen 3, DALL·E 3, Firefly, and the image models on Cloudflare Workers AI (`@cf/black-forest-labs/flux-1-schnell`, `@cf/bytedance/stable-diffusion-xl-lightning`, `@cf/lykon/dreamshaper-8-lcm`). Same `ModelRunner` interface as the text runners.
- **Image-first eval pipeline.** `ahd eval-image <token> --brief <brief.yml> --models <image-specs> --n N` that saves generated PNGs directly (no HTML intermediary) and scores them with the vision critic against the illustration and graphic tells.
- **SVG / vector linter.** A source-level checker for SVG and illustration output (monoline-uniform stroke, symmetry heuristics, palette-bounds checks against the token's OKLCH palette) so vector-format generators get source-level scoring too.
- **Extended taxonomy.** Tells specific to image generation: six-finger hands, shiny 3D-blob characters, Midjourney face-symmetry, over-sampled rule-of-thirds composition, decorative cursive in renders. Each added entry comes with exemplars and a critic prompt.

See [docs/ROADMAP.md](docs/ROADMAP.md) for sequencing.

## What AHD is not

- **Not a prompt pack.** Prompt packs sell style recipes. AHD's value is the reproducible scoring that tells you whether any recipe — ours or yours — actually moves a given model off its median.
- **Not a canvas product.** Galileo, Subframe, v0, Lovable, Bolt, Magic Patterns all optimise "prompt → shipped UI"; Midjourney / Krea / Lovart optimise "prompt → image". AHD sits *beside* any of them as an enforcement layer.
- **Not a design system.** Design systems (Material, shadcn, etc.) prescribe components; AHD prescribes *negatives* — the thirty-eight patterns a page or image must not exhibit — and measures compliance.

## What makes this defensible

The moat is not the prompts. The moat is **the taxonomy plus reproducible scoring.**

- A prompt anyone can rewrite. A named, versioned taxonomy with deterministic lint rules and a vision critic is an artefact that compounds with use.
- A style token anyone can fork. A per-release eval harness that publishes attempted counts, extraction failures, exact model ids, confidence intervals and negative results is a cultural commitment competitors rarely match.
- A benchmark like UI Bench scores *a single page in isolation*. AHD scores *a model under a specific brief under a specific intervention*, with a paired raw-vs-compiled control — and will extend the same controlled comparison to image generators.

## Prior art

Pieces of AHD exist in the wild. The combination — across both web and image generation — does not.

- **Prompt libraries for AI UI generation** — [uiprompt.io](https://uiprompt.io/), [Promter](https://promter.dev/), GenDesigns, WebGardens. Structured prompts and style recipes targeting v0, Lovable, Bolt, Claude, Cursor. Overlap: they encode style direction; they do not carry a taxonomy or an eval.
- **Prompt libraries for image generation** — Lexica, Civitai prompt packs, PromptHero. Overlap: curated directions. Divergence: no evaluation of whether the generator actually follows them, no slop taxonomy for images.
- **Design-token linting in code** — [`@lapidist/design-lint`](https://design-lint.lapidist.net/), [`stylelint-design-tokens-plugin`](https://www.npmjs.com/package/stylelint-design-tokens-plugin). Enforce token / component consistency. Overlap: source-level rules. Divergence: AHD's rules target AI-generated anti-patterns, not adherence to an internal design system.
- **Figma / design-system audit tools** — [DesignLint AI](https://www.designlintai.tech/). Audits Figma files against token rules. Divergence: AHD audits rendered output and source, not design files.
- **AI UI benchmarks** — [UI Bench](https://ui-bench.dev/). Scores generated HTML on engineering quality (axe, Lighthouse, semantics). Divergence: UI Bench rates a page's *engineering quality*; AHD rates a page's *slop fingerprint* against a named taxonomy under a paired raw-vs-compiled control.
- **Image-generation benchmarks** — T2I-CompBench, GenAI-Bench, ImageEval. Score composition, prompt adherence, aesthetics. Divergence: AHD is slop-specific: *does the image exhibit named, avoidable AI-illustration failure modes* — not *is this image good in the abstract*.

The differentiator, plainly: **nobody else bundles a named AI-slop taxonomy spanning both web and image, a token-driven brief compiler, a deterministic linter for source-checkable tells, a vision critic for rendered tells, and a raw-vs-compiled empirical eval** into one reproducible project.

## What we promise, what we don't

We promise:

- An honest, versioned taxonomy that spans web, graphic and illustration surfaces.
- A deterministic, source-level linter for every taxonomy entry that can be decided from code (HTML / CSS today; SVG and vector on the roadmap).
- A vision-critic pipeline that works on any rendered image — web screenshot or generated illustration.
- An eval harness that publishes attempted / extracted / scored counts, canonical model ids, per-model deltas — including negative results.
- Style tokens that declare their forbidden lists, required quirks and references publicly.

We do not promise:

- That the compiled brief beats the raw brief for every model. It does not. Published results include Claude Opus 4.7 dropping slop tells to zero, Qwen 2.5 Coder being unmoved, and Llama 3.3 70B *regressing* under the long compiled prompt. The framework exposes these differences; it does not paper over them.
- Aesthetic judgement. The linter catches *tells*, not *taste*. A page or image can pass every rule and still be bad design. AHD narrows the output; a human still picks.
- Coverage of every modality at once. Web is end-to-end today; image generation is on the roadmap as the next vertical with honest boundaries on what's shipped versus shipping.

## The one-line version

*AHD measures and reduces specific repeated AI design failures, across web and image generation.* Everything else in the repo serves that sentence.
