import { spawn } from "node:child_process";
import { writeFile, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Critic, CritiqueInput } from "../critic.js";
import { VISION_RULES, buildCriticPrompt } from "../critic.js";
import type { Violation } from "../../lint/types.js";

// Claude-Code-backed vision critic. Drives the `claude` CLI in non-
// interactive print mode, the same as the text-generation runner in
// src/eval/runners/claude-code-cli.ts. Input is a screenshot that
// arrives as base64; we write it to a temp PNG and reference its
// absolute path from the user prompt so the CLI ingests it as vision
// content. Output is the CLI's text response, which we parse as JSON
// violations using the same schema the Anthropic HTTP critic emits.
//
// Auth: subscription-backed. ANTHROPIC_API_KEY is scrubbed from the
// subprocess env so the CLI does not silently switch to API mode and
// charge an unrelated account.

export interface ClaudeCodeVisionOptions {
  model?: string;
  binary?: string;
  timeoutMs?: number;
  // Injected for tests: the spawn factory, defaults to node:child_process.spawn.
  spawnImpl?: typeof spawn;
  // Injected for tests: override logger so we can assert on parse-failure warnings.
  logger?: { warn: (msg: string) => void };
}

const DEFAULT_MODEL = "claude-opus-4-7";

export function claudeCodeVisionCritic(
  options: ClaudeCodeVisionOptions = {},
): Critic {
  const model = options.model ?? DEFAULT_MODEL;
  const binary = options.binary ?? "claude";
  const timeoutMs = options.timeoutMs ?? 180_000;
  const spawnImpl = options.spawnImpl ?? spawn;
  const logger = options.logger ?? {
    warn: (m: string) => console.warn(m),
  };

  return {
    id: `${model}-claude-code-critic`,
    async critique(input: CritiqueInput): Promise<Violation[]> {
      if (!input.imageBase64) {
        throw new Error("claudeCodeVisionCritic requires an imageBase64 input");
      }

      const systemPrompt = buildCriticPrompt(input.token);
      const dir = await mkdtemp(join(tmpdir(), "ahd-critic-"));
      const imagePath = join(dir, "screenshot.png");
      try {
        await writeFile(imagePath, Buffer.from(input.imageBase64, "base64"));

        // The user prompt references the screenshot by absolute path.
        // Claude Code's print mode auto-attaches files whose absolute
        // paths appear in the prompt; image files are sent as vision
        // content blocks. Reply must be JSON only, matching the
        // Anthropic HTTP path's expected shape.
        const userPrompt = `Critique the screenshot at ${imagePath}. Reply with JSON only, matching the schema in the system prompt.`;

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

        const stdout = await runClaude(
          binary,
          args,
          timeoutMs,
          userPrompt,
          spawnImpl,
        );
        return parseViolations(stdout, input, logger);
      } finally {
        await rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    },
  };
}

function parseViolations(
  stdout: string,
  input: CritiqueInput,
  logger: { warn: (msg: string) => void },
): Violation[] {
  // Parse failures must not masquerade as "no tells fired." Returning
  // an empty array silently undercounts vision violations and lets a
  // broken critic run look like a clean pass in the aggregated report.
  // Emit an explicit ahd/critic-parse-failed violation instead so the
  // per-tell frequency table shows the sample as scored-but-unparsed,
  // and the operator can act (rerun, bump model, investigate prompt).
  const makeParseFailure = (reason: string): Violation[] => [
    {
      ruleId: "ahd/critic-parse-failed",
      severity: "warn",
      message: `claude-code vision critic parse failure: ${reason}`,
      file: input.url ?? "(screenshot)",
      line: 0,
      column: 0,
    } as Violation,
  ];

  const jsonMatch = stdout.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const reason = `no JSON object in response (raw: ${stdout.slice(0, 200)})`;
    logger.warn(`claude-code vision critic: ${reason}`);
    return makeParseFailure(reason);
  }
  let parsed: { fired?: unknown; rationale?: Record<string, string> } = {};
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (err) {
    const reason = `JSON parse failed: ${err instanceof Error ? err.message : String(err)} (raw: ${stdout.slice(0, 200)})`;
    logger.warn(`claude-code vision critic: ${reason}`);
    return makeParseFailure(reason);
  }
  const fired = Array.isArray(parsed.fired) ? parsed.fired : [];
  return fired
    .filter((id: unknown): id is string => typeof id === "string")
    .filter((id) => VISION_RULES.some((r) => r.id === id))
    .map((id) => ({
      ruleId: id,
      severity: "warn" as const,
      file: input.url ?? "<screenshot>",
      message:
        parsed.rationale?.[id] ??
        VISION_RULES.find((r) => r.id === id)?.description ??
        "Vision rule fired",
    }));
}

function runClaude(
  bin: string,
  args: string[],
  timeoutMs: number,
  stdin: string,
  spawnImpl: typeof spawn,
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Minimal env allow-list. Claude Code processes model-controlled
    // prompts on images we render from untrusted HTML, so any env var
    // reachable inside the subprocess is in scope for prompt-injected
    // exfiltration. Carry only PATH, HOME, TMPDIR, locale, and the
    // claude-specific knobs the CLI reads itself. Every API key and
    // every AHD_* / CF_* / OPENAI_* / GEMINI_* variable stays out.
    // Anthropic auth comes from the claude-code config in HOME, not
    // from ANTHROPIC_API_KEY, so stripping that also forces the CLI
    // onto subscription rather than API mode.
    const parent = process.env;
    const env: NodeJS.ProcessEnv = {
      PATH: parent.PATH ?? "/usr/bin:/bin",
      HOME: parent.HOME ?? "/",
      TMPDIR: parent.TMPDIR,
      LANG: parent.LANG,
      LC_ALL: parent.LC_ALL,
      ...Object.fromEntries(
        Object.entries(parent).filter(([k]) => k.startsWith("CLAUDE_")),
      ),
    };
    const proc = spawnImpl(bin, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env,
    });
    proc.stdin!.write(stdin);
    proc.stdin!.end();
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      reject(new Error(`claude CLI timeout after ${timeoutMs}ms`));
    }, timeoutMs);
    proc.stdout!.on("data", (c) => (stdout += c.toString()));
    proc.stderr!.on("data", (c) => (stderr += c.toString()));
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
