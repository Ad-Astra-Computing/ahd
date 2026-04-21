import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, unlink, mkdtemp } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadDotEnv } from "../src/env.js";

describe("loadDotEnv", () => {
  let dir: string;
  const touched: string[] = ["AHD_TEST_A", "AHD_TEST_B", "AHD_TEST_C"];

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), "ahd-env-"));
    for (const k of touched) delete process.env[k];
  });

  afterEach(async () => {
    for (const k of touched) delete process.env[k];
    try {
      await unlink(join(dir, ".env"));
    } catch {}
  });

  it("loads simple KEY=value pairs", async () => {
    await writeFile(
      join(dir, ".env"),
      "AHD_TEST_A=hello\nAHD_TEST_B=world\n# comment\n\n",
    );
    await loadDotEnv(join(dir, ".env"));
    expect(process.env.AHD_TEST_A).toBe("hello");
    expect(process.env.AHD_TEST_B).toBe("world");
  });

  it("strips surrounding quotes", async () => {
    await writeFile(join(dir, ".env"), `AHD_TEST_A="with spaces"\nAHD_TEST_B='single'`);
    await loadDotEnv(join(dir, ".env"));
    expect(process.env.AHD_TEST_A).toBe("with spaces");
    expect(process.env.AHD_TEST_B).toBe("single");
  });

  it("does not overwrite already-set variables", async () => {
    process.env.AHD_TEST_C = "shell-value";
    await writeFile(join(dir, ".env"), "AHD_TEST_C=file-value");
    await loadDotEnv(join(dir, ".env"));
    expect(process.env.AHD_TEST_C).toBe("shell-value");
  });

  it("is a noop when the file does not exist", async () => {
    await loadDotEnv(join(dir, ".env-missing"));
    expect(process.env.AHD_TEST_A).toBeUndefined();
  });
});
