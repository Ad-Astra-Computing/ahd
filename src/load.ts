import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import {
  StyleTokenSchema,
  type StyleToken,
  BriefSchema,
  type Brief,
} from "./types.js";

// Token IDs are kebab-case. Anything outside [a-z0-9-] would break
// resolution or imply an attempt at path traversal — reject it at the
// door rather than trust `path.join` to do the right thing.
const TOKEN_ID_RE = /^[a-z0-9][a-z0-9-]*$/;

export async function loadToken(
  tokensDir: string,
  id: string,
): Promise<StyleToken> {
  if (typeof id !== "string" || !TOKEN_ID_RE.test(id)) {
    throw new Error(
      `invalid token id: ${JSON.stringify(id)}. Token ids are kebab-case ([a-z0-9-]).`,
    );
  }
  const base = resolve(tokensDir);
  const path = resolve(base, `${id}.yml`);
  // Defence-in-depth: even with the regex, ensure the resolved path stays
  // inside the tokens directory. Path.resolve flattens ../ so a crafted
  // id that slipped the regex could not escape here either.
  if (!path.startsWith(base + "/") && path !== base) {
    throw new Error(`token path escapes tokens directory: ${path}`);
  }
  const raw = await readFile(path, "utf8");
  const data = parseYaml(raw);
  return StyleTokenSchema.parse(data);
}

/**
 * Load a brief from a YAML path and validate it against BriefSchema.
 * Throws with a Zod-formatted message when the brief is missing
 * required fields or has invalid surfaces / token id. Use this at
 * every CLI entry point that takes a brief; calling parseYaml + cast
 * directly creates a deep-stack failure when the brief is malformed.
 */
export async function loadBrief(briefPath: string): Promise<Brief> {
  const raw = await readFile(briefPath, "utf8");
  const data = parseYaml(raw);
  const result = BriefSchema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  - ${i.path.join(".") || "<root>"}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid brief at ${briefPath}:\n${issues}\nSee docs/USAGE.md for the brief schema.`,
    );
  }
  return result.data;
}

export async function listTokens(tokensDir: string): Promise<string[]> {
  const entries = await readdir(tokensDir);
  return entries
    .filter((e) => e.endsWith(".yml"))
    .map((e) => e.replace(/\.yml$/, ""))
    .sort();
}

export async function validateAll(
  tokensDir: string,
): Promise<{ id: string; ok: boolean; error?: string }[]> {
  const ids = await listTokens(tokensDir);
  const results = [];
  for (const id of ids) {
    try {
      await loadToken(tokensDir, id);
      results.push({ id, ok: true });
    } catch (err) {
      results.push({
        id,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return results;
}
