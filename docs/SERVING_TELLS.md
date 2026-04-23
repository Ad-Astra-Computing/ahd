# Serving Tells

Named failure modes that happen at the model-host, chat-template, or API-surface layer rather than in the model's output. Distinct from the [slop taxonomy](./SLOP_TAXONOMY.md), which catalogs failure modes in what the model *produces*. Serving tells catalog failure modes in what the infrastructure *does to* what the model produces.

Both axes matter for an honest eval. A model can emit perfect output and still produce zero visible result because the serving layer ate it. A benchmark that treats "model" and "model-as-served-by-provider-X" as interchangeable hides this distinction.

Every serving tell below is a real behaviour observed during AHD eval runs and is reproducible against a named host plus a specific release window.

## Chat-template and prompt-template pathologies

### 1. Hidden reasoning eating the output budget

**Observed:** Cloudflare Workers AI running Kimi K2.6 (released 20 April 2026), cross-provider swiss-editorial n=30 run, 22 April 2026.

A model with thinking-mode on by default spends its entire `max_completion_tokens` budget on hidden chain-of-thought before emitting any visible content. The HTTP response returns `200 OK` with `content: null`. The caller sees an empty body.

**Diagnostic signature:**
- HTTP 200
- `choices[0].message.content` is `null` or empty string
- `usage.completion_tokens` approaches or equals the requested max
- Latency is long (tens of seconds on API, potentially minutes on constrained inference tiers)
- Pattern is systematic under non-trivial system prompts, not stochastic

**What prompt-level instructions can and cannot do:**
- Prompt-body text like "no reasoning, no prose commentary" is parsed by the model as instruction about the *visible response*. It does not touch the hidden reasoning phase.
- System-prompt directives behave the same way: still visible-response-layer.
- Only chat-template flags rendered into the model's pre-tokenizer template actually disable reasoning. These are infrastructure, not prompt.

For Kimi K2.6 on CF Workers AI the template-layer flag is `chat_template_kwargs: { thinking: false }`. It replaced the K2.5-era `enable_thinking: false`. This rename between consecutive releases means any client that targeted K2.5's knob is silently a no-op on K2.6; the HTTP surface happily accepts the old key and ignores it.

**Mitigation:**
1. Send the current template-layer flag for every thinking-mode model your runner targets. Keep the mapping keyed by model ID plus release window.
2. Use `max_completion_tokens` instead of `max_tokens` where the provider has deprecated the latter — CF Workers AI currently accepts both but semantics drift.
3. When a cell shows ≥50% empty responses with long latency, treat it as thinking-exhaustion before concluding the model "produced nothing on this brief."
4. Name the serving path in every report cell. "Kimi K2.6 via CF Workers AI, 22 April 2026" is a different benchmark target than "Kimi K2.6 via Moonshot API" or "Kimi K2.6 self-hosted on vLLM." Same weights, different serving defaults, different template.

**Why prompt-level workarounds don't work:**
Natural-language prompt constraints do not traverse chat-template boundaries. A model operator that bakes behaviour into the chat template controls an abstraction layer the prompt cannot reach. Eval methodologies that claim to be "prompt-controlled" should qualify: *prompt-controlled given whatever chat-template the model host ships*. Template defaults are infrastructure.

**AHD runner fix applied 22 April 2026:**
`src/eval/runners/workers-ai.ts` injects `chat_template_kwargs: { thinking: false }` when the model spec matches `@cf/moonshotai/kimi-k2.6` or later. Verification probe: compiled-condition sample went from 0 bytes to 11.3 KB of valid HTML on the same brief.

## What this list is not

This document does not catalog:
- Network transport errors (5xx, connection resets, timeouts surfaced as timeouts)
- Rate-limit 429s with clear error bodies
- Model-weight-level quality regressions (those belong in a benchmark's results, not a tells list)
- Infrastructure outages (those are incidents, not named patterns)

Serving tells are **reproducible behaviours of specific host plus specific release plus specific prompt-shape** that can be worked around by a well-written runner once named. The list grows as more are identified; it shrinks only when a host removes the underlying mechanism (e.g. changes the default).

## How to propose an entry

A candidate serving tell should meet all four:

1. **Named.** A short noun phrase that describes the behaviour, not the cause.
2. **Host-specific or template-specific.** "Model X does Y" is out of scope; "Model X as served by Host H in release R does Y" is in scope.
3. **Reproducible.** The eval run that discovered it should be cite-able and the diagnostic signature should let another operator reproduce the failure.
4. **Has a named mitigation.** If there's no path to a fix, it belongs in a methodology caveat, not here.

## Sources

- [Cloudflare changelog, Kimi K2.6 release, 20 April 2026](https://developers.cloudflare.com/changelog/post/2026-04-20-kimi-k2-6-workers-ai/)
- [cloudflare/workers-sdk issue #13239](https://github.com/cloudflare/workers-sdk/issues/13239) (K2.5 precedent for the same pathology under the older `enable_thinking` knob)
- [Kimi K2.6 model page on Cloudflare](https://developers.cloudflare.com/workers-ai/models/kimi-k2.6/)
- AHD eval run [2026-04-22-swiss-n30](./evals/2026-04-22-swiss-n30.md), section "Serving-layer findings"
