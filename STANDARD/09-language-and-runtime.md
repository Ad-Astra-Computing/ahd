# Language and runtime

Pick where the work runs first, then the best language that runtime
supports. Not the other way around. Most Ad Astra projects run on
Cloudflare Workers, which constrains the language to what Workers
supports well.

## Choosing

1. Write down the runtime shape before naming a language: the latency
   budget, the execution-time and memory ceilings, and whether it needs
   a persistent process, native binaries, a GPU, a filesystem or a full
   POSIX environment. Pick the runtime from those facts.
2. Default to Cloudflare Workers and confirm the fit: short
   request-driven execution, no long-running process, no heavy native
   dependency, no GPU, bounded memory. If it fits, the runtime is
   Workers.
3. Do not use Workers when the workload breaks that model. A
   long-running or always-on process, a heavy native dependency, GPU
   work, a large-memory or long compute job, or anything needing a full
   POSIX environment belongs in a container, a VM or a batch job. A
   Worker can still be the thin front door that triggers it.
4. On Workers, default to TypeScript. It is native, stable and the
   best-supported path.
5. Override the default only for a concrete reason, within the supported
   languages. Rust through workers-rs for CPU-heavy or
   correctness-critical logic. Python only when a Python-only library or
   skill is decisive, and only with its open-beta status and package
   limits accepted. C, C++ or Go through WebAssembly only to reuse a
   proven library, with TinyGo for Go to fit the size limit.
6. Record the runtime, the language and the reason in the project
   README. For a beta dependency such as Python on Workers, add a review
   date, because beta limits change.

## Supported languages

- JavaScript and TypeScript: native and stable, the default.
- Rust: production-capable through workers-rs and WebAssembly, at the
  cost of build complexity and binary size.
- Python: open beta on Pyodide. Usable for real work, not for anything
  under an SLA. Packages install at deploy time, not at runtime.
- C, C++ and Go: through WebAssembly, niche. Go needs TinyGo to fit the
  size limit.
- Other WebAssembly targets: experimental, prototype only.

## Sources

- Workers languages: https://developers.cloudflare.com/workers/languages/
- Python Workers: https://developers.cloudflare.com/workers/languages/python/
- Rust on Workers: https://developers.cloudflare.com/workers/languages/rust/
- WebAssembly: https://developers.cloudflare.com/workers/runtime-apis/webassembly/
