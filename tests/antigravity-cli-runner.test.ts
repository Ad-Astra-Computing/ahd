import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { antigravityCliRunner } from "../src/eval/runners/antigravity-cli.js";

// Same fake-spawn contract claude-code-cli-runner.test.ts uses.
interface FakeProc extends EventEmitter {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: (sig?: string) => void;
}

interface CapturedCall {
  bin: string;
  args: string[];
  opts: any;
}

function fakeSpawn(
  stdoutPayload: string,
  exitCode: number,
  captured?: CapturedCall[],
) {
  return ((bin: string, args: string[], opts: any): FakeProc => {
    captured?.push({ bin, args, opts });
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const proc = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr,
      kill: () => {},
    }) as FakeProc;
    setImmediate(() => {
      stdout.write(Buffer.from(stdoutPayload));
      stdout.end();
      stderr.end();
      proc.emit("close", exitCode);
    });
    return proc;
  }) as any;
}

describe("antigravityCliRunner", () => {
  it("parses a SUCCESS response into html + rawResponse", async () => {
    const payload = JSON.stringify({
      conversation_id: "abc",
      status: "SUCCESS",
      response: "<!doctype html><html><body>hi</body></html>",
      duration_seconds: 1,
      num_turns: 1,
    });
    const runner = antigravityCliRunner({ spawnImpl: fakeSpawn(payload, 0) as any });
    const out = await runner.run({ userPrompt: "x" });
    expect(out.html).toContain("<!doctype html>");
    expect(out.model).toBe("gemini-3.1-pro-high");
  });

  it("surfaces the error field from an ERROR response", async () => {
    const payload = JSON.stringify({
      conversation_id: "",
      status: "ERROR",
      response: "",
      error: "model not recognized",
    });
    const runner = antigravityCliRunner({ spawnImpl: fakeSpawn(payload, 1) as any });
    await expect(runner.run({ userPrompt: "x" })).rejects.toThrow(/model not recognized/);
  });

  it("rejects non-JSON stdout with a clear error", async () => {
    const runner = antigravityCliRunner({ spawnImpl: fakeSpawn("not json", 0) as any });
    await expect(runner.run({ userPrompt: "x" })).rejects.toThrow(/non-JSON/);
  });

  it("isolation contract: sandbox flag, json output, argv prompt, tempdir cwd, minimal env", async () => {
    const payload = JSON.stringify({
      status: "SUCCESS",
      response: "<!doctype html><html></html>",
    });
    const calls: CapturedCall[] = [];
    const runner = antigravityCliRunner({
      spawnImpl: fakeSpawn(payload, 0, calls) as any,
    });
    await runner.run({ systemPrompt: "SYS TEXT", userPrompt: "USER TEXT" });

    expect(calls).toHaveLength(1);
    const { args, opts } = calls[0];
    expect(args).toContain("--sandbox");
    expect(args).toContain("--dangerously-skip-permissions");
    const outputFormatIdx = args.indexOf("--output-format");
    expect(outputFormatIdx).toBeGreaterThanOrEqual(0);
    expect(args[outputFormatIdx + 1]).toBe("json");
    const printArg = args.find((a) => a.startsWith("--print="));
    expect(printArg).toBeDefined();
    expect(printArg).toMatch(/^--print=SYSTEM INSTRUCTIONS:\nSYS TEXT/);
    expect(printArg).toContain("USER TEXT");

    // Isolation: fresh tempdir cwd, not the process cwd or repo root.
    expect(opts.cwd).not.toBe(process.cwd());
    expect(opts.cwd).toMatch(/ahd-antigravity-cli-/);

    // Minimal env allow-list: only PATH/HOME/USER/LOGNAME, nothing else
    // from the parent process forwarded (no stray API keys/tokens).
    expect(Object.keys(opts.env).sort()).toEqual(
      ["HOME", "LOGNAME", "PATH", "USER"].sort(),
    );

    // HOME must never be the real home directory: --sandbox does not
    // scope filesystem reads (verified live), so a prompt-injected
    // read of anything under the real HOME (SSH keys, other tokens,
    // shell history) would succeed if HOME pointed there.
    expect(opts.env.HOME).not.toBe(process.env.HOME);
    expect(opts.env.HOME).toMatch(/ahd-antigravity-home-/);
    expect(opts.env.HOME).not.toBe(opts.cwd);
  });
});
