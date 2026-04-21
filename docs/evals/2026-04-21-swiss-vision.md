# ahd critique · swiss-editorial · 2026-04-21T21:53:58.770Z
critic: `claude-opus-4-7-critic`

## Vision-only rules fired (critic vs. ruleset)

| rule | raw (n=10) | compiled (n=11) |
|---|---:|---:|
| ahd/bento-has-anchor | 0% | 0% |
| ahd/icons-not-monoline-default | 0% | 0% |
| ahd/mesh-has-counterforce | 10% | 0% |
| ahd/no-ai-illustration | 0% | 0% |
| ahd/no-corporate-memphis | 0% | 0% |
| ahd/no-iridescent-blob | 0% | 0% |
| ahd/no-laptop-office-stock | 0% | 0% |
| ahd/require-asymmetry | 0% | 0% |
| ahd/wordmark-not-dot-grotesque | 0% | 0% |

## Per-sample findings

- _cf_meta_llama-3.3-70b-instruct-fp8-fast/raw/sample-001.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/raw/sample-002.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/raw/sample-003.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/raw/sample-004.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/raw/sample-005.html — 1 tell
    - `ahd/mesh-has-counterforce`: No display-size typographic anchor is present; all text is small monospace body copy with no >=72px negative-tracked headline.
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/compiled/sample-001.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/compiled/sample-002.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/compiled/sample-003.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/compiled/sample-004.html — ✓ no vision tells
- _cf_meta_llama-3.3-70b-instruct-fp8-fast/compiled/sample-005.html — ✓ no vision tells
- _cf_meta_llama-4-scout-17b-16e-instruct/raw/sample-001.html — ✓ no vision tells
- _cf_meta_llama-4-scout-17b-16e-instruct/raw/sample-004.html — ✓ no vision tells
- _cf_meta_llama-4-scout-17b-16e-instruct/compiled/sample-005.html — ✓ no vision tells
- _cf_mistralai_mistral-small-3.1-24b-instruct/compiled/sample-001.html — ✓ no vision tells
- _cf_qwen_qwen2.5-coder-32b-instruct/raw/sample-002.html — ✓ no vision tells
- _cf_qwen_qwen2.5-coder-32b-instruct/compiled/sample-003.html — ✓ no vision tells
- claude-opus-4-7/raw/sample-002.html — ✓ no vision tells
- claude-opus-4-7/raw/sample-005.html — ✓ no vision tells
- claude-opus-4-7/compiled/sample-002.html — ✓ no vision tells
- claude-opus-4-7/compiled/sample-003.html — ✓ no vision tells
- claude-opus-4-7/compiled/sample-005.html — ✓ no vision tells