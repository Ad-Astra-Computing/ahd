import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parse as parseYaml } from "yaml";
import { listTokens, loadToken } from "../load.js";
import { compile } from "../compile.js";
import { lintSource } from "../lint/engine.js";
import { VISION_RULES } from "../critique/critic.js";
import type { StyleToken } from "../types.js";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface McpServerOptions {
  tokensDir: string;
}

export function createTools(options: McpServerOptions): McpTool[] {
  const TOKENS = options.tokensDir;

  return [
    {
      name: "ahd.list_tokens",
      description: "List every style token available in the AHD library.",
      inputSchema: { type: "object", properties: {} },
      handler: async () => ({ tokens: await listTokens(TOKENS) }),
    },
    {
      name: "ahd.get_token",
      description: "Return a single style token by id.",
      inputSchema: {
        type: "object",
        properties: { id: { type: "string" } },
        required: ["id"],
      },
      handler: async (args) => loadToken(TOKENS, String(args.id)),
    },
    {
      name: "ahd.brief",
      description:
        "Compile a brief (structured intent) against a style token. Returns per-model prompts and a spec.json-shaped object.",
      inputSchema: {
        type: "object",
        properties: {
          intent: { type: "string" },
          token: { type: "string" },
          audience: { type: "string" },
          surfaces: { type: "array", items: { type: "string" } },
          mustInclude: { type: "array", items: { type: "string" } },
          mustAvoid: { type: "array", items: { type: "string" } },
        },
        required: ["intent", "token", "surfaces"],
      },
      handler: async (args) => {
        const token = await loadToken(TOKENS, String(args.token));
        return compile(args as any, token);
      },
    },
    {
      name: "ahd.palette",
      description:
        "Return the OKLCH palette declared by a style token, with role assignments.",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string" } },
        required: ["token"],
      },
      handler: async (args) => {
        const t: StyleToken = await loadToken(TOKENS, String(args.token));
        return { palette: t.colour.palette, roles: t.colour.roles };
      },
    },
    {
      name: "ahd.type_system",
      description: "Return the type scale, families, weights and tracking for a token.",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string" } },
        required: ["token"],
      },
      handler: async (args) => {
        const t: StyleToken = await loadToken(TOKENS, String(args.token));
        return t.type;
      },
    },
    {
      name: "ahd.reference",
      description:
        "Return the movement, references and exemplars for a token (so the model can anchor in a specific lineage).",
      inputSchema: {
        type: "object",
        properties: { token: { type: "string" } },
        required: ["token"],
      },
      handler: async (args) => {
        const t: StyleToken = await loadToken(TOKENS, String(args.token));
        return {
          provenance: t.provenance,
          mood: t.mood,
          forbidden: t.forbidden,
          requiredQuirks: t["required-quirks"],
        };
      },
    },
    {
      name: "ahd.lint",
      description:
        "Run the AHD slop linter on an HTML/CSS source string. Returns violations per rule.",
      inputSchema: {
        type: "object",
        properties: {
          html: { type: "string" },
          css: { type: "string" },
          file: { type: "string" },
        },
      },
      handler: async (args) => {
        const res = lintSource({
          file: String(args.file ?? "<inline>"),
          html: String(args.html ?? ""),
          css: String(args.css ?? ""),
        });
        return res;
      },
    },
    {
      name: "ahd.vision_rules",
      description:
        "Return the nine vision-only slop rules (for use when an agent has access to a screenshot or rendered page).",
      inputSchema: { type: "object", properties: {} },
      handler: async () => VISION_RULES,
    },
  ];
}

export async function handleStdioLine(
  line: string,
  tools: McpTool[],
): Promise<string> {
  try {
    const req = JSON.parse(line);
    if (req.method === "initialize") {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          protocolVersion: "2024-11-05",
          capabilities: { tools: {} },
          serverInfo: { name: "ahd-mcp", version: "0.1.0" },
        },
      });
    }
    if (req.method === "tools/list") {
      return JSON.stringify({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        },
      });
    }
    if (req.method === "tools/call") {
      const tool = tools.find((t) => t.name === req.params?.name);
      if (!tool) {
        return JSON.stringify({
          jsonrpc: "2.0",
          id: req.id,
          error: { code: -32601, message: `unknown tool ${req.params?.name}` },
        });
      }
      const result = await tool.handler(req.params?.arguments ?? {});
      return JSON.stringify({
        jsonrpc: "2.0",
        id: req.id,
        result: {
          content: [
            { type: "text", text: JSON.stringify(result, null, 2) },
          ],
        },
      });
    }
    return JSON.stringify({
      jsonrpc: "2.0",
      id: req.id ?? null,
      error: { code: -32601, message: `unknown method ${req.method}` },
    });
  } catch (err) {
    return JSON.stringify({
      jsonrpc: "2.0",
      id: null,
      error: {
        code: -32700,
        message: err instanceof Error ? err.message : String(err),
      },
    });
  }
}

export async function runStdioServer(options: McpServerOptions): Promise<void> {
  const tools = createTools(options);
  process.stdin.setEncoding("utf8");
  let buffer = "";
  process.stdin.on("data", async (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      const response = await handleStdioLine(line, tools);
      process.stdout.write(response + "\n");
    }
  });
}
