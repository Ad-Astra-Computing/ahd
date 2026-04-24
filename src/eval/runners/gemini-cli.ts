import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

// Gemini-via-Gemini-CLI runner. Two stacked problems the 21 April run
// and the 22 April re-run exposed:
//
//   1. Gemini CLI wraps every invocation in its default hardcoded
//      agent system prompt ("I have created the ahd-landing-page.html
//      file as requested"). Fix: GEMINI_SYSTEM_MD env var REPLACES the
//      default framing entirely.
//
//   2. Gemini 3 access via OAuth-personal + AI Pro is fragile. Model
//      IDs must carry the `-preview` suffix (gemini-3.1-pro-preview,
//      gemini-3-flash-preview). `gemini-3-pro-preview` (no .1) is
//      capacity-limited and 429s under load. `gemini-3.1-pro-preview`
//      is the canonical Gemini 3 Pro ID and routes cleanly when
//      there's entitlement. Bare `gemini-3-pro` / `gemini-3` / other
//      dotless aliases do not exist and return ModelNotFoundError.
//
// Invocation shape:
//   GEMINI_SYSTEM_MD=<tmp>/system.md \
//     gemini -p "" --output-format text --model <id>   (prompt via stdin)
//
// Runs from a clean cwd (tempdir) because Gemini CLI auto-loads any
// GEMINI.md in the working directory and that would leak context
// across calls.
//
// Rate-limit workarounds baked in:
//   - retry with exponential backoff on transient errors (429, 5xx,
//     ModelNotFoundError which is sometimes a transient entitlement
//     flake, and "capacity" 429s)
//   - optional model fallback chain: if the primary model keeps
//     failing after retries, try the next model in the list. Useful
//     pattern: [gemini-3.1-pro-preview, gemini-3-flash-preview,
//     gemini-2.5-flash]. Report which model actually produced each
//     sample via rawResponse prefix so downstream attribution stays
//     honest.
//   - configurable inter-call delay to stay under per-minute caps
//     when the runner is driven in a tight loop. Defaults to 0; set
//     AHD_GEMINI_MIN_DELAY_MS or pass minDelayMs to stretch.

export interface GeminiCliOptions {
  model?: string;            // primary model id, e.g. "gemini-3.1-pro-preview"
  fallbackModels?: string[]; // tried in order after primary fails retries
  binary?: string;           // defaults to `gemini` on PATH
  timeoutMs?: number;        // per-call timeout, default 240_000
  maxRetries?: number;       // per-model retry count on transient errors
  minDelayMs?: number;       // minimum gap between calls (rate-limit smoothing)
}

// Regex set that signals "retry, probably" vs "hard fail". We err on
// the side of retrying because the cost is one extra call and the
// benefit is surviving a 429 burst without losing the sample.
const TRANSIENT_PATTERNS = [
  /429/, // rate-limit or capacity
  /5\d{2}/, // 5xx from backend
  /RESOURCE_EXHAUSTED/i,
  /capacity/i,
  /timeout/i,
  /ECONNRESET|ETIMEDOUT|EAI_AGAIN/,
  /quota/i,
  /retry/i,
];

