import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { claudeCodeCliRunner } from "../src/eval/runners/claude-code-cli.js";

// Same spawn contract the claude-code vision critic's tests use
// (tests/critique/claude-code-critic.test.ts): a fake node:child_process
// spawn that exposes stdin/stdout/stderr streams and an EventEmitter so
// a test can drive 'close' on demand, with a sequence of behaviours so
// a retry path can be exercised (fail N times, then succeed).
interface FakeProc extends EventEmitter {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: (sig?: string) => void;
}

function makeSequencedFakeSpawn(
  behaviours: Array<{
    stdoutPayload?: string;
    stderrPayload?: string;
    exitCode?: number;
  }>,
) {
  let call = 0;
  return ((_bin: string, _args: string[], _opts: any): FakeProc => {
    const behaviour = behaviours[Math.min(call, behaviours.length - 1)];
    call += 1;
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
        if (behaviour.stdoutPayload)
          stdout.write(Buffer.from(behaviour.stdoutPayload));
        if (behaviour.stderrPayload)
          stderr.write(Buffer.from(behaviour.stderrPayload));
        stdout.end();
        stderr.end();
        proc.emit("close", behaviour.exitCode ?? 0);
      });
    });
    return proc;
  }) as any;
}

describe("claudeCodeCliRunner · 429 retry", () => {
  it("retries a 429-shaped CLI failure and succeeds on a later attempt", async () => {
    const spawnImpl = makeSequencedFakeSpawn([
      { stdoutPayload: "", stderrPayload: "Error: 429 Too Many Requests", exitCode: 1 },
      { stdoutPayload: "", stderrPayload: "Error: 429 Too Many Requests", exitCode: 1 },
      { stdoutPayload: "<!doctype html><html></html>", exitCode: 0 },
    ]);
    const runner = claudeCodeCliRunner({ spawnImpl } as any);
    const out = await runner.run({ userPrompt: "x" });
    expect(out.html).toContain("<!doctype html>");
  });

  it("gives up and surfaces a clear error after exhausting 429 retries", async () => {
    const spawnImpl = makeSequencedFakeSpawn([
      { stdoutPayload: "", stderrPayload: "Error: 429 Too Many Requests", exitCode: 1 },
    ]);
    const runner = claudeCodeCliRunner({ spawnImpl } as any);
    await expect(runner.run({ userPrompt: "x" })).rejects.toThrow(/429/);
  });

  it("does not retry a non-429 failure", async () => {
    const spawnImpl = makeSequencedFakeSpawn([
      { stdoutPayload: "", stderrPayload: "auth failed: not signed in", exitCode: 1 },
      { stdoutPayload: "<!doctype html><html></html>", exitCode: 0 },
    ]);
    const runner = claudeCodeCliRunner({ spawnImpl } as any);
    await expect(runner.run({ userPrompt: "x" })).rejects.toThrow(/auth failed|exited 1/);
  });
});
