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

// Gemini-via-Gemini-CLI runner. The 21 April 2026 AHD run caught
// Gemini CLI interpreting the compiled brief as an agent task and
// returning "I have created the ahd-landing-page.html file as
// requested" with no usable HTML. Root cause: Gemini CLI wraps every
// invocation in its default hardcoded agent system prompt that
// heavily biases toward ReAct / tool-call behaviour.
//
// Fix, verified via Gemini CLI docs (April 2026):
//   Set GEMINI_SYSTEM_MD=/path/to/system.md. This env var REPLACES
//   Gemini CLI's default system prompt entirely. Without it, there
//   is no way to remove the agent framing — there's no
//   --system-prompt flag as of April 2026.
//
// Invocation shape:
//   GEMINI_SYSTEM_MD=<tmp>/system.md \
//     gemini -p "$PROMPT" --output-format text --model <id>
//
// Runs from a clean cwd (tempdir) because Gemini CLI auto-loads any
// GEMINI.md in the working directory and that would leak context
// across calls.
//
// Subscription limits: 60 RPM / 1000 req/day for personal account
// tier (Code Assist for Individuals) as of April 2026. Higher
// quotas on paid tiers.

export interface GeminiCliOptions {
  model?: string;       // e.g. "gemini-3-pro", "gemini-2.5-pro"
  binary?: string;      // defaults to `gemini` on PATH
  timeoutMs?: number;   // per-call timeout, default 180_000
}

export function geminiCliRunner(options: GeminiCliOptions = {}): ModelRunner {
  const model = options.model ?? "gemini-3-pro";
  const binary = options.binary ?? "gemini";
  const timeoutMs = options.timeoutMs ?? 180_000;

  return {
    id: model,
    provider: "gemini-cli",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      // Isolate cwd and write the system prompt. Gemini CLI reads
      // GEMINI.md from cwd by default; running from a fresh tempdir
      // prevents leak-across-calls, and pointing GEMINI_SYSTEM_MD
      // at our file replaces the default agent framing entirely.
      const tdir = await mkdtemp(join(tmpdir(), "ahd-gemini-cli-"));
      const sysPath = join(tdir, "system.md");
      const systemText = input.systemPrompt ?? DEFAULT_SYSTEM;
      await writeFile(sysPath, systemText);

      // Prompt via stdin. Gemini CLI requires -p to have an
      // argument (even empty), then appends it to stdin per the
      // --help contract. Passing "" means stdin carries the full
      // prompt and nothing meaningful leaks to argv.
      const args = [
        "-p",
        "",
        "--model",
        model,
        "--output-format",
        "text",
      ];

      // Minimal env: only what Gemini CLI needs to find its binaries
      // and its auth state. AHD config, API keys, and the rest of the
      // environment do not get forwarded.
      const minimalEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: process.env.HOME ?? "",
        GEMINI_SYSTEM_MD: sysPath,
      };

      const start = Date.now();
      try {
        const stdout = await runGemini(binary, args, timeoutMs, {
          cwd: tdir,
          env: minimalEnv,
          stdin: input.userPrompt,
        });
        const latencyMs = Date.now() - start;
        const html = extractHtmlBlock(stdout);
        return {
          model,
          html,
          rawResponse: stdout,
          latencyMs,
        };
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
        reject(
          new Error(
            `gemini CLI exited ${code}: ${stderr.slice(0, 400)}${stderr.length > 400 ? "…" : ""}`,
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