function isTransient(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return TRANSIENT_PATTERNS.some((re) => re.test(msg));
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Tracks the wall-clock of the last successful call per-runner
// instance so minDelayMs applies across sequential invocations
// within the same runner, not just within a single run() call.
const lastCallAtByBinary = new Map<string, number>();

export function geminiCliRunner(options: GeminiCliOptions = {}): ModelRunner {
  const primary = options.model ?? "gemini-3.1-pro-preview";
  const fallbacks = options.fallbackModels ?? [
    "gemini-3-flash-preview",
    "gemini-2.5-flash",
  ];
  const binary = options.binary ?? "gemini";
  const timeoutMs = options.timeoutMs ?? 240_000;
  const maxRetries = options.maxRetries ?? 3;
  const minDelayMs =
    options.minDelayMs ??
    (process.env.AHD_GEMINI_MIN_DELAY_MS
      ? parseInt(process.env.AHD_GEMINI_MIN_DELAY_MS, 10)
      : 0);

  const modelsToTry = [primary, ...fallbacks];

  return {
    id: primary,
    provider: "gemini-cli",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      // Inter-call spacing. Respects minDelayMs across runner instances
      // sharing the same binary path. When the caller is running n=30
      // samples in a tight loop we can hold to e.g. 5 RPM without
      // hand-writing a scheduler at the eval layer.
      if (minDelayMs > 0) {
        const lastAt = lastCallAtByBinary.get(binary) ?? 0;
        const elapsed = Date.now() - lastAt;
        if (elapsed < minDelayMs) {
          await sleep(minDelayMs - elapsed);
        }
      }

      const tdir = await mkdtemp(join(tmpdir(), "ahd-gemini-cli-"));
      const sysPath = join(tdir, "system.md");
      const systemText = input.systemPrompt ?? DEFAULT_SYSTEM;
      await writeFile(sysPath, systemText);

      const minimalEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: process.env.HOME ?? "",
        // USER / LOGNAME required on macOS for keychain-backed
        // subscription auth. See note in claude-code-cli.ts.
        USER: process.env.USER,
        LOGNAME: process.env.LOGNAME,
        GEMINI_SYSTEM_MD: sysPath,
      };

      let lastErr: unknown;
      try {
        for (const model of modelsToTry) {
          for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const args = [
              "-p",
              "",
              "--model",
              model,
              "--output-format",
              "text",
            ];
            const start = Date.now();
            try {
              const stdout = await runGemini(binary, args, timeoutMs, {
                cwd: tdir,
                env: minimalEnv,
                stdin: input.userPrompt,
              });
              const latencyMs = Date.now() - start;
              const html = extractHtmlBlock(stdout);
              lastCallAtByBinary.set(binary, Date.now());
              return {
                model, // actual model that produced the sample
                html,
                rawResponse: stdout,
                latencyMs,
              };
            } catch (err) {
              lastErr = err;
              if (!isTransient(err) || attempt === maxRetries) break;
              // Exponential backoff with jitter: 1s, 2s, 4s, 8s capped.
              const base = Math.min(8_000, 1_000 * Math.pow(2, attempt));
              const jitter = Math.floor(Math.random() * 500);
              await sleep(base + jitter);
            }
          }
          // Primary model failed all retries; try the next fallback.
        }
        // Every model in the chain failed. Surface the last error.
        throw lastErr instanceof Error
          ? lastErr
          : new Error(String(lastErr ?? "gemini CLI failed with no error captured"));
      } finally {
        await rm(tdir, { recursive: true, force: true });
      }
    },
  };
}

function runGemini(
  bin: string,
  args: string[],
  timeoutMs: number,
  opts: { cwd: string; env: NodeJS.ProcessEnv; stdin: string },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: opts.cwd,
      env: opts.env,
    });
    proc.stdin.write(opts.stdin);
    proc.stdin.end();
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`gemini CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`gemini CLI spawn failed: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        // Gemini CLI writes its structured error to stdout in some
        // versions and stderr in others; fold both into the error so
        // isTransient() can classify either.
        const merged = stderr || stdout;
        reject(
          new Error(
            `gemini CLI exited ${code}: ${merged.slice(0, 400)}${merged.length > 400 ? "…" : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

// The system prompt reshapes the task from imperative ("create an
// HTML page") to declarative ("output the HTML source") AND bars
// tool calls. Both are necessary; declarative alone isn't enough
// with Gemini CLI's default framing, and the framing-replacement
// alone doesn't fix an imperative "create" prompt.
const DEFAULT_SYSTEM = `You are a pure text generator. Never call tools. Never write files. Never claim to create anything. Your entire response is the deliverable verbatim, output to stdout, with no preamble, no postamble, and no explanatory narration. When asked for an HTML page, your response must begin with <!doctype html> or <html and end with </html>. Output nothing else.`;
