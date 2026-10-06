import { spawn } from "node:child_process";
import { mkdtemp, rm, copyFile, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

// GPT-via-Codex-CLI runner. Drives `codex exec` in non-interactive
// mode with the sandbox flag set so file writes are blocked at the
// OS layer, and parses the JSONL event stream to extract the final
// `agent_message` text.
//
// Invocation shape (April 2026):
//   codex exec --sandbox read-only --skip-git-repo-check \
//     --config model='"gpt-5.4"' --json - <<<"$PROMPT"
//
// Codex CLI does not expose a clean `--system-prompt` flag, so the
// system instruction is prepended to the user prompt with a
// "SYSTEM INSTRUCTIONS:" marker; the model treats it as in-context
// preamble. Not as surgical as Claude's --system-prompt-file, but
// combined with read-only sandbox and an explicit "output only
// raw HTML, do not narrate" framing in the system text, it keeps
// Codex from writing files or saying "I have created …".
//
// --json emits JSONL events; we collect `item.completed` and
// `agent_message` entries, then return the final agent_message's
// text content as rawResponse. The linter / extractor handles
// pulling the HTML out of it.

export interface CodexCliOptions {
  model?: string;       // e.g. "gpt-6-codex", "gpt-5.3-codex"
  binary?: string;      // defaults to `codex` on PATH
  timeoutMs?: number;   // per-call timeout, default 240_000
  spawnImpl?: typeof spawn; // injected for tests, defaults to node:child_process.spawn
}

// The model id rides straight into a TOML `--config model="<id>"`
// override (see below); a `"` in it would close that string early and
// let the rest of the id inject further config keys, including the
// sandbox mode. Operator-controlled today, but validated anyway since
// nothing legitimate needs characters outside this set.
const SAFE_MODEL_ID = /^[A-Za-z0-9._:/-]+$/;

export function codexCliRunner(options: CodexCliOptions = {}): ModelRunner {
  const model = options.model ?? "gpt-6-codex";
  if (!SAFE_MODEL_ID.test(model)) {
    throw new Error(`codex-cli: unsafe model id "${model}"`);
  }
  const binary = options.binary ?? "codex";
  const timeoutMs = options.timeoutMs ?? 240_000;
  const spawnImpl = options.spawnImpl ?? spawn;

  return {
    id: model,
    provider: "codex-cli",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const systemText = input.systemPrompt ?? DEFAULT_SYSTEM;
      const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemText}\n\n---\n\n${input.userPrompt}`;

      // Isolation contract:
      //  1. Run cwd is an empty tempdir. read-only sandbox blocks writes
      //     but NOT reads — without the tempdir the model could be
      //     prompt-injected into reading .env, source files, or anything
      //     else in the repo. Clean cwd + no files = nothing to read.
      //  2. Env is minimised to PATH + HOME only. No API keys, no AHD
      //     config, nothing a model could exfiltrate via shell tools.
      //  3. Prompt body is written to a 0600 tempfile and passed as
      //     stdin; never as argv. argv leaks through `ps` listings and
      //     has length limits on some platforms.
      //  4. Sandbox stays read-only (defence in depth); if the model
      //     calls the shell tool it can only read this empty dir.
      //  5. Approval is only for escalating past the declared sandbox;
      //     read-only is already the floor, so there is nothing for
      //     codex exec to prompt about.
      //  6. auth.json lives under CODEX_HOME, outside HOME/cwd (see
      //     the copy step below), so a prompt-injected shell read
      //     can never reach the live token.
      const workdir = await mkdtemp(join(tmpdir(), "ahd-codex-run-"));
      const codexHome = await mkdtemp(join(tmpdir(), "ahd-codex-home-"));
      const minimalEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: workdir,
        CODEX_HOME: codexHome,
        // USER / LOGNAME required on macOS for keychain lookups even
        // when the CLI reads auth from a file; the OpenAI CLI's TLS /
        // certificate verification path touches Keychain too.
        USER: process.env.USER,
        LOGNAME: process.env.LOGNAME,
      };
      try {
        // Copy only auth.json, not history or config, and only into
        // CODEX_HOME, outside the sandboxed cwd the shell tool reaches.
        if (process.env.HOME) {
          const realAuth = join(process.env.HOME, ".codex", "auth.json");
          if (existsSync(realAuth)) {
            const fakeAuth = join(codexHome, "auth.json");
            await copyFile(realAuth, fakeAuth);
            await chmod(fakeAuth, 0o600);
          }
        }

        const args = [
          "exec",
          "--sandbox",
          "read-only",
          "--skip-git-repo-check",
          "--config",
          `model="${model}"`,
          "--json",
          "-", // read prompt from stdin
        ];

        const start = Date.now();
        const stdout = await runCodex(binary, args, timeoutMs, {
          cwd: workdir,
          env: minimalEnv,
          stdin: combinedPrompt,
          spawnImpl,
        });
        const latencyMs = Date.now() - start;

        // Parse JSONL. We want the LAST agent_message event; Codex may
        // emit several (tool-call narration, intermediate reasoning).
        // The final agent_message is the authoritative completion.
        // Codex's actual emitted shape for finished messages is
        // `{"type":"item.completed","item":{"type":"agent_message","text":"..."}}`
        // — read `evt.item.text` first. Earlier versions of this runner
        // missed that field and fell through to stdout scanning, which
        // pulled JSON-escaped HTML out of the raw event stream verbatim
        // (every `\n` and `\"` written to disk as two characters). That
        // bug is why gpt-5.4 samples in the 22 April 2026 n=30 run were
        // stored as escaped strings; fixed in the taxonomy-page errata
        // on ahd.adastra.computer and re-linted against decoded HTML.
        let finalText = "";
        for (const line of stdout.split("\n")) {
          if (!line.trim().startsWith("{")) continue;
          try {
            const evt = JSON.parse(line);
            const isAgentMessage =
              evt?.type === "agent_message" ||
              evt?.event === "agent_message" ||
              evt?.item?.type === "agent_message";
            if (!isAgentMessage) continue;

            const raw =
              evt.item?.text ??
              evt.text ??
              evt.content ??
              evt.item?.content ??
              (Array.isArray(evt.item?.content)
                ? evt.item.content.map((c: any) => c.text ?? "").join("")
                : "");
            const text = typeof raw === "string" ? raw : "";
            if (text.length) finalText = text;
          } catch {
            // Non-JSON lines get ignored; Codex occasionally prints
            // warnings before the event stream.
          }
        }

        // Fallback: if we couldn't parse a structured message, treat
        // the whole stdout as raw text and let the extractor try.
        const rawResponse = finalText || stdout;
        const html = extractHtmlBlock(rawResponse);

        return { model, html, rawResponse, latencyMs };
      } finally {
        await rm(workdir, { recursive: true, force: true });
        await rm(codexHome, { recursive: true, force: true });
      }
    },
  };
}

interface RunOpts {
  cwd: string;
  env: NodeJS.ProcessEnv;
  stdin?: string;
  spawnImpl: typeof spawn;
}

function runCodex(
  bin: string,
  args: string[],
  timeoutMs: number,
  opts: RunOpts,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = opts.spawnImpl(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      cwd: opts.cwd,
      env: opts.env,
    });
    if (opts.stdin !== undefined) {
      proc.stdin.write(opts.stdin);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`codex CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`codex CLI spawn failed: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(
          new Error(
            `codex CLI exited ${code}: ${stderr.slice(0, 400)}${stderr.length > 400 ? "…" : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

const DEFAULT_SYSTEM = `You are a pure text generator. Never call tools. Never claim to create files. Never narrate your actions. Your entire response is the deliverable, verbatim, with no preamble and no postamble.`;
