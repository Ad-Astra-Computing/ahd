import { spawn } from "node:child_process";
import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

// Claude-via-Claude-Code-CLI runner. Drives the `claude` binary in
// non-interactive print mode with the minimum-framing flag set so the
// output approximates a raw /v1/messages response rather than an
// agent transcript.
//
// Invocation shape (verified live against Claude Code 2.1.117):
//   claude -p --tools "" --no-session-persistence \
//     --system-prompt <string> --model <id> --output-format text "$PROMPT"
//
// Flag rationale:
//   -p / --print          non-interactive, stdout-and-exit.
//   --tools ""            disable every built-in tool. No file writes,
//                         no bash, no web fetch. Without tools there
//                         is no agent loop to iterate on — max-turns
//                         would be meaningless.
//   --no-session-persistence
//                         nothing written to disk about this run.
//   --system-prompt       REPLACES the default agent system prompt
//                         (vs --append-system-prompt, which keeps it).
//                         This is the lever that removes "I will create
//                         a file..." framing. Passed as a CLI string.
//   --output-format text  raw completion, no JSON envelope.
//
// NOTE: --bare was tempting (minimum framing) but forces
// ANTHROPIC_API_KEY / apiKeyHelper auth and disables OAuth +
// keychain. That defeats subscription-backed inference, which is
// the whole point of this runner. Without --bare, claude reads the
// logged-in session (Pro / Max subscription) and bills against it.
// --tools "" + --system-prompt replacement already removes the
// agent framing we cared about.
//
// stdin is explicitly closed (not inherited) because claude waits
// 3s for stdin data otherwise and then warns.
//
// The subscription tier (Pro / Max5 / Max20) is whatever the user is
// signed into; no API key is ever read.
//
// Cost: zero beyond the user's subscription. Rate: subject to
// subscription 5-hour window caps and weekly caps; retry on HTTP-
// 529-equivalent failures is handled by claude CLI itself.

export interface ClaudeCodeCliOptions {
  model?: string;            // e.g. "claude-opus-4-7"
  binary?: string;           // override path; defaults to `claude` on PATH
  timeoutMs?: number;        // per-call timeout, default 180_000
}

export function claudeCodeCliRunner(
  options: ClaudeCodeCliOptions = {},
): ModelRunner {
  const model = options.model ?? "claude-opus-4-7";
  const binary = options.binary ?? "claude";
  const timeoutMs = options.timeoutMs ?? 180_000;

  return {
    id: model,
    provider: "claude-code-cli",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      // --system-prompt replaces the default framing entirely; using
      // --append-system-prompt instead would leave the agent prompt
      // in place and defeat the purpose of the escape hatch.
      const systemPrompt = input.systemPrompt ?? DEFAULT_SYSTEM;

      // User prompt goes via stdin, not argv. argv shows up in `ps`
      // listings and hits platform-specific length caps; stdin carries
      // arbitrary-length bodies and stays invisible to other processes.
      const args = [
        "-p",
        "--tools",
        "",
        "--no-session-persistence",
        "--system-prompt",
        systemPrompt,
        "--model",
        model,
        "--output-format",
        "text",
        "--input-format",
        "text",
      ];

      const start = Date.now();
      const stdout = await runClaude(binary, args, timeoutMs, input.userPrompt);
      const latencyMs = Date.now() - start;
      const html = extractHtmlBlock(stdout);
      return {
        model,
        html,
        rawResponse: stdout,
        latencyMs,
      };
    },
  };
}

function runClaude(
  bin: string,
  args: string[],
  timeoutMs: number,
  stdin: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ["pipe", "pipe", "pipe"] });
    proc.stdin.write(stdin);
    proc.stdin.end();
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`claude CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`claude CLI spawn failed: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `claude CLI exited ${code}: ${stderr.slice(0, 400)}${stderr.length > 400 ? "…" : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

const DEFAULT_SYSTEM = `You output only the content requested, verbatim. Never call tools. Never claim to create files. Your entire response is the deliverable with no preamble and no postamble.`;
