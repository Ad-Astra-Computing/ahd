import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { lintFile } from "../src/lint/engine.js";

describe("lintFile byte cap", () => {
  it("rejects a file over the lint size limit before reading it", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-lint-cap-"));
    const path = join(dir, "huge.html");
    try {
      // Sparse file: declares a size over the cap without actually
      // writing that many bytes, so the test stays fast.
      const fh = await import("node:fs/promises").then((m) => m.open(path, "w"));
      await fh.truncate(21 * 1024 * 1024);
      await fh.close();
      await expect(lintFile(path)).rejects.toThrow(/over the .* lint limit/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("lints a normal-sized file without issue", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ahd-lint-cap-"));
    const path = join(dir, "small.html");
    try {
      await writeFile(path, "<p>Hello.</p>");
      const report = await lintFile(path);
      expect(report.filesLinted).toBe(1);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
