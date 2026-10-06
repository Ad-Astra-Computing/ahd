import { spawn } from "node:child_process";
import { mkdtemp, rm, mkdir, copyFile, chmod } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  ModelRunner,
  ModelRunnerInput,
  ModelRunnerOutput,
} from "./types.js";
import { extractHtmlBlock } from "./types.js";

// Gemini-via-Antigravity-CLI runner, replacing gemini-cli.ts. Verified
// live against antigravity-cli 1.2.17. `--print` takes its value
// inline; there is no stdin path, so the prompt rides argv. Output is
// one JSON object on stdout, status "SUCCESS" or "ERROR". --sandbox
// does not scope filesystem reads (verified live), so HOME is never
// the real home directory; see the HOME assignment below.

export interface AntigravityCliOptions {
  model?: string;   // e.g. "gemini-3.1-pro-high"
  binary?: string;  // defaults to `agy` on PATH
  timeoutMs?: number; // per-call timeout, default 240_000
  spawnImpl?: typeof spawn; // injected for tests, defaults to node:child_process.spawn
}

export function antigravityCliRunner(
  options: AntigravityCliOptions = {},
): ModelRunner {
  const model = options.model ?? "gemini-3.1-pro-high";
  const binary = options.binary ?? "agy";
  const timeoutMs = options.timeoutMs ?? 240_000;
  const spawnImpl = options.spawnImpl ?? spawn;

  return {
    id: model,
    provider: "antigravity-cli",
    async run(input: ModelRunnerInput): Promise<ModelRunnerOutput> {
      const systemText = input.systemPrompt ?? DEFAULT_SYSTEM;
      const combinedPrompt = `SYSTEM INSTRUCTIONS:\n${systemText}\n\n---\n\n${input.userPrompt}`;

      const tdir = await mkdtemp(join(tmpdir(), "ahd-antigravity-cli-"));
      const fakeHome = await mkdtemp(join(tmpdir(), "ahd-antigravity-home-"));
      const minimalEnv: NodeJS.ProcessEnv = {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        HOME: fakeHome,
        USER: process.env.USER,
        LOGNAME: process.env.LOGNAME,
      };

      try {
        if (process.env.HOME) {
          const realToken = join(
            process.env.HOME,
            ".gemini",
            "antigravity-cli",
            "antigravity-oauth-token",
          );
          if (existsSync(realToken)) {
            const fakeDir = join(fakeHome, ".gemini", "antigravity-cli");
            await mkdir(fakeDir, { recursive: true });
            const fakeToken = join(fakeDir, "antigravity-oauth-token");
            await copyFile(realToken, fakeToken);
            await chmod(fakeToken, 0o600);
          }
        }

        const args = [
          "--model",
          model,
          "--sandbox",
          "--output-format",
          "json",
          "--dangerously-skip-permissions",
          `--print=${combinedPrompt}`,
        ];

        const start = Date.now();
        const stdout = await runAgy(binary, args, timeoutMs, {
          cwd: tdir,
          env: minimalEnv,
          spawnImpl,
        });
        const latencyMs = Date.now() - start;

        let parsed: {
          status?: string;
          response?: string;
          error?: string;
        };
        try {
          parsed = JSON.parse(stdout);
        } catch {
          throw new Error(
            `agy CLI returned non-JSON output: ${stdout.slice(0, 400)}`,
          );
        }
        if (parsed.status !== "SUCCESS") {
          throw new Error(`agy CLI failed: ${parsed.error ?? "unknown error"}`);
        }

        const rawResponse = parsed.response ?? "";
        const html = extractHtmlBlock(rawResponse);
        return { model, html, rawResponse, latencyMs };
      } finally {
        await rm(tdir, { recursive: true, force: true });
        await rm(fakeHome, { recursive: true, force: true });
      }
    },
  };
}

function runAgy(
  bin: string,
  args: string[],
  timeoutMs: number,
  opts: { cwd: string; env: NodeJS.ProcessEnv; spawnImpl: typeof spawn },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = opts.spawnImpl(bin, args, {
      stdio: ["ignore", "pipe", "pipe"],
      cwd: opts.cwd,
      env: opts.env,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`agy CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout.on("data", (c) => (stdout += c.toString()));
    proc.stderr.on("data", (c) => (stderr += c.toString()));
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new Error(`agy CLI spawn failed: ${err.message}`));
    });
    proc.on("close", (code) => {
      clearTimeout(timer);
      // agy still prints its JSON result to stdout on a non-zero exit
      // (status: "ERROR"); prefer that parseable body over stderr's
      // plain-text duplicate when present.
      if (code !== 0 && !stdout.trim()) {
        reject(
          new Error(
            `agy CLI exited ${code}: ${stderr.slice(0, 400)}${stderr.length > 400 ? "…" : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

const DEFAULT_SYSTEM = `You are a pure text generator. Never call tools. Never write files. Never claim to create anything. Your entire response is the deliverable verbatim, with no preamble and no postamble. When asked for an HTML page, your response must begin with <!doctype html> or <html and end with </html>. Output nothing else.`;
