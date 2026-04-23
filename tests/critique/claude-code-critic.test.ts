import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { claudeCodeVisionCritic } from "../../src/critique/critics/claude-code.js";
import { resolveCritic } from "../../src/critique/critics/index.js";
import { VISION_RULES } from "../../src/critique/critic.js";

// Tiny fake for the node:child_process spawn contract: exposes stdin/stdout/stderr
// as streams and behaves as an EventEmitter so we can emit 'close' on demand.
interface FakeProc extends EventEmitter {
  stdin: PassThrough;
  stdout: PassThrough;
  stderr: PassThrough;
  kill: (sig?: string) => void;
}

function makeFakeSpawn(behaviour: {
  stdoutPayload?: string;
  stderrPayload?: string;
  exitCode?: number;
  captureEnv?: NodeJS.ProcessEnv[];
  captureArgs?: Array<{ bin: string; args: string[] }>;
  captureStdin?: string[];
}) {
  return ((bin: string, args: string[], opts: any): FakeProc => {
    behaviour.captureEnv?.push(opts.env);
    behaviour.captureArgs?.push({ bin, args });
    const stdin = new PassThrough();
    const stdout = new PassThrough();
    const stderr = new PassThrough();
    const proc = Object.assign(new EventEmitter(), {
      stdin,
      stdout,
      stderr,
      kill: () => {},
    }) as FakeProc;
    let stdinBuf = "";
    stdin.on("data", (c) => (stdinBuf += c.toString()));
    stdin.on("end", () => {
      behaviour.captureStdin?.push(stdinBuf);
      // Emit payloads then close.
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

const PNG_HEADER_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

describe("claudeCodeVisionCritic", () => {
  it("scrubs ANTHROPIC_API_KEY from subprocess env", async () => {
    const envs: NodeJS.ProcessEnv[] = [];
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: '{"fired": [], "rationale": {}}',
      exitCode: 0,
      captureEnv: envs,
    });
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-should-not-leak";
    try {
      const critic = claudeCodeVisionCritic({ spawnImpl });
      await critic.critique({ token: "swiss-editorial", imageBase64: PNG_HEADER_BASE64 });
    } finally {
      if (prev) process.env.ANTHROPIC_API_KEY = prev;
      else delete process.env.ANTHROPIC_API_KEY;
    }
    expect(envs).toHaveLength(1);
    expect(envs[0].ANTHROPIC_API_KEY).toBeUndefined();
  });

  it("attaches the image path to the prompt sent via stdin", async () => {
    const stdins: string[] = [];
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: '{"fired": [], "rationale": {}}',
      exitCode: 0,
      captureStdin: stdins,
    });
    const critic = claudeCodeVisionCritic({ spawnImpl });
    await critic.critique({ token: "swiss-editorial", imageBase64: PNG_HEADER_BASE64 });
    expect(stdins).toHaveLength(1);
    // prompt should mention an absolute path ending in .png
    expect(stdins[0]).toMatch(/\/[^\s]+\.png/);
    expect(stdins[0]).toContain("JSON only");
  });

  it("parses a valid JSON response into Violation[]", async () => {
    const ruleId = VISION_RULES[0].id;
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: `Here is the analysis:\n{"fired": ["${ruleId}"], "rationale": {"${ruleId}": "the hero looks perfectly symmetric"}}\n`,
      exitCode: 0,
    });
    const critic = claudeCodeVisionCritic({ spawnImpl });
    const vs = await critic.critique({
      token: "swiss-editorial",
      imageBase64: PNG_HEADER_BASE64,
      url: "https://example.com",
    });
    expect(vs).toHaveLength(1);
    expect(vs[0].ruleId).toBe(ruleId);
    expect(vs[0].severity).toBe("warn");
    expect(vs[0].file).toBe("https://example.com");
    expect(vs[0].message).toContain("perfectly symmetric");
  });

  it("filters out rule ids not in VISION_RULES", async () => {
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: '{"fired": ["ahd/invented-rule"], "rationale": {}}',
      exitCode: 0,
    });
    const critic = claudeCodeVisionCritic({ spawnImpl });
    const vs = await critic.critique({
      token: "swiss-editorial",
      imageBase64: PNG_HEADER_BASE64,
    });
    expect(vs).toHaveLength(0);
  });

  it("emits an explicit critic-parse-failed violation when stdout has no JSON", async () => {
    const warned: string[] = [];
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: "this is not json at all, just prose",
      exitCode: 0,
    });
    const critic = claudeCodeVisionCritic({
      spawnImpl,
      logger: { warn: (m) => warned.push(m) },
    });
    const vs = await critic.critique({
      token: "swiss-editorial",
      imageBase64: PNG_HEADER_BASE64,
    });
    // Explicit surface, not a silent []. A parse failure returning
    // [] would masquerade as "no tells fired" in aggregated reports.
    expect(vs).toHaveLength(1);
    expect(vs[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(vs[0].severity).toBe("warn");
    expect(vs[0].message).toMatch(/no JSON object/);
    expect(warned.length).toBeGreaterThan(0);
  });

  it("emits critic-parse-failed when JSON-like block fails to parse", async () => {
    const warned: string[] = [];
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: '{"fired": ["ahd/require-asymmetry",, broken }',
      exitCode: 0,
    });
    const critic = claudeCodeVisionCritic({
      spawnImpl,
      logger: { warn: (m) => warned.push(m) },
    });
    const vs = await critic.critique({
      token: "swiss-editorial",
      imageBase64: PNG_HEADER_BASE64,
    });
    expect(vs).toHaveLength(1);
    expect(vs[0].ruleId).toBe("ahd/critic-parse-failed");
    expect(vs[0].message).toMatch(/JSON parse failed/);
    expect(warned.length).toBeGreaterThan(0);
  });

  it("throws with stderr included when subprocess exits non-zero", async () => {
    const spawnImpl = makeFakeSpawn({
      stdoutPayload: "",
      stderrPayload: "auth failed: not signed in",
      exitCode: 1,
    });
    const critic = claudeCodeVisionCritic({ spawnImpl });
    await expect(
      critic.critique({
        token: "swiss-editorial",
        imageBase64: PNG_HEADER_BASE64,
      }),
    ).rejects.toThrow(/auth failed|exited 1/);
  });

  it("throws when no imageBase64 is given", async () => {
    const critic = claudeCodeVisionCritic({ spawnImpl: makeFakeSpawn({}) as any });
    await expect(
      critic.critique({ token: "swiss-editorial" } as any),
    ).rejects.toThrow(/imageBase64/);
  });

  it("exposes a stable id", () => {
    const critic = claudeCodeVisionCritic({ model: "claude-opus-4-7" });
    expect(critic.id).toContain("claude-opus-4-7");
    expect(critic.id).toContain("critic");
  });
});

describe("resolveCritic dispatcher", () => {
  it("returns mock critic for spec 'mock'", () => {
    const c = resolveCritic("mock");
    expect(c.id).toBe("mock-critic");
  });

  it("returns claude-code critic for spec 'claude-code'", () => {
    const c = resolveCritic("claude-code");
    expect(c.id).toContain("claude-code-critic");
  });

  it("defaults to claude-code when no spec is given", () => {
    const c = resolveCritic(undefined);
    expect(c.id).toContain("claude-code-critic");
  });

  it("returns anthropic critic when ANTHROPIC_API_KEY is present", () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_API_KEY = "sk-test-key";
    try {
      const c = resolveCritic("anthropic");
      expect(c.id).toContain("critic");
    } finally {
      if (prev) process.env.ANTHROPIC_API_KEY = prev;
      else delete process.env.ANTHROPIC_API_KEY;
    }
  });

  it("throws with a clear message when anthropic spec lacks the key", () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => resolveCritic("anthropic")).toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (prev) process.env.ANTHROPIC_API_KEY = prev;
    }
  });

  it("throws on unknown spec", () => {
    expect(() => resolveCritic("pigeon")).toThrow(/Unknown/);
  });
});
