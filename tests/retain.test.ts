import { describe, it, expect } from "vitest";
import { mkdtemp, writeFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  retainRunPages,
  verifyRetainedRun,
  RetainError,
} from "../src/eval/retain.js";
import type { RunManifest } from "../src/eval/types.js";

async function writeSample(
  samplesRoot: string,
  sanitizedId: string,
  arm: "raw" | "compiled",
  index: number,
  html: string,
  raw?: string,
): Promise<void> {
  const dir = join(samplesRoot, sanitizedId, arm);
  await mkdir(dir, { recursive: true });
  const base = `sample-${String(index).padStart(3, "0")}`;
  await writeFile(join(dir, `${base}.html`), html);
  if (raw !== undefined) {
    await writeFile(join(dir, `${base}.raw.txt`), raw);
  }
}

function manifest(overrides?: Partial<RunManifest>): RunManifest {
  return {
    token: "swiss-editorial",
    briefPath: "briefs/landing.yml",
    n: 1,
    maxTokens: 1000,
    runAt: "2026-09-25T00:00:00.000Z",
    models: [
      {
        spec: "mock:model-a",
        canonicalId: "model-a",
        sanitizedId: "model-a",
        provider: "mock",
      },
    ],
    ...overrides,
  };
}

describe("retainRunPages", () => {
  it("copies only pages this invocation generated, never a carried-forward cell", async () => {
    const samplesRoot = await mkdtemp(join(tmpdir(), "ahd-retain-src-"));
    const runDir = join(await mkdtemp(join(tmpdir(), "ahd-retain-dst-")), "run");
    await writeSample(samplesRoot, "model-a", "raw", 1, "<html>raw one</html>", "raw response one");
    await writeSample(samplesRoot, "model-a", "compiled", 1, "<html>cmp one</html>", "cmp response one");
    // A second model on disk that the manifest marks carried forward:
    // its pages must not end up in the retained copy.
    await writeSample(samplesRoot, "model-b", "raw", 1, "<html>carried</html>", "carried raw");

    const m = manifest({
      carriedForward: ["model-b"],
      models: [
        manifest().models[0],
        { spec: "mock:model-b", canonicalId: "model-b", sanitizedId: "model-b", provider: "mock" },
      ],
    });

    const sidecar = await retainRunPages({
      samplesRoot,
      runDir,
      manifest: m,
      epoch: "test-epoch",
      harnessCommit: "deadbeef",
    });

    expect(sidecar.pages).toHaveLength(2);
    expect(sidecar.pages.every((p) => p.model === "model-a")).toBe(true);
    for (const page of sidecar.pages) {
      const bytes = await readFile(join(runDir, page.path), "utf8");
      expect(bytes.length).toBeGreaterThan(0);
      expect(page.raw_hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(page.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(page.epoch).toBe("test-epoch");
      expect(page.harness_commit).toBe("deadbeef");
      expect(page.run_id).toBe("swiss-editorial@2026-09-25T00:00:00.000Z");
    }
  });

  it("refuses to write into a run directory that already exists", async () => {
    const samplesRoot = await mkdtemp(join(tmpdir(), "ahd-retain-src-"));
    const parent = await mkdtemp(join(tmpdir(), "ahd-retain-dst-"));
    const runDir = join(parent, "run");
    await writeSample(samplesRoot, "model-a", "raw", 1, "<html>one</html>", "raw one");
    await writeSample(samplesRoot, "model-a", "compiled", 1, "<html>two</html>", "raw two");

    await retainRunPages({
      samplesRoot,
      runDir,
      manifest: manifest(),
      epoch: "test-epoch",
      harnessCommit: null,
    });

    await expect(
      retainRunPages({
        samplesRoot,
        runDir,
        manifest: manifest(),
        epoch: "test-epoch",
        harnessCommit: null,
      }),
    ).rejects.toThrow(RetainError);
  });
});

describe("verifyRetainedRun", () => {
  async function retainFixture(): Promise<string> {
    const samplesRoot = await mkdtemp(join(tmpdir(), "ahd-retain-src-"));
    const runDir = join(await mkdtemp(join(tmpdir(), "ahd-retain-dst-")), "run");
    await writeSample(samplesRoot, "model-a", "raw", 1, "<html>one</html>", "raw one");
    await writeSample(samplesRoot, "model-a", "compiled", 1, "<html>two</html>", "raw two");
    await retainRunPages({
      samplesRoot,
      runDir,
      manifest: manifest(),
      epoch: "test-epoch",
      harnessCommit: null,
    });
    return runDir;
  }

  it("passes on an untouched retained run", async () => {
    const runDir = await retainFixture();
    const result = await verifyRetainedRun(runDir);
    expect(result.ok).toBe(true);
    expect(result.problems).toHaveLength(0);
    expect(result.pagesChecked).toBe(2);
  });

  it("fails when a retained page is tampered with", async () => {
    const runDir = await retainFixture();
    const target = join(runDir, "model-a", "raw", "sample-001.html");
    await writeFile(target, "<html>tampered</html>");
    const result = await verifyRetainedRun(runDir);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes("hash mismatch"))).toBe(true);
  });

  it("fails when a retained page is deleted", async () => {
    const runDir = await retainFixture();
    const { rm } = await import("node:fs/promises");
    await rm(join(runDir, "model-a", "compiled", "sample-001.html"));
    const result = await verifyRetainedRun(runDir);
    expect(result.ok).toBe(false);
    expect(result.problems.some((p) => p.includes("missing page"))).toBe(true);
  });
});
