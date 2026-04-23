import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { StyleTokenSchema, type StyleToken } from "./types.js";

export async function loadToken(
  tokensDir: string,
  id: string,
): Promise<StyleToken> {
  const path = join(tokensDir, `${id}.yml`);
  const raw = await readFile(path, "utf8");
  const data = parseYaml(raw);
  return StyleTokenSchema.parse(data);
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
