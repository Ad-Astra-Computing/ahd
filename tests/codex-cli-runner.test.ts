import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { codexCliRunner } from "../src/eval/runners/codex-cli.js";

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

function fakeSpawn(stdoutPayload: string, exitCode: number, captured?: CapturedCall[]) {
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
    stdin.on("data", () => {});
    stdin.on("end", () => {
      setImmediate(() => {
        stdout.write(Buffer.from(stdoutPayload));
        stdout.end();
        stderr.end();
        proc.emit("close", exitCode);
      });
    });
    return proc;
  }) as any;
}

describe("codexCliRunner", () => {
  it("parses the final agent_message from the JSONL stream", async () => {
    const payload = `{"type":"item.completed","item":{"type":"agent_message","text":"<!doctype html><html></html>"}}\n`;
    const runner = codexCliRunner({ spawnImpl: fakeSpawn(payload, 0) as any });
    const out = await runner.run({ userPrompt: "x" });
    expect(out.html).toContain("<!doctype html>");
  });

  it("rejects a model id with a quote, which would escape the TOML --config override", () => {
    expect(() => codexCliRunner({ model: 'gpt-6"; sandbox_permissions=["disk-full-read-access' })).toThrow(
      /unsafe model id/,
    );
  });

  it("isolation contract: CODEX_HOME is a separate dir from HOME/cwd, with its own cleanup", async () => {
    const calls: CapturedCall[] = [];
    const runner = codexCliRunner({
      spawnImpl: fakeSpawn('{"type":"item.completed","item":{"type":"agent_message","text":"ok"}}\n', 0, calls) as any,
    });
    await runner.run({ userPrompt: "x" });

    expect(calls).toHaveLength(1);
    const { opts } = calls[0];

    // CODEX_HOME must not equal HOME or cwd: that's the whole point of
    // the split. If a future edit collapses them back into one dir,
    // auth.json becomes reachable from the model's sandboxed shell
    // tool again (the bug this fix closes).
    expect(opts.env.CODEX_HOME).toBeDefined();
    expect(opts.env.CODEX_HOME).not.toBe(opts.env.HOME);
    expect(opts.env.CODEX_HOME).not.toBe(opts.cwd);
    expect(opts.cwd).toBe(opts.env.HOME);
  });
});
